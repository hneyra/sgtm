import { useMemo, useRef, useState } from 'react';
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
 * - **Lista blanca de campos.** El cuerpo lleva la observacion y **nada mas**,
 *   salvo los campos que la opcion declare uno a uno en `pantallas/escrituras.ts`.
 *   No es una comodidad: es lo que impide que una contrasena escrita en un
 *   formulario acabe viajando a un servidor que no la pide y no sabria que
 *   hacer con ella. Lo que no esta declarado no se guarda ni se manda, asi que
 *   tampoco esta en el estado de React cuando termina el envio.
 */
export interface Escritura {
  /** Que operacion se va a escribir, si la pantalla escribe alguna. */
  readonly operacion?: IdDeOperacion;
  /** Los campos del formulario que esta pantalla puede escribir. Los demas, no. */
  readonly campos: ReadonlySet<string>;
  /** Las tablas que esta pantalla puede escribir. Igual que `campos`, pero de filas. */
  readonly tablas: ReadonlySet<string>;
  /** Los mapas que esta pantalla puede escribir. Igual, pero de vocabularios. */
  readonly mapas: ReadonlySet<string>;
  /**
   * Los rotulos de las acciones **que escriben**, cuando la opcion declara un
   * discriminador (`segunLaAccion`).
   *
   * Vacio cuando no lo declara, y entonces quien escribe es la primaria de
   * siempre: negacion por omision, como el resto del camino. Lo mira
   * `BarraDeAcciones` para saber que boton manda y con que cuerpo.
   */
  readonly acciones: ReadonlySet<string>;
  /** Lo escrito en esos campos, todavia sin enviar. */
  readonly borrador: Readonly<Record<string, string>>;
  /** Escribe un campo. Uno que no este declarado se ignora, y no se guarda. */
  readonly fijarCampo: (campo: string, valor: string) => void;
  /** Las filas escritas en una tabla declarada. Vacio si no lo esta. */
  readonly filasDe: (tabla: string) => readonly Readonly<Record<string, string>>[];
  /**
   * Sustituye las filas de una tabla declarada. Una tabla que no lo este se
   * ignora, y **de cada fila solo entran las columnas declaradas**.
   */
  readonly fijarFilas: (tabla: string, filas: readonly Readonly<Record<string, string>>[]) => void;
  /** Lo escrito en un mapa declarado, por su clave del vocabulario. Vacio si no lo esta. */
  readonly entradasDe: (mapa: string) => Readonly<Record<string, string>>;
  /**
   * Escribe una entrada de un mapa declarado. Un mapa que no lo este —o una
   * clave que no este en su vocabulario— se ignora, y no se guarda.
   */
  readonly fijarEntrada: (mapa: string, clave: string, valor: string) => void;
  readonly observacion: string;
  readonly fijarObservacion: (texto: string) => void;
  /**
   * Si la accion se puede pulsar.
   *
   * Son tres condiciones, no una: que la pantalla tenga a donde escribir, que la
   * observacion no este vacia (regla 10, y esa no se negocia) y que la opcion no
   * exija ademas otra cosa (`exigir`). El envio en curso deshabilita tambien,
   * porque pulsar dos veces es una pulsacion.
   */
  readonly puedeEnviar: boolean;
  /** Por que todavia no se puede guardar, cuando la opcion exige algo mas (`exigir`). */
  readonly falta?: string;
  /**
   * Por que todavia no se puede guardar, **incluida la observacion que falta**.
   *
   * Existe porque `falta` solo cuenta lo que la opcion exige, y el motivo mas
   * frecuente de que la accion este apagada no es ese: es que nadie ha escrito
   * la observacion. Ese motivo vivia en un `title` sobre un boton `disabled`, y
   * un `title` ahi **no existe** —ni para el teclado, que no puede enfocarlo, ni
   * para el lector de pantalla—. Quien lo pinte, que lo pinte siempre y con
   * `role="status"`.
   */
  readonly motivo?: string;
  readonly enviando: boolean;
  readonly enviada: boolean;
  readonly errorPorCampo: Readonly<Record<string, string>>;
  readonly error: unknown;
  /**
   * Manda lo escrito. **Con el rotulo de la accion que se pulso**, cuando la
   * opcion declara un discriminador: es lo que decide que cuerpo sale.
   *
   * Sin discriminador el argumento sobra y se ignora, que es el caso de las
   * quince opciones que ya escribian. Con discriminador y sin rotulo —o con uno
   * que no este declarado— **no manda nada**: el cuerpo de esa peticion no
   * existe, y mandar «el del primer verbo» seria anular un convenio porque
   * alguien pulso «Quebrar».
   */
  readonly enviar: (accion?: string) => void;
  /** La clave del intento en curso. La prueba de idempotencia la mira. */
  readonly clave: string;
}

/**
 * Un campo del formulario, visto desde el cuerpo de la peticion.
 *
 * `entero` existe porque el formulario solo produce texto y hay campos que el
 * backend declara numericos —`int ejercicio`—. **Nunca se usa para importes**:
 * esos son cadenas decimales de punta a punta (regla 1, RNF-055), y convertir
 * uno a `number` perderia centimos. Aqui solo pasan enteros de dominio: anos,
 * codigos, contadores.
 *
 * `valor` existe para el mismo problema que ya resuelve la lectura con `Fase`
 * (`FASES_DEL_BACKEND` en `pantallas/consultas`): el prototipo dibuja un
 * vocabulario («IMPUESTO PREDIAL») y el backend espera otro («PREDIAL»). Es
 * una traduccion, no una validacion: un valor que la funcion no reconoce
 * devuelve `undefined`, y ese campo simplemente no viaja —lo mismo que pasa
 * hoy si el usuario no lo llena—, en vez de mandar el texto del prototipo tal
 * cual y dejar que el backend lo rechace con un mensaje que no explica nada.
 */
