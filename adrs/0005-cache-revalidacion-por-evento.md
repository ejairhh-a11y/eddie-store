# ADR 0005: Datos de catálogo cacheados con `"use cache"` e invalidación por evento (Next.js 16)

## Estado

Aceptado (revisado tras la revisión adversarial: hallazgo A4)

## Contexto

El PRD pide dos cosas que tiran en sentidos opuestos:

- **Rendimiento:** catálogo y ficha con LCP < 2,5 s en Lighthouse móvil.
- **Stock coherente:** el stock mostrado coincide con la base de datos.

Neon suspende el cómputo inactivo, y la primera consulta tras un rato sin uso puede tardar
(ADR 0003). El stock se deriva de las citas (ADR 0004), así que también cambia cuando una cita
vence, sin que ocurra ningún evento.

La primera versión de este ADR tenía tres errores, señalados por la revisión:

- no decía **cómo** se cachean los datos (las consultas de Drizzle no se cachean solas);
- confiaba en `export const revalidate = 3600`, que no tiene efecto en `/`, porque la página lee
  los filtros de `searchParams` y es dinámica;
- asumía Next.js 15, cuando hoy `create-next-app` instala **Next.js 16**, que tiene otro modelo de
  caché.

## Decisión

- **Versión:** **Next.js 16**, fijada en `package.json` (`"next": "16.x"`). Es coherente con
  ADR 0012, que usa lo que instala hoy `create-next-app`.
- **Caché de datos, no de página.** Se activa `cacheComponents: true` en `next.config.ts`. Las
  funciones de lectura del dominio usan la directiva `"use cache"`:

  ```ts
  export async function getCatalog(filters: CatalogFilters) {
    "use cache";
    cacheTag("stock");
    cacheLife({ revalidate: 3600 });   // red de seguridad para las citas que vencen
    return db.select(...);             // los filtros son parte de la clave de caché
  }
  ```

  `getMotorcycle(slug)` sigue el mismo patrón, con los tags `stock` y `moto:{slug}`. La página
  sigue siendo dinámica porque lee `searchParams`, pero **los datos** vienen de la caché.
- **Invalidación por evento:**
  - las mutaciones que cambian el stock (crear cita, cancelar, vender, marcar no-show, cancelar en
    bloque, ajustar stock) llaman a **`updateTag("stock")`** desde la Server Action. Así quien hizo
    el cambio lo ve en su siguiente lectura;
  - si alguna invalidación se dispara fuera de una Server Action, se usa
    `revalidateTag("stock", "max")`.
- **La verdad final está en la transacción.** La validación definitiva del stock ocurre dentro de
  la transacción de la cita (ADR 0006), nunca a partir de lo que mostraba la página.
- **"Mi cita"** (ADR 0009) lee los parámetros de la URL desde un Client Component envuelto en
  `<Suspense>`, para que no convierta en dinámico todo el layout.

### Cambio 2026-10-26: 404 reales desde `proxy.ts`

Con `cacheComponents` y el renderizado en streaming, un `notFound()` dentro de `<Suspense>` llega al
navegador con estado **200**. Para que un modelo inexistente (`/motos/xx`) o una cita inexistente
(`/cita/{token}`) respondan **404 de verdad**, `proxy.ts` lo comprueba antes de renderizar: los
slugs contra el catálogo fijo y los tokens contra la base de datos (con `findByToken`). Costo: una
consulta extra por visita a la confirmación; si la base de datos falla, el proxy no bloquea y la
página muestra su propio error.

## Alternativas consideradas

- **Next.js 15 con `unstable_cache`**: el modelo de caché anterior, muy documentado. Se descartó
  porque un proyecto nuevo empezaría en una versión que ya no es la actual, con APIs marcadas como
  inestables que en la 16 se reemplazan por `"use cache"`.
- **Renderizado siempre dinámico, sin caché**: el stock es siempre fresco. Se descartó porque
  cada visita dependería de Neon y del arranque en frío, con riesgo de no cumplir el LCP.
- **Página estática + stock pedido desde el navegador**: carga inicial rápida. Se descartó porque
  el badge de stock "parpadea" al llegar y obliga a exponer una API pública de stock.

## Consecuencias

- Las lecturas del catálogo y de la ficha salen de la caché, y se actualizan en cuanto alguien
  agenda, cancela o vende.
- **Costo:** el catálogo **puede mostrar un stock momentáneamente desactualizado, en ambos
  sentidos**:
  - una cita que vence tarda hasta una hora en devolver su unidad al catálogo;
  - una carrera entre una lectura en curso y la invalidación puede dejar en caché, por un momento,
    un valor anterior a una reserva.

  El daño está acotado porque la transacción de ADR 0006 impide agendar sin stock real, y el
  piloto ve "Se agotó mientras agendabas".
- **Costo:** cada nueva mutación que toque el stock **debe** llamar a `updateTag`. Si se olvida,
  el catálogo queda viejo hasta una hora. La invalidación vive en el módulo de dominio, no en cada
  componente, y la revisión de código lo verifica.
- **Costo:** Next.js 16 y `cacheComponents` son recientes, así que hay menos ejemplos y algunas
  librerías (por ejemplo Auth.js, ADR 0008) pueden ir por detrás. Se valida en el Sprint 0, con un
  walking skeleton que ya incluya caché, login y deploy.
