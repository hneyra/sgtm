import type { CampoDelCuerpo, TablaDelCuerpo } from './escritura';

/**
 * Que puede escribir cada opcion, declarado una a una.
 *
 * Es la puerta lateral de la escritura, gemela de `conexiones.ts`: mientras una
 * opcion no esta aqui, su formulario **no se puede escribir** y su accion manda
 * solo la observacion. Esa es la posicion por omision a proposito —negacion por
 * omision, como la autorizacion del manual—: una pantalla que dibuja campos que
 * el backend no acepta no puede mandarlos por descuido, tiene que declararlos.
 *
 * Dos nombres por campo porque son dos vocabularios: la clave del catalogo sale
 * del prototipo (`cambiarAlAno`, de «Cambiar al año») y el nombre del cuerpo lo
 * declara el backend (`ejercicio`). Ninguno cede; la traduccion vive aqui.
 *
 * **La clave es el id de la operacion**, que para las 134 opciones del manual es
 * tambien el id de la opcion del catalogo (`catalogo.test.ts` lo exige). Las
 * escrituras que **no** tienen pantalla propia —el alta de un sector, de una via
 * o de una ficha, que se abren desde la pantalla de su catalogo (#320, #321)—
 * entran por su `operationId`, y por eso no colisionan con ninguna opcion.
 */
export interface EscrituraDeclarada {
  /** Clave del catalogo → como viaja en el cuerpo. Lo que no este aqui no viaja. */
  readonly campos: Readonly<Record<string, CampoDelCuerpo>>;
  /**
   * Claves que la pantalla **guarda y no manda nunca**: presentacion que tiene
   * que sobrevivir a que un bloque se desmonte.
   *
   * Es la excepcion, y esta acotada a proposito. La regla sigue siendo que el
   * borrador es lo que viaja; estas claves entran en el borrador —para que
   * `fijarCampo` las acepte— y **no estan en `campos`**, asi que
   * `soloDeclarados` no las mira siquiera: no hay forma de que salgan.
   *
   * Existe por el resolutor de la unidad (revision de #331): «#1 / —» era lo
   * que quedaba en la tarjeta al plegar y volver a abrir la seccion, porque el
   * rotulo del candidato elegido vivia en el estado del componente que se
   * desmonta. Releerlo por su identificador tampoco se puede: no hay ningun
   * `GET` de un predio por `predioId`.
   */
  readonly presentacion?: readonly string[];
  /** Las tablas del formulario, con su propia lista blanca por columna. */
  readonly tablas?: Readonly<Record<string, TablaDelCuerpo>>;
  /**
   * Lo que **ademas de la observacion** hace falta para poder guardar, dicho
   * como el motivo por el que todavia no se puede. Ver `OpcionesDeEscritura.exigir`.
   */
  readonly exigir?: (
    borrador: Readonly<Record<string, string>>,
    filas: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>,
  ) => string | undefined;
  /** Lo guardado cambia el ejercicio de trabajo de la sesion, no solo esta pantalla. */
  readonly cambiaElEjercicio?: boolean;
  /**
   * La pantalla muestra un aviso antes del formulario explicando **lo que no
   * manda**.
   *
   * Aqui va la declaracion, no la redaccion: el texto vive en
   * `prosa-textos.ts`, fuera del trozo de arranque —este archivo si esta en el,
   * porque el camino de escritura lo necesita entero y sincrono, pero su prosa
   * no—. `prosa.test.ts` exige que las dos listas digan lo mismo: una nota
   * declarada sin texto es un aviso vacio, y un texto sin declarar es un aviso
   * que nadie dibuja.
   */
  readonly nota?: true;
}

/**
 * «Concepto/tributo» **del desplegable del prototipo** → el codigo del libro.
 *
 * **Solo la usa `alta_deuda`**, y por una razon que es la que justifica que la
 * traduccion exista: ahi el tributo lo elige quien atiende en un desplegable
 * que el prototipo escribio en su propio vocabulario («IMPUESTO PREDIAL»), y
 * mandarlo tal cual seria mandar el rotulo de una pantalla como si fuera un
 * codigo del libro.
 *
 * La baja **no** pasa por aqui: su tributo no lo teclea nadie, lo trae la fila
 * que publica `consulta_deuda`, que ya habla el vocabulario del backend. Ver
 * `CUOTAS_DE_LA_BAJA`.
 *
 * **Cual es la lista buena, que no es la que parecia** (#331). Esta tabla decia
 * seguir el `CHECK` de `determinacion` (`V2__rentas_y_cuenta_corriente.sql`), y
 * esa es la restriccion equivocada: un alta de deuda no escribe una
 * determinacion, escribe un **movimiento** —`saldo` y `asiento`—, y ahi
 * `tributo` es `varchar(20)` **sin `CHECK`**; `PeticionDeMovimiento.tributo` es
 * un `String` libre que `ClaveDeSaldo` solo normaliza. Es exactamente el mismo
 * defecto que #337 encontro del otro lado del movimiento, donde pasar la baja
 * por este diccionario **rechazaba las multas** que el libro si tiene.
 *
 * Asi que la quinta entrada no es una ampliacion: es la correccion de una
 * omision. `RegistrarPapeleta` asienta `MULTA_ADMINISTRATIVA` en el libro, y una
 * multa administrativa incorporada a mano —que es literalmente lo que la
 * descripcion de la pantalla nombra: «determinaciones de fiscalizacion, multas o
 * deuda migrada»— tiene que poder señalar a esa misma deuda. Sin ella, elegir
 * «MULTA ADMINISTRATIVA» dejaba el campo sin viajar y el backend contestaba
 * «Falta el campo 'tributo'», que no es lo que pasaba.
 *
 * Las **dos** que siguen sin codigo son «MULTA TRIBUTARIA» y «DERECHOS
 * ADMINISTRATIVOS»: ninguna aparece en el libro, en ningun `CHECK` ni en ningun
 * caso de uso que asiente. Se dejan fuera a proposito —inventarles un codigo
 * seria crear un tributo que nadie sabe leer— y, a diferencia de antes, la
 * pantalla **lo dice** en vez de callarse: ver `faltaEnElAlta`.
 */
const TRIBUTO_DEL_BACKEND: Readonly<Record<string, string>> = {
  'IMPUESTO PREDIAL': 'PREDIAL',
  'ARBITRIOS MUNICIPALES': 'ARBITRIO',
  'PATRIMONIO VEHICULAR': 'VEHICULAR',
  ALCABALA: 'ALCABALA',
  // `MULTA_ADMINISTRATIVA` mide exactamente 20 caracteres: cabe justo, sin
  // sobrar uno, en el `tributo varchar(20)` de `cuenta_corriente_asiento`
  // (V2__rentas_y_cuenta_corriente.sql). No es un defecto (#342, nit 5); es un
  // borde a recordar si algun dia se agrega un codigo mas largo que este.
  'MULTA ADMINISTRATIVA': 'MULTA_ADMINISTRATIVA',
};

