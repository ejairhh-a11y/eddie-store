# ADR-0004: Saldo basado en un libro contable inmutable

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
Si el saldo fuera una sola columna que se sobrescribe (`balance = balance - 10`), no quedaría
rastro de por qué cambió, sería imposible auditar o conciliar, y un error borraría información.
En un sistema de apuestas hay que poder explicar cada céntimo.

## Decisión
Registrar cada movimiento como un **asiento (`LEDGER_ENTRY`) que solo se inserta y nunca se modifica
ni se borra**. El saldo es la suma de los asientos; `WALLET.balance` es una copia cacheada que se
actualiza en la misma transacción. Las correcciones se hacen con **asientos compensatorios**.
Solo el módulo Wallet puede escribir en el libro.

## Alternativas consideradas
- **Columna de saldo que se sobrescribe:** simple, pero sin trazabilidad ni capacidad de auditoría.
- **Contabilidad de doble partida completa:** la más rigurosa, pero añade una complejidad que el
  curso no requiere. Se puede adoptar después sin cambiar la idea base.

## Consecuencias
- **Positivas:** historial completo para el usuario y la auditoría; conciliación automática
  (`SUM(asientos) = balance`); se pueden revertir liquidaciones erróneas sin perder datos.
- **Negativas:** la tabla crece indefinidamente; calcular el saldo desde cero es costoso.
- **Mitigación:** saldo cacheado en `WALLET`, índices por `(wallet_id, created_at)` y una tarea
  diaria de conciliación que alerta ante cualquier diferencia.
