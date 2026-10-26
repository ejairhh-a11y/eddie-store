# ADR 0002: Drizzle ORM para el acceso a datos

## Estado

Aceptado

## Contexto

La base de datos es PostgreSQL en Neon (ADR 0001). Dos casos borde del PRD obligan a usar
transacciones con control explícito de concurrencia:

- **Dos pilotos, mismo horario:** solo uno puede quedarse la franja.
- **Última unidad:** dos pilotos no pueden apartar la misma unidad.

Además, la rúbrica valora tener migraciones versionadas, y el backend corre como funciones
serverless en Vercel, donde importan el tiempo de arranque en frío y el tamaño del bundle.

## Decisión

Se usa **Drizzle ORM** con **migraciones generadas por `drizzle-kit`** y versionadas en el repo.
La conexión usa el driver serverless de Neon:

- `neon-http` para lecturas simples (catálogo, ficha);
- `neon-serverless` (Pool sobre WebSocket) para las operaciones que necesitan transacción
  interactiva (crear cita, marcar vendida, cancelar).

## Alternativas consideradas

- **Prisma**: es el más popular y tiene un schema muy legible y buena documentación. Se descartó
  porque el bloqueo de filas (`SELECT … FOR UPDATE`) que necesita la cita requiere SQL crudo en
  Prisma, y porque su motor agrega peso y arranque en frío en serverless.
- **SQL directo con `@neondatabase/serverless`**: control total sin capa extra. Se descartó
  porque no da tipado automático de las tablas y las migraciones habría que escribirlas a mano.

## Consecuencias

- Las consultas tienen tipos de TypeScript inferidos del schema, y `FOR UPDATE` y las
  transacciones se escriben sin salir del ORM.
- Las migraciones quedan como archivos SQL legibles en `drizzle/`, revisables en cada PR.
- **Costo:** Drizzle es más explícito que Prisma: hay más código en las consultas con joins y
  menos ayudas "mágicas".
- **Costo:** hay que usar **dos drivers** según la operación, porque `neon-http` no soporta
  transacciones interactivas. Si se usa el driver equivocado en una escritura concurrente, se
  pierde la garantía. Mitigación: la conexión transaccional se expone desde un solo módulo
  (`src/server/db.ts`).
