import type { CampoDelCuerpo, MapaDelCuerpo, TablaDelCuerpo } from './escritura';

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
  /** Los mapas del cuerpo, con su vocabulario declarado. Ver {@link MapaDelCuerpo}. */
  readonly mapas?: Readonly<Record<string, MapaDelCuerpo>>;
  /**
   * Que accion de la barra manda que cuerpo, para la pantalla que el prototipo
   * capturo con varios verbos. Ver `OpcionesDeEscritura.segunLaAccion`.
   */
  readonly segunLaAccion?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Campos del cuerpo que **los trae el filtro**, no el formulario. Ver
   * `OpcionesDeEscritura.delFiltro`.
   */
  readonly delFiltro?: Readonly<Record<string, CampoDelCuerpo>>;
  /**
   * Lo que el cuerpo lleva siempre y nadie teclea: cual de las dos mitades de la
   * operacion se pide. Ver `OpcionesDeEscritura.constantes`.
   */
  readonly constantes?: Readonly<Record<string, string | number | boolean>>;
  /**
   * Lo que **ademas de la observacion** hace falta para poder guardar, dicho
   * como el motivo por el que todavia no se puede. Ver `OpcionesDeEscritura.exigir`.
   */
  readonly exigir?: (
    borrador: Readonly<Record<string, string>>,
    filas: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>,
    delFiltro: Readonly<Record<string, string>>,
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
 * «Tipo de valor» del catalogo → `TipoValor.codigo()` (OP, RD, RM). Tres traducciones
 * distintas y no una sola porque cada pantalla dibuja su propio vocabulario para lo mismo:
 * `valores_busqueda` lo abrevia («RES. DETERMINACIÓN»), `valores_individual` lo escribe
 * entero y `valores_masivo` no ofrece «RESOLUCIÓN DE MULTA» —una multa no se emite en
 * bloque, se emite una a una tras una fiscalizacion—. Fusionar las tres en una tabla
 * comun dejaria que una pantalla mandara un tipo que su propio desplegable no ofrece.
 */
const TIPO_DE_VALOR_INDIVIDUAL: Readonly<Record<string, string>> = {
  'ORDEN DE PAGO': 'OP',
  'RESOLUCIÓN DE DETERMINACIÓN': 'RD',
  'RESOLUCIÓN DE MULTA': 'RM',
};

const tipoDeValorIndividualDe = (texto: string): string | undefined =>
  TIPO_DE_VALOR_INDIVIDUAL[texto];

const TIPO_DE_VALOR_MASIVO: Readonly<Record<string, string>> = {
  'ORDEN DE PAGO': 'OP',
  'RESOLUCIÓN DE DETERMINACIÓN': 'RD',
};

const tipoDeValorMasivoDe = (texto: string): string | undefined => TIPO_DE_VALOR_MASIVO[texto];

/**
 * «Tipo de recurso» del catalogo de `transito_descargos` → `TipoDeRecurso` (V41).
 *
 * Los cuatro son los mismos cuatro y en el mismo orden; lo unico que cambia es
 * la tilde, porque el enum de Java no la lleva y el desplegable del manual si.
 * No se resuelve quitando tildes con una funcion —eso convertiria cualquier
 * texto en un valor «traducido», incluido uno que el enum no tiene— sino con la
 * tabla de siempre: lo que no este aqui no viaja.
 */
const TIPO_DE_RECURSO_DEL_BACKEND: Readonly<Record<string, string>> = {
  DESCARGO: 'DESCARGO',
  // Entrecomilladas por lo mismo que `CEDULÓN` mas arriba: sin las comillas son
  // identificadores validos de JavaScript, y un identificador con tilde es lo
  // que ESLint prohibe (FRO-04 §2).
  'RECONSIDERACIÓN': 'RECONSIDERACION',
  'APELACIÓN': 'APELACION',
  NULIDAD: 'NULIDAD',
};

const tipoDeRecursoDe = (texto: string): string | undefined => TIPO_DE_RECURSO_DEL_BACKEND[texto];

/**
 * «Tributo» del catalogo de `valores_individual`/`valores_masivo`/`prescripcion` →
 * el codigo que `ConsultaDeDeudaPublica`/el libro reconocen.
 *
 * **No es `TRIBUTO_DEL_BACKEND`** (la de `alta_deuda`, mas arriba): esa traduce
 * «ARBITRIOS MUNICIPALES»/«MULTA ADMINISTRATIVA», y estas tres pantallas dibujan
 * «ARBITRIOS»/«MULTA» a secas —el mismo desplegable del manual, escrito distinto en
 * cada pantalla del prototipo—. Los **codigos de destino son los mismos**
 * (`SelectorDeObligacion.tributo()` se compara con `equalsIgnoreCase` contra lo que
 * publica el libro, igual que en `alta_deuda`), asi que fusionar las llaves de origen
 * en una sola tabla dejaria una de las dos pantallas sin su propia etiqueta.
 */
const TRIBUTO_DE_VALORES: Readonly<Record<string, string>> = {
  'IMPUESTO PREDIAL': 'PREDIAL',
  ARBITRIOS: 'ARBITRIO',
  'PATRIMONIO VEHICULAR': 'VEHICULAR',
  ALCABALA: 'ALCABALA',
  MULTA: 'MULTA_ADMINISTRATIVA',
};

const tributoDeValoresDe = (texto: string): string | undefined => TRIBUTO_DE_VALORES[texto];

/**
 * La obligacion que formaliza `valores_individual` (`POST /valores`, #37, #75).
 *
 * `PeticionDeValor.obligaciones` es un arreglo, y el catalogo dibuja un formulario
 * plano de una sola obligacion —un tributo, un periodo—: la pantalla
 * (`GeneracionIndividualDeValores.tsx`) sincroniza esos dos campos en una tabla de,
 * como mucho, una fila cada vez que cambian; no hay boton para anadir una segunda.
 *
 * `predioId`/`vehiculoId` no se declaran: son el identificador interno del predio o
 * el vehiculo, y esta pantalla no tiene todavia un resolutor que los traduzca desde
 * el codigo catastral o la placa (el que #331 le dio a `alta_deuda` es de esa
 * pantalla, con su propio componente). Sin ellos, el selector cae sobre la
 * obligacion del tributo/ejercicio que no cuelga de un predio o vehiculo concreto;
 * el backend contesta `ObligacionSinDeuda` en vez de adivinar cual.
 */
const OBLIGACION_UNICA: TablaDelCuerpo = {
  campo: 'obligaciones',
  columnas: {
    tributo: { campo: 'tributo', valor: tributoDeValoresDe },
    periodo: { campo: 'ejercicio', entero: true },
  },
};

/**
 * El criterio de una corrida de `valores_masivo` (`POST /valores/masivo`, #38, #75).
 *
 * `IniciarCorridaMasiva` exige **exactamente uno** de `contribuyentes` (una lista de
 * codigos) o `archivoCsv` (una hoja importada en base64): esta pantalla conecta solo
 * el primero —«seleccion individual», en el vocabulario del javadoc de
 * `PeticionDeValorMasivo`—, tecleado uno por linea. La importacion de hoja de
 * calculo no tiene todavia ningun control en el catalogo ni en el prototipo —ni
 * `type="file"` en ninguna pantalla del sistema— y anadir uno seria un componente
 * escrito antes de que ninguna otra pantalla lo pida.
 *
 * `columnaUnica`: el backend declara `List<String>`, no una lista de objetos.
 */
const CONTRIBUYENTES_DE_LA_CORRIDA: TablaDelCuerpo = {
  campo: 'contribuyentes',
  columnaUnica: 'codigo',
  columnas: { codigo: { campo: 'codigo' } },
};

/**
 * La causal del art. 43 del TUO del Codigo Tributario que sustenta la prescripcion
 * (`prescripcion`, `PeticionDePrescripcion.plazoAplicable`, #39, #75). Los tres
 * plazos —4, 6 y 10 anios— **no viajan**: son la cifra normativa que vive en el
 * parametro sellado (regla 5); lo que este desplegable manda es la causal, y el
 * backend deriva el plazo de ella.
 */
const CAUSAL_DE_PRESCRIPCION: Readonly<Record<string, string>> = {
  '4 AÑOS — DECLARACIÓN PRESENTADA': 'DECLARACION_PRESENTADA',
  '6 AÑOS — NO PRESENTÓ DECLARACIÓN': 'SIN_DECLARACION',
  '10 AÑOS — AGENTE DE RETENCIÓN': 'AGENTE_RETENCION',
};

const causalDePrescripcionDe = (texto: string): string | undefined => CAUSAL_DE_PRESCRIPCION[texto];

/**
 * El hecho que interrumpe el computo de la prescripcion (art. 45 del TUO), tal como
 * lo elige el unico desplegable que el catalogo dibuja —«Acto de interrupcion»—.
 *
 * Es una tabla de, como mucho, una fila: `PrescripcionDeLaDeuda.tsx` la sincroniza
 * con «NINGUNO» vaciandola. `clase` viaja fija en `INTERRUPCION` —el catalogo no
 * dibuja ninguna suspension (art. 46), y esta pantalla no inventa la que no esta—.
 * `fechaHasta` no se declara por el mismo motivo: una interrupcion no tiene fin, se
 * cuenta de nuevo desde el dia siguiente (`ClaseDeHecho`).
 */
const HECHO_DE_INTERRUPCION: TablaDelCuerpo = {
  campo: 'hechos',
  columnas: {
    clase: { campo: 'clase' },
    causal: { campo: 'causal' },
    fechaDesde: { campo: 'fechaDesde' },
  },
};

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

/**
 * Las obligaciones que se acogen a un convenio coactivo (#426, RF-105).
 *
 * `plana` porque `PeticionDeObligacionAcogida` es exactamente esto: cuatro
 * campos que **identifican** la obligación y ninguno que la valore. El importe
 * no viaja a propósito —lo relee el backend a la fecha de corte, que es lo que
 * impide acoger una cifra que ya no es la que se debe (regla 9)—.
 *
 * `predioId` y `vehiculoId` van `entero: true` porque el `record` los declara
 * `Long`, y a lo sumo uno de los dos tiene valor: una obligación cuelga de un
 * predio, de un vehículo o de ninguno —una costa del procedimiento no cuelga de
 * nada—. Llegan por `DatosDeTabla.valores`, no de una celda: la columna
 * «Unidad» dibuja el identificador para que se lea, y el cuerpo lo quiere como
 * número.
 */
const OBLIGACIONES_DEL_CONVENIO: TablaDelCuerpo = {
  campo: 'obligaciones',
  columnas: {
    tributo: { campo: 'tributo' },
    ano: { campo: 'ejercicio', entero: true },
    predioId: { campo: 'predioId', entero: true },
    vehiculoId: { campo: 'vehiculoId', entero: true },
  },
};

/**
 * **El arqueo del cierre de caja, medio de pago por medio de pago** (#36, #423).
 *
 * `PeticionDeCierre.declarado` es un `Map<String, String>` cuyas claves son las
 * cinco `FormaDePago` del recibo, las mismas del `CHECK` de `recibo` (V3):
 * `FormaDePago.porNombre` no admite ninguna otra y rechaza el cierre entero con
 * «Forma de pago desconocida».
 *
 * **Y son cinco, no las cuatro casillas que el prototipo dibuja.** El manual
 * captura «efectivo», «tarjeta de débito/crédito», «depósito en cuenta» y «pago
 * en línea», y deja el **cheque** sin ninguna; el javadoc de `PeticionDeCierre`
 * dice por que eso no se puede copiar: «declarar por las casillas haria que un
 * turno con un cheque saliera descuadrado sin que el cajero pudiera decir nada».
 * Asi que el mapa sustituye a las cuatro (`enVezDe`) y dibuja las cinco del
 * dominio, con el rotulo del prototipo donde lo hay.
 *
 * `importe: true`: cada cifra viaja **como texto decimal** —`new BigDecimal(texto)`
 * al otro lado, regla 1— y lo que no sea una cadena decimal simple no sale.
 *
 * **Ningun total.** «Total declarado», «Total sistema» y «Diferencia» son `"ro"`
 * y los calcula `ArqueoDelTurno`: sumar aqui las cinco filas seria componer un
 * importe en la interfaz (RNF-083), y ademas daria otra cifra que la archivada
 * en cuanto el arqueo tuviera una linea que la pantalla no dibuja.
 */
const ARQUEO_POR_FORMA_DE_PAGO: MapaDelCuerpo = {
  campo: 'declarado',
  importe: true,
  enVezDe: ['efectivoS', 'tarjetaDeDebitoCreditoS', 'depositoEnCuentaS', 'pagoEnLineaS'],
  entradas: [
    { clave: 'EFECTIVO', etiqueta: 'Efectivo (S/)' },
    { clave: 'CHEQUE', etiqueta: 'Cheque (S/)' },
    { clave: 'DEPOSITO', etiqueta: 'Depósito en cuenta (S/)' },
    { clave: 'TARJETA', etiqueta: 'Tarjeta de débito / crédito (S/)' },
    { clave: 'TRANSFERENCIA', etiqueta: 'Transferencia / pago en línea (S/)' },
  ],
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
/**
 * Un campo que se **declara para poder verlo**, y que no viaja nunca.
 *
 * `soloDeclarados` descarta lo que la traduccion no reconoce, asi que esto lo
 * descarta siempre. Ver por que hace falta en `predial_masivo`.
 */
function nuncaViaja(): undefined {
  return undefined;
}

/**
 * El alcance de la corrida, traducido al que el backend reconoce.
 *
 * `DeterminarPredialMasivo` admite **dos**: `TODOS` y `SECTOR`. El desplegable
 * del manual ofrece **cuatro**, y las otras dos —«POR RANGO DE CÓDIGO» y «SOLO
 * OBSERVADOS»— no existen todavia en ninguna parte del sistema.
 *
 * Lo que no se reconoce **no viaja**, y ademas no se deja pulsar: sin lo segundo,
 * omitir `alcance` haria que el backend cayera en `TODOS`, y quien pidio «solo
 * observados» recibiria una emision de **todo el padron** sin que nada se lo
 * dijera. Ver `faltaEnLaCorridaDelPredial`.
 */
function alcanceDeLaCorrida(texto: string): string | undefined {
  if (texto === 'TODO EL PADRÓN') return 'TODOS';
  if (texto === 'POR SECTOR') return 'SECTOR';
  return undefined;
}

/**
 * El sector de la corrida. «Todos» **no es un sector**: es la ausencia de uno.
 *
 * Mandarlo haria que `enElAlcance` buscara predios del sector literalmente
 * llamado «Todos», que no es ninguno, y la corrida saldria vacia.
 */
function sectorDeLaCorrida(texto: string): string | undefined {
  return texto === '' || texto === 'Todos' ? undefined : texto;
}

/**
 * Lo que le falta a la corrida del predial para poder asentarse (#445).
 *
 * Las cinco guardas son las cinco formas que tiene esta pantalla de mandar una
 * corrida que el backend rechaza o —peor— que acepta queriendo decir otra cosa:
 *
 *   ejercicio    `PeticionDeCalculoMasivo` lo exige, y el desplegable de un
 *                campo escribible abre **en blanco** a proposito (revision de
 *                #331): un `sel` que enseña su primera opcion sin que nadie la
 *                elija manda un cuerpo sin ella. Aqui eso seria emitir el
 *                padron de un año que nadie escogio
 *   alcance      igual, y ademas con dos de sus cuatro opciones sin sistema
 *                detras: ver `alcanceDeLaCorrida`
 *   el sector    con «POR SECTOR» hay que decir cual. El backend lo dice con
 *                todas las letras: sin el, «solo el sector» y «todo el padron»
 *                serian la misma corrida
 *   arbitrios    `PredialController.rechazarLoQueNoHace` devuelve 422. Los
 *                arbitrios son otro tributo, con su propia determinacion (#37)
 *   la cuponera  lo mismo: es un documento, y esa capa es #43
 *
 * Las dos ultimas son casillas que el manual dibuja y el sistema no hace. Se
 * podrian haber dejado sin declarar —lo estan— y callar; entonces marcarlas no
 * haria nada y la corrida saldria sin arbitrios mientras la pantalla enseña
 * «Incluye arbitrios ✓». Decirlo **antes** de pulsar es lo que #332 pide: ningun
 * acto promete lo que no puede.
 */
function faltaEnLaCorridaDelPredial(
  borrador: Readonly<Record<string, string>>,
): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  if (dato('ejercicioACalcular') === '') {
    return 'Elige el ejercicio que se va a emitir: el desplegable abre en blanco a propósito, para que la emisión de un año no salga por omisión.';
  }
  const alcance = dato('alcance');
  if (alcance === '') {
    return 'Elige el alcance de la corrida: si se emite a todo el padrón o solo a un sector.';
  }
  if (alcanceDeLaCorrida(alcance) === undefined) {
    return `El sistema emite a todo el padrón o por sector, y «${alcance}» todavía no. Elige uno de esos dos y avísale a sistemas si necesitas este.`;
  }
  if (alcanceDeLaCorrida(alcance) === 'SECTOR' && sectorDeLaCorrida(dato('sector')) === undefined) {
    return 'Con el alcance por sector hay que decir cuál: sin él, «solo el sector» y «todo el padrón» serían la misma corrida.';
  }
  if (dato('incluyeArbitrios') !== '') {
    return 'Esta corrida determina el impuesto predial. Los arbitrios son otro tributo, con su propia determinación por periodo, y no se emiten aquí: desmarca la casilla y emítelos desde «Arbitrios municipales».';
  }
  if (dato('generaCuponeraPdf') !== '') {
    return 'La cuponera es un documento y todavía no se genera desde aquí: desmarca la casilla para asentar la determinación, y avísale a sistemas que la necesitas.';
  }
  return undefined;
}

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

/**
 * Donde esta el campo que el manual no dibuja, dicho para quien atiende (#422).
 *
 * La frase existe por lo mismo que `DONDE_EL_PREDIO`: el campo que falta no
 * esta donde quien conoce la pantalla lo buscaria, porque hasta hoy no estaba en
 * ninguna parte.
 */
const DONDE_EL_EXPEDIENTE = 'Está al final de «Solicitud», debajo del fundamento.';

/**
 * Que le falta al descargo para poder registrarse (#50, #77, #422).
 *
 * Los cinco que `DescargosController` pasa por `exigir` —`papeleta`,
 * `nDeExpediente`, `fechaDePresentacion`, `tipoDeRecurso` y `fundamento`—, en el
 * orden en que se rellenan. El sexto que el cuerpo admite, `familia`, no se
 * declara: por omision es transito, que es la pantalla que lo manda.
 *
 * **La marca «Dentro del plazo» no entra**, y esa ausencia es la que importa: la
 * calcula el servidor con el plazo parametrizado (`DescargoResource.enPlazo` y
 * `plazo`), y dejar que la pantalla la mandara seria dejar que quien atiende
 * declare en plazo un escrito que llego tarde.
 */
function faltaEnElDescargo(borrador: Readonly<Record<string, string>>): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  if (dato('papeletaImpugnada') === '') {
    return 'Falta la papeleta impugnada: es contra qué se presenta el descargo.';
  }
  if (dato('nDeExpedienteDeMesaDePartes') === '') {
    return `Falta el número de expediente con que el escrito entró por mesa de partes: es lo que ata el descargo al documento que el administrado presentó. ${DONDE_EL_EXPEDIENTE}`;
  }
  if (dato('fechaDePresentacion') === '') {
    return 'Falta la fecha de presentación: de ella sale si el escrito entró en plazo, y eso lo calcula el servidor.';
  }
  if (dato('tipoDeRecurso') === '') {
    return 'Falta el tipo de recurso: descargo, reconsideración, apelación o nulidad.';
  }
  if (dato('fundamentoDelAdministrado') === '') {
    return 'Falta el fundamento del administrado: sin él no queda constancia de qué se alegó.';
  }
  return undefined;
}

