import { descargar, solicitar, type RespuestaPaginada } from './cliente';
import type { FormatoDeDocumento } from './descarga';

/**
 * Lo que `sanciones` publica del procedimiento sancionador administrativo.
 *
 * Los tipos son los `record` del backend, campo por campo. Los importes y los
 * porcentajes llegan como **texto** —`Dinero` y `Alicuota` se serializan con
 * `writeString` (RNF-055)— y se dibujan como texto: pasarlos por `Number` para
 * volver a formatearlos es como se pierde un decimal.
 *
 * Una advertencia que vale para todo el módulo: **`Alicuota` va en tanto por
 * ciento, no en fracción** (0..100). `"10"` es el 10 %, no el 1000 %.
 */

/* ══════════ Enumerados del dominio, letra por letra ══════════ */

/**
 * `FaseDelProcedimiento`: los cinco pasos del acto administrativo.
 *
 * **No es el estado de la deuda**, y por eso el recurso publica los dos con
 * nombres distintos: la fase habla del procedimiento —¿ya se constató?, ¿ya se
 * sancionó?— y `estadoDeLaDeuda` habla del cobro. Cruzarlos es el defecto que
 * #397 cerró en el backend.
 *
 * Una papeleta `ANULADA` o `PRESCRITA` **no tiene fase**: llega `null`, porque
 * el vocabulario del procedimiento no tiene palabra para eso y elegir la más
 * parecida sería inventarla.
 */
export type FaseDelProcedimiento = 'PREVENTIVA' | 'CONSTATADA' | 'SANCIONADA' | 'PAGADA' | 'COACTIVA';

/** `EstadoDePapeleta`: el estado de la deuda de la multa. Siete, no cinco. */
export type EstadoDePapeleta =
  | 'IMPUESTA'
  | 'NOTIFICADA'
  | 'RESUELTA'
  | 'PAGADA'
  | 'COACTIVA'
  | 'ANULADA'
  | 'PRESCRITA';

/** `EstadoDeNotificacion`: el de la notificación preventiva, que es otro. */
export type EstadoDeNotificacion = 'EMITIDA' | 'SUBSANADA' | 'VENCIDA' | 'ANULADA';

/** `AgrupacionDelResumen`. `MES` y `ANO` son las dos que llenan la columna «Año». */
export type AgrupacionDelResumen = 'ESTADO' | 'CODIGO' | 'PLACA' | 'MES' | 'ANO';

/** `TipoDeReporteAdministrativo`: **tres**, y el manual dibuja diez. */
export type TipoDeReporteAdministrativo = 'PADRON_NOTIFICACIONES' | 'RESUMEN_PAPELETAS' | 'RESUMEN_RECAUDACION';

export type Paginacion = {
  pagina?: number;
  tamano?: number;
  ordenarPor?: string;
  direccion?: 'ASCENDENTE' | 'DESCENDENTE';
};

/* ══════════ El expediente sancionador ══════════ */

/**
 * Una fila de «Infracción administrativa». Es `ProcedimientoSancionadorResource`.
 *
 * `id` es el id de la **papeleta**, no de un expediente: el procedimiento no
 * tiene tabla propia —se deriva de la papeleta, de su notificación previa y de
 * si hay resolución de gerencia (#397)—.
 */
export type ProcedimientoSancionador = {
  id: number;
  numeroActa: string;
  administrado: string | null;
  codigoCuis: string;
  descripcionInfraccion: string;
  /** En tanto por ciento de la UIT. Texto. */
  porcentajeInfraccion: string;
  importeAPagar: string;
  /** La fecha a la que vale el importe. Viene siempre (regla 9). */
  actualizadoA: string;
  medidaComplementaria: string | null;
  /** `null` cuando la papeleta está anulada o prescrita: ahí no hay fase. */
  fase: FaseDelProcedimiento | null;
  /** El día con el que se resolvió la fase. La preventiva vence contra ella. */
  faseAlDia: string;
  estadoDeLaDeuda: EstadoDePapeleta;
};

/** Los cuatro filtros que `InfraccionesAdministrativasController` admite. */
export type FiltroDeActas = {
  nroDeActa?: string;
  administrado?: string;
  codigoCuis?: string;
  /** Se compara contra `FaseDelProcedimiento`, no contra el estado de la deuda. */
  estado?: FaseDelProcedimiento;
};

