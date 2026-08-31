import type { AvisoDePantalla } from './prosa-textos';

/**
 * **La puerta a la prosa fija de las pantallas, sin traersela al arranque.**
 *
 * El aviso permanente de una opcion y la nota de su escritura son cinco
 * kilobytes de castellano —«esto es una copia de trabajo», «la contraseña no se
 * escribe aquí»— que viajaban en el trozo de arranque, el que baja quien entra a
 * mirar un recibo. Ciento veintiuna de las 134 pantallas no los usan nunca.
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

/**
 * Que hacer con el pie que el catalogo trae para esta opcion.
 *
 *   `undefined`  la opcion no declara nada: se pinta el pie del catalogo, tal
 *                cual. Es lo que devuelven 133 de las 134
 *   `null`       el pie **se suprime**
 *   cadena       el pie **se sustituye** por esta
 *
 * `Object.hasOwn` y no la indexacion cruda, porque aqui los tres resultados
 * significan cosas distintas: una opcion llamada `constructor` devolveria por la
 * cadena de prototipos algo que no es `undefined`, y el pie del catalogo
 * desapareceria sin que nadie lo hubiera declarado.
 */
export function pieDe(opcion: string): string | null | undefined {
  const pies = textos?.PIES;
  if (pies === undefined || !Object.hasOwn(pies, opcion)) return undefined;
  return pies[opcion];
}

/**
 * Por que este filtro de esta opcion se dibuja y no se manda.
 *
 * Quien decide **que** se bloquea es `composicion.ts`, que viaja en el arranque;
 * esto solo trae la redaccion. Que el bloqueo no dependa de la prosa es
 * deliberado: si la prosa no hubiera llegado, el filtro sigue bloqueado —lo que
 * no puede pasar es que se mande y acabe en 422—, y lo unico que falta es la
 * explicacion.
 */
export const motivoDeFiltro = (opcion: string, campo: string): string | undefined =>
  textos?.MOTIVOS_DE_FILTRO[`${opcion}.${campo}`];
