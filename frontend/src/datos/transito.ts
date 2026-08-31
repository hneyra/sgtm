/* Datos de muestra del módulo de Tránsito, copiados literalmente del artboard
   `Transito.dc.html`. El acrónimo de los documentos es `MDC` —Municipalidad
   Distrital de Catacaos— donde el diseño escribía `MPS`. Nada de esto viaja a
   ningún backend: es la maqueta. */

/** Una columna de tabla: su rótulo y si es numérica (alineada a la derecha). */
export type Columna = [label: string, numerica: 0 | 1];

/** Una fila de tabla, celda a celda, en el orden de sus columnas. */
export type Fila = string[];

/** Un campo de formulario tal como lo declara el artboard: clave, etiqueta,
 *  tipo, opciones del desplegable, valor propio, ancho completo y ayuda. */
export type CampoDef = {
  k: string;
  l: string;
  t?: 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';
  o?: string[];
  v?: string;
  ancho?: boolean;
  ayuda?: string;
  ph?: string;
};

/* ══════════ PANEL ══════════ */

/** El embudo del módulo: etapa, qué significa, cuántas y a dónde lleva.
 *  Solo el flujo acumulado; los estados de hoy van en `AHORA`. */
export const CICLO: [etapa: string, plazo: string, valor: number, dest: string][] = [
  ['Levantada', 'El inspector la impone en la vía', 12844, 'padron'],
  ['Notificada', 'Aquí empieza a correr el plazo', 11002, 'procesos'],
  ['Firme', 'Sin impugnar o con descargo infundado', 9584, 'procesos'],
  ['Cobrada', 'Cerrada con recibo', 4182, 'reportes'],
];

/** La base sobre la que se calcula el porcentaje de cada etapa. */
export const CICLO_BASE = 12844;

/** Fotos del estado de hoy, no etapas del recorrido. */
export const AHORA: [valor: string, label: string, dest: string][] = [
  ['1,418', 'en descargo', 'papeleta'],
  ['412', 'en coactiva', 'reportes'],
];

export const KPIS: { valor: string; etiqueta: string; nota: string }[] = [
  { valor: '12,844', etiqueta: 'Papeletas del ejercicio', nota: 'Levantadas por 14 inspectores en 8 meses.' },
  { valor: '32.6 %', etiqueta: 'Cobrado de lo levantado', nota: 'S/ 1.84 M de S/ 5.56 M impuestos.' },
  { valor: '1,842', etiqueta: 'Caducadas sin notificar', nota: 'S/ 788,976 que ya no se pueden cobrar.' },
  { valor: '118', etiqueta: 'Vehículos en depósito', nota: '22 pasan de 30 días y entran en abandono.' },
];

export const PLAZOS: {
  dias: string;
  tono: 'bad' | 'warn';
  titulo: string;
  detalle: string;
  monto: string;
  dest: string;
}[] = [
  { dias: '3 días', tono: 'bad', titulo: 'MDC-2026-041182 · T2G-418', detalle: 'Vence el plazo de descargo. Después la sanción queda firme.', monto: 'S/ 535.00', dest: 'papeleta' },
  { dias: '3 días', tono: 'bad', titulo: 'C2P-704 en depósito', detalle: 'Llega a 30 días de custodia y entra en abandono.', monto: 'S/ 288.00', dest: 'internamiento' },
  { dias: '5 días', tono: 'warn', titulo: 'Criterio 00000007748', detalle: 'Vence el criterio de generación de valores de agosto.', monto: '1,182 pap.', dest: 'procesos' },
  { dias: '8 días', tono: 'warn', titulo: 'RGO-0812-2026 sin notificar', detalle: 'Resolución emitida y pendiente de notificación al administrado.', monto: 'S/ 428.00', dest: 'procesos' },
];

/* ══════════ PADRÓN ══════════ */

export const FILTROS: {
  label: string;
  tipo: 'texto' | 'sel' | 'fecha';
  valor: string;
  ph?: string;
  opts?: string[];
}[] = [
  { label: 'Conductor', tipo: 'texto', valor: '', ph: 'Nombre o documento' },
  { label: 'Propietario', tipo: 'texto', valor: '', ph: 'Nombre o documento' },
  { label: 'Estado de deuda', tipo: 'sel', valor: '(TODOS)', opts: ['(TODOS)', 'PENDIENTE', 'PAGADA', 'A CUENTA', 'CANCELADA', 'ANULADA', 'COACTIVA'] },
  { label: 'Código de infracción', tipo: 'texto', valor: '', ph: 'M-02' },
  { label: 'Registradas desde', tipo: 'fecha', valor: '2026-07-21' },
  { label: 'Registradas hasta', tipo: 'fecha', valor: '2026-08-13' },
  { label: 'Ingresado por', tipo: 'texto', valor: 'JC', ph: 'Usuario' },
];

/** Los cuatro totales de la placa buscada. El último va sobre tinte de acento. */
export const TOTALES_PLACA: [label: string, valor: string, color: string, acento: 0 | 1][] = [
  ['Papeletas', '6', 'var(--ink)', 0],
  ['Importe', 'S/ 649.50', 'var(--ink)', 0],
  ['A pagar hoy', 'S/ 331.00', 'var(--bad-fg)', 0],
  ['Beneficio aplicado', '− S/ 318.50', 'var(--ok-fg)', 1],
];

export const COLS_PADRON: Columna[] = [
  ['Papeleta', 0], ['Fecha', 0], ['Código', 0], ['Conductor', 0],
  ['Importe S/', 1], ['A pagar S/', 1], ['Deuda', 0], ['Coactiva', 0],
];

