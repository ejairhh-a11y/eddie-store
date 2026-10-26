# ADR-0005: Cuotas en tiempo real con Redis + WebSocket

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
Las cuotas en vivo cambian cada pocos segundos. Si cada navegador consultara la API
periódicamente, la carga sobre el backend y la base de datos sería alta y los usuarios verían
cuotas desactualizadas.

## Decisión
El worker obtiene las cuotas del proveedor, las guarda en PostgreSQL (historial) y en **Redis**
(valor vigente), y publica cada cambio por **Redis pub/sub**. La API lo reenvía a los navegadores
suscritos mediante **WebSocket (Socket.IO)**, en canales por evento (`odds:event:{id}`).

## Alternativas consideradas
- **Consultas periódicas desde el navegador (polling):** fácil, pero genera muchas peticiones y
  retraso.
- **Server-Sent Events (SSE):** más simple que WebSocket y suficiente para enviar datos al cliente,
  pero Socket.IO aporta reconexión, salas y un adaptador de Redis para escalar.
- **Leer las cuotas siempre desde PostgreSQL:** coherente, pero no soporta esa frecuencia de
  lectura.

## Consecuencias
- **Positivas:** actualizaciones instantáneas; la base de datos no recibe las lecturas de alta
  frecuencia.
- **Negativas:** requiere conexiones persistentes y, con varias réplicas, el adaptador de Redis de
  Socket.IO o *sticky sessions*.
- **Seguridad:** si la última cuota recibida de un evento en vivo tiene más de 60 s, el mercado se
  **suspende automáticamente**; no se aceptan apuestas con datos desactualizados.
