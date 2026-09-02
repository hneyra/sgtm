/* Datos de muestra del panel de inicio, copiados literalmente del artboard
   `Inicio.dc.html`. Nada de esto viaja a ningún backend: es la maqueta. */

export type Obligacion = {
  concepto: string;
  unidad: string;
  insoluto: number;
  interes: number;
  gastos: number;
  vence: string;
  estado: string;
};

/** La deuda del contribuyente, con sus componentes. El beneficio alcanza al
 *  interés y no a los gastos ni a las costas. */
export const DEUDA: Obligacion[] = [
  { concepto: 'Impuesto predial 2026 · cuotas 3 y 4', unidad: '02-014-D-14-01', insoluto: 293.72, interes: 0, gastos: 0, vence: 'Vence 31/08/2026', estado: 'Por vencer' },
  { concepto: 'Arbitrios 2026 · cuotas 1 a 8', unidad: '02-014-D-14-01', insoluto: 291.6, interes: 18.44, gastos: 0, vence: 'Vencida el 31/07/2026', estado: 'Vencida' },
  { concepto: 'Impuesto predial 2024 · cuotas 1 a 4', unidad: '02-014-D-14-01', insoluto: 1842.6, interes: 212.44, gastos: 12.0, vence: 'Vencida el 30/11/2024', estado: 'Vencida' },
  { concepto: 'Patrimonio vehicular 2024 · cuota 1', unidad: 'T2G-418', insoluto: 614.0, interes: 182.44, gastos: 96.0, vence: 'En cobranza coactiva', estado: 'En coactiva' },
];

/** Las unidades del contribuyente. `predio` y `pct` no son decoración: de ellas
 *  depende si puede acogerse a la deducción de pensionista, que exige predio
 *  único destinado a vivienda. */
export const UNIDADES = [
  { codigo: '02-014-D-14-01', predio: true, pct: 100, titulo: 'Casa habitación · CALLE SANTA ROSA 116', detalle: '210.00 m² de terreno · 164.50 m² construidos · usted es propietaria al 100 %', valor: 'Autovalúo S/ 132,196.75' },
  { codigo: '04-021-B-07-00', predio: true, pct: 50, titulo: 'Terreno sin construir · MZ. B LT. 7 — BELLAVISTA', detalle: '184.00 m² de terreno · usted es copropietaria al 50 %', valor: 'Autovalúo S/ 38,420.00' },
  { codigo: 'T2G-418', predio: false, pct: 100, titulo: 'Automóvil · TOYOTA YARIS GLI 2018', detalle: 'Afecto de 2019 a 2021 · dado de baja por vencimiento del plazo', valor: 'Base S/ 61,400.00' },
];

/** Lo que no entra, por módulo, con lo que lo desbloquea. */
export const PARADO: [string, 'warn' | 'bad', string, string, number, number, string][] = [
  ['Tránsito', 'bad', '1,842 papeletas caducadas sin notificar', 'Levantadas y nunca notificadas: ya no se pueden cobrar. Cada mes se suman más.', 1842, 788976.0, 'transito'],
  ['Valores', 'bad', '412 valores emitidos y sin notificar', 'Existen, no cobran, y el reloj de prescripción les corre igual.', 412, 184412.0, 'valores'],
  ['Coactiva', 'bad', '388 expedientes importados sin REC', 'El expediente está abierto y el procedimiento no ha empezado.', 388, 162844.0, 'coactiva'],
  ['Fiscalización', 'warn', '61 actas con diferencia sin emitir', 'La deuda omitida está determinada y no está en la cuenta corriente.', 61, 214882.4, 'fiscalizacion'],
  ['Autorizaciones', 'warn', '42 solicitudes con el plazo agotado', 'Quedan otorgadas por silencio positivo si nadie resuelve.', 42, 0, 'licencias'],
  ['Catastro', 'warn', '208 predios sin conciliar con rentas', 'Tienen ficha catastral y no generan deuda predial.', 208, 0, 'catastro'],
];

/* `AVANCE` se ha ido. Eran cinco tributos con su emitido y su recaudado —«9 418
   204,60» de predial— de la maqueta del prototipo, cinco pares de cifras que
   ninguna lectura habia calculado. Se fue cuando el panel paso a leer del
   backend: las cifras y sus barras salen de `/indicadores/recaudacion`, que las
   compone en el motor y no aqui (RNF-083). */

export const PAGOS = [
  { fecha: '12/08/2026', concepto: 'Impuesto predial 2026 · cuotas 1 y 2', monto: 301.8, recibo: '0003-0041182' },
  { fecha: '28/05/2026', concepto: 'Arbitrios 2025', monto: 412.0, recibo: '0003-0038944' },
  { fecha: '18/02/2025', concepto: 'Impuesto predial 2025 · cuotas 1 a 4', monto: 578.2, recibo: '0003-0034118' },
];
