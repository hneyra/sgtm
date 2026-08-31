/* Datos de muestra de Coactiva, copiados literalmente del artboard
   `Coactiva.dc.html`. Nada de esto viaja a ningún backend: es la maqueta.
   El acrónimo de los documentos es `MDC` —Municipalidad Distrital de
   Catacaos—, no el `MPS` que el artboard escribía. */

/** Los actos del procedimiento, con su coste tasado. Es lo que hace crecer la
 *  deuda del obligado y lo que el expediente tiene que decir antes de dictar. */
export const TASA_ACTOS = {
  importacion: { label: 'Importación del valor', costo: 0 },
  rec: { label: 'Resolución de ejecución coactiva', costo: 17.75 },
  notificacion: { label: 'Notificación de acto coactivo', costo: 8.4 },
  embargo: { label: 'Resolución de medida cautelar', costo: 42.6 },
  convenio: { label: 'Convenio de fraccionamiento coactivo', costo: 24.0 },
  tasacion: { label: 'Tasación y remate', costo: 184.0 },
  levantamiento: { label: 'Levantamiento de medida', costo: 12.0 },
} as const;

export type TipoDeActo = keyof typeof TASA_ACTOS;

/** Qué actos lleva dictados un expediente según su estado. De aquí sale el
 *  historial, la liquidación de costas y el total de costas del expediente:
 *  escritos a mano, las tres pestañas de actos no cuadraban con la cabecera. */
export const ACTOS_POR_ESTADO: Record<string, TipoDeActo[]> = {
  'Importado sin REC': ['importacion'],
  'REC sin notificar': ['importacion', 'rec'],
  'REC notificada': ['importacion', 'rec', 'notificacion'],
  'Con medida cautelar': ['importacion', 'rec', 'notificacion', 'notificacion', 'embargo'],
  Fraccionado: ['importacion', 'rec', 'notificacion', 'convenio'],
  Concluido: ['importacion', 'rec', 'notificacion', 'embargo', 'levantamiento', 'tasacion'],
};

export type Expediente = {
  numero: string;
  anio: number;
  obligado: string;
  doc: string;
  tributo: string;
  deuda: number;
  recaudo: string;
  desde: string;
  estado: string;
  medida: string;
};

/** Los expedientes de la cartera. `costas` es lo acumulado por los actos ya
 *  dictados; el saldo se compone, no se escribe. */
export const EXPEDIENTES: Expediente[] = [
  { numero: '0000001201', anio: 2008, obligado: 'SANTIAGO MOSCOL, GASPAR', doc: 'DNI 03593174', tributo: 'PREDIAL, SERENAZGO', deuda: 186.48, recaudo: '0000000003', desde: '19/05/2026', estado: 'REC notificada', medida: '' },
  { numero: '0000000907', anio: 2010, obligado: 'SANTIAGO MOSCOL, GASPAR', doc: 'DNI 03593174', tributo: 'PREDIAL — FISCALIZACIÓN', deuda: 1842.6, recaudo: '0000000418', desde: '13/08/2026', estado: 'REC sin notificar', medida: '' },
  { numero: '0000004841', anio: 2025, obligado: 'CASTILLO PASCUALA, MARÍA ELENA', doc: 'DNI 44218937', tributo: 'PATRIMONIO VEHICULAR', deuda: 940.64, recaudo: '0000001403', desde: '20/12/2025', estado: 'Con medida cautelar', medida: 'Retención bancaria' },
  { numero: '0000005687', anio: 2010, obligado: 'INFANTE CARCELÉN, RAÚL', doc: 'DNI 02867895', tributo: 'PREDIAL, SERENAZGO', deuda: 344.68, recaudo: '0000000944', desde: '10/03/2026', estado: 'Con medida cautelar', medida: 'Inscripción de predio' },
  { numero: '0000003852', anio: 2009, obligado: 'SUC. TOMÁS MAZA GÓMEZ', doc: '—', tributo: 'PREDIAL', deuda: 333.58, recaudo: '0000000812', desde: '04/08/2026', estado: 'Importado sin REC', medida: '' },
  { numero: '0000001096', anio: 2010, obligado: 'CALDERÓN ESLAVA, JUAN ALBERTO', doc: 'DNI 03421886', tributo: 'ARBITRIOS', deuda: 743.44, recaudo: '0000000638', desde: '21/05/2026', estado: 'Fraccionado', medida: '' },
  { numero: '0000000538', anio: 2010, obligado: 'ENCALADA VERA, LIDIO ALBERTO', doc: 'DNI 03844112', tributo: 'PREDIAL', deuda: 482.4, recaudo: '0000000244', desde: '15/01/2026', estado: 'Concluido', medida: '' },
];

