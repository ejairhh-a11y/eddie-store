# Revisión adversarial: TECH-DESIGN y ADRs de Eddie Store

> **Cómo se hizo:** skill `revision-adversarial`, ejecutada por un agente **sin el historial de la
> conversación** que produjo el diseño, para evitar el sesgo de autoevaluación. El agente leyó
> completos `TECH-DESIGN.md`, los ADR 0001–0014, `PRD.md` y `Design.md`, y revisó partes del HTML
> de Stitch. No editó ningún archivo.
>
> **Fecha:** 2026-10-25 · **Estado:** hallazgos reportados; la decisión de qué corregir es del
> equipo (ver la sección "Resolución", al final).

---

## Crítico

### C1. ADR 0006 / 0007 / 0010 / 0011: todo error `23505` se traduce como "horario ocupado", y faltan códigos de error

- **Problema:** ADR 0006 traduce **cualquier** `23505` a "Ese horario acaba de ocuparse". Pero
  `appointments` tiene cinco restricciones únicas: la franja, el email pendiente, el teléfono
  pendiente, `code` y `access_token_hash`.
- **Qué ve el usuario:** un piloto que ya tiene una cita vigente recibe `SLOT_TAKEN` y "franjas
  libres", y vuelve a fallar con cualquiera que elija. Es un bucle sin salida que contradice F3.
- **Falta un código de error:** no existe un `ALREADY_BOOKED` en ADR 0007 ni el estado
  correspondiente en Design.md §6.
- **El reintento de ADR 0011 no funciona:** tras un error, la transacción de Postgres queda
  abortada. Sin un `SAVEPOINT`, el `INSERT` no se puede reintentar dentro de ella.
- **Arreglo:**
  - mapear el error por nombre de constraint: franja → `SLOT_TAKEN`; email o teléfono →
    `ALREADY_BOOKED`; `code` → reintentar;
  - generar `code` con `SAVEPOINT` o repitiendo la transacción completa;
  - añadir el estado nuevo a Design.md §6 y un test de integración que compruebe el código de
    error devuelto.

### C2. ADR 0013 / 0003: el E2E contra el Preview de Vercel casi seguro falla en CI

- **La protección de Vercel bloquea a Playwright:** los Preview tienen Vercel Authentication
  activada por defecto, así que Playwright desde GitHub Actions ve la pantalla de login. No se
  documenta el *Protection Bypass for Automation* ni cómo se obtiene la URL del Preview ni cómo se
  espera a que esté listo.
- **La rama de Neon del Preview no es descartable:** se crea por rama de git y se reutiliza en
  cada push, y nace como copia de `main`.
  - Cada ejecución del E2E aparta stock; tras N pushes la moto sale "Agotada".
  - El email o teléfono de la ejecución anterior sigue pendiente y choca con el límite de una cita
    por persona (C1).
  - La franja elegida puede estar ocupada.
- **Por qué es grave:** el fallo es intermitente (pasa en el primer push y rompe en los
  siguientes) y afecta al 20 % de la rúbrica (E2E + CI/CD).
- **Arreglo:** correr Playwright en CI contra `next build && next start` sobre la **rama efímera
  de CI**, con migración y seed deterministas y datos únicos por ejecución. Contra el Preview, solo
  un smoke test.

### C3. ADR 0004 / 0006 / F4: no hay máquina de estados de la cita, y el admin puede corromper el stock

- **Doble envío:** si el admin hace doble clic en "Marcar vendida", se ejecuta `stock_total − 1`
  dos veces. Si alguien pulsa "Vendida" y otro "Cancelar" a la vez, la cita queda `CANCELADA` con
  la unidad igualmente descontada.
- **Venta tardía y disponible negativo:**
  1. La cita B es un no-show de ayer, así que su unidad ya volvió al stock.
  2. Otro piloto aparta esa misma unidad con la cita A.
  3. El cliente de B llega tarde y el admin marca B como vendida.
  4. Resultado: **disponible −1**, o violación del `CHECK ≥ 0`.
- **`VENCIDA` es inconsistente:** solo se asigna cuando la misma persona vuelve a agendar, así que
  unos no-shows quedan `PENDIENTE` y otros `VENCIDA`. El panel no resalta los `VENCIDA`, y no está
  definido si `VENCIDA → VENDIDA` está permitido.
- **Arreglo:**
  - tabla de transiciones permitidas: `PENDIENTE → VENDIDA | CANCELADA | VENCIDA` y
    `VENCIDA → VENDIDA | CANCELADA`;
  - `UPDATE … WHERE status IN (…) RETURNING` para que la transición sea idempotente;
  - vender una cita que ya estaba fuera del conteo exige disponible ≥ 1 bajo el mismo
    `FOR UPDATE`;
  - el panel resalta tanto `PENDIENTE` pasadas como `VENCIDA`;
  - tests de integración de doble envío y de venta tardía.

