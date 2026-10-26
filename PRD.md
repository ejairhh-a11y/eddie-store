---
title: "Eddie Store — Yamaha Motocross"
---

# PRD: Eddie Store — Yamaha Motocross

## Problema

Quien quiere comprar una moto de motocross Yamaha hoy pregunta precio y disponibilidad por
WhatsApp y muchas veces tiene que ir al concesionario sin saber si la moto sigue disponible. Pierde
tiempo en idas y vueltas y en esperar respuestas, antes incluso de decidir si le interesa.

- **Encuadre:** dolor concreto. El costo es tiempo perdido en consultas y visitas presenciales
  que podrían evitarse.
- **Contexto:** Eddie Store es un concesionario oficial Yamaha **ficticio**, creado para el
  proyecto integrador del curso. El diseño visual sale de Google Stitch (`stitch-eddie-store/`).

## Usuario objetivo

**Un solo perfil: el piloto amateur adulto.** Corre por hobby o en competiciones regionales y
compra su moto con su propio dinero.

- **Momento de uso:** fuera del horario del concesionario (de noche o el fin de semana), cuando
  nadie le contesta el WhatsApp.
- **Herramienta actual:** WhatsApp del concesionario para preguntar precio y stock, y después
  la visita presencial.
- **Usuario secundario (operativo):** el personal del concesionario, que usa el panel de
  administración para ver citas y actualizar stock. No es el foco del producto, pero sin él el
  stock no se mantiene real.

## Objetivo / resultado esperado

En **menos de 5 minutos**, y sin escribir por WhatsApp, el piloto sabe el precio de la moto, si
hay stock, y deja **agendada una cita** en el concesionario para comprarla.

- Tipo de resultado: **tarea completada**.
- **No hay pago en línea:** la compra se cierra en persona, en la cita.

## Alcance (qué sí incluye esta versión)

- **Catálogo** de los 6 modelos de la gama YZ desde la base de datos (**YZ450F, YZ250F, YZ250,
  YZ125, YZ85 y YZ65**), con filtros (4 tiempos, 2 tiempos, Youth y cilindrada) y estado de stock
  real: disponible, últimas unidades o agotada.
- **Ficha de cada modelo:** precio, especificaciones técnicas, galería y stock, a partir de la
  plantilla de la ficha YZ450F de Stitch.
- **Simulador de financiación** informativo: entrada inicial y plazo (24, 36, 48 o 60 meses),
  sistema francés con TIN 5,95 % sin comisiones. Muestra la cuota mensual, el capital
  financiado, el total a pagar y la **TAE calculada** (≈ 6,11 %). Todas las cifras salen de la
  fórmula, ninguna está escrita a mano. No solicita crédito ni cobra nada.
- **Agendar cita:** formulario con nombre, email, teléfono, moto elegida, día y hora. Se guarda en
  la base de datos, no admite dos citas en la misma franja y aparta 1 unidad de stock. Reutiliza
  el diseño del checkout de Stitch.
- **Confirmación:** pantalla con código de cita y botón que abre WhatsApp con un mensaje ya
  escrito (moto, día, hora y código). El número es **ficticio de demostración**
  (+34 600 000 000) y se configura por variable de entorno, sin tocar código.
- **Panel de administración mínimo**, protegido con autenticación: lista de citas (marcar como
  vendida o cancelada, con las citas vencidas resaltadas) y ajuste de stock por modelo. Stitch
  no tiene diseño para el panel: se construye con los **tokens del design system** (colores,
  tipografía, espaciados y componentes del sitio) y se documenta en `Design.md`.

## No alcance (qué explícitamente no incluye esta versión)

- **Pago en línea de ningún tipo:** ni tarjeta, ni transferencia, ni señal o reserva pagada. La
  compra se cierra en el concesionario. Las pantallas de pago y checkout de Stitch se adaptan a
  "simulador" y "agendar cita", no a cobrar.
- **Cuentas de usuario y login para el piloto:** agenda solo con nombre, email y teléfono. El
  único login es el del panel de administración.
- **Secciones "Accesorios & GYTR", "Concesionario & Taller" y "Comparar":** no tienen diseño y
  **se ocultan del menú** en la v1.
- **Aprobación real de crédito:** el simulador solo muestra la cuota estimada, no evalúa al
  cliente.
- **Emails automáticos**, ni al piloto ni al concesionario: la confirmación es en pantalla más
  el enlace de WhatsApp. Sin servicio de email no hay claves de API ni riesgo de spam.
- **Comisiones de financiación:** el simulador no tiene comisión de apertura ni seguro.
- **Varias sedes:** hay un solo concesionario con una sola agenda.

## Criterios de éxito

- **Métrica principal (tiempo de tarea):** un piloto que entra por primera vez agenda su cita
  (catálogo → ficha → cita → confirmación) en **menos de 5 minutos y sin ayuda**. Lo verifica el
  test E2E de Playwright sobre ese flujo.
