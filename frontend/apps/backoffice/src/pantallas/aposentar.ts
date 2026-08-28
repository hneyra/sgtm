import { useEffect, useState } from 'react';

/**
 * El valor, **cuando la mano para**.
 *
 * Vivia dentro de `catastro/AltaGuiadaDeFicha.tsx`, que es donde hizo falta la
 * primera vez: sus dos busquedas en vivo —el duplicado y el padron— entraban en
 * la clave de consulta con lo tecleado tal cual, asi que cada tecla era una
 * consulta contra el padron. Con esto entra **lo que quedo escrito**: teclear
 * «GARCIA» son seis pulsaciones y una consulta.
 *
 * Sube aqui porque el resolutor de `alta_deuda` (#331) necesita exactamente lo
 * mismo, y esta en otro modulo: alcanzar un archivo interno de catastro desde
 * rentas es el defecto que FRO-04 §1 prohibe, y copiarlo daria dos esperas que
 * se separan a la primera correccion. `pantallas/` es el sitio comun de los dos.
 *
 * **No es un `debounce` de propósito general y no debe convertirse en uno.** Lo
 * unico que hace es retrasar el valor que entra en una clave de consulta; quien
 * quiera cancelar una peticion ya en vuelo usa la `signal` de TanStack Query,
 * que es lo que ya hacen las dos busquedas del asistente.
 */
export function useValorAposentado<T>(valor: T, milisegundos = ESPERA): T {
  const [aposentado, fijar] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => fijar(valor), milisegundos);
    return () => clearTimeout(temporizador);
  }, [valor, milisegundos]);

  return aposentado;
}

/** Lo que se espera antes de preguntar. Suficiente para escribir el siguiente dígito. */
export const ESPERA = 300;
