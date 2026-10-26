# ADR 0013: Pruebas en tres niveles: Vitest, integración sobre rama efímera de Neon y Playwright en CI

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgos C2 y A7)

## Contexto

Hay tres fuentes de requisitos:

- **Rúbrica:** al menos un test E2E con Playwright del flujo más importante (10 %) y CI/CD
  configurado (10 %).
- **PRD › Criterios de éxito:**
  - agendar en menos de 5 minutos;
  - simulador exacto con ±0,01 €;
  - 0 franjas duplicadas y 0 citas sobre stock 0 con peticiones simultáneas.
- Las garantías de concurrencia viven en la base de datos (ADR 0006), así que solo se pueden
  probar contra un Postgres real.

La primera versión de este ADR corría el E2E **contra el Preview de Vercel**. La revisión mostró
que fallaría por dos motivos:

1. Los Preview tienen la protección de despliegue (Vercel Authentication) activada por defecto, y
   Playwright vería la pantalla de login.
2. La rama de Neon del Preview **se reutiliza en cada push del mismo PR** y nace como copia de
   `main`. Cada ejecución del E2E aparta stock y deja una cita pendiente, así que el test acabaría
   fallando de forma intermitente por moto agotada o cita ya existente.

## Decisión

### Niveles

| Nivel | Herramienta | Qué prueba | Dónde corre |
|---|---|---|---|
| Unitario | **Vitest** | `calcularCuota` y TAE contra casos de referencia; generación de franjas (lunes a sábado, 10–18 h, Europe/Madrid, fechas de cambio de hora); esquemas Zod; generación de `code` y `access_token`; tabla de transiciones de estado | Cada push, sin base de datos |
| Integración | **Vitest** + Neon | Ver la lista de casos obligatorios más abajo | GitHub Actions, sobre una **rama efímera de Neon** creada desde la rama `seed` (sin datos personales, ADR 0015) y borrada al final con `if: always()` |
| E2E | **Playwright** | Flujo crítico catálogo → ficha → simulador → cita → confirmación (móvil, 375 px); acceso con el código corto (`/cita/YZ-XXXX`) → 404; `/admin` sin sesión → login | GitHub Actions contra **`next build && next start`** conectado a la **misma rama efímera de CI**, con migración y seed deterministas antes de la ejecución |
| Smoke | `curl` | `GET /api/health` → 200 y `GET /` → 200 | Contra el **Preview** (con la cabecera `x-vercel-protection-bypass`) y contra **Producción** tras cada deploy |

Lighthouse (LCP y accesibilidad) corre como paso informativo contra la build local de CI.

### Casos de integración obligatorios

- **Concurrencia:**
  - 10 peticiones simultáneas sobre la misma franja → exactamente 1 cita creada y 9 respuestas
    `SLOT_TAKEN`;
  - 5 peticiones simultáneas sobre una moto con disponible = 1 → exactamente 1 cita creada y 4
    respuestas `OUT_OF_STOCK`.
- **Persona:** segunda cita con el mismo email o teléfono → `ALREADY_BOOKED`, no `SLOT_TAKEN`. Una
  cita pendiente ya vencida no bloquea.
- **Estados:**
  - doble envío de "marcar vendida" → `stock_total` baja **una sola vez** y el segundo envío
    responde `INVALID_STATE`;
  - venta tardía sin stock → `OUT_OF_STOCK` y disponible ≥ 0;
  - ajuste de stock por debajo de las citas pendientes → se rechaza.
- **Seguridad:**
  - cada Server Action de admin sin sesión → `UNAUTHORIZED` y ningún cambio;
  - el 6.º fallo de login en 15 minutos → `RATE_LIMITED`, también con POST directo a
    `/api/auth/callback/credentials`;
  - los límites de ADR 0010 (3 por día por IP y tope global).
- **Tiempo:** la liberación del stock por fecha, probada con el **reloj inyectado** (ADR 0004):
  la misma cita aparta stock con `today = D` y deja de hacerlo con `today = D+1`.

### Datos de prueba

Cada ejecución usa datos únicos: `e2e+{runId}@example.com`, un teléfono derivado del `runId` y la
**primera franja libre** que devuelve el `SlotPicker`, nunca una hora fija. Como la rama es
efímera, no se acumula estado entre ejecuciones.

### La métrica de menos de 5 minutos

El E2E tarda segundos, así que no mide el tiempo de una persona. Lo que el E2E **sí** verifica es
un indicador del esfuerzo: el flujo feliz se completa en **4 pantallas o menos y 12 interacciones
o menos** (clics y campos rellenados). Los 5 minutos del PRD se validan con una prueba de
usabilidad manual con al menos 3 personas, registrada en `docs/`.

## Alternativas consideradas

- **E2E contra el Preview de Vercel**: prueba el artefacto realmente desplegado. Se descartó
  como nivel principal por los dos fallos descritos en el contexto; queda solo como smoke test.
  Hacerlo fiable exigiría el bypass de protección y un paso de reset de la rama del Preview con la
  API de Neon en cada ejecución.
- **Vitest + Playwright sin integración**: menos infraestructura en CI. Se descartó porque la
  garantía más delicada del sistema (0 duplicados con concurrencia) quedaría sin evidencia
  automática.
- **Solo Playwright**: el mínimo de la rúbrica. Se descartó porque el dinero (simulador) y la
  concurrencia quedarían sin pruebas.

## Consecuencias

- Cada criterio verificable del PRD y del Tech Design tiene asignado un nivel de prueba, y el E2E
  es determinista porque cada ejecución empieza con una base de datos limpia.
- El E2E no depende de Vercel para correr, así que el feedback de cada PR es más rápido.
- **Costo:** el E2E no prueba el artefacto desplegado en Vercel: diferencias de entorno (variables
  de entorno, región, runtime) solo las detecta el smoke test. Se acepta.
- **Costo:** el CI necesita los secretos `NEON_API_KEY`, `NEON_PROJECT_ID` y
  `VERCEL_AUTOMATION_BYPASS_SECRET`. Si el borrado de la rama falla, quedan ramas huérfanas: hay
  un job de limpieza semanal que borra las ramas `ci-*` con más de 24 horas.
- **Costo:** el reloj inyectable obliga a que el dominio nunca llame a `new Date()` ni a `now()`
  directamente. Es una disciplina que la revisión de código debe vigilar.
- **Costo:** la métrica de 5 minutos queda medida en parte a mano (prueba de usabilidad), no solo
  de forma automática.
