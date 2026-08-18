import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { pedirDatosDePantalla } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import type { EstructuraDePantalla } from '../catalogo';
import { operacionDe, parametrosDeBusqueda, registroQueFalta } from './busqueda';

/**
 * Los datos de una pantalla, pedidos a la operacion que declara su catalogo.
 *
 * **La peticion es real.** Hoy la contesta el proxy de datos (`@sgtm/api-mock`)
 * y manana la contestara Spring Boot; en medio no cambia nada, porque este hook
 * no sabe cual de los dos hay al otro lado. Esa ignorancia es el objetivo.
 *
 * Dos cosas que este hook **no** hace, y las dos son deliberadas:
 *
 * - **No inventa el registro.** Una pantalla que abre una ficha necesita su
 *   codigo, y sin el no pide nada. Antes se pedia con la cadena `ejemplo` y la
 *   pantalla parecia funcionar mostrando un registro que no era de nadie.
 * - **No manda un filtro que el contrato no declara.** La semantica de un
 *   filtro la decide el backend (ADR-0010): mientras no exista, el valor vive
 *   en la URL y no viaja.
 *
 * La clave lleva los parametros —`municipalidad` no, que no la conoce el
 * frontend (FRO-01 §4)—, asi que la pagina 2 de una busqueda no se sirve como
 * la pagina 2 de otra.
 */
export function useDatosDePantalla(pantalla: EstructuraDePantalla) {
  const { codigo } = useParams();
  const [consulta] = useSearchParams();

  const operacion = operacionDe(pantalla);
  const parametros =
    operacion === undefined ? {} : parametrosDeBusqueda(operacion, codigo, consulta);
  const falta = operacion === undefined ? undefined : registroQueFalta(operacion, codigo);

  return useQuery<DatosDePantalla>({
    queryKey: ['pantalla', pantalla.id, parametros],
    queryFn: ({ signal }) => {
      if (operacion === undefined) {
        throw new Error(`La opcion «${pantalla.id}» no es una operacion del contrato.`);
      }
      return pedirDatosDePantalla(operacion, parametros, signal);
    },
    enabled: operacion !== undefined && falta === undefined,
  });
}
