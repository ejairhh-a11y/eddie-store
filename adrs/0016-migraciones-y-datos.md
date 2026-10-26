# ADR 0016: Protocolo de migraciones, seed y ramas de Neon

## Estado

Aceptado (nuevo, a partir de la revisión adversarial: hallazgo A2)

## Contexto

La rúbrica exige un **protocolo de despliegue documentado**. El esquema se gestiona con
migraciones de `drizzle-kit` (ADR 0002), hay ramas de Neon por entorno (ADR 0003) y los entornos
de prueba no deben contener datos personales (ADR 0015).

La revisión adversarial señaló que no estaba definido:

- quién ejecuta las migraciones en cada entorno;
- con qué cadena de conexión (la del pooler no sirve para migrar);
- qué pasa si una migración se aplica y después falla el build, ya que el *Instant Rollback* de
  Vercel revierte el código pero **no** el esquema;
- cómo se siembran el catálogo y el admin;
- cómo se limpian las ramas.

## Decisión

### Ramas de Neon

| Rama | Contenido | Uso |
|---|---|---|
| `main` | Producción, con datos personales reales | Solo el deploy de Production |
| `seed` | Esquema actual + catálogo de 6 motos + admin de prueba. **Sin datos personales.** | Rama padre de todas las demás |
| `preview/{git-branch}` | Copia de `seed` | Previews de Vercel (la integración se configura con `seed` como rama padre) |
| `ci-{runId}` | Copia de `seed` | Tests de integración y E2E (ADR 0013). Se borra al final del job |
| `dev` | Copia de `seed` | Desarrollo local |

### Migraciones

1. **Solo aditivas**, con el patrón *expand → contract*:
   - una migración nunca elimina ni renombra columnas en uso;
   - para cambiar algo, primero se agrega lo nuevo (*expand*); en otro deploy, cuando ningún
     código usa lo viejo, se elimina (*contract*);
   - así, el código anterior funciona con el esquema nuevo, y el rollback de Vercel es seguro.
2. **Se ejecutan en el build de Vercel**, como primer paso del `buildCommand`:
   `drizzle-kit migrate && next build`.
3. **Siempre con la conexión directa** `DATABASE_URL_UNPOOLED` (la integración de Neon la inyecta
   junto a `DATABASE_URL`), nunca con la del pooler.
4. Las migraciones se **revisan en el PR**: el SQL generado se versiona en `drizzle/`, y el job de
   CI las aplica sobre la rama efímera antes de los tests. Una migración rota falla en CI, antes
   de llegar a producción.

### Seed

- `npm run db:seed` es **idempotente** (`INSERT … ON CONFLICT (slug) DO UPDATE`) y carga las 6
  motos.
- El admin se crea con `npm run db:seed-admin`, que toma `SEED_ADMIN_EMAIL` y
  `SEED_ADMIN_PASSWORD` del entorno.
- **Producción:** el seed se ejecuta **una vez** a mano desde la máquina de quien despliega (o
  desde un workflow manual `workflow_dispatch`), con el secreto de la rama `main`. **No** forma
  parte del build, para que un deploy nunca reescriba el stock real.
- **Rama `seed`:** cuando cambia el esquema o el catálogo, un workflow manual aplica las
  migraciones y el seed sobre ella.

### Cambio 2026-10-26: catálogo inicial como migración de datos

Las variables de Neon en Vercel son *Sensitive* y no se pueden leer desde fuera, así que un seed
manual contra producción exigiría copiar credenciales a mano. Por eso:

- **El catálogo de las 6 motos entra con una migración de datos** (`INSERT … ON CONFLICT (slug)
  DO NOTHING`). Corre **una sola vez** por base de datos, como toda migración, y nunca
  sobreescribe el stock real. `npm run db:seed` sigue existiendo para entornos locales y de CI.
- **El primer admin** se crea en el build con `npm run db:seed-admin` **solo si
  `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` están definidas** y ese email no existe todavía
  (`ON CONFLICT DO NOTHING`). Nunca cambia una contraseña existente.

### Limpieza

- Las ramas `ci-*` se borran con `if: always()` al final del job, y además un workflow semanal
  borra las que tengan más de 24 horas.
- Las ramas `preview/*` se borran automáticamente cuando se cierra el PR (opción de la
  integración de Neon con Vercel), para no superar el límite de ramas del plan gratuito.

## Alternativas consideradas

- **Migrar desde GitHub Actions antes del deploy:** separa la migración del build y permite un
  paso de aprobación manual. Se descartó porque obliga a coordinar dos sistemas (el job de
  migración y el deploy de Vercel) y a gestionar en GitHub la URL de producción. Con migraciones
  aditivas, migrar en el build es seguro.
- **Migrar al arrancar la app (en tiempo de ejecución):** no requiere pasos de build. Se descartó
  porque en serverless cada instancia intentaría migrar a la vez, con riesgo de carreras.
- **Ramas de Preview copiadas desde `main`:** es el comportamiento por defecto de la integración
  y hay datos realistas. Se descartó porque copia datos personales de producción (ADR 0015).

## Consecuencias

- El protocolo de despliegue queda definido: PR → CI con migración en rama efímera → Preview →
  merge → build con migración → Production → smoke test (ADR 0013).
- El rollback de código es seguro porque el esquema siempre es compatible hacia atrás.
- **Costo:** el patrón *expand → contract* obliga a hacer en **dos deploys** los cambios de
  esquema destructivos, lo que añade trabajo.
- **Costo:** si una migración se aplica y después falla `next build`, producción queda con el
  esquema nuevo y el código viejo. Es inocuo precisamente porque las migraciones son aditivas,
  pero hay que respetar esa regla sin excepción. La revisión de PR lo verifica.
- **Costo:** hay que mantener la rama `seed` como un artefacto más, actualizándola cuando cambia
  el esquema o el catálogo.
