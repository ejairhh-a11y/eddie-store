# ADR 0014: Manejo de errores y observabilidad sin servicios externos

## Estado

Aceptado (ajustado tras la revisión adversarial: hallazgo A3)

## Contexto

`Design.md` §6 define estados de error con el estilo del sitio: error del servidor, 404, franja
ocupada y moto agotada. Nunca debe mostrarse un stack trace. El PRD maneja datos personales
(nombre, email, teléfono) que no deben terminar en los logs. La rúbrica pide un deploy
"funcionando" y un protocolo documentado, lo que implica poder verificar el estado tras cada
despliegue. El nivel de observabilidad debe ser proporcional a un proyecto de curso.

## Decisión

- **Errores esperados** (validación, franja ocupada, agotada, no autorizado): se devuelven como
  resultados tipados de las Server Actions (ADR 0007) y la interfaz los muestra en línea. No son
  excepciones.
- **Errores inesperados:** `error.tsx` (por segmento) y `global-error.tsx` con el estilo del
  sitio, y un mensaje genérico con botón para reintentar. `not-found.tsx` para modelos y páginas
  inexistentes.
- **Logs estructurados en JSON** (`level`, `event`, `requestId`, `durationMs`) hacia la consola de
  Vercel, con una lista de exclusión: **nunca** nombre, email, teléfono, token de acceso ni IP (ni
  en claro ni en HMAC). Las citas se identifican en los logs por su `code`.
- **Alcance de esta garantía:** cubre los logs **que escribe la aplicación**. Los logs de
  peticiones de la plataforma (Vercel) registran la ruta, y por tanto el token de
  `/cita/{token}`. Ese riesgo residual está aceptado y documentado en ADR 0015.
- **`GET /api/health`** comprueba que la app responde y que hay conexión con Neon (`SELECT 1`).
  Devuelve `200 {status:"ok"}` o `503`. Lo usa el protocolo de despliegue como smoke test.
- **Vercel Speed Insights** para medir el LCP real de la producción, el criterio de rendimiento
  del PRD.

## Alternativas consideradas

- **Lo anterior + Sentry**: agrega captura de errores con stack traces, agrupación y alertas. Se
  descartó porque suma un servicio, un DSN y configuración de limpieza de datos personales, y para
  el volumen de un proyecto de curso los logs de Vercel alcanzan.
- **Solo los valores por defecto de Next.js**: no requiere trabajo. Se descartó porque las páginas
  de error por defecto rompen el diseño y los `console.log` sueltos tienden a volcar objetos
  completos con datos personales.

## Consecuencias

- El usuario nunca ve un error técnico, y los logs se pueden compartir para depurar sin exponer
  datos personales.
- El deploy tiene una verificación automática y objetiva (`/api/health`).
- **Costo:** no hay alertas: un error en producción solo se descubre revisando los logs de Vercel,
  que en el plan gratuito tienen poca retención. Se acepta para la v1.
- **Costo:** la lista de exclusión de datos personales en los logs depende de la disciplina al
  programar. Se refuerza con una función de log centralizada (`src/server/log.ts`) y se revisa en
  el pase de seguridad.
