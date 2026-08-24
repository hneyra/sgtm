import type { CampoDelCuerpo } from './escritura';

/**
 * Que puede escribir cada opcion, declarado una a una.
 *
 * Es la puerta lateral de la escritura, gemela de `conexiones.ts`: mientras una
 * opcion no esta aqui, su formulario **no se puede escribir** y su accion manda
 * solo la observacion. Esa es la posicion por omision a proposito —negacion por
 * omision, como la autorizacion del manual—: una pantalla que dibuja campos que
 * el backend no acepta no puede mandarlos por descuido, tiene que declararlos.
 *
 * Dos nombres por campo porque son dos vocabularios: la clave del catalogo sale
 * del prototipo (`cambiarAlAno`, de «Cambiar al año») y el nombre del cuerpo lo
 * declara el backend (`ejercicio`). Ninguno cede; la traduccion vive aqui.
 */
export interface EscrituraDeclarada {
  /** Clave del catalogo → como viaja en el cuerpo. Lo que no este aqui no viaja. */
  readonly campos: Readonly<Record<string, CampoDelCuerpo>>;
  /** Lo guardado cambia el ejercicio de trabajo de la sesion, no solo esta pantalla. */
  readonly cambiaElEjercicio?: boolean;
  /** Aviso que la pantalla muestra antes del formulario, si hace falta explicar algo. */
  readonly nota?: string;
}

/**
 * «Concepto/tributo» del prototipo → el codigo corto que ya usa `determinacion`
 * (`CHECK` de `V2__rentas_y_cuenta_corriente.sql`): `PREDIAL`, `ARBITRIO`,
 * `VEHICULAR`, `ALCABALA`, `ESPECTACULOS`, `ANUNCIOS`, `JUEGOS`.
 *
 * Solo cuatro de las siete opciones del catalogo tienen ese codigo. Las otras
 * tres —«MULTA TRIBUTARIA», «MULTA ADMINISTRATIVA», «DERECHOS
 * ADMINISTRATIVOS»— no son parte del vocabulario de `tributo` en ningun sitio
 * del sistema todavia, y una de ellas ni siquiera entra en las 20 posiciones
 * de la columna (`DERECHOS_ADMINISTRATIVOS` son 24). Inventar un codigo aqui
 * seria una decision de negocio que no le toca a esta pantalla: se devuelve
 * `undefined` y el campo no viaja, igual que si no se hubiera llenado.
 */
const TRIBUTO_DEL_BACKEND: Readonly<Record<string, string>> = {
  'IMPUESTO PREDIAL': 'PREDIAL',
  'ARBITRIOS MUNICIPALES': 'ARBITRIO',
  'PATRIMONIO VEHICULAR': 'VEHICULAR',
  ALCABALA: 'ALCABALA',
};

const tributoDe = (texto: string): string | undefined => TRIBUTO_DEL_BACKEND[texto];

const ESCRITURAS: Readonly<Record<string, EscrituraDeclarada>> = {
  /**
   * Cambiar el año de trabajo.
   *
   * De los cinco campos que dibuja la pantalla viaja **uno**: el ejercicio al
   * que se cambia. Los otros cuatro —año actual, ejercicio contable abierto,
   * ultimo cierre, advertencia— los pinta el servidor, y mandarlos de vuelta
   * seria dejar que el cliente decida lo que el servidor ya sabe.
   */
  cambiar_anio: {
    campos: { cambiarAlAno: { campo: 'ejercicio', entero: true } },
    cambiaElEjercicio: true,
  },

  /**
   * Cambiar contrasena. **Ningun campo viaja, y esa ausencia es la funcion.**
   *
   * El backend no acepta ninguna contrasena: su cuerpo es solo la observacion,
   * y lo que devuelve es a donde tiene que ir la interfaz —el proveedor de
   * identidad (ADR-0005)—. Con la lista blanca vacia, los tres campos de clave
   * que el prototipo dibuja no se pueden escribir, asi que el valor no llega al
   * estado de React, ni a la cache de consultas, ni a la URL, ni a ningun
   * almacenamiento: no existe.
   */
  cambiar_clave: {
    campos: {},
    nota: 'La contraseña no se escribe aquí y el sistema no la recibe: el cambio lo hace el proveedor de identidad. Al aceptar, queda registrado quién lo pidió y por qué, y se continúa allí.',
  },

  /**
   * Alta de deuda (RF-043, #24, #73): incorpora manualmente una obligacion a la cuenta corriente.
   *
   * `unidadPredioPlaca` no viaja: el backend pide `predioId`/`vehiculoId` como identificador
   * interno, y esta pantalla no resuelve todavia un codigo o una placa contra ese identificador
   * (esa resolucion es la misma que le falta a `transferencia_predio`/`transferencia_vehiculo`).
   * El alta queda a nivel de contribuyente, sin atar la obligacion a una unidad concreta.
   *
   * `cuotaHasta` tampoco viaja: `PeticionDeMovimiento` solo admite una `cuota` entera, no un
   * rango — se toma `cuotaDesde` como la cuota unica de esta alta.
   *
   * `documentoQueSustenta` (el tipo de documento) no tiene campo propio en el backend: el unico
   * campo de documento es `documentoOrigen`, que se llena con `nDelDocumento`. `motivoDelAlta`
   * tampoco viaja: es la misma observacion obligatoria que ya pide `useEscritura`, no un campo
   * aparte.
   */
  alta_deuda: {
    campos: {
      codContribuyente: { campo: 'codContribuyente' },
      conceptoTributo: { campo: 'tributo', valor: tributoDe },
      ano: { campo: 'ano' },
      cuotaDesde: { campo: 'cuota', entero: true },
      insolutoS: { campo: 'insoluto' },
      reajusteS: { campo: 'reajuste' },
      interesS: { campo: 'interes' },
      gastosS: { campo: 'gasto' },
      fechaDeVencimiento: { campo: 'fechaValor' },
      nDelDocumento: { campo: 'documentoOrigen' },
    },
    nota: 'Solo se admiten los tributos con código establecido: predial, arbitrios, vehicular y alcabala. La unidad (predio o placa) y el rango de cuotas todavía no se resuelven aquí: el alta queda a nivel de contribuyente y con una sola cuota.',
  },
};

export const escrituraDe = (opcion: string): EscrituraDeclarada | undefined => ESCRITURAS[opcion];

/** Las opciones que declaran escritura. La prueba de la lista blanca las mira. */
export const OPCIONES_QUE_ESCRIBEN = Object.keys(ESCRITURAS);
