import { descargar, solicitar, type RespuestaPaginada } from './cliente';
import type { FormatoDeDocumento } from './descarga';
import type { Paginacion } from './catastro';

/**
 * Lo que `fiscalizacion` publica.
 *
 * <h2>Las cuatro cifras que siempre son nulas</h2>
 *
 * `valorCatastralS`, `valorDeclaradoS`, `diferenciaS` e `impuestoOmitidoS`
 * llegan `null` y seguiran llegando `null` mientras D-02a este abierta: valorar
 * un predio exige el cuadro de valores unitarios, la depreciacion y el arancel,
 * y ninguno esta firmado. No es que falten en esta consulta: es que el sistema
 * no sabe valorizar todavia.
 */
/**
 * Un titular de la fila del omiso: su codigo y su nombre.
 *
 * Los dos pueden ser `null` a la vez, y significa que ese titular **ya no esta
 * en el padron**. Sale asi y sale en la lista —igual que en
 * `TitularesDelPredioResource`—: es el predio que catastro tiene que revisar, y
 * ocultarlo esconderia el defecto en vez de enseñarlo.
 */
export type TitularDelOmiso = { codigo: string | null; nombre: string | null };

export type FilaDeOmisos = {
  codRefCatastral: string;
  /**
   * El NOMBRE del titular, no su codigo (#545). Cuando son varios llegan
   * **unidos** —«A y B»—, porque la fila es el predio y no la persona.
   *
   * Es `null` cuando el predio no tiene ningun titular vigente a la fecha de
   * corte, y no es un caso raro: medido, **1 480 de 3 000 filas de Catacaos**
   * llegan sin ninguno. Ese predio sale en la lista a proposito —es el que
   * nadie reclama, el primero que hay que fiscalizar— asi que la celda tiene
   * que decir que no lo tiene, no quedarse en blanco.
   */
  titular: string | null;
  /**
   * El codigo del titular cuando hay **exactamente uno**. Es con lo que se
   * entra a su ficha, buscandolo por codigo en el padron de Rentas.
   *
   * `null` con cero titulares y tambien con dos: con dos no hay UN codigo, y
   * elegir el de uno de los dos seria decir que el predio es suyo. Medido en la
   * muni 1: 3 de 23 filas tienen dos titulares y las tres llegan con
   * `codigoDelTitular: null`.
   */
  codigoDelTitular: string | null;
  /** Todos los titulares vigentes, de mayor a menor porcentaje. */
  titulares: TitularDelOmiso[];
  sector: string | null;
  /** `OMISO` | `SUBVALUADOR`. */
  condicion: string;
  declaroFueraDePlazo: boolean;
  /**
   * Las tres superficies, en METROS CUADRADOS y **sin la unidad dentro** (#546).
   *
   * Viajan tipadas como `AreaM2` y las escribe el serializador que
   * `ConfiguracionDeJson` registra: `"180.50"`, no `"180.50 m2"`. Hasta #546
   * eran `String` compuestos con `toString()` en la web, asi que salian con la
   * unidad pegada aqui y en la muestra y sin ella en la liquidacion y en la
   * resolucion —cuatro proyecciones del mismo modulo con dos formas del mismo
   * dato—. Ahora la unidad la pone la CABECERA de la columna; metida dentro
   * obliga a cada consumidor a recortarla antes de poder comparar.
   *
   * Siguen siendo texto y no `number`: son decimales exactos de `numeric(_,2)`
   * y pasarlos por `Number` para volver a formatearlos es como se pierde un
   * decimal (RNF-055). Se agrupan los miles sobre la cadena, sin convertirla.
   *
   * `diferenciaDeArea` nunca es negativa: `ComparacionHalladoDeclarado` devuelve
   * `AreaM2.CERO` cuando lo hallado no supera lo declarado, y `AreaM2` rechaza
   * en su constructor un valor negativo.
   *
   * **Esto vale para fiscalizacion y todavia no para el resto**: catastro y
   * rentas siguen componiendo la suya con `toString()`, asi que el MISMO predio
   * de Catacaos —`20010500000026010101001`— sale «360.00» aqui y «360.00 m2» en
   * `GET /catastro/fichas`. Medido, y abierto en #607.
   */
  areaCatastral: string | null;
  areaDeclarada: string | null;
  diferenciaDeArea: string | null;
  valorCatastralS: string | null;
  valorDeclaradoS: string | null;
  diferenciaS: string | null;
  impuestoOmitidoS: string | null;
};