const tributoDe = (texto: string): string | undefined => TRIBUTO_DEL_BACKEND[texto];

/**
 * Los codigos que el alta puede mandar, para poder exigir que todos esten
 * clasificados. Ver `unidadDelTributo`.
 */
export const CODIGOS_DE_TRIBUTO: readonly string[] = Object.values(TRIBUTO_DEL_BACKEND);

/**
 * Modalidad de notificacion del prototipo → `ModalidadDeNotificacion` (V3, art. 104 del Codigo
 * Tributario). «BUZÓN ELECTRÓNICO» es la unica que no se lee literal: el enum del backend la llama
 * `CORREO` (art. 104 b, medios electronicos con constancia de entrega).
 */
const MODALIDAD_DE_NOTIFICACION_DEL_BACKEND: Readonly<Record<string, string>> = {
  'PERSONAL EN DOMICILIO FISCAL': 'PERSONAL',
  // Entrecomilladas a proposito: sin las comillas, la regla de tildes en
  // identificadores las señala —son claves validas de JavaScript, y Prettier las
  // desentrecomilla si se le deja—.
  'CEDULÓN': 'CEDULON',
  'PUBLICACIÓN': 'PUBLICACION',
  'BUZÓN ELECTRÓNICO': 'CORREO',
};

const modalidadDeNotificacionDe = (texto: string): string | undefined =>
  MODALIDAD_DE_NOTIFICACION_DEL_BACKEND[texto];

/**
 * Resultado de la diligencia del prototipo → `ResultadoDeNotificacion` (V28), que solo admite
 * tres valores. Las seis opciones del catalogo colapsan asi: recibir —por el titular, por
 * tercero, o fijando el cedulon— surte efecto (`NOTIFICADO`); no encontrar a nadie en el
 * domicilio, este cerrado o no, es lo que `NO_UBICADO` describe literalmente y lo que el backend
 * reintenta (AC de #39); rehusar recibir es notificacion valida igual, pero con su propio
 * resultado (`RECHAZADO`, art. 104 a).
 */
const RESULTADO_DE_NOTIFICACION_DEL_BACKEND: Readonly<Record<string, string>> = {
  'RECIBIDO POR EL TITULAR': 'NOTIFICADO',
  'RECIBIDO POR TERCERO': 'NOTIFICADO',
  'CEDULÓN FIJADO': 'NOTIFICADO',
  RECHAZADO: 'RECHAZADO',
  'DOMICILIO CERRADO': 'NO_UBICADO',
  'NO UBICADO': 'NO_UBICADO',
};

const resultadoDeNotificacionDe = (texto: string): string | undefined =>
  RESULTADO_DE_NOTIFICACION_DEL_BACKEND[texto];

/**
 * La tabla de pisos, que el alta de una ficha y su actualizacion declaran igual.
 *
 * Es la misma que `DeclaracionDeFicha.ConstruccionDeclarada` acepta en los dos verbos, y se
 * escribe una vez por la misma razon que el backend la escribio una vez: dos copias acaban
 * aceptando cosas distintas.
 *
 * **Ni un importe** (regla 5, D-02a): piso, area y las siete categorias de una letra.
 * Cuanto vale cada categoria es un valor unitario, y eso vive en datos versionados, no en
 * un formulario.
 *
 * `anioConstruccion`, `material` y `estadoConservacion` **no estan**, aunque el backend los
 * acepte: **ningun formulario los captura**. Una columna declarada que ninguna pantalla
 * escribe no es una prevision, es una lista blanca que dice mas de lo que la interfaz puede
 * hacer —y la lista blanca vale precisamente por decir la verdad sobre eso—. Entran el dia
 * que `TablaDePisos` tenga sus tres campos, no antes.
 */
const CONSTRUCCIONES: TablaDelCuerpo = {
  campo: 'construcciones',
  columnas: {
    piso: { campo: 'piso' },
    areaConstruida: { campo: 'areaConstruida' },
    categoriaMuros: { campo: 'categoriaMuros' },
    categoriaTechos: { campo: 'categoriaTechos' },
    categoriaPisos: { campo: 'categoriaPisos' },
    categoriaPuertas: { campo: 'categoriaPuertas' },
    categoriaRevestimientos: { campo: 'categoriaRevestimientos' },
    categoriaBanios: { campo: 'categoriaBanios' },
    categoriaInstalaciones: { campo: 'categoriaInstalaciones' },
  },
};

/**
 * El titular inicial del predio: un bloque, no una lista (`unica`).
 *
 * Es **opcional en el backend a proposito**: en un levantamiento catastral se ficha el
 * predio antes de identificar a su propietario, y exigirlo obligaria al tecnico a
 * inventarse uno (DAT-01 §4.2). Por eso el asistente deja cerrar el alta sin titular, y por
 * eso el bloque no viaja si no se escribio ninguno.
 */
const TITULAR: TablaDelCuerpo = {
  campo: 'titular',
  unica: true,
  columnas: {
    codigoContribuyente: { campo: 'codigoContribuyente' },
    condicion: { campo: 'condicion' },
    // El porcentaje de propiedad es un porcentaje, no un importe: viaja como texto, igual
    // que el resto de las medidas. La interfaz no lo compone ni lo reparte (RNF-083).
    porcentaje: { campo: 'porcentaje' },
    documentoOrigen: { campo: 'documentoOrigen' },
  },
};

/**
 * La cuota que se da de baja, tal como la elige la tabla de «Baja de deuda».
 *
 * Es `plana` porque `PeticionDeMovimiento` declara la obligacion en el cuerpo plano; ver
 * `TablaDelCuerpo.plana` y la nota de `baja_deuda`. Las claves de la izquierda son las de
 * las columnas del catalogo (`estructura.tabla.claves`), salvo `codContribuyente`, que lo
 * aporta el contexto de la seleccion —la pantalla entera es de un contribuyente y su codigo
 * esta en el filtro, no en una columna—, y `predioId`/`vehiculoId`, que **ninguna columna
 * dibuja** y trae `DatosDeTabla.valores` (ver la conexion en `rentas/index.ts`).
 *
 * **Los seis campos son la obligacion, no una descripcion suya.** `ClaveDeSaldo` la
 * identifica por (contribuyente, tributo, ejercicio, periodo, predioId, vehiculoId) y
 * compara con igualdad exacta: si el predio no viaja, la baja no cae sobre la cuota que se
 * marco, sino sobre la que ese contribuyente tenga sin unidad. Los seis viajan o el acto no
 * se puede defender.
 *
 * `unidad` y `totalS` **no estan**: la primera es un codigo de presentacion —el backend pide
 * el identificador interno, que va aparte— y el segundo es una suma que el backend rehace.
 * Ninguna de las dos entra ni en el estado ni en el cuerpo, que es exactamente lo que la
 * lista blanca por columna vino a garantizar.
 *
 * **El tributo viaja tal cual, sin traducir.** No es un descuido: esta tabla **no sale del
 * prototipo, sale del backend** —`consulta_deuda` publica `tributo` ya en el vocabulario del
 * libro—, y `PeticionDeMovimiento.tributo` es un `String` libre que `ClaveDeSaldo` solo
 * normaliza; la columna `tributo` del libro es `varchar` sin `CHECK`, y `RegistrarPapeleta`
 * asienta ahi `MULTA_TRANSITO` y `MULTA_ADMINISTRATIVA`. Pasarlo por el diccionario del
 * desplegable de `alta_deuda` hacia lo contrario de lo que parecia: **rechazaba las multas**
 * —que si tienen deuda en el libro— por un codigo que el sistema si tiene.
 */
