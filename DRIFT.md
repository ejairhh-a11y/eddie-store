# Drift Report: Eddie Store — Yamaha Motocross

**Fecha:** 2026-10-26
**Comparado contra:** PRD.md, Design.md, TECH-DESIGN.md (F1–F5 y Reglas de dominio), 16 ADRs (0001–0016), 6 contratos (`contratos/*.md`) y las reglas de CLAUDE.md
**Código revisado:** árbol de trabajo de la rama `block-e-cierre` (incluye `src/proxy.ts` modificado y los tests sin commitear `tests/e2e/booking-flow.spec.ts`, `tests/integration/admin.test.ts` y `tests/integration/booking.test.ts`)

## Resumen ejecutivo

Se revisaron unos 75 puntos de comparación (alcance y no alcance del PRD, reglas de dominio, decisiones
de los 16 ADRs, contratos y los criterios F1–F5 con su nivel de prueba). Unos 60 coinciden. El núcleo
del dominio está bien alineado: stock derivado, transacción con `FOR UPDATE`, traducción de `23505` por
nombre de restricción, `SAVEPOINT` para el código, máquina de estados con `UPDATE … WHERE status IN`,
límites en Postgres, HMAC de la IP, token frente a código, anonimización y caché con `updateTag`. **No hay
hallazgos críticos.** Hay **5 advertencias**: las Server Actions no siguen el contrato Zod + `Result` de
ADR 0007, una URL de confirmación inexistente probablemente responde 200 en vez de 404, muchos criterios
F1–F5 no tienen la prueba del nivel que declaran, el E2E relaja dos de sus aserciones y `proxy.ts` añade
comportamiento sin documentar. Además hay **9 sugerencias**, casi todas documentación que no siguió al código.

| Severidad | Cantidad |
|---|---|
| Crítico | 0 |
| Advertencia | 5 |
| Sugerencia | 9 |

**Áreas que coinciden (sin hallazgo):** el catálogo de 6 modelos desde la BD en `sort_order` (`availability.ts:28-31`,
migración `0001`). Los precios en céntimos `integer` con formato `es-ES` (`finance.ts:72-83`). Stock disponible =
`stock_total − PENDIENTE con slot_date ≥ today` (`availability.ts:11-26`, ADR 0004). `StockBadge` > 2 / 1–2 / 0
(`availability.ts:56-60`). Simulador francés con TIN 595 bps, TAE 611 bps, "desde" con 0 € y 60 meses,
plazo inválido → 36 y entrada de 0 € a precio − 1 € (`finance.ts`). Cuota recalculada en el servidor
(`booking.ts:103-111`, ADR 0009). Franjas de lunes a sábado de 10 a 18 h en Europe/Madrid, ventana de mañana a +30
días y cambio de hora (`slots.ts`, `clock.ts`). Transacción con `FOR UPDATE` y traducción de `23505` por constante
compartida (`booking.ts:36-99`, `constraints.ts`, `drizzle/0000`). Reintento del código con savepoint (máx. 3).
Transiciones y venta tardía con disponible ≥ 1 (`appointmentState.ts`, ADR 0006 §3). Ajuste de stock con bloqueo
y sin bajar de las pendientes. Límites 5/h, 3/día, 40/día global y 5 fallos/15 min dentro de `authorize()`
(`rateLimit.ts`, `auth.ts:37-56`). Contadores fuera de la transacción. Ventanas viejas borradas de forma
oportunista. Cancelar en bloque por `ip_hmac`. Token de 128 bits hasheado con SHA-256. Código `YZ-` de 31
símbolos. `/cita/YZ-XXXX` → 404. Teléfono enmascarado. `noindex` y `Referrer-Policy: no-referrer`
(`next.config.ts:29-36`). Anonimización a 90 días al cargar `/admin` (`privacy.ts`). Sesión JWT con expiración
absoluta de 8 h y `session_version` comprobados en `requireAdmin()`, que llaman todas las acciones y páginas de
admin. `"use cache"` + `cacheTag("stock")` + `cacheLife` de 1 h y `updateTag` en todas las mutaciones de stock.
`cacheComponents: true`. Driver según la operación (`db.ts`). Migraciones con `DATABASE_URL_UNPOOLED` en el build
(`vercel.json`, `drizzle.config.ts`). El seed no corre en el build. Logs sin datos personales. `/api/health`
200/503. `.env.example` sin valores. Secciones fuera de alcance ocultas y sin textos de pago. Sin pagos, sin login
de piloto y sin emails (No alcance respetado).

