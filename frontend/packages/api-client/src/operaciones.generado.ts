/* ARCHIVO GENERADO — no editar a mano.
 * Origen: docs/50-api/openapi/sgtm-v1.yaml (el contrato).
 * Regenerar con: yarn generar-operaciones
 *
 * Las 134 operaciones del contrato como tipos: verbo, ruta, parametros y —cuando
 * el contrato ya describe el recurso— cuerpo y respuesta.
 *
 * El contrato manda, y manda en las dos direcciones: si el yaml cambia y esto
 * no se regenera, «yarn verificar» falla; si se regenera, deja de compilar el
 * codigo escrito contra el nombre viejo. Juntas, esas dos mitades convierten un
 * cambio de contrato en un error de compilacion en vez de en un defecto que
 * aparece en el navegador.
 */

/** Verbo HTTP de una operacion del contrato. */
export type VerboDeOperacion = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Verbo, camino y parametros de una operacion, tal como los declara el contrato. */
export interface DescriptorDeOperacion {
  readonly metodo: VerboDeOperacion;
  /** Camino relativo a `/api/v1`, con sus parametros entre llaves. */
  readonly ruta: string;
  readonly parametrosDeRuta: readonly string[];
  readonly parametrosDeConsulta: readonly string[];
}

/**
 * Cuerpo que el contrato declara como objeto y todavia no describe.
 *
 * No es comodidad ni pereza de tipado: es lo que el yaml dice hoy. El contrato
 * fija verbo, ruta y parametros de las 134 operaciones, y **el esquema de cada
 * recurso se escribe cuando su backend existe**, en el issue del modulo que lo
 * sirve. Cuando eso pase, esta forma la sustituye la de verdad y el codigo
 * escrito contra la anterior deja de compilar, que es justo lo que se busca.
 */
export interface CuerpoSinEsquema {
  readonly [clave: string]: unknown;
}

/**
 * Las 134 operaciones del contrato, por su `operationId`.
 *
 * Es la unica lista de rutas del frontend: la que construye la URL, la que dice
 * que parametros admite cada operacion y la que un dia dira cuales sirve ya el
 * backend. Ninguna de las 134 recibe la municipalidad — sale del token, y el
 * generador falla si el contrato intentara declararla (regla 2, ADR-0005).
 */