---

## Advertencia

### A1. ADR 0010: el límite por IP no impide el ataque que el propio ADR describe

- **Las cuentas:** 5 por hora son 120 citas al día desde **una** IP, frente a unas 230 franjas y
  pocas decenas de unidades en stock. Con datos inventados, un script deja todo "Agotado" en pocas
  horas, y esas unidades quedan bloqueadas hasta 30 días.
- **La consecuencia escrita en el ADR es falsa:** "una persona no puede acaparar" no se cumple.
- **Ambigüedades:** no se dice si el contador se incrementa fuera de la transacción de la cita (si
  está dentro, se revierte en cada fallo) ni si cuentan los errores de validación.
- **Arreglo:**
  - añadir un límite diario por IP y un tope global;
  - una acción de admin para cancelar en bloque;
  - contar los intentos en una transacción aparte;
  - reescribir la consecuencia del ADR con honestidad.

### A2. ADR 0003 / 0013: no hay protocolo de migraciones ni de seed

Falta definir:

- quién migra la rama de cada Preview;
- cómo se migra producción. Si se migra en el build y después el build falla, el esquema queda
  por delante del código, y el Instant Rollback de Vercel no revierte el esquema;
- que hay que usar la URL **directa** (`DATABASE_URL_UNPOOLED`) para migrar, no la del pooler;
- el seed del admin y del catálogo en producción;
- la limpieza de ramas viejas de Neon.

**Arreglo:** una sección "Migraciones y datos" con migraciones solo aditivas (patrón
expand/contract), seed idempotente y borrado automático de ramas.

### A3. Privacidad (RGPD/LOPDGDD): área de decisión ausente

- **Sin retención ni aviso:** los datos personales se guardan sin plazo y el formulario no tiene
  cláusula informativa.
- **Datos reales en entornos de prueba:** las ramas de Preview y CI se copian de `main` y arrastran
  los datos personales de producción a entornos menos protegidos.
- **El hash de la IP no protege:** un SHA-256 sin secreto se invierte por fuerza bruta sobre todo
  el espacio IPv4.
- **El criterio de logs de F5 es imposible:** el token aparece en la **ruta** `/cita/{token}`, y
  Vercel registra las rutas en sus logs de peticiones, así que "ningún log contiene el token" no
  se puede cumplir.
- **Arreglo:**
  - fijar una retención (p. ej. anonimizar 90 días después de cerrar la cita);
  - añadir el texto informativo bajo "Confirmar cita";
  - crear las ramas de prueba desde una rama `seed` sin datos personales;
  - usar HMAC con secreto para la IP;
  - reformular F5.

### A4. ADR 0005: el mecanismo de caché no está especificado y una afirmación es incorrecta

- **Falta decir cómo se cachea:** Drizzle sobre `neon-http` no se cachea por defecto en Next 15.
  Hace falta `unstable_cache` (o `"use cache"`) con tags.
- **`revalidate = 3600` no hace nada en `/`:** la página lee los filtros de `searchParams`, así
  que es dinámica y el valor de segmento se ignora.
- **"Mi cita" con `useSearchParams`** en el layout exige envolverlo en `<Suspense>`.
- **"Nunca se muestra más stock del real" no es estrictamente cierto:** pueden darse carreras
  entre la caché y `revalidateTag`. El daño es acotado gracias a ADR 0006, pero la afirmación
  absoluta sobra.
- **Versión de Next:** hoy `create-next-app` instala **Next 16**, donde cambian `middleware.ts`
  (pasa a `proxy.ts`) y la firma de `revalidateTag`, y aparece `updateTag`. Fijar Next 15 choca con
  el argumento de ADR 0012 ("lo que instala hoy `create-next-app`").
- **Arreglo:** fijar la versión explícitamente o migrar los ADR 0005 y 0008 a Next 16;
  especificar `unstable_cache` con claves por filtro; suavizar la afirmación.

### A5. ADR 0008 / 0007: Auth.js, alternativas mal descartadas y límite de login evitable

- **Hay más rutas HTTP de las declaradas:** Auth.js v5 expone `/api/auth/*`, así que "única ruta
  HTTP: `/api/health`" es falso.
- **El límite de login se puede saltar:** hay que aplicarlo dentro de `authorize()`. Si va en la
  Server Action, un POST directo a `/api/auth/callback/credentials` lo evita.
- **La alternativa iron-session se descartó por un motivo falso:** iron-session (o `jose`) más la
  tabla `admin_users` sí admite varios usuarios.
- **Estado de la librería:** Auth.js v5 sigue en beta y pasó a mantenimiento bajo el equipo de
  Better Auth (verificar). No se consideró Better Auth ni una sesión propia.
