import { useQuery } from '@tanstack/react-query';
import { pedirDatosDePantalla } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import type { EstructuraDePantalla } from '../catalogo';

/**
 * Los datos de una pantalla, pedidos a la operacion que declara su catalogo.
 *
 * **La peticion es real.** Hoy la contesta el proxy de datos (`@sgtm/api-mock`)
 * y manana la contestara Spring Boot; en medio no cambia nada, porque este hook
 * no sabe cual de los dos hay al otro lado. Esa ignorancia es el objetivo.
 *
 * Clave jerarquica (`['pantalla', id]`) para poder invalidar por prefijo, y
 * `municipalidad` **no** aparece en ella: no la conoce el frontend (FRO-01 §4).
 */
export function useDatosDePantalla(pantalla: EstructuraDePantalla) {
  return useQuery<DatosDePantalla>({
    queryKey: ['pantalla', pantalla.id],
    queryFn: ({ signal }) => pedirDatosDePantalla(pantalla.endpoint, signal),
  });
}
