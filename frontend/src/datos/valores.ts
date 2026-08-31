/* Datos de muestra de Valores, copiados literalmente del artboard
   `Valores.dc.html`. Nada de esto viaja a ningún backend: es la maqueta.
   El acrónimo de los documentos es `MDC` —Municipalidad Distrital de
   Catacaos—, no el `MPS` que el artboard escribía. */

export type Valor = {
  numero: string;
  tipo: string;
  contribuyente: string;
  anioDeuda: number;
  emitido: string;
  notificado: string;
  monto: number;
  enCoactiva?: boolean;
  firme?: boolean;
};

/** Los valores emitidos. `anioDeuda` es lo que decide la prescripción: el
 *  conteo empieza el 1 de enero siguiente a ese ejercicio, no a la emisión. */
export const VALORES: Valor[] = [
  { numero: '0000000728', tipo: 'ORDEN DE PAGO — PREDIAL', contribuyente: 'GONZALES ÁVILA, PASCUAL', anioDeuda: 2025, emitido: '09/10/2025', notificado: '', monto: 195.98 },
  { numero: '0000000726', tipo: 'ORDEN DE PAGO — PREDIAL', contribuyente: 'ÁLAMO VDA. DE ASTUDILLO, JUANA', anioDeuda: 2025, emitido: '07/10/2025', notificado: '14/10/2025', monto: 44.61 },
  { numero: '0000001403', tipo: 'RES. EJECUCIÓN COACTIVA', contribuyente: 'AGROINDUSTRIAL S.R.L.', anioDeuda: 2022, emitido: '13/08/2025', notificado: '20/08/2025', enCoactiva: true, monto: 940.64 },
  /* Deuda de 2022 con el valor emitido en 2026: el caso que el pie de la tabla
     describe —un valor nuevo sobre deuda vieja nace con poco tiempo—. Conteo
     desde el 01/01/2023, prescribe el 01/01/2027. */
  { numero: '0000000418', tipo: 'RES. DE DETERMINACIÓN — FISCALIZACIÓN', contribuyente: 'INVERSIONES DEL NORTE SAC', anioDeuda: 2022, emitido: '13/08/2026', notificado: '', monto: 1842.6 },
  { numero: '0000000006', tipo: 'RES. DE MULTA — LICENCIA', contribuyente: 'MOLINO CATACAOS', anioDeuda: 2020, emitido: '31/03/2024', notificado: '19/05/2024', firme: true, monto: 412.0 },
  { numero: '0000003985', tipo: 'ORDEN DE PAGO — ARBITRIOS', contribuyente: 'ENCALADA VERA, LIDIO ALBERTO', anioDeuda: 2019, emitido: '19/01/2024', notificado: '', monto: 992.64 },
];

/** Los recaudos que componen un valor: la tabla de la pestaña «El valor». */
export const RECAUDOS: string[][] = [
  ['0000000006', '2021', '000418', 'PREDIAL — FISCALIZACIÓN', '2,062.00', '618.60', '2,680.60'],
  ['0000000007', '2022', '000418', 'PREDIAL — FISCALIZACIÓN', '2,230.00', '556.00', '2,786.00'],
  ['0000000008', '2023', '000418', 'PREDIAL — FISCALIZACIÓN', '2,378.00', '441.00', '2,819.00'],
];

export type Prescripcion = {
  pct: number;
  vencido: boolean;
  meses: number;
  texto: string;
  fin: string;
};

/** El reloj: cuatro años desde el 1 de enero siguiente al ejercicio de la
 *  deuda. La notificación interrumpe y reinicia; sin ella, el conteo corre.
 *  El «hoy» del artboard es el 13 de agosto de 2026. */
