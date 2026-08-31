/* Datos de muestra del módulo de infracciones administrativas, copiados
   literalmente del artboard `Infracciones administrativas.dc.html`. Nada de
   esto viaja a ningún backend: es la maqueta.

   El acrónimo de los documentos es `MDC` —Municipalidad Distrital de
   Catacaos—, no el `MPS`/`MPT` que escribía el artboard. */

/* ══════════ Los tres actos del procedimiento ══════════ */

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
  cuenta?: boolean;
  secundaria: string;
  primaria: string;
  aviso: string;
};

/** Los tres actos del procedimiento sancionador, en su orden legal. Cada uno
 *  declara los campos del manual; lo que decide si se puede abrir es el estado
 *  del acto anterior, no una validación al pulsar «Guardar». */
export const ACTOS: Acto[] = [
  {
    id: 'notificacion',
    titulo: 'Notificación preventiva',
    hint: 'Se levanta en el establecimiento y abre el plazo para subsanar',
    bloques: [
      {
        titulo: 'Datos de la notificación',
        campos: [
          { k: 'serie', l: 'Serie', t: 'text' },
          { k: 'anioN', l: 'Año', t: 'sel', o: ['2026', '2025', '2024'] },
          { k: 'numeroN', l: 'Número', t: 'text' },
          { k: 'fechaN', l: 'Fecha de notificación', t: 'date' },
          { k: 'horaN', l: 'Hora', t: 'text' },
          { k: 'plazoN', l: 'Plazo (días hábiles)', t: 'text', ayuda: 'El plazo lo fija la ordenanza según la materia' },
          { k: 'venceN', l: 'Vence', t: 'ro' },
        ],
      },
      {
        titulo: 'Infractor y predio',
        campos: [
          { k: 'codInfractor', l: 'Infractor — código', t: 'text' },
          { k: 'nomInfractor', l: 'Infractor — nombre', t: 'ro', ancho: true },
          { k: 'docInfractor', l: 'D.N.I. / R.U.C.', t: 'ro' },
          { k: 'dirPredio', l: 'Dirección del predio', t: 'text', ancho: true },
          { k: 'ciiu', l: 'Actividad del negocio', c: 'CIIU', t: 'text' },
          { k: 'licencia', l: 'Licencia de funcionamiento', t: 'text' },
        ],
      },
      {
        titulo: 'Infracción y entrega',
        campos: [
          { k: 'codInfraccion', l: 'Código de infracción', c: 'CUIS', t: 'sel', o: ['A-021', 'A-014', 'A-032', 'C-101', 'C-108', 'S-018', 'L-007'] },
          { k: 'descInfraccion', l: 'Descripción', t: 'ro', ancho: true },
          { k: 'fiscalizador', l: 'Fiscalizador', t: 'sel', o: ['RETO SANTOS, VÍCTOR', 'RÍOS MENDOZA, MARÍA', 'QUISPE PEÑA, JORGE'] },
          { k: 'recibido', l: 'Recibido por', t: 'sel', o: ['CONTRIBUYENTE', 'FAMILIAR', 'DEPENDIENTE', 'NEGATIVA A RECIBIR', 'CEDULÓN'] },
          { k: 'receptor', l: 'Nombre del receptor', t: 'text' },
          { k: 'docReceptor', l: 'D.N.I. del receptor', t: 'text' },
          { k: 'obsN', l: 'Observaciones', t: 'area', ancho: true },
        ],
      },
    ],
    secundaria: 'Imprimir notificación',
    primaria: 'Registrar notificación',
    aviso: 'Al registrar empieza a correr el plazo. Antes de que venza no se puede sancionar.',
  },
  {
    id: 'sancion',
    titulo: 'Acta y resolución de sanción',
    hint: 'Solo si el plazo venció sin subsanar',
    bloques: [
      {
        titulo: 'Acta de constatación',
        nota: 'Se levanta en una segunda visita, después de vencido el plazo. Es lo que acredita que la infracción sigue.',
        campos: [
          { k: 'nroActa', l: 'Nº de acta', t: 'ro' },
          { k: 'fechaActa', l: 'Fecha', t: 'date' },
          { k: 'horaActa', l: 'Hora', t: 'text' },
          { k: 'nomComercial', l: 'Nombre comercial', t: 'text' },
          { k: 'establecimiento', l: 'Establecimiento', t: 'text', ancho: true },
          { k: 'inspector', l: 'Inspector', t: 'sel', o: ['L. PEÑA SANDOVAL', 'A. VÍLCHEZ ROJAS', 'V. RETO SANTOS'] },
          { k: 'supervisor', l: 'Supervisor', t: 'sel', o: ['C. ANCAJIMA FLORES', 'R. MENDOZA CRUZ'] },
          { k: 'atiende', l: 'Persona que atiende', t: 'text' },
          { k: 'sinFirma', l: 'Se negó a firmar', t: 'chk', ph: 'Dejar constancia en el acta' },
          { k: 'hechos', l: 'Descripción de los hechos', t: 'area', ancho: true },
        ],
      },
      {
        titulo: 'Resolución de infracción y sanción',
        nota: 'El código del cuadro CUIS trae el porcentaje de UIT y la medida: no se teclean.',
        campos: [
          { k: 'cuis', l: 'Código', c: 'CUIS', t: 'sel', o: ['A-021', 'A-014', 'A-032', 'C-101', 'C-108', 'C-214', 'S-018', 'L-007'] },
          { k: 'descCuis', l: 'Descripción de la infracción', t: 'ro', ancho: true },
          { k: 'uit', l: 'Base UIT (S/)', t: 'ro' },
          { k: 'pctUit', l: 'Porcentaje de UIT', t: 'ro' },
          { k: 'valorMulta', l: 'Valor de la multa (S/)', t: 'ro' },
          { k: 'medida', l: 'Medida complementaria', t: 'sel', o: ['NINGUNA', 'CLAUSURA TEMPORAL', 'CLAUSURA DEFINITIVA', 'DECOMISO', 'RETIRO', 'PARALIZACIÓN DE OBRA', 'DEMOLICIÓN'] },
          { k: 'nroRis', l: 'Nº de resolución', c: 'RIS', t: 'text' },
          { k: 'fechaNotifRis', l: 'Fecha de notificación', t: 'date' },
          { k: 'prontoPago', l: 'Descuento pronto pago (50 %)', t: 'ro' },
          { k: 'plazoDescargo', l: 'Plazo de descargo', t: 'ro' },
        ],
      },
    ],
    cuenta: true,
    secundaria: 'Vista previa de la RIS',
    primaria: 'Emitir la sanción',
    aviso: 'Emitir la sanción crea la multa en la cuenta corriente y abre el plazo de descargo de cinco días hábiles.',
  },
  {
    id: 'resolucion',
    titulo: 'Resolución de gerencia',
    hint: 'Resuelve el descargo y deja la sanción firme',
    bloques: [
      {
        titulo: 'Resolución',
        campos: [
          { k: 'nroRg', l: 'Nº de resolución', t: 'text' },
          { k: 'fechaRg', l: 'Fecha de resolución', t: 'date' },
          { k: 'expRg', l: 'Nº de expediente del descargo', t: 'text' },
          { k: 'sentido', l: 'Sentido del fallo', t: 'sel', o: ['FUNDADO', 'INFUNDADO', 'IMPROCEDENTE', 'FUNDADO EN PARTE'] },
          { k: 'efecto', l: 'Efecto sobre la multa', t: 'sel', o: ['SE MANTIENE', 'SE DEJA SIN EFECTO', 'SE REDUCE'] },
          { k: 'gerencia', l: 'Gerencia que resuelve', t: 'sel', o: ['GERENCIA DE FISCALIZACIÓN Y CONTROL', 'GERENCIA MUNICIPAL', 'GERENCIA DE ADMINISTRACIÓN TRIBUTARIA'] },
          { k: 'sustentoRg', l: 'Sustento de la resolución', t: 'area', ancho: true },
        ],
      },
      {
        titulo: 'Notificación de la resolución',
        nota: 'La notificación de la resolución es la que deja la sanción firme y habilita el cobro.',
        campos: [
          { k: 'fechaNotifRg', l: 'Fecha de notificación', t: 'date' },
          { k: 'recibidoRg', l: 'Recibido por', t: 'sel', o: ['CONTRIBUYENTE', 'FAMILIAR', 'DEPENDIENTE', 'NEGATIVA A RECIBIR', 'CEDULÓN'] },
          { k: 'notificador', l: 'Notificador', t: 'sel', o: ['V. RETO SANTOS', 'M. RÍOS MENDOZA', 'J. QUISPE PEÑA'] },
          { k: 'visita', l: 'Nº de visita', t: 'text' },
        ],
      },
    ],
    secundaria: 'Ver el documento',
    primaria: 'Emitir resolución',
    aviso: 'Una vez firme, la multa pasa a generación de valores y de ahí a cobranza coactiva si no se paga.',
  },
];

