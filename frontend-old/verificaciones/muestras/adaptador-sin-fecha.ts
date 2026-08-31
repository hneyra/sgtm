import type { DatosDePantalla } from '@sgtm/api-client';

/**
 * Muestra que viola la regla 9 (RNF-075): un adaptador que se deja la fecha por
 * el camino.
 *
 * El recurso la trae —el backend la manda porque no existe «la deuda», existe
 * la deuda a una fecha— y el adaptador la pierde al traducir. La cifra que sale
 * de aqui ya no se puede mostrar honestamente: no hay forma de decir a que dia
 * esta actualizada.
 *
 * No compila, y esa es toda la proteccion: `DatosDePantalla.fechaCalculo` es
 * obligatoria.
 */

interface CobroDeCaja {
  readonly fechaCalculo: string;
  readonly totalCobrado: string;
}

export function adaptarCobro(cobro: CobroDeCaja): DatosDePantalla {
  return {
    totales: [{ label: 'Total cobrado', value: cobro.totalCobrado }],
  };
}
