# CONTRATO — BACKLOG #9, #10, #11 Reserva de citas (dominio, límites e interfaz)

**Versión:** v1
**Estado:** Aprobado (2026-10-26, agente en modo autónomo)
**Ítems:** [BACKLOG.md #9, #10, #11](../BACKLOG.md)

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| PRD › Alcance, Casos borde | Cita con día/hora, apartado de stock, sin duplicados, confirmación + WhatsApp |
| TECH-DESIGN › F3, Máquina de estados, Reglas de dominio | Criterios verificables |
| ADR 0006 | Transacción, `FOR UPDATE`, errores por restricción, `SAVEPOINT` |
| ADR 0007 | Server Actions + Zod, códigos de error |
| ADR 0009 | Cuota recalculada en el servidor |
| ADR 0010 | Límites por persona, IP y global |
| ADR 0011 | Código legible + token secreto |
| ADR 0015 | Texto informativo, HMAC de la IP |
| Design.md §3, §6 | Pasos, SlotPicker, estados de error |

## Interfaz observable

Página `/cita?moto=&entrada=&plazo=`, Server Action `createAppointmentAction`, Server Action de lectura
`getSlotsAction(date)`, página `/cita/[token]`.

## Comportamiento

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Sin moto o moto agotada | `/cita` · `/cita?moto=yz65` | Paso 1: lista de motos con stock | Design.md §3 |
| Formulario | `/cita?moto=yz450f` | Paso 2: datos, día (mañana…+30, sin domingos) y 9 horas; ocupadas como "Ocupado" | F3 |
| Camino feliz | datos válidos + franja libre | 1 cita `PENDIENTE`, redirección a `/cita/{token}` con `YZ-XXXX`, moto, `sáb 8 nov · 11:00`, teléfono enmascarado, botón "Avisar por WhatsApp" | F3 |
| Datos inválidos | email/teléfono/nombre mal | `VALIDATION` con error bajo cada campo; foco al primero | F3; Design.md §6 |
| Franja ocupada | otra cita pendiente en esa franja | `SLOT_TAKEN` + 3 franjas libres más cercanas; datos conservados | ADR 0006 §2 |
| Persona con cita | mismo email o teléfono pendiente vigente | `ALREADY_BOOKED` + fecha de la cita existente + WhatsApp; nunca `SLOT_TAKEN` | ADR 0006 §2; C1 |
| Cita vieja | pendiente con fecha pasada del mismo email | Pasa a `VENCIDA` y no bloquea | ADR 0010 |
| Agotada al confirmar | disponible 0 | `OUT_OF_STOCK` "Esta moto se agotó mientras agendabas" | F3 |
| Abuso | 6.º intento/hora · 4.ª cita/día por IP · tope global | `RATE_LIMITED` "Demasiados intentos…" | ADR 0010 |
| Error inesperado | fallo de base de datos | "No pudimos completar la acción. Inténtalo de nuevo." | ADR 0014 |
| Token inexistente | `/cita/xxx` · `/cita/YZ-7K3P` | 404 | ADR 0011 |
| Cabeceras | `/cita/{token}` | `noindex`, `Referrer-Policy: no-referrer` | ADR 0011 |

## Nombres que no se negocian

Campos `moto`, `date`, `hour`, `fullName`, `email`, `phone`, `entrada`, `plazo`; botón "Confirmar cita";
textos "Ese horario acaba de ocuparse", "Ya tienes una cita", "Esta moto se agotó mientras agendabas",
"Demasiados intentos"; `data-testid` `codigo-cita`, `fecha-cita`; variable `RATE_LIMIT_SECRET`.

## Decisiones propuestas

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | Teléfono de 9 cifras se asume español (+34); se aceptan prefijos internacionales | El PRD no fijaba formato | Aprobada |
| 2 | Ventanas de los límites: hora natural (intentos), día de Madrid (citas por IP y global) | ADR 0010 no fijaba el tipo de ventana | Aprobada |
| 3 | Cabeceras globales de seguridad (`X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`) | Sugerencia S8, coste mínimo | Aprobada |

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-10-26 | Versión inicial | — | Agente (modo autónomo) |