/** El borrador con que llega el expediente 001-004182.
 *
 *  El acta y la resolución de sanción van **vacías**: este expediente es el
 *  que el panel anuncia como «plazo vencido, toca levantar el acta», así que
 *  el acto 2 tiene que quedar pendiente y no cumplido. */
export const DEFECTOS: Record<string, string | boolean> = {
  serie: '001', anioN: '2026', numeroN: '004182', fechaN: '2026-08-02', horaN: '11:20',
  plazoN: '10', venceN: '12/08/2026',
  codInfractor: '00000006551', nomInfractor: 'NOBLECILLA ARISMENDIZ SAC',
  docInfractor: 'RUC 20525118447', dirPredio: 'AV. JOSÉ DE LAMA 1180',
  ciiu: '5610 — RESTAURANTES Y SERVICIO MÓVIL DE COMIDAS', licencia: '',
  codInfraccion: 'A-014', descInfraccion: 'INSTALAR ANUNCIO SIN AUTORIZACIÓN MUNICIPAL',
  fiscalizador: 'RETO SANTOS, VÍCTOR', recibido: 'CONTRIBUYENTE',
  receptor: 'NOBLECILLA RUIZ, CARLOS', docReceptor: '03421886',
  obsN: 'Anuncio luminoso de 8 × 2 m sobre la fachada, sin autorización registrada.',
  nroActa: 'AC-2026-0912', fechaActa: '', horaActa: '',
  nomComercial: 'DEPÓSITO NOBLECILLA', establecimiento: 'AV. JOSÉ DE LAMA 1180',
  inspector: 'L. PEÑA SANDOVAL', supervisor: 'C. ANCAJIMA FLORES',
  atiende: '', sinFirma: false, hechos: '',
  cuis: 'A-014', descCuis: 'INSTALAR ANUNCIO SIN AUTORIZACIÓN MUNICIPAL',
  medida: 'RETIRO', nroRis: '', fechaNotifRis: '',
  plazoDescargo: '5 días hábiles',
  nroRg: '', fechaRg: '', expRg: '', sentido: 'INFUNDADO', efecto: 'SE MANTIENE',
  gerencia: 'GERENCIA DE FISCALIZACIÓN Y CONTROL', sustentoRg: '',
  fechaNotifRg: '', recibidoRg: 'CONTRIBUYENTE', notificador: 'V. RETO SANTOS', visita: '1',
  valDesc: 'MULTAS ADMINISTRATIVAS AGOSTO 2026', valIni: '2026-08-01', valFin: '2026-10-31',
  valRec: '035 — RM PAPELETAS ADMINISTRATIVAS', valVence: '2026-10-06',
  valOficina: '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA',
};

