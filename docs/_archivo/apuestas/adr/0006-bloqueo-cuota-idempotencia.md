# ADR-0006: Bloqueo de cuota e idempotencia al apostar

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
Entre que el usuario ve una cuota y confirma la apuesta, la cuota puede cambiar. Además, un doble
clic o un reintento por mala conexión podría registrar la misma apuesta dos veces y descontar el
saldo por duplicado.

## Decisión
1. Cada selección tiene un número de **`version`** que aumenta con cada cambio de cuota. El cliente
   envía la versión que vio; si no coincide con la vigente, la API responde **409 Conflict** con la
   nueva cuota y el usuario decide si la acepta.
2. La cuota aceptada se **congela** en `BET_LEG.price_at_placement` y es la que se usa al liquidar.
3. Cada `POST /bets` exige una cabecera **`Idempotency-Key`** (UUID generado por el cliente) con
   restricción `UNIQUE` en la base de datos: un reintento devuelve la apuesta ya creada en lugar de
   crear otra.

## Alternativas consideradas
- **Aceptar siempre la cuota actual del servidor:** el usuario podría apostar a una cuota distinta
  de la que vio; es injusto y genera reclamaciones.
- **Aceptar automáticamente los cambios de cuota a favor del usuario:** buena experiencia; queda
  como opción configurable a futuro.
- **Evitar duplicados solo en el frontend (deshabilitar el botón):** no cubre los reintentos de red
  ni a clientes malintencionados.

## Consecuencias
- **Positivas:** transparencia con el usuario; ningún cobro duplicado; liquidación determinista.
- **Negativas:** en partidos en vivo muy cambiantes, los rechazos 409 serán frecuentes.
- **Mitigación:** la UI resalta el cambio de cuota y permite aceptarlo con un clic.
