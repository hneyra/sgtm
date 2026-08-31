/**
 * El catalogo: la ESTRUCTURA de las 134 pantallas del manual.
 *
 * Es lo que la interfaz sabe sin preguntarle a nadie —que campos tiene una
 * ficha catastral, en que orden, con que etiquetas— y viene portado del
 * prototipo por `scripts/portar-catalogo.mjs`. Los **valores** no estan aqui:
 * llegan de la API (`DatosDePantalla` en `@sgtm/api-client`).
 *
 * Los textos son definitivos: etiquetas, titulos y nombres de opcion vienen del
 * manual y no se reescriben (FRO-03 §2, RNF-080).
 */

/**
 * La accion primaria de un modulo: el acto con el que se empieza a trabajar en
 * el, que el panel lateral ensena como boton destacado encima de los destinos
 * (#498 F2).
 */
export interface AccionPrimariaDeModulo {
  /** La opcion que la abre. Trae su id y **su permiso**. */
  readonly opcion: string;
  /** Lo que hace el acto, no como se llama la pantalla que lo aloja. */
  readonly label: string;
}

export interface ModuloDelCatalogo {
  /** Segmento de la ruta: `rentas-registro`. */
  readonly id: string;
  /** Nombre del manual: `Rentas · Registro`. */
  readonly label: string;
  /** Trazos del icono de linea, viewBox 24x24 (FRO-03 §3). */
  readonly icono: readonly string[];
  /**
   * Los bloques que este modulo usa, en orden: grupos por tarea si el modulo
   * los tiene disenados (ADR-0014 §4), y si no los bloques de FRO-03 §4.
   */
  readonly bloques: readonly string[];
  /**
   * Los bloques que el menu **pliega**: en vez de listar sus opciones una a
   * una, ensena **una** entrada que abre la primera que el usuario pueda ver
   * (ADR-0014 §5). Un modulo puede plegar varios —Catastro pliega Territorio y
   * Valuacion—, y un bloque se pliega cuando su superficie ya sabe navegar
   * entre sus opciones.
   *
   * Sale de la tabla del portador, no de una lista cableada en un componente.
   * Las opciones plegadas conservan su id, su ruta y su permiso: plegar es
   * composicion de navegacion, no una pantalla que las absorba.
   */
  readonly bloquesPlegados?: readonly string[];
  /**
   * El bloque que **ademas** lleva carril: el centro de reportes (ADR-0014 §5),
   * que lista sus hojas al lado de la que se esta viendo. Siempre es uno de
   * `bloquesPlegados`, y **uno como mucho por modulo**: dos carriles serian dos
   * formas de navegar lo mismo.
   *
   * Lo llevan las hojas que no tienen ninguna otra forma de alcanzarse entre
   * si; donde hay superficie —las pestanas del territorio, el conmutador de la
   * ficha— basta con plegar.
   */
  readonly centroDeReportes?: string;
  /**
   * El acto con el que se empieza a trabajar en este modulo, si lo declara.
   *
   * Sale de la tabla del portador y **no de la composicion del modulo**: la
   * barra lateral vive en el arranque y la composicion llega en el trozo de su
   * modulo (#433), asi que leer de alli que boton dibujar traeria ese trozo al
   * arranque de los doce. Un modulo sin ella no dibuja boton.
   */
  readonly accionPrimaria?: AccionPrimariaDeModulo;
  readonly opciones: readonly OpcionDelCatalogo[];
}

export interface OpcionDelCatalogo {
  /** Identificador del prototipo y `operationId` del contrato: `ficha_urbana`. */
  readonly id: string;
  readonly label: string;
  /** Segmento de la ruta: `ficha-urbana`. */
  readonly ranura: string;
  /** Bloque de navegacion, ya clasificado en el build (ADR-0014 §4 o FRO-03 §4). */
  readonly bloque: string;
  /**
   * Titulo de la pantalla, que no siempre coincide con la etiqueta del menu.
   *
   * Viaja con la navegacion y no con la estructura porque lo necesitan el menu,
   * el hub, la cabecera y la paleta de comandos: si viviera en el archivo del
   * modulo, buscar «papeleta» obligaria a descargar los doce.
   */
  readonly title: string;
  /** Descripcion de la pantalla; el hub del modulo la recorta. */
  readonly resumen: string;
}

export interface EstructuraDePantalla {
  readonly id: string;
  /** Eyebrow de la cabecera: el modulo al que pertenece. */
  readonly mod: string;
  readonly title: string;
  /** Operacion del contrato: `GET /api/v1/catastro/fichas`. */
  readonly endpoint: string;
  readonly desc?: string;
  readonly kind?: 'dash' | 'portal' | 'report';
  readonly steps?: readonly string[];
  readonly filtros?: readonly CampoDePantalla[];
  readonly tabs?: readonly PestanaDePantalla[];
  readonly secciones?: readonly SeccionDePantalla[];
  readonly tabla?: EstructuraDeTabla;
  readonly totales?: readonly { readonly label: string; readonly fuerte: boolean }[];
  readonly reporte?: EstructuraDeReporte;
  /** La ultima es la accion primaria (FRO-03 §5). */
  readonly acciones?: readonly string[];
}

export interface PestanaDePantalla {
  readonly label: string;
  readonly secciones: readonly SeccionDePantalla[];
}

export interface SeccionDePantalla {
  readonly label: string;
  /** `Opcional`, `Solo lectura`, `Colapsado` arrancan cerradas (FRO-03 §5). */
  readonly hint?: string;
  readonly campos: readonly CampoDePantalla[];
}

export interface CampoDePantalla {
  /** Clave del campo en el JSON de la API: `codigoDeRefCatastral`. */
  readonly clave: string;
  readonly label: string;
  readonly t: TipoDeCampo;
  readonly ph?: string;
  readonly opts?: readonly string[];
  /** Ocupa la fila entera de la rejilla. */
  readonly ancho?: boolean;
}

export type TipoDeCampo = 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';

export interface EstructuraDeTabla {
  readonly title: string;
  readonly cols: readonly string[];
  /**
   * Como se llama cada columna cuando hay que nombrarla: `Nombre Calle` →
   * `nombreCalle`. Es lo que viaja en `?orden=`, porque ordenar es del servidor
   * (ordenar en el cliente una pagina de un padron ordena media tabla).
   */
  readonly claves: readonly string[];
  /** Indices de columna numerica: a la derecha y en monoespaciada. */
  readonly num?: readonly number[];
  readonly note?: string;
  readonly acciones?: readonly string[];
}

export interface EstructuraDeReporte {
  readonly title: string;
  readonly subtitle: string;
  readonly cols: readonly string[];
  readonly num?: readonly number[];
}
