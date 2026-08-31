import { descriptorDe } from '@sgtm/api-client';
import type { IdDeOperacion } from '@sgtm/api-client';
import { operacionDe } from './busqueda';
import { OPCIONES_QUE_ESCRIBEN } from './escrituras';

/**
 * **La tercera puerta: la lectura que viaja por `POST` y no escribe nada**
 * (#424, sobre el hallazgo de #396).
 *
 * ── Por que hacia falta una tercera ────────────────────────────────────────
 *
 * El frontend tenia **dos** puertas para un `POST`, y las dos rechazan al
 * emisor de reportes de transito:
 *
 *   - **`useEscritura`** exige observacion del usuario antes de habilitar la
 *     accion (regla 10, RNF-052). Este emisor **no modifica nada**: pedirle una
 *     observacion seria mentir sobre lo que hace, y ademas dejaria en la
 *     auditoria una fila por cada hoja mirada.
 *   - **`useSimulacion`** tiene por guarda que el cuerpo declare
 *     `simulacion: true`, y `PeticionDeReporteDeTransito` **no puede declararla
 *     sin mentir**: no simula un calculo, compone una hoja.
 *
 * Y una `Conexion` tampoco sirve: `useDatosDeOperacion` mira los parametros que
 * faltan, no el verbo, asi que se disparara **al abrir la pantalla** —sin tipo
 * de reporte elegido, que es un 422 antes de que nadie toque nada—.
 *
 * No es un caso raro sino una forma legitima: **una lectura cuyo criterio no
 * cabe en una URL**. El contrato ya la declara asi, y no por capricho —un
 * reporte con quince tipos y doce criterios compuestos es justo lo que un `GET`
 * no sabe llevar—.
 *
 * ── La guarda, y por que el verbo va por delante de la lista ───────────────
 *
 * Este archivo declara **que operaciones** son lecturas por `POST`. La
 * declaracion sola no basta —cualquiera puede escribir una linea—, asi que
 * {@link porQueNoEsLectura} la comprueba contra las dos unicas cosas que el
 * frontend sabe de verdad de una operacion:
 *
 *   1. **el verbo del contrato**, primero. `GET` no entra —esa ya tiene su
 *      camino, el comun—, y `PATCH`/`PUT`/`DELETE` tampoco: esos verbos **son**
 *      modificacion por definicion, y ninguna prosa los convierte en lectura.
 *      Solo `POST` es ambiguo, y por eso es el unico que llega a la segunda.
 *   2. **si alguna opcion la declara como su escritura** (`escrituras.ts`), que
 *      es la unica evidencia mecanica de que ese `POST` si guarda algo.
 *
 * El orden **es** la prueba, igual que en el escaner del portal
 * (`verificaciones/portal-separado.test.ts`, #298): con la lista por delante,
 * declarar aqui una operacion de escritura fallaria por «falta la que la
 * estrena» —«la lista cambio»— y nunca por lo que esto existe para decir. Con
 * el verbo delante, el motivo lo nombra.
 *
 * ── Lo que esta puerta **no** relaja ───────────────────────────────────────
 *
 * La negacion por omision sigue igual que en `escrituras.ts` y en
 * `conexiones.ts`: una opcion que no este aqui no puede pedir por `POST` de
 * ninguna forma. Y la que este **no gana** con ello ningun permiso para
 * escribir: si su operacion guardara algo, la guarda la rechaza.
 */
export interface LecturaPorPost {
  /** La operacion del contrato que se pide. */
  readonly operacion: IdDeOperacion;
  /**
   * Su ruta, **escrita a mano**, para que la prueba la compare letra a letra.
   *
   * Es la mitad que el tipo no puede sostener —`operacion` ya esta atada al
   * contrato por `IdDeOperacion`, pero la ruta no—, y es el precedente exacto
   * de `LECTURAS` en `apps/portal/src/lecturas.ts`: si el contrato mueve la
   * ruta, esto se pone rojo en vez de seguir describiendo un endpoint que ya no
   * esta ahi.
   */
  readonly ruta: string;
}