/**
 * «Tipo de certificado» del catalogo de `certificados` → `TipoDeCertificado` (V51).
 *
 * Los cuatro son los mismos cuatro y en el mismo orden; lo que cambia son las
 * tildes y el «Y» que el enumerado escribe con guion bajo. Igual que
 * `TIPO_DE_RECURSO_DEL_BACKEND`: con una tabla, no quitando tildes con una
 * funcion —eso convertiria cualquier texto en un valor «traducido»—.
 */
const TIPO_DE_CERTIFICADO_DEL_BACKEND: Readonly<Record<string, string>> = {
  // Entrecomilladas por lo mismo que `CEDULÓN`: sin las comillas son
  // identificadores validos de JavaScript, y uno con tilde es lo que ESLint
  // prohibe (FRO-04 §2).
  'NUMERACIÓN': 'NUMERACION',
  'ZONIFICACIÓN Y VÍAS': 'ZONIFICACION_VIAS',
  'PARÁMETROS URBANÍSTICOS': 'PARAMETROS_URBANISTICOS',
  'JURISDICCIÓN': 'JURISDICCION',
};

const tipoDeCertificadoDe = (texto: string): string | undefined =>
  TIPO_DE_CERTIFICADO_DEL_BACKEND[texto];

/**
 * Los dos tipos cuyo papel **consigna parametros urbanisticos**, por su rotulo
 * del desplegable.
 *
 * `ModeloDelCertificado.tablaDeParametros` imprime, cuando los cinco vienen
 * vacios, la fila «— | Este certificado no consigna parametros urbanisticos»; y
 * los cinco campos son `"ro"` en el catalogo, asi que esta pantalla no puede
 * llenarlos. Emitir desde aqui una zonificacion o unos parametros urbanisticos
 * produciria **papel oficial que no certifica nada**, con su correlativo
 * consumido, su derecho cobrado y su SHA-256 sellado para siempre (un
 * certificado no se corrige: V51 no admite `UPDATE`).
 *
 * Los otros dos **si** se emiten enteros: `ParametrosUrbanisticos` dice que un
 * certificado de numeracion «no dice nada de la altura maxima» y que uno de
 * jurisdiccion «solo dice que el predio esta dentro del distrito».
 */
