import { REJILLAS_DE_LA_UNIFICADA } from '@sgtm/lectura';
import type { RejillaDeLaFicha } from '@sgtm/lectura';

/**
 * **Las seis rejillas, el resumen y los lectores viven en `@sgtm/lectura`**
 * (#298). Se reexportan desde aqui para las pruebas y las pantallas que ya los
 * pedian a este archivo.
 *
 * Se movieron al separarse `apps/portal`: el portal del contribuyente dibuja
 * esas mismas seis secciones, con los mismos rotulos y a la misma fecha de
 * calculo (ADR-0016 §3). Lo que se queda aqui es lo que **no** se puede
 * compartir: la tabla de composicion por opcion del catalogo, que es del
 * back-office porque es quien tiene catalogo.
 */
export {
  ESTADO_DE_LA_CONSULTA,
  REJILLAS_DE_LA_UNIFICADA,
  RESUMEN_DE_SALDOS,
  conteoDeLaRejilla,
  fechaDeCorteDe,
  seccionDeLaFicha,
} from '@sgtm/lectura';
export type { RejillaDeLaFicha, SeccionDeLaFicha } from '@sgtm/lectura';

/**
 * **De qué compone la ficha 360°, pestaña a pestaña** (#297, ADR-0016 §2).
 *
 * Aquí no hay ninguna pantalla: hay una tabla de composición, que es lo que el
 * ADR decide. Cada entrada nombra **una opción del catálogo** y de ella salen
 * las cuatro cosas que la pestaña necesita, sin que la ficha invente ninguna:
 *
 *   el rótulo    `opcion.title`, y el de su módulo para la línea «Fuente»
 *   la lectura   su operación del contrato, con los parámetros de aquí
 *   el permiso   el suyo: sin él la pestaña **no se dibuja** (ADR-0016 §2)
 *   la vuelta    su ruta, con el contexto puesto en el filtro
 *
 * El rótulo es el **título** y no la etiqueta del menú: en el menú cada opción
 * está bajo su módulo y «Papeletas» se entiende, pero en una barra donde caen
 * juntas las de Tránsito y las de Infracciones administrativas, «Papeletas» y
 * «Estado de cuenta de papeleta» se leen como la misma cosa. El título del
 * catálogo las separa —«Papeletas de infracción de tránsito» y «Estado de
 * cuenta de papeleta administrativa»— y sigue siendo texto del manual (RNF-080).
 *
 * ── Cada pestaña dibuja una página, y dice cuántas hay ─────────────────────
 *
 * Ninguna pestaña pagina: la ficha no ordena ni pagina, porque las dos cosas son
 * del servidor y su sitio es la opción, con sus filtros y su paginador. Lo que
 * sí hace es **decir cuántas hay** —«20 de 43 deudas»— y dar la salida a la
 * opción que las pagina. Enseñar veinte sin decir que hay cuarenta y tres es lo
 * que hace que alguien se vaya de la ventanilla creyendo que no debe nada más.
 *
 * ── Una pestaña por opción, y no una por rejilla ───────────────────────────
 *
 * `consulta_unificada` publica **seis** rejillas en una sola respuesta —deudas,
 * pagos, altas y bajas, fraccionamientos, valores y declaraciones—, y las seis
 * se dibujan dentro de **una** pestaña, como secciones con su encabezado. Es
 * deliberado: la pestaña es la unidad de permiso, y partir esas seis en seis
 * pestañas prometería seis permisos donde el sistema tiene uno solo. Quien
 * puede leer la unificada las ve las seis; quien no, no ve ninguna.
 *
 * ── Los rótulos son del catálogo, y eso se comprueba ───────────────────────
 *
 * Las columnas se declaran aquí en vez de leerse del catálogo en tiempo de
 * ejecución **para no descargar cuatro módulos** —Consultas, Tránsito,
 * Infracciones y Coactiva son ~40 KB de estructura— por abrir una ficha. Lo que
 * eso podría costar —que un rótulo se reescriba y nadie se entere (RNF-080)— lo
 * cierra `ficha-de-atencion.test.tsx`: compara **cada** columna declarada aquí
 * con la del catálogo de su opción, y una letra distinta la pone roja.
 *
 * ── Lo que no se compone, y por qué ────────────────────────────────────────
 *
 * **Licencias.** Aquí iría su pestaña y no está: `licencia_padron` solo busca
 * por `nombreDelContribuyente`, y componer por nombre abre al homónimo —dos
 * «GARCÍA PÉREZ, JUAN» y la ficha enseñaría la licencia del otro— (ADR-0016 §2).
 * No hay pestaña vacía ni error: hasta que licencias publique búsqueda por
 * código o documento, desde aquí no se compone. Es trabajo de backend, con su
 * issue.
 *
 * **Movimientos del predio.** Es la séptima pestaña que el prototipo dibuja en
 * la unificada y el recurso no la publica: el histórico versionado de una ficha
 * sale por `GET /catastro/fichas/{tipo}/{cod}?historico=true`, que es por predio
 * y no por contribuyente.
 *
 * **El conteo de cada pestaña.** El tablero de diseño pone un número al lado de
 * cada una —«Predios 2», «Papeletas 3»—. No se dibuja: saberlo exige preguntar a
 * las seis lecturas al abrir, que es exactamente lo que ADR-0016 §2 prohíbe
 * («las pestañas consultan al activarse, no al montar»). Un conteo que obliga a
 * consultar no es una etiqueta: es la consulta.
 */