export interface CampoDelCuerpo {
  /** Como se llama en el cuerpo que espera el backend. */
  readonly campo: string;
  /** El backend lo declara entero, no cadena. Nunca para importes. */
  readonly entero?: boolean;
  /**
   * El backend lo declara **booleano**, no cadena: es un interruptor.
   *
   * Una casilla llega al borrador como `'si'` o como cadena vacia
   * (`design-system/Campo`), y una cadena vacia ya no viaja nunca. Asi que
   * marcada manda `true` y sin marcar **no manda nada**, que es justo lo que un
   * `@Nullable Boolean` del backend lee como «no». Mandar `'si'` como texto
   * dependeria de que el deserializador lo interpretara, y un interruptor que
   * viaja como cadena es un interruptor que un dia deja de encenderse sin que
   * nada lo diga.
   */
  readonly booleano?: boolean;
  /**
   * El backend lo lee como importe: viaja **solo** si es una cadena decimal
   * simple (`-?\d+(\.\d+)?`).
   *
   * No convierte nada —un importe es texto de punta a punta (regla 1,
   * RNF-055)—: lo unico que hace es no dejar salir lo que el backend no puede
   * leer. Un `new BigDecimal("1,842.60")` **lanza**, y el separador de miles es
   * exactamente lo que una celda de tabla lleva cuando alguien la copia al
   * cuerpo (#332). Rechazarlo aqui convierte un 422 tardio —despues de que la
   * baja se confirmara— en un campo que no viaja, y la opcion que lo declara lo
   * dice ademas en su `exigir`.
   */
  readonly importe?: boolean;
  /** Traduce el texto del formulario al que espera el backend. Ver el javadoc de arriba. */
  readonly valor?: (texto: string) => string | undefined;
}

/**
 * Lo que la interfaz dibuja donde el backend no mando dato: `SIN_DATO` de
 * `pantallas/seguridad/listado.ts`.
 *
 * Se repite aqui como constante local, y no se importa, por una razon: este
 * archivo es el camino de escritura y no puede depender de como dibuja un
 * adaptador. Lo que importa es la propiedad —**un guion no es un valor**—, y esa
 * vale aunque el dia de manana el guion se escriba de otra forma.
 */
const GUION = '—';

/** Una cadena decimal simple, que es lo unico que `new BigDecimal` acepta. */
const IMPORTE = /^-?\d+(\.\d+)?$/;

/**
 * Un campo del cuerpo que **no es plano: es una tabla**.
 *
 * Existe porque el camino de escritura solo llevaba campos planos, y hay
 * formularios del manual cuya mitad es una tabla: los pisos de una ficha
 * catastral (#320) y los de su actualizacion (#71). Sin esto, cada uno de esos
 * formularios tenia que armar su cuerpo entero a mano con `cuerpo`, que es la
 * salida de emergencia: se salta la lista blanca, y entonces **la lista blanca
 * deja de decir que puede escribir esa pantalla**.
 *
 * La declaracion es la misma idea un nivel mas abajo: la tabla declara sus
 * `columnas` con los mismos `CampoDelCuerpo` de siempre, y **una clave de fila
 * que no este declarada no viaja**, igual que un campo suelto. Por eso una fila
 * con una columna de mas —porque el prototipo la dibuja y el backend no la
 * pide— sale filtrada sin que nadie tenga que acordarse.
 */
export interface TablaDelCuerpo {
  /** Como se llama la lista en el cuerpo que espera el backend. */
  readonly campo: string;
  /** Lista blanca de la fila: clave del formulario → como viaja. Lo que no este, no viaja. */
  readonly columnas: Readonly<Record<string, CampoDelCuerpo>>;
  /**
   * El backend declara **un bloque, no una lista**: viaja la primera fila tal
   * cual, y si no hay ninguna el campo no viaja.
   *
   * Es el caso degenerado de una tabla —a lo sumo una fila— y existe para el
   * `titular` del alta de una ficha, que `FichaController.PeticionDeAlta`
   * declara como un objeto opcional. Sin esto habria que armar ese cuerpo a
   * mano con `cuerpo`, que es justo lo que la lista blanca vino a evitar.
   */
  readonly unica?: boolean;
  /**
   * El backend declara la obligacion **en el cuerpo plano**, sin nombre de
   * lista: las columnas declaradas de la fila elegida se despliegan en el nivel
   * superior, y `campo` no se usa.
   *
   * Es el tercer caso de una tabla, y existe por `baja_deuda`:
   * `MovimientosDeDeudaController.PeticionDeMovimiento` es un cuerpo plano
   * —`tributo`, `ano`, `cuota`, `insoluto`, `interes`— porque **da de baja una
   * obligacion por acto**, y lo que la pantalla elige es exactamente esa
   * obligacion, en una fila de su tabla. Sin esto, la unica forma de mandarla
   * seria volver a teclear a mano lo que la tabla ya muestra, o abrir el cuerpo
   * entero con `cuerpo` —la salida de emergencia— y perder la lista blanca.
   *
   * **Solo viaja la primera fila.** Una tabla `plana` no puede expresar dos
   * obligaciones, y por eso la opcion que la declara exige tambien —con
   * `exigir`— que haya exactamente una elegida: mandar la primera y callarse las
   * demas seria dar de baja una cuota y dejar tres sin dar de baja, sin que nada
   * lo dijera.
   */
  readonly plana?: boolean;
  /**
   * El backend declara un arreglo de **valores sueltos**, no de objetos: cada
   * fila aporta un solo valor, bajo esta columna, y lo que viaja es el arreglo
   * de esos valores —`["00000003541", "00000006550"]`—, no
   * `[{"codigo":"00000003541"}, ...]`.
   *
   * Es el cuarto caso de una tabla, y existe por `contribuyentes` de
   * `valores_masivo` (#38, #75): `IniciarCorridaMasiva` declara
   * `List<String> contribuyentes`, un codigo de contribuyente por elemento, no
   * una lista de objetos con una sola clave. Sin esto la unica forma de
   * mandarlo era `cuerpo`, la salida de emergencia, perdiendo la lista blanca
   * por columna que ya trae `columnas`.
   *
   * El valor es la **clave del catalogo** de esa columna —lo que se declara en
   * `columnas`, no el nombre que lleva en el cuerpo—: `soloDeclaradas` traduce
   * con el mismo `CampoDelCuerpo` que usaria cualquier columna.
   */
  readonly columnaUnica?: string;
}

