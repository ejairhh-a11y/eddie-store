# Technical Design Document: Eddie Store — Yamaha Motocross

**Tipo de proyecto:** Greenfield. El repositorio solo contenía HTML estático generado por Google
Stitch (`stitch-eddie-store/`), que se usa como **referencia visual**, no como código heredado. Los
documentos de arquitectura anteriores (`DISENO-TECNICO.md` y `docs/adr/`) eran de otro proyecto
(apuestas deportivas) y se archivaron en `docs/_archivo/apuestas/`.
**Design.md disponible:** Sí. El modelo de datos se derivó del PRD y de lo que las pantallas de
`Design.md` necesitan mostrar.
**Revisión adversarial:** hecha el 2026-10-25 ([informe](docs/revision-adversarial.md)). Se
aplicaron sus 3 hallazgos críticos y sus 7 advertencias. Las 9 sugerencias quedan pendientes.

## Resumen

Eddie Store es la web de un concesionario Yamaha de motocross (ficticio) donde el piloto amateur
consulta **precio y stock real**, **simula la cuota** de financiación y **agenda una cita** en el
concesionario en menos de 5 minutos, sin escribir por WhatsApp ([PRD](PRD.md)). No hay pago en
línea ni cuentas de piloto. El concesionario gestiona las citas y el stock desde un panel
protegido.

Técnicamente es **una sola aplicación Next.js 16 full-stack** desplegada en Vercel, sobre
**PostgreSQL en Neon**. La parte delicada del diseño es la **consistencia**: una franja no puede
tener dos citas, la última unidad no puede apartarse dos veces y ninguna acción del admin puede
dejar el stock negativo, aunque lleguen peticiones a la vez. Esas garantías las da la base de
datos (índices únicos, bloqueo de fila y transiciones condicionales), no el código.

## Arquitectura de componentes

```
                        ┌──────────────────── Vercel (proyecto eddie-store-yamaha-motocross) ───────────────────┐
                        │  Next.js 16 · App Router · cacheComponents · TypeScript · Tailwind v4 · runtime Node  │
 Navegador ── HTTPS ──► │                                                                                       │
 (piloto / admin)       │  UI (Server + Client Components)                                                     │
                        │   /  ·  /motos/[slug]  ·  /financiacion  ·  /cita  ·  /cita/[token]  ·  /privacidad    │
                        │   /admin/login  ·  /admin  ·  /admin/stock          proxy.ts (redirige /admin/*)      │
                        │        │ lecturas ("use cache", tag "stock")    │ Server Actions (Zod + sesión)      │
                        │        ▼                                        ▼                                    │
                        │  src/server/  ── dominio (recibe `today`/`now` de un reloj inyectable) ──────         │
                        │   catalog.ts · availability.ts · booking.ts · appointmentState.ts (transiciones)     │
                        │   admin.ts · rateLimit.ts · privacy.ts (anonimización) · auth.ts · log.ts · db.ts    │
                        │  src/lib/  ── puro, compartido cliente/servidor ─────────────────────                │
                        │   finance.ts (cuota/TAE) · slots.ts (franjas) · schemas.ts (Zod) · codes.ts          │
                        │  /api/health  ·  /api/auth/* (Auth.js)                                               │
                        └───────────────────────────────┬──────────────────────────────────────────────────────┘
                                                        │ driver serverless de Neon
                                                        ▼
                     ┌──────────────────────── Neon PostgreSQL ─────────────────────────┐
                     │ main (prod, único con datos personales) · seed (catálogo, sin DP) │
                     │ preview/* ← seed · ci-* ← seed (efímeras) · dev ← seed           │
                     └───────────────────────────────────────────────────────────────────┘

 GitHub ── PR ──► Actions: lint · typecheck · Vitest unit
                         └► rama Neon ci-{run} (desde seed) → migrate + seed → Vitest integración
                            → next build && next start → Playwright E2E + Lighthouse → borrar rama
               └► Vercel Preview (migrate en el build) ──► smoke /api/health (con bypass de protección)
 merge a main ──► Vercel Production (drizzle-kit migrate && next build) ──► smoke /api/health
```

