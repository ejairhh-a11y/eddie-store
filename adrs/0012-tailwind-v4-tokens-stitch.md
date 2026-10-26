# ADR 0012: Tailwind CSS v4 con los tokens de Stitch en `@theme`

## Estado

Aceptado

## Contexto

`Design.md` fija la regla de **no rediseñar**: el HTML de Stitch se convierte a React conservando
sus clases (`bg-surface-container-high`, `px-space-md`, `font-label-caps`…). Esas clases dependen
de un `tailwind.config` en formato **v3**, embebido en cada página y cargado desde el CDN de
Tailwind, que no sirve para producción.

`create-next-app` instala hoy **Tailwind v4**, que reemplaza `tailwind.config.js` por variables
CSS declaradas en `@theme`.

## Decisión

- Se usa **Tailwind CSS v4** con `@tailwindcss/postcss`.
- Los tokens de Stitch se traducen **una vez** a `src/app/globals.css`, dentro de `@theme`,
  **conservando exactamente los nombres**:
  - `--color-surface-container-high: #262a33;` → `bg-surface-container-high`
  - `--spacing-space-md: 1rem;` → `px-space-md`
  - `--font-label-caps: …;` y `--text-label-caps: 14px;` (con interlineado, tracking y peso) →
    `font-label-caps text-label-caps`
- Las fuentes se cargan con `next/font/google` y se exponen como variables CSS que consume
  `@theme`.
- Se corrigen los problemas de accesibilidad heredados (Design.md §8), por ejemplo el
  `::-webkit-scrollbar { display: none }`.

## Alternativas consideradas

- **Tailwind v3.4**: el `tailwind.config` de Stitch se pega tal cual y funciona sin traducir. Se
  descartó porque es la versión anterior, en mantenimiento, y el proyecto arrancaría con deuda
  técnica.
- **Tailwind v4 + shadcn/ui**: los componentes accesibles (Dialog, Tabs, RadioGroup) vienen
  resueltos. Se descartó porque habría que reestilizar cada primitiva para que se parezca a
  Stitch, y los pocos widgets interactivos del diseño (pestañas, radio-chips, slider) se resuelven
  con elementos HTML nativos accesibles.

## Consecuencias

- El HTML de Stitch se migra casi línea por línea, y los tokens quedan en un solo archivo CSS.
- Mejor rendimiento de compilación y CSS final más chico.
- **Costo:** la traducción de v3 a v4 es manual y propensa a errores sutiles. En particular, los
  `fontSize` con `lineHeight`, `letterSpacing` y `fontWeight` tienen una sintaxis distinta en
  `@theme`. Mitigación: comparar visualmente cada página migrada contra el screenshot de Stitch.
- **Costo:** sin una librería de componentes, la accesibilidad de los widgets interactivos
  (pestañas, slider, selector de franjas) depende de implementarla bien a mano. Lo verifica el
  objetivo Lighthouse ≥ 90 del PRD.
