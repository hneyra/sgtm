import type { ComponentType, ReactElement } from 'react';
import type { DatosDePantalla } from '@sgtm/api-client';
import type { CampoDePantalla } from '../catalogo';

/**
 * Lo que una opcion compone **alrededor** de los diez bloques comunes.
 *
 * Es la misma idea que ya sostienen `prosa.ts` y `escrituras.ts`: un registro
 * por opcion que el renderizador consulta, y **negacion por omision** —una
 * opcion que no esta aqui se dibuja exactamente como se dibujaba—. Lo que este
 * archivo evita es lo contrario: un `if (estructura.id === 'ficha_urbana')`
 * dentro de `Pantalla`, que es como se bifurca un renderizador que da servicio a
 * 134 pantallas.
 *
 * Once opt-in, y ninguno cambia el dibujo de las otras opciones:
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
 *   controles        un campo que el acto necesita y **ninguna seccion del
 *                    manual dibuja**: se anade al final de la seccion que la
 *                    opcion nombre, con su propia etiqueta (#422)
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
  /**
   * Si la superficie tiene algo tecleado y sin enviar (#498 F3).
   *
   * Derivado del borrador de `useEscritura`, no un estado nuevo. Lo declaran
   * solo las superficies que escriben; las demas lo dejan sin pasar y su
   * cabecera no habla de guardar.
   */
  readonly sinGuardar?: boolean;
  /** El registro que abre la pantalla, tal como viene de la ruta. */
  readonly codigo?: string;
  readonly datos?: DatosDePantalla;
  readonly cargando: boolean;
  /**
   * La opcion a la que encabeza, y lo que se pregunto en su bloque de busqueda.
   *
   * Las tres cabeceras de ficha no los usan —les basta el registro abierto—, y
   * la banda de las determinaciones no puede vivir sin ellos: el sujeto de
   * «Cálculo individual del impuesto predial» es un **filtro** (#393), y esa
   * pantalla no pide nada al abrir porque su operacion es un `POST` y abrir una
   * pantalla no puede lanzar una determinacion.
   */
  readonly opcion?: string;
  readonly busqueda?: URLSearchParams;
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

/**
 * **Un control que el acto necesita y ninguna seccion del manual dibuja** (#422).
 *
 * El hueco que cierra lo censo `ACTOS_SIN_CAMPO` (#73, #332, #385): opciones
 * cuyo `POST` exige un dato para el que **ninguna seccion del catalogo dibuja
 * un campo editable**. Hasta hoy la unica salida probada era la de #73 —un
 * componente propio que sustituye a un campo y anade el que falta,
 * `ResolutorDeTransferencia`—, y esa no se puede copiar doce veces: cada
 * componente propio es una pantalla que se sale de las pruebas transversales
 * del camino de escritura.
 *
 * Asi que la mitad que **no** necesita componente se declara. Un control cuyo
 * dato lo teclea quien atiende —el medio de pago, el numero de expediente de
 * mesa de partes, la placa— no busca contra el backend ni compone nada: es un
 * `Campo` con su etiqueta, su tipo y su ayuda. Eso cabe en una declaracion, y
 * el renderizador comun lo dibuja como dibuja los del catalogo.
 *
 * **Es hermano de {@link CampoResolutor} y no lo mismo**: un resolutor
 * **sustituye** el dibujo de un campo del catalogo —se declara por su clave, y
 * el control redibuja ese campo ademas de lo suyo— y esto **anade** uno que no
 * existe, al final de una seccion. Los dos escriben solo lo que declaran, por
 * la misma funcion (`soloSusCampos`) y con la misma muestra que lo viola.
 *
 * **Y no sirve para las tres formas del hueco, solo para una**: cuando el dato
 * es un identificador interno que hay que resolver contra una lista real
 * —`fisc_predial` pide `programaId`/`contribuyenteId`/`predioId`— hace falta la
 * lista, no el control; y cuando lo determina el sistema y hoy no lo determina
 * nadie —el autovaluo ajustado de `alcabala`, D-11/D-02a— la respuesta correcta
 * sigue siendo `ACTOS_SIN_CAMPO` con su franja. Declararle un control a esas
 * seria darle a quien atiende una caja donde teclear una cifra que ninguna
 * norma respalda.
 */
