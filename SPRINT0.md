# SPRINT 0 — Eddie Store Yamaha Motocross

**Estado:** Aprobado (2026-10-25, productowner-eddie). Se aceptaron todas las propuestas de §7.
**Fuentes:** `TECH-DESIGN.md`, `adrs/` (0001–0016), `BACKLOG.md` (ítem #1, "Walking skeleton")

**Objetivo:** un esqueleto mínimo que funciona de punta a punta, sin lógica de negocio.
Concretamente: Next.js 16 arranca, se conecta a Neon, responde en `/api/health`, las pruebas
corren, CI pasa y existe un primer deploy de Preview en Vercel.

---

## 1. ADRs que aplican (transversales)

| ADR | Decisión | Por qué aplica ahora |
|---|---|---|
| [0001](adrs/0001-app-nextjs-full-stack.md) | Una sola app Next.js full-stack | Es la forma del proyecto: sin ella no hay nada donde construir. Define la estructura `src/app`, `src/server` y `src/lib`. |
| [0002](adrs/0002-drizzle-orm.md) | Drizzle ORM + driver serverless de Neon | El health check necesita una conexión a la base de datos. Se crea `src/server/db.ts` con el cliente, **sin tablas**. |
| [0003](adrs/0003-vercel-neon-marketplace.md) | Vercel + Neon desde el Marketplace | El esqueleto debe desplegarse y hablar con Neon desde el primer día. Las variables `DATABASE_URL` y `DATABASE_URL_UNPOOLED` las inyecta la integración. |
| [0014](adrs/0014-errores-y-observabilidad.md) | Errores y observabilidad | Fija `GET /api/health` (el contrato de salud del esqueleto), `src/server/log.ts` (logs JSON sin datos personales) y las páginas `error.tsx`, `global-error.tsx` y `not-found.tsx` (versión mínima). |

## 2. ADRs que NO aplican todavía (de historia)

| ADR | Decisión | Aplica cuando llegue |
|---|---|---|
| [0004](adrs/0004-stock-derivado.md) | Stock derivado de las citas | Ítems #6 (catálogo) y #9 (reserva). El reloj inyectable, en el #5. |
| [0006](adrs/0006-concurrencia-indice-unico-for-update.md) | Índice único, `FOR UPDATE` y máquina de estados | Ítems #2 (índices), #9 (transacción) y #13 (transiciones). |
| [0007](adrs/0007-server-actions-zod.md) | Server Actions + Zod, códigos de error | Ítem #9 (primera Server Action real) y #11. |
| [0008](adrs/0008-authjs-credentials-admin.md) | Auth.js Credentials | Ítem #12. **No** se crea `proxy.ts` en el Sprint 0. |
| [0009](adrs/0009-estado-en-url-calculo-compartido.md) | Estado en la URL y cálculo compartido | Ítems #4 (finanzas) y #8 (simulador). |
| [0010](adrs/0010-limites-abuso-en-base-de-datos.md) | Límites contra abuso | Ítem #10 (y #12 para el login). |
| [0011](adrs/0011-identificador-de-cita.md) | Código legible + token | Ítems #9 y #11. |
| [0015](adrs/0015-privacidad-datos-personales.md) | Privacidad y retención | Ítems #3 (`/privacidad`), #11 (texto informativo) y #13 (anonimización). La regla "logs sin datos personales" ya se respeta en el `log.ts` del Sprint 0. |

## 3. A discutir (mixtos)

| ADR | Qué parte aplica ahora | Qué parte espera a su ítem | Pregunta |
|---|---|---|---|
| [0005](adrs/0005-cache-revalidacion-por-evento.md) | `cacheComponents: true` en `next.config.ts`: cambia cómo se renderiza **toda** la app, y conviene que el esqueleto ya lo tenga para detectar incompatibilidades pronto (riesgo de Auth.js). | Las funciones con `"use cache"`, `cacheTag("stock")` y `updateTag` (#6 en adelante). | ¿Se activa `cacheComponents` ya en el Sprint 0? **Propuesta: sí.** |
| [0012](adrs/0012-tailwind-v4-tokens-stitch.md) | Instalar Tailwind v4 con `@tailwindcss/postcss` y `globals.css` con un `@theme` vacío. | La traducción de todos los tokens de Stitch, las fuentes y los componentes (#3). | ¿Los tokens van en el Sprint 0 o en el #3? **Propuesta: en el #3**, para que el esqueleto no tenga diseño. |
| [0013](adrs/0013-estrategia-de-pruebas.md) | Vitest y Playwright instalados y configurados; CI con lint, typecheck y Vitest; una prueba de health y un smoke E2E de la portada. | La rama efímera `ci-*` de Neon en CI (#2), las pruebas de integración de dominio (#9 en adelante) y el E2E del flujo crítico (#15). | En el Sprint 0, ¿la prueba de health contra la base de datos corre en CI? Necesita `NEON_API_KEY` ya. **Propuesta:** en CI se prueba solo la rama 503 (sin base de datos), y la rama 200 se verifica contra el Preview. |
| [0016](adrs/0016-migraciones-y-datos.md) | `drizzle.config.ts`, scripts `db:generate` y `db:migrate`, y `buildCommand` = `drizzle-kit migrate && next build` con `DATABASE_URL_UNPOOLED`. Con **cero migraciones**, el paso no hace nada, pero el protocolo queda probado. | Las tablas, el seed, la rama `seed` y la limpieza de ramas (#2 y #16). | ¿Se cablea ya la migración en el build, aunque esté vacía? **Propuesta: sí.** |

## 4. Propiedad de rutas

| Rol | Rutas |
|---|---|
| TESTER | `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`, `tests/fixtures/**`, `vitest.config.mts`, `playwright.config.ts` |
| DEV | `src/**`, `public/**`, `drizzle/**`, `drizzle.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `.nvmrc`, `.env.example`, `vercel.json`, `.github/workflows/**` |
| Solo LEAD / humano | `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `SPRINT0.md`, `contratos/**`, `PRD.md`, `Design.md`, `TECH-DESIGN.md`, `adrs/**`, `BACKLOG.md`, `docs/**` |
| Nadie (solo lectura) | `stitch-eddie-store/**` (referencia visual), `docs/_archivo/**` |

> Esta tabla también se copia en `CLAUDE.md` → `## Propiedad de rutas`. En este proyecto TESTER y
> DEV los ejecuta la misma persona con el agente. La tabla sirve para que **una prueba no se
> edite para que pase** (regla de la skill `playwright-e2e-test`) y para que el código de la app
> no modifique las pruebas.

## 5. Definition of Done — esqueleto

| # | Criterio | Cómo se verifica |
|---|---|---|
| 1 | La app arranca en local con Node 22 | Comando: `npm ci && npm run dev`; `GET http://localhost:3000/` → 200 |
| 2 | La build de producción compila | Comando: `npm run build` sin errores. En Vercel, `npm run build:vercel` también ejecuta `drizzle-kit migrate` (sin migraciones) |
| 3 | Se conecta a Neon | Prueba: con un `DATABASE_URL` válido, `GET /api/health` → **200** `{"status":"ok","db":"ok"}` (hace `SELECT 1`) |
| 4 | El health check detecta la base de datos caída | Prueba: con un `DATABASE_URL` inválido o inaccesible, `GET /api/health` → **503** `{"status":"error","db":"down"}`, sin stack trace ni la cadena de conexión en el cuerpo |
| 5 | Lint y tipos | Comandos: `npm run lint` y `npm run typecheck` (`tsc --noEmit`, `strict: true`) sin errores |
| 6 | Runner unitario | Comando: `npm test` (Vitest) corre y pasa al menos la prueba de `/api/health` |
| 7 | Runner E2E | Comando: `npm run test:e2e` (Playwright, Chromium, viewport 375×812) pasa un smoke: la portada carga y `/no-existe` muestra el `not-found` |
| 8 | CI | GitHub Actions `.github/workflows/ci.yml` corre `lint`, `typecheck`, `test` y `build` en cada push y PR, y queda en verde |
| 9 | Deploy de Preview | Una URL de Preview de Vercel responde `GET /api/health` → 200, con la cabecera de bypass |
| 10 | Logs sin datos personales | Revisión: `src/server/log.ts` emite JSON (`level`, `event`, `requestId`, `durationMs`) y el health no registra la cadena de conexión |
| 11 | Respeta los ADRs transversales | Revisión de archivo y línea: `package.json` fija `next` 16.x y `engines.node >= 22`; `.nvmrc` = 22; `tsconfig.json` `strict`; `src/server/db.ts` usa `@neondatabase/serverless` + Drizzle; `.env.example` lista `DATABASE_URL` y `DATABASE_URL_UNPOOLED` sin valores |
| 12 | Cero lógica de negocio | Revisión humana: sin tablas ni migraciones, sin Server Actions; las únicas rutas son `/` (placeholder), `/api/health` y las páginas de error |

## 6. Plan

### DEV crea

- El proyecto con `create-next-app` (Next.js 16, TypeScript, App Router, `src/`, ESLint,
  Tailwind v4, npm) **en la raíz del repo**, junto a los documentos.
- `package.json` con `next` 16.x, `engines.node >= 22` y los scripts `dev`, `build` (=
  `drizzle-kit migrate && next build`), `start`, `lint`, `typecheck`, `test`, `test:e2e`,
  `db:generate` y `db:migrate`. Además, `.nvmrc` con `22`.
- `next.config.ts` con `cacheComponents: true` (si se aprueba, ver §3).
- `src/app/page.tsx`: placeholder sin diseño ("Eddie Store — en construcción").
- `src/app/error.tsx`, `global-error.tsx` y `not-found.tsx` mínimos (el estilo llega en el #3).
- `src/app/api/health/route.ts`: `SELECT 1` → 200/503, según la DoD 3 y 4.
- `src/server/db.ts` (cliente Drizzle + Neon, sin schema todavía) y `src/server/log.ts`.
- `drizzle.config.ts` (usa `DATABASE_URL_UNPOOLED`) y la carpeta `drizzle/` vacía.
- `.env.example` y `.github/workflows/ci.yml`.
- Proyecto de Vercel `eddie-store-yamaha-motocross` reconfigurado para esta app, con la
  integración de Neon instalada.

### TESTER crea

- `vitest.config.ts` y `tests/unit/health.test.ts`, que cubre la DoD 4 (sin base de datos) y la
  DoD 3 (si hay `DATABASE_URL`; si no, se salta con aviso).
- `playwright.config.ts` (servidor `next start`, Chromium móvil 375×812) y
  `tests/e2e/smoke.spec.ts` (DoD 7).

### NO se crea

- Tablas, migraciones, seed ni rama `seed` de Neon (ítem #2).
- Tokens de Stitch, fuentes, imágenes, header y footer (ítem #3).
- `finance.ts`, `slots.ts`, el reloj inyectable, Server Actions, Zod, Auth.js, `proxy.ts` ni
  límites de abuso (ítems #4 al #12).
- Ninguna página de producto (catálogo, ficha, simulador, cita, admin).

## 7. Preguntas abiertas para el humano

1. **ADR 0005:** ¿se activa `cacheComponents: true` ya en el Sprint 0? *(Propuesta: sí.)*
2. **ADR 0012:** ¿los tokens de Stitch esperan al ítem #3? *(Propuesta: sí.)*
3. **ADR 0013:** ¿en CI se prueba solo el 503 del health, y el 200 contra el Preview, sin pedir
   todavía `NEON_API_KEY`? *(Propuesta: sí.)*
4. **ADR 0016:** ¿se cablea `drizzle-kit migrate` en el build aunque no haya migraciones?
   *(Propuesta: sí.)*
5. **Repositorio de GitHub:** nombre y visibilidad. La rúbrica evalúa el repo, así que el docente
   necesita acceso. *(Propuesta: `eddie-store`, público.)*
6. **Proyecto de Vercel:** ¿se **reutiliza** `eddie-store-yamaha-motocross`, que hoy sirve el
   sitio estático, o se crea uno nuevo? *(Propuesta: reutilizarlo y conectarlo al repo de GitHub.)*
7. **Ubicación de la app:** ¿en la **raíz** del repo, junto a los documentos, o en una subcarpeta
   `app/`? *(Propuesta: raíz, que es más simple para Vercel y CI.)*

## 8. Cambios durante el ciclo

| Fecha | Cambio | Aprobado por |
|---|---|---|
| 2026-10-26 | Neon instalado desde el Marketplace de Vercel con el prefijo `DATABASE` (crea `DATABASE_URL` y `DATABASE_URL_UNPOOLED`, marcadas como Sensitive) en Production y Preview, con rama de base de datos por Preview. Primer Preview desplegado con `vercel deploy` desde la CLI (con `.vercelignore`), porque falta la conexión de GitHub en la cuenta de Vercel. Verificado: el build ejecutó `drizzle-kit migrate` y `GET /api/health` → `{"status":"ok","db":"ok"}`. **DoD 3 y 9 cumplidas.** | productowner-eddie |
| 2026-10-25 | Ajustes al implementar: (a) `npm run build` es `next build` a secas para poder compilar en local sin base de datos; la migración en el build vive en `build:vercel` (`drizzle-kit migrate && next build`), que `vercel.json` usa como `buildCommand`. (b) `create-next-app@16` integra Tailwind v4 con `@tailwindcss/turbopack` en `next.config.ts`: no hay `postcss.config.mjs`. (c) El config de Vitest es `vitest.config.mts`, porque Vite exige ESM. (d) `typecheck` es `next typegen && tsc --noEmit`, porque los tipos de rutas (`LayoutProps`) se generan. (e) `cacheComponents: true` ya viene activado por defecto en la plantilla. | productowner-eddie (implícito en "arranca la implementación"; revisar) |
| 2026-10-25 | Respuestas a §7: (1) `cacheComponents` sí; (2) tokens en el #3; (3) en CI solo el 503, y el 200 contra el Preview; (4) migración cableada en el build; (5) repo `eddie-store` **público** en la cuenta `ejairhh-a11y`; (6) se **reutiliza** el proyecto de Vercel `eddie-store-yamaha-motocross`; (7) la app vive en la **raíz** del repo. | productowner-eddie |
