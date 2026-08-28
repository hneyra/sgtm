import type { ComponentType, ReactElement } from 'react';
import type { DatosDePantalla } from '@sgtm/api-client';
import { COMPOSICION_DE_CATASTRO } from './catastro/composicion';
import { COMPOSICION_DE_RENTAS } from './rentas/composicion';

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
 * Ocho opt-in, y ninguno cambia el dibujo de las otras opciones:
 *
 *   widgetsDeFiltro  un campo de busqueda con control propio, por clave de
 *                    campo. Sin declaracion, `Filtros` dibuja su `Campo` de
 *                    texto de siempre
 *   resumen          una cabecera-resumen encima de los datos, compuesta con lo
 *                    que el adaptador **ya trae**: no pide nada nuevo
 *   indice           la pantalla lleva indice de secciones que **desplaza**, no
 *                    recarga; con `'en-vez-de-pestanas'`, ademas las sustituye
 *   acto             el acto de la pantalla vive en otra opcion, y la accion
 *                    primaria lleva alli con el registro abierto puesto en la
 *                    ruta. Es para lo que ninguna accion del prototipo alcanza
 *   altas            altas que se abren en un panel lateral sin sacar de la
 *                    pantalla, **solo con privilegio de registro**
 *   altaDeFila       lo mismo, pero colgando de una fila desplegada: recibe la
 *                    clave de esa fila
 *   flujo            un alta guiada que sustituye a los bloques mientras dura
 *   seleccion        la tabla elige filas, y las elegidas viajan en el cuerpo
 *                    por la tabla que `escrituras.ts` declara
 *
 * Las cuatro fichas catastrales, el catalogo territorial y las tres fichas de
 * rentas son, hoy, los unicos que declaran algo.
 */

/** Lo que recibe una cabecera-resumen: el registro abierto y la respuesta. */
export interface ResumenDePantallaProps {
  /** El registro que abre la pantalla, tal como viene de la ruta. */
  readonly codigo?: string;
  readonly datos?: DatosDePantalla;
  readonly cargando: boolean;
}

/**
 * `ComponentType` y no una funcion suelta, por lo mismo que
 * {@link AltaEnPanel.Formulario}: una cabecera-resumen puede llegar en el trozo
 * de su modulo (`lazy`) en vez de viajar en el arranque comun. `Pantalla` la
 * dibuja dentro de un `Suspense`, asi que las dos formas conviven —la de
 * catastro es directa; las de rentas, perezosas—.
 *
 * Devuelve `ReactElement | null` porque **la cabecera decide si tiene algo que
 * resumir**: sin registro abierto no hay nada que decir, y eso lo sabe ella y no
 * el renderizador —en catastro el registro es el parametro de la ruta; en el
 * padron de contribuyentes es el filtro de la busqueda—.
 */
export type ComponenteDeResumen = ComponentType<ResumenDePantallaProps>;

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
  /**
   * `ComponentType` y no una funcion suelta: el formulario se carga **cuando se
   * abre el panel** (`lazy`), no en el arranque. Sin esto, el registro de
   * composiciones —que `Pantalla` importa siempre— arrastraba al trozo comun
   * cada formulario de alta del sistema, que es codigo que 133 de las 134
   * pantallas no van a usar nunca.
   */
  readonly Formulario: ComponentType<AltaEnPanelProps>;
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
  /**
   * Se carga al abrirlo, por lo mismo que {@link AltaEnPanel.Formulario}.
   *
   * Recibe el `titulo` porque el de la cabecera sigue siendo el de la pantalla
   * que hay detras: sin el, el asistente no dice en ningun sitio que es lo que
   * se esta dando de alta.
   */
  readonly Asistente: ComponentType<{ readonly titulo: string; readonly onCerrar: () => void }>;
}

/** A donde lleva el acto de una pantalla que no lo tiene en su propia barra. */
export interface ActoDeOtraPantalla {
  readonly etiqueta: string;
  /** La ruta del acto, con el registro abierto dentro. */
  readonly rutaDe: (codigo: string) => string;
}

