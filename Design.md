# Design.md — Eddie Store Yamaha Motocross

> Sistema de diseño y especificación de interfaz. Responde a [`PRD.md`](PRD.md) y alimenta al
> Technical Design Document. **Fuente visual:** las 5 pantallas generadas en Google Stitch
> (`stitch-eddie-store/`). La regla es **no rediseñar**: se conserva la estética, la estructura
> y los tokens de Stitch, y solo se cambia lo que el PRD obliga a cambiar (sin pagos, con citas).

---

## 1. Principios de diseño

| Principio | Qué significa en Eddie Store |
|---|---|
| **Estética "paddock / telemetría"** | Tema oscuro, tipografía condensada en mayúsculas, datos en monoespaciada, como una pantalla de box de competición. Es la identidad de Stitch y se mantiene. |
| **El dato primero** | Precio, stock y cuota son lo más visible de cada pantalla, porque son las tres preguntas que el piloto hoy hace por WhatsApp (PRD › Problema). |
| **Menos de 5 minutos hasta la cita** | Cada pantalla tiene **una** acción principal clara (`Agendar cita`). Lo que no ayuda a ese recorrido se quita u oculta (PRD › Objetivo). |
| **Honestidad** | Ninguna cifra escrita a mano: precios, stock y cuota vienen de la base de datos o de la fórmula. No hay textos de pago, cifrado o envío que el producto no ofrece. |
| **Solo modo oscuro** | Stitch está diseñado en oscuro (`<html class="dark">`). La v1 no tiene modo claro. |

---

## 2. Design tokens

Los tokens salen **literalmente** de la configuración `tailwind-config` de Stitch, que es idéntica
en las 5 páginas. En Next.js pasan del script del CDN a la configuración de Tailwind del
proyecto, **con los mismos nombres**, para que las clases del HTML (`bg-surface-container-high`,
`px-space-md`, `font-label-caps`…) funcionen sin reescribirse.

### 2.1 Color (esquema Material 3, oscuro)

**Marca y acción**

| Token | Hex | Uso |
|---|---|---|
| `primary-container` | `#0e4bef` | Azul Yamaha. CTA principal (`Agendar cita`, `Confirmar`), pestaña activa. |
| `on-primary-container` | `#d1d7ff` | Texto sobre el CTA principal. |
| `primary` | `#b8c4ff` | Enlaces, iconos activos, acentos. |
| `secondary-container` | `#00e3fd` | Cian de telemetría: datos destacados, cuota del simulador, badges "en vivo". |
| `secondary` | `#bdf4ff` | Texto de acento sobre superficies oscuras. |
| `tertiary-container` | `#c0002e` | Rojo racing: badge "Agotada", "Últimas unidades", alertas. |
| `tertiary` | `#ffb3b3` | Texto de alerta suave. |

**Superficies** (de más profunda a más elevada)

| Token | Hex | Uso |
|---|---|---|
| `surface-container-lowest` | `#0a0e16` | Inputs, fondo de tablas de especificaciones. |
| `background` / `surface` | `#0f131c` | Fondo de página. |
| `surface-container-low` | `#181c24` | Secciones alternas. |
| `surface-container` | `#1c2028` | Tarjetas de producto. |
| `surface-container-high` | `#262a33` | Paneles laterales (resumen de la cita, simulador). |
| `surface-container-highest` | `#31353e` | Hover de tarjetas, chips seleccionados. |

**Texto y bordes**

| Token | Hex | Uso |
|---|---|---|
| `on-surface` | `#dfe2ee` | Texto principal. |
| `on-surface-variant` | `#c4c5d9` | Texto secundario y descripciones. |
| `outline` | `#8e90a2` | Bordes de inputs, separadores con significado. |
| `outline-variant` | `#434656` | Bordes decorativos de tarjetas. |

**Semánticos**

