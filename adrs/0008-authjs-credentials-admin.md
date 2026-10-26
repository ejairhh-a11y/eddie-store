# ADR 0008: Auth.js con Credentials y tabla de administradores

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgo A5)

## Contexto

El PRD incluye un **panel de administración mínimo, protegido con autenticación**, para ver citas
y ajustar stock. El piloto **no** tiene cuenta (PRD › No alcance). El PRD registra como riesgo el
**panel expuesto** y pide "autenticación robusta, límite de intentos y secretos fuera del
repositorio".

La revisión adversarial encontró cuatro problemas en la primera versión de este ADR:

1. La alternativa "sesión propia" se descartó con un argumento falso ("no permite más de un
   usuario").
2. No se consideró Better Auth.
3. El límite de intentos se podía saltar con un POST directo a las rutas de Auth.js.
4. No había forma de revocar sesiones.

## Decisión

Se **mantiene Auth.js (v5)** con el proveedor **Credentials**, corrigiendo cómo se usa:

- **Usuarios:** la tabla `admin_users` guarda email, `password_hash` (**argon2id con
  `@node-rs/argon2`**, que trae binarios precompilados y funciona en las funciones de Vercel sin
  compilar módulos nativos) y `session_version`. El primer admin se crea con el seed (ADR 0016) a
  partir de variables de entorno; nunca hay credenciales en el código.
- **Límite de intentos dentro de `authorize()`:** antes de verificar el hash se consulta el
  limitador (5 fallos cada 15 minutos por IP, ADR 0010). Así el límite también aplica a un POST
  directo a `/api/auth/callback/credentials`. El mensaje de error es siempre genérico.
- **Sesión:** JWT en una cookie `httpOnly`, `Secure` y `SameSite=Lax`, firmada con `AUTH_SECRET`.
  - El JWT incluye `iat` y `session_version`.
  - **Expiración absoluta de 8 horas**, comprobando `iat` en cada verificación (no solo el
    `maxAge` de Auth.js, que es deslizante).
  - **Revocación:** cada Server Action de admin compara el `session_version` del token con el de
    la base de datos. Incrementar ese número (al resetear la contraseña, o con un "cerrar todas
    las sesiones") invalida todas las sesiones de ese admin.
- **Protección en dos capas:**
  1. `proxy.ts` (antes `middleware.ts`, en Next.js 16) redirige a `/admin/login` cualquier
     `/admin/*` sin sesión. Es una mejora de experiencia, no la barrera de seguridad;
  2. **cada Server Action de admin verifica la sesión y el `session_version`** (ADR 0007). Esa es
     la barrera real.

## Alternativas consideradas

- **Sesión propia con `jose` o iron-session + tabla `admin_users`**: con muy poco código permite
  varios usuarios, registra `updated_by` y se puede revocar con `session_version`. Es una opción
  **plenamente viable**. No se eligió porque habría que escribir y mantener a mano la gestión de
  cookies, la rotación y la protección CSRF del login, que Auth.js ya resuelve, y porque el equipo
  prefiere una librería con documentación conocida. *Corrección: la versión anterior la descartaba
  diciendo que "no permite más de un usuario", lo cual era falso.*
- **Better Auth**: librería moderna, con 2FA y gestión de sesiones en base de datos (revocables
  de forma nativa), y con un adaptador para Drizzle. Hoy el equipo de Better Auth mantiene también
  Auth.js. No se eligió porque su modelo crea varias tablas propias (usuarios, sesiones, cuentas)
  y está orientado a usuarios finales, cuando el proyecto solo necesita uno o dos admins. Si
  Auth.js v5 diera problemas con Next.js 16 en el Sprint 0, **es la alternativa de reemplazo**.
- **Clerk**: login gestionado con 2FA, sin guardar contraseñas. Se descartó porque añade una
  dependencia externa con cuenta y claves propias, y su interfaz de login no sigue el design
  system (Design.md §7).

## Consecuencias

- Las contraseñas nunca se guardan en claro, la sesión no es accesible desde JavaScript, y el
  límite de intentos no se puede saltar llamando a las rutas internas.
- Las sesiones se pueden revocar sin cambiar `AUTH_SECRET`.
- **Costo:** Auth.js v5 sigue en beta y está en modo mantenimiento. Su compatibilidad con
  Next.js 16 (`proxy.ts`, `cacheComponents`) es un riesgo que se valida en el Sprint 0, con
  Better Auth como plan B.
- **Costo:** comprobar el `session_version` cuesta una consulta extra en cada acción de admin.
  Es irrelevante con su volumen.
- **Costo:** Auth.js expone las rutas `/api/auth/*`, que son superficie de ataque adicional
  (documentada en ADR 0007).
- **Costo:** no hay 2FA ni recuperación de contraseña en la v1. Un admin que olvida la suya
  necesita que la reseteen con el script de seed. Es un riesgo aceptado.
