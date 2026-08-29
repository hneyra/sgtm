import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ProblemaDeApi, enviarOperacion, nuevaClaveDeIdempotencia } from '@sgtm/api-client';
import type { CuerpoDe, IdDeOperacion, ParametrosDe } from '@sgtm/api-client';
import { lecturaPorPostDe, porQueNoEsLectura } from './lecturas-por-post';

/**
 * **Pedir una lectura que viaja por `POST`** (#424).
 *
 * La tercera puerta del frontend hacia una peticion con cuerpo, y la unica que
 * **no escribe nada**. Por que hacia falta, y que la separa de las otras dos,
 * esta en el docblock de `lecturas-por-post.ts`; aqui solo esta el como.
 *
 * Tres propiedades, y las tres son la razon de que esto no sea un `useQuery`:
 *
 *   - **Se dispara al pulsar, nunca al montar.** Abrir el emisor de reportes no
 *     puede emitir ninguno: no hay tipo de reporte elegido, y el servidor
 *     contestaria 422 antes de que nadie toque nada. Es la misma razon por la
 *     que `useDatosDePantalla` no pide una operacion que escribe.
 *   - **No pide observacion.** La regla 10 (RNF-052) exige justificar lo que
 *     **modifica datos**, y esto no modifica ninguno: no hay nada que explicar
 *     en la auditoria porque no queda nada asentado. Pedirla igual convertiria
 *     en un acto lo que es una consulta, y llenaria la bitacora de una fila por
 *     cada hoja mirada.
 *   - **La clave de idempotencia se renueva en cada envio.** Cada peticion es
 *     **otra pregunta**, no el reintento de la anterior: con la misma clave, un
 *     servidor que deduplique devolveria la hoja del reporte anterior bajo el
 *     titulo del que se acaba de pedir.
 *
 * Y la guarda se aplica **dos veces**, igual que en `useSimulacion`: quien
 * dibuja decide si ensena la accion, pero quien pide es esto, y las dos tienen
 * que decir lo mismo aunque alguien llame a `pedir()` a mano.
 */
export interface LecturaPorPostEnCurso<T> {
  /**
   * Si esta pantalla puede pedir. Falso cuando no declara ninguna lectura por
   * `POST`, o cuando la que declara **no es una lectura**.
   */
  readonly puedePedir: boolean;
  /** Por que no puede, redactado para quien mantiene. Ver `porQueNoEsLectura`. */
  readonly impedimento?: string;
  readonly pidiendo: boolean;
  /** Lo que devolvio la lectura, ya traducido a lo que la pantalla dibuja. */
  readonly hoja?: T;
  /** Por que no salio, redactado para quien atiende. */
  readonly error?: string;
  /** Pide la hoja con **este** cuerpo. El cuerpo lo compone la pantalla. */
  readonly pedir: (cuerpo: Readonly<Record<string, unknown>>) => void;
}

const NO_LEE = {
  puedePedir: false,
  pidiendo: false,
  pedir: () => {},
};

export function useLecturaPorPost<T>(
  /** La opcion del catalogo, que es quien declara la lectura. */
  opcion: string,
  /**
   * Del cuerpo que devolvio la operacion a lo que la pantalla dibuja.
   *
   * Generico, y no `DatosDePantalla` como en `useSimulacion`: quien lee esto es
   * un componente propio, no los bloques comunes, y la hoja que vuelve trae **su
   * forma junto con sus datos** —el emisor de transito devuelve una de cuatro
   * secciones y es la respuesta la que dice cual—. Con la forma comun por medio,
   * las columnas habria que adivinarlas fuera, a partir de lo ultimo que se
   * eligio en el desplegable, que no es lo mismo que lo ultimo que se emitio.
   */
  deLaRespuesta: (cuerpo: unknown) => T,
): LecturaPorPostEnCurso<T> {
  const declarada = lecturaPorPostDe(opcion);
  const [hoja, fijarHoja] = useState<T | undefined>(undefined);
  const clave = useRef(nuevaClaveDeIdempotencia());

  // Este es el tercer y ultimo sitio del frontend desde el que sale un `POST`,
  // y el segundo que lo hace sin observacion: una lectura no modifica datos, asi
  // que no hay nada que justificar en la auditoria (ver el docblock de arriba).
  // `verificaciones/mutacion-en-tres-caminos.test.ts` cuenta que sigan siendo tres.
  // eslint-disable-next-line no-restricted-syntax
  const mutacion = useMutation({
    mutationFn: async (cuerpo: Readonly<Record<string, unknown>>): Promise<unknown> => {
      if (declarada === undefined) {
        throw new Error(`La opcion «${opcion}» no declara ninguna lectura por POST.`);
      }
      return enviarOperacion(
        declarada.operacion,
        {} as ParametrosDe<IdDeOperacion>,
        cuerpo as CuerpoDe<IdDeOperacion>,
        clave.current,
      );
    },
    onSuccess: (respuesta) => {
      clave.current = nuevaClaveDeIdempotencia();
      fijarHoja(deLaRespuesta(respuesta));
    },
    onError: () => {
      clave.current = nuevaClaveDeIdempotencia();
    },
  });

  if (declarada === undefined) return NO_LEE;
  const impedimento = porQueNoEsLectura(declarada.operacion);

  return {
    puedePedir: impedimento === undefined && !mutacion.isPending,
    ...(impedimento === undefined ? {} : { impedimento }),
    pidiendo: mutacion.isPending,
    ...(hoja === undefined ? {} : { hoja }),
    ...(mutacion.error === null || mutacion.error === undefined
      ? {}
      : { error: motivoDelFallo(mutacion.error) }),
    pedir: (cuerpo) => {
      /* La guarda, otra vez y aqui: `puedePedir` solo decide como se dibuja el
         boton, y una operacion que escribe no puede salir de este archivo
         aunque alguien llame a `pedir()` desde otro sitio. */
      if (impedimento !== undefined || mutacion.isPending) return;
      mutacion.mutate(cuerpo);
    },
  };
}

/**
 * Por que no salio, dicho para quien atiende.
 *
 * El 403 se separa del resto por lo mismo que en el camino de escritura y en la
 * simulacion: «no se pudo, vuelve a intentarlo» al lado de una falta de permiso
 * manda a alguien a pulsar diez veces un boton que nunca va a funcionar. Y el
 * 422 se separa porque **es el mensaje del servidor y ya esta redactado**: el
 * emisor rechaza los criterios que el reporte no usa **nombrandolos**, y
 * reescribirlo aqui perderia justamente el nombre (RNF-080).
 */
function motivoDelFallo(error: unknown): string {
  if (error instanceof ProblemaDeApi) {
    if (error.problema.status === 403) {
      return 'Tu perfil no puede emitir este reporte. Habla con quien administra los permisos.';
    }
    if (error.problema.status === 422) return error.problema.detail;
  }
  return 'No se pudo emitir ahora mismo. Vuelve a intentarlo; si sigue, avísale a sistemas.';
}
