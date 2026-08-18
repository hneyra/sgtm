import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import type { DatosDePantalla } from '@sgtm/api-client';
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
 */
export function useDatosDeOperacion(conexion: Conexion) {
  const ruta = useParams();
  const [busqueda] = useSearchParams();
  const parametros = conexion.parametros({ ruta, busqueda });

  return useQuery<DatosDePantalla>({
    queryKey: ['operacion', conexion.operacion, parametros],
    queryFn: ({ signal }) => conexion.cargar(parametros, signal),
  });
}