export interface ControlDeclarado {
  /**
   * El campo que llena, **por su clave declarada en `escrituras.ts`**.
   *
   * No es una clave del catalogo —el catalogo no dibuja este campo, que es todo
   * el problema—: es la clave con que la opcion lo declara en su lista blanca, y
   * de ahi sale como se llama en el cuerpo. Igual que `valorTransferencia` en
   * las dos transferencias (#73).
   *
   * Se declara aqui, y no se deduce, por lo mismo que `CampoResolutor.campos`:
   * es lo que permite comprobar **antes de dibujar** si esta pantalla puede
   * mandarlo, y lo que deja leer en la composicion —sin abrir nada— que este
   * control llena una cosa y ninguna otra.
   */
  readonly campo: string;
  /**
   * **Su propia etiqueta**, nunca la de un campo del catalogo (RNF-080).
   *
   * Es lo que separa anadir un campo de rebautizar uno: el catalogo de
   * `transito_descargos` ya dibuja un «Nº de expediente» —el del descargo que se
   * esta consultando, de solo lectura—, y el que hace falta es el de mesa de
   * partes del que se esta registrando. Dos cosas distintas no pueden llamarse
   * igual en la misma pantalla: quien la recorre con lector no podria
   * distinguirlas.
   */
  readonly etiqueta: string;
  /**
   * Los tipos del catalogo que **se teclean**: sin `ro` —esto existe para
   * escribir— y **sin `chk`**, que no hace falta todavia.
   *
   * `chk` se deja fuera a proposito y no por descuido: ninguno de los doce datos
   * que `ACTOS_SIN_CAMPO` censa es un si/no, y la casilla del catalogo guarda
   * `'si'`/`''` mientras el resto del formulario guarda texto. Decidir esa
   * traduccion sin una pantalla que la ejercite seria inventarla; el dia que
   * haga falta, se anade con su caso.
   */
  readonly tipo: 'text' | 'date' | 'sel' | 'area';
  /** Para un `sel`, sus opciones. El desplegable arranca vacio (`eleccionObligatoria`). */
  readonly opciones?: readonly string[];
  readonly ph?: string;
  /**
   * Por que hace falta, **dicho para quien atiende**.
   *
   * Obligatoria y no opcional: un campo que el manual no dibuja aparece en una
   * pantalla que alguien ya conoce, y sin decir de donde sale se lee como un
   * dato inventado por el sistema.
   */
  readonly ayuda: string;
  /**
   * La seccion del catalogo a cuyo final se dibuja, **por su etiqueta**.
   *
   * Por la etiqueta y no por su indice, el mismo criterio que
   * {@link MemoriaDeSeccion}: un indice se rompe en silencio el dia que el
   * prototipo reordene sus secciones, y una etiqueta que ya no existe la caza la
   * prueba que compara cada declaracion contra el catalogo.
   */
  readonly seccion: string;
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
  /**
   * La casilla **anade su propia columna** a la tabla, en vez de ocupar la
   * primera del catalogo.
   *
   * Por omision ocupa la primera, que es lo que el prototipo dibuja donde
   * capturo una pantalla que elige: `baja_deuda` la trae sin rotulo (`""`) y las
   * dos de coactiva como «Seleccione». «Deudas acogidas» —la del fraccionamiento
   * coactivo— **no dibuja ninguna**: sus trece columnas empiezan en «Año», y
   * ocupar la primera se llevaria por delante el ejercicio, que es uno de los
   * cuatro datos con los que se identifica la obligacion que se acoge (#426).
   *
   * Se declara en vez de deducirse del rotulo: «si `cols[0]` esta vacio o dice
   * “Seleccione”» seria una heuristica sobre el texto del prototipo, y el dia que
   * una pantalla rotulara esa columna de otra forma perderia una en silencio.
   */
  readonly columnaPropia?: true;
}