const CUOTAS_DE_LA_BAJA: TablaDelCuerpo = {
  campo: 'cuotas',
  plana: true,
  columnas: {
    codContribuyente: { campo: 'codContribuyente' },
    tributo: { campo: 'tributo' },
    ano: { campo: 'ano' },
    cuota: { campo: 'cuota', entero: true },
    /* **La fase de la obligacion, que tambien identifica de cual se habla.**
       `SaldoRepositoryJdbc.proyectar` hace `DO UPDATE SET fase = EXCLUDED.fase`, y una baja
       sin `fase` resuelve a `ORDINARIA`: dar de baja parcialmente una deuda que estaba en
       COACTIVA o en CONVENIO la devolvia a la fase ordinaria **en silencio**, deshaciendo el
       procedimiento sin que ningun asiento lo dijera. La publica `obligacionDeDeuda()` y llega
       por `DatosDeTabla.valores`, como los dos identificadores: ninguna columna la dibuja. */
    fase: { campo: 'fase' },
    // Los dos identificadores internos de `ClaveDeSaldo`. Enteros porque
    // `PeticionDeMovimiento` los declara `Long`, y a lo sumo uno de los dos
    // tiene valor: una obligacion cuelga de un predio, de un vehiculo o de
    // ninguno.
    predioId: { campo: 'predioId', entero: true },
    vehiculoId: { campo: 'vehiculoId', entero: true },
    insolutoS: { campo: 'insoluto', importe: true },
    interesS: { campo: 'interes', importe: true },
  },
};

/** Una cuota entera: `3`. Lo unico que `PeticionDeMovimiento.cuota` sabe leer. */
const CUOTA_ENTERA = /^\d+$/;

/** «Anual» es el periodo 0 del libro (V2), y es la unica cuota que no es un numero. */
const ANUAL = /^anual$/i;

/** Una cadena decimal simple: lo unico que `new BigDecimal` acepta del cuerpo. */
const IMPORTE_DEL_CUERPO = /^-?\d+(\.\d+)?$/;

/**
 * Que le falta a la fila elegida para **ser** una obligacion que el backend pueda
 * identificar, dicho para quien atiende (#332).
 *
 * Es la comprobacion que faltaba y que costaba mas cara: la pantalla mandaba tres campos y
 * medio de los seis de `ClaveDeSaldo`, la accion se habilitaba igual, y lo que llegaba al
 * libro era **otra obligacion del mismo contribuyente**. Cada rama de aqui es un campo que
 * no puede faltar ni llegar deformado, y ninguna habla del contrato: hablan de la cuota que
 * se marco.
 */
function faltaEnLaCuota(fila: Readonly<Record<string, string>>): string | undefined {
  const dato = (clave: string): string => (fila[clave] ?? '').trim();

  if (dato('codContribuyente') === '') {
    return 'Falta el código de contribuyente: búscalo arriba, porque la baja se registra sobre su cuenta corriente.';
  }
  /* El tributo tiene que estar, y **no se juzga cual es**: el que trae la fila es el que el
     libro asento —`tributo` es `varchar` sin `CHECK`, y ahi viven tambien las multas—, asi
     que la unica pregunta que esta pantalla puede hacer es si llego. Rechazar los que no
     estan en el desplegable de `alta_deuda` apagaba la baja de toda multa con un motivo
     falso: «el sistema todavía no tiene un código para ese tributo», cuando lo tiene. */
  if (dato('tributo') === '') {
    return 'La cuota elegida no trae su tributo, y sin él la baja no señala a ninguna obligación. Vuelve a buscar la deuda.';
  }
  if (dato('ano') === '') {
    return 'La cuota elegida no trae su año, y sin año no señala a ninguna obligación. Vuelve a buscar la deuda.';
  }
  const cuota = dato('cuota');
  if (!CUOTA_ENTERA.test(cuota) && !ANUAL.test(cuota)) {
    // **El caso normal del padrón, y el mas peligroso.** «1 - 4» son las cuatro
    // cuotas de un año agregadas por `ConsultarDeuda`, y el backend solo sabe
    // leer una cuota o ninguna —y ninguna significa «anual», que es una
    // obligación distinta—. Mandar el prefijo daria de baja la cuota 1 y dejaria
    // tres vivas; mandar nada daria de baja la anual, que es otra fila.
    return `Esa fila agrupa varias cuotas («${cuota}») y la baja se registra sobre una sola. Todavía no se puede dar de baja un rango: hazlo cuota a cuota, o pide que se habilite.`;
  }
  for (const [clave, rotulo] of [
    ['insolutoS', 'insoluto'],
    ['interesS', 'interés'],
  ] as const) {
    const importe = dato(clave);
    if (importe !== '' && !IMPORTE_DEL_CUERPO.test(importe)) {
      return `El ${rotulo} de la cuota elegida no llegó como cifra («${importe}»): vuelve a cargar la deuda y, si sigue igual, avísale a sistemas.`;
    }
  }
  return undefined;
}

/**
 * **De que unidad cuelga la obligacion de cada tributo**, que es lo que decide
 * si el alta puede registrarse sin resolver ninguna (#331).
 *
 * No es una convencion de esta pantalla: sale de `ClaveDeSaldo`, que identifica
 * una obligacion por (contribuyente, tributo, ejercicio, periodo, `predioId`,
 * `vehiculoId`) **con igualdad exacta**. Mandar la unidad equivocada —o no
 * mandarla— no es un campo de menos: es señalar a otra obligacion.
 *
 *   `'predio'`           arbitrios y alcabala se determinan sobre un predio
 *                        concreto
 *   `'vehiculo'`         el impuesto vehicular, sobre un vehiculo concreto
 *   `'ninguna'`          **el predial**, y esa es la unica que sorprende:
 *                        NEG-05 §1 dice que se calcula por contribuyente y no
 *                        por predio, y el esquema lo hace imposible por diseño
 *                        —`determinacion_predial_sin_predio_ck` de `V20`:
 *                        «tributo <> 'PREDIAL' OR predio_id IS NULL»—. Un alta
 *                        predial atada a un predio crea una obligacion que la
 *                        emision anual —que asienta sin predio— no va a
 *                        encontrar nunca: quedan las dos, y el contribuyente
 *                        paga una y sigue debiendo la otra
 *   `'predio-opcional'`  la multa administrativa: **cuelga de un predio cuando
 *                        la infraccion es de un predio, y de ninguno cuando no**
 *
 * **La cuarta salio de leer el caso de uso, no de suponerlo** (revision de
 * #331). `MULTA_ADMINISTRATIVA` estaba clasificada `'ninguna'`, y eso es falso:
 * `RegistrarPapeleta.registrarAdministrativa` (`RegistrarPapeleta.java:164-170`)
 * asienta `guardarYAsentar(nueva, TRIBUTO_ADMINISTRATIVA, contribuyenteObligadoId,
 * predioId, null, …)` — **con** el `predioId` de la papeleta, que es
 * `@Nullable`. La papeleta de una infraccion de construccion cuelga de su
 * predio; la de una sin predio, de ninguno. Las dos existen en el libro.
 *
 * Con `'ninguna'`, resolver el predio de una multa administrativa quedaba
 * **rechazado** por la pantalla; y si alguien quitaba ese rechazo, el alta
 * habria creado la obligacion gemela —una con predio y otra sin el— que
 * `ClaveDeSaldo` compara con igualdad exacta y que nadie vuelve a encontrar. Por
 * eso `'predio-opcional'` no exige ni rechaza: la pantalla no sabe de que
 * infraccion se habla, y quien atiende si.
 */
