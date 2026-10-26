# Security Pass — Eddie Store Yamaha Motocross

Fecha: 2026-10-26
Rama revisada: `block-e-cierre`, árbol de trabajo actual. Incluye el cambio sin commit en `src/proxy.ts`.

Alcance revisado:

- **Producto:** `PRD.md` y `CLAUDE.md`.
- **Arquitectura:** `TECH-DESIGN.md`, `adrs/0001–0016` y `docs/revision-adversarial.md`.
- **Código:** `src/**`, `scripts/**`, `drizzle/**`, `next.config.ts` y `proxy.ts`.
- **Configuración y CI/CD:** `.env.example`, `.gitignore`, `vercel.json` y `.github/workflows/ci.yml`.
- **Dependencias:** `package.json` y `npm audit`.
- **Pruebas:** `tests/unit`, `tests/integration` y `tests/e2e`.

No revisado (no hay material en el repositorio): la configuración real de Vercel (Deployment
Protection, variables por entorno) y de Neon (rama padre de las Preview). Se señala como
verificación pendiente donde importa. `stitch-eddie-store/` y `docs/_archivo/` quedan fuera del
alcance.

## Modelo de amenazas (resumen)

| Actor | Qué quiere | Superficie |
|---|---|---|
| Competidor o bromista sin cuenta | Dejar el catálogo "Agotado" y llenar la agenda de citas falsas | `createAppointmentAction` (público, sin login, sin CAPTCHA) |
| Curioso o acosador que conoce el email o teléfono de alguien | Saber si esa persona tiene cita, y cuándo va a estar en el concesionario | Respuesta `ALREADY_BOOKED` |
| Atacante de credenciales | Entrar al panel: datos personales de todos los clientes, cambiar stock, cancelar citas | `/api/auth/callback/credentials` y `loginAction` |
| Quien obtiene una URL `/cita/{token}` | Ver una cita ajena | `findByToken` |
| Cadena de suministro / CI | Robar `VERCEL_TOKEN` o desplegar código malicioso | `ci.yml`, `npm ci` y el build de Vercel |

Activos sensibles: nombre, email y teléfono de los pilotos (RGPD), el stock (es lo que vende el
producto), la agenda y la sesión de admin.

## Resumen ejecutivo

El proyecto está bien defendido en lo básico:

- Autorización dentro de cada acción y página de admin.
- Token de 128 bits guardado como hash.
- Consultas parametrizadas, sin SQL crudo con datos de entrada.
- Logs sin datos personales.
- Ninguna vulnerabilidad en las dependencias de producción.

**El riesgo principal es de disponibilidad del negocio, y es de diseño.** El tope global de 40
citas al día (ADR 0010) es **mayor que el stock total del catálogo, que son 17 unidades**. Con
unas 6 IPs y datos inventados, alguien puede dejar **todas** las motos "Agotadas" durante hasta
30 días, aunque el ADR afirma que eso no es posible.

Le siguen tres riesgos medios:

- El límite de intentos de login se salta con peticiones concurrentes.
- La respuesta `ALREADY_BOOKED` revela el día y la hora de la cita de un tercero a quien conozca
  su email o su teléfono.
- No hay pruebas automáticas de los controles de autorización del panel.

Los hallazgos restantes son de severidad baja o informativos.

## Fortalezas de seguridad

Qué **no** tocar al remediar:

- **Autorización real en cada acción y página de admin.**
  - `requireAdmin()` comprueba la sesión, la expiración absoluta de 8 h contada desde el login y
    que el `session_version` coincida con la base de datos (`src/server/adminSession.ts:10-19`).
  - La llaman `appointmentAction` y `stockAction` (`src/app/admin/actions.ts:46,70`), además de
    las dos páginas de admin (`src/app/admin/page.tsx:29`, `src/app/admin/stock/page.tsx:26`).
  - `proxy.ts` solo redirige, tal como pide ADR 0008.
- **El límite de login vive dentro de `authorize()`** (`src/auth.ts:37-53`), así que también
  cubre un POST directo a `/api/auth/callback/credentials`. El mensaje de error es genérico
  (`src/app/admin/actions.ts:35`).
- **Las contraseñas usan argon2id** (`src/server/password.ts`). No hay credenciales en el código:
  el admin se crea desde variables de entorno y se exige una contraseña de al menos 12 caracteres
  (`scripts/seed-admin.ts:14`).