/**
 * La tabla de la pantalla **elige filas**, y lo elegido viaja en el cuerpo.
 *
 * Existe porque cuatro pantallas del manual dibujan una primera columna vacia
 * —«Deuda seleccionable para baja», «Conceptos a cobrar»— que en el prototipo no
 * es nada y en el sistema de escritorio era una casilla. Sin este opt-in, la
 * unica forma de dar de baja una cuota concreta seria teclear a mano su ano, su
 * cuota y su tributo en un formulario, al lado de la tabla que ya los muestra.
 *
 * **La interfaz no totaliza lo elegido** (RNF-083): la banda dice cuantas filas
 * hay elegidas y quien pone el importe es el servidor. Mientras la operacion que
 * lo previsualiza no exista, la banda lo dice —no ensena un cero, ni suma las
 * columnas que tiene delante—.
 */
export interface SeleccionDeFilas {
  /**
   * La tabla del cuerpo, tal como la declara `escrituras.ts`. Si la opcion no
   * la declara, **lo elegido no viaja**: la lista blanca sigue mandando.
   */
  readonly tabla: string;
  /** Como se nombra una fila en la banda: «cuota» / «cuotas». Del manual, no inventado. */
  readonly una: string;
  readonly varias: string;
  /**
   * Lo que cada fila elegida aporta al cuerpo **ademas de sus columnas**.
   *
   * Hoy, el codigo de contribuyente: la baja lo necesita —es de quien es la
   * cuenta corriente— y la tabla no lo publica como columna, porque la pantalla
   * entera es de un contribuyente y va en el filtro. Lo que devuelva pasa por la
   * misma lista blanca por columna que el resto de la fila.
   */
  readonly contexto?: (busqueda: URLSearchParams) => Readonly<Record<string, string>>;
}

export interface ComposicionDeOpcion {
  readonly widgetsDeFiltro?: Readonly<Record<string, WidgetDeFiltro>>;
  readonly resumen?: ComponenteDeResumen;
  /**
   * Indice de secciones que **desplaza**, no recarga.
   *
   *   `true`                  indexa las secciones de la pestana activa, y la
   *                           barra de pestanas se queda donde estaba (las once
   *                           de la ficha urbana)
   *   `'en-vez-de-pestanas'`  las pestanas **desaparecen**: sus secciones se
   *                           apilan en una pagina y el indice las recorre
   *                           (#330). Nada se renombra ni se reagrupa: son las
   *                           mismas secciones del manual, en su orden
   */
  readonly indice?: true | 'en-vez-de-pestanas';
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
  /** La tabla de esta pantalla elige filas, y lo elegido viaja en el cuerpo. */
  readonly seleccion?: SeleccionDeFilas;
}

const COMPOSICIONES: Readonly<Record<string, ComposicionDeOpcion>> = {
  ...COMPOSICION_DE_CATASTRO,
  ...COMPOSICION_DE_RENTAS,
};

const NINGUNA: ComposicionDeOpcion = {};

/**
 * Lo que compone esta opcion; vacio —y por tanto nada— si no declara nada.
 *
 * `Object.hasOwn` y no la indexacion cruda: esta resuelve por la cadena de prototipos, asi
 * que una opcion llamada `constructor` o `toString` devolveria una «composicion» que no
 * declaro nadie. Es la misma barrera que `escrituras.ts` y `escritura.ts`.
 */
export const composicionDe = (opcion: string): ComposicionDeOpcion =>
  (Object.hasOwn(COMPOSICIONES, opcion) ? COMPOSICIONES[opcion] : undefined) ?? NINGUNA;

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

/**
 * El control propio de un campo de busqueda, si esa opcion declara uno.
 *
 * Los dos niveles se resuelven con `Object.hasOwn`, por lo mismo que
 * `composicionDe`: un campo llamado `constructor` daria un «widget» heredado del prototipo
 * de `Object`, y el bloque de busqueda intentaria dibujarlo.
 */
export const widgetDeFiltro = (opcion: string, campo: string): WidgetDeFiltro | undefined => {
  const widgets = composicionDe(opcion).widgetsDeFiltro;
  if (widgets === undefined || !Object.hasOwn(widgets, campo)) return undefined;
  return widgets[campo];
};
