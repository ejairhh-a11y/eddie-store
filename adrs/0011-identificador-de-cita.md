# ADR 0011: Código de cita legible y token secreto para la confirmación

## Estado

Aceptado (ajustado tras la revisión adversarial: hallazgos C1 y A3)

## Contexto

El PRD pide una **pantalla de confirmación con código de cita** y un botón de WhatsApp con un
mensaje que incluye ese código. La primera versión de `Design.md` definía la ruta `/cita/[codigo]` con el resumen de la
cita. Ese resumen incluye **datos personales** (nombre y teléfono).

Si el identificador de la URL fuera secuencial o corto, cualquiera podría recorrer
`/cita/0001`, `/cita/0002`… y leer los datos de otros pilotos. Es una vulnerabilidad de tipo
IDOR / enumeración (OWASP A01).

## Decisión

Cada cita tiene **dos identificadores con propósitos distintos**:

| Campo | Formato | Uso |
|---|---|---|
| `code` | `YZ-` + 4 caracteres de un alfabeto sin ambigüedades (sin 0/O, 1/I/L), p. ej. `YZ-7K3P` | Se dicta por teléfono, aparece en el mensaje de WhatsApp y en el panel del admin. **No da acceso a nada.** |
| `access_token` | 128 bits aleatorios (`crypto.randomBytes(16)`, base64url) | Es la única llave de la URL `/cita/{access_token}`. |

- La página de confirmación **enmascara** el teléfono (`••• •• 45 67`) y muestra solo el nombre de
  pila.
- La página lleva `noindex` y `Referrer-Policy: no-referrer`, para que el token no se filtre a
  buscadores ni a terceros.
- `code` tiene un índice único (`appointments_code_uq`). Si hay colisión, el `INSERT` se reintenta
  dentro de un `SAVEPOINT` con un código nuevo, hasta 3 veces (ADR 0006 §2). Con 31⁴ ≈ 920.000
  combinaciones, las colisiones son raras pero posibles.
- El token aparece en la **ruta** de la URL, así que los logs de peticiones de Vercel lo
  registran. Se acepta como riesgo: el token solo da acceso a una vista con los datos
  enmascarados (ver ADR 0015).

## Alternativas consideradas

- **Un solo código aleatorio largo** (10 caracteres): un único identificador, sin ambigüedad.
  Se descartó porque es incómodo de dictar por teléfono o de leer en el box, que es justo como el
  concesionario lo va a usar.
- **Sin página persistente**: la confirmación se ve una vez tras agendar y no hay URL. Es lo más
  seguro. Se descartó porque si el piloto recarga o cierra la pestaña pierde su comprobante, y el
  PRD pide que no tenga que volver a preguntar por WhatsApp.

## Consecuencias

- Adivinar un token de 128 bits es inviable, y el código corto no expone datos aunque se filtre.
- El piloto puede volver a su confirmación desde el historial del navegador.
- **Costo:** hay dos identificadores que mantener y explicar. Es fácil confundirlos al programar
  (por ejemplo, buscar la cita por `code` en la página pública). La prueba de seguridad lo
  verifica explícitamente.
- **Costo:** quien tenga el enlace (por ejemplo, si el piloto lo reenvía) ve la cita. Se acepta,
  porque los datos que se muestran están enmascarados.