export const PADRON: Fila[] = [
  ['D 007782', '01/07/2026', 'OM F-16', 'SERNAQUE VILLEGAS, H.', '144.00', '144.00', 'Cancelada', '—'],
  ['C 002635', '12/04/2025', 'DS F1', 'SERNAQUE VILLEGAS, H.', '142.00', '42.60', 'Pendiente', '—'],
  ['C 010962', '31/01/2024', 'DS F1', 'SÁNCHEZ NAVARRO, M.', '280.00', '84.00', 'A cuenta', '—'],
  ['C 006230', '25/03/2022', 'OM F4', 'SERNAQUE VILLEGAS, H.', '34.00', '34.00', 'Pendiente', 'Sí'],
  ['C 003159', '09/09/2021', 'OM F4', 'CARRASCO MIGUEL Á.', '33.00', '9.90', 'Pendiente', '—'],
  ['C 001686', '03/08/2021', 'OM F4', 'CARRASCO MONTES, A.', '16.50', '16.50', 'Pendiente', '—'],
];

/* ══════════ EXPEDIENTE DE LA PAPELETA ══════════ */

export type SeccionDef = { id: string; label: string; hint: string; campos: CampoDef[] };

/** Las cuatro pestañas del manual, apiladas y con una marca que dice si la
 *  sección tiene algo dentro. */
export const EXPEDIENTE: SeccionDef[] = [
  {
    id: 'intervencion',
    label: 'La intervención',
    hint: 'Dónde, cuándo y quién levantó la papeleta',
    campos: [
      { k: 'numero', l: 'Nº de papeleta', t: 'ro' },
      { k: 'fecha', l: 'Fecha', t: 'date' },
      { k: 'hora', l: 'Hora', t: 'text' },
      { k: 'lugar', l: 'Lugar de la intervención', t: 'text', ancho: true },
      { k: 'inspector', l: 'Inspector municipal', t: 'sel', o: ['A. VÍLCHEZ ROJAS', 'L. PEÑA SANDOVAL', 'J. RUIZ PALACIOS'] },
      { k: 'credencial', l: 'Nº de credencial', t: 'ro' },
      { k: 'supervisor', l: 'Supervisor', t: 'sel', o: ['C. ANCAJIMA FLORES', 'R. MENDOZA CRUZ'] },
      { k: 'docInfractor', l: 'Documento del infractor', t: 'text' },
      { k: 'infractor', l: 'Nombre del infractor', t: 'ro' },
      { k: 'licencia', l: 'Nº de licencia', t: 'text' },
      { k: 'claseLic', l: 'Clase / categoría', t: 'sel', o: ['A-I', 'A-IIa', 'A-IIb', 'A-IIIa'] },
      { k: 'placa', l: 'Placa', t: 'text' },
      { k: 'claseVeh', l: 'Clase de vehículo', t: 'sel', o: ['AUTOMÓVIL', 'CAMIONETA', 'MOTOCICLETA', 'ÓMNIBUS', 'CAMIÓN', 'MOTOTAXI'] },
      { k: 'propietario', l: 'Propietario del vehículo', t: 'ro' },
      { k: 'empresa', l: 'Empresa de transporte', t: 'text', ayuda: 'Solo si el vehículo presta servicio de transporte' },
    ],
  },
  {
    id: 'sancion',
    label: 'Infracción y sanción',
    hint: 'El código decide la multa, los puntos y la medida',
    campos: [
      { k: 'codigo', l: 'Código de infracción', t: 'sel', o: ['M-02', 'M-08', 'M-20', 'G-40', 'G-58', 'L-11'] },
      { k: 'descripcion', l: 'Descripción', t: 'ro', ancho: true },
      { k: 'gravedad', l: 'Gravedad', t: 'ro' },
      { k: 'uit', l: 'Base UIT (S/)', t: 'ro' },
      { k: 'pctUit', l: 'Porcentaje de UIT', t: 'ro' },
      { k: 'multa', l: 'Valor de la multa (S/)', t: 'ro' },
      { k: 'puntos', l: 'Puntos acumulados', t: 'ro' },
      { k: 'medida', l: 'Medida preventiva', t: 'sel', o: ['NINGUNA', 'RETENCIÓN DE LICENCIA', 'INTERNAMIENTO DEL VEHÍCULO', 'REMOCIÓN DEL VEHÍCULO'] },
      { k: 'depositoSel', l: 'Depósito municipal', t: 'sel', o: ['NO APLICA', 'DEPÓSITO CATACAOS NORTE', 'DEPÓSITO BELLAVISTA'] },
      { k: 'prontoPago', l: 'Descuento por pronto pago (5 días)', t: 'ro' },
    ],
  },
  {
    id: 'descargo',
    label: 'Descargo',
    hint: 'Cinco días hábiles desde la notificación',
    campos: [
      { k: 'expDescargo', l: 'Nº de expediente', t: 'text' },
      { k: 'fechaDescargo', l: 'Fecha de presentación', t: 'date' },
      { k: 'enPlazo', l: 'Dentro del plazo', t: 'chk', ph: 'Presentado en los 5 días hábiles' },
      { k: 'recurso', l: 'Tipo de recurso', t: 'sel', o: ['DESCARGO', 'RECONSIDERACIÓN', 'APELACIÓN', 'NULIDAD'] },
      { k: 'fundamento', l: 'Fundamento del administrado', t: 'area', ancho: true },
      { k: 'evaluadora', l: 'Área evaluadora', t: 'sel', o: ['SUBGERENCIA DE TRÁNSITO', 'GERENCIA DE ADMINISTRACIÓN TRIBUTARIA', 'EJECUTORÍA COACTIVA'] },
      { k: 'resDescargo', l: 'Nº de resolución', t: 'text' },
      { k: 'fechaRes', l: 'Fecha de resolución', t: 'date' },
      { k: 'fallo', l: 'Sentido del fallo', t: 'sel', o: ['FUNDADO', 'INFUNDADO', 'IMPROCEDENTE', 'FUNDADO EN PARTE'] },
      { k: 'efecto', l: 'Efecto sobre la multa', t: 'sel', o: ['SE MANTIENE', 'SE DEJA SIN EFECTO', 'SE REDUCE'] },
      { k: 'sustento', l: 'Sustento de la resolución', t: 'area', ancho: true },
    ],
  },
  {
    id: 'cancelacion',
    label: 'Cancelación y anulación',
    hint: 'Lo que cierra la papeleta',
    campos: [
      { k: 'cancelo', l: 'Canceló', t: 'chk', ph: 'Papeleta pagada' },
      { k: 'recibo', l: 'Nº de recibo', t: 'text' },
      { k: 'fechaPago', l: 'Fecha de pago', t: 'date' },
      { k: 'importePagado', l: 'Importe pagado (S/)', t: 'ro' },
      { k: 'anulo', l: 'Anuló', t: 'chk', ph: 'Papeleta anulada' },
      { k: 'refAnulacion', l: 'Referencia de anulación', t: 'text', ancho: true },
      { k: 'motivoAnulacion', l: 'Motivo de anulación', t: 'sel', o: ['—', 'ERROR EN EL REGISTRO', 'DESCARGO FUNDADO', 'DUPLICADA', 'RESOLUCIÓN JUDICIAL'] },
      { k: 'obs', l: 'Observaciones', t: 'area', ancho: true, ph: 'Detalle de la intervención y firmas' },
    ],
  },
];