/** El motivo por el que un acto todavía no se puede abrir, según lo que le
 *  falta al anterior. */
export const MOTIVOS: Record<'sancion' | 'resolucion', [string, string]> = {
  sancion: [
    'Se habilita cuando la notificación esté registrada. Sin notificación previa el procedimiento sancionador es nulo.',
    'Se habilita cuando venza el plazo de la notificación, el 12/08/2026. Sancionar antes deja la resolución sin sustento.',
  ],
  resolucion: [
    'Se habilita cuando la sanción esté emitida y notificada. No hay nada que resolver antes de eso.',
    'El administrado tiene hasta el 24/08/2026 para presentar descargo. Si no lo presenta, la sanción queda firme sin necesidad de resolución.',
  ],
};

/** El acuse de la notificación ya entregada, que el acto cumplido enseña
 *  plegado en vez de su formulario. */
export const RECIBO_DE_LA_NOTIFICACION: [string, string][] = [
  ['Notificación', '001-004182'],
  ['Entregada', '02/08/2026 · 11:20'],
  ['Recibió', 'NOBLECILLA RUIZ, CARLOS'],
  ['Plazo', '10 días hábiles — venció el 12/08/2026'],
];

/* ══════════ El cuadro CUIS, que es la fuente de la multa ══════════ */

