/* Datos de muestra del módulo de Fiscalización, copiados literalmente del
   artboard `Fiscalizacion.dc.html`. Nada de esto viaja a ningún backend: es la
   maqueta. El acrónimo de los números de documento es `MDC` —Municipalidad
   Distrital de Catacaos—, que es la entidad del piloto. */

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColDef = [string, 0 | 1];

/* ══════════ El acta de inspección, en cuatro pasos ══════════ */

export type TipoDeCampo = 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';

export type CampoDeActa = {
  k: string;
  l: string;
  t?: TipoDeCampo;
  o?: string[];
  ancho?: boolean;
  ph?: string;
  ayuda?: string;
  /** El largo que el servidor admite, cuando lo tiene. Se corta al teclear. */
  max?: number;
  /**
   * Por que este control **no llega al servidor**, o ausente si si llega.
   *
   * Desde #431 el acta se puede mandar, y eso cambia lo que significa un campo
   * que se teclea y no viaja: hasta entonces no viajaba ninguno —el formulario
   * entero estaba bloqueado y lo decia (#702)—, asi que daba igual. Ahora un
   * control mudo es perdida silenciosa de lo que alguien escribio de pie en la
   * calle, que es el defecto que #331 midio con el rotulo recordado.
   *
   * `PeticionDeActaPredial` es una lista blanca de diez campos y esta pantalla
   * dibuja veintitres controles y siete filas de contraste. Los que sobran no
   * se retiran —el manual los dibuja, y quitarlos seria reescribir su formulario
   * (RNF-080)— y tampoco se doblan dentro de `detalle`, que seria inventarle un
   * formato a un texto libre: se marcan, uno a uno, con el motivo de por que
   * `acta_fiscalizacion` no tiene donde guardarlos.
   */
  noViaja?: string;
};

export type PasoDeActa = {
  label: string;
  nota?: string;
  diff?: boolean;
  cierre?: boolean;
  campos: CampoDeActa[];
};

/**
 * Los cinco valores de `Hallazgo`, **letra por letra y sin traducir** (#431).
 *
 * El desplegable «Hallazgo principal» del manual ofrece seis rotulos y ninguno
 * de los seis coincide con ninguno de estos cinco: los seis contestan «Hallazgo
 * desconocido», medido uno a uno contra el backend. No se traduce ninguno —es
 * el criterio de #427 al negarse a leer «ACTIVA» como `VIGENTE`, y el de #546 y
 * #431 parte B con este mismo desplegable—, asi que la lista es la del
 * enumerado y la ayuda del campo nombra los del manual que quedan fuera.
 *
 * Que sigan siendo los cinco del backend lo comprueba `vocabularios.mjs`, que
 * lee `Hallazgo.java` y esta lista y las compara en las dos direcciones: un
 * valor de mas aqui es un 422 despues de rellenar el formulario, y uno de menos
 * es un hallazgo que la pantalla no deja anotar.
 */
export const HALLAZGOS_DEL_ACTA = ['CONFORME', 'OMISO', 'SUBVALUADOR', 'USO_DISTINTO', 'NO_UBICADO'];

/**
 * Los cuatro valores de `TipoDeFiscalizacion`, **por su nombre** (#49).
 *
 * Aqui, al reves que con el hallazgo, el prototipo y el enumerado SI dicen lo
 * mismo: el artboard de `fisc_historico` ofrece `['CIERTA', 'PRESUNTA', 'DE
 * OFICIO', 'GABINETE']` y el enumerado se escribio a partir de esa lista —«el
 * prototipo manda», dice su javadoc—. La unica diferencia es el espacio de «DE
 * OFICIO», que `porNombre` convierte en guion bajo.
 *
 * Se manda el **nombre** y no la etiqueta, aunque el servidor admita las dos
 * formas, porque es el que la lectura publica: `LiquidacionResource` compone
 * `tipoDeFiscalizacion` con `.name()`, asi que mandar «DE OFICIO» dejaria la
 * fila enseñando `DE_OFICIO` justo debajo del desplegable que dice otra cosa.
 *
 * Medido contra el backend: «DE OFICIO» y «DE_OFICIO» pasan las dos; «INTEGRAL»
 * —el rotulo que uno esperaria de un manual de fiscalizacion— contesta 422
 * «Tipo de fiscalizacion desconocido: 'INTEGRAL'».
 */
