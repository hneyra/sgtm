import { solicitar, type RespuestaPaginada } from './cliente';

/**
 * Lo que `sanciones` publica de la familia de tránsito.
 *
 * Los tipos son los `record` del backend, campo por campo. Importes y
 * porcentajes llegan como **texto** —`Dinero` y `Alicuota` se serializan con
 * `writeString` (RNF-055)— y se dibujan como texto.
 *
 * Dos avisos que valen para todo el módulo:
 *
 * - **`Alicuota` va en tanto por ciento** (0..100), no en fracción.
 * - **`actualizadoA` de una papeleta NO es hoy**: es su fecha de infracción.
 *   Los importes del acta se congelan al registrarla; lo que se debe hoy es
 *   otra cosa y la publica el libro (`estadoDeCuenta`).
 */

/* ══════════ Enumerados del dominio, letra por letra ══════════ */

/** `EstadoDePapeleta`. Siete, y ninguno se traduce por parecido. */
export type EstadoDePapeleta =
  | 'IMPUESTA'
  | 'NOTIFICADA'
  | 'RESUELTA'
  | 'PAGADA'
  | 'COACTIVA'
  | 'ANULADA'
  | 'PRESCRITA';

/** `EstadoDeInternamiento`. */
export type EstadoDeInternamiento = 'INTERNADO' | 'LIBERADO' | 'EN_ABANDONO';

/** `TipoDeRecurso`: lo que se presenta contra una papeleta. */
export type TipoDeRecurso = 'DESCARGO' | 'RECONSIDERACION' | 'APELACION' | 'NULIDAD';

/** `AgrupacionDelResumen`. Solo `ANO` y `MES` llenan la columna «Año». */
export type AgrupacionDelResumen = 'ESTADO' | 'CODIGO' | 'PLACA' | 'MES' | 'ANO';

/** `TipoDeReporteDeTransito`: los **nueve** que el emisor implementa. */
export type TipoDeReporteDeTransito =
  | 'PADRON'
  | 'PADRON_COACTIVA'
  | 'PADRON_CONSTANCIAS'
  | 'RECORD_CONDUCTOR'
  | 'RECORD_VEHICULAR'
  | 'RESUMEN_RECAUDACION'
  | 'RESUMEN_PAPELETAS'
  | 'RESUMEN_CODIGO'
  | 'RESUMEN_PLACA';

export type Paginacion = {
  pagina?: number;
  tamano?: number;
  ordenarPor?: string;
  direccion?: 'ASCENDENTE' | 'DESCENDENTE';
};

/* ══════════ La papeleta ══════════ */

/**
 * Una papeleta. Es `PapeletaResource`.
 *
 * **No publica el código de infracción ni la licencia**, aunque `Papeleta` los
 * lleva dentro: para eso están el padrón (`PapeletaDelPadron`) y la hoja
 * informativa. Aquí salen «—».
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

/** Los seis filtros que `PapeletasController` admite, y ni uno más. */
export type FiltroDePapeletas = {
  nroPapeleta?: string;
  placa?: string;
  documentoDelInfractor?: string;
  desde?: string;
  hasta?: string;
  estado?: EstadoDePapeleta;
};

