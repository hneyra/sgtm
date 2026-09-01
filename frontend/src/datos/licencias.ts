/* Lo que queda del artboard `Autorizaciones y licencias.dc.html` **después de
   conectar el módulo**: sus rótulos, su prosa y sus columnas.

   Lo que había aquí y ya no está, con el motivo:

   - `SOLICITUDES`, `CIIU`, `CERTIFICADOS` y las filas de `HOJAS` — los sirve el
     backend.
   - `BANDEJA`, `AVANCE_DE_TRAMITES` y las cifras de `meta` de cada hoja — eran
     conteos y porcentajes inventados. Los que el backend sabe contar se cuentan;
     los que no, salen «—».
   - `plazoDias` y todo lo que colgaba de él —«Plazo agotado», «Quedan 8 días»,
     el silencio positivo, «Vencida sin resolver»— porque **el backend no tiene
     el concepto de solicitud con plazo**: `LicenciaResource` y `FueResource`
     publican el estado de la autorización (VIGENTE, VENCIDA, CANCELADA…), no el
     del expediente en evaluación. Un contador de días encima de un dato que no
     existe habría dicho que el plazo se agota mirando la fecha de emisión de la
     licencia ya otorgada.
   - Los valores de los desplegables que el enumerado del backend no tiene
     —ACTIVA, DUPLICADA, INDETERMINADA, CESIONARIO, MERCADO, «DEMOLICIÓN
     TOTAL»…—. Se ofrecen solo los que existen letra por letra, y la pantalla
     dice cuáles quedan fuera (#427). */

export type TipoDeTramite = 'funcionamiento' | 'edificacion' | 'anuncio';

/** Quién aporta el requisito: el administrado o la propia municipalidad. */
export type Quien = 'Administrado' | 'Municipalidad';

/** [rótulo, detalle, quién lo aporta] */
export type Requisito = [string, string, Quien];

/** [rótulo, 1 si la columna es numérica y va a la derecha]. */
export type ColDef = [string, 0 | 1];

/**
 * Los tres trámites, con lo que el TUPA les pide.
 *
 * **La lista de requisitos es de referencia, no es estado del sistema**, y las
 * pantallas lo dicen: de los tres, el único cuyo cumplimiento el backend lleva
 * es el FUE de edificación —`FueResource.documentos[]` con su `presentado` y sus
 * folios, y `seccionesFaltantes`/`completo` como compuerta—, y solo **en la
 * ficha**: la fila de la grilla trae los dos escritos fijos. En funcionamiento y
 * en anuncio no hay ninguna tabla de requisitos que consultar, así que marcar
 * una casilla aquí no guardaría nada.
 */
export const TRAMITES: Record<
  TipoDeTramite,
  { label: string; modalidad: string; requisitos: Requisito[]; ruta: string }
> = {
  funcionamiento: {
    label: 'Licencia de funcionamiento',
    modalidad: 'Aprobación automática o evaluación previa según el riesgo del giro',
    ruta: 'GET /api/v1/licencias/funcionamiento',
    requisitos: [
      ['Solicitud-declaración jurada', 'Formato del TUPA con vigencia de poder si es persona jurídica.', 'Administrado'],
      ['Copia del RUC y del documento de identidad', 'Del titular o del representante legal acreditado.', 'Administrado'],
      ['Declaración jurada de condiciones de seguridad', 'ITSE básica ex post para riesgo bajo o medio.', 'Administrado'],
      ['Pago del derecho de trámite', 'Tasa del TUPA. Sin recibo la solicitud no se admite.', 'Administrado'],
      ['Compatibilidad de uso y zonificación', 'La verifica Catastro contra la zonificación del predio.', 'Municipalidad'],
      ['Inspección técnica de seguridad', 'Solo si el riesgo es alto o muy alto, y entonces es previa.', 'Municipalidad'],
    ],
  },
  edificacion: {
    label: 'Licencia de edificación (FUE)',
    modalidad: 'Modalidad A, B, C o D de la Ley 29090',
    ruta: 'GET /api/v1/licencias/edificacion',
    requisitos: [
      ['Formulario Único de Edificaciones', 'Las cinco secciones se completan por partes, cuando el administrado las trae.', 'Administrado'],
      ['Documentos adjuntos', 'Los que el FUE declara, con sus folios. El backend los lleva uno a uno.', 'Administrado'],
      ['Pago del derecho de trámite', 'Se comprueba al emitir la licencia, no al presentar el formulario.', 'Administrado'],
      ['Revisión del proyecto', 'En las modalidades C y D la hace la comisión técnica.', 'Municipalidad'],
    ],
  },
  anuncio: {
    label: 'Autorización de anuncio y propaganda',
    modalidad: 'Autorización con vigencia y tasa anual devengada',
    ruta: 'GET /api/v1/autorizaciones/anuncios',
    requisitos: [
      ['Solicitud con la ubicación y las medidas', 'Clase, tipo, área, número de lados y cantidad.', 'Administrado'],
      ['Licencia de funcionamiento del establecimiento', 'Cuando el anuncio es del propio negocio.', 'Administrado'],
      ['Pago de la tasa', 'La resuelve el backend del conjunto sellado al autorizar; no se teclea.', 'Municipalidad'],
    ],
  },
};