/** Lo que trae la papeleta abierta antes de que nadie teclee nada. */
export const DEFECTOS: Record<string, string | boolean> = {
  numero: 'MDC-2026-041182', fecha: '2026-08-02', hora: '18:40',
  lugar: 'AV. JOSÉ DE LAMA CUADRA 12', inspector: 'A. VÍLCHEZ ROJAS', credencial: 'IM-0412',
  supervisor: 'C. ANCAJIMA FLORES', docInfractor: '44218937',
  infractor: 'CASTILLO PASCUALA, MARÍA ELENA', licencia: 'Q44218937', claseLic: 'A-I',
  placa: 'T2G-418', claseVeh: 'AUTOMÓVIL', propietario: 'CASTILLO PASCUALA, MARÍA ELENA', empresa: '',
  codigo: 'M-02', descripcion: 'CONDUCIR CON PRESENCIA DE ALCOHOL EN LA SANGRE',
  gravedad: 'MUY GRAVE', uit: '5,350.00', pctUit: '10 %', multa: '535.00', puntos: '50',
  medida: 'RETENCIÓN DE LICENCIA', depositoSel: 'NO APLICA', prontoPago: '− 214.00',
  expDescargo: '', fechaDescargo: '', enPlazo: false, recurso: 'DESCARGO',
  fundamento: '', evaluadora: 'SUBGERENCIA DE TRÁNSITO', resDescargo: '', fechaRes: '',
  fallo: 'INFUNDADO', efecto: 'SE MANTIENE', sustento: '',
  cancelo: false, recibo: '', fechaPago: '', importePagado: '0.00',
  anulo: false, refAnulacion: '', motivoAnulacion: '—', obs: '',
  libPersona: '', libDoc: '', libFecha: '2026-08-13',
};

/** La línea de vida: 1 cumplido, 2 el que corre ahora, 0 pendiente. */
export const HITOS: [label: string, fecha: string, estado: 0 | 1 | 2][] = [
  ['Levantada', '02/08/2026', 1],
  ['Notificada', '04/08/2026', 1],
  ['Plazo de descargo', 'vence 12/08', 2],
  ['Firme', '—', 0],
  ['Cobrada', '—', 0],
];

export const AVISO_DESCARGO =
  'El plazo de descargo vence el 12/08/2026, en 3 días hábiles. Si no se impugna, la sanción queda firme y pasa a cobranza.';

/* ══════════ INTERNAMIENTO ══════════ */

export type Internado = {
  placa: string;
  papeleta: string;
  codigo: string;
  multa: number;
  ingreso: string;
  dias: number;
  tasa: number;
  medida: string;
  estado: string;
  salida: string;
};

/** Cada vehículo trae su papeleta, su código, su multa y su cómputo de
 *  custodia: la tarjeta de liberación se compone del registro elegido, no de
 *  cadenas fijas. Los requisitos van por placa. */
export const INTERNADOS: Internado[] = [
  { placa: 'T2G-418', papeleta: 'MDC-2026-041182', codigo: 'M-02', multa: 535.0, ingreso: '02/08/2026', dias: 11, tasa: 18.0, medida: 'retención de licencia', estado: 'Internado', salida: '' },
  { placa: 'C2P-704', papeleta: 'MDC-2026-040991', codigo: 'M-08', multa: 428.0, ingreso: '28/07/2026', dias: 16, tasa: 18.0, medida: 'internamiento del vehículo', estado: 'Internado', salida: '' },
  { placa: 'B7T-221', papeleta: 'MDC-2026-040412', codigo: 'L-11', multa: 214.0, ingreso: '09/06/2026', dias: 3, tasa: 18.0, medida: 'remoción del vehículo', estado: 'Liberado', salida: '12/06/2026' },
];

export const DEPOSITOS = ['Todos', 'DEPÓSITO CATACAOS NORTE', 'DEPÓSITO BELLAVISTA'];

export const CAMPOS_LIBERACION: CampoDef[] = [
  { k: 'libFecha', l: 'Fecha de liberación', t: 'date' },
  { k: 'libPersona', l: 'Persona que retira', t: 'text', ph: 'Nombre completo' },
  { k: 'libDoc', l: 'Documento de quien retira', t: 'text', ph: 'DNI' },
];

/* ══════════ PROCESOS ══════════ */

