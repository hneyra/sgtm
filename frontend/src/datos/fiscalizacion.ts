/* Datos de muestra del módulo de Fiscalización, copiados literalmente del
   artboard `Fiscalizacion.dc.html`. Nada de esto viaja a ningún backend: es la
   maqueta. El acrónimo de los números de documento es `MDC` —Municipalidad
   Distrital de Catacaos—, que es la entidad del piloto. */

/* `Fiscalizacion.tsx` tiene el suyo: aquí no se exporta para no dejar dos
   nombres iguales viajando entre los dos archivos. */
const SIN_DATO = '—';

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColDef = [string, 0 | 1];

/* ══════════ El acta de inspección, en cuatro pasos ══════════ */

export type TipoDeCampo = 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';

export type CampoDeActa = {
  k: string;
  l: string;
  t?: TipoDeCampo;
  o?: string[];
  ancho?: boolean;
  ph?: string;
  ayuda?: string;
};

export type PasoDeActa = {
  label: string;
  nota?: string;
  diff?: boolean;
  cierre?: boolean;
  campos: CampoDeActa[];
};

/** El paso 2 no lleva campos sueltos: lleva la tabla de contraste, que es el
 *  objeto de la fiscalización. */
export const PASOS_ACTA: PasoDeActa[] = [
  {
    label: 'La visita',
    nota: 'Quién atendió, a qué hora y con qué resultado. Si nadie atendió, el acta se cierra aquí y el predio vuelve a la muestra.',
    campos: [
      { k: 'acta', l: 'Nº de acta', t: 'ro' },
      { k: 'programa', l: 'Programa', t: 'ro' },
      { k: 'predio', l: 'Código predial', t: 'ro' },
      { k: 'contribuyente', l: 'Contribuyente', t: 'ro', ancho: true },
      { k: 'fecha', l: 'Fecha de inspección', t: 'date' },
      { k: 'hora', l: 'Hora', t: 'text' },
      { k: 'fiscalizador', l: 'Fiscalizador', t: 'ro' },
      { k: 'atiende', l: 'Persona que atiende', t: 'text' },
      { k: 'vinculo', l: 'Vínculo con el predio', t: 'sel', o: ['PROPIETARIO', 'FAMILIAR', 'INQUILINO', 'ENCARGADO', 'NADIE ATENDIÓ'] },
      { k: 'resultado', l: 'Resultado de la visita', t: 'sel', o: ['INSPECCIÓN REALIZADA', 'PREDIO CERRADO', 'SE NEGÓ A LA INSPECCIÓN', 'DIRECCIÓN NO UBICADA'] },
    ],
  },
  { label: 'La verificación', diff: true, campos: [] },
  {
    label: 'Hallazgos y evidencia',
    nota: 'El hallazgo es lo que sostiene la determinación. La evidencia es lo que la defiende cuando el contribuyente reclama.',
    campos: [
      { k: 'hallazgo', l: 'Hallazgo principal', t: 'sel', ancho: true, o: ['SIN OBSERVACIONES', 'AMPLIACIÓN NO DECLARADA', 'USO DISTINTO AL DECLARADO', 'OMISO A LA DECLARACIÓN', 'PREDIO SUBVALUADO', 'PREDIO INEXISTENTE'] },
      { k: 'fotos', l: 'Fotografías', t: 'ro' },
      { k: 'croquis', l: 'Croquis / georreferencia', t: 'ro' },
      { k: 'obs', l: 'Observaciones del fiscalizador', t: 'area', ancho: true, ph: 'Lo que la foto no dice y hay que poder leer en gabinete' },
      { k: 'firma', l: 'Firma del administrado', t: 'ro' },
      { k: 'sinFirma', l: 'Se negó a firmar', t: 'chk', ph: 'Dejar constancia en el acta' },
    ],
  },
  {
    label: 'Cierre',
    cierre: true,
    campos: [
      { k: 'determina', l: 'Genera determinación', t: 'chk', ancho: true, ph: 'Derivar a resolución de determinación' },
      { k: 'ejercicios', l: 'Ejercicios a determinar', t: 'sel', o: ['2022 — 2026', '2024 — 2026', 'Solo 2026'], ayuda: 'La prescripción limita a cuatro años desde el 1 de enero siguiente' },
      { k: 'multa', l: 'Multa tributaria', t: 'sel', o: ['NO APLICA', 'ART. 176º — NO PRESENTAR DECLARACIÓN', 'ART. 178º — DECLARAR CIFRAS FALSAS'] },
    ],
  },
];