/**
 * Una entrada del vocabulario de un {@link MapaDelCuerpo}: la clave que viaja y
 * como se rotula la fila.
 *
 * Los dos nombres, por lo mismo que en {@link CampoDelCuerpo}: `clave` es el
 * vocabulario del backend —`EFECTIVO`, y `FormaDePago.porNombre` no admite
 * otro— y `etiqueta` es lo que lee quien atiende. Ninguno de los dos cede.
 */
export interface EntradaDelMapa {
  /** Como se llama esa entrada **en el cuerpo**. Lo que no este aqui no viaja. */
  readonly clave: string;
  /** Como se rotula su fila en el formulario. */
  readonly etiqueta: string;
}

/**
 * Un campo del cuerpo que **no es plano ni es una tabla: es un mapa**.
 *
 * Existe por el arqueo del cierre de caja (#36, #423): `PeticionDeCierre.declarado`
 * es un `Map<String, String>` cuyas claves son las cinco `FormaDePago` del recibo
 * —`{"EFECTIVO": "120.00", "CHEQUE": "0.00", …}`—, no cinco campos con nombre
 * fijo. `CampoDelCuerpo` no puede expresarlo: declararlo campo a campo daria
 * cinco claves del **formulario** donde el backend espera una sola con un
 * diccionario dentro.
 *
 * **El vocabulario es del dominio, no del formulario**, y por eso se declara
 * aqui entero en vez de leerse del catalogo: el prototipo dibuja **cuatro**
 * casillas —efectivo, tarjeta, deposito en cuenta y pago en linea— y deja el
 * cheque sin ninguna. Declarar por las casillas es exactamente lo que el javadoc
 * de `PeticionDeCierre` prohibe: «haria que un turno con un cheque saliera
 * descuadrado sin que el cajero pudiera decir nada».
 *
 * La lista blanca es la de siempre, un nivel mas abajo: **una clave que no este
 * en `entradas` no entra en el estado y no viaja**, igual que un campo suelto o
 * una columna de tabla. Es lo que impide que el mapa se convierta en la puerta
 * abierta que `cuerpo` —la salida de emergencia— ya es.
 */
export interface MapaDelCuerpo {
  /** Como se llama el mapa en el cuerpo que espera el backend. */
  readonly campo: string;
  /** El vocabulario, en el orden en que se dibujan sus filas. */
  readonly entradas: readonly EntradaDelMapa[];
  /**
   * Cada valor es un importe: viaja **solo** si es una cadena decimal simple,
   * por lo mismo y con la misma comprobacion que {@link CampoDelCuerpo.importe}.
   */
  readonly importe?: true;
  /**
   * Los campos del catalogo a los que **sustituye**: el mapa se dibuja en el
   * sitio del primero y los demas no se dibujan.
   *
   * Se declara el sitio en vez de anadir un bloque al final por lo mismo que un
   * resolutor sustituye a su campo (#331, #73): las cuatro casillas del
   * prototipo y las cinco filas del mapa son **lo mismo**, y dibujar las dos
   * cosas dejaria nueve cajas de importe en la seccion «Arqueo» —cuatro
   * bloqueadas y muertas— sin ninguna forma de saber en cual se teclea.
   */
  readonly enVezDe: readonly string[];
}

/** Sin campos declarados. Constante para que la lista blanca no cambie cada render. */
const SIN_CAMPOS: Readonly<Record<string, CampoDelCuerpo>> = {};

/** Sin tablas declaradas. Misma razon que `SIN_CAMPOS`. */
const SIN_TABLAS: Readonly<Record<string, TablaDelCuerpo>> = {};

/** Sin claves de presentacion. Misma razon que `SIN_CAMPOS`. */
const SIN_PRESENTACION: readonly string[] = [];

/** Sin mapas declarados. Misma razon que `SIN_CAMPOS`. */
const SIN_MAPAS: Readonly<Record<string, MapaDelCuerpo>> = {};

/** Sin discriminador: escribe la primaria, como en las quince de siempre. */
const SIN_DISCRIMINADOR: Readonly<Record<string, Readonly<Record<string, string>>>> = {};

/** Sin nada que traiga el filtro. Misma razon que `SIN_CAMPOS`. */
const SIN_FILTRO: Readonly<Record<string, string>> = {};