export type Proceso = {
  k: string;
  label: string;
  titulo: string;
  endpoint: string;
  desc: string;
  campos: CampoDef[];
  tabla?: { min: string; cols: Columna[]; filas: Fila[] };
  nota: string;
  aviso: string;
  secundaria: string;
  primaria: string;
  hecho: string;
};

export const PROCESOS: Proceso[] = [
  {
    k: 'valores',
    label: 'Generación de valores',
    titulo: 'Generación de valores de tránsito',
    endpoint: 'POST /api/v1/transito/valores/generacion-masiva',
    desc: 'Genera masivamente los valores por papeletas pendientes de pago. El criterio define el tipo de recaudo, la oficina y el vencimiento; las papeletas se agregan por selección.',
    campos: [
      { k: 'critCod', l: 'Código de criterio', t: 'ro', v: '00000007748' },
      { k: 'critDesc', l: 'Descripción', t: 'text', v: 'PAPELETAS AGOSTO 2026', ancho: true },
      { k: 'critIni', l: 'Fecha de inicio', t: 'date', v: '2026-08-01' },
      { k: 'critFin', l: 'Fecha de fin', t: 'date', v: '2026-10-31' },
      { k: 'critRec', l: 'Tipo de recaudo', t: 'sel', v: '003 — RS PAPELETAS DE TRÁNSITO', o: ['003 — RS PAPELETAS DE TRÁNSITO', '035 — RM PAPELETAS ADMINISTRATIVAS', '081 — RM LICENCIA FUNCIONAMIENTO'] },
      { k: 'critVence', l: 'Vencimiento', t: 'date', v: '2026-10-06', ayuda: 'A partir de esta fecha el valor puede pasar a coactiva' },
      { k: 'critOficina', l: 'Oficina', t: 'sel', ancho: true, v: '113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', o: ['113300 — SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', '113100 — SUBGERENCIA DE RECAUDACIÓN', '999999 — OFICINA NO ESPECIFICADA'] },
    ],
    tabla: {
      min: '660px',
      cols: [['Cod. criterio', 0], ['Descripción', 0], ['Tipo rec.', 0], ['Fec. ini.', 0], ['Fec. fin.', 0], ['Est.', 0]],
      filas: [
        ['00000007748', 'PAPELETAS AGOSTO 2026', 'RS', '01/08/2026', '31/10/2026', 'Activo'],
        ['00000007747', 'PAP TRAN-CRITERIO DE PRUEBA', 'RS', '01/10/2024', '31/10/2025', 'Activo'],
        ['00000000091', 'INSERCIÓN MIGRACIÓN PAPELETAS 2007-2008', 'RS', '01/01/2021', '01/12/2023', 'Activo'],
        ['00000000090', 'INSERCIÓN MIGRACIÓN PAPELETAS', 'RS', '01/01/2021', '01/12/2023', 'Activo'],
      ],
    },
    nota: 'Procesar el criterio emite un valor por cada papeleta incluida. Los valores emitidos ya no se pueden quitar del criterio: se anulan.',
    aviso: 'El criterio se guarda antes de procesar. Procesar es lo que emite los valores.',
    secundaria: 'Buscar papeletas',
    primaria: 'Procesar criterio',
    hecho: '1,182 valores emitidos con el criterio 00000007748.',
  },
  {
    k: 'numero',
    label: 'Cambio de nº de papeleta',
    titulo: 'Cambio de número de papeleta de tránsito',
    endpoint: 'PATCH /api/v1/transito/papeletas/{numero}/codigo',
    desc: 'Corrige el número de papeleta o el número de placa registrados, cuando hubo error del operador al momento del registro.',
    campos: [
      { k: 'cnPlaca', l: 'Placa actual', t: 'text', v: 'NB-21169' },
      { k: 'cnCod', l: 'Código de papeleta actual', t: 'text', v: 'C 006230' },
      { k: 'cnPlacaNueva', l: 'Placa nueva', t: 'text', v: '', ayuda: 'Dejar vacío si la placa no cambia' },
      { k: 'cnCodNuevo', l: 'Código de papeleta nuevo', t: 'text', v: '' },
      { k: 'cnMotivo', l: 'Motivo del cambio', t: 'sel', ancho: true, v: 'ERROR DE DIGITACIÓN DEL OPERADOR', o: ['ERROR DE DIGITACIÓN DEL OPERADOR', 'PAPELETA DUPLICADA', 'PLACA MAL LEÍDA EN CAMPO', 'RESOLUCIÓN QUE ORDENA LA CORRECCIÓN'] },
    ],
    nota: 'Un cambio de número deja rastro: la papeleta anterior queda referenciada y la bitácora anota quién la cambió y por qué.',
    aviso: 'Si la papeleta ya está en coactiva, el cambio necesita resolución previa: el expediente coactivo la referencia por su número.',
    secundaria: 'Consultar',
    primaria: 'Modificar',
    hecho: 'Número corregido. La papeleta anterior queda referenciada en la bitácora.',
  },
  {
    k: 'documentos',
    label: 'Resoluciones y documentos',
    titulo: 'Emisión de resoluciones y otros documentos',
    endpoint: 'GET /api/v1/transito/papeletas/{numero}/actos',
    desc: 'Los actos administrativos de una papeleta: la notificación, la resolución que resuelve el descargo y la que impone la sanción firme, con su fecha y su archivo.',
    campos: [
      { k: 'docPapeleta', l: 'Papeleta', t: 'text', v: 'MDC-2026-040877' },
      { k: 'docTipo', l: 'Tipo de documento', t: 'sel', ancho: true, v: 'RESOLUCIÓN DE GERENCIA ORDINARIA', o: ['NOTIFICACIÓN', 'RESOLUCIÓN DE GERENCIA ORDINARIA', 'RESOLUCIÓN DE GERENCIA SANCIONADORA', 'INFORME TÉCNICO', 'OFICIO'] },
      { k: 'docNumero', l: 'Nº del documento', t: 'text', v: 'RGO-0812-2026-MDC' },
      { k: 'docFecha', l: 'Fecha del documento', t: 'date', v: '2026-08-08' },
      { k: 'docGlosa', l: 'Glosa', t: 'text', ancho: true, v: 'Declara infundado el descargo y mantiene la multa.' },
    ],
    tabla: {
      min: '660px',
      cols: [['Item', 0], ['Documento', 0], ['Nº doc.', 0], ['Fecha', 0], ['Archivo', 0], ['Est.', 0]],
      filas: [
        ['1', 'NOTIFICACIÓN', 'NT-000418', '25/07/2026', 'NOTIF-040877.pdf', 'Activo'],
        ['2', 'RESOLUCIÓN DE GERENCIA ORDINARIA', 'RGO-0812-2026', '08/08/2026', 'RGO-0812.pdf', 'Activo'],
        ['3', 'INFORME TÉCNICO', 'IT-0244-2026', '05/08/2026', 'IT-0244.pdf', 'Activo'],
      ],
    },
    nota: 'El orden de los actos es lo que sostiene el procedimiento: sin notificación no corre el plazo, y sin plazo vencido no hay sanción firme.',
    aviso: 'Adjuntar el archivo firmado es lo que hace válido el acto en una reclamación posterior.',
    secundaria: 'Adjuntar archivo',
    primaria: 'Registrar documento',
    hecho: 'Documento registrado y adjunto al expediente de la papeleta.',
  },
];

