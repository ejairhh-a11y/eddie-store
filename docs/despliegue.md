# Protocolo de despliegue — Eddie Store

> BACKLOG #16. Implementa ADR 0003 (Vercel + Neon, deploy desde GitHub Actions), ADR 0013
> (pruebas) y ADR 0016 (migraciones). Producción: **https://eddie-store-yamaha-motocross.vercel.app**

## 1. Arquitectura del despliegue

```
PR o push ──► GitHub Actions (.github/workflows/ci.yml)
               ├─ checks  (postgres:16 de servicio)
               │    npm ci → lint → typecheck → test (Vitest unit) → test:int (Vitest + Postgres) → build
               ├─ e2e     (postgres:16 propio, migrado)
               │    db:migrate → Playwright contra `next start` (móvil 375 px)
               └─ deploy  (solo si checks y e2e pasan)
                    PR  → vercel deploy        → Preview  (rama de Neon por rama de git)
                    main→ vercel deploy --prod → Production (rama `production` de Neon)
                    build en Vercel: drizzle-kit migrate → db:seed-admin → next build
                    smoke: vercel curl /api/health → {"status":"ok","db":"ok"}
```

- **Nada llega a producción sin pasar** lint, tipos, 20+ pruebas unitarias, 32 de integración
  (incluida la concurrencia) y 13 E2E.
- El build ocurre **en Vercel** porque las variables de Neon son *Sensitive* y no salen de Vercel.

## 2. Entornos y datos

| Entorno | Disparador | Base de datos | Datos personales |
|---|---|---|---|
| Production | push a `main` | Neon, rama `production` | Sí (únicos reales) |
| Preview | cada PR | Neon, rama por rama de git (creada por la integración) | No |
| CI | cada push/PR | `postgres:16` efímero de GitHub Actions | No (datos de prueba) |
| Local | manual | Postgres local (`DB_DRIVER=pg`) | No |

## 3. Variables de entorno

| Variable | Dónde | Quién la gestiona |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Vercel (Production, Preview) | Integración de Neon (automática) |
| `RATE_LIMIT_SECRET` | Vercel (Production, Preview) | Generada aleatoriamente con la CLI (`--sensitive`) |
| `AUTH_SECRET` | Vercel (Production, Preview) | Generada aleatoriamente con la CLI (`--sensitive`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Vercel (Production) | El responsable del concesionario (ver §6) |
| `WHATSAPP_NUMBER`, `MAX_DAILY_BOOKINGS` | Vercel (opcional) | Equipo |
| `VERCEL_TOKEN` | Secretos de GitHub | El responsable del proyecto |
| `DB_DRIVER`, `RATE_LIMIT_SECRET`, `AUTH_SECRET` de prueba | `ci.yml` | Valores solo de CI, no sirven en producción |

Ningún valor real está en el repositorio; la lista completa de nombres está en `.env.example`.

## 4. Desplegar un cambio (procedimiento normal)

1. Crear una rama y abrir un PR contra `main`.
2. Esperar el pipeline: `checks` → `e2e` → `deploy (Preview)`. La URL del Preview aparece en el
   resumen del job.
3. Revisar el Preview (está protegido con Vercel Authentication; desde la CLI:
   `vercel curl --deployment <url> /api/health`).
4. Hacer merge. El push a `main` repite el pipeline y despliega a **Production** con smoke test.

## 5. Migraciones (ADR 0016)

- Se generan con `npm run db:generate` y se versionan en `drizzle/`. Se revisan en el PR.
- **Solo aditivas** (patrón *expand → contract*): nunca se borra ni renombra una columna en uso en
  el mismo deploy que deja de usarla.
- Se aplican **en el build de Vercel** (`npm run build:vercel`) con `DATABASE_URL_UNPOOLED`, y en
  CI contra Postgres antes de las pruebas.
- El catálogo inicial entró como migración de datos (`0001_catalogo_inicial.sql`, `ON CONFLICT DO
  NOTHING`): no pisa el stock real.

## 6. Primer admin (una sola vez)

En una terminal (PowerShell o CMD, no Git Bash), desde la carpeta del proyecto:

```bash
vercel env add SEED_ADMIN_EMAIL production --scope eddie-66d7
```

```bash
vercel env add SEED_ADMIN_PASSWORD production --sensitive --scope eddie-66d7
```

La contraseña debe tener 12 caracteres o más. En el siguiente deploy a producción, el build crea
el admin si ese email no existe (nunca cambia una contraseña existente). Después se entra en
`/admin/login`.

**Después del primer login, borrar `SEED_ADMIN_PASSWORD` de Vercel** (SEC-10): el seed corre en cada
build, y mientras la variable exista la contraseña queda guardada en la plataforma. Con el admin ya
creado, el seed no hace nada aunque la variable falte.

```bash
vercel env rm SEED_ADMIN_PASSWORD production --scope eddie-66d7
```

## 7. Verificación después de cada deploy

| Comprobación | Cómo | Esperado |
|---|---|---|
| Salud | `curl https://eddie-store-yamaha-motocross.vercel.app/api/health` | `{"status":"ok","db":"ok"}` (automático en el pipeline) |
| Catálogo | abrir `/` | 6 modelos con precio y stock |
| Flujo crítico | cubierto por el E2E del pipeline | verde |
| Rendimiento | Vercel Speed Insights / Lighthouse móvil | LCP < 2,5 s |

## 8. Rollback

1. En Vercel → Deployments → elegir el último deploy bueno → **Instant Rollback**
   (o `vercel rollback <url> --scope eddie-66d7`).
2. Es seguro porque las migraciones son aditivas: el código anterior funciona con el esquema nuevo.
3. Si una migración fuera el problema: escribir una migración nueva que lo corrija (nunca editar
   una migración ya aplicada) y desplegarla por el procedimiento normal.

## 9. Runbook de incidentes

| Situación | Acción |
|---|---|
| `/api/health` devuelve 503 | Revisar el estado de Neon y los logs de Vercel (evento `health.db_down`); el cómputo de Neon puede estar suspendido y despierta solo |
| Muchas citas falsas (abuso) | `/admin` → "Cancelar origen" en una de ellas: cancela todas las pendientes de esa IP (HMAC) |
| Tope global de 40 citas/día alcanzado | Las citas nuevas devuelven "Demasiados intentos"; tras limpiar el abuso, subir `MAX_DAILY_BOOKINGS` o esperar al día siguiente |
| Admin bloqueado por intentos | Esperar 15 minutos (ventana del límite) |
| Contraseña de admin olvidada | Borrar el usuario en Neon y redeployar con `SEED_ADMIN_*` nuevos (no hay recuperación en la v1, ADR 0008) |
| Secreto filtrado (`AUTH_SECRET`, `VERCEL_TOKEN`…) | Rotarlo en Vercel/GitHub y redeployar; rotar `AUTH_SECRET` cierra todas las sesiones |
| Datos personales con más de 90 días | Abrir `/admin`: la anonimización corre al cargar el panel (ADR 0015) |