export const TIPOS_DE_FISCALIZACION = ['CIERTA', 'PRESUNTA', 'DE_OFICIO', 'GABINETE'];

/**
 * Los cinco valores de `EstadoDeLiquidacion`, **por su nombre** (#49, RF-056).
 *
 * El artboard de `fisc_historico` ofrece exactamente estos cinco escritos como
 * etiqueta —`['ABIERTA', 'EN PROCESO', 'LIQUIDADA', 'NOTIFICADA', 'ANULADA']`—,
 * asi que aqui tampoco hay nada que traducir. Lo que se manda es el nombre
 * (`EN_PROCESO`), por lo mismo que en el tipo: es el que la fila publica.
 *
 * **No confundirlos con los de `EstadoDeActa`**, que comparte cuatro nombres y
 * no es el mismo vocabulario: un acta pasa a `RELIQUIDADA` y `TRANSFERIDA`, que
 * una liquidacion no tiene, y una liquidacion pasa a `EN_PROCESO`, que un acta
 * no tiene. Atarlos seria hacer que renombrar un estado de acta cambiara en
 * silencio a que estado se mueve una liquidacion.
 *
 * Las dos direcciones las comprueba `vocabularios.mjs` leyendo
 * `EstadoDeLiquidacion.java`: un valor de mas es un 422 que nombra lo que quien
 * atiende acaba de elegir de una lista, y uno de menos es un estado al que
 * ninguna liquidacion se puede mover.
 */
export const ESTADOS_DE_LIQUIDACION_DEL_BACKEND = [
  'ABIERTA',
  'EN_PROCESO',
  'LIQUIDADA',
  'NOTIFICADA',
  'ANULADA',
];

/** Lo que los seis rotulos del manual son en el vocabulario del enumerado, para poder decirlo. */
export const HALLAZGOS_DEL_MANUAL_QUE_NO_EXISTEN =
  '«SIN OBSERVACIONES» es CONFORME; «OMISO A LA DECLARACIÓN» es OMISO; «PREDIO SUBVALUADO» y ' +
  '«AMPLIACIÓN NO DECLARADA» son SUBVALUADOR —la causa va en las notas, que están para eso—; ' +
  '«USO DISTINTO AL DECLARADO» es USO_DISTINTO; y «PREDIO INEXISTENTE» cae en NO_UBICADO, porque ' +
  'lo que una visita puede sostener es que no se ubicó, no que el predio no exista.';

/** El paso 2 no lleva campos sueltos: lleva la tabla de contraste, que es el
 *  objeto de la fiscalización. */
