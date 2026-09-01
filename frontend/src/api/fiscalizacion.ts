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
 * Las tres areas llegan con la unidad dentro —`AreaM2.toString()` es
 * `toPlainString() + " m2"`—, igual que en omisos. Se dibujan tal cual.
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

/** `VersionResource`: una version del proceso con lo que cambio respecto de la anterior. */
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
