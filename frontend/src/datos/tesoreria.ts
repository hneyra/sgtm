/* Datos de muestra de Tesorería, copiados literalmente del artboard
   `Tesoreria.dc.html`. Nada de esto viaja a ningún backend: es la maqueta.
   El acrónimo del rediseño era `MPS` (Sullana); aquí la entidad es la
   Municipalidad Distrital de Catacaos, así que en los números es `MDC`. */

export type Deuda = {
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

/** Las cinco deudas del contribuyente, con sus cuatro componentes. El total a
 *  cobrar se compone de lo marcado: no es una cifra escrita. */
export const DEUDAS: Deuda[] = [
  { anio: '2026', unidad: '02-014-D-14-01', cuota: '1', tributo: 'IMPUESTO PREDIAL', fase: 'Ordinaria', insoluto: 147.98, reajuste: 0, interes: 0, gastos: 0 },
  { anio: '2026', unidad: '02-014-D-14-01', cuota: '2', tributo: 'IMPUESTO PREDIAL', fase: 'Ordinaria', insoluto: 146.86, reajuste: 2.14, interes: 4.82, gastos: 0 },
  { anio: '2026', unidad: '02-014-D-14-01', cuota: '1-12', tributo: 'ARBITRIOS', fase: 'Ordinaria', insoluto: 486.0, reajuste: 7.2, interes: 18.44, gastos: 0 },
  { anio: '2025', unidad: '02-014-D-14-01', cuota: '3', tributo: 'IMPUESTO PREDIAL', fase: 'Valor emitido', insoluto: 144.2, reajuste: 8.6, interes: 31.18, gastos: 12.0 },
  { anio: '2024', unidad: 'T2G-418', cuota: '1', tributo: 'PATRIMONIO VEHICULAR', fase: 'Coactiva', insoluto: 614.0, reajuste: 48.2, interes: 182.44, gastos: 96.0 },
];

export type Tasa = { partida: string; concepto: string; area: string; cant: number; precio: number };

/** Los conceptos del TUPA: no son deuda de la cuenta corriente, se cobran en
 *  el acto y el recibo es el comprobante del trámite. */
export const TASAS: Tasa[] = [
  { partida: '1.3.2.5.2.2', concepto: 'INSPECCIÓN OCULAR', area: 'Fiscalización', cant: 1, precio: 88.4 },
  { partida: '1.3.2.10.1.99', concepto: 'CONSTANCIA DE NO ADEUDO', area: 'Rentas', cant: 1, precio: 18.0 },
  { partida: '1.3.2.10.1.99', concepto: 'COPIA CERTIFICADA DE FICHA', area: 'Catastro', cant: 2, precio: 12.0 },
  { partida: '1.3.2.9.1.6', concepto: 'DERECHO DE ANUNCIO Y PROPAGANDA', area: 'Comercialización', cant: 1, precio: 412.0 },
];

export type ClaveDeMedio = 'efectivo' | 'tarjeta' | 'deposito' | 'linea';
export type Medio = { k: ClaveDeMedio; label: string; sistema: number };

/** Lo que el sistema registró en el turno, por medio de pago. El arqueo compara
 *  contra esto y la diferencia se calcula, no se declara. */
export const MEDIOS: Medio[] = [
  { k: 'efectivo', label: 'Efectivo', sistema: 12418.4 },
  { k: 'tarjeta', label: 'Tarjeta de débito o crédito', sistema: 4120.0 },
  { k: 'deposito', label: 'Depósito en cuenta', sistema: 8940.6 },
  { k: 'linea', label: 'Pago en línea', sistema: 2214.3 },
];

/** Lo que el arqueo trae declarado al abrir la pantalla. El pago en línea no
 *  cuadra a propósito: el arqueo tiene que enseñar la diferencia. */
export const ARQUEO_INICIAL: Record<ClaveDeMedio, string> = {
  efectivo: '12418.40',
  tarjeta: '4120.00',
  deposito: '8940.60',
  linea: '2100.00',
};

/** Nº convenio · contribuyente · fecha · deuda acogida · cuotas · pagadas ·
 *  vencidas · saldo · estado. */
export type FilaDeConvenio = [string, string, string, string, string, string, string, string, string];

export const CONVENIOS: FilaDeConvenio[] = [
  ['CONV-2026-00412', 'CASTILLO PASCUALA, MARÍA E.', '12/08/2026', '262.16', '6', '1', '0', '231.03', 'Vigente'],
  ['CONV-2026-00388', 'DÍAZ MADRID, JULIO CÉSAR', '04/06/2026', '9,412.15', '12', '2', '2', '7,844.10', 'En riesgo'],
  ['CONV-2025-00944', 'REYES CHUNGA, PEDRO', '18/09/2025', '3,180.00', '6', '6', '0', '0.00', 'Cumplido'],
  ['CONV-2025-00812', 'INVERSIONES DEL NORTE SAC', '02/04/2025', '18,412.00', '24', '3', '5', '16,102.40', 'Quebrado'],
];

export const ESTADOS_DE_CONVENIO = ['Todos', 'Vigente', 'En riesgo', 'Cumplido', 'Quebrado'];

export type Recibo = {
  numero: string;
  fecha: string;
  hora: string;
  contribuyente: string;
  concepto: string;
  importe: string;
  dup: string;
  estado: string;
  medio: string;
};

export const RECIBOS: Recibo[] = [
  { numero: '0003-0041182', fecha: '12/08/2026', hora: '09:14', contribuyente: 'CASTILLO PASCUALA, MARÍA ELENA', concepto: 'Impuesto predial cuotas 1 y 2', importe: '301.80', dup: '1', estado: 'Emitido', medio: 'EFECTIVO' },
  { numero: '0003-0041183', fecha: '12/08/2026', hora: '09:22', contribuyente: 'QUIROGA RAMOS, ELEODORO', concepto: 'Arbitrios 2026', importe: '437.40', dup: '0', estado: 'Emitido', medio: 'TARJETA' },
  { numero: '0003-0041184', fecha: '12/08/2026', hora: '09:41', contribuyente: 'DÍAZ MADRID, JULIO CÉSAR', concepto: 'Impuesto de alcabala — expediente 2026-0918', importe: '1,245.00', dup: '0', estado: 'Anulado', medio: 'DEPÓSITO EN CUENTA' },
];

/** Tributo · emitido · recaudado · saldo · % de avance. Las tres cifras van
 *  ya formateadas porque el artboard las escribe así: son de un reporte. */
export type FilaDeAvance = [string, string, string, string, number];

export const AVANCE: FilaDeAvance[] = [
  ['IMPUESTO PREDIAL', '9,418,204.60', '8,420,118.40', '998,086.20', 89.4],
  ['ARBITRIOS MUNICIPALES', '5,884,110.20', '5,112,440.80', '771,669.40', 86.9],
  ['PATRIMONIO VEHICULAR', '2,884,000.00', '1,882,400.00', '1,001,600.00', 65.3],
  ['ALCABALA', '1,420,880.00', '1,420,880.00', '0.00', 100.0],
  ['MULTAS Y PAPELETAS', '4,118,200.00', '1,588,412.00', '2,529,788.00', 38.6],
];

/** Partida · concepto · área generadora · recaudado. */
export type FilaDeArea = [string, string, string, string];

export const POR_AREA: FilaDeArea[] = [
  ['1.1.2.1.1.1', 'IMPUESTO PREDIAL', 'UNIDAD DE RENTAS', '8,420,118.40'],
  ['1.3.3.9.2.23', 'LIMPIEZA PÚBLICA', 'UNIDAD DE RENTAS', '2,884,116.20'],
  ['1.3.3.9.2.27', 'PARQUES Y JARDINES', 'UNIDAD DE RENTAS', '1,182,440.60'],
  ['1.3.3.9.2.24', 'SERENAZGO', 'UNIDAD DE RENTAS', '1,045,884.00'],
  ['1.1.5.3.1.99', 'OTRAS MULTAS', 'SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', '412,844.00'],
  ['1.3.2.5.2.2', 'INSPECCIÓN OCULAR', 'SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA', '88,412.00'],
];

/** Las cuatro cifras del panel del turno. Van literales: el artboard no las
 *  deriva de ninguna tabla. */
export const KPIS: { valor: string; etiqueta: string; nota: string }[] = [
  { valor: '148', etiqueta: 'Recibos emitidos hoy', nota: 'Uno cada 2 minutos y 14 segundos de turno.' },
  { valor: '3', etiqueta: 'Recibos anulados', nota: 'Solo se pueden anular mientras la caja siga abierta.' },
  { valor: '77.6 %', etiqueta: 'Avance del ejercicio', nota: 'S/ 18.42 M recaudados de S/ 23.73 M emitidos.' },
  { valor: '141', etiqueta: 'Convenios en riesgo', nota: 'Con una cuota vencida. A la segunda se quiebran.' },
];

/** Las diez opciones del manual que el módulo resume, y el destino de cada
 *  una. Es lo que alimenta la paleta de comandos. */
export const OPCIONES: [string, string][] = [
  ['Caja tributaria', 'cobrar'],
  ['Caja de tasas', 'cobrar'],
  ['Fraccionamiento', 'convenios'],
  ['Convenios', 'convenios'],
  ['Anulación de convenio', 'convenios'],
  ['Duplicado de recibo', 'recibos'],
  ['Anulación de recibo', 'recibos'],
  ['Cierre de caja', 'cierre'],
  ['Avance de recaudación', 'recaudacion'],
  ['Recaudación por área', 'recaudacion'],
];

/** El sujeto que la barra de contexto enseña en «Cobrar» y en «Convenios». */
export const CONTRIBUYENTE = {
  codigo: '00000003541',
  nombre: 'CASTILLO PASCUALA, MARÍA ELENA',
  documento: 'DNI 44218937',
  direccion: 'CALLE LAMA 482',
};

/** La deuda que el simulador de fraccionamiento acoge, y el interés mensual
 *  del convenio. */
export const FRACCIONAMIENTO = { deuda: 262.16, tasaMes: 0.008, gastoPorCuota: 1.0, convenio: 'CONV-2026-00412' };