## Hallazgos

### D01 — Las Server Actions no cumplen el contrato de ADR 0007 (Zod + `Result` + sin excepciones crudas)

- **Severidad:** Advertencia
- **Tipo:** Decisión de arquitectura violada
- **Prometido:** ADR 0007 › Decisión: cada mutación "valida su entrada con un **esquema Zod**", "devuelve un resultado tipado `{ ok: true, data } | { ok: false, code, fieldErrors? }`. Nunca deja escapar una excepción cruda". CLAUDE.md: "Toda Server Action valida con **Zod** y devuelve `{ ok, data } | { ok: false, code, fieldErrors? }`".
- **Real:**
  - `appointmentAction` y `stockAction` (`src/app/admin/actions.ts:45-80`) leen `formData` con `String(...)` y `Number(...)` sin Zod, y devuelven `{ message?, ok? }`, sin `code`. `UNAUTHORIZED` solo existe como texto (`actions.ts:17,47,71`).
  - No hay `try/catch`. Un `id` que no es UUID llega a `transition()` / `cancelSameOrigin()` y Postgres lanza `22P02`, que escapa como excepción cruda (`appointmentState.ts:20-23,78`).
  - `stockAction` con un valor no numérico devuelve el mensaje de `VALIDATION`, que es "El stock no puede ser menor que las citas pendientes vigentes" (`actions.ts:21,73-75`; `appointmentState.ts:92-93`). El mensaje no corresponde al error.
  - `createAppointmentAction` sí valida con Zod y captura las excepciones, pero devuelve `BookingState` `{ code?, fieldErrors?, details?, values?, serverError? }` sin `ok` (`src/app/cita/actions.ts:18-57`).
  - `getSlotsAction` (`cita/actions.ts:60-63`) no usa Zod, devuelve un array sin envolver y no captura errores. ADR 0007 la llama `getAvailableSlots(date)`; el contrato 09-10-11 la renombra.
  - El dominio (`src/server/result.ts`) sí implementa el `Result` de ADR 0007.
- **Por qué importa:** las acciones son endpoints públicos (ADR 0007 › Consecuencias). Un POST manipulado produce un 500 en vez de un `VALIDATION`. La interfaz no puede ramificar por código en el panel, y las pruebas F4 "devuelve `UNAUTHORIZED`" no tienen un código que comprobar.
- **Opciones:**
  - `CORREGIR CÓDIGO`: añadir esquemas Zod (`transitionSchema` con `id: z.uuid()` y `kind: z.enum`, y `stockSchema`) en `src/lib/schemas.ts`. Envolver cada acción en `try/catch` que registre con `log()` y devuelva un error genérico. Devolver `{ ok, code, … }` en el estado de `useActionState` y mapear los mensajes en el cliente. Dar a `stockAction` un mensaje propio para la entrada inválida.
  - `ACTUALIZAR PRD/ADR`: documentar en ADR 0007 que el contrato `Result` vive en el dominio y que las acciones adaptan ese resultado al estado de `useActionState` (`message`/`values`). Sería justificable por el patrón de React 19, pero la validación con Zod y la ausencia de excepciones crudas deberían mantenerse como regla.

### D02 — `/cita/{token}` con un token bien formado pero inexistente probablemente responde 200, no 404

- **Severidad:** Advertencia
- **Tipo:** Regla omitida
- **Prometido:** TECH-DESIGN F3 [E]: "`/cita/{token}` con un token inexistente devuelve 404". Contrato 09-10-11: "Token inexistente | `/cita/xxx` · `/cita/YZ-7K3P` | 404".
- **Real:** `src/proxy.ts:8-10` reconoce que con PPR "un `notFound()` dentro de Suspense llega con estado 200". Por eso solo responde un 404 real cuando la URL **no tiene formato** de token (`proxy.ts:12,22-23`). Para un token de 22 caracteres válido que no existe, `notFound()` se ejecuta dentro de `<Suspense>` (`src/app/cita/[token]/page.tsx:20-30`). Se muestra la página 404, pero según el propio comentario el estado HTTP sería 200. Ningún test lo cubre: el E2E solo prueba el código corto (`booking-flow.spec.ts:58-59`).
- **Por qué importa:** el criterio [E] no se cumple, o al menos no se verifica. Un estado 200 en URLs inexistentes también permite distinguir peor un token válido de uno inválido en los logs y el monitoreo.
- **Opciones:**
  - `CORREGIR CÓDIGO`: resolver la cita fuera de `<Suspense>` o en el `proxy`/un layout que pueda devolver 404 antes del streaming. Añadir el caso al E2E (`/cita/AAAAAAAAAAAAAAAAAAAAAA` → 404). El rol TESTER escribe el test.
  - `ACTUALIZAR PRD/ADR`: aceptar en TECH-DESIGN F3 que un token inexistente bien formado muestre la vista 404 con estado 200 (limitación de PPR), con `noindex`. Solo es razonable si se documenta como riesgo aceptado.

