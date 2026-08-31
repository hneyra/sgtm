import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * El ejercicio de trabajo: global a la sesion, visible siempre.
 *
 * **Por que no vive en una pantalla.** El manual lo dice y el backend lo
 * implementa asi (`SesionController#cambiarEjercicio`, #13): el ejercicio es de
 * la sesion, no de la opcion que este abierta. Cambiarlo en «Cambiar el año de
 * trabajo» cambia lo que muestran las otras once modulos, y por eso se guarda
 * aqui arriba y se pinta en la cabecera de todas las pantallas. Una cifra de
 * 2025 mostrada como si fuera de 2026 no es un fallo de formato: es una
 * respuesta equivocada a un contribuyente que vino a preguntar cuanto debe.
 *
 * **Y por que vacia la cache.** Es el mismo caso que cambiar de municipalidad
 * (FRO-01 §4) con otra cara: lo que hay guardado se pidio con el ejercicio
 * anterior, y si sobrevive al cambio la primera pantalla que se dibuje mostrara
 * cifras del ano viejo bajo el rotulo del nuevo. Por eso el orden es **vaciar y
 * despues pedir**, nunca al reves, y hay una prueba que comprueba justo ese
 * orden y no el resultado —al final los dos ordenes acaban con los datos
 * correctos; lo que los separa es lo que se ve mientras tanto—.
 *
 * **De donde sale el valor inicial.** Del reloj del cliente, y es una carencia
 * anotada: el backend guarda el ejercicio en la sesion pero hoy solo lo publica
 * como respuesta del `PUT` que lo cambia —no hay `GET /seguridad/sesion`—, asi
 * que al recargar la pestana no hay a quien preguntarselo. En cuanto esa
 * lectura exista, el valor inicial sale de ella y esta nota se borra.
 */
export interface EjercicioDeTrabajo {
  readonly ejercicio: number;
  /**
   * Adopta el ejercicio que devolvio el servidor tras el `PUT`.
   *
   * Devuelve `'cache-vaciada'` para que el camino de escritura sepa que no
   * tiene que invalidar nada mas: invalidar despues de vaciar volveria a pedir
   * lo que se acaba de pedir.
   */
  readonly adoptar: (respuesta: unknown) => 'cache-vaciada';
}

const Contexto = createContext<EjercicioDeTrabajo | null>(null);

/** El ejercicio que devuelve el `PUT`, si lo trae. */
function ejercicioDe(respuesta: unknown): number | null {
  if (typeof respuesta !== 'object' || respuesta === null) return null;
  const valor = (respuesta as Readonly<Record<string, unknown>>)['ejercicioDeTrabajo'];
  return typeof valor === 'number' && Number.isInteger(valor) ? valor : null;
}

export function ProveedorDeEjercicio({ children }: { readonly children: ReactNode }) {
  const clientes = useQueryClient();
  const [ejercicio, fijarEjercicio] = useState(() => new Date().getFullYear());

  const valor: EjercicioDeTrabajo = useMemo(
    () => ({
      ejercicio,
      adoptar: (respuesta: unknown) => {
        // **El orden importa, y es todo lo que importa aqui.** Primero se vacia
        // y despues se cambia el estado: al reves, el re-render dispararia las
        // peticiones del ejercicio nuevo contra una cache que todavia guarda las
        // respuestas del viejo, y se pintarian esas.
        clientes.clear();
        const nuevo = ejercicioDe(respuesta);
        if (nuevo !== null) fijarEjercicio(nuevo);
        return 'cache-vaciada';
      },
    }),
    [ejercicio, clientes],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEjercicio(): EjercicioDeTrabajo {
  const contexto = useContext(Contexto);
  if (contexto === null) throw new Error('useEjercicio fuera de ProveedorDeEjercicio');
  return contexto;
}
