# Registro de Decisiones de Arquitectura (ADR)

Decisiones de arquitectura de la plataforma de apuestas deportivas. Cada ADR explica el contexto, la
decisión tomada, las alternativas descartadas y sus consecuencias. Complementa a
[`DISENO-TECNICO.md`](../../DISENO-TECNICO.md).

| # | Decisión | Estado | Fecha |
|---|---|---|---|
| [0001](0001-monolito-modular.md) | Monolito modular con worker separado | Propuesto | 2026-09-22 |
| [0002](0002-stack-typescript.md) | Stack TypeScript: Next.js + NestJS | Propuesto | 2026-09-22 |
| [0003](0003-postgresql-fuente-de-verdad.md) | PostgreSQL como fuente de verdad | Propuesto | 2026-09-22 |
| [0004](0004-libro-contable-inmutable.md) | Saldo basado en un libro contable inmutable | Propuesto | 2026-09-22 |
| [0005](0005-cuotas-tiempo-real.md) | Cuotas en tiempo real con Redis + WebSocket | Propuesto | 2026-09-22 |
| [0006](0006-bloqueo-cuota-idempotencia.md) | Bloqueo de cuota e idempotencia al apostar | Propuesto | 2026-09-22 |
| [0007](0007-saldo-virtual-sandbox.md) | Saldo virtual y pagos en modo sandbox | Propuesto | 2026-09-22 |
| [0008](0008-despliegue-contenedores-paas.md) | Despliegue en contenedores sobre PaaS | Propuesto | 2026-09-22 |

**Estados posibles:** Propuesto → Aceptado → (Obsoleto | Reemplazado por ADR-XXXX).

Para registrar una nueva decisión, copia [`plantilla.md`](plantilla.md) con el siguiente número.
