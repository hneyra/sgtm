import type { AvisoDePantalla } from './prosa-textos';

/**
 * **La puerta a la prosa fija de las pantallas, sin traersela al arranque.**
 *
 * El aviso permanente de una opcion y la nota de su escritura son cinco
 * kilobytes de castellano —«esto es una copia de trabajo», «la contraseña no se
 * escribe aquí»— que viajaban en el trozo de arranque, el que baja quien entra a
 * mirar un recibo. Ciento veintisiete de las 134 pantallas no los usan nunca.
 *
 * Lo que **no** se hace, y es el punto: diferirlos a un `Suspense` propio. Son
 * advertencias —«el padrón no ha cambiado»— y una advertencia que llega tarde es
 * peor que no tenerla. Se piden **en el mismo gesto con que la pantalla ya pide
 * el catalogo de su modulo** (`Pantalla.PantallaDelModulo`), que es una peticion
 * que ya bloquea el dibujo: cuando la pantalla se ve, la prosa ya esta. No llega
 * ni un milisegundo mas tarde que cuando viajaba en el arranque.
 *
 * De ahi el modulo mutable: `cargar()` resuelve una vez —el `import()` lo
 * memoriza el empaquetador— y a partir de ahi las dos consultas son sincronas,
 * que es como las hace el renderizador.
 */

type Textos = typeof import('./prosa-textos');

let textos: Textos | undefined;

/**
 * Trae la prosa, o no hace nada si ya esta.
 *
 * Lo llama la misma consulta que trae el catalogo del modulo. Quien dibuje sin
 * haberla esperado vera las dos consultas devolver `undefined`, que es
 * exactamente lo que devuelven para las 127 opciones que no declaran ninguna:
 * no hay forma de que la ausencia se lea como un texto equivocado.
 */
export async function cargarProsa(): Promise<void> {
  textos ??= await import('./prosa-textos');
}

/** El aviso permanente de una opcion, si lo tiene. */
export const avisoDe = (opcion: string): AvisoDePantalla | undefined => textos?.AVISOS[opcion];

/** La nota de la escritura de una opcion, si la declara. */
export const notaDe = (opcion: string): string | undefined => textos?.NOTAS[opcion];
