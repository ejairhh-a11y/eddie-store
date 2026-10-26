# ADR 0007: Server Actions con esquemas Zod como contrato front–back

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgos C1 y A5)

## Contexto

La aplicación es un solo deployable Next.js (ADR 0001). Las interacciones con el servidor son
pocas y todas nacen de la propia interfaz:

- **Lecturas:** catálogo, ficha y franjas libres de un día.
- **Mutación pública:** crear cita.
- **Mutaciones del admin:** login, marcar vendida, cancelar, marcar no-show, cancelar en bloque y
  ajustar stock.

El PRD pide validar los datos en el cliente **y** en el servidor (Casos borde › datos inválidos).
No menciona ningún consumidor externo (app móvil, integraciones).

## Decisión

- **Lecturas** directamente en Server Components, llamando a funciones del dominio
  (`src/server/`).
- **Mutaciones** como **Server Actions**. Cada una:
  1. valida su entrada con un **esquema Zod** compartido con el formulario del cliente
     (`src/lib/schemas.ts`);
  2. en las de admin, **verifica la sesión dentro de la propia acción** (ADR 0008);
  3. llama al dominio y devuelve un resultado tipado
     `{ ok: true, data } | { ok: false, code, fieldErrors? }`. Nunca deja escapar una excepción
     cruda.
- **Franjas libres:** el `SlotPicker` las recibe de una Server Action de lectura
  `getAvailableSlots(date)`.

**Códigos de error del contrato:**

| Código | Cuándo |
|---|---|
| `VALIDATION` | Entrada inválida según Zod; incluye `fieldErrors` |
| `SLOT_TAKEN` | La franja se ocupó (restricción de franja, ADR 0006) |
| `ALREADY_BOOKED` | El email o el teléfono ya tienen una cita pendiente vigente; incluye la fecha de esa cita |
| `OUT_OF_STOCK` | Sin unidad disponible al agendar o al vender una cita tardía |
| `INVALID_STATE` | Transición de estado no permitida o ya aplicada (ADR 0006 §3) |
| `NOT_FOUND` | La moto o la cita no existen |
| `UNAUTHORIZED` | Acción de admin sin sesión válida |
| `RATE_LIMITED` | Se superó un límite de ADR 0010 |

**Superficie HTTP real.** Además de las páginas, quedan expuestos estos puntos:

- `POST` de Server Actions (endpoints implícitos de Next.js);
- `GET /api/health`, el chequeo posterior al deploy (ADR 0014);
- `/api/auth/*`, las rutas de Auth.js (`csrf`, `session`, `callback/credentials`, `signout`). Se
  documentan aquí porque **son superficie de ataque**: el límite de intentos de login se aplica
  dentro de `authorize()` y no solo en el formulario, para que no se pueda saltar con un POST
  directo (ADR 0008).

## Alternativas consideradas

- **Route Handlers REST** (`/api/citas`, `/api/motos`…): el contrato HTTP queda explícito y se
  puede probar con curl o Postman. Se descartó porque duplica trabajo (endpoint, fetch y
  validación de la respuesta en el cliente) sin un segundo consumidor que lo justifique.
- **Híbrido** (Server Actions + REST para las franjas): un endpoint consultable para el
  calendario. Se descartó por simplicidad, porque una Server Action de lectura cumple la misma
  función. Queda abierto como sugerencia S3 de la revisión adversarial.

## Consecuencias

- Hay **un solo esquema de validación** para cliente y servidor: los mensajes coinciden y no hay
  duplicación.
- Hay tipado de punta a punta sin generar clientes, y cada error de negocio tiene un código
  propio que la interfaz traduce a un estado de Design.md §6.
- Las Server Actions de Next.js verifican el `Origin`, lo que da protección contra CSRF.
- **Costo:** no existe una API pública. Una integración externa obligaría a escribir Route
  Handlers sobre el mismo dominio.
- **Costo:** las Server Actions son endpoints públicos aunque no lo parezcan, y las rutas de
  Auth.js también. **Toda** acción vuelve a validar con Zod, y las de admin verifican la sesión
  dentro de la propia acción, no solo en `proxy.ts` ni en el layout.