| Componente | Responsabilidad |
|---|---|
| **UI pública** | Catálogo con filtros y stock, ficha, simulador, formulario de cita, confirmación y página de privacidad (Design.md). |
| **Panel admin** | Login, citas por día con las transiciones permitidas, cancelación en bloque y ajuste de stock. |
| **Dominio (`src/server/`)** | Stock disponible, franjas, la transacción de crear cita, la máquina de estados, los límites contra abuso, la anonimización y la autorización. Es el único que toca la base de datos. |
| **Librería pura (`src/lib/`)** | Cálculo de financiación, generación de franjas, esquemas Zod y códigos. Sin E/S, se prueba unitariamente. |
| **Neon PostgreSQL** | Fuente única de verdad. Garantiza la unicidad de franjas y personas, la exclusión al apartar stock y la idempotencia de las transiciones. |

## Decisiones de arquitectura

| # | Decisión | Estado |
|---|---|---|
| [ADR-0001](adrs/0001-app-nextjs-full-stack.md) | Una sola aplicación Next.js full-stack con Neon | Aceptado |
| [ADR-0002](adrs/0002-drizzle-orm.md) | Drizzle ORM para el acceso a datos | Aceptado |
| [ADR-0003](adrs/0003-vercel-neon-marketplace.md) | Vercel + Neon instalado desde el Marketplace de Vercel | Aceptado (ajustado) |
| [ADR-0004](adrs/0004-stock-derivado.md) | Stock disponible derivado de las citas pendientes | Aceptado (revisado) |
| [ADR-0005](adrs/0005-cache-revalidacion-por-evento.md) | Datos de catálogo cacheados con `"use cache"` e invalidación por evento (Next.js 16) | Aceptado (revisado) |
| [ADR-0006](adrs/0006-concurrencia-indice-unico-for-update.md) | Concurrencia con índice único, bloqueo de fila y máquina de estados | Aceptado (revisado) |
| [ADR-0007](adrs/0007-server-actions-zod.md) | Server Actions con esquemas Zod como contrato front–back | Aceptado (revisado) |
| [ADR-0008](adrs/0008-authjs-credentials-admin.md) | Auth.js con Credentials y tabla de administradores | Aceptado (revisado) |
| [ADR-0009](adrs/0009-estado-en-url-calculo-compartido.md) | Estado del flujo en la URL y cálculo de financiación compartido | Aceptado |
| [ADR-0010](adrs/0010-limites-abuso-en-base-de-datos.md) | Límites contra abuso implementados en la base de datos | Aceptado (revisado) |
| [ADR-0011](adrs/0011-identificador-de-cita.md) | Código de cita legible y token secreto para la confirmación | Aceptado (ajustado) |
| [ADR-0012](adrs/0012-tailwind-v4-tokens-stitch.md) | Tailwind CSS v4 con los tokens de Stitch en `@theme` | Aceptado |
| [ADR-0013](adrs/0013-estrategia-de-pruebas.md) | Pruebas en tres niveles con E2E en CI sobre rama efímera | Aceptado (revisado) |
| [ADR-0014](adrs/0014-errores-y-observabilidad.md) | Manejo de errores y observabilidad sin servicios externos | Aceptado (ajustado) |
| [ADR-0015](adrs/0015-privacidad-datos-personales.md) | Privacidad y ciclo de vida de los datos personales | Aceptado (nuevo) |
| [ADR-0016](adrs/0016-migraciones-y-datos.md) | Protocolo de migraciones, seed y ramas de Neon | Aceptado (nuevo) |

**Stack resultante:**

- **Aplicación:** Node.js 22 LTS, Next.js 16 (App Router, `cacheComponents`), React 19 y
  TypeScript en modo estricto.
- **Estilos:** Tailwind CSS v4.
- **Datos:** Drizzle ORM con drizzle-kit y `@neondatabase/serverless`; validación con Zod.
- **Autenticación:** Auth.js v5 con `@node-rs/argon2`.
- **Pruebas:** Vitest y Playwright.
- **CI/CD y alojamiento:** GitHub Actions, Vercel y Neon.

