/* Datos de muestra del módulo de Fiscalización, copiados literalmente del
   artboard `Fiscalizacion.dc.html`. Nada de esto viaja a ningún backend: es la
   maqueta. El acrónimo de los números de documento es `MDC` —Municipalidad
   Distrital de Catacaos—, que es la entidad del piloto. */

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
  /**
   * Lo declarado por el contribuyente, contra lo que se contrasta.
   *
   * Va **vacia** en las siete, y no es un hueco por rellenar a mano: lo
   * declarado sale de la ficha catastral vigente del predio que se inspecciona,
   * y esta pantalla no tiene predio —no hay acta abierta de la que sacarlo
   * (#702)—. Antes traia las siete cifras de la captura del artboard —210.00 m2
   * de terreno, 164.50 construidos, «02 - LADRILLO»—, de modo que la columna
   * «Diferencia» restaba contra un predio que no existe.
   */
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
  { k: 'usoV', l: 'Uso del predio', decl: '', t: 'sel', o: ['CASA HABITACIÓN', 'COMERCIO', 'INDUSTRIA', 'SERVICIOS', 'TERRENO SIN CONSTRUIR'] },
  { k: 'terrenoV', l: 'Área de terreno', decl: '', n: true, u: ' m²' },
  { k: 'construidaV', l: 'Área construida', decl: '', n: true, u: ' m²' },
  { k: 'pisosV', l: 'Nº de pisos', decl: '', n: true, u: '' },
  { k: 'mepV', l: 'Material predominante', c: 'MEP', decl: '', t: 'sel', o: ['01 — CONCRETO', '02 — LADRILLO', '03 — ADOBE', '04 — QUINCHA', '05 — MADERA'] },
  { k: 'ecsV', l: 'Estado de conservación', c: 'ECS', decl: '', t: 'sel', o: ['01 — MUY BUENO', '02 — BUENO', '03 — REGULAR', '04 — MALO'] },
  { k: 'serviciosV', l: 'Servicios básicos', decl: '', t: 'sel', o: ['AGUA, DESAGÜE Y LUZ', 'AGUA Y LUZ', 'SOLO LUZ', 'NINGUNO'] },
];

/**
 * El acta **vacia**, que es la unica que esta pantalla puede tener hoy.
 *
 * Aqui vivia el acta `ACT-2026-00418` entera —su numero, su programa
 * `PF-2026-014`, su predio `02-014-D-14-01`, «MEDINA MEDINA, RUFINA (SUC.)»,
 * su fiscalizador, sus cuatro fotos y su croquis georreferenciado—, copiada de
 * la captura del artboard y presentada como si fuera un acta abierta. Ninguno
 * de esos valores sale de ninguna lectura: el numero no existe en ninguna
 * municipalidad, `PF-2026-014` no es ninguno de los programas del padron, el
 * codigo predial no tiene la forma de un codigo de referencia catastral de este
 * sistema —23 digitos— y la persona no esta en el padron (#702).
 *
 * Y desde que #599 conecto el listado de actas REALES encima, lo de abajo se
 * leia peor que antes: **una tabla real hace que lo que la acompana parezca
 * cierto**.
 *
 * Asi que el formulario dice lo que le falta en vez de fingir que lo tiene, que
 * es lo que este repositorio ya decidio para las siete hojas sin superficie
 * (FRO-06) y para las once de `ACTOS_SIN_CAMPO`. Los cinco campos de solo
 * lectura salen con el guion largo —vienen de un acta abierta, y aqui no hay
 * ninguna—, y los desplegables abren en la opcion vacia: elegir la primera por
 * omision es lo mismo que dibujar un dato que nadie tecleo (#331).
 *
 * **No es una lista de valores por omision que haya que rellenar**: mientras la
 * escritura siga bloqueada —diez campos, tres de ellos identificadores internos
 * que el formulario no dibuja, y los seis rotulos del hallazgo fuera del
 * enumerado (#546, #599)— lo que se teclee aqui no viaja a ningun sitio.
 */
export const DEFECTOS: Record<string, string | boolean> = {
  acta: '',
  programa: '',
  predio: '',
  contribuyente: '',
  fecha: '',
  hora: '',
  fiscalizador: '',
  atiende: '',
  vinculo: '',
  resultado: '',
  usoV: '',
  terrenoV: '',
  construidaV: '',
  pisosV: '',
  mepV: '',
  ecsV: '',
  serviciosV: '',
  hallazgo: '',
  fotos: '',
  croquis: '',
  obs: '',
  firma: '',
  sinFirma: false,
  determina: false,
  ejercicios: '',
  multa: '',
};

/* ══════════ Panel ══════════ */

/* `KPIS`, `ENTRADA`, `EMBUDO_BASE`, `EMBUDO` y `RUTA` se han ido. `KPIS` eran
   las cuatro cifras de cabecera —«84 de 96 inspeccionada», «63.5 % de
   efectividad», «S/ 214,882 determinados»—, de una captura y no de ninguna
   corrida. El resto era el embudo del
   panel de la maqueta del prototipo —3 418 detectados, y de 96 programados a 38
   notificados— y la ruta del día, con tres predios nombrados por su código
   catastral y su dirección y un motivo de sospecha escrito para cada uno. Ni el
   embudo ni la ruta salían de ningún sitio: se dibujaban iguales en toda
   municipalidad y en todo programa. Se fueron cuando el panel pasó a leer del
   backend. */

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

