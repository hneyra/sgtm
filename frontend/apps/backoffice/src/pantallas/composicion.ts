import type { ReactElement } from 'react';
import type { DatosDePantalla } from '@sgtm/api-client';
import { COMPOSICION_DE_CATASTRO } from './catastro/composicion';

/**
 * Lo que una opcion compone **alrededor** de los diez bloques comunes.
 *
 * Es la misma idea que ya sostienen `avisos.ts` y `escrituras.ts`: un registro
 * por opcion que el renderizador consulta, y **negacion por omision** —una
 * opcion que no esta aqui se dibuja exactamente como se dibujaba—. Lo que este
 * archivo evita es lo contrario: un `if (estructura.id === 'ficha_urbana')`
 * dentro de `Pantalla`, que es como se bifurca un renderizador que da servicio a
 * 134 pantallas.
 *
 * Tres opt-in, y ninguno cambia el dibujo de las otras opciones:
 *
 *   widgetsDeFiltro  un campo de busqueda con control propio, por clave de
 *                    campo. Sin declaracion, `Filtros` dibuja su `Campo` de
 *                    texto de siempre
 *   resumen          una cabecera-resumen encima de los datos, compuesta con lo
 *                    que el adaptador **ya trae**: no pide nada nuevo
 *   indice           la pantalla lleva indice de secciones que **desplaza**, no
 *                    recarga
 *   acto             el acto de la pantalla vive en otra opcion, y la accion
 *                    primaria lleva alli con el registro abierto puesto en la
 *                    ruta. Es para lo que ninguna accion del prototipo alcanza
 *
 * Las cuatro fichas catastrales son, hoy, las unicas que declaran algo.
 */

/** Lo que recibe una cabecera-resumen: el registro abierto y la respuesta. */
export interface ResumenDePantallaProps {
  /** El registro que abre la pantalla, tal como viene de la ruta. */
  readonly codigo?: string;
  readonly datos?: DatosDePantalla;
  readonly cargando: boolean;
}

export type ComponenteDeResumen = (props: ResumenDePantallaProps) => ReactElement;

/** Lo que recibe un control propio de un campo de busqueda. */
export interface WidgetDeFiltroProps {
  readonly etiqueta: string;
  readonly valor: string;
  readonly onCambio: (valor: string) => void;
}

export type WidgetDeFiltro = (props: WidgetDeFiltroProps) => ReactElement;

/** A donde lleva el acto de una pantalla que no lo tiene en su propia barra. */
export interface ActoDeOtraPantalla {
  readonly etiqueta: string;
  /** La ruta del acto, con el registro abierto dentro. */
  readonly rutaDe: (codigo: string) => string;
}

export interface ComposicionDeOpcion {
  readonly widgetsDeFiltro?: Readonly<Record<string, WidgetDeFiltro>>;
  readonly resumen?: ComponenteDeResumen;
  readonly indice?: boolean;
  readonly acto?: ActoDeOtraPantalla;
}

const COMPOSICIONES: Readonly<Record<string, ComposicionDeOpcion>> = {
  ...COMPOSICION_DE_CATASTRO,
};

const NINGUNA: ComposicionDeOpcion = {};

/** Lo que compone esta opcion; vacio —y por tanto nada— si no declara nada. */
export const composicionDe = (opcion: string): ComposicionDeOpcion =>
  COMPOSICIONES[opcion] ?? NINGUNA;

/** El control propio de un campo de busqueda, si esa opcion declara uno. */
export const widgetDeFiltro = (opcion: string, campo: string): WidgetDeFiltro | undefined =>
  COMPOSICIONES[opcion]?.widgetsDeFiltro?.[campo];