/** El contexto con el que se compone: la persona que se está atendiendo. */
export interface ContextoDeLaFicha {
  /** El código del padrón, que es lo que trae la ruta. */
  readonly codigo: string;
  /**
   * Su número de documento, tal como lo publica `ContribuyenteResource`.
   *
   * Vacío cuando el padrón de personas no se pudo leer, y entonces la pestaña
   * que se compone **por documento** —las papeletas de tránsito— no se dibuja:
   * `documentoDelInfractor` es su única clave (ADR-0016 §2).
   */
  readonly numeroDocumento: string;
}

/** Una tabla del catálogo, tal como la declara su opción. Ver el docblock. */
export interface TablaDeclarada {
  readonly title: string;
  readonly cols: readonly string[];
  readonly num?: readonly number[];
}

/** A dónde lleva una acción con el contexto puesto: a otra de las 134. */
export interface AccionDeLaFicha {
  readonly opcion: string;
  /** El registro va en la ruta: `/consultas/cuenta-corriente/00028314`. */
  readonly registro?: (contexto: ContextoDeLaFicha) => string;
  /** O en el filtro, con los nombres que declara el contrato. */
  readonly filtro?: (contexto: ContextoDeLaFicha) => Readonly<Record<string, string>>;
  /** Lo que hay que saber antes de pulsar. Se dibuja al lado. */
  readonly nota?: string;
}

export interface PestanaDeLaFicha {
  /** La opción del catálogo que compone: rótulo, módulo, operación, permiso y ruta. */
  readonly opcion: string;
  /**
   * Otras opciones cuyo permiso hace falta **además** del suyo.
   *
   * Hoy una: las papeletas se buscan por el documento de la persona, y el
   * documento lo publica el padrón (`contribuyentes`). Sin las dos lecturas la
   * pestaña no se puede componer, y por eso las dos cuentan al decir qué falta.
   */
  readonly tambien?: readonly string[];
  /**
   * Qué dato falta cuando `parametros` devuelve `undefined`, redactado para el
   * aviso. Lo declara la pestaña que puede quedarse sin contexto, para que el
   * aviso no hable del documento cuando lo que faltó sea otra cosa.
   */
  readonly faltante?: string;
  /**
   * Los parámetros con que se pide, o nada si el contexto no da para pedirla.
   *
   * Devolver `undefined` no es lo mismo que devolver `{}`: `{}` pediría el
   * padrón entero de otra persona, y eso en ventanilla es enseñar a alguien las
   * papeletas de un desconocido.
   */
  readonly parametros: (
    contexto: ContextoDeLaFicha,
  ) => Readonly<Record<string, string>> | undefined;
  /** La tabla de su opción, dibujada con las columnas de su catálogo. */
  readonly tabla?: TablaDeclarada;
  /** Las rejillas que salen de la respuesta de la unificada. */
  readonly rejillas?: readonly RejillaDeLaFicha[];
  readonly acciones?: readonly AccionDeLaFicha[];
}