## Modelo de datos

```
motorcycles 1 ──── * appointments * ──── 0..1 admin_users (updated_by)
rate_limits (independiente)
```

### `motorcycles`

Se deriva de `ProductCard`, `ProductPage`, `CatalogFilters` y `BookingSummary` (Design.md §5).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text` UNIQUE | `yz450f`; se usa en `/motos/[slug]` y en `?moto=`. |
| `name` | `text` | "Yamaha YZ450F" |
| `model_year` | `smallint` | 2025 |
| `engine_type` | enum `4T` \| `2T` | Filtro "4 Tiempos / 2 Tiempos". |
| `category` | enum `COMPETICION` \| `YOUTH` | Filtro "Youth MX". |
| `displacement_cc` | `smallint` | 450, 250, 125, 85, 65; filtro de cilindrada. |
| `price_cents` | `integer` | 1049900 = 10.499 €, con IVA. **Nunca `float`.** Precio único por modelo, sin acabados con recargo (Design.md §3). |
| `stock_total` | `integer` CHECK ≥ 0 | Unidades físicas (ADR 0004). |
| `tagline` | `text` | Descripción corta de la tarjeta. |
| `badge` | `text` NULL | "Best Seller MXGP", "Campeona MX2". |
| `card_specs` | `jsonb` | Las 3 especificaciones de la tarjeta (`[{label, value}]`). |
| `spec_groups` | `jsonb` | Ficha técnica en 3 grupos (`[{title, rows:[{label, value}], note}]`). |
| `images` | `jsonb` | `[{src, alt, width, height}]`, con rutas a `/public/images/`. |
| `is_featured` | `boolean` | La moto destacada del hero (YZ450F). |
| `sort_order` | `smallint` | Orden del catálogo. |
| `created_at`, `updated_at` | `timestamptz` | |

### `appointments`

Se deriva del formulario de cita, la confirmación y el panel (Design.md §3 y §7).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `code` | `text` | `YZ-7K3P`, legible (ADR 0011). |
| `access_token_hash` | `text` | SHA-256 del token de la URL. **El token en claro no se guarda.** |
| `motorcycle_id` | `uuid` FK → motorcycles | |
| `slot_start` | `timestamptz` | Inicio de la franja (en UTC). |
| `slot_date` | `date` | Fecha local Europe/Madrid, para el stock derivado y el panel. |
| `full_name` | `text` NULL | NULL solo si está anonimizada (ADR 0015). |
| `email` | `text` NULL | En minúsculas y sin espacios. NULL si está anonimizada. |
| `phone_normalized` | `text` NULL | Formato E.164 (`+34600…`). NULL si está anonimizada. |
| `ip_hmac` | `text` NULL | `HMAC-SHA256(ip, RATE_LIMIT_SECRET)`, para cancelar en bloque (ADR 0010). Se borra al anonimizar. |
| `financing` | `jsonb` NULL | `{entrada_cents, plazo_meses, tin_bps, cuota_cents, tae_bps}`, **recalculado en el servidor** (ADR 0009). |
| `status` | enum `PENDIENTE` \| `VENDIDA` \| `CANCELADA` \| `VENCIDA` | Transiciones según ADR 0006 §3. |
| `updated_by` | `uuid` FK → admin_users NULL | Admin que hizo la última transición. |
| `anonymized_at` | `timestamptz` NULL | ADR 0015. |
| `created_at`, `updated_at` | `timestamptz` | |

**Índices y restricciones.** Los nombres son constantes compartidas con el código, porque la
traducción de errores depende de ellos (ADR 0006 §2):

- `appointments_slot_pending_uq`: `UNIQUE (slot_start) WHERE status = 'PENDIENTE'`.
- `appointments_email_pending_uq`: `UNIQUE (email) WHERE status = 'PENDIENTE'`.
- `appointments_phone_pending_uq`: `UNIQUE (phone_normalized) WHERE status = 'PENDIENTE'`.
- `appointments_code_uq`: `UNIQUE (code)`.
- `appointments_access_token_hash_uq`: `UNIQUE (access_token_hash)`.
- `CHECK ((full_name IS NULL AND email IS NULL AND phone_normalized IS NULL) = (anonymized_at IS NOT NULL))`.
- `INDEX (motorcycle_id, status, slot_date)`: el `COUNT` del stock derivado.
- `INDEX (slot_date)` para el panel e `INDEX (ip_hmac) WHERE status = 'PENDIENTE'` para la
  cancelación en bloque.

### Máquina de estados de `appointments`

```
            ┌────────── CANCELADA (final)
            │ admin
