import { datosDe } from '@sgtm/api-mock';

/**
 * Comprobar que **ninguna cifra se recompone al dibujarla**.
 *
 * La regla de ESLint impide escribir aritmetica con importes, pero no impide
 * que una cifra llegue transformada por otro camino —un formateador, un
 * redondeo «de presentacion», una suma metida en un adaptador—. Esto lo mira
 * por el otro lado: lo que se ve en la pantalla tiene que estar **tal cual** en
 * lo que sirvio la API.
 *
 * Vive aqui y no en el archivo de un modulo porque #78 lo pide explicitamente
 * para los suyos —«se reusa el de #77, no se duplica»— y porque el defecto que
 * busca no es de un modulo: es de cualquier pantalla con importes.
 */

/** Una cifra de dinero, como se ve en pantalla: `1,842.60`, `-26.40`. */
const DINERO = /^-?\d{1,3}(,\d{3})*\.\d{2}$/;

/** Las cifras que la pantalla esta ensenando ahora mismo. */
export function cifrasEnPantalla(): string[] {
  return [...document.querySelectorAll('td, .sgtm-totales__valor, .sgtm-campo__control')]
    .map((nodo) => (nodo.textContent ?? '').trim())
    .filter((texto) => DINERO.test(texto));
}

/** Todas las cifras que la API sirvio para esa pantalla, vengan de donde vengan. */
export function cifrasServidas(pantalla: string): ReadonlySet<string> {
  const servidas = new Set<string>();
  const datos = datosDe(pantalla);
  for (const fila of datos?.tabla?.filas ?? []) for (const celda of fila) servidas.add(celda.texto);
  for (const total of datos?.totales ?? []) servidas.add(total.value);
  for (const valor of Object.values(datos?.campos ?? {})) {
    if (typeof valor === 'string') servidas.add(valor);
  }
  for (const fila of datos?.reporte?.filas ?? []) for (const celda of fila) servidas.add(celda);
  for (const dato of datos?.reporte?.meta ?? []) servidas.add(dato.v);
  return servidas;
}
