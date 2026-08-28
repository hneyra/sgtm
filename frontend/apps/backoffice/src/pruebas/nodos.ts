import { expect } from 'vitest';

/**
 * Un bloque de la pantalla **por su clase**, con una asercion legible cuando no
 * esta.
 *
 * Existe para sustituir a `document.querySelector('.sgtm-formulario') as
 * HTMLElement`, que hace dos cosas y ninguna se ve: afirma que el nodo existe
 * —callandose si no— y engaña al compilador para poder seguir. Cuando el bloque
 * no esta, `within(null)` falla con «Expected container to be an Element», que
 * no dice **que** bloque falta ni en que pantalla.
 *
 * Se busca por clase a proposito y no por rol: estos bloques no tienen ninguno
 * —un formulario de secciones colapsables no es un `form`—, y darles uno para
 * poder probarlos seria cambiar lo que anuncia un lector de pantalla por
 * comodidad de la prueba.
 */
export function elBloque(clase: string, que: string): HTMLElement {
  const nodo = document.querySelector<HTMLElement>(clase);
  expect(nodo, `no hay ${que} («${clase}») en la pantalla`).not.toBeNull();
  // Non-null tras la asercion: si fuera nulo, la linea de arriba ya habria
  // fallado diciendo cual falta.
  return nodo as HTMLElement;
}
