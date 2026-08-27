import { ProblemaDeApi } from '@sgtm/api-client';

/**
 * Los cuatro estados de una pantalla (FRO-01 §7).
 *
 * El prototipo no los disena: dibuja la pantalla con datos y ya. Contra el
 * proxy eso se nota poco —responde siempre y rapido—; contra un backend real,
 * una consulta de padron que tarda, un filtro sin resultados o una red caida
 * son el estado normal de la pantalla varias veces al dia.
 *
 * **Donde vive cada estado, y por que.** Hay una peticion por pantalla, asi
 * que el error, el sin permiso y el no disponible son de la pantalla entera: no
 * puede fallar la tabla y no el formulario si los dos salen de la misma
 * respuesta. La carga y el vacio si son de cada bloque, porque cada uno sabe
 * que le falta.
 *
 * **`no-disponible` no es un error.** El contrato declara 134 operaciones y el
 * backend publica una fraccion; el resto responde 404. Una pantalla portada del
 * prototipo cuyo backend todavia no se escribio no esta rota: esta pendiente, y
 * se cuenta sin alarma y sin boton de reintentar —reintentar daria el mismo 404
 * hasta que exista el endpoint—.
 */
export type EstadoDePantalla =
  'sin-registro' | 'cargando' | 'sin-permiso' | 'no-disponible' | 'error' | 'con-datos';

export interface ConsultaDeLaPantalla {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly error: unknown;
}

export function estadoDePantalla(
  consulta: ConsultaDeLaPantalla,
  faltaRegistro?: string,
  /**
   * Si la pantalla pide sus datos al abrirse. Las que escriben no lo hacen:
   * abrir «Copias de seguridad» no puede lanzar un respaldo, asi que no estan
   * cargando —estan esperando a que alguien pulse—.
   */
  pide = true,
): EstadoDePantalla {
  if (faltaRegistro !== undefined) return 'sin-registro';
  if (consulta.isError) {
    if (esSinPermiso(consulta.error)) return 'sin-permiso';
    if (esNoDisponible(consulta.error)) return 'no-disponible';
    return 'error';
  }
  if (!pide) return 'con-datos';
  if (consulta.isPending) return 'cargando';
  return 'con-datos';
}

const esSinPermiso = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

/**
 * La operacion existe en el contrato pero el backend todavia no la publica: un
 * `NoResourceFoundException` que el servidor traduce a 404 (ver
 * `ManejadorDeErrores`). No hay nada que reintentar.
 */
const esNoDisponible = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 404;

/**
 * Que decir cuando no hay filas.
 *
 * «Sin resultados para este filtro» y «este padron esta vacio» no son lo mismo
 * para quien atiende en ventanilla: en el primer caso hay algo que hacer
 * —quitar un filtro—, y en el segundo no hay nada que buscar.
 */
export interface TextoDeVacio {
  readonly titulo: string;
  readonly detalle: string;
}

export function vacioDe(que: string, hayFiltros: boolean): TextoDeVacio {
  return hayFiltros
    ? {
        titulo: `Ningún resultado para esta búsqueda`,
        detalle: `No hay ${que} que cumplan los filtros aplicados. Quita alguno o corrige el valor: los filtros se conservan en la dirección, así que puedes volver a esta misma búsqueda.`,
      }
    : {
        titulo: `Todavía no hay ${que}`,
        detalle: `Cuando se registren, aparecerán aquí.`,
      };
}

/** Lo que se cuenta de un error sin repetir lo que ya redacto el backend (RNF-080). */
export function textoDeError(error: unknown): {
  readonly titulo: string;
  readonly detalle: string;
  readonly traza?: string;
} {
  if (error instanceof ProblemaDeApi) {
    return {
      titulo: error.titulo,
      detalle: error.detalle,
      ...(error.traza === undefined ? {} : { traza: error.traza }),
    };
  }
  return {
    titulo: 'No se pudieron cargar los datos',
    detalle: 'Vuelve a intentarlo; si persiste, avisa a soporte con la hora exacta.',
  };
}

/**
 * Sin permiso: se dice que falta permiso y **no que hay detras**.
 *
 * Que la interfaz oculte una opcion es comodidad, no seguridad (REQ-03 §5): la
 * comprobacion es del servidor, que responde 403 igual. Lo que si es del
 * cliente es no convertir el mensaje en un indice de lo que existe.
 */
export const SIN_PERMISO = {
  titulo: 'No tienes permiso para esta opción',
  detalle:
    'Tu usuario no tiene acceso a esta opción del menú. Si crees que deberías tenerlo, pídeselo al administrador del sistema de tu municipalidad.',
} as const;

/**
 * Todavía no disponible: la pantalla existe pero su operación aún no la sirve el
 * backend (404).
 *
 * No es un error del servidor ni un problema de la municipalidad: es trabajo
 * pendiente. Se dice sin alarma, sin traza y sin «Reintentar» —el endpoint no
 * aparece por reintentar—. Cuando se publique, la pantalla carga sola.
 */
export const NO_DISPONIBLE = {
  titulo: 'Esta opción todavía no está disponible',
  detalle:
    'La pantalla ya está en el sistema, pero la operación que la alimenta aún no se ha habilitado en el servidor. Estará disponible sin que tengas que hacer nada cuando se publique.',
} as const;
