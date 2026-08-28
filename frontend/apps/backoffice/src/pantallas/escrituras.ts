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
  /** Las tablas del formulario, con su propia lista blanca por columna. */
  readonly tablas?: Readonly<Record<string, TablaDelCuerpo>>;
  /** Lo guardado cambia el ejercicio de trabajo de la sesion, no solo esta pantalla. */
  readonly cambiaElEjercicio?: boolean;
  /** Aviso que la pantalla muestra antes del formulario, si hace falta explicar algo. */
  readonly nota?: string;
}

/**
 * «Concepto/tributo» del prototipo → el codigo corto que ya usa `determinacion`
 * (`CHECK` de `V2__rentas_y_cuenta_corriente.sql`): `PREDIAL`, `ARBITRIO`,
 * `VEHICULAR`, `ALCABALA`, `ESPECTACULOS`, `ANUNCIOS`, `JUEGOS`.
 *
 * Solo cuatro de las siete opciones del catalogo tienen ese codigo. Las otras
 * tres —«MULTA TRIBUTARIA», «MULTA ADMINISTRATIVA», «DERECHOS
 * ADMINISTRATIVOS»— no son parte del vocabulario de `tributo` en ningun sitio
 * del sistema todavia, y una de ellas ni siquiera entra en las 20 posiciones
 * de la columna (`DERECHOS_ADMINISTRATIVOS` son 24). Inventar un codigo aqui
 * seria una decision de negocio que no le toca a esta pantalla: se devuelve
 * `undefined` y el campo no viaja, igual que si no se hubiera llenado.
 */
const TRIBUTO_DEL_BACKEND: Readonly<Record<string, string>> = {
  'IMPUESTO PREDIAL': 'PREDIAL',
  'ARBITRIOS MUNICIPALES': 'ARBITRIO',
  'PATRIMONIO VEHICULAR': 'VEHICULAR',
  ALCABALA: 'ALCABALA',
};

const tributoDe = (texto: string): string | undefined => TRIBUTO_DEL_BACKEND[texto];

/**
 * Modalidad de notificacion del prototipo → `ModalidadDeNotificacion` (V3, art. 104 del Codigo
 * Tributario). «BUZÓN ELECTRÓNICO» es la unica que no se lee literal: el enum del backend la llama
 * `CORREO` (art. 104 b, medios electronicos con constancia de entrega).
 */
const MODALIDAD_DE_NOTIFICACION_DEL_BACKEND: Readonly<Record<string, string>> = {
  'PERSONAL EN DOMICILIO FISCAL': 'PERSONAL',
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
    nota: 'La contraseña no se escribe aquí y el sistema no la recibe: el cambio lo hace el proveedor de identidad. Al aceptar, queda registrado quién lo pidió y por qué, y se continúa allí.',
  },

  /**
   * Alta de deuda (RF-043, #24, #73): incorpora manualmente una obligacion a la cuenta corriente.
   *
   * `unidadPredioPlaca` no viaja: el backend pide `predioId`/`vehiculoId` como identificador
   * interno, y esta pantalla no resuelve todavia un codigo o una placa contra ese identificador
   * (esa resolucion es la misma que le falta a `transferencia_predio`/`transferencia_vehiculo`).
   * El alta queda a nivel de contribuyente, sin atar la obligacion a una unidad concreta.
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
      insolutoS: { campo: 'insoluto' },
      reajusteS: { campo: 'reajuste' },
      interesS: { campo: 'interes' },
      gastosS: { campo: 'gasto' },
      fechaDeVencimiento: { campo: 'fechaValor' },
      nDelDocumento: { campo: 'documentoOrigen' },
    },
    nota: 'Solo se admiten los tributos con código establecido: predial, arbitrios, vehicular y alcabala. La unidad (predio o placa) y el rango de cuotas todavía no se resuelven aquí: el alta queda a nivel de contribuyente y con una sola cuota.',
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
    nota: 'La hora y la dirección de la diligencia no se guardan todavía: el backend solo pide la fecha (sin hora) y, si no se indica una dirección, usa el domicilio fiscal vigente a esa fecha.',
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
   *
   * El area construida de un piso **nunca** viaja como numero: es una medida decimal y
   * convertirla perderia centimetros (regla 1 aplicada a las medidas).
   */
  registrar_ficha_urbana: {
    campos: {
      codRefCatastral: { campo: 'codRefCatastral' },
      tipoPredio: { campo: 'tipoPredio' },
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

export const escrituraDe = (opcion: string): EscrituraDeclarada | undefined => ESCRITURAS[opcion];

/** Las opciones que declaran escritura. La prueba de la lista blanca las mira. */
export const OPCIONES_QUE_ESCRIBEN = Object.keys(ESCRITURAS);