(nueva) ──► PENDIENTE ──admin──► VENDIDA (final)       stock_total − 1
            │                      ▲
            │ admin "no-show" /    │ admin, solo si disponible ≥ 1 (cliente que llegó tarde)
            │ perezoso (ADR 0010)  │
            └────────► VENCIDA ────┘
                         └──admin──► CANCELADA
```

Cada transición es un `UPDATE … WHERE status IN (…) RETURNING`, en una transacción con
`FOR UPDATE` sobre la moto. Si no devuelve fila, el resultado es `INVALID_STATE` y no tiene
efectos (ADR 0006 §3).

### `admin_users`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `email` | `text` UNIQUE | |
| `name` | `text` | |
| `password_hash` | `text` | argon2id (ADR 0008). |
| `session_version` | `integer` default 1 | Se incrementa para revocar sesiones (ADR 0008). |
| `created_at` | `timestamptz` | |

### `rate_limits`

| Columna | Tipo | Notas |
|---|---|---|
| `key` | `text` | `booking-hour:{ip_hmac}`, `booking-day:{ip_hmac}`, `booking-global:{fecha}`, `login:{ip_hmac}` |
| `window_start` | `timestamptz` | Inicio de la ventana. |
| `count` | `integer` | |
| PK | `(key, window_start)` | `INSERT … ON CONFLICT DO UPDATE`, en una transacción propia (ADR 0010). |

### Reglas de dominio (constantes, no tablas)

| Regla | Valor | Origen |
|---|---|---|
| TIN | 5,95 % (`595` bps), sin comisiones | PRD › Supuestos |
| TAE | `(1 + TIN/12)^12 − 1` ≈ 6,11 % | PRD › Alcance |
| Plazos | 24, 36, 48, 60 meses | Design.md (`03-pago`) |
| Entrada | 0 € … precio − 1 € | Criterio de juicio J1 |
| "Financia desde" | Cuota con entrada 0 € y 60 meses | Design.md §3 (hallazgo A6) |
| Franjas | Lunes a sábado; inicios de 10:00 a 18:00; 1 h; `Europe/Madrid` | PRD › Casos borde |
| Ventana para agendar | Desde mañana hasta dentro de 30 días | Criterio de juicio J2 |
| "Últimas unidades" | Disponible entre 1 y 2 | Design.md §2.1, criterio J3 |
| Límites por persona | 1 cita pendiente vigente por email y por teléfono | ADR 0010 |
| Límites por IP | Agendar: 5 intentos por hora y 3 citas creadas cada 24 h. Login: 5 fallos cada 15 min | ADR 0010, criterio J4 (revisado) |
| Tope global | 40 citas nuevas por día (`MAX_DAILY_BOOKINGS`) | ADR 0010 |
| Retención | Anonimizar las citas finales 90 días después de su fecha | ADR 0015 |
| Sesión del admin | Expiración absoluta de 8 h; revocable con `session_version` | ADR 0008 |
| Reloj | El dominio recibe `today` y `now`; nunca llama a `new Date()` ni a `now()` | ADR 0004, ADR 0013 |

## Criterios de aceptación por flujo

Cada criterio indica el nivel de prueba que lo verifica: **[U]** unitaria, **[I]** integración,
**[E]** E2E, **[M]** manual o Lighthouse (ADR 0013).

### F1 — Consultar el catálogo y la ficha

- [ ] [E] `/` lista los 6 modelos de la base de datos por `sort_order`, cada uno con:
      - el precio en formato `es-ES` (`10.499 €`);
      - "desde X €/mes" (entrada 0 €, 60 meses);
      - sus 3 especificaciones;
      - un `StockBadge` acorde al disponible: Disponible si es > 2, "Últimas N" si es 1–2,
        Agotada si es 0.
- [ ] [I] Los filtros `?tipo=4t|2t`, `?cc=450` y `?categoria=youth` devuelven solo los modelos que
      cumplen. Un valor inválido se ignora sin error.
- [ ] [E] Un filtro sin resultados muestra "Ningún modelo coincide" con "Quitar filtros".
- [ ] [U] El buscador del header filtra por nombre sin distinguir mayúsculas ("yz250" → YZ250F y
      YZ250).
- [ ] [E] `/motos/{slug}` de un slug existente muestra nombre, precio, especificaciones en 3
      grupos y stock. Un slug inexistente devuelve **404** con el estilo del sitio.
- [ ] [E] La ficha no contiene el selector de acabado, el de ECU, el de cantidad, los accesorios
      ni "Entrega inmediata".
- [ ] [I] Con disponible = 0, "Agendar cita" está deshabilitado con el motivo visible, y se listan
      modelos con stock de la misma categoría.
- [ ] [E] El HTML no contiene enlaces a Accesorios & GYTR, Concesionario & Taller, Comparar ni
      Cross-Country & Enduro, ni los textos "0% TAE", "Transacción encriptada" o "Envío".
- [ ] [I] Tras crear, cancelar o vender una cita, o ajustar el stock, la siguiente lectura del
      catálogo refleja el nuevo disponible (`updateTag`, ADR 0005).
- [ ] [M] LCP < 2,5 s en Lighthouse móvil sobre `/` y `/motos/yz450f` en el deploy público.

### F2 — Simular la financiación

- [ ] [U] `calcularCuota` devuelve (±0,01 €) los valores de referencia para al menos 3
      combinaciones (YZ450F 10.499 €, entrada 2.000 €, 24, 36 y 60 meses).
- [ ] [U] La TAE que se muestra es 6,11 % para TIN 5,95 %.
- [ ] [E] Al cambiar la entrada o el plazo, la cuota se actualiza sin recargar y se anuncia con
      `aria-live`.
- [ ] [U] Una entrada negativa o mayor o igual al precio se rechaza. Un plazo fuera de
      {24, 36, 48, 60} vuelve a 36.
- [ ] [E] "Agendar cita con esta moto" lleva a `/cita?moto=…&entrada=…&plazo=…`.
- [ ] [I] La cuota guardada en `appointments.financing` se recalcula en el servidor e ignora
      cualquier cuota manipulada en la URL.

### F3 — Agendar cita (flujo crítico)

- [ ] [E] `/cita?moto=yz450f` muestra el paso 2 con el resumen de la moto y el `SlotPicker`.
- [ ] [U] El `SlotPicker` ofrece días de lunes a sábado, desde mañana y hasta dentro de 30 días,
      con 9 franjas cada uno (10:00 a 18:00). También es correcto en las fechas de cambio de hora.
- [ ] [I] Las franjas ocupadas se devuelven como no disponibles.
- [ ] [E] Con datos válidos y franja libre, se crea **una** cita `PENDIENTE` y se redirige a
      `/cita/{token}`, que muestra el código `YZ-XXXX`, la moto, la fecha (`sáb 8 nov · 11:00`)
      y el botón WhatsApp.
- [ ] [E] El flujo feliz se completa en **4 pantallas o menos y 12 interacciones o menos**.
- [ ] [M] Prueba de usabilidad con al menos 3 personas: cada una agenda en menos de 5 minutos sin
      ayuda.
- [ ] [U] El enlace WhatsApp es `https://wa.me/{WHATSAPP_NUMBER}?text=…` e incluye la moto, la
      fecha, la hora y el código.
