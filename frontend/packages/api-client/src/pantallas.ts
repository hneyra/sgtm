import type { Fecha } from '@sgtm/dominio';
import { pedirOperacion } from './operaciones';
import type { IdDeOperacion, ParametrosDe } from './operaciones.generado';

/**
 * El contrato de datos de una pantalla.
 *
 * Las 134 operaciones del contrato ([`sgtm-v1.yaml`](../../../../docs/50-api/openapi/sgtm-v1.yaml))
 * comparten forma de respuesta porque las 134 pantallas comparten renderizador:
 * un panel de indicadores, una tabla, unos totales, un formulario relleno o una
 * hoja de reporte. Esta es esa forma.
 *
 * **La estructura no viaja por aqui.** Que campos tiene una ficha catastral y
 * en que orden lo sabe la interfaz sin preguntar —es su catalogo, portado del
 * prototipo—. Lo que pide por HTTP es el **valor**: que dice cada campo, que
 * filas trae la tabla, a cuanto asciende cada total. Esa frontera es la que
 * permite apagar el proxy de datos y apuntar al backend sin tocar la interfaz.
 */
export interface DatosDePantalla {
  /**
   * Fecha a la que estan actualizadas las cifras de esta respuesta.
   *
   * Obligatoria, y por eso va primero: no existe «la deuda», existe la deuda a
   * una fecha (regla 9 de CLAUDE.md, RNF-075). Una respuesta sin ella no se
   * puede mostrar honestamente.
   */
  readonly fechaCalculo: Fecha;

  /** Valor de cada campo declarado por el catalogo, por su clave. */
  readonly campos?: Readonly<Record<string, ValorDeCampo>>;

  readonly kpis?: readonly Kpi[];
  readonly paneles?: readonly Panel[];
  readonly tabla?: DatosDeTabla;
  readonly totales?: readonly Total[];
  readonly reporte?: DatosDeReporte;
  /**
   * Que version del registro se esta viendo, y las que hubo antes.
   *
   * Lo trae una pantalla cuyo backend **no sobrescribe**: la ficha catastral
   * (#18). Sin esto, la pantalla ensena un area de 180 m² sin decir que rige
   * desde marzo y que hasta entonces eran 120, y entonces no hay forma de
   * explicar por que la determinacion del ejercicio anterior salio distinta.
   */
  readonly versionado?: DatosDeVersionado;
}

/** Texto en casi todo; booleano en las casillas. */
export type ValorDeCampo = string | boolean;

export interface Kpi {
  readonly label: string;
  /** Ya formateado por el backend: la interfaz no compone cifras (RNF-080). */
  readonly value: string;
  readonly note: string;
}

export interface Panel {
  readonly title: string;
  readonly note: string;
  readonly rows: readonly FilaDePanel[];
}

export interface FilaDePanel {
  readonly label: string;
  readonly sub: string;
  readonly value: string;
  /** Avance en porcentaje, 0-100. Lo calcula el backend, no la barra. */
  readonly pct: number;
}

export interface DatosDeTabla {
  readonly filas: readonly (readonly Celda[])[];
  /**
   * Los valores **crudos** de cada fila: lo que el adaptador leyo del cuerpo,
   * antes de darle formato para dibujarlo.
   *
   * Va en paralelo a `filas` —`valores[i]` es el de `filas[i]`— y es opcional
   * entera: una tabla sin esto se dibuja exactamente como se dibujaba.
   *
   * **Existe porque una celda es texto de presentacion, no un dato.** La tabla
   * de «Baja de deuda» escribe «1,184.00» —con separador de miles— y
   * `new BigDecimal("1,184.00")` del backend lanza; escribe «—» donde no hay
   * dato, y «—» no es un importe; y no dibuja en ninguna columna el
   * `predioId`/`vehiculoId` que identifica la obligacion, porque un
   * identificador interno bajo el rotulo «Unidad» seria ensenar otra cosa. Lo
   * que viaja en el cuerpo de una escritura sale de aqui, no del texto que se
   * pinto (#332).
   */
  readonly valores?: readonly Readonly<Record<string, string>>[];
  /**
   * Lo que **cuelga** de cada fila, para las tablas cuyas filas se despliegan.
   *
   * Va en paralelo a `filas` —`detalles[i]` es el de `filas[i]`— y es opcional
   * entera: una tabla sin esto se dibuja exactamente como se dibujaba. La usa
   * el catalogo territorial, donde de un sector cuelgan sus manzanas (#321).
   *
   * **No lleva ninguna cifra que la interfaz haya compuesto** (RNF-083): lo
   * que se ve aqui es lo que el servidor mando, y lo que el servidor no mande
   * se dice que falta.
   */
  readonly detalles?: readonly DetalleDeFila[];
  /** Texto del conteo tal como lo redacta el backend: «3 vías registradas». */
  readonly conteo?: string;
  /**
   * La pagina que se esta viendo, cuando el backend pagina.
   *
   * Va en la **respuesta** y no en el catalogo porque solo el servidor sabe
   * cuantas filas hay: un padron del manual son cientos de miles, y el cliente
   * no puede saber si hay pagina siguiente sin preguntarselo. Mientras la
   * respuesta no la traiga, no hay paginador que dibujar.
   */
  readonly paginacion?: Paginacion;
}