### D03 — Criterios de aceptación sin la prueba del nivel que declaran

- **Severidad:** Advertencia
- **Tipo:** Regla omitida (cobertura prometida en TECH-DESIGN F1–F5 y ADR 0013)
- **Prometido:** TECH-DESIGN › Criterios: "Cada criterio indica el nivel de prueba que lo verifica". ADR 0013 › Niveles y "Casos de integración obligatorios".
- **Real:** no se encontró ninguna prueba para estos criterios (en `tests/unit`, `tests/integration` y `tests/e2e`):

  | Criterio | Nivel | Estado |
  |---|---|---|
  | F1: tras crear/cancelar/vender/ajustar, la siguiente lectura refleja el disponible (`updateTag`) | [I] | Sin prueba |
  | F1: la ficha no contiene acabado, ECU, cantidad, accesorios ni "Entrega inmediata" | [E] | Sin aserción (`catalog.spec.ts:34-40` no lo comprueba) |
  | F1: buscador del header por nombre | [U] | Cubierto solo en [I] (`availability.test.ts:61`) |
  | F2: la cuota se anuncia con `aria-live` | [E] | Sin aserción |
  | F3: enlace WhatsApp `https://wa.me/{WHATSAPP_NUMBER}?text=…` | [U] | Solo una regex parcial en E2E (`booking-flow.spec.ts:51`) |
  | F3: franjas ocupadas devueltas como no disponibles (`freeSlots`) | [I] | Sin prueba |
  | F3: el foco va al primer error | [E] | Sin aserción (`booking-flow.spec.ts:66-75`) |
  | F3: el servidor rechaza datos inválidos aunque se salte el cliente | [I] | Sin prueba de `bookingSchema` ni de la acción |
  | F3: colisión de `code` reintentada con `SAVEPOINT` | [I] | Sin prueba |
  | F3: tope global diario → `RATE_LIMITED`; un `SLOT_TAKEN` no revierte el contador | [I] | Sin prueba (`admin.test.ts:118-137` solo cubre 5/h y 3/día) |
  | F3: abandonar → ninguna fila | [I] | Sin prueba |
  | F3: token inexistente → 404, `noindex`, texto de privacidad con enlace | [E] | Sin prueba (ver D02) |
  | F4: `/admin/stock` sin sesión → login | [E] | Solo `/admin` (`booking-flow.spec.ts:77-81`) |
  | F4: cada acción de admin sin sesión o con `session_version` viejo → `UNAUTHORIZED` | [I] | Sin prueba |
  | F4: "Credenciales inválidas" y 6.º fallo con **POST directo a `/api/auth/callback/credentials`** | [I] | Solo `loginBlocked()` aislado (`admin.test.ts:130-137`), no `authorize()` ni HTTP |
  | F4: `/admin` muestra pendientes pasadas y `VENCIDA` como "No se presentó" | [I] | Sin prueba |
  | F4: sesión inválida a las 8 h; cookie `httpOnly`/`Secure`/`SameSite=Lax` | [I] | Sin prueba |
  | F5: los logs de la aplicación no contienen datos personales | [I] | Sin prueba |
  | F5: `/api/health` 200 con BD | [I] | `health.test.ts:45` se salta si no hay `TEST_DATABASE_URL`, y `ci.yml` no la define |
  | ADR 0013 [U]: esquemas Zod, generación de `code`/`access_token`, tabla de transiciones | [U] | Sin pruebas unitarias |
- **Por qué importa:** las garantías de seguridad del panel (ADR 0008: "la barrera real") y el límite global (ADR 0010) no tienen evidencia automática, pese a que ADR 0006 › Consecuencias y ADR 0013 lo prometen ("hay un test de integración por cada código de error").
- **Opciones:**
  - `CORREGIR CÓDIGO` (rol TESTER): añadir las pruebas que faltan, priorizando las de F4 sobre sesión/`UNAUTHORIZED`/login por HTTP, el tope global y el `SAVEPOINT`. Definir `TEST_DATABASE_URL` en el job `checks` de CI.
  - `ACTUALIZAR PRD/ADR`: rebajar en TECH-DESIGN el nivel de los criterios que no se automatizarán (por ejemplo, la cookie y las 8 h a [M]). Cada rebaja debe justificarse; para los de seguridad no parece defendible.