/* ══════════ Declarado contra verificado ══════════ */

export type Contraste = {
  k: string;
  l: string;
  /** Lo declarado por el contribuyente, contra lo que se contrasta. */
  decl: string;
  /** `n` marca las numéricas: ahí la diferencia se calcula. */
  n?: boolean;
  u?: string;
  t?: 'sel';
  o?: string[];
  /** El código del manual —MEP, ECS— que acompaña al rótulo. */
  c?: string;
};

/** Las siete características que se contrastan. En las numéricas la diferencia
 *  se calcula; en las demás se compara texto. */
export const DIFF: Contraste[] = [
  { k: 'usoV', l: 'Uso del predio', decl: 'CASA HABITACIÓN', t: 'sel', o: ['CASA HABITACIÓN', 'COMERCIO', 'INDUSTRIA', 'SERVICIOS', 'TERRENO SIN CONSTRUIR'] },
  { k: 'terrenoV', l: 'Área de terreno', decl: '210.00', n: true, u: ' m²' },
  { k: 'construidaV', l: 'Área construida', decl: '164.50', n: true, u: ' m²' },
  { k: 'pisosV', l: 'Nº de pisos', decl: '1', n: true, u: '' },
  { k: 'mepV', l: 'Material predominante', c: 'MEP', decl: '02 — LADRILLO', t: 'sel', o: ['01 — CONCRETO', '02 — LADRILLO', '03 — ADOBE', '04 — QUINCHA', '05 — MADERA'] },
  { k: 'ecsV', l: 'Estado de conservación', c: 'ECS', decl: '03 — REGULAR', t: 'sel', o: ['01 — MUY BUENO', '02 — BUENO', '03 — REGULAR', '04 — MALO'] },
  { k: 'serviciosV', l: 'Servicios básicos', decl: 'AGUA Y LUZ', t: 'sel', o: ['AGUA, DESAGÜE Y LUZ', 'AGUA Y LUZ', 'SOLO LUZ', 'NINGUNO'] },
];

/** Lo que trae el acta ACT-2026-00418 antes de que el fiscalizador toque nada. */
export const DEFECTOS: Record<string, string | boolean> = {
  acta: 'ACT-2026-00418',
  programa: 'PF-2026-014',
  predio: '02-014-D-14-01',
  contribuyente: 'MEDINA MEDINA, RUFINA (SUC.) · 00000025673',
  fecha: '2026-08-12',
  hora: '10:25',
  fiscalizador: 'R. MENDOZA CRUZ',
  atiende: 'MEDINA CHÁVEZ, ROSA',
  vinculo: 'FAMILIAR',
  resultado: 'INSPECCIÓN REALIZADA',
  usoV: 'COMERCIO',
  terrenoV: '210.00',
  construidaV: '198.00',
  pisosV: '2',
  mepV: '02 — LADRILLO',
  ecsV: '02 — BUENO',
  serviciosV: 'AGUA, DESAGÜE Y LUZ',
  hallazgo: 'AMPLIACIÓN NO DECLARADA',
  fotos: '4 archivos adjuntos',
  croquis: '-4.902315, -80.685442',
  obs: 'Segundo piso construido en 2011 destinado a bodega; no figura en la declaración jurada.',
  firma: 'Capturada — 10:52',
  sinFirma: false,
  determina: true,
  ejercicios: '2022 — 2026',
  multa: 'ART. 176º — NO PRESENTAR DECLARACIÓN',
};