/** La UIT del ejercicio. El cuadro fija el porcentaje; el importe sale de
 *  aquí, así que cambiar la UIT recalcula las 284 multas. */
export const UIT = 5350;

/** Materia, descripción, porcentaje de UIT y medida complementaria de cada
 *  código tipificado. */
export const TARIFAS: Record<string, [string, string, number, string]> = {
  'C-101': ['Comercialización', 'FUNCIONAR SIN LICENCIA MUNICIPAL DE FUNCIONAMIENTO', 50, 'CLAUSURA TEMPORAL'],
  'C-108': ['Comercialización', 'FUNCIONAR EN GIRO DISTINTO AL AUTORIZADO', 30, 'CLAUSURA TEMPORAL'],
  'C-214': ['Obras', 'EJECUTAR OBRA SIN LICENCIA DE EDIFICACIÓN', 100, 'PARALIZACIÓN DE OBRA'],
  'S-018': ['Salubridad', 'DEFICIENCIAS DE SALUBRIDAD EN EL ESTABLECIMIENTO', 20, 'RETIRO'],
  'A-014': ['Anuncios', 'INSTALAR ANUNCIO SIN AUTORIZACIÓN MUNICIPAL', 10, 'RETIRO'],
  'A-021': ['Comercialización', 'ABRIR ESTABLECIMIENTO SIN AUTORIZACIÓN MUNICIPAL', 20, 'CLAUSURA TEMPORAL'],
  'A-032': ['Obras', 'OCUPAR LA VÍA PÚBLICA CON MATERIAL DE CONSTRUCCIÓN', 10, 'RETIRO'],
  'A-042': ['Anuncios', 'INSTALAR ANUNCIO SIN AUTORIZACIÓN MUNICIPAL', 10, 'RETIRO'],
  'L-007': ['Limpieza', 'ARROJAR RESIDUOS SÓLIDOS EN LA VÍA PÚBLICA', 10, 'NINGUNA'],
};

/** El cuadro tal como se lee en la pantalla: código, materia, descripción,
 *  porcentaje, multa y medida. */
export const CUIS: [string, string, string, string, string, string][] = [
  ['C-101', 'Comercialización', 'Funcionar sin licencia municipal de funcionamiento', '50 %', '2,675.00', 'Clausura temporal'],
  ['C-108', 'Comercialización', 'Funcionar en giro distinto al autorizado', '30 %', '1,605.00', 'Clausura temporal'],
  ['C-214', 'Obras', 'Ejecutar obra sin licencia de edificación', '100 %', '5,350.00', 'Paralización de obra'],
  ['S-018', 'Salubridad', 'Deficiencias de salubridad en el establecimiento', '20 %', '1,070.00', 'Retiro de productos'],
  ['A-042', 'Anuncios', 'Instalar anuncio sin autorización municipal', '10 %', '535.00', 'Retiro del anuncio'],
  ['L-007', 'Limpieza', 'Arrojar residuos sólidos en la vía pública', '10 %', '535.00', 'Ninguna'],
];

export const COLS_CUIS: [string, 0 | 1][] = [
  ['Código', 0], ['Materia', 0], ['Descripción', 0], ['% UIT', 1], ['Multa S/', 1], ['Medida complementaria', 0],
];

export const MATERIAS = ['Todas', 'Comercialización', 'Obras', 'Salubridad', 'Anuncios', 'Limpieza'];

/* ══════════ El panel ══════════ */