- **Token de confirmación:**
  - 128 bits de `randomBytes` (`src/server/codes.ts:12-14`);
  - se guarda solo su SHA-256 (`src/server/booking.ts:69`) y se busca por ese hash con el formato
    validado (`src/server/booking.ts:155-172`);
  - el código `YZ-XXXX` no da acceso a la cita;
  - la página `/cita/[token]` muestra solo el nombre de pila y el teléfono enmascarado
    (`src/app/cita/[token]/page.tsx:34,57`) y lleva `no-referrer` y `noindex`
    (`next.config.ts:30-35`).
- **Sin inyección SQL:** todo pasa por Drizzle con parámetros. El único SQL interpolado usa
  columnas, no datos de entrada (`rateLimit.ts:32`, `appointmentState.ts:68`).
- **Sin XSS:** no hay `dangerouslySetInnerHTML`. El texto del enlace de WhatsApp se codifica con
  `encodeURIComponent` (`src/lib/site.ts:15`).
- **Concurrencia de la cita correcta:**
  - `FOR UPDATE` sobre la moto, índices únicos parciales y traducción del error `23505` por
    nombre de restricción (`src/server/booking.ts:36-89`);
  - transiciones con `UPDATE … WHERE status IN … RETURNING` (`src/server/appointmentState.ts:58-63`);
  - todo cubierto con pruebas concurrentes (`tests/integration/booking.test.ts:101-111`,
    `tests/integration/admin.test.ts:44-58`).
- **El precio y la cuota se recalculan en el servidor** (`src/server/booking.ts:103-111`).
- **IP solo como HMAC con secreto, y fallo cerrado si falta el secreto** (`src/server/codes.ts:21-25`).
- **Logs limpios:** las 11 llamadas a `log()` revisadas solo registran eventos, códigos de cita,
  conteos, el slug o `errorName`. Ninguna registra nombre, email, teléfono, token ni IP.
- **Retención:** anonimización a los 90 días y un `CHECK` que impide anular datos sin marcar
  `anonymized_at` (`src/server/privacy.ts:10-28`, `src/server/schema.ts:113`).
- **Cabeceras:** `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy` y
  `Permissions-Policy` (`next.config.ts:16-28`).
- **CSRF:** las Server Actions comprueban `Origin` frente a `Host` (Next.js) y el callback de
  credenciales usa el token CSRF de Auth.js.
- **CI/CD:**
  - `permissions: contents: read` (`ci.yml:12-13`);
  - el deploy no corre en PRs de forks (`ci.yml:104`);
  - versión de `vercel` fijada (`ci.yml:119`);
  - los secretos de CI son valores de prueba;
  - `.env*` está ignorado (`.gitignore`) y en el historial de git no aparecen secretos.
- **Dependencias:** `npm audit --omit=dev` da **0 vulnerabilidades**. `next` y `next-auth` están
  fijados a versiones exactas.

## Findings

### HIGH

#### SEC-01 — Con unas 6 IPs se agota todo el catálogo durante hasta 30 días

- **Severity:** HIGH
  - **Justificación:** el valor central del PRD es consultar el stock real y agendar. El ataque
    lo anula para todos los clientes con un coste casi nulo: sin cuenta, sin CAPTCHA y con datos
    inventados.
- **Confidence:** HIGH sobre los números del catálogo. MEDIUM sobre la facilidad de rotar IPs
  (rotar IPv6 depende de la red del atacante).
- **Category:** Abuso de lógica de negocio / agotamiento de recursos (disponibilidad).
- **Affected artifact:** `adrs/0010-limites-abuso-en-base-de-datos.md`, `src/server/rateLimit.ts`,
  `src/server/catalogData.ts`.
- **Location:**
  - `src/server/rateLimit.ts:9-14`: 3 citas por IP al día y 40 en total al día.
  - `src/server/catalogData.ts:35,92,142,192,242,292`: stock de 3, 4, 2, 5, 3 y 0 unidades, en
    total **17**.
  - ADR 0010, "Consecuencias", afirma que un ataque "no puede agotar el stock".