- **Detalles técnicos:**
  - las sesiones JWT no se pueden revocar;
  - `maxAge` es una expiración deslizante, no un límite absoluto de 8 horas;
  - argon2 es un módulo nativo: necesita `serverExternalPackages` o `@node-rs/argon2`.
- **Arreglo:** corregir ADR 0007; poner el límite en `authorize()`; reevaluar las alternativas;
  añadir `session_version` en `admin_users` para poder invalidar sesiones.

### A6. Design.md / modelo de datos: elementos de la ficha de Stitch sin tratar

- **Bloques de la ficha que Design.md no menciona:**
  - selector de acabado con recargo (Monster +300 €, 50th +450 €);
  - selector de mapa de ECU;
  - selector de cantidad;
  - "Entrega inmediata 24-48h".
- **"Desde X €/mes" no tiene parámetros:** con la entrada máxima de J1, el mínimo literal sería
  unos 0,02 €/mes.
- **Filtro `?stock=`:** está en Design.md pero no en el PRD ni en F1.
- **Arreglo:** una tabla en Design.md §3 que diga qué se conserva y qué se elimina de la ficha;
  definir "desde" como entrada 0 € y 60 meses; decidir sobre `?stock=`.

### A7. ADR 0013: la cobertura de pruebas está sobredimensionada

- **Criterios sin nivel de prueba asignado:**
  - acción de admin sin sesión → `UNAUTHORIZED`;
  - el código `YZ-XXXX` no da acceso a la cita;
  - el invariante de ajuste de stock;
  - vender y cancelar;
  - el límite de login.
- **Fechas no testeables:** sin un "hoy" inyectable, la liberación por fecha y los casos de cambio
  de hora no se pueden probar de forma determinista.
- **La métrica de "< 5 minutos" no se mide de verdad:** el E2E tarda segundos, así que no dice
  nada sobre el tiempo de una persona.
- **Arreglo:** pasar `today`/`now` como parámetro del dominio; añadir los casos faltantes;
  reformular la métrica como "≤ 4 pantallas y ≤ N interacciones".

---

## Sugerencia

- **S1 (ADR 0002):** un único driver (`neon-serverless` con Pool) elimina el riesgo de usar el
  driver equivocado.
- **S2 (ADR 0009):** "céntimos enteros" es imposible con `(1+i)^n`. Calcular en `number` y
  redondear al final, y definir el total a pagar y el ajuste de la última cuota.
- **S3 (ADR 0007):** las Server Actions no deberían usarse para lecturas como
  `getAvailableSlots`. Mejor `?fecha=` en la URL o un Route Handler GET.
- **S4 (ADR 0012):** faltan trampas de la migración a Tailwind v4: `darkMode: "class"` necesita
  `@custom-variant dark`, cambia el color de borde por defecto, el ancho de `ring` y se renombran
  `shadow-sm`/`outline-none`.
- **S5:** no hay festivos ni cierres. La ventana de 30 días incluye el 8/12 y el 25/12.
- **S6 (ADR 0009):** "Mi cita" basado en la URL aporta poco y obliga a usar `useSearchParams` en
  el layout. Conviene eliminarlo o derivarlo del `pathname`.
- **S7 (ADR 0014):** en el plan Hobby los logs se retienen solo unas horas. Usar `x-vercel-id`
  como `requestId`.
- **S8 (seguridad):** falta una decisión sobre cabeceras globales: CSP, `frame-ancestors 'none'`
  en `/admin` y `Referrer-Policy`.
- **S9 (producto):** sin autocancelación, el piloto tiene que escribir por WhatsApp para cambiar la
  hora. El token ya permitiría un botón "Cancelar mi cita".

---

## Lo que resistió el escrutinio

- **ADR 0004 (stock derivado):** es correcto. Elimina la desincronización y el cron.
- **ADR 0006 (mecanismo):** la semántica es correcta bajo READ COMMITTED, no hay riesgo de
  interbloqueo, y la marca perezosa `VENCIDA` no altera el disponible. Los fallos están en las
  transiciones (C3) y en el mapeo de errores (C1), no en el mecanismo.
- **ADR 0011:** proporcional y bien razonado.
- **ADR 0001 y 0003:** proporcionales al proyecto, con alternativas reales.
- **Afirmaciones técnicas verificadas como correctas:**
  - Credentials exige sesión JWT, y argon2 no corre en Edge;
  - Server Actions con verificación de `Origin`;
  - `x-forwarded-for` en Vercel;
  - la sintaxis de `@theme` en Tailwind v4;
  - TAE 6,11 %;
  - el horario 10–18 h nunca cae en el hueco del cambio de hora;
  - la limitación de `neon-http` con transacciones.

## Veredicto por ADR

