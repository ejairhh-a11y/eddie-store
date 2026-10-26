# Backlog: Eddie Store — Yamaha Motocross

> Se deriva de [`PRD.md`](PRD.md) y [`TECH-DESIGN.md`](TECH-DESIGN.md) (con sus ADRs en `adrs/`).
> Está ordenado **por dependencia**: un ítem solo depende de ítems con un número menor. Cada ítem es
> un ciclo de Spec-Driven Development.

| # | Item | Alcance | Depende de | Contexto extra requerido |
|---|---|---|---|---|
| 1 | Walking skeleton | Next.js 16 + TS estricto + Tailwind v4 + Node 22, lint/typecheck en GitHub Actions, `GET /api/health` y primer deploy en Vercel conectado a Neon. | — | Requiere Node 22, sesión de `gh` y acceso al equipo de Vercel e integración de Neon. |
| 2 | Esquema, migraciones y seed | Las 4 tablas de Drizzle con enums, restricciones con nombre fijo e índices; migraciones; seed idempotente de las 6 motos y el admin; rama `seed` de Neon; job de CI con una rama efímera `ci-*` para las pruebas de integración. | #1 | — |
| 3 | Design system y layout | Tokens de Stitch en `@theme`, fuentes con `next/font`, imágenes y logo en `/public`, `SiteHeader` (con los enlaces fuera de alcance ocultos), `TickerBanner`, `SiteFooter` con aviso legal, componentes base, `error`/`not-found` y la página `/privacidad`. | #1 | — |
| 4 | Librería financiera | `finance.ts` puro: cuota con sistema francés, TAE, cuota "desde" (0 € y 60 meses), validación de entrada y plazo, con pruebas unitarias contra valores de referencia (±0,01 €). | #1 | Reglas de financiación: las cubren el PRD y el TECH-DESIGN (TIN 5,95 %, sin comisiones). La regla de redondeo se define en la spec (sugerencia S2 de la revisión). |
| 5 | Reloj y franjas horarias | Reloj inyectable (`today`/`now`) y `slots.ts`: lunes a sábado, de 10 a 18 h, en Europe/Madrid, ventana desde mañana hasta 30 días, con pruebas en las fechas de cambio de hora. | #1 | — |
| 6 | Catálogo | Página `/`: lecturas con `"use cache"` y tag `stock`, stock derivado de las citas, `ProductCard` con `StockBadge` y "desde", filtros en la URL, buscador por nombre y estado vacío. | #2, #3, #4 | — |
| 7 | Ficha de modelo | `/motos/[slug]` para los 6 modelos: galería, precio, especificaciones en 3 grupos, stock, estado agotado con modelos similares y 404; se eliminan los bloques de Stitch fuera de alcance. | #6 | — |
| 8 | Simulador de financiación | `/financiacion?moto=`: entrada (slider + input), plazo con radio-chips, cuota/TAE/total con `aria-live` y el CTA hacia `/cita` con los parámetros. | #4, #7 | — |
| 9 | Dominio de reserva | `booking.ts`: transacción con `FOR UPDATE`, índice único de franja y de persona, paso perezoso a `VENCIDA`, mapeo de errores por restricción (`SLOT_TAKEN`/`ALREADY_BOOKED`/`OUT_OF_STOCK`), `code` con `SAVEPOINT`, `access_token` hasheado y cuota recalculada; pruebas de concurrencia. | #2, #4, #5 | — |
| 10 | Límites contra abuso | `rateLimit.ts`: IP en HMAC, 5 intentos por hora y 3 citas por día por IP, tope global diario, contadores en una transacción propia; pruebas de integración. | #9 | — |
| 11 | Agendar cita (interfaz) | `/cita`: `StepIndicator`, `SlotPicker` con franjas libres, formulario con Zod compartido y texto de privacidad, estados de error de Design.md §6, y confirmación `/cita/[token]` con teléfono enmascarado, `noindex` y botón WhatsApp. | #3, #8, #10 | — |
| 12 | Autenticación del admin | Auth.js Credentials con `@node-rs/argon2`, límite de intentos en `authorize()`, expiración absoluta de 8 h, `session_version`, `proxy.ts` y `/admin/login`. | #2, #10 | — |
| 13 | Panel de citas | `/admin`: citas por día, transiciones de la máquina de estados (vender, cancelar, no-show) idempotentes con `updateTag`, venta tardía con stock, cancelar en bloque por origen y anonimización oportunista a los 90 días. | #11, #12 | — |
| 14 | Panel de stock | `/admin/stock`: total, apartadas y disponible por modelo, y ajuste del total con `FOR UPDATE`, sin bajar de las citas pendientes vigentes. | #9, #12 | — |
| 15 | E2E del flujo crítico | Playwright en CI contra `next start` sobre la rama efímera: catálogo → ficha → simulador → cita → confirmación en 375 px (≤ 4 pantallas, ≤ 12 interacciones); además, acceso con el código corto → 404 y `/admin` sin sesión → login. | #2, #11, #12 | — |
| 16 | Deploy a producción | Producción con migración en el build (`DATABASE_URL_UNPOOLED`), seed inicial manual, smoke tests en Preview (con bypass) y en Production, limpieza de ramas y `docs/despliegue.md` con el protocolo y el rollback. | #15 | — |
| 17 | Validación manual | Lighthouse (LCP < 2,5 s, Accessibility ≥ 90), recorrido con teclado y prueba de usabilidad con 3 personas (< 5 min), con los resultados documentados en `docs/`. | #16 | — |