- **Description:**
  - Cada cita `PENDIENTE` aparta una unidad hasta su fecha, que puede estar hasta 30 días en el
    futuro (ADR 0004).
  - El tope global de 40 al día es **más del doble del stock total**.
  - El límite por IP usa la dirección completa y no agrupa IPv6 por prefijo `/64`
    (`src/server/requestIp.ts:7`).
  - Una sola persona no puede reservar dos veces, pero el email y el teléfono no se verifican, así
    que basta con inventarlos.
- **Evidence:** `bookingsPerDayGlobal: Number(process.env.MAX_DAILY_BOOKINGS ?? 40)` frente a una
  suma de `stockTotal` de 17. En `/cita` solo se ofrecen las motos con `available > 0`
  (`src/app/cita/page.tsx:39`), así que una moto agotada no se puede agendar.
- **Attack scenario:**
  1. Un script envía 17 reservas desde 6 IPs (3 por IP) o desde una red IPv6.
  2. Usa emails y teléfonos `+34 6xx…` inventados y franjas repartidas entre los días 25 y 30 de
     la ventana.
  3. El catálogo queda "Agotado" hasta que pasen esas fechas.
  4. "Cancelar origen" agrupa por IP, así que el admin tiene que repetir la acción 6 veces o
     cancelar 17 citas.
  5. Al día siguiente el atacante repite con IPs nuevas.
- **Potential impact:** ninguna reserva nueva y un catálogo que miente sobre el stock. El
  concesionario pierde ventas y la agenda se llena de datos falsos.
- **Existing mitigation:**
  - una cita pendiente por email y por teléfono;
  - 3 citas por IP al día y 5 intentos por hora;
  - tope global de 40;
  - la acción de cancelar en bloque por origen.

  Ninguna impide el escenario descrito.
- **Recommended remediation:** decidirlo en el ADR. Opciones, de menor a mayor fricción:
  - un tope global por debajo del stock, o un tope de citas pendientes **por moto** relativo a su
    stock (por ejemplo, no más del 50 % de las unidades apartadas por citas creadas en las
    últimas 24 h);
  - agrupar las IPv6 por `/64` en el HMAC;
  - acortar la ventana durante la que una cita aparta stock (por ejemplo, 7 días);
  - un CAPTCHA invisible (Turnstile) solo cuando se supere un umbral.
- **Suggested verification:** prueba de integración que cree 17 citas desde 6 `ipHmac` distintos
  con el catálogo de producción y compruebe que al menos una moto sigue disponible.
- **Required change type:** DESIGN / ADR CHANGE

### MEDIUM

#### SEC-02 — Los límites de intentos se comprueban antes y se cuentan después, y peticiones concurrentes los saltan

- **Severity:** MEDIUM. El límite de login es el único freno a la fuerza bruta sobre la cuenta
  que ve todos los datos personales. No llega a HIGH porque se exige una contraseña de 12
  caracteres o más y argon2id.
- **Confidence:** HIGH
- **Category:** Condición de carrera (TOCTOU) / falta de límite de intentos.
- **Affected artifact:** `src/auth.ts`, `src/server/rateLimit.ts`, `src/app/cita/actions.ts`.
- **Location:**
  - `src/auth.ts:40`: `loginBlocked` solo lee el contador.
  - `src/auth.ts:48-50`: el contador se incrementa después de verificar con argon2.
  - `src/server/rateLimit.ts:57-58` (lee) y `:63-66` (incrementa después de crear la cita).
- **Description:**
  - En el login, el contador se lee y solo se incrementa tras el `verify` de argon2, que tarda
    decenas de milisegundos. Todas las peticiones que llegan a la vez leen un contador menor que
    5 y pasan.
  - El límite por IP es el único que existe: no hay límite por cuenta.
  - Las citas tienen el mismo patrón para el límite diario por IP y el tope global. Ahí el daño
    está acotado porque el contador por hora sí es atómico (`increment`, línea 55), pero permite
    5 citas por IP en lugar de 3 y superar el tope de 40.
- **Evidence:** `if (await loginBlocked(ip, now)) …` seguido de
  `… await verifyPassword(…)` y `if (!valid) { await recordLoginFailure(ip, now) …`.
- **Attack scenario:** cada 15 minutos el atacante lanza ráfagas de 200 POST simultáneos a
  `/api/auth/callback/credentials` con un diccionario. Con funciones de Vercel concurrentes, la
  mayoría se evalúan antes de que se registre el quinto fallo. Una botnet ni siquiera necesita la
  carrera, porque no hay límite por cuenta.
