import { descriptorDe } from '@sgtm/api-client';
import type { IdDeOperacion } from '@sgtm/api-client';
import { OPERACIONES } from '@sgtm/api-client';

/**
 * El estado de una busqueda vive en la URL, no en `useState` (FRO-04 §5).
 *
 * Por que importa, mas alla de la ortodoxia: quien atiende en ventanilla
 * comparte el enlace de lo que esta mirando, recarga cuando el navegador se le
 * queda, y vuelve atras. Con el estado en memoria, las tres cosas pierden la
 * busqueda; con el estado en la URL, las tres la conservan. Es la diferencia
 * entre una pantalla que describe una operacion y una que se puede usar.
 *
 * Reparto:
 *
 *   parametro de ruta   el registro abierto: `/catastro/ficha-urbana/01-02-03`
 *   consulta            filtros, orden y pagina: `?sector=01&orden=nombre`
 */

/**
 * Nombres que la busqueda se reserva; el resto de la consulta son filtros.
 *
 * Son **los del backend** (`ParametrosDePaginacion` de #6): `ordenarPor` y no
 * `orden`, `direccion` y no `sentido`. La interfaz los propuso primero, cuando
 * no habia capa web; ahora la hay y manda ella.
 */
export const ORDEN = 'ordenarPor';
export const SENTIDO = 'direccion';
export const PAGINA = 'pagina';

/**
 * El alta guiada abierta, en la URL y no en el estado del componente (#498 F2).
 *
 * Estaba en un `useState` de `Pantalla`, y eso hacia tres cosas mal: recargar
 * perdia el asistente a medias, el enlace de lo que se estaba haciendo no lo
 * llevaba, y **nada fuera de la pantalla podia abrirlo** —que es lo que el
 * boton «Registrar predio» del panel lateral necesita, porque vive en el shell
 * y no dentro de la pantalla que aloja el flujo—.
 *
 * No es un filtro: `parametrosDeBusqueda` solo manda lo que el contrato
 * declara, asi que este parametro se queda en la barra de direcciones y no
 * viaja a ninguna peticion.
 */
export const NUEVO = 'nuevo';

/**
 * La pestana abierta de una superficie, en la URL (#498 F4).
 *
 * Era un `useState` de `FichaDelPredio`, y con el **el enlace de lo que se esta
 * mirando no llevaba la pestana**: quien pega la direccion de «la titularidad
 * del predio 01-1042-0004» abria la ficha en Identificacion, y quien recarga
 * despues de mirar Valorizacion vuelve al principio. Es la misma regla con la
 * que el filtro, el orden y la pagina viven en la barra de direcciones
 * (FRO-04 §5): lo que se esta viendo se puede compartir.
 *
 * No es un filtro: `parametrosDeBusqueda` solo manda lo que el contrato
 * declara, asi que no viaja a ninguna peticion.
 */
export const PESTANA = 'pestana';

export type Sentido = 'ASCENDENTE' | 'DESCENDENTE';

export interface EstadoDeBusqueda {
  readonly filtros: Readonly<Record<string, string>>;
  readonly orden?: string;
  readonly sentido: Sentido;
  readonly pagina: number;
}

const PRIMERA_PAGINA = 1;

export function leerBusqueda(consulta: URLSearchParams): EstadoDeBusqueda {
  const filtros: Record<string, string> = {};
  for (const [nombre, valor] of consulta.entries()) {
    if (nombre === ORDEN || nombre === SENTIDO || nombre === PAGINA) continue;
    // Un filtro vacio no es un filtro: `?sector=` no significa «sector en
    // blanco», y el backend no tiene por que adivinar cual de las dos cosas es.
    if (valor !== '') filtros[nombre] = valor;
  }

  const pagina = Number.parseInt(consulta.get(PAGINA) ?? '', 10);
  const orden = consulta.get(ORDEN) ?? '';

  return {
    filtros,
    ...(orden === '' ? {} : { orden }),
    sentido: consulta.get(SENTIDO) === 'DESCENDENTE' ? 'DESCENDENTE' : 'ASCENDENTE',
    // En la URL la primera pagina es la 1, que es como las cuenta quien las lee.
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : PRIMERA_PAGINA,
  };
}