### D04 — El E2E del flujo crítico relaja el criterio de pantallas y su aserción de stock es vacía

- **Severidad:** Advertencia
- **Tipo:** Regla omitida
- **Prometido:** TECH-DESIGN F3 [E]: "el flujo feliz se completa en **4 pantallas o menos**". BACKLOG #15: "≤ 4 pantallas". Design.md §4.1: "cabe en 4 pantallas". F3 [I]/criterio PRD: el disponible baja en 1.
- **Real:**
  - `tests/e2e/booking-flow.spec.ts:55` exige `≤ 5` (`… .length + 1).toBeLessThanOrEqual(5)`), porque el recorrido incluye el simulador opcional: `/`, ficha, `/financiacion`, `/cita` y `/cita/[token]`. El comentario de la línea 4 sigue diciendo "≤ 4 pantallas".
  - `booking-flow.spec.ts:61-63` dice comprobar que "el stock de la moto bajó en 1", pero solo exige `/Disponible|Últimas/`. La YZ250F pasa de 4 a 3 y muestra "Disponible" antes y después, así que la aserción no puede fallar. La bajada sí está cubierta en [I] (`availability.test.ts:43-47`).
- **Por qué importa:** el indicador de esfuerzo que sustituye a la métrica de 5 minutos (ADR 0013) no mide lo que promete el documento.
- **Opciones:**
  - `CORREGIR CÓDIGO` (rol TESTER, decidir con el humano; CLAUDE.md prohíbe ajustar un test para que pase): medir el flujo sin simulador (≤ 4) o contar el simulador aparte. Comprobar el número exacto del badge, o el texto "Últimas N", con una moto de stock 2 o 3.
  - `ACTUALIZAR PRD/ADR`: redactar F3 / BACKLOG #15 como "≤ 4 pantallas sin el simulador opcional (≤ 5 con él)". Es justificable porque Design.md §4.1 marca el simulador como opcional.

### D05 — `proxy.ts` añade 404 por lista estática del catálogo, sin documentar

- **Severidad:** Advertencia
- **Tipo:** Feature no documentada / Deuda técnica ligada a una promesa
- **Prometido:** ADR 0008: `proxy.ts` "redirige a `/admin/login` cualquier `/admin/*` sin sesión". No se le asigna otro papel. PRD › Alcance: "Catálogo … **desde la base de datos**". TECH-DESIGN F1: un slug inexistente devuelve 404.
- **Real:** `src/proxy.ts:11-23` (cambio sin commitear) valida `/motos/[slug]` contra `CATALOG`, el array estático de `src/server/catalogData.ts`, no contra la BD. También responde 404 en `/cita/*` cuando la URL no tiene formato de token. El `matcher` se amplía a `/motos/:path*` y `/cita/:path+` (`proxy.ts:31`), así que `auth()` se ejecuta en cada visita a una ficha. `generateStaticParams` también usa `CATALOG` (`src/app/motos/[slug]/page.tsx:15-17`).
- **Por qué importa:** soluciona un problema real (el 404 con estado 200 bajo PPR, ver D02), pero ata las rutas públicas a un archivo de código. Un modelo que exista en la BD y no en `catalogData.ts` daría 404 aunque el catálogo lo liste. Ningún ADR recoge el cambio, contra la regla de CLAUDE.md de "primero se actualiza el ADR".
- **Opciones:**
  - `CORREGIR CÓDIGO`: obtener los slugs válidos de la BD (cacheados con el tag `stock`) o resolver el 404 dentro de la página sin depender del `proxy`. Excluir `/motos` del `auth()` si no hace falta.
  - `ACTUALIZAR PRD/ADR`: documentar en ADR 0005/0008 (o en uno nuevo) que `proxy.ts` también fuerza el estado 404 por la limitación de PPR. Añadir como restricción que **todo modelo nuevo exige tocar `catalogData.ts` y una migración de datos**. Es justificable porque el admin no puede crear modelos (PRD › Alcance).

### D06 — El dominio lee el reloj por su cuenta en tres puntos

