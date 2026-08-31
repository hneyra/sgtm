/* Datos de muestra del módulo de Consultas, copiados literalmente del artboard
   `Consultas.dc.html`. Nada de esto viaja a ningún backend: es la maqueta. El
   acrónimo de la ordenanza es `MDC` y el domicilio es de Catacaos, que es la
   municipalidad piloto. */

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColDef = [string, 0 | 1];

/** Una tabla del estado de cuenta: lo que no depende de la fecha ni del
 *  interruptor del beneficio. */
export type Grupo = {
  titulo: string;
  conteo: string;
  min: string;
  cols: ColDef[];
  filas: string[][];
  nota: string;
  /** El índice de la celda que se dibuja como insignia. */
  insignia?: number;
  accion?: string;
};

export type Cuota = {
  anio: string;
  unidad: string;
  cuota: string;
  tributo: string;
  fase: string;
  insoluto: number;
  reajuste: number;
  interes: number;
  gastos: number;
};

/** La deuda del contribuyente, con sus cuatro componentes por cuota. El
 *  beneficio no es otra pantalla: es un interruptor sobre estas mismas filas. */
export const DEUDA: Cuota[] = [
  { anio: '2026', unidad: '02-014-D-14-01', cuota: '1', tributo: 'IMPUESTO PREDIAL', fase: 'Ordinaria', insoluto: 147.98, reajuste: 0, interes: 0, gastos: 0 },
  { anio: '2026', unidad: '02-014-D-14-01', cuota: '2', tributo: 'IMPUESTO PREDIAL', fase: 'Ordinaria', insoluto: 146.86, reajuste: 2.14, interes: 4.82, gastos: 0 },
  { anio: '2026', unidad: '02-014-D-14-01', cuota: '1-12', tributo: 'ARBITRIOS', fase: 'Ordinaria', insoluto: 486.0, reajuste: 7.2, interes: 18.44, gastos: 0 },
  { anio: '2025', unidad: '02-014-D-14-01', cuota: '3', tributo: 'IMPUESTO PREDIAL', fase: 'Valor emitido', insoluto: 144.2, reajuste: 8.6, interes: 31.18, gastos: 12.0 },
  { anio: '2024', unidad: 'T2G-418', cuota: '1', tributo: 'PATRIMONIO VEHICULAR', fase: 'Coactiva', insoluto: 614.0, reajuste: 48.2, interes: 182.44, gastos: 96.0 },
  { anio: '2019', unidad: '02-014-D-14-01', cuota: '1-4', tributo: 'IMPUESTO PREDIAL', fase: 'Coactiva', insoluto: 482.4, reajuste: 38.12, interes: 388.12, gastos: 84.0 },
];

export const COLS_DEUDA: ColDef[] = [
  ['Año', 0],
  ['Unidad', 0],
  ['Cuota', 0],
  ['Tributo', 0],
  ['Fase', 0],
  ['Insoluto', 1],
  ['Reajuste', 1],
  ['Interés', 1],
  ['Gastos', 1],
  ['A pagar', 1],
];

/* ══════════ Vista «Resumen» ══════════ */

export const COLS_EJERCICIOS: ColDef[] = [
  ['Ejercicio', 0],
  ['Predios', 1],
  ['Valúo afecto S/', 1],
  ['Predial S/', 1],
  ['Arbitrios S/', 1],
  ['Pagado S/', 1],
  ['Saldo S/', 1],
];

/** Las seis primeras columnas por ejercicio. El saldo se deriva de `DEUDA`. */
export const POR_EJERCICIO: [string, string, string, string, string, string][] = [
  ['2026', '2', '151,406.75', '591.94', '437.40', '301.80'],
  ['2025', '2', '148,204.00', '578.20', '412.00', '846.22'],
  ['2024', '2', '142,880.00', '562.40', '398.60', '961.00'],
  ['2023', '1', '96,400.00', '412.60', '284.00', '696.60'],
  ['2019', '1', '84,200.00', '482.40', '0.00', '0.00'],
];