/**
 * Una seccion que se lee **como la memoria de un calculo** y no como una
 * rejilla de campos de solo lectura (#393).
 *
 * Las cinco pantallas de determinacion del modulo —predial individual y
 * masivo, arbitrios, calculo vehicular y alcabala— tienen entre nueve y trece
 * campos `"ro"` seguidos, y esos campos **no son un formulario**: son los pasos
 * de una cuenta. Dibujados como campos, cada linea ocupa una etiqueta, un borde
 * discontinuo y una caja de 38 px, y la relacion entre ellas —cual multiplica a
 * cual, cual es el resultado— no se ve en ninguna parte. Es lo que hay que
 * poder explicarle a alguien en ventanilla cuando pregunta de donde sale su
 * recibo.
 *
 * **No compone ninguna cifra** (RNF-083). Cada linea es el valor que sirvio la
 * API, tal cual; lo unico que hace la interfaz es partir por la flecha que el
 * propio valor trae —`S/ 80,250.00 → S/ 160.50`— para poner la operacion y su
 * resultado en dos columnas. Un valor sin flecha se dibuja entero en la columna
 * del importe. Ni se suma, ni se redondea, ni se completa lo que falte: lo que
 * el servidor no manda sigue saliendo con «—».
 */
export interface MemoriaDeSeccion {
  /**
   * La clave del campo que **es el resultado** de la memoria, si lo hay: se
   * dibuja destacado y al final, separado de los pasos que lo producen.
   *
   * Se declara y no se deduce —«el ultimo campo», «el que diga total»— porque
   * en las cinco secciones el resultado esta en un sitio distinto: en la escala
   * progresiva es el penultimo campo, y detras va el minimo imponible, que es
   * una comprobacion y no el resultado.
   */
  readonly total?: string;
}

/**
 * La accion de una pantalla que **enseña el resultado sin escribir nada** (#393).
 *
 * Las cinco pantallas de determinacion tienen una: «Simular», «Recalcular»,
 * «Liquidar». Hasta que esto existio no hacian nada, y la pantalla se quedaba
 * con sus importes en «—» sin forma de ver la cuenta que los produce.
 *
 * Se declara la **etiqueta exacta del catalogo** y no un patron —`DE_CALCULO` de
 * `pantallas/actos.ts` ya reconoce el verbo para otra cosa— porque aqui la
 * consecuencia es una peticion: reconocer de mas significa pulsar «Recalcular»
 * en una pantalla que no lo espera. Cinco entradas escritas a mano se revisan de
 * una vez; un patron hay que volver a razonarlo cada vez que el catalogo crece.
 *
 * Como esto **no escribe**, no lleva observacion (regla 10 no le aplica: no se
 * modifica ningun dato) y no pasa por `escrituras.ts`. Sale por
 * `useSimulacion`, que es el segundo y ultimo sitio del frontend desde el que
 * sale un `POST`, y que ademas **solo simula mientras contesta el proxy de
 * datos**: ver su docblock, que es donde vive la justificacion entera.
 */
export interface SimulacionDeLaPantalla {
  /** La etiqueta de la accion del catalogo que la dispara, letra por letra. */
  readonly accion: string;
  /**
   * Lo que viaja en el cuerpo, si algo. Los filtros de la pantalla van por la
   * URL como en cualquier lectura; esto es para lo que el cuerpo necesite
   * ademas —hoy, la marca con la que un backend distingue simular de asentar—.
   */
  readonly cuerpo?: Readonly<Record<string, string | boolean | number>>;
}

