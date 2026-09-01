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
import { adaptacionDe } from './conexiones';
import { operacionDe, parametrosDeBusqueda } from './busqueda';
import { simulacionDe } from './composicion';
import type { SimulacionDeLaPantalla } from './composicion';

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
 * ── La guarda que hacia que esto fuera seguro, y la que la sustituye (#395) ──
 *
 * Hasta #395 la condicion era **que contestara el proxy de datos**. El motivo
 * era concreto: el contrato no distingue simular de determinar —es una sola
 * operacion por pantalla—, `POST /rentas/predial/calculo-individual` no tenia
 * controlador, y el dia que lo tuviera podia muy bien **asentar** la
 * determinacion. Pulsar un boton que dice «Simular» y emitir deuda es el
 * defecto que esto no puede permitirse, asi que mientras no se supiera lo que
 * el servidor iba a hacer con la peticion, la unica salida honesta era que el
 * gesto desapareciera al apuntar al backend de verdad.
 *
 * Ese dia llego, y trajo la respuesta: `PredialController` lee **`simulacion`
 * del cuerpo**, y con `simulacion: true` calcula y no asienta nada. La guarda
 * se retira, y lo que la sustituye es esa marca: **solo simula la opcion cuyo
 * cuerpo declara `simulacion: true`**. Es una condicion mejor que la anterior
 * por dos motivos:
 *
 *   - **dice lo que hay que saber.** «Contesta el proxy» no responde a la
 *     pregunta que importa —¿esta peticion escribe?—; la marca si, y la
 *     responde con lo que el propio backend declara aceptar
 *   - **no se afloja al desplegar.** La anterior apagaba el gesto entero contra
 *     el backend real, asi que la pantalla que ya podia simular de verdad
 *     seguia sin poder hacerlo; esta lo deja funcionar exactamente donde es
 *     seguro y en ningun otro sitio
 *
 * Lo que se queda fuera con la marca puesta, y hay que decirlo: **`alcabala`**.
 * Su operacion es `POST /rentas/alcabala`, que **registra** —`AlcabalaController`
 * no acepta ninguna marca de simulacion—, asi que su «Liquidar» declarado en
 * `rentas/composicion.ts` no dispara nada. Es lo correcto y no una perdida: esa
 * pantalla ya declara en `ACTOS_SIN_CAMPO` que no puede liquidar (le faltan
 * `transferenciaId` y el autovaluo ajustado, #385), y lo unico que la guarda
 * anterior conseguia era que el gesto funcionase contra el proxy y desapareciese
 * contra el servidor —que es la forma mas silenciosa de que nadie se entere—.
 *
 * ── Lo que manda y lo que no ────────────────────────────────────────────────
 *
 * Los filtros de la pantalla —el contribuyente, el ejercicio— viajan por la URL
 * como en cualquier lectura, que es de donde `parametrosDeBusqueda` los saca. El
 * cuerpo lleva **solo** lo que la opcion declare en `composicion.ts`: hoy la
 * marca de simulacion y nada mas, y ninguna manda campos del formulario. Es la
 * misma negacion por omision de `escrituras.ts`.
 *
 * ── Y lo que vuelve ya no es siempre la forma comun (#395) ──────────────────
 *
 * Las dos prediales devuelven **un recurso del dominio** —la memoria del
 * calculo, las etapas de la corrida—, que es lo que publica su controlador. La
 * opcion declara entonces su `Adaptacion` (`pantallas/rentas/determinaciones.ts`)
 * y esto la usa; las que siguen contestando `DatosDePantalla` —las que aun
 * responde el proxy— no declaran ninguna y se leen como siempre.
 */

/** Lo que devuelve el hook: como pedir la simulacion y en que estado esta. */
export interface Simulacion {
  /** La accion del catalogo que la dispara, o nada si esta opcion no simula. */
  readonly accion?: string;
  /** Falso cuando la peticion de esta opcion **no lleva la marca** que impide que asiente. */
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

/**
 * La marca con la que el backend distingue mirar la cuenta de asentarla.
 *
 * Se comprueba **el valor y no la clave**: `{ simulacion: false }` es
 * exactamente la peticion que determina, y aceptarla aqui convertiria la accion
 * secundaria de una pantalla en la emision de un padron entero.
 */
const laMarcaViaja = (declarada: SimulacionDeLaPantalla | undefined): boolean =>
  declarada?.cuerpo?.['simulacion'] === true;

export function useSimulacion(opcion: string, busqueda: URLSearchParams): Simulacion {
  const declarada = simulacionDe(opcion);
  const operacion = operacionDe(opcion);
  const adaptacion = adaptacionDe(opcion);
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
      fijarDatos(
        adaptacion === undefined
          ? comoDatosDePantalla(respuesta)
          : adaptacion.deLaRespuesta(respuesta),
      );
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
    puedeSimular: laMarcaViaja(declarada),
    simulando: mutacion.isPending,
    ...(datos === undefined ? {} : { datos }),
    ...(mutacion.error === null || mutacion.error === undefined
      ? {}
      : { error: motivoDelFallo(mutacion.error) }),
    simular: () => {
      // La guarda va tambien aqui y no solo en `puedeSimular`: quien dibuja
      // decide si ensena la accion, pero quien pide es esto, y las dos tienen
      // que decir lo mismo aunque alguien llame a `simular()` a mano.
      if (!laMarcaViaja(declarada)) return;
      mutacion.mutate();
    },
  };
}

/**
 * La respuesta, leida **comprobando que es lo que dice ser**.
 *
 * Es el camino de las opciones que **no** declaran `Adaptacion`: las que sigue
 * contestando el proxy con la forma comun, porque su controlador todavia no
 * existe. El contrato las declara con `schema: { type: object }` —un objeto y
 * nada mas—, asi que el tipo generado no ayuda: hay que mirar. Y lo que hace
 * falta mirar es la **fecha**, porque es lo unico obligatorio de
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
 *
 * Y el **422 se separa por el mismo motivo, con un agravante** (#540): aqui la
 * causa mas frecuente no es un dato mal tecleado sino que **falta publicar una
 * cifra normativa** —el conjunto sellado del ejercicio, o una llave dentro de
 * el—, que es el estado de todas las municipalidades mientras D-02a siga
 * abierta. El servidor lo contesta **nombrando lo que falta**
 * —`TRAMO_PREDIAL_LIMITE:2`, `DERECHO_EMISION_PREDIAL`,
 * `ALICUOTA_ESPECTACULO:CINE`, «El ejercicio 2026 no tiene un conjunto de
 * parametros sellado»—, y ese mensaje ya esta redactado en lenguaje del dominio
 * (RNF-080): reescribirlo aqui perderia justamente el nombre, que es lo unico
 * accionable que lleva. «Vuelve a intentarlo» encima de eso manda a pulsar el
 * boton hasta que alguien publique una ordenanza.
 *
 * Es la misma separacion que `useLecturaPorPost` ya hacia por su lado, y por lo
 * mismo.
 */
function motivoDelFallo(error: unknown): string {
  if (error instanceof ProblemaDeApi) {
    if (error.problema.status === 403) {
      return 'Tu perfil no puede pedir esta determinación. Habla con quien administra los permisos.';
    }
    if (error.problema.status === 422) return error.problema.detail;
  }
  return 'No se pudo calcular ahora mismo. Vuelve a intentarlo; si sigue, avísale a sistemas.';
}