/* `PROGRAMAS`, `MUESTRA`, `PROG_RESUMEN` y `MUESTRA_COLS` se han ido.
   `PROGRAMAS` eran tres programas de la maqueta con su fiscalizador y sus
   fechas —«PF-2026-014», «R. Mendoza Cruz»— y `MUESTRA` cuatro predios con su
   titular, su area y su riesgo ya calificado, «MEDINA MEDINA, RUFINA (SUC.)»
   entre ellos: gente inventada bajo la pantalla que decide a quien se visita.
   `PROG_RESUMEN` era el resumen del
   programa de la maqueta del prototipo, con su fiscalizador y su plazo escritos
   dentro, que se dibujaba igual con cualquier programa elegido; las columnas
   iban con él. Se fueron cuando la pantalla pasó a leer del backend, que publica
   el programa que de verdad se abrió. */

/* ══════════ Resultados ══════════ */

/* `RES_POR_ACTA`, `RES_POR_CONTRIB`, `RES_TOTALES`, `VERSIONES` y el tipo
   `TablaDeResultados` se han ido: el bloque entero era la maqueta del prototipo.
   Cuatro actas con su predio, su hallazgo y su deuda omitida al céntimo; cuatro
   cuotas a nombre de una persona; los totales del programa —«S/ 214,882.40
   determinados», «63.5 % de efectividad»—; y el historial de versiones de un
   acta, con la hora y el nombre de quien la corrigió. Ninguna de esas cifras
   venía de ningún sitio, y una deuda determinada no se distingue de la buena al
   leerla. Se fueron cuando los resultados pasaron a leer del backend. */

/* ══════════ Resolución de determinación ══════════ */

/**
 * Las columnas del cuadro de la determinación, con las que el backend publica.
 *
 * <h2>«Interés S/» era una columna que no existe, y ha pasado a «Multa S/»</h2>
 *
 * El artboard rotulaba la quinta columna «Interés S/», y `LineaDeterminadaResource`
 * publica `determinado`, `declarado`, `diferencia`, **`multa`** y `total`: ni un
 * interés. El PDF que el propio servidor emite imprime su cabecera «Multa S/»
 * —comprobado leyendo los bytes de `?formato=PDF`—, así que dejar el rótulo del
 * artboard obligaba a una de dos: pintar la multa del art. 176 bajo una columna
 * que promete intereses, o dejar la columna vacía para siempre y esconder la
 * multa. Las dos son la cifra plausible y equivocada; se corrige el rótulo, que
 * es lo que el papel notificado dice.
 *
 * Y se añade «Condición», que el recurso publica y el artboard no dibuja. Es lo
 * mismo que este módulo ya hizo con la detección de omisos, y por lo mismo: con
 * D-02a abierta las cinco columnas de dinero salen «—» en todas las filas, y
 * una fila que sólo dice el ejercicio no deja ver de qué va la determinación.
 *
 * <h2>Las dos superficies van aparte, y eso lo decidió medir el ancho</h2>
 *
 * Estaban aquí y no caben: con ellas la tabla mide **1 054 px sobre una hoja de
 * 732**, medido en el navegador, así que las cuatro últimas columnas de dinero
 * quedaban fuera del papel y la impresión salía cortada. Y el propio PDF que el
 * servidor emite ya las pone fuera de este cuadro —en su bloque «Inscripción en
 * el padrón catastral», antes → después—, así que se hace lo que hace el papel:
 * su propia tabla debajo, con la unidad en la cabecera (#546).
 *
 * Aquí ya no vive ninguna fila ni ninguna cabecera con valor: la hoja las
 * compone de lo que lee `GET /fiscalizacion/resoluciones/{numero}`. Traía la
 * resolución entera del artboard —«000418-2026-SGFT/MDC», «INVERSIONES DEL
 * NORTE SAC», R.U.C. 20525118447 y seis ejercicios con sus importes al
 * céntimo— y la pantalla la mandaba a la impresora con su membrete, su
 * artículo 137º y sus dos líneas de firma; con la red cortada salía
 * **exactamente igual**, que es la prueba de que ninguna de esas cifras venía
 * de ningún sitio.
 */
export const REP_COLS: ColDef[] = [
  ['Ejercicio', 0],
  ['Condición', 0],
  ['Determinado S/', 1],
  ['Declarado S/', 1],
  ['Diferencia S/', 1],
  ['Multa S/', 1],
  ['Total S/', 1],
];

/** Las superficies que sostienen el hallazgo, en su propio cuadro. */
export const REP_COLS_AREA: ColDef[] = [
  ['Ejercicio', 0],
  ['Superficie declarada (m²)', 1],
  ['Superficie hallada (m²)', 1],
];

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