const UNIDAD_DEL_TRIBUTO: Readonly<
  Record<string, 'predio' | 'vehiculo' | 'ninguna' | 'predio-opcional'>
> = {
  PREDIAL: 'ninguna',
  MULTA_ADMINISTRATIVA: 'predio-opcional',
  ARBITRIO: 'predio',
  ALCABALA: 'predio',
  VEHICULAR: 'vehiculo',
};

/**
 * De que unidad cuelga ese tributo, o **nada si no esta clasificado**.
 *
 * Devolver `undefined` y no un valor por omision es la mitad que importa: con
 * `?? 'ninguna'`, un codigo nuevo sin clasificar dejaba registrar el alta sin
 * unidad y sin decir nada. Se exporta para que una prueba pueda exigir que
 * **todos** los codigos que el alta sabe mandar esten aqui: la guarda de
 * `faltaEnElAlta` es la red, y esto es lo que hace que no haga falta.
 */
export const unidadDelTributo = (
  codigo: string,
): 'predio' | 'vehiculo' | 'ninguna' | 'predio-opcional' | undefined =>
  Object.hasOwn(UNIDAD_DEL_TRIBUTO, codigo) ? UNIDAD_DEL_TRIBUTO[codigo] : undefined;

/**
 * Donde se busca la unidad, dicho **para quien tiene la pantalla delante**.
 *
 * Va al final de los tres motivos que hablan de la unidad porque los tres pueden
 * leerse con la seccion plegada —la franja de la primaria esta al pie, y la
 * seccion se pliega— y entonces «elígelo en la lista» manda a una lista que no
 * esta en pantalla (revision de #331).
 */
const DONDE = 'Está en «Unidad (predio / placa)», dentro de «Deuda a dar de alta».';

/** Lo mismo, para el desplegable del concepto. */
const DONDE_EL_CONCEPTO = 'Está en «Concepto / tributo», dentro de «Deuda a dar de alta».';

/** Lo mismo, para el desplegable del año. */
const DONDE_EL_ANO = 'Está en «Año», dentro de «Deuda a dar de alta».';

/** Lo mismo, para el campo del documento que sustenta el alta. */
const DONDE_EL_DOCUMENTO = 'Está en «Nº del documento», dentro de «Deuda a dar de alta».';

/**
 * Que le falta al alta para poder registrarse, dicho para quien atiende (#331).
 *
 * Todas las ramas hablan **del concepto elegido**, que es lo que decide a que
 * obligacion señala el alta. Ninguna repite lo que el backend valida por su
 * cuenta —el contribuyente que falta lo dice `MovimientosDeDeudaController` con
 * un mensaje bueno—: aqui solo esta lo que la pantalla sabe **antes** y el
 * backend no puede decir despues, porque no seria un rechazo sino un 201 sobre
 * otra obligacion.
 *
 * La unidad no se pide siempre ni se prohibe siempre: se pide **cuando ese
 * tributo cuelga de una** (ver `UNIDAD_DEL_TRIBUTO`). Antes no se pedia nunca,
 * porque no habia forma de resolverla, y el alta quedaba a nivel de
 * contribuyente sin que nada lo dijera.
 *
 * **Y sin concepto no se guarda** (revision de #331). Esto decia lo contrario
 * —«lo que falta ahi es el concepto, y eso lo dice el backend»— y era falso por
 * partida doble: el desplegable dibujaba «IMPUESTO PREDIAL» sin que nadie lo
 * tocara (un `sel` sin opcion vacia se pinta mostrando la primera), asi que la
 * pantalla enseñaba un concepto elegido y el cuerpo salia **sin `tributo`**; y
 * lo que el backend contesta entonces es sobre un campo que la pantalla enseñaba
 * lleno. El desplegable ya no miente —`eleccionObligatoria` en `Formulario`— y
 * aqui no se deja pasar: elegir es un acto.
 *
 * `resolverUnidad` tiene por omision `unidadDelTributo` y solo una prueba lo
 * cambia (#342, nit 2): con los cinco tributos que hoy manda el alta clasificados
 * en `UNIDAD_DEL_TRIBUTO`, la rama `unidad === undefined` no la alcanza ningun
 * dato real, y una guarda que nunca se ejerce no protege nada. Inyectar el
 * resolutor deja simular «un tributo que la clasificacion todavia no cubre» sin
 * tocar `UNIDAD_DEL_TRIBUTO` de produccion.
 */
