import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProblemaDeApi, enviarOperacion, nuevaClaveDeIdempotencia } from '@sgtm/api-client';
import type { CuerpoDe, IdDeOperacion, ParametrosDe } from '@sgtm/api-client';

/**
 * El camino de escritura, entero y en un solo sitio.
 *
 * **Toda modificacion de datos exige observacion del usuario** (regla 10 de
 * CLAUDE.md, RNF-052). No es un `placeholder` amable: es la condicion de
 * guardado, y por eso vive aqui y no en cada pantalla —una pantalla que se
 * olvidara de pedirla no podria guardar, porque no hay otra forma de guardar—.
 *
 * Lo demas que resuelve, y que ninguna pantalla deberia volver a resolver:
 *
 * - **Idempotencia.** Una clave por intento del usuario, estable mientras dure
 *   ese intento. Regenerarla en cada reintento convierte un reintento en un
 *   segundo cobro; no regenerarla nunca hace que corregir un dato devuelva el
 *   resultado del intento anterior. Por eso cambia cuando cambia lo que se
 *   manda, y no cuando se vuelve a mandar lo mismo.
 * - **Sin reintento automatico.** Lo fija el cliente de consultas
 *   (`mutations: { retry: false }`) y lo comprueba una prueba, porque es una
 *   linea que alguien «optimiza» algun dia.
 * - **Errores por campo.** `ProblemaDeApi.errores` trae `{ campo, mensaje }`;
 *   el mensaje se pinta junto a su campo **sin reescribirlo** (RNF-080).
 * - **Un envio por pulsacion.** Pulsar dos veces rapido no manda dos veces.
 */
export interface Escritura {
  /** Que operacion se va a escribir, si la pantalla escribe alguna. */
  readonly operacion?: IdDeOperacion;
  readonly observacion: string;
  readonly fijarObservacion: (texto: string) => void;
  /** Sin observacion no se habilita la accion. Esa es toda la regla. */
  readonly puedeEnviar: boolean;
  readonly enviando: boolean;
  readonly enviada: boolean;
  readonly errorPorCampo: Readonly<Record<string, string>>;
  readonly error: unknown;
  readonly enviar: () => void;
  /** La clave del intento en curso. La prueba de idempotencia la mira. */
  readonly clave: string;
}

export function useEscritura(
  operacion: IdDeOperacion | undefined,
  parametros: Readonly<Record<string, string>>,
): Escritura {
  const [observacion, fijarTexto] = useState('');
  const clave = useRef(nuevaClaveDeIdempotencia());
  const clientes = useQueryClient();

  // Este es el unico sitio del frontend donde se escribe, y es el que exige la
  // observacion: la regla de ESLint protege a todos los demas de saltarsela.
  // eslint-disable-next-line no-restricted-syntax
  const mutacion = useMutation({
    mutationFn: async () => {
      if (operacion === undefined) throw new Error('Esta pantalla no escribe ninguna operacion.');
      return enviarOperacion(
        operacion,
        parametros as ParametrosDe<IdDeOperacion>,
        { observacion } as CuerpoDe<IdDeOperacion>,
        clave.current,
      );
    },
    onSuccess: async () => {
      // El intento termino: el siguiente es otro, con otra clave.
      clave.current = nuevaClaveDeIdempotencia();
      fijarTexto('');
      // Lo que se acaba de escribir cambia lo que las consultas muestran.
      await clientes.invalidateQueries();
    },
  });

  return {
    ...(operacion === undefined ? {} : { operacion }),
    observacion,
    fijarObservacion: (texto: string) => {
      // Cambiar lo que se manda empieza un intento nuevo: con la clave anterior,
      // el servidor devolveria el resultado del intento de antes —el que se esta
      // corrigiendo— en vez de aplicar la correccion.
      if (texto !== observacion) clave.current = nuevaClaveDeIdempotencia();
      fijarTexto(texto);
    },
    puedeEnviar: operacion !== undefined && observacion.trim() !== '' && !mutacion.isPending,
    enviando: mutacion.isPending,
    enviada: mutacion.isSuccess,
    errorPorCampo: erroresPorCampo(mutacion.error),
    error: mutacion.error,
    enviar: () => {
      // Pulsar dos veces rapido es una pulsacion: el boton se deshabilita al
      // primer envio, y esto cubre la carrera entre las dos.
      if (mutacion.isPending || observacion.trim() === '') return;
      mutacion.mutate();
    },
    clave: clave.current,
  };
}

function erroresPorCampo(error: unknown): Readonly<Record<string, string>> {
  if (!(error instanceof ProblemaDeApi)) return {};
  const porCampo: Record<string, string> = {};
  for (const { campo, mensaje } of error.errores) porCampo[campo] = mensaje;
  return porCampo;
}

/**
 * Acciones que no se deshacen (regla 4, RNF-051).
 *
 * En el SGTM no se borra: se anula, se da de baja o se reversa, y eso queda
 * asentado. Como no hay vuelta atras, la accion se confirma diciendo **que** va
 * a pasar, no preguntando si se esta seguro: quien pulsa siempre esta seguro.
 */
const IRREVERSIBLES = /anular|anulaci|dar de baja|baja de|emitir|emisi|reversar|quiebre|prescri/i;

export const esIrreversible = (accion: string): boolean => IRREVERSIBLES.test(accion);
