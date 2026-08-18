import { OPERACIONES } from './operaciones.generado';
import type { DescriptorDeOperacion, IdDeOperacion, ParametrosDe } from './operaciones.generado';

/**
 * Lo poco que hace falta para pedir una operacion del contrato: su descriptor,
 * su camino con los parametros puestos y su consulta.
 *
 * El resto —que hook la pide, que adaptador traduce la respuesta— es de la
 * pantalla, y llega opcion por opcion. Aqui solo vive lo que es igual para las
 * 134: **el contrato decide la URL, no quien la llama**.
 */

/** El descriptor que el contrato declara para una operacion. */
export function descriptorDe(id: IdDeOperacion): DescriptorDeOperacion {
  return OPERACIONES[id];
}

const comoTexto = (parametros: unknown): Readonly<Record<string, string | undefined>> =>
  parametros as Readonly<Record<string, string | undefined>>;

/**
 * El camino de una operacion con sus parametros de ruta ya sustituidos.
 *
 * Lo que no hace, y es a proposito: **inventarse el valor que falta**. Hasta
 * hoy `GET /rentas/vehiculos/{placa}` se pedia con la cadena `ejemplo`, y una
 * pantalla que pide un registro inventado parece funcionar. Aqui, sin placa, no
 * hay peticion.
 */
export function rutaDeOperacion<O extends IdDeOperacion>(
  id: O,
  parametros: ParametrosDe<O>,
): string {
  const descriptor = OPERACIONES[id] as DescriptorDeOperacion;
  const valores = comoTexto(parametros);

  return descriptor.ruta.replace(/\{(\w+)\}/g, (_coincidencia, nombre: string) => {
    const valor = valores[nombre];
    if (valor === undefined || valor === '') {
      throw new Error(
        `La operacion «${id}» necesita «${nombre}» y no se le dio: sin el, la peticion iria a un registro que no es el que el usuario abrio.`,
      );
    }
    return encodeURIComponent(valor);
  });
}

/**
 * Los parametros de consulta que la operacion declara y que traen valor.
 *
 * **Un filtro vacio no viaja.** `?uso=` no es «sin filtro»: es un filtro vacio
 * que el backend tendria que interpretar, y cada backend lo interpreta distinto.
 */
export function consultaDeOperacion<O extends IdDeOperacion>(
  id: O,
  parametros: ParametrosDe<O>,
): Record<string, string> {
  const descriptor = OPERACIONES[id] as DescriptorDeOperacion;
  const valores = comoTexto(parametros);
  const consulta: Record<string, string> = {};

  for (const nombre of descriptor.parametrosDeConsulta) {
    const valor = valores[nombre];
    if (valor !== undefined && valor !== '') consulta[nombre] = valor;
  }
  return consulta;
}