export const MOVIMIENTOS: Grupo = {
  titulo: 'Movimiento del último año',
  conteo: '4 movimientos',
  min: '640px',
  cols: [['Fecha', 0], ['Movimiento', 0], ['Documento', 0], ['Importe S/', 1], ['Estado', 0]],
  filas: [
    ['12/08/2026', 'Pago en caja', 'Recibo 0003-0041182', '301.80', 'Aplicado'],
    ['27/02/2026', 'Declaración jurada rectificatoria', 'DJ 000418', '—', 'Procesada'],
    ['28/01/2026', 'Emisión anual', 'HR 0000098252', '1,029.34', 'Aplicado'],
    ['14/11/2025', 'Pase a coactiva', 'Expediente 0000004841', '940.64', 'En coactiva'],
  ],
  nota: 'El pase a coactiva no aumenta la deuda: le añade costas y gastos del procedimiento, que ya están en la columna de gastos.',
  insignia: 4,
};

/* ══════════ Vista «Pagos» ══════════ */

export const PAGOS: Grupo = {
  titulo: 'Pagos realizados',
  conteo: '4 de 38 · ejercicios 2024 a 2026',
  min: '860px',
  cols: [['Recibo', 0], ['Fecha', 0], ['Caja', 0], ['Concepto', 0], ['Medio de pago', 0], ['Importe S/', 1], ['Estado', 0]],
  filas: [
    ['0003-0041182', '12/08/2026', 'C-3', 'Predial 2026 cuotas 1 y 2', 'Efectivo', '301.80', 'Aplicado'],
    ['0003-0038944', '28/05/2026', 'C-1', 'Arbitrios 2025', 'Tarjeta', '412.00', 'Aplicado'],
    ['0003-0034118', '18/02/2025', 'C-2', 'Predial 2025 cuotas 1 a 4', 'Depósito en cuenta', '578.20', 'Aplicado'],
    ['0003-0029844', '14/03/2024', 'C-3', 'Predial 2024 y arbitrios', 'Efectivo', '961.00', 'Aplicado'],
  ],
  nota: 'Un pago aplicado ya descontó la cuota de la deuda. Si el contribuyente trae un recibo que no figura, la consulta correcta es el duplicado en Tesorería.',
  insignia: 6,
};

/* ══════════ Vista «Unidades» ══════════ */

export const PREDIOS: Grupo = {
  titulo: 'Predios',
  conteo: '2 predios · autovalúo S/ 170,616.75',
  min: '820px',
  cols: [['Código predial', 0], ['Ubicación', 0], ['Uso', 0], ['Terreno m²', 1], ['Const. m²', 1], ['% prop.', 1], ['Autovalúo S/', 1], ['Condición', 0]],
  filas: [
    ['02-014-D-14-01', 'CALLE SANTA ROSA 116', 'Casa habitación', '210.00', '164.50', '100.00', '132,196.75', 'Afecto'],
    ['04-021-B-07-00', 'MZ. B LT. 7 — BELLAVISTA', 'Terreno sin construir', '184.00', '0.00', '50.00', '38,420.00', 'Afecto'],
  ],
  nota: 'El código predial es el mismo código de referencia catastral: no hay dos padrones de predios.',
  insignia: 7,
  accion: 'Ver ficha catastral',
};

export const VEHICULOS: Grupo = {
  titulo: 'Vehículos',
  conteo: '2 registros',
  min: '780px',
  cols: [['Placa', 0], ['Clase', 0], ['Marca y modelo', 0], ['Año fab.', 0], ['Base imponible S/', 1], ['Afectación', 0], ['Estado', 0]],
  filas: [
    ['T2G-418', 'AUTOMÓVIL', 'TOYOTA YARIS GLI', '2018', '61,400.00', '2019 — 2021', 'Baja por vencimiento'],
    ['V1H-882', 'CAMIONETA', 'HYUNDAI TUCSON', '2024', '112,800.00', '2025 — 2027', 'Afecto'],
  ],
  nota: 'La afectación vehicular corre tres ejercicios desde el año siguiente a la primera inscripción registral.',
  insignia: 6,
};