/* ══════════ CÓDIGOS DE TRÁNSITO ══════════ */

export const COLS_COD: Columna[] = [
  ['Código', 0], ['Descripción', 0], ['Gravedad', 0], ['% UIT', 1],
  ['Multa S/', 1], ['Puntos', 1], ['Medida preventiva', 0],
];

export const CODIGOS: Fila[] = [
  ['M-02', 'Conducir con presencia de alcohol en la sangre', 'Muy grave', '10 %', '535.00', '50', 'Retención de licencia'],
  ['M-08', 'Conducir sin licencia vigente', 'Muy grave', '8 %', '428.00', '50', 'Internamiento del vehículo'],
  ['M-20', 'Prestar servicio de transporte sin autorización', 'Muy grave', '12 %', '642.00', '50', 'Internamiento del vehículo'],
  ['G-40', 'Estacionar en zona rígida o prohibida', 'Grave', '8 %', '428.00', '20', 'Remoción del vehículo'],
  ['G-58', 'Exceder la velocidad permitida', 'Grave', '8 %', '428.00', '20', 'Ninguna'],
  ['L-11', 'No portar el certificado SOAT vigente', 'Leve', '4 %', '214.00', '10', 'Ninguna'],
];

export const GRAVEDADES = ['Todas', 'Muy grave', 'Grave', 'Leve'];

/* ══════════ CENTRO DE REPORTES ══════════ */

export type Criterio = { l: string; t: 'text' | 'sel' | 'date'; v: string; o?: string[] };

/** Los quince criterios del formulario original. Cada hoja usa los suyos. */
export const CRITERIOS: Record<string, Criterio> = {
  papeleta: { l: 'Nº de papeleta', t: 'text', v: '' },
  hasta: { l: 'Hasta el nº', t: 'text', v: '' },
  estado: { l: 'Estado de deuda', t: 'sel', v: '(TODOS)', o: ['(TODOS)', 'PENDIENTE', 'PAGADA', 'A CUENTA', 'CANCELADA', 'ANULADA', 'COACTIVA'] },
  conductor: { l: 'Conductor', t: 'text', v: 'SERNAQUE VILLEGAS, HÉCTOR' },
  placa: { l: 'Placa', t: 'text', v: 'NB-21169' },
  infraccion: { l: 'Código de infracción', t: 'text', v: '' },
  accion: { l: 'Acción', t: 'sel', v: 'GENERAR', o: ['GENERAR', 'REIMPRIMIR', 'ANULAR'] },
  constancia: { l: 'Nº de constancia', t: 'text', v: '' },
  recibo: { l: 'Nº de recibo', t: 'text', v: '' },
  importe: { l: 'Importe S/', t: 'text', v: '' },
  usuario: { l: 'Usuario que ingresó', t: 'text', v: '' },
  desde: { l: 'Fecha desde', t: 'date', v: '2026-07-01' },
  hastaF: { l: 'Fecha hasta', t: 'date', v: '2026-08-13' },
  orden: { l: 'Ordenación', t: 'sel', v: 'FECHA DE INFRACCIÓN', o: ['FECHA DE INFRACCIÓN', 'Nº DE PAPELETA', 'PLACA', 'CONDUCTOR', 'IMPORTE'] },
  agrupa: { l: 'Agrupado por', t: 'sel', v: 'MES', o: ['MES', 'AÑO', 'CÓDIGO DE INFRACCIÓN', 'ESTADO', 'PLACA'] },
};

export type Hoja = {
  g: string;
  label: string;
  codigo: string;
  sub: string;
  crit: string[];
  meta: [string, string][];
  cols: Columna[];
  filas: Fila[];
  cierre: string;
};

/** Los quince reportes del manual, con los criterios que cada uno usa de
 *  verdad. El formulario original dibujaba los diecinueve y apagaba los que
 *  no van. */
