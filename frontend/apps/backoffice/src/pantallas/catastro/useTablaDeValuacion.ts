import { useQuery } from '@tanstack/react-query';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { IdDeOperacion, ParametrosDe } from '@sgtm/api-client';
import { useEjercicio } from '../../app/ejercicio';
import { leerLista } from '../seguridad/listado';

/**
 * Una tabla de valuación por ejercicio: valores unitarios y depreciación (#71).
 *
 * Las dos comparten forma —un arreglo suelto, como `aranceles` (#17)— y la
 * misma razón para estar vacías hoy: **D-02a**. Ninguna de las dos cifras se
 * inventa aquí; lo que se resuelve es que la pantalla pueda decir «vacío»
 * honestamente en vez de fallar, sea porque el conjunto del ejercicio
 * responde una lista vacía o porque el ejercicio todavía no tiene ningún
 * conjunto sellado —`ValorUnitarioController`/`DepreciacionController`
 * responden 404 en ese caso, y las dos situaciones dicen lo mismo—.
 */
export interface TablaDeValuacion {
  readonly ejercicio: number;
  readonly filas: readonly Readonly<Record<string, unknown>>[];
  readonly vacia: boolean;
  readonly cargando: boolean;
  readonly error: unknown;
  readonly reintentar: () => void;
}

export function useTablaDeValuacion<
  O extends Extract<IdDeOperacion, 'valores_unitarios' | 'depreciacion'>,
>(operacion: O, que: string): TablaDeValuacion {
  const { ejercicio } = useEjercicio();

  const consulta = useQuery({
    queryKey: [operacion, ejercicio],
    queryFn: ({ signal }) =>
      pedirOperacion(operacion, { anio: String(ejercicio) } as ParametrosDe<O>, signal).then(
        (cuerpo) => leerLista(cuerpo, que),
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