| Estado | Token | Uso |
|---|---|---|
| Disponible | `secondary-container` + icono `check_circle` | Stock > 2. |
| Últimas unidades | `tertiary` + icono `warning` | Stock 1–2. |
| Agotada | `tertiary-container` + icono `block` | Stock 0. |
| Error de formulario | `error` `#ffb4ab` / `error-container` `#93000a` | Mensajes de validación. |

> El estado de stock **nunca se comunica solo por color**: siempre va con icono y texto
> (WCAG 1.4.1).

### 2.2 Tipografía

Tres familias de Google Fonts, cargadas con `next/font` (sin bloquear el render):

| Familia | Rol |
|---|---|
| **Barlow Condensed** (600/700/800) | Titulares, nombres de modelo, etiquetas en mayúsculas. |
| **Space Grotesk** (400–700) | Texto de lectura y formularios. |
| **JetBrains Mono** (400/500/700) | Datos técnicos, precios en tablas, códigos de cita, especificaciones. |

| Token | Tamaño / interlineado | Peso | Familia | Uso |
|---|---|---|---|---|
| `display-hero` | 84 / 84 px | 800 | Barlow | Hero de inicio (escritorio). |
| `display-hero-mobile` | 48 / 50 px | 800 | Barlow | Hero de inicio (móvil). |
| `headline-xl` | 56 / 58 px | 700 | Barlow | Nombre del modelo en la ficha. |
| `headline-xl-mobile` | 36 / 38 px | 700 | Barlow | Ídem en móvil. |
| `headline-lg` | 38 / 42 px | 700 | Barlow | Títulos de sección. |
| `headline-md` | 26 / 30 px | 600 | Barlow | Títulos de tarjeta y de bloque. |
| `headline-sm` | 20 / 24 px | 600 | Barlow | Subtítulos. |
| `body-lg` | 18 / 28 px | 400 | Space Grotesk | Párrafos destacados. |
| `body-md` | 15 / 22 px | 400 | Space Grotesk | Texto base. |
| `body-sm` | 13 / 18 px | 400 | Space Grotesk | Ayudas de formulario y notas. |
| `label-caps` | 14 / 16 px, +0.12em | 700 | Barlow | Botones, pestañas, navegación. |
| `label-data` | 12 / 16 px, +0.08em | 500 | JetBrains Mono | Datos y valores técnicos. |
| `caption-spec` | 10 / 14 px | 400 | JetBrains Mono | Solo decoración (ver §8). |

### 2.3 Espaciado, radios y layout

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `space-2xs` | 2 px | | `space-xl` | 32 px |
| `space-xs` | 4 px | | `space-2xl` | 48 px |
| `space-sm` | 8 px | | `space-3xl` | 72 px |
| `space-md` | 16 px | | `space-4xl` | 96 px |
| `space-lg` | 24 px | | | |

| Layout | Móvil | Tablet | Escritorio |
|---|---|---|---|
| Margen lateral | `margin-mobile` 16 px | `margin-tablet` 32 px | `margin-desktop` 56 px |
| Gutter de grilla | `gutter-mobile` 16 px | — | `gutter-desktop` 24 px |

Radios: `DEFAULT` 4 px (inputs y botones), `lg` 8 px (tarjetas), `xl` 12 px (paneles), `full`
(badges y chips). Estética angular: no se usan radios mayores.

### 2.4 Iconografía, imágenes y marca

- **Iconos:** Material Symbols Outlined (fuente variable). Los iconos decorativos llevan
  `aria-hidden="true"`; los iconos que actúan como botón llevan `aria-label`.
- **Imágenes:** las 27 imágenes de Stitch se **descargan a `/public/images/`** (riesgo del PRD:
  la CDN temporal de Google caduca) y se sirven con `next/image` (WebP/AVIF, `width` y `height`
  explícitos, `sizes` responsivo). La imagen principal de la ficha lleva `priority` para cumplir
  el criterio LCP < 2,5 s.