const CERTIFICADOS_QUE_CONSIGNAN_PARAMETROS: readonly string[] = [
  'ZONIFICACIÓN Y VÍAS',
  'PARÁMETROS URBANÍSTICOS',
];

/**
 * Que le falta al certificado para poder emitirse (#54, #427).
 *
 * Los cuatro que `CertificadoController` pasa por `exigido`/`tipoDe` —el tipo,
 * el codigo predial, el solicitante y el numero de recibo—, en el orden en que
 * se rellenan; y una quinta condicion que no es un campo que falte sino una
 * clase de papel que esta pantalla no puede emitir honestamente.
 */
/**
 * Que le falta a la notificacion administrativa para poder registrarse (#47, #428).
 *
 * Los cuatro que `NotificacionAdministrativaController` pasa por `exigir` —el
 * numero, la fecha, la direccion y el motivo—, en el orden en que se rellenan.
 * El numero se compone de la serie y el numero (ver
 * `ResolutorDelNumeroDeNotificacion`), asi que su falta se dice nombrando las
 * dos mitades y no la clave del cuerpo.
 */
function faltaEnLaNotificacion(borrador: Readonly<Record<string, string>>): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  if (dato('numeroCompuesto') === '') {
    return 'Falta el número de la notificación: hacen falta su serie y su número, que se guardan juntos.';
  }
  if (dato('fechaDeNotificacion') === '') {
    return 'Falta la fecha de la notificación: de ella sale cuándo vence el plazo.';
  }
  if (dato('direccionDelPredio') === '') {
    return 'Falta la dirección del predio: es dónde se notificó, y va impresa en la cédula.';
  }
  if (dato('codigoDeInfraccion') === '') {
    return 'Falta el código de infracción: es el motivo por el que se notifica.';
  }
  return undefined;
}

/**
 * Que le falta a la cobranza para poder registrarse (#33, #430).
 *
 * Lo que `CajaController.cobranza` pasa por `exigir`, en el orden en que se
 * rellena la pantalla: el contribuyente —que aqui viene del filtro—, al menos
 * una deuda marcada, el medio de pago, la caja y el cajero.
 */
function faltaEnLaCobranza(
  borrador: Readonly<Record<string, string>>,
  filas: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>>,
  delFiltro: Readonly<Record<string, string>>,
): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  if ((delFiltro['codContribuyente'] ?? '').trim() === '') {
    return 'Busca primero al contribuyente: la caja cobra sobre su cuenta corriente.';
  }
  if ((filas['obligaciones'] ?? []).length === 0) {
    return 'Marca al menos una deuda de la tabla: es lo que se cobra.';
  }
  if (dato('medioDePago') === '') {
    return 'Falta el medio de pago: con qué entra el dinero (efectivo, cheque, depósito, tarjeta o transferencia).';
  }
  if (dato('caja') === '') {
    return 'Falta la caja: el recibo se numera con la serie de esa ventanilla.';
  }
  if (dato('cajero') === '') {
    return 'Falta el cajero: el turno que se abre es el suyo.';
  }
  return undefined;
}

const SALIDA_DEL_CERTIFICADO = 'Emítelo por el procedimiento actual y avísale a sistemas.';

function faltaEnElCertificado(borrador: Readonly<Record<string, string>>): string | undefined {
  const dato = (clave: string): string => (borrador[clave] ?? '').trim();

  const tipo = dato('tipoDeCertificado');
  if (tipo === '') {
    return 'Falta el tipo de certificado: numeración, zonificación y vías, parámetros urbanísticos o jurisdicción.';
  }
  if (CERTIFICADOS_QUE_CONSIGNAN_PARAMETROS.includes(tipo)) {
    return `Este certificado consigna la zonificación, la altura máxima, el área libre mínima, el retiro municipal y el coeficiente de edificación, y esta pantalla los dibuja de solo lectura: no hay dónde transcribirlos del plano, y emitido así saldría sin ninguno y con su número ya gastado. Los de numeración y jurisdicción sí salen de aquí. ${SALIDA_DEL_CERTIFICADO}`;
  }
  if (dato('codigoPredial') === '') return 'Falta el código predial: se certifica sobre un predio.';
  if (dato('solicitante') === '') {
    return 'Falta el solicitante: elígelo en el padrón, porque el certificado se emite a su nombre.';
  }
  if (dato('nDeRecibo') === '') {
    return 'Falta el número del recibo del derecho de trámite: el sistema comprueba contra él antes de emitir.';
  }
  return undefined;
}

/**
 * ── El vocabulario de la diligencia coactiva ────────────────────────────
 *
 * Dos tablas y no una, porque son **dos ejes** y el prototipo los pregunta con
 * dos desplegables: como se diligencio y con que resultado termino. Es el mismo
 * reparto que `notificacion_valores` hace con las suyas, y por eso no se
 * fusionan con aquellas: las palabras del prototipo son otras —esta pantalla es
 * la del procedimiento coactivo, aquella la de los valores— y fusionarlas
 * obligaria a que las dos capturas del manual dijeran lo mismo para siempre.
 *
 * **Una opcion que ninguna tabla reconozca no viaja**, y eso es deliberado:
 * `CampoDelCuerpo.valor` que devuelve `undefined` deja el campo sin poner, el
 * backend responde 422 nombrandolo y `exigir` lo dice antes, apagando el boton.
 * La alternativa —mandar la palabra mas parecida— es una diligencia registrada
 * con una modalidad que nadie eligio.
 */

/**
 * «Recibido por» del prototipo → `ModalidadDeNotificacion` (V3, art. 104 del
 * Codigo Tributario).
 *
 * Seis opciones en tres, y el corte no es arbitrario: las cuatro primeras dicen
 * **quien** recibio y las tres son entrega personal —al obligado, a su
 * representante o a quien estuviera en el domicilio—; «NEGATIVA A RECIBIR» y
 * «CEDULÓN» ya no dicen quien sino **como**, que es lo que el enum pregunta.
 *
 * `'CEDULÓN'` va entrecomillada a proposito, por lo mismo que la de
 * `notificacion_valores`: sin las comillas es un identificador valido de
 * JavaScript con tilde, que es justo lo que ESLint prohibe (FRO-04 §2), y
 * **Prettier se las quita si se le deja** —`quoteProps` resuelve a «as-needed»—.
 * Correr `yarn format` sobre este archivo las pierde y el lint lo caza.
 */
const MODALIDAD_COACTIVA_DEL_BACKEND: Readonly<Record<string, string>> = {
  CONTRIBUYENTE: 'PERSONAL',
  REPRESENTANTE: 'PERSONAL',
  FAMILIAR: 'PERSONAL',
  DEPENDIENTE: 'PERSONAL',
  'NEGATIVA A RECIBIR': 'NEGATIVA',
  'CEDULÓN': 'CEDULON',
};

const modalidadCoactivaDe = (texto: string): string | undefined =>
  MODALIDAD_COACTIVA_DEL_BACKEND[texto];

/**
 * «Tipo de notificación» del prototipo → `ResultadoDeNotificacion` (V28), que
 * solo admite tres valores.
 *
 * Las dos ultimas son las que sostienen el cedulon del art. 104 f) y el
 * reintento de #39: «DIRECCIÓN NO EXISTE» y «DESTINATARIO DESCONOCIDO» son dos
 * formas de no haber ubicado a nadie, y sin ellas una diligencia `NO_UBICADO` no
 * se podria registrar desde esta pantalla.
 */
const RESULTADO_COACTIVO_DEL_BACKEND: Readonly<Record<string, string>> = {
  'NOTIFICACIÓN CON ÉXITO': 'NOTIFICADO',
  'NOTIFICACIÓN POR CEDULÓN': 'NOTIFICADO',
  'NOTIFICACIÓN NEGATIVA': 'RECHAZADO',
  'DIRECCIÓN NO EXISTE': 'NO_UBICADO',
  'DESTINATARIO DESCONOCIDO': 'NO_UBICADO',
};

const resultadoCoactivoDe = (texto: string): string | undefined =>
  RESULTADO_COACTIVO_DEL_BACKEND[texto];

/**
 * La opcion del desplegable de encargados que **no elige a nadie**.
 *
 * El prototipo la ofrece en «Auxiliar» y en «Ejecutor», y para el auxiliar es
 * legitima —`PeticionDeImportacion.auxiliar` es opcional—. Para el ejecutor no:
 * es quien dirige el procedimiento, el backend lo exige, y guardar la cadena
 * «NO ESPECIFICADO» como su nombre dejaria un expediente coactivo cuyo titular
 * es un rotulo de pantalla.
 */
