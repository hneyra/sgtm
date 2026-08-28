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
  // El mismo tributo, escrito corto: es como lo rotula la tabla de deuda de
  // «Baja de deuda», y como lo lista su filtro. Dos rotulos del prototipo, un
  // solo codigo del dominio; inventar un segundo codigo para el mismo tributo
  // partiria el padron en dos.
  ARBITRIOS: 'ARBITRIO',
  'PATRIMONIO VEHICULAR': 'VEHICULAR',
  ALCABALA: 'ALCABALA',
  // Y los codigos del dominio, tal cual. No es redundancia: la tabla de «Baja de
  // deuda» **no sale del prototipo, sale del backend** (`consulta_deuda` publica
  // `tributo` ya en el vocabulario del libro), asi que la fila elegida trae
  // «PREDIAL» y no «IMPUESTO PREDIAL». Sin estas cuatro lineas, el tributo de una
  // baja no viajaria y el backend la rechazaria por un campo que si estaba.
  PREDIAL: 'PREDIAL',
  ARBITRIO: 'ARBITRIO',
  VEHICULAR: 'VEHICULAR',
};

const tributoDe = (texto: string): string | undefined => TRIBUTO_DEL_BACKEND[texto];

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
 * esta en el filtro, no en una columna—.
 *
 * `unidad` y `totalS` **no estan**: la primera es un codigo que el backend no acepta —pide
 * el identificador interno del predio o del vehiculo— y el segundo es una suma que el
 * backend rehace. Ninguna de las dos entra ni en el estado ni en el cuerpo, que es
 * exactamente lo que la lista blanca por columna vino a garantizar.
 */
const CUOTAS_DE_LA_BAJA: TablaDelCuerpo = {
  campo: 'cuotas',
  plana: true,
  columnas: {
    codContribuyente: { campo: 'codContribuyente' },
    tributo: { campo: 'tributo', valor: tributoDe },
    ano: { campo: 'ano' },
    cuota: { campo: 'cuota', entero: true },
    insolutoS: { campo: 'insoluto' },
    interesS: { campo: 'interes' },
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
   * - `unidad` (la columna con el codigo del predio o la placa): el backend pide
   *   `predioId`/`vehiculoId`, identificadores internos, y esta pantalla no resuelve un
   *   codigo contra ellos. Es el mismo hueco que ya tiene `alta_deuda`.
   * - `totalS`: es la suma de insoluto e interes, que el backend rehace. Mandarla seria
   *   dejar que el cliente proponga un total (RNF-083).
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
      if ((primera['codContribuyente'] ?? '').trim() === '') {
        return 'Falta el código de contribuyente: búscalo arriba, porque la baja se registra sobre su cuenta corriente.';
      }
      if ((borrador['nDeResolucion'] ?? '').trim() === '') {
        return 'Falta el documento que sustenta: sin la resolución que la aprueba, una baja de deuda no se puede defender ante nadie.';
      }
      if ((borrador['fechaDeResolucion'] ?? '').trim() === '') {
        return 'Falta la fecha de la resolución: es la fecha con efecto tributario de la baja.';
      }
      return undefined;
    },
    nota: 'La baja registra una obligación por acto: se elige su cuota en la tabla y se repite para las demás. La causal no tiene campo propio en el backend —va en la observación, que es donde queda auditada— y el total a extinguir lo calcula el servidor: aquí no se suma ninguna columna. Una fila cuya cuota es un rango («1-4») viaja sin cuota, que es como el backend expresa «todo el año».',
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
