import { descargar, solicitar } from './cliente';
import type { Archivo } from './cliente';
import { OPERACIONES } from './operaciones.generado';
import type {
  CuerpoDe,
  DescriptorDeOperacion,
  IdDeOperacion,
  ParametrosDe,
  RespuestaDe,
} from './operaciones.generado';

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

/**
 * Pide una operacion del contrato y devuelve **su** respuesta, no la de todas.
 *
 * Es la puerta lateral de FRO-03 §7: junto a `pedirDatosDePantalla`, que sirve
 * a las 134 con una sola forma, esta pide una operacion concreta con sus
 * parametros y su tipo. Una ficha catastral versionada, un cobro de caja y un
 * padron paginado no son la misma respuesta, y forzarlos a serlo obligaria al
 * backend a aplanar su dominio para caber en el renderizador.
 *
 * El verbo, el camino y que parametros admite salen del contrato (#61), no de
 * quien llama: una operacion de lectura se pide con `GET` porque el contrato lo
 * dice, y un parametro que el contrato no declara no viaja.
 */
export function pedirOperacion<O extends IdDeOperacion>(
  id: O,
  parametros: ParametrosDe<O>,
  senal?: AbortSignal,
): Promise<RespuestaDe<O>> {
  const descriptor = OPERACIONES[id] as DescriptorDeOperacion;
  if (descriptor.metodo === 'DELETE') {
    // En el SGTM no se borra: se anula, se da de baja o se reversa (regla 4,
    // RNF-051). Un DELETE en el contrato es un defecto del contrato.
    throw new Error(`La operacion «${id}» es un DELETE, y en el SGTM no se borra (regla 4).`);
  }

  return solicitar<RespuestaDe<O>>(rutaDeOperacion(id, parametros), {
    metodo: descriptor.metodo,
    consulta: consultaDeOperacion(id, parametros),
    senal,
  });
}

/**
 * Descarga una operacion de lectura como archivo, no como JSON.
 *
 * Existe para el unico caso de hoy: el reporte de la ficha del contribuyente
 * (#71), que el backend sirve en PDF, XLS y RTF segun el parametro `formato`
 * que el contrato ya declara. El resto de operaciones de lectura sigue por
 * `pedirOperacion`; esta es la puerta lateral para cuando la respuesta no es
 * JSON.
 */
export function descargarOperacion<O extends IdDeOperacion>(
  id: O,
  parametros: ParametrosDe<O>,
  senal?: AbortSignal,
): Promise<Archivo> {
  const descriptor = OPERACIONES[id] as DescriptorDeOperacion;
  if (descriptor.metodo !== 'GET') {
    throw new Error(`La operacion «${id}» no es de lectura: no se descarga con ella.`);
  }

  return descargar(rutaDeOperacion(id, parametros), {
    metodo: descriptor.metodo,
    consulta: consultaDeOperacion(id, parametros),
    senal,
  });
}

/**
 * Escribe: manda el cuerpo de una operacion del contrato con su clave de
 * idempotencia.
 *
 * **La clave la trae quien llama, y eso es deliberado.** Generarla aqui la
 * haria nueva en cada llamada, y entonces un reintento del mismo intento del
 * usuario seria un cobro distinto para el servidor: dos recibos por un pago.
 * Quien sabe cuando empieza y acaba un intento es la pantalla, no el cliente
 * HTTP (FRO-04 §5).
 */
export function enviarOperacion<O extends IdDeOperacion>(
  id: O,
  parametros: ParametrosDe<O>,
  cuerpo: CuerpoDe<O>,
  claveDeIdempotencia: string,
  senal?: AbortSignal,
): Promise<RespuestaDe<O>> {
  const descriptor = OPERACIONES[id] as DescriptorDeOperacion;
  if (descriptor.metodo === 'GET') {
    throw new Error(`La operacion «${id}» es de lectura: no se escribe con ella.`);
  }
  if (descriptor.metodo === 'DELETE') {
    throw new Error(`La operacion «${id}» es un DELETE, y en el SGTM no se borra (regla 4).`);
  }

  return solicitar<RespuestaDe<O>>(rutaDeOperacion(id, parametros), {
    metodo: descriptor.metodo,
    consulta: consultaDeOperacion(id, parametros),
    cuerpo,
    claveDeIdempotencia,
    senal,
  });
}

/** Una operacion que escribe: su verbo no es de lectura. */
export const escribe = (id: IdDeOperacion): boolean => OPERACIONES[id].metodo !== 'GET';