/* ══════════ Vista «Valores» ══════════ */

export const VALORES: Grupo = {
  titulo: 'Valores emitidos',
  conteo: '3 valores · 1 en coactiva',
  min: '860px',
  cols: [['Nº valor', 0], ['Tipo', 0], ['Emitido', 0], ['Vence', 0], ['Concepto', 0], ['Importe S/', 1], ['Estado', 0]],
  filas: [
    ['0000000728', 'ORDEN DE PAGO — PREDIAL', '09/10/2025', '09/11/2025', 'Predial 2025 cuota 3', '195.98', 'Notificado'],
    ['0000001403', 'RES. EJECUCIÓN COACTIVA', '13/08/2025', '—', 'Vehicular 2024 cuota 1', '940.64', 'En coactiva'],
    ['0000000418', 'RES. DE DETERMINACIÓN', '13/08/2026', '02/09/2026', 'Fiscalización predial 2022-2026', '1,842.60', 'Por notificar'],
  ],
  nota: 'Un valor notificado y vencido pasa a coactiva. El que está «por notificar» todavía no hace correr ningún plazo.',
  insignia: 6,
};

/* ══════════ Vista «Altas y bajas» ══════════ */

export const ALTAS_Y_BAJAS: Grupo = {
  titulo: 'Movimientos de la cuenta corriente',
  conteo: '4 de 17',
  min: '880px',
  cols: [['Documento', 0], ['A/B', 0], ['Auto', 0], ['Fecha', 0], ['Concepto', 0], ['Unidad', 0], ['Importe S/', 1], ['Motivo', 0]],
  filas: [
    ['000000694727', 'Alta', 'Automática', '15/10/2025', 'PREDIAL 2025', '02-014-D-14-01', '578.20', 'Emisión anual'],
    ['000000694723', 'Baja', 'Automática', '15/10/2025', 'PARQUES Y JARDINES 2024', '02-014-D-14-01', '73.20', 'Deuda cancelada'],
    ['000000694719', 'Alta', 'Manual', '13/10/2025', 'REC 01 — TRIBUTARIA', 'T2G-418', '940.64', 'Pase a coactiva'],
    ['000000692844', 'Baja', 'Manual', '02/08/2024', 'PREDIAL 2014-2016', '02-014-D-14-01', '1,613.96', 'Prescripción declarada'],
  ],
  nota: 'Toda alta o baja queda con su documento, su fecha y su motivo. Es la bitácora que se mira cuando el contribuyente dice que ya pagó.',
  insignia: 1,
};

/* ══════════ Buscar ══════════ */

export const EJEMPLOS = ['44218937', '02-014-D-14-01', 'T2G-418', '0003-0041182'];

/** Las coincidencias del campo único. `monto` va derivado cuando es la deuda
 *  del contribuyente: el resto son cifras de su propia fila. `tab` es la vista
 *  del estado de cuenta a la que lleva. */
export const HALLAZGOS: {
  tipo: string;
  tono: 'accent' | 'neutro';
  titulo: string;
  detalle: string;
  monto: string;
  fecha: string;
  color: string;
  tab: number;
}[] = [
  { tipo: 'Contribuyente', tono: 'accent', titulo: 'CASTILLO PASCUALA, MARÍA ELENA', detalle: 'DNI 44218937 · 2 predios · 2 vehículos · calificación 003 pequeño contribuyente', monto: '', fecha: '', color: 'var(--bad-fg)', tab: 0 },
  { tipo: 'Predio', tono: 'neutro', titulo: '02-014-D-14-01 · CALLE SANTA ROSA 116', detalle: 'Casa habitación · 210.00 m² de terreno · autovalúo S/ 132,196.75', monto: 'S/ 727.54', fecha: 'saldo 2026', color: 'var(--ink)', tab: 3 },
  { tipo: 'Vehículo', tono: 'neutro', titulo: 'T2G-418 · TOYOTA YARIS GLI', detalle: 'Automóvil 2018 · afectación 2019 a 2021 · baja por vencimiento', monto: 'S/ 940.64', fecha: 'en coactiva', color: 'var(--bad-fg)', tab: 3 },
  { tipo: 'Recibo', tono: 'neutro', titulo: 'Recibo 0003-0041182', detalle: 'Predial 2026 cuotas 1 y 2 · caja C-3 · efectivo', monto: 'S/ 301.80', fecha: '12/08/2026', color: 'var(--ok-fg)', tab: 2 },
];

