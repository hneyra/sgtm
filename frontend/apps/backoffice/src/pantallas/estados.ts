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
 * que el error y el sin permiso son de la pantalla entera: no puede fallar la
 * tabla y no el formulario si los dos salen de la misma respuesta. La carga y
 * el vacio si son de cada bloque, porque cada uno sabe que le falta.
 */
export type EstadoDePantalla = 'sin-registro' | 'cargando' | 'sin-permiso' | 'error' | 'con-datos';

export interface ConsultaDeLaPantalla {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly error: unknown;
}

export function estadoDePantalla(
  consulta: ConsultaDeLaPantalla,
  faltaRegistro?: string,
): EstadoDePantalla {
  if (faltaRegistro !== undefined) return 'sin-registro';
  if (consulta.isError) return esSinPermiso(consulta.error) ? 'sin-permiso' : 'error';
  if (consulta.isPending) return 'cargando';
  return 'con-datos';
}

const esSinPermiso = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

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