/* ══════════ Panel ══════════ */

/** La entrada va fuera del embudo: 3,418 detectados son el universo del cruce
 *  catastro-rentas, y las cuatro etapas son la muestra de un programa. */
export const ENTRADA = {
  titulo: 'Detectados por el cruce de catastro contra rentas',
  detalle: 'Otro conjunto: de aquí se elige la muestra de cada programa. No es una etapa del embudo.',
  valor: '3,418',
  dest: 'deteccion',
};

/** Etapa, detalle, predios y el destino al que lleva. La base del embudo son
 *  los 96 predios de la muestra del programa. */
export const EMBUDO_BASE = 96;
export const EMBUDO: [string, string, number, string][] = [
  ['Programados', 'Muestra del PF-2026-014', 96, 'programas'],
  ['Inspeccionados', 'Con acta cerrada', 84, 'actas'],
  ['Con diferencia', 'El hallazgo sostiene una determinación', 61, 'resultados'],
  ['Notificados', 'Con resolución entregada', 38, 'resultados'],
];

export const KPIS = [
  { valor: '84 de 96', etiqueta: 'Muestra inspeccionada', nota: 'Quedan 12 predios por visitar antes del 30/09.' },
  { valor: '63.5 %', etiqueta: 'Efectividad del programa', nota: '61 actas con diferencia sobre 96 inspecciones.' },
  { valor: 'S/ 214,882', etiqueta: 'Deuda determinada', nota: 'Insoluto, reajuste e interés a la fecha de emisión.' },
  { valor: '3', etiqueta: 'Determinaciones reclamadas', nota: 'De 38 notificadas. Cada una necesita su expediente de versiones.' },
];

export const RUTA: { riesgo: string; tono: 'bad' | 'warn'; predio: string; detalle: string; hora: string }[] = [
  { riesgo: 'Alto', tono: 'bad', predio: '02-014-D-14-01 · CALLE SANTA ROSA 116', detalle: 'Subvaluación probable. Segundo piso visible en la ortofoto de 2024 y no declarado.', hora: '10:00' },
  { riesgo: 'Alto', tono: 'bad', predio: '02-016-A-09-00 · AV. JOSÉ DE LAMA 1180', detalle: 'Omiso a la declaración. Industria con licencia de funcionamiento y sin ficha en rentas.', hora: '11:30' },
  { riesgo: 'Medio', tono: 'warn', predio: '02-016-A-02-00 · CALLE TARAPACÁ 402', detalle: 'Segunda visita: el 09/08 estaba cerrado y quedó sin inspeccionar.', hora: '15:00' },
];

/* ══════════ Detección ══════════ */

export type Filtro = { label: string; valor: string; opts: string[] };

export type CruceDeDeteccion = {
  min: string;
  cols: ColDef[];
  filas: string[][];
  nota: string;
  filtros: Filtro[];
  fuente: string;
};

export const DET_PREDIAL: CruceDeDeteccion = {
  min: '820px',
  cols: [['Cod. ref. catastral', 0], ['Titular', 0], ['Condición', 0], ['Valor catastral S/', 1], ['Valor declarado S/', 1], ['Diferencia S/', 1], ['Impuesto omitido S/', 1]],
  filas: [
    ['200601010160020101001', 'REYES CHUNGA, PEDRO', 'Omiso', '96,400.00', '0.00', '96,400.00', '478.40'],
    ['200601010150010101001', 'MEDINA MEDINA, RUFINA (SUC.)', 'Subvaluador', '178,200.00', '132,196.75', '46,003.25', '276.02'],
    ['200601020210070100000', 'CASTILLO PASCUALA, MARÍA E.', 'Subvaluador', '44,800.00', '38,420.00', '6,380.00', '38.28'],
    ['200601030880010101001', 'INVERSIONES DEL NORTE SAC', 'Omiso', '842,000.00', '0.00', '842,000.00', '7,984.40'],
  ],
  nota: 'Un omiso tiene ficha catastral y ninguna declaración jurada. Un subvaluador declaró por debajo del valor catastral verificado. La diferencia no es deuda todavía: lo es cuando una inspección la confirma.',
  filtros: [
    { label: 'Sector', valor: 'Todos', opts: ['Todos', '01', '02', '03', '04', '05'] },
    { label: 'Condición', valor: 'Todas', opts: ['Todas', 'OMISO', 'SUBVALUADOR'] },
    { label: 'Ordenar por', valor: 'Impuesto omitido', opts: ['Impuesto omitido', 'Diferencia de valor', 'Sector'] },
  ],
  fuente: 'Cruce de catastro contra el padrón de rentas · actualización diaria',
};

