import { useQuery } from '@tanstack/react-query';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { IdDeOperacion, ParametrosDe } from '@sgtm/api-client';
import { useEjercicio } from '../../app/ejercicio';
import { leerLista } from '../seguridad/listado';

/**
 * Una hoja del cuadro de valuacion del ejercicio: aranceles, valores unitarios
 * y depreciacion (#17, #71, propuesta B).
 *
 * Las tres comparten forma —un arreglo suelto, sin sobre de paginacion, porque
 * sus tres controladores devuelven `List<...Resource>` tal cual— y **el mismo
 * unico parametro**: `ArancelController`, `ValorUnitarioController` y
 * `DepreciacionController` declaran `@RequestParam int anio` y nada mas. El
 * contrato declara ademas `ejercicio`, `region`, `materialMep`, `uso` y la
 * paginacion, y los tres los ignoran; esa brecha es del backend y no se
 * disimula aqui (el mismo corte que #70 acepto para `accesos`).
 *
 * De ahi que el ejercicio **no sea un filtro de la pantalla** sino el de la
 * sesion: es lo unico que decide que cuadro se lee, y por eso sale de
 * `useEjercicio` —el mismo sitio del que lo tomaba la conexion de `aranceles`—
 * y nunca del reloj. Con el reloj, el 1 de enero la pantalla pediria un cuadro
 * que nadie ha sellado mientras la sesion sigue trabajando el ejercicio
 * anterior.
 *
 * Lo demas que llegue por la URL viaja **si el contrato lo declara** y si la
 * hoja no lo tiene bloqueado: quien decide eso es `CuadroDeValuacion`, que es
 * quien conoce la composicion de la opcion.
 */
export type OperacionDeValuacion = Extract<
  IdDeOperacion,
  'aranceles' | 'valores_unitarios' | 'depreciacion'
>;

export interface TablaDeValuacion {
  /** El ejercicio de la sesion con el que se pidio. Es el que se pinta arriba. */
  readonly ejercicio: number;
  readonly filas: readonly Readonly<Record<string, unknown>>[];
  readonly vacia: boolean;
  readonly cargando: boolean;
  readonly error: unknown;
  readonly reintentar: () => void;
}

/** Sin filtros. Constante para que la clave de cache no cambie en cada dibujo. */
const NINGUNO: Readonly<Record<string, string>> = {};

export function useTablaDeValuacion<O extends OperacionDeValuacion>(
  operacion: O,
  que: string,
  filtros: Readonly<Record<string, string>> = NINGUNO,
): TablaDeValuacion {
  const { ejercicio } = useEjercicio();

  // El ejercicio va **el ultimo**: ningun filtro de la URL puede sobrescribir
  // el ano con el que trabaja la sesion.
  const parametros = { ...filtros, anio: String(ejercicio) };

  const consulta = useQuery({
    queryKey: [operacion, parametros],
    queryFn: ({ signal }) =>
      pedirOperacion(operacion, parametros as ParametrosDe<O>, signal).then((cuerpo) =>
        leerLista(cuerpo, que),
      ),
    // El 404 «ejercicio sin sellar» no es un fallo transitorio: reintentarlo
    // no lo cambia, y solo retrasaria decir que esta vacio.
    retry: false,
  });

  const sinSellar = esEjercicioSinSellar(consulta.error);

  return {
    ejercicio,
    filas: consulta.data ?? [],
    vacia: sinSellar || (consulta.data !== undefined && consulta.data.length === 0),
    cargando: consulta.isPending,
    error: sinSellar || consulta.error === null ? undefined : consulta.error,
    reintentar: () => void consulta.refetch(),
  };
}

/** El ejercicio no tiene ningun conjunto sellado todavia: es un vacio, no un error. */
function esEjercicioSinSellar(error: unknown): boolean {
  return error instanceof ProblemaDeApi && error.problema.status === 404;
}