- **Logo:** el escudo "Eddie Store · Yamaha Motocross Specialist" (`05-logo`). Se exporta a SVG
  o PNG transparente en `/public/brand/`. En el header se usa la versión horizontal pequeña
  (texto "EDDIE STORE" + "Yamaha Racing Department"), como en Stitch.
- **Aviso legal:** en el footer, "Proyecto académico ficticio. Sin afiliación con Yamaha Motor
  Co., Ltd." (riesgo de marca del PRD).

---

## 3. Mapa de pantallas: de Stitch a la v1

| Stitch | Ruta en la v1 | Qué se conserva | Qué cambia (por el PRD) |
|---|---|---|---|
| `00-home` / `02-catalogo` (son el mismo HTML) | `/` | Hero, moto destacada, grilla de catálogo con filtros, servicios del concesionario y footer. | Las 6 tarjetas vienen de la base de datos con stock real. Los filtros funcionan (`?tipo=4t&cc=250`). La moto destacada es la YZ450F a 10.499 €. Se quita "0% TAE" del banner superior. |
| `04-ficha-yz450f` | `/motos/[slug]` (una plantilla para los 6 modelos) | Galería, bloque de precio, tabla de especificaciones en 3 grupos y bloque de ajuste de sag. | Se quitan los accesorios GYTR con precio. El CTA pasa a ser **`Agendar cita`**, con un enlace secundario a "Simular financiación". Se agrega el estado de stock con badge, y el estado agotado (§6). |
| `03-pago` | `/financiacion?moto=[slug]` | Selector de modalidad, simulador (entrada, plazo 24/36/48/60) y panel resumen con la moto. | Deja de ser un paso de pago y pasa a ser un **simulador informativo**. Se quitan los paquetes de protección y el kit de regalo. La pestaña "Contado" muestra el precio sin descuentos. Las cifras salen de la fórmula y se muestra la TAE calculada. CTA: `Agendar cita con esta moto`. |
| `01-checkout` | `/cita?moto=[slug]` | Indicador de 3 pasos, bloque "Expediente del titular" (formulario) y panel resumen lateral. | Los 3 pasos pasan a ser **Moto → Datos y horario → Confirmación**. El bloque de entrega se convierte en el **selector de día y hora** con las mismas tarjetas. Se quitan el DNI y la licencia RFME (no hacen falta para una cita). CTA: `Confirmar cita`. |
| *(nueva, sin Stitch)* | `/cita/[token]` | Mismo layout que el paso 3. | Confirmación: código de cita legible, resumen con el teléfono enmascarado y botón **`Avisar por WhatsApp`**. La URL usa un token secreto, no el código ([ADR 0011](adrs/0011-identificador-de-cita.md)). |
| *(nueva, sin Stitch)* | `/admin` y `/admin/login` | Tokens y componentes del sitio. | Panel del concesionario (§7). |

**Bloques de la ficha de Stitch (`04-ficha-yz450f`): qué se conserva**

| Bloque en Stitch | v1 | Motivo |
|---|---|---|
| Galería y vistas (perfil, motor, escape, cockpit) | Se conserva | Datos en `motorcycles.images`. |
| Precio y "Financia desde X €/mes" | Se conserva | Precio de la base de datos y cuota "desde" calculada (ver abajo). |
| "3 unidades en Concesionario Paddock" | Se conserva, conectado a datos | Pasa a ser el `StockBadge` con el disponible real. |
| Ficha técnica en 3 grupos | Se conserva | `motorcycles.spec_groups`. |
| Ajuste de sag "Incluido 0 €" | Se conserva como texto | Es un servicio informativo, no suma al precio. |
| Selector de acabado (Monster +300 €, 50th +450 €) | **Se elimina** | El precio es único por modelo (PRD). Las variantes serían otro modelo. |
| Selector de mapa de ECU | **Se elimina** | Es configuración técnica sin efecto en la cita. |
| Selector de cantidad | **Se elimina** | Una cita aparta una sola unidad (PRD › Casos borde). |
| Accesorios GYTR con precio | **Se elimina** | Accesorios fuera de alcance (PRD › No alcance). |
| "Entrega inmediata 24-48 h" | **Se elimina** | No hay entrega: el piloto recoge la moto en el concesionario tras la cita. |