- **Potential impact:** fuerza bruta viable contra una contraseña de admin débil, aunque tenga 12
  caracteres o más (por ejemplo `EddieStore2026`), y con ella el acceso a nombre, email y
  teléfono de todos los clientes.
- **Existing mitigation:** argon2id, longitud mínima de 12 caracteres en el seed y mensaje
  genérico.
- **Recommended remediation:**
  - Reservar el intento **antes** de verificar: `increment()` atómico de `login:${ip}` y bloqueo
    si el resultado es mayor que 5. Si el login acierta, se descuenta o se ignora.
  - Añadir un contador por cuenta (`login-user:${hmac(email)}`).
  - En las citas, usar también `increment` atómico antes de crear la cita para el límite diario
    por IP y el tope global, y descontar si la creación falla. Eso exige ajustar el texto de
    ADR 0010, que hoy dice "se incrementa después del commit".
- **Suggested verification:** prueba de integración con 20 llamadas concurrentes a
  `authorize()` con una contraseña errónea: como mucho 5 deben llegar a `verifyPassword`.
- **Required change type:** CODE FIX. El ajuste del texto de ADR 0010 sobre cuándo se cuenta va
  con el mismo cambio, según la regla de CLAUDE.md: primero el ADR y después el código.

#### SEC-03 — `ALREADY_BOOKED` revela la cita de otra persona a quien conozca su email o teléfono

- **Severity:** MEDIUM. Expone a terceros datos personales vinculados a una persona
  identificable: que tiene cita y el día y la hora en que va a estar en un lugar físico. Es un
  fallo de confidencialidad según el RGPD (art. 5.1.f). Está acotado por el límite de 5 intentos
  por hora.
- **Confidence:** HIGH
- **Category:** Exposición de datos sensibles / oráculo de enumeración.
- **Affected artifact:** ADR 0010 (punto 1, que decide devolver la fecha), `src/server/booking.ts`
  y `src/components/BookingForm.tsx`.
- **Location:**
  - `src/server/booking.ts:96-97` y `:143-152`: `existingBooking` busca por email **o**
    teléfono.
  - `src/components/BookingForm.tsx:206-211`: muestra "Ya tienes una cita el sáb 8 nov · 11:00".
- **Description:**
  - Cualquiera puede enviar el formulario con el teléfono, o el email, de otra persona y datos
    propios en el resto de campos.
  - Si esa persona tiene una cita pendiente, la respuesta muestra su fecha y hora.
  - Si no la tiene, se crea una cita a nombre de ese teléfono o email. Desde ese momento, la
    persona real recibe `ALREADY_BOOKED` y no puede agendar: suplantación con bloqueo.
- **Evidence:** `return fail("ALREADY_BOOKED", { details: await existingBooking(getDb(), input.email, input.phone) });`
- **Attack scenario:** una expareja o un acosador que conoce el teléfono de un piloto lo usa en
  el formulario y obtiene "Ya tienes una cita el sáb 8 nov · 11:00": sabe dónde estará esa
  persona.
- **Potential impact:** riesgo para la privacidad y la seguridad física de una persona, y
  bloqueo de reservas legítimas.