/**
 * Las opciones que leen por `POST`, por su identificador del catalogo.
 *
 * **Una hoy**, y la lista crece opcion por opcion, igual que `CONEXIONES`.
 *
 * **Dos desde #428.** `adm_reportes` entra con el mismo mecanismo, y lo que la
 * tenia fuera no era la puerta: su desplegable ofrece diez tipos de reporte y
 * `ReportesAdministrativosController` implementa tres. Conectarla sin mas
 * dejaria siete elecciones que contestan 422 con el boton encendido, asi que su
 * componente **ofrece solo los tres** y de los otros siete dice donde estan
 * —cinco son otra opcion del catalogo, dos no las sirve nadie—. Ver
 * `sanciones/EmisorDeReportesAdministrativos.tsx`.
 */
const LECTURAS_POR_POST: Readonly<Record<string, LecturaPorPost>> = {
  /**
   * El emisor de reportes de transito (#396, RF-068, RF-073, RF-074): nueve
   * hojas tras una sola peticion, con el tipo de reporte y sus criterios en el
   * cuerpo.
   */
  transito_reportes: { operacion: 'transito_reportes', ruta: '/transito/reportes' },
  /**
   * El emisor de reportes de infracciones administrativas (#53, #428): tres
   * hojas de las diez que el desplegable del manual ofrece, y las otras siete
   * con donde estan.
   */
  adm_reportes: { operacion: 'adm_reportes', ruta: '/infracciones/administrativas/reportes' },
  /**
   * Los dos padrones de Autorizaciones y licencias (#51, #54, #427). Mismo
   * caso: un `POST` que solo lee —`ConsultaDeAnuncios.padron` y
   * `ConsultaDeLicencias.padron`—, con doce criterios en el cuerpo y una
   * respuesta que no es un sobre paginado. Ver
   * `licencias/EmisorDePadron.tsx`.
   */

  anuncios_reportes: { operacion: 'anuncios_reportes', ruta: '/autorizaciones/anuncios/reportes' },
  licencia_padron: {
    operacion: 'licencia_padron',
    ruta: '/licencias/funcionamiento/reportes/padron',
  },
};

/** Lo que declara esa opcion, o nada. `Object.hasOwn`, como el resto del camino. */
export const lecturaPorPostDe = (opcion: string): LecturaPorPost | undefined =>
  Object.hasOwn(LECTURAS_POR_POST, opcion) ? LECTURAS_POR_POST[opcion] : undefined;

/** Las opciones que leen por `POST`. El censo de actos y el escaner las miran. */
export const OPCIONES_QUE_LEEN_POR_POST = Object.keys(LECTURAS_POR_POST);

/** La declaracion de cada una, para que el escaner pueda comprobarla. */
export const LECTURAS_POR_POST_DECLARADAS: readonly (readonly [string, LecturaPorPost])[] =
  Object.entries(LECTURAS_POR_POST);

/**
 * Por que esa operacion **no** puede viajar por esta puerta, o nada si puede.
 *
 * Devuelve el motivo redactado —no un booleano— porque los dos motivos posibles
 * piden correcciones opuestas: un `GET` se pide por el camino comun y un `POST`
 * que guarda se manda por `useEscritura`, con su observacion. Un `false` a
 * secas dejaria a quien lo lea sin saber cual de las dos.
 *
 * **El verbo primero.** Ver el docblock de arriba: el orden es lo que hace que
 * el motivo nombre el metodo en vez de decir solo que la ruta no esta.
 */
export function porQueNoEsLectura(operacion: IdDeOperacion): string | undefined {
  const { metodo } = descriptorDe(operacion);
  if (metodo === 'GET') {
    return `«${operacion}» es un GET: se pide por el camino comun, no por esta puerta.`;
  }
  if (metodo !== 'POST') {
    return `«${operacion}» es un ${metodo}, y ${metodo} escribe por definicion: se manda por «useEscritura», con su observacion (regla 10, RNF-052).`;
  }
  const laEscribe = OPCIONES_QUE_ESCRIBEN.find((opcion) => operacionDe(opcion) === operacion);
  if (laEscribe !== undefined) {
    return `«${operacion}» escribe: su POST lo declara «${laEscribe}» en «escrituras.ts», con su observacion (regla 10, RNF-052). Una operacion que guarda no puede ademas ser lectura.`;
  }
  return undefined;
}