| ADR | Veredicto | Hallazgos |
|---|---|---|
| 0001 App Next.js full-stack | Sólido | — |
| 0002 Drizzle ORM | Con reparos | S1 |
| 0003 Vercel + Neon Marketplace | Con reparos | C2, A2, A3 |
| 0004 Stock derivado | Con reparos | C3 |
| 0005 Caché y revalidación | Con reparos | A4 |
| 0006 Índice único + FOR UPDATE | Con reparos | C1, C3 |
| 0007 Server Actions + Zod | Con reparos | C1, A5, S3 |
| 0008 Auth.js Credentials | Con reparos | A5 |
| 0009 Estado en URL y cálculo compartido | Con reparos | A6, S2, S6 |
| 0010 Límites de abuso en BD | **Débil** | A1, A3, C1 |
| 0011 Código y token de cita | Sólido | A3 (menor) |
| 0012 Tailwind v4 + tokens | Con reparos | S4, A4 |
| 0013 Estrategia de pruebas | **Débil** | C2, A7 |
| 0014 Errores y observabilidad | Con reparos | A3, S7 |

---

## Resolución

**Decisión del equipo (2026-10-25):** se aplican los arreglos recomendados de **todos los
críticos y advertencias**. Las **sugerencias quedan pendientes** para una iteración posterior.

| Hallazgo | Resolución | Dónde |
|---|---|---|
| C1 | Errores traducidos por nombre de restricción; nuevo código `ALREADY_BOOKED`; reintento de `code` con `SAVEPOINT`; estado nuevo en la interfaz; test por código de error | ADR 0006 §2, ADR 0007, ADR 0011, Design.md §6, TECH-DESIGN F3 |
| C2 | E2E en CI contra `next start` sobre una rama efímera de Neon creada desde `seed`, con datos únicos por ejecución; el Preview queda solo para smoke tests con bypass de protección | ADR 0013, ADR 0003 |
| C3 | Máquina de estados con `UPDATE … WHERE status IN (…)` idempotente; una venta tardía exige disponible ≥ 1; `VENCIDA` es solo una etiqueta; el panel trata igual las pendientes pasadas y las vencidas | ADR 0006 §3, ADR 0004, TECH-DESIGN (máquina de estados, F4), Design.md §7 |
| A1 | 3 citas cada 24 h por IP + tope global de 40 citas por día + cancelación en bloque; contadores en una transacción propia; la validación no cuenta; consecuencias reescritas con honestidad | ADR 0010, Design.md §7 |
| A2 | Nuevo ADR de migraciones solo aditivas en el build con `DATABASE_URL_UNPOOLED`, seed idempotente fuera del build, rama `seed` y limpieza de ramas | ADR 0016 (nuevo), ADR 0003, TECH-DESIGN (protocolo) |
| A3 | Nuevo ADR de privacidad: anonimización a los 90 días, texto informativo, entornos de prueba desde `seed`, IP con HMAC; F5 reformulado; el token en los logs de Vercel queda como riesgo aceptado | ADR 0015 (nuevo), ADR 0010, ADR 0011, ADR 0014, Design.md §10 |
| A4 | Se adopta **Next.js 16**: `"use cache"` + `cacheTag`/`cacheLife` en las funciones de datos, `updateTag` en las mutaciones, `<Suspense>` para "Mi cita"; la afirmación de stock se suaviza | ADR 0005, ADR 0008 (`proxy.ts`), TECH-DESIGN |
| A5 | Límite de login dentro de `authorize()`; superficie `/api/auth/*` documentada; alternativas corregidas (sesión propia y Better Auth como plan B); `session_version`; expiración absoluta; `@node-rs/argon2` | ADR 0008, ADR 0007 |
| A6 | Tabla de qué se conserva o elimina en la ficha; "desde" = entrada 0 € y 60 meses; se elimina el filtro `?stock=` | Design.md §3 y §5.2, TECH-DESIGN (reglas, F1) |
| A7 | Reloj inyectable; cada criterio etiquetado con su nivel de prueba; casos de integración añadidos; la métrica de 5 minutos pasa a ≤ 4 pantallas y ≤ 12 interacciones (E2E) + prueba de usabilidad manual | ADR 0013, ADR 0004, TECH-DESIGN (F1–F5) |
| S1–S9 | **Pendientes** | TECH-DESIGN › Riesgos técnicos abiertos |

**Decisiones tomadas al aplicar los arreglos** (la revisión ofrecía opciones y se tomó la
recomendada):

- Next.js 16 en lugar de fijar Next.js 15 (A4).
- Se mantiene Auth.js como elección del equipo, con Better Auth como plan B (A5).
- Valores nuevos de los límites: 3 citas por día por IP y tope global de 40 citas por día (A1).
- Retención de 90 días (A3).
- Se elimina el filtro de disponibilidad en lugar de añadirlo al PRD (A6).
