import type { DatosDeDeterminacion, DatosDePantalla } from '@sgtm/api-client';

/**
 * Lo que el proxy **se inventa**, apartado de lo que el backend ya publica.
 *
 * `recursos.ts` y `servidas.ts` no inventan nada: publican lo que el backend
 * publica —su sobre, sus nombres de campo, su `Resource`— con los valores del
 * prototipo dentro. Aqui pasa lo contrario: **aqui se inventa**, porque hay un
 * dato que la pantalla necesita, que ninguna operacion del contrato devuelve
 * todavia y que la interfaz no puede componer sin mentir.
 *
 * Por eso vive en su propio archivo y no como una funcion mas entre las de
 * `recursos.ts`: una forma inventada mezclada entre las reales acaba
 * tomandose por real —nadie recuerda cual de las dos estaba leyendo— y la
 * pantalla se construye contra ella sin que nadie lo haya decidido, que es lo
 * que ADR-0010 §4 existe para impedir. Aqui se ve de lejos.
 *
 * **Regla del archivo: cada entrada nombra la operacion que la sustituira.**
 * Si no puede nombrarla, no pertenece aqui —lo que no se sabe con que se va a
 * sustituir no es una simulacion, es una decision de producto tomada por
 * omision—. La de hoy es una sola: la capa web de la determinacion (#333b),
 * anotada opcion por opcion en `apps/backoffice/src/pantallas/rentas/index.ts`.
 * El dia que esa operacion exista, la entrada se borra de aqui y la pantalla no
 * cambia una linea.
 *
 * **Y ese dia llego para dos de las cinco** (#395). `PredialController` publica
 * ya `POST /rentas/predial/calculo-individual` y `POST /rentas/predial/calculo-
 * masivo`, y las dos devuelven el conjunto con el que determinaron dentro de su
 * recurso —`DeterminacionPredialResource.conjunto`, `CorridaPredialResource
 * .conjunto`—, que es exactamente lo que este archivo inventaba para ellas. Sus
 * entradas se borraron: el proxy las contesta ahora por `recursos.ts`, con la
 * forma del backend, y la pantalla las lee de ahi. Quedan tres, y las tres
 * siguen esperando su controlador.
 */

/**
 * El conjunto sellado con el que se determinaron las cifras del prototipo.
 *
 * Es 2026 porque de 2026 son las cifras que acompana: el juego de datos lleva
 * la UIT de ese ejercicio y los tramos con los que salieron sus importes.
 * Poner aqui el conjunto de otro ejercicio seria una incoherencia **mas dificil
 * de ver que la ausencia del dato**: nada en la pantalla chirriaria, y quien
 * quisiera reproducir «587.44» buscaria el error en la formula.
 */
const CONJUNTO_DEL_PROTOTIPO = '2026 v1';

/**
 * Las pantallas que determinan **y todavia se inventan su conjunto**: tres de
 * las cinco, desde #395.
 *
 * `sujeto` viene **ya redactado**, como lo redactara el servidor, y no como dos
 * piezas que la interfaz junte: el sujeto de una determinacion masiva no es un
 * nombre —es un alcance—, y el de un calculo vehicular es una placa. Un solo
 * campo de texto es lo unico que admite las tres formas sin obligar a la
 * pantalla a elegir cual esta viendo.
 *
 * Las sustituira la capa web de la determinacion (#333b): la operacion que
 * responda estas pantallas traera el conjunto con el que determino, porque es
 * el unico que lo sabe. Es lo que ya paso con las dos prediales (#395).
 */
const DETERMINACIONES: Readonly<Record<string, DatosDeDeterminacion>> = {
  arbitrios: { conjunto: CONJUNTO_DEL_PROTOTIPO, sujeto: 'Predio 02-014-D-14-01' },
  vehicular_calculo: { conjunto: CONJUNTO_DEL_PROTOTIPO, sujeto: 'Placa V2K-841' },
  alcabala: { conjunto: CONJUNTO_DEL_PROTOTIPO, sujeto: 'Transferencia del 12/03/2026' },
};

/**
 * Anade a la respuesta de una pantalla lo que el proxy simula para ella.
 *
 * La pantalla que no tiene entrada sale **tal cual**: no se le pone un conjunto
 * vacio ni un «—». Un conjunto en blanco se leeria como «se determino sin
 * parametros», y eso no le pasa a ninguna cifra.
 */
export function conLoSimulado(pantalla: string, datos: DatosDePantalla): DatosDePantalla {
  // `Object.hasOwn` y no la indexacion cruda, que es la misma barrera que usa
  // la lista blanca del cuerpo de una escritura (FRO-04 §6): indexar resuelve
  // por la cadena de prototipos, asi que una pantalla llamada `toString`
  // —o `constructor`, o `valueOf`— recibiria una «determinacion» heredada de
  // `Object` que nadie declaro aqui.
  if (!Object.hasOwn(DETERMINACIONES, pantalla)) return datos;
  const determinacion = DETERMINACIONES[pantalla];
  return determinacion ? { ...datos, determinacion } : datos;
}

/** Las pantallas a las que el proxy les anade algo inventado. Hoy, tres. */
export const PANTALLAS_SIMULADAS: readonly string[] = Object.keys(DETERMINACIONES);