export const HOJAS: Hoja[] = [
  {
    g: 'Historiales', label: 'Record de conductor', codigo: 'RC-2026-00418', sub: 'Historial de infracciones de tránsito',
    crit: ['conductor', 'desde', 'hastaF', 'estado', 'orden'],
    meta: [['Conductor', 'SERNAQUE VILLEGAS, HÉCTOR'], ['Licencia', 'Q44218937'], ['Clase', 'A-I'], ['Puntos acumulados', '110']],
    cols: [['Papeleta', 0], ['Fecha', 0], ['Placa', 0], ['Código', 0], ['Multa S/', 1], ['Estado', 0]],
    filas: [
      ['D 007782', '01/07/2026', 'NB-21169', 'OM F-16', '144.00', 'Cancelada'],
      ['C 002635', '12/04/2025', 'NB-21169', 'DS F1', '142.00', 'Pendiente'],
      ['C 006230', '25/03/2022', 'NB-21169', 'OM F4', '34.00', 'Coactiva'],
    ],
    cierre: 'El puntaje acumulado se computa por los dos últimos años. Alcanzados los 100 puntos corresponde la suspensión de la licencia.',
  },
  {
    g: 'Historiales', label: 'Record vehicular', codigo: 'RV-2026-00418', sub: 'Historial de infracciones por vehículo',
    crit: ['placa', 'desde', 'hastaF', 'estado', 'orden'],
    meta: [['Placa', 'NB-21169'], ['Clase', 'AUTOMÓVIL'], ['Propietario', 'SERNAQUE VILLEGAS, DORIS'], ['Papeletas', '6']],
    cols: [['Papeleta', 0], ['Fecha', 0], ['Conductor', 0], ['Código', 0], ['Multa S/', 1], ['Estado', 0]],
    filas: [
      ['D 007782', '01/07/2026', 'SERNAQUE VILLEGAS, H.', 'OM F-16', '144.00', 'Cancelada'],
      ['C 010962', '31/01/2024', 'SÁNCHEZ NAVARRO, M.', 'DS F1', '280.00', 'A cuenta'],
      ['C 001686', '03/08/2021', 'CARRASCO MONTES, A.', 'OM F4', '16.50', 'Pendiente'],
    ],
    cierre: 'El propietario responde solidariamente por las papeletas impuestas al conductor del vehículo.',
  },
  {
    g: 'Constancias', label: 'Constancia libre de infracciones', codigo: 'CL-2026-00418', sub: 'Certificación de no adeudo por infracciones de tránsito',
    crit: ['conductor', 'placa', 'accion', 'constancia', 'recibo', 'importe'],
    meta: [['Solicitante', 'CARRASCO MIGUEL ÁNGEL'], ['Documento', 'DNI 03421886'], ['Nº de constancia', '000418-2026'], ['Recibo', '000049406']],
    cols: [['Concepto', 0], ['Verificado', 0], ['Resultado', 0]],
    filas: [
      ['Papeletas pendientes de pago', 'Padrón de tránsito', 'Ninguna'],
      ['Papeletas en cobranza coactiva', 'Expedientes coactivos', 'Ninguna'],
      ['Medidas preventivas vigentes', 'Depósito municipal', 'Ninguna'],
    ],
    cierre: 'Se expide la presente constancia a solicitud del interesado para los fines que estime conveniente. Tiene una vigencia de treinta días calendario.',
  },
  {
    g: 'Constancias', label: 'Relación de constancias emitidas', codigo: 'PC-2026-00418', sub: 'Padrón de constancias libres de infracciones',
    crit: ['desde', 'hastaF', 'usuario', 'orden'],
    meta: [['Periodo', '01/07/2026 — 13/08/2026'], ['Emitidas', '84'], ['Recaudado', 'S/ 3,024.00'], ['Usuario', 'Todos']],
    cols: [['Nº constancia', 0], ['Fecha', 0], ['Solicitante', 0], ['Recibo', 0], ['Importe S/', 1]],
    filas: [
      ['000418-2026', '13/08/2026', 'CARRASCO MIGUEL ÁNGEL', '000049406', '36.00'],
      ['000417-2026', '12/08/2026', 'DÍAZ MADRID, JULIO CÉSAR', '000049388', '36.00'],
      ['000416-2026', '11/08/2026', 'REYES CHUNGA, PEDRO', '000049371', '36.00'],
    ],
    cierre: 'El derecho de emisión de la constancia es una tasa del TUPA y se cobra por cada expedición, incluidos los duplicados.',
  },
  {
    g: 'Padrones', label: 'Padrón de papeletas de infracción', codigo: 'PP-2026-00418', sub: 'Relación de papeletas por periodo',
    crit: ['papeleta', 'hasta', 'estado', 'desde', 'hastaF', 'orden', 'agrupa'],
    meta: [['Periodo', '01/07/2026 — 13/08/2026'], ['Papeletas', '1,182'], ['Importe', 'S/ 504,236.00'], ['Agrupado por', 'Mes']],
    cols: [['Papeleta', 0], ['Fecha', 0], ['Placa', 0], ['Conductor', 0], ['Multa S/', 1], ['Estado', 0]],
    filas: [
      ['MDC-2026-041182', '02/08/2026', 'T2G-418', 'CASTILLO PASCUALA, M.', '535.00', 'Pendiente'],
      ['MDC-2026-040877', '21/07/2026', 'V1H-882', 'DÍAZ MADRID, J.', '428.00', 'Con descargo'],
      ['MDC-2026-040412', '09/06/2026', 'B7T-221', 'REYES CHUNGA, P.', '214.00', 'Pagada'],
    ],
    cierre: 'El padrón es el documento de descargo del inspector: cada papeleta levantada tiene que aparecer aquí con su número correlativo.',
  },
  {
    g: 'Padrones', label: 'Papeletas enviadas a coactiva', codigo: 'PK-2026-00418', sub: 'Relación de papeletas remitidas a ejecución coactiva',
    crit: ['desde', 'hastaF', 'estado', 'orden'],
    meta: [['Periodo', '01/01/2026 — 13/08/2026'], ['Papeletas', '412'], ['Importe', 'S/ 182,844.00'], ['Expedientes', '388']],
    cols: [['Papeleta', 0], ['Fecha firme', 0], ['Expediente', 0], ['Placa', 0], ['Deuda S/', 1]],
    filas: [
      ['C 006230', '10/05/2022', '0000001201', 'NB-21169', '34.00'],
      ['MDC-2025-038119', '20/12/2025', '0000004841', 'T2G-418', '428.00'],
      ['MDC-2025-037882', '02/12/2025', '0000004798', 'C2P-704', '214.00'],
    ],
    cierre: 'Una papeleta pasa a coactiva cuando es firme y no ha sido pagada. Firme es la que no fue impugnada en plazo o cuyo descargo fue declarado infundado.',
  },
  {
    g: 'Estados de cuenta', label: 'Estado de cuenta de infracciones', codigo: 'EC-2026-00418', sub: 'Deuda por papeletas de tránsito a la fecha',
    crit: ['conductor', 'placa', 'estado'],
    meta: [['Administrado', 'SERNAQUE VILLEGAS, HÉCTOR'], ['Documento', 'DNI 03593174'], ['Fecha de cálculo', '13/08/2026'], ['Papeletas', '6']],
    cols: [['Papeleta', 0], ['Fecha', 0], ['Importe S/', 1], ['Interés S/', 1], ['A pagar S/', 1], ['Estado', 0]],
    filas: [
      ['C 002635', '12/04/2025', '142.00', '12.40', '42.60', 'Pendiente'],
      ['C 010962', '31/01/2024', '280.00', '38.20', '84.00', 'A cuenta'],
      ['C 006230', '25/03/2022', '34.00', '18.60', '34.00', 'Coactiva'],
    ],
    cierre: 'La deuda se calcula a la fecha de emisión de este documento y cambia cada día. El importe a pagar ya lleva aplicado el beneficio vigente.',
  },
  {
    g: 'Documentos de la papeleta', label: 'Papeleta de infracción', codigo: 'MDC-2026-041182', sub: 'Papeleta de infracción al Reglamento Nacional de Tránsito',
    crit: ['papeleta', 'accion'],
    meta: [['Papeleta', 'MDC-2026-041182'], ['Placa', 'T2G-418'], ['Infractor', 'CASTILLO PASCUALA, MARÍA E.'], ['Código', 'M-02']],
    cols: [['Concepto', 0], ['Detalle', 0], ['Importe S/', 1]],
    filas: [
      ['Infracción M-02', 'Conducir con presencia de alcohol en la sangre', '535.00'],
      ['Medida preventiva', 'Retención de licencia', '—'],
      ['Descuento pronto pago (5 días)', 'Vence el 07/08/2026', '− 214.00'],
    ],
    cierre: 'El administrado puede presentar descargo dentro de los cinco días hábiles de notificada la papeleta. Vencido el plazo sin impugnación, la sanción queda firme.',
  },
  {
    g: 'Documentos de la papeleta', label: 'Notificación', codigo: 'NT-2026-00418', sub: 'Notificación de papeleta de infracción',
    crit: ['papeleta', 'accion', 'desde', 'hastaF'],
    meta: [['Papeleta', 'MDC-2026-041182'], ['Notificado a', 'CASTILLO PASCUALA, MARÍA E.'], ['Domicilio', 'CALLE LAMA 482'], ['Visita', '1 de 2']],
    cols: [['Acto', 0], ['Fecha', 0], ['Resultado', 0]],
    filas: [
      ['Primera visita', '04/08/2026', 'Notificación con éxito'],
      ['Recibido por', '04/08/2026', 'El administrado, con firma'],
      ['Inicio del plazo de descargo', '05/08/2026', '5 días hábiles'],
    ],
    cierre: 'La notificación es lo que hace correr el plazo. Sin ella la papeleta no llega a ser firme y no se puede cobrar.',
  },
  {
    g: 'Resoluciones', label: 'Resolución de gerencia ordinaria', codigo: 'RGO-0812-2026', sub: 'Resolución que resuelve el recurso presentado',
    crit: ['papeleta', 'accion', 'desde', 'hastaF'],
    meta: [['Resolución', 'RGO-0812-2026-MDC'], ['Expediente', '2026-1188'], ['Papeleta', 'MDC-2026-040877'], ['Sentido', 'INFUNDADO']],
    cols: [['Artículo', 0], ['Contenido', 0]],
    filas: [
      ['Primero', 'Declarar INFUNDADO el descargo presentado contra la papeleta MDC-2026-040877.'],
      ['Segundo', 'Mantener la multa impuesta por S/ 428.00 y disponer su cobranza.'],
      ['Tercero', 'Notificar la presente resolución al administrado en su domicilio.'],
    ],
    cierre: 'Contra la presente resolución procede recurso de apelación dentro de los quince días hábiles siguientes a su notificación.',
  },
  {
    g: 'Resoluciones', label: 'Resolución de gerencia sancionadora', codigo: 'RGS-0812-2026', sub: 'Resolución que impone la sanción firme',
    crit: ['papeleta', 'accion', 'desde', 'hastaF'],
    meta: [['Resolución', 'RGS-0812-2026-MDC'], ['Papeleta', 'MDC-2026-041182'], ['Infractor', 'CASTILLO PASCUALA, MARÍA E.'], ['Multa', 'S/ 535.00']],
    cols: [['Artículo', 0], ['Contenido', 0]],
    filas: [
      ['Primero', 'Sancionar con multa de S/ 535.00 equivalente al 10 % de la UIT por la infracción M-02.'],
      ['Segundo', 'Disponer la retención de la licencia de conducir hasta el pago de la multa.'],
      ['Tercero', 'Remitir el expediente a ejecución coactiva si no se cancela en el plazo de ley.'],
    ],
    cierre: 'La sanción queda firme al no haberse presentado descargo dentro del plazo de cinco días hábiles.',
  },
  {
    g: 'Resúmenes', label: 'Resumen de recaudación', codigo: 'RR-2026-00418', sub: 'Recaudación por papeletas de tránsito',
    crit: ['desde', 'hastaF', 'agrupa'],
    meta: [['Periodo', '01/01/2026 — 13/08/2026'], ['Recaudado', 'S/ 1,842,116.00'], ['Papeletas pagadas', '4,182'], ['Agrupado por', 'Mes']],
    cols: [['Mes', 0], ['Papeletas', 1], ['Importe S/', 1], ['Descuento S/', 1], ['Recaudado S/', 1]],
    filas: [
      ['Junio 2026', '612', '262,116.00', '84,412.00', '177,704.00'],
      ['Julio 2026', '588', '251,844.00', '80,184.00', '171,660.00'],
      ['Agosto 2026', '284', '121,552.00', '38,844.00', '82,708.00'],
    ],
    cierre: 'El descuento corresponde al beneficio por pronto pago y a las amnistías vigentes en el periodo.',
  },
  {
    g: 'Resúmenes', label: 'Resumen de pendientes y pagadas', codigo: 'RP-2026-00418', sub: 'Papeletas pendientes y pagadas por periodo',
    crit: ['desde', 'hastaF', 'estado', 'agrupa'],
    meta: [['Periodo', '01/01/2026 — 13/08/2026'], ['Levantadas', '12,844'], ['Pagadas', '4,182'], ['Pendientes', '8,662']],
    cols: [['Estado', 0], ['Papeletas', 1], ['Importe S/', 1], ['% del total', 1]],
    filas: [
      ['Pagadas', '4,182', '1,842,116.00', '32.6 %'],
      ['Pendientes', '6,408', '2,742,624.00', '49.9 %'],
      ['En coactiva', '412', '182,844.00', '3.2 %'],
      ['Anuladas', '1,842', '788,976.00', '14.3 %'],
    ],
    cierre: 'Las anuladas incluyen las que caducaron sin notificar: son las que más pesan en la brecha entre lo levantado y lo cobrado.',
  },
  {
    g: 'Resúmenes', label: 'Resumen por código de infracción', codigo: 'RCI-2026-00418', sub: 'Papeletas agrupadas por código del reglamento',
    crit: ['infraccion', 'desde', 'hastaF', 'orden'],
    meta: [['Periodo', '01/01/2026 — 13/08/2026'], ['Códigos con papeletas', '84'], ['Papeletas', '12,844'], ['Importe', 'S/ 5,556,560.00']],
    cols: [['Código', 0], ['Descripción', 0], ['Gravedad', 0], ['Papeletas', 1], ['Importe S/', 1]],
    filas: [
      ['G-40', 'Estacionar en zona rígida o prohibida', 'Grave', '3,418', '1,462,904.00'],
      ['L-11', 'No portar el certificado SOAT vigente', 'Leve', '2,844', '608,616.00'],
      ['M-02', 'Conducir con presencia de alcohol en la sangre', 'Muy grave', '412', '220,420.00'],
    ],
    cierre: 'Tres códigos concentran la mitad de las papeletas del periodo. Es la lectura que orienta dónde poner los operativos.',
  },
  {
    g: 'Resúmenes', label: 'Resumen por iniciales de placa', codigo: 'RPL-2026-00418', sub: 'Papeletas agrupadas por las dos primeras letras de la placa',
    crit: ['desde', 'hastaF', 'orden'],
    meta: [['Periodo', '01/01/2026 — 13/08/2026'], ['Series', '42'], ['Papeletas', '12,844'], ['Ordenado por', 'Importe']],
    cols: [['Iniciales', 0], ['Papeletas', 1], ['Importe S/', 1], ['Pagadas', 1], ['Pendientes', 1]],
    filas: [
      ['NB', '2,418', '1,042,844.00', '812', '1,606'],
      ['T2', '1,844', '788,976.00', '618', '1,226'],
      ['C2', '1,212', '518,844.00', '388', '824'],
    ],
    cierre: 'La agrupación por iniciales sirve para el cruce con los padrones de transporte: una serie concentrada suele ser una empresa.',
  },
];

