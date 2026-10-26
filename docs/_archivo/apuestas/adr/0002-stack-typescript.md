# ADR-0002: Stack TypeScript — Next.js + NestJS

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
Se necesita un frontend con buena carga inicial (catálogo de eventos indexable) y un backend
estructurado en módulos, con validación y pruebas. El equipo debe poder moverse entre frontend y
backend con facilidad.

## Decisión
Usar **TypeScript en todo el stack**: Next.js (React) en el frontend y NestJS sobre Node.js 22 LTS
en el backend, con Prisma como ORM.

## Alternativas consideradas
- **Spring Boot (Java):** muy robusto para transacciones, pero requiere dos lenguajes y más
  configuración inicial.
- **Django / FastAPI (Python):** productivos, pero separan el lenguaje del frontend y el soporte
  de WebSocket requiere piezas adicionales.
- **Express sin framework:** más ligero, pero sin estructura modular ni inyección de dependencias
  incluidas.

## Consecuencias
- **Positivas:** un solo lenguaje; tipos compartidos entre frontend y backend (DTOs); la
  arquitectura modular de NestJS encaja con el [ADR-0001](0001-monolito-modular.md).
- **Negativas:** Node.js ejecuta el código en un solo hilo; las tareas que consumen mucha CPU deben
  ir al worker.
- **Nota:** si el curso exige otro stack, este ADR se reemplaza sin afectar a los demás.