**"Financia desde X €/mes"** (en `ProductCard` y en la ficha) se calcula siempre con **entrada
0 € y plazo de 60 meses**: es la cuota más baja posible sin entrada. Es una constante de dominio
(TECH-DESIGN › Reglas de dominio).

**Header y navegación**

| Elemento de Stitch | v1 |
|---|---|
| Menú: Gama YZ, 4 Tiempos, 2 Tiempos, Cross-Country & Enduro | Enlaces a `/` con el filtro aplicado. "Cross-Country & Enduro" **se oculta**: no hay modelos de esa línea en el catálogo. |
| Simulador Financiación | `/financiacion`. |
| Accesorios & GYTR, Concesionario & Taller, Comparar | **Ocultos** (PRD › No alcance). |
| Buscador ⌘K | **Filtro por nombre** sobre los 6 modelos (`YZ450F`, "250"…). |
| Carrito con contador | Pasa a ser **"Mi cita"**: el contador muestra 1 cuando la URL del flujo en curso tiene una moto elegida (`?moto=`) y lleva a `/cita` con esos parámetros ([ADR 0009](adrs/0009-estado-en-url-calculo-compartido.md)). No hay carrito de compra. |
| Banner superior animado | Se mantiene sin "0% TAE". Respeta `prefers-reduced-motion`. |

---

## 4. Flujos de usuario

### 4.1 Piloto: de la consulta a la cita (flujo crítico, lo cubre el test de Playwright)

```
/ (catálogo) ─► filtra o busca ─► tarjeta de moto ─► /motos/[slug]
                                                        │
                    ┌──────────── ¿hay stock? ──────────┤
                    │ No                                │ Sí
                    ▼                                   ▼
        Badge "Agotada", CTA deshabilitado     [Simular financiación] (opcional)
        + "Modelos similares con stock"                 │  /financiacion → ve la cuota
                                                        ▼
                                              [Agendar cita] → /cita?moto=slug
                                                        │
                                  Paso 2: datos + día y hora (9 franjas)
                                                        │
                              ┌──── ¿la franja sigue libre y hay stock? ────┐
                              │ No                                          │ Sí
                              ▼                                             ▼
             "Ese horario acaba de ocuparse" +                 /cita/[token] (paso 3)
             franjas libres más cercanas, o                    código + resumen +
             "Se agotó mientras agendabas"                     [Avisar por WhatsApp]
             (los datos del formulario se conservan)
```

Objetivo medible: el recorrido feliz cabe en **4 pantallas y menos de 5 minutos** (PRD › Criterios
de éxito).

### 4.2 Concesionario: gestión

```
/admin/login ─► /admin (citas próximas por día) ─► [Marcar vendida] → stock −1 definitivo
                     │                          └► [Cancelar]        → libera la unidad
                     └► pestaña Stock ─► ajustar las unidades por modelo
Citas vencidas y pendientes → resaltadas en rojo racing ("No se presentó?")
```

---

## 5. Inventario de componentes

Se organizan en las capas tokens → elementos → patrones → plantillas. Cada componente sale de
fragmentos de HTML que hoy están **repetidos** en las 5 páginas de Stitch.

### 5.1 Elementos

