# CLAUDE.md — Eddie Store Yamaha Motocross

Web de un concesionario Yamaha de motocross **ficticio** (proyecto integrador del curso AI-First).
El piloto consulta precio y stock real, simula la cuota y **agenda una cita** en el concesionario;
**no hay pago en línea ni cuentas de piloto**. Un panel de admin gestiona las citas y el stock.

## Estado actual

- **Fase:** los documentos están terminados y el **Sprint 0 (walking skeleton) está pendiente**.
  Todavía no existe la app Next.js.
- La carpeta `stitch-eddie-store/` es **solo referencia visual** (HTML de Google Stitch). No se
  modifica ni se despliega.
- `docs/_archivo/apuestas/` es de otro proyecto. **Ignorarla.**

## Documentos: el orden manda

Pipeline: `PRD.md` → `Design.md` → `TECH-DESIGN.md` + `adrs/` → `BACKLOG.md` → spec por ítem → código.

| Documento | Para qué consultarlo |
|---|---|
| [`PRD.md`](PRD.md) | Qué se construye y qué **no** (sección "No alcance"). |
| [`Design.md`](Design.md) | Tokens, pantallas, componentes, estados de error y textos. **No rediseñar Stitch.** |
| [`TECH-DESIGN.md`](TECH-DESIGN.md) | Arquitectura, modelo de datos, máquina de estados, reglas de dominio y criterios de aceptación F1–F5. |
| [`adrs/`](adrs/) | El porqué de cada decisión (0001–0016). |
| [`BACKLOG.md`](BACKLOG.md) | Los 17 ítems en orden de dependencia. **Trabajar de a un ítem.** |
| [`docs/revision-adversarial.md`](docs/revision-adversarial.md) | Hallazgos aplicados y las sugerencias S1–S9 pendientes. |

**Regla:** si al programar una decisión resulta incorrecta, **primero se actualiza el ADR (o el
documento correspondiente) y después el código**. Nunca se cambia el código en silencio.

## Stack (versiones fijas)

- **Aplicación:** Node.js 22 LTS, Next.js 16 (App Router, `cacheComponents`), React 19 y
  TypeScript en modo `strict`.
- **Estilos:** Tailwind CSS v4.
- **Datos:** Drizzle ORM + drizzle-kit y `@neondatabase/serverless`; validación con Zod.
- **Autenticación:** Auth.js v5 (Credentials) con `@node-rs/argon2`.
- **Pruebas:** Vitest y Playwright.
- **Plataforma:** Vercel + Neon (Marketplace) y GitHub Actions.
- **Gestor de paquetes:** `npm`.

## Estructura prevista (se crea en el Sprint 0)

```
src/app/        rutas (/, /motos/[slug], /financiacion, /cita, /cita/[token], /privacidad, /admin/*, /api/health)
src/components/ componentes de UI (migrados del HTML de Stitch)
src/server/     dominio: el ÚNICO código que toca la base de datos (catalog, availability, booking,
                appointmentState, rateLimit, privacy, admin, auth, log, db)
src/lib/        lógica pura compartida cliente/servidor (finance, slots, schemas, codes), sin E/S
drizzle/        migraciones SQL versionadas
tests/          unit/ · integration/ · e2e/
```

## Reglas no negociables (vienen de los ADRs)

**Datos y dinero**

- Dinero en **céntimos `integer`**, nunca `float`, para almacenar. Se formatea con `Intl` en
  `es-ES` (`10.499 €`).
- El precio y la cuota **siempre se toman o recalculan en el servidor**. No se confía en los
  parámetros de la URL (ADR 0009).
- El stock disponible **no se guarda**: es `stock_total` menos las citas `PENDIENTE` con
  `slot_date >= today` (ADR 0004).

**Tiempo**

- El dominio **nunca** llama a `new Date()`, `Date.now()` ni `now()` de SQL. Recibe `today` y
  `now` desde un reloj inyectable (ADR 0004, 0013).
- Toda lógica de fechas y franjas usa la zona `Europe/Madrid`. Vercel corre en UTC.

**Concurrencia y estados**

- Crear una cita es **una transacción** con `SELECT … FOR UPDATE` sobre la moto, usando el
  driver transaccional de Neon (ADR 0002, 0006).
- Los errores `23505` se traducen **por nombre de restricción**, usando las constantes
  compartidas. Nunca se traduce un `23505` genérico como `SLOT_TAKEN` (ADR 0006 §2).
- Las transiciones de estado de una cita son `UPDATE … WHERE status IN (…) RETURNING`. Solo se
  permiten las de la tabla de ADR 0006 §3.
- Toda mutación que cambia el stock llama a `updateTag("stock")` (ADR 0005).

**Contrato y seguridad**

- Toda Server Action valida con **Zod** y devuelve `{ ok, data } | { ok: false, code, fieldErrors? }`
  con los códigos de ADR 0007.
- Las de admin verifican la **sesión y el `session_version` dentro de la propia acción**:
  `proxy.ts` no es la barrera de seguridad (ADR 0008).
