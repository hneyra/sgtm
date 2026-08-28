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

/**
 * La primaria **apagada con su motivo al lado**, que desde #332 se apaga con
 * `aria-disabled` y no con `disabled`.
 *
 * La diferencia no es de estilo: un boton `disabled` no puede recibir el foco, y
 * su `aria-describedby` —la franja que dice por que no se puede guardar— no lo
 * lee nadie. Con `aria-disabled` el boton sigue en el recorrido del teclado, el
 * lector anuncia «no disponible» **y** lee la descripcion, y el `onClick` se
 * guarda solo. Por eso la comprobacion exige las dos mitades: apagada, y
 * enfocable.
 */
export function primariaApagada(boton: HTMLElement = primariaDeLaPantalla()): void {
  expect(boton).toHaveAttribute('aria-disabled', 'true');
  expect(boton).not.toBeDisabled();
}

/** Y encendida es no llevar ninguna de las dos marcas. */
export function primariaEncendida(boton: HTMLElement = primariaDeLaPantalla()): void {
  expect(boton).not.toHaveAttribute('aria-disabled');
  expect(boton).toBeEnabled();
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
