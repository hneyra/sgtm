import type { Celda, DatosDePantalla, DatosDeTabla, Paginado } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';

/**
 * Un listado del backend, dibujado como tabla.
 *
 * Las seis pantallas de seguridad que listan algo reciben el **mismo sobre**
 * —`RespuestaPaginada` de #6— y se diferencian solo en como se lee cada fila.
 * Eso es lo que este archivo separa: el sobre se abre una vez, y cada pantalla
 * pone lo suyo.
 */

/** Lo que se muestra cuando el backend no manda ese dato. Nunca una cadena vacia. */
export const SIN_DATO = '—';

/**
 * Un objeto JSON, y no un arreglo ni `null`.
 *
 * Se exporta porque el mismo predicado estaba copiado en media docena de
 * adaptadores: seis copias de tres condiciones que un dia dejan de decir lo
 * mismo —la de `!Array.isArray` es justo la que se olvida—.
 */
export const esObjeto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

export const texto = (valor: unknown): string =>
  typeof valor === 'string' && valor !== ''
    ? valor
    : typeof valor === 'number'
      ? String(valor)
      : SIN_DATO;

/** `2026-08-13T11:44:00Z` → `13/08/2026 11:44`. Lo que el manual pone en la bitacora. */
export function instante(valor: unknown): string {
  if (typeof valor !== 'string' || valor === '') return SIN_DATO;
  const [fecha = '', resto = ''] = valor.split('T');
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) return valor;
  const hora = resto.slice(0, 5);
  return hora === '' ? `${dia}/${mes}/${anio}` : `${dia}/${mes}/${anio} ${hora}`;
}

/** Habilitado o no, con su texto: el estado nunca se comunica solo por color (FRO-02 §2.1). */
export const estado = (activo: unknown, si = 'ACTIVO', no = 'INACTIVO'): Celda =>
  activo === true ? { texto: si, tono: 'ok' } : { texto: no, tono: 'bad' };

/**
 * Abre el sobre paginado. Falla ruidosamente si no lo es: media pantalla mal
 * dibujada es peor que un error que dice que la respuesta no era la esperada.
 */
export function leerPaginado(cuerpo: unknown, que: string): Paginado<unknown> {
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo['contenido'])) {
    throw new Error(`La respuesta de ${que} no trae un listado paginado.`);
  }
  const numero = (clave: string, porOmision: number): number =>
    typeof cuerpo[clave] === 'number' ? (cuerpo[clave] as number) : porOmision;

  return {
    contenido: cuerpo['contenido'],
    pagina: numero('pagina', 0),
    tamano: numero('tamano', cuerpo['contenido'].length),
    totalElementos: numero('totalElementos', cuerpo['contenido'].length),
    totalPaginas: numero('totalPaginas', 1),
    hayMas: cuerpo['hayMas'] === true,
  };
}

/**
 * Abre un objeto suelto: un recurso de un solo registro, sin sobre de ningun tipo.
 *
 * `VehiculoResource`, `DeclaracionJuradaResource` y sus gemelos son un objeto JSON tal cual —ni
 * paginados (no son un listado) ni envueltos en un sobre de ficha versionada (eso es de
 * catastro, y tiene su propio `leerFicha`)—. Falla ruidosamente si no lo es, por la misma razon
 * que {@link leerPaginado}.
 */
export function leerObjeto(cuerpo: unknown, que: string): Readonly<Record<string, unknown>> {
  if (!esObjeto(cuerpo)) {
    throw new Error(`La respuesta de ${que} no trae un objeto.`);
  }
  return cuerpo;
}

/**
 * Abre un arreglo suelto: sin sobre de paginacion.
 *
 * Las tablas de valuacion (#17) no lo tienen: `ArancelController` y sus
 * gemelos devuelven `List<...Resource>` tal cual, porque son catalogos de
 * referencia —una docena de filas, no un padron— y no un listado que haya que
 * paginar. Forzar esta respuesta por `leerPaginado` fallaria pensando que la
 * forma esta mal, cuando la forma real es esta.
 */
export function leerLista(
  cuerpo: unknown,
  que: string,
): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(cuerpo)) {
    throw new Error(`La respuesta de ${que} no trae un arreglo.`);
  }
  return cuerpo.filter(esObjeto);
}

/**
 * El listado, ya como tabla: sus filas, su conteo y su paginacion.
 *
 * El conteo lo redacta la interfaz —«47 registros»— y no el backend, que aqui
 * manda el numero y no la frase. Es la excepcion que RNF-080 admite: contar no
 * es redactar en lenguaje del dominio.
 */
export function tablaDe(
  paginado: Paginado<unknown>,
  fila: (registro: Readonly<Record<string, unknown>>) => readonly Celda[],
  que: string,
  /**
   * Los valores **crudos** de cada fila, para las tablas cuyas filas se eligen
   * y viajan en el cuerpo de una escritura (`DatosDeTabla.valores`).
   *
   * Sin esto, lo unico que la seleccion podia llevarse era el texto dibujado
   * —«1,842.60», «—», y ningun identificador de la unidad—, y ese texto es de
   * presentacion: no es lo que el backend acepta (#332).
   */
  valores?: (registro: Readonly<Record<string, unknown>>) => Readonly<Record<string, string>>,
): DatosDeTabla {
  const registros = paginado.contenido.filter(esObjeto);
  return {
    filas: registros.map(fila),
    ...(valores === undefined ? {} : { valores: registros.map(valores) }),
    conteo: `${paginado.totalElementos} ${que}`,
    paginacion: {
      pagina: paginado.pagina,
      tamano: paginado.tamano,
      totalPaginas: paginado.totalPaginas,
      hayMas: paginado.hayMas,
    },
  };
}

/**
 * Un arreglo suelto, ya como tabla: sus filas y su conteo, **sin paginacion**.
 *
 * El paginador se dibuja solo cuando la respuesta lo trae (#63); esta no lo
 * trae, asi que aqui no se inventa uno.
 */
export function tablaDeLista(
  lista: readonly Readonly<Record<string, unknown>>[],
  fila: (registro: Readonly<Record<string, unknown>>) => readonly Celda[],
  que: string,
): DatosDeTabla {
  return {
    filas: lista.map(fila),
    conteo: `${lista.length} ${que}`,
  };
}

/**
 * La fecha a la que estan actualizadas las cifras de la pantalla (regla 9).
 *
 * Un listado de usuarios no trae cifras de deuda, pero `DatosDePantalla` la
 * exige igual y hace bien: la fecha de una consulta es lo que permite decir
 * «esto era asi cuando lo miraste». Sale del reloj del cliente **solo** porque
 * estas operaciones no la mandan; en cuanto una traiga cifras, la traera ella.
 */
export const hoy = (): Fecha => new Date().toISOString().slice(0, 10);

export const datosDe = (tabla: DatosDeTabla): DatosDePantalla => ({
  fechaCalculo: hoy(),
  tabla,
});
