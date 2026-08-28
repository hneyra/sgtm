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

/**
 * Un texto puramente numerico: signo opcional, parte entera **sin ceros a la
 * izquierda** —salvo el propio «0»—, punto decimal opcional.
 *
 * La parte entera es la mitad que importa: un codigo catastral o un numero de
 * documento tambien son «solo digitos», y `00001182` con un cero a la
 * izquierda no es una cantidad de mil ciento ochenta y dos de nada — es un
 * identificador que la tiene por convencion. Agruparle los millares le
 * cambiaria el texto que lo identifica.
 */
const NUMERO_SIMPLE = /^(-?)(0|[1-9]\d*)(\.\d+)?$/;

/**
 * Inserta el separador de millares en la parte entera de un texto numerico, y
 * nada mas (#342, nit 6).
 *
 * **No es `formatearImporte`**: no antepone «S/», no fuerza dos decimales y no
 * cambia el punto decimal por una coma. Una celda numerica de una tabla no
 * siempre es dinero —«Área exclusiva m²» y «% participación» comparten columna
 * `num` con «Valor asignado S/» en mas de un catalogo (`catastro.generado.ts`,
 * seccion de unidades)— y el catalogo portado no dice cual es cual. Anteponer
 * un simbolo de moneda a un area seria mentir sobre que es esa cifra; agrupar
 * sus millares no miente sobre nada, y a un area de cinco cifras la hace igual
 * de mas facil de leer que a un importe.
 *
 * Trabaja sobre texto y nunca convierte a `number` (regla 1, RNF-055): igual
 * que `formatearImporte`, una cifra grande no pierde precision por pasar por
 * aqui. Un texto que no es un numero simple —vacio, el guion de «sin dato»
 * («—»), un codigo con ceros a la izquierda, un porcentaje con «%»— se
 * devuelve tal cual: esta funcion formatea lo que ya es un numero, no decide
 * que lo es.
 */
export function agruparMiles(texto: string): string {
  const encontrado = NUMERO_SIMPLE.exec(texto.trim());
  if (encontrado === null) return texto;
  const [, signo = '', entero = '', decimal = ''] = encontrado;
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILLARES);
  return `${signo}${agrupado}${decimal}`;
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