- **Severidad:** Sugerencia
- **Tipo:** Decisión de arquitectura violada
- **Prometido:** ADR 0004 y ADR 0013: "el dominio nunca llama a `new Date()` ni a `now()` directamente". CLAUDE.md: "El dominio **nunca** llama a `new Date()`, `Date.now()` ni `now()` de SQL".
- **Real:**
  - `src/server/booking.ts:47`: `updatedAt: sql\`now()\`` al pasar citas a `VENCIDA`.
  - `src/server/adminSession.ts:13`: `Date.now()` para la expiración de 8 h, lo que hace que el criterio F4 [I] de las 8 h no sea determinista (ver D03).
  - `src/server/catalog.ts:14,21`: `today(systemClock)` dentro del dominio, en lugar de recibir `today`.
- **Por qué importa:** el impacto funcional es bajo (son marcas de tiempo, la caché tiene una red de 1 h y la regla de stock sí recibe `today`). Aun así, rompe una regla declarada "no negociable" e impide probar las 8 h con el reloj inyectado.
- **Opciones:**
  - `CORREGIR CÓDIGO`: pasar `now` a `createAppointment` y a `requireAdmin(clock)`. En `catalog.ts`, recibir `today` como parámetro (pasaría a formar parte de la clave de caché, lo que además elimina el desfase de hasta 1 h al cambiar de día).
  - `ACTUALIZAR PRD/ADR`: precisar en ADR 0013 que la regla cubre la **lógica de negocio** y que las marcas `updated_at` y la frontera de caché/sesión pueden leer el reloj del sistema.

### D07 — Logs sin `requestId` ni `durationMs`

- **Severidad:** Sugerencia
- **Tipo:** Decisión de arquitectura violada (parcial)
- **Prometido:** ADR 0014: "Logs estructurados en JSON (`level`, `event`, `requestId`, `durationMs`)".
- **Real:** `src/server/log.ts:10-15` escribe `level`, `event` y `time`. Solo `/api/health` añade `requestId` y `durationMs` (`route.ts:13-24`). Los eventos `booking.*`, `admin.*` y `auth.*` no los llevan (`cita/actions.ts:37,45,50,53`; `admin/actions.ts:57,65,78`; `auth.ts:41,51,54`). No se registra ningún dato personal, lo que cumple la parte importante de ADR 0014.
- **Por qué importa:** sin `requestId` no se puede correlacionar un error con la petición en los logs de Vercel (la sugerencia S7 de la revisión ya lo señalaba).
- **Opciones:**
  - `CORREGIR CÓDIGO`: que `log()` acepte el `requestId` (de `x-vercel-id`) y medir `durationMs` en las acciones.
  - `ACTUALIZAR PRD/ADR`: dejar en ADR 0014 `requestId`/`durationMs` como opcionales hasta resolver S7.

### D08 — Decisiones de los contratos que no se propagaron a ADRs, TECH-DESIGN ni CLAUDE.md

- **Severidad:** Sugerencia
- **Tipo:** Feature no documentada (en los documentos rectores)
- **Prometido:** CLAUDE.md: "si al programar una decisión resulta incorrecta, **primero se actualiza el ADR** (o el documento correspondiente)".
- **Real (el código sigue al contrato, el ADR no):**
  - **Ventana diaria natural** para "3 citas cada 24 h" y el tope global (contrato 09-10-11, decisión 2; `rateLimit.ts:24-26`). ADR 0010 y TECH-DESIGN dicen "cada 24 horas".
  - **Las pendientes de más de 90 días pasan a `VENCIDA` y se anonimizan** (contrato 12-13-14, decisión 1; `privacy.ts:12-15`). ADR 0015 §3 solo habla de estados finales y llama "final" a `VENCIDA`, mientras ADR 0006 §3 permite `VENCIDA → VENDIDA/CANCELADA`.
  - **Cabeceras globales de seguridad** (S8, contrato 09-10-11, decisión 3; `next.config.ts:16-28`). TECH-DESIGN › Riesgos sigue listando S8 como pendiente.
  - **`db:seed-admin` dentro del build** (`package.json:11`). Está en ADR 0016 §cambio, pero CLAUDE.md › Comandos sigue diciendo `drizzle-kit migrate && next build`.
  - **Buscador como `GET /?q=`** (contrato 03-06-07-08, decisión 1). Design.md §3 dice "Buscador ⌘K".
- **Por qué importa:** los ADRs y CLAUDE.md son la fuente que leen los agentes. Si quedan desfasados, el próximo cambio puede "corregir" el código hacia una regla obsoleta.
- **Opciones:**
  - `CORREGIR CÓDIGO`: solo si alguna de estas decisiones no se quiere mantener (por ejemplo, volver a una ventana deslizante de 24 h).
  - `ACTUALIZAR PRD/ADR` (recomendado; solo LEAD o humano): añadir una nota "Cambio 2026-10-26" en ADR 0010, 0015 y TECH-DESIGN, y actualizar CLAUDE.md › Comandos.

