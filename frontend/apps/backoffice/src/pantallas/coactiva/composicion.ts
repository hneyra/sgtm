import type { ComposicionDeOpcion } from '../composicion';

/**
 * Lo que las pantallas de Coactiva componen alrededor de los diez bloques
 * comunes (#426).
 *
 * Aquí viven las dos mitades de lo que a las ocho escrituras del módulo les
 * faltaba y que #421 no podía dar —aquel issue resolvió **cuál botón guarda**, y
 * este resuelve **con qué se guarda**—:
 *
 *   `controles`   los cinco campos que el acto exige y **ninguna sección del
 *                 manual dibuja** (#422). Cada uno con su etiqueta propia
 *                 (RNF-080) y su ayuda: el prototipo capturó pantallas de
 *                 escritorio donde ese dato venía de la sesión, de otra ventana
 *                 o de un papel que el operador tenía delante
 *   `seleccion`   las dos tablas que eligen filas, y lo elegido viaja en el
 *                 cuerpo (#332). Hasta este issue no se podía declarar ninguna
 *                 porque **las tablas no tenían filas**: la operación de las dos
 *                 opciones es un `POST`, y una operación que escribe no se pide
 *                 al abrir la pantalla. Las filas las traen ahora dos lecturas
 *                 conectadas bajo su clave, en `coactiva/index.ts`
 *
 * Y una tercera cosa que no es de escritura y sí de honestidad:
 * `filtrosBloqueados` sobre el «Estado» de la liquidación de costas, que ofrece
 * cuatro valores de los que el sistema solo sabe calcular dos.
 */