- [ ] [I] El disponible de esa moto baja en 1 tras confirmar.
- [ ] [E] Con datos inválidos aparece un error bajo cada campo y el foco va al primer error.
- [ ] [I] El servidor rechaza los mismos datos inválidos aunque se salte la validación del
      cliente.
- [ ] [I] Si la franja se ocupó, la respuesta es `SLOT_TAKEN` con franjas alternativas, y la
      interfaz conserva los datos del formulario.
- [ ] [I] Si la moto se agotó, la respuesta es `OUT_OF_STOCK`.
- [ ] [I] Con un email o teléfono que ya tiene una cita pendiente vigente, la respuesta es
      **`ALREADY_BOOKED`** con la fecha de esa cita, **nunca** `SLOT_TAKEN`. Una cita pendiente
      ya vencida no lo impide.
- [ ] [I] **Concurrencia:**
      - 10 peticiones simultáneas por la misma franja → exactamente 1 cita y 9 `SLOT_TAKEN`;
      - 5 peticiones simultáneas por una moto con disponible = 1 → exactamente 1 cita y 4
        `OUT_OF_STOCK`.
- [ ] [I] Una colisión de `code` se reintenta con `SAVEPOINT` y la cita se crea igualmente.
- [ ] [I] **Límites:**
      - el sexto intento por hora o la cuarta cita en 24 h desde la misma IP → `RATE_LIMITED`;
      - superado el tope global diario → `RATE_LIMITED`;
      - un `SLOT_TAKEN` no revierte el contador.