## Cómo usar este backlog

Cada ítem es una spec independiente. Al implementarlo, arranca un ciclo de Spec-Driven Development
(`escribir-contrato` → código → revisión) usando ese ítem como el "change", no el proyecto
completo. Si la columna "Contexto extra requerido" tiene algo, compártelo como contexto al generar
la spec de ese ítem.

## Trazabilidad

| # | PRD | TECH-DESIGN (criterios) | ADRs |
|---|---|---|---|
| 1 | Riesgos (deploy público) | F5 (health) | 0001, 0003, 0012, 0014 |
| 2 | Alcance (catálogo, citas, admin) | Modelo de datos, F5 (ramas sin datos personales) | 0002, 0003, 0006, 0013, 0015, 0016 |
| 3 | Riesgos (imágenes, marca), No alcance (secciones ocultas) | F1 (enlaces ocultos), F5 (accesibilidad) | 0012, 0014, 0015 |
| 4 | Alcance (simulador), Criterios (simulador exacto) | F2, Reglas de dominio | 0009 |
| 5 | Casos borde (horario) | F3 (SlotPicker), Reglas (reloj) | 0004, 0013 |
| 6 | Alcance (catálogo), Criterios (stock coherente, LCP) | F1 | 0004, 0005 |
| 7 | Alcance (ficha), Casos borde (moto agotada) | F1 | 0005, 0012 |
| 8 | Alcance (simulador) | F2 | 0009 |
| 9 | Casos borde (apartado, dos pilotos, última unidad, abandono) | F3 (concurrencia, `ALREADY_BOOKED`) | 0004, 0006, 0007, 0011 |
| 10 | Riesgos (abuso implícito en el apartado de stock) | F3 (límites) | 0010, 0015 |
| 11 | Alcance (agendar, confirmación + WhatsApp), Casos borde (datos inválidos) | F3 | 0007, 0009, 0011, 0015 |
| 12 | Alcance (panel protegido), Riesgos (admin expuesto) | F4 (sesión, límites) | 0007, 0008, 0010 |
| 13 | Alcance (panel), Casos borde (no-show) | F4 (transiciones, anonimización) | 0005, 0006, 0010, 0015 |
| 14 | Alcance (ajuste de stock) | F4 (invariante de stock) | 0006 |
| 15 | Criterios (5 min) | F3 (pantallas e interacciones, código corto), F4 (redirección) | 0013 |
| 16 | Riesgos (deploy) | Protocolo de despliegue, F5 | 0003, 0013, 0016 |
| 17 | Criterios (LCP, accesibilidad, 5 min) | Criterios [M] de F1, F3 y F5 | 0013 |

## Notas

- **Bloqueos del ítem 1:** para empezar hacen falta Node 22, `gh auth login` y el acceso de
  Vercel y Neon (TECH-DESIGN › Riesgos técnicos abiertos). El siguiente paso del pipeline,
  `preparar-sprint0`, detalla el walking skeleton a partir de este ítem.
- **Ítems que se pueden trabajar en paralelo:** el 3, 4 y 5 dependen solo del 1. El 6–8 (público)
  y el 9–10 (reserva) avanzan por separado hasta juntarse en el 11.
- **Fuera de este backlog:** el pase de seguridad (sesión 12) y la auditoría de drift
  (`auditar-drift`) no son specs de producto, sino revisiones del proyecto. Se ejecutan con sus
  skills después del ítem 16. Las sugerencias S1–S9 de la revisión adversarial siguen pendientes
  de decisión y no generan ítems hasta que se acepten.
