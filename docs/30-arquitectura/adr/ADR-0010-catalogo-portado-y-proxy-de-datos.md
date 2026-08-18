# ADR-0010 — El catálogo se porta como estructura y los datos llegan por HTTP desde un proxy simulado

**Estado:** Aceptado
**Fecha:** 2026-08-18

## Contexto

La interfaz tenía que construirse antes que el backend. En el momento de escribir estas 134
pantallas, el backend del SGTM **no sirve ni una sola operación**: tiene el esquema, el aislamiento
multi-tenant verificado y las barreras de arquitectura, y ninguna funcionalidad de negocio
([`backend/README.md`](../../../backend/README.md)). Esperar no era una opción razonable —el diseño
de referencia ya existe y está aprobado— pero construir contra nada obliga a decidir de dónde salen
los datos que se ven en pantalla.

Hay además un segundo problema, anterior a ese y más caro: **el prototipo declara cada pantalla
como un descriptor de datos donde la estructura y el valor vienen mezclados**. Un campo del
prototipo es `{ label: 'Código de Ref. Catastral', t: 'text', v: '200601010150010101001' }`: la
etiqueta y el tipo son de la interfaz, el valor es del padrón de una municipalidad concreta.

Las dos salidas fáciles son la misma trampa:

1. **Portar el catálogo entero, valores incluidos, y renderizarlo.** Se ve idéntico al prototipo en
   una tarde. Pero entonces ninguna pantalla hace una petición, y el día que el backend exista hay
   que reescribir las 134 para que pidan sus datos.
2. **Escribir las pantallas contra datos importados de un módulo,** con la intención de
   «cambiarlo por `fetch` más adelante». Es la número 1 con otro nombre, y además reparte la
   deuda por 134 archivos.

## Decisión

**Se parte el descriptor del prototipo en dos, y la mitad que es del servidor se pide por HTTP a un
proxy que la contesta hoy y desaparece mañana.**

### 1. La frontera estructura / valor

`frontend/scripts/portar-catalogo.mjs` lee los cinco archivos del prototipo y escribe en dos sitios
distintos:

| Qué | A dónde | Quién manda |
|---|---|---|
| Qué campos hay, qué tipo, qué etiqueta, qué columnas, qué pestañas, qué acciones | `apps/backoffice/src/catalogo/` | La interfaz. Lo sabe sin preguntar |
| Qué dice cada campo, qué filas trae la tabla, cuánto suma cada total, qué código lleva el reporte | `packages/api-mock/src/` | El servidor. Se pide |

Es la misma frontera que [`ADR-0006`](ADR-0006-cuenta-corriente-libro-de-asientos.md) traza en los
datos entre la estructura de un predio y su valor, aplicada a la interfaz.

### 2. Cada pantalla pide sus datos a la operación que declara su catálogo

El prototipo ya asignaba a cada opción una operación del contrato —las 134 son únicas, y de ahí
salió [`sgtm-v1.yaml`](../../50-api/openapi/sgtm-v1.yaml)—. La pantalla pide esa operación con
`solicitar()` de `@sgtm/api-client`, el mismo cliente que usará contra Spring Boot: con su token,
su clave de idempotencia y su conversión de errores a `ProblemDetails`.

### 3. El proxy intercepta en la frontera del transporte, no en la de la aplicación

`instalarProxyDeDatos()` sustituye `fetch`. No es un adaptador que la aplicación elija, ni un modo
«con datos de ejemplo» dentro de los componentes: es una capa por debajo de todo el código de la
interfaz, que devuelve `Response` de verdad, con su código de estado y sus cabeceras.

**Integrar el backend es apagarlo:** `VITE_SGTM_PROXY_DE_DATOS=false` y `SGTM_API` apuntando al
Spring Boot. No hay una segunda ruta de código que mantener.

### 4. El proxy no finge lo que no sabe

No filtra, no ordena, no pagina, no valida y no persiste. Un proxy que fingiera la semántica de
`?uso=Comercio` estaría **inventando un comportamiento que el backend todavía no ha decidido**, y
la interfaz acabaría construida contra esa invención. Filtrar es del servidor: aquí la petición se
hace de verdad y la respuesta es siempre el juego de datos del prototipo.

## Consecuencias

**Positivas**

- Las 134 pantallas hacen peticiones HTTP reales desde el primer día; el camino completo —URL,
  parámetros, token, error, estado de carga— está ejercido y probado.
- Conectar el backend se hace **opción por opción**, sin tocar la interfaz: cuando una operación
  exista de verdad, deja de contestarla el proxy.
- La estructura se dibuja antes de que llegue la respuesta, así que el esqueleto de carga ocupa el
  sitio exacto del dato. Es gratis: la interfaz ya sabía la forma.
- El juego de datos simulado **no se compila en producción**: con la bandera apagada, el
  empaquetador descarta la rama y el paquete no lo incluye.
- Una regla de ESLint prohíbe `fetch` suelto fuera de `@sgtm/api-client`, que es lo que sostiene
  todo lo anterior. Con su muestra que la viola, como el resto (FRO-04 §9).

**Negativas / costos aceptados**

- **Los parámetros de ruta no están resueltos.** `GET /api/v1/rentas/vehiculos/{placa}` se pide con
  un valor de relleno, porque el catálogo describe la operación y no un caso concreto. Conectar
  cada opción a su registro es el paso 4 de [FRO-03 §7](../../60-frontend/mapa-de-pantallas.md), y
  se hace opción por opción.
- **El contrato de respuesta es genérico.** `DatosDePantalla` sirve a las 134 porque las 134
  comparten renderizador. Cuando una operación tenga esquema propio en el contrato, mandará el
  esquema y esta forma quedará como el caso por omisión.
- **Los datos son los del prototipo**, es decir, una municipalidad de ejemplo. No hay volumen real
  con el que medir una tabla de padrón.
- El catálogo generado se versiona en el repositorio (430 KB). Es la alternativa a que `design/`
  sea una entrada del build, que es lo que este proyecto ya decidió no hacer con los tokens.

## Alternativas consideradas

- **MSW (Mock Service Worker).** Hace lo mismo y mejor, con un service worker. Descartada por una
  dependencia más para 130 líneas de encaminamiento cuyo único trabajo es desaparecer.
- **Un servidor de datos de ejemplo aparte**, como el que tiene el SRTM. Descartada por ahora: es
  un proceso más que arrancar para servir constantes, y no ejercita nada que el proxy no ejercite.
  Se reabre si hace falta simular volumen o escrituras con estado.
- **Dejar los valores en el catálogo y no pedir nada.** Descartada: es la opción que hace de la
  integración una reescritura, y es exactamente el problema que este ADR resuelve.
- **Escribir las 134 pantallas a mano.** Descartada antes de empezar, en
  [FRO-03 §2](../../60-frontend/mapa-de-pantallas.md): son 134 archivos que nadie mantiene.

## Enlaces

- [`FRO-01`](../../60-frontend/arquitectura-frontend.md) · [`FRO-03`](../../60-frontend/mapa-de-pantallas.md)
  · [`FRO-04`](../../60-frontend/estandares-de-codigo-frontend.md)
- [`ADR-0009`](ADR-0009-plataforma-frontend.md) · [`sgtm-v1.yaml`](../../50-api/openapi/sgtm-v1.yaml)
- [`design/design_handoff_sgtm_web/README.md`](../../../design/design_handoff_sgtm_web/README.md)