export function faltaEnElAlta(
  borrador: Readonly<Record<string, string>>,
  resolverUnidad: (codigo: string) => ReturnType<typeof unidadDelTributo> = unidadDelTributo,
): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  const concepto = dato('conceptoTributo');
  if (concepto === '') {
    return `Falta el concepto: elige de qué tributo es la deuda. Es lo que decide a qué obligación se asienta el alta, y sin él el cuerpo saldría sin «tributo». ${DONDE_EL_CONCEPTO}`;
  }
  const tributo = tributoDe(concepto);
  if (tributo === undefined) {
    return `El sistema no tiene todavía un código de tributo para «${concepto}», así que esa deuda no se puede asentar. Elige otro concepto, o pide que se defina.`;
  }

  /* **Un tributo sin clasificar da motivo; no pasa.** Esto resolvia a
     `'ninguna'` con `??`, que es abrir por omision: el dia que se añada un
     codigo a `TRIBUTO_DEL_BACKEND` y se olvide aqui, la pantalla dejaria
     registrar el alta sin unidad —y sin decir nada— sobre un tributo que quiza
     cuelga de una. La lista blanca del cuerpo es cerrada; esta tambien. */
  const unidad = resolverUnidad(tributo);
  if (unidad === undefined) {
    return `El sistema todavía no sabe de qué unidad cuelga la deuda de «${concepto}» —si de un predio, de un vehículo o de ninguno—, y de eso depende a qué obligación se asienta. Avísale a sistemas antes de darla de alta.`;
  }
  const predio = dato('predioId');
  const vehiculo = dato('vehiculoId');

  if (unidad === 'predio' && predio === '') {
    // Y si lo que hay resuelto es del **otro** tipo, se dice eso: la lista no
    // esta en pantalla —la tarjeta de la unidad resuelta ocupa su sitio—, asi
    // que mandar a «la lista» seria mandar a algo que no se ve.
    return vehiculo === ''
      ? `Falta la unidad: busca el predio por su código catastral y elígelo en la lista. Sin él, el alta señalaría a la deuda que ese contribuyente tenga sin predio, que es otra. ${DONDE}`
      : `Hay un vehículo resuelto y este concepto cuelga de un predio: pulsa «Cambiar» y busca por código catastral. ${DONDE}`;
  }
  if (unidad === 'vehiculo' && vehiculo === '') {
    return predio === ''
      ? `Falta la unidad: busca el vehículo por su placa y elígelo en la lista. Sin él, el alta señalaría a la deuda que ese contribuyente tenga sin vehículo, que es otra. ${DONDE}`
      : `Hay un predio resuelto y este concepto cuelga de un vehículo: pulsa «Cambiar» y busca por placa. ${DONDE}`;
  }
  if (unidad === 'ninguna' && (predio !== '' || vehiculo !== '')) {
    return tributo === 'PREDIAL'
      ? `El impuesto predial se determina por contribuyente, no por predio: los tramos se aplican al conjunto de sus predios. Pulsa «Cambiar» y deja la unidad sin resolver, o el alta quedaría aparte de la emisión anual. ${DONDE}`
      : `Ese concepto no cuelga de ninguna unidad: pulsa «Cambiar» y déjala sin resolver. ${DONDE}`;
  }
  // `'predio-opcional'` no tiene rama: ni se exige ni se rechaza. Ver
  // `UNIDAD_DEL_TRIBUTO`, y `RegistrarPapeleta.java:164-170`.

  /* **El año se exige con la misma dureza que el concepto** (#342, nit 3):
     `MovimientosDeDeudaController.entero` llama a su propio `exigir` sobre
     `peticion.ano()` y responde 422 «Falta el campo 'ano'» si llega en blanco.
     El desplegable de año tambien lleva `eleccionObligatoria` —la opcion vacia
     va antepuesta—, asi que sin esta rama la primaria se habilita con el año
     sin elegir y el primer intento de guardar se va y vuelve con un rechazo que
     la pantalla ya sabia de sobra. */
  const ano = dato('ano');
  if (ano === '') {
    return `Falta el año: elige el ejercicio al que corresponde la deuda. Sin él el alta no se puede asentar sobre ninguna obligación. ${DONDE_EL_ANO}`;
  }

  /* **Y el documento que sustenta el alta, menor pero igual de duro**: el mismo
     controlador exige `peticion.documentoOrigen()` con `exigir`, sin el que
     mande el desplegable de arriba —`documentoQueSustenta` no viaja, es
     presentacion—. El campo de texto no lleva `eleccionObligatoria` porque no
     es un `select`, y por eso puede quedar en blanco sin que nada lo marque. */
  const documento = dato('nDelDocumento');
  if (documento === '') {
    return `Falta el número del documento que sustenta el alta: una resolución, un acta o la referencia de la migración. Sin él no queda con qué defender la deuda ante el contribuyente. ${DONDE_EL_DOCUMENTO}`;
  }

  return undefined;
}

/** Donde se resuelve el predio, dicho para quien atiende «Transferencia de predio». */
const DONDE_EL_PREDIO = 'Está en «Código predial», dentro de «Datos del acto».';

/**
 * Que le falta a «Transferencia de predio» para poder registrarse (#73).
 *
 * El predio y el valor viajan por el resolutor de `rentas/composicion.ts`
 * (`ResolutorDePredioDeTransferencia`); el resto son los campos que
 * `TransferenciaPredioController` exige y que el catálogo sí dibuja.
 */
function faltaEnLaTransferenciaDePredio(
  borrador: Readonly<Record<string, string>>,
): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  if (dato('predioId') === '') {
    return `Falta el predio: busca su código catastral y elígelo en la lista. Sin él, la transferencia no señala a ningún predio. ${DONDE_EL_PREDIO}`;
  }
  const valor = dato('valorTransferencia');
  if (valor === '') {
    return `Falta el valor de la transferencia: es la base sobre la que se liquida la alcabala, y sin él el acto no se puede registrar. ${DONDE_EL_PREDIO}`;
  }
  if (!IMPORTE_DEL_CUERPO.test(valor)) {
    return `El valor de la transferencia no llegó como cifra («${valor}»): escríbelo sin separador de miles, por ejemplo «95000.00».`;
  }
  if (dato('transferenteDocumento') === '') {
    return 'Falta el código del transferente: quien vende, dona o cede el predio.';
  }
  if (dato('adquirenteDocumento') === '') {
    return 'Falta el código del adquirente: quien lo recibe.';
  }
  if (dato('tipoDeActo') === '') {
    return 'Falta el tipo de acto: compra-venta, donación, permuta y las demás formas que reconoce la ley.';
  }
  if (dato('fechaDelActo') === '') {
    return 'Falta la fecha del acto: es desde cuándo corre la afectación del adquirente.';
  }
  if (dato('transferido') === '') {
    return 'Falta el porcentaje transferido: cuánto del predio cambia de titular en este acto.';
  }
  return undefined;
}

/**
 * Que le falta a «Transferencia de vehículo» para poder registrarse (#73).
 *
 * Sin resolutor de identificador: `placa` viaja tal cual —
 * `TransferenciaVehiculoController` la resuelve él mismo contra el padrón— y
 * el transferente lo toma de quien figura hoy como titular. Solo el valor de
 * la transferencia necesita el campo que `rentas/composicion.ts` añade.
 */
function faltaEnLaTransferenciaDeVehiculo(
  borrador: Readonly<Record<string, string>>,
): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  if (dato('placa') === '') {
    return 'Falta la placa: es el vehículo que cambia de titular.';
  }
  const valor = dato('valorTransferencia');
  if (valor === '') {
    return 'Falta el valor de la transferencia: es parte del hecho que queda asentado, y sin él el acto no se puede registrar. Está junto a «Transferente — documento».';
  }
  if (!IMPORTE_DEL_CUERPO.test(valor)) {
    return `El valor de la transferencia no llegó como cifra («${valor}»): escríbelo sin separador de miles, por ejemplo «95000.00».`;
  }
  if (dato('adquirenteDocumento') === '') {
    return 'Falta el código del adquirente: quien recibe el vehículo.';
  }
  if (dato('tipoDeActo') === '') {
    return 'Falta el tipo de acto: compra-venta, donación, remate y las demás formas que reconoce la ley.';
  }
  if (dato('fechaDeTransferencia') === '') {
    return 'Falta la fecha de transferencia: es desde cuándo responde el adquirente por el impuesto.';
  }
  return undefined;
}