- **Stock coherente:** el stock mostrado coincide siempre con la base de datos. Agendar una moto
  agotada es imposible: 0 citas creadas sobre stock 0.
- **Sin citas duplicadas:** 0 franjas horarias con más de una cita, también con peticiones
  simultáneas.
- **Simulador exacto:** la cuota coincide con la fórmula del sistema francés (TIN 5,95 %) con
  una tolerancia de ±0,01 €, comprobado con tests unitarios sobre al menos 3 combinaciones de
  entrada y plazo.
- **Rendimiento:** catálogo y ficha con LCP menor a 2,5 s en Lighthouse móvil, sobre el deploy
  público.
- **Móvil y accesibilidad:** el flujo completo se puede usar en un ancho de 375 px y obtiene
  Lighthouse Accessibility de 90 o más.
- **Anti-métrica:** **no** se mide el número total de visitas. Más tráfico no significa que el
  piloto haya ahorrado tiempo.

## Casos borde a contemplar

- **Apartado de stock:** al agendar se aparta 1 unidad del modelo. Si el admin cancela la cita,
  la unidad se libera. Si la marca como vendida, se descuenta definitivamente.
- **El piloto no se presenta:** si pasa el día de la cita y sigue pendiente, la unidad **vuelve
  a contarse como disponible automáticamente** (el stock disponible solo descuenta las citas
  pendientes con fecha futura). El panel resalta esas citas vencidas para que el admin las
  cierre.
- **Dos pilotos, mismo horario:** si dos personas confirman la misma franja a la vez, solo una lo
  consigue. La otra ve "horario ya ocupado" y las franjas libres más cercanas.
- **Última unidad:** si dos pilotos intentan agendar la última unidad al mismo tiempo, solo uno
  la aparta. La otra persona ve la moto como agotada.
- **Moto agotada:** la ficha muestra "Agotada", el botón de agendar queda desactivado y se
  sugieren modelos similares con stock.
- **Abandona a la mitad:** si cierra la página antes de confirmar, no se guarda nada y no se
  aparta stock.
- **Datos inválidos:** email o teléfono mal formados, fechas pasadas, domingos o fuera de
  horario. Se validan en el cliente y en el servidor, con mensajes claros.
- **Horario de citas:** lunes a sábado, de 10:00 a 19:00, con franjas de 1 hora y una cita por
  franja: **9 franjas por día** (inicios de 10:00 a 18:00; la última termina a las 19:00).

## Supuestos y riesgos abiertos

**Supuestos**

- El piloto **prefiere el autoservicio** (ver precio, stock y agendar en la web) antes que
  preguntar por WhatsApp. Si es falso, el producto pierde sentido.
- **Precios y TIN fijos:** precios en euros con IVA incluido y TIN 5,95 % sin comisiones, igual
  para todos los plazos y sin tasas según el perfil del cliente. La TAE se calcula a partir
  del TIN (≈ 6,11 %).
- **Un solo concesionario**, en **Madrid** (Polígono Motorsport, Box 14).
- **Datos ficticios:** precios, especificaciones y stock son de demostración, inspirados en la
  gama Yamaha YZ 2025. Precio oficial de la YZ450F: **10.499 €**.

**Riesgos**

- **Imágenes de Stitch caducan:** las 27 imágenes están en `lh3.googleusercontent.com`. Si no se
  descargan a `/public`, el sitio publicado puede quedarse sin imágenes. El logo solo existe como
  screenshot.
- **Uso de marca Yamaha:** logos y nombres de una marca real en un proyecto ficticio. Mitigación:
  aviso visible de "proyecto académico, sin afiliación con Yamaha Motor".
- **Inconsistencias del diseño de Stitch:** 3 precios distintos para la YZ450F (10.499 €,
  10.799 €, 11.199 €), sede en Barcelona y Madrid, y "0% TAE" frente a "TAE 6,90 %".
  Además, la cuota de ejemplo del diseño (189,45 €) no coincide con la fórmula en ningún plazo.
  Resolución: sede en Madrid; TIN 5,95 % con TAE calculada (≈ 6,11 %) en lugar del 6,90 % del
  diseño; YZ450F a 10.499 €; se quita el "0% TAE" del banner; todas las cifras del simulador
  salen de la fórmula.
- **Panel de admin expuesto:** una contraseña débil permitiría manipular stock y citas. Requiere
  autenticación robusta, límite de intentos y secretos fuera del repositorio.
- **Desvío del diseño:** convertir el checkout en "agendar cita" y el pago en "simulador" obliga
  a cambiar textos (por ejemplo "Transacción encriptada", "Pago al contado"). Se mantiene la
  estructura visual, pero el copy de esas pantallas cambia.