export const KPIS = [
  { valor: '11 → 1', etiqueta: 'Opciones reunidas', nota: 'Las once consultas eran once vistas del mismo contribuyente.' },
  { valor: '5', etiqueta: 'Padrones que busca el campo', nota: 'Contribuyentes, predios, vehículos, recibos y valores.' },
  { valor: '62,418', etiqueta: 'Contribuyentes consultables', nota: 'Con su deuda calculada a la fecha de hoy.' },
  { valor: '0', etiqueta: 'Cifras sin fecha', nota: 'Ningún importe se muestra sin decir a qué día está calculado.' },
];

/* ══════════ El sujeto ══════════ */

export const SUJETO = {
  codigo: '00000003541',
  nombre: 'CASTILLO PASCUALA, MARÍA ELENA',
  nombreTitulo: 'Castillo Pascuala, María Elena',
  meta: 'DNI 44218937 · CALLE LAMA 482 · 2 predios · 2 vehículos',
  documento: 'DNI 44218937',
  unidades: '2 predios · 2 veh.',
  autovaluo: 'S/ 151,406.75',
};

/* ══════════ Constancia de no adeudo ══════════ */

export const CONST_META: { k: string; v: string }[] = [
  { k: 'Solicitante', v: 'CASTILLO PASCUALA, MARÍA ELENA' },
  { k: 'Código', v: '00000003541' },
  { k: 'D.N.I.', v: '44218937' },
  { k: 'Domicilio fiscal', v: 'CALLE LAMA 482 — CATACAOS' },
  { k: 'Nº de constancia', v: 'CNA-2026-004182' },
  { k: 'Vigencia', v: '30 días calendario' },
];

/** Los cinco conceptos que la constancia verifica. Los dos primeros llevan su
 *  resultado derivado de `DEUDA`: la hoja firmada tiene que sumar lo suyo. */
export const CONST_FILAS: { concepto: string; fuente: string; resultado?: string; deuda?: 'predialArb' | 'vehicular'; ok: boolean }[] = [
  { concepto: 'Impuesto predial y arbitrios', fuente: 'Cuenta corriente', deuda: 'predialArb', ok: false },
  { concepto: 'Impuesto al patrimonio vehicular', fuente: 'Cuenta corriente', deuda: 'vehicular', ok: false },
  { concepto: 'Papeletas de tránsito', fuente: 'Padrón de tránsito', resultado: 'Ninguna', ok: true },
  { concepto: 'Multas administrativas', fuente: 'Padrón sancionador', resultado: 'Ninguna', ok: true },
  { concepto: 'Expedientes en cobranza coactiva', fuente: 'Ejecutoría coactiva', resultado: '1 expediente', ok: false },
];

/* ══════════ Paleta de comandos ══════════ */

/** Las once opciones del manual que el módulo resume. El número es la vista
 *  del estado de cuenta a la que lleva; `-1` es el documento. */
export const OPCIONES: [string, number][] = [
  ['Cuenta corriente', 0],
  ['Consulta de deuda', 1],
  ['Deudas con beneficio', 1],
  ['Unificada predial-arbitrios', 0],
  ['Resumen predial-arbitrios', 0],
  ['Consulta de pagos', 2],
  ['Consulta de predios', 3],
  ['Consulta de vehículos', 3],
  ['Consulta de valores emitidos', 4],
  ['Consulta de altas y bajas', 5],
  ['Constancia de no adeudo', -1],
];