export function prescripcionDe(v: { anioDeuda: number; notificado: string }): Prescripcion {
  const HOY = new Date(2026, 7, 13);
  const inicio = new Date(v.anioDeuda + 1, 0, 1);
  const base = v.notificado
    ? new Date(Number('20' + v.notificado.slice(8, 10)), Number(v.notificado.slice(3, 5)) - 1, Number(v.notificado.slice(0, 2)))
    : inicio;
  const fin = new Date(base.getFullYear() + 4, base.getMonth(), base.getDate());
  const totalMs = fin.getTime() - base.getTime();
  const transcurridoMs = HOY.getTime() - base.getTime();
  const pct = Math.max(Math.min((transcurridoMs / totalMs) * 100, 100), 0);
  const mesesRestantes = Math.round((fin.getTime() - HOY.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  return {
    pct,
    vencido: mesesRestantes <= 0,
    meses: mesesRestantes,
    texto:
      mesesRestantes <= 0
        ? 'Prescrito'
        : mesesRestantes < 12
          ? 'Prescribe en ' + mesesRestantes + (mesesRestantes === 1 ? ' mes' : ' meses')
          : 'Prescribe en ' + Math.floor(mesesRestantes / 12) + (Math.floor(mesesRestantes / 12) === 1 ? ' año' : ' años'),
    fin: String(fin.getDate()).padStart(2, '0') + '/' + String(fin.getMonth() + 1).padStart(2, '0') + '/' + fin.getFullYear(),
  };
}

/** Los valores contados por etapa. La bandeja del panel: cada fila lleva a la
 *  lista con su filtro puesto.
 *  [etapa, tono, título, detalle, valores, importe, filtro] */
export const BANDEJA: [string, 'ok' | 'warn' | 'bad', string, string, number, number, string][] = [
  ['Emitido sin notificar', 'bad', 'Emitidos y sin notificar', 'Existen pero no cobran, y el reloj de prescripción les corre igual.', 412, 184412.0, 'Emitido sin notificar'],
  ['Notificado en plazo', 'ok', 'Notificados, dentro del plazo', 'El contribuyente puede pagar o reclamar. Nada que hacer todavía.', 1844, 788976.0, 'Notificado en plazo'],
  ['Firme sin pase', 'warn', 'Firmes y sin pase a coactiva', 'Vencidos y sin impugnar. Se pueden cobrar coactivamente y no se han remitido.', 388, 162844.0, 'Firme sin pase'],
  ['En coactiva', 'ok', 'En cobranza coactiva', 'Remitidos al ejecutor. El seguimiento es del módulo de Coactiva.', 1450, 604118.0, 'En coactiva'],
  ['Prescrito', 'bad', 'Con prescripción cumplida', 'Pasaron cuatro años sin acto que interrumpa. Se declaran y se extinguen.', 88, 41284.0, 'Prescrito'],
];

/** Los cuatro ejercicios del reloj, con cuántos valores y cuánto importe
 *  tiene cada uno. La barra y el plazo se calculan; esto es el censo. */
export const EJERCICIOS_DEL_RELOJ = [2019, 2020, 2021, 2022];
export const CONTEOS: Record<number, number> = { 2019: 88, 2020: 142, 2021: 214, 2022: 388 };
export const MONTOS: Record<number, number> = { 2019: 41284.0, 2020: 68412.0, 2021: 102844.0, 2022: 184412.0 };

export const KPIS: { valor: string; etiqueta: string; nota: string }[] = [
  { valor: '4,182', etiqueta: 'Valores emitidos', nota: 'Sobre 62,418 cuentas del padrón.' },
  { valor: '9.9 %', etiqueta: 'Emitidos sin notificar', nota: '412 valores que existen y no cobran.' },
  { valor: 'S/ 41 K', etiqueta: 'Prescritos sin declarar', nota: '88 valores. Siguen figurando como deuda cobrable y no lo son.' },
  { valor: '20 días', etiqueta: 'Plazo para reclamar', nota: 'Hábiles, desde la notificación. Antes de eso el valor no es firme.' },
];

/** La deuda que entra en el valor individual. */
export const DEUDA_DEL_VALOR: string[][] = [
  ['2021', 'PREDIAL — FISCALIZACIÓN', '02-014-D-14-01', '2,062.00', '618.60', '2,680.60'],
  ['2022', 'PREDIAL — FISCALIZACIÓN', '02-014-D-14-01', '2,230.00', '556.00', '2,786.00'],
  ['2023', 'PREDIAL — FISCALIZACIÓN', '02-014-D-14-01', '2,378.00', '441.00', '2,819.00'],
];

/** La simulación del lote: cada fila es una exclusión que el criterio decidió. */
export const SIMULACION_DEL_LOTE: string[][] = [
  ['Deuda vencida del ejercicio', '18,412', '3,842,116.00', '—', '—'],
  ['Con deuda mínima o más', '14,884', '3,788,412.00', '3,528', 'Deuda menor a S/ 50.00'],
  ['Sin convenio vigente', '13,042', '3,412,844.00', '1,842', 'Deuda acogida a fraccionamiento'],
  ['Sin valor previo del mismo tipo', '12,884', '3,384,116.00', '158', 'Ya tienen orden de pago emitida'],
  ['Valores a emitir', '12,884', '3,384,116.00', '5,528', 'Total excluidas'],
];

/** El historial de movimientos del valor. */
export const MOVIMIENTOS: string[][] = [
  ['1', 'Generado', '13/08/2026', 'Emisión del valor por el criterio 00000007891', 'MRIOS'],
];

/** La deuda con prescripción cumplida que se declara y se extingue.
 *  [contribuyente, nombre, ejercicio, concepto, valor, conteo desde, importe] */
export const PRESCRITAS: [string, string, string, string, string, string, number][] = [
  ['00000003542', 'SANTIAGO MOSCOL, GASPAR', '2019', 'PREDIAL 1-4', '0000003985', '01/01/2024', 992.64],
  ['00000019535', 'CALDERÓN ESLAVA, JUAN ALBERTO', '2018', 'ARBITRIOS 1-12', '0000003844', '01/01/2023', 743.44],
  ['00000041313', 'RUGEL MEDINA, CÉSAR', '2020', 'PREDIAL 1-4', '0000004118', '01/01/2025', 482.4],
];

/** Las seis opciones del manual que el módulo resume, para la paleta.
 *  El segundo campo es el destino; `valor` vuelve a la lista. */
export const OPCIONES: [string, string][] = [
  ['Valor individual', 'emision'],
  ['Valores masivos', 'emision'],
  ['Mantenimiento de valores', 'lista'],
  ['Notificación de valores', 'valor'],
  ['Prescripción', 'prescripcion'],
  ['Pase de valores a coactiva', 'valor'],
];
