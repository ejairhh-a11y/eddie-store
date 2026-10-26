# ADR 0003: Vercel + Neon instalado desde el Marketplace de Vercel

## Estado

Aceptado (ajustado tras la revisión adversarial: hallazgos C2, A2 y A3; y el 2026-10-26: el
deploy lo dispara GitHub Actions, no la integración Git de Vercel)

## Contexto

La rúbrica exige que el proyecto esté **accesible públicamente y funcionando**, con CI/CD
configurado y un protocolo de despliegue documentado. La aplicación es un solo deployable Next.js
(ADR 0001) y la base de datos debe ser Neon (requisito del equipo).

Ya existe un proyecto de Vercel enlazado (`eddie-store-yamaha-motocross`) del sitio estático
anterior.

## Decisión

- **Hosting:** Vercel, usando el proyecto existente `eddie-store-yamaha-motocross`.
- **Base de datos:** Neon, **instalado desde el Marketplace de Vercel**. La integración inyecta
  `DATABASE_URL` en cada entorno y crea **una rama de base de datos por cada Preview Deployment**.
- **Entornos:**
  - Production: rama de Neon `main`, la base de datos principal y la única con datos personales
    reales;
  - Preview: una rama de Neon por rama de git, **creada desde la rama `seed`** (sin datos
    personales), no desde `main` (ADR 0015);
  - CI: ramas efímeras `ci-*`, también desde `seed` (ADR 0013);
  - Local: `.env.local` apuntando a una rama `dev` de Neon.
- **Migraciones y seed:** se rigen por el protocolo de ADR 0016. Migran en el build, con
  `DATABASE_URL_UNPOOLED`.
- **Quién dispara el deploy:** **GitHub Actions**, con la CLI de Vercel y un token
  (`VERCEL_TOKEN`, secreto del repo). No se usa la integración Git de Vercel. El job `deploy` corre
  solo si pasan los checks y el E2E:
  - en cada PR → `vercel deploy` (Preview);
  - en cada push a `main` → `vercel deploy --prod` (Production).

  En los dos casos el build se hace **en Vercel** (no `--prebuilt`), porque las variables de Neon
  son *Sensitive* y no se pueden descargar al runner.
- **Protección de los Preview:** se mantiene Vercel Authentication activada. El smoke test de
  `GET /api/health` usa `vercel curl` con el mismo token, que atraviesa la protección sin necesitar
  un secreto de bypass aparte. El E2E principal no depende del Preview (ADR 0013).

## Alternativas consideradas

- **Vercel + Neon creado por separado en neon.tech**: da más control sobre el proyecto de Neon.
  Se descartó porque hay que copiar las cadenas de conexión a mano entre plataformas y se pierden
  las ramas automáticas por preview, que permiten probar migraciones sin tocar producción.
- **Render (app + Postgres propio)**: todo en un solo proveedor. Se descartó porque deja de usar
  Neon, que es requisito del proyecto, y porque el plan gratuito de Postgres en Render caduca.
- **Integración Git de Vercel** (cada push despliega solo, sin pipeline propio): es lo más
  simple y lo habitual. Se descartó porque la cuenta de Vercel está vinculada a una cuenta de
  GitHub a la que el equipo ya no tiene acceso, así que Vercel no puede leer el repo
  `ejairhh-a11y/eddie-store`. Además, con GitHub Actions el deploy queda **detrás de los tests**:
  no se despliega nada que no pase lint, tipos, Vitest y E2E.

## Consecuencias

- El deploy se dispara con cada push, pero solo si el pipeline está en verde. Cada PR tiene su URL
  de preview y su propia rama de base de datos, así que las migraciones se prueban antes de llegar
  a producción.
- **Costo:** `VERCEL_TOKEN` es un secreto con permisos sobre el equipo de Vercel. Vive solo en los
  secretos de GitHub, con caducidad, y hay que rotarlo si se filtra.
- **Costo:** sin la integración Git, Vercel no comenta los PR con la URL del Preview: la URL queda
  en el resumen del job de GitHub Actions. Que la integración de Neon cree la rama por Preview
  depende de que la CLI envíe los metadatos de git del deploy; se verifica en el primer PR.
- **Costo:** la rama de Neon de un Preview **se reutiliza en cada push del mismo PR** y acumula
  estado (citas, stock apartado). Por eso no sirve para tests deterministas: se usa solo para
  revisión manual y smoke tests (ADR 0013).
- **Costo:** el plan gratuito de Neon limita la cantidad de ramas. Hay que borrar las ramas de
  Preview al cerrar el PR y las de CI al terminar el job (ADR 0016).
- Los secretos (`DATABASE_URL`, credenciales del admin) viven en las variables de entorno de
  Vercel, nunca en el repositorio.
- **Costo:** dependencia de los planes gratuitos de dos plataformas. Neon suspende el cómputo
  inactivo, así que **la primera consulta tras un rato sin uso puede tardar unos cientos de
  milisegundos**, lo que puede afectar el criterio de LCP < 2,5 s. Mitigación: el catálogo se
  renderiza con caché de Next.js e invalidación cuando cambia el stock (ver ADR 0005).
- **Costo:** para operar se necesita acceso al equipo `eddie-66d7` en Vercel y la integración de
  Neon instalada, ambas cosas fuera del repositorio. El protocolo de despliegue debe documentarlo.