/* ══════════ Las columnas de cada tabla ══════════ */

export const COLS_LICENCIAS: ColDef[] = [
  ['Nº licencia', 0],
  ['Titular', 0],
  ['Denominación', 0],
  ['Dirección', 0],
  ['Tipo', 0],
  ['Área m²', 1],
  ['Emitida', 0],
  ['Vence', 0],
  ['Estado', 0],
];

/**
 * Las columnas del padrón de FUE.
 *
 * **Sin columna «Completo», y no es un olvido.** `FueResource.de(fila)` —el que
 * compone la fila de la grilla— escribe `completo = false` y
 * `seccionesFaltantes = List.of()` **fijos**, sin mirar el expediente: son
 * detalle de la ficha. Dibujarlos aquí diría «incompleto» de una licencia ya
 * emitida y «no le falta nada» de un expediente al que le faltan las cinco
 * secciones —las dos cosas a la vez y en la misma fila—. La compuerta se lee al
 * abrir el expediente, donde el backend sí la calcula.
 */
export const COLS_FUE: ColDef[] = [
  ['Nº expediente', 0],
  ['Declarado', 0],
  ['Administrado', 0],
  ['Trámite', 0],
  ['Obra', 0],
  ['Modalidad', 0],
  ['Nº licencia', 0],
  ['Estado', 0],
];

export const COLS_ANUNCIOS: ColDef[] = [
  ['Nº autorización', 0],
  ['Titular', 0],
  ['Clase', 0],
  ['Tipo', 0],
  ['Dirección', 0],
  ['Área m²', 1],
  ['Vence', 0],
  ['Tasa devengada S/', 1],
  ['Estado', 0],
];

export const COLS_GIROS: ColDef[] = [['Código CIIU', 0], ['Descripción', 0], ['Principal', 0], ['Activo', 0]];
export const COLS_HISTORIAL_LIC: ColDef[] = [['Movimiento', 0], ['Fecha', 0], ['Motivo', 0], ['Resolución', 0], ['Observación', 0]];
export const COLS_DUPLICADOS: ColDef[] = [['Nº duplicado', 1], ['Fecha', 0], ['Motivo', 0], ['Reimpresiones', 1]];

export const COLS_VALORIZACION: ColDef[] = [['Piso', 1], ['Partida', 0], ['Categoría', 0], ['Área m²', 1]];
export const COLS_PROFESIONALES: ColDef[] = [['Tipo', 0], ['Nombre', 0], ['Colegio', 0], ['Colegiatura', 0]];
export const COLS_DOCUMENTOS: ColDef[] = [['Requisito', 0], ['Presentado', 0], ['Folios', 1]];
export const COLS_VIGENCIAS: ColDef[] = [['Tramo', 1], ['Desde', 0], ['Hasta', 0]];
export const COLS_HISTORIAL_FUE: ColDef[] = [['Movimiento', 0], ['Fecha', 0], ['Nº licencia', 0], ['Motivo', 0], ['Resolución', 0]];
export const COLS_MOV_ANUNCIO: ColDef[] = [['Movimiento', 0], ['Fecha', 0], ['Ejercicio', 1], ['Cargo', 0], ['Tasa S/', 1], ['Vence', 0], ['Motivo', 0]];

export const COLS_CIIU: ColDef[] = [
  ['Código CIIU', 0],
  ['Descripción', 0],
  ['Sección', 0],
  ['Riesgo ITSE', 0],
  ['Zonificación compatible', 0],
  ['Sectorial', 0],
  ['Origen', 0],
];

export const COLS_CERT: ColDef[] = [
  ['Nº certificado', 0],
  ['Tipo', 0],
  ['Código predial', 0],
  ['Dirección', 0],
  ['Solicitante', 0],
  ['Emitido', 0],
  ['Vigente hasta', 0],
  ['Derecho S/', 1],
  ['Estado', 0],
];

export const COLS_PADRON_LIC: ColDef[] = [
  ['Nº licencia', 0],
  ['Titular', 0],
  ['Denominación', 0],
  ['Giro principal', 0],
  ['Dirección', 0],
  ['Estado', 0],
];

export const COLS_RESUMEN: ColDef[] = [
  ['Ejercicio', 0],
  ['Emitidas', 1],
  ['Canceladas', 1],
  ['Duplicados', 1],
  ['Vigentes al cierre', 1],
  ['Derecho de trámite S/', 1],
];

export const COLS_REPORTE_EDIF: ColDef[] = [
  ['Nº licencia', 0],
  ['Expediente', 0],
  ['Fecha', 0],
  ['Administrado', 0],
  ['Predio', 0],
  ['Modalidad', 0],
  ['Área a construir m²', 1],
  ['Valor de obra S/', 1],
  ['Estado', 0],
];

