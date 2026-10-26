# ADR 0009: Estado del flujo en la URL y cálculo de financiación compartido

## Estado

Aceptado

## Contexto

El recorrido del piloto cruza varias páginas (Design.md §4.1): ficha → simulador (opcional) →
cita → confirmación. Hay que transportar la **moto elegida** y, si simuló, la **entrada** y el
**plazo**. El header tiene el indicador "Mi cita" (Design.md §3). El PRD pide que la cuota
coincida con la fórmula francesa con ±0,01 € y que no haya ninguna cifra escrita a mano.

## Decisión

- El estado del flujo viaja en la **URL**: `/financiacion?moto=yz450f&entrada=2000&plazo=36` →
  `/cita?moto=yz450f&entrada=2000&plazo=36`. Los filtros del catálogo también: `/?tipo=4t&cc=450`.
- El servidor **valida y normaliza** esos parámetros con Zod (ADR 0007). Un parámetro inválido se
  descarta y se usa el valor por defecto, nunca produce un error 500.
- El simulador es una **función pura** `calcularCuota({ precio, entrada, plazo, tin })` en
  `src/lib/finance.ts`:
  - corre en el **cliente** para responder al instante al mover el slider;
  - la **misma función** corre en el **servidor** al crear la cita, para guardar una cuota que
    no se puede manipular desde el navegador.
- Se calcula con **céntimos enteros** (sin `float` para dinero), con redondeo al céntimo solo al
  final. La TAE sale de `(1 + TIN/12)^12 − 1`.
- "Mi cita" muestra el indicador cuando la URL actual tiene `moto`, y enlaza a `/cita` con esos
  parámetros.

## Alternativas consideradas

- **localStorage**: la moto elegida persiste entre visitas y "Mi cita" funciona al volver otro
  día. Se descartó porque es un estado invisible para el servidor, con hidratación asimétrica
  (parpadeo del indicador), y porque no se puede compartir un enlace.
- **Cookie**: el servidor la leería para renderizar "Mi cita" sin parpadeo. Se descartó porque
  agrega estado de sesión que el PRD no necesita y otra cookie que justificar en la política de
  privacidad.

## Consecuencias

- Un enlace se puede compartir o guardar ("mira esta cuota") y el botón atrás funciona como se
  espera.
- El simulador se puede probar con tests unitarios sin navegador: es el criterio "simulador
  exacto" del PRD.
- **Costo:** "Mi cita" no recuerda la moto si el piloto vuelve al catálogo sin parámetros u otro
  día. El indicador solo refleja el flujo en curso. `Design.md` §3 se ajusta en consecuencia.
- **Costo:** los parámetros de la URL son manipulables. Por eso el servidor nunca confía en ellos
  para precio ni cuota: el precio sale de la base de datos y la cuota se recalcula.
