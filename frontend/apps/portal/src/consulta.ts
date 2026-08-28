/**
 * **Con qué se identifica el contribuyente**, y qué filtro del contrato le
 * corresponde (#298).
 *
 * Los tres son los que el prototipo dibuja en la caja del portal —DNI, RUC y
 * Código— y los tres son filtros **publicados** de `GET /rentas/contribuyentes`
 * (`codigo`, `dNI`, `rUC`). Aquí no se inventa ninguno.
 *
 * ── Por qué el ciudadano elige el tipo y quien atiende no ──────────────────
 *
 * El inicio del back-office adivina la forma de lo tecleado
 * (`busqueda-de-atencion.ts`: ocho dígitos un DNI, once un RUC, con letras un
 * nombre) porque **quien atiende recibe lo que le pongan delante** y no sabe qué
 * es hasta mirarlo. El ciudadano sí lo sabe: tiene su documento en la mano. Con
 * el tipo elegido no hay heurística que acertar, y por eso este archivo no
 * duplica aquella —resuelven dos problemas distintos—.
 *
 * ── Y por el nombre no se busca ────────────────────────────────────────────
 *
 * `nombreRazonSocial` es el cuarto filtro publicado y aquí no está, a propósito:
 * el backend lo resuelve **por aproximación** (`CriterioDeBusqueda`: sin tildes,
 * apellidos invertidos, una letra de menos), que es justo lo que hace falta en
 * ventanilla y justo lo que no se puede ofrecer sin sesión del ciudadano —tres
 * letras devolverían medio padrón de la municipalidad a quien las teclee—. Los
 * tres de aquí identifican a **una** persona.
 *
 * ── Lo que todavía no se puede preguntar ───────────────────────────────────
 *
 * Un carné de extranjería, un pasaporte o una partida: `TipoDocumento` los
 * admite y el contrato de `contribuyentes` **no publica `numeroDocumento`**
 * (ADR-0016, «Backend pendiente»). Aquí no se inventa la forma de ninguno; la
 * pantalla lo dice en vez de callarlo.
 */

import type { ClaveDelPadron } from '@sgtm/lectura';

/** Cómo se identifica quien consulta. El rótulo es el del prototipo (RNF-080). */
export interface DocumentoDeConsulta {
  readonly id: string;
  readonly etiqueta: string;
  /**
   * El filtro de `GET /rentas/contribuyentes` que le corresponde, **y el que
   * `identidadesQueCoinciden` usa después para comprobar que la fila que llegó
   * es la que se pidió**: el mismo nombre para las dos cosas, así que no se
   * pueden separar.
   */
  readonly filtro: ClaveDelPadron;
  /** Cuántos dígitos tiene, cuando el documento tiene una longitud fija. */
  readonly digitos?: number;
  /** Lo que se dice bajo el campo mientras no se ha preguntado. */
  readonly ayuda: string;
}

export const DOCUMENTOS: readonly DocumentoDeConsulta[] = [
  {
    id: 'DNI',
    etiqueta: 'DNI',
    filtro: 'dNI',
    digitos: 8,
    ayuda: 'Los 8 dígitos de tu DNI, sin guiones.',
  },
  {
    id: 'RUC',
    etiqueta: 'RUC',
    filtro: 'rUC',
    digitos: 11,
    ayuda: 'Los 11 dígitos de tu RUC.',
  },
  {
    id: 'Código',
    etiqueta: 'Código',
    filtro: 'codigo',
    ayuda: 'El código de contribuyente que figura en tu recibo o en tu notificación.',
  },
];

export const documentoPorId = (id: string): DocumentoDeConsulta =>
  DOCUMENTOS.find((documento) => documento.id === id) ?? (DOCUMENTOS[0] as DocumentoDeConsulta);

/**
 * Lo que falta para poder preguntar, dicho para quien escribe; vacío si ya se
 * puede.
 *
 * Existe por lo mismo que su gemelo del inicio (#296): «no encontramos a nadie»
 * y «todavía no has preguntado» son dos frases distintas, y la segunda no la
 * puede deducir quien mira la caja. Lo que **no** hace es adivinar: comprueba el
 * largo que el propio documento declara, y nada más. Quien decide si ese número
 * existe es el padrón.
 */
export function loQueFalta(documento: DocumentoDeConsulta, escrito: string): string {
  const limpio = escrito.trim();
  if (limpio === '') return `Escribe tu ${documento.etiqueta} para consultar.`;
  if (
    documento.digitos !== undefined &&
    limpio.replace(/[^0-9]/g, '').length !== documento.digitos
  ) {
    return `Un ${documento.etiqueta} son ${documento.digitos} dígitos.`;
  }
  return '';
}

/** El filtro con el que sale la consulta, ya normalizado. */
export function filtroDe(
  documento: DocumentoDeConsulta,
  escrito: string,
): Readonly<Record<string, string>> {
  const limpio = escrito.trim();
  const valor = documento.digitos === undefined ? limpio : limpio.replace(/[^0-9]/g, '');
  return { [documento.filtro]: valor };
}