- **Existing mitigation:** 5 intentos por hora por IP (SEC-01 y SEC-02 explican sus límites).
- **Recommended remediation:**
  - Devolver `ALREADY_BOOKED` **sin** fecha ni hora ("Ya hay una cita pendiente con ese email o
    teléfono; escríbenos por WhatsApp").
  - Si se quiere que el piloto recuerde su cita, mostrar la fecha solo cuando **el email y el
    teléfono** coinciden a la vez.
  - El bloqueo por suplantación sin verificación es una decisión de producto: ver Gobernanza.
- **Suggested verification:** prueba de integración en la que una cita existente con teléfono
  T, ante un segundo intento con T y un email distinto, devuelva `ALREADY_BOOKED` sin
  `existingDate`.
- **Required change type:** DESIGN / ADR CHANGE (ADR 0010 punto 1 y Design.md §6 del mensaje).

#### SEC-04 — Los controles de autorización y sesión del panel no tienen ninguna prueba

- **Severity:** MEDIUM. `requireAdmin()` es la barrera real según ADR 0008. Una regresión, por
  ejemplo quitar la llamada de una acción nueva, no la detectaría el CI.
- **Confidence:** HIGH
- **Category:** Falta de pruebas de controles de seguridad.
- **Affected artifact:** `tests/**`.
- **Location:**
  - En `tests/` no aparece `requireAdmin`, `appointmentAction`, `stockAction` ni
    `session_version`.
  - La única prueba de login es secuencial (`tests/integration/admin.test.ts:130`).
- **Description:** faltan pruebas negativas de:
  - una acción de admin sin sesión, o con `session_version` desfasado, que debe devolver
    `UNAUTHORIZED` sin cambiar la base de datos;
  - una sesión de más de 8 h, que debe ser rechazada;
  - `/cita/YZ-XXXX`, que debe dar 404;
  - `/cita/{token}`, que no debe mostrar el email ni el teléfono completo;
  - el login concurrente (SEC-02).
- **Evidence:** las búsquedas sin resultados en `tests/` descritas arriba.
- **Attack scenario:** no aplica directamente. Es un riesgo de regresión.
- **Potential impact:** un fallo de control de acceso llegaría a producción sin aviso.
- **Existing mitigation:** revisión manual de código.
- **Recommended remediation:** añadir las pruebas descritas: [I] para `requireAdmin` con una
  sesión simulada y [E] para `/admin` sin cookie y `/cita/{code}`.
- **Suggested verification:** las pruebas deben fallar al comentar `requireAdmin()` en
  `stockAction`.
- **Required change type:** TEST FIX

### LOW

#### SEC-05 — Ni las sesiones ni la contraseña del admin se pueden revocar o cambiar

- **Severity:** LOW. Mitigado por la expiración absoluta de 8 h.
- **Confidence:** HIGH
- **Category:** Gestión de sesión.
- **Affected artifact:** `src/app/admin/actions.ts`, `scripts/seed-admin.ts` y ADR 0008.
- **Location:**
  - `src/app/admin/actions.ts:41-43`: `signOut` solo borra la cookie.
  - En el repositorio no hay ningún código que incremente `session_version` (solo
    `src/server/schema.ts:75`).
  - `scripts/seed-admin.ts:2,19` "nunca cambia una contraseña existente".
- **Description:** ADR 0008 promete revocar sesiones al resetear la contraseña o con "cerrar
  todas las sesiones", y ADR 0008 (Consecuencias) dice que el reset se hace "con el script de
  seed". Ninguno de los dos mecanismos existe. Un JWT robado sigue siendo válido hasta 8 h después
  del logout, y una contraseña comprometida no se puede rotar sin tocar la base de datos a mano.
- **Evidence:** `onConflictDoNothing({ target: adminUsers.email })` en el seed, y no hay ningún
  `UPDATE` de `session_version`.
- **Attack scenario:** se filtra la contraseña del admin. El concesionario no tiene una forma
  documentada de cambiarla ni de expulsar a quien ya ha entrado.
- **Potential impact:** acceso persistente al panel después de un incidente.
- **Existing mitigation:** expiración absoluta de 8 h y la comprobación de `session_version`, que
  ya está en `requireAdmin`.
- **Recommended remediation:** un script `db:reset-admin-password` que cambie el hash y haga
  `session_version = session_version + 1`, y opcionalmente que el logout también lo incremente.
  Documentarlo en el runbook.
- **Suggested verification:** prueba de integración: tras el reset, `requireAdmin()` con el
  token anterior devuelve `null`.
- **Required change type:** CODE FIX

#### SEC-06 — El tiempo de respuesta del login revela si un email es de un admin

- **Severity:** LOW
- **Confidence:** MEDIUM. La diferencia es de decenas de ms y medible.
- **Category:** Enumeración de usuarios.
- **Location:** `src/auth.ts:45-48`. Si el email no existe, no se ejecuta `verifyPassword`
  (argon2).
- **Description:** cuando el email no existe, la respuesta llega notablemente antes, lo que
  confirma qué emails son de un admin y permite concentrar en ellos la fuerza bruta (SEC-02).
- **Evidence:** `const valid = !!user && parsed.success && (await verifyPassword(...))`
- **Attack scenario:** el atacante mide el tiempo de respuesta con varios candidatos
  (`admin@…`, `ventas@…`).
- **Potential impact:** facilita SEC-02.
- **Existing mitigation:** mensaje de error genérico.
- **Recommended remediation:** verificar contra un hash ficticio precalculado cuando no existe el
  usuario.
- **Suggested verification:** prueba unitaria: `verifyPassword` se llama también con un email
  inexistente.
- **Required change type:** CODE FIX

#### SEC-07 — La fuente de iconos se carga desde Google en cada visita, en contra de lo que dice `/privacidad`

- **Severity:** LOW
- **Confidence:** HIGH
- **Category:** Privacidad / transferencia a terceros (RGPD).
- **Location:** `src/app/layout.tsx:24-27` (`<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined…">`)
  y `src/app/privacidad/page.tsx:17` ("No … compartimos tus datos con terceros").
- **Description:** cada visita envía a Google la IP del visitante sin base legal informada. Las
  fuentes de texto sí se sirven en local con `next/font`.
- **Evidence:** las líneas citadas.
- **Attack scenario:** no es un ataque. Es un riesgo de cumplimiento: hay precedentes de
  tribunales en la UE que lo han sancionado.
- **Potential impact:** un incumplimiento del RGPD y un texto de privacidad que no es veraz.
- **Existing mitigation:** ninguna.
- **Recommended remediation:** servir Material Symbols en local (paquete
  `material-symbols` o el `.woff2` en `public/`), o declarar el tercero en `/privacidad`.
- **Suggested verification:** prueba E2E: ninguna petición a `fonts.googleapis.com` ni a
  `fonts.gstatic.com`.
- **Required change type:** CODE FIX

#### SEC-08 — Las Server Actions de admin no validan la entrada con Zod

- **Severity:** LOW. Solo un admin autenticado llega a ese punto.
- **Confidence:** HIGH
- **Category:** Validación de entrada / manejo de errores. También incumple la regla de ADR 0007
  y de CLAUDE.md.
- **Location:** `src/app/admin/actions.ts:48-49` (`id` y `kind` como `String(...)`) y `:72-73`.
- **Description:** un `id` que no es un UUID llega a Postgres, que lanza el error `22P02`, y la
  excepción sale de la acción sin traducirse a un código.
- **Evidence:** `const id = String(formData.get("id") ?? "")` se pasa directo a `transition`.
- **Attack scenario:** un admin, o un CSRF que no es posible por la comprobación de Origin, envía
  un `id` mal formado y recibe la pantalla de error genérico.
- **Potential impact:** un error no controlado y un contrato `{ ok, code }` incumplido.
- **Recommended remediation:** un esquema Zod con `id: z.uuid()` y
  `kind: z.enum([...])`, y `slug` con el mismo `regex` de `bookingSchema`.
- **Suggested verification:** prueba de integración: `id = "x"` devuelve `VALIDATION` o
  `NOT_FOUND`, no una excepción.
- **Required change type:** CODE FIX

#### SEC-09 — `proxy.ts` puede lanzar una excepción con una URL mal codificada (cambio sin commit)

- **Severity:** LOW
- **Confidence:** MEDIUM. Depende de que Next entregue el `pathname` sin decodificar, lo cual no
  se ha probado en ejecución.
- **Category:** Manejo de errores / disponibilidad.
- **Location:** `src/proxy.ts`, en el diff sin commit: `decodeURIComponent(moto[1])` y
  `decodeURIComponent(cita[1])`.
- **Description:** con `/motos/%E0%A4%A` o `/cita/%`, `decodeURIComponent` lanza `URIError`. En
  `proxy.ts` eso produce un 500 en lugar de un 404.
- **Attack scenario:** un escáner provoca errores 500 que ensucian los logs y las alertas.
- **Potential impact:** ruido operativo, sin exposición de datos.
- **Recommended remediation:** envolver la decodificación en `try/catch` y devolver `notFound(req)`
  si falla.
- **Suggested verification:** prueba E2E: `GET /motos/%E0` responde 404.
- **Required change type:** CODE FIX

#### SEC-10 — La contraseña del primer admin queda para siempre en las variables de Vercel

- **Severity:** LOW
- **Confidence:** MEDIUM. Depende de que el equipo no la borre después del primer deploy, lo cual
  no se puede comprobar desde el repositorio.
- **Category:** Gestión de secretos.
- **Location:** `package.json:11` (`build:vercel` ejecuta `db:seed-admin` en **cada** build),
  `.env.example:22-23` y ADR 0016 §cambio 2026-10-26.
- **Description:** para que el seed funcione, `SEED_ADMIN_PASSWORD` tiene que existir en Vercel.
  Nada indica que deba borrarse después. La contraseña de la cuenta con acceso a todos los datos
  personales queda en claro, al alcance de cualquier miembro del proyecto de Vercel. Además, si
  cambia `SEED_ADMIN_EMAIL`, el siguiente build crea un admin nuevo de forma silenciosa.
- **Recommended remediation:** documentar en el runbook que las dos variables se borran después
  del primer deploy, o que el script falle si `admin_users` ya tiene filas.
- **Suggested verification:** revisar las variables del proyecto en Vercel.
- **Required change type:** PROCESS / HARNESS CHANGE

#### SEC-11 — La CSP no restringe scripts (solo `frame-ancestors`)

- **Severity:** LOW. Hoy no hay ningún punto de inyección de HTML (React escapa la salida y no hay
  `dangerouslySetInnerHTML`), así que es defensa en profundidad.
- **Confidence:** HIGH
- **Category:** Configuración / cabeceras.
- **Location:** `next.config.ts:24`. Sugerencia S8 de `docs/revision-adversarial.md`, que sigue
  pendiente en parte.
- **Description:** si se introduce un XSS en el futuro, nada impediría que se ejecute en el panel
  de admin, donde están los datos personales. Una CSP con nonce obliga a renderizar de forma
  dinámica y choca con `cacheComponents` y PPR, así que hace falta una decisión de diseño. Una
  alternativa es una CSP sin nonce solo en `/admin/*`, o `script-src 'self'` más los hashes de
  Next.
- **Recommended remediation:** decidirlo en un ADR (o en ADR 0014) y aplicarlo al menos en
  `/admin/*`.
- **Required change type:** DESIGN / ADR CHANGE

#### SEC-12 — Si `MAX_DAILY_BOOKINGS` está vacía, todas las reservas se bloquean

- **Severity:** LOW. Es un fallo cerrado: afecta a la disponibilidad, no a la confidencialidad.
- **Confidence:** HIGH
- **Category:** Valor por defecto inseguro o frágil.
- **Location:** `src/server/rateLimit.ts:12` y `.env.example:14` (`MAX_DAILY_BOOKINGS=` vacía).
- **Description:** `Number("" ?? 40)` vale `0`, porque `??` no sustituye la cadena vacía. Quien
  copie `.env.example` tal cual, o cree la variable vacía en Vercel, obtiene `RATE_LIMITED` en
  todas las reservas.
- **Recommended remediation:** `Number(process.env.MAX_DAILY_BOOKINGS) || 40`, con validación de
  que sea un entero positivo.
- **Suggested verification:** prueba unitaria del parseo con `""`, `"abc"` y `"10"`.
- **Required change type:** CODE FIX

### INFO

#### SEC-13 — La anonimización a los 90 días solo corre cuando alguien abre el panel

- **Severity:** INFO · **Confidence:** HIGH · **Category:** Privacidad / retención.
- **Location:** `src/app/admin/page.tsx:31` y ADR 0015 punto 3 ("oportunista, sin cron").
- **Description:** si nadie abre `/admin` durante semanas, los datos personales se conservan más
  de los 90 días que promete `/privacidad`. Es coherente con el ADR, pero esa consecuencia no
  figura en él.
- **Recommended remediation:** aceptarlo de forma explícita, o añadir un Vercel Cron diario que
  llame a `anonymizeExpired`.
- **Required change type:** ACCEPT RISK

#### SEC-14 — Vulnerabilidades moderadas solo en dependencias de desarrollo

- **Severity:** INFO · **Confidence:** HIGH · **Category:** Cadena de suministro.
- **Evidence:** `npm audit` informa de 4 vulnerabilidades moderadas en
  `esbuild <=0.24.2`, a través de `@esbuild-kit/*` y `drizzle-kit` (GHSA-67mh-4wv8-2f99:
  servidor de desarrollo de esbuild). `npm audit --omit=dev` da 0.
- **Description:** `drizzle-kit` corre en el build de Vercel y en el CI, pero no levanta el
  servidor de esbuild, así que no es explotable en este proyecto.
- **Recommended remediation:** actualizar `drizzle-kit` cuando salga una versión sin
  `@esbuild-kit`, y no aplicar `npm audit fix --force`, que lo bajaría a 0.18.
- **Required change type:** ACCEPT RISK

#### SEC-15 — El aislamiento de datos en Preview depende de configuración que no está en el repositorio

- **Severity:** INFO · **Confidence:** LOW. Falta ver la configuración de la integración
  Neon–Vercel y la Deployment Protection de Vercel.
- **Category:** Configuración / separación de entornos.
- **Location:** `package.json:11` (`build:vercel` migra y siembra el admin también en Preview),
  `ci.yml:101-129` (deploy de Preview en cada PR del mismo repositorio) y ADR 0015 punto 5 y
  ADR 0016 (rama padre `seed`).
- **Description:**
  - Si la integración sigue con el valor por defecto (ramas de Preview copiadas desde `main`),
    cada PR copia datos personales reales a una URL de Preview.
  - Además, una migración de un PR sin revisar correría sobre esa copia.
  - El repositorio no lo puede garantizar.
- **Recommended remediation:** comprobar en la consola que la rama padre de las Preview es `seed`
  y que la Deployment Protection de Vercel está activa en Preview, y dejarlo anotado en el
  runbook.
- **Required change type:** PROCESS / HARNESS CHANGE

## Prioridad

1. **SEC-01** (decisión de ADR 0010). Es el riesgo de mayor impacto sobre el negocio y el más
   barato de ejecutar. Conviene decidirlo junto con **SEC-03**, porque los dos tocan ADR 0010.
2. **SEC-02.** Es un cambio pequeño de código: incrementar el contador antes de verificar.
   Protege la cuenta que da acceso a todos los datos personales.
3. **SEC-04.** Añadir las pruebas antes de tocar `auth.ts` o `adminSession.ts`, para que la
   corrección de SEC-02, SEC-05 y SEC-06 quede protegida contra regresiones.
4. **SEC-05 y SEC-10** juntos: un script de reset que incremente `session_version`, y el runbook
   de las variables del seed.
5. **SEC-12, SEC-09 y SEC-08.** Correcciones de una línea. SEC-09 conviene arreglarlo antes de
   hacer commit del cambio de `proxy.ts`.
6. **SEC-06 y SEC-07.**
7. **SEC-11, SEC-13, SEC-14 y SEC-15**, cuando haya decisión o al preparar la entrega
   (`deploy-pass`).

## Gobernanza / Decisión requerida

Este pase no decide nada de lo siguiente. Necesita una decisión humana:

- **SEC-01 — DESIGN / ADR CHANGE (ADR 0010).** La premisa del ADR, "un ataque no puede agotar el
  stock", es falsa con el catálogo actual (17 unidades frente al tope de 40). Elegir el mecanismo
  (tope por moto, tope global por debajo del stock, IPv6 por `/64`, ventana de apartado más
  corta o CAPTCHA por umbral) es una decisión de arquitectura y de fricción de producto.
- **SEC-03 — DESIGN / ADR CHANGE (ADR 0010 y Design.md §6).** Dejar de mostrar la fecha de la
  cita existente cambia un texto decidido en el diseño.
  - **Decisión de producto asociada:** reservar a nombre de otra persona sin verificar email ni
    teléfono bloquea a esa persona. Verificar exige enviar emails o SMS, y eso está en "No
    alcance" del PRD. Hay que decidir si se acepta ese riesgo o si se cambia el alcance.
- **SEC-11 — DESIGN / ADR CHANGE.** La CSP con nonce choca con `cacheComponents` y PPR. Hay que
  decidir el alcance (solo `/admin` o todo el sitio) y el mecanismo. Está pendiente desde la
  sugerencia S8.
- **SEC-13 — ACCEPT RISK.** Que la retención dependa de que alguien abra el panel debe aceptarse
  de forma explícita en ADR 0015, o resolverse con un cron.
- **SEC-14 — ACCEPT RISK.** Las vulnerabilidades moderadas de `esbuild` solo existen en
  desarrollo. Proponemos aceptarlas hasta que salga una versión de `drizzle-kit` que las corrija.