const ESCRITURAS: Readonly<Record<string, EscrituraDeclarada>> = {
  /**
   * Cambiar el año de trabajo.
   *
   * De los cinco campos que dibuja la pantalla viaja **uno**: el ejercicio al
   * que se cambia. Los otros cuatro —año actual, ejercicio contable abierto,
   * ultimo cierre, advertencia— los pinta el servidor, y mandarlos de vuelta
   * seria dejar que el cliente decida lo que el servidor ya sabe.
   */
  cambiar_anio: {
    campos: { cambiarAlAno: { campo: 'ejercicio', entero: true } },
    cambiaElEjercicio: true,
  },

  /**
   * Cambiar contrasena. **Ningun campo viaja, y esa ausencia es la funcion.**
   *
   * El backend no acepta ninguna contrasena: su cuerpo es solo la observacion,
   * y lo que devuelve es a donde tiene que ir la interfaz —el proveedor de
   * identidad (ADR-0005)—. Con la lista blanca vacia, los tres campos de clave
   * que el prototipo dibuja no se pueden escribir, asi que el valor no llega al
   * estado de React, ni a la cache de consultas, ni a la URL, ni a ningun
   * almacenamiento: no existe.
   */
  cambiar_clave: {
    campos: {},
    nota: true,
  },

  /**
   * Alta de deuda (RF-043, #24, #73, #331): incorpora manualmente una obligacion a la cuenta
   * corriente.
   *
   * **`unidadPredioPlaca` sigue sin viajar, y ahora eso es exacto**: lo que viaja son los dos
   * identificadores internos que `PeticionDeMovimiento` acepta, `predioId` y `vehiculoId`, y los
   * llena el resolutor de la composicion (`rentas/ResolutorDeUnidad.tsx`) buscando en dos
   * lecturas ya publicadas —`consulta_fichas`, que publica `predioId`, y `vehiculos`, que publica
   * el `id` del vehiculo—. El codigo catastral o la placa que se teclean son texto de
   * presentacion y se quedan en el control: el backend no los sabe leer.
   *
   * Ninguna de las dos columnas la dibuja el catalogo, igual que en la baja: son claves que
   * `ClaveDeSaldo` compara y no datos que quien atiende teclee. Y **enteros**, porque
   * `PeticionDeMovimiento` los declara `Long`.
   *
   * `cuotaHasta` tampoco viaja: `PeticionDeMovimiento` solo admite una `cuota` entera, no un
   * rango — se toma `cuotaDesde` como la cuota unica de esta alta.
   *
   * `documentoQueSustenta` (el tipo de documento) no tiene campo propio en el backend: el unico
   * campo de documento es `documentoOrigen`, que se llena con `nDelDocumento`. `motivoDelAlta`
   * tampoco viaja: es la misma observacion obligatoria que ya pide `useEscritura`, no un campo
   * aparte.
   */
  alta_deuda: {
    campos: {
      codContribuyente: { campo: 'codContribuyente' },
      conceptoTributo: { campo: 'tributo', valor: tributoDe },
      ano: { campo: 'ano' },
      cuotaDesde: { campo: 'cuota', entero: true },
      predioId: { campo: 'predioId', entero: true },
      vehiculoId: { campo: 'vehiculoId', entero: true },
      // Los cuatro importes, con la misma guarda que los de la baja: lo que el backend no
      // puede leer no sale. Aqui los teclea quien atiende, asi que «1,842.60» y «S/ 120» son
      // lo normal, y `new BigDecimal` con cualquiera de los dos **lanza** — un 422 despues de
      // pulsar «Dar de alta», que es el mismo defecto tardio del otro lado del movimiento.
      insolutoS: { campo: 'insoluto', importe: true },
      reajusteS: { campo: 'reajuste', importe: true },
      interesS: { campo: 'interes', importe: true },
      gastosS: { campo: 'gasto', importe: true },
      fechaDeVencimiento: { campo: 'fechaValor' },
      nDelDocumento: { campo: 'documentoOrigen' },
    },
    /* El rotulo de la unidad elegida: se guarda para poder enseñarlo y **no
       viaja**, porque no esta en `campos`. Ver `EscrituraDeclarada.presentacion`
       y `ResolutorDeUnidad`. */
    presentacion: ['unidadResuelta'],
    exigir: (borrador) => faltaEnElAlta(borrador),
    nota: true,
  },

  /**
   * Baja de deuda (RF-044, #24, #332): extingue una obligacion de la cuenta corriente.
   *
   * Es la primera opcion cuyo acto **se elige en una tabla** en vez de teclearse: la fila que
   * se marca *es* la obligacion, y por eso viaja por `tablas` —con su lista blanca por
   * columna— y no como seis campos que alguien vuelve a escribir mirando la pantalla.
   *
   * La tabla va `plana` porque `MovimientosDeDeudaController.PeticionDeMovimiento` es un
   * cuerpo plano: **una obligacion por acto**. De ahi las dos consecuencias que `exigir`
   * hace visibles en vez de esconder: se puede marcar mas de una fila —marcar es mirar—,
   * pero guardar exige que quede **una**, porque mandar la primera y callarse las demas
   * daria de baja una cuota y dejaria tres vivas sin que nada lo dijera. El dia que la
   * operacion acepte una lista, esto es quitar `plana` y el limite de `exigir`.
   *
   * Lo que **no** viaja, y por que:
   *
   * - `causal` («PRESCRIPCIÓN DECLARADA», «ERROR MATERIAL»…): `PeticionDeMovimiento` no
   *   tiene ningun campo para ella. `referenciaExterna` no lo es —el dominio la describe
   *   como «por donde entra una papeleta o una licencia»—, y meter ahi la causal la
   *   convertiria en un dato que nadie sabria leer. Va en la observacion, que es donde el
   *   backend la audita, y la `nota` lo dice antes de que alguien la busque.
   * - `motivo`: es el mismo texto que ya exige `useEscritura` (regla 10). Declararlo aparte
   *   daria dos cajas para lo que el backend guarda en un solo `observacion`.
   * - `autorizadoPor` y `montoTotalAExtinguirS` son `"ro"`: los pone el servidor. El
   *   segundo, ademas, es la previsualizacion del total —y la calcula el, no la interfaz
   *   (RNF-083)—.
   * - `unidad` (la columna con el codigo del predio o la placa): es texto de presentacion.
   *   Lo que viaja es el `predioId`/`vehiculoId` que trae `DatosDeTabla.valores`, porque es
   *   lo que `ClaveDeSaldo` compara.
   * - `totalS`: es la suma de insoluto e interes, que el backend rehace. Mandarla seria
   *   dejar que el cliente proponga un total (RNF-083).
   *
   * `fechaDeResolucion` hace **dos cosas**, y la segunda no se ve desde aqui: es el
   * `fechaValor` del movimiento y es tambien la fecha a la que se lee la deuda, porque el
   * backend valida la baja contra `deudaActualizadaA(fechaValor)`. Ver la conexion en
   * `pantallas/rentas/index.ts`.
   */
  baja_deuda: {
    campos: {
      nDeResolucion: { campo: 'documentoOrigen' },
      fechaDeResolucion: { campo: 'fechaValor' },
    },
    tablas: { cuotas: CUOTAS_DE_LA_BAJA },
    exigir: (borrador, filas) => {
      const elegidas = filas['cuotas'] ?? [];
      const [primera] = elegidas;
      if (primera === undefined) {
        return 'Elige en la tabla la cuota que se da de baja: la baja es sobre una obligación concreta, no sobre la cuenta entera.';
      }
      if (elegidas.length > 1) {
        return `Hay ${elegidas.length} cuotas elegidas y la baja registra una obligación por acto: deja una elegida y repite la baja para las demás.`;
      }
      // Lo que identifica la obligacion va antes que el sustento: sin los seis
      // campos de `ClaveDeSaldo`, la resolucion mejor redactada extinguiria otra
      // cuota del mismo contribuyente.
      const falta = faltaEnLaCuota(primera);
      if (falta !== undefined) return falta;
      if ((borrador['nDeResolucion'] ?? '').trim() === '') {
        return 'Falta el documento que sustenta: sin la resolución que la aprueba, una baja de deuda no se puede defender ante nadie.';
      }
      if ((borrador['fechaDeResolucion'] ?? '').trim() === '') {
        return 'Falta la fecha de la resolución: es la fecha con efecto tributario de la baja.';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Transferencia de predio (RF-026/RF-027, #29, #73): da de baja al transferente y de alta al
   * adquirente desde la fecha del acto.
   *
   * `predioId` y `valorTransferencia` no los dibuja ningún campo del catálogo: los llena
   * `ResolutorDePredioDeTransferencia` (`rentas/composicion.ts`), que sustituye a «Código
   * predial» y resuelve el primero contra `consulta_fichas` mientras añade el segundo —la
   * base sobre la que se liquida la alcabala, que el manual dibuja en otra pantalla y el
   * backend no lee ahí—. Ver `ACTOS_SIN_CAMPO` en `pantallas/actos.ts` para el estado anterior
   * a esta declaración.
   *
   * `codTransferente`/`codAdquiriente` son **códigos**, no identificadores internos:
   * `TransferenciaPredioController` los resuelve él mismo contra el padrón, así que el texto
   * que se teclea en «Transferente/Adquirente — documento» viaja tal cual.
   *
   * `nDeExpediente` y `notaria` no viajan: `PeticionDeTransferenciaPredio` no tiene ningún
   * campo para ellos. `documentoOrigen` sale de «Nº de minuta / escritura», que es el
   * documento con que se registra el acto. `generaAlcabala` tampoco viaja: es una casilla y
   * `CampoDelCuerpo` no tiene una forma de mandar un booleano real —enviarlo como texto
   * («si»/«») fallaría contra un campo `Boolean`—; `afectaAlcabala` queda sin marcar, que es
   * el valor por omisión que el propio controlador ya aplica cuando el campo no llega.
   */
  transferencia_predio: {
    campos: {
      tipoDeActo: { campo: 'tipoTransferencia' },
      fechaDelActo: { campo: 'fechaTransferencia' },
      nDeMinutaEscritura: { campo: 'documentoOrigen' },
      transferido: { campo: 'porcentajeTransferido' },
      transferenteDocumento: { campo: 'codTransferente' },
      adquirenteDocumento: { campo: 'codAdquiriente' },
      predioId: { campo: 'predioId', entero: true },
      valorTransferencia: { campo: 'valorTransferencia', importe: true },
    },
    exigir: (borrador) => faltaEnLaTransferenciaDePredio(borrador),
    nota: true,
  },

  /**
   * Transferencia de vehículo (RF-026, #29, #73): registra el cambio de titular.
   *
   * Sin resolutor de identificador: `placa` viaja tal cual, porque
   * `TransferenciaVehiculoController` la resuelve él mismo contra el padrón de vehículos, y
   * **sin `codTransferente`**: el transferente es quien figura hoy como titular, y el
   * controlador lo lee de ahí —pedirlo aquí abriría la puerta a que se escriba un código
   * distinto del que la base realmente tiene—.
   *
   * `valorTransferencia` no lo dibuja ningún campo del catálogo (#73, misma frontera que
   * `transferencia_predio`): lo llena `ResolutorDeValorDeTransferencia`
   * (`rentas/composicion.ts`), que sustituye a «Transferente — documento» —un campo que hoy no
   * llega a ningún sitio, porque ninguna de las dos peticiones del controlador lo acepta para
   * un vehículo— y lo sigue dibujando tal cual, sin marcarlo escribible.
   *
   * `nroDeExpediente` no viaja: `PeticionDeTransferenciaVehiculo` no tiene campo para él.
   * `documentoOrigen` sale de «Nº del documento». `documentoSustentatorio` (el tipo de
   * documento) tampoco viaja: el controlador solo pide el número, no su tipo.
   * `generaAlcabala` no tiene campo en esta pantalla —a diferencia de la de predio, el
   * catálogo no lo dibuja aquí—, así que `afectaAlcabala` queda igual sin marcar.
   */
  transferencia_vehiculo: {
    campos: {
      placa: { campo: 'placa' },
      fechaDeTransferencia: { campo: 'fechaTransferencia' },
      tipoDeActo: { campo: 'tipoTransferencia' },
      nDelDocumento: { campo: 'documentoOrigen' },
      adquirenteDocumento: { campo: 'codAdquiriente' },
      valorTransferencia: { campo: 'valorTransferencia', importe: true },
    },
    exigir: (borrador) => faltaEnLaTransferenciaDeVehiculo(borrador),
    nota: true,
  },

  /**
   * Notificacion de valores (RF-093, #39, #75). `PeticionDeNotificacion` es un cuerpo plano —a
   * diferencia de `valores_individual`/`valores_masivo`, que piden un arreglo (ver
   * `pantallas/valores/index.ts`)—, y el catalogo dibuja el mismo formulario campo a campo.
   *
   * `nroDeValor2`, `contribuyente` y `domicilioFiscal` son `"ro"`: los pinta el servidor, no
   * viajan de vuelta. `hora` tampoco: `fechaDeNotificacion` es `LocalDate` en el backend (ISO,
   * sin hora), y `PeticionDeNotificacion` no tiene ningun campo para ella. `fechaDeFirmeza` es
   * `"ro"` por la misma razon que en `prescripcion`: la deriva el servidor, no se declara.
   *
   * `observaciones` (el campo del bloque «Acto de notificación») no viaja: es el mismo texto que
   * ya exige `useEscritura` para cualquier escritura (regla 10) — declararlo aparte le daria al
   * usuario dos cajas para lo que el backend guarda en un solo `observacion`.
   *
   * `direccion` no tiene campo en el catalogo (la pantalla solo muestra el domicilio fiscal,
   * `"ro"`): no viaja, y el backend ya sabe que hacer sin ella —usa el domicilio vigente a esa
   * fecha (#15)—. `acuse` tampoco: el prototipo no dibuja ningun campo para adjuntar la
   * constancia todavia.
   */
  notificacion_valores: {
    campos: {
      tipoDeNotificacion: { campo: 'tipoDeNotificacion', valor: modalidadDeNotificacionDe },
      fechaDeNotificacion: { campo: 'fechaDeNotificacion' },
      notificador2: { campo: 'notificador' },
      resultado2: { campo: 'resultado', valor: resultadoDeNotificacionDe },
      personaQueRecibe: { campo: 'personaQueRecibe' },
      documentoDeQuienRecibe: { campo: 'documentoDeQuienRecibe' },
      vinculo: { campo: 'vinculo' },
    },
    nota: true,
  },

  // `pase_coactiva` no esta aqui a proposito, aunque `PeticionDeMovimiento` (#39) es un cuerpo
  // tan plano como el de `notificacion_valores`: ver `pantallas/valores/index.ts` para por que
  // conectarla hoy la haria menos segura, no mas.

  /* ── Catastro: el territorio y la ficha (#320, #321) ─────────────────── */

  /**
   * Alta de sector (`POST /catastro/sectores`, #299).
   *
   * Tres campos, que son los tres que `SectorController.PeticionDeSector` admite de un
   * alta. `activo` **no se declara**: un sector nace activo y el controlador ignora el del
   * cuerpo —darlo de alta ya retirado seria un alta y una baja en un solo acto—; para
   * retirarlo esta el `PUT`, que ademas exige el privilegio de eliminacion.
   */
  registrar_sector: {
    campos: {
      codigo: { campo: 'codigo' },
      nombre: { campo: 'nombre' },
      zona: { campo: 'zona' },
    },
  },

  /**
   * Alta de manzana (`POST /catastro/sectores/{codigo}/manzanas`, #299).
   *
   * Un solo campo: el sector va en la ruta —por su codigo, que es lo que se teclea— y
   * `PeticionDeManzana` no lleva nada mas. No hay `PUT`: el codigo de una manzana es un
   * tramo del codigo catastral de sus predios, asi que cambiarlo los desalinearia todos.
   */
  registrar_manzana: {
    campos: { codigo: { campo: 'codigo' } },
  },

  /**
   * Alta de via (`POST /catastro/vias`, #291).
   *
   * `sector`, `zonaDeArancel` y las cuadras que dibuja el prototipo no viajan porque
   * `PeticionDeVia` no las acepta —`ViaResource` tampoco las publica— y `activa` tampoco:
   * una via nace activa, igual que un sector.
   */
  registrar_via: {
    campos: {
      codigo: { campo: 'codigo' },
      tipo: { campo: 'tipo' },
      nombre: { campo: 'nombre' },
      ubigeo: { campo: 'ubigeo' },
    },
  },

  /**
   * Alta de ficha urbana (`POST /catastro/fichas/urbana`, #300).
   *
   * Es la lista blanca de `FichaController.PeticionDeAlta` **hasta donde el alta guiada
   * llega**: el predio, la primera version de la ficha y su titular. Lo que no esta:
   *
   * - `instalaciones` (cercos, piscinas): el asistente no las captura todavia, y una lista
   *   ausente en un alta es una lista vacia, que es exactamente lo correcto.
   * - `economico`, `bienesComunes`, `rural`: son el detalle de los **otros tres** tipos de
   *   ficha, y mandar el de otro tipo es 422, no un campo ignorado.
   * - `ubigeo`: `PeticionDeAlta` lo acepta, pero **el ubigeo ya va dentro del codigo de
   *   referencia catastral** —son sus seis primeros digitos, y el asistente los compone ahi
   *   (`TRAMOS_DEL_CODIGO`)—. Capturarlo aparte daria dos sitios donde escribir el mismo dato
   *   y ninguna forma de decidir cual manda cuando no coincidan.
   * - `tipoPredio`: estaba declarado y **ninguna pantalla lo captura**. Vale el mismo criterio
   *   que esta tabla de pisos enuncia para `anioConstruccion`: una columna declarada que nadie
   *   escribe no es una prevision, es una lista blanca que dice mas de lo que la interfaz
   *   puede hacer.
   *
   * El area construida de un piso **nunca** viaja como numero: es una medida decimal y
   * convertirla perderia centimetros (regla 1 aplicada a las medidas).
   */
  registrar_ficha_urbana: {
    campos: {
      codRefCatastral: { campo: 'codRefCatastral' },
      direccion: { campo: 'direccion' },
      codigoDeVia: { campo: 'codigoDeVia' },
      numeroMunicipal: { campo: 'numeroMunicipal' },
      codigoDeSector: { campo: 'codigoDeSector' },
      codigoDeManzana: { campo: 'codigoDeManzana' },
      lote: { campo: 'lote' },
      areaTerreno: { campo: 'areaTerreno' },
      uso: { campo: 'uso' },
      denominacion: { campo: 'denominacion' },
      vigenciaDesde: { campo: 'vigenciaDesde' },
      origen: { campo: 'origen' },
      documentoOrigen: { campo: 'documentoOrigen' },
    },
    tablas: { construcciones: CONSTRUCCIONES, titular: TITULAR },
  },

  /**
   * Actualizacion del catastro (`PUT /catastro/fichas/{codigo}/actualizacion`, #71).
   *
   * Estaba armando su cuerpo a mano —la salida de emergencia de `useEscritura`— porque el
   * camino declarado solo llevaba campos planos. Con la tabla declarada ya no hace falta, y
   * eso importa por una razon concreta: **la lista blanca vuelve a decir que puede escribir
   * esta pantalla**, y la columna que el prototipo dibuja y el controlador no acepta (mes,
   * año, MEP, ECS, ECC, UCA) queda fuera por declaracion y no por acordarse.
   */
  actualizacion_catastro: {
    campos: {
      origen: { campo: 'origen' },
      documentoOrigen: { campo: 'documentoOrigen' },
      vigenciaDesde: { campo: 'vigenciaDesde' },
    },
    tablas: { construcciones: CONSTRUCCIONES },
  },
};

/**
 * Lo que declara esa opcion, o nada.
 *
 * `Object.hasOwn` y no `ESCRITURAS[opcion]`: la indexacion resuelve por la cadena de
 * prototipos, asi que una opcion llamada `constructor` o `toString` devolveria un
 * «declarado» que no declaro nadie —y con el, una lista blanca que no es una lista blanca—.
 * Es la misma barrera que ya aplica `soloDeclarados` un paso mas abajo.
 */
export const escrituraDe = (opcion: string): EscrituraDeclarada | undefined =>
  Object.hasOwn(ESCRITURAS, opcion) ? ESCRITURAS[opcion] : undefined;

/** Las opciones que declaran escritura. La prueba de la lista blanca las mira. */
export const OPCIONES_QUE_ESCRIBEN = Object.keys(ESCRITURAS);