export function listarPapeletas(
  filtro: FiltroDePapeletas,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Papeleta>> {
  return solicitar('/transito/papeletas', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * La búsqueda avanzada. Otra ruta, otro acceso (`transito_busqueda`).
 *
 * `estadoDeDeuda` **no es un valor**: el controlador solo mira si llega algo, y
 * con cualquier texto acota a las pendientes. Por eso viaja como booleano.
 */
export function buscarPapeletas(
  filtro: { papeleta?: string; nPlaca?: string; soloPendientes?: boolean; ingresadoPor?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Papeleta>> {
  return solicitar('/transito/papeletas/busqueda', {
    parametros: {
      papeleta: filtro.papeleta,
      nPlaca: filtro.nPlaca,
      estadoDeDeuda: filtro.soloPendientes ? 'PENDIENTE' : undefined,
      ingresadoPor: filtro.ingresadoPor,
      ...paginacion,
    },
    senal,
  });
}

/**
 * El estado de cuenta de infracciones.
 *
 * **Siempre son las pendientes**: el controlador fija `soloPendientes` y no lo
 * publica. Y el contrato declara `estado` y `fechaDeCalculo`, que **no lee**:
 * no se mandan, porque un filtro que no filtra es peor que no tenerlo.
 */
export function estadoDeCuenta(
  filtro: { conductor?: string; placa?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Papeleta>> {
  return solicitar('/transito/estado-cuenta', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ El catálogo del reglamento ══════════ */

/**
 * Un código del Reglamento Nacional de Tránsito. Es `CodigoInfraccionResource`.
 *
 * **No tiene columna de gravedad.** El artboard filtra por «Muy grave / Grave /
 * Leve» y `codigo_infraccion` no guarda esa clasificación: lo que hay es el
 * porcentaje de UIT y los puntos. El contrato llegó a declarar un filtro
 * `gravedad` que el controlador no lee.
 */
export type CodigoInfraccion = {
  id: number;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  codigo: string;
  descripcion: string;
  /** En tanto por ciento de la UIT. Texto. */
  porcentajeUit: string;
  medida: string | null;
  puntos: number | null;
  baseLegal: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
};

export function listarCodigos(
  filtro: { codigo?: string; textoDeLaInfraccion?: string; fecha?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<CodigoInfraccion>> {
  return solicitar('/transito/codigos', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ El internamiento ══════════ */

/** Es `InternamientoResource`. */
export type Internamiento = {
  id: number;
  placa: string;
  papeleta: string | null;
  deposito: string;
  fechaDeIngreso: string;
  fechaDeSalida: string | null;
  /** Días de custodia contados **al día `calculadoA`**, no a hoy (regla 9). */
  dias: number;
  calculadoA: string;
  estado: EstadoDeInternamiento;
  /** La tasa diaria, como texto. */
  tasaDeCustodia: string;
  acta: string;
};

/**
 * Los vehículos del depósito.
 *
 * `deposito: 'Todos'` y `estado: 'Todos'` los entiende el backend como «sin
 * filtro», y el estado admite espacios —«EN ABANDONO»—; aquí se manda el
 * enumerado tal cual.
 */
export function listarInternamientos(
  filtro: { placa?: string; deposito?: string; estado?: EstadoDeInternamiento; aLaFecha?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Internamiento>> {
  return solicitar('/transito/internamientos', { parametros: { ...filtro, ...paginacion }, senal });
}

/** Lo que devuelve la liberación. Es `LiberacionResource`. */
export type Liberacion = {
  placa: string;
  fecha: string;
  dias: number;
  estado: EstadoDeInternamiento;
  acta: string;
  /** El recibo con que se acreditó la custodia, y su importe con fecha. */
  custodiaPagada: {
    recibo: string;
    concepto: string;
    importe: { importe: string; actualizadoA: string };
  };
  formato: string;
  /** El SHA-256 del acta emitida. */
  resumen: string;
  nombreDeArchivo: string;
};

/**
 * Entrega el vehículo y cierra el internamiento.
 *
 * **La casilla «custodia cancelada» del prototipo no basta y por eso no está**:
 * el backend acredita el recibo contra tesorería por su API pública, y sin esa
 * acreditación el vehículo no sale —responde 409—. Lo que la pantalla pide es
 * el número del recibo, que es el dato que se puede comprobar.
 */
export function liberarVehiculo(
  placa: string,
  peticion: {
    observacion: string;
    fechaDeLiberacion: string;
    reciboDeCustodia: string;
    personaQueRetira: string;
    documentoDeQuienRetira: string;
    soatVigenteAcreditado?: boolean;
  },
): Promise<Liberacion> {
  return solicitar(`/transito/internamientos/${encodeURIComponent(placa)}/liberacion`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/* ══════════ El expediente de una papeleta ══════════ */

/** Una diligencia de notificación de un acto. Es `AcuseResource`. */
export type AcuseDelActo = {
  intento: number;
  fecha: string;
  modalidad: string;
  resultado: string;
  recibidoPor: string | null;
  acuse: string | null;
  /** El día desde el que la ley permite el paso siguiente. Nulo si no la hubo. */
  exigibleDesde: string | null;
};

/** Un documento emitido sobre la papeleta. Es `ActoResource`. */
export type ActoDeLaPapeleta = {
  clase: string;
  tipo: string;
  numero: string;
  fecha: string;
  documentoId: number;
  observacion: string;
  acuses: AcuseDelActo[];
};

/** Un recurso presentado. Es `DescargoDelExpediente`. */
export type DescargoDelExpediente = {
  id: number;
  nDeExpediente: string;
  fecha: string;
  tipoDeRecurso: TipoDeRecurso;
  presentadoHasta: string;
  enPlazo: boolean;
};

/** Es `ExpedienteResource`. **No es paginado**: es el expediente entero. */
export type ExpedienteDeLaPapeleta = {
  papeleta: string;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  estado: EstadoDePapeleta;
  descargos: DescargoDelExpediente[];
  actos: ActoDeLaPapeleta[];
};

/**
 * Los documentos y recursos de una papeleta, en orden de fecha.
 *
 * El contrato declara aquí `contribuyente`, `papeletaN`, `placaN`, `expediente`
 * y paginación; el controlador **solo lee `familia`**, que el contrato no
 * declara. Se manda lo que el controlador lee.
 */
export function expedienteDeLaPapeleta(numero: string, senal?: AbortSignal): Promise<ExpedienteDeLaPapeleta> {
  return solicitar(`/transito/papeletas/${encodeURIComponent(numero)}/actos`, {
    parametros: { familia: 'TRANSITO' },
    senal,
  });
}

/**
 * La hoja informativa de una papeleta. Es `HojaInformativaResource`.
 *
 * `actualizadoA` es la **fecha de la infracción** y `emitidaEl` el día en que
 * sale la hoja: son cosas distintas y las dos van impresas. La hoja **no dice
 * lo que se debe hoy**.
 */
export type HojaInformativa = {
  numero: string;
  fechaInfraccion: string;
  horaInfraccion: string | null;
  lugar: string;
  placa: string | null;
  licenciaConducir: string | null;
  codigoInfraccion: string | null;
  descripcionInfraccion: string | null;
  obligadoCodigo: string | null;
  obligadoNombre: string | null;
  obligadoDocumento: string | null;
  obligadoDomicilio: string | null;
  estado: EstadoDePapeleta;
  baseImponible: string;
  porcentajeInfraccion: string;
  importeInfraccion: string;
  porcentajeACobrar: string;
  importeAPagar: string;
  importeConBeneficio: string | null;
  actualizadoA: string;
  emitidaEl: string;
};

export function hojaInformativa(numero: string, senal?: AbortSignal): Promise<HojaInformativa> {
  return solicitar(`/transito/papeletas/${encodeURIComponent(numero)}/hoja-informativa`, { senal });
}

/* ══════════ Padrones y records ══════════ */

/**
 * Una fila del padrón. Es `PapeletaDelPadronResource`.
 *
 * A diferencia de `Papeleta`, esta **sí** trae el código de la infracción, su
 * descripción, la licencia y el nombre del obligado: es la fila que el manual
 * dibuja. Y trae `valorNumero` cuando ya se le emitió la resolución de multa.
 */
export type PapeletaDelPadron = {
  numero: string;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  fechaInfraccion: string;
  horaInfraccion: string | null;
  lugar: string;
  placa: string | null;
  licenciaConducir: string | null;
  codigoInfraccion: string;
  descripcionInfraccion: string;
  obligadoCodigo: string | null;
  obligadoNombre: string | null;
  infractorNombre: string | null;
  estado: EstadoDePapeleta;
  pendiente: boolean;
  importeAPagar: string;
  /** La fecha del acta, no la de hoy. */
  actualizadoA: string;
  valorNumero: string | null;
};

export function padronDePapeletas(
  filtro: { desde?: string; hasta?: string; estado?: EstadoDePapeleta },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PapeletaDelPadron>> {
  return solicitar('/transito/reportes/padron', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * Las papeletas que ya tienen su resolución de multa emitida.
 *
 * **No admite `ejecutor` ni `estadoDelExpediente`**: el backend los rechaza con
 * 422 porque no son columnas de la papeleta —viven en el expediente coactivo—.
 * Por eso no están en la firma.
 */
export function padronCoactiva(
  filtro: { desde?: string; hasta?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PapeletaDelPadron>> {
  return solicitar('/transito/reportes/padron-coactiva', { parametros: { ...filtro, ...paginacion }, senal });
}

/** Es `ConstanciaLibreResource`. `verificadaAl` es lo que acredita, no `fechaEmision`. */
export type ConstanciaLibre = {
  numero: string;
  placa: string;
  verificadaAl: string;
  fechaEmision: string;
  usuarioQueEmitio: string | null;
  observacion: string;
};

export function padronDeConstancias(
  filtro: { desde?: string; hasta?: string; nDeConstancia?: string; usuarioQueEmitio?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ConstanciaLibre>> {
  return solicitar('/transito/reportes/padron-constancias', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * El historial de un conductor. **Uno de los dos filtros es obligatorio**: sin
 * ninguno esto sería el padrón entero con otro título, y el backend lo rechaza.
 */
export function recordDeConductor(
  filtro: { licencia?: string; documento?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PapeletaDelPadron>> {
  return solicitar('/transito/reportes/record-conductor', { parametros: { ...filtro, ...paginacion }, senal });
}

/** El historial de un vehículo. La placa es obligatoria, por lo mismo. */
export function recordVehicular(
  placa: string,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PapeletaDelPadron>> {
  return solicitar('/transito/reportes/record-vehicular', { parametros: { placa, ...paginacion }, senal });
}

/* ══════════ Los cuatro resúmenes ══════════ */

/** Es `ResumenDePapeletasResource`. Cuenta **actas**, no lo cobrado. */
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

/**
 * Cuántas papeletas hay y por cuánto.
 *
 * Sin `agrupadoPor` el backend agrupa por **año** —no por estado—, que es lo
 * que llena la columna «Año» del manual. El contrato declara además `cobranza`,
 * que el controlador no lee: no se manda, porque cada línea ya trae las
 * pendientes y las coactivas en columnas aparte.
 *
 * **No está paginado**: el controlador no recibe `ParametrosDePaginacion`.
 */
export function resumenDePapeletas(
  filtro: { desde?: string; hasta?: string; agrupadoPor?: AgrupacionDelResumen },
  senal?: AbortSignal,
): Promise<ResumenDePapeletas> {
  return solicitar('/transito/reportes/resumen-papeletas', { parametros: { ...filtro }, senal });
}

/** El mismo resumen forzado a agrupar por código de infracción. */
export function resumenPorCodigo(
  filtro: { codigoDeInfraccion?: string; desde?: string; hasta?: string; estado?: EstadoDePapeleta },
  senal?: AbortSignal,
): Promise<ResumenDePapeletas> {
  return solicitar('/transito/reportes/resumen-por-codigo', { parametros: { ...filtro }, senal });
}

/** El mismo resumen por las dos letras iniciales de la placa. */
export function resumenPorPlaca(
  filtro: { iniciales2Letras?: string; desde?: string; hasta?: string; estado?: EstadoDePapeleta },
  senal?: AbortSignal,
): Promise<ResumenDePapeletas> {
  return solicitar('/transito/reportes/resumen-por-placa', { parametros: { ...filtro }, senal });
}

/** Es `RecaudacionDeMultasResource`. Lo recaudado según el **libro**. */
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
  /** El total de cada mes ya sumado **en el servidor** (#398, RNF-083). */
  porMes: {
    mes: number;
    porFase: { fase: string; recaudado: string; abonos: number; actualizadoA: string }[];
    total: string;
    abonos: number;
    actualizadoA: string;
  }[];
};

/**
 * Lo recaudado por papeletas de tránsito.
 *
 * **No admite el filtro por caja**: la caja es de tesorería y el libro no sabe
 * en qué ventanilla se cobró; mandarla da 422. Tampoco `tipoDeCobranza` ni
 * `agrupadoPor`, que el contrato declara y el controlador no lee.
 */
export function resumenDeRecaudacion(ano?: number, senal?: AbortSignal): Promise<RecaudacionDeMultas> {
  return solicitar('/transito/reportes/resumen-recaudacion', { parametros: { ano }, senal });
}

/* ══════════ Las tres escrituras que la pantalla puede componer ══════════ */

/** Es `DescargoResource`. */
export type Descargo = {
  id: number;
  nDeExpediente: string;
  papeleta: string;
  fecha: string;
  tipoDeRecurso: TipoDeRecurso;
  fundamento: string;
  presentadoHasta: string;
  enPlazo: boolean;
  /** El plazo tal cual lo dice el parámetro: «5 DIAS_HABILES». */
  plazo: string;
  observacion: string;
};

/**
 * Registra un descargo contra una papeleta.
 *
 * El cuerpo es lista blanca y `observacion` es obligatoria (regla 10). Los dos
 * campos que también viajan por la consulta —`papeleta` y `nDeExpediente`—
 * ganan desde el cuerpo, así que se mandan solo ahí.
 */
export function registrarDescargo(peticion: {
  observacion: string;
  papeleta: string;
  nDeExpediente: string;
  fechaDePresentacion: string;
  tipoDeRecurso: TipoDeRecurso;
  fundamento: string;
}): Promise<Descargo> {
  return solicitar('/transito/descargos', { metodo: 'POST', cuerpo: { ...peticion, familia: 'TRANSITO' } });
}

/**
 * Corrige el número de una papeleta mal tecleada.
 *
 * Es el **único PATCH** del módulo, y devuelve la papeleta ya corregida.
 */
export function cambiarNumeroDePapeleta(
  numero: string,
  peticion: { observacion: string; numeroNuevo: string },
): Promise<Papeleta> {
  return solicitar(`/transito/papeletas/${encodeURIComponent(numero)}/codigo`, {
    metodo: 'PATCH',
    cuerpo: peticion,
  });
}

/** Es `CorridaDeValoresResource`. La corrida se registra; **no emite valores**. */
export type CorridaDeValores = {
  id: number;
  familia: 'TRANSITO' | 'ADMINISTRATIVA';
  desde: string;
  hasta: string;
  fechaCriterio: string;
  /** `SELECCION` | `RANGO`, según por dónde entró. */
  origen: string;
  totalCandidatos: number;
  usuarioRegistro: string | null;
  observacion: string;
};

/**
 * Registra el criterio de una generación masiva de valores de tránsito.
 *
 * Exige **exactamente uno** de los dos caminos —la selección o el rango—; los
 * dos a la vez se rechazan a propósito. No hay campo para el número del valor:
 * lo pone `valor_correlativo` en el servidor.
 */
export function generarValoresDeTransito(peticion: {
  observacion: string;
  papeletas?: string[];
  desde?: string;
  hasta?: string;
  fechaCriterio?: string;
}): Promise<CorridaDeValores> {
  return solicitar('/transito/valores/generacion-masiva', { metodo: 'POST', cuerpo: peticion });
}