/** Las cinco etapas del embudo: etapa, detalle, cuántas y a dónde lleva.
 *
 *  184 y no 588: el embudo es la cohorte de las 812 notificaciones de este
 *  ejercicio, y lo cobrado tiene que ser un subconjunto de lo firme. Las 588
 *  multas pagadas del resumen de recaudación son de otro conjunto —incluyen
 *  sanciones de ejercicios anteriores— y viven en su hoja, no aquí. */
export const EMBUDO: [string, string, number, string][] = [
  ['Notificada', 'El fiscalizador entrega la notificación preventiva', 812, 'lista'],
  ['Plazo vencido', 'Diez días hábiles sin subsanar', 598, 'reportes'],
  ['Con acta y sanción', 'Segunda visita y resolución de multa', 388, 'expediente'],
  ['Firme', 'Sin descargo o con descargo infundado', 302, 'valores'],
  ['Cobrada', 'Cerrada con recibo', 184, 'reportes'],
];

/** La base del embudo: las notificaciones del ejercicio. */
export const BASE_DEL_EMBUDO = 812;

export const AHORA: [string, string, string][] = [
  ['214', 'vencidas sin sancionar', 'reportes'],
  ['96', 'en descargo', 'lista'],
];

export const KPIS: { valor: string; etiqueta: string; nota: string }[] = [
  { valor: '812', etiqueta: 'Notificaciones del ejercicio', nota: 'Levantadas por 6 fiscalizadores en 8 meses.' },
  { valor: '26.4 %', etiqueta: 'Subsanan en el plazo', nota: 'La notificación preventiva funciona en uno de cada cuatro casos.' },
  { valor: '214', etiqueta: 'Vencidas sin sancionar', nota: 'S/ 412,844 de multa potencial parada.' },
  { valor: '184', etiqueta: 'Cobradas de las 302 firmes', nota: 'El resto está en valores o en cobranza coactiva.' },
];

export const DECIDIR: { dias: string; tono: 'bad' | 'warn'; titulo: string; detalle: string; accion: string; dest: string }[] = [
  { dias: 'Venció ayer', tono: 'bad', titulo: '001-004182 · NOBLECILLA ARISMENDIZ SAC', detalle: 'Plazo vencido sin subsanar. Toca levantar el acta de constatación o archivar.', accion: 'Levantar acta', dest: 'expediente' },
  { dias: '5 días', tono: 'bad', titulo: '001-004160 · RESTAURANT SABOR Y SAZÓN', detalle: 'Acta levantada y sanción sin emitir. La multa aún no existe en la cuenta corriente.', accion: 'Emitir sanción', dest: 'expediente' },
  { dias: '3 días', tono: 'warn', titulo: '001-003918 · descargo presentado', detalle: 'Vence el plazo de la municipalidad para resolver el descargo.', accion: 'Resolver', dest: 'expediente' },
  { dias: '8 días', tono: 'warn', titulo: '302 multas firmes sin valor', detalle: 'No se pueden cobrar hasta que se emita el valor con su criterio.', accion: 'Generar valores', dest: 'valores' },
];

/* ══════════ La lista de expedientes ══════════ */

export const COLS_LISTA: [string, 0 | 1][] = [
  ['Serie-Nº', 0], ['Administrado', 0], ['Dirección del predio', 0], ['CUIS', 0],
  ['Acto', 0], ['Plazo', 0], ['Multa S/', 1], ['Estado', 0],
];

export const EXPEDIENTES: string[][] = [
  ['001-004182', 'NOBLECILLA ARISMENDIZ SAC', 'AV. JOSÉ DE LAMA 1180', 'A-014', 'Notificación', 'Venció ayer', '2,675.00', 'Vencida'],
  ['001-004183', 'CASTILLO PASCUALA, MARÍA E.', 'CALLE LAMA 482', 'A-021', 'Notificación', '1 día', '535.00', 'Notificada'],
  ['001-004184', 'DÍAZ MADRID, JULIO CÉSAR', 'C.P. BARRIO BUENOS AIRES', 'A-008', 'Notificación', '—', '—', 'Subsanada'],
  ['001-004160', 'RESTAURANT SABOR Y SAZÓN', 'CALLE SAN MARTÍN 402', 'S-018', 'Acta y sanción', '3 días', '1,070.00', 'Constatada'],
  ['001-003918', 'NOBLECILLA ARISMENDIZ SAC', 'AV. JOSÉ DE LAMA 1180', 'C-101', 'Resolución', 'En descargo', '2,675.00', 'Sancionada'],
  ['001-003644', 'INVERSIONES DEL NORTE SAC', 'AV. CHAMPAGNAT 220', 'C-214', 'Resolución', 'Firme', '5,350.00', 'Coactiva'],
];