| Componente | Variantes / props | Estados |
|---|---|---|
| `Button` | `variant`: primary (azul) · secondary (borde) · ghost · whatsapp; `size`: md · lg | hover, focus visible, disabled, loading (spinner + texto "Confirmando…") |
| `Badge` | `tone`: disponible · últimas · agotada · info | — |
| `StockBadge` | recibe `available: number` | Elige el tono y el texto: "Disponible", "Últimas 2 unidades", "Agotada". |
| `Input` / `Select` | `label` siempre visible, `hint`, `error` | default, focus, error (`aria-invalid` + mensaje con `aria-describedby`), disabled |
| `Chip` | filtros del catálogo (`aria-pressed`) | seleccionado / no seleccionado |
| `Icon` | Material Symbols, `decorative` o con `label` | — |
| `PriceTag` | precio en € con formato `es-ES` (`10.499 €`) | — |
| `DataRow` | etiqueta + valor en monoespaciada (especificaciones y resumen) | — |

### 5.2 Patrones

| Componente | Origen en Stitch | Notas |
|---|---|---|
| `SiteHeader` | barra superior + logo + menú + buscador + "Mi cita" | Menú hamburguesa en móvil (< 1024 px). |
| `TickerBanner` | banner animado superior | Pausa con `prefers-reduced-motion`. |
| `ProductCard` | tarjeta del catálogo | Imagen, nombre, precio, 3 especificaciones, `StockBadge`, "desde X €/mes" (calculado), CTA "Ver ficha". Toda la tarjeta es un enlace. |
| `CatalogFilters` | chips de tipo y cilindrada | Sincronizados con la URL (`?tipo=&cc=&categoria=`). El chip "Disponibilidad" de Stitch se elimina porque no está en el PRD: el stock ya se ve en cada tarjeta. Estado vacío: "Ningún modelo coincide" + "Quitar filtros". |
| `SpecTable` | tabla de la ficha técnica en 3 grupos | Usa `<table>` semántica con `<th scope="row">`. Acordeón en móvil. |
| `FinanceSimulator` | bloque del simulador de `03-pago` | Entrada con slider + input numérico sincronizados, plazo con radio-chips. El resultado se anuncia con `aria-live="polite"`. |
| `StepIndicator` | 3 pasos del checkout | `aria-current="step"` en el paso activo. |
| `SlotPicker` | tarjetas de entrega de `01-checkout` | Fecha (lunes a sábado) + 9 franjas como `radiogroup`. Las franjas ocupadas se ven deshabilitadas con el texto "Ocupado". |
| `BookingSummary` | panel lateral del checkout | Moto, precio, cuota simulada (si la hay), fecha y hora. En escritorio queda fijo al hacer scroll. |
| `SiteFooter` | footer de 4 columnas | Dirección en Madrid, horario y aviso legal de proyecto académico. |

### 5.3 Plantillas

`CatalogPage` · `ProductPage` · `SimulatorPage` · `BookingPage` (pasos 2 y 3) · `AdminLayout`.

---

## 6. Estados de interfaz

| Situación (PRD › Casos borde) | Pantalla | Diseño |
|---|---|---|
| Cargando datos | Catálogo y ficha | Skeleton con las mismas dimensiones de la tarjeta (sin layout shift). |
| Catálogo filtrado vacío | `/` | Mensaje + botón "Quitar filtros". |
| Moto agotada | Ficha y tarjeta | `StockBadge` agotada, CTA `Agendar cita` deshabilitado con el motivo visible, sección "Modelos similares con stock". |
| Franja ocupada por otro piloto al confirmar | `/cita` | Alerta inline en el `SlotPicker` con las franjas libres más cercanas. **Los datos ya escritos se conservan.** |
| Última unidad tomada por otro al confirmar | `/cita` | Alerta "Esta moto se agotó mientras agendabas" + enlace a similares. |
| El piloto ya tiene una cita pendiente (`ALREADY_BOOKED`) | `/cita` | Alerta "Ya tienes una cita el sáb 8 nov · 11:00. Para cambiarla, escríbenos por WhatsApp", con el botón de WhatsApp. **No** se ofrecen otras franjas, porque fallarían igual. |
| Límite de intentos superado (`RATE_LIMITED`) | `/cita`, `/admin/login` | Mensaje "Demasiados intentos. Inténtalo más tarde o escríbenos por WhatsApp". No dice cuál es el límite. |
| Datos inválidos | `/cita` | Error bajo cada campo, en texto. Al enviar, el foco va al primer campo con error. |
| Fecha inválida (pasada, domingo) | `SlotPicker` | No se puede seleccionar: los días aparecen deshabilitados en el calendario. |
| Abandona a la mitad | — | No hay estado: nada se guarda hasta confirmar. |
| Error del servidor o de red | Global | Mensaje "No pudimos completar la acción. Inténtalo de nuevo" + reintentar. Nunca un stack trace. |
| Página inexistente o modelo inexistente | `not-found` | 404 con el estilo del sitio + enlace al catálogo. |

