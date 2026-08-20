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
 *
 * **Se mira en las dos direcciones, y la segunda es la que costo.** Comprobar
 * solo que lo que se ve esta en la respuesta deja pasar una transformacion que
 * cambie el formato: `1,842.60` convertido en `2026.86` deja de parecer dinero,
 * se cae del filtro y la comprobacion no lo ve. Por eso tambien se exige lo
 * contrario: que **cada cifra que la respuesta trae en su tabla siga estando en
 * la pantalla**. Lo descubrio intentar demostrar que la primera mordia (#80).
 */

/** Una cifra de dinero, como se ve en pantalla: `1,842.60`, `-26.40`. */
const DINERO = /^-?\d{1,3}(,\d{3})*\.\d{2}$/;

/** Las cifras que la pantalla esta ensenando ahora mismo. */
export function cifrasEnPantalla(): string[] {
  return [...document.querySelectorAll('td, .sgtm-totales__valor, .sgtm-campo__control')]
    .map((nodo) => (nodo.textContent ?? '').trim())
    .filter((texto) => DINERO.test(texto));
}

/** Las cifras de dinero que la respuesta trae **en su tabla**: tienen que verse. */
export function cifrasDeLaTabla(pantalla: string): string[] {
  const filas = datosDe(pantalla)?.tabla?.filas ?? [];
  return filas.flatMap((fila) => fila.map((celda) => celda.texto)).filter((t) => DINERO.test(t));
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
