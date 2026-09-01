import { solicitar, type RespuestaPaginada } from './cliente';
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

export type FiltroDeOmisos = {
  ejercicio?: string;
  sector?: string;
  /** `OMISO` | `SUBVALUADOR`. */
  condicion?: string;
  contribuyente?: string;
  /** La fecha a la que se resuelve, que es la de la regla 9. */
  fechaDeConsulta?: string;
};

/**
 * El UNICO campo por el que la deteccion se deja ordenar, y esta medido.
 *
 * `ordenarPor` viaja en `Paginacion`, asi que el endpoint lo acepta desde
 * siempre; lo que #546 arreglo es que el nombre publico —el que el recurso
 * dibuja— y el nombre interno del repositorio eran distintos, de modo que
 * pedir la columna que se ve en pantalla daba 422. Medido contra el backend de
 * hoy, en las dos municipalidades:
 *
 * ```
 * ordenarPor=codRefCatastral     → 200   (el que el recurso publica)
 * ordenarPor=codigoRefCatastral  → 422   (el nombre interno, y hace bien)
 * ordenarPor=sector | titular | condicion | areaCatastral | areaDeclarada
 *            | diferenciaDeArea | impuestoOmitidoS | valorCatastralS
 *            | codigoDelTitular | declaroFueraDePlazo | predio | codigo → 422
 * ```
 *
 * Por eso la pantalla ofrece ordenar por UNA columna y no por siete: un
 * encabezado que se pulsa y contesta «orden no admitido» es peor que uno que
 * no se pulsa. Los tres campos que el manual propone en su «Ordenar por»
 * —impuesto omitido, diferencia de valor, sector— siguen sin admitirse, y por
 * eso ese desplegable sigue sin dibujarse.
 *
 * De los diez rechazados, dos no piden ningun dato nuevo —`sector`, que la
 * consulta ya filtra, y `diferenciaDeArea`, que es lo unico cuantificado que
 * hoy distingue a un subvaluador—: abierto en #608. Cuando lleguen, esto pasa a
 * ser una lista y la pantalla ofrece una cabecera por cada uno, computada de
 * aqui y no escrita a mano tres veces.
 */
export const ORDEN_DE_OMISOS = 'codRefCatastral';

export function listarOmisos(
  filtro: FiltroDeOmisos,
  paginacion: Paginacion,
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
  contribuyenteId: number;
  codContribuyente: string;
  /** El nombre, como en `FilaDeOmisos` desde #545. Aqui nunca es nulo: la
   *  muestra sortea predios con titular resuelto y trae ademas su codigo. */
  titular: string;
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