export const CHIPS = ['Todos', 'Notificación', 'Acta y sanción', 'Resolución'];

/** El resumen del expediente abierto, en la franja de seis celdas. Las tres
 *  cifras que dependen del CUIS las pone la pantalla. */
export const EXPEDIENTE_ABIERTO = {
  codigo: '001-004182',
  administrado: 'NOBLECILLA ARISMENDIZ SAC',
  meta: 'RUC 20525118447 · AV. JOSÉ DE LAMA 1180 · CUIS A-014',
  estado: 'Plazo vencido',
  plazo: 'Venció 12/08/2026',
};

/* ══════════ Generación de valores ══════════ */

export const CAMPOS_DE_VALORES: CampoDeActo[] = [
  { k: 'valDesc', l: 'Descripción del criterio', t: 'text', ancho: true },
  { k: 'valIni', l: 'Fecha de inicio', t: 'date' },
  { k: 'valFin', l: 'Fecha de fin', t: 'date' },
  { k: 'valRec', l: 'Tipo de recaudo', t: 'sel', o: ['035 — RM PAPELETAS ADMINISTRATIVAS', '003 — RS PAPELETAS DE TRÁNSITO', '081 — RM LICENCIA FUNCIONAMIENTO'] },
  { k: 'valVence', l: 'Vencimiento', t: 'date', ayuda: 'Pasada esta fecha el valor puede ir a coactiva' },
  { k: 'valOficina', l: 'Oficina', t: 'sel', ancho: true, o: ['113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', '113100 — SUBGERENCIA DE RECAUDACIÓN', '999999 — OFICINA NO ESPECIFICADA'] },
];

export const COLS_VALORES: [string, 0 | 1][] = [
  ['Papeleta', 0], ['Administrado', 0], ['CUIS', 0], ['Notificada', 0], ['Multa S/', 1], ['Estado', 0],
];

export type Multa = [string, string, string, string, number, string];

export const MULTAS: Multa[] = [
  ['AC-2026-0912', 'NOBLECILLA ARISMENDIZ SAC', 'C-101', '17/08/2026', 2675.0, 'Sancionada'],
  ['AC-2026-0904', 'INVERSIONES DEL NORTE SAC', 'C-214', '20/04/2026', 5350.0, 'Sancionada'],
  ['AC-2026-0921', 'DÍAZ MADRID, JULIO CÉSAR', 'A-042', '12/08/2026', 535.0, 'Sancionada'],
  ['AC-2025-1188', 'RESTAURANT SABOR Y SAZÓN', 'S-018', '14/11/2025', 1070.0, 'Sancionada'],
];

/* ══════════ El centro de reportes ══════════ */

export type Criterio = { l: string; t: 'text' | 'sel' | 'date'; v: string; o?: string[] };

/** Los trece criterios de los que cada hoja usa los suyos. */
export const CRITERIOS: Record<string, Criterio> = {
  serie: { l: 'Serie', t: 'text', v: '001' },
  anio: { l: 'Año', t: 'sel', v: '2026', o: ['2026', '2025', '2024', '2023'] },
  numero: { l: 'Número', t: 'text', v: '' },
  estado: { l: 'Estado', t: 'sel', v: '(TODOS)', o: ['(TODOS)', 'NOTIFICADA', 'VENCIDA', 'SUBSANADA', 'CON PAPELETA', 'ANULADA'] },
  deuda: { l: 'Estado de deuda', t: 'sel', v: '(TODOS)', o: ['(TODOS)', 'PENDIENTE', 'PAGADA', 'COACTIVA'] },
  cuis: { l: 'Código CUIS', t: 'text', v: '' },
  infractor: { l: 'Infractor', t: 'text', v: '' },
  fiscalizador: { l: 'Fiscalizador', t: 'sel', v: 'Todos', o: ['Todos', 'RETO SANTOS, VÍCTOR', 'RÍOS MENDOZA, MARÍA', 'QUISPE PEÑA, JORGE'] },
  direccion: { l: 'Dirección del predio', t: 'text', v: '' },
  desde: { l: 'Fecha desde', t: 'date', v: '2026-07-01' },
  hasta: { l: 'Fecha hasta', t: 'date', v: '2026-08-13' },
  vence: { l: 'Vence hasta', t: 'date', v: '2026-08-31' },
  agrupa: { l: 'Agrupado por', t: 'sel', v: 'MES', o: ['MES', 'MATERIA', 'FISCALIZADOR', 'ESTADO'] },
};

