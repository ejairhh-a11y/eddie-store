# CONTRATO — BACKLOG #5 Reloj y franjas horarias

**Versión:** v1
**Estado:** Aprobado (2026-10-26, agente en modo autónomo)
**Ítem:** [BACKLOG.md #5](../BACKLOG.md)

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| PRD › Casos borde | Lunes a sábado, 10–19 h, franjas de 1 h |
| TECH-DESIGN › F3, Reglas de dominio | 9 franjas, ventana mañana…+30, reloj inyectable |
| ADR 0004, ADR 0013 | "Hoy" en Europe/Madrid; sin `new Date()` en el dominio |
| Design.md §10 | Formato `sáb 8 nov · 11:00` |

## Interfaz observable

Módulos `src/lib/clock.ts` y `src/lib/slots.ts`.

## Comportamiento

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Hoy en Madrid | 2026-10-31 23:30 UTC | `2026-11-01` | ADR 0004 |
| Cambio de hora (marzo) | sáb 28/03 10:00 · lun 30/03 10:00 | 09:00Z · 08:00Z | TDD › Riesgos (DST) |
| Cambio de hora (octubre) | sáb 24/10 18:00 · lun 26/10 18:00 | 16:00Z · 17:00Z | TDD › Riesgos (DST) |
| Ventana | hoy = lun 26/10/2026 | 26 días, de 27/10 a 25/11, sin domingos | J2 |
| Fechas no válidas | hoy, domingo, +31 días | `isBookableDate = false` | F3 |
| Franjas | cualquier día abierto | horas 10…18 (9) | PRD |
| Formato | 2026-11-07, 11 | `sáb 7 nov · 11:00` | Design.md §10 |

## Nombres que no se negocian

`TIME_ZONE = "Europe/Madrid"`, `SLOT_HOURS = 10…18`, `BOOKING_WINDOW_DAYS = 30`, fechas `YYYY-MM-DD`.

## Decisiones propuestas

Ninguna: todo venía del PRD y el TECH-DESIGN.

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-10-26 | Versión inicial | — | Agente (modo autónomo) |