- [ ] [I] Si el piloto abandona antes de confirmar, no queda ninguna fila en `appointments`.
- [ ] [E] `/cita/{token}` con un token inexistente devuelve 404. El teléfono aparece enmascarado y
      la página tiene `noindex`.
- [ ] [E] `/cita/YZ-7K3P` (el código corto) **no** da acceso a la cita.
- [ ] [E] El formulario muestra el texto informativo de privacidad con un enlace a
      `/privacidad`.

### F4 — Gestión del concesionario (admin)

- [ ] [E] `/admin` y `/admin/stock` sin sesión redirigen a `/admin/login`.
- [ ] [I] Cada Server Action de admin sin sesión, o con un `session_version` desactualizado,
      devuelve `UNAUTHORIZED` y no modifica nada.
- [ ] [I] Credenciales inválidas → "Credenciales inválidas". El sexto fallo en 15 minutos desde la
      misma IP → `RATE_LIMITED`, **también con POST directo a `/api/auth/callback/credentials`**.
- [ ] [I] `/admin` lista las citas por día. Las pendientes con fecha pasada y las `VENCIDA` se
      muestran como "No se presentó".
- [ ] [I] "Marcar vendida" (desde `PENDIENTE`) → `VENDIDA`, `stock_total − 1` y `updated_by`.
      **Un doble envío descuenta una sola vez**; el segundo recibe `INVALID_STATE`.
- [ ] [I] Vender una cita `VENCIDA` o pendiente pasada sin disponible → `OUT_OF_STOCK` y el
      disponible sigue ≥ 0.
- [ ] [I] "Cancelar" → `CANCELADA`, y libera la unidad y la franja. Una transición no permitida
      → `INVALID_STATE`.
- [ ] [I] "Cancelar en bloque" cancela todas las citas pendientes con el mismo `ip_hmac`, y solo
      esas.
- [ ] [I] Ajustar el stock no permite un `stock_total` menor que las citas pendientes vigentes.
- [ ] [I] La sesión deja de valer a las 8 horas de su emisión, aunque haya actividad. La cookie
      es `httpOnly`, `Secure` y `SameSite=Lax`.
- [ ] [I] Al cargar el panel, las citas finales con más de 90 días se anonimizan: nombre, email,
      teléfono e `ip_hmac` pasan a NULL y se fija `anonymized_at`.

### F5 — Calidad transversal

- [ ] [M] Lighthouse Accessibility ≥ 90 en `/`, `/motos/yz450f`, `/financiacion` y `/cita`.
- [ ] [M] Todo el flujo se puede usar solo con el teclado, con el foco visible.
- [ ] [I] Los logs **que escribe la aplicación** no contienen email, teléfono, nombre, token ni IP
      (en claro ni en HMAC). Quedan excluidos los logs de peticiones de la plataforma, que es un
      riesgo aceptado en ADR 0015.