/**
 * Lo que cuelga de una fila desplegable: sus piezas, y con que clave se abre.
 *
 * `nota` es la mitad honesta de la estructura: cuando el servidor **todavia no
 * publica** lo que cuelga —hoy, las manzanas de un sector: hay `POST` para
 * darlas de alta y ningun `GET` que las liste—, la fila se despliega igual y
 * dice que falta. Un desplegable vacio sin explicacion se lee como «este sector
 * no tiene manzanas», que seria falso.
 */
export interface DetalleDeFila {
  /** El registro de la fila, como lo identifica el backend: el codigo del sector. */
  readonly clave: string;
  readonly titulo: string;
  readonly items: readonly ItemDeDetalle[];
  readonly nota?: string;
}

/** Una pieza de lo que cuelga de una fila: su rotulo y, si el servidor lo cuenta, su conteo. */
export interface ItemDeDetalle {
  readonly texto: string;
  /** Conteo o dato secundario, **tal como llego**: aqui no se suma nada. */
  readonly nota?: string;
}

export interface Paginacion {
  /** La que se esta viendo, **contada desde 0** como la cuenta el backend. */
  readonly pagina: number;
  readonly tamano: number;
  /** Cuantas paginas hay en la busqueda entera. */
  readonly totalPaginas: number;
  /** Si queda alguna despues de esta. */
  readonly hayMas: boolean;
}

/**
 * El sobre en el que el backend manda un listado (`RespuestaPaginada` de #6).
 *
 * Lleva el total y el numero de paginas aunque se puedan deducir: sin ellos la
 * interfaz no puede dibujar «1 de 47» y acaba pidiendo la pagina siguiente para
 * saber si existe.
 */
export interface Paginado<T> {
  readonly contenido: readonly T[];
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
  readonly hayMas: boolean;
}

/** Una celda es texto; si trae `tono`, se pinta como insignia de estado. */
export interface Celda {
  readonly texto: string;
  readonly tono?: TonoDeCelda;
}

export type TonoDeCelda = 'ok' | 'warn' | 'bad';

export interface Total {
  readonly label: string;
  readonly value: string;
}

/**
 * Una version de un registro versionado, con **por que** se escribio.
 *
 * La observacion es la mitad util. Un diff dice que el area paso de 120 a 180;
 * solo la observacion dice que fue una fiscalizacion de campo y no un error de
 * tecleo, y es lo que se lee en voz alta cuando el contribuyente pregunta por
 * que le subio el recibo (regla 10, RNF-052).
 */
export interface Version {
  readonly version: number;
  readonly vigenciaDesde: Fecha;
  /** Nulo mientras rija: una version vigente no tiene fin. */
  readonly vigenciaHasta?: Fecha;
  readonly vigente: boolean;
  readonly origen: string;
  readonly documentoOrigen: string;
  readonly observacion: string;
  /** Quien la registro y cuando. Solo lo trae el historico. */
  readonly usuario?: string;
  readonly registradaEn?: string;
}

export interface DatosDeVersionado {
  /** La que se esta viendo. Siempre. */
  readonly actual: Version;
  /**
   * Las demas, cuando se piden.
   *
   * Ausente no es lo mismo que vacia: ausente significa «no se pidio», y vacia
   * significaria «no hay ninguna», que no puede pasar —toda ficha tiene al menos
   * la suya—.
   */
  readonly historico?: readonly Version[];
}

export interface DatosDeReporte {
  readonly code: string;
  readonly date: string;
  readonly meta: readonly { readonly k: string; readonly v: string }[];
  readonly filas: readonly (readonly string[])[];
  readonly footer: string;
}

/**
 * Pide los datos de una pantalla a **su operacion del contrato**.
 *
 * El identificador de la opcion del catalogo es el `operationId` del contrato
 * —`catalogo.test.ts` lo verifica para las 134—, asi que el verbo, el camino y
 * que parametros admite salen de ahi y no de una cadena que esta funcion tenga
 * que interpretar.
 *
 * Ya no existe el parametro de relleno. Antes, `GET /rentas/vehiculos/{placa}`
 * se pedia con la cadena `ejemplo` y la pantalla parecia funcionar mientras
 * mostraba un registro inventado; ahora, sin placa no hay peticion. Quien la
 * trae es la ruta: `/rentas/vehiculos/ABC-123`.
 *
 * El cuerpo se tipa como `DatosDePantalla` porque es lo que responden las 134
 * operaciones mientras comparten renderizador; el contrato todavia no describe
 * el recurso de ninguna, y la opcion que ya no quepa aqui se conecta por su
 * propia operacion tipada y su adaptador.
 */
export function pedirDatosDePantalla(
  operacion: IdDeOperacion,
  parametros: Readonly<Record<string, string>>,
  senal?: AbortSignal,
): Promise<DatosDePantalla> {
  return pedirOperacion(
    operacion,
    parametros as ParametrosDe<IdDeOperacion>,
    senal,
  ) as Promise<unknown> as Promise<DatosDePantalla>;
}
