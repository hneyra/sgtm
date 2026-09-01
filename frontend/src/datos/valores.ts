/**
 * Lo que el módulo de Valores necesita saber y no sale del backend: los rótulos
 * de sus columnas, las seis opciones del manual que resume y la prosa.
 *
 * **Ya no hay datos de muestra, y tampoco el reloj de prescripción escrito a
 * mano.** El artboard calculaba «cuatro años desde el 1 de enero siguiente» en
 * el navegador; ese plazo es una cifra normativa (regla 5) que vive en el
 * conjunto de parámetros sellado, y la interfaz no lo tiene ni puede leerlo
 * —`GET /seguridad/parametros` publica los conjuntos, no sus valores—. Quien lo
 * calcula es `POST /coactiva/prescripcion`, que devuelve el plazo aplicado y,
 * ejercicio por ejercicio, el inicio del cómputo y la fecha de prescripción.
 */

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColDef = [string, 0 | 1];

/** Lo que se escribe donde no hay dato. Una raya, nunca un cero ni un blanco. */
export const SIN_DATO = '—';

/* ══════════ La lista ══════════ */

export const COLS_LISTA: ColDef[] = [
  ['Nº valor', 0],
  ['Tipo', 0],
  ['Contribuyente', 0],
  ['Tributo', 0],
  ['Periodo', 0],
  ['Emitido', 0],
  ['Notificado', 0],
  ['Exigible desde', 0],
  ['Importe S/', 1],
  ['Situación', 0],
];

/**
 * Cómo se lee cada situación, y qué le falta.
 *
 * Las siete son las de `SituacionDelValor`, letra por letra. El prototipo
 * agrupaba en cinco etapas y una de ellas —«RECLAMADO»— no existe en el
 * dominio: pedirla devuelve 422, y por eso no está.
 */
export const SITUACIONES_EXPLICADAS: {
  k: 'EMITIDO' | 'NOTIFICADO' | 'EXIGIBLE' | 'COACTIVA' | 'PAGADO' | 'ANULADO' | 'PRESCRITO';
  label: string;
  tono: 'ok' | 'warn' | 'bad' | 'neutro';
  que: string;
}[] = [
  {
    k: 'EMITIDO',
    label: 'Emitido sin notificar',
    tono: 'bad',
    que: 'Existe y no cobra: hasta que se notifique no corre ningún plazo, y el cómputo de la prescripción sigue igual.',
  },
  {
    k: 'NOTIFICADO',
    label: 'Notificado, en plazo',
    tono: 'warn',
    que: 'El contribuyente puede pagar o reclamar. Nada que hacer todavía.',
  },
  {
    k: 'EXIGIBLE',
    label: 'Exigible (firme)',
    tono: 'warn',
    que: 'El plazo venció. Se puede cobrar coactivamente, y mientras no se pase, no se cobra. Es lo que el prototipo llama «firme».',
  },
  {
    k: 'COACTIVA',
    label: 'En cobranza coactiva',
    tono: 'neutro',
    que: 'Remitido al ejecutor. El seguimiento es del módulo de Coactiva.',
  },
  { k: 'PAGADO', label: 'Pagado', tono: 'ok', que: 'La deuda que formalizaba se cobró.' },
  { k: 'ANULADO', label: 'Anulado', tono: 'neutro', que: 'Un valor no se corrige: se anula y se emite otro (regla 4).' },
  {
    k: 'PRESCRITO',
    label: 'Prescrito',
    tono: 'bad',
    que: 'Declarado prescrito. La acción de cobro se extinguió.',
  },
];

/* ══════════ El expediente del valor ══════════ */

export type Pestania = 'valor' | 'notificacion' | 'movimientos';

export const PESTANIAS: { k: Pestania; label: string }[] = [
  { k: 'valor', label: 'El valor' },
  { k: 'notificacion', label: 'Notificación' },
  { k: 'movimientos', label: 'Movimientos' },
];

/* ══════════ Emisión ══════════ */

export const COLS_DEUDA_A_FORMALIZAR: ColDef[] = [
  ['', 0],
  ['Año', 0],
  ['Tributo', 0],
  ['Unidad', 0],
  ['Cuotas', 0],
  ['Fase', 0],
  ['Insoluto', 1],
  ['Reajuste', 1],
  ['Interés', 1],
  ['Gastos', 1],
  ['Total', 1],
];

/* ══════════ Prescripción ══════════ */

export const COLS_COMPUTO: ColDef[] = [
  ['Ejercicio', 0],
  ['Inicio del cómputo', 0],
  ['Inicio tras interrupciones', 0],
  ['Prescribe el', 0],
  ['Estado', 0],
];

/**
 * Las causales que el art. 45 y el 46 nombran, tal como las escribe la norma.
 *
 * El backend **no las valida contra una lista**: `HechoDelComputo.causal` es
 * texto libre porque es la cita que la resolución tiene que llevar. Estas son
 * sugerencias del desplegable, no un enumerado, y por eso el campo también
 * admite escribir otra.
 */
export const CAUSALES_SUGERIDAS: { clase: 'INTERRUPCION' | 'SUSPENSION'; causal: string }[] = [
  { clase: 'INTERRUPCION', causal: 'Notificación de la orden de pago o resolución de determinación' },
  { clase: 'INTERRUPCION', causal: 'Reconocimiento expreso de la obligación tributaria' },
  { clase: 'INTERRUPCION', causal: 'Pago parcial de la deuda' },
  { clase: 'INTERRUPCION', causal: 'Solicitud de fraccionamiento u otras facilidades de pago' },
  { clase: 'INTERRUPCION', causal: 'Notificación de la resolución de ejecución coactiva' },
  { clase: 'SUSPENSION', causal: 'Tramitación del procedimiento contencioso tributario' },
  { clase: 'SUSPENSION', causal: 'Tramitación de la demanda contencioso-administrativa' },
  { clase: 'SUSPENSION', causal: 'Procedimiento de fiscalización en curso' },
  { clase: 'SUSPENSION', causal: 'Suspensión del procedimiento de cobranza coactiva' },
];

/* ══════════ Paleta de comandos ══════════ */

/** Las seis opciones del manual que el módulo resume, con su destino. */
export const OPCIONES: [string, string][] = [
  ['Valor individual', 'emision'],
  ['Valores masivos', 'emision'],
  ['Mantenimiento de valores', 'lista'],
  ['Notificación de valores', 'lista'],
  ['Prescripción', 'prescripcion'],
  ['Pase de valores a coactiva', 'lista'],
];