---

## 7. Panel de administración (sin diseño en Stitch)

Se construye **solo con los tokens y componentes de §2 y §5**, sin estilos nuevos.

- **Login** (`/admin/login`): tarjeta centrada sobre `surface-container-high`, con usuario y
  contraseña y un mensaje de error genérico ("Credenciales inválidas"), sin revelar qué campo
  falló.
- **Citas** (`/admin`): tabla agrupada por día con hora, piloto, teléfono, moto, código y estado.
  - Acciones con confirmación: `Marcar vendida`, `Cancelar` y `Marcar no-show`, solo las
    permitidas por la máquina de estados (TECH-DESIGN, ADR 0006).
  - Los botones se deshabilitan mientras la acción está en curso, para evitar el doble clic.
  - Las citas **pendientes con fecha pasada** y las **`VENCIDA`** se muestran igual: resaltadas
    con `tertiary-container` y la etiqueta "No se presentó".
  - Si una venta tardía devuelve `OUT_OF_STOCK`, se muestra "No queda unidad disponible:
    cancela otra cita o ajusta el stock".
  - Las citas anonimizadas muestran "Datos anonimizados" en lugar de nombre y teléfono
    (ADR 0015).
  - En móvil, la tabla pasa a tarjetas apiladas.
- **Cancelar en bloque:** desde una cita sospechosa, la acción "Cancelar todas las de este
  origen" cancela las citas pendientes con el mismo origen (IP en HMAC, ADR 0010), previa
  confirmación que indica cuántas son.
- **Stock** (`/admin/stock`): una fila por modelo con stock total, unidades apartadas por citas
  y disponible (calculado), y un input numérico para ajustar el total.

---

## 8. Accesibilidad (objetivo: Lighthouse ≥ 90, WCAG 2.1 AA)

**Contraste verificado (tokens sobre `background` `#0f131c`)**

| Texto | Contraste aprox. | Resultado |
|---|---|---|
| `on-surface` `#dfe2ee` | ~15:1 | ✅ |
| `on-surface-variant` `#c4c5d9` | ~11:1 | ✅ |
| `outline` `#8e90a2` | ~6:1 | ✅ |
| `on-primary-container` sobre `primary-container` (botón) | ~5:1 | ✅ |

**Problemas heredados de Stitch que se corrigen**

| Problema en Stitch | Corrección |
|---|---|
| `::-webkit-scrollbar { display: none }` oculta la barra de scroll en todo el sitio. | Se elimina: la barra de scroll es una pista de orientación. |
| `caption-spec` de 10 px usado en textos informativos. | Solo se permite en decoración (`aria-hidden`); el contenido real usa `label-data` (12 px) o más. |
| Enlaces sin destino (`data-path` sin ruta) | Se eliminan u ocultan; no quedan enlaces muertos. |
| Botones de pestaña de pago hechos con `div` y `onclick`. | `role="tablist"` / `tab` o radio-chips nativos, navegables con teclado. |

**Reglas para todos los componentes**

