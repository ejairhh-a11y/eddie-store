# ADR 0004: Stock disponible derivado de las citas pendientes

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgos C3 y A7)

## Contexto

El PRD (Casos borde) define tres reglas de stock:

1. Al agendar se **aparta 1 unidad** del modelo.
2. Si el admin **cancela**, la unidad se libera. Si la marca como **vendida**, se descuenta
   definitivamente.
3. Si **pasa el día de la cita** y sigue pendiente (el piloto no se presentó), la unidad vuelve a
   estar disponible **sola**, sin intervención del admin.

`Design.md` muestra el stock en tres estados (Disponible, Últimas unidades, Agotada) y el panel de
stock separa total, apartadas y disponible.

## Decisión

- En `motorcycles.stock_total` se guardan las unidades físicas en el concesionario. Solo cambia
  cuando el admin ajusta el stock o marca una cita como vendida (−1).
- El stock **disponible no se guarda: se calcula**:

  ```
  disponible = stock_total − COUNT(citas WHERE moto = X AND estado = 'PENDIENTE' AND fecha_cita >= hoy (Europe/Madrid))
  ```

- La regla 3 se cumple **por definición**: una cita pendiente de ayer ya no entra en el conteo. No
  hace falta ningún proceso programado.
- Por eso **`VENCIDA` es solo una etiqueta administrativa**, no una condición del stock: una cita
  pendiente con fecha pasada y una `VENCIDA` se comportan igual en el conteo. El panel muestra
  ambas como "No se presentó" (ver Design.md §7). Las transiciones permitidas, incluida la venta a
  un cliente que llegó tarde, se definen en ADR 0006.
- "Hoy" **no se calcula con `now()` en SQL**: el dominio lo recibe como parámetro
  (`today: LocalDate`, en Europe/Madrid) desde un reloj inyectable. Así la liberación por fecha se
  puede probar de forma determinista (ADR 0013).

## Alternativas consideradas

- **Columna `stock_reserved` + Vercel Cron nocturno**: la lectura es trivial (una columna). Se
  descartó porque el contador puede desincronizarse si una transacción falla a medias o si el cron
  no corre, y porque agrega infraestructura (cron, monitoreo) para algo que una consulta resuelve.
- **Unidades individuales con número de bastidor (VIN)**: es el modelo más fiel a la realidad,
  porque cada cita aparta una moto concreta. Se descartó porque el PRD no pide identificar
  unidades y multiplica el modelo de datos y el seed.

## Consecuencias

- Hay una sola fuente de verdad: el stock disponible no puede contradecir las citas, lo que
  cumple el criterio "stock coherente" del PRD.
- La liberación por fecha no depende de que nada se ejecute a tiempo.
- **Costo:** cada lectura de stock hace un `COUNT` sobre `appointments`. Con 6 modelos y pocas
  citas es despreciable. Se agrega un índice en `(motorcycle_id, status, slot_date)`.
- **Costo:** el stock disponible **cambia con el paso del tiempo** sin que ocurra ningún evento
  (cuando una cita vence). Esto afecta a la estrategia de caché (ver ADR 0005).
- **Costo:** "hoy" depende de la zona horaria. Toda comparación de fechas se hace en
  `Europe/Madrid`, nunca en la hora del servidor (UTC en Vercel).
