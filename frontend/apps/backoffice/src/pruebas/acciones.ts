import { expect } from 'vitest';

/**
 * La accion primaria de la pantalla, y **el motivo que la explica**.
 *
 * Vive aqui y no en el archivo de un modulo porque lo que comprueba no es de un
 * modulo: desde #332, cualquiera de las 134 pantallas cuya accion no puede
 * guardar todavia lo dice con una franja, y la primaria la referencia con
 * `aria-describedby`. Cinco modulos lo comprueban, y cinco copias de la misma
 * busqueda acabarian mirando cosas distintas.
 *
 * **La franja se busca por la referencia de la primaria y no por su rol**: hay
 * mas de un `role="status"` en una pantalla —el «Guardado» de la escritura, la
 * banda de la seleccion—, y la unica que importa aqui es la que el boton senala.
 * Eso, ademas, es lo que hay que comprobar: que la referencia existe y apunta a
 * algo, porque un `aria-describedby` a un `id` que no esta no lo lee nadie.
 */
export function primariaDeLaPantalla(): HTMLButtonElement {
  const acciones = document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton');
  const primaria = acciones[acciones.length - 1];
  expect(primaria).toBeDefined();
  return primaria as HTMLButtonElement;
}

/** El texto de la franja que explica la primaria, o `undefined` si no la referencia. */
export function motivoDeLaPrimaria(): string | undefined {
  const referencia = primariaDeLaPantalla().getAttribute('aria-describedby');
  if (referencia === null) return undefined;
  const franja = document.getElementById(referencia);
  // Se **pinta**, y con `role="status"`: un `title` sobre un boton `disabled` no
  // existe ni para el teclado —no se puede enfocar— ni para el lector de
  // pantalla (FRO-04 §6).
  expect(franja).not.toBeNull();
  expect(franja?.getAttribute('role')).toBe('status');
  return franja?.textContent ?? '';
}