export type Hoja = {
  g: string;
  label: string;
  codigo: string;
  sub: string;
  crit: string[];
  meta: [string, string][];
  cols: [string, 0 | 1][];
  filas: string[][];
  cierre: string;
};

export const HOJAS: Hoja[] = [
  {
    g: 'Padrones', label: 'Padrón de notificaciones', codigo: 'PN-2026-00418', sub: 'Relación de notificaciones administrativas por periodo',
    crit: ['serie', 'anio', 'estado', 'fiscalizador', 'desde', 'hasta', 'agrupa'],
    meta: [['Periodo', '01/07/2026 — 13/08/2026'], ['Notificaciones', '812'], ['Con papeleta', '388'], ['Agrupado por', 'Mes']],
    cols: [['Serie-Nº', 0], ['Fecha', 0], ['Infractor', 0], ['CUIS', 0], ['Vence', 0], ['Estado', 0]],
    filas: [
      ['001-004182', '02/08/2026', 'NOBLECILLA ARISMENDIZ SAC', 'A-014', '12/08/2026', 'Vencida'],
      ['001-004183', '04/08/2026', 'CASTILLO PASCUALA, MARÍA E.', 'A-021', '14/08/2026', 'Notificada'],
      ['001-004184', '07/08/2026', 'DÍAZ MADRID, JULIO CÉSAR', 'A-008', '17/08/2026', 'Subsanada'],
    ],
    cierre: 'El padrón es el descargo del fiscalizador: cada notificación entregada tiene que aparecer aquí con su número correlativo.',
  },
  {
    g: 'Padrones', label: 'Notificaciones vencidas', codigo: 'NV-2026-00418', sub: 'Notificaciones cuyo plazo venció sin subsanar',
    crit: ['serie', 'anio', 'vence', 'fiscalizador', 'agrupa'],
    meta: [['Vencidas al 13/08', '214'], ['Sin acta de constatación', '182'], ['Materia más frecuente', 'Comercialización'], ['Multa potencial', 'S/ 412,844.00']],
    cols: [['Serie-Nº', 0], ['Infractor', 0], ['CUIS', 0], ['Venció', 0], ['Días', 1], ['Multa potencial S/', 1]],
    filas: [
      ['001-004182', 'NOBLECILLA ARISMENDIZ SAC', 'A-014', '12/08/2026', '1', '2,675.00'],
      ['001-004160', 'RESTAURANT SABOR Y SAZÓN', 'S-018', '08/08/2026', '5', '1,070.00'],
      ['001-004142', 'INVERSIONES DEL NORTE SAC', 'C-214', '01/08/2026', '12', '5,350.00'],
    ],
    cierre: 'Vencido el plazo, o se levanta el acta de constatación y se sanciona, o se archiva. No hacer nada equivale a archivar sin dejar constancia.',
  },
  {
    g: 'Por administrado', label: 'Notificaciones por contribuyente', codigo: 'NC-2026-00418', sub: 'Historial de notificaciones de un administrado',
    crit: ['infractor', 'anio', 'estado', 'desde', 'hasta'],
    meta: [['Administrado', 'NOBLECILLA ARISMENDIZ SAC'], ['R.U.C.', '20525118447'], ['Notificaciones', '4'], ['Multas firmes', 'S/ 5,350.00']],
    cols: [['Serie-Nº', 0], ['Fecha', 0], ['CUIS', 0], ['Materia', 0], ['Estado', 0], ['Multa S/', 1]],
    filas: [
      ['001-004182', '02/08/2026', 'A-014', 'Anuncios', 'Vencida', '2,675.00'],
      ['001-003918', '14/05/2026', 'C-101', 'Comercialización', 'Con papeleta', '2,675.00'],
      ['001-003644', '02/02/2026', 'S-018', 'Salubridad', 'Subsanada', '—'],
    ],
    cierre: 'La reincidencia agrava la sanción: el mismo código en el mismo establecimiento dentro del año duplica el porcentaje de UIT.',
  },
  {
    g: 'Por administrado', label: 'Estado de cuenta de papeleta', codigo: 'EC-2026-00418', sub: 'Deuda por multas administrativas a la fecha',
    crit: ['infractor', 'deuda', 'anio'],
    meta: [['Administrado', 'NOBLECILLA ARISMENDIZ SAC'], ['R.U.C.', '20525118447'], ['Fecha de cálculo', '13/08/2026'], ['Papeletas', '3']],
    cols: [['Papeleta', 0], ['Fecha', 0], ['CUIS', 0], ['Multa S/', 1], ['Interés S/', 1], ['A pagar S/', 1]],
    filas: [
      ['AC-2026-0912', '05/08/2026', 'C-101', '2,675.00', '0.00', '1,337.50'],
      ['AC-2026-0904', '18/04/2026', 'C-214', '5,350.00', '212.44', '5,562.44'],
      ['AC-2025-1188', '12/11/2025', 'A-042', '535.00', '84.20', '619.20'],
    ],
    cierre: 'El importe a pagar de la más reciente lleva el descuento por pronto pago del 50 %, vigente cinco días hábiles desde la notificación.',
  },
  {
    g: 'Catálogo', label: 'Reporte de códigos CUIS', codigo: 'RC-2026-00418', sub: 'Cuadro único de infracciones y sanciones vigente',
    crit: ['cuis', 'agrupa'],
    meta: [['Ordenanza', 'ORD. 022-2024-MDC'], ['Infracciones tipificadas', '284'], ['UIT 2026', 'S/ 5,350.00'], ['Agrupado por', 'Materia']],
    cols: [['Código', 0], ['Materia', 0], ['Descripción', 0], ['% UIT', 1], ['Multa S/', 1]],
    filas: [
      ['C-101', 'Comercialización', 'Funcionar sin licencia municipal de funcionamiento', '50 %', '2,675.00'],
      ['C-214', 'Obras', 'Ejecutar obra sin licencia de edificación', '100 %', '5,350.00'],
      ['S-018', 'Salubridad', 'Deficiencias de salubridad en el establecimiento', '20 %', '1,070.00'],
    ],
    cierre: 'Cambiar la UIT del ejercicio recalcula las 284 multas sin tocar el cuadro: lo que la ordenanza fija es el porcentaje, no el importe.',
  },
  {
    g: 'Resúmenes', label: 'Resumen de recaudación', codigo: 'RR-2026-00418', sub: 'Recaudación por multas administrativas',
    crit: ['desde', 'hasta', 'agrupa'],
    meta: [['Periodo', '01/01/2026 — 13/08/2026'], ['Recaudado', 'S/ 412,844.00'], ['Multas pagadas', '588'], ['Agrupado por', 'Mes']],
    cols: [['Mes', 0], ['Multas', 1], ['Impuesto S/', 1], ['Descuento S/', 1], ['Recaudado S/', 1]],
    filas: [
      ['Junio 2026', '112', '184,412.00', '62,844.00', '121,568.00'],
      ['Julio 2026', '98', '162,116.00', '54,412.00', '107,704.00'],
      ['Agosto 2026', '44', '72,844.00', '24,116.00', '48,728.00'],
    ],
    cierre: 'El descuento corresponde al pronto pago del 50 % y a las amnistías por ordenanza vigentes en el periodo.',
  },
];

/** Las trece opciones del manual que el módulo resume, tal como las lista la
 *  paleta de comandos. */
export const OPCIONES: [string, string][] = [
  ['Notificación administrativa', 'expediente'],
  ['Infracción administrativa', 'expediente'],
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