export const DET_VEHICULAR: CruceDeDeteccion = {
  min: '840px',
  cols: [['Placa', 0], ['Contribuyente', 0], ['Origen', 0], ['Valor declarado S/', 1], ['Valor referencial S/', 1], ['Hallazgo', 0], ['Deuda omitida S/', 1]],
  filas: [
    ['V1H-882', 'CASTILLO PASCUALA, MARÍA E.', 'SUNARP', '0.00', '112,800.00', 'No declarado', '3,384.00'],
    ['B7T-221', 'REYES CHUNGA, PEDRO', 'SUNAT', '38,000.00', '62,400.00', 'Subvaluado', '732.00'],
    ['T4M-119', 'INVERSIONES DEL NORTE SAC', 'MTC', '84,000.00', '84,000.00', 'Conforme', '0.00'],
    ['C2P-704', 'DÍAZ MADRID, JULIO CÉSAR', 'SUNARP', '0.00', '48,200.00', 'Baja indebida', '1,446.00'],
  ],
  nota: 'El valor referencial proviene de la tabla del MEF vigente para el año de fabricación del vehículo. Una baja indebida es un vehículo dado de baja con ejercicios de afectación todavía por correr.',
  filtros: [
    { label: 'Origen del cruce', valor: 'Todos', opts: ['Todos', 'SUNARP', 'SUNAT', 'MTC', 'DECLARACIÓN'] },
    { label: 'Hallazgo', valor: 'Todos', opts: ['Todos', 'NO DECLARADO', 'SUBVALUADO', 'BAJA INDEBIDA', 'CONFORME'] },
    { label: 'Ordenar por', valor: 'Deuda omitida', opts: ['Deuda omitida', 'Placa', 'Origen'] },
  ],
  fuente: 'Cruce del padrón vehicular contra SUNARP, SUNAT y MTC · última importación 11/08/2026',
};

/* ══════════ Programas ══════════ */

export const PROGRAMAS: [string, string, 'ok' | 'warn' | 'bad', string, string][] = [
  ['PF-2026-014', 'En ejecución', 'warn', 'Predial selectivo · sector 02 · subvaluación probable', '96 predios · R. Mendoza Cruz · 17/08 — 30/09'],
  ['PF-2026-011', 'Cerrado', 'ok', 'Vehicular · cruce SUNARP del ejercicio 2026', '618 vehículos · L. Peña Sandoval · 02/05 — 30/06'],
  ['PF-2025-032', 'Cerrado', 'ok', 'Predial masivo · sectores 01 y 03 · omisos', '1,412 predios · A. Vílchez Rojas · 01/09 — 20/12'],
];

/** El resumen del programa. La primera fila la pone el programa elegido. */
export const PROG_RESUMEN: [string, string][] = [
  ['Tipo', 'PREDIAL SELECTIVO'],
  ['Criterio de riesgo', 'SUBVALUACIÓN'],
  ['Fiscalizador', 'R. MENDOZA CRUZ'],
  ['Muestra', '96 predios'],
  ['Plazo', '17/08 — 30/09'],
];

