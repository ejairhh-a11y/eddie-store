# CONTRATO — BACKLOG #3, #6, #7, #8 Sitio público (design system, catálogo, ficha, simulador)

**Versión:** v1
**Estado:** Aprobado (2026-10-26, agente en modo autónomo)
**Ítems:** [BACKLOG.md #3, #6, #7, #8](../BACKLOG.md)

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| Design.md §2, §3, §5, §6, §8, §10 | Tokens, mapa de pantallas, componentes, estados, accesibilidad y textos |
| TECH-DESIGN › F1, F2, F5 | Criterios verificables |
| ADR 0004, 0005, 0009, 0012, 0015 | Stock derivado, caché, estado en URL, Tailwind v4, privacidad |

## Interfaz observable

Páginas `/`, `/motos/[slug]`, `/financiacion`, `/privacidad` y la 404.

## Comportamiento

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Catálogo | `GET /` | 6 tarjetas con precio `10.499 €`, 3 especificaciones, "Financia desde X €/mes" y badge de stock | F1 |
| Stock | YZ65 con stock 0 | Badge "Agotada" (icono + texto) | F1; Design.md §2.1 |
| Filtros | `?tipo=4t` · `?tipo=2t` · `?categoria=youth` · `?cc=250` · `?q=yz250` | Solo los modelos que cumplen; un valor inválido se ignora | F1 |
| Vacío | `?tipo=4t&cc=125` | "Ningún modelo coincide" + "Quitar filtros" | F1 |
| Ocultos | cualquier página | Sin Accesorios, Taller, Comparar, Cross-Country, "0% TAE", "encriptada", "Envío" | F1; PRD › No alcance |
| Ficha | `GET /motos/yz450f` | h1 con el nombre, `10.499 €`, 3 tablas, enlace "Agendar cita" → `/cita?moto=yz450f` | F1 |
| Ficha agotada | `GET /motos/yz65` | Sin enlace "Agendar cita", texto "Este modelo está agotado", "Modelos similares con stock" | F1 |
| Ficha inexistente | `GET /motos/no-existe` | 404 con el estilo del sitio | F1 |
| Simulador | `/financiacion?moto=yz450f&entrada=2000&plazo=36` | Cuota `258,36 €`, TAE `6,11 %` | F2 |
| Cambio de plazo | clic en "60 meses" | `164,11 €` sin recargar (aria-live) | F2 |
| Plazo inválido | `plazo=12` | Se usa 36 | F2 |
| Hacia la cita | botón del simulador | `/cita?moto=…&entrada=…&plazo=…` (entrada en euros) | ADR 0009 |

## Nombres que no se negocian

Rutas `/`, `/motos/[slug]`, `/financiacion`, `/privacidad`; parámetros `tipo`, `categoria`, `cc`, `q`, `moto`, `entrada`, `plazo`;
textos "Agendar cita", "Agendar cita con esta moto", "Ningún modelo coincide", "Quitar filtros", "Agotada",
"Página no encontrada"; `data-testid`: `stock-badge`, `price`, `cuota`, `tae`.

## Decisiones propuestas

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | El buscador del header es un formulario GET a `/?q=` (sin JS) | Design.md decía "filtro por nombre" sin mecanismo | Aprobada |
| 2 | Chip "Youth MX" en la navegación y los filtros (`?categoria=youth`) | Ocupa el lugar de "Cross-Country & Enduro", oculto | Aprobada |
| 3 | La entrada viaja en euros enteros en la URL | ADR 0009 daba el ejemplo `entrada=2000` | Aprobada |
| 4 | Header sin el icono de usuario | No hay cuentas de piloto (PRD › No alcance) | Aprobada |
| 5 | `formatEuros` fuerza el separador de miles (`4.899 €`) | es-ES no agrupa números de 4 cifras por defecto | Aprobada |

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-10-26 | Versión inicial. La prueba de humo del Sprint 0 pasa a buscar el h1 del catálogo, porque el placeholder se reemplaza a propósito | — | Agente (modo autónomo) |