- [ ] [I] `GET /api/health` devuelve 200 con la base de datos accesible y 503 si no lo está.
- [ ] [M] Ningún secreto está en el repositorio, y existe `.env.example` con los nombres de las
      variables y sin valores.
- [ ] [M] Las ramas de Neon de Preview y CI no contienen datos personales: se crean desde `seed`.

### Criterios de juicio (confirmados por el equipo)

Estos valores no estaban en el PRD. Se propusieron durante el diseño técnico y el equipo los
confirmó:

- **J1 — Entrada máxima:** de 0 € a precio − 1 €.
- **J2 — Ventana de agenda:** desde mañana hasta dentro de 30 días.
- **J3 — "Últimas unidades":** disponible 1 o 2.
- **J4 — Límites de abuso:** 5 fallos de login cada 15 minutos y 5 intentos de agendar por hora.
  **Revisado tras la revisión adversarial (A1):** se añaden un límite de 3 citas cada 24 h por IP y
  un tope global de 40 citas por día.

## Protocolo de despliegue (resumen)

Definido en ADR 0016 y ADR 0013. Se documentará en detalle en `docs/despliegue.md` en la fase de
deploy:

1. **PR:** CI ejecuta lint, typecheck y las pruebas unitarias. Después crea la rama de Neon
   `ci-{run}` desde `seed`, migra, siembra, corre las pruebas de integración y el E2E contra
   `next start`, y al final borra la rama.
2. **Vercel Preview:** migración en el build sobre `preview/{rama}`, y smoke test con el bypass de
   protección.
3. **Merge a `main`:** el build de Production ejecuta `drizzle-kit migrate` con
   `DATABASE_URL_UNPOOLED` y después `next build`. Smoke test `GET /api/health`.
4. **Rollback:** *Instant Rollback* de Vercel. Es seguro porque las migraciones son solo aditivas
   (patrón *expand → contract*).

## Riesgos técnicos abiertos

- **Node.js 18 en la máquina de desarrollo:** Next.js 16 necesita Node ≥ 20. Se fija **22 LTS**
  en `.nvmrc` y en `engines`. Hay que actualizar antes del Sprint 0.
- **Acceso a Vercel y Neon:** el MCP de Vercel no tiene acceso al equipo `eddie-66d7`, la
  integración de Neon no está instalada y `gh` no tiene sesión. Bloquea el Sprint 0, no el
  diseño.
- **Auth.js v5 con Next.js 16** (beta y en mantenimiento): se valida en el Sprint 0 con login,
  `proxy.ts` y `cacheComponents` funcionando. El plan B es Better Auth (ADR 0008).
- **Arranque en frío de Neon y LCP:** se mide en el deploy real con Speed Insights.
- **Traducción de tokens de Tailwind v3 a v4:** es manual. Se valida comparando con los
  screenshots de Stitch (ADR 0012). Ver también la sugerencia S4 de la revisión.
- **Imágenes de Stitch en un CDN temporal:** hay que descargarlas a `/public` como primer paso del
  Sprint 0.
- **Zona horaria y cambio de hora:** cubiertos con un reloj inyectable y pruebas unitarias en las
  fechas de cambio.
- **El tope global puede bloquear a usuarios legítimos durante un ataque** (ADR 0010). Es un
  riesgo aceptado; el runbook indica cómo cancelar en bloque y restablecer.
- **La anonimización depende de que se abra el panel** (ADR 0015). Es un riesgo aceptado para
  la v1.
- **El token aparece en los logs de peticiones de Vercel** (ADR 0015). Es un riesgo residual
  aceptado.
- **Sin 2FA ni recuperación de contraseña del admin** (ADR 0008). Es un riesgo aceptado.
- **Sugerencias S1–S9 de la revisión adversarial**, pendientes de decisión: driver único,
  redondeo financiero, lectura de franjas, trampas de Tailwind v4, festivos, "Mi cita",
  `requestId`, cabeceras de seguridad y autocancelación del piloto.
