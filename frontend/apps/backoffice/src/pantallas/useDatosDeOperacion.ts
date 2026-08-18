import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import type { DatosDePantalla } from '@sgtm/api-client';
import { useEjercicio } from '../app/ejercicio';
import type { Conexion } from './conexiones';

/**
 * Los datos de una opcion conectada: su operacion tipada, su adaptador y su
 * clave de cache.
 *
 * **La clave lleva los parametros**, y no es un detalle: con `['pantalla', id]`
 * a secas, buscar la ficha de un contribuyente y despues la de otro devolveria
 * la primera, porque para la cache serian la misma consulta. En un sistema que
 * atiende en ventanilla eso no es un fallo de rendimiento: es mostrarle a
 * alguien los datos de otro.
 *
 * `municipalidad` **no** aparece en la clave: no la conoce el frontend
 * (FRO-01 §4). Al cambiar de municipalidad se vacia la cache entera.
 *
 * El **ejercicio de trabajo** si entra en el contexto de la peticion, porque hay
 * operaciones que lo exigen —la bitacora esta particionada por ejercicio y su
 * controlador lo pide obligatorio (#13)—. No hace falta ponerlo aparte en la
 * clave: cambiarlo vacia la cache entera, igual que cambiar de municipalidad.
 */
export function useDatosDeOperacion(conexion: Conexion) {
  const ruta = useParams();
  const [busqueda] = useSearchParams();
  const { ejercicio } = useEjercicio();
  const parametros = conexion.parametros({ ruta, busqueda, ejercicio });

  return useQuery<DatosDePantalla>({
    queryKey: ['operacion', conexion.operacion, parametros],
    queryFn: ({ signal }) => conexion.cargar(parametros, signal),
  });
}
