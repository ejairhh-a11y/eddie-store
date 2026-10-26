# ADR 0015: Privacidad y ciclo de vida de los datos personales

## Estado

Aceptado (nuevo, a partir de la revisión adversarial: hallazgo A3)

## Contexto

Para agendar, el sistema recoge **nombre, email y teléfono** del piloto, y guarda un identificador
derivado de su IP (ADR 0010). El negocio, aunque ficticio, está en Madrid, así que el marco de
referencia es el **RGPD y la LOPDGDD**.

La revisión adversarial señaló que este tema no tenía ninguna decisión tomada:

- los datos se guardaban **para siempre**;
- el formulario no tenía cláusula informativa;
- las ramas de Preview y de CI se creaban desde `main` y **copiaban datos personales de
  producción** a entornos menos protegidos;
- el "hash" de la IP se podía invertir;
- el criterio "ningún log contiene el token" no se podía cumplir, porque Vercel registra la ruta
  de cada petición.

## Decisión

1. **Minimización:** solo se piden nombre, email y teléfono. No se pide DNI ni licencia RFME
   (ya decidido en Design.md §3).
2. **Información al usuario:** bajo el botón "Confirmar cita" hay un texto breve que indica:
   - responsable del tratamiento (Eddie Store, ficticio);
   - finalidad: gestionar la cita;
   - base legal: medidas precontractuales;
   - plazo de conservación;
   - un enlace a `/privacidad`.

   No hay casilla de consentimiento, porque la base legal no es el consentimiento.
3. **Retención:** las citas en estado final (`VENDIDA`, `CANCELADA`, `VENCIDA`) se **anonimizan
   90 días después** de su fecha:
   - `full_name`, `email` y `phone_normalized` pasan a `NULL` (columnas *nullable* con un `CHECK`
     que solo permite NULL si `anonymized_at` no es NULL);
   - se borra `ip_hmac` y se fija `anonymized_at`.

   Se conservan la moto, la fecha, el estado y el código, que sirven para métricas y no
   identifican a nadie. La anonimización corre **de forma oportunista** al cargar el panel de
   admin, con un `UPDATE` acotado, sin cron (coherente con ADR 0004).
4. **IP:** solo se guarda `HMAC-SHA256(ip, RATE_LIMIT_SECRET)` (ADR 0010). La IP en claro no
   llega a la base de datos ni a los logs de la aplicación.
5. **Entornos sin datos reales:** las ramas de Neon de **Preview y CI** se crean desde una rama
   **`seed`**, que contiene solo el catálogo y un admin de prueba, nunca desde `main` (ADR 0016).
   Producción es el único entorno con datos personales reales.
6. **Acceso:** solo un admin autenticado ve los datos completos (ADR 0008). La página
   `/cita/{token}` muestra el nombre de pila y el teléfono enmascarado (ADR 0011).
7. **Logs:** la aplicación nunca registra nombre, email, teléfono, token ni IP (ADR 0014). **Los
   logs de peticiones de la plataforma (Vercel) sí registran la ruta, y con ella el token de
   `/cita/{token}`.** Se acepta como riesgo residual: el token solo da acceso a una vista
   enmascarada, y esos logs tienen una retención muy corta en el plan gratuito.

## Alternativas consideradas

- **Sin política de retención (guardar todo para siempre):** lo más simple, y útil para un
  posible CRM futuro. Se descartó porque incumple el principio de limitación del plazo del RGPD
  (art. 5.1.e) y aumenta el impacto de una filtración sin aportar valor a la v1.
- **Borrado completo de las citas tras 90 días:** elimina todo rastro. Se descartó porque se
  pierden las métricas de negocio (citas por modelo, tasa de no-show), que no necesitan datos
  personales.
- **Anonimizar con un Vercel Cron diario:** más puntual. Se descartó por la misma razón que en
  ADR 0004: añade infraestructura y, si un día no hay acceso al panel, retrasar la anonimización
  unos días no tiene consecuencias reales.

## Consecuencias

- Producción es el único lugar con datos personales, y estos tienen fecha de caducidad.
- El formulario cumple con la obligación de informar sin añadir fricción (no hay casilla).
- **Costo:** la anonimización depende de que alguien abra el panel de admin. Si nadie entra
  durante meses, los datos viven más de 90 días. Se acepta en la v1 y se indica en el runbook.
- **Costo:** las columnas de datos personales pasan a admitir `NULL`, y todo el código que las
  muestra debe contemplar una cita anonimizada.
- **Costo:** mantener la rama `seed` actualizada cuando cambia el catálogo es un paso más del
  protocolo de migraciones (ADR 0016).
- **Costo:** queda el riesgo residual del token en los logs de Vercel, que está fuera del control
  del código.
