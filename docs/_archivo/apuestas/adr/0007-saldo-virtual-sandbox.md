# ADR-0007: Saldo virtual y pagos en modo sandbox

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
Operar apuestas con dinero real exige licencia de juego, verificación de identidad (KYC),
prevención de lavado de dinero y cumplir la regulación de cada país. Nada de esto es viable ni
necesario en un proyecto académico, pero el flujo de pagos sí forma parte del diseño que se evalúa.

## Decisión
La plataforma opera con **saldo virtual**. Los depósitos y retiros usan una pasarela real (Stripe o
Mercado Pago) en **modo de prueba (sandbox)**, con tarjetas de prueba y webhooks firmados. Se
mantienen la verificación de edad (+18) y las herramientas de juego responsable.

## Alternativas consideradas
- **Dinero real:** descartado por requisitos legales y éticos.
- **Saldo ficticio sin pasarela:** más simple, pero deja sin diseñar ni probar el flujo de pagos y
  los webhooks.

## Consecuencias
- **Positivas:** sin riesgo legal ni financiero; se prueba la integración completa de pagos.
- **Negativas:** no se validan un KYC completo ni un antifraude reales.
- **Futuro:** operar con dinero real requeriría un nuevo ADR sobre cumplimiento regulatorio,
  KYC/AML y un proveedor de pagos autorizado para juego.
