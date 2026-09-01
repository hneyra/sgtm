/* Lo que queda del artboard `Infracciones administrativas.dc.html` una vez que
   el módulo lee del backend: los rótulos, la prosa y los campos que el servidor
   admite de verdad.

   **Aquí ya no hay ni una cifra ni una fila inventada.** Las 812
   notificaciones, las seis del cuadro CUIS con su multa en soles, las cuatro
   multas marcables y las seis hojas con sus filas salían del prototipo. Lo que
   el backend publica lo dibuja `Sanciones.tsx`; lo que no publica sale «—»
   diciendo por qué. */

export type TipoDeCampo = 'text' | 'sel' | 'date' | 'area' | 'chk' | 'ro';

export type CampoDeActo = {
  /** La clave con la que el campo escribe en el borrador. */
  k: string;
  /** La etiqueta del manual. */
  l: string;
  t?: TipoDeCampo;
  /** El código del catálogo del que sale el valor: CIIU, CUIS, RIS. */
  c?: string;
  o?: string[];
  ancho?: boolean;
  ayuda?: string;
  ph?: string;
};

export type BloqueDeActo = { titulo?: string; nota?: string; campos: CampoDeActo[] };

export type IdDeActo = 'notificacion' | 'sancion' | 'resolucion';

export type Acto = {
  id: IdDeActo;
  titulo: string;
  hint: string;
  bloques: BloqueDeActo[];
  primaria: string;
  aviso: string;
  /** Lo que impide registrar este acto desde aquí, cuando lo hay. */
  sinPuerta?: string;
};

/* ══════════ Los enumerados del dominio, letra por letra ══════════ */

export const SENTIDOS_DEL_FALLO = ['', 'FUNDADO', 'FUNDADO_EN_PARTE', 'INFUNDADO', 'IMPROCEDENTE'];
export const EFECTOS_SOBRE_LA_MULTA = ['', 'SE_MANTIENE', 'SE_DEJA_SIN_EFECTO', 'SE_REDUCE'];
export const MODALIDADES_DE_NOTIFICACION = ['PERSONAL', 'CEDULON', 'PUBLICACION', 'CORREO', 'NEGATIVA'];
export const RESULTADOS_DE_NOTIFICACION = ['NOTIFICADO', 'NO_UBICADO', 'RECHAZADO'];

/**
 * Las cinco fases de `FaseDelProcedimiento`, con el rótulo con que se leen.
 *
 * **La fase no es el estado de la deuda.** El manual mezcla los dos
 * vocabularios en una sola columna «Estado»; el recurso publica los dos con
 * nombres distintos y la pantalla los dibuja en dos columnas.
 */
export const FASES: [clave: string, rotulo: string, nota: string][] = [
  ['PREVENTIVA', 'Preventiva', 'La notificación previa sigue abierta y su plazo no ha vencido'],
  ['CONSTATADA', 'Constatada', 'Venció el plazo sin subsanar y todavía no hay resolución'],
  ['SANCIONADA', 'Sancionada', 'Hay resolución de gerencia administrativa sobre el acta'],
  ['PAGADA', 'Pagada', 'La multa se cobró'],
  ['COACTIVA', 'En coactiva', 'Firme y sin pagar: pasó a ejecución'],
];

/* ══════════ Los tres actos del procedimiento ══════════ */

/**
 * Los tres actos, en su orden legal, **con los campos que el backend acepta**.
 *
 * El manual dibuja muchos más —CIIU del establecimiento, nombre comercial,
 * inspector y supervisor, si el administrado se negó a firmar, la hora del
 * acta—, y ninguno de ellos entra por el cuerpo que el servidor declara: los
 * cuerpos son lista blanca y lo que no está en el `record` no viaja. Dibujar un
 * campo que no viaja es el defecto que #331 documenta: se teclea, se guarda
 * «bien» y el dato desaparece sin que nada lo diga.
 */
