# Eddie Store — Yamaha Motocross

**Producción:** https://eddie-store-yamaha-motocross.vercel.app

Web de un concesionario Yamaha de motocross (ficticio) donde un piloto amateur ve **precio y stock
real**, **simula la cuota** y **agenda una cita** en el concesionario en menos de 5 minutos, sin
escribir por WhatsApp. Proyecto integrador del curso *Especialización en desarrollo AI-First con
Claude*.

> Proyecto académico. Sin afiliación con Yamaha Motor Co., Ltd. Precios y stock de demostración.

## El problema y la solución

Hoy el piloto pregunta precio y disponibilidad por WhatsApp y va al concesionario sin saber si la
moto sigue disponible ([PRD](PRD.md)). Eddie Store le da:

- **Catálogo** de la gama YZ 2025 con stock real (disponible, últimas unidades, agotada).
- **Ficha** por modelo con especificaciones.
- **Simulador** de financiación (sistema francés, TIN 5,95 %, TAE calculada).
- **Cita** con día y hora: aparta una unidad, sin franjas duplicadas aunque dos personas
  confirmen a la vez, confirmación con código y botón de WhatsApp.
- **Panel del concesionario** con login: citas (vendida, cancelar, no-show) y stock.

No hay pago en línea ni cuentas de piloto (PRD › No alcance).

## Arquitectura

```
Navegador ──► Vercel: Next.js 16 (App Router, cacheComponents) · React 19 · Tailwind v4
                ├ páginas: /  /motos/[slug]  /financiacion  /cita  /cita/[token]  /admin
                ├ Server Actions + Zod  ─►  src/server (dominio)  ─►  Neon PostgreSQL (Drizzle)
                └ /api/health
GitHub Actions: lint · tipos · Vitest · integración (Postgres) · build · Playwright ─► deploy Vercel
```

Decisiones clave (cada una con su ADR en [`adrs/`](adrs/)):

| Decisión | ADR |
|---|---|
| Una sola app Next.js full-stack sobre Neon | [0001](adrs/0001-app-nextjs-full-stack.md) |
| Stock **derivado** de las citas: se libera solo cuando pasa la fecha | [0004](adrs/0004-stock-derivado.md) |
| Concurrencia garantizada por la base de datos: índice único parcial + `FOR UPDATE` + máquina de estados | [0006](adrs/0006-concurrencia-indice-unico-for-update.md) |
| Código de cita legible + token secreto de 128 bits (sin IDOR) | [0011](adrs/0011-identificador-de-cita.md) |
| Límites contra abuso por persona, IP (HMAC) y global | [0010](adrs/0010-limites-abuso-en-base-de-datos.md) |
| Privacidad: anonimización a los 90 días, entornos de prueba sin datos reales | [0015](adrs/0015-privacidad-datos-personales.md) |
| Deploy desde GitHub Actions detrás de las pruebas | [0003](adrs/0003-vercel-neon-marketplace.md), [0016](adrs/0016-migraciones-y-datos.md) |

## Correr en local (3 pasos)

Requisitos: Node 22 y un PostgreSQL (local o una rama de Neon).

```bash
npm ci
```

```bash
cp .env.example .env.local
```

Completa `.env.local`: `DB_DRIVER=pg`, `DATABASE_URL` y `DATABASE_URL_UNPOOLED` con tu Postgres,
`RATE_LIMIT_SECRET` y `AUTH_SECRET` con cualquier texto largo. Luego:

```bash
npm run db:migrate && npm run dev
```

Abre http://localhost:3000. Para el panel, define `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` y
ejecuta `npm run db:seed-admin`.

## Pruebas

| Nivel | Comando | Qué cubre |
|---|---|---|
| Unitarias | `npm test` | Simulador (cuota, TAE, redondeo), franjas y zona horaria con cambio de hora, health |
| Integración | `npm run test:int` | Esquema, stock derivado, concurrencia (10 peticiones → 1 cita), estados, límites, retención |
| E2E | `npm run test:e2e` | Flujo crítico catálogo → ficha → simulador → cita → confirmación en móvil (375 px) |

## Pipeline documental

Cada documento responde al anterior:

1. [PRD.md](PRD.md): problema, usuario, alcance y criterios de éxito.
2. [Design.md](Design.md): design system de Stitch, pantallas y estados.
3. [TECH-DESIGN.md](TECH-DESIGN.md) + [16 ADRs](adrs/), cuestionados en una
   [revisión adversarial](docs/revision-adversarial.md).
4. [BACKLOG.md](BACKLOG.md): 17 ítems con trazabilidad.
5. [SPRINT0.md](SPRINT0.md) y [contratos/](contratos/): spec de cada ítem.
6. [CLAUDE.md](CLAUDE.md): reglas del proyecto para el agente.
7. Cierre: [seguridad](docs/seguridad.md), [despliegue](docs/despliegue.md) y [drift](DRIFT.md).

## Criterio propio (decisiones del equipo)

- El PRD cambió el checkout de Stitch por **agendar cita**: el problema real es el tiempo perdido,
  no pagar en línea.
- La revisión adversarial encontró y corrigió, antes de programar:
  - un bucle de "franja ocupada" para quien ya tenía cita;
  - la posibilidad de dejar el stock negativo con una venta tardía;
  - un E2E que habría fallado de forma intermitente en Vercel.
- Las pruebas de integración detectaron dos bugs reales mientras se programaba: un CHECK de
  anonimización permisivo y un stock que salía como `NaN`.