export const PASOS_ACTA: PasoDeActa[] = [
  {
    label: 'La visita',
    nota: 'Quién atendió, a qué hora y con qué resultado. Si nadie atendió, el acta se cierra aquí y el predio vuelve a la muestra.',
    campos: [
      {
        k: 'acta',
        l: 'Nº de acta',
        t: 'ro',
        /* Se queda en el guion SIEMPRE, tambien despues de registrarla, y no
           porque falte leerlo: `acta_fiscalizacion` (V4) no tiene ninguna
           columna de numero — el acta se identifica por su identificador
           interno y su version, y `acta_fisc_version_uq` es (programa,
           contribuyente, version). Poner ahi el identificador interno seria
           justo lo que el pie de la tabla de actas advierte: «Nº interno» no es
           el numero del acta. Al registrarla, el acuse dice cual le toco. */
        ayuda: 'El acta no lleva número: se identifica por su identificador interno y su versión dentro del programa.',
      },
      { k: 'programa', l: 'Programa', t: 'ro' },
      { k: 'predio', l: 'Código predial', t: 'ro' },
      { k: 'contribuyente', l: 'Contribuyente', t: 'ro', ancho: true },
      { k: 'fecha', l: 'Fecha de inspección', t: 'date' },
      {
        k: 'hora',
        l: 'Hora',
        t: 'text',
        noViaja: 'acta_fiscalizacion guarda la FECHA de la visita, no su hora: no hay columna donde ponerla.',
      },
      { k: 'fiscalizador', l: 'Fiscalizador', t: 'ro', ayuda: 'Sale del programa, que es donde el manual lo declara.' },
      {
        k: 'atiende',
        l: 'Persona que atiende',
        t: 'text',
        noViaja: 'El acta no tiene columna para quién atendió; si hace falta que conste, va en las notas del paso 3.',
      },
      {
        k: 'vinculo',
        l: 'Vínculo con el predio',
        t: 'sel',
        o: ['PROPIETARIO', 'FAMILIAR', 'INQUILINO', 'ENCARGADO', 'NADIE ATENDIÓ'],
        noViaja: 'Tampoco tiene columna, y no es un vocabulario del sistema: estos cinco rótulos son del manual.',
      },
      {
        k: 'resultado',
        l: 'Resultado de la visita',
        t: 'sel',
        o: ['INSPECCIÓN REALIZADA', 'PREDIO CERRADO', 'SE NEGÓ A LA INSPECCIÓN', 'DIRECCIÓN NO UBICADA'],
        noViaja:
          'No hay columna. Lo más cercano que sí viaja es el hallazgo del paso 3: un predio que no se pudo verificar es NO_UBICADO.',
      },
    ],
  },
  { label: 'La verificación', diff: true, campos: [] },
  {
    label: 'Hallazgos y evidencia',
    nota: 'El hallazgo es lo que sostiene la determinación. La evidencia es lo que la defiende cuando el contribuyente reclama.',
    campos: [
      {
        k: 'hallazgo',
        l: 'Hallazgo principal',
        t: 'sel',
        ancho: true,
        o: HALLAZGOS_DEL_ACTA,
        ayuda:
          'Son los cinco valores que el backend admite, sin traducir. De los seis rótulos del manual: ' +
          HALLAZGOS_DEL_MANUAL_QUE_NO_EXISTEN,
      },
      { k: 'fotos', l: 'Fotografías', t: 'ro', noViaja: 'El acta no guarda adjuntos: no hay dónde subirlos ni operación que los reciba.' },
      { k: 'croquis', l: 'Croquis / georreferencia', t: 'ro', noViaja: 'Lo mismo: no hay adjunto ni columna de georreferencia en el acta.' },
      {
        k: 'obs',
        l: 'Observaciones del fiscalizador',
        t: 'area',
        ancho: true,
        ph: 'Lo que la foto no dice y hay que poder leer en gabinete',
        max: 1000,
        ayuda: 'Viaja como «detalle», hasta 1000 caracteres. No es la observación de quien registra, que va en el paso 4.',
      },
      { k: 'firma', l: 'Firma del administrado', t: 'ro', noViaja: 'No hay captura de firma ni columna que la guarde.' },
      {
        k: 'sinFirma',
        l: 'Se negó a firmar',
        t: 'chk',
        ph: 'Dejar constancia en el acta',
        noViaja: 'Tampoco tiene columna. Para que conste, escríbelo en las observaciones de arriba, que sí viajan.',
      },
    ],
  },
  {
    label: 'Cierre',
    cierre: true,
    campos: [
      {
        k: 'determina',
        l: 'Genera determinación',
        t: 'chk',
        ancho: true,
        ph: 'Derivar a resolución de determinación',
        noViaja:
          'Determinar es otro acto y otra pantalla: «Resultados» lo hace con POST /fiscalizacion/transferencias, sobre la liquidación del acta.',
      },
      {
        k: 'ejercicios',
        l: 'Ejercicios a determinar',
        t: 'sel',
        o: ['2022 — 2026', '2024 — 2026', 'Solo 2026'],
        noViaja: 'Los elige la liquidación, no el acta: el cuerpo del acta no tiene ningún campo de ejercicio.',
      },
      {
        k: 'multa',
        l: 'Multa tributaria',
        t: 'sel',
        o: ['NO APLICA', 'ART. 176º — NO PRESENTAR DECLARACIÓN', 'ART. 178º — DECLARAR CIFRAS FALSAS'],
        noViaja: 'La multa del art. 176 la decide la liquidación a partir de si la declaración se presentó fuera de plazo (D-02a, #198).',
      },
    ],
  },
];

/* ══════════ Declarado contra verificado ══════════ */

/**
 * Una fila de la tabla «Declarado contra verificado».
 *
 * <h2>Lo declarado NO vive aqui, y ese es el cambio de #431</h2>
 *
 * Esta constante llevaba un campo `decl` con las siete cifras de la captura del
 * artboard —210.00 m2 de terreno, 164.50 construidos, «02 - LADRILLO»—, de modo
 * que la columna «Diferencia» restaba contra un predio que no existe; #702 las
 * dejo en blanco. Ahora ni siquiera hay campo donde escribirlas: **lo declarado
 * sale de la fila de la muestra que la pantalla acaba de leer**, y con la red
 * cortada vuelve al guion largo. Un campo aqui seria otra vez un sitio donde
 * escribir a mano lo que tiene que salir del backend.
 *
 * De las siete caracteristicas, la unica con lado declarado publicado es el
 * **area de terreno** (`MuestraResource.areaDeclarada`); las otras seis dicen
 * «—» y por que.
 */