export const MUESTRA_COLS: ColDef[] = [['Predio', 0], ['Contribuyente', 0], ['Uso declarado', 0], ['Área decl. m²', 1], ['Riesgo', 0], ['Estado', 0]];

/** Seis celdas, el rótulo del botón y si ese botón es el primario. */
export const MUESTRA: [string, string, string, string, string, string, string, 0 | 1][] = [
  ['02-014-D-14-01', 'MEDINA MEDINA, RUFINA (SUC.)', 'Casa habitación', '164.50', 'Alto', 'Programado', 'Levantar acta', 1],
  ['02-014-D-18-00', 'SILVA CÓRDOVA, ANA', 'Comercio', '82.00', 'Alto', 'Inspeccionado', 'Ver acta', 0],
  ['02-016-A-02-00', 'REYES CHUNGA, PEDRO', 'Casa habitación', '120.00', 'Medio', 'Predio cerrado', 'Reprogramar', 0],
  ['02-016-A-09-00', 'INVERSIONES DEL NORTE SAC', 'Industria', '640.00', 'Alto', 'Con acta', 'Ver acta', 0],
];

/* ══════════ Resultados ══════════ */

export type TablaDeResultados = {
  titulo: string;
  conteo: string;
  min: string;
  cols: ColDef[];
  filas: string[][];
  nota: string;
};

export const RES_POR_ACTA: TablaDeResultados = {
  titulo: 'Actas con diferencia determinada',
  conteo: '4 de 96',
  min: '800px',
  cols: [['Acta', 0], ['Predio', 0], ['Hallazgo', 0], ['Dif. m²', 1], ['Ejercicios', 0], ['Deuda omitida S/', 1], ['Estado', 0]],
  filas: [
    ['ACT-2026-00418', '02-014-D-14-01', 'Ampliación no declarada', '+33.50', '2022 — 2026', '1,842.60', 'Determinado'],
    ['ACT-2026-00419', '02-014-D-18-00', 'Uso distinto al declarado', '0.00', '2024 — 2026', '944.10', 'Notificado'],
    ['ACT-2026-00421', '02-016-A-09-00', 'Omiso a la declaración', '+640.00', '2021 — 2026', '18,412.00', 'Reclamado'],
    ['ACT-2026-00424', '02-016-A-02-00', 'Sin observaciones', '0.00', '—', '0.00', 'Conforme'],
  ],
  nota: 'La deuda omitida incluye insoluto, reajuste e interés moratorio calculado a la fecha de emisión de la resolución de determinación.',
};

export const RES_POR_CONTRIB: TablaDeResultados = {
  titulo: 'Deuda de fiscalización por contribuyente',
  conteo: '4 registros · total S/ 581.65',
  min: '760px',
  cols: [['Contribuyente', 0], ['Unidad', 0], ['Año', 0], ['Cuota', 0], ['Tributo', 0], ['Fase', 0], ['Total S/', 1], ['Estado', 0]],
  filas: [
    ['ALBURQUEQUE INFANTE GENARO', 'SC-2346', '2010', '001', 'VEHICULAR-FIS', '002', '145.41', 'Pendiente'],
    ['ALBURQUEQUE INFANTE GENARO', 'SC-2346', '2010', '002', 'VEHICULAR-FIS', '002', '145.41', 'Pendiente'],
    ['ALBURQUEQUE INFANTE GENARO', 'SC-2346', '2010', '003', 'VEHICULAR-FIS', '002', '145.41', 'Pendiente'],
    ['ALBURQUEQUE INFANTE GENARO', 'SC-2346', '2010', '004', 'VEHICULAR-FIS', '002', '145.42', 'Pendiente'],
  ],
  nota: 'Tributo S/ 500.00 · reajuste S/ 12.50 · interés S/ 58.35 · gastos S/ 10.80. La deuda de fiscalización lleva la fase 002 para distinguirla de la emitida en el registro ordinario.',
};

