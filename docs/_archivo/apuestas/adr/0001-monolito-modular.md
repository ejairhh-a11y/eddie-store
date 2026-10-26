# ADR-0001: Monolito modular con worker separado

- **Estado:** Propuesto
- **Fecha:** 2026-09-22

## Contexto
El sistema tiene dominios bien diferenciados (usuarios, billetera, cuotas, apuestas, liquidación y
admin), pero el equipo es pequeño, el plazo es el de un curso y la carga esperada es baja. Hay tareas
que no deben bloquear las peticiones HTTP: ingesta de cuotas, liquidación y notificaciones.

## Decisión
Construir **un único backend (monolito) dividido en módulos** con límites explícitos, y un
**proceso worker separado** —con el mismo código base— para los trabajos en segundo plano,
coordinados mediante una cola (BullMQ sobre Redis).

## Alternativas consideradas
- **Microservicios:** permiten escalar cada parte por separado, pero añaden red, despliegues
  múltiples, consistencia distribuida y observabilidad compleja. Es excesivo para el alcance.
- **Monolito sin worker:** más simple, pero la liquidación y la ingesta competirían con las
  peticiones de los usuarios, y un fallo en ellas degradaría la API.

## Consecuencias
- **Positivas:** un solo repositorio y despliegue; transacciones locales entre módulos (clave para
  el dinero); desarrollo y depuración más rápidos.
- **Negativas:** todo el backend escala junto; un error grave puede afectar a todos los módulos.
- **Mitigación:** los módulos solo se comunican por interfaces públicas (sin acceder a tablas
  ajenas), de modo que se puedan extraer como servicios en el futuro.
