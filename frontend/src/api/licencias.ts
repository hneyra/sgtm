import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `licencias` publica, campo por campo como lo declaran sus `record`:
 * `LicenciaResource`, `ActoDeLicenciaResource`, `PadronDeLicenciasResource`,
 * `ResumenAnualResource`, `CiiuResource`, `CertificadoResource`,
 * `AnuncioResource`, `FueResource` y `ReporteDeEdificacionResource`.
 *
 * **Los importes llegan como texto y con su fecha** (RNF-055 y regla 9): lo que
 * viaja es un `ImporteActualizado`, nunca una cifra suelta.
 */

/** Un importe con el día al que corresponde. Es `ImporteActualizado`. */
export type ImporteActualizado = { importe: string; actualizadoA: string };

/** Un papel emitido, sin sus bytes. Es `ActoDeLicenciaResource.DocumentoResource`. */
export type Documento = {
  numero: string;
  formato: string;
  resumen: string;
  bytes: number;
  reimpresiones: number;
};

/** Los tres formatos de `FormatoDeDocumento`. */
export const FORMATOS = ['PDF', 'XLS', 'RTF'] as const;

/* ══════════ Los enumerados, letra por letra ══════════
   Se escriben con los nombres que el `enum` del backend tiene, no con los del
   desplegable del prototipo. «ACTIVA» no es `VIGENTE` e «INDETERMINADA» no es
   `DEFINITIVA`: parecerse no es serlo, y traducir por parecido es el error que
   #427 se negó a cometer. Los que el prototipo ofrece y el enumerado no tiene
   quedan fuera, y la pantalla dice cuáles. */

/** `EstadoDeLicencia`. El prototipo ofrecía además ACTIVA y DUPLICADA. */
export const ESTADOS_DE_LICENCIA = ['VIGENTE', 'VENCIDA', 'CANCELADA'] as const;

/** `TipoDeLicencia`. El prototipo ofrecía además INDETERMINADA, CESIONARIO y MERCADO. */
export const TIPOS_DE_LICENCIA = ['DEFINITIVA', 'TEMPORAL', 'CESIONARIA'] as const;

/** `RiesgoItse`. */
export const RIESGOS_ITSE = ['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'] as const;

/** `TipoDeCertificado`, con la etiqueta que el backend imprime. */
export const TIPOS_DE_CERTIFICADO = [
  { nombre: 'NUMERACION', etiqueta: 'Certificado de numeracion' },
  { nombre: 'ZONIFICACION_VIAS', etiqueta: 'Certificado de zonificacion y vias' },
  { nombre: 'PARAMETROS_URBANISTICOS', etiqueta: 'Certificado de parametros urbanisticos y edificatorios' },
  { nombre: 'JURISDICCION', etiqueta: 'Certificado de jurisdiccion' },
] as const;

/** `ClaseDeAnuncio`. El prototipo ofrecía «AVISO LUMINOSO», que aquí es un *tipo*. */
export const CLASES_DE_ANUNCIO = ['LETRERO', 'PANEL', 'TOLDO', 'BANDEROLA', 'PANTALLA_DIGITAL', 'GLOBO_AEROSTATICO'] as const;

/** `TipoDeAnuncio`. */
export const TIPOS_DE_ANUNCIO = ['AVISO_SIMPLE', 'AVISO_LUMINOSO', 'AVISO_ILUMINADO', 'AVISO_ELECTRONICO'] as const;

/** `EstadoDelAnuncio`, con la inicial que la grilla pinta en «Est.». */
export const ESTADOS_DEL_ANUNCIO = ['VIGENTE', 'VENCIDO', 'CESADO', 'RETIRADO'] as const;

/**
 * `TipoDeTramiteDeEdificacion`, con sus dos propiedades.
 *
 * `emiteLicencia` es falso en el anteproyecto en consulta, que se resuelve con
 * una conformidad; `exigeOriginal` es cierto en la ampliación y la revalidación,
 * que **nombran** una licencia anterior y no la sustituyen. Las dos vienen del
 * enumerado y no se deducen aquí: de la segunda depende que la petición tenga
 * que llevar `nroLicenciaAnterior`, y sin él el backend contesta 404.
 */
