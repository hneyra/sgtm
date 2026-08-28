import type { IdDeOperacion } from '@sgtm/api-client';

/**
 * **Las dos lecturas que el portal pregunta, y ninguna mas** (#298, ADR-0016 §3).
 *
 * ── Por que una tabla de dos entradas y no `pedirOperacion` ────────────────
 *
 * `pedirOperacion` resuelve la ruta y el verbo leyendo `OPERACIONES`, que es el
 * mapa de **las 169 operaciones del contrato** —84 de ellas de escritura— con su
 * camino y sus parametros. Es lo correcto en el back-office, que sirve las 134
 * opciones; aqui arrastraba al paquete del ciudadano el **inventario completo de
 * la API**: unos 3 KB comprimidos que ademas describen, ruta por ruta, todo lo
 * que el sistema expone. El portal es la aplicacion destinada a ser publica el
 * dia que exista el realm del ciudadano (ADR-0009 §1 y §2), y publicar el mapa
 * de rutas de un sistema tributario no es un coste de kilobytes: es contarle a
 * quien mire el paquete donde esta cada cosa.
 *
 * De modo que aqui se declaran **las dos rutas que se piden** y se llaman con
 * `solicitar()` de `@sgtm/api-client` —la unica puerta por la que sale una
 * peticion, regla del frontend—. Es exactamente lo que ya hacia
 * `ProveedorDeSesion` con `GET /seguridad/sesion/permisos`, y por el mismo
 * motivo.
 *
 * ── Lo que sigue comprobado contra el contrato, y donde ────────────────────
 *
 * La comprobacion no desaparece: **cambia de sitio, de tiempo de ejecucion a
 * tiempo de prueba**. Dos barreras:
 *
 *   1. **Las claves son ids de operacion del contrato** (`satisfies`, aqui
 *      abajo): un `operationId` renombrado en `sgtm-v1.yaml` deja de compilar.
 *      Es un tipo, asi que no pesa un byte en el paquete.
 *   2. **La ruta y el verbo, en `verificaciones/portal-separado.test.ts`**: cada
 *      entrada tiene que cuadrar letra a letra con `OPERACIONES[id].ruta` y su
 *      metodo tiene que ser `GET`. Ahi si se lee el mapa entero —una prueba no
 *      viaja al navegador—.
 */
export const LECTURAS = {
  /** Quien es: el padron de personas, por codigo, DNI o RUC. */
  contribuyentes: '/rentas/contribuyentes',
  /** Lo que debe: la ficha consolidada con su fecha de corte (#25). */
  consulta_unificada: '/consultas/unificada',
} as const satisfies Readonly<Partial<Record<IdDeOperacion, string>>>;
