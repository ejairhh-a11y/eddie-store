# ADR-0003: PostgreSQL como fuente de verdad

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
Apostar implica mover dinero: descontar el monto, registrar la apuesta y, más tarde, acreditar la
ganancia. Estas operaciones deben ser atómicas: un saldo descontado sin apuesta registrada (o al
revés) es inaceptable. Los datos son muy relacionales (evento → mercado → selección → apuesta).

## Decisión
Usar **PostgreSQL 16** como única fuente de verdad, con transacciones ACID, montos en
`NUMERIC(18,2)` y bloqueo optimista (`version`) en la billetera.

## Alternativas consideradas
- **MongoDB:** esquema flexible, pero las transacciones que abarcan varios documentos son más
  limitadas y el modelo es relacional por naturaleza.
- **MySQL:** viable, pero PostgreSQL ofrece mejores tipos (`NUMERIC`, `JSONB`, `ENUM`),
  restricciones y manejo de concurrencia.

## Consecuencias
- **Positivas:** la base de datos garantiza la integridad (claves foráneas, restricciones `UNIQUE`
  para idempotencia, `CHECK` de saldo no negativo); reportes con SQL.
- **Negativas:** escalar las escrituras horizontalmente es más difícil (no es un problema a esta
  escala).
- **Regla:** Redis puede cachear datos, pero **nunca** es la fuente de verdad del dinero ni de las
  apuestas.
