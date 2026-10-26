# ADR 0010: Límites contra abuso implementados en la base de datos

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgos A1, A3 y C1)

## Contexto

Agendar una cita es **público y sin login** (PRD › No alcance). Cada cita **aparta stock** y
**ocupa una franja** durante hasta 30 días (ventana de agenda, criterio J2). La ventana tiene unas
230 franjas (9 por día × ~26 días laborables) y el stock total del catálogo son pocas decenas de
unidades.

La primera versión de este ADR limitaba a 5 citas por hora por IP. Eso permite **120 citas al día
desde una sola IP**: un script con emails y teléfonos inventados deja el catálogo "Agotado" en
pocas horas. Por tanto, **no** impedía el ataque que describía.

El login del admin también necesita un límite de intentos (ADR 0008).

## Decisión

Varios límites en capas, todos sobre Neon y sin servicios adicionales.

**Por persona**

1. **Una cita pendiente vigente por email y por teléfono.** Índices únicos parciales
   `appointments_email_pending_uq` y `appointments_phone_pending_uq`
   (`WHERE status = 'PENDIENTE'`).
   - Antes de insertar, en la misma transacción, las citas pendientes **ya vencidas** de ese email
     o teléfono pasan a `VENCIDA`, para que no bloqueen para siempre (ADR 0006 §3).
   - El error se devuelve como `ALREADY_BOOKED` con la fecha de la cita existente, nunca como
     `SLOT_TAKEN` (ADR 0006 §2).

**Por IP** (la IP se identifica con `HMAC-SHA256(ip, RATE_LIMIT_SECRET)`; nunca se guarda en claro
ni con un hash sin secreto, porque un SHA-256 simple se invierte por fuerza bruta sobre IPv4)

2. **Agendar:** como máximo **3 citas creadas por IP cada 24 horas** y **5 intentos por hora**.
3. **Login del admin:** como máximo **5 fallos cada 15 minutos**, aplicados **dentro de
   `authorize()`** de Auth.js (ADR 0008).

**Global**

4. **Tope de citas nuevas por día:** como máximo **40 citas creadas por día** en todo el sitio
   (configurable con `MAX_DAILY_BOOKINGS`). Si se supera, se devuelve `RATE_LIMITED` con un
   mensaje para escribir por WhatsApp. Es un fusible contra botnets: 40 está muy por encima de lo
   que recibe un concesionario y muy por debajo de lo que haría falta para agotar el catálogo
   durante 30 días.

**Recuperación**

5. Cada cita guarda su `ip_hmac`. El panel tiene una acción **"Cancelar en bloque"** que cancela
   todas las citas pendientes con el mismo `ip_hmac`. Libera de una sola vez el stock y las
   franjas tomadas por un abuso.

**Cómo se cuenta**

- Los contadores viven en `rate_limits(key, window_start, count)` y se incrementan con un
  `INSERT … ON CONFLICT DO UPDATE` atómico, **en una transacción propia, antes de la transacción
  de la cita**. Así un `SLOT_TAKEN` u `OUT_OF_STOCK` no revierte el contador.
- **Los errores de `VALIDATION` no cuentan**: Zod rechaza la entrada antes de llegar al limitador.
- El límite de 3 por día cuenta **citas creadas con éxito**: se incrementa después del commit de
  la cita.

### Cambio 2026-10-26 (pase de seguridad: SEC-01, SEC-02, SEC-03, SEC-12)

- **El tope global baja a 10 citas por día** (`MAX_DAILY_BOOKINGS`; un valor vacío o inválido usa 10, no 0).
  El tope anterior de 40 superaba el stock total del catálogo (17 unidades), así que la frase "no
  puede agotar el stock" era falsa.
- **Nuevo límite: 2 citas PENDIENTE simultáneas por origen** (`ip_hmac`), comprobado dentro de la
  transacción de la cita. Con ello un atacante necesita muchas IP distintas para acaparar stock.
- **Riesgo residual aceptado:** una botnet con muchas IP puede ocupar el stock durante días (cada cita
  aparta una unidad hasta 30 días). Se mitiga con el tope global, "Cancelar origen" en el panel y la
  liberación automática por fecha; un CAPTCHA o una verificación por SMS quedan fuera de la v1.
- **El límite de login cuenta el intento antes de verificar la contraseña** (un único `INSERT … ON
  CONFLICT` atómico). Así las peticiones simultáneas no se lo saltan. Se cuentan intentos, no solo
  fallos: 5 intentos cada 15 minutos por IP.
- **`ALREADY_BOOKED` ya no devuelve la fecha de la cita existente**: quien conozca el email o el
  teléfono de otra persona no puede averiguar cuándo va al concesionario. Queda como riesgo
  aceptado que alguien reserve con datos ajenos y bloquee a esa persona (no hay verificación de
  email o teléfono en la v1).
- Los contadores diario por IP y global conservan la lectura-luego-incremento: una carrera permite
  como mucho unas pocas citas de más, acotadas por el tope de pendientes por origen.

## Alternativas consideradas

- **Upstash Redis con `@upstash/ratelimit`**: el estándar en Vercel, con ventana deslizante. Se
  descartó porque suma otro servicio, otra cuenta y otra clave para un volumen que Postgres maneja
  de sobra.
- **Solo una cita por email o teléfono, sin límite por IP**: lo más simple. Se descartó porque un
  bot que cambia de email en cada intento lo esquiva.
- **CAPTCHA (Turnstile, hCaptcha) o verificación del teléfono por SMS**: frenan una botnet de
  verdad. Se descartaron para la v1 porque añaden un servicio externo y fricción al flujo de menos
  de 5 minutos. El tope global cubre ese riesgo hasta entonces.

## Consecuencias

- Desde **una IP** se pueden crear como mucho 3 citas al día, y el tope global limita una botnet a
  40 citas al día, que se pueden revertir en bloque.
- No hay infraestructura nueva, y los límites se prueban con tests de integración contra la misma
  base de datos.
- **Costo:** el tope global es un fusible que **también frena a los usuarios legítimos** cuando
  salta. Un ataque puede bloquear las reservas nuevas de un día, aunque no puede agotar el stock.
  Se acepta y se documenta en el runbook.
- **Costo:** si varias personas comparten IP (por ejemplo, el wifi de un circuito), chocan con el
  límite de 3 al día. Es un riesgo aceptado: pueden escribir por WhatsApp.
- **Costo:** los contadores son una escritura más por intento y la tabla crece. Las ventanas
  viejas se borran de forma oportunista al insertar.
- **Costo:** `RATE_LIMIT_SECRET` es un secreto más que gestionar. Si se rota, se pierden las
  ventanas en curso, lo cual es inocuo.