/**
 * **Una tabla que una seccion toma prestada de otra opcion** (#503 F2).
 *
 * El hueco que cierra: la seccion «Unidades afectas del contribuyente» del
 * padron son **seis contadores de solo lectura** —predios registrados, autovaluo
 * acumulado, vehiculos afectos…— y `ContribuyenteResource` no publica ninguno,
 * asi que salen «—» los seis. El rediseño los sustituye por la lista de verdad,
 * que ya existe: `GET /rentas/predios?contribuyente=`, que es la operacion de
 * **otra** opcion del mismo destino.
 *
 * Se declara por opcion y no se inventa nada: de la opcion prestada salen
 *
 *   su **operacion**  lo que se pide, con su adaptador y su conexion ya escritos
 *   su **tabla**      las columnas del catalogo, con sus rotulos (RNF-080)
 *   su **permiso**    quien no puede ver esa opcion no ve la tabla; se le nombra
 *                     la que le falta, en vez de dejarle una tabla vacia que se
 *                     leeria como «no tiene predios» (ADR-0016 §2)
 *   su **titulo**     como se llama, sin redactar uno nuevo
 *
 * **La opcion prestada tiene que ser del mismo modulo.** Sus conexiones llegan
 * con el trozo de su modulo (#433), asi que tomar prestada la de otro traeria
 * ese trozo aqui. La guarda vive en `tabla-de-otra-opcion.test.tsx`.
 */
export interface TablaDeOtraOpcion {
  /** La seccion del catalogo bajo la que se dibuja, por su rotulo. */
  readonly seccion: string;
  /** La opcion cuya tabla, permiso y titulo se toman prestados. */
  readonly opcion: string;
  /**
   * De donde se **lee**, cuando no es la operacion de la opcion (#524).
   *
   * La opcion presta cuatro cosas y no siempre las cuatro son suyas: «Ficha de
   * vehiculo» tiene la tabla, el titulo y el permiso que hacen falta, y su
   * operacion es la ficha **por placa**, que no lista nada. La coleccion vive en
   * otra operacion del contrato —una que no es opcion del catalogo, como
   * `registrar_contribuyente`—, y esto es lo que deja nombrarla.
   *
   * Sin esto, la unica salida seria inventar una opcion del catalogo para una
   * lectura que ninguna pantalla del manual dibuja, que es exactamente lo que
   * ADR-0014 §5 impide.
   */
  readonly conexion?: string;
  /** Con que se le pregunta por el registro abierto. */
  readonly parametros: (codigo: string) => Readonly<Record<string, string>>;
}

/**
 * Un grupo del indice: un rotulo y las pestanas del catalogo que caen en el.
 *
 * `titulo` es el rotulo de la pestana cuando el grupo tiene una sola —y
 * entonces no se reescribe nada—, y un nombre nuevo cuando une varias. Ver
 * `ComposicionDeOpcion.gruposDelIndice`.
 */
export interface GrupoDelIndice {
  readonly titulo: string;
  /** Rotulos de pestana del catalogo, en el orden en que se dibujan. */
  readonly pestanas: readonly string[];
}