/* ══════════ PALETA ══════════ */

/** Las veintitrés opciones del manual que el módulo resume, con el destino al
 *  que lleva cada una. */
export const OPCIONES: [label: string, dest: string][] = [
  ['Papeletas', 'padron'],
  ['Búsqueda de infracciones', 'padron'],
  ['Estado de cuenta de infracciones', 'reportes'],
  ['Descargos y reclamos', 'papeleta'],
  ['Internamiento vehicular', 'internamiento'],
  ['Códigos de tránsito', 'codigos'],
  ['Generación de valores', 'procesos'],
  ['Cambio de nº de papeleta', 'procesos'],
  ['Resoluciones y documentos', 'procesos'],
  ['Reportes de tránsito', 'reportes'],
  ['Record de conductor', 'reportes'],
  ['Record vehicular', 'reportes'],
  ['Constancia libre de infracciones', 'reportes'],
  ['Padrón de papeletas', 'reportes'],
  ['Padrón enviadas a coactiva', 'reportes'],
  ['Padrón de constancias', 'reportes'],
  ['Reporte de papeleta', 'reportes'],
  ['Res. de gerencia ordinaria', 'reportes'],
  ['Res. de gerencia sancionadora', 'reportes'],
  ['Resumen de recaudación', 'reportes'],
  ['Resumen de papeletas', 'reportes'],
  ['Resumen por código', 'reportes'],
  ['Resumen por iniciales de placa', 'reportes'],
];
