import type { ComponentType, ReactElement } from 'react';
import type { DatosDePantalla } from '@sgtm/api-client';
import { COMPOSICION_DE_CATASTRO } from './catastro/composicion';
import { COMPOSICION_DE_CONSULTAS } from './consultas/composicion';
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
 * Diez opt-in, y ninguno cambia el dibujo de las otras opciones:
 *
 *   widgetsDeFiltro  un campo de busqueda con control propio, por clave de
 *                    campo. Sin declaracion, `Filtros` dibuja su `Campo` de
 *                    texto de siempre
 *   filtrosBloqueados un campo de busqueda que se ve y no se manda, con su
 *                    motivo: el que el servidor rechaza con 422
 *   resolutores      lo mismo, **para un campo de seccion**: el que resuelve un
 *                    codigo, una placa o un RUC contra el identificador interno
 *                    que el backend pide. Sin declaracion, `Formulario` dibuja
 *                    su `Campo` de siempre
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

/**
 * Lo que recibe un campo de seccion **que resuelve** (#331).
 *
 * El hueco que cierra: quien atiende tiene un codigo catastral, una placa o un
 * RUC, y el backend pide identificadores internos —`predioId`, `vehiculoId`,
 * `transferenciaId`, `organizadorId`—. Sin un sitio donde hacer esa traduccion,
 * el campo se teclea y **no viaja**, que es lo que le pasaba a
 * `unidadPredioPlaca` de `alta_deuda`.
 *
 * Es hermano de {@link WidgetDeFiltro} y no lo mismo, y la diferencia importa:
 * un widget de filtro compone **una cadena** que acaba en la URL, y esto fija
 * **campos del cuerpo** que pasan por la lista blanca de `escrituras.ts`. Lo
 * tecleado —el codigo, la placa— es texto de presentacion y no viaja: se queda
 * en el control, como el borrador de `Filtros`.
 */
export interface ResolutorProps {
  /** El rotulo del campo del catalogo al que sustituye. No se reescribe (RNF-080). */
  readonly etiqueta: string;
  /**
   * Lo que ya esta resuelto, por su clave declarada. Sale del borrador de la
   * escritura, que es la unica fuente: el control no guarda el identificador
   * por su cuenta.
   */
  readonly resuelto: Readonly<Record<string, string>>;
  /**
   * Lo que la pantalla sabe de los campos que este resolutor declara leer
   * (`CampoResolutor.contexto`), con el borrador por delante de lo que sirvio la
   * API.
   *
   * Es de **solo lectura**: el resolutor no puede escribir ahi —`onCampo` no lo
   * dejaria—, y existe para poder decir algo sobre lo resuelto en relacion con
   * el registro que se esta dando de alta.
   */
  readonly contexto: Readonly<Record<string, string>>;
  /** Fija —o vacia— uno de los campos que este resolutor llena. */
  readonly onCampo: (campo: string, valor: string) => void;
  /**
   * La opcion no puede escribir esos campos: el control se dibuja, no resuelve.
   *
   * Tres motivos, y hasta la revision de #331 solo se comprobaba el segundo:
   *
   * - el perfil **no tiene el privilegio del acto** sobre esta opcion. Esto no
   *   se miraba, y el docblock decia que si: `useEscritura` recibe los campos
   *   declarados haya o no permiso —lo que apaga la escritura es que la
   *   `operacion` llegue `undefined`—, asi que `escribibles` los tenia igual y
   *   el resolutor buscaba contra el padron para un perfil que no puede
   *   registrar nada. No es la barrera —el servidor contesta 403 igual
   *   (ADR-0013)—: es no hacer trabajar a nadie para acabar en un rechazo;
   * - la opcion **no declara los campos** en `escrituras.ts`, y entonces
   *   `fijarCampo` los ignoraria en silencio, que es peor que no ofrecer la
   *   busqueda;
   * - no hay `onCampo`: la pantalla no escribe.
   */
  readonly bloqueado: boolean;
}