export const RES_TOTALES: [string, string, 0 | 1][] = [
  ['Actas cerradas', '96', 0],
  ['Con diferencia', '61', 0],
  ['Deuda determinada', 'S/ 214,882.40', 0],
  ['Efectividad', '63.5 %', 1],
];

export const VERSIONES: { n: string; titulo: string; detalle: string; fecha: string; usuario: string; tono: 'acento' | 'suave' | 'neutro' }[] = [
  { n: '3', titulo: 'Liquidada — versión vigente', detalle: 'Área construida 198.00 m² y uso COMERCIO. Diferencia de 33.50 m² sobre lo declarado.', fecha: '12/08/2026 10:52', usuario: 'R. MENDOZA CRUZ', tono: 'acento' },
  { n: '2', titulo: 'En proceso — corrección de gabinete', detalle: 'Se corrigió el ECS de MALO a BUENO tras revisar las fotografías del acta.', fecha: '13/08/2026 09:18', usuario: 'C. ANCAJIMA FLORES', tono: 'suave' },
  { n: '1', titulo: 'Abierta — primer registro del proceso', detalle: 'Estado inicial tomado de la ficha catastral vigente al programar la visita.', fecha: '17/08/2026 08:00', usuario: 'SISTEMA', tono: 'neutro' },
];

/* ══════════ Resolución de determinación ══════════ */

/**
 * La hoja de la resolución, VACÍA.
 *
 * Traía la resolución entera del artboard —«000418-2026-SGFT/MDC»,
 * «INVERSIONES DEL NORTE SAC», R.U.C. 20525118447 y seis ejercicios con sus
 * importes al céntimo, 2 680.60 de 2021 al 2 962.00 de 2026— y la pantalla la
 * mandaba a la impresora con su membrete, su artículo 137º y sus dos líneas de
 * firma. Con la red cortada salía **exactamente igual**, que es la prueba de
 * que ninguna de esas cifras venía de ningún sitio: era una resolución de
 * determinación falsa, con un R.U.C. real de por medio, lista para entregar.
 *
 * `sin-red.mjs` no lo veía porque enumera sólo `m.destinos` y este destino es el
 * `documento` del módulo, que sólo mira `mirar.mjs`.
 *
 * Se quedan los rótulos —son los que el manual imprime y dicen qué llevará la
 * hoja— y se va el contenido. Conectarla es otra cosa: la resolución la sirve
 * `GET /fiscalizacion/resoluciones/{numero}`, que pide un número que esta
 * pantalla no tiene dónde teclear.
 */
export const REP_META: { k: string; v: string }[] = [
  { k: 'Nº de resolución', v: SIN_DATO },
  { k: 'Contribuyente', v: SIN_DATO },
  { k: 'R.U.C.', v: SIN_DATO },
  { k: 'Predio', v: SIN_DATO },
  { k: 'Periodo fiscalizado', v: SIN_DATO },
  { k: 'Tipo de fiscalización', v: SIN_DATO },
];

export const REP_COLS: ColDef[] = [['Ejercicio', 0], ['Determinado S/', 1], ['Declarado S/', 1], ['Diferencia S/', 1], ['Interés S/', 1], ['Total S/', 1]];

export const REP_FILAS: string[][] = [];

/* ══════════ Paleta de comandos ══════════ */

/** Las ocho opciones del manual que el módulo resume, con el destino al que
 *  lleva cada una. `reporte` es la resolución, que el shell aloja bajo
 *  «Documentos». */
export const OPCIONES: [string, string][] = [
  ['Programación de fiscalización', 'programas'],
  ['Fiscalización predial — acta de inspección', 'actas'],
  ['Fiscalización vehicular', 'deteccion'],
  ['Resultados y determinaciones', 'resultados'],
  ['Omisos y subvaluadores', 'deteccion'],
  ['Estado de cuenta de fiscalización', 'resultados'],
  ['Histórico de fiscalización predial', 'resultados'],
  ['Resolución de determinación', 'reporte'],
];