/**
 * Lo que la deteccion de omisos deja acotar, y **solo eso**.
 *
 * Llevaba dos campos mas —`contribuyente` y `fechaDeConsulta`— que ninguna
 * operacion lee. Hasta #539 eso era silencioso: Spring ignoraba el parametro que
 * ningun argumento reclama, la consulta salia sin acotar y quien preguntaba por
 * una persona recibia el padron de omisos entero. Desde #602 hay un guardia
 * sobre `/api/v1/**` que contesta **422 nombrando el parametro**, asi que
 * dejarlos declarados seria una trampa para el proximo que los rellene: se ven
 * como un filtro y son un error garantizado.
 *
 * Medido: `?contribuyente=C-000001` y `?fechaDeConsulta=2026-09-01` dan los dos
 * «Parametro desconocido». Ninguna pantalla los rellenaba, asi que retirarlos no
 * cambia una sola peticion —comprobado en el navegador: la deteccion pide
 * `?ejercicio&pagina&tamano` y nada mas—.
 */
export type FiltroDeOmisos = {
  ejercicio?: string;
  sector?: string;
  /** `OMISO` | `SUBVALUADOR`. */
  condicion?: string;
};

/**
 * Los TRES campos por los que la deteccion se deja ordenar, y estan medidos.
 *
 * Es el unico sitio donde vive esa lista. Escribirla aqui como tipo y no como
 * cadena suelta es lo que hace que una cabecera no pueda ofrecer un orden que
 * el backend no admite: `listarOmisos` solo acepta uno de los tres, asi que
 * `orden: 'titular'` en una columna **no compila**. Sin eso, el error sale en
 * produccion y sale tarde —`GuardiaDeParametros` y `OrdenSeguro` contestan
 * 422 (#539, #546)— y quien pulsa la cabecera ve el listado desaparecer sin
 * poder saber por que.
 *
 * <h2>El contrato no publica esta lista, asi que se mide (#312)</h2>
 *
 * `docs/50-api/openapi/sgtm-v1.yaml` declara `ordenarPor` como
 * `{ type: string }` con la descripcion «Campo por el que se ordena, en
 * camelCase», sin `enum`: la lista blanca vive en `OrdenSeguro` del backend y
 * no cruza la frontera. De modo que esto no se deriva del contrato ni se
 * supone del recurso —los siete campos que la fila publica NO son siete
 * ordenes—: se pregunta. Medido contra el backend de hoy, con `?ejercicio=2026`:
 *
 * ```
 * ordenarPor=codRefCatastral    → 200      ordenarPor=titular             → 422
 * ordenarPor=sector             → 200      ordenarPor=condicion           → 422
 * ordenarPor=diferenciaDeArea   → 200      ordenarPor=areaCatastral       → 422
 *                                          ordenarPor=areaDeclarada       → 422
 * ordenarPor=codigoRefCatastral → 422      ordenarPor=impuestoOmitidoS    → 422
 * ordenarPor=sectorCodigo       → 422      ordenarPor=codigoDelTitular    → 422
 *                                          ordenarPor=declaroFueraDePlazo → 422
 *                                          ordenarPor=predio | codigo     → 422
 * ```
 *
 * El 422 es `ORDEN_NO_ADMITIDO` y nombra lo pedido: `{"codigo":
 * "ORDEN_NO_ADMITIDO", "detalles": ["Campo pedido: titular"]}`.
 *
 * Los dos primeros de la columna derecha son los nombres INTERNOS del
 * repositorio, y que sigan dando 422 es lo correcto: son los que #546 retiro
 * para que la operacion no tuviera dos nombres del mismo dato. La forma
 * `snake_case` —`codigo_ref_catastral`, `sector_codigo`, `diferencia_de_area`—
 * tambien contesta 200, porque `OrdenSeguro.sobre(...)` admite la columna cruda
 * para un cliente que ya conozca la tabla; **no se usa**: aqui se pide con el
 * nombre que la fila publica, que es el unico que un lector de esta pantalla
 * puede ver.
 *
 * <h2>Los tres del manual, y por que estos no son aquellos</h2>
 *
 * El «Ordenar por» del artboard ofrece impuesto omitido, diferencia de valor y
 * sector. De esos tres solo **sector** se admite. Los otros dos son cifras de
 * dinero —`impuestoOmitidoS` y la diferencia de valuacion— y llegan `null` en
 * todas las filas mientras D-02a siga abierta: ordenar por una columna que no
 * tiene ni un valor no ordena nada, y las dos direcciones devolverian la misma
 * primera fila. `diferenciaDeArea` **no es** «diferencia de valor»: son metros,
 * no soles, y es lo unico cuantificado que hoy distingue a un subvaluador.
 */
