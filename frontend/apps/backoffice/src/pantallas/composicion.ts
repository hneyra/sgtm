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
 * Siete opt-in, y ninguno cambia el dibujo de las otras opciones:
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
 *   altas            altas que se abren en un panel lateral sin sacar de la
 *                    pantalla, **solo con privilegio de registro**
 *   altaDeFila       lo mismo, pero colgando de una fila desplegada: recibe la
 *                    clave de esa fila
 *   flujo            un alta guiada que sustituye a los bloques mientras dura
 *
 * Las cuatro fichas catastrales y el catalogo territorial son, hoy, los unicos
 * que declaran algo.
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

export interface WidgetDeFiltro {
  readonly Control: (props: WidgetDeFiltroProps) => ReactElement;
  /**
   * Lo que el control haria con un valor que llega de fuera (la URL de un
   * enlace compartido): el mismo embudo que aplica al teclear. Sin esto, la
   * pantalla ensenaria un codigo bien repartido y «Buscar» mandaria el crudo
   * —guiones incluidos—, que el backend no resuelve por prefijo.
   */
  readonly normalizar: (valor: string) => string;
}

/** Lo que recibe el formulario de un alta abierta en panel. */
export interface AltaEnPanelProps {
  /**
   * El registro del que **cuelga** el alta, cuando cuelga de alguno: el codigo
   * del sector, para una manzana. Vacio para las altas de la pantalla entera.
   */
  readonly contexto?: string;
  readonly onCerrar: () => void;
}

/**
 * Un alta que la pantalla abre en un panel lateral, sin sacar de ella.
 *
 * Se dibuja **solo con el privilegio `registro`** sobre la opcion (REQ-03 §5, y
 * es lo que exige el `POST` del backend): sin el, el boton no existe. No es
 * seguridad —el servidor responde 403 igual—, es no ofrecer un formulario que
 * va a ser rechazado despues de rellenarlo.
 */
export interface AltaEnPanel {
  /**
   * **La accion del catalogo que la abre**, tal como el prototipo la rotula:
   * «Nuevo sector», «Nuevo».
   *
   * No es un boton nuevo al lado del que ya hay: es el que ya hay, que estaba
   * dibujado y muerto. Dibujar otro dejaria dos «Nuevo sector» en la misma barra
   * —uno vivo y uno apagado— y quien atiende no tendria como saber cual es cual.
   * Una accion que el catalogo no dibuje deja el alta inalcanzable, y hay una
   * verificacion que lo impide (`verificaciones/altas-alcanzables.test.ts`).
   */
  readonly accion: string;
  /** Rotulo del panel, que si puede decir de que alta se trata. */
  readonly titulo: string;
  readonly descripcion?: string;
  readonly Formulario: (props: AltaEnPanelProps) => ReactElement;
}

/**
 * Un alta guiada que **sustituye a los bloques** mientras dura (#320).
 *
 * No es un panel: son cuatro pasos que validan contra el territorio, y un
 * asistente de cuarenta campos repartidos en cuatro pantallas no cabe en un
 * cajon lateral. Mientras esta abierto, la pantalla es el asistente.
 */
export interface FlujoGuiado {
  /** La accion del catalogo que lo abre. Misma regla que {@link AltaEnPanel.accion}. */
  readonly accion: string;
  readonly titulo: string;
  readonly Asistente: (props: { readonly onCerrar: () => void }) => ReactElement;
}

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
  /** Altas que esta pantalla abre en un panel lateral. */
  readonly altas?: readonly AltaEnPanel[];
  /**
   * El alta que cuelga de una fila desplegada: recibe la clave de la fila como
   * contexto. Su `accion` no sale del catalogo —el prototipo no dibuja ningun
   * boton dentro de una fila—, asi que la rotula ella misma.
   */
  readonly altaDeFila?: AltaEnPanel;
  /** El alta guiada de esta pantalla, cuando no cabe en un panel. */
  readonly flujo?: FlujoGuiado;
}

const COMPOSICIONES: Readonly<Record<string, ComposicionDeOpcion>> = {
  ...COMPOSICION_DE_CATASTRO,
};

const NINGUNA: ComposicionDeOpcion = {};

/** Lo que compone esta opcion; vacio —y por tanto nada— si no declara nada. */
export const composicionDe = (opcion: string): ComposicionDeOpcion =>
  COMPOSICIONES[opcion] ?? NINGUNA;

/**
 * Cada alta declarada, con la accion del catalogo que la abre.
 *
 * La mira `verificaciones/altas-alcanzables.test.ts`: un alta cuya accion el
 * prototipo no dibuja **no se puede abrir desde la interfaz**, y el sintoma
 * seria que no pasa nada —ni un error, ni un boton apagado—. Es el mismo hueco
 * que `actos-inalcanzables.test.ts` vigila para el acto de una pantalla.
 *
 * Las de fila no entran: no salen del catalogo, se rotulan ellas mismas.
 */
export const ALTAS_DECLARADAS: readonly { readonly opcion: string; readonly accion: string }[] =
  Object.entries(COMPOSICIONES).flatMap(([opcion, composicion]) => [
    ...(composicion.flujo === undefined ? [] : [{ opcion, accion: composicion.flujo.accion }]),
    ...(composicion.altas ?? []).map((alta) => ({ opcion, accion: alta.accion })),
  ]);

/** El control propio de un campo de busqueda, si esa opcion declara uno. */
export const widgetDeFiltro = (opcion: string, campo: string): WidgetDeFiltro | undefined =>
  COMPOSICIONES[opcion]?.widgetsDeFiltro?.[campo];
