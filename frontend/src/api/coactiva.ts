import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `coactiva` publica, campo por campo como lo declaran sus `record`:
 * `ExpedienteResource`, `ProcesoResource`, `ActoResource`, `LiquidacionResource`,
 * `DeudaCoactivaResource`, `DeudaPorObligacionResource`, `ImportacionResource`,
 * `ConvenioCoactivoResource` e `ImpresionDeRecResource`.
 *
 * **Los importes llegan como texto** (RNF-055, regla 1). Se dibujan como texto:
 * pasarlos por `Number` para volver a formatearlos es como se pierde un céntimo.
 * Y ninguno viaja sin su fecha (regla 9): `deudaAlDia`, `aLaFecha`, `fechaCorte`.
 */

/* ══════════ Los enumerados, letra por letra ══════════ */

/**
 * Los seis estados del procedimiento, con el código del manual.
 *
 * `INICIADO` es el séptimo y no lo ofrece el desplegable «Nuevo estado» del
 * manual: es el estado con que nace el expediente al importar, no uno al que se
 * pase. Se declara porque **sí** llega en las lecturas.
 *
 * **«FRACCIONADO» no está, y no es un olvido**: `DeudaCoactivaController` lo
 * rechaza con 422 explicando que suscribir un convenio no mueve el expediente
 * —mueve su deuda a fase CONVENIO en el libro—. El desplegable del prototipo lo
 * ofrecía; aquí no se ofrece.
 */
export const ESTADOS_DEL_EXPEDIENTE = [
  { nombre: 'INICIADO', codigo: '000', etiqueta: 'INICIADO' },
  { nombre: 'REC1_EMITIDA', codigo: '011', etiqueta: 'REC 01 EMITIDO' },
  { nombre: 'REC1_NOTIFICADA', codigo: '012', etiqueta: 'REC 01 NOTIFICADA' },
  { nombre: 'REC2_EMITIDA', codigo: '021', etiqueta: 'REC 02 EMITIDA' },
  { nombre: 'MEDIDA_CAUTELAR', codigo: '031', etiqueta: 'MEDIDA CAUTELAR' },
  { nombre: 'SUSPENDIDO', codigo: '041', etiqueta: 'SUSPENDIDO' },
  { nombre: 'CONCLUIDO', codigo: '051', etiqueta: 'CONCLUIDO' },
] as const;

export type EstadoDelExpediente = (typeof ESTADOS_DEL_EXPEDIENTE)[number]['nombre'];

/**
 * Los diez actos que `TipoDeActoCoactivo` declara, con el título del documento
 * que los materializa —el mismo que se imprime—.
 *
 * `mueveElEstado` y `exigeDeudaViva` son los dos campos del enumerado, copiados
 * para poder decir en pantalla qué va a pasar **antes** de dictar. No se
 * inventan: `CONCLUSION`, `SUSPENSION` y `LEVANTAMIENTO` son los tres que no
 * exigen deuda viva, porque se dictan **porque** la cobranza terminó.
 */
export const TIPOS_DE_ACTO = [
  { nombre: 'REC1', titulo: 'RESOLUCION DE EJECUCION COACTIVA', mueveA: 'REC 01 EMITIDO', exigeDeudaViva: true, llevaMedida: false },
  { nombre: 'REC2', titulo: 'RESOLUCION DE MEDIDA CAUTELAR (REC 2)', mueveA: 'REC 02 EMITIDA', exigeDeudaViva: true, llevaMedida: true },
  { nombre: 'MEDIDA_CAUTELAR', titulo: 'MEDIDA CAUTELAR', mueveA: 'MEDIDA CAUTELAR', exigeDeudaViva: true, llevaMedida: false },
  { nombre: 'EMBARGO', titulo: 'ACTA DE EMBARGO', mueveA: 'MEDIDA CAUTELAR', exigeDeudaViva: true, llevaMedida: false },
  { nombre: 'TASACION', titulo: 'TASACION', mueveA: null, exigeDeudaViva: true, llevaMedida: false },
  { nombre: 'REMATE', titulo: 'REMATE', mueveA: null, exigeDeudaViva: true, llevaMedida: false },
  { nombre: 'SUSPENSION', titulo: 'RESOLUCION DE SUSPENSION', mueveA: 'SUSPENDIDO', exigeDeudaViva: false, llevaMedida: false },
  { nombre: 'LEVANTAMIENTO', titulo: 'RESOLUCION DE LEVANTAMIENTO', mueveA: null, exigeDeudaViva: false, llevaMedida: false },
  { nombre: 'CONCLUSION', titulo: 'RESOLUCION DE CONCLUSION', mueveA: 'CONCLUIDO', exigeDeudaViva: false, llevaMedida: false },
  { nombre: 'OTRO', titulo: 'ACTO COACTIVO', mueveA: null, exigeDeudaViva: true, llevaMedida: false },
] as const;