- El límite de intentos de login va **dentro de `authorize()`** (ADR 0008, 0010).
- **Logs solo con `src/server/log.ts`.** Prohibido registrar nombre, email, teléfono, token o IP
  (ADR 0014).
- La URL de confirmación usa el `access_token`, nunca el `code` (ADR 0011).
- Los secretos solo van en variables de entorno, y cada variable nueva se agrega a `.env.example`
  sin valor.

**Base de datos**

- Las migraciones son **solo aditivas** (patrón *expand → contract*) y se ejecutan con
  `DATABASE_URL_UNPOOLED` (ADR 0016).
- El seed nunca corre en el build de producción.

**Interfaz**

- Se conservan las clases y los tokens de Stitch (`bg-surface-container-high`, `px-space-md`,
  `font-label-caps`…), definidos en `@theme` (ADR 0012). No se inventan colores ni tamaños.
- Se ocultan Accesorios & GYTR, Concesionario & Taller, Comparar y Cross-Country & Enduro.
- No aparecen textos de pago, cifrado ni envío (Design.md §10).
- Accesibilidad: `<label>` visible en cada input, foco visible, áreas táctiles de al menos 44 px y
  respeto de `prefers-reduced-motion` (Design.md §8).

## Idioma

- La interfaz, los documentos y los mensajes de commit van en **español** (España: `es-ES`, euros,
  fechas tipo `sáb 8 nov · 11:00`).
- El código va en **inglés**. Excepciones que se mantienen tal como figuran en TECH-DESIGN: los
  valores de los enums de dominio (`PENDIENTE`, `VENDIDA`, `CANCELADA`, `VENCIDA`, `COMPETICION`,
  `YOUTH`) y los códigos de cita `YZ-XXXX`.

## Comandos

```
npm run dev             # servidor local
npm run build           # next build (no necesita base de datos)
npm run build:vercel    # drizzle-kit migrate && next build (el que usa Vercel, vía vercel.json)
npm run start           # sirve la build de producción
npm run lint            # ESLint
npm run typecheck       # next typegen && tsc --noEmit
npm test                # Vitest, pruebas unitarias (tests/unit)
npm run test:e2e        # Playwright contra `next start` (en local, levanta antes `npm run start`)
npm run db:generate     # drizzle-kit generate (nueva migración)
npm run db:migrate      # drizzle-kit migrate (usa DATABASE_URL_UNPOOLED)
```

Previstos para ítems siguientes: `test:int` (#2), `db:seed` y `db:seed-admin` (#2).

**Nota sobre esta máquina:** el enlace de nvm-windows en `C:\Program Files\nodejs` mezcla Node 22
con el npm de la instalación 18, y `npm`/`npx` fallan con *"Class extends value undefined"*.
Mientras no se repare (con `nvm install 22` + `nvm use 22` desde una terminal de administrador),
se pueden ejecutar los binarios directamente con `node node_modules/<paquete>/...`, o usar el npm
de otra versión: `node %APPDATA%\nvm\v20.17.0\node_modules\npm\bin\npm-cli.js <comando>`.

## Propiedad de rutas

Definida en [`SPRINT0.md`](SPRINT0.md) §4. Una tarea de un rol no modifica rutas de otro.

| Rol | Rutas |
|---|---|
| TESTER | `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`, `tests/fixtures/**`, `vitest.config.mts`, `playwright.config.ts` |
| DEV | `src/**`, `public/**`, `drizzle/**`, `drizzle.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `.nvmrc`, `.env.example`, `vercel.json`, `.github/workflows/**` |
| Solo LEAD / humano | `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `SPRINT0.md`, `contratos/**`, `PRD.md`, `Design.md`, `TECH-DESIGN.md`, `adrs/**`, `BACKLOG.md`, `docs/**` |
| Nadie (solo lectura) | `stitch-eddie-store/**`, `docs/_archivo/**` |

**Regla clave:** si una prueba falla, no se edita la prueba para que pase. Se decide con el humano
si el error está en la app o en la prueba.

## Flujo de trabajo por ítem del backlog

1. Toma **el siguiente ítem** de `BACKLOG.md`, con sus dependencias ya terminadas.
2. Escribe su spec con la skill **`escribir-contrato`** y espera la aprobación.
3. Implementa con sus pruebas, en el nivel que indica TECH-DESIGN ([U]/[I]/[E]/[M]).
4. Antes de dar el ítem por cerrado, corre `lint`, `typecheck` y las pruebas.
5. Pasa el agente **`code-reviewer`** y aplica lo que corresponda con **`code-fixer`**.

Antes de entregar: `security-pass`, `deploy-pass`, `playwright-e2e-test` y **`auditar-drift`**
(compara el PRD y los ADRs con el código).

## Qué no hacer

- No agregar funcionalidades que estén en "No alcance" del PRD: pagos, login de piloto, emails,
  accesorios, varias sedes.
- No ejecutar migraciones destructivas ni el seed contra la rama `main` de Neon sin confirmación
  explícita.
- No hacer commit, push ni deploy a producción sin que el usuario lo pida.
- No editar `stitch-eddie-store/` ni `docs/_archivo/`.