export const TRAMITES_DE_EDIFICACION = [
  { nombre: 'ANTEPROYECTO_EN_CONSULTA', etiqueta: 'Anteproyecto en consulta', emiteLicencia: false, exigeOriginal: false },
  { nombre: 'LICENCIA_DE_OBRA', etiqueta: 'Licencia de obra', emiteLicencia: true, exigeOriginal: false },
  { nombre: 'AMPLIACION_DE_LICENCIA', etiqueta: 'Ampliacion de licencia', emiteLicencia: true, exigeOriginal: true },
  { nombre: 'REVALIDACION_DE_LICENCIA', etiqueta: 'Revalidacion de licencia', emiteLicencia: false, exigeOriginal: true },
  { nombre: 'REGULARIZACION_DE_LICENCIA', etiqueta: 'Regularizacion de licencia', emiteLicencia: true, exigeOriginal: false },
] as const;

/** `ModalidadDeAprobacion`, con lo que significa cada letra. */
export const MODALIDADES = [
  { nombre: 'A', etiqueta: 'Aprobacion automatica', exigeComision: false },
  { nombre: 'B', etiqueta: 'Aprobacion con evaluacion previa', exigeComision: false },
  { nombre: 'C', etiqueta: 'Comision tecnica', exigeComision: true },
  { nombre: 'D', etiqueta: 'Comision tecnica', exigeComision: true },
] as const;

/** `TipoDeObra`. El prototipo ofrecía «DEMOLICIÓN TOTAL»; el enumerado dice DEMOLICION. */
export const TIPOS_DE_OBRA = ['EDIFICACION_NUEVA', 'AMPLIACION', 'REMODELACION', 'DEMOLICION', 'CERCO', 'PUESTA_EN_VALOR'] as const;

/** `EstadoDelFue`. */
export const ESTADOS_DEL_FUE = ['EN_TRAMITE', 'VIGENTE', 'VENCIDA', 'ANULADA'] as const;

/** `SeccionDelFue`, con el rótulo que el FUE le da a cada una. */
export const SECCIONES_DEL_FUE = [
  { nombre: 'TERRENO', etiqueta: 'Datos del terreno' },
  { nombre: 'PROYECTO', etiqueta: 'Caracteristicas del proyecto' },
  { nombre: 'VALORIZACION', etiqueta: 'Valorizacion por pisos y estructuras' },
  { nombre: 'PROFESIONALES', etiqueta: 'Proyectistas y responsable de obra' },
  { nombre: 'DOCUMENTOS', etiqueta: 'Documentos adjuntos' },
] as const;

/* ══════════ Licencia de funcionamiento ══════════ */

export type GiroDeLaLicencia = { codigo: string; descripcion: string | null; principal: boolean; activo: boolean };

export type MovimientoDeLicencia = {
  tipo: string;
  fecha: string;
  motivo: string | null;
  resolucion: string;
  observacion: string;
};

export type DuplicadoDeLicencia = { numero: number; fecha: string; motivo: string; reimpresion: number };

/**
 * Una licencia de funcionamiento. Es `LicenciaResource`.
 *
 * **`estadoALaFecha` viaja siempre**: el estado de una temporal depende del día,
 * así que «VENCIDA» sin fecha significaría otra cosa mañana (regla 9).
 *
 * **Ningún importe.** Una licencia no lleva cifras: el derecho de trámite se
 * pagó antes y su importe está en el recibo.
 *
 * `historial` y `duplicados` llegan vacíos en la grilla y llenos al pedir la
 * ficha por `nroLicencia`. Una lista vacía aquí no significa «no tiene».
 */
export type Licencia = {
  nroLicencia: string;
  /** La inicial del estado, para la columna «Est.» de la grilla. */
  est: string;
  estado: string;
  estadoALaFecha: string;
  contribuyente: string;
  codContribuyente: string;
  denominacionComercial: string;
  direccion: string;
  tipoDeLicencia: string;
  areaDelEstablecimiento: string;
  zonificacion: string | null;
  aforo: number | null;
  fechaDeEmision: string;
  fechaDeVencimiento: string | null;
  nExpediente: string | null;
  fechaDeExpediente: string | null;
  fichaEconomica: number | null;
  giros: GiroDeLaLicencia[];
  historial: MovimientoDeLicencia[];
  duplicados: DuplicadoDeLicencia[];
};