export type Contraste = {
  k: string;
  l: string;
  /** `n` marca las numéricas: ahí la diferencia se calcula. */
  n?: boolean;
  u?: string;
  t?: 'sel';
  o?: string[];
  /** El texto de guía del control cuando es libre. */
  ph?: string;
  /**
   * El largo que el servidor admite, cuando el control es libre.
   *
   * Se corta al teclear y no se descubre en el 422: `usoHallado` es
   * `varchar(60)` —el mismo largo que `ficha_catastral.uso`, que es el lado
   * declarado— y pasarse devuelve «El uso hallado no puede superar 60
   * caracteres» despues de haber rellenado los cuatro pasos.
   */
  max?: number;
  /** El código del manual —MEP, ECS— que acompaña al rótulo. */
  c?: string;
  /**
   * A que campo del cuerpo del acta llega esta fila, o ausente si no llega a
   * ninguno.
   *
   * **De las siete filas viajan dos**, y hay que decirlo donde se teclea: el
   * cuerpo del acta admite `areaHallada` y `usoHallado` y nada mas. Las otras
   * cinco —area construida, numero de pisos, material predominante, estado de
   * conservacion y servicios— son estructura del predio y **ninguna existe
   * todavia en ninguna columna de `acta_fiscalizacion`**, que es el mismo
   * criterio con que el backend se nego a declararlas en su cuerpo: aceptarlas
   * sin tabla dejaria la peticion admitiendo datos que se pierden al guardar.
   *
   * Y `areaHallada` es el area de **terreno**, no la construida. La fila que
   * viaja es «Área de terreno»; poner ahi la construida escribe el numero que
   * no es en el acta que sustenta una determinacion, y ninguna cifra pareceria
   * mal — `MuestraDelPrograma` lo deja escrito y `ComparacionHalladoDeclarado`
   * compara contra el area de terreno del padron.
   */
  viaja?: 'areaHallada' | 'usoHallado';
  /** Por que esta fila no llega al servidor. Va junto al control, no en un pie. */
  noViaja?: string;
};

/** Las siete características que se contrastan. En las numéricas la diferencia
 *  se calcula; en las demás se compara texto. */
export const DIFF: Contraste[] = [
  {
    k: 'usoV',
    l: 'Uso del predio',
    viaja: 'usoHallado',
    /* Texto libre y NO desplegable, y esta medido. `usoHallado` es
       `varchar(60)`, del mismo largo que `ficha_catastral.uso`, que es el lado
       declarado contra el que se compara —con `equalsIgnoreCase`, asi que las
       mayusculas dan igual y las tildes no—. No hay ningun enumerado del que
       computar la lista: el uso es texto libre por municipalidad, y en el
       padron de la 1 los valores son «Casa habitacion», «Panaderia y
       pasteleria», «Taller de ceramica» y «Tienda de artesania» — ninguno de
       los cinco rotulos que el artboard ofrecia. Con esa lista cerrada, toda
       acta que la usara saldria USO_DISTINTO: el hallazgo plausible y
       equivocado, cobrado a quien declaro bien. Es el hueco que #541 midio en
       los filtros `zona` y `uso` de `GET /rentas/arbitrios`, sin la salida que
       alli hubo —rechazar—, porque el uso observado SI es un dato del acta. */
    ph: 'El uso que se observa en campo, como lo diría la ficha',
    max: 60,
  },
  { k: 'terrenoV', l: 'Área de terreno', n: true, u: ' m²', viaja: 'areaHallada' },
  {
    k: 'construidaV',
    l: 'Área construida',
    n: true,
    u: ' m²',
    noViaja: 'El acta guarda UNA superficie y es la de terreno, que es contra la que se compara lo declarado.',
  },
  { k: 'pisosV', l: 'Nº de pisos', n: true, u: '', noViaja: 'No hay columna en el acta.' },
  {
    k: 'mepV',
    l: 'Material predominante',
    c: 'MEP',
    t: 'sel',
    o: ['01 — CONCRETO', '02 — LADRILLO', '03 — ADOBE', '04 — QUINCHA', '05 — MADERA'],
    noViaja: 'No hay columna en el acta. Es estructura del predio y la corrige el catastro, no la inspección.',
  },
  {
    k: 'ecsV',
    l: 'Estado de conservación',
    c: 'ECS',
    t: 'sel',
    o: ['01 — MUY BUENO', '02 — BUENO', '03 — REGULAR', '04 — MALO'],
    noViaja: 'No hay columna en el acta.',
  },
  {
    k: 'serviciosV',
    l: 'Servicios básicos',
    t: 'sel',
    o: ['AGUA, DESAGÜE Y LUZ', 'AGUA Y LUZ', 'SOLO LUZ', 'NINGUNO'],
    noViaja: 'No hay columna en el acta.',
  },
];