export const COMPOSICION_DE_COACTIVA: Readonly<Record<string, ComposicionDeOpcion>> = {
  /**
   * La puerta al historial, desde el expediente que se está mirando (#426).
   *
   * «Historial del expediente» se abre por el número en la dirección —así lo
   * declara su ruta, `PATCH /coactiva/expedientes/{numero}/estados`— y hasta
   * ahora no había forma de llegar a ella salvo pegando el enlace: la tabla no
   * convierte su primera celda en enlace, y esta pantalla es la única del módulo
   * que ya tiene un expediente abierto.
   *
   * **Una puerta y no tres.** `ComposicionDeOpcion.acto` admite un destino por
   * opción, y las otras dos que se abren igual —«Registro de actos coactivos» y
   * «Cambiar dirección referencial»— siguen sin la suya. Se elige el historial
   * porque es el que se usa desde aquí: quien mira el proceso es quien anota que
   * cambió de estado.
   */
  proceso_coactivo: {
    acto: {
      etiqueta: 'Gestionar el historial',
      rutaDe: (codigo: string): string =>
        `/coactiva/expediente-historial/${encodeURIComponent(codigo)}`,
    },
  },

  /**
   * La REC se emite sobre los expedientes que se marcan (#41, RF-101).
   *
   * La tabla «Expedientes pendientes de pago a imprimir» la llena
   * `coactiva_expedientes` —la misma lectura que dibuja la grilla de la opción
   * de ese nombre—, y lo marcado viaja en `expedientes[]` por su número
   * impreso, que es lo único que `PeticionDeRec` pide de cada uno.
   */
  rec_impresion: {
    /* Dos de los cuatro filtros del prototipo **no tienen a donde ir**: la
       lectura que llena la grilla —`GET /coactiva/expedientes`— acepta numero,
       contribuyente, ejecutor y estado, y ni el tipo de deuda ni el año estan
       entre ellos. Dejarlos vivos es un filtro que se teclea y no filtra, que es
       lo que #397 cerro en Infracciones. El tercero, «Contribuyente», si filtra:
       lo traduce la conexion. Y el cuarto, «Proyectar interes al», **no es de la
       grilla**: es el dia al que se proyecta la deuda que se imprime, y viaja
       con la emision (#425). */
    filtrosBloqueados: ['tipoDeDeuda', 'ano'],
    seleccion: {
      tabla: 'expedientes',
      una: 'expediente',
      varias: 'expedientes',
      genero: 'masculino',
    },
  },

  /**
   * El acto coactivo que se dicta, que **no es el papel que lo materializa**.
   *
   * El desplegable «Documento» del prototipo ofrece cinco tipos de papel
   * —«RESOLUCIÓN COACTIVA», «OFICIO DE EMBARGO», «ACTA DE EMBARGO», «CARTA»,
   * «NOTIFICACIÓN»— y `PeticionDeActoCoactivo.tipo` pide otra cosa: qué acto del
   * procedimiento se está dictando. Una «RESOLUCIÓN COACTIVA» puede ser una
   * suspensión, un levantamiento o una conclusión, así que traducir el papel al
   * acto sería inventarse la semántica. «Documento» se queda donde está y el
   * acto se pregunta aparte.
   *
   * **`REC1` y `REC2` se quedan fuera de las opciones, y no por olvido**: la REC
   * se emite desde «Impresión de resolución de ejecución coactiva», que es la
   * pantalla que la lista, la proyecta al día elegido y la imprime. Dictarla
   * desde aquí dejaría dos puertas al mismo acto irreversible, y la REC-2
   * exigiría además la forma de la medida cautelar, que esta pantalla tampoco
   * pregunta.
   */
  actos_coactivos: {
    controles: [
      {
        campo: 'tipoDeActoCoactivo',
        etiqueta: 'Acto del procedimiento que se dicta',
        tipo: 'sel',
        opciones: [
          'MEDIDA_CAUTELAR',
          'EMBARGO',
          'TASACION',
          'REMATE',
          'SUSPENSION',
          'LEVANTAMIENTO',
          'CONCLUSION',
          'OTRO',
        ],
        ayuda:
          'Qué acto del procedimiento coactivo se dicta. «Documento» de arriba es el papel con el que se materializa, que es otra cosa: una resolución coactiva puede ser una suspensión, un levantamiento o una conclusión.',
        seccion: 'Actos administrativos',
      },
    ],
  },

  /**
   * La liquidación de costas: su «Estado» ofrece cuatro y el sistema calcula dos.
   *
   * `EstadoDeLaLiquidacion` solo tiene `ACTIVA` y `CANCELADA`, y las dos se
   * **derivan** del libro —una liquidación está cancelada cuando su obligación de
   * costas ya no debe nada—. «N — NOTIFICADA» exigiría diligenciar la
   * liquidación con su acuse y su reintento, y «X — ANULADA» exigiría reversar su
   * cargo con su motivo: los dos son actos, no banderas, y su propio enum lo dice
   * letra por letra. Elegir cualquiera de los dos deja la búsqueda en 422.
   *
   * Se bloquea el filtro entero y no la mitad, a propósito: dejarlo vivo con dos
   * valores buenos y dos malos es peor que decir que no se puede: quien elige
   * «Anuladas» y ve una lista no tiene forma de saber si es la suya.
   */
  costas_procesales: {
    filtrosBloqueados: ['estado'],
  },

  /**
   * Por qué se cambia la dirección referencial del expediente.
   *
   * `PeticionDeDireccionReferencial.motivo` es obligatorio —el backend lo exige
   * con `exigir(peticion.motivo(), "motivo")`— y la sección «Nueva dirección»
   * dibuja tres campos y ninguno es él: «Hab. Urbana» y «Vía» son ayudas para
   * componer la dirección que se escribe abajo. Es el caso más limpio de la
   * primera forma del hueco de `ACTOS_SIN_CAMPO` —lo teclea quien atiende— y el
   * gemelo exacto de `transito_descargos`, que #422 sacó de esa lista por aquí.
   */
  cambiar_direccion_ref: {
    controles: [
      {
        campo: 'motivoDelCambio',
        etiqueta: 'Motivo del cambio',
        tipo: 'area',
        ayuda:
          'Por qué cambia la dirección referencial. Queda en el historial del expediente y la anterior no se borra: es la que explica a dónde fueron las notificaciones anteriores.',
        seccion: 'Nueva dirección',
      },
    ],
  },

  /**
   * El acto coactivo que se está diligenciando.
   *
   * `PeticionDeNotificacionCoactiva.acto` es el número impreso del **documento
   * que se notifica**, y el filtro «Valor Nº» de arriba es el del valor, que es
   * otra cosa: un mismo expediente agrupa varios valores y la REC que se
   * diligencia es una sola. Lo teclea quien atiende leyéndolo del papel que
   * lleva en la mano, que es la primera forma del hueco.
   */
  notificaciones_coactivas: {
    controles: [
      {
        campo: 'numeroDelActoNotificado',
        etiqueta: 'Nº del acto coactivo que se diligencia',
        tipo: 'text',
        ph: 'REC1-2026-000418',
        ayuda:
          'El número impreso del documento que se está notificando. «Valor Nº» de arriba es el del valor, que es otra cosa: el expediente agrupa varios y la resolución que se diligencia es una sola.',
        seccion: 'Notificación',
      },
    ],
  },

  /**
   * El fraccionamiento coactivo: **la única de las ocho que exigió backend**.
   *
   * Sus tres huecos se cierran con tres mecanismos distintos, y conviene verlos
   * juntos porque el issue los confundía en uno:
   *
   *   `obligaciones[]`  no era un campo que faltara, era una **lectura**: el
   *                     cuerpo pide `tributo`, `ejercicio` y
   *                     `predioId`/`vehiculoId` fila a fila, y ninguna lectura
   *                     del módulo tenía esa granularidad. La trae
   *                     `GET /coactiva/expedientes/{numero}/deuda`, y la tabla la
   *                     elige con `seleccion`
   *   `nroExpedCoact`   ninguna sección ni ningún filtro de **esta** pantalla lo
   *                     dibuja —el «Nro. Exped. Coact.» que se le parece es el de
   *                     la liquidación de costas, que es otra opción—. Se
   *                     pregunta con un control, y de ahí salen **las dos cosas**:
   *                     el expediente cuya deuda se lee y el que viaja en el
   *                     cuerpo. Uno solo, y por eso no pueden discrepar
   *   `cuotaInicial`    el backend lo declara **porcentaje** —`Alicuota.de`, de 0
   *                     a 100— y el único campo editable parecido del catálogo es
   *                     «Pago inicial (S/)», que es un importe en soles.
   *                     Mapearlos sería la peor clase de mentira silenciosa:
   *                     teclear «20» soles daría un convenio con 20 % de cuota
   *                     inicial —una cifra plausible y equivocada que sale
   *                     impresa en el cronograma que el contribuyente firma— y
   *                     teclear «500» daría un 422 que nadie entendería. Se
   *                     pregunta aparte, y «Pago inicial (S/)» se queda donde
   *                     está sin viajar
   */
  fraccionamiento_coactivo: {
    controles: [
      {
        campo: 'nroExpedCoact',
        etiqueta: 'Nº del expediente coactivo que se fracciona',
        tipo: 'text',
        ph: 'EXP-2026-000418',
        ayuda:
          'El expediente cuya deuda se acoge. De aquí sale la tabla de abajo y con este mismo número se registra el convenio: el catálogo de esta pantalla no dibuja ningún campo para él.',
        seccion: 'Contribuyente',
      },
      {
        campo: 'cuotaInicialPorcentaje',
        etiqueta: 'Cuota inicial (% de lo acogido)',
        tipo: 'text',
        ph: '20',
        ayuda:
          'El backend pide la cuota inicial como porcentaje de lo acogido, de 0 a 100 — no en soles. «Pago inicial (S/)» de abajo es el importe que el prototipo dibuja y no viaja: el soles lo calcula el servidor sobre la deuda que relee a la fecha de corte.',
        seccion: 'Resultado del convenio',
      },
    ],
    seleccion: {
      tabla: 'obligaciones',
      una: 'obligación',
      varias: 'obligaciones',
      genero: 'femenino',
      /* «Deudas acogidas» es la unica tabla que elige y **no dibuja columna para
         la casilla**: sus trece empiezan en «Año». Ocupar la primera se llevaria
         el ejercicio por delante, que es uno de los cuatro datos con los que
         `PeticionDeObligacionAcogida` identifica lo que se acoge. */
      columnaPropia: true,
    },
  },
};
