# ADR 0001: Una sola aplicación Next.js full-stack con Neon

## Estado

Aceptado

## Contexto

El PRD pide cuatro capacidades para la v1: catálogo con stock real, ficha de modelo, simulador de
financiación y agendar cita. A eso se suma un panel de administración mínimo. Hay un solo
desarrollador y una fecha de cierre fija (sesión 14 del curso), y la rúbrica exige un deploy
público con CI/CD.

El repositorio solo tiene HTML estático generado por Stitch, sin lógica. Se trata como
**greenfield**: ese HTML es referencia visual (ver `Design.md`), no código heredado. Los ADRs que
había en `docs/adr/` eran de otro proyecto (apuestas deportivas) y se archivan en
`docs/_archivo/`.

## Decisión

El sistema es **una única aplicación Next.js (App Router, TypeScript)** que contiene el frontend
(páginas React) y el backend (Server Actions y Route Handlers), desplegada como un solo artefacto
y conectada a una base PostgreSQL en Neon.

```
Navegador ──► Next.js en Vercel ──► Neon PostgreSQL
              ├ páginas públicas (/, /motos/[slug], /financiacion, /cita)
              ├ panel /admin
              └ lógica de servidor (Server Actions + /api/*)
```

## Alternativas consideradas

- **Next.js + API separada (Express o Fastify)**: separa mejor las capas y la API se podría
  reutilizar desde otro cliente. Se descartó porque obliga a mantener dos deploys, dos pipelines y
  configuración CORS sin que el PRD pida ningún segundo cliente.
- **Next.js + API en NestJS**: aporta estructura (módulos, inyección de dependencias) útil en
  backends grandes. Para cuatro funcionalidades es sobreingeniería y quita tiempo a los documentos
  y a las pruebas, que pesan más en la evaluación.

## Consecuencias

- Un solo repositorio, un solo pipeline y un solo deploy: menos configuración y menos puntos de
  fallo para un equipo de una persona.
- Front y back comparten tipos y esquemas de validación sin duplicarlos.
- **Costo:** la lógica de negocio queda acoplada a Next.js. Si en el futuro hubiera una app móvil,
  habría que exponer una API pública o extraer un servicio. Mitigación: la lógica de dominio
  (stock, franjas, simulador) vive en módulos puros (`src/server/`, `src/lib/`), separada de los
  componentes y de las Server Actions.
- **Costo:** el backend corre como funciones serverless, así que no hay procesos permanentes. Las
  tareas en segundo plano necesitarían Vercel Cron, aunque el PRD no requiere ninguna (ver
  ADR 0004).
