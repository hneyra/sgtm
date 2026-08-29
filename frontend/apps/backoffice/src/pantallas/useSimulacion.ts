import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ProblemaDeApi,
  enviarOperacion,
  escribe,
  nuevaClaveDeIdempotencia,
} from '@sgtm/api-client';
import type { CuerpoDe, DatosDePantalla, IdDeOperacion, ParametrosDe } from '@sgtm/api-client';
import { esObjeto } from '@sgtm/lectura';
import { proxyDeDatosContestando } from './entorno';
import { operacionDe, parametrosDeBusqueda } from './busqueda';
import { simulacionDe } from './composicion';

/**
 * **Enseñar el resultado antes de escribir**, que es el otro gesto de una
 * pantalla de determinacion (#393).
 *
 * Las cinco —predial individual y masivo, arbitrios, calculo vehicular y
 * alcabala— tienen una accion que no guarda nada: «Simular», «Recalcular»,
 * «Liquidar». Hasta hoy no hacian nada, y la pantalla se quedaba con sus
 * importes en «—» sin que hubiera forma de ver la cuenta.
 *
 * ── Por que esto no es una escritura, y por que aun asi va por un solo sitio ─
 *
 * Una simulacion **no modifica datos**, asi que la regla 10 —sin observacion no
 * se guarda (RNF-052)— no le aplica: no hay nada que justificar en la auditoria
 * porque no queda nada asentado. Pero la operacion del contrato **es un `POST`**
 * —las cinco pantallas tienen una sola operacion, y es la misma con la que se
 * determinaria—, asi que la peticion sale por `enviarOperacion` y ESLint la ve
 * como lo que parece: una mutacion suelta. Por eso este archivo es el **segundo
 * y ultimo** sitio del frontend con la excepcion escrita al lado, igual que
 * `escritura.ts`, y por eso `verificaciones/` cuenta que sigan siendo dos.
 *
 * ── La guarda que hace que esto sea seguro ──────────────────────────────────
 *
 * **Solo simula mientras la respuesta la da el proxy de datos.** Es la condicion
 * que quita el riesgo de todo lo demas: hoy `POST /rentas/predial/calculo-individual`
 * no tiene controlador, y el dia que lo tenga puede muy bien **asentar** la
 * determinacion —`RegistrarDeterminacionPredial` existe en el dominio— porque el
 * contrato no distingue simular de determinar: es una sola operacion. Pulsar un
 * boton que dice «Simular» y emitir deuda es el defecto que esto no puede
 * permitirse, asi que la unica manera honesta de tener el gesto hoy es que el
 * gesto **desaparezca** cuando deje de contestar el proxy.
 *
 * Con `VITE_SGTM_PROXY_DE_DATOS=false` —que es como se apunta al backend de
 * verdad— `puedeSimular` es falso, la accion vuelve a estar apagada y la
 * pantalla vuelve exactamente a lo que enseñaba antes: la franja de #333
 * diciendo que la determinacion la hace el servidor. Quien conecte esa capa web
 * decide entonces, con el controlador delante, si hay una operacion de
 * simulacion que llamar; no se decide aqui a ciegas.
 *
 * ── Lo que manda y lo que no ────────────────────────────────────────────────
 *
 * Los filtros de la pantalla —el contribuyente, el ejercicio— viajan por la URL
 * como en cualquier lectura, que es de donde `parametrosDeBusqueda` los saca. El
 * cuerpo lleva **solo** lo que la opcion declare en `composicion.ts`: hoy
 * ninguna declara nada mas que la marca de simulacion, y ninguna manda campos
 * del formulario. Es la misma negacion por omision de `escrituras.ts`.
 */

/** Lo que devuelve el hook: como pedir la simulacion y en que estado esta. */
export interface Simulacion {
  /** La accion del catalogo que la dispara, o nada si esta opcion no simula. */
  readonly accion?: string;
  /** Falso cuando el backend contesta de verdad: entonces no se simula nada. */
  readonly puedeSimular: boolean;
  readonly simulando: boolean;
  /** Lo que devolvio la simulacion, para mezclarlo con lo que la pantalla ya tiene. */
  readonly datos?: DatosDePantalla;
  /** Por que no se pudo, redactado para leerlo al lado de la accion. */
  readonly error?: string;
  readonly simular: () => void;
}

const NO_SIMULA: Simulacion = {
  puedeSimular: false,
  simulando: false,
  simular: () => {},
};