export type TipoDeActo = (typeof TIPOS_DE_ACTO)[number]['nombre'];

/** Las cuatro formas del art. 33 que `TipoDeMedidaCautelar` admite. */
export const MEDIDAS_CAUTELARES = [
  { nombre: 'RETENCION', etiqueta: 'EMBARGO EN FORMA DE RETENCION' },
  { nombre: 'INSCRIPCION', etiqueta: 'EMBARGO EN FORMA DE INSCRIPCION' },
  { nombre: 'DEPOSITO', etiqueta: 'EMBARGO EN FORMA DE DEPOSITO' },
  { nombre: 'INTERVENCION', etiqueta: 'EMBARGO EN FORMA DE INTERVENCION' },
] as const;

/** Las cinco modalidades del art. 104 que `ModalidadDeNotificacion` declara. */
export const MODALIDADES_DE_NOTIFICACION = ['PERSONAL', 'CEDULON', 'PUBLICACION', 'CORREO', 'NEGATIVA'] as const;

/** Los tres resultados que `ResultadoDeNotificacion` declara. */
export const RESULTADOS_DE_NOTIFICACION = ['NOTIFICADO', 'NO_UBICADO', 'RECHAZADO'] as const;

/** Los dos estados que `EstadoDeLaLiquidacion` deriva del pendiente. */
export const ESTADOS_DE_LIQUIDACION = ['ACTIVA', 'CANCELADA'] as const;

/** Los tres formatos de `FormatoDeDocumento`. */
export const FORMATOS = ['PDF', 'XLS', 'RTF'] as const;

/* ══════════ El expediente ══════════ */

/** Una línea del historial. Es `ExpedienteResource.MovimientoResource`. */
export type MovimientoDelExpediente = {
  /** APERTURA, ESTADO o DIRECCION. */
  tipo: string;
  estado: string | null;
  estadoCodigo: string | null;
  direccionReferencial: string | null;
  fecha: string;
  motivo: string;
  fecDoc: string | null;
  numDoc: string | null;
  /** El movimiento de estado que rige hoy. Se **deriva** del historial. */
  activo: boolean;
  usuario: string | null;
  observaciones: string;
};

/** Un valor dentro del expediente. Es `ExpedienteResource.ValorImportadoResource`. */
export type ValorImportado = { valorId: number; fechaDeImportacion: string };

/**
 * El expediente coactivo. Es `ExpedienteResource`.
 *
 * `valoresImportados` e `historial` **llegan vacíos en la grilla** y llenos al
 * pedir la ficha por `nroDeExpediente`: una página de veinte no puede costar
 * veinte lecturas de historial. Una lista vacía aquí no significa «no tiene».
 */
export type Expediente = {
  numero: string;
  ejercicio: number;
  correlativo: number;
  codContribuyente: string;
  ejecutor: string;
  auxiliar: string | null;
  fechaDeApertura: string;
  asunto: string | null;
  direccionReferencial: string | null;
  estado: string;
  estadoCodigo: string;
  valores: number;
  insoluto: string;
  reajuste: string;
  interes: string;
  gastos: string;
  deudaMateriaDeCobranza: string;
  costas: string;
  totalExigible: string;
  /** A qué día están las siete cifras anteriores (regla 9). */
  deudaAlDia: string;
  valoresImportados: ValorImportado[];
  historial: MovimientoDelExpediente[];
};

export type FiltroDeExpedientes = {
  nroDeExpediente?: string;
  codContribuyente?: string;
  ejecutor?: string;
  estado?: string;
};