const NO_ESPECIFICADO = 'NO ESPECIFICADO';

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
   * documento con que se registra el acto.
   *
   * **`generaAlcabala` sí viaja desde #503 F5, y antes no.** La razón por la que no lo hacía
   * —«`CampoDelCuerpo` no tiene una forma de mandar un booleano real»— dejó de ser cierta
   * cuando #445 B1 añadió `booleano` para `recalculaYaEmitidos`, y el comentario que lo
   * explicaba se quedó atrás. Mientras tanto la casilla se dibujaba, quien atiende la
   * marcaba y `afectaAlcabala` llegaba **siempre sin marcar**: el controlador aplica su
   * valor por omisión cuando el campo no llega, así que toda transferencia quedaba
   * registrada como que no genera alcabala. No hay ningún síntoma —se registra, responde 201
   * y la casilla se ve marcada en la pantalla que se acaba de enviar—, y lo que se pierde es
   * el hecho que dispara la liquidación del impuesto.
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
      generaAlcabala: { campo: 'afectaAlcabala', booleano: true },
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
   * **La emision anual del predial** (#395, #445): la corrida masiva, asentada.
   *
   * Es la primera de las cinco determinaciones que escribe de verdad. Hasta hoy la pantalla
   * solo podia **simular** —`useSimulacion` manda `simulacion: true` y el backend calcula sin
   * asentar—, y su primaria «Ejecutar proceso» se quedaba apagada con la franja
   * `sin-declaracion`: la unica de las cuatro causas que pedia trabajo de este lado.
   *
   * Va primero de las cinco porque su cuerpo es **plano**:
   * `PeticionDeCalculoMasivo(observacion, ejercicio, alcance, sector, modalidad,
   * recalculaYaEmitidos, simulacion, incluyeArbitrios, generaCuponeraPdf)`. El de
   * `predial_individual` lleva ademas un arreglo de predios, que la lista blanca todavia no
   * sabe declarar suelto (el caso de #75 con `contribuyentes` y `hechos`).
   *
   * `simulacion: false` va en `constantes` y no en `campos` porque **no es un dato del
   * expediente**: es cual de las dos mitades de la operacion se pide. El backend lo exige
   * —`exigirSimulacion` rechaza el nulo— y la observacion de la regla 10 solo se le pide a la
   * mitad que asienta.
   *
   * Lo que **no** viaja, y por que:
   *
   * - `uitDelEjercicioS` es `"ro"`: la UIT vive en el conjunto sellado del ejercicio y la pone
   *   el servidor. Devolversela seria dejar que el cliente proponga una cifra normativa.
   * - `derechoDeEmisionS`: `PeticionDeCalculoMasivo` no tiene ningun campo para el. Es ademas un
   *   valor de ordenanza (D-02b), no algo que se teclee por corrida.
   * - `modalidad`: el catalogo no dibuja ningun campo, y el backend cae en `TRIMESTRAL` cuando
   *   falta. Declarar aqui una modalidad que nadie eligio seria elegirla nosotros.
   * - `incluyeArbitrios` y `generaCuponeraPdf`: ver `faltaEnLaCorridaDelPredial`. **No se
   *   declaran a proposito**, y ademas se bloquea la primaria cuando alguno esta marcado.
   */
  predial_masivo: {
    campos: {
      ejercicioACalcular: { campo: 'ejercicio' },
      alcance: { campo: 'alcance', valor: alcanceDeLaCorrida },
      sector: { campo: 'sector', valor: sectorDeLaCorrida },
      recalculaYaEmitidos: { campo: 'recalculaYaEmitidos', booleano: true },
      /* **Declaradas para poder decir que no**, y con una traduccion que nunca
         acepta nada: asi quedan en el borrador —`fijarCampo` descarta en
         silencio lo que la opcion no declara— y `faltaEnLaCorridaDelPredial`
         puede verlas y apagar la primaria con el motivo del backend. Sin
         declararlas, marcarlas no llegaria a ninguna parte: la corrida saldria
         sin arbitrios mientras la pantalla enseña «Incluye arbitrios ✓», que es
         el defecto silencioso que #332 cerro. Y declaradas a secas viajarian, y
         `rechazarLoQueNoHace` devolveria un 422 despues de pulsar. */
      incluyeArbitrios: { campo: 'incluyeArbitrios', valor: nuncaViaja },
      generaCuponeraPdf: { campo: 'generaCuponeraPdf', valor: nuncaViaja },
    },
    constantes: { simulacion: false },
    exigir: (borrador) => faltaEnLaCorridaDelPredial(borrador),
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

  /**
   * Generacion individual de valores (`POST /valores`, #37, #75). Ver `OBLIGACION_UNICA`,
   * `TIPO_DE_VALOR_INDIVIDUAL` y `TRIBUTO_DE_VALORES` mas arriba.
   *
   * `nroDeValor`, `fechaDeEmision`, `baseLegal` y toda la seccion «Importes» del catalogo
   * son «ro»: el correlativo lo numera `ValorRepository.siguienteCorrelativo`, la fecha es
   * la de hoy —`RegistrarValor.emitir` no acepta otra desde esta ruta— y `baseLegal` la
   * deriva `TipoValor.baseLegal()` del tipo. El desglose (insoluto, reajuste, interes,
   * gastos, total) es lo que la emision **congela**: no existe hasta que se emite, y
   * `ValorDetalle` lo trae en la respuesta —esta pantalla no lo previsualiza, porque no hay
   * ningun `GET` que calcule sin emitir—.
   */
  valores_individual: {
    campos: {
      tipoDeValor: { campo: 'tipo', valor: tipoDeValorIndividualDe },
      codContribuyente: { campo: 'codContribuyente' },
    },
    tablas: { obligaciones: OBLIGACION_UNICA },
    nota: true,
  },

  /**
   * Generacion masiva de valores (`POST /valores/masivo`, #38, #75). Ver
   * `CONTRIBUYENTES_DE_LA_CORRIDA`, `TIPO_DE_VALOR_MASIVO` y `TRIBUTO_DE_VALORES` mas
   * arriba.
   *
   * `sector`, `montoMinimoDeEmisionS`, `excluyeContribuyentesConConvenio` y
   * `excluyeDeudaReclamada` **no viajan**: `PeticionDeValorMasivo` no tiene ningun campo
   * para ellos —`IniciarCorridaMasiva` filtra por tributo y ejercicio, no por sector ni
   * por un monto minimo, y no excluye nada todavia—. Mandarlos seria fingir un filtro que
   * el backend ignora en silencio.
   *
   * `fechaDeEmision` del catalogo se declara como `fechaCriterio`: es la fecha a la que se
   * evalua la deuda disponible de cada candidato, congelada al registrar el criterio
   * (`RegistrarValor.emitir(..., fecha)`), no la fecha en la que efectivamente corre la
   * etapa «generacion» —que es un proceso aparte, en el perfil batch—.
   */
  valores_masivo: {
    campos: {
      tipoDeValor: { campo: 'tipo', valor: tipoDeValorMasivoDe },
      ejercicioDesde: { campo: 'ejercicioDesde', entero: true },
      ejercicioHasta: { campo: 'ejercicioHasta', entero: true },
      tributo: { campo: 'tributo', valor: tributoDeValoresDe },
      fechaDeEmision: { campo: 'fechaCriterio' },
    },
    tablas: { contribuyentes: CONTRIBUYENTES_DE_LA_CORRIDA },
    nota: true,
  },

  /**
   * Prescripcion de la deuda (`POST /coactiva/prescripcion`, #39, #75). Ver
   * `CAUSAL_DE_PRESCRIPCION`, `HECHO_DE_INTERRUPCION` y `TRIBUTO_DE_VALORES` mas arriba.
   *
   * `ejerciciosSolicitados` del catalogo —un solo campo de texto libre, «2021 — 2026»— no
   * se declara: `PeticionDePrescripcion` pide `ejercicioDesde`/`ejercicioHasta` como dos
   * enteros separados, y partir un texto libre en dos numeros no es una traduccion de
   * `CampoDelCuerpo.valor` —esa devuelve una cadena, no dos campos—.
   * `PrescripcionDeLaDeuda.tsx` dibuja dos selectores de ejercicio en su lugar, y cada uno
   * escribe el campo declarado que le toca.
   *
   * `inicioDelComputo`, `nuevoInicioDelComputo`, `fechaDePrescripcion`, `resultado` y
   * `montoAExtinguirS` son «ro»: el computo, el veredicto y el monto los deriva el
   * servidor del conjunto sellado y de la deuda del contribuyente; dejar que viajaran
   * seria dejar que el cliente declarara prescrita una deuda que no lo esta.
   */
  prescripcion: {
    campos: {
      codContribuyente: { campo: 'codContribuyente' },
      tributo: { campo: 'tributo', valor: tributoDeValoresDe },
      ejercicioDesde: { campo: 'ejercicioDesde', entero: true },
      ejercicioHasta: { campo: 'ejercicioHasta', entero: true },
      fechaDePresentacion: { campo: 'fechaDePresentacion' },
      plazoAplicable: { campo: 'plazoAplicable', valor: causalDePrescripcionDe },
      nDeResolucion: { campo: 'nDeResolucion' },
    },
    tablas: { hechos: HECHO_DE_INTERRUPCION },
    nota: true,
  },

  /**
   * Pase de un valor a coactiva (`POST /valores/{numero}/movimientos`, #39, #75).
   *
   * `PeticionDeMovimiento` es un cuerpo tan plano como el de `notificacion_valores`, pero
   * el catalogo dibuja las acciones de esta pantalla como `["Nuevo", "Modificar",
   * "Generar", "Inactivar", "Imprimir"]` —la ultima es «Imprimir», que ni escribe de
   * verdad ni es irreversible—, asi que el renderizador generico (que trata **la ultima**
   * accion como la primaria que escribe) dejaria pasar un valor a coactiva sin ninguna
   * confirmacion. Por eso vive en su propio componente (`PaseACoactiva.tsx`, en
   * `COMPONENTES_PROPIOS` de `Pantalla.tsx`) con su propia barra de una sola accion —
   * «Derivar a coactiva», la unica que escribe, siempre la primaria—, no en el
   * renderizador generico.
   *
   * `tipoDeMovimiento` **no lo elige quien atiende**: `ValoresController.mover` rechaza
   * cualquier valor que no sea `PCO` («#39 registra el pase (PCO). ACO/RCO son la
   * respuesta de coactiva, y la escribe el modulo coactiva» — eso es #40, cuando exista
   * el expediente que responde—), asi que la pantalla lo fija sola: no hay un desplegable
   * pidiendo una eleccion que solo tiene una respuesta correcta.
   */
  pase_coactiva: {
    campos: {
      tipoDeMovimiento: { campo: 'tipoDeMovimiento' },
      fechaDelMovimiento: { campo: 'fechaDelMovimiento' },
    },
  },

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

  /* ── Tesorería: la ventanilla (#33, #34, #35, #36, #74) ──────────────── */

  /**
   * Anulación de recibo (RF-083, #34, #74). El recibo que se anula llega por la URL —su número
   * impreso, `/tesoreria/anulacion-recibo/{nro}`—, no por el campo «Nro. de recibo» de la
   * pantalla: el contrato declara `nro` como parámetro de ruta y `PeticionDeAnulacion` no lo lee
   * del cuerpo. Se abre igual que una ficha catastral, por su código en la dirección.
   *
   * `motivo` y `autorizadoPor` viajan **tal cual los escribe quien atiende**: el backend los
   * guarda como texto libre —quedan impresos en el duplicado, para que quien tenga el papel sepa
   * por qué dejó de valer— y no hay ningún `CHECK` que traducir, a diferencia del tributo de
   * `alta_deuda`. Las opciones del desplegable del prototipo son una ayuda para teclear, no un
   * código que este archivo tenga que conocer.
   *
   * Lo que **no** viaja, y por qué:
   *
   * - `detalle` (el área de la pantalla): es la misma observación que ya exige `useEscritura`
   *   (regla 10) — dos cajas de texto libre pidiendo lo mismo acabarían con una de las dos
   *   vacía—. `nota` lo dice antes de que alguien lo busque.
   * - `devuelveLaDeudaACuentaCorriente` (la casilla): no es una opción. `PeticionDeAnulacion`
   *   no tiene ningún campo para ella porque la reversión de los abonos **va siempre**: anular un
   *   recibo sin deshacerlos dejaría el pago asentado sobre un documento que ya no vale, y el
   *   contribuyente figuraría al corriente sin haber pagado.
   * - `nroDeRecibo` (el campo de la sección «Recibo a anular»): es el mismo registro que ya trae
   *   la URL. Declararlo dejaría dos sitios para el mismo número y ninguna forma de decidir cuál
   *   manda cuando no coincidan.
   */
  anulacion_recibo: {
    campos: {
      motivo: { campo: 'motivo' },
      autorizadoPor: { campo: 'autorizadoPor' },
      nDeMemorando: { campo: 'nDeMemorando' },
    },
    exigir: (borrador) =>
      (borrador['motivo'] ?? '').trim() === ''
        ? 'Elige el motivo de la anulación: es el sustento del acto, y queda impreso en el duplicado del recibo.'
        : undefined,
    nota: true,
  },

  /**
   * Cierre y arqueo de caja (RF-087, #36, #423): el turno se firma con lo que hay
   * en el cajón, medio de pago por medio de pago.
   *
   * **Su cuerpo es un mapa**, y por eso esta pantalla estaba fuera hasta ahora:
   * `PeticionDeCierre.declarado` es `{"EFECTIVO": "120.00", …}` con las cinco
   * `FormaDePago`, no cinco campos con nombre fijo (ver `ARQUEO_POR_FORMA_DE_PAGO`).
   *
   * **La caja y el cajero salen del filtro**, no del formulario: el catálogo los
   * dibuja `"ro"` —el prototipo capturó un cliente de escritorio donde los dos
   * venían de la sesión— y los dos son obligatorios en el cuerpo, porque con la
   * fecha forman la clave del turno (`cierre_uq`, V3). Se preguntan en el bloque
   * de búsqueda que compone `tesoreria/composicion.ts`, que es además de donde
   * sale el arqueo en vivo contra el que se cuadra antes de firmar.
   *
   * Lo que **no** viaja, y por qué:
   *
   * - `turno` (MAÑANA / TARDE / CONTINUO): **no existe como dato**. `cierre_uq`
   *   hace único el turno por (caja, cajero, fecha) y no hay columna que lo parta
   *   en dos; el javadoc de `ArqueoResource` lo dice sin rodeos.
   * - `horaDeApertura` y `horaDeCierre`: las pone el servidor —la apertura es
   *   `cierre_caja.fecha_apertura` (V29) y el cierre es el instante del acta—.
   * - `totalDeclaradoS`, `totalSistemaS`, `diferenciaS`, `recibosEmitidos` y
   *   `recibosAnulados`: son el arqueo que calcula `ArqueoDelTurno`. Aquí no se
   *   suma ninguna columna (RNF-083).
   * - `observacionesDelArqueo`: es la misma observación que ya exige `useEscritura`
   *   (regla 10). Dos cajas para lo mismo acabarían con una de las dos vacía.
   * - `motivoDeReversion`: **con él la misma ruta reversa el cierre en vez de
   *   firmarlo**, y eso exige además el privilegio de ELIMINACION. Ninguna acción
   *   del catálogo lo pide —«Cuadrar · Imprimir arqueo · Cerrar caja»—, así que
   *   esta pantalla solo cierra.
   *
   * **El arqueo vacío no se rechaza aquí.** Que lo declarado no cuadre con el
   * neto del sistema es exactamente lo que hay que dejar escrito —`CerrarTurno`
   * guarda el descuadre en vez de rechazarlo—, así que la interfaz no exige
   * ninguna cifra: lo que exige son la caja y el cajero, sin los cuales el acto
   * no señala a ningún turno.
   */
  cierre_caja: {
    campos: { fecha: { campo: 'fecha' } },
    mapas: { declarado: ARQUEO_POR_FORMA_DE_PAGO },
    delFiltro: { caja: { campo: 'caja' }, cajero: { campo: 'cajero' } },
    exigir: (_borrador, _filas, delFiltro) => {
      if ((delFiltro['caja'] ?? '').trim() === '') {
        return 'Falta la caja: escribe el código de la ventanilla arriba y pulsa «Buscar». Sin ella el cierre no señala a ningún turno.';
      }
      if ((delFiltro['cajero'] ?? '').trim() === '') {
        return 'Falta el cajero: el turno que se cierra es el suyo, y sin él el arqueo no señala a ninguno.';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Anulación de convenio (RF-085, RF-086, #35, #423): el convenio se cierra y la
   * deuda acogida vuelve a la fase de la que salió.
   *
   * **Su cuerpo lo decide el botón**, y por eso esta pantalla estaba fuera: las
   * tres acciones del prototipo —«Anular», «Reformar», «Quebrar»— son la misma
   * ruta con `accion` distinta, porque para el libro son el mismo acto y lo que
   * cambia es el motivo administrativo (`PeticionDeCierreDeConvenio`). Ver
   * `segunLaAccion` de `OpcionesDeEscritura`.
   *
   * **«Reformar» no se declara**, y no por descuido: `REFORMULACION` exige además
   * el convenio nuevo que sustituye al anterior —`PeticionDeFraccionamiento`
   * entero, con al menos una obligación acogida—, y esta pantalla no dibuja
   * ninguna grilla de deuda; es el mismo hueco por el que `fraccionamiento` está
   * en `ACTOS_SIN_CAMPO`. Declararla mandaría `accion: REFORMULACION` sin
   * `reformulacion`, que es el 422 que el controlador contesta nombrándolo.
   *
   * El número del convenio llega **por la URL** —`/tesoreria/anulacion-convenio/{nro}`,
   * el número impreso que el contribuyente trae—, igual que en la anulación de un
   * recibo: `numConv2` no se declara, porque dos sitios para el mismo número no
   * tienen forma de decidir cuál manda cuando no coinciden.
   *
   * `responsableAnul` y `numAnul` son `"ro"`: el primero lo pone el servidor con
   * quien firma la sesión y el segundo se numera al registrar. `nDeMemorando` no
   * tiene campo en el catálogo. `glosa` es la misma observación que ya pide
   * `useEscritura` (regla 10).
   */
  anulacion_convenio: {
    campos: {
      fechaAnul: { campo: 'fechaAnul' },
      motivo: { campo: 'motivo' },
    },
    segunLaAccion: {
      Anular: { accion: 'ANULACION' },
      Quebrar: { accion: 'QUIEBRE' },
    },
    exigir: (borrador) =>
      (borrador['motivo'] ?? '').trim() === ''
        ? 'Falta el motivo: es el sustento del acto, y el backend lo exige. Sin él no se puede anular ni quebrar el convenio.'
        : undefined,
    nota: true,
  },

  /* ── Tránsito (#77) ────────────────────────────────────────────────── */

  /**
   * Cambio de número de papeleta (`PATCH /transito/papeletas/{numero}/codigo`, RF-067).
   *
   * Vive en `CambioDeNumeroDePapeleta.tsx` (`COMPONENTES_PROPIOS` de `Pantalla.tsx`), no en
   * el renderizador genérico: el catálogo dibuja las acciones de esta pantalla como
   * `["Consultar", "Modificar", "Salir"]` —la última es «Salir», que no escribe nada—, así
   * que conectada tal cual el botón que se habilitaría al escribir la observación sería el
   * de salir de la pantalla. La componente propia trae su propia barra de una acción,
   * «Cambiar número», siempre la primaria.
   *
   * `PeticionDeCambioDeNumero` solo acepta `numeroNuevo`: «Placa Nº»/«Placa nueva» del
   * catálogo no viajan —esta ruta corrige el número de la papeleta, no la placa del
   * vehículo, y `CambioDeNumeroController` no tiene ningún campo para eso—.
   */
  transito_cambio_numero: {
    campos: {
      codPapeletaNueva: { campo: 'numeroNuevo' },
    },
  },

  /**
   * Descargos y reclamos de papeletas (`POST /transito/descargos`, #50, RF-064, #422).
   *
   * **La primera opcion que sale de `ACTOS_SIN_CAMPO` por el mecanismo declarativo**, y no
   * por un componente propio: lo unico que le faltaba era el numero de expediente de mesa
   * de partes —`DescargosController` lo exige y el catalogo lo dibuja `"ro"`, como el del
   * descargo que se esta consultando—, y `transito/composicion.ts` lo declara como un
   * control anadido al final de «Solicitud». Su clave es `nDeExpedienteDeMesaDePartes` y no
   * `nDeExpediente`: esa ya es la del **filtro** con que se busca un descargo registrado, y
   * dos cosas distintas no comparten clave.
   *
   * Y la primaria la pone `LA_QUE_ESCRIBE` (#421): la ultima accion del catalogo es
   * «Notificar al administrado» y la que registra es la primera de las tres. Los dos
   * mecanismos son complementarios —uno dice **cual boton** escribe, el otro **donde** se
   * escribe el dato que le falta—, y esta pantalla necesitaba los dos.
   *
   * **La seccion «Evaluación y resolución» no se declara**, y no por descuido: resolver un
   * descargo es dictar una resolucion de gerencia (`ResolucionesDeGerenciaController`, #50),
   * que es otro acto, otra ruta y otro papel. `PeticionDeDescargo` no tiene ni un campo para
   * el area evaluadora, el numero de resolucion, el sentido del fallo ni el efecto sobre la
   * multa; declararlos aqui los mandaria a un servidor que no los pide.
   *
   * `dentroDelPlazo5DiasHabiles` tampoco: lo calcula el servidor con el plazo parametrizado
   * (regla 5), y es la respuesta la que lo trae. `familia` va por omision a `TRANSITO`, que
   * es de donde manda esta pantalla.
   */
  transito_descargos: {
    campos: {
      papeletaImpugnada: { campo: 'papeleta' },
      nDeExpedienteDeMesaDePartes: { campo: 'nDeExpediente' },
      fechaDePresentacion: { campo: 'fechaDePresentacion' },
      tipoDeRecurso: { campo: 'tipoDeRecurso', valor: tipoDeRecursoDe },
      fundamentoDelAdministrado: { campo: 'fundamento' },
    },
    exigir: (borrador) => faltaEnElDescargo(borrador),
    nota: true,
  },

  /**
   * Generación masiva de valores de tránsito (`POST /transito/valores/generacion-masiva`,
   * #53, RF-066, RF-073).
   *
   * Vive en `GeneracionMasivaDeValoresDeTransito.tsx` (`COMPONENTES_PROPIOS`), por el mismo
   * motivo que `valores_masivo` (#75): la última acción del catálogo es «Imprimir», que no
   * escribe nada.
   *
   * Solo «por rango» (`desde`/`hasta`): el catálogo no dibuja ningún campo de lista o de
   * selección múltiple de papeletas —«Papeleta» es un único campo de texto, en la sección
   * «Recaudo / papeletas», que no basta para construir el arreglo `papeletas[]` que la otra
   * mitad del contrato (`porSeleccion`) exige—. `IniciarCorridaDeValores` rechaza con 422 si
   * llegan los dos modos a la vez o ninguno, así que `papeletas` sencillamente no se declara
   * aquí. Las demás secciones del catálogo —«Código de criterio», «Tipo de recaudo»,
   * «Vencimiento», «Oficina»— tampoco: `PeticionDeCorridaDeValores` no tiene ningún campo
   * para ellas, y `GeneracionMasivaDeValoresController` no las lee.
   */
  /**
   * Certificados de numeración y zonificación (`POST /licencias/certificados`, #54, #427).
   *
   * Necesita las **tres** declaraciones de esta onda a la vez, y ninguna sobra:
   *
   *   `LA_QUE_ESCRIBE` (#421)   la última acción del catálogo es «Imprimir
   *                             certificado», que `DE_SALIDA` reconocía **antes**
   *                             de llegar a `ACTOS_SIN_CAMPO`; la que emite es
   *                             «Emitir»
   *   `controles` (#422)        el `nDeRecibo` que el backend exige y ninguna
   *                             sección dibuja
   *   `resolutores` (#422)      el `solicitante`, que es un **código** y la
   *                             pantalla teclea como nombre
   *
   * **Los cinco parámetros urbanísticos no se declaran**, y esa ausencia es la
   * decisión de este issue: son `"ro"` en el catálogo, `Campo.tsx` los bloquea
   * siempre, y el backend espera que los teclee quien atiende leyéndolos del
   * plano de zonificación. Abrirlos sería volver editable lo que el manual
   * dibuja de solo lectura (RNF-080) sin que nadie lo haya decidido; dejarlos
   * cerrados y emitir igual produciría un papel que dice «Este certificado no
   * consigna parámetros urbanísticos» con su correlativo gastado. Así que la
   * pantalla emite los dos tipos que no los llevan y **dice** por qué no emite
   * los otros dos: ver `faltaEnElCertificado`.
   *
   * `fechaDeEmision` tampoco: el catálogo no dibuja ningún campo para ella y el
   * controlador la resuelve con el reloj inyectado. Y `formato` menos aún —la
   * descarga del papel es otra ruta, `POST .../{numero}/impresion`—.
   */
  certificados: {
    campos: {
      tipoDeCertificado: { campo: 'tipoDeCertificado', valor: tipoDeCertificadoDe },
      codigoPredial: { campo: 'codigoPredial' },
      solicitante: { campo: 'solicitante' },
      nDeExpediente: { campo: 'nDeExpediente' },
      nDeRecibo: { campo: 'nDeRecibo' },
    },
    exigir: (borrador) => faltaEnElCertificado(borrador),
  },

  /**
   * Notificación administrativa previa (`POST /infracciones/administrativas/notificaciones`,
   * #47, #428, RF-070).
   *
   * `NotificacionAdministrativaController` exige cuatro cosas —`numero`, `fecha`, `direccion` y
   * `motivo`— y la observación (regla 10); `contribuyenteId`, `predioId` y `plazoDias` son
   * opcionales. Aquí viajan cinco claves y ninguna más:
   *
   *   `numeroCompuesto`      la serie y el número juntos, como el manual los imprime. Lo compone
   *                          `ResolutorDelNumeroDeNotificacion` (#422), y no se puede hacer con
   *                          una traducción: `CampoDelCuerpo.valor` traduce **un** campo
   *   `fechaDeNotificacion`  → `fecha`
   *   `direccionDelPredio`   → `direccion`
   *   `codigoDeInfraccion`   → `motivo`, que es «por qué se notifica». Es lo mismo que el padrón
   *                          publica bajo esa clave, y la «Descripción» de al lado es `"ro"`
   *                          —la deriva el sistema del código, no la teclea nadie—
   *   `plazoDiasHabiles`     → `plazoDias`, entero. Sin él la notificación **no vence nunca**
   *                          (#47 AC3), y eso es una decisión de quien notifica, no un olvido
   *
   * `serie2` entra en `presentacion` —se teclea y **no viaja**: lo que viaja es el compuesto— y
   * `numeroDeLaNotificacion` también, que es lo que el control recuerda de lo tecleado.
   *
   * **Los otros ocho campos del catálogo no se declaran**, así que se dibujan bloqueados: el
   * año —que no entra en el número—, la hora, el infractor, el CIIU, la licencia, el
   * fiscalizador, quién recibió y su documento. `PeticionDeNotificacion` no tiene ni un campo
   * para ellos, y `contribuyenteId`/`predioId` son identificadores internos que ninguna lectura
   * de esta pantalla publica —el «Infractor — código» del manual es el código del padrón, no el
   * `id`—.
   */
  adm_notificacion: {
    campos: {
      numeroCompuesto: { campo: 'numero' },
      fechaDeNotificacion: { campo: 'fecha' },
      direccionDelPredio: { campo: 'direccion' },
      codigoDeInfraccion: { campo: 'motivo' },
      plazoDiasHabiles: { campo: 'plazoDias', entero: true },
    },
    presentacion: ['serie2', 'numeroDeLaNotificacion'],
    exigir: (borrador) => faltaEnLaNotificacion(borrador),
    nota: true,
  },

  /**
   * Generación masiva de valores administrativa
   * (`POST /infracciones/administrativas/valores/generacion-masiva`, #53, #428, RF-073).
   *
   * La gemela exacta de `transito_valores` —el mismo caso de uso con otra `Familia`, en el mismo
   * `GeneracionMasivaDeValoresController`— y por eso declara lo mismo: sólo «por rango»
   * (`desde`/`hasta`). El catálogo no dibuja ninguna lista ni ninguna selección múltiple de
   * papeletas —«Papeleta» es un único campo de texto—, que es lo que el otro modo del contrato
   * (`papeletas[]`) exigiría, y `IniciarCorridaDeValores` rechaza con 422 si llegan los dos modos
   * o ninguno.
   *
   * **Y a diferencia de su gemela, ésta no necesita componente propio**: la última acción del
   * catálogo es «Imprimir», pero desde #421 `LA_QUE_ESCRIBE` declara «Procesar» —la que lanza la
   * corrida— y la pasa al final. `transito_valores` vive en `COMPONENTES_PROPIOS` porque #77 es
   * anterior a ese mecanismo.
   *
   * Las demás secciones del catálogo no se declaran: `PeticionDeCorridaDeValores` no tiene ningún
   * campo para el código de criterio, el tipo de recaudo, el vencimiento ni la oficina, y
   * `fechaCriterio` —la fecha a la que se evalúa la deuda— la resuelve el servidor con su reloj
   * cuando no viene.
   */
  adm_valores: {
    campos: {
      fecInicio: { campo: 'desde' },
      fecFin: { campo: 'hasta' },
    },
    exigir: (borrador) => {
      if ((borrador['fecInicio'] ?? '').trim() === '' || (borrador['fecFin'] ?? '').trim() === '') {
        return 'Elige la fecha de inicio y la fecha de fin del rango de papeletas.';
      }
      return undefined;
    },
  },

  /**
   * La caja tributaria (`POST /tesoreria/caja/cobranza`, #33, #430, RF-080).
   *
   * **Es la primera pantalla del sistema desde la que entra dinero**, y por eso lo que NO
   * declara importa tanto como lo que declara. Viajan cinco cosas y ninguna más:
   *
   *   `medioDePago`      → `formaDePago`. Es el control añadido de `tesoreria/composicion.ts`,
   *                        no el campo homónimo del catálogo: ver allí
   *   `caja`, `cajero`   los dos controles que identifican el turno
   *   `codContribuyente` **del filtro**, que es donde la pantalla lo pregunta
   *   `obligaciones`     las filas marcadas, con las cuatro claves que
   *                      `PeticionDeObligacion` declara. `ejercicio`, `predioId` y `vehiculoId`
   *                      van `entero: true`: son `Integer`/`Long` en el cuerpo, y #73 ya midió
   *                      lo que cuesta mandar un identificador como cadena
   *
   * **Y los trece campos que el catálogo dibuja y no se declaran se dibujan bloqueados**, que
   * es lo que `Formulario` hace con lo que no está en la lista blanca. Dos de ellos merecen
   * decirse porque parecen justo lo que no son:
   *
   *   «Forma de pago»       es el `tipoDePago` del backend, no el medio. De sus nueve opciones
   *                         sólo dos llegarían a cobrar —NORMAL TRIBUTARIO y PRECONVENIO—: «A
   *                         CUENTA» ni siquiera existe con ese nombre en el enumerado
   *                         (`A_CUENTA`), y las otras seis tampoco. Mandarlo sería un 422
   *                         después de confirmar un cobro
   *   «Beneficio aplicable» sus cuatro campañas son **ordenanzas que el prototipo inventó**, y
   *                         el campo se guarda verbatim en `recibo.campania_beneficio`, que es
   *                         papel firmado. Su efecto sobre el importe está bloqueado por D-02b
   *
   * Los once de «Filtros de deuda» tampoco: `consulta_deuda` sólo acepta `codContribuyente`,
   * `fechaDeCorte`, `fase` e `incluyeConvenios`.
   *
   * `tipoDePago` no se declara y **por omisión el backend usa NORMAL**, que es el cobro
   * corriente de ventanilla; `fechaDePago` tampoco, y la resuelve el reloj del servidor
   * (regla 9: la deuda se relee a esa fecha, no a la de este navegador).
   */
  caja_tributaria: {
    campos: {
      medioDePago: { campo: 'formaDePago' },
      caja: { campo: 'caja' },
      cajero: { campo: 'cajero' },
    },
    delFiltro: { codContribuyente: { campo: 'codContribuyente' } },
    tablas: {
      obligaciones: {
        campo: 'obligaciones',
        columnas: {
          tributo: { campo: 'tributo' },
          ano: { campo: 'ejercicio', entero: true },
          predioId: { campo: 'predioId', entero: true },
          vehiculoId: { campo: 'vehiculoId', entero: true },
        },
      },
    },
    exigir: (borrador, filas, delFiltro) => faltaEnLaCobranza(borrador, filas, delFiltro),
    nota: true,
  },

  transito_valores: {
    campos: {
      fecInicio: { campo: 'desde' },
      fecFin: { campo: 'hasta' },
    },
    exigir: (borrador) => {
      if ((borrador['fecInicio'] ?? '').trim() === '' || (borrador['fecFin'] ?? '').trim() === '') {
        return 'Elige la fecha de inicio y la fecha de fin del rango de papeletas.';
      }
      return undefined;
    },
  },

  /* ── Coactiva: las ocho escrituras del módulo (#426) ────────────────────
     Las doce opciones tenían `Controller` desde #40–#42 y ninguna de las ocho
     escribía. Lo que faltaba no era backend sino tres cosas distintas, y por eso
     hicieron falta tres issues: cuál botón guarda (#421), dónde se escribe un
     campo que el manual no dibuja (#422, y aquí son cinco controles) y de dónde
     salen las filas que se marcan (#332, con una lectura nueva). El motivo
     opción por opción está en `pantallas/coactiva/index.ts`. */

  /**
   * Importación de valores a coactiva (`POST /coactiva/expedientes/importacion`,
   * #40, RF-100).
   *
   * **Abre el expediente del contribuyente que se buscó arriba.** `codContribuyente`
   * es obligatorio y ninguna sección lo dibuja: la pantalla lo pregunta una sola
   * vez, en el filtro «Contribuyente», y de ahí pasa al cuerpo (`delFiltro`, el
   * mecanismo de `cierre_caja`). Declararlo también como campo daría dos cajas
   * para el mismo dato y ninguna forma de decidir cuál manda.
   *
   * **Lo que no viaja, y por qué.** `numero` y `ano` son el número del expediente,
   * y **lo compone el servidor** sobre su correlativo (`PlantillaDeNumeroDeExpediente`,
   * D-09): dejar teclearlo sería dejar elegir el número de una carpeta oficial.
   * `observaciones` es la observación de la regla 10, que `useEscritura` ya pide.
   * Los cuatro campos de «Detalle de Recaudos» son `"ro"`.
   *
   * `valores` **tampoco se declara**, y ahí no falta nada: `PeticionDeImportacion`
   * lo admite vacío, y vacío significa «todos los del contribuyente que tengan
   * pase a coactiva» —que es lo que `ImportarValoresACoactiva.candidatos` busca—.
   * La nota lo dice, porque la columna «Seleccione» de la tabla sigue sin filas.
   */
  importacion_valores: {
    campos: {
      ejecutor: { campo: 'ejecutor' },
      auxiliar: { campo: 'auxiliar' },
      asunto: { campo: 'asunto' },
      direccionReferencialDelContribuyente: { campo: 'direccionReferencialDelContribuyente' },
    },
    delFiltro: { contribuyente: { campo: 'codContribuyente' } },
    exigir: (borrador, _filas, delFiltro) => {
      if ((delFiltro['contribuyente'] ?? '').trim() === '') {
        return 'Busca al contribuyente arriba: la importación abre SU expediente, y sin él el backend no sabe de quién.';
      }
      if ((borrador['ejecutor'] ?? '').trim() === '' || borrador['ejecutor'] === NO_ESPECIFICADO) {
        return 'Elige el ejecutor coactivo: es quien dirige el procedimiento, y el expediente no se abre sin él.';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Impresión de la resolución de ejecución coactiva
   * (`POST /coactiva/rec/impresion`, #41, RF-101).
   *
   * La tabla la llena `coactiva_expedientes` (ver la conexión) y lo marcado viaja
   * en `expedientes[]` por su número impreso: `columnaUnica`, porque
   * `PeticionDeRec.expedientes` es una `List<String>` y no una lista de objetos.
   *
   * **`rec` va como constante y no como campo**, y es lo que impide el defecto que
   * este issue encontró: `ActoCoactivoController.recDe` acepta `«CARATULA»` y la
   * mapea a `REC1` —en `TipoDeActoCoactivo` no existe ninguna constante para la
   * carátula—, así que un botón rotulado «Carátula» que mandara ese valor
   * **dictaría la REC-1**: un acto irreversible que se notifica al obligado, bajo
   * un rótulo que promete un papel. Esta pantalla emite la REC-1 y punto; ver la
   * nota y `coactiva/index.ts` para lo que se queda fuera y por qué.
   *
   * **`proyectarInteresAl` no se declara**, y es deliberado (#425): es un filtro
   * del catálogo que el contrato declara `in: query`, así que `parametrosDeBusqueda`
   * lo manda solo por la consulta. Ponerlo además en el cuerpo es lo que el AC
   * pide no hacer.
   */
  rec_impresion: {
    // Ningun campo del formulario viaja: los doce que el catalogo dibuja son
    // «ro» o son el filtro. Lo que se manda son los expedientes marcados.
    campos: {},
    tablas: {
      expedientes: {
        campo: 'expedientes',
        columnaUnica: 'numero',
        columnas: { numero: { campo: 'numero' } },
      },
    },
    constantes: { rec: 'REC1' },
    exigir: (_borrador, filas) =>
      (filas['expedientes'] ?? []).length === 0
        ? 'Marca al menos un expediente: la REC se emite sobre los que elijas, y sin ninguno el backend responde que no se marcó ninguno.'
        : undefined,
    nota: true,
  },

  /**
   * Historial del expediente (`PATCH /coactiva/expedientes/{numero}/estados`,
   * #40, RF-100).
   *
   * **La única de las ocho que se conecta con `escrituras.ts` a secas**: todos los
   * campos que el cuerpo exige los dibuja el catálogo, y lo único que hacía falta
   * era que la primaria fuera «Guardar cambios» y no «Limpiar» (#421).
   *
   * `nuevoEstado` viaja tal cual, sin tabla de traducción, y no por comodidad:
   * `EstadoDelExpediente.porNombre` reconoce «011 — REC 01 EMITIDO» tal como lo
   * manda el desplegable —se queda con el código— además del nombre del enum y de
   * la etiqueta del manual. Traducirlo aquí sería una segunda tabla que habría
   * que mantener en dos sitios.
   *
   * Ojo con las dos claves parecidas: `motivo2` es la de la sección «Nuevo estado»
   * y `motivo` a secas es la del historial, que es `"ro"`.
   *
   * **`activo2` no se declara, y el `record` explica por qué**: el movimiento que
   * rige es el último y eso se **deriva**. Admitirlo dejaría marcar como vigente un
   * estado que no es el último. `observaciones2` es la observación de la regla 10.
   *
   * **El expediente sale de la dirección** (`{numero}` en la ruta), como el recibo
   * de `anulacion_recibo`: declararlo dejaría dos sitios para el mismo número y
   * ninguna forma de decidir cuál manda cuando no coincidan.
   */
  expediente_historial: {
    campos: {
      nuevoEstado: { campo: 'nuevoEstado' },
      motivo2: { campo: 'motivo' },
      documentoDeRespaldoFecha: { campo: 'documentoDeRespaldoFecha' },
      documentoDeRespaldoNumero: { campo: 'documentoDeRespaldoNumero' },
    },
    exigir: (borrador) => {
      if ((borrador['nuevoEstado'] ?? '').trim() === '') {
        return 'Elige el estado al que pasa el expediente: es lo que el historial registra.';
      }
      if ((borrador['motivo2'] ?? '').trim() === '') {
        return 'Falta el motivo del cambio: el backend lo exige, y es lo que explica el paso en el historial (RNF-052).';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Cambio de dirección referencial
   * (`PATCH /coactiva/expedientes/{numero}/direccion-referencial`, #40, RF-100).
   *
   * `motivo` lo llena el control declarado en `coactiva/composicion.ts` (#422): la
   * sección «Nueva dirección» dibuja tres campos y ninguno es él.
   *
   * **«Hab. Urbana» y «Vía» no viajan.** `PeticionDeDireccionReferencial` no tiene
   * ningún campo para ellas: son ayudas para componer la dirección que se escribe
   * debajo, y mandarlas sería inventarse dos columnas. El domicilio fiscal y la
   * dirección referencial actual son `"ro"` a propósito —lo dice el javadoc del
   * `record`—: la anterior no se borra, porque es la que explica a dónde fueron
   * las notificaciones anteriores.
   */
  cambiar_direccion_ref: {
    campos: {
      nuevaDireccionReferencial: { campo: 'nuevaDireccionReferencial' },
      motivoDelCambio: { campo: 'motivo' },
    },
    exigir: (borrador) => {
      if ((borrador['nuevaDireccionReferencial'] ?? '').trim() === '') {
        return 'Escribe la dirección nueva: es a donde irán las notificaciones del expediente a partir de ahora.';
      }
      if ((borrador['motivoDelCambio'] ?? '').trim() === '') {
        return 'Falta el motivo del cambio: el backend lo exige, y queda en el historial del expediente (RNF-052).';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Liquidación de costas procesales (`POST /coactiva/liquidaciones-costas`,
   * #42, RF-104).
   *
   * **`nroExpedCoact` sale del filtro**, que es donde el catálogo ya lo dibuja, y
   * viaja por los dos sitios a la vez: `parametrosDeBusqueda` lo manda por la
   * consulta —el contrato lo declara `in: query` desde #425— y `delFiltro` lo pone
   * además en el cuerpo. **No incumple el AC de #425**: el javadoc de
   * `ParametrosDeLaConsultaTest.POR_LA_CONSULTA` dice que aceptarlo también en el
   * cuerpo no es un incumplimiento, y `FiltroDeLaConsulta.primeroNoVacio` deja
   * claro cuál gana. Lo que se gana declarándolo es lo único que apaga la
   * primaria: `Conexion.exige` apaga **la lectura**, no el botón, así que sin esto
   * «Guardar» se encendería con solo la observación y el `POST` saldría sin
   * expediente —un 422 después de rellenar y confirmar, que es exactamente el 422
   * tardío que `exigir` existe para impedir—.
   *
   * **Ningún importe viaja, y no falta ninguno.** `montoS` y `totalS` los pone el
   * **arancel de costas** (regla 5, D-02c): con la ordenanza sin cargar el backend
   * responde 422 nombrando la llave, que es lo correcto. `tributo` tampoco: la
   * costa se imputa siempre a COSTAS PROCESALES —`LiquidacionDeCostas#TRIBUTO`— y
   * «GASTOS DE EJECUCIÓN» se queda fuera a propósito.
   *
   * `actos` **no se declara**: vacío significa «todos los actos pendientes que el
   * arancel tarife», que es lo que la pantalla ofrece.
   */
  costas_procesales: {
    campos: { fecha: { campo: 'fecha' } },
    delFiltro: { nroExpedCoact: { campo: 'nroExpedCoact' } },
    exigir: (_borrador, _filas, delFiltro) =>
      (delFiltro['nroExpedCoact'] ?? '').trim() === ''
        ? 'Escribe arriba el Nro. de expediente coactivo cuyas costas se liquidan: sin él la liquidación no señala a ningún procedimiento.'
        : undefined,
    nota: true,
  },

  /**
   * Registro de actos coactivos (`POST /coactiva/expedientes/{numero}/actos`,
   * #41, RF-102).
   *
   * `tipo` lo llena el control de `coactiva/composicion.ts` (#422), y ahí está
   * escrito por qué no puede salir del desplegable «Documento».
   *
   * Ojo con las dos claves parecidas: `glosaDelActo` es la de la sección «Actos
   * administrativos» —la que el documento imprime— y `glosa` a secas es el área de
   * «Medida cautelar». Declararla mal es exactamente la mutación con la que #76
   * demostró que la barra cambiaba de botón.
   *
   * **La sección «Medida cautelar» entera no viaja**, y no es un olvido:
   * `PeticionDeActoCoactivo` no tiene ningún campo para el número del embargo, su
   * fecha, su monto, su domicilio, el bien, lo retenido ni la entidad financiera.
   * Su único campo `medida` es la **forma** del embargo —retención, inscripción,
   * depósito, intervención—, que no es ninguna de esas siete y que solo la REC-2
   * exige. `referencia`, `nDoc` y `nombreDeArchivo` tampoco tienen destino.
   */
  actos_coactivos: {
    campos: {
      tipoDeActoCoactivo: { campo: 'tipo' },
      glosaDelActo: { campo: 'glosa' },
      fecDoc: { campo: 'fecha' },
    },
    exigir: (borrador) => {
      if ((borrador['tipoDeActoCoactivo'] ?? '').trim() === '') {
        return 'Elige qué acto del procedimiento se dicta: el backend lo exige, y no se deduce del tipo de documento.';
      }
      if ((borrador['glosaDelActo'] ?? '').trim() === '') {
        return 'Falta la glosa del acto: es el texto que se imprime en el documento que se emite.';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Emisión de notificaciones coactivas (`POST /coactiva/notificaciones`,
   * #41, RF-103).
   *
   * **Dos desplegables, dos campos del cuerpo, dos tablas de traducción.** Es el
   * mismo reparto que `notificacion_valores` y por el mismo motivo: `recibidoPor`
   * responde **cómo** se diligenció y `tipoDeNotificacion` responde **con qué
   * resultado**, que son los dos ejes que `ModalidadDeNotificacion` y
   * `ResultadoDeNotificacion` separan. Cada tabla colapsa su desplegable en las
   * palabras del enum, y una opción que ninguna reconozca no viaja: eso deja el
   * campo sin poner y el backend lo dice nombrándolo, que es mejor que mandar la
   * palabra más parecida.
   *
   * `acto` lo llena el control de `coactiva/composicion.ts` (#422).
   *
   * **`vinculo` no viaja aunque el prototipo lo sepa**: el vínculo del receptor
   * —«FAMILIAR», «DEPENDIENTE»— sale del mismo desplegable que ya responde la
   * modalidad, y un campo del catálogo llena un campo del cuerpo. El nombre y el
   * documento de quien recibió sí viajan, que es lo que sostiene el acuse.
   *
   * **Lo que no tiene destino**: la serie y el número de la notificación los
   * **numera el servidor**; `nroVisita` es informativo —el intento lo pone el
   * sistema, y `notificacion_intento_uq` existe para que nadie lo repita—; `vence`
   * se **deriva** del plazo parametrizado y del calendario de días hábiles, y
   * admitirlo sería dejar que la petición decidiera desde cuándo se puede
   * embargar; y `representante`, «Con firma», las características de la vivienda y
   * los seis campos de testigos no tienen ningún campo en el `record`.
   */
  notificaciones_coactivas: {
    campos: {
      numeroDelActoNotificado: { campo: 'acto' },
      fecha: { campo: 'fecha' },
      notificador: { campo: 'notificador' },
      domicilio: { campo: 'domicilio' },
      nombreDelReceptor: { campo: 'receptor' },
      dNIDelReceptor: { campo: 'documentoReceptor' },
      recibidoPor: { campo: 'modalidad', valor: modalidadCoactivaDe },
      tipoDeNotificacion: { campo: 'resultado', valor: resultadoCoactivoDe },
    },
    exigir: (borrador) => {
      if ((borrador['numeroDelActoNotificado'] ?? '').trim() === '') {
        return 'Falta el número del acto coactivo que se diligencia: es el documento que se notifica, y sin él la diligencia no cuelga de ninguno.';
      }
      if (modalidadCoactivaDe(borrador['recibidoPor'] ?? '') === undefined) {
        return 'Elige quién recibió la notificación: de ahí sale la modalidad con la que se diligenció.';
      }
      if (resultadoCoactivoDe(borrador['tipoDeNotificacion'] ?? '') === undefined) {
        return 'Elige el tipo de notificación: de ahí sale el resultado de la diligencia, que es lo que sostiene el plazo.';
      }
      if ((borrador['notificador'] ?? '').trim() === '') {
        return 'Falta el notificador: es quien llevó la diligencia, y el acuse lo nombra.';
      }
      return undefined;
    },
    nota: true,
  },

  /**
   * Fraccionamiento coactivo (`POST /coactiva/convenios`, #35, #42, RF-105).
   *
   * **La única de las ocho que no se resolvía con un mecanismo**, y por eso fue la
   * que exigió backend: su cuerpo pide `obligaciones[]` con `tributo`, `ejercicio`
   * y `predioId`/`vehiculoId` **por fila**, y el módulo no publicaba ninguna
   * lectura con esa granularidad —`coactiva_consulta_deudas` es por expediente y ni
   * siquiera desglosa insoluto de interés—. La trae
   * `GET /coactiva/expedientes/{numero}/deuda`, y la tabla la elige con el
   * mecanismo de #332.
   *
   * `nroExpedCoact` y la cuota inicial los llenan los dos controles de
   * `coactiva/composicion.ts` (#422). El primero es además de donde la conexión
   * saca el expediente cuya deuda lee: **un solo sitio**, así que la grilla y el
   * cuerpo no pueden discrepar.
   *
   * **`pagoInicialS` no viaja, y ahí está el defecto que este issue evitó**: el
   * prototipo lo rotula «Pago inicial (S/)» —soles— y `PeticionDeConvenioCoactivo.cuotaInicial`
   * es un **porcentaje** (`Alicuota.de`, 0..100). Atarlos convertiría «20» soles en
   * un 20 % de cuota inicial, una cifra plausible y equivocada que sale impresa en
   * el cronograma que el contribuyente firma.
   *
   * **Lo que tampoco viaja.** «Forma de pago» y «Benef. aplicable» son filtros del
   * prototipo y el `record` no tiene campo para ninguno —el efecto de un beneficio
   * sobre el importe es D-02b (#191), y admitirlo haría creer que se aplica—. Los
   * seis campos `"ro"` de «Resultado del convenio» son el **resultado** que
   * devuelve el servidor, no una entrada: mandarlos sería dejar que quien atiende
   * escriba la cifra que se va a fraccionar. Y los ocho de «Filtros de deuda»
   * filtran la grilla del prototipo, no el convenio.
   *
   * `simular` **no se declara**: la pantalla tiene una sola acción que escribe y el
   * camino de escritura registra —no simula—. Simular pide su propia puerta
   * (`useSimulacion`), cuya guarda es además la clave literal `simulacion`, que
   * este controlador llama `simular`.
   */
  fraccionamiento_coactivo: {
    campos: {
      nroExpedCoact: { campo: 'nroExpedCoact' },
      cuotaInicialPorcentaje: { campo: 'cuotaInicial' },
      nDeCuotas: { campo: 'nroDeCuotas', entero: true },
    },
    tablas: { obligaciones: OBLIGACIONES_DEL_CONVENIO },
    exigir: (borrador, filas) => {
      if ((borrador['nroExpedCoact'] ?? '').trim() === '') {
        return 'Escribe el Nº del expediente coactivo: el convenio se suscribe sobre una carpeta concreta, y de ahí sale además la deuda que se puede acoger.';
      }
      if ((filas['obligaciones'] ?? []).length === 0) {
        return 'Marca en la tabla las obligaciones que se acogen: un convenio fracciona deuda concreta, no la carpeta entera.';
      }
      if ((borrador['nDeCuotas'] ?? '').trim() === '') {
        return 'Elige el número de cuotas: es lo que define el cronograma que el contribuyente firma.';
      }
      if ((borrador['cuotaInicialPorcentaje'] ?? '').trim() === '') {
        return 'Falta la cuota inicial: el backend la pide como porcentaje de lo acogido, de 0 a 100.';
      }
      return undefined;
    },
    nota: true,
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

/**
 * **Que hace el formulario con este campo del catalogo**, cuando un mapa lo
 * sustituye (#423).
 *
 * Dos respuestas y no una, porque un mapa sustituye a **varios** campos y solo
 * se dibuja una vez:
 *
 *   `{ mapa, nombre }`  este es el primero: aqui van sus filas
 *   `{ }`               este es otro de los sustituidos: no se dibuja nada
 *   `undefined`         no lo sustituye ningun mapa: el campo de siempre
 *
 * Es hermana de `resolutorDeCampo` (`composicion.ts`) y con la misma barrera de
 * `Object.hasOwn` un nivel arriba —`escrituraDe`—: 132 de las 134 opciones no
 * declaran ningun mapa y no se enteran de que esto existe.
 */
export function mapaEnElCampo(
  opcion: string,
  campo: string,
): { readonly nombre: string; readonly mapa: MapaDelCuerpo } | Record<string, never> | undefined {
  const mapas = escrituraDe(opcion)?.mapas;
  if (mapas === undefined) return undefined;
  for (const [nombre, mapa] of Object.entries(mapas)) {
    const donde = mapa.enVezDe.indexOf(campo);
    if (donde === 0) return { nombre, mapa };
    if (donde > 0) return {};
  }
  return undefined;
}