/**
 * Las licencias.
 *
 * **No hay filtro de estado ni de tipo aquí**: `LicenciaController.listar` solo
 * lee `nroLicencia`, `nExpediente`, `nombreDelContribuyente`,
 * `denominacionComercial` y `direccion`. Los dos que faltan existen en el
 * padrón (`POST .../reportes/padron`), que es otra operación.
 */
export function listarLicencias(
  filtro: {
    nroLicencia?: string;
    nExpediente?: string;
    nombreDelContribuyente?: string;
    denominacionComercial?: string;
    direccion?: string;
  },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Licencia>> {
  return solicitar('/licencias/funcionamiento', { parametros: { ...filtro, ...paginacion }, senal });
}

/** Es `ActoDeLicenciaResource`: la emisión, la cancelación y el duplicado. */
export type ActoDeLicencia = {
  nroLicencia: string;
  /** EMISION, CANCELACION o DUPLICADO. */
  acto: string;
  fecha: string;
  resolucion: Documento;
  /** Solo en el duplicado: la licencia reimpresa, **con el número de la original**. */
  licenciaReimpresa: Documento | null;
  numeroDeDuplicado: number | null;
  estado: string;
};

export function emitirLicencia(peticion: {
  codContribuyente: string;
  predioId?: number;
  denominacionComercial: string;
  direccion: string;
  areaDelEstablecimiento: string;
  tipoDeLicencia: string;
  zonificacion?: string;
  aforo?: number;
  fechaDeEmision?: string;
  fechaDeVencimiento?: string;
  nDeRecibo: string;
  giros: string[];
  giroPrincipal?: string;
  nExpediente?: string;
  fechaDeExpediente?: string;
  formato?: string;
  observacion: string;
}): Promise<ActoDeLicencia> {
  return solicitar('/licencias/funcionamiento', { metodo: 'POST', cuerpo: peticion });
}

export function cancelarLicencia(
  id: string,
  peticion: { fecha?: string; motivo: string; formato?: string; observacion: string },
): Promise<ActoDeLicencia> {
  return solicitar(`/licencias/funcionamiento/${encodeURIComponent(id)}/cancelacion`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

export function duplicarLicencia(
  id: string,
  peticion: { fecha?: string; motivo: string; nDeRecibo: string; formato?: string; observacion: string },
): Promise<ActoDeLicencia> {
  return solicitar(`/licencias/funcionamiento/${encodeURIComponent(id)}/duplicado`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/* ══════════ Los dos reportes de funcionamiento ══════════ */

/**
 * El padrón de licencias. Es `PadronDeLicenciasResource`.
 *
 * Los cuatro recuentos cubren **todas** las licencias del criterio, no solo las
 * de esta página: los calcula un agregado del motor. `aLaFecha` es la fecha de
 * corte, no un filtro: reimprimir el padrón de marzo con su misma fecha da el
 * mismo papel.
 */
export type PadronDeLicencias = {
  aLaFecha: string;
  licencias: number;
  vigentes: number;
  vencidas: number;
  canceladas: number;
  pagina: number;
  tamano: number;
  filas: Licencia[];
};

/**
 * El padrón, que es un `POST` porque así lo declara el contrato.
 *
 * Los ocho criterios son los de la sección «Filtrado por» de la pantalla y sus
 * nombres cuadran 1:1; **sus valores no**, y por eso los desplegables de la
 * pantalla ofrecen solo lo que `EstadoDeLicencia` y `TipoDeLicencia` tienen.
 */
export function padronDeLicencias(peticion: {
  nLicenciaSerie?: string;
  nLicenciaNumero?: string;
  estado?: string;
  tipoLic?: string;
  ciiu?: string;
  direccion?: string;
  nombreDelContribuyente?: string;
  fecLicDesde?: string;
  fecLicHasta?: string;
  aLaFecha?: string;
  pagina?: number;
  tamano?: number;
}, senal?: AbortSignal): Promise<PadronDeLicencias> {
  return solicitar('/licencias/funcionamiento/reportes/padron', { metodo: 'POST', cuerpo: peticion, senal });
}

/**
 * Un año del resumen. Es `ResumenAnualResource.FilaResource`.
 *
 * **El derecho de trámite va con su fecha o no va.** Cuando el conjunto sellado
 * de ese año no permite resolver el concepto del TUPA, `derechoDeTramiteS`
 * llega nulo y `derechoNoDisponible` dice por qué: la pantalla imprime «—», y
 * un cero se leería como un año en el que no se cobró nada.
 */
export type FilaDelResumenAnual = {
  ano: number;
  emitidas: number;
  canceladas: number;
  duplicados: number;
  vigentesAlCierre: number;
  derechoDeTramiteS: ImporteActualizado | null;
  derechoNoDisponible: string | null;
  /** El día al que se derivó «vigentes al cierre». */
  alCierre: string;
};

export type ResumenAnual = { aLaFecha: string; filas: FilaDelResumenAnual[] };

/**
 * El resumen por ejercicio.
 *
 * **El contrato y el controlador no dicen lo mismo aquí.** El contrato declara
 * `agrupadoPor` y la paginación común, que `LicenciaController.resumenAnual` no
 * lee, y **no declara `aLaFecha`**, que sí lee y que es la fecha de corte de
 * toda la hoja (regla 9). Se mandan solo los tres que el controlador lee.
 */
export function resumenAnualDeLicencias(
  filtro: { desdeElAno?: string; hastaElAno?: string; tipoDeLicencia?: string; aLaFecha?: string },
  senal?: AbortSignal,
): Promise<ResumenAnual> {
  return solicitar('/licencias/funcionamiento/reportes/resumen-anual', { parametros: { ...filtro }, senal });
}

/* ══════════ El catálogo CIIU ══════════ */

/** Un giro del catálogo. Es `CiiuResource`. */
export type Ciiu = {
  codigo: string;
  descripcion: string;
  seccion: string | null;
  riesgoItse: string | null;
  zonificacionCompatible: string | null;
  requiereSectorial: boolean;
  /** Lo agregó la municipalidad, no vino en el catálogo nacional. */
  extendido: boolean;
  activo: boolean;
};

export function listarCiiu(
  filtro: { codigoCiiu?: string; descripcion?: string; seccion?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Ciiu>> {
  return solicitar('/licencias/ciiu', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * Agrega un giro al catálogo.
 *
 * **No lleva `activo` ni `extendido`**: un giro nace activo y nace extendido, y
 * aceptarlos del cliente permitiría dar de alta uno ya retirado. No hay `PUT`:
 * el catálogo se extiende, no se corrige.
 */
export function registrarCiiu(peticion: {
  codigo: string;
  descripcion: string;
  seccion?: string;
  riesgoItse?: string;
  zonificacionCompatible?: string;
  requiereSectorial?: boolean;
  observacion: string;
}): Promise<Ciiu> {
  return solicitar('/licencias/ciiu', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Los certificados ══════════ */

/** Un certificado. Es `CertificadoResource`. */
export type Certificado = {
  nCertificado: string;
  tipo: string;
  tipoEtiqueta: string;
  /** El código predial. La columna «Código catastral» del prototipo. */
  predio: string;
  direccion: string;
  solicitante: string;
  codContribuyente: string;
  fecha: string;
  vigenciaHasta: string;
  derechoS: ImporteActualizado;
  estado: string;
  estadoALaFecha: string;
  nExpediente: string | null;
  documento: string;
  zonificacion: string | null;
  alturaMaximaPermitida: string | null;
  areaLibreMinima: string | null;
  retiroMunicipal: string | null;
  coeficienteDeEdificacion: string | null;
};

/**
 * Los certificados emitidos.
 *
 * **Aquí `solicitante` es el NOMBRE**, y en `emitirCertificado` es el CÓDIGO del
 * contribuyente. Los dos campos se llaman igual y no son lo mismo: teclear el
 * nombre en la emisión produce un 404 sobre una persona que sí está en el
 * padrón.
 */
export function listarCertificados(
  filtro: { nDeCertificado?: string; tipo?: string; predio?: string; solicitante?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Certificado>> {
  return solicitar('/licencias/certificados', { parametros: { ...filtro, ...paginacion }, senal });
}

/** Es `ActoDeCertificadoResource`. `documento` es nulo en el reintento idempotente. */
export type ActoDeCertificado = {
  nCertificado: string;
  tipo: string;
  predio: string;
  direccion: string;
  solicitante: string;
  fecha: string;
  vigenciaHasta: string;
  derechoS: ImporteActualizado;
  yaExistia: boolean;
  documento: Documento | null;
};

/**
 * Emite un certificado.
 *
 * **`derechoDeTramiteS` y `vigencia` no viajan**: el importe lo dice el recibo y
 * la vigencia sale del conjunto sellado. `nDeRecibo` sí, porque es el papel que
 * el administrado trae a ventanilla.
 */
export function emitirCertificado(peticion: {
  tipoDeCertificado: string;
  codigoPredial: string;
  /** El **código** del contribuyente, no su nombre. */
  solicitante: string;
  nDeExpediente?: string;
  fechaDeEmision?: string;
  nDeRecibo: string;
  zonificacion?: string;
  alturaMaximaPermitida?: string;
  areaLibreMinima?: string;
  retiroMunicipal?: string;
  coeficienteDeEdificacion?: string;
  formato?: string;
  observacion: string;
}): Promise<ActoDeCertificado> {
  return solicitar('/licencias/certificados', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Anuncios y propaganda ══════════ */

/** Un movimiento de la autorización. Es `AnuncioResource.MovimientoResource`. */
export type MovimientoDeAnuncio = {
  tipo: string;
  fecha: string;
  ejercicio: number;
  referenciaDelCargo: string | null;
  tasa: ImporteActualizado | null;
  fecVenc: string | null;
  motivo: string | null;
  observacion: string;
};

/** Una autorización de anuncio. Es `AnuncioResource`. */
export type Anuncio = {
  nroAutorizacion: string;
  est: string;
  estado: string;
  estadoALaFecha: string;
  contribuyente: string;
  codContribuyente: string;
  documentoDelTitular: string;
  nroLicencia: string | null;
  claseAnuncio: string;
  tipoAnuncio: string;
  ubicacion: string | null;
  forma: string | null;
  denominacion: string | null;
  direccion: string;
  area: string;
  nroLados: number | null;
  cantidad: number | null;
  fecInicio: string;
  fecVenc: string | null;
  nroDeExpediente: string | null;
  fechaExp: string | null;
  /** La tasa devengada por la autorización, con su fecha. */
  tasaDevengada: ImporteActualizado | null;
  historial: MovimientoDeAnuncio[];
};

/**
 * Las autorizaciones de anuncio.
 *
 * **El contrato declara además `rUC` y `dNI`, que `AnuncioController.listar` no
 * lee**: son dos filtros que viajarían y no filtrarían, así que no se mandan.
 * Tampoco hay filtro de clase ni de estado aquí —los tiene el padrón, que es un
 * `POST`—.
 */
export function listarAnuncios(
  filtro: { nroAutorizacion?: string; contribuyente?: string; nExpediente?: string; direccion?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Anuncio>> {
  return solicitar('/autorizaciones/anuncios', { parametros: { ...filtro, ...paginacion }, senal });
}

/** Es `ActoDeAnuncioResource`. `yaExistia` distingue el reintento idempotente. */
export type ActoDeAnuncio = {
  nroAutorizacion: string;
  acto: string;
  fecha: string;
  ejercicio: number;
  referenciaDelCargo: string | null;
  tasa: ImporteActualizado | null;
  fecVenc: string | null;
  yaExistia: boolean;
};

/**
 * Autoriza un anuncio **y genera su deuda por la tasa**.
 *
 * La tasa no viaja: sale del conjunto sellado (regla 5). Con la ordenanza sin
 * cargar responde 422 nombrando la llave `TASA_ANUNCIO:<CLASE>`, que es lo que
 * tiene que pasar mientras D-02b siga abierta.
 */
export function registrarAnuncio(peticion: {
  codContribuyente: string;
  nroLicencia?: string;
  predioId?: number;
  claseAnuncio: string;
  tipoAnuncio: string;
  ubicacion?: string;
  forma?: string;
  denominacion?: string;
  direccion: string;
  area: string;
  nroLados?: number;
  cantidad?: number;
  fecInicio?: string;
  fecVenc?: string;
  nroDeExpediente?: string;
  fechaExp?: string;
  observacion: string;
}): Promise<ActoDeAnuncio> {
  return solicitar('/autorizaciones/anuncios', { metodo: 'POST', cuerpo: peticion });
}

/** Renueva, cesa o retira. Un solo cuerpo para los tres: cuándo y por qué. */
export function actoSobreAnuncio(
  id: string,
  acto: 'renovacion' | 'cese' | 'retiro',
  peticion: { fecha?: string; fecVenc?: string; motivo?: string; observacion: string },
): Promise<ActoDeAnuncio> {
  return solicitar(`/autorizaciones/anuncios/${encodeURIComponent(id)}/${acto}`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/** El padrón de anuncios. Es `PadronDeAnunciosResource`. */
export type PadronDeAnuncios = {
  aLaFecha: string;
  autorizaciones: number;
  devengado: ImporteActualizado | null;
  pagina: number;
  tamano: number;
  filas: Anuncio[];
};

export function padronDeAnuncios(peticion: {
  contribuyente?: string;
  direccion?: string;
  claseAnuncio?: string;
  desde?: string;
  hasta?: string;
  aLaFecha?: string;
  pagina?: number;
  tamano?: number;
}, senal?: AbortSignal): Promise<PadronDeAnuncios> {
  return solicitar('/autorizaciones/anuncios/reportes', { metodo: 'POST', cuerpo: peticion, senal });
}

/* ══════════ El FUE de edificación ══════════ */

export type RepresentanteLegal = {
  dni: string | null;
  nombre: string | null;
  partidaRegistral: string | null;
  vigenciaPoder: string | null;
};

export type TerrenoDelFue = {
  version: number;
  codCatastral: string | null;
  direccion: string | null;
  mz: string | null;
  lt: string | null;
  areaDelTerrenoM: string | null;
  zonificacion: string | null;
  partidaRegistral: string | null;
  frenteM: string | null;
  fondoM: string | null;
};

export type ProyectoDelFue = {
  version: number;
  usoDeLaEdificacion: string | null;
  nDePisos: number | null;
  areaTechadaTotalM: string | null;
  areaLibreM: string | null;
  nDeEstacionamientos: number | null;
  plazoDeEjecucionMeses: number | null;
};

/** Una línea de la valorización. **Sin importe**: el valor por m² sale del cuadro. */
export type LineaDeValorizacion = { piso: number; partida: string; categoria: string; areaM: string };

export type ProfesionalDelFue = { tipo: string; nombre: string; colegio: string | null; colegiatura: string | null };

export type RequisitoDelFue = { requisito: string; presentado: boolean; folios: number | null };

export type MovimientoDeEdificacion = {
  tipo: string;
  fecha: string;
  nroLicencia: string | null;
  motivo: string | null;
  resolucion: string | null;
  observacion: string;
};

/** Un tramo de vigencia. La revalidación abre el siguiente al día después del anterior. */
export type VigenciaDeLicencia = { tramo: number; desde: string; hasta: string };

/**
 * Un FUE de edificación. Es `FueResource`.
 *
 * **`valorDeObra` puede faltar y significa algo concreto**: el cuadro de valores
 * unitarios no tiene la celda que hace falta, y `llaveQueFalta` la nombra. Se
 * imprime «—», nunca un cero: un «valor de obra 0,00» es indistinguible de uno
 * correcto cuando llega al papel que se exhibe en la obra (#48).
 *
 * `seccionesFaltantes` y `completo` son la compuerta real del trámite: lo que
 * falta para poder emitir, dicho por el backend y no deducido en la pantalla.
 * **Pero solo en la ficha**: `FueResource.de(fila)` —el que compone la fila de
 * la grilla— los escribe fijos, `List.of()` y `false`, sin mirar el expediente.
 * Leídos de una fila del listado dirían «incompleto y no le falta ninguna
 * sección» de cualquier expediente, incluida una licencia ya emitida.
 */
export type Fue = {
  nroExpediente: string;
  fechaDeclaracion: string;
  nroLicencia: string | null;
  est: string;
  estado: string;
  estadoALaFecha: string;
  contribuyente: string;
  nombreContribuyente: string;
  tipoTramite: string;
  obra: string | null;
  modalidad: string | null;
  revision: string | null;
  nroExpedienteAnterior: string | null;
  solicitanteEsPropietario: boolean;
  representanteLegal: RepresentanteLegal | null;
  terreno: TerrenoDelFue | null;
  proyecto: ProyectoDelFue | null;
  valorizacion: LineaDeValorizacion[];
  valorDeObra: ImporteActualizado | null;
  valorDeObraNoDisponible: string | null;
  llaveQueFalta: string | null;
  profesionales: ProfesionalDelFue[];
  documentos: RequisitoDelFue[];
  historial: MovimientoDeEdificacion[];
  vigencias: VigenciaDeLicencia[];
  seccionesFaltantes: string[];
  completo: boolean;
};

export function listarFue(
  filtro: {
    nroExpediente?: string;
    nroLicencia?: string;
    nombreContribuyente?: string;
    lugarMz?: string;
    lugarLt?: string;
    tipoTramite?: string;
  },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Fue>> {
  return solicitar('/licencias/edificacion', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * Presenta un FUE: da de alta el expediente con su cabecera.
 *
 * **`obra` y `modalidadAprobacion` son obligatorios aunque el `record` los
 * declare anulables**: `EdificacionController` los exige y contesta «Falta el
 * campo obligatorio 'obra'». Y `nroLicenciaAnterior` lo es cuando el trámite
 * `exigeOriginal` —ampliación y revalidación—: sin él la respuesta es 404 sobre
 * una licencia que nadie nombró.
 */
export function presentarFue(peticion: {
  nroExpediente: string;
  fechaDeclaracion?: string;
  codContribuyente: string;
  predioId?: number;
  tipoTramite: string;
  obra?: string;
  modalidadAprobacion?: string;
  revision?: string;
  nroExpedienteAnterior?: string;
  nroLicenciaAnterior?: string;
  solicitanteEsPropietario?: boolean;
  representanteDni?: string;
  representanteNombre?: string;
  representantePartidaRegistral?: string;
  representanteVigenciaPoder?: string;
  observacion: string;
}): Promise<Fue> {
  return solicitar('/licencias/edificacion', { metodo: 'POST', cuerpo: peticion });
}

/** Es `ActoDeEdificacionResource`: la emisión y la revalidación. */
export type ActoDeEdificacion = {
  nroExpediente: string;
  nroLicencia: string;
  acto: string;
  fecha: string;
  resolucion: Documento;
  vigencias: VigenciaDeLicencia[];
  valorDeObraNoDisponible: string | null;
};

export function emitirLicenciaDeEdificacion(
  expediente: string,
  peticion: { fechaDeEmision?: string; vigenciaHasta: string; nDeRecibo: string; formato?: string; observacion: string },
): Promise<ActoDeEdificacion> {
  return solicitar(`/licencias/edificacion/${encodeURIComponent(expediente)}/licencia`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/**
 * El reporte general de edificación. Es `ReporteDeEdificacionResource`.
 *
 * Es la única salida con importes del módulo, y por eso cada fila lleva su
 * fecha. `valorDeObraS` nulo con su `valorDeObraNoDisponible` es el mismo
 * reparto que en el FUE: «—» y el motivo, nunca un cero.
 */
export type FilaDelReporteDeEdificacion = {
  nLicencia: string | null;
  expediente: string;
  fecha: string;
  administrado: string;
  predio: string | null;
  modalidad: string | null;
  areaAConstruirM: string | null;
  valorDeObraS: ImporteActualizado | null;
  valorDeObraNoDisponible: string | null;
  estado: string;
  estadoALaFecha: string;
};

export function reporteDeEdificacion(
  filtro: { desde?: string; hasta?: string; modalidad?: string; estado?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<FilaDelReporteDeEdificacion>> {
  return solicitar('/licencias/edificacion/reportes/general', { parametros: { ...filtro, ...paginacion }, senal });
}