/**
 * El acta **en blanco**, que es como abre siempre: lo que se rellena solo sale
 * de la fila de la muestra sobre la que se levanta.
 *
 * Aqui vivia el acta `ACT-2026-00418` entera —su numero, su programa
 * `PF-2026-014`, su predio, su titular, su fiscalizador, sus cuatro fotos y su
 * croquis georreferenciado—, copiada de la captura del artboard y presentada
 * como si fuera un acta abierta. Ninguno de esos valores salia de ninguna
 * lectura: el numero no existe en ninguna municipalidad, el programa no es
 * ninguno del padron, el codigo predial no tiene la forma de un codigo de
 * referencia catastral de este sistema —23 digitos— y la persona no esta en el
 * padron (#702).
 *
 * **Lo que cambia desde #431 es de donde salen los cinco de solo lectura**: de
 * `GET /fiscalizacion/programas` y `GET /fiscalizacion/programas/{id}/muestra`,
 * o sea de dos lecturas de verdad. Con la red cortada vuelven al guion largo,
 * que es la prueba de que ninguno esta escrito aqui. El numero del acta se
 * queda en el guion siempre, y no porque falte leerlo: el acta **no tiene
 * numero** —`acta_fiscalizacion` (V4) no declara esa columna—, se identifica
 * por su identificador interno y su version dentro del programa.
 *
 * Los desplegables siguen abriendo en la opcion vacia: elegir la primera por
 * omision es lo mismo que dibujar un dato que nadie tecleo (#331), y aqui ese
 * dato seria el hallazgo que sostiene una determinacion de oficio.
 */
export const DEFECTOS: Record<string, string | boolean> = {
  acta: '',
  programa: '',
  predio: '',
  contribuyente: '',
  fecha: '',
  hora: '',
  fiscalizador: '',
  atiende: '',
  vinculo: '',
  resultado: '',
  usoV: '',
  terrenoV: '',
  construidaV: '',
  pisosV: '',
  mepV: '',
  ecsV: '',
  serviciosV: '',
  hallazgo: '',
  fotos: '',
  croquis: '',
  obs: '',
  firma: '',
  sinFirma: false,
  determina: false,
  ejercicios: '',
  multa: '',
};

/* ══════════ Panel ══════════ */

/* `KPIS`, `ENTRADA`, `EMBUDO_BASE`, `EMBUDO` y `RUTA` se han ido. `KPIS` eran
   las cuatro cifras de cabecera —«84 de 96 inspeccionada», «63.5 % de
   efectividad», «S/ 214,882 determinados»—, de una captura y no de ninguna
   corrida. El resto era el embudo del
   panel de la maqueta del prototipo —3 418 detectados, y de 96 programados a 38
   notificados— y la ruta del día, con tres predios nombrados por su código
   catastral y su dirección y un motivo de sospecha escrito para cada uno. Ni el
   embudo ni la ruta salían de ningún sitio: se dibujaban iguales en toda
   municipalidad y en todo programa. Se fueron cuando el panel pasó a leer del
   backend. */

/* ══════════ Detección ══════════ */

export type Filtro = { label: string; valor: string; opts: string[] };

export type CruceDeDeteccion = {
  min: string;
  cols: ColDef[];
  filas: string[][];
  nota: string;
  filtros: Filtro[];
  fuente: string;
};