export function listarExpedientes(
  filtro: FiltroDeExpedientes,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Expediente>> {
  return solicitar('/coactiva/expedientes', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ La deuda del expediente, obligación por obligación ══════════ */

/**
 * Una obligación del expediente. Es `DeudaPorObligacionResource.LineaDeDeudaResource`.
 *
 * Los cuatro primeros campos son exactamente los de
 * `PeticionDeConvenioCoactivo.PeticionDeObligacionAcogida`: la fila que se marca
 * en la grilla es la que viaja en el cuerpo, sin que nadie la recomponga.
 */
export type LineaDeDeuda = {
  tributo: string;
  ejercicio: number;
  predioId: number | null;
  vehiculoId: number | null;
  /** Una costa se cobra igual pero no se acoge como una cuota más. */
  esCosta: boolean;
  insolutoS: string;
  reajusteS: string;
  interesS: string;
  gastosS: string;
  totalS: string;
};

/** Es `DeudaPorObligacionResource`. Los tres totales vienen calculados (RNF-083). */
export type DeudaDelExpediente = {
  expediente: string;
  codContribuyente: string;
  contribuyente: string;
  estado: string;
  /** Una sola fecha para todas las filas: va en la cabecera, no por fila. */
  aLaFecha: string;
  obligaciones: LineaDeDeuda[];
  deudaMateriaDeCobranzaS: string;
  costasS: string;
  totalS: string;
};

export function deudaDelExpediente(
  numero: string,
  fechaDeCalculo?: string,
  senal?: AbortSignal,
): Promise<DeudaDelExpediente> {
  return solicitar(`/coactiva/expedientes/${encodeURIComponent(numero)}/deuda`, {
    parametros: { fechaDeCalculo },
    senal,
  });
}

/* ══════════ El proceso: el expediente y sus actuaciones ══════════ */

/** Una diligencia de notificación. Es `ActoResource.DiligenciaResource`. */
export type Diligencia = {
  intento: number;
  fecha: string;
  modalidad: string;
  resultado: string;
  /** Si abrió el plazo del art. 14.1. Se **deriva** del resultado. */
  surtioEfecto: boolean;
  exigibleDesde: string | null;
  notificador: string;
  domicilio: string;
  receptor: string | null;
  documentoReceptor: string | null;
  vinculo: string | null;
  acuse: string | null;
  usuario: string | null;
  observaciones: string;
};

/**
 * Un acto coactivo con sus diligencias. Es `ActoResource`.
 *
 * **Sin importes, y sin identificador.** Lo primero es deliberado del backend
 * —la deuda viaja una sola vez, en el expediente—. Lo segundo no se documenta
 * en ninguna parte y tiene consecuencia: `LiquidacionResource.CostaResource`
 * identifica el acto que tarifa por `actoId`, y aquí no hay `actoId` con el que
 * casarlo. Ver `costaDelActo` en la pantalla.
 */
export type ActoCoactivo = {
  tipo: string;
  titulo: string;
  numero: string;
  fecha: string;
  descripcion: string;
  /** Solo la REC-2 la lleva. */
  medida: string | null;
  /** El día desde el que la REC-2 se podía dictar. Solo la REC-2 lo lleva. */
  exigibleDesde: string | null;
  usuario: string | null;
  observaciones: string;
  diligencias: Diligencia[];
};

/** Es `ProcesoResource`. La deuda viaja una sola vez, dentro de `expediente`. */
export type ProcesoCoactivo = { expediente: Expediente; actuaciones: ActoCoactivo[] };

/**
 * El seguimiento del expediente: su ficha y sus actuaciones.
 *
 * **`proyectarInteresAl` lo lee el controlador y el contrato no lo declara.**
 * El contrato declara para esta ruta `contribuyente`, `expedienteAno`,
 * `expedienteNumero` y `estado` —cuatro que `ActoCoactivoController.verProceso`
 * no lee— y no declara el único que sí lee. Se manda igual porque es el que
 * decide la fecha de todas las cifras (regla 9): sin él la pantalla enseñaría
 * la deuda de hoy bajo la etiqueta del día que se pidió.
 */
export function procesoDelExpediente(
  numero: string,
  proyectarInteresAl?: string,
  senal?: AbortSignal,
): Promise<ProcesoCoactivo> {
  return solicitar(`/coactiva/expedientes/${encodeURIComponent(numero)}/proceso`, {
    parametros: { proyectarInteresAl },
    senal,
  });
}

/* ══════════ Las costas ══════════ */

/**
 * Una línea del detalle de la liquidación. Es `LiquidacionResource.CostaResource`.
 *
 * `arancelFuente` es lo que explica la cifra: la llave del parámetro sellado y
 * su documento fuente. Sin él la pantalla mostraría un importe que nadie puede
 * justificar.
 */
export type CostaLiquidada = {
  actoId: number;
  /** El **tipo** del acto tarifado, no su número: `REC1`, `EMBARGO`… */
  acto: string;
  descripcion: string;
  montoS: string;
  arancelFuente: string;
};

/**
 * Una liquidación de costas. Es `LiquidacionResource`.
 *
 * Dos fechas y las dos viajan: `fecha` es de cuándo es `totalS` —congelado el
 * día de la liquidación— y `aLaFecha` a qué día está `pendienteS`.
 * `pendienteS`, `aLaFecha` y `estado` llegan nulos en la liquidación recién
 * registrada: todavía no hay pendiente que consultar.
 */
export type LiquidacionDeCostas = {
  nroLiquidacion: string;
  expedCoact: string;
  ejercicio: number;
  fecha: string;
  tributo: string;
  totalS: string;
  pendienteS: string | null;
  aLaFecha: string | null;
  estado: string | null;
  /** De qué conjunto sellado salieron los aranceles (ARQ-09 §3). */
  conjuntoDeParametros: number;
  observacion: string;
  usuarioRegistro: string | null;
  costas: CostaLiquidada[];
};

export type FiltroDeLiquidaciones = {
  nroLiquidacion?: string;
  nroExpedCoact?: string;
  contribuyente?: string;
  estado?: string;
};

export function listarLiquidaciones(
  filtro: FiltroDeLiquidaciones,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<LiquidacionDeCostas>> {
  return solicitar('/coactiva/liquidaciones-costas', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ La consulta de deudas ══════════ */

/** El último acto dictado. Es `DeudaCoactivaResource.ActuacionResource`. */
export type UltimaActuacion = { acto: string; numero: string; fecha: string };

/**
 * Un beneficio registrado, tal como la norma lo declara. Es
 * `DeudaCoactivaResource.BeneficioResource`.
 *
 * `porcentajeDeclarado` y `montoDeclarado` **no son un descuento calculado**:
 * son lo que la ordenanza dice. `efectoSobreElImporte` trae, escrito por el
 * backend, por qué no hay cifra rebajada (D-02b, #191).
 */
export type BeneficioRegistrado = {
  tipo: string;
  clase: string;
  tributo: string;
  porcentajeDeclarado: string | null;
  montoDeclarado: string | null;
  baseLegal: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  efectoSobreElImporte: string;
};

/**
 * Una fila de la consulta de deudas. Es `DeudaCoactivaResource`.
 *
 * `totalS` viaja **calculado** —`deudaS + costasS`— porque sumar en la pantalla
 * es lo que RNF-083 prohíbe. `beneficios` solo llega en `deudas-en-beneficio`.
 */
export type DeudaEnCoactiva = {
  expediente: string;
  ano: number;
  codContribuyente: string;
  contribuyente: string;
  tributos: string[];
  deudaS: string;
  costasS: string;
  totalS: string;
  aLaFecha: string;
  estado: string;
  ultimaActuacion: UltimaActuacion | null;
  beneficios: BeneficioRegistrado[] | null;
};

/**
 * La deuda en cobranza coactiva.
 *
 * **`tipoDeDeuda` solo admite `TRIBUTARIA`**: el controlador rechaza con 422 los
 * otros tres del desplegable del prototipo, porque a un expediente se importan
 * valores y hoy el sistema no distingue más. Por eso la pantalla no los ofrece.
 */
export function listarDeudas(
  filtro: { contribuyente?: string; nExpediente?: string; estado?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<DeudaEnCoactiva>> {
  return solicitar('/coactiva/deudas', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * La deuda de los obligados con beneficio registrado y vigente.
 *
 * **No admite filtrar por campaña**: `benefAplicable` distinto de `TODOS` da 422,
 * porque saber qué deuda alcanza cada campaña es D-02b. Y la respuesta **no trae
 * ninguna cifra rebajada**, a propósito.
 */
export function listarDeudasEnBeneficio(
  filtro: { contribuyente?: string; fechaDeCalculo?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<DeudaEnCoactiva>> {
  return solicitar('/coactiva/deudas-en-beneficio', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ La importación ══════════ */

/** Un valor que no entró, con su motivo. Es `ImportacionResource.RechazoResource`. */
export type ValorRechazado = { numero: string; motivo: string; detalle: string };

/**
 * El informe de una importación. Es `ImportacionResource`.
 *
 * `expediente` es **nulo cuando no entró ningún valor**, y eso no es un error:
 * la respuesta es 200 con el informe explicando rechazo por rechazo.
 */
export type InformeDeImportacion = {
  expediente: Expediente | null;
  importados: number;
  rechazados: ValorRechazado[];
};

export type PeticionDeImportacion = {
  codContribuyente: string;
  /** Vacía significa «todos los que se puedan». */
  valores?: string[];
  ejecutor: string;
  auxiliar?: string;
  asunto?: string;
  direccionReferencialDelContribuyente?: string;
  fecha?: string;
  observacion: string;
};

export function importarValores(peticion: PeticionDeImportacion): Promise<InformeDeImportacion> {
  return solicitar('/coactiva/expedientes/importacion', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Los dos cambios del expediente ══════════ */

/**
 * Cambia el estado del expediente conservando su historial.
 *
 * No actualiza ninguna fila: **agrega** un movimiento. `activo` no viaja y es
 * deliberado del backend —el movimiento que rige es el último y eso se deriva—.
 */
export function cambiarEstado(
  numero: string,
  peticion: {
    nuevoEstado: string;
    fecha?: string;
    motivo: string;
    documentoDeRespaldoFecha?: string;
    documentoDeRespaldoNumero?: string;
    observacion: string;
  },
): Promise<Expediente> {
  return solicitar(`/coactiva/expedientes/${encodeURIComponent(numero)}/estados`, {
    metodo: 'PATCH',
    cuerpo: peticion,
  });
}

export function cambiarDireccionReferencial(
  numero: string,
  peticion: { nuevaDireccionReferencial: string; fecha?: string; motivo: string; observacion: string },
): Promise<Expediente> {
  return solicitar(`/coactiva/expedientes/${encodeURIComponent(numero)}/direccion-referencial`, {
    metodo: 'PATCH',
    cuerpo: peticion,
  });
}

/* ══════════ Los actos, la REC y las notificaciones ══════════ */

/** El papel que salió con un acto. Es `DocumentoDelActoResource`, sin los bytes. */
export type DocumentoDelActo = {
  numero: string;
  formato: string;
  nombreDeArchivo: string;
  /** El SHA-256 de la **primera** emisión: es lo que hace comprobable la reimpresión. */
  resumen: string;
  fechaDeEmision: string;
  reimpresiones: number;
  bytes: number;
};

/** Es `ActoCoactivoController.ActoDictadoResource`. */
export type ActoDictado = {
  expediente: string;
  acto: ActoCoactivo;
  documento: DocumentoDelActo;
  estadoDelExpediente: string;
  deudaTotal: string;
  deudaAlDia: string;
};

/**
 * Dicta un acto sobre el expediente **y emite su documento**.
 *
 * No es una escritura más: el papel que sale se notifica al obligado y el acto
 * mueve el estado del procedimiento. `acto_coactivo` no admite `UPDATE` desde
 * V34, así que no se corrige — se deja sin efecto con otro acto.
 */
export function registrarActo(
  numero: string,
  peticion: {
    tipo: TipoDeActo;
    fecha?: string;
    glosa: string;
    /** Obligatoria en la REC-2, prohibida en los demás. */
    medida?: string;
    formato?: string;
    observacion: string;
  },
): Promise<ActoDictado> {
  return solicitar(`/coactiva/expedientes/${encodeURIComponent(numero)}/actos`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/**
 * Registra la diligencia de notificación de un acto.
 *
 * **No lleva el número de intento**: lo pone el sistema. Devuelve el acto con
 * *todas* sus diligencias, no solo la recién registrada.
 */
export function notificarActo(peticion: {
  acto: string;
  fecha?: string;
  modalidad: string;
  resultado: string;
  notificador: string;
  domicilio?: string;
  receptor?: string;
  documentoReceptor?: string;
  vinculo?: string;
  acuse?: string;
  observacion: string;
}): Promise<ActoCoactivo> {
  return solicitar('/coactiva/notificaciones', { metodo: 'POST', cuerpo: peticion });
}

/** Es `ImpresionDeRecResource`, expediente por expediente y con su motivo. */
export type ImpresionDeRec = {
  emitidas: {
    expediente: string;
    acto: ActoCoactivo;
    documento: DocumentoDelActo;
    /** Nulo en una reimpresión, que no mueve el procedimiento. */
    estadoDelExpediente: string | null;
  }[];
  rechazadas: { expediente: string; motivo: string }[];
};

export function emitirRec(peticion: {
  expedientes: string[];
  rec?: 'REC1' | 'REC2';
  medida?: string;
  fecha?: string;
  proyectarInteresAl?: string;
  glosa?: string;
  formato?: string;
  reimprimir?: boolean;
  observacion: string;
}): Promise<ImpresionDeRec> {
  return solicitar('/coactiva/rec/impresion', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ El convenio coactivo ══════════ */

/** Una fila del cronograma. La cuota 0 es la inicial. */
export type CuotaDelConvenio = {
  nro: number;
  vencimiento: string;
  cuotaS: string;
  capitalS: string;
  interesS: string;
  gastoS: string;
};

/** Una obligación acogida, con la fase a la que volvería si el convenio se quiebra. */
export type DeudaAcogida = {
  tributo: string;
  ejercicio: number;
  periodo: number;
  predioId: number | null;
  vehiculoId: number | null;
  faseOrigen: string;
  aLaFecha: string;
  insolutoS: string;
  reajusteS: string;
  interesS: string;
  gastoS: string;
  totalS: string;
};

/** Es `ConvenioCoactivoResource`. `nroConvenio` es nulo en una simulación. */
export type ConvenioCoactivo = {
  nroConvenio: string | null;
  expedCoact: string;
  tipo: string;
  estado: string;
  fecha: string;
  fechaCorte: string;
  deudaTotalS: string;
  cuotaInicialS: string;
  nroDeCuotas: number;
  totalDelCronogramaS: string;
  interesDeFraccionamientoMensual: string;
  conjuntoDeParametros: number;
  cronograma: CuotaDelConvenio[];
  deudaAcogida: DeudaAcogida[];
};

/**
 * El preconvenio coactivo, o solo su cronograma.
 *
 * **`cuotaInicial` es un porcentaje, no soles** (`Alicuota`, 0..100), aunque el
 * prototipo rotule «Pago inicial (S/)». Con `simular: true` responde 200 y no
 * consume correlativo; sin él, 201 y el preconvenio queda registrado.
 */
export function fraccionarEnCoactiva(peticion: {
  nroExpedCoact: string;
  fecha?: string;
  fechaDeCorte?: string;
  nroDeCuotas: number;
  cuotaInicial?: string;
  primeraCuotaVence?: string;
  resolucion?: string;
  obligaciones: { tributo: string; ejercicio: number; predioId?: number | null; vehiculoId?: number | null }[];
  simular?: boolean;
  observacion?: string;
}): Promise<ConvenioCoactivo> {
  return solicitar('/coactiva/convenios', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Los valores que se pueden importar ══════════ */

/**
 * Un valor emitido. Es `ValorResource`, del módulo Valores.
 *
 * Vive aquí y no en un `api/valores.ts` porque **la importación lo necesita y
 * Valores no está conectado todavía**: la pantalla `importacion` tiene que
 * ofrecer los valores del obligado para marcarlos, y `PeticionDeImportacion`
 * los identifica por su número. El día que Valores tenga su propio módulo de
 * API, este trozo se muda entero.
 */
export type Valor = {
  id: number;
  tipo: string;
  numero: string;
  ejercicio: number;
  codContribuyente: string;
  nombreContribuyente: string;
  baseLegal: string;
  estado: string;
  /** Llega como texto, no como fecha: es lo que `ValorResource` declara. */
  proyectadoA: string;
  total: string;
  fechaEmision: string;
  observacion: string;
};

/**
 * Los valores emitidos del contribuyente.
 *
 * **El contrato declara un filtro `estado` y `ValoresController.buscar` no lo
 * lee** —solo `nroDeValor`, `codContribuyente`, `tipo` y `ejercicio`—, así que
 * no se manda: un filtro que viaja y no filtra devuelve una lista que parece
 * acotada y no lo está.
 */
export function listarValores(
  filtro: { nroDeValor?: string; codContribuyente?: string; tipo?: string; ejercicio?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Valor>> {
  return solicitar('/valores', { parametros: { ...filtro, ...paginacion }, senal });
}