export const ACTOS: Acto[] = [
  {
    id: 'notificacion',
    titulo: 'Notificación preventiva',
    hint: 'Se levanta en el establecimiento y abre el plazo para subsanar',
    bloques: [
      {
        titulo: 'Identidad del acto',
        nota:
          'El manual teclea el número en tres campos —Serie, Año, Número— y el sistema lo guarda en UNO, único por municipalidad. ' +
          'La serie y el número se componen con el guion que el propio manual imprime en su columna «Serie-Nº»; el año no entra ' +
          'en él, porque «001-004183» de 2025 y de 2026 serían la misma notificación.',
        campos: [
          { k: 'serie', l: 'Serie', t: 'text', ph: '001' },
          { k: 'numeroN', l: 'Número', t: 'text', ph: '004183' },
          { k: 'fechaN', l: 'Fecha de notificación', t: 'date' },
          { k: 'plazoN', l: 'Plazo (días)', t: 'text', ph: '10', ayuda: 'Sin plazo la notificación no vence nunca, y eso es una decisión, no un olvido' },
        ],
      },
      {
        titulo: 'Dónde y por qué',
        campos: [
          { k: 'dirN', l: 'Dirección del establecimiento', t: 'text', ancho: true, ph: 'AV. JOSÉ DE LAMA 1180' },
          { k: 'motivoN', l: 'Motivo', t: 'area', ancho: true, ph: 'Lo que se constató y hay que subsanar' },
        ],
      },
      {
        titulo: 'A quién, si se sabe',
        nota:
          'Los dos son opcionales a propósito: «un paso previo a la generación de la multa administrativa» no exige contribuyente ' +
          'ni predio identificados. Son identificadores internos, no el código del padrón ni el código catastral.',
        campos: [
          { k: 'contribN', l: 'Id de contribuyente', t: 'text', ph: 'en blanco si no se identificó' },
          { k: 'predioN', l: 'Id de predio', t: 'text', ph: 'en blanco si no se identificó' },
        ],
      },
    ],
    primaria: 'Registrar la notificación',
    aviso: 'Registrarla es lo que hace correr el plazo. Sin notificación previa el procedimiento sancionador es nulo.',
  },
  {
    id: 'sancion',
    titulo: 'Acta de constatación y sanción',
    hint: 'Segunda visita: se constata que no se subsanó y nace la multa',
    bloques: [],
    primaria: 'Levantar el acta',
    aviso: 'Vencido el plazo, o se levanta el acta y se sanciona, o se archiva. No hacer nada equivale a archivar sin dejar constancia.',
    sinPuerta:
      'El acta administrativa es una papeleta de la familia ADMINISTRATIVA, y el registro de papeletas no está publicado: el ' +
      'controlador de actas es de solo lectura y el contrato no declara ningún POST que las cree. El acto existe en el backend; ' +
      'la puerta, no. Dibujar aquí el formulario del manual daría un botón que no manda nada.',
  },
  {
    id: 'resolucion',
    titulo: 'Resolución de gerencia',
    hint: 'Resuelve el descargo y deja la multa firme, reducida o sin efecto',
    bloques: [
      {
        titulo: 'La resolución',
        campos: [
          { k: 'papR', l: 'Nº de acta / papeleta', t: 'text', ph: 'El acta sobre la que se resuelve' },
          { k: 'fechaR', l: 'Fecha de la resolución', t: 'date' },
          { k: 'expR', l: 'Nº de expediente del descargo', t: 'text', ph: 'en blanco si no hubo recurso' },
          { k: 'sentidoR', l: 'Sentido del fallo', t: 'sel', o: SENTIDOS_DEL_FALLO },
          { k: 'efectoR', l: 'Efecto sobre la multa', t: 'sel', o: EFECTOS_SOBRE_LA_MULTA },
          { k: 'accesoriaR', l: 'Sanción accesoria', t: 'text', ph: 'Clausura, retiro, paralización…' },
          { k: 'proyR', l: 'Proyectar la deuda al', t: 'date', ayuda: 'La cifra que se imprime en el papel sale con esta fecha (regla 9)' },
          { k: 'sustentoR', l: 'Sustento', t: 'area', ancho: true, ph: 'Los fundamentos de hecho y de derecho' },
        ],
      },
    ],
    primaria: 'Dictar la resolución',
    aviso: 'Una vez firme, la multa pasa a generación de valores y de ahí a cobranza coactiva si no se paga.',
  },
];