export type Acto = {
  n: string;
  tipo: TipoDeActo;
  label: string;
  fecha: string;
  doc: string;
  costo: number;
};

/** Los actos dictados de un expediente, con su fecha y su coste. La suma de
 *  costas del expediente **es** esta lista: no hay una cifra aparte. */
export function actosDe(e: Expediente): Acto[] {
  const clave = ACTOS_POR_ESTADO[e.estado] || ['importacion'];
  const partes = e.desde.split('/');
  const base = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
  let visita = 0;
  return clave.map((k, i) => {
    const f = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i * 9);
    const fecha =
      String(f.getDate()).padStart(2, '0') + '/' + String(f.getMonth() + 1).padStart(2, '0') + '/' + f.getFullYear();
    if (k === 'notificacion') visita++;
    const doc = {
      importacion: 'Recaudo ' + e.recaudo,
      rec: 'REC 01 — ' + e.recaudo,
      notificacion: 'Cargo de notificación · visita ' + visita,
      embargo: 'Res. de embargo — ' + e.medida,
      convenio: 'Convenio coactivo CONV-' + e.numero.slice(-4),
      levantamiento: 'Res. de levantamiento',
      tasacion: 'Acta de tasación',
    }[k];
    return { n: String(i + 1), tipo: k, label: TASA_ACTOS[k].label, fecha, doc, costo: TASA_ACTOS[k].costo };
  });
}

export type ValorPendiente = {
  numero: string;
  tipo: string;
  anio: number;
  obligado: string;
  monto: number;
  firme: boolean;
};

/** Lo que Valores tiene firme y todavía no ha entrado en un expediente. */
export const VALORES_PENDIENTES: ValorPendiente[] = [
  { numero: '0000000726', tipo: 'ORDEN DE PAGO — PREDIAL', anio: 2025, obligado: 'GONZALES ÁVILA, PASCUAL', monto: 44.61, firme: true },
  { numero: '0000000727', tipo: 'ORDEN DE PAGO — PREDIAL', anio: 2025, obligado: 'GONZALES ÁVILA, PASCUAL', monto: 40.62, firme: true },
  { numero: '0000000728', tipo: 'ORDEN DE PAGO — PREDIAL', anio: 2025, obligado: 'GONZALES ÁVILA, PASCUAL', monto: 29.88, firme: true },
  { numero: '0000000418', tipo: 'RES. DE DETERMINACIÓN', anio: 2022, obligado: 'INVERSIONES DEL NORTE SAC', monto: 1842.6, firme: false },
];

/** La cartera contada por estado. La tarjeta del panel sale de aquí: escrita a
 *  mano, la tarjeta y la bandeja daban cifras distintas para lo mismo.
 *  [estado, tono, título, detalle, expedientes, saldo] */
export const BANDEJA: [string, 'ok' | 'warn' | 'bad', string, string, number, number][] = [
  ['Importado sin REC', 'bad', 'Importados y sin resolución', 'El expediente existe y el procedimiento no ha empezado. Sin REC no se puede notificar nada.', 388, 162844.0],
  ['REC sin notificar', 'bad', 'Con REC emitida y sin notificar', 'Las costas ya se cargaron al obligado y el procedimiento está detenido.', 214, 98412.0],
  ['REC notificada', 'ok', 'REC notificada, en plazo', 'Siete días hábiles para pagar antes de poder trabar medida cautelar.', 1842, 604118.0],
  ['Con medida cautelar', 'warn', 'Con medida cautelar trabada', 'Retención bancaria, inscripción o secuestro. Hay que dar seguimiento al tercero.', 984, 412844.0],
  ['Fraccionado', 'warn', 'Con convenio coactivo vigente', 'Suspendido mientras se pague. Dos cuotas impagas lo reactivan.', 542, 184412.0],
  ['Concluido', 'ok', 'Concluidos', 'Pagados, prescritos o dejados sin efecto. Solo se consultan.', 212, 68412.0],
];

/** Las costas que la cartera lleva cargadas. Es también lo que el flujo del
 *  ejercicio suma por «costas del procedimiento». */
