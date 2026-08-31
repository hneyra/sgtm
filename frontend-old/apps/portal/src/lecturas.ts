import type { IdDeOperacion } from '@sgtm/api-client';

/**
 * **La unica lectura que el portal pregunta** (#57, ADR-0020).
 *
 * ── De dos a una, y sin ningun parametro ───────────────────────────────────
 *
 * Hasta aqui eran dos: `GET /rentas/contribuyentes` con el documento tecleado, y
 * `GET /consultas/unificada` con el codigo que aquella devolviera. Las dos son
 * **endpoints de funcionario**, y el token del ciudadano no autentica en ellas:
 * la cadena general del backend valida contra el emisor del realm de
 * funcionarios, asi que desde el portal darian 401.
 *
 * Las sustituye `GET /portal/situacion`, que **no tiene ni un parametro**: el
 * sujeto sale del claim `numero_documento` del token del realm del ciudadano y
 * el servidor recorre el registro de municipalidades, compone y suma (RNF-083).
 * Una sola ida y vuelta, y una sola fecha de corte para todo.
 *
 * ── Por que una tabla y no `pedirOperacion` ────────────────────────────────
 *
 * `pedirOperacion` resuelve la ruta y el verbo leyendo `OPERACIONES`, que es el
 * mapa de las **176 operaciones del contrato** —84 de ellas de escritura— con su
 * camino y sus parametros. Es lo correcto en el back-office, que sirve las 134
 * opciones; aqui arrastraba al paquete del ciudadano el **inventario completo de
 * la API**, que ademas describe ruta por ruta todo lo que el sistema expone. El
 * portal es la aplicacion publica, y publicar el mapa de rutas de un sistema
 * tributario no es un coste de kilobytes: es contarle a quien mire el paquete
 * donde esta cada cosa.
 *
 * De modo que aqui se declara **la ruta que se pide** y se llama con
 * `solicitar()` de `@sgtm/api-client` —la unica puerta por la que sale una
 * peticion, regla del frontend—.
 *
 * ── Lo que sigue comprobado contra el contrato, y donde ────────────────────
 *
 * Dos barreras, y ninguna viaja al navegador:
 *
 *   1. **Las claves son ids de operacion del contrato** (`satisfies`, aqui
 *      abajo): un `operationId` renombrado en `sgtm-v1.yaml` deja de compilar.
 *   2. **La ruta y el verbo, en `verificaciones/portal-separado.test.ts`**: cada
 *      entrada tiene que cuadrar letra a letra con `OPERACIONES[id].ruta` y su
 *      metodo tiene que ser `GET`. Ahi si se lee el mapa entero —una prueba no
 *      viaja al navegador—.
 */
export const LECTURAS = {
  /** Lo que debe y tiene, en todas las municipalidades donde figure. */
  portal_mi_situacion: '/portal/situacion',
} as const satisfies Readonly<Partial<Record<IdDeOperacion, string>>>;