- `lang="es"` en `<html>` y un único `<h1>` por página.
- Enlace "Saltar al contenido" como primer elemento enfocable.
- Foco visible en todo elemento interactivo: anillo de 2 px en `secondary-container`.
- Áreas táctiles de al menos 44 × 44 px (chips, franjas horarias, botones del header).
- Todo input con `<label>` visible (el placeholder no reemplaza la etiqueta).
- `alt` descriptivo en las fotos de producto ("Yamaha YZ450F 2025, vista lateral"); `alt=""` en
  las imágenes decorativas.
- Animaciones desactivadas con `prefers-reduced-motion: reduce`.

---

## 9. Responsive

Mobile-first, con los breakpoints estándar de Tailwind: `sm` 640, `md` 768, `lg` 1024 y `xl`
1280 px. Requisito del PRD: **el flujo completo funciona en 375 px**.

| Componente | Móvil (< 768 px) | Escritorio (≥ 1024 px) |
|---|---|---|
| Header | Logo + "Mi cita" + menú hamburguesa | Menú completo + buscador |
| Catálogo | 1 columna; los filtros en un panel desplegable | 3 columnas; los filtros en una barra |
| Ficha | Galería → precio y CTA → especificaciones en acordeón; el CTA queda fijo abajo | Galería a la izquierda, precio y CTA en una columna fija a la derecha |
| Simulador y cita | Resumen arriba y colapsable; el formulario debajo | Formulario a la izquierda, `BookingSummary` fijo a la derecha |
| Hero | `display-hero-mobile` (48 px) | `display-hero` (84 px) |

---

## 10. Guía de textos (copy)

Tono: técnico, de box de competición, pero **claro**. Los textos de Stitch que prometen algo que
la v1 no hace se reemplazan:

| Texto en Stitch | Texto en la v1 |
|---|---|
| "Financiación 0% TAE" | "Financiación desde X €/mes" (calculado) |
| "Transacción encriptada SSL 256-bit", "Sesión cifrada" | Se elimina. |
| "Reservar Box", "Configurar Ahora" | "Agendar cita" / "Ver ficha" |
| "Confirmar reserva oficial (500 €)" | "Confirmar cita" |
| "Envío técnico puerta a puerta +140 €" | Se elimina (solo hay recogida en el concesionario). |
| "+18 unidades en stock físico" | Stock real de la base de datos. |
| "Concesionario Eddie Store Barcelona" | "Eddie Store Madrid · Polígono Motorsport, Box 14" |

**Texto informativo de privacidad** (bajo el botón "Confirmar cita", en `body-sm`, ADR 0015):

> Eddie Store (proyecto académico ficticio) usará tus datos solo para gestionar esta cita. Se
> anonimizan 90 días después de la fecha de la cita. [Más información](/privacidad)

La página `/privacidad` es estática, con el mismo layout que el sitio y el texto completo
(responsable, finalidad, base legal, plazo y derechos).

Formato: precios `10.499 €`, cuotas `154,27 €/mes`, fechas `sáb 8 nov · 11:00`, todo con
`Intl` en `es-ES`.

---

## 11. Trazabilidad con el PRD

| Requisito del PRD | Dónde se resuelve en este diseño |
|---|---|
| Ver precio y stock sin WhatsApp | `ProductCard`, `StockBadge`, `ProductPage` (§3, §5) |
| Simulador exacto, TAE calculada | `FinanceSimulator`, §10 (cifras calculadas) |
| Agendar en menos de 5 minutos | Flujo de 4 pantallas (§4.1), un CTA por pantalla (§1) |
| Confirmación + WhatsApp | `/cita/[token]` (§3) |
| Sin franjas dobles, sin agendar una moto agotada | Estados del §6 |
| Panel admin mínimo | §7 |
| Accesorios, Taller y Comparar ocultos | Header (§3) |
| 375 px y Lighthouse Accessibility ≥ 90 | §8, §9 |
| LCP < 2,5 s | `next/image` + `priority` + fuentes con `next/font` (§2.4) |
| Riesgo: imágenes que caducan y uso de marca | Imágenes en `/public`, aviso legal en el footer (§2.4) |