export const COSTAS_DE_LA_CARTERA = 184412.0;

export type LineaDeFlujo = {
  signo: string;
  label: string;
  detalle: string;
  monto: number;
  tono: 'neutro' | 'warn' | 'ok';
};

/** El movimiento del ejercicio: lo que entró, lo que se cargó, lo que se cobró
 *  y lo que se dio de baja. No es la cartera acumulada. */
export const FLUJO: LineaDeFlujo[] = [
  { signo: '+', label: 'Valores importados de Valores', detalle: '1,842 valores firmes recibidos en el ejercicio', monto: 1284116.0, tono: 'neutro' },
  { signo: '+', label: 'Costas del procedimiento', detalle: 'RECs, notificaciones, medidas y liquidaciones dictadas', monto: 184412.0, tono: 'warn' },
  { signo: '−', label: 'Cobrado en caja', detalle: 'Pagos aplicados a expedientes coactivos', monto: 412844.0, tono: 'ok' },
  { signo: '−', label: 'Dejado sin efecto', detalle: 'Prescripciones declaradas y resoluciones que anulan el valor', monto: 41284.0, tono: 'ok' },
];

export const KPIS: { valor: string; etiqueta: string; nota: string }[] = [
  { valor: '4,182', etiqueta: 'Expedientes en cartera', nota: 'Uno por obligado y por lote de valores importados.' },
  { valor: '9.3 %', etiqueta: 'Importados sin REC', nota: '388 expedientes abiertos y sin procedimiento iniciado.' },
  { valor: 'S/ 184 K', etiqueta: 'Costas cargadas', nota: 'El 12 % del saldo en cobranza es coste del procedimiento.' },
  { valor: '984', etiqueta: 'Con medida cautelar', nota: 'Cada una necesita seguimiento con el tercero requerido.' },
];

export type ObligacionCoactiva = {
  anio: string;
  unidad: string;
  cuota: string;
  tributo: string;
  insoluto: number;
  interes: number;
  gastos: number;
  costas: number;
};

/** La deuda que está en cobranza coactiva, con sus costas. */
export const DEUDA_COACTIVA: ObligacionCoactiva[] = [
  { anio: '2019', unidad: '20060100567032', cuota: '1-4', tributo: 'PREDIAL', insoluto: 482.4, interes: 388.12, gastos: 84.0, costas: 208.75 },
  { anio: '2020', unidad: '20060100567032', cuota: '1-12', tributo: 'ARBITRIOS', insoluto: 412.0, interes: 331.44, gastos: 0, costas: 130.1 },
  { anio: '2024', unidad: 'T2G-418', cuota: '1', tributo: 'PATRIMONIO VEHICULAR', insoluto: 614.0, interes: 182.44, gastos: 96.0, costas: 68.75 },
  { anio: '2022', unidad: '02-014-D-14-01', cuota: '1-4', tributo: 'PREDIAL — FISCALIZACIÓN', insoluto: 1842.6, interes: 0, gastos: 0, costas: 26.15 },
];

/** Los valores del expediente: la tabla de la pestaña «Expediente». */
export const VALORES_DEL_EXPEDIENTE: string[][] = [
  ['0000000726', 'ORDEN DE PAGO — PREDIAL', '2025', '38.20', '4.41', '2.00', '44.61'],
  ['0000000727', 'ORDEN DE PAGO — PREDIAL', '2025', '34.80', '3.82', '2.00', '40.62'],
  ['0000000728', 'ORDEN DE PAGO — PREDIAL', '2025', '25.60', '2.28', '2.00', '29.88'],
];

/** Las doce opciones del manual que el módulo resume, para la paleta.
 *  El segundo campo es el destino; `expediente` vuelve a la lista. */
export const OPCIONES: [string, string][] = [
  ['Expedientes coactivos', 'lista'],
  ['Importación de valores', 'importacion'],
  ['Proceso coactivo', 'expediente'],
  ['Impresión de REC', 'expediente'],
  ['Historial del expediente', 'expediente'],
  ['Cambiar dirección referencial', 'expediente'],
  ['Liquidación de costas', 'expediente'],
  ['Fraccionamiento coactivo', 'expediente'],
  ['Actos coactivos', 'expediente'],
  ['Notificaciones coactivas', 'expediente'],
  ['Consulta de deudas', 'deuda'],
  ['Deudas en beneficio', 'deuda'],
];