export const COLS_PADRON_ANUNCIOS: ColDef[] = [
  ['Nº autorización', 0],
  ['Titular', 0],
  ['Clase', 0],
  ['Dirección', 0],
  ['Área m²', 1],
  ['Vence', 0],
  ['Estado', 0],
];

/** Las cuatro hojas del centro de reportes, con la ruta que las sirve. */
export type Hoja = {
  g: string;
  label: string;
  sub: string;
  ruta: string;
  cierre: string;
};

export const HOJAS: Hoja[] = [
  {
    g: 'Licencias de funcionamiento',
    label: 'Padrón de licencias',
    sub: 'Padrón de licencias municipales de funcionamiento, con su fecha de corte',
    ruta: 'POST /api/v1/licencias/funcionamiento/reportes/padron',
    cierre:
      'El padrón es la base del cruce con fiscalización: un establecimiento en funcionamiento que no figura aquí es una infracción. Los cuatro recuentos cubren todas las licencias del criterio, no las de esta página.',
  },
  {
    g: 'Licencias de funcionamiento',
    label: 'Resumen de licencias por año',
    sub: 'Licencias otorgadas, canceladas y duplicadas por ejercicio',
    ruta: 'GET /api/v1/licencias/funcionamiento/reportes/resumen-anual',
    cierre:
      'El derecho recaudado es solo la tasa de trámite, y va con su fecha o no va: cuando el conjunto sellado del año no permite resolver el concepto del TUPA, la celda sale «—» con el motivo. Un cero se leería como un año en el que no se cobró nada, y esta hoja se usa para conciliar lo que la caja recaudó.',
  },
  {
    g: 'Edificación',
    label: 'Reporte de licencias de edificación',
    sub: 'Licencias de edificación por modalidad y estado, con su valor de obra',
    ruta: 'GET /api/v1/licencias/edificacion/reportes/general',
    cierre:
      'El valor de obra sale del cuadro de valores unitarios que rigió la fecha de corte. Cuando falta una celda del cuadro el importe no se inventa: sale «—» nombrando la llave que falta, porque un «valor de obra 0,00» es indistinguible de uno correcto en el papel que se exhibe en la obra.',
  },
  {
    g: 'Anuncios',
    label: 'Padrón de anuncios y propaganda',
    sub: 'Autorizaciones de anuncio con su tasa devengada a la fecha de corte',
    ruta: 'POST /api/v1/autorizaciones/anuncios/reportes',
    cierre:
      'El devengado del padrón lo suma el backend a la fecha de corte, no la pantalla. Un anuncio sin autorización vigente es infracción, y su retiro es medida complementaria.',
  },
];

/** Las once opciones del manual que el módulo resume, con su destino. */
export const OPCIONES: [string, string][] = [
  ['Licencia de funcionamiento', 'lista'],
  ['Padrón de licencias', 'reportes'],
  ['Resumen de licencias por año', 'reportes'],
  ['Res. de cancelación', 'lista'],
  ['Res. de duplicado', 'lista'],
  ['FUE — edificación', 'lista'],
  ['Reporte de licencias de edificación', 'reportes'],
  ['Anuncio y propaganda', 'lista'],
  ['Reportes de anuncios', 'reportes'],
  ['Catálogo CIIU', 'catalogos'],
  ['Certificados', 'catalogos'],
];

/**
 * Lo que el panel del artboard contaba y aquí no se cuenta, con el motivo.
 *
 * [rótulo, lo que el prototipo decía, por qué no se puede decir]
 */
export const LO_QUE_NO_SE_CUENTA: [string, string, string][] = [
  [
    'Con el plazo del TUPA agotado',
    '42 solicitudes',
    'El backend no tiene el concepto de solicitud en evaluación con un plazo corriendo: publica el estado de la autorización —VIGENTE, VENCIDA, CANCELADA— y ninguna fecha de vencimiento del trámite. Contarlo aquí sería contar otra cosa.',
  ],
  [
    'Con requisitos sin cumplir',
    '88 solicitudes',
    'Solo el FUE de edificación lleva sus requisitos —documentos y secciones—, y se leen de uno en uno al abrir el expediente. Ninguna lectura los agrega, así que la cifra saldría de recorrer el padrón entero.',
  ],
  [
    'Con menos de cinco días de plazo',
    '34 solicitudes',
    'Lo mismo que la primera: sin plazo del trámite no hay «por vencer».',
  ],
  [
    'Resueltas este mes',
    '188 solicitudes',
    'El resumen anual cuenta emitidas y canceladas por ejercicio, no por mes, y una autorización denegada no deja fila en ninguna parte.',
  ],
  [
    'Resuelto dentro del plazo del TUPA',
    '88,4 %',
    'Es un porcentaje sobre dos cifras que no existen: cuántas se resolvieron y en cuántos días. Ninguna de las dos la publica el backend.',
  ],
];