/** Sin código no hay a quién componer: ninguna pestaña sale sin él. */
const conCodigo = (
  contexto: ContextoDeLaFicha,
  parametros: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> | undefined =>
  contexto.codigo === '' ? undefined : parametros;

/**
 * **Las pestañas de la ficha**, en el orden en que se atiende: primero lo que se
 * debe, después lo que se tiene, y al final lo sancionador.
 */
export const PESTANAS: readonly PestanaDeLaFicha[] = [
  {
    opcion: 'consulta_unificada',
    parametros: (contexto) => conCodigo(contexto, { contribuyente: contexto.codigo }),
    rejillas: REJILLAS_DE_LA_UNIFICADA,
    acciones: [
      { opcion: 'cuenta_corriente', registro: (contexto) => contexto.codigo },
      { opcion: 'consulta_deuda', filtro: (contexto) => ({ codContribuyente: contexto.codigo }) },
    ],
  },
  {
    opcion: 'consulta_predios',
    parametros: (contexto) => conCodigo(contexto, { contribuyente: contexto.codigo }),
    tabla: {
      title: 'Predios encontrados',
      cols: [
        'Código predial',
        'Titular',
        'Dirección',
        'Uso',
        'Terreno m²',
        'Const. m²',
        'Autovalúo S/',
        'Deuda S/',
      ],
      num: [4, 5, 6, 7],
    },
    acciones: [
      {
        opcion: 'consulta_fichas',
        filtro: (contexto) => ({ contribuyente: contexto.codigo }),
        nota: 'La ficha catastral de cada predio, con su versión vigente.',
      },
    ],
  },
  {
    opcion: 'consulta_vehiculos',
    parametros: (contexto) => conCodigo(contexto, { contribuyente: contexto.codigo }),
    tabla: {
      title: 'Vehículos encontrados',
      cols: [
        'Placa',
        'Clase',
        'Marca y modelo',
        'Año fab.',
        'Titular',
        'Afectación',
        'Base imponible S/',
        'Deuda S/',
      ],
      num: [6, 7],
    },
    /* **La salida a su propia opción, que es la que pagina.** La ficha dibuja
       la primera página de las que el backend devuelve y no lleva paginador
       —ordenar y paginar son del servidor, y su sitio es la opción con sus
       filtros—, así que sin este enlace quien tenga más vehículos de los que
       caben se queda sin camino hasta los demás. Es el mismo filtro con el que
       la pestaña ya preguntó. */
    acciones: [
      { opcion: 'consulta_vehiculos', filtro: (contexto) => ({ contribuyente: contexto.codigo }) },
    ],
  },
  {
    opcion: 'papeletas',
    // Se compone **por el documento**, que es la única clave que `GET
    // /transito/papeletas` ofrece para una persona: no hay filtro por código de
    // contribuyente. Y el documento lo publica el padrón, así que hacen falta
    // los dos permisos.
    //
    // **Y el documento va sin su tipo, porque el contrato no lo admite.**
    // `PapeletaRepositoryJdbc` resuelve el filtro con `JOIN contribuyente ci …
    // WHERE ci.numero_documento = :documentoInfractor`: compara **el número
    // solo**. Dos personas con el mismo número y distinto tipo de documento
    // —un DNI y un carné de extranjería— entrarían las dos en esta lista, y
    // desde aquí no hay forma de acotarlo. Se anota en vez de fingir que la
    // pestaña filtra por persona: el día que el contrato publique
    // `tipoDocumento`, este es el sitio donde se pone.
    tambien: ['contribuyentes'],
    faltante: 'el número de documento del contribuyente, y el padrón no lo devolvió',
    parametros: (contexto) =>
      contexto.numeroDocumento === ''
        ? undefined
        : { documentoDelInfractor: contexto.numeroDocumento },
    tabla: {
      title: 'Papeletas encontradas',
      cols: [
        'Nro. Papeleta',
        'Fecha',
        'Placa',
        'Infractor',
        'Código',
        'Gravedad',
        'Multa S/',
        'Estado',
      ],
      num: [6],
    },
    acciones: [
      {
        /* **El número de documento acaba en la barra de direcciones, y es una
           decisión, no un descuido.** `conductor` es el filtro que el contrato
           declara para `GET /transito/estado-cuenta` y viaja como viaja
           cualquier filtro de las 134: en la consulta de la URL, igual que
           `codContribuyente` en las otras cinco acciones y que `codRefCatastral`
           en el enlace del predio del inicio. La dirección es además lo que
           hace que la pantalla se pueda compartir y volver a abrir.

           **Y no se va más lejos que eso**: no se guarda —las atenciones
           recientes viven en memoria y se olvidan al cerrar sesión
           (`atenciones.ts`)—, no se manda a ningún registro y no se escribe en
           `localStorage`. Quien no tenga el permiso de la opción de destino no
           ve siquiera el enlace. Ocultarlo aquí —un identificador opaco, una
           redirección— exigiría que el backend publicara otra forma de
           preguntar, y hoy publica esta. */
        opcion: 'transito_estado_cuenta',
        filtro: (contexto) => ({ conductor: contexto.numeroDocumento }),
      },
      {
        // **El acto que esta ficha no hace, y el ejemplo de por qué.**
        // «Registrar descargo» es una escritura —`POST /transito/descargos`— con
        // su observación obligatoria (regla 10), y componerla aquí exigiría
        // declararla en `escrituras.ts` y abrir un formulario que esta ficha no
        // tiene. El enlace lleva a su opción, que ya dice con su franja lo que
        // puede y lo que no. Ninguna escritura fuera de `useEscritura`
        // (ADR-0016 §2).
        opcion: 'transito_descargos',
        nota: 'El descargo se registra en su opción, con su observación obligatoria.',
      },
    ],
  },
  {
    opcion: 'adm_estado_cuenta',
    parametros: (contexto) => conCodigo(contexto, { codContribuyente: contexto.codigo }),
    tabla: {
      title: 'Detalle de la deuda',
      cols: [
        'Concepto',
        'Cuota',
        'Vencimiento',
        'Insoluto S/',
        'Interés S/',
        'Gastos S/',
        'Total S/',
      ],
      num: [3, 4, 5, 6],
    },
    acciones: [
      {
        opcion: 'adm_notificaciones_contribuyente',
        filtro: (contexto) => ({ codContribuyente: contexto.codigo }),
      },
    ],
  },
  {
    opcion: 'coactiva_expedientes',
    parametros: (contexto) => conCodigo(contexto, { codContribuyente: contexto.codigo }),
    tabla: {
      title: 'Expedientes activos',
      cols: [
        'Expediente',
        'Contribuyente',
        'Valores',
        'Deuda S/',
        'Costas S/',
        'Medida cautelar',
        'Estado',
      ],
      num: [2, 3, 4],
    },
    /* La misma salida que la de vehículos, y por lo mismo: una persona con más
       expedientes de los que la primera página trae necesita llegar a los
       demás, y quien pagina es la opción. */
    acciones: [
      {
        opcion: 'coactiva_expedientes',
        filtro: (contexto) => ({ codContribuyente: contexto.codigo }),
      },
    ],
  },
];