export function listarActas(
  filtro: FiltroDeActas,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ProcedimientoSancionador>> {
  return solicitar('/infracciones/actas', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ El cuadro CUIS ══════════ */

/**
 * Un código del cuadro. Es `CodigoInfraccionResource`, el mismo `record` que
 * sirve el catálogo de tránsito: los dos son `codigo_infraccion` con otra
 * `familia`.
 *
 * **No tiene columna de multa en soles ni de gravedad.** La multa es
 * `porcentajeUit` × UIT del ejercicio, y esa UIT sale del conjunto de
 * parámetros sellado, que hoy no existe (D-02a): por eso la pantalla enseña el
 * porcentaje y dice de qué depende el importe, en vez de multiplicar por una
 * UIT escrita a mano.
 */
export type CodigoInfraccion = {
  id: number;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  codigo: string;
  descripcion: string;
  /** En tanto por ciento. Texto. */
  porcentajeUit: string;
  /** La medida complementaria: clausura, retiro, paralización… */
  medida: string | null;
  /** Puntos del conductor. Solo tiene sentido en tránsito; en CUIS llega nulo. */
  puntos: number | null;
  baseLegal: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
};

/**
 * El cuadro CUIS vigente a una fecha.
 *
 * `materia` **no filtra por la materia del manual**: el controlador la pasa al
 * mismo hueco que «la descripción contiene», así que busca dentro del texto de
 * la infracción. Se manda tal cual y la pantalla lo dice: no hay columna
 * `materia` en `codigo_infraccion`.
 */
export function listarCuis(
  filtro: { codigo?: string; materia?: string; fecha?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<CodigoInfraccion>> {
  return solicitar('/infracciones/cuis', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * El mismo cuadro por la puerta de impresión: otro acceso
 * (`adm_codigos_reporte`) y privilegio de IMPRESIÓN, no de lectura.
 *
 * Devuelve JSON igual que el anterior —no un documento—, así que la pantalla
 * puede caer aquí cuando el perfil no tiene `codigos_cuis`.
 */
export function listarCuisComoReporte(
  filtro: { codigo?: string; descripcionContiene?: string; fecha?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<CodigoInfraccion>> {
  return solicitar('/infracciones/administrativas/codigos/reporte', {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
}

/* ══════════ La papeleta administrativa ══════════ */

/**
 * Una papeleta. Es `PapeletaResource`.
 *
 * Los seis importes son `String` a secas en el `record` —no `Dinero`—, así que
 * **no traen su fecha**: son las cifras del acta, congeladas al registrarla, y
 * la fecha que les corresponde es `fechaInfraccion`. Lo que se debe hoy es otra
 * cosa y la publica el libro.
 */
export type Papeleta = {
  id: number;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  numero: string;
  fechaInfraccion: string;
  horaInfraccion: string | null;
  lugar: string;
  placa: string | null;
  vehiculoId: number | null;
  infractorId: number | null;
  propietarioId: number | null;
  contribuyenteId: number | null;
  predioId: number | null;
  notificacionPreviaId: number | null;
  baseImponible: string;
  porcentajeInfraccion: string;
  importeInfraccion: string;
  porcentajeACobrar: string;
  importeAPagar: string;
  importeConBeneficio: string | null;
  estado: EstadoDePapeleta;
  usuarioRegistro: string | null;
};

/**
 * El estado de cuenta de una papeleta administrativa.
 *
 * **Siempre trae solo las pendientes**: el controlador fija `soloPendientes` y
 * no lo publica como filtro. Y el contrato declara `fechaDeCalculo` e
 * `incluirGastos`, que el controlador **no lee**: no se mandan.
 */
export function estadoDeCuentaAdministrativo(
  filtro: { papeleta?: string; codContribuyente?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Papeleta>> {
  return solicitar('/infracciones/administrativas/estado-cuenta', {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
}

/**
 * Las papeletas administrativas de un contribuyente.
 *
 * `estadoDeDeuda` **no es un valor, es una marca**: el controlador solo mira si
 * llega algo, y con cualquier texto acota a las pendientes. Por eso aquí es un
 * booleano y no un desplegable con estados que no significarían nada.
 */
export function notificacionesPorContribuyente(
  filtro: { codContribuyente?: string; ano?: number; soloPendientes?: boolean },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Papeleta>> {
  return solicitar('/infracciones/administrativas/reportes/por-contribuyente', {
    parametros: {
      codContribuyente: filtro.codContribuyente,
      ano: filtro.ano,
      estadoDeDeuda: filtro.soloPendientes ? 'PENDIENTE' : undefined,
      ...paginacion,
    },
    senal,
  });
}

/* ══════════ La notificación preventiva ══════════ */

/** Es `NotificacionAdministrativaResource`. */
export type NotificacionAdministrativa = {
  id: number;
  numero: string;
  fecha: string;
  contribuyenteId: number | null;
  predioId: number | null;
  direccion: string;
  motivo: string;
  plazoDias: number | null;
  /** Nulo cuando no hay plazo: sin plazo la notificación no vence nunca (#47). */
  vencimiento: string | null;
  estado: EstadoDeNotificacion;
  usuarioRegistro: string | null;
};

/**
 * Las notificaciones cuyo plazo venció sin subsanar.
 *
 * `conPapeleta` es tri-estado en el backend —ausente no filtra— y se lee con
 * `Boolean.parseBoolean`: cualquier texto que no sea «true» vale **false**. Por
 * eso viaja como booleano y nunca como «Sí»/«No».
 */
export function notificacionesVencidas(
  filtro: { vencidasAl?: string; fiscalizador?: string; infraccion?: string; conPapeleta?: boolean },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<NotificacionAdministrativa>> {
  return solicitar('/infracciones/administrativas/reportes/vencidas', {
    parametros: {
      vencidasAl: filtro.vencidasAl,
      fiscalizador: filtro.fiscalizador,
      infraccion: filtro.infraccion,
      conPapeleta: filtro.conPapeleta === undefined ? undefined : String(filtro.conPapeleta),
      ...paginacion,
    },
    senal,
  });
}

/** Una fila del padrón de notificaciones. Es `NotificacionDelPadronResource`. */
export type NotificacionDelPadron = {
  numero: string;
  fecha: string;
  direccion: string;
  motivo: string;
  plazoDias: number | null;
  estado: EstadoDeNotificacion;
  tienePapeleta: boolean;
  papeletaNumero: string | null;
  papeletaEstado: EstadoDePapeleta | null;
  /** Texto, y **nulo cuando no hay papeleta**: ahí no es cero, es que no existe. */
  importeDeLaPapeleta: string | null;
  actualizadoA: string;
};

export function padronDeNotificaciones(
  filtro: { desde?: string; hasta?: string; estado?: EstadoDeNotificacion },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<NotificacionDelPadron>> {
  return solicitar('/infracciones/administrativas/reportes/padron-notificaciones', {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
}

/**
 * Registra la notificación preventiva.
 *
 * **Es la única escritura de este módulo que la interfaz puede componer sin
 * inventar un campo.** El cuerpo es lista blanca: lo que no está en
 * `PeticionDeNotificacion` no entra, y `observacion` es obligatoria (regla 10).
 *
 * El manual teclea el número en tres campos —Serie, Año, Número— y
 * `NotificacionAdministrativa.numero` es **uno**, con unicidad por
 * municipalidad: la pantalla los compone y enseña lo que va a guardar.
 */
export function registrarNotificacion(peticion: {
  observacion: string;
  numero: string;
  fecha: string;
  direccion: string;
  motivo: string;
  contribuyenteId?: number;
  predioId?: number;
  plazoDias?: number;
}): Promise<NotificacionAdministrativa> {
  return solicitar('/infracciones/administrativas/notificaciones', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Los resúmenes ══════════ */

/** Es `RecaudacionDeMultasResource`. Lo recaudado según el LIBRO, no las papeletas. */
export type RecaudacionDeMultas = {
  desde: string;
  hasta: string;
  total: string;
  abonos: number;
  actualizadoA: string;
  lineas: {
    tributo: string;
    ejercicio: number;
    mes: number;
    fase: string;
    abonos: number;
    recaudado: string;
    actualizadoA: string;
  }[];
  /** El total por mes ya sumado **en el servidor**: componerlo aquí es RNF-083. */
  porMes: {
    mes: number;
    porFase: { fase: string; recaudado: string; abonos: number; actualizadoA: string }[];
    total: string;
    abonos: number;
    actualizadoA: string;
  }[];
};

/**
 * Lo recaudado por multas administrativas.
 *
 * **No admite paginación**: el controlador no recibe `ParametrosDePaginacion`.
 * Y el contrato declara `agrupadoPor`, `tipoDeCobranza` y `caja`, que este
 * endpoint **no lee**; mandarlos sería teclear un filtro que no filtra.
 */
export function recaudacionAdministrativa(ano?: number, senal?: AbortSignal): Promise<RecaudacionDeMultas> {
  return solicitar('/infracciones/administrativas/reportes/resumen-recaudacion', {
    parametros: { ano },
    senal,
  });
}

/** Es `ResumenDePapeletasResource`. */
export type ResumenDePapeletas = {
  agrupadoPor: AgrupacionDelResumen;
  desde: string;
  hasta: string;
  papeletas: number;
  importeTotal: string;
  actualizadoA: string;
  lineas: {
    clave: string;
    descripcion: string | null;
    /** Solo lo llenan `ANO` y `MES`; con otro agrupador es nulo a propósito. */
    ano: number | null;
    cantidad: number;
    importe: string;
    pagadas: number;
    importeDeLasPagadas: string;
    pendientes: number;
    importeDeLasPendientes: string;
    enCoactiva: number;
    importeEnCoactiva: string;
    actualizadoA: string;
  }[];
};

/** El sobre del emisor de reportes. Es `ReporteAdministrativoResource`. */
export type ReporteAdministrativo = {
  reporte: TipoDeReporteAdministrativo;
  padronDeNotificaciones: RespuestaPaginada<NotificacionDelPadron> | null;
  resumenDePapeletas: ResumenDePapeletas | null;
  recaudacion: RecaudacionDeMultas | null;
};

/**
 * El emisor de los tres reportes que el backend implementa.
 *
 * Sin `formato` contesta este JSON, que es lo que la hoja dibuja; con él, el
 * documento, y eso va por {@link descargarReporteAdministrativo} porque
 * `solicitar()` parsea JSON y un PDF no cabe por ahí.
 *
 * **`observacion` no viaja, y es correcto**: `PeticionDeReporteAdministrativo`
 * no la declara porque emitir un reporte no modifica nada.
 */
export function emitirReporteAdministrativo(
  peticion: {
    reporte: TipoDeReporteAdministrativo;
    desde?: string;
    hasta?: string;
    agrupadoPor?: AgrupacionDelResumen;
    estado?: string;
  },
  senal?: AbortSignal,
): Promise<ReporteAdministrativo> {
  return solicitar('/infracciones/administrativas/reportes', { metodo: 'POST', cuerpo: peticion, senal });
}

/* ══════════ Los mismos reportes, como documento ══════════ */

/**
 * El resumen de multas administrativas, en PDF, XLS o RTF (RF-132).
 *
 * **Es un `POST`**, y por eso `descargar()` recibe método y cuerpo: el tipo de
 * reporte y el formato viajan dentro, no en la consulta. Hacerlo con un `GET`
 * inventado no vale — `ReporteAdministrativoController` no publica ninguno—.
 */
export function descargarReporteAdministrativo(
  peticion: {
    reporte: TipoDeReporteAdministrativo;
    desde?: string;
    hasta?: string;
    agrupadoPor?: AgrupacionDelResumen;
    estado?: string;
  },
  formato: FormatoDeDocumento,
): Promise<void> {
  return descargar('/infracciones/administrativas/reportes', {}, undefined, {
    metodo: 'POST',
    cuerpo: { ...peticion, formato },
  });
}

/**
 * El padrón de notificaciones, como documento. Aquí sí es `GET` con `?formato`.
 *
 * Pide `IMPRESION` y no `LECTURA`, como los once reportes de #53: saca del
 * sistema un listado que en pantalla nadie llegó a ver entero.
 */
export function descargarPadronDeNotificaciones(
  filtro: { desde?: string; hasta?: string; estado?: string },
  formato: FormatoDeDocumento,
): Promise<void> {
  return descargar('/infracciones/administrativas/reportes/padron-notificaciones', { ...filtro, formato });
}

/** El resumen de recaudación, como documento. */
export function descargarRecaudacionAdministrativa(ano: string | undefined, formato: FormatoDeDocumento): Promise<void> {
  return descargar('/infracciones/administrativas/reportes/resumen-recaudacion', { ano, formato });
}

/* ══════════ Generación masiva de valores ══════════ */

/** Es `CorridaDeValoresResource`. La corrida queda registrada; **no emite nada**. */
export type CorridaDeValores = {
  id: number;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  desde: string;
  hasta: string;
  fechaCriterio: string;
  origen: string;
  totalCandidatos: number;
  usuarioRegistro: string | null;
  observacion: string;
};

/**
 * Registra el criterio de una generación masiva de valores administrativos.
 *
 * `PeticionDeCorridaDeValores` exige **exactamente uno** de los dos caminos:
 * la lista de papeletas marcadas, o el par de fechas. Los dos a la vez se
 * rechazan a propósito, para que no gane uno en silencio.
 *
 * Aquí no hay ningún campo para el número del valor ni para su serie: lo pone
 * `valor_correlativo` en el servidor.
 */
export function generarValoresAdministrativos(peticion: {
  observacion: string;
  papeletas?: string[];
  desde?: string;
  hasta?: string;
  fechaCriterio?: string;
}): Promise<CorridaDeValores> {
  return solicitar('/infracciones/administrativas/valores/generacion-masiva', {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/* ══════════ La resolución de gerencia y su notificación ══════════ */

/** `SentidoDelFallo`: cómo se resuelve el recurso. */
export type SentidoDelFallo = 'FUNDADO' | 'FUNDADO_EN_PARTE' | 'INFUNDADO' | 'IMPROCEDENTE';

/** `EfectoSobreLaMulta`: qué le pasa a la multa con esa resolución. */
export type EfectoSobreLaMulta = 'SE_MANTIENE' | 'SE_DEJA_SIN_EFECTO' | 'SE_REDUCE';

/** `ModalidadDeNotificacion`: cómo se diligenció. */
export type ModalidadDeNotificacion = 'PERSONAL' | 'CEDULON' | 'PUBLICACION' | 'CORREO' | 'NEGATIVA';

/** `ResultadoDeNotificacion`: qué pasó al intentarla. */
export type ResultadoDeNotificacion = 'NOTIFICADO' | 'NO_UBICADO' | 'RECHAZADO';

/** Un importe con la fecha a la que vale. Es `ImporteActualizado` (regla 9). */
export type ImporteActualizado = { importe: string; actualizadoA: string };

/** Es `ResolucionResource`. */
export type ResolucionDeGerencia = {
  id: number;
  numero: string;
  tipo: string;
  papeleta: string;
  fecha: string;
  nDeExpediente: string | null;
  sentidoDelFallo: SentidoDelFallo | null;
  efectoSobreLaMulta: EfectoSobreLaMulta | null;
  sancionAccesoria: string | null;
  /** La deuda proyectada, con su fecha. Nula si no se pidió proyectarla. */
  deuda: ImporteActualizado | null;
  /** Lo que la resolución dio de baja, con su fecha. */
  dadoDeBaja: ImporteActualizado | null;
  asientosDeBaja: number;
  formato: string;
  /** El SHA-256 del documento emitido: es lo que permite reimprimirlo igual. */
  resumen: string;
  nombreDeArchivo: string;
};

/**
 * Dicta la resolución de gerencia que resuelve el procedimiento sancionador.
 *
 * El tipo no viaja: lo fija la ruta —`ADMINISTRATIVA`—, igual que la familia.
 * `observacion` es obligatoria (regla 10) y `sustento` también: una resolución
 * sin sustento no se puede dictar.
 */
export function dictarResolucionAdministrativa(peticion: {
  observacion: string;
  papeleta: string;
  fecha: string;
  sustento: string;
  nDeExpediente?: string;
  sentidoDelFallo?: SentidoDelFallo;
  efectoSobreLaMulta?: EfectoSobreLaMulta;
  sancionAccesoria?: string;
  proyectarDeudaAl?: string;
}): Promise<ResolucionDeGerencia> {
  return solicitar('/infracciones/administrativas/resoluciones', { metodo: 'POST', cuerpo: peticion });
}

/** Es `DiligenciaResource`. */
export type DiligenciaDeResolucion = {
  id: number;
  resolucion: string;
  numero: string;
  intento: number;
  fechaDeNotificacion: string;
  modalidad: ModalidadDeNotificacion;
  resultado: ResultadoDeNotificacion;
  notificador: string;
  direccion: string;
  recibidoPor: string | null;
  acuse: string | null;
  /** El día desde el que la deuda es exigible. Nulo si la diligencia no surtió. */
  exigibleDesde: string | null;
  abreElPlazoDeLaSancionadora: boolean;
};

/**
 * Registra la cédula de notificación de la resolución, con su acuse.
 *
 * `modalidad` y `resultado` son **obligatorios** —el backend los exige, no los
 * deduce—, y de ellos sale si la deuda pasa a ser exigible.
 */
export function notificarResolucionAdministrativa(
  numero: string,
  peticion: {
    observacion: string;
    fechaDeNotificacion: string;
    modalidad: ModalidadDeNotificacion;
    resultado: ResultadoDeNotificacion;
    notificador: string;
    direccion?: string;
    recibidoPor?: string;
    documentoDelReceptor?: string;
    vinculo?: string;
    acuse?: string;
  },
): Promise<DiligenciaDeResolucion> {
  return solicitar(`/infracciones/administrativas/resoluciones/${encodeURIComponent(numero)}/notificacion`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}
