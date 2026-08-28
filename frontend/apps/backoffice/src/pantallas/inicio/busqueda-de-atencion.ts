/**
 * **De lo que se teclea a que lecturas se preguntan** (#296, ADR-0016 §1).
 *
 * El inicio pregunta a quien se atiende, y quien atiende escribe lo que tiene en
 * la mano: un DNI, un RUC, un nombre, una placa o un codigo de predio. Aqui vive
 * la unica decision de ese camino que se puede tomar **sin red y sin permisos**:
 * que forma tiene lo escrito y, por tanto, a cual de las tres lecturas
 * publicadas tiene sentido preguntarle.
 *
 * Es un modulo aparte y sin React a proposito: la heuristica es lo que hay que
 * poder probar con una tabla de entradas y salidas, sin montar nada.
 *
 * ── Lo que la heuristica decide, y lo que no ───────────────────────────────
 *
 * Decide **a quien se pregunta**. No decide nunca **que se ensena**: todo lo que
 * una lectura devuelva se dibuja en su franja, con su fuente. Esa es la linea, y
 * es la que impide que «afinar» la heuristica acabe escondiendo un resultado que
 * el permiso del usuario si cubre.
 *
 * ── Las cinco formas ───────────────────────────────────────────────────────
 *
 *   ocho digitos    un DNI. `contribuyentes?dNI=`
 *   once digitos    un RUC. `contribuyentes?rUC=`
 *   solo digitos    ademas, y desde seis, un codigo de referencia catastral:
 *                   `consulta_fichas?codRefCatastral=`, que busca por prefijo.
 *                   **Se suma, no sustituye**: un numero de ocho digitos es un
 *                   DNI y es tambien el arranque de un codigo catastral, y las
 *                   dos preguntas salen a la vez
 *   letras y        una placa, con las mismas reglas de composicion que
 *   digitos, sin    `Placa` en el dominio —mayusculas, sin espacios, un guion
 *   espacios        opcional, al menos una letra y un digito, de 5 a 10—.
 *                   `consulta_vehiculos?placa=`
 *   con letras      un nombre o una razon social. `contribuyentes?nombreRazonSocial=`,
 *                   que el backend busca **por aproximacion** (`CriterioDeBusqueda`:
 *                   sin tildes, apellidos invertidos, una letra de menos)
 *
 * ── El codigo de contribuyente no se busca aqui, y es deliberado ───────────
 *
 * El padron numera a sus contribuyentes con once digitos («00000025673»), que es
 * exactamente el ancho de un RUC. Distinguirlos exigiria adivinar —«los RUC
 * empiezan por 10 o 20»— y equivocarse en silencio, o preguntar por los dos y
 * enseñar dos franjas de la misma lectura. Ninguna de las dos vale la pena para
 * el unico identificador de los cinco que **nadie trae en la mano**: el codigo
 * municipal se lo da el sistema, no el carne. Quien lo tenga sigue teniendo el
 * filtro por codigo en la pantalla del padron, que es donde el manual lo pone.
 */

/** Las tres lecturas que el inicio abanica. Cada una es una opcion, con su permiso. */
export type FuenteDeAtencion = 'contribuyentes' | 'consulta_vehiculos' | 'consulta_fichas';

/** Por que clave se pregunta. Tres de las cinco caen en la misma lectura. */
export type ClaveDeAtencion = 'nombre' | 'dni' | 'ruc' | 'placa' | 'predio';

export interface PreguntaDeAtencion {
  readonly clave: ClaveDeAtencion;
  /** Lo que viaja como valor del filtro, ya normalizado para esa clave. */
  readonly valor: string;
}

/** Que lectura responde a cada clave. */
export const FUENTE_DE: Readonly<Record<ClaveDeAtencion, FuenteDeAtencion>> = {
  nombre: 'contribuyentes',
  dni: 'contribuyentes',
  ruc: 'contribuyentes',
  placa: 'consulta_vehiculos',
  predio: 'consulta_fichas',
};

/**
 * Con menos de esto no se pregunta, por clave.
 *
 * El de los codigos y las placas es el mismo argumento que el del resolutor de
 * unidad (#331): seis digitos son el ubigeo de un codigo catastral y seis
 * caracteres una placa peruana entera, y con menos la busqueda por prefijo
 * devuelve medio padron y el candidato correcto no se distingue del resto.
 *
 * El del nombre es mas corto porque la busqueda **no es por prefijo sino por
 * aproximacion**, y porque en ventanilla se teclea el arranque de un apellido:
 * con seis, «GARCIA» apenas cabe y «PEÑA» no se podria buscar nunca.
 */
