# CONTRATO — BACKLOG #2 Esquema, migraciones y seed

**Versión:** v1
**Estado:** Aprobado (2026-10-26, agente en modo autónomo, decisión del usuario registrada en CLAUDE.md)
**Ítem:** [BACKLOG.md #2](../BACKLOG.md)

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| TECH-DESIGN.md › Modelo de datos | Tablas, columnas, índices y restricciones |
| ADR 0002 | Drizzle + drivers de Neon |
| ADR 0006 §2 | Nombres fijos de las restricciones únicas |
| ADR 0013 §cambio 2026-10-26 | Integración en CI con `postgres:16` y `DB_DRIVER=pg` |
| ADR 0015 | Datos personales anonimizables (NULL + `anonymized_at`) |
| ADR 0016 (+ cambio 2026-10-26) | Migraciones aditivas, catálogo como migración de datos, seed del admin |

## Interfaz observable

Esquema de base de datos y comandos `npm run db:*`.

## Comportamiento

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Migrar una base vacía | `npm run db:migrate` | Existen `motorcycles`, `appointments`, `admin_users`, `rate_limits` y los 6 modelos | TDD › Modelo de datos; ADR 0016 |
| Orden del catálogo | `SELECT slug … ORDER BY sort_order` | `yz450f, yz250f, yz250, yz125, yz85, yz65` | PRD › Alcance (REVISAR 1 resuelto) |
| Precio en céntimos | YZ450F | `price_cents = 1049900` | PRD › Supuestos |
| Franja duplicada | 2 citas `PENDIENTE` en el mismo `slot_start` | `23505` con restricción `appointments_slot_pending_uq` | ADR 0006 §2 |
| Franja liberada | 1 `CANCELADA` + 1 `PENDIENTE` en la misma franja | Se acepta | ADR 0006 §1 |
| Persona duplicada | 2 `PENDIENTE` con el mismo email | `23505` con `appointments_email_pending_uq` | ADR 0010 |
| Datos personales a medias | `full_name` NULL sin `anonymized_at` | Rechazado por `appointments_anonymized_ck` | ADR 0015 |
| Stock negativo | `stock_total = -1` | Rechazado | TDD › Modelo de datos |
| Seed local | `npm run db:seed` dos veces | Mismo resultado (idempotente) | ADR 0016 |
| Admin inicial | `npm run db:seed-admin` con `SEED_ADMIN_*` | Crea el admin si el email no existe; nunca cambia una contraseña | ADR 0016 §cambio |

## Nombres que no se negocian

| Tipo | Valor exacto |
|---|---|
| Restricción | `appointments_slot_pending_uq`, `appointments_email_pending_uq`, `appointments_phone_pending_uq`, `appointments_code_uq`, `appointments_access_token_hash_uq` |
| Enum | `appointment_status`: `PENDIENTE`, `VENDIDA`, `CANCELADA`, `VENCIDA` |
| Variable | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DB_DRIVER`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |

## Decisiones propuestas

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | Precio YZ85 5.299 € y YZ65 4.899 €; stock inicial 3/4/2/5/3/0 (YZ65 agotada para demostrar el estado) | Stitch daba un solo precio "desde" para 85/65 y no daba stock por modelo | Aprobada (datos ficticios, PRD › Supuestos) |
| 2 | CHECK de anonimización "todo presente o todo NULL" | La primera versión aceptaba una fila a medias; lo detectó la prueba de integración | Aprobada |

## Fuera del contrato

Nombres internos de módulos, forma del script de generación del SQL del catálogo.

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-10-26 | Versión inicial | — | Agente (modo autónomo) |