export const DET_PREDIAL: CruceDeDeteccion = {
  min: '820px',
  cols: [['Cod. ref. catastral', 0], ['Titular', 0], ['Condición', 0], ['Valor catastral S/', 1], ['Valor declarado S/', 1], ['Diferencia S/', 1], ['Impuesto omitido S/', 1]],
  filas: [
    ['200601010160020101001', 'REYES CHUNGA, PEDRO', 'Omiso', '96,400.00', '0.00', '96,400.00', '478.40'],
    ['200601010150010101001', 'MEDINA MEDINA, RUFINA (SUC.)', 'Subvaluador', '178,200.00', '132,196.75', '46,003.25', '276.02'],
    ['200601020210070100000', 'CASTILLO PASCUALA, MARÍA E.', 'Subvaluador', '44,800.00', '38,420.00', '6,380.00', '38.28'],
    ['200601030880010101001', 'INVERSIONES DEL NORTE SAC', 'Omiso', '842,000.00', '0.00', '842,000.00', '7,984.40'],
  ],
  nota: 'Un omiso tiene ficha catastral y ninguna declaración jurada. Un subvaluador declaró por debajo del valor catastral verificado. La diferencia no es deuda todavía: lo es cuando una inspección la confirma.',
  filtros: [
    { label: 'Sector', valor: 'Todos', opts: ['Todos', '01', '02', '03', '04', '05'] },
    { label: 'Condición', valor: 'Todas', opts: ['Todas', 'OMISO', 'SUBVALUADOR'] },
    { label: 'Ordenar por', valor: 'Impuesto omitido', opts: ['Impuesto omitido', 'Diferencia de valor', 'Sector'] },
  ],
  fuente: 'Cruce de catastro contra el padrón de rentas · actualización diaria',
};

export const DET_VEHICULAR: CruceDeDeteccion = {
  min: '840px',
  cols: [['Placa', 0], ['Contribuyente', 0], ['Origen', 0], ['Valor declarado S/', 1], ['Valor referencial S/', 1], ['Hallazgo', 0], ['Deuda omitida S/', 1]],
  filas: [
    ['V1H-882', 'CASTILLO PASCUALA, MARÍA E.', 'SUNARP', '0.00', '112,800.00', 'No declarado', '3,384.00'],
    ['B7T-221', 'REYES CHUNGA, PEDRO', 'SUNAT', '38,000.00', '62,400.00', 'Subvaluado', '732.00'],
    ['T4M-119', 'INVERSIONES DEL NORTE SAC', 'MTC', '84,000.00', '84,000.00', 'Conforme', '0.00'],
    ['C2P-704', 'DÍAZ MADRID, JULIO CÉSAR', 'SUNARP', '0.00', '48,200.00', 'Baja indebida', '1,446.00'],
  ],
  nota: 'El valor referencial proviene de la tabla del MEF vigente para el año de fabricación del vehículo. Una baja indebida es un vehículo dado de baja con ejercicios de afectación todavía por correr.',
  filtros: [
    { label: 'Origen del cruce', valor: 'Todos', opts: ['Todos', 'SUNARP', 'SUNAT', 'MTC', 'DECLARACIÓN'] },
    { label: 'Hallazgo', valor: 'Todos', opts: ['Todos', 'NO DECLARADO', 'SUBVALUADO', 'BAJA INDEBIDA', 'CONFORME'] },
    { label: 'Ordenar por', valor: 'Deuda omitida', opts: ['Deuda omitida', 'Placa', 'Origen'] },
  ],
  fuente: 'Cruce del padrón vehicular contra SUNARP, SUNAT y MTC · última importación 11/08/2026',
};

/* ══════════ Programas ══════════ */

/* `PROGRAMAS`, `MUESTRA`, `PROG_RESUMEN` y `MUESTRA_COLS` se han ido.
   `PROGRAMAS` eran tres programas de la maqueta con su fiscalizador y sus
   fechas —«PF-2026-014», «R. Mendoza Cruz»— y `MUESTRA` cuatro predios con su
   titular, su area y su riesgo ya calificado, «MEDINA MEDINA, RUFINA (SUC.)»
   entre ellos: gente inventada bajo la pantalla que decide a quien se visita.
   `PROG_RESUMEN` era el resumen del
   programa de la maqueta del prototipo, con su fiscalizador y su plazo escritos
   dentro, que se dibujaba igual con cualquier programa elegido; las columnas
   iban con él. Se fueron cuando la pantalla pasó a leer del backend, que publica
   el programa que de verdad se abrió. */

/* ══════════ Resultados ══════════ */