const MINIMO: Readonly<Record<ClaveDeAtencion, number>> = {
  nombre: 3,
  dni: 8,
  ruc: 11,
  placa: 5,
  predio: 6,
};

/** Un documento no es «al menos ocho»: es ocho. El RUC, once. */
const LARGO_DNI = 8;
const LARGO_RUC = 11;

/** El ancho que admite `Placa` en el dominio (`placa varchar(10)`). */
const MAXIMO_PLACA = 10;

/**
 * A quien se le pregunta lo que se acaba de teclear. Vacio si a nadie todavia.
 *
 * Como mucho una pregunta por lectura: `nombre`, `dni` y `ruc` van todas a
 * `contribuyentes` y se excluyen entre si por construccion —un texto o tiene
 * letras o no las tiene, y un numero o mide ocho o mide once—.
 */
export function preguntasDe(escrito: string): readonly PreguntaDeAtencion[] {
  const limpio = escrito.trim();
  if (limpio === '') return [];

  const sinEspacios = limpio.toUpperCase().replace(/\s+/g, '');
  const digitos = limpio.replace(/[^0-9]/g, '');
  // «Solo digitos» admite los separadores con que se escribe un codigo
  // catastral troquelado —«20 01 06 01 001»— y un documento con puntos.
  const soloDigitos = digitos !== '' && /^[0-9\s.-]+$/.test(limpio);

  if (soloDigitos) {
    return [
      ...(digitos.length === LARGO_DNI ? [{ clave: 'dni' as const, valor: digitos }] : []),
      ...(digitos.length === LARGO_RUC ? [{ clave: 'ruc' as const, valor: digitos }] : []),
      ...(digitos.length >= MINIMO.predio ? [{ clave: 'predio' as const, valor: digitos }] : []),
    ];
  }

  if (esPlaca(sinEspacios)) return [{ clave: 'placa', valor: sinEspacios }];

  // Lo demas que lleve letras es un nombre o una razon social. El guion bajo del
  // largo minimo es el que evita preguntar por «A».
  return /\p{L}/u.test(limpio) && limpio.length >= MINIMO.nombre
    ? [{ clave: 'nombre', valor: limpio }]
    : [];
}

/**
 * Si eso tiene forma de placa, con **las reglas del dominio y no otras**.
 *
 * `Placa` acepta bloques alfanumericos en mayusculas separados como mucho por un
 * guion, con al menos una letra y un digito, de 5 a 10 caracteres. Escribir aqui
 * un patron propio —«tres letras y tres digitos»— dejaria fuera «T2G-418» y
 * «V1H-882», que son las placas que el padron tiene de verdad.
 *
 * El guion se conserva: el backend busca «sin distinguir el guion»
 * (`CriterioDeVehiculo`), asi que quitarlo aqui no gana nada y cambiaria el
 * texto que se ve escrito.
 */
function esPlaca(sinEspacios: string): boolean {
  return (
    sinEspacios.length >= MINIMO.placa &&
    sinEspacios.length <= MAXIMO_PLACA &&
    /^[0-9A-Z]+(-[0-9A-Z]+)?$/.test(sinEspacios) &&
    /[A-Z]/.test(sinEspacios) &&
    /[0-9]/.test(sinEspacios)
  );
}

/**
 * Lo que falta para poder preguntar, dicho para quien escribe; vacio si ya se
 * pregunto o si no hay nada escrito.
 *
 * Existe porque «no hay resultados» y «todavia no se ha buscado» son dos frases
 * distintas y la segunda no la puede deducir quien mira: la caja se ve igual.
 */
export function loQueFalta(escrito: string): string {
  const limpio = escrito.trim();
  if (limpio === '' || preguntasDe(limpio).length > 0) return '';
  const digitos = limpio.replace(/[^0-9]/g, '');
  const soloDigitos = digitos !== '' && /^[0-9\s.-]+$/.test(limpio);
  return soloDigitos
    ? `Todavía no se ha buscado: un DNI son ${LARGO_DNI} dígitos, un RUC ${LARGO_RUC}, y un código de predio se busca desde ${MINIMO.predio}.`
    : `Todavía no se ha buscado: hacen falta al menos ${MINIMO.nombre} caracteres.`;
}
