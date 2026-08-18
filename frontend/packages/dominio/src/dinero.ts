/**
 * Importes y fechas: las reglas 1 y 9 de CLAUDE.md, vistas desde el cliente.
 *
 * 1. Un importe es `string`, nunca `number`. En JavaScript `number` es punto
 *    flotante y `0.1 + 0.2 !== 0.3`; en un sistema de deuda pública eso es
 *    inaceptable (RNF-055).
 * 2. La interfaz NO hace aritmética con importes (RNF-083). Este módulo
 *    formatea: no suma, no resta, no aplica alicuotas. Si hace falta un total,
 *    lo entrega el backend.
 * 3. Toda cifra de deuda se muestra con la fecha a la que esta actualizada
 *    (RNF-075): no existe «la deuda», existe la deuda a una fecha.
 *
 * Por eso aqui no existe `sumar`, `restar` ni `total`: su ausencia es
 * intencional, y quien la eche de menos esta a punto de romper RNF-083.
 */

/** Importe decimal tal como llega de la API: `"1240.50"`, `"-32.10"`, `"0.00"`. */
export type Importe = string;

/** Fecha tributaria, sin hora ni zona: `"2026-08-13"`. Un vencimiento no tiene hora. */
export type Fecha = string;

/** Separador de millares. Espacio fino: `S/ 1 240,50`. */
const SEPARADOR_MILLARES = ' ';
const SIMBOLO = 'S/';
/** Lo que se muestra cuando no hay cifra. Nunca una cadena vacia ni un cero inventado. */
const SIN_VALOR = '—';

/**
 * `"1240.5"` → `"S/ 1 240,50"`.
 *
 * Trabaja sobre el texto del importe y no lo convierte a `number` en ningun
 * momento: convertirlo perderia centimos en cifras grandes, que es exactamente
 * lo que un padron municipal produce.
 */
export function formatearImporte(valor: Importe): string {
  const texto = valor.trim();
  if (texto === '') return SIN_VALOR;

  const negativo = texto.startsWith('-');
  const sinSigno = negativo ? texto.slice(1) : texto;
  const [enteroCrudo = '0', decimalCrudo = ''] = sinSigno.split('.');

  const entero = enteroCrudo.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILLARES);
  const decimal = (decimalCrudo + '00').slice(0, 2);

  return `${negativo ? '-' : ''}${SIMBOLO} ${entero},${decimal}`;
}

/** `"2026-08-13"` → `"13/08/2026"`. Si no reconoce el formato, devuelve el valor sin tocar. */
export function formatearFecha(fecha: Fecha): string {
  const [anio, mes, dia] = fecha.split('T')[0]?.split('-') ?? [];
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}

/** `"2026-08-13T11:44:00Z"` → `"13/08/2026 11:44"`. */
export function formatearFechaHora(instante: string): string {
  const [fecha = '', resto = ''] = instante.split('T');
  const hora = resto.slice(0, 5);
  return hora ? `${formatearFecha(fecha)} ${hora}` : formatearFecha(fecha);
}
