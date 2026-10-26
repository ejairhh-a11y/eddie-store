# ADR-0008: Despliegue en contenedores sobre PaaS

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
El equipo necesita desplegar la demo con poco esfuerzo de operación y bajo costo, con un entorno
local idéntico al desplegado y un proceso automático de pruebas.

## Decisión
- Empaquetar la API y el worker como **imágenes Docker**; en local se usa **Docker Compose**
  (API, worker, PostgreSQL y Redis).
- Frontend en **Vercel**; API y worker en una **PaaS de contenedores** (Render, Railway o Fly.io);
  PostgreSQL y Redis **gestionados**, con backups automáticos.
- **CI/CD con GitHub Actions:** lint → pruebas → build de la imagen → deploy a staging → pruebas
  rápidas de humo (smoke tests) → aprobación manual para producción.

## Alternativas consideradas
- **Kubernetes (EKS/GKE):** muy flexible, pero excesivo en costo y complejidad para el curso.
- **Máquina virtual administrada a mano:** barata, pero obliga a gestionar el sistema operativo,
  TLS, backups y reinicios.
- **Serverless (Lambda):** no encaja bien con WebSockets persistentes ni con workers de larga
  duración.

## Consecuencias
- **Positivas:** la plataforma gestiona HTTPS, escalado y reinicios; el entorno es reproducible;
  despliegues automáticos y vuelta atrás sencilla (redesplegar la imagen anterior).
- **Negativas:** dependencia del proveedor de PaaS y límites de los planes gratuitos (por ejemplo,
  el servicio se "duerme" tras un periodo sin uso).
- **Mitigación:** al usar Docker estándar, migrar a otra plataforma o a AWS ECS no requiere cambios
  de código.