export type OrdenDeOmisos = 'codRefCatastral' | 'sector' | 'diferenciaDeArea';

/**
 * La paginacion de la deteccion, con `ordenarPor` acotado a lo que admite.
 *
 * `Paginacion` lo declara `string` porque cada listado admite lo suyo; aqui se
 * estrecha, que es lo que convierte «pedir un orden que no existe» de un 422 en
 * ventanilla a un error de compilacion.
 */
export type PaginacionDeOmisos = Omit<Paginacion, 'ordenarPor'> & { ordenarPor?: OrdenDeOmisos };

export function listarOmisos(
  filtro: FiltroDeOmisos,
  paginacion: PaginacionDeOmisos,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<FilaDeOmisos>> {
  return solicitar('/fiscalizacion/omisos', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ Programas, muestra y resultados ══════════
 *
 * Las tres lecturas que sostienen `panel`, `programas` y `resultados`. Las tres
 * existen y contestan 200; hoy devuelven CERO filas en las dos municipalidades
 * —`programa_fiscalizacion`, `programa_muestra` y `liquidacion_fiscalizacion`
 * estan vacias (#546)—, y eso es una respuesta, no un fallo: la pantalla dice
 * «todavia no hay ninguno» en vez de enseñar la muestra del artboard.
 */

/** Un importe con el dia al que corresponde. Es `ImporteActualizado` (regla 9). */
export type ImporteActualizado = { importe: string; actualizadoA: string };

/** `ProgramaResource`. `estado` es `ABIERTO` | `EN_PROCESO` | `CERRADO`. */
export type ProgramaDeFiscalizacion = {
  id: number;
  codigo: string;
  descripcion: string;
  /** `PREDIAL` | `VEHICULAR`. Son los dos que `TipoDePrograma` declara. */
  tipo: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
  ejercicio: string | null;
  sector: string | null;
  /** El criterio de riesgo, que es un `CondicionFiscalizada`. */
  criterio: string | null;
  fiscalizador: string | null;
};

export type FiltroDeProgramas = { nDePrograma?: string; ejercicio?: string };

export function listarProgramas(
  filtro: FiltroDeProgramas,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ProgramaDeFiscalizacion>> {
  return solicitar('/fiscalizacion/programas', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * `MuestraResource`: los predios sorteados de un programa.
 *
 * Las tres areas llegan **sin** la unidad dentro, igual que en omisos y por lo
 * mismo (#546): viajan como `AreaM2` y el serializador escribe `"180.50"`. La
 * unidad la pone la cabecera de la columna.
 */
export type FilaDeMuestra = {
  programaId: number;
  predioId: number;
  codRefCatastral: string;
  /** Los tres son nulos a la vez cuando el predio **no tiene titular vigente**
   *  a la fecha del sorteo (#586, V73). NULO NO ES UN DATO QUE FALTE: es el
   *  predio que nadie reclama —no hay a quien notificarle, no hay quien
   *  declare—, o sea el candidato de primer orden, y la visita es lo que
   *  resuelve quien lo ocupa. Antes la muestra los excluia en silencio porque
   *  `programa_muestra.contribuyente_id` era `NOT NULL`, y eran 4 977 de los
   *  14 422 predios de Catacaos. */
  contribuyenteId: number | null;
  codContribuyente: string | null;
  /** El nombre, como en `FilaDeOmisos` desde #545. */
  titular: string | null;
  sector: string | null;
  condicion: string;
  areaCatastral: string | null;
  areaDeclarada: string | null;
  diferenciaDeArea: string | null;
  /** Si ya tiene acta levantada. Es lo unico que hay del «Estado» de la fila. */
  visitado: boolean;
  fechaSorteo: string;
};

/**
 * La muestra de un programa. **Un programa que no existe contesta 404** (#546).
 *
 * Antes devolvia 200 con la lista vacia, que es exactamente lo mismo que
 * contesta un programa recien registrado y todavia sin sortear: la pantalla no
 * podia distinguir «este programa no ha sorteado su muestra» de «ese programa
 * no existe», y decia la primera de las dos en los dos casos. Ahora la lista
 * vacia solo significa una cosa, y por eso el aviso de la pantalla puede
 * afirmarlo.
 *
 * ```
 * GET /fiscalizacion/programas/999999/muestra → 404 NO_ENCONTRADO
 *     «No existe el programa de fiscalizacion 999999»
 * ```
 */
export function listarMuestra(
  programaId: number,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<FilaDeMuestra>> {
  return solicitar(`/fiscalizacion/programas/${String(programaId)}/muestra`, {
    parametros: { ...paginacion },
    senal,
  });
}

/* ══════════ Las actas de inspeccion (#599) ══════════
 *
 * `GET /fiscalizacion/actas` no existia hasta #599, y no por descuido: #546
 * midio que **lo que le faltaba al modulo no era una lectura sino una columna**.
 * El acta se registraba —`POST /fiscalizacion/predial/actas`— y no se podia
 * volver a leer; publicar el listado antes habria enseñado la misma foto
 * incompleta, porque el cuerpo del `POST` tenia nueve campos contra los
 * veintitres controles y las siete filas de contraste que la pantalla del
 * manual dibuja. `V76` añadio `uso_hallado`, que es el sexto de esos siete
 * contrastes y el segundo de los dos hallazgos que la fiscalizacion predial
 * persigue —el otro es el area—, y con el la lectura deja de mentir por
 * omision.
 */

/**
 * `ActaFiscalizacionResource`: un acta de inspeccion levantada en campo.
 *
 * <h2>Lo que la fila NO trae, y por que la pantalla lo dice en vez de rellenarlo</h2>
 *
 * `programaId`, `contribuyenteId`, `predioId`, `vehiculoId` y `fichaId` son
 * identificadores INTERNOS de fila: ni el codigo del programa (`PF-593-01`), ni
 * el codigo municipal del contribuyente, ni el codigo de referencia catastral
 * del predio. Se dibujan como lo que son —igual que `ResolucionDeDeterminacion`
 * ya hace con `predioId`— y no se cambian por un codigo que esta respuesta no
 * trae. El unico que se puede resolver sin inventar nada es el programa, y
 * porque `GET /fiscalizacion/programas` lo publica al lado en la misma
 * pantalla: si el programa no esta en la pagina traida, se queda el numero.
 *
 * `areaHallada` llega en METROS CUADRADOS y **sin la unidad dentro** (#546),
 * igual que en omisos, en la muestra y en la liquidacion: `"260.00"`, no
 * `"260.00 m2"`. La unidad la pone la cabecera de la columna.
 *
 * <h2>`usoHallado` nulo NO es «coincide con el declarado»</h2>
 *
 * Es «no se anoto», y el propio recurso lo dice de si mismo. Son dos cosas
 * distintas y la celda no las puede mezclar: un acta conforme afirma que se
 * miro y coincidia, y una sin uso anotado no afirma nada sobre el uso. Solo un
 * acta PREDIAL puede llevarlo —un vehiculo no tiene uso declarado contra el que
 * contrastar—, asi que en las vehiculares es nulo siempre y por construccion.
 *
 * <h2>`hallazgo` son CINCO valores, y ninguno es un rotulo del manual</h2>
 *
 * `Hallazgo` declara `CONFORME`, `OMISO`, `SUBVALUADOR`, `USO_DISTINTO` y
 * `NO_UBICADO`. El desplegable «Hallazgo principal» del manual ofrece seis
 * rotulos y **ninguno de los seis coincide letra por letra con ninguno de los
 * cinco**, ni siquiera el que #599 hizo posible. Medido, mandando cada rotulo
 * al `POST` del acta predial:
 *
 * ```
 * SIN OBSERVACIONES          → 422 «Hallazgo desconocido: 'SIN OBSERVACIONES'»
 * AMPLIACION NO DECLARADA    → 422 «Hallazgo desconocido: …»
 * USO DISTINTO AL DECLARADO  → 422 «Hallazgo desconocido: …»
 * OMISO A LA DECLARACION     → 422 «Hallazgo desconocido: …»
 * PREDIO SUBVALUADO          → 422 «Hallazgo desconocido: …»
 * PREDIO INEXISTENTE         → 422 «Hallazgo desconocido: …»
 * ```
 *
 * Asi que **no se traduce ninguno** —el criterio de #427 al negarse a leer
 * «ACTIVA» como `VIGENTE` y el de #546 con este mismo desplegable—: al leer se
 * dibuja el valor del enumerado con su etiqueta, y al escribir no se puede
 * escribir todavia por otros motivos, que estan en la pantalla.
 *
 * `estado` es `ABIERTA` | `LIQUIDADA` | `RELIQUIDADA` | `TRANSFERIDA` |
 * `ANULADA` (`EstadoDeActa`).
 */
export type ActaDeFiscalizacion = {
  id: number;
  programaId: number;
  version: number;
  contribuyenteId: number;
  predioId: number | null;
  vehiculoId: number | null;
  fichaId: number | null;
  fechaVisita: string;
  fiscalizador: string;
  hallazgo: string | null;
  areaHallada: string | null;
  usoHallado: string | null;
  detalle: string | null;
  estado: string;
};

/**
 * Lo unico que el listado de actas deja acotar: el programa, por su ID interno.
 *
 * Es UNO, y esta medido —el guardia de parametros de #539 contesta 422
 * nombrando lo que admite—:
 *
 * ```
 * ?estado=ABIERTA        → 422 «Se admiten: direccion, ordenarPor, pagina, programa, tamano»
 * ?hallazgo=SUBVALUADOR  → 422 (el mismo)
 * ?contribuyente=1       → 422 (el mismo)
 * ?predio=1              → 422 (el mismo)
 * ```
 *
 * De modo que «actas cerradas», «actas de esta persona» y «actas con este
 * hallazgo» no son preguntas que se puedan hacer hoy, y la pantalla lo dice en
 * vez de recomponerlas contando la pagina que se trajo: contar la pagina da el
 * numero de la pagina, no el del padron (RNF-083).
 *
 * Y el valor va como **numero**, no como el codigo del programa:
 *
 * ```
 * ?programa=1            → 200, las actas de ese programa
 * ?programa=999          → 200 con la lista VACIA, no 404
 * ?programa=PF-2026-014  → 422 «El programa se identifica por su numero interno»
 * ```
 *
 * El 200 vacio del programa inexistente es lo contrario de lo que hace
 * `listarMuestra`, que desde #546 contesta 404. No se disimula: aqui el filtro
 * sale de una lista que la propia pantalla acaba de traer, asi que un id que no
 * existe no es un caso que quien atiende pueda producir tecleando.
 */
export type FiltroDeActas = { programa?: string };

/**
 * Los CINCO campos por los que el listado de actas se deja ordenar, medidos.
 *
 * Se pregunta, no se deriva del recurso: `ordenarPor` viaja en el contrato como
 * `{ type: string }` sin `enum` y la lista blanca vive en `OrdenSeguro`, que no
 * cruza la frontera (#312, #546). Medido contra el backend de hoy:
 *
 * ```
 * ordenarPor=id           → 200      ordenarPor=programaId      → 422
 * ordenarPor=fechaVisita  → 200      ordenarPor=fiscalizador    → 422
 * ordenarPor=version      → 200      ordenarPor=contribuyenteId → 422
 * ordenarPor=hallazgo     → 200      ordenarPor=predioId        → 422
 * ordenarPor=estado       → 200      ordenarPor=areaHallada     → 422
 *                                    ordenarPor=usoHallado      → 422
 *                                    ordenarPor=detalle         → 422
 *                                    ordenarPor=fichaId         → 422
 * ```
 *
 * El 422 es `ORDEN_NO_ADMITIDO` y nombra lo pedido. La forma `snake_case`
 * —`fecha_visita`— tambien contesta 200 porque `OrdenSeguro` admite la columna
 * cruda; **no se usa**: aqui se pide con el nombre que la fila publica, que es
 * el unico que un lector de esta pantalla puede ver.
 *
 * Escribirlos como tipo y no como cadena suelta es lo que hace que una cabecera
 * no pueda ofrecer un orden que el backend rechaza: `orden: 'fiscalizador'` en
 * una columna **no compila**, en vez de contestar 422 en ventanilla y llevarse
 * la tabla entera por delante.
 */
export type OrdenDeActas = 'id' | 'fechaVisita' | 'version' | 'hallazgo' | 'estado';

/** La paginacion del listado de actas, con `ordenarPor` acotado a lo que admite. */
export type PaginacionDeActas = Omit<Paginacion, 'ordenarPor'> & { ordenarPor?: OrdenDeActas };

/**
 * Las actas levantadas, prediales y vehiculares en una sola lista.
 *
 * Son una sola porque comparten tabla, ciclo de vida y recurso (V4): cual es
 * cual lo dice cual de `predioId` y `vehiculoId` trae valor. Y el permiso lo
 * comparten las dos pantallas que escriben actas —`fisc_predial` y
 * `fisc_vehicular`—, para que un perfil de fiscalizacion vehicular no acabe
 * registrando actas que no puede volver a ver.
 */
export function listarActas(
  filtro: FiltroDeActas,
  paginacion: PaginacionDeActas,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ActaDeFiscalizacion>> {
  return solicitar('/fiscalizacion/actas', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * `LiquidacionResource`. **Ninguna cifra de dinero**, y por eso ningun `Dinero`
 * en el DTO: base declarada, base hallada, insoluto omitido y multa son D-02a y
 * D-02c (#198). `esperaSusCifras` viaja para que la pantalla pueda escribir
 * «sin cifra» en vez de un cero, que se lee como «no debe nada».
 */
export type LineaDeLiquidacion = {
  ejercicio: number;
  predioId: number | null;
  vehiculoId: number | null;
  condicion: string;
  /**
   * En metros cuadrados y sin la unidad dentro, como en omisos y en la muestra.
   * Estas tres ya salian asi antes de #546 —eran `AreaM2` tipadas—: lo que #546
   * arreglo es que las otras dos proyecciones dijeran lo mismo. La pantalla
   * todavia no dibuja el detalle de una liquidacion; cuando lo haga, la unidad
   * va en la cabecera.
   */
  areaDeclarada: string | null;
  areaHallada: string | null;
  diferenciaDeArea: string | null;
  usoDeclarado: string | null;
  usoHallado: string | null;
  /** Siempre `null` hasta D-02a. */
  insolutoOmitido: string | null;
  /** Siempre `null` hasta D-02a y D-02c. */
  multaTributaria: string | null;
};

export type LiquidacionDeFiscalizacion = {
  numero: string;
  actaId: number;
  version: number;
  liquidacionAnterior: number | null;
  periodoDesde: number;
  periodoHasta: number;
  tipoDeFiscalizacion: string;
  motivoDeterminante: string;
  fecha: string;
  numeroNotificacion: string | null;
  /** `ABIERTA` | `EN_PROCESO` | `LIQUIDADA` | `NOTIFICADA` | `ANULADA`. */
  estado: string;
  esperaSusCifras: boolean;
  lineas: LineaDeLiquidacion[];
  historial: { fecha: string; estado: string; observacion: string | null }[];
};

export type FiltroDeResultados = { programa?: string; hallazgo?: string; estado?: string };

export function listarResultados(
  filtro: FiltroDeResultados,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<LiquidacionDeFiscalizacion>> {
  return solicitar('/fiscalizacion/resultados', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * `VersionResource`: una version del proceso con lo que cambio respecto de la anterior.
 *
 * <h2>Aqui la superficie SI llega con su unidad dentro, y es la excepcion (#546)</h2>
 *
 * `antes` y `despues` son **una sola columna de texto libre** para conceptos que
 * no son de la misma especie: `DiferenciaEntreLiquidaciones` los compone con
 * `Object.toString()`, asi que en esa celda caben `"OMISO"`, `"CASA HABITACION"`,
 * `"2020"`, `"120.00"` —un importe— y `"180.50 m2"` —un area—. Ahi la unidad
 * **distingue**: sin ella, «120.00 → 164.50» no dice si cambio el area hallada o
 * el insoluto omitido, y la cabecera no puede ponerla porque no hay una cabecera
 * por concepto, hay una linea por cambio con el concepto delante.
 *
 * Es lo contrario de las grillas de omisos y de la muestra, donde cada columna
 * tiene una sola especie y la cabecera puede decirlo una vez. Las dos decisiones
 * son la misma regla —la unidad se dice donde deja de haber ambiguedad— aplicada
 * a dos formas distintas, no una incoherencia. No se recorta el « m2» de estas
 * cadenas: recortarlo aqui es lo que dejaria la celda muda.
 */
export type VersionDeLiquidacion = {
  version: LiquidacionDeFiscalizacion;
  cambios: { concepto: string; antes: string | null; despues: string | null }[];
  /** Los conceptos cuyo importe no se puede dar todavia (D-02a). */
  importesSinCifra: string[];
};

export type FiltroDelHistorico = { nLiquidacion?: string; contribuyente?: string; nNotificacion?: string };

export function listarHistorico(
  filtro: FiltroDelHistorico,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<VersionDeLiquidacion>> {
  return solicitar('/fiscalizacion/predial/historico', { parametros: { ...filtro, ...paginacion }, senal });
}

/** `EstadoDeCuentaResource`: la deuda de fiscalizacion de UN contribuyente. */
export type EstadoDeCuentaDeFiscalizacion = {
  codContribuyente: string;
  fechaDeConsulta: string;
  lineas: {
    /** El numero de la liquidacion de la que viene. */
    deuda: string;
    ano: number;
    nomTrib: string;
    unidad: number | null;
    estad: string;
    importe: ImporteActualizado | null;
  }[];
  total: ImporteActualizado | null;
};

export function leerEstadoDeCuenta(
  contribuyente: string,
  senal?: AbortSignal,
): Promise<EstadoDeCuentaDeFiscalizacion> {
  return solicitar('/fiscalizacion/estado-cuenta', { parametros: { contribuyente }, senal });
}

/* ══════════ La resolucion de determinacion ══════════
 *
 * El valor que cierra el procedimiento: determina por ejercicio la diferencia
 * de tributo y la multa, y es lo que arranca el plazo del art. 137 para
 * reclamar. Es la ULTIMA lectura de fiscalizacion que faltaba por conectar.
 *
 * <h2>Su numero no lo lista nadie, y esta medido</h2>
 *
 * `GET /fiscalizacion/resultados` publica `LiquidacionResource`, que trae el
 * numero de la LIQUIDACION —`LIQ-2026-000001`— y no el de la resolucion que la
 * transfirio —`RDF-2026-000001`—; el contrato no declara ninguna otra ruta bajo
 * `/fiscalizacion/resoluciones`, y la unica respuesta del sistema que trae ese
 * numero es la del `POST /fiscalizacion/transferencias` que la dicta. De modo
 * que el numero se **teclea**: sale del papel notificado, que es donde el
 * contribuyente lo lee cuando viene a reclamar.
 *
 * Se midio, con la cadena entera sembrada en la municipalidad 1 (programa →
 * acta → liquidacion → transferencia):
 *
 * ```
 * GET /fiscalizacion/resultados      → LIQ-2026-000001, sin numero de resolucion
 * GET .../resoluciones/RDF-2026-000001 → 200 application/json
 * ```
 */

/**
 * Una fila del cuadro de la determinacion. Es `LineaDeterminadaResource`.
 *
 * **Las cinco cifras de dinero llegan `null` y seguiran llegando `null`**
 * mientras D-02a este abierta: determinar la base de un ejercicio exige el
 * cuadro de valores unitarios, la depreciacion y el arancel, y ninguno esta
 * firmado. Salen «—», nunca cero: un cero en un valor notificable se lee como
 * «no debe nada», y esto es lo que el contribuyente recibe por escrito.
 *
 * `total` **lo suma el servidor** —y solo cuando conoce las dos partes, porque
 * sumar una cifra con una ausencia daria la cifra—. La pantalla no lo
 * recompone: componer dinero en la interfaz es RNF-083, y aqui ademas el papel
 * emitido ya lleva su propio total dentro del PDF sellado.
 *
 * Las dos superficies viajan como `AreaM2` **sin la unidad dentro** (#546):
 * `"260.00"`, no `"260.00 m2"`. La unidad la pone la cabecera de la columna.
 */
export type LineaDeterminada = {
  ejercicio: number;
  /** La base que resulta de lo hallado. Nula hasta D-02a. */
  determinado: string | null;
  /** La base que consta declarada. Nula hasta D-02a. */
  declarado: string | null;
  /** El tributo que se dejo de pagar. Nula hasta D-02a. */
  diferencia: string | null;
  /** La multa del art. 176. Nula hasta D-02a y D-02c. */
  multa: string | null;
  /** La suma de las dos anteriores, hecha por el servidor. Nula si falta cualquiera. */
  total: string | null;
  /** La condicion hallada. Esta si se conoce siempre. */
  condicion: string;
  areaDeclarada: string | null;
  areaHallada: string | null;
};

/**
 * `ResolucionResource`: la resolucion de determinacion tal como sale por HTTP.
 *
 * <h2>Lo que NO publica, y por eso la hoja lo dice en vez de rellenarlo</h2>
 *
 * El artboard dibuja seis rotulos en la cabecera del papel y el recurso
 * sostiene cuatro. **R.U.C.** no viaja —el documento de identidad del obligado
 * lo imprime el PDF («Documento: DNI 00000001») y el JSON no lo lleva— y
 * **tipo de fiscalizacion** tampoco: es de la liquidacion
 * (`LiquidacionResource.tipoDeFiscalizacion`), no de la resolucion. Los dos
 * salen «—» con su motivo escrito al lado; inventarlos con lo que se parezca es
 * exactamente lo que #427 se nego a hacer con «ACTIVA».
 *
 * `predioId` y `vehiculoId` son los identificadores INTERNOS de la unidad, no
 * el codigo de referencia catastral ni la placa. Se dibujan como el propio
 * papel los dibuja —«Predio 1»— y se dice que lo son: cambiarlos por un codigo
 * que el recurso no trae seria afirmar un dato que nadie leyo.
 *
 * `aLaFecha` esta en la raiz y no en cada linea porque **todas** las cifras de
 * esta respuesta son del dia de la resolucion, que es cuando se congelaron
 * (regla 9, RNF-075). El papel no se recompone nunca con datos vivos: el
 * domicilio de notificacion cambia y la ficha se versiona otra vez, y el valor
 * que arranca el plazo del art. 137 es el de 2026, no el de 2030.
 */
export type ResolucionDeDeterminacion = {
  numero: string;
  fecha: string;
  /** El dia al que estan las cifras. El mismo de la resolucion, dicho aparte. */
  aLaFecha: string;
  nLiquidacion: string;
  versionDeLaLiquidacion: number;
  periodoDesde: number;
  periodoHasta: number;
  codContribuyente: string | null;
  contribuyente: string | null;
  predioId: number | null;
  vehiculoId: number | null;
  documentoSustento: string;
  sustento: string;
  baseLegal: string;
  fichaAnteriorId: number | null;
  fichaNuevaId: number | null;
  usuarioRegistro: string | null;
  observacion: string;
  lineas: LineaDeterminada[];
  /** Cuantos cargos asento; **solo** en la respuesta de la transferencia. */
  cargosAsentados: number | null;
};

/**
 * La resolucion por su numero. Un numero que no existe contesta **404**.
 *
 * Y contesta 404 tambien desde otra municipalidad: medido, la municipalidad 9
 * pidiendo `RDF-2026-000001` —que es de la 1— recibe «No hay ninguna resolucion
 * de determinacion con el numero 'RDF-2026-000001'», que es RLS hablando. No
 * hace falta que la pantalla lo distinga: para quien pregunta, un valor de otra
 * municipalidad no existe.
 */
export function leerResolucion(numero: string, senal?: AbortSignal): Promise<ResolucionDeDeterminacion> {
  return solicitar(`/fiscalizacion/resoluciones/${encodeURIComponent(numero)}`, { senal });
}

/**
 * La misma resolucion, como documento: `?formato=PDF|XLS|RTF` (#593, RF-132).
 *
 * <h2>Descargarla no la vuelve a emitir</h2>
 *
 * Y el motivo es mas fuerte que el de la ficha del contribuyente y el de la
 * constancia de no adeudo: no es que aqui no haya nada que numerar, es que **ya
 * esta numerado**. `TransferirARentas` emitio el papel, le puso su correlativo
 * y guardo su modelo con su SHA-256 en la misma transaccion que versiono la
 * ficha y asento los cargos; lo que falta es entregarlo. Por eso esta descarga
 * **no pide observacion y no gasta correlativo**: la regla 10 gobierna las
 * escrituras y esto no lo es, al reves que el duplicado del recibo —que si
 * suma una reimpresion y por eso si la exige—.
 *
 * Tampoco sale marcada «DUPLICADO N.º 1», y esta comprobado leyendo el PDF que
 * el servidor entrega: `POST /fiscalizacion/transferencias` devuelve JSON y
 * descarta los bytes que emitio, asi que esta descarga es la **primera** vez
 * que ese papel sale del sistema.
 *
 * Basta `LECTURA`, no `IMPRESION`: el documento es la misma hoja que esta
 * pantalla ya dibuja al lado. Los padrones de #53 piden impresion porque sacan
 * un listado que nadie llego a ver entero; aqui no hay nada que no este ya en
 * la respuesta JSON.
 *
 * Los cuatro casos, medidos contra el backend con `RDF-2026-000001`:
 *
 * ```
 * ?formato=PDF    → 200 application/pdf            Content-Disposition: attachment; filename="RDF-2026-000001.pdf"
 * ?formato=XLS    → 200 application/vnd.ms-excel   … filename="RDF-2026-000001.xls"
 * ?formato=RTF    → 200 application/rtf            … filename="RDF-2026-000001.rtf"
 * ?formato=PATATA → 422 «El parametro 'formato' admite PDF, XLS o RTF: 'PATATA'»
 * ```
 *
 * Y `?formato=` **vacio tambien es 422**, no PDF por omision: `params =
 * "formato"` elige ese handler en cuanto el parametro esta, asi que contestar
 * PDF seria contestar con un formato que nadie pidio. De ahi que `descargar()`
 * reciba siempre uno de los tres y nunca `undefined`.
 */
export function descargarResolucion(numero: string, formato: FormatoDeDocumento): Promise<void> {
  return descargar(`/fiscalizacion/resoluciones/${encodeURIComponent(numero)}`, { formato });
}