export function useSimulacion(opcion: string, busqueda: URLSearchParams): Simulacion {
  const declarada = simulacionDe(opcion);
  const operacion = operacionDe(opcion);
  const [datos, fijarDatos] = useState<DatosDePantalla | undefined>(undefined);
  const clave = useRef(nuevaClaveDeIdempotencia());

  // Este es el segundo y ultimo sitio del frontend desde el que sale un `POST`,
  // y el unico que lo hace sin observacion: una simulacion no modifica datos.
  // Ver el docblock de arriba, y `verificaciones/` cuenta que sigan siendo dos.
  // eslint-disable-next-line no-restricted-syntax
  const mutacion = useMutation({
    mutationFn: async (): Promise<unknown> => {
      if (operacion === undefined)
        throw new Error('Esta pantalla no es una operacion del contrato.');
      return enviarOperacion(
        operacion,
        parametrosDeBusqueda(operacion, undefined, busqueda) as ParametrosDe<IdDeOperacion>,
        (declarada?.cuerpo ?? {}) as CuerpoDe<IdDeOperacion>,
        // Cada simulacion es **otra pregunta**, no el reintento de la anterior:
        // la clave se renueva en cada envio. Si fuera la misma, un servidor que
        // deduplique por idempotencia devolveria la respuesta de la anterior.
        clave.current,
      );
    },
    onSuccess: (respuesta) => {
      clave.current = nuevaClaveDeIdempotencia();
      fijarDatos(comoDatosDePantalla(respuesta));
    },
    onError: () => {
      clave.current = nuevaClaveDeIdempotencia();
    },
  });

  /* Sin declaracion no hay simulacion, y **sin un verbo que acepte cuerpo
     tampoco**: `enviarOperacion` lanza sobre una operacion de lectura, y con
     razon. «Arbitrios» es el caso: su operacion es un `GET`, asi que ya trae sus
     cifras al abrir y no tiene nada que simular. La comprobacion esta aqui para
     que declararla por error no acabe en una excepcion al pulsar. */
  if (declarada === undefined || operacion === undefined || !escribe(operacion)) return NO_SIMULA;

  return {
    accion: declarada.accion,
    puedeSimular: proxyDeDatosContestando(),
    simulando: mutacion.isPending,
    ...(datos === undefined ? {} : { datos }),
    ...(mutacion.error === null || mutacion.error === undefined
      ? {}
      : { error: motivoDelFallo(mutacion.error) }),
    simular: () => {
      // La guarda va tambien aqui y no solo en `puedeSimular`: quien dibuja
      // decide si ensena la accion, pero quien pide es esto, y las dos tienen
      // que decir lo mismo aunque alguien llame a `simular()` a mano.
      if (!proxyDeDatosContestando()) return;
      mutacion.mutate();
    },
  };
}

/**
 * La respuesta, leida **comprobando que es lo que dice ser**.
 *
 * El contrato declara estas cinco operaciones con `schema: { type: object }`
 * —un objeto y nada mas—, asi que el tipo generado no ayuda: hay que mirar. Y
 * lo que hace falta mirar es la **fecha**, porque es lo unico obligatorio de
 * `DatosDePantalla` y es lo que hace honesta cada cifra que venga detras (regla
 * 9, RNF-075). Una respuesta sin ella se rechaza **en voz alta** en vez de
 * dibujarse a medias: una determinacion sin fecha es una cuenta que dentro de
 * tres dias es otra y nadie puede decir de cuando era.
 */
function comoDatosDePantalla(respuesta: unknown): DatosDePantalla {
  if (!esObjeto(respuesta) || typeof respuesta['fechaCalculo'] !== 'string') {
    throw new Error('La determinacion no vino con su fecha de calculo.');
  }
  return respuesta as unknown as DatosDePantalla;
}

/**
 * Por que no salio, dicho para quien atiende.
 *
 * El 403 se separa del resto por lo mismo que en el camino de escritura: «no se
 * pudo, vuelve a intentarlo» al lado de una falta de permiso manda a alguien a
 * pulsar diez veces un boton que nunca va a funcionar.
 */
function motivoDelFallo(error: unknown): string {
  if (error instanceof ProblemaDeApi && error.problema.status === 403) {
    return 'Tu perfil no puede pedir esta determinación. Habla con quien administra los permisos.';
  }
  return 'No se pudo calcular ahora mismo. Vuelve a intentarlo; si sigue, avísale a sistemas.';
}