/**
 * Devuelve la consulta con un cambio aplicado, **conservando lo demas**.
 *
 * Cambiar de pagina o de orden no puede perder los filtros aplicados: quien
 * busco «uso: Comercio, sector 01» y pasa a la pagina 2 espera la pagina 2 de
 * su busqueda, no la de todo el padron.
 */
export function conCambio(
  consulta: URLSearchParams,
  cambios: Readonly<Record<string, string | undefined>>,
): URLSearchParams {
  const siguiente = new URLSearchParams(consulta);
  for (const [nombre, valor] of Object.entries(cambios)) {
    if (valor === undefined || valor === '') siguiente.delete(nombre);
    else siguiente.set(nombre, valor);
  }
  return siguiente;
}

/** Ordenar por una columna: la misma columna alterna el sentido, otra empieza ascendente. */
export function conOrden(consulta: URLSearchParams, columna: string): URLSearchParams {
  const estado = leerBusqueda(consulta);
  const invertir = estado.orden === columna && estado.sentido === 'ASCENDENTE';
  return conCambio(consulta, {
    [ORDEN]: columna,
    [SENTIDO]: invertir ? 'DESCENDENTE' : 'ASCENDENTE',
    // Un orden nuevo devuelve a la primera pagina: la pagina 7 de otro orden no
    // es ninguna pagina.
    [PAGINA]: undefined,
  });
}

/**
 * Los parametros con los que se pide una operacion.
 *
 * Se arman de la ruta y de la busqueda, y **los filtra el contrato**: un
 * parametro que la operacion no declara no viaja. Es lo que impide que la
 * interfaz invente la semantica de un filtro que el backend no ha decidido
 * (ADR-0010), y lo que garantiza que `municipalidadId` no pueda colarse ni como
 * filtro de conveniencia: el contrato no lo declara y el generador no lo
 * dejaria declararlo (regla 2, FRO-01 §4).
 */
export function parametrosDeBusqueda(
  operacion: IdDeOperacion,
  registro: string | undefined,
  consulta: URLSearchParams,
): Readonly<Record<string, string>> {
  const descriptor = descriptorDe(operacion);
  const estado = leerBusqueda(consulta);
  const parametros: Record<string, string> = {};

  // El registro abierto resuelve el parametro de la ruta. Si no hay registro no
  // se inventa uno: la peticion no sale.
  for (const nombre of descriptor.parametrosDeRuta) {
    if (registro !== undefined && registro !== '') parametros[nombre] = registro;
  }

  const declarados = new Set(descriptor.parametrosDeConsulta);
  for (const [nombre, valor] of Object.entries(estado.filtros)) {
    if (declarados.has(nombre)) parametros[nombre] = valor;
  }
  if (estado.orden !== undefined && declarados.has(ORDEN)) {
    parametros[ORDEN] = estado.orden;
    if (declarados.has(SENTIDO)) parametros[SENTIDO] = estado.sentido;
  }
  if (estado.pagina !== PRIMERA_PAGINA && declarados.has(PAGINA)) {
    // El backend cuenta las paginas desde 0 y la URL desde 1: la traduccion vive
    // aqui, en una linea, y no en cada pantalla.
    parametros[PAGINA] = String(estado.pagina - 1);
  }

  return parametros;
}

/** La opcion del catalogo es una operacion del contrato: lo verifica `catalogo.test.ts`. */
export function operacionDe(opcion: string): IdDeOperacion | undefined {
  return opcion in OPERACIONES ? (opcion as IdDeOperacion) : undefined;
}

/** Que registro le falta a la pantalla para poder pedir sus datos. */
export function registroQueFalta(
  operacion: IdDeOperacion,
  registro: string | undefined,
): string | undefined {
  const [pendiente] = descriptorDe(operacion).parametrosDeRuta;
  if (pendiente === undefined) return undefined;
  return registro === undefined || registro === '' ? pendiente : undefined;
}
