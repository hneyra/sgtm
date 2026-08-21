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

const esObjeto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
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
): DatosDeTabla {
  return {
    filas: paginado.contenido.filter(esObjeto).map(fila),
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
