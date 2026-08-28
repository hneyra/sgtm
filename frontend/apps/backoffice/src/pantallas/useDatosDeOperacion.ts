import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import type { DatosDePantalla } from '@sgtm/api-client';
import { descriptorDe } from '@sgtm/api-client';
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
 *
 * **Sin el registro que abre la pantalla no hay peticion.** Una ficha catastral
 * se pide por su codigo de referencia; sin codigo, pedirla iria a un registro
 * que no es el que el usuario abrio —o fallaria al componer la URL—. Es la
 * misma regla que ya cumplia el camino comun, y vive aqui para que valga para
 * las conectadas sin que cada una la repita.
 *
 * **Y sin los filtros que la operacion exige, tampoco** (`Conexion.exige`): hay
 * operaciones cuyo filtro no es opcional —`GET /consultas/deuda` declara
 * `codContribuyente` como `@RequestParam` obligatorio—, y pedirla sin el es un
 * 400 que quien atiende no sabe leer.
 */
export function useDatosDeOperacion(
  conexion: Conexion,
  /**
   * Lo escrito en el formulario de la pantalla. Entra en los parametros —hay
   * lecturas que dependen de el, ver `ContextoDePantalla.borrador`— y por tanto
   * **en la clave de cache**: cambiar la fecha del acto es otra consulta, no la
   * misma con otro resultado.
   */
  borrador: Readonly<Record<string, string>> = SIN_BORRADOR,
) {
  const ruta = useParams();
  const [busqueda] = useSearchParams();
  const { ejercicio } = useEjercicio();
  const parametros = conexion.parametros({ ruta, busqueda, ejercicio, borrador });
  // Que parametro de ruta le falta para poder pedirse, si le falta alguno.
  const falta = descriptorDe(conexion.operacion).parametrosDeRuta.find(
    (nombre) => (parametros[nombre] ?? '') === '',
  );
  // Y que filtro obligatorio le falta, que apaga la peticion igual.
  const faltaFiltro = conexion.exige?.find(
    (exigido) => (parametros[exigido.parametro] ?? '') === '',
  );

  const consulta = useQuery<DatosDePantalla>({
    queryKey: ['operacion', conexion.operacion, parametros],
    queryFn: ({ signal }) => conexion.cargar(parametros, signal),
    enabled: falta === undefined && faltaFiltro === undefined,
  });

  // Se devuelve junto con la consulta y no se recalcula fuera: quien sabe con
  // que parametros se pidio es este hook, y calcularlo dos veces es la forma de
  // que un dia digan cosas distintas.
  return { consulta, falta, faltaFiltro };
}

/** Sin nada escrito. Constante para que la clave de cache no cambie cada render. */
const SIN_BORRADOR: Readonly<Record<string, string>> = {};