export interface OpcionesDeEscritura {
  /**
   * Los unicos campos del formulario que viajan, **por su clave del catalogo**,
   * con el nombre que llevan en el cuerpo.
   *
   * Los dos nombres hacen falta porque no coinciden y no tienen por que: el
   * catalogo sale del prototipo —«Cambiar al año» es `cambiarAlAno`— y el
   * cuerpo lo declara el backend —`ejercicio`—. Traducir aqui es lo que permite
   * que ninguno de los dos tenga que ceder.
   *
   * Vacio por omision: **una pantalla que no declara campos manda solo su
   * observacion**, y sus controles no se pueden escribir.
   */
  readonly campos?: Readonly<Record<string, CampoDelCuerpo>>;
  /**
   * Claves que el formulario puede **guardar sin mandar nunca**.
   *
   * Entran en `campos` de {@link Escritura} —el conjunto de lo escribible, que
   * es lo que `fijarCampo` deja entrar— y **no** en el registro de campos del
   * cuerpo, que es el unico que `soloDeclarados` recorre. Por eso la garantia de
   * que no viajan no depende de acordarse: no hay declaracion que las traduzca.
   *
   * Ver `EscrituraDeclarada.presentacion` para por que existen.
   */
  readonly presentacion?: readonly string[];
  /**
   * Las tablas del formulario que viajan, por su clave, con su lista blanca de
   * columnas. Ver {@link TablaDelCuerpo}.
   */
  readonly tablas?: Readonly<Record<string, TablaDelCuerpo>>;
  /**
   * Los mapas del formulario que viajan, por su clave, con su vocabulario.
   * Ver {@link MapaDelCuerpo}.
   */
  readonly mapas?: Readonly<Record<string, MapaDelCuerpo>>;
  /**
   * **Que accion manda que cuerpo**, para la pantalla que el prototipo capturo
   * con varios verbos: rotulo de la accion → lo que ese boton anade.
   *
   * Existe por «Anulación de convenio» (#35, #423): sus tres acciones —«Anular»,
   * «Reformar», «Quebrar»— son la misma ruta y el mismo cuerpo con un `accion`
   * distinto, porque para el libro son el mismo acto —la deuda vuelve a la fase
   * de la que salio— y lo que cambia es el motivo administrativo. Sin esto, la
   * unica forma de decir «esta accion manda esto y aquella manda aquello» era un
   * componente propio, que es una pantalla menos cubierta por las pruebas
   * transversales del camino de escritura.
   *
   * **Lo declarado es un rotulo del catalogo**, el mismo criterio que
   * `esIrreversible` y `LA_QUE_ESCRIBE` (#421): es lo que el usuario lee y lo que
   * el prototipo dibuja. Una accion que no este aqui **no escribe**: se queda
   * secundaria y apagada, como estaba.
   */
  readonly segunLaAccion?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Lo que el cuerpo toma **del filtro de la busqueda**, y no del formulario.
   *
   * Existe por el cierre de caja: el turno se identifica por (caja, cajero,
   * fecha), y el catalogo dibuja la caja y el cajero **de solo lectura** —el
   * prototipo capturo un cliente de escritorio donde los dos salian de la
   * sesion—. Aqui se teclean en el bloque de busqueda, que es el mismo sitio
   * desde el que se lee el arqueo en vivo del turno.
   *
   * El precedente es `SeleccionDeFilas.contexto` (#332), y es la misma idea: el
   * sujeto de la pantalla entera **no es una columna ni un campo**, va en el
   * filtro, y sin el la peticion senala a otro registro. Sigue pasando por la
   * lista blanca —lo que no este aqui no viaja— y por la misma traduccion de
   * {@link CampoDelCuerpo}.
   */
  readonly delFiltro?: Readonly<Record<string, CampoDelCuerpo>>;
  /**
   * Lo que el cuerpo lleva **siempre** y nadie teclea: la mitad de la operacion
   * que se esta invocando.
   *
   * Existe por una sola forma, y conviene que siga siendo esa: hay operaciones
   * que son **dos** —`POST /rentas/predial/calculo-masivo` simula o asienta
   * segun `simulacion`, y el backend exige decirlo—, y esa marca no es un dato
   * del expediente sino cual de las dos mitades se pide. No hay campo en el
   * catalogo para ella, asi que por `campos` no puede viajar: `soloDeclarados`
   * recorre el borrador, y en el borrador solo esta lo que alguien escribio.
   *
   * Es el espejo de `SimulacionDeLaPantalla.cuerpo`, que ya hace lo mismo del
   * otro lado. Y **no es la salida de emergencia**: `cuerpo` sustituye el cuerpo
   * entero y con el la lista blanca; esto se suma a lo declarado, se lee en el
   * mismo archivo que la lista blanca y se ve en el mismo diff.
   *
   * Se mezcla **antes** que los campos: una constante nunca puede pisar lo que
   * el operador escribio, y una colision entre las dos es un error de
   * declaracion que `escrituras.test.ts` pone rojo.
   */
  readonly constantes?: Readonly<Record<string, string | number | boolean>>;
  /**
   * Lo que **ademas de la observacion** hace falta para poder guardar, dicho
   * como el motivo por el que todavia no se puede.
   *
   * Devolver un texto deshabilita la accion y lo explica; `undefined` la deja
   * pasar. Existe para lo que la lista blanca no puede expresar —«la ficha
   * necesita su documento de origen»— y sustituye a lanzar dentro del envio,
   * que dejaba pulsar y contestaba con un error despues de haberlo hecho.
   *
   * Recibe el borrador **del render en curso** en vez de leerlo de un cierre:
   * un cierre sobre el estado de quien la declara se evalua antes de que ese
   * estado exista, y la condicion se quedaria mirando siempre el formulario
   * vacio.
   *
   * Recibe tambien **las filas**, por el mismo motivo: media docena de estos
   * formularios son una tabla, y sin ellas una opcion no podia exigir «al menos
   * un piso» ni «el titular necesita su documento» —lo unico que podia mirar era
   * el borrador plano, donde eso no esta—.
   *
   * Y **lo que trae el filtro** ({@link delFiltro}), por el mismo motivo que las
   * filas: el sujeto de la pantalla puede no estar en el formulario, y sin el la
   * opcion no puede decir que le falta.
   */
  readonly exigir?: (
    borrador: Readonly<Record<string, string>>,
    filas: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>,
    delFiltro: Readonly<Record<string, string>>,
  ) => string | undefined;
  /**
   * Que hacer con la respuesta cuando lo guardado cambia algo global a la
   * sesion —hoy, el ejercicio de trabajo—.
   *
   * Si devuelve `'cache-vaciada'`, la invalidacion general no se ejecuta: ya se
   * vacio entera, y volver a invalidar pediria otra vez lo que se acaba de
   * pedir.
   */
  readonly alGuardar?: (respuesta: unknown) => 'cache-vaciada' | void;
  /**
   * Sustituye el cuerpo entero (salvo la observacion) por lo que devuelva esta
   * funcion, en vez de `soloDeclarados(borrador, campos)`.
   *
   * Existe para las pantallas cuyo cuerpo no es un formulario de campos
   * planos: `permisos` manda una lista de niveles, `actualizacion_catastro`
   * una lista de construcciones, y `CampoDelCuerpo` no tiene forma de
   * expresar un arreglo. Se lee en cada envio —es un cierre sobre el estado
   * de quien la declara—, igual que `borrador` se lee en cada envio hoy.
   */
  readonly cuerpo?: () => Readonly<Record<string, unknown>>;
  /**
   * Lo que se pregunto en el bloque de busqueda, por su clave del catalogo.
   *
   * Solo lo mira {@link delFiltro}: de aqui salen los campos del cuerpo que el
   * formulario no teclea. Sin declaracion no se lee ninguno, asi que una
   * pantalla que no lo declare no puede mandar un filtro por descuido.
   */
  readonly filtros?: Readonly<Record<string, string>>;
}

export function useEscritura(
  operacion: IdDeOperacion | undefined,
  parametros: Readonly<Record<string, string>>,
  {
    campos = SIN_CAMPOS,
    presentacion = SIN_PRESENTACION,
    tablas = SIN_TABLAS,
    mapas = SIN_MAPAS,
    segunLaAccion = SIN_DISCRIMINADOR,
    delFiltro = SIN_CAMPOS,
    filtros = SIN_FILTRO,
    constantes,
    exigir,
    alGuardar,
    cuerpo,
  }: OpcionesDeEscritura = {},
): Escritura {
  const [observacion, fijarTexto] = useState('');
  const [borrador, fijarBorrador] = useState<Readonly<Record<string, string>>>({});
  const [filas, fijarTodasLasFilas] = useState<
    Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>
  >({});
  const [entradas, fijarTodasLasEntradas] = useState<
    Readonly<Record<string, Readonly<Record<string, string>>>>
  >({});
  const clave = useRef(nuevaClaveDeIdempotencia());
  /* Con que boton se hizo el ultimo intento. Cambiar de verbo **es otro
     intento**: con la clave anterior, pulsar «Quebrar» tras un «Anular» que
     fallo devolveria el resultado del primero —una anulacion— en vez de
     quebrar. Es la misma regla que ya vale para el borrador y para las filas. */
  const ultimaAccion = useRef<string | undefined>(undefined);
  const clientes = useQueryClient();
  // La lista blanca en forma de conjunto, estable entre renders: entra en la
  // dependencia de lo que se manda y en si un control se puede escribir.
  const declarados = useMemo(
    () => new Set([...Object.keys(campos), ...presentacion]),
    [campos, presentacion],
  );
  const declaradas = useMemo(() => new Set(Object.keys(tablas)), [tablas]);
  const declaradosMapas = useMemo(() => new Set(Object.keys(mapas)), [mapas]);
  const queEscriben = useMemo(() => new Set(Object.keys(segunLaAccion)), [segunLaAccion]);
  /* Lo que el filtro aporta al cuerpo, ya filtrado por su lista blanca: se
     calcula una vez por render y se usa dos veces —para `exigir` y para el
     envio—, que es lo que impide que las dos digan cosas distintas. */
  const delFiltroDeclarado = useMemo(() => soloDelFiltro(filtros, delFiltro), [filtros, delFiltro]);
  // Lo que ademas de la observacion falta para poder guardar. Se pregunta en
  // cada render porque es un cierre sobre el estado de quien lo declara.
  const falta = exigir?.(borrador, filas, delFiltroDeclarado);
  /* Y el motivo completo, con la observacion incluida: es el que se pinta.
     **Sin operacion no hay motivo**, y esa condicion faltaba: una pantalla sin
     sitio a donde escribir devolvia «falta la observación» —y la franja lo
     pintaba— al lado de una pantalla que ni siquiera dibuja la caja de
     observacion. Lo que le pasa a esa pantalla no es que falte un texto: es que
     no hay escritura, y eso lo cuenta el impedimento del acto, no esto. */
  const motivo =
    operacion === undefined
      ? undefined
      : (falta ?? (observacion.trim() === '' ? FALTA_LA_OBSERVACION : undefined));

  // Este es el unico sitio del frontend donde se escribe, y es el que exige la
  // observacion: la regla de ESLint protege a todos los demas de saltarsela.
  // eslint-disable-next-line no-restricted-syntax
  const mutacion = useMutation({
    mutationFn: async (accion?: string) => {
      if (operacion === undefined) throw new Error('Esta pantalla no escribe ninguna operacion.');
      /* Lo que anade el boton que se pulso, cuando la opcion declara un
         discriminador. `Object.hasOwn` y no la indexacion, por lo mismo que en
         `soloDeclarados`: una accion rotulada `constructor` daria un «cuerpo»
         que no declaro nadie. Sin discriminador esto es siempre vacio. */
      const deLaAccion =
        accion !== undefined && Object.hasOwn(segunLaAccion, accion)
          ? (segunLaAccion[accion] ?? {})
          : {};
      return enviarOperacion(
        operacion,
        parametros as ParametrosDe<IdDeOperacion>,
        // La observacion va siempre; lo demas, solo lo declarado —o lo que
        // `cuerpo` construya, para la pantalla que no cabe en campos planos—.
        {
          ...(cuerpo
            ? cuerpo()
            : {
                // Las constantes van primero: lo declarado y lo escrito manda
                // sobre ellas. Ver `OpcionesDeEscritura.constantes`.
                ...constantes,
                ...soloDeclarados(borrador, campos),
                ...soloDeclarados(delFiltroDeclarado, delFiltro),
                ...soloDeclaradas(filas, tablas),
                ...soloDelVocabulario(entradas, mapas),
              }),
          ...deLaAccion,
          observacion,
        } as CuerpoDe<IdDeOperacion>,
        clave.current,
      );
    },
    onSuccess: async (respuesta) => {
      // El intento termino: el siguiente es otro, con otra clave.
      clave.current = nuevaClaveDeIdempotencia();
      fijarTexto('');
      // Y el borrador se vacia: lo que se escribio ya esta guardado, y dejarlo
      // en memoria es exactamente lo que la pantalla de contrasena no permite.
      fijarBorrador({});
      fijarTodasLasFilas({});
      fijarTodasLasEntradas({});
      // Lo global a la sesion se atiende primero y puede quedarse con la cache
      // entera; si no lo hace, se invalida lo que este afectado.
      if (alGuardar?.(respuesta) === 'cache-vaciada') return;
      await clientes.invalidateQueries();
    },
  });

  return {
    ...(operacion === undefined ? {} : { operacion }),
    campos: declarados,
    tablas: declaradas,
    mapas: declaradosMapas,
    acciones: queEscriben,
    borrador,
    fijarCampo: (campo: string, valor: string) => {
      // Un campo que la opcion no declaro no entra en el estado. Es la misma
      // regla que impide que viaje, aplicada un paso antes: si nunca se guarda,
      // no hay valor que se pueda filtrar despues.
      if (!declarados.has(campo)) return;
      if (borrador[campo] !== valor) clave.current = nuevaClaveDeIdempotencia();
      fijarBorrador((previo) => ({ ...previo, [campo]: valor }));
    },
    filasDe: (tabla: string) => filas[tabla] ?? [],
    fijarFilas: (tabla, nuevas) => {
      // Una tabla no declarada no entra en el estado, por lo mismo que un campo.
      const declarada = tablas[tabla];
      if (!declaradas.has(tabla) || declarada === undefined) return;
      // Y **de cada fila solo entran sus columnas declaradas**. La lista blanca
      // de una tabla filtraba solo al enviar, y eso la dejaba asimetrica con la
      // de los campos planos: una columna que la opcion no declara —porque el
      // prototipo la dibuja y el backend no la pide— llegaba igual al estado de
      // React, que es justo donde no tiene que estar.
      const limpias = nuevas.map((fila) => soloColumnas(fila, declarada.columnas));
      // Cambiar la tabla cambia lo que se manda, y por tanto el intento: con la
      // clave anterior, quitar un piso devolveria el resultado del envio de
      // antes —el que todavia lo tenia— en vez de aplicar la correccion. Pero
      // **solo si cambia**: regenerarla al fijar lo mismo que ya habia convierte
      // un reintento en un segundo envio, que es la mitad exacta de la regla.
      if (!mismasFilas(filas[tabla] ?? [], limpias)) clave.current = nuevaClaveDeIdempotencia();
      fijarTodasLasFilas((previas) => ({ ...previas, [tabla]: limpias }));
    },
    entradasDe: (mapa: string) => entradas[mapa] ?? SIN_FILTRO,
    fijarEntrada: (mapa, entrada: string, valor) => {
      // Un mapa no declarado no entra en el estado, por lo mismo que una tabla.
      const declarado = mapas[mapa];
      if (!declaradosMapas.has(mapa) || declarado === undefined) return;
      /* Y **una clave que no este en su vocabulario tampoco**: es la lista
         blanca por columna de una tabla, dicha para un mapa. Sin ella, el
         vocabulario del dominio —las cinco `FormaDePago`— se convierte en un
         diccionario abierto donde cualquiera escribe cualquier clave, y el
         backend rechaza el cierre entero con «Forma de pago desconocida». */
      if (!declarado.entradas.some(({ clave: declarada }) => declarada === entrada)) return;
      const previas = entradas[mapa] ?? {};
      if (previas[entrada] !== valor) clave.current = nuevaClaveDeIdempotencia();
      fijarTodasLasEntradas((todas) => ({ ...todas, [mapa]: { ...previas, [entrada]: valor } }));
    },
    observacion,
    fijarObservacion: (texto: string) => {
      // Cambiar lo que se manda empieza un intento nuevo: con la clave anterior,
      // el servidor devolveria el resultado del intento de antes —el que se esta
      // corrigiendo— en vez de aplicar la correccion.
      if (texto !== observacion) clave.current = nuevaClaveDeIdempotencia();
      fijarTexto(texto);
    },
    puedeEnviar:
      operacion !== undefined &&
      observacion.trim() !== '' &&
      falta === undefined &&
      !mutacion.isPending,
    ...(falta === undefined ? {} : { falta }),
    ...(motivo === undefined ? {} : { motivo }),
    enviando: mutacion.isPending,
    enviada: mutacion.isSuccess,
    errorPorCampo: erroresPorCampo(mutacion.error),
    error: mutacion.error,
    enviar: (accion?: string) => {
      // Pulsar dos veces rapido es una pulsacion: el boton se deshabilita al
      // primer envio, y esto cubre la carrera entre las dos.
      if (mutacion.isPending || observacion.trim() === '' || falta !== undefined) return;
      /* **Con discriminador, sin accion reconocida no sale nada.** No hay un
         cuerpo por omision que mandar: los tres verbos de «Anulación de
         convenio» son tres actos distintos sobre el mismo convenio, y elegir
         «el primero» por el que no se declaro seria anular porque alguien
         pulso «Quebrar». Que ningun boton pueda llegar aqui sin su rotulo lo
         sostiene `BarraDeAcciones`; esto es la barrera, no la comodidad. */
      if (queEscriben.size > 0) {
        if (accion === undefined || !queEscriben.has(accion)) return;
        // Cambiar de verbo es otro intento: otra clave de idempotencia.
        if (accion !== ultimaAccion.current) clave.current = nuevaClaveDeIdempotencia();
        ultimaAccion.current = accion;
      }
      mutacion.mutate(accion);
    },
    clave: clave.current,
  };
}

/**
 * El cuerpo, filtrado por la lista blanca.
 *
 * Se filtra **al enviar** y no solo al escribir: las dos barreras protegen de
 * cosas distintas. La de escritura evita que el valor exista; esta evita que
 * viaje si alguien un dia rellena el borrador por otro camino.
 */
function soloDeclarados(
  borrador: Readonly<Record<string, string>>,
  campos: Readonly<Record<string, CampoDelCuerpo>>,
): Readonly<Record<string, string | number | boolean>> {
  const cuerpo: Record<string, string | number | boolean> = {};
  for (const [campo, valor] of Object.entries(borrador)) {
    // `Object.hasOwn` y no `campos[campo]`: la indexacion resuelve por la cadena
    // de prototipos, asi que un campo llamado `constructor` o `toString` daba un
    // «declarado» que no declaro nadie —y con el, un `cuerpo[undefined]`—.
    if (!Object.hasOwn(campos, campo)) continue;
    const declarado = campos[campo];
    if (declarado === undefined) continue;
    // Lo que se escribio con espacios alrededor viaja sin ellos, y si solo eran
    // espacios no viaja: un `documentoOrigen` de un espacio pasaba la lista
    // blanca, llegaba al backend y volvia como 422 por un campo «lleno».
    const limpio = valor.trim();
    if (limpio === '') continue;
    // **Un guion no es un valor.** Es lo que la interfaz dibuja donde el backend
    // no mando dato, y una fila elegida en una tabla lo lleva en sus celdas
    // vacias. Mandarlo convierte «no llego» en un dato: el backend lo leeria
    // como un documento llamado «—», o lo rechazaria como importe (#332).
    if (limpio === GUION) continue;
    if (declarado.importe === true && !IMPORTE.test(limpio)) {
      // Ver `CampoDelCuerpo.importe`: lo que el backend no puede leer no sale.
      continue;
    }
    if (declarado.valor !== undefined) {
      // Un valor que la traduccion no reconoce no viaja: ver el javadoc de `CampoDelCuerpo`.
      const traducido = declarado.valor(limpio);
      if (traducido !== undefined) cuerpo[declarado.campo] = traducido;
    } else if (declarado.booleano === true) {
      // Solo llega aqui lo marcado: la casilla sin marcar vale cadena vacia, y
      // eso se descarto mas arriba. Ver `CampoDelCuerpo.booleano`.
      cuerpo[declarado.campo] = true;
    } else if (declarado.entero === true) {
      // Un entero es entero **entero**. `Number.parseInt` se queda con el
      // prefijo, y eso no es una conversion: es una reinterpretacion silenciosa
      // —una cuota escrita «1-4», que es como el manual escribe las cuatro
      // cuotas de un ano, viajaria como la cuota 1 y las otras tres se
      // perderian sin que nada lo dijera—. Lo que no es un entero no viaja,
      // igual que un campo vacio.
      const entero = /^[+-]?\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
      if (Number.isInteger(entero)) cuerpo[declarado.campo] = entero;
    } else {
      cuerpo[declarado.campo] = limpio;
    }
  }
  return cuerpo;
}

/**
 * Lo que el filtro aporta, **con solo las claves que la opcion declara**.
 *
 * Es la misma lista blanca de `soloColumnas`, aplicada a la busqueda: aqui las
 * claves siguen siendo las del catalogo —lo que se pregunto en el bloque de
 * busqueda—, y lo unico que se decide es cual de ellas puede llegar al cuerpo.
 * La traduccion al nombre del backend la hace despues `soloDeclarados`, con el
 * mismo `CampoDelCuerpo` de siempre.
 */
function soloDelFiltro(
  filtros: Readonly<Record<string, string>>,
  declarados: Readonly<Record<string, CampoDelCuerpo>>,
): Readonly<Record<string, string>> {
  const limpios: Record<string, string> = {};
  for (const clave of Object.keys(declarados)) {
    const valor = filtros[clave];
    if (valor !== undefined) limpios[clave] = valor;
  }
  return limpios;
}

/**
 * Los mapas, filtrados por su vocabulario.
 *
 * **Una clave que el vocabulario no declara no sale**, aunque de algun modo
 * hubiera llegado al estado: es la barrera gemela de `soloDeclarados`, y
 * protege de lo mismo un nivel mas abajo. Lo vacio y el guion tampoco viajan,
 * por lo mismo que en un campo suelto —un arqueo «—» no es un importe—, y con
 * `importe` se aplica la comprobacion de `CampoDelCuerpo.importe`: lo que
 * `new BigDecimal` no puede leer no sale.
 *
 * **El mapa viaja aunque este vacio**, igual que una tabla declarada: para el
 * backend `{}` y ausente significan lo mismo —`declaradoDe` trata el nulo como
 * un mapa vacio—, y mandarlo siempre deja el cuerpo con la misma forma se
 * teclee o no el arqueo.
 */
function soloDelVocabulario(
  entradas: Readonly<Record<string, Readonly<Record<string, string>>>>,
  mapas: Readonly<Record<string, MapaDelCuerpo>>,
): Readonly<Record<string, unknown>> {
  const cuerpo: Record<string, unknown> = {};
  for (const [mapa, declarado] of Object.entries(mapas)) {
    const escritas = entradas[mapa] ?? {};
    const valores: Record<string, string> = {};
    for (const { clave } of declarado.entradas) {
      const limpio = (escritas[clave] ?? '').trim();
      if (limpio === '' || limpio === GUION) continue;
      if (declarado.importe === true && !IMPORTE.test(limpio)) continue;
      valores[clave] = limpio;
    }
    cuerpo[declarado.campo] = valores;
  }
  return cuerpo;
}

/**
 * Una fila, con **solo las columnas que su tabla declara**.
 *
 * Es la misma lista blanca de `soloDeclarados`, pero un paso antes y sin
 * traducir: aqui la fila sigue siendo del formulario —sus claves son las del
 * catalogo—, y lo unico que se decide es si la columna puede existir.
 */
function soloColumnas(
  fila: Readonly<Record<string, string>>,
  columnas: Readonly<Record<string, CampoDelCuerpo>>,
): Readonly<Record<string, string>> {
  const limpia: Record<string, string> = {};
  for (const [columna, valor] of Object.entries(fila)) {
    if (Object.hasOwn(columnas, columna)) limpia[columna] = valor;
  }
  return limpia;
}

/** Si dos juegos de filas dicen lo mismo. Lo que decide si el intento es otro. */
function mismasFilas(
  previas: readonly Readonly<Record<string, string>>[],
  nuevas: readonly Readonly<Record<string, string>>[],
): boolean {
  if (previas.length !== nuevas.length) return false;
  return previas.every((previa, i) => {
    const nueva = nuevas[i];
    if (nueva === undefined) return false;
    const claves = Object.keys(previa);
    return (
      claves.length === Object.keys(nueva).length &&
      claves.every((clave) => previa[clave] === nueva[clave])
    );
  });
}

/** Lo que falta cuando no falta nada mas: la observacion (regla 10, RNF-052). */
const FALTA_LA_OBSERVACION = 'Falta la observación: sin ella no se guarda.';

/**
 * Las tablas, filtradas por su lista blanca de columnas.
 *
 * Una tabla declarada **viaja aunque este vacia**: un arreglo vacio es una
 * instruccion —«ningun piso»— y omitirlo significaria otra cosa distinta en la
 * actualizacion de una ficha («lo mismo que tenia», dice
 * `DeclaracionDeFicha`). Confundir las dos vacia las construcciones de un
 * predio sin que ningun `DELETE` aparezca en el diff.
 */
function soloDeclaradas(
  filas: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>,
  tablas: Readonly<Record<string, TablaDelCuerpo>>,
): Readonly<Record<string, unknown>> {
  const cuerpo: Record<string, unknown> = {};
  for (const [tabla, declarada] of Object.entries(tablas)) {
    const escritas = (filas[tabla] ?? []).map((fila) => soloDeclarados(fila, declarada.columnas));
    if (declarada.plana === true) {
      // El cuerpo plano del backend: las columnas de la fila elegida, en el
      // nivel superior. Sin fila no viaja nada —igual que un bloque `unica` sin
      // escribir—, y nunca se mezclan dos filas: ver `TablaDelCuerpo.plana`.
      const [primera] = escritas;
      if (primera !== undefined) Object.assign(cuerpo, primera);
    } else if (declarada.unica === true) {
      // Un bloque sin escribir **no viaja**: mandarlo vacio no es «no lo se»,
      // es «esto es», y el backend lo rechazaria por faltarle sus campos.
      const [primera] = escritas;
      if (primera !== undefined && Object.keys(primera).length > 0)
        cuerpo[declarada.campo] = primera;
    } else if (declarada.columnaUnica !== undefined) {
      // Un arreglo de valores sueltos: la clave del cuerpo de esa columna
      // —no la del catalogo, que es lo que declara `columnaUnica`— dice bajo
      // que nombre `soloDeclarados` dejo el valor de cada fila.
      const clave = declarada.columnas[declarada.columnaUnica]?.campo;
      cuerpo[declarada.campo] =
        clave === undefined
          ? []
          : escritas.flatMap((fila) => (fila[clave] === undefined ? [] : [fila[clave]]));
    } else {
      cuerpo[declarada.campo] = escritas;
    }
  }
  return cuerpo;
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
 * a pasar y **sobre cuantos**, no preguntando si se esta seguro: quien pulsa
 * siempre esta seguro.
 *
 * La lista crecio con los cuatro actos que #75 nombra y que no estaban:
 * **generar una tanda de valores**, **notificar** —el acuse sostiene el plazo, y
 * un plazo mal notificado tumba el procedimiento— y **pasar a coactiva**. Se
 * mira la etiqueta de la accion y no la operacion porque es lo que el usuario
 * lee: si el boton dice «Derivar a coactiva», eso es lo que cree que va a
 * hacer.
 *
 * **Y con #423, los dos verbos de tesoreria que se conectan ahi**: `quiebre` ya
 * estaba y el catalogo rotula el boton «Quebrar», que ese patron no caza —el
 * quiebre mata el convenio y devuelve la deuda a su fase de origen—; y `cerrar
 * caja`, que es el unico «cerrar» del catalogo que escribe (el otro es «Cerrar
 * acta»): un cierre no se corrige, se reversa con otro acta, y reversar exige
 * ademas el privilegio de ELIMINACION (`CierreController`).
 *
 * **Y con #426, los dos verbos de coactiva que se conectan ahi.**
 *
 * - `importar valor`, que es lo que el AC 2 de aquel issue pide por su nombre.
 *   No estaba: `coactiva` ya cazaba «Pase de valores a coactiva», pero el boton
 *   de «Importacion de valores a coactiva» se rotula «Importar valores», sin esa
 *   palabra. Y lo que hace no admite vuelta: `ImportarValoresACoactiva` abre el
 *   expediente, le pone su numero definitivo —`PlantillaDeNumeroDeExpediente`
 *   sobre el correlativo, D-09— y mueve los valores a fase COACTIVA.
 * - `generar`, que hasta ahora solo se cazaba con `valor` detras. La REC-1 se
 *   dicta con un boton rotulado «Generar» a secas, y dictarla es asentar el acto,
 *   emitir su documento y mover el expediente a `REC1_EMITIDA` — un papel que se
 *   notifica al obligado y desde el que corre el plazo del art. 117. Ensanchar el
 *   patron no toca a ninguna pantalla de calculo: `esIrreversible` solo se
 *   consulta sobre **el boton que escribe** (`BarraDeAcciones`), y las que
 *   calculan no escriben ninguna.
 */
const IRREVERSIBLES =
  /anular|anulaci|dar de baja|baja de|emitir|emisi|generar|importar valor|notificar|notificaci|coactiva|reversar|quiebre|quebrar|cerrar caja|prescri|transferir|transferencia|cambiar n[uú]mero/i;

export const esIrreversible = (accion: string): boolean => IRREVERSIBLES.test(accion);
