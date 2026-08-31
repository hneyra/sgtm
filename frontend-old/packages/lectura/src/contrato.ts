import type { Paginado } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';

/**
 * **Como se abre un cuerpo del contrato**, sin suponer nada de lo que llega.
 *
 * Estaba en `apps/backoffice/src/pantallas/seguridad/listado.ts` —donde nacio,
 * con las seis pantallas de seguridad— y salio de ahi al separarse `apps/portal`
 * (#298, ADR-0016 §3): los adaptadores del contribuyente que las dos
 * aplicaciones comparten se escriben con estas cinco funciones, y copiarlas
 * habria sido copiar `esObjeto` —tres condiciones de las que la de
 * `!Array.isArray` es justo la que se olvida— por sexta vez.
 *
 * El back-office las sigue importando de `listado.ts`, que ahora las reexporta:
 * no hay dos definiciones, hay una y un solo sitio donde corregirlas.
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
 * Un importe con su fecha, tal como lo publica `ImporteActualizado`.
 *
 * Los dos juntos o ninguno: una cifra sin fecha es una cifra que dentro de tres
 * dias es otra (regla 9, RNF-075). Se lee asi y no como dos campos sueltos
 * porque asi es como el backend impide que se separen.
 */
export interface ImporteConFecha {
  readonly importe: string;
  readonly actualizadoA: Fecha;
}

/**
 * Se lee **una sola vez** en todo el frontend, y por eso vive aqui: la ficha
 * 360° del back-office y el portal del contribuyente dibujan las mismas cifras
 * (#297, #298), y dos lecturas del mismo par acabarian leyendo campos distintos
 * —y una de las dos, el importe sin su fecha—.
 */
export function importeDe(valor: unknown): ImporteConFecha | undefined {
  if (!esObjeto(valor)) return undefined;
  const importe = valor['importe'];
  const actualizadoA = valor['actualizadoA'];
  if (typeof importe !== 'string' || typeof actualizadoA !== 'string') return undefined;
  return { importe, actualizadoA: actualizadoA as Fecha };
}
