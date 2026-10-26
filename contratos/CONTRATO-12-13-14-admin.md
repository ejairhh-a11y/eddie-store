# CONTRATO — BACKLOG #12, #13, #14 Panel del concesionario (autenticación, citas, stock)

**Versión:** v1
**Estado:** Aprobado (2026-10-26, agente en modo autónomo)
**Ítems:** [BACKLOG.md #12, #13, #14](../BACKLOG.md)

## Paquete de contexto

| Fuente | Por qué entra |
|---|---|
| PRD › Alcance (panel mínimo), Riesgos (admin expuesto) | Qué hace el panel y su riesgo |
| TECH-DESIGN › F4, Máquina de estados | Criterios verificables y transiciones |
| ADR 0006 §3 | Transiciones condicionales, venta tardía con stock |
| ADR 0007, 0008 | Server Actions con sesión verificada, Auth.js, `authorize()`, `session_version`, 8 h |
| ADR 0010 | Login: 5 fallos / 15 min; cancelar en bloque por origen |
| ADR 0015 | Anonimización a los 90 días |
| Design.md §7 | Pantallas del panel |

## Interfaz observable

`/admin/login`, `/admin`, `/admin/stock`, `/api/auth/*`, Server Actions `loginAction`, `logoutAction`,
`appointmentAction` (`sell`, `cancel`, `noShow`, `cancelOrigin`), `stockAction`.

## Comportamiento

| Caso | Entrada | Salida esperada | Origen |
|---|---|---|---|
| Sin sesión | `GET /admin` · `/admin/stock` | Redirección a `/admin/login` | F4 |
| Acción sin sesión | cualquier Server Action de admin | "Tu sesión no es válida…" y sin cambios | F4; ADR 0008 |
| Login malo | credenciales inválidas | "Credenciales inválidas" | F4 |
| Fuerza bruta | 6.º fallo en 15 min por IP (también por `/api/auth/callback/credentials`) | "Demasiados intentos. Inténtalo más tarde." | ADR 0008, 0010 |
| Vender | cita `PENDIENTE` | `VENDIDA`, `stock_total − 1`, `updated_by` | ADR 0006 §3 |
| Doble clic | dos "Vendida" seguidas | El stock baja una vez; la segunda: "Esa acción ya se aplicó…" | C3 |
| Venta tardía sin stock | `VENCIDA` con disponible 0 | "No queda unidad disponible…" y stock ≥ 0 | C3 |
| Cancelar | `PENDIENTE`/`VENCIDA` | `CANCELADA`, libera unidad y franja | ADR 0006 §3 |
| No-show | `PENDIENTE` | `VENCIDA` | ADR 0006 §3 |
| Cancelar origen | cita con `ip_hmac` | Todas las `PENDIENTE` del mismo origen pasan a `CANCELADA` | ADR 0010 |
| Resaltado | pendiente con fecha pasada o `VENCIDA` | "No se presentó" en rojo racing | Design.md §7 |
| Anonimización | al cargar `/admin` | Citas cerradas de hace > 90 días sin datos personales | ADR 0015 |
| Ajustar stock | total < pendientes vigentes | "El stock no puede ser menor…" | F4 |
| Sesión | 8 h desde el login, o `session_version` cambiado | Deja de valer | ADR 0008 |

## Nombres que no se negocian

Rutas anteriores; botones "Vendida", "Cancelar", "No-show", "Cancelar origen", "Entrar", "Cerrar sesión";
variables `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

## Decisiones propuestas

| # | Decisión | Por qué hace falta | Estado |
|---|---|---|---|
| 1 | Las pendientes de más de 90 días también pasan a `VENCIDA` y se anonimizan | ADR 0015 solo hablaba de citas en estado final | Aprobada |
| 2 | El panel lista desde hace 14 días en adelante, más las pendientes atrasadas | Design.md no fijaba el rango | Aprobada |

## Changelog

| Versión | Fecha | Cambio | Motivo | Aprobado por |
|---|---|---|---|---|
| v1 | 2026-10-26 | Versión inicial | — | Agente (modo autónomo) |
