/**
 * El codigo de referencia catastral, como dato: tramos, reparto y formato.
 *
 * Vive aparte de `CodigoCatastral.tsx` a proposito: estas funciones las
 * necesita **la conexion** de catastro —el valor de un enlace compartido puede
 * llegar troquelado y lo que viaja al backend son los digitos—, y
 * `catastro/index.ts` no puede arrastrarse React detras: hay una verificacion
 * que lo nota (`adaptador-conserva-la-fecha.test.ts` compila el adaptador con
 * un `tsc` sin `--jsx`). El componente importa de aqui; nunca al reves.
 *
 * **La composicion es la del backend, no una copia.** Los tramos y sus
 * longitudes salen de `ComposicionCatastral.DEL_MANUAL`
 * (`backend/sgtm-dominio-compartido/.../ComposicionCatastral.java`), que es la
 * plantilla `DDPPddSSMMMLLLEEeeppUUU` del manual: **diez tramos, 23 posiciones**
 * —el ubigeo, departamento/provincia/distrito, va delante de sector—.
 * `codigo-catastral.test.tsx` lee ese archivo y exige que las dos listas
 * coincidan tramo a tramo: separarlas es exactamente el defecto que la clase
 * Java evita al recibir la composicion en vez de cablearla.
 *
 * **D-10 sigue abierta**: la plantilla del manual da 23 y los ejemplos del
 * prototipo traen 21. Por eso aqui no se rellena con ceros ni se exige la
 * longitud completa: lo que se compone es la concatenacion de lo escrito, y unos
 * tramos finales en blanco son una **busqueda por prefijo**, que es lo que el
 * backend ya resuelve por rango (`~>=~` / `~<~`, y no `LIKE`, por RLS).
 */

export interface TramoDelCodigo {
  /** Nombre del tramo en `ComposicionCatastral`. */
  readonly nombre: string;
  /** Como se rotula en la pantalla. */
  readonly etiqueta: string;
  readonly longitud: number;
}

/**
 * Los diez tramos de `ComposicionCatastral.DEL_MANUAL`, en su orden.
 *
 * Si D-10 se cierra en las 21 posiciones del prototipo, se cambia **la clase
 * Java** y esta lista detras; la prueba que las compara es lo que impide que
 * cambie solo una de las dos.
 */
export const TRAMOS_DEL_CODIGO: readonly TramoDelCodigo[] = [
  { nombre: 'departamento', etiqueta: 'Depto.', longitud: 2 },
  { nombre: 'provincia', etiqueta: 'Prov.', longitud: 2 },
  { nombre: 'distrito', etiqueta: 'Distrito', longitud: 2 },
  { nombre: 'sector', etiqueta: 'Sector', longitud: 2 },
  { nombre: 'manzana', etiqueta: 'Manzana', longitud: 3 },
  { nombre: 'lote', etiqueta: 'Lote', longitud: 3 },
  { nombre: 'edificacion', etiqueta: 'Edif.', longitud: 2 },
  { nombre: 'entrada', etiqueta: 'Entrada', longitud: 2 },
  { nombre: 'piso', etiqueta: 'Piso', longitud: 2 },
  { nombre: 'unidad', etiqueta: 'Unidad', longitud: 3 },
];

/** Posiciones que ocupa el codigo completo: 23 con la plantilla del manual. */
export const LONGITUD_DEL_CODIGO = TRAMOS_DEL_CODIGO.map((t) => t.longitud).reduce(
  (total, largo) => total + largo,
  0,
);

/** Solo digitos: un codigo catastral no lleva letras ni guiones (RF-005). */
export const soloDigitos = (texto: string): string => texto.replace(/[^0-9]/g, '');

/**
 * Reparte un codigo en sus tramos, de izquierda a derecha y sin rellenar.
 *
 * Es el inverso exacto de concatenar: pegar 21 digitos deja los dos ultimos
 * tramos a medias y `componerDeTramos` devuelve los mismos 21. Por eso el valor
 * que viaja al filtro es identico al que se pego.
 */
export function repartirEnTramos(valor: string): readonly string[] {
  const digitos = soloDigitos(valor).slice(0, LONGITUD_DEL_CODIGO);
  const tramos: string[] = [];
  let desde = 0;
  for (const tramo of TRAMOS_DEL_CODIGO) {
    tramos.push(digitos.slice(desde, desde + tramo.longitud));
    desde += tramo.longitud;
  }
  return tramos;
}

/** El codigo que componen unos tramos: su concatenacion, sin separadores. */
export const componerDeTramos = (tramos: readonly string[]): string => tramos.join('');

/** Un valor de fuera (la URL), por el embudo del componente: solo digitos, a lo sumo 23. */
export const normalizarCodigoCatastral = (valor: string): string =>
  componerDeTramos(repartirEnTramos(valor));

/**
 * El codigo con guiones entre tramos, para leerlo de un vistazo.
 *
 * Troquela **lo mismo que reparte el componente**, y por eso admite codigos mas
 * cortos que la plantilla: los ejemplos del prototipo traen 21 posiciones y la
 * plantilla del manual da 23 —eso es D-10, y sigue abierta—, asi que exigir la
 * longitud completa dejaria sin troquelar justo los codigos que hay.
 *
 * Lo que **no** troquela es lo que no es un codigo catastral: la unidad
 * catastral rural (`11024-0418`) lleva guion y letras posibles, y meterla en
 * esta plantilla diria de ella algo que no es cierto. Sale tal cual.
 */
export function formatearCodigoCatastral(valor: string): string {
  const limpio = valor.trim();
  if (limpio === '' || limpio.length > LONGITUD_DEL_CODIGO || soloDigitos(limpio) !== limpio) {
    return valor;
  }
  return repartirEnTramos(limpio)
    .filter((tramo) => tramo !== '')
    .join('-');
}
