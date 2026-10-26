# CONTRATO — BACKLOG #4 Librería financiera

**Versión:** v1
**Estado:** Aprobado (2026-10-26, agente en modo autónomo)
**Ítem:** [BACKLOG.md #4](../BACKLOG.md)

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| PRD › Alcance, Supuestos | TIN 5,95 %, sin comisiones, plazos 24–60, TAE calculada |
| TECH-DESIGN › F2, Reglas de dominio | Criterios verificables y constantes |
| ADR 0009 | Función pura compartida cliente/servidor |
| Design.md §3 | Cuota "desde" = entrada 0 € y 60 meses |
| Revisión adversarial S2 | Redondeo |

## Interfaz observable

Módulo `src/lib/finance.ts`.

## Comportamiento

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Cuota 24 m | YZ450F 1.049.900 c, entrada 200.000 c | 37.649 c (±1) | F2 |
| Cuota 36 m | ídem | 25.836 c (±1) | F2 |
| Cuota 60 m | ídem | 16.411 c (±1) | F2 |
| Total | cualquier simulación | `cuota × plazo` | Decisión 1 |
| TAE | TIN 595 bps | 611 bps → "6,11 %" | PRD; F2 |
| "Desde" | YZ450F, entrada 0 €, 60 m | 20.273 c | Design.md §3 |
| Entrada inválida | < 0, ≥ precio, no entera | `RangeError` / `isValidDownPayment = false` | J1 |
| Plazo inválido | 12, "abc", vacío | 36 | F2 |
| Formato | 1.049.900 c / 15.427 c | `10.499 €` / `154,27 €` | Design.md §10 |

## Nombres que no se negocian

`TIN_BPS = 595`, `TERMS = [24, 36, 48, 60]`, `DEFAULT_TERM = 36`, `FROM_TERM = 60`.

## Decisiones propuestas

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | Cálculo en `number`, redondeo half-up al céntimo solo al final; total = cuota × plazo, sin ajuste de última cuota | Sugerencia S2: "céntimos enteros" era imposible con `(1+i)^n` | Aprobada |

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-10-26 | Versión inicial | — | Agente (modo autónomo) |