/** Los campos de la cédula con que se notifica la resolución ya dictada. */
export const CAMPOS_DE_LA_CEDULA: CampoDeActo[] = [
  { k: 'cedResolucion', l: 'Nº de la resolución', t: 'text', ph: 'RGA-…' },
  { k: 'cedFecha', l: 'Fecha de la diligencia', t: 'date' },
  { k: 'cedModalidad', l: 'Modalidad', t: 'sel', o: MODALIDADES_DE_NOTIFICACION },
  { k: 'cedResultado', l: 'Resultado', t: 'sel', o: RESULTADOS_DE_NOTIFICACION },
  { k: 'cedNotificador', l: 'Notificador', t: 'text', ph: 'Quien diligenció' },
  { k: 'cedDireccion', l: 'Dirección donde se diligenció', t: 'text', ancho: true },
  { k: 'cedRecibio', l: 'Recibió', t: 'text' },
  { k: 'cedDocReceptor', l: 'Documento del receptor', t: 'text' },
  { k: 'cedVinculo', l: 'Vínculo con el administrado', t: 'text' },
  { k: 'cedAcuse', l: 'Acuse', t: 'text', ancho: true, ph: 'Lo que quedó anotado en el cargo' },
];

/** El motivo por el que un acto todavía no se puede abrir. */
export const MOTIVOS: Record<'sancion' | 'resolucion', string> = {
  sancion: 'Se habilita cuando la notificación esté registrada. Sin notificación previa el procedimiento sancionador es nulo.',
  resolucion: 'Se habilita cuando haya acta con multa. No hay nada que resolver antes de eso.',
};

/* ══════════ El cuadro CUIS ══════════ */

/**
 * Las columnas del cuadro, en la forma que `CodigoInfraccionResource` la da.
 *
 * **Sin «Materia» y sin «Multa S/»**: `codigo_infraccion` no tiene columna de
 * materia —el filtro que el manual llama así el servidor lo aplica al texto de
 * la infracción— y la multa es el porcentaje por la UIT del ejercicio, que sale
 * del conjunto de parámetros sellado.
 */
export const COLS_CUIS: [string, 0 | 1][] = [
  ['Código', 0], ['Descripción', 0], ['% UIT', 1], ['Medida complementaria', 0],
  ['Base legal', 0], ['Vigente desde', 0],
];

/* ══════════ La lista de expedientes ══════════ */

/**
 * Las columnas de la lista.
 *
 * «Fase» y «Estado de la deuda» son **dos columnas**, no una: son los dos
 * vocabularios que #397 separó en el backend, y meterlos en una sola es lo que
 * dejaba un filtro del procedimiento sobre una columna de cobranza.
 */
export const COLS_LISTA: [string, 0 | 1][] = [
  ['Nº de acta', 0], ['Administrado', 0], ['CUIS', 0], ['Infracción', 0],
  ['% UIT', 1], ['Multa S/', 1], ['Fase', 0], ['Estado de la deuda', 0],
];

/** Las pastillas de filtro de la lista: «todas» más las cinco fases. */
export const CHIPS = ['Todas', 'PREVENTIVA', 'CONSTATADA', 'SANCIONADA', 'PAGADA', 'COACTIVA'];

/* ══════════ El centro de reportes ══════════ */

export type Criterio = { l: string; t: 'text' | 'sel' | 'date'; v: string; o?: string[] };

/**
 * Los criterios que los reportes usan **de verdad**.
 *
 * Los que el contrato declara y ningún controlador lee —`agrupadoPor` del
 * padrón y del reporte por contribuyente, `fechaDeCalculo` e `incluirGastos`
 * del estado de cuenta, `estado` y `ordenadoPor` del reporte de códigos— no se
 * dibujan: tecleados no harían nada.
 */
export const CRITERIOS: Record<string, Criterio> = {
  desde: { l: 'Fecha desde', t: 'date', v: '' },
  hasta: { l: 'Fecha hasta', t: 'date', v: '' },
  estadoNotificacion: { l: 'Estado', t: 'sel', v: '', o: ['', 'EMITIDA', 'SUBSANADA', 'VENCIDA', 'ANULADA'] },
  vencidasAl: { l: 'Vencidas al', t: 'date', v: '' },
  fiscalizador: { l: 'Fiscalizador', t: 'text', v: '' },
  infraccion: { l: 'Infracción', t: 'text', v: '' },
  conPapeleta: { l: '¿Ya tiene papeleta?', t: 'sel', v: '', o: ['', 'true', 'false'] },
  codContribuyente: { l: 'Cod. contribuyente', t: 'text', v: '' },
  ano: { l: 'Año', t: 'sel', v: '', o: ['', '2026', '2025', '2024', '2023'] },
  soloPendientes: { l: 'Solo con deuda pendiente', t: 'sel', v: '', o: ['', 'true'] },
  papeleta: { l: 'Nº de papeleta', t: 'text', v: '' },
  codigo: { l: 'Código CUIS', t: 'text', v: '' },
  descripcionContiene: { l: 'La descripción contiene', t: 'text', v: '' },
  agrupadoPor: { l: 'Agrupado por', t: 'sel', v: '', o: ['', 'ESTADO', 'ANO', 'MES', 'CODIGO', 'PLACA'] },
};