### D09 — Documentación de infraestructura desactualizada tras el cambio a Postgres de servicio en CI

- **Severidad:** Sugerencia
- **Tipo:** Feature no documentada / documentación obsoleta
- **Prometido:**
  - TECH-DESIGN, diagrama y protocolo: "rama Neon `ci-{run}` (desde seed) … Playwright E2E + Lighthouse → borrar rama" y "smoke … con bypass de protección". F5 [M]: "Las ramas de Neon de Preview y CI … se crean desde `seed`".
  - ADR 0013 › Niveles: smoke `GET /api/health` → 200 **y `GET /` → 200**; "Lighthouse … corre como paso informativo". ADR 0013 › Consecuencias: secretos `NEON_API_KEY`, `NEON_PROJECT_ID`, `VERCEL_AUTOMATION_BYPASS_SECRET` y un "job de limpieza semanal".
  - TECH-DESIGN › Componentes: `src/server/admin.ts`, `auth.ts`, y `codes.ts` en `src/lib/`.
  - CLAUDE.md › Estado actual: "el Sprint 0 está pendiente. Todavía no existe la app".
- **Real:**
  - `.github/workflows/ci.yml` usa `postgres:16` (de acuerdo con ADR 0013 §cambio). No hay paso de Lighthouse ni smoke de `GET /`, y el smoke usa `vercel curl` (ADR 0003, línea 133). No hay job de limpieza.
  - El dominio de admin vive en `appointmentState.ts` y `privacy.ts`. La autenticación está en `src/auth.ts` y `src/server/adminSession.ts`. `codes.ts` está en `src/server/`, porque usa `node:crypto`.
  - La app existe desde varios commits atrás.
- **Por qué importa:** quien siga TECH-DESIGN o ADR 0013 configurará secretos y pasos que ya no existen y buscará Lighthouse donde no está.
- **Opciones:**
  - `CORREGIR CÓDIGO`: añadir a `ci.yml` el paso informativo de Lighthouse y el smoke de `GET /` si se quieren mantener.
  - `ACTUALIZAR PRD/ADR` (recomendado): alinear el diagrama y el protocolo de TECH-DESIGN, las Consecuencias de ADR 0013, F5 [M] (CI ya no usa Neon) y CLAUDE.md › Estado actual con el pipeline real.

### D10 — Vercel Speed Insights no está instalado

