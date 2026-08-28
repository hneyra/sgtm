import { lazy } from 'react';
import type { ComposicionDeOpcion } from '../composicion';

/**
 * Las cabeceras-resumen, **cargadas con el modulo y no en el arranque**.
 *
 * Este archivo lo importa `pantallas/composicion.ts`, y ese lo importa
 * `Pantalla`: importar aqui los tres componentes los metia en el trozo comun,
 * que es el que baja quien entra a mirar un recibo y no va a abrir ninguna ficha
 * de rentas. `lazy` los deja en un trozo aparte que solo pide quien abre la
 * ficha; `yarn comprobar-compilaciones` mide que el arranque no crezca por esto.
 */
const ResumenDeContribuyente = lazy(async () => ({
  default: (await import('./ResumenDeContribuyente')).ResumenDeContribuyente,
}));
const ResumenDeVehiculo = lazy(async () => ({
  default: (await import('./ResumenDeVehiculo')).ResumenDeVehiculo,
}));
const ResumenDeDeclaracion = lazy(async () => ({
  default: (await import('./ResumenDeDeclaracion')).ResumenDeDeclaracion,
}));

/**
 * Lo que Rentas · Registro compone alrededor de los bloques comunes (#330, #332).
 *
 * Dos cosas, y las dos opt-in por opcion:
 *
 * 1. **Las tres fichas abren con cabecera-resumen**, y las dos que reparten sus
 *    campos en pestanas las cambian por un indice que desplaza. Es el mismo
 *    mecanismo de las fichas catastrales (#319) sobre otro objeto: nueve
 *    pestanas y 56 campos —de los que el backend llena siete— obligan a nueve
 *    clics para averiguar si un dato existe, y apiladas se ven de una pasada.
 *    **Ninguna seccion se renombra ni se reagrupa** (RNF-080): son las del
 *    manual, en su orden; lo unico que desaparece es la barra de pestanas, que
 *    era navegacion y no contenido.
 *
 * 2. **La baja de deuda elige su fila.** Su tabla dibuja una primera columna
 *    vacia desde el prototipo, y esa columna es la obligacion que se da de baja.
 *    Lo elegido viaja por la tabla `cuotas` que `escrituras.ts` declara, con su
 *    lista blanca por columna.
 */

/** Cabecera-resumen mas indice que **sustituye** a las pestanas de la ficha. */
const FICHA_CON_PESTANAS = { indice: 'en-vez-de-pestanas' } as const;

export const COMPOSICION_DE_RENTAS: Readonly<Record<string, ComposicionDeOpcion>> = {
  contribuyentes: { ...FICHA_CON_PESTANAS, resumen: ResumenDeContribuyente },
  vehiculos: { ...FICHA_CON_PESTANAS, resumen: ResumenDeVehiculo },
  /**
   * La declaracion jurada lleva resumen y **no** indice, y esa asimetria es
   * deliberada: su catalogo declara **una** seccion. Un indice de una entrada no
   * es un indice, es un titulo repetido con un clic de por medio.
   */
  declaracion_jurada: { resumen: ResumenDeDeclaracion },
  baja_deuda: {
    seleccion: {
      tabla: 'cuotas',
      una: 'cuota',
      varias: 'cuotas',
      // El contribuyente no es una columna de la tabla —la pantalla entera es de
      // uno solo, y su codigo esta en el filtro—, pero el backend lo necesita:
      // la baja se registra contra su cuenta corriente. Entra en la fila como
      // una columna mas, y pasa por la misma lista blanca que las demas.
      contexto: (busqueda) => ({ codContribuyente: busqueda.get('codContribuyente') ?? '' }),
    },
  },
};