export type Hoja = {
  k: string;
  g: string;
  label: string;
  sub: string;
  crit: string[];
  cierre: string;
  /** Lo que impide dibujar la hoja, cuando lo hay. */
  sinLectura?: string;
};

export const HOJAS: Hoja[] = [
  {
    k: 'padron_notificaciones', g: 'Padrones', label: 'Padrón de notificaciones',
    sub: 'Relación de notificaciones administrativas por periodo',
    crit: ['desde', 'hasta', 'estadoNotificacion'],
    cierre: 'El padrón es el descargo del fiscalizador: cada notificación entregada tiene que aparecer aquí. Las tres columnas de la papeleta solo tienen valor cuando la papeleta existe.',
  },
  {
    k: 'vencidas', g: 'Padrones', label: 'Notificaciones vencidas',
    sub: 'Notificaciones cuyo plazo venció sin acreditarse el cumplimiento',
    crit: ['vencidasAl', 'fiscalizador', 'infraccion', 'conPapeleta'],
    cierre: 'Vencido el plazo, o se levanta el acta de constatación y se sanciona, o se archiva. Una notificación sin plazo no vence nunca, y eso es una decisión del acto.',
  },
  {
    k: 'por_contribuyente', g: 'Por administrado', label: 'Notificaciones por contribuyente',
    sub: 'Papeletas administrativas de un administrado',
    crit: ['codContribuyente', 'ano', 'soloPendientes'],
    cierre: 'El «estado de deuda» del manual no es un valor sino una marca: el servidor solo mira si llega algo y con cualquier texto acota a las pendientes. Por eso aquí es una casilla y no un desplegable de estados.',
  },
  {
    k: 'estado_cuenta', g: 'Por administrado', label: 'Estado de cuenta de papeleta',
    sub: 'Deuda por multas administrativas',
    crit: ['papeleta', 'codContribuyente'],
    cierre: 'Esta lectura devuelve siempre las pendientes: el servidor lo fija y no lo publica como filtro. Los importes son los del acta; el interés del día lo lleva el libro.',
  },
  {
    k: 'codigos', g: 'Catálogo', label: 'Reporte de códigos CUIS',
    sub: 'Cuadro único de infracciones y sanciones vigente',
    crit: ['codigo', 'descripcionContiene'],
    cierre: 'Cambiar la UIT del ejercicio recalcula todas las multas sin tocar el cuadro: lo que la ordenanza fija es el porcentaje, no el importe. Por eso no hay columna de soles.',
  },
  {
    k: 'resumen_papeletas', g: 'Resúmenes', label: 'Resumen de multas administrativas',
    sub: 'Cuántas multas hay y por cuánto, agrupadas',
    crit: ['desde', 'hasta', 'agrupadoPor'],
    cierre: 'Los importes son los de las actas, no lo cobrado. Esta es la única hoja del módulo que no tiene lectura propia: se pide al emisor de reportes, que por omisión agrupa por estado.',
  },
  {
    k: 'resumen_recaudacion', g: 'Resúmenes', label: 'Resumen de recaudación',
    sub: 'Lo recaudado por multas administrativas, según el libro',
    crit: ['ano'],
    cierre: 'La suma exacta de los abonos vivos. No se recompone sumando multas pagadas: esa cifra no cuenta los intereses cobrados, cuenta entero un pago parcial y sigue contando un recibo anulado.',
  },
];

/** Las trece opciones del manual que el módulo resume. */
export const OPCIONES: [string, string][] = [
  ['Notificación administrativa', 'alta'],
  ['Infracción administrativa', 'lista'],
  ['Resolución de gerencia', 'expediente'],
  ['Notificación de resolución', 'expediente'],
  ['Estado de cuenta de papeleta', 'reportes'],
  ['Cuadro CUIS', 'cuis'],
  ['Reporte de códigos', 'reportes'],
  ['Generación de valores', 'valores'],
  ['Reportes administrativos', 'reportes'],
  ['Padrón de notificaciones', 'reportes'],
  ['Notificaciones vencidas', 'reportes'],
  ['Notificaciones por contribuyente', 'reportes'],
  ['Resumen de recaudación', 'reportes'],
];