export const OPERACIONES = {
  /** Panel de recaudación — `GET /indicadores/recaudacion` */
  inicio: {
    metodo: 'GET',
    ruta: '/indicadores/recaudacion',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['ejercicio'],
  },
  /** Consulta y pago en línea — `GET /portal/deuda` */
  portal: {
    metodo: 'GET',
    ruta: '/portal/deuda',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['doc'],
  },
  /** Ficha catastral urbana individual — `GET /catastro/fichas/urbana/{codRefCatastral}` */
  ficha_urbana: {
    metodo: 'GET',
    ruta: '/catastro/fichas/urbana/{codRefCatastral}',
    parametrosDeRuta: ['codRefCatastral'],
    parametrosDeConsulta: [],
  },
  /** Ficha catastral económica — `GET /catastro/fichas/economica/{codRefCatastral}` */
  ficha_economica: {
    metodo: 'GET',
    ruta: '/catastro/fichas/economica/{codRefCatastral}',
    parametrosDeRuta: ['codRefCatastral'],
    parametrosDeConsulta: [],
  },
  /** Ficha de bienes comunes — `GET /catastro/fichas/bienes-comunes/{codEdificacion}` */
  ficha_bienes: {
    metodo: 'GET',
    ruta: '/catastro/fichas/bienes-comunes/{codEdificacion}',
    parametrosDeRuta: ['codEdificacion'],
    parametrosDeConsulta: [],
  },
  /** Ficha catastral rural — `GET /catastro/fichas/rural/{codUnidad}` */
  ficha_rural: {
    metodo: 'GET',
    ruta: '/catastro/fichas/rural/{codUnidad}',
    parametrosDeRuta: ['codUnidad'],
    parametrosDeConsulta: [],
  },
  /** Consulta de fichas catastrales — `GET /catastro/fichas` */
  consulta_fichas: {
    metodo: 'GET',
    ruta: '/catastro/fichas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Actualización del catastro — `PUT /catastro/fichas/{codigo}/actualizacion` */
  actualizacion_catastro: {
    metodo: 'PUT',
    ruta: '/catastro/fichas/{codigo}/actualizacion',
    parametrosDeRuta: ['codigo'],
    parametrosDeConsulta: [],
  },
  /** Reporte de ficha del contribuyente — `GET /catastro/contribuyentes/{codigo}/ficha.pdf` */
  ficha_contribuyente_reporte: {
    metodo: 'GET',
    ruta: '/catastro/contribuyentes/{codigo}/ficha.pdf',
    parametrosDeRuta: ['codigo'],
    parametrosDeConsulta: [],
  },
  /** Mantenimiento de vías y calles — `GET /catastro/vias` */
  calles: {
    metodo: 'GET',
    ruta: '/catastro/vias',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Sectores, manzanas y lotes — `GET /catastro/sectores` */
  sectores: {
    metodo: 'GET',
    ruta: '/catastro/sectores',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Aranceles de terreno — `GET /catastro/tablas/aranceles` */
  aranceles: {
    metodo: 'GET',
    ruta: '/catastro/tablas/aranceles',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['anio'],
  },
  /** Valores unitarios de edificación — `GET /catastro/tablas/valores-unitarios` */
  valores_unitarios: {
    metodo: 'GET',
    ruta: '/catastro/tablas/valores-unitarios',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['anio'],
  },
  /** Tabla de depreciación — `GET /catastro/tablas/depreciacion` */
  depreciacion: {
    metodo: 'GET',
    ruta: '/catastro/tablas/depreciacion',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['anio'],
  },
  /** Contribuyentes — `GET /rentas/contribuyentes` */
  contribuyentes: {
    metodo: 'GET',
    ruta: '/rentas/contribuyentes',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Predios del contribuyente — `GET /rentas/predios` */
  predios_rentas: {
    metodo: 'GET',
    ruta: '/rentas/predios',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['contribuyente'],
  },
  /** Cálculo individual del impuesto predial — `POST /rentas/predial/calculo-individual` */
  predial_individual: {
    metodo: 'POST',
    ruta: '/rentas/predial/calculo-individual',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Cálculo masivo del impuesto predial — `POST /rentas/predial/calculo-masivo` */
  predial_masivo: {
    metodo: 'POST',
    ruta: '/rentas/predial/calculo-masivo',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Declaración jurada — HR, PU y PR — `GET /rentas/declaraciones/{djNro}` */
  declaracion_jurada: {
    metodo: 'GET',
    ruta: '/rentas/declaraciones/{djNro}',
    parametrosDeRuta: ['djNro'],
    parametrosDeConsulta: [],
  },
  /** Arbitrios municipales — `GET /rentas/arbitrios` */
  arbitrios: {
    metodo: 'GET',
    ruta: '/rentas/arbitrios',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['anio'],
  },
  /** Transferencia de predio — `POST /rentas/transferencias/predio` */
  transferencia_predio: {
    metodo: 'POST',
    ruta: '/rentas/transferencias/predio',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Impuesto de alcabala — `POST /rentas/alcabala` */
  alcabala: {
    metodo: 'POST',
    ruta: '/rentas/alcabala',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Ficha de vehículo — `GET /rentas/vehiculos/{placa}` */
  vehiculos: {
    metodo: 'GET',
    ruta: '/rentas/vehiculos/{placa}',
    parametrosDeRuta: ['placa'],
    parametrosDeConsulta: [],
  },
  /** Cálculo del impuesto vehicular — `POST /rentas/vehicular/calculo` */
  vehicular_calculo: {
    metodo: 'POST',
    ruta: '/rentas/vehicular/calculo',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Transferencia de vehículo — `POST /rentas/transferencias/vehiculo` */
  transferencia_vehiculo: {
    metodo: 'POST',
    ruta: '/rentas/transferencias/vehiculo',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Espectáculos públicos no deportivos — `POST /rentas/espectaculos` */
  espectaculos: {
    metodo: 'POST',
    ruta: '/rentas/espectaculos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Beneficios y exoneraciones — `GET /rentas/beneficios` */
  beneficios: {
    metodo: 'GET',
    ruta: '/rentas/beneficios',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Alta de deuda — `POST /rentas/deuda/altas` */
  alta_deuda: {
    metodo: 'POST',
    ruta: '/rentas/deuda/altas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Baja de deuda — `POST /rentas/deuda/bajas` */
  baja_deuda: {
    metodo: 'POST',
    ruta: '/rentas/deuda/bajas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Programación de fiscalización — `POST /fiscalizacion/programas` */
  fisc_programa: {
    metodo: 'POST',
    ruta: '/fiscalizacion/programas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Fiscalización predial — acta de inspección — `POST /fiscalizacion/predial/actas` */
  fisc_predial: {
    metodo: 'POST',
    ruta: '/fiscalizacion/predial/actas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Fiscalización vehicular — `POST /fiscalizacion/vehicular` */
  fisc_vehicular: {
    metodo: 'POST',
    ruta: '/fiscalizacion/vehicular',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resultados y determinaciones — `GET /fiscalizacion/resultados` */
  fisc_resultados: {
    metodo: 'GET',
    ruta: '/fiscalizacion/resultados',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Omisos y subvaluadores — `GET /fiscalizacion/omisos` */
  fisc_omisos: {
    metodo: 'GET',
    ruta: '/fiscalizacion/omisos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Estado de cuenta de fiscalización — `GET /fiscalizacion/estado-cuenta` */
  fisc_estado_cuenta: {
    metodo: 'GET',
    ruta: '/fiscalizacion/estado-cuenta',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['contribuyente'],
  },
  /** Histórico de fiscalización predial — `GET /fiscalizacion/predial/historico` */
  fisc_historico: {
    metodo: 'GET',
    ruta: '/fiscalizacion/predial/historico',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resolución de determinación de fiscalización — `GET /fiscalizacion/resoluciones/{numero}` */
  resolucion_determinacion_fisc: {
    metodo: 'GET',
    ruta: '/fiscalizacion/resoluciones/{numero}',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Papeletas de infracción de tránsito — `GET /transito/papeletas` */
  papeletas: {
    metodo: 'GET',
    ruta: '/transito/papeletas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Búsqueda de infracciones — `GET /transito/papeletas/busqueda` */
  transito_busqueda: {
    metodo: 'GET',
    ruta: '/transito/papeletas/busqueda',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Tabla de códigos de infracción de tránsito — `GET /transito/codigos` */
  codigos_transito: {
    metodo: 'GET',
    ruta: '/transito/codigos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Descargos y reclamos de papeletas — `POST /transito/descargos` */
  transito_descargos: {
    metodo: 'POST',
    ruta: '/transito/descargos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Internamiento vehicular — `GET /transito/internamientos` */
  internamiento: {
    metodo: 'GET',
    ruta: '/transito/internamientos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Emisión de resoluciones y otros documentos — `GET /transito/papeletas/{numero}/actos` */
  transito_documentos: {
    metodo: 'GET',
    ruta: '/transito/papeletas/{numero}/actos',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Generación de valores de tránsito — `POST /transito/valores/generacion-masiva` */
  transito_valores: {
    metodo: 'POST',
    ruta: '/transito/valores/generacion-masiva',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Cambio de número de papeleta de tránsito — `PATCH /transito/papeletas/{numero}/codigo` */
  transito_cambio_numero: {
    metodo: 'PATCH',
    ruta: '/transito/papeletas/{numero}/codigo',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Reportes de infracción de tránsito — `POST /transito/reportes` */
  transito_reportes: {
    metodo: 'POST',
    ruta: '/transito/reportes',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Record de conductor — `GET /transito/reportes/record-conductor` */
  transito_record_conductor: {
    metodo: 'GET',
    ruta: '/transito/reportes/record-conductor',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Record vehicular — `GET /transito/reportes/record-vehicular` */
  transito_record_vehicular: {
    metodo: 'GET',
    ruta: '/transito/reportes/record-vehicular',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Constancia libre de infracciones — `POST /transito/constancias-libres` */
  transito_constancia_libre: {
    metodo: 'POST',
    ruta: '/transito/constancias-libres',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Padrón de papeletas de tránsito — `GET /transito/reportes/padron` */
  transito_padron: {
    metodo: 'GET',
    ruta: '/transito/reportes/padron',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Estado de cuenta de infracciones — `GET /transito/estado-cuenta` */
  transito_estado_cuenta: {
    metodo: 'GET',
    ruta: '/transito/estado-cuenta',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Reporte papeleta de infracción — `GET /transito/papeletas/{numero}/hoja-informativa` */
  transito_papeleta_reporte: {
    metodo: 'GET',
    ruta: '/transito/papeletas/{numero}/hoja-informativa',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Resolución de gerencia ordinaria — `POST /transito/resoluciones/ordinaria` */
  transito_rg_ordinaria: {
    metodo: 'POST',
    ruta: '/transito/resoluciones/ordinaria',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resolución de gerencia sancionadora — `POST /transito/resoluciones/sancionadora` */
  transito_rg_sancionadora: {
    metodo: 'POST',
    ruta: '/transito/resoluciones/sancionadora',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Padrón de papeletas enviadas a coactiva — `GET /transito/reportes/padron-coactiva` */
  transito_padron_coactiva: {
    metodo: 'GET',
    ruta: '/transito/reportes/padron-coactiva',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Padrón de constancias libres de infracciones — `GET /transito/reportes/padron-constancias` */
  transito_padron_constancias: {
    metodo: 'GET',
    ruta: '/transito/reportes/padron-constancias',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resumen de recaudación de tránsito — `GET /transito/reportes/resumen-recaudacion` */
  transito_resumen_recaudacion: {
    metodo: 'GET',
    ruta: '/transito/reportes/resumen-recaudacion',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resumen de papeletas pendientes y pagadas — `GET /transito/reportes/resumen-papeletas` */
  transito_resumen_papeletas: {
    metodo: 'GET',
    ruta: '/transito/reportes/resumen-papeletas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resumen de papeletas por código de infracción — `GET /transito/reportes/resumen-por-codigo` */
  transito_resumen_codigo: {
    metodo: 'GET',
    ruta: '/transito/reportes/resumen-por-codigo',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resumen de papeletas por iniciales de placa — `GET /transito/reportes/resumen-por-placa` */
  transito_resumen_placa: {
    metodo: 'GET',
    ruta: '/transito/reportes/resumen-por-placa',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Notificación administrativa — `POST /infracciones/administrativas/notificaciones` */
  adm_notificacion: {
    metodo: 'POST',
    ruta: '/infracciones/administrativas/notificaciones',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Infracción administrativa — `GET /infracciones/actas` */
  infracciones_adm: {
    metodo: 'GET',
    ruta: '/infracciones/actas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Cuadro único de infracciones y sanciones (CUIS) — `GET /infracciones/cuis` */
  codigos_cuis: {
    metodo: 'GET',
    ruta: '/infracciones/cuis',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Reporte de códigos de infracción administrativa — `GET /infracciones/administrativas/codigos/reporte` */
  adm_codigos_reporte: {
    metodo: 'GET',
    ruta: '/infracciones/administrativas/codigos/reporte',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Generación de valores administrativa — `POST /infracciones/administrativas/valores/generacion-masiva` */
  adm_valores: {
    metodo: 'POST',
    ruta: '/infracciones/administrativas/valores/generacion-masiva',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Estado de cuenta de papeleta administrativa — `GET /infracciones/administrativas/estado-cuenta` */
  adm_estado_cuenta: {
    metodo: 'GET',
    ruta: '/infracciones/administrativas/estado-cuenta',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resolución de gerencia — `POST /infracciones/administrativas/resoluciones` */
  adm_resolucion_gerencia: {
    metodo: 'POST',
    ruta: '/infracciones/administrativas/resoluciones',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Notificación de resolución de gerencia — `POST /infracciones/administrativas/resoluciones/{id}/notificacion` */
  adm_notificacion_resolucion: {
    metodo: 'POST',
    ruta: '/infracciones/administrativas/resoluciones/{id}/notificacion',
    parametrosDeRuta: ['id'],
    parametrosDeConsulta: [],
  },
  /** Reportes de infracción administrativa — `POST /infracciones/administrativas/reportes` */
  adm_reportes: {
    metodo: 'POST',
    ruta: '/infracciones/administrativas/reportes',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Padrón de notificaciones — `GET /infracciones/administrativas/reportes/padron-notificaciones` */
  adm_padron_notificaciones: {
    metodo: 'GET',
    ruta: '/infracciones/administrativas/reportes/padron-notificaciones',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Notificaciones vencidas — `GET /infracciones/administrativas/reportes/vencidas` */
  adm_notificaciones_vencidas: {
    metodo: 'GET',
    ruta: '/infracciones/administrativas/reportes/vencidas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Notificaciones por contribuyente — `GET /infracciones/administrativas/reportes/por-contribuyente` */
  adm_notificaciones_contribuyente: {
    metodo: 'GET',
    ruta: '/infracciones/administrativas/reportes/por-contribuyente',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resumen de recaudación de papeletas — `GET /infracciones/administrativas/reportes/resumen-recaudacion` */
  adm_resumen_recaudacion: {
    metodo: 'GET',
    ruta: '/infracciones/administrativas/reportes/resumen-recaudacion',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Caja tributaria — `POST /tesoreria/caja/cobranza` */
  caja_tributaria: {
    metodo: 'POST',
    ruta: '/tesoreria/caja/cobranza',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Caja de tasas y derechos administrativos — `POST /tesoreria/caja/tasas` */
  caja_tasas: {
    metodo: 'POST',
    ruta: '/tesoreria/caja/tasas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Fraccionamiento tributario — `POST /tesoreria/fraccionamientos` */
  fraccionamiento: {
    metodo: 'POST',
    ruta: '/tesoreria/fraccionamientos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de convenios — `GET /tesoreria/convenios` */
  consulta_convenios: {
    metodo: 'GET',
    ruta: '/tesoreria/convenios',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Duplicado de recibo — `GET /tesoreria/recibos/{nro}/duplicado` */
  duplicado_recibo: {
    metodo: 'GET',
    ruta: '/tesoreria/recibos/{nro}/duplicado',
    parametrosDeRuta: ['nro'],
    parametrosDeConsulta: [],
  },
  /** Anulación de recibo — `POST /tesoreria/recibos/{nro}/anulacion` */
  anulacion_recibo: {
    metodo: 'POST',
    ruta: '/tesoreria/recibos/{nro}/anulacion',
    parametrosDeRuta: ['nro'],
    parametrosDeConsulta: [],
  },
  /** Anulación de convenio — `POST /tesoreria/convenios/{numero}/anulacion` */
  anulacion_convenio: {
    metodo: 'POST',
    ruta: '/tesoreria/convenios/{numero}/anulacion',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Cierre y arqueo de caja — `POST /tesoreria/caja/cierre` */
  cierre_caja: {
    metodo: 'POST',
    ruta: '/tesoreria/caja/cierre',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Avance de recaudación — `GET /tesoreria/recaudacion/avance` */
  avance_recaudacion: {
    metodo: 'GET',
    ruta: '/tesoreria/recaudacion/avance',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Recaudación por área — `GET /tesoreria/recaudacion/por-area` */
  recaudacion_area: {
    metodo: 'GET',
    ruta: '/tesoreria/recaudacion/por-area',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Estado de cuenta corriente — `GET /consultas/cuenta-corriente/{codigo}` */
  cuenta_corriente: {
    metodo: 'GET',
    ruta: '/consultas/cuenta-corriente/{codigo}',
    parametrosDeRuta: ['codigo'],
    parametrosDeConsulta: [],
  },
  /** Consulta de deuda — `GET /consultas/deuda` */
  consulta_deuda: {
    metodo: 'GET',
    ruta: '/consultas/deuda',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta unificada predial-arbitrios — `GET /consultas/unificada` */
  consulta_unificada: {
    metodo: 'GET',
    ruta: '/consultas/unificada',
    parametrosDeRuta: [],
    parametrosDeConsulta: ['contribuyente'],
  },
  /** Consulta resumen predial-arbitrios — `GET /consultas/resumen-predial` */
  consulta_resumen_predial: {
    metodo: 'GET',
    ruta: '/consultas/resumen-predial',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de altas y bajas — `GET /consultas/altas-bajas` */
  consulta_altas_bajas: {
    metodo: 'GET',
    ruta: '/consultas/altas-bajas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de deudas con beneficio — `GET /consultas/deudas-con-beneficio` */
  consulta_deudas_beneficio: {
    metodo: 'GET',
    ruta: '/consultas/deudas-con-beneficio',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de pagos — `GET /consultas/pagos` */
  consulta_pagos: {
    metodo: 'GET',
    ruta: '/consultas/pagos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de predios — `GET /consultas/predios` */
  consulta_predios: {
    metodo: 'GET',
    ruta: '/consultas/predios',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de vehículos — `GET /consultas/vehiculos` */
  consulta_vehiculos: {
    metodo: 'GET',
    ruta: '/consultas/vehiculos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de valores emitidos — `GET /consultas/valores` */
  consulta_valores: {
    metodo: 'GET',
    ruta: '/consultas/valores',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Constancia de no adeudo — `GET /consultas/constancias/no-adeudo` */
  constancia: {
    metodo: 'GET',
    ruta: '/consultas/constancias/no-adeudo',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Búsqueda y mantenimiento de valores — `GET /valores` */
  valores_busqueda: {
    metodo: 'GET',
    ruta: '/valores',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Generación individual de valores — `POST /valores` */
  valores_individual: {
    metodo: 'POST',
    ruta: '/valores',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Generación masiva de valores — `POST /valores/masivo` */
  valores_masivo: {
    metodo: 'POST',
    ruta: '/valores/masivo',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Notificación de valores — `POST /valores/{nro}/notificacion` */
  notificacion_valores: {
    metodo: 'POST',
    ruta: '/valores/{nro}/notificacion',
    parametrosDeRuta: ['nro'],
    parametrosDeConsulta: [],
  },
  /** Prescripción de la deuda — `POST /coactiva/prescripcion` */
  prescripcion: {
    metodo: 'POST',
    ruta: '/coactiva/prescripcion',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Pase de valores a coactiva — `POST /valores/{numero}/movimientos` */
  pase_coactiva: {
    metodo: 'POST',
    ruta: '/valores/{numero}/movimientos',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Expedientes coactivos — `GET /coactiva/expedientes` */
  coactiva_expedientes: {
    metodo: 'GET',
    ruta: '/coactiva/expedientes',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Importación de valores a coactiva — `POST /coactiva/expedientes/importacion` */
  importacion_valores: {
    metodo: 'POST',
    ruta: '/coactiva/expedientes/importacion',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Proceso coactivo — `GET /coactiva/expedientes/{numero}/proceso` */
  proceso_coactivo: {
    metodo: 'GET',
    ruta: '/coactiva/expedientes/{numero}/proceso',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Impresión de resolución de ejecución coactiva — `POST /coactiva/rec/impresion` */
  rec_impresion: {
    metodo: 'POST',
    ruta: '/coactiva/rec/impresion',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Gestionar historial del expediente — `PATCH /coactiva/expedientes/{numero}/estados` */
  expediente_historial: {
    metodo: 'PATCH',
    ruta: '/coactiva/expedientes/{numero}/estados',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Cambiar dirección referencial — `PATCH /coactiva/expedientes/{numero}/direccion-referencial` */
  cambiar_direccion_ref: {
    metodo: 'PATCH',
    ruta: '/coactiva/expedientes/{numero}/direccion-referencial',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Liquidación de costas procesales — `POST /coactiva/liquidaciones-costas` */
  costas_procesales: {
    metodo: 'POST',
    ruta: '/coactiva/liquidaciones-costas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Fraccionamiento coactivo — `POST /coactiva/convenios` */
  fraccionamiento_coactivo: {
    metodo: 'POST',
    ruta: '/coactiva/convenios',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Registro de actos coactivos — `POST /coactiva/expedientes/{numero}/actos` */
  actos_coactivos: {
    metodo: 'POST',
    ruta: '/coactiva/expedientes/{numero}/actos',
    parametrosDeRuta: ['numero'],
    parametrosDeConsulta: [],
  },
  /** Emisión de notificaciones coactivas — `POST /coactiva/notificaciones` */
  notificaciones_coactivas: {
    metodo: 'POST',
    ruta: '/coactiva/notificaciones',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de deudas en coactiva — `GET /coactiva/deudas` */
  coactiva_consulta_deudas: {
    metodo: 'GET',
    ruta: '/coactiva/deudas',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Consulta de deudas en beneficio (coactiva) — `GET /coactiva/deudas-en-beneficio` */
  coactiva_deudas_beneficio: {
    metodo: 'GET',
    ruta: '/coactiva/deudas-en-beneficio',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Anuncio y propaganda — `GET /autorizaciones/anuncios` */
  anuncios: {
    metodo: 'GET',
    ruta: '/autorizaciones/anuncios',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Reportes de anuncio y propaganda — `POST /autorizaciones/anuncios/reportes` */
  anuncios_reportes: {
    metodo: 'POST',
    ruta: '/autorizaciones/anuncios/reportes',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Licencia de funcionamiento — `GET /licencias/funcionamiento` */
  licencia_funcionamiento: {
    metodo: 'GET',
    ruta: '/licencias/funcionamiento',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Padrón de licencias de funcionamiento — `POST /licencias/funcionamiento/reportes/padron` */
  licencia_padron: {
    metodo: 'POST',
    ruta: '/licencias/funcionamiento/reportes/padron',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resumen de licencias por año — `GET /licencias/funcionamiento/reportes/resumen-anual` */
  licencia_resumen_anual: {
    metodo: 'GET',
    ruta: '/licencias/funcionamiento/reportes/resumen-anual',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Resolución de cancelación de licencia — `POST /licencias/funcionamiento/{id}/cancelacion` */
  licencia_resolucion_cancelacion: {
    metodo: 'POST',
    ruta: '/licencias/funcionamiento/{id}/cancelacion',
    parametrosDeRuta: ['id'],
    parametrosDeConsulta: [],
  },
  /** Resolución de duplicado de licencia — `POST /licencias/funcionamiento/{id}/duplicado` */
  licencia_resolucion_duplicado: {
    metodo: 'POST',
    ruta: '/licencias/funcionamiento/{id}/duplicado',
    parametrosDeRuta: ['id'],
    parametrosDeConsulta: [],
  },
  /** Formulario único de edificación (FUE) — `GET /licencias/edificacion` */
  fue_edificacion: {
    metodo: 'GET',
    ruta: '/licencias/edificacion',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Reporte general de licencias de edificación — `GET /licencias/edificacion/reportes/general` */
  edificacion_reporte: {
    metodo: 'GET',
    ruta: '/licencias/edificacion/reportes/general',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Catálogo CIIU de giros — `GET /licencias/ciiu` */
  ciiu: {
    metodo: 'GET',
    ruta: '/licencias/ciiu',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Certificados de numeración y zonificación — `POST /licencias/certificados` */
  certificados: {
    metodo: 'POST',
    ruta: '/licencias/certificados',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Módulos del sistema — `GET /seguridad/modulos` */
  modulos: {
    metodo: 'GET',
    ruta: '/seguridad/modulos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Usuarios del sistema — `GET /seguridad/usuarios` */
  usuarios: {
    metodo: 'GET',
    ruta: '/seguridad/usuarios',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Grupos de usuarios — `GET /seguridad/grupos` */
  grupos: {
    metodo: 'GET',
    ruta: '/seguridad/grupos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Accesos y políticas — `GET /seguridad/accesos` */
  accesos: {
    metodo: 'GET',
    ruta: '/seguridad/accesos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Gestión de miembros — `POST /seguridad/grupos/{grupo}/miembros` */
  miembros: {
    metodo: 'POST',
    ruta: '/seguridad/grupos/{grupo}/miembros',
    parametrosDeRuta: ['grupo'],
    parametrosDeConsulta: [],
  },
  /** Permisos y niveles de accesibilidad — `PUT /seguridad/grupos/{id}/permisos` */
  permisos: {
    metodo: 'PUT',
    ruta: '/seguridad/grupos/{id}/permisos',
    parametrosDeRuta: ['id'],
    parametrosDeConsulta: [],
  },
  /** Cambiar el año de trabajo — `PUT /seguridad/sesion/ejercicio` */
  cambiar_anio: {
    metodo: 'PUT',
    ruta: '/seguridad/sesion/ejercicio',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Cambiar contraseña — `PUT /seguridad/usuarios/{id}/clave` */
  cambiar_clave: {
    metodo: 'PUT',
    ruta: '/seguridad/usuarios/{id}/clave',
    parametrosDeRuta: ['id'],
    parametrosDeConsulta: [],
  },
  /** Auditoría del sistema — `GET /seguridad/auditoria` */
  auditoria: {
    metodo: 'GET',
    ruta: '/seguridad/auditoria',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Parámetros del sistema — `GET /seguridad/parametros` */
  parametros: {
    metodo: 'GET',
    ruta: '/seguridad/parametros',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
  /** Copias de seguridad — `POST /seguridad/respaldos` */
  respaldo: {
    metodo: 'POST',
    ruta: '/seguridad/respaldos',
    parametrosDeRuta: [],
    parametrosDeConsulta: [],
  },
} as const satisfies Readonly<Record<string, DescriptorDeOperacion>>;

/** El `operationId` de una de las 134 operaciones. */
export type IdDeOperacion = keyof typeof OPERACIONES;

/**
 * Los parametros de cada operacion: los de ruta obligatorios, los de consulta
 * opcionales salvo que el contrato los exija.
 *
 * Un parametro renombrado en el yaml renombra aqui la propiedad, y el codigo
 * que usaba el nombre viejo deja de compilar.
 */
export interface ParametrosPorOperacion {
  /** `GET /indicadores/recaudacion` */
  readonly inicio: {
    readonly ejercicio?: string;
  };
  /** `GET /portal/deuda` */
  readonly portal: {
    readonly doc?: string;
  };
  /** `GET /catastro/fichas/urbana/{codRefCatastral}` */
  readonly ficha_urbana: {
    readonly codRefCatastral: string;
  };
  /** `GET /catastro/fichas/economica/{codRefCatastral}` */
  readonly ficha_economica: {
    readonly codRefCatastral: string;
  };
  /** `GET /catastro/fichas/bienes-comunes/{codEdificacion}` */
  readonly ficha_bienes: {
    readonly codEdificacion: string;
  };
  /** `GET /catastro/fichas/rural/{codUnidad}` */
  readonly ficha_rural: {
    readonly codUnidad: string;
  };
  /** `GET /catastro/fichas` */
  readonly consulta_fichas: Readonly<Record<string, never>>;
  /** `PUT /catastro/fichas/{codigo}/actualizacion` */
  readonly actualizacion_catastro: {
    readonly codigo: string;
  };
  /** `GET /catastro/contribuyentes/{codigo}/ficha.pdf` */
  readonly ficha_contribuyente_reporte: {
    readonly codigo: string;
  };
  /** `GET /catastro/vias` */
  readonly calles: Readonly<Record<string, never>>;
  /** `GET /catastro/sectores` */
  readonly sectores: Readonly<Record<string, never>>;
  /** `GET /catastro/tablas/aranceles` */
  readonly aranceles: {
    readonly anio?: string;
  };
  /** `GET /catastro/tablas/valores-unitarios` */
  readonly valores_unitarios: {
    readonly anio?: string;
  };
  /** `GET /catastro/tablas/depreciacion` */
  readonly depreciacion: {
    readonly anio?: string;
  };
  /** `GET /rentas/contribuyentes` */
  readonly contribuyentes: Readonly<Record<string, never>>;
  /** `GET /rentas/predios` */
  readonly predios_rentas: {
    readonly contribuyente?: string;
  };
  /** `POST /rentas/predial/calculo-individual` */
  readonly predial_individual: Readonly<Record<string, never>>;
  /** `POST /rentas/predial/calculo-masivo` */
  readonly predial_masivo: Readonly<Record<string, never>>;
  /** `GET /rentas/declaraciones/{djNro}` */
  readonly declaracion_jurada: {
    readonly djNro: string;
  };
  /** `GET /rentas/arbitrios` */
  readonly arbitrios: {
    readonly anio?: string;
  };
  /** `POST /rentas/transferencias/predio` */
  readonly transferencia_predio: Readonly<Record<string, never>>;
  /** `POST /rentas/alcabala` */
  readonly alcabala: Readonly<Record<string, never>>;
  /** `GET /rentas/vehiculos/{placa}` */
  readonly vehiculos: {
    readonly placa: string;
  };
  /** `POST /rentas/vehicular/calculo` */
  readonly vehicular_calculo: Readonly<Record<string, never>>;
  /** `POST /rentas/transferencias/vehiculo` */
  readonly transferencia_vehiculo: Readonly<Record<string, never>>;
  /** `POST /rentas/espectaculos` */
  readonly espectaculos: Readonly<Record<string, never>>;
  /** `GET /rentas/beneficios` */
  readonly beneficios: Readonly<Record<string, never>>;
  /** `POST /rentas/deuda/altas` */
  readonly alta_deuda: Readonly<Record<string, never>>;
  /** `POST /rentas/deuda/bajas` */
  readonly baja_deuda: Readonly<Record<string, never>>;
  /** `POST /fiscalizacion/programas` */
  readonly fisc_programa: Readonly<Record<string, never>>;
  /** `POST /fiscalizacion/predial/actas` */
  readonly fisc_predial: Readonly<Record<string, never>>;
  /** `POST /fiscalizacion/vehicular` */
  readonly fisc_vehicular: Readonly<Record<string, never>>;
  /** `GET /fiscalizacion/resultados` */
  readonly fisc_resultados: Readonly<Record<string, never>>;
  /** `GET /fiscalizacion/omisos` */
  readonly fisc_omisos: Readonly<Record<string, never>>;
  /** `GET /fiscalizacion/estado-cuenta` */
  readonly fisc_estado_cuenta: {
    readonly contribuyente?: string;
  };
  /** `GET /fiscalizacion/predial/historico` */
  readonly fisc_historico: Readonly<Record<string, never>>;
  /** `GET /fiscalizacion/resoluciones/{numero}` */
  readonly resolucion_determinacion_fisc: {
    readonly numero: string;
  };
  /** `GET /transito/papeletas` */
  readonly papeletas: Readonly<Record<string, never>>;
  /** `GET /transito/papeletas/busqueda` */
  readonly transito_busqueda: Readonly<Record<string, never>>;
  /** `GET /transito/codigos` */
  readonly codigos_transito: Readonly<Record<string, never>>;
  /** `POST /transito/descargos` */
  readonly transito_descargos: Readonly<Record<string, never>>;
  /** `GET /transito/internamientos` */
  readonly internamiento: Readonly<Record<string, never>>;
  /** `GET /transito/papeletas/{numero}/actos` */
  readonly transito_documentos: {
    readonly numero: string;
  };
  /** `POST /transito/valores/generacion-masiva` */
  readonly transito_valores: Readonly<Record<string, never>>;
  /** `PATCH /transito/papeletas/{numero}/codigo` */
  readonly transito_cambio_numero: {
    readonly numero: string;
  };
  /** `POST /transito/reportes` */
  readonly transito_reportes: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/record-conductor` */
  readonly transito_record_conductor: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/record-vehicular` */
  readonly transito_record_vehicular: Readonly<Record<string, never>>;
  /** `POST /transito/constancias-libres` */
  readonly transito_constancia_libre: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/padron` */
  readonly transito_padron: Readonly<Record<string, never>>;
  /** `GET /transito/estado-cuenta` */
  readonly transito_estado_cuenta: Readonly<Record<string, never>>;
  /** `GET /transito/papeletas/{numero}/hoja-informativa` */
  readonly transito_papeleta_reporte: {
    readonly numero: string;
  };
  /** `POST /transito/resoluciones/ordinaria` */
  readonly transito_rg_ordinaria: Readonly<Record<string, never>>;
  /** `POST /transito/resoluciones/sancionadora` */
  readonly transito_rg_sancionadora: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/padron-coactiva` */
  readonly transito_padron_coactiva: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/padron-constancias` */
  readonly transito_padron_constancias: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/resumen-recaudacion` */
  readonly transito_resumen_recaudacion: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/resumen-papeletas` */
  readonly transito_resumen_papeletas: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/resumen-por-codigo` */
  readonly transito_resumen_codigo: Readonly<Record<string, never>>;
  /** `GET /transito/reportes/resumen-por-placa` */
  readonly transito_resumen_placa: Readonly<Record<string, never>>;
  /** `POST /infracciones/administrativas/notificaciones` */
  readonly adm_notificacion: Readonly<Record<string, never>>;
  /** `GET /infracciones/actas` */
  readonly infracciones_adm: Readonly<Record<string, never>>;
  /** `GET /infracciones/cuis` */
  readonly codigos_cuis: Readonly<Record<string, never>>;
  /** `GET /infracciones/administrativas/codigos/reporte` */
  readonly adm_codigos_reporte: Readonly<Record<string, never>>;
  /** `POST /infracciones/administrativas/valores/generacion-masiva` */
  readonly adm_valores: Readonly<Record<string, never>>;
  /** `GET /infracciones/administrativas/estado-cuenta` */
  readonly adm_estado_cuenta: Readonly<Record<string, never>>;
  /** `POST /infracciones/administrativas/resoluciones` */
  readonly adm_resolucion_gerencia: Readonly<Record<string, never>>;
  /** `POST /infracciones/administrativas/resoluciones/{id}/notificacion` */
  readonly adm_notificacion_resolucion: {
    readonly id: string;
  };
  /** `POST /infracciones/administrativas/reportes` */
  readonly adm_reportes: Readonly<Record<string, never>>;
  /** `GET /infracciones/administrativas/reportes/padron-notificaciones` */
  readonly adm_padron_notificaciones: Readonly<Record<string, never>>;
  /** `GET /infracciones/administrativas/reportes/vencidas` */
  readonly adm_notificaciones_vencidas: Readonly<Record<string, never>>;
  /** `GET /infracciones/administrativas/reportes/por-contribuyente` */
  readonly adm_notificaciones_contribuyente: Readonly<Record<string, never>>;
  /** `GET /infracciones/administrativas/reportes/resumen-recaudacion` */
  readonly adm_resumen_recaudacion: Readonly<Record<string, never>>;
  /** `POST /tesoreria/caja/cobranza` */
  readonly caja_tributaria: Readonly<Record<string, never>>;
  /** `POST /tesoreria/caja/tasas` */
  readonly caja_tasas: Readonly<Record<string, never>>;
  /** `POST /tesoreria/fraccionamientos` */
  readonly fraccionamiento: Readonly<Record<string, never>>;
  /** `GET /tesoreria/convenios` */
  readonly consulta_convenios: Readonly<Record<string, never>>;
  /** `GET /tesoreria/recibos/{nro}/duplicado` */
  readonly duplicado_recibo: {
    readonly nro: string;
  };
  /** `POST /tesoreria/recibos/{nro}/anulacion` */
  readonly anulacion_recibo: {
    readonly nro: string;
  };
  /** `POST /tesoreria/convenios/{numero}/anulacion` */
  readonly anulacion_convenio: {
    readonly numero: string;
  };
  /** `POST /tesoreria/caja/cierre` */
  readonly cierre_caja: Readonly<Record<string, never>>;
  /** `GET /tesoreria/recaudacion/avance` */
  readonly avance_recaudacion: Readonly<Record<string, never>>;
  /** `GET /tesoreria/recaudacion/por-area` */
  readonly recaudacion_area: Readonly<Record<string, never>>;
  /** `GET /consultas/cuenta-corriente/{codigo}` */
  readonly cuenta_corriente: {
    readonly codigo: string;
  };
  /** `GET /consultas/deuda` */
  readonly consulta_deuda: Readonly<Record<string, never>>;
  /** `GET /consultas/unificada` */
  readonly consulta_unificada: {
    readonly contribuyente?: string;
  };
  /** `GET /consultas/resumen-predial` */
  readonly consulta_resumen_predial: Readonly<Record<string, never>>;
  /** `GET /consultas/altas-bajas` */
  readonly consulta_altas_bajas: Readonly<Record<string, never>>;
  /** `GET /consultas/deudas-con-beneficio` */
  readonly consulta_deudas_beneficio: Readonly<Record<string, never>>;
  /** `GET /consultas/pagos` */
  readonly consulta_pagos: Readonly<Record<string, never>>;
  /** `GET /consultas/predios` */
  readonly consulta_predios: Readonly<Record<string, never>>;
  /** `GET /consultas/vehiculos` */
  readonly consulta_vehiculos: Readonly<Record<string, never>>;
  /** `GET /consultas/valores` */
  readonly consulta_valores: Readonly<Record<string, never>>;
  /** `GET /consultas/constancias/no-adeudo` */
  readonly constancia: Readonly<Record<string, never>>;
  /** `GET /valores` */
  readonly valores_busqueda: Readonly<Record<string, never>>;
  /** `POST /valores` */
  readonly valores_individual: Readonly<Record<string, never>>;
  /** `POST /valores/masivo` */
  readonly valores_masivo: Readonly<Record<string, never>>;
  /** `POST /valores/{nro}/notificacion` */
  readonly notificacion_valores: {
    readonly nro: string;
  };
  /** `POST /coactiva/prescripcion` */
  readonly prescripcion: Readonly<Record<string, never>>;
  /** `POST /valores/{numero}/movimientos` */
  readonly pase_coactiva: {
    readonly numero: string;
  };
  /** `GET /coactiva/expedientes` */
  readonly coactiva_expedientes: Readonly<Record<string, never>>;
  /** `POST /coactiva/expedientes/importacion` */
  readonly importacion_valores: Readonly<Record<string, never>>;
  /** `GET /coactiva/expedientes/{numero}/proceso` */
  readonly proceso_coactivo: {
    readonly numero: string;
  };
  /** `POST /coactiva/rec/impresion` */
  readonly rec_impresion: Readonly<Record<string, never>>;
  /** `PATCH /coactiva/expedientes/{numero}/estados` */
  readonly expediente_historial: {
    readonly numero: string;
  };
  /** `PATCH /coactiva/expedientes/{numero}/direccion-referencial` */
  readonly cambiar_direccion_ref: {
    readonly numero: string;
  };
  /** `POST /coactiva/liquidaciones-costas` */
  readonly costas_procesales: Readonly<Record<string, never>>;
  /** `POST /coactiva/convenios` */
  readonly fraccionamiento_coactivo: Readonly<Record<string, never>>;
  /** `POST /coactiva/expedientes/{numero}/actos` */
  readonly actos_coactivos: {
    readonly numero: string;
  };
  /** `POST /coactiva/notificaciones` */
  readonly notificaciones_coactivas: Readonly<Record<string, never>>;
  /** `GET /coactiva/deudas` */
  readonly coactiva_consulta_deudas: Readonly<Record<string, never>>;
  /** `GET /coactiva/deudas-en-beneficio` */
  readonly coactiva_deudas_beneficio: Readonly<Record<string, never>>;
  /** `GET /autorizaciones/anuncios` */
  readonly anuncios: Readonly<Record<string, never>>;
  /** `POST /autorizaciones/anuncios/reportes` */
  readonly anuncios_reportes: Readonly<Record<string, never>>;
  /** `GET /licencias/funcionamiento` */
  readonly licencia_funcionamiento: Readonly<Record<string, never>>;
  /** `POST /licencias/funcionamiento/reportes/padron` */
  readonly licencia_padron: Readonly<Record<string, never>>;
  /** `GET /licencias/funcionamiento/reportes/resumen-anual` */
  readonly licencia_resumen_anual: Readonly<Record<string, never>>;
  /** `POST /licencias/funcionamiento/{id}/cancelacion` */
  readonly licencia_resolucion_cancelacion: {
    readonly id: string;
  };
  /** `POST /licencias/funcionamiento/{id}/duplicado` */
  readonly licencia_resolucion_duplicado: {
    readonly id: string;
  };
  /** `GET /licencias/edificacion` */
  readonly fue_edificacion: Readonly<Record<string, never>>;
  /** `GET /licencias/edificacion/reportes/general` */
  readonly edificacion_reporte: Readonly<Record<string, never>>;
  /** `GET /licencias/ciiu` */
  readonly ciiu: Readonly<Record<string, never>>;
  /** `POST /licencias/certificados` */
  readonly certificados: Readonly<Record<string, never>>;
  /** `GET /seguridad/modulos` */
  readonly modulos: Readonly<Record<string, never>>;
  /** `GET /seguridad/usuarios` */
  readonly usuarios: Readonly<Record<string, never>>;
  /** `GET /seguridad/grupos` */
  readonly grupos: Readonly<Record<string, never>>;
  /** `GET /seguridad/accesos` */
  readonly accesos: Readonly<Record<string, never>>;
  /** `POST /seguridad/grupos/{grupo}/miembros` */
  readonly miembros: {
    readonly grupo: string;
  };
  /** `PUT /seguridad/grupos/{id}/permisos` */
  readonly permisos: {
    readonly id: string;
  };
  /** `PUT /seguridad/sesion/ejercicio` */
  readonly cambiar_anio: Readonly<Record<string, never>>;
  /** `PUT /seguridad/usuarios/{id}/clave` */
  readonly cambiar_clave: {
    readonly id: string;
  };
  /** `GET /seguridad/auditoria` */
  readonly auditoria: Readonly<Record<string, never>>;
  /** `GET /seguridad/parametros` */
  readonly parametros: Readonly<Record<string, never>>;
  /** `POST /seguridad/respaldos` */
  readonly respaldo: Readonly<Record<string, never>>;
}

/** El cuerpo de cada operacion que escribe. Las de lectura no llevan: `undefined`. */
export interface CuerpoPorOperacion {
  readonly inicio: undefined;
  readonly portal: undefined;
  readonly ficha_urbana: undefined;
  readonly ficha_economica: undefined;
  readonly ficha_bienes: undefined;
  readonly ficha_rural: undefined;
  readonly consulta_fichas: undefined;
  readonly actualizacion_catastro: CuerpoSinEsquema;
  readonly ficha_contribuyente_reporte: undefined;
  readonly calles: undefined;
  readonly sectores: undefined;
  readonly aranceles: undefined;
  readonly valores_unitarios: undefined;
  readonly depreciacion: undefined;
  readonly contribuyentes: undefined;
  readonly predios_rentas: undefined;
  readonly predial_individual: CuerpoSinEsquema;
  readonly predial_masivo: CuerpoSinEsquema;
  readonly declaracion_jurada: undefined;
  readonly arbitrios: undefined;
  readonly transferencia_predio: CuerpoSinEsquema;
  readonly alcabala: CuerpoSinEsquema;
  readonly vehiculos: undefined;
  readonly vehicular_calculo: CuerpoSinEsquema;
  readonly transferencia_vehiculo: CuerpoSinEsquema;
  readonly espectaculos: CuerpoSinEsquema;
  readonly beneficios: undefined;
  readonly alta_deuda: CuerpoSinEsquema;
  readonly baja_deuda: CuerpoSinEsquema;
  readonly fisc_programa: CuerpoSinEsquema;
  readonly fisc_predial: CuerpoSinEsquema;
  readonly fisc_vehicular: CuerpoSinEsquema;
  readonly fisc_resultados: undefined;
  readonly fisc_omisos: undefined;
  readonly fisc_estado_cuenta: undefined;
  readonly fisc_historico: undefined;
  readonly resolucion_determinacion_fisc: undefined;
  readonly papeletas: undefined;
  readonly transito_busqueda: undefined;
  readonly codigos_transito: undefined;
  readonly transito_descargos: CuerpoSinEsquema;
  readonly internamiento: undefined;
  readonly transito_documentos: undefined;
  readonly transito_valores: CuerpoSinEsquema;
  readonly transito_cambio_numero: CuerpoSinEsquema;
  readonly transito_reportes: CuerpoSinEsquema;
  readonly transito_record_conductor: undefined;
  readonly transito_record_vehicular: undefined;
  readonly transito_constancia_libre: CuerpoSinEsquema;
  readonly transito_padron: undefined;
  readonly transito_estado_cuenta: undefined;
  readonly transito_papeleta_reporte: undefined;
  readonly transito_rg_ordinaria: CuerpoSinEsquema;
  readonly transito_rg_sancionadora: CuerpoSinEsquema;
  readonly transito_padron_coactiva: undefined;
  readonly transito_padron_constancias: undefined;
  readonly transito_resumen_recaudacion: undefined;
  readonly transito_resumen_papeletas: undefined;
  readonly transito_resumen_codigo: undefined;
  readonly transito_resumen_placa: undefined;
  readonly adm_notificacion: CuerpoSinEsquema;
  readonly infracciones_adm: undefined;
  readonly codigos_cuis: undefined;
  readonly adm_codigos_reporte: undefined;
  readonly adm_valores: CuerpoSinEsquema;
  readonly adm_estado_cuenta: undefined;
  readonly adm_resolucion_gerencia: CuerpoSinEsquema;
  readonly adm_notificacion_resolucion: CuerpoSinEsquema;
  readonly adm_reportes: CuerpoSinEsquema;
  readonly adm_padron_notificaciones: undefined;
  readonly adm_notificaciones_vencidas: undefined;
  readonly adm_notificaciones_contribuyente: undefined;
  readonly adm_resumen_recaudacion: undefined;
  readonly caja_tributaria: CuerpoSinEsquema;
  readonly caja_tasas: CuerpoSinEsquema;
  readonly fraccionamiento: CuerpoSinEsquema;
  readonly consulta_convenios: undefined;
  readonly duplicado_recibo: undefined;
  readonly anulacion_recibo: CuerpoSinEsquema;
  readonly anulacion_convenio: CuerpoSinEsquema;
  readonly cierre_caja: CuerpoSinEsquema;
  readonly avance_recaudacion: undefined;
  readonly recaudacion_area: undefined;
  readonly cuenta_corriente: undefined;
  readonly consulta_deuda: undefined;
  readonly consulta_unificada: undefined;
  readonly consulta_resumen_predial: undefined;
  readonly consulta_altas_bajas: undefined;
  readonly consulta_deudas_beneficio: undefined;
  readonly consulta_pagos: undefined;
  readonly consulta_predios: undefined;
  readonly consulta_vehiculos: undefined;
  readonly consulta_valores: undefined;
  readonly constancia: undefined;
  readonly valores_busqueda: undefined;
  readonly valores_individual: CuerpoSinEsquema;
  readonly valores_masivo: CuerpoSinEsquema;
  readonly notificacion_valores: CuerpoSinEsquema;
  readonly prescripcion: CuerpoSinEsquema;
  readonly pase_coactiva: CuerpoSinEsquema;
  readonly coactiva_expedientes: undefined;
  readonly importacion_valores: CuerpoSinEsquema;
  readonly proceso_coactivo: undefined;
  readonly rec_impresion: CuerpoSinEsquema;
  readonly expediente_historial: CuerpoSinEsquema;
  readonly cambiar_direccion_ref: CuerpoSinEsquema;
  readonly costas_procesales: CuerpoSinEsquema;
  readonly fraccionamiento_coactivo: CuerpoSinEsquema;
  readonly actos_coactivos: CuerpoSinEsquema;
  readonly notificaciones_coactivas: CuerpoSinEsquema;
  readonly coactiva_consulta_deudas: undefined;
  readonly coactiva_deudas_beneficio: undefined;
  readonly anuncios: undefined;
  readonly anuncios_reportes: CuerpoSinEsquema;
  readonly licencia_funcionamiento: undefined;
  readonly licencia_padron: CuerpoSinEsquema;
  readonly licencia_resumen_anual: undefined;
  readonly licencia_resolucion_cancelacion: CuerpoSinEsquema;
  readonly licencia_resolucion_duplicado: CuerpoSinEsquema;
  readonly fue_edificacion: undefined;
  readonly edificacion_reporte: undefined;
  readonly ciiu: undefined;
  readonly certificados: CuerpoSinEsquema;
  readonly modulos: undefined;
  readonly usuarios: undefined;
  readonly grupos: undefined;
  readonly accesos: undefined;
  readonly miembros: CuerpoSinEsquema;
  readonly permisos: CuerpoSinEsquema;
  readonly cambiar_anio: CuerpoSinEsquema;
  readonly cambiar_clave: CuerpoSinEsquema;
  readonly auditoria: undefined;
  readonly parametros: undefined;
  readonly respaldo: CuerpoSinEsquema;
}

/** Lo que responde cada operacion cuando sale bien. */
export interface RespuestaPorOperacion {
  readonly inicio: CuerpoSinEsquema;
  readonly portal: CuerpoSinEsquema;
  readonly ficha_urbana: CuerpoSinEsquema;
  readonly ficha_economica: CuerpoSinEsquema;
  readonly ficha_bienes: CuerpoSinEsquema;
  readonly ficha_rural: CuerpoSinEsquema;
  readonly consulta_fichas: CuerpoSinEsquema;
  readonly actualizacion_catastro: CuerpoSinEsquema;
  readonly ficha_contribuyente_reporte: CuerpoSinEsquema;
  readonly calles: CuerpoSinEsquema;
  readonly sectores: CuerpoSinEsquema;
  readonly aranceles: CuerpoSinEsquema;
  readonly valores_unitarios: CuerpoSinEsquema;
  readonly depreciacion: CuerpoSinEsquema;
  readonly contribuyentes: CuerpoSinEsquema;
  readonly predios_rentas: CuerpoSinEsquema;
  readonly predial_individual: CuerpoSinEsquema;
  readonly predial_masivo: CuerpoSinEsquema;
  readonly declaracion_jurada: CuerpoSinEsquema;
  readonly arbitrios: CuerpoSinEsquema;
  readonly transferencia_predio: CuerpoSinEsquema;
  readonly alcabala: CuerpoSinEsquema;
  readonly vehiculos: CuerpoSinEsquema;
  readonly vehicular_calculo: CuerpoSinEsquema;
  readonly transferencia_vehiculo: CuerpoSinEsquema;
  readonly espectaculos: CuerpoSinEsquema;
  readonly beneficios: CuerpoSinEsquema;
  readonly alta_deuda: CuerpoSinEsquema;
  readonly baja_deuda: CuerpoSinEsquema;
  readonly fisc_programa: CuerpoSinEsquema;
  readonly fisc_predial: CuerpoSinEsquema;
  readonly fisc_vehicular: CuerpoSinEsquema;
  readonly fisc_resultados: CuerpoSinEsquema;
  readonly fisc_omisos: CuerpoSinEsquema;
  readonly fisc_estado_cuenta: CuerpoSinEsquema;
  readonly fisc_historico: CuerpoSinEsquema;
  readonly resolucion_determinacion_fisc: CuerpoSinEsquema;
  readonly papeletas: CuerpoSinEsquema;
  readonly transito_busqueda: CuerpoSinEsquema;
  readonly codigos_transito: CuerpoSinEsquema;
  readonly transito_descargos: CuerpoSinEsquema;
  readonly internamiento: CuerpoSinEsquema;
  readonly transito_documentos: CuerpoSinEsquema;
  readonly transito_valores: CuerpoSinEsquema;
  readonly transito_cambio_numero: CuerpoSinEsquema;
  readonly transito_reportes: CuerpoSinEsquema;
  readonly transito_record_conductor: CuerpoSinEsquema;
  readonly transito_record_vehicular: CuerpoSinEsquema;
  readonly transito_constancia_libre: CuerpoSinEsquema;
  readonly transito_padron: CuerpoSinEsquema;
  readonly transito_estado_cuenta: CuerpoSinEsquema;
  readonly transito_papeleta_reporte: CuerpoSinEsquema;
  readonly transito_rg_ordinaria: CuerpoSinEsquema;
  readonly transito_rg_sancionadora: CuerpoSinEsquema;
  readonly transito_padron_coactiva: CuerpoSinEsquema;
  readonly transito_padron_constancias: CuerpoSinEsquema;
  readonly transito_resumen_recaudacion: CuerpoSinEsquema;
  readonly transito_resumen_papeletas: CuerpoSinEsquema;
  readonly transito_resumen_codigo: CuerpoSinEsquema;
  readonly transito_resumen_placa: CuerpoSinEsquema;
  readonly adm_notificacion: CuerpoSinEsquema;
  readonly infracciones_adm: CuerpoSinEsquema;
  readonly codigos_cuis: CuerpoSinEsquema;
  readonly adm_codigos_reporte: CuerpoSinEsquema;
  readonly adm_valores: CuerpoSinEsquema;
  readonly adm_estado_cuenta: CuerpoSinEsquema;
  readonly adm_resolucion_gerencia: CuerpoSinEsquema;
  readonly adm_notificacion_resolucion: CuerpoSinEsquema;
  readonly adm_reportes: CuerpoSinEsquema;
  readonly adm_padron_notificaciones: CuerpoSinEsquema;
  readonly adm_notificaciones_vencidas: CuerpoSinEsquema;
  readonly adm_notificaciones_contribuyente: CuerpoSinEsquema;
  readonly adm_resumen_recaudacion: CuerpoSinEsquema;
  readonly caja_tributaria: CuerpoSinEsquema;
  readonly caja_tasas: CuerpoSinEsquema;
  readonly fraccionamiento: CuerpoSinEsquema;
  readonly consulta_convenios: CuerpoSinEsquema;
  readonly duplicado_recibo: CuerpoSinEsquema;
  readonly anulacion_recibo: CuerpoSinEsquema;
  readonly anulacion_convenio: CuerpoSinEsquema;
  readonly cierre_caja: CuerpoSinEsquema;
  readonly avance_recaudacion: CuerpoSinEsquema;
  readonly recaudacion_area: CuerpoSinEsquema;
  readonly cuenta_corriente: CuerpoSinEsquema;
  readonly consulta_deuda: CuerpoSinEsquema;
  readonly consulta_unificada: CuerpoSinEsquema;
  readonly consulta_resumen_predial: CuerpoSinEsquema;
  readonly consulta_altas_bajas: CuerpoSinEsquema;
  readonly consulta_deudas_beneficio: CuerpoSinEsquema;
  readonly consulta_pagos: CuerpoSinEsquema;
  readonly consulta_predios: CuerpoSinEsquema;
  readonly consulta_vehiculos: CuerpoSinEsquema;
  readonly consulta_valores: CuerpoSinEsquema;
  readonly constancia: CuerpoSinEsquema;
  readonly valores_busqueda: CuerpoSinEsquema;
  readonly valores_individual: CuerpoSinEsquema;
  readonly valores_masivo: CuerpoSinEsquema;
  readonly notificacion_valores: CuerpoSinEsquema;
  readonly prescripcion: CuerpoSinEsquema;
  readonly pase_coactiva: CuerpoSinEsquema;
  readonly coactiva_expedientes: CuerpoSinEsquema;
  readonly importacion_valores: CuerpoSinEsquema;
  readonly proceso_coactivo: CuerpoSinEsquema;
  readonly rec_impresion: CuerpoSinEsquema;
  readonly expediente_historial: CuerpoSinEsquema;
  readonly cambiar_direccion_ref: CuerpoSinEsquema;
  readonly costas_procesales: CuerpoSinEsquema;
  readonly fraccionamiento_coactivo: CuerpoSinEsquema;
  readonly actos_coactivos: CuerpoSinEsquema;
  readonly notificaciones_coactivas: CuerpoSinEsquema;
  readonly coactiva_consulta_deudas: CuerpoSinEsquema;
  readonly coactiva_deudas_beneficio: CuerpoSinEsquema;
  readonly anuncios: CuerpoSinEsquema;
  readonly anuncios_reportes: CuerpoSinEsquema;
  readonly licencia_funcionamiento: CuerpoSinEsquema;
  readonly licencia_padron: CuerpoSinEsquema;
  readonly licencia_resumen_anual: CuerpoSinEsquema;
  readonly licencia_resolucion_cancelacion: CuerpoSinEsquema;
  readonly licencia_resolucion_duplicado: CuerpoSinEsquema;
  readonly fue_edificacion: CuerpoSinEsquema;
  readonly edificacion_reporte: CuerpoSinEsquema;
  readonly ciiu: CuerpoSinEsquema;
  readonly certificados: CuerpoSinEsquema;
  readonly modulos: CuerpoSinEsquema;
  readonly usuarios: CuerpoSinEsquema;
  readonly grupos: CuerpoSinEsquema;
  readonly accesos: CuerpoSinEsquema;
  readonly miembros: CuerpoSinEsquema;
  readonly permisos: CuerpoSinEsquema;
  readonly cambiar_anio: CuerpoSinEsquema;
  readonly cambiar_clave: CuerpoSinEsquema;
  readonly auditoria: CuerpoSinEsquema;
  readonly parametros: CuerpoSinEsquema;
  readonly respaldo: CuerpoSinEsquema;
}

export type ParametrosDe<O extends IdDeOperacion> = ParametrosPorOperacion[O];
export type CuerpoDe<O extends IdDeOperacion> = CuerpoPorOperacion[O];
export type RespuestaDe<O extends IdDeOperacion> = RespuestaPorOperacion[O];