export interface ComposicionDeOpcion {
  /**
   * **La superficie de la que esta opcion es una hoja** (#442).
   *
   * Dos o mas opciones que hablan del mismo objeto se dibujan con una tira de
   * pestañas que lleva de una a otra sin volver al menu. Cada hoja **conserva su
   * id, su ruta y su permiso**: esto es composicion de navegacion, no una
   * pantalla que absorba a las demas, y por eso se declara aqui y no como una
   * lista de ids cableada en un componente.
   *
   * La declaran **todas** las hojas, con la misma lista: asi la tira se dibuja
   * igual se entre por donde se entre, y anadir una tercera es una linea en cada
   * una en vez de un sitio donde se puede olvidar.
   *
   * Ver `bloques/HojasDeSuperficie` para por que esto **no** saca la pantalla del
   * renderizador generico —y por que `catastro/Territorio.tsx` si tuvo que
   * hacerlo—.
   */
  readonly superficie?: {
    readonly titulo: string;
    readonly hojas: readonly string[];
  };
  /**
   * **Lo que se hace CON una fila de la tabla**: abrir otra pantalla del
   * catalogo llevandose lo que identifica esa fila (#506 F3).
   *
   * El caso que lo trajo es la muestra de un programa de fiscalizacion: cada
   * fila es un predio que hay que ir a visitar, y el acta que se levanta alli es
   * **otra opcion**, con su ruta y su permiso. Sin esto, ir de una a otra era
   * volver al menu y teclear a mano un identificador que la fila ya tiene — y
   * que no se dibuja en ninguna columna, porque un identificador interno bajo el
   * rotulo «Predio» seria otro dato con el mismo nombre.
   *
   * **Se declara por opcion y no se cablea en la tabla**, por lo mismo que
   * `TablaDePantalla` no convierte su primera celda en un enlace: de las quince
   * pantallas que abren un registro y traen tabla, la primera columna es ese
   * registro en **una**. Que busqueda abre que ficha lo decide cada modulo.
   *
   * `opcion` es el destino, y de el salen **la ruta y el permiso**: una fila
   * cuyo destino este perfil no puede ver no dibuja enlace (REQ-03 §5).
   * `parametros` los compone de los valores **crudos** de la fila
   * (`DatosDeTabla.valores`), nunca del texto que se pinto (#332); devolver
   * `undefined` es «esta fila no puede abrirlo», y entonces la celda queda vacia.
   */
  readonly accionDeFila?: {
    readonly opcion: string;
    /** Lo que hace el acto al llegar, no como se llama la pantalla (#498 F2). */
    readonly etiqueta: string;
    readonly parametros: (
      valores: Readonly<Record<string, string>>,
    ) => Readonly<Record<string, string>> | undefined;
  };
  /**
   * El bloque de busqueda, para una opcion cuyo catalogo **no declara `filtros`**.
   *
   * El hueco que cierra: `caja_tributaria` es un `POST` —`ContenidoConectado`
   * la lee de `consulta_deuda`, no de su propia operacion (ver
   * `pantallas/tesoreria/index.ts`)— y el prototipo no le dibuja una barra de
   * busqueda: su catalogo no tiene `filtros`, solo `secciones` con el
   * formulario de cobranza. Sin este campo el bloque `Filtros` no se dibuja
   * nunca —esta gated en `estructura.filtros`, que sigue siendo `undefined`—,
   * y el campo visible de la pantalla queda de solo lectura para siempre: el
   * texto describe una accion que no se puede hacer.
   *
   * **Nunca se edita el catalogo generado** para esto: `tesoreria.generado.ts`
   * se regenera de `design/sgtm-data-*.js`, y una fila hecha a mano
   * desaparece en la siguiente pasada de `yarn portar-catalogo`. Este campo es
   * la declaracion equivalente, en el mismo espiritu que `widgetsDeFiltro` —un
   * registro por opcion que el renderizador consulta— para lo que el catalogo
   * no puede decir.
   *
   * `Pantalla.tsx` usa `estructura.filtros ?? filtrosPropios`: una opcion cuyo
   * catalogo ya trae `filtros` no se ve afectada, y esto solo entra cuando esa
   * lista esta vacia del todo.
   */
  readonly filtrosPropios?: readonly CampoDePantalla[];
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
  /**
   * Campos que el acto necesita y **ninguna seccion del manual dibuja** (#422).
   *
   * Una lista y no un registro por clave, a diferencia de `resolutores`: un
   * resolutor se busca **por la clave del campo del catalogo al que sustituye**
   * —el renderizador pregunta «¿este campo trae control propio?»—, y estos no
   * sustituyen a ninguno, asi que no hay clave por la que buscarlos. Lo que el
   * renderizador pregunta es «¿que se anade al final de esta seccion?», y eso es
   * un filtro sobre una lista.
   */
  readonly controles?: readonly ControlDeclarado[];
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
   * Los grupos del indice, para una pantalla cuyo indice **sustituye** a las
   * pestanas.
   *
   * `'en-vez-de-pestanas'` apila las secciones de todas las pestanas en una
   * pagina, y en el padron de contribuyentes eso son **doce** entradas de
   * indice: nueve pestanas que declaran doce secciones. Doce entradas no son un
   * indice, son la misma lista de antes sin la barra. El rediseno pide cinco
   * (#503 F2), y la forma de llegar a cinco **sin reescribir un solo rotulo**
   * es agrupar por la unidad que el manual ya tiene encima de la seccion: la
   * pestana.
   *
   * Por eso se declara en **pestanas y no en secciones**. Un grupo que nombrara
   * secciones tendria que ponerle nombre al conjunto, y ese nombre seria un
   * rotulo inventado por cada grupo (RNF-080). Nombrando pestanas, el grupo de
   * una sola **es** su pestana y lleva su rotulo literal; solo los que unen
   * varias necesitan nombre, y entonces el nombre nace de una decision escrita
   * en vez de por descuido.
   *
   * Lo que **no** cambia: la pagina sigue dibujando las doce secciones con su
   * rotulo del manual y en su orden. Lo que se agrupa es la navegacion, que es
   * lo mismo que hacen los grupos por tarea con las opciones del menu.
   *
   * La guarda vive en `expediente-del-contribuyente.test.tsx`: cada pestana de
   * la pantalla cae en **exactamente un** grupo. Sin ella, una pestana que el
   * porte anadiera se quedaria fuera del indice y sus secciones serian
   * inalcanzables salvo rodando la pagina.
   */
  readonly gruposDelIndice?: readonly GrupoDelIndice[];
  /**
   * Tablas que las secciones de esta opcion toman prestadas de otras
   * (#503 F2). Ver {@link TablaDeOtraOpcion}.
   */
  readonly tablasPrestadas?: readonly TablaDeOtraOpcion[];
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
  /**
   * Si los filtros de detras del primero se pliegan tras «Búsqueda avanzada»
   * (#498 F7).
   *
   * Va por pantalla y no para las noventa y siete: cuatro filtros es la norma
   * del catalogo —57 pantallas— y plegarlas todas de golpe cambia como se busca
   * en el sistema entero. Catastro marca el estandar; las demas lo declaran
   * cuando les toque, que es el mismo criterio de la portada del modulo.
   */
  readonly filtrosPlegables?: boolean;
  readonly flujo?: FlujoGuiado;
  /** La tabla de esta pantalla elige filas, y lo elegido viaja en el cuerpo. */
  readonly seleccion?: SeleccionDeFilas;
  /**
   * Secciones que se leen como memoria de calculo, por **etiqueta de seccion**.
   *
   * La etiqueta y no el indice: el indice cambia el dia que el prototipo mueva
   * una seccion, y la etiqueta es lo unico que RNF-080 garantiza estable —no se
   * reescribe—. Negacion por omision: 129 de las 134 no declaran ninguna y se
   * dibujan exactamente como se dibujaban.
   */
  readonly memoria?: Readonly<Record<string, MemoriaDeSeccion>>;
  /**
   * La cabecera-resumen se dibuja **aunque no haya ningun registro abierto**.
   *
   * Lo declaran las cinco pantallas de determinacion y solo ellas: su sujeto es
   * un filtro, no un registro de la ruta, y su tabla trae tantas filas como
   * predios tenga el contribuyente, asi que ninguna de las tres condiciones de
   * `hayQueResumir` las alcanzaba. Quien decide si hay algo que ensenar sigue
   * siendo la cabecera —sin sujeto devuelve `null`—; esto solo la deja intentarlo.
   */
  readonly resumenSiempre?: true;
  /** Una accion de esta pantalla enseña el resultado sin escribir nada (#393). */
  readonly simulacion?: SimulacionDeLaPantalla;
}

/**
 * Lo que compone cada opcion, **llenado al entrar en su modulo** (#433).
 *
 * Cinco modulos declaran composicion, y hasta este issue los cinco archivos
 * viajaban en el arranque: **2,6 KB comprimidos** de widgets, resolutores y
 * cabeceras que solo mira quien abre esas pantallas, medidos vaciando este
 * registro. Con los de `conexiones.ts` suman 15,7 sueltos y **14,4 juntos**: la
 * diferencia es lo que los dos compartian con el arranque y se queda ahi. Ahora llegan con el aporte
 * de su modulo (`aportes-de-modulo.ts`), en la misma espera que ya bloqueaba el
 * dibujo, asi que `composicionDe` sigue respondiendo sincrono cuando se le
 * pregunta.
 *
 * Un `Map` y no un objeto por lo mismo que en `conexiones.ts`: la opcion viene
 * de la URL, y un objeto resolveria `constructor` o `toString` por la cadena de
 * prototipos y devolveria una «composicion» que no declaro nadie.
 */
const COMPOSICIONES = new Map<string, ComposicionDeOpcion>();

/** Suma lo que compone un modulo. Lo llama `cargarAporteDelModulo` y nadie mas. */
export function registrarComposiciones(
  composiciones: Readonly<Record<string, ComposicionDeOpcion>> = {},
): void {
  for (const [opcion, composicion] of Object.entries(composiciones)) {
    COMPOSICIONES.set(opcion, composicion);
  }
}

const NINGUNA: ComposicionDeOpcion = {};

/** Lo que compone esta opcion; vacio —y por tanto nada— si no declara nada. */
export const composicionDe = (opcion: string): ComposicionDeOpcion =>
  COMPOSICIONES.get(opcion) ?? NINGUNA;

/**
 * Los filtros del bloque de busqueda: los del catalogo, o los que esta opcion
 * compone cuando el catalogo no trae ninguno (`filtrosPropios`, arriba).
 *
 * `undefined` en los dos sitios significa lo mismo que siempre: sin bloque de
 * busqueda. Una opcion con `filtros: []` en el catalogo —ninguna hoy— tampoco
 * caeria en `filtrosPropios`: el `??` solo mira `undefined`, no vacio.
 */
export const filtrosDe = (
  opcion: string,
  declarados: readonly CampoDePantalla[] | undefined,
): readonly CampoDePantalla[] | undefined => declarados ?? composicionDe(opcion).filtrosPropios;

/**
 * Si hay **algo** que resumir, preguntado antes de pedir el trozo de la cabecera.
 *
 * Las cabeceras-resumen llegan en su propio `lazy` para no viajar en el
 * arranque, pero el `Suspense` que las envuelve se montaba siempre que la opcion
 * declarara una: el navegador bajaba el trozo para que la cabecera devolviera
 * `null`, y el padron sin nadie abierto es el caso normal de esa pantalla.
 *
 * Las cuatro condiciones son las que las cabeceras usan por dentro, y por eso la
 * pregunta se puede hacer fuera: un registro abierto por la ruta —las fichas—, o
 * por el filtro —el padron de contribuyentes, cuyo contrato declara el codigo
 * como filtro y no como parametro de ruta—, o **una respuesta de una sola fila**,
 * que es «este es el contribuyente que buscabas» (#330, #332), o **una respuesta
 * que dice con que se determino** (#393). Quien decide que ensena sigue siendo
 * la cabecera; esto solo evita pedirla cuando ninguna de las cuatro se cumple.
 *
 * La cuarta la declara la opcion (`resumenSiempre`), y es la que abre la banda
 * de sujeto de las pantallas de determinacion: el predial individual no abre
 * ningun registro por la ruta —su contribuyente es un filtro que no se llama
 * `codigo`—, su tabla trae tantas filas como predios tenga, y su operacion es un
 * `POST`, asi que no pide nada al abrir y no hay respuesta a la que preguntar.
 * Ninguna de las tres anteriores la alcanzaba. La banda decide sola si hay algo
 * que encabezar: sin sujeto devuelve `null`.
 */
export function hayQueResumir(
  codigo: string | undefined,
  busqueda: URLSearchParams,
  filas: number,
  siempre = false,
): boolean {
  if (siempre) return true;
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
 *
 * **Una funcion sobre lo que se le pase, y no una constante, desde #433**: la
 * composicion llega con el trozo de su modulo, asi que un censo calculado al
 * importar este archivo saldria vacio. Y toma el censo por parametro en vez de
 * leer el registro **a proposito**: quien censa el catalogo entero es una prueba,
 * y una prueba que ademas registrase los doce se taparia a si misma —dejaria de
 * poder ver que `Pantalla` no pidio el aporte de su modulo—. Lo produce
 * `censoDeAportes`, que carga sin registrar.
 */
export const altasDeclaradas = (
  composiciones: Readonly<Record<string, ComposicionDeOpcion>>,
): readonly {
  readonly opcion: string;
  readonly accion: string;
}[] =>
  Object.entries(composiciones).flatMap(([opcion, composicion]) => [
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

/**
 * Cada filtro bloqueado, con su opcion. `prosa.test.ts` exige que todos tengan motivo.
 *
 * Funcion sobre el censo que se le pase, como {@link altasDeclaradas}.
 */
export const filtrosBloqueados = (
  composiciones: Readonly<Record<string, ComposicionDeOpcion>>,
): readonly {
  readonly opcion: string;
  readonly campo: string;
}[] =>
  Object.entries(composiciones).flatMap(([opcion, composicion]) =>
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

/** Sin controles declarados. Constante para que el filtro no cambie de identidad cada render. */
const SIN_CONTROLES: readonly ControlDeclarado[] = [];

/** Todo lo que esa opcion anade, sin mirar en que seccion. Lo usa el censo. */
export const controlesDe = (opcion: string): readonly ControlDeclarado[] =>
  composicionDe(opcion).controles ?? SIN_CONTROLES;

/**
 * Lo que esa opcion anade **al final de esa seccion**, o nada.
 *
 * Sin `Object.hasOwn` que valga: aqui no se indexa ningun registro por un
 * nombre venido de fuera —se filtra una lista comparando cadenas—, asi que la
 * cadena de prototipos no tiene por donde entrar. Una seccion llamada
 * `constructor` devuelve la lista vacia, como cualquier otra que nadie declare.
 */
const SIN_TABLAS: readonly TablaDeOtraOpcion[] = [];

/** Las tablas prestadas que van bajo una seccion, en el orden declarado. */
export const tablasDeLaSeccion = (
  opcion: string,
  seccion: string,
): readonly TablaDeOtraOpcion[] => {
  const declaradas = composicionDe(opcion).tablasPrestadas;
  if (declaradas === undefined) return SIN_TABLAS;
  const suyas = declaradas.filter((tabla) => tabla.seccion === seccion);
  return suyas.length === 0 ? SIN_TABLAS : suyas;
};

export const controlesDeLaSeccion = (
  opcion: string,
  seccion: string,
): readonly ControlDeclarado[] => {
  const declarados = composicionDe(opcion).controles;
  if (declarados === undefined) return SIN_CONTROLES;
  const suyos = declarados.filter((control) => control.seccion === seccion);
  return suyos.length === 0 ? SIN_CONTROLES : suyos;
};

/**
 * Cada control declarado, con su opcion. El censo de #422 los recorre todos.
 *
 * Funcion sobre el censo que se le pase, como {@link altasDeclaradas}.
 */
export const controlesDeclarados = (
  composiciones: Readonly<Record<string, ComposicionDeOpcion>>,
): readonly {
  readonly opcion: string;
  readonly control: ControlDeclarado;
}[] =>
  Object.entries(composiciones).flatMap(([opcion, composicion]) =>
    (composicion.controles ?? []).map((control) => ({ opcion, control })),
  );

/**
 * Como se lee esa seccion de esa opcion: memoria de calculo, o nada.
 *
 * Misma barrera de `Object.hasOwn` que `resolutorDeCampo` y por el mismo
 * motivo: una seccion titulada `toString` devolveria una «memoria» heredada del
 * prototipo de `Object`, y el formulario dibujaria la cuenta en vez de sus
 * campos.
 */
/**
 * La accion de esta opcion que simula, o nada.
 *
 * No necesita su propia barrera de `Object.hasOwn` —a diferencia de
 * `resolutorDeCampo`, que indexa un registro anidado por nombre de campo—:
 * `composicionDe` ya la tiene, y de ella sale un objeto propio del que esta
 * clave se lee directamente.
 */
export const simulacionDe = (opcion: string): SimulacionDeLaPantalla | undefined =>
  composicionDe(opcion).simulacion;

export const memoriaDeSeccion = (opcion: string, seccion: string): MemoriaDeSeccion | undefined => {
  const memoria = composicionDe(opcion).memoria;
  if (memoria === undefined || !Object.hasOwn(memoria, seccion)) return undefined;
  return memoria[seccion];
};