- **Severidad:** Sugerencia
- **Tipo:** Feature fantasma
- **Prometido:** ADR 0014: "**Vercel Speed Insights** para medir el LCP real de la producción". TECH-DESIGN › Riesgos: "se mide en el deploy real con Speed Insights".
- **Real:** `package.json:23-48` no incluye `@vercel/speed-insights`, y `src/app/layout.tsx` no monta `<SpeedInsights />`.
- **Por qué importa:** el criterio de LCP < 2,5 s del PRD (F1 [M], BACKLOG #17) queda sin medición de campo.
- **Opciones:**
  - `CORREGIR CÓDIGO`: instalar el paquete y añadir el componente al layout.
  - `ACTUALIZAR PRD/ADR`: indicar en ADR 0014 que el LCP se mide solo con Lighthouse manual (BACKLOG #17).

### D11 — Páginas de error sin el estilo del sitio

- **Severidad:** Sugerencia
- **Tipo:** Deuda técnica ligada a una promesa
- **Prometido:** ADR 0014: "`error.tsx` … y `global-error.tsx` **con el estilo del sitio**, y un mensaje genérico con botón para reintentar". Design.md §6: "Error del servidor … mensaje … + reintentar".
- **Real:** `src/app/error.tsx:3` dice "Versión mínima del Sprint 0". Usa `<main>`, `<h1>` y `<button>` sin clases ni tokens, y su `<main>` queda anidado dentro del `<main id="contenido">` del layout (`layout.tsx:37`), lo que crea un landmark duplicado. `global-error.tsx` tampoco tiene estilo. El texto sí coincide con Design.md §6.
- **Por qué importa:** cualquier error inesperado (incluido el de D01) se ve con estilos por defecto, y el `<main>` anidado penaliza la accesibilidad (F5, Lighthouse ≥ 90).
- **Opciones:**
  - `CORREGIR CÓDIGO`: aplicar los tokens de Stitch, como en `not-found.tsx`, y cambiar `<main>` por `<div>` en `error.tsx`.
  - `ACTUALIZAR PRD/ADR`: aceptar en ADR 0014 la versión mínima. No parece justificable.

### D12 — Responsive del header y la ficha distinto de Design.md

- **Severidad:** Sugerencia
- **Tipo:** Feature fantasma (parcial)
- **Prometido:**
  - Design.md §5.2 / §9: `SiteHeader` con "menú hamburguesa en móvil (< 1024 px)" y, en escritorio (≥ 1024 px), "menú completo + buscador".
  - `SpecTable`: "acordeón en móvil". Ficha en móvil: "el CTA queda fijo abajo".
  - PRD: "el flujo completo se puede usar en un ancho de 375 px".
- **Real:**
  - `src/components/SiteHeader.tsx:43` muestra el buscador solo desde `xl` (≥ 1280 px), así que **no hay buscador** en móvil ni en tablet.
  - No hay menú hamburguesa: la navegación es una fila con scroll horizontal (`SiteHeader.tsx:63`).
  - La ficha técnica no es un acordeón y el CTA no se fija abajo en móvil (`src/app/motos/[slug]/page.tsx:59-110,117-136`).
- **Por qué importa:** el filtro por nombre (Alcance) no está disponible a 375 px. Lo demás es fidelidad de diseño.
- **Opciones:**
  - `CORREGIR CÓDIGO`: mostrar el buscador desde `lg` y en el menú móvil. Si se mantiene el diseño, implementar el acordeón y el CTA fijo.
  - `ACTUALIZAR PRD/ADR`: registrar en Design.md §9 la navegación con scroll horizontal y la ficha sin acordeón como decisión de la v1, y aclarar que el buscador es solo de escritorio (los chips cubren el filtro en móvil).

### D13 — "Cancelar en bloque" no dice cuántas citas cancelará

- **Severidad:** Sugerencia
- **Tipo:** Regla omitida
- **Prometido:** Design.md §7: "Cancelar todas las de este origen … previa confirmación **que indica cuántas son**".
- **Real:** `src/app/admin/page.tsx:79` usa un texto fijo: "¿Cancelar TODAS las citas pendientes del mismo origen (posible abuso)?". El número solo aparece después, en el mensaje de éxito (`admin/actions.ts:58`).
- **Por qué importa:** el admin confirma una acción masiva e irreversible sin saber su alcance.
- **Opciones:**
  - `CORREGIR CÓDIGO`: calcular en `listForAdmin` cuántas pendientes hay por `ip_hmac` e incluirlo en `confirmText`.
  - `ACTUALIZAR PRD/ADR`: quitar el requisito del recuento de Design.md §7.

### D14 — IP desconocida agrupada en un solo cubo de límites

- **Severidad:** Sugerencia
- **Tipo:** Feature no documentada
- **Prometido:** ADR 0010 identifica a cada cliente por `HMAC-SHA256(ip, …)`. No dice qué pasa si no hay IP.
- **Real:** `src/server/requestIp.ts:7` y `src/auth.ts:20` usan el literal `"unknown"` si no hay `x-forwarded-for` ni `x-real-ip`. Todas esas peticiones comparten los contadores de agendar y de login, y además "Cancelar origen" las trataría como un mismo origen.
- **Por qué importa:** en Vercel la cabecera siempre existe, así que el riesgo real es bajo. En otro entorno, un solo cliente sin IP bloquearía a todos los demás.
- **Opciones:**
  - `CORREGIR CÓDIGO`: rechazar o registrar con `log("warn")` las peticiones sin IP en producción.
  - `ACTUALIZAR PRD/ADR`: documentar el comportamiento en ADR 0010 como aceptado, dado que Vercel siempre fija la cabecera.

## Deuda técnica detectada

- `src/app/error.tsx:3`: "Versión mínima del Sprint 0", sin estilo y con `<main>` anidado (D11).
- `src/proxy.ts:8-23`: rodeo de la limitación de PPR (`notFound()` dentro de Suspense devuelve 200) con una lista estática de slugs. Funciona para `/motos`, pero deja sin cubrir `/cita/{token}` bien formados (D02, D05).
- `tests/unit/health.test.ts:45`: el caso 200 depende de `TEST_DATABASE_URL`, que CI no define, así que nunca se ejecuta en el pipeline (D03).
- `src/server/booking.ts:110`: `tinBps: 595` escrito a mano en lugar de `TIN_BPS` (`finance.ts:5`). Hoy es coherente, pero el valor queda duplicado.
- `src/server/rateLimit.ts:54`: la limpieza de ventanas es probabilística (`Math.random() < 0.05`). Coincide con "de forma oportunista" (ADR 0010), pero no es determinista en las pruebas.

## Features no documentadas (drift inverso)

- `src/server/catalog.ts:46`: el filtro `?cc=250` también incluye la YZ250 de 249 cc. Es razonable, pero F1 dice "solo los modelos que cumplen". Conviene documentarlo en el contrato 03-06-07-08.
- `src/server/catalog.ts:47`: la búsqueda `q` también busca en el `slug` y quita espacios. Conviene documentarlo.
- `src/app/financiacion/page.tsx:41`: si no hay entrada válida en la URL, el simulador arranca con **2.000 €** y no con 0 €. No figura en Design.md ni en el contrato. Conviene documentarlo, o usar 0 € por coherencia con "Financia desde".
- `src/app/cita/[token]/page.tsx:67`: la confirmación muestra el estado de la cita (y el valor crudo del enum si ya no es `PENDIENTE`). No está en Design.md §3. Conviene documentarlo y traducir las etiquetas.
- `src/app/cita/page.tsx:38-61`: el paso 1 lista las motos con stock cuando falta `?moto` o la moto está agotada. Ya figura en el contrato 09-10-11, pero no en Design.md §3/§4. Conviene documentarlo en Design.md.
- `src/server/privacy.ts:30-51`: el panel muestra las citas desde hace 14 días más las pendientes atrasadas. Ya figura en el contrato 12-13-14 (decisión 2), pero no en Design.md §7. Conviene documentarlo.
- `src/proxy.ts` y `next.config.ts:16-28`: 404 forzado y cabeceras de seguridad globales (ver D05 y D08).

## Próximos pasos

1. **LEAD + humano: decidir D01** (Zod y `Result` en las acciones de admin). Es la única desviación de un ADR "no negociable" con efecto observable: un POST manipulado produce un 500. Después, el DEV aplica el cambio en `src/app/admin/actions.ts` y `src/lib/schemas.ts`.
2. **TESTER: cerrar los huecos de D03**, empezando por la seguridad del panel (`UNAUTHORIZED`, `session_version`, login por POST directo, 8 h), el tope global, el `SAVEPOINT` y el token inexistente (D02). Con esa prueba se confirmará si D02 es un defecto real.
3. **Humano: decidir D04.** O se corrige el E2E (≤ 4 pantallas sin simulador y una aserción real del stock), o se redacta de nuevo F3/BACKLOG #15. No se edita el test sin esa decisión (CLAUDE.md).
4. **LEAD: documentar D05 y D08** en los ADRs (proxy, ventana diaria, `VENCIDA` a los 90 días, S8 aplicada) y actualizar CLAUDE.md (Estado actual, Comandos), antes del próximo cambio de código en esas zonas.
5. **LEAD: alinear TECH-DESIGN y ADR 0013 con el pipeline real** (D09) y decidir si Lighthouse y Speed Insights (D10) entran antes del BACKLOG #17.
6. **DEV, de baja prioridad:** D06 (reloj), D07 (requestId), D11 (páginas de error), D12 (responsive), D13 (recuento en "Cancelar origen") y D14 (IP desconocida).

## Resolución (2026-10-26, modo autónomo)

| Hallazgo | Estado | Cómo |
|---|---|---|
| D01 | **Resuelto** | Acciones de admin con Zod, códigos de `ErrorCode` y sin excepciones crudas (`src/app/admin/actions.ts`) |
| D02 | **Resuelto** | `proxy.ts` devuelve 404 real para tokens inexistentes; probado en producción |
| D03 | **Parcial** | Añadidas pruebas de `requireAdmin`, concurrencia de login, tope por origen y E2E del 404. Siguen sin prueba automática: `/api/health` 200 en CI, logs sin datos personales y el reintento con SAVEPOINT |
| D04 | **Resuelto** | El E2E tiene un camino directo de 4 pantallas y una aserción de stock que puede fallar (2 → 1) |
| D05, D08, D09 | **Resuelto** | Documentado en ADR 0005 y 0010, `CLAUDE.md` (sección de decisiones) y `docs/despliegue.md` |
| D06, D07, D10–D14 | **Abiertos** | Deuda menor: reloj de `booking.ts`/`adminSession.ts`, `requestId`/`durationMs` en logs, Speed Insights, estilo de `error.tsx`, buscador en 375 px, conteo en «Cancelar origen», cubo de IP desconocida |
