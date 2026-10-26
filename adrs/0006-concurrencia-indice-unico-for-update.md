# ADR 0006: Concurrencia de citas con índice único parcial, bloqueo de fila y máquina de estados

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgos C1 y C3)

## Contexto

El PRD exige:

- **Sin citas duplicadas:** 0 franjas con más de una cita, **incluso con peticiones simultáneas**.
- **Stock coherente:** 0 citas creadas sobre stock 0, incluso si dos pilotos confirman la última
  unidad a la vez.

Las dos garantías deben cumplirse aunque la página que vio el piloto estuviera desactualizada
(ADR 0005). Además, las **acciones del admin** (vender, cancelar, ajustar stock) también modifican
el stock: un doble clic o dos pestañas abiertas no pueden descontar una unidad dos veces, ni dejar
el disponible en negativo.

## Decisión

### 1. Crear una cita: una transacción, dos garantías

1. **Franja única.** Índice único parcial:

   ```sql
   CREATE UNIQUE INDEX appointments_slot_pending_uq
     ON appointments (slot_start) WHERE status = 'PENDIENTE';
   ```

2. **Última unidad.** Dentro de la transacción se bloquea la fila de la moto antes de contar:

   ```sql
   SELECT stock_total FROM motorcycles WHERE id = $1 FOR UPDATE;
   -- contar las citas pendientes vigentes (ADR 0004); si disponible <= 0 → OUT_OF_STOCK
   INSERT INTO appointments (...);
   ```

   El bloqueo serializa las transacciones sobre la **misma moto**. Las de motos distintas no se
   bloquean entre sí.

### 2. Traducción de errores por restricción, no por código genérico

`appointments` tiene cinco restricciones únicas. El error `23505` se traduce **según el nombre de
la restricción** (campo `constraint` del error de `pg`):

| Restricción | Resultado |
|---|---|
| `appointments_slot_pending_uq` | `SLOT_TAKEN` → la interfaz ofrece las franjas libres más cercanas |
| `appointments_email_pending_uq`, `appointments_phone_pending_uq` | `ALREADY_BOOKED` → "Ya tienes una cita el …" (ADR 0010) |
| `appointments_code_uq` | Colisión del código corto → **reintentar** (ver abajo) |
| `appointments_access_token_hash_uq` | Prácticamente imposible (128 bits) → error inesperado (ADR 0014) |

Una restricción no reconocida **nunca** se traduce como `SLOT_TAKEN`: se trata como error
inesperado.

**Reintento del código corto:** el `INSERT` se ejecuta dentro de un `SAVEPOINT`. Si falla por
`appointments_code_uq`, se hace `ROLLBACK TO SAVEPOINT`, se genera otro código y se reintenta
(máximo 3 veces). Sin el savepoint la transacción quedaría abortada y no se podría reintentar.

### 3. Máquina de estados de la cita

Solo se permiten estas transiciones; cualquier otra devuelve `INVALID_STATE`:

| Desde | Hacia | Quién | Efecto en el stock |
|---|---|---|---|
| (nueva) | `PENDIENTE` | Piloto | Aparta 1 unidad mientras `slot_date >= hoy` (ADR 0004) |
| `PENDIENTE` | `CANCELADA` | Admin | Libera la unidad y la franja |
| `PENDIENTE` | `VENDIDA` | Admin | `stock_total − 1` |
| `PENDIENTE` | `VENCIDA` | Sistema, de forma perezosa (ADR 0010) o con la acción "Marcar no-show" del admin | Ninguno (ya estaba fuera del conteo por fecha) |
| `VENCIDA` | `VENDIDA` | Admin (el cliente llegó tarde) | `stock_total − 1`, **solo si disponible ≥ 1** |
| `VENCIDA` | `CANCELADA` | Admin | Ninguno |
| `VENDIDA`, `CANCELADA` | — | — | Estados finales |

Cada transición del admin es **una transacción** con `FOR UPDATE` sobre la moto y un `UPDATE`
**condicional e idempotente**:

```sql
UPDATE appointments SET status = 'VENDIDA', updated_by = $admin, updated_at = now()
 WHERE id = $1 AND status IN ('PENDIENTE','VENCIDA')
RETURNING motorcycle_id, slot_date, status_anterior;
```

- Si el `UPDATE` no devuelve fila (doble clic, o la cita ya cambió de estado), **no se toca el
  stock** y se responde `INVALID_STATE` sin efectos.
- **Venta de una cita que ya no apartaba stock:** si es una `PENDIENTE` con fecha pasada o una
  `VENCIDA`, su unidad ya volvió al disponible y otro piloto pudo apartarla. Antes de restar se
  exige **disponible ≥ 1** bajo el mismo bloqueo. Si no hay, se responde `OUT_OF_STOCK` y el admin
  debe resolverlo (por ejemplo, cancelando otra cita o ajustando stock). Así el disponible nunca
  queda negativo.
- **Ajustar stock** toma el mismo bloqueo y rechaza un `stock_total` menor que las citas
  pendientes vigentes del modelo.

## Alternativas consideradas

- **Transacción `SERIALIZABLE` con reintentos**: Postgres detecta los conflictos sin SQL
  específico. Se descartó porque obliga a implementar reintentos con backoff, sus errores son
  menos predecibles y es más difícil de explicar y de probar de forma determinista.
- **Verificar y luego insertar, sin bloqueo**: es lo más simple. Se descartó porque tiene una
  condición de carrera real entre la verificación y la inserción, y no cumple el criterio de 0
  duplicados.
- **Transiciones sin condición de estado** (`UPDATE … WHERE id = $1`): es lo más simple. Se
  descartó porque un doble envío descuenta stock dos veces y una venta tardía puede dejar el
  disponible negativo, lo que contradice el criterio de stock coherente del PRD.

## Consecuencias

- Las garantías las da **la base de datos**: una franja duplicada es imposible aunque el código
  tenga un bug, y las transiciones son idempotentes ante doble clic.
- Cada fallo tiene un mensaje correcto: quien ya tiene cita no queda atrapado en un bucle de
  "franja ocupada".
- Se puede probar de forma determinista: peticiones en paralelo sobre la misma franja o la última
  unidad, doble envío de "vendida" y venta tardía sin stock (ADR 0013).
- **Costo:** las citas de la misma moto se serializan. Es irrelevante con el volumen de un
  concesionario, pero no escalaría a miles de peticiones por segundo sobre un mismo modelo.
- **Costo:** la traducción de errores depende de los **nombres** de los índices. Renombrar un
  índice en una migración rompe el mapeo de forma silenciosa. Los nombres se fijan como
  constantes compartidas entre el schema y el código, y hay un test de integración por cada
  código de error.
- **Costo:** el admin puede encontrarse con `OUT_OF_STOCK` al vender a un cliente que llegó tarde,
  y tendrá que resolverlo a mano. Es preferible a dejar el stock en negativo.
- **Costo:** requiere el driver transaccional de Neon (ADR 0002).