export interface CampoResolutor {
  /**
   * Los campos del cuerpo que la resolucion llena, **por su clave declarada en
   * `escrituras.ts`**.
   *
   * Se declaran aqui y no se deducen del control por dos motivos: es lo que
   * permite comprobar antes de dibujar si esta pantalla puede escribirlos, y es
   * lo que deja leer en la composicion —sin abrir el componente— que un
   * resolutor de unidad llena `predioId` y `vehiculoId` y ninguna otra cosa.
   */
  readonly campos: readonly string[];
  /**
   * Claves del borrador que el control usa **solo para presentacion**, y que la
   * opcion declara en `EscrituraDeclarada.presentacion`: no viajan.
   *
   * Se declaran aparte de `campos` porque no son lo mismo y la diferencia es la
   * que importa: `campos` son las claves que acaban en el cuerpo, y estas son
   * las que no pueden acabar ahi. `Formulario` las junta para decidir que puede
   * escribir el control y que le pasa en `resuelto`.
   */
  readonly memoria?: readonly string[];
  /**
   * Claves del formulario que el control **lee** para poder decir algo sobre lo
   * que resolvio: llegan por `ResolutorProps.contexto` y no se pueden escribir.
   */
  readonly contexto?: readonly string[];
  /**
   * `ComponentType` y no una funcion suelta, por lo mismo que
   * {@link AltaEnPanel.Formulario}: el control busca contra el backend y trae
   * su propia prosa, y eso llega en el trozo de su modulo (`lazy`), no en el
   * arranque. `Formulario` lo dibuja dentro de un `Suspense`.
   */
  readonly Control: ComponentType<ResolutorProps>;
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
   * El genero de lo que se elige, para que la banda concuerde: «1 cuota
   * elegida», «2 recibos elegidos».
   *
   * Se declara y no se deduce porque del castellano no se deduce: la banda
   * escribia «elegida» a mano, y la primera opcion que eligiera valores o
   * recibos —que son los otros dos que el manual dibuja con columna de
   * casilla— habria dicho «2 valores elegidas». Es un campo obligatorio a
   * proposito: quien anada una seleccion tiene que decidirlo, no heredarlo.
   */
  readonly genero: 'femenino' | 'masculino';
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
  /**
   * Claves de filtros que la pantalla **dibuja pero no manda**.
   *
   * El hueco que cierra: un filtro que el contrato declara y el servidor rechaza
   * con 422. `conciliadaConRentas` es el caso —`ConsultaController` lo rechaza
   * con cualquier valor, «Todas» incluida, porque la lectura que lo respondería
   * no existe (ADR-0015 §2)—, y hasta ahora estaba **vivo**: elegir cualquier
   * cosa en ese desplegable dejaba la busqueda en 422. No se veia en ninguna
   * prueba porque el proxy de datos ignora los filtros, asi que el camino
   * completo solo se recorre contra el backend de verdad.
   *
   * Se **bloquea y no se quita**: el rotulo del prototipo se conserva (RNF-080),
   * y un filtro que desaparece deja a quien lo buscaba pensando que se ha roto
   * algo. Bloqueado y con su motivo dice lo que pasa —y que no es culpa suya—.
   *
   * **Aqui va la declaracion; la redaccion del motivo va en `prosa-textos.ts`**,
   * exactamente el reparto que ya tiene la nota de la escritura
   * (`EscrituraDeclarada.nota` es un booleano y su texto vive alla): este archivo
   * esta en el trozo de arranque —el renderizador lo consulta para dibujar— y su
   * castellano no tiene por que estarlo. `prosa.test.ts` exige que las dos listas
   * digan lo mismo.
   *
   * Es un opt-in propio y no un {@link WidgetDeFiltro} con un `Campo` bloqueado
   * dentro por una razon medida: el control propio solo recibe rotulo, valor y
   * cambio, asi que tendria que **volver a declarar en codigo las opciones del
   * desplegable** —«Todas», «Sí», «No»— que el catalogo portado ya publica. Dos
   * copias de la misma lista, y la del codigo no la regenera nadie. Asi
   * `Filtros` sigue dibujando el campo del catalogo, con sus opciones, y lo
   * unico que anade es que no se escribe y por que.
   */
  readonly filtrosBloqueados?: readonly string[];
  /** Campos de seccion que resuelven un codigo contra el registro del backend. */
  readonly resolutores?: Readonly<Record<string, CampoResolutor>>;
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
  /**
   * La **tabla** de la pantalla entra en el indice, como su primera entrada.
   *
   * La tabla se dibuja encima de las secciones y fuera de la rejilla del indice
   * (FRO-03 §5), asi que sin esto el indice de una pantalla con tabla empieza
   * por la segunda cosa de la pagina. En «Cálculo individual del impuesto
   * predial» eso dejaba fuera el **paso 1** del calculo —los predios que
   * integran la base, de donde sale todo lo demas— y el indice arrancaba en la
   * escala (#333, revision).
   *
   * **Es opt-in y no automatico**, y el motivo salio de ejecutarlo: hacerlo para
   * toda pantalla con indice y tabla deja en «Ficha urbana» dos entradas
   * llamadas «Ubicación del predio catastral» —el catalogo rotula igual su tabla
   * y una de sus secciones—, y dos entradas con el mismo nombre en el mismo
   * indice llevan siempre a la primera. Quien declare esto mira su catalogo.
   */
  readonly indiceConLaTabla?: true;
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
  ...COMPOSICION_DE_CONSULTAS,
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
 * Si hay **algo** que resumir, preguntado antes de pedir el trozo de la cabecera.
 *
 * Las cabeceras-resumen llegan en su propio `lazy` para no viajar en el
 * arranque, pero el `Suspense` que las envuelve se montaba siempre que la opcion
 * declarara una: el navegador bajaba el trozo para que la cabecera devolviera
 * `null`, y el padron sin nadie abierto es el caso normal de esa pantalla.
 *
 * Las tres condiciones son las que las cabeceras usan por dentro, y por eso la
 * pregunta se puede hacer fuera: un registro abierto por la ruta —las fichas—, o
 * por el filtro —el padron de contribuyentes, cuyo contrato declara el codigo
 * como filtro y no como parametro de ruta—, o **una respuesta de una sola fila**,
 * que es «este es el contribuyente que buscabas» (#330, #332). Quien decide que
 * ensena sigue siendo la cabecera; esto solo evita pedirla cuando ninguna de las
 * tres se cumple.
 */
export function hayQueResumir(
  codigo: string | undefined,
  busqueda: URLSearchParams,
  filas: number,
): boolean {
  if (codigo !== undefined && codigo !== '') return true;
  if ((busqueda.get('codigo') ?? '') !== '') return true;
  return filas === 1;
}

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

/** Si esta opcion declara que este filtro se dibuja pero no se manda. */
export const filtroBloqueado = (opcion: string, campo: string): boolean =>
  composicionDe(opcion).filtrosBloqueados?.includes(campo) === true;

/** Cada filtro bloqueado, con su opcion. `prosa.test.ts` exige que todos tengan motivo. */
export const FILTROS_BLOQUEADOS: readonly { readonly opcion: string; readonly campo: string }[] =
  Object.entries(COMPOSICIONES).flatMap(([opcion, composicion]) =>
    (composicion.filtrosBloqueados ?? []).map((campo) => ({ opcion, campo })),
  );

/**
 * El resolutor de un campo de seccion, si esa opcion declara uno.
 *
 * Misma forma —y misma barrera de `Object.hasOwn`— que `widgetDeFiltro`: un
 * campo llamado `constructor` daria un «resolutor» heredado del prototipo de
 * `Object`, y el formulario intentaria dibujarlo en vez de su campo.
 */
export const resolutorDeCampo = (opcion: string, campo: string): CampoResolutor | undefined => {
  const resolutores = composicionDe(opcion).resolutores;
  if (resolutores === undefined || !Object.hasOwn(resolutores, campo)) return undefined;
  return resolutores[campo];
};