/* `RES_POR_ACTA`, `RES_POR_CONTRIB`, `RES_TOTALES`, `VERSIONES` y el tipo
   `TablaDeResultados` se han ido: el bloque entero era la maqueta del prototipo.
   Cuatro actas con su predio, su hallazgo y su deuda omitida al céntimo; cuatro
   cuotas a nombre de una persona; los totales del programa —«S/ 214,882.40
   determinados», «63.5 % de efectividad»—; y el historial de versiones de un
   acta, con la hora y el nombre de quien la corrigió. Ninguna de esas cifras
   venía de ningún sitio, y una deuda determinada no se distingue de la buena al
   leerla. Se fueron cuando los resultados pasaron a leer del backend. */

/* ══════════ Resolución de determinación ══════════ */

/**
 * Las columnas del cuadro de la determinación, con las que el backend publica.
 *
 * <h2>«Interés S/» era una columna que no existe, y ha pasado a «Multa S/»</h2>
 *
 * El artboard rotulaba la quinta columna «Interés S/», y `LineaDeterminadaResource`
 * publica `determinado`, `declarado`, `diferencia`, **`multa`** y `total`: ni un
 * interés. El PDF que el propio servidor emite imprime su cabecera «Multa S/»
 * —comprobado leyendo los bytes de `?formato=PDF`—, así que dejar el rótulo del
 * artboard obligaba a una de dos: pintar la multa del art. 176 bajo una columna
 * que promete intereses, o dejar la columna vacía para siempre y esconder la
 * multa. Las dos son la cifra plausible y equivocada; se corrige el rótulo, que
 * es lo que el papel notificado dice.
 *
 * Y se añade «Condición», que el recurso publica y el artboard no dibuja. Es lo
 * mismo que este módulo ya hizo con la detección de omisos, y por lo mismo: con
 * D-02a abierta las cinco columnas de dinero salen «—» en todas las filas, y
 * una fila que sólo dice el ejercicio no deja ver de qué va la determinación.
 *
 * <h2>Las dos superficies van aparte, y eso lo decidió medir el ancho</h2>
 *
 * Estaban aquí y no caben: con ellas la tabla mide **1 054 px sobre una hoja de
 * 732**, medido en el navegador, así que las cuatro últimas columnas de dinero
 * quedaban fuera del papel y la impresión salía cortada. Y el propio PDF que el
 * servidor emite ya las pone fuera de este cuadro —en su bloque «Inscripción en
 * el padrón catastral», antes → después—, así que se hace lo que hace el papel:
 * su propia tabla debajo, con la unidad en la cabecera (#546).
 *
 * Aquí ya no vive ninguna fila ni ninguna cabecera con valor: la hoja las
 * compone de lo que lee `GET /fiscalizacion/resoluciones/{numero}`. Traía la
 * resolución entera del artboard —«000418-2026-SGFT/MDC», «INVERSIONES DEL
 * NORTE SAC», R.U.C. 20525118447 y seis ejercicios con sus importes al
 * céntimo— y la pantalla la mandaba a la impresora con su membrete, su
 * artículo 137º y sus dos líneas de firma; con la red cortada salía
 * **exactamente igual**, que es la prueba de que ninguna de esas cifras venía
 * de ningún sitio.
 */
export const REP_COLS: ColDef[] = [
  ['Ejercicio', 0],
  ['Condición', 0],
  ['Determinado S/', 1],
  ['Declarado S/', 1],
  ['Diferencia S/', 1],
  ['Multa S/', 1],
  ['Total S/', 1],
];

/** Las superficies que sostienen el hallazgo, en su propio cuadro. */
export const REP_COLS_AREA: ColDef[] = [
  ['Ejercicio', 0],
  ['Superficie declarada (m²)', 1],
  ['Superficie hallada (m²)', 1],
];

/* ══════════ Paleta de comandos ══════════ */

/** Las ocho opciones del manual que el módulo resume, con el destino al que
 *  lleva cada una. `reporte` es la resolución, que el shell aloja bajo
 *  «Documentos». */
export const OPCIONES: [string, string][] = [
  ['Programación de fiscalización', 'programas'],
  ['Fiscalización predial — acta de inspección', 'actas'],
  ['Fiscalización vehicular', 'deteccion'],
  ['Resultados y determinaciones', 'resultados'],
  ['Omisos y subvaluadores', 'deteccion'],
  ['Estado de cuenta de fiscalización', 'resultados'],
  ['Histórico de fiscalización predial', 'resultados'],
  ['Resolución de determinación', 'reporte'],
];
