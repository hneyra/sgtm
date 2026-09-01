/* Datos de muestra del módulo de Rentas · Registro, copiados literalmente del
   artboard `Rentas.dc.html`. Nada de esto viaja a ningún backend: es la maqueta.

   Los números de documento que el artboard escribe con el acrónimo `MPS`
   —Municipalidad Provincial de Sullana— llevan aquí `MDC`, y la jurisdicción
   del domicilio fiscal es la de la municipalidad piloto: Catacaos, distrito de
   la provincia de Piura. */

/* ══════════ Los tipos que el catálogo del artboard declara ══════════ */

/** Un campo de formulario, tal como el artboard lo declara: clave, rótulo,
 *  tipo y —cuando lo tiene— su valor por omisión propio. */
export type TipoDeCampo = 'text' | 'sel' | 'date' | 'area' | 'chk' | 'ro';

export type CampoDef = {
  k: string;
  l: string;
  /** Sin tipo es un campo de texto, como en el artboard. */
  t?: TipoDeCampo;
  o?: string[];
  ancho?: boolean;
  ph?: string;
  ayuda?: string;
  /** El valor por omisión del propio campo: gana al del contribuyente. */
  v?: string | boolean;
  /**
   * Por qué el control se dibuja y no se puede tocar.
   *
   * Es para el control que el manual dibuja y el backend **rechaza**: quitarlo
   * de la pantalla escondería que el manual lo pide, y dejarlo vivo promete algo
   * que la petición no puede llevar. Se dibuja apagado y con su motivo al lado.
   */
  bloqueado?: string;
};

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColDef = [etiqueta: string, num: 0 | 1];

export type TablaDef = {
  titulo: string;
  conteo: string;
  accion?: string;
  min: string;
  cols: ColDef[];
  filas: string[][];
  nota?: string;
};

/**
 * Un bloque del expediente.
 *
 * `lectura` dice que la tabla de este bloque **la llena el backend** y no el
 * catálogo: `filas` se queda vacía a propósito y quien dibuja pide. Sin esa
 * marca el bloque enseña lo que traiga `filas`, que es lo que hacían los dos de
 * «Predios y vehículos» hasta #541: dos predios de la maqueta con su ubicación,
 * su área y un autovalúo de S/ 132,196.75, bajo el nombre de la persona que se
 * acabara de abrir.
 */
export type BloqueDef = {
  titulo?: string;
  nota?: string;
  campos: CampoDef[];
  tabla?: TablaDef;
  lectura?: 'predios' | 'vehiculos';
};

export type SeccionDef = { id: string; label: string; hint: string; conteo: string; bloques: BloqueDef[] };

/* ══════════ El expediente del contribuyente ══════════
   Seis secciones donde el sistema actual pone nueve pestañas. Ninguna etiqueta
   del manual se reescribe; lo que desaparece es la barra de pestañas, que era
   navegación y no contenido. */

export const EXPEDIENTE: SeccionDef[] = [
  {
    id: 'ident',
    label: 'Identificación',
    hint: 'Quién es y cómo está calificado',
    conteo: '14 campos',
    bloques: [
      {
        campos: [
          { k: 'codigo', l: 'Código', t: 'ro' },
          { k: 'tipoPersona', l: 'Tipo de persona', t: 'sel', o: ['NATURAL', 'JURÍDICA', 'SUCESIÓN INDIVISA', 'SOCIEDAD CONYUGAL'] },
          { k: 'apPaterno', l: 'Apellido paterno', t: 'text' },
          { k: 'apMaterno', l: 'Apellido materno', t: 'text' },
          { k: 'nombres', l: 'Nombres', t: 'text' },
          { k: 'razonSocial', l: 'Razón social', t: 'text', ancho: true, ph: 'Solo persona jurídica' },
          { k: 'dni', l: 'D.N.I.', t: 'text' },
          { k: 'ruc', l: 'R.U.C.', t: 'text' },
          { k: 'nacimiento', l: 'Fecha de nacimiento', t: 'date' },
          { k: 'sexo', l: 'Sexo', t: 'sel', o: ['MASCULINO', 'FEMENINO'] },
          { k: 'estadoCivil', l: 'Estado civil', t: 'sel', o: ['SOLTERO(A)', 'CASADO(A)', 'VIUDO(A)', 'DIVORCIADO(A)', 'CONVIVIENTE'] },
          { k: 'conyuge', l: 'Cónyuge', t: 'text' },
          {
            k: 'calificacion',
            l: 'Calificación del contribuyente',
            t: 'sel',
            o: ['001 — PRINCIPAL CONTRIBUYENTE', '002 — MEDIANO CONTRIBUYENTE', '003 — PEQUEÑO CONTRIBUYENTE'],
            ayuda: 'Decide el trato de cobranza, no el impuesto',
          },
          { k: 'estado', l: 'Estado', t: 'sel', o: ['A — ACTIVO', 'I — INACTIVO', 'B — BAJA', 'F — FALLECIDO', 'N — NO HABIDO'] },
        ],
      },
    ],
  },

  {
    id: 'domicilio',
    label: 'Domicilio fiscal',
    hint: 'A dónde se notifica; sale del catálogo vial de Catastro',
    conteo: '16 campos',
    bloques: [
      {
        campos: [
          {
            k: 'tipoVia',
            l: 'Tipo de vía',
            t: 'sel',
            o: ['01 — AV - AVENIDA', '02 — CA - CALLE', '03 — JR - JIRÓN', '04 — PS - PASAJE', '05 — CR - CARRETERA', '99 — NO ESPECIFICADO'],
          },
          { k: 'via', l: 'Vía', t: 'text', ancho: true },
          { k: 'habUrbana', l: 'Habilitación urbana', t: 'text', ancho: true },
          { k: 'numero', l: 'Número', t: 'text' },
          { k: 'numAd', l: 'Número adicional', t: 'text' },
          { k: 'dep', l: 'Departamento', t: 'ro' },
          { k: 'prov', l: 'Provincia', t: 'ro' },
          { k: 'dist', l: 'Distrito', t: 'ro' },
        ],
      },
      {
        titulo: 'Edificación e interior',
        campos: [
          { k: 'nomEdif', l: 'Nombre de la edificación', t: 'text', ancho: true },
          {
            k: 'tipoEdif',
            l: 'Tipo de edificación',
            t: 'sel',
            o: ['01 — CASA', '02 — EDIFICIO', '03 — QUINTA', '04 — CENTRO COMERCIAL', '99 — NO ESPECIFICADO'],
          },
          {
            k: 'tipoInt',
            l: 'Tipo de interior',
            t: 'sel',
            o: ['01 — DEPARTAMENTO', '02 — INTERIOR', '03 — OFICINA', '04 — TIENDA', '99 — NO ESPECIFICADO'],
          },
          { k: 'numInt', l: 'Núm. interior', t: 'text' },
        ],
      },
      {
        titulo: 'Zona, sector y etapa',
        campos: [
          { k: 'zonaNombre', l: 'Nombre', t: 'text', ancho: true },
          { k: 'mz', l: 'Manzana', t: 'text' },
          { k: 'lt', l: 'Lote', t: 'text' },
          { k: 'sublt', l: 'Sub lote', t: 'text' },
          { k: 'dirAd', l: 'Dirección adicional', t: 'text', ancho: true },
        ],
      },
    ],
  },

  {
    id: 'contacto',
    label: 'Documentos y contacto',
    hint: 'Documentos, contactos, gestores, teléfonos y correo',
    conteo: '4 listas',
    bloques: [
      {
        titulo: 'Documentos',
        campos: [
          {
            k: 'tipoDoc',
            l: 'Tipo de documento',
            t: 'sel',
            ancho: true,
            o: [
              '01 — NO PRESENTÓ DOCUMENTO',
              '02 — DNI',
              '03 — CARNET DE IDENTIDAD DE POLICÍA NACIONAL',
              '04 — CARNET DE IDENTIDAD DE FUERZAS ARMADAS',
              '05 — PARTIDA DE NACIMIENTO',
              '06 — PASAPORTE',
              '07 — CARNET DE EXTRANJERÍA',
              '08 — OTROS (ESPECIFICAR)',
              '09 — RUC',
              '99 — NO ESPECIFICADO',
            ],
          },
          { k: 'numDoc', l: 'Número de documento', t: 'text' },
        ],
        tabla: {
          titulo: 'Documentos registrados',
          conteo: '1 documento',
          accion: '+ Añadir',
          min: '420px',
          cols: [
            ['Tipo', 0],
            ['Número', 0],
            ['Registrado', 0],
          ],
          filas: [['02 — DNI', '03593174', '12/08/2026']],
        },
      },
      {
        titulo: 'Contactos y gestores',
        campos: [
          { k: 'contacto', l: 'Nombre del contacto', t: 'text', ancho: true },
          { k: 'cargo', l: 'Cargo', t: 'text' },
          { k: 'email', l: 'Correo electrónico', t: 'text' },
          { k: 'telefonos', l: 'Teléfonos', t: 'text' },
          { k: 'gestor', l: 'Código de gestor', t: 'text' },
          { k: 'gestorIni', l: 'Gestor desde', t: 'date' },
          { k: 'gestorFin', l: 'Gestor hasta', t: 'date' },
          { k: 'notifElec', l: 'Notificación electrónica', t: 'chk', ph: 'Autoriza notificar al correo' },
        ],
        tabla: {
          titulo: 'Teléfonos y correos',
          conteo: '2 registros',
          accion: '+ Añadir',
          min: '460px',
          cols: [
            ['Tipo', 0],
            ['Valor', 0],
            ['Notifica', 0],
          ],
          filas: [
            ['01 — DOMICILIO 1', '073-413074', 'No'],
            ['E-MAIL', 'FRUIZ159@GMAIL.COM', 'Sí'],
          ],
        },
      },
    ],
  },

  /* Las dos tablas de esta sección las llena el backend desde #541 —`GET
     /rentas/predios` y `GET /rentas/vehiculos`, con `lectura`—, así que aquí
     quedan sus columnas y ni una fila. Antes traían las de la maqueta: dos
     predios con ubicación, área y autovalúo al céntimo, y dos vehículos con
     marca, modelo y base imponible, dibujados bajo el nombre de cualquier
     contribuyente que se abriera.

     El «conteo» de la sección tampoco puede ser una cifra: «2 predios · 1
     vehículo» es un dato de una persona concreta, y esto es la definición de
     la sección. Dice lo que la sección ES; las cifras las ponen las tablas
     cuando el backend las da. */
  {
    id: 'unidades',
    label: 'Predios y vehículos',
    hint: 'Las unidades afectas de las que sale el impuesto',
    conteo: '2 padrones',
    bloques: [
      {
        titulo: 'Predios',
        nota: 'El padrón predial de rentas. El código predial es el mismo código de referencia catastral: no hay dos padrones de predios.',
        campos: [],
        lectura: 'predios',
        tabla: {
          titulo: 'Predios registrados',
          conteo: '',
          min: '860px',
          /* Las seis del manual que `PredioDeRentasResource` publica, más dos
             suyas —tipo y sector— que dicen dónde está el predio y si es urbano
             o rústico. Se van «Const. m²», que vive en las construcciones de la
             ficha y no en esta lectura, y «Autovalúo S/», que el recurso NO
             publica y su javadoc explica por qué: no está almacenado ni se puede
             derivar sin el cuadro de valores unitarios, la depreciación, los
             aranceles (D-02b) y el % de actualización (D-11). Una columna de
             dinero siempre en blanco es peor que no tenerla. */
          cols: [
            ['Código predial', 0],
            ['Ubicación', 0],
            ['Tipo', 0],
            ['Uso', 0],
            ['Sector', 0],
            ['Terreno m²', 1],
            ['% prop.', 1],
            ['Condición', 0],
          ],
          filas: [],
          nota:
            'El autovalúo del conjunto es la base imponible del predial —se determina por contribuyente, no por predio— y no sale aquí: ' +
            'esta lectura no lo publica porque el sistema todavía no sabe valorizar un predio. Se declara al determinar.',
        },
      },
      {
        titulo: 'Vehículos',
        nota: 'La afectación corre tres ejercicios desde el año siguiente a la primera inscripción registral.',
        campos: [],
        lectura: 'vehiculos',
        tabla: {
          titulo: 'Vehículos afectos',
          conteo: '',
          min: '760px',
          /* «Base imponible S/» no está: es el mayor entre el valor de
             adquisición y el referencial del MEF, y eso lo resuelve el cálculo
             vehicular, no el padrón. La afectación sí viene, en dos enteros. */
          cols: [
            ['Placa', 0],
            ['Clase', 0],
            ['Marca', 0],
            ['Modelo', 0],
            ['Año fab.', 0],
            ['Afectación', 0],
            ['Estado', 0],
          ],
          filas: [],
          nota: 'La base imponible no sale del padrón: es el mayor entre el valor de adquisición y el referencial del MEF, y la pone el cálculo vehicular.',
        },
      },
    ],
  },

  {
    id: 'beneficios',
    label: 'Beneficios y exoneraciones',
    hint: 'Deducciones, inafectaciones y amnistías',
    conteo: '1 vigente',
    bloques: [
      {
        nota: 'La deducción de 50 UIT para pensionistas y adultos mayores exige predio único destinado a vivienda. Es la que más se solicita y la que más se deniega.',
        campos: [
          {
            k: 'tipoBen',
            l: 'Tipo de beneficio',
            t: 'sel',
            o: ['PENSIONISTA — DEDUCCIÓN 50 UIT', 'ADULTO MAYOR NO PENSIONISTA', 'PERSONA CON DISCAPACIDAD', 'INAFECTACIÓN', 'AMNISTÍA TRIBUTARIA'],
          },
          { k: 'benPredio', l: 'Código predial', t: 'text' },
          { k: 'benExp', l: 'Nº de expediente', t: 'text' },
          { k: 'benFecha', l: 'Fecha de solicitud', t: 'date' },
          { k: 'benRes', l: 'Nº de resolución', t: 'text', ph: 'RES-0000-2026-MDC' },
          { k: 'benEstado', l: 'Estado', t: 'sel', o: ['VIGENTE', 'EN TRÁMITE', 'DENEGADO', 'VENCIDO'] },
        ],
        tabla: {
          titulo: 'Beneficios del contribuyente',
          conteo: '2 registros',
          accion: '+ Solicitar',
          min: '700px',
          cols: [
            ['Expediente', 0],
            ['Tipo', 0],
            ['Resolución', 0],
            ['Vigencia', 0],
            ['Deducción', 0],
            ['Estado', 0],
          ],
          filas: [
            ['2026-0281', 'PENSIONISTA', 'RES-0412-2026-MDC', '2026 — indefinida', '50 UIT', 'Vigente'],
            ['2025-1102', 'AMNISTÍA 2025', 'ORD-018-2025-MDC', '2025', '100 % interés', 'Vencido'],
          ],
        },
      },
    ],
  },

  {
    id: 'obs',
    label: 'Observaciones y bitácora',
    hint: 'Quién tocó qué y cuándo',
    conteo: '3 anotaciones',
    bloques: [
      {
        campos: [
          { k: 'obs', l: 'Observación', t: 'area', ancho: true, ph: 'Lo que hay que saber antes de atenderlo' },
          { k: 'registrado', l: 'Registrado por', t: 'ro' },
          { k: 'modificado', l: 'Última modificación', t: 'ro' },
          { k: 'fotos', l: 'Foto álbum personal', t: 'ro', ancho: true },
        ],
      },
    ],
  },
];

/* ══════════ Las seis determinaciones ══════════
   La misma anatomía: sujeto → memoria del cálculo → acto. La memoria es lo que
   las nueve cajas de solo lectura del sistema actual no dejan ver: que es una
   cuenta encadenada. */

/**
 * Un filtro de la cabecera de una determinación.
 *
 * `k` es **el nombre con el que viaja**, y su ausencia no es un descuido: un
 * filtro sin `k` no lo lee nadie. Los tres del predial —«DJ N°», «Tipo de
 * declaración», «Fecha de declaración»— están declarados en el contrato y
 * `PredialController` sólo lee `codContribuyente` y `ano`, así que se tecleaban
 * y se caían en silencio; los de alcabala y espectáculos ni siquiera están en el
 * contrato. Un control vivo que no acota nada es el defecto que #322, #398 y
 * #432 cerraron tres veces, y aquí se cierra igual: se apaga con su motivo en
 * `bloqueado`, que se lee en su `title`.
 */
export type FiltroDef = { l: string; v: string; t?: 'sel'; o?: string[]; ph?: string; k?: string; bloqueado?: string };

/**
 * Una línea de la memoria del cálculo: operador, rótulo, detalle, importe y
 * —cuando la hay— la clase que la destaca como subtotal o como total.
 *
 * El sexto es el PREFIJO de la cifra, y existe porque no todas son dinero: la
 * alícuota de un tramo es un porcentaje, y dibujarla con «S/» delante la
 * convierte en un importe. Con `''` no se antepone nada; sin él se antepone
 * «S/», que es lo que casi todas las líneas necesitan.
 */
export type LineaDeMemoria = [
  op: string,
  label: string,
  detalle: string,
  valor: string,
  clase?: 'sub' | 'total',
  prefijo?: string,
];

export type MemoriaDef = { titulo: string; lineas: LineaDeMemoria[]; nota: string };

export type SeccionDeDeterminacion = { label: string; hint: string; campos: CampoDef[] };

export type TotalDef = [etiqueta: string, valor: string, destacado: 0 | 1];

/** Una acción del pie: rótulo, si es la primaria y —si está apagada— el motivo
 *  que se lee en su `title`. */
export type AccionDef = [label: string, primaria: 0 | 1, motivo?: string];

export type DeterminacionDef = {
  label: string;
  titulo: string;
  endpoint: string;
  desc: string;
  /**
   * La acción del pie que PIDE la determinación sin asentarla, si la hay.
   *
   * Son las tres cuyo cuerpo admite `simulacion: true`, que es la marca con la
   * que el backend calcula y no escribe (#395, #399). Las otras tres no la
   * tienen: `alcabala` y `espectaculos` registran el acto —su `POST` no acepta
   * ninguna marca— y `arbitrios` es un `GET`. Declarar aquí la etiqueta y no un
   * booleano es lo que impide que la acción viva quede rotulada con lo que no
   * hace, que es el defecto de `LA_QUE_ESCRIBE` (#421).
   */
  simula?: string;
  filtros: FiltroDef[];
  tabla?: TablaDef;
  memoria?: MemoriaDef;
  secciones?: SeccionDeDeterminacion[];
  totales?: TotalDef[];
  acciones: AccionDef[];
  aviso: string;
};

export type ClaveDeDeterminacion = 'predial' | 'masivo' | 'arbitrios' | 'vehicular' | 'alcabala' | 'espectaculos';

/** El orden de las pastillas es el del artboard, y no el alfabético. */
export const TIPOS_DE_DETERMINACION: ClaveDeDeterminacion[] = ['predial', 'masivo', 'arbitrios', 'vehicular', 'alcabala', 'espectaculos'];

/* ── Por qué las seis determinaciones no llevan una sola cifra ───────────────
   El bloque «De dónde sale la cifra» dibujaba el cálculo entero con un ejemplo:
   valúo S/ 170,616.75, «Tramo 1 — hasta 15 UIT · 0.2 %», «Tramo 2 — de 15 a 60
   UIT · 0.6 %», insoluto S/ 587.44, «Mínimo imponible — 0.6 % de la UIT», y la
   nota decía «UIT vigente 2026: S/ 5,350.00». Lo mismo el vehicular con su
   1.0 % y su 1.5 % de la UIT, la alcabala con su 3.0 %, sus 10 UIT y un IPM de
   1.0206, y los espectáculos con su 10 %.

   Son dos cosas a la vez, y la segunda es peor que la primera:

   1. **Es la regla 5**: la UIT, los tramos y las alícuotas no se compilan, viven
      en datos versionados. En el backend lo caza el escáner de fuentes; aquí lo
      escribía el catálogo portado del artboard, que ningún escáner mira.
   2. **Esos tramos no están decididos.** D-02a está firmada pero ningún
      ejercicio tiene su conjunto sellado, y D-11 sigue abierta —el % de
      actualización que la alcabala necesita no tiene fuente identificada—. Así
      que la pantalla le enseñaba a quien atiende una escala que puede no ser la
      que el sistema aplique, con el aspecto de estar explicándole cómo se
      calcula lo que va a cobrar.

   Lo que se queda es lo que vale y no es una cifra: **qué pasos tiene el
   cálculo, en qué orden y de dónde sale cada operando**. Lo que se va es la
   aritmética. Y los tres tramos se vuelven un solo renglón, porque cuántos son
   también lo dice el conjunto sellado. */

/** Lo que va donde iría una cifra que ninguna lectura ha dado. */
const SIN_CIFRA = '—';

/** Lo que va en el recuento de una tabla cuya lectura no existe todavía. */
const SIN_LECTURA = 'sin lectura';

/* ── Por qué hay filtros apagados en cuatro de las seis hojas ────────────────
   Un filtro que se teclea y no acota es peor que no tenerlo: quien busca cree
   haber acotado y lee una lista entera como si fuera el resultado de su
   búsqueda. Aquí hay dos casos distintos y conviene no mezclarlos, porque se
   arreglan en sitios distintos. */

/** Está en el contrato y ningún controlador lo lee: el hueco que #544 censó en 62 operaciones. */
const DECLARADO_Y_SIN_LECTOR =
  'Este filtro no acota nada. El contrato lo declara y el controlador de la determinación sólo lee el ' +
  'código de contribuyente y el año, así que tecleado aquí viajaría y se caería en silencio (#544).';

/** Ni siquiera está en el contrato: la ruta es un `POST` que registra y no declara consulta. */
const SIN_LECTURA_QUE_LISTE =
  'Ninguna lectura del contrato lista estos actos y esta ruta no declara ni un parámetro de consulta: ' +
  'elegir aquí no cambiaría nada de lo que se manda.';

/** Y el tercero: la hoja entera todavía no habla con el backend. */
const HOJA_SIN_CONECTAR =
  'Esta hoja todavía no pide nada al backend, así que su filtro no tendría a qué petición sumarse.';

/* ── Y un cuarto, que no dice «todavía» ─────────────────────────────────────
   Los tres de arriba se abren solos el día que el backend crezca. Estos dos no:
   lo que falta no es la consulta sino que **los valores del desplegable no
   existen en el sistema**, así que el filtro no se podría servir ni queriendo
   sin decidir antes qué significan. #541 los hizo contestar `422` en vez de
   ignorarlos, que es lo correcto y lo que obliga a bloquearlos aquí: mandarlos
   rompe la búsqueda entera en vez de devolver de más. */

/** «Zona»: vive en `sector.zona` y cada municipalidad la escribe a su manera. */
const ZONA_QUE_NO_EXISTE =
  'Las cuatro zonas de este desplegable no existen en el sistema. La zona de un predio la pone su sector y es texto libre por ' +
  'municipalidad —la carga real escribe «Urbana» y «Rustica»—, así que ninguna de ellas casaría con ningún dato. El backend la ' +
  'rechaza con 422 en vez de ignorarla, para que no devuelva una tabla vacía que se leería como «no hay cuotas». Se acota por código ' +
  'predial (#541).';

/** «Uso»: vive en `ficha_catastral.uso`, tambien texto libre. */
const USO_QUE_NO_EXISTE =
  'Los cinco usos de este desplegable tampoco existen en el sistema. El uso lo guarda la ficha catastral como texto libre —«Casa ' +
  'habitacion», «Tienda de artesanía»— y no coincide con este vocabulario en mayúsculas; el backend lo rechaza con 422. Se acota por ' +
  'código predial (#541).';

/** Las dos cajas del masivo que enseñan una cifra normativa: se leen, no se escriben. */
const DEL_CONJUNTO_SELLADO =
  'Es una cifra del conjunto sellado del ejercicio, no un dato que se teclee: escribirla aquí dejaría que ' +
  'quien corre la emisión eligiera con qué UIT se calcula (regla 5).';

/* Los dos únicos alcances que `DeterminarPredialMasivo.Peticion` admite, letra
   por letra. El desplegable del manual ofrecía cuatro —«TODO EL PADRÓN», «POR
   SECTOR», «POR RANGO DE CÓDIGO», «SOLO OBSERVADOS»— y NINGUNO coincide: los
   dos primeros se parecen, y parecerse no es serlo (#427). Los otros dos no
   existen en el backend, y se dicen en la ayuda en vez de ofrecerse. */
export const ALCANCES_DE_LA_CORRIDA = ['TODOS', 'SECTOR'] as const;

/** La coletilla de las cuatro memorias: por qué no hay números. */
const MEMORIA_SIN_CIFRAS =
  'Los pasos y su orden son los del cálculo; las cifras no se dibujan. Cada operando que multiplica un importe —la UIT, los tramos, las ' +
  'alícuotas, el mínimo imponible— es un valor normativo del conjunto sellado del ejercicio, y hoy no hay ninguno sellado: enseñar aquí ' +
  'un ejemplo sería enseñar una escala que puede no ser la que se aplique.';

export const DETERMINACIONES: Record<ClaveDeDeterminacion, DeterminacionDef> = {
  predial: {
    label: 'Predial — individual',
    titulo: 'Cálculo individual del impuesto predial',
    endpoint: 'POST /api/v1/rentas/predial/calculo-individual',
    desc: 'Determina el impuesto de un contribuyente sobre el autovalúo acumulado de todos sus predios en el distrito, con la escala progresiva acumulativa y el mínimo imponible del ejercicio.',
    simula: 'Simular',
    filtros: [
      /* El único que viaja. El año no se teclea: sale del selector de la
         cabecera, como en las doce pantallas del sistema. */
      { l: 'Cod. Contribuyente', v: '', k: 'codContribuyente', ph: 'C-000001' },
      { l: 'DJ N°', v: '', bloqueado: DECLARADO_Y_SIN_LECTOR },
      {
        l: 'Tipo de declaración',
        t: 'sel',
        v: 'RECTIFICATORIA',
        o: ['INSCRIPCIÓN', 'DESCARGO', 'RECTIFICATORIA', 'ANUAL MECANIZADA'],
        bloqueado: DECLARADO_Y_SIN_LECTOR,
      },
      { l: 'Fecha de declaración', v: '', bloqueado: DECLARADO_Y_SIN_LECTOR },
    ],
    tabla: {
      titulo: 'Predios que integran la base imponible',
      conteo: SIN_LECTURA,
      min: '760px',
      cols: [
        ['Código predial', 0],
        ['Ubicación', 0],
        ['Uso', 0],
        ['% prop.', 1],
        ['Valuo total S/', 1],
        ['Exonerado S/', 1],
        ['Valuo afecto S/', 1],
      ],
      filas: [],
      nota: 'Fases del cálculo: REGISTRO → HR (hoja resumen) → PU (predio urbano) → PR (predio rústico). No se emite cuponera si alguna fase presenta inconsistencia.',
    },
    memoria: {
      titulo: 'Escala progresiva acumulativa',
      lineas: [
        ['', 'Valuo total del conjunto', 'La suma de sus predios, cada uno ponderado por su % de propiedad', SIN_CIFRA],
        ['−', 'Valuo exonerado', 'Lo que el beneficio deja fuera de la base', SIN_CIFRA],
        ['=', 'Valuo afecto', '', SIN_CIFRA, 'sub'],
        [
          '×',
          'Escala progresiva acumulativa',
          'Un renglón por cada tramo: cuántos son, dónde están sus límites y qué alícuota lleva cada uno son cifras del conjunto sellado del ejercicio',
          SIN_CIFRA,
        ],
        ['=', 'Impuesto insoluto anual', '', SIN_CIFRA, 'total'],
        ['', 'Mínimo imponible', 'Se compara con el insoluto y gana el mayor; su fracción de la UIT también es del conjunto sellado', SIN_CIFRA],
      ],
      nota: MEMORIA_SIN_CIFRAS,
    },
    secciones: [
      {
        label: 'Beneficios aplicados',
        hint: 'Opcional',
        campos: [
          {
            k: 'deduccion',
            l: 'Deducción pensionista / adulto mayor',
            t: 'sel',
            o: ['NO APLICA', 'PENSIONISTA — 50 UIT', 'ADULTO MAYOR NO PENSIONISTA — 50 UIT'],
          },
          { k: 'resBen', l: 'Nº de resolución', t: 'text', ph: 'RES-0000-2026-MDC' },
          {
            k: 'inafectacion',
            l: 'Inafectación',
            t: 'sel',
            o: ['NINGUNA', 'GOBIERNO CENTRAL', 'ENTIDAD RELIGIOSA', 'CUERPO DE BOMBEROS', 'BENEFICENCIA'],
          },
          { k: 'montoDed', l: 'Monto deducido (S/)', t: 'ro', ayuda: 'Lo calcula el servidor con la deducción de arriba' },
        ],
      },
      {
        label: 'Emisión y cuotas',
        /* Los cuatro vencimientos estaban en el ROTULO —«Cuota 1 — vence 28/02»—,
           y son `PREDIAL_VENCIMIENTO:‹n›` del conjunto sellado: cifras de
           ordenanza local (D-02b) escritas a mano en una etiqueta, donde ningun
           escaner las busca. Y los cinco importes salian de `DEFECTOS`: el
           derecho a S/ 4.50 y las cuotas a S/ 147.98 y S/ 146.86. La seccion
           nace plegada, asi que nadie los veia hasta abrirla. */
        hint: 'Cómo se cobra',
        campos: [
          { k: 'modalidad', l: 'Modalidad', t: 'sel', v: 'AL CONTADO', o: ['AL CONTADO', 'FRACCIONADO EN 4 CUOTAS'] },
          { k: 'derecho', l: 'Derecho de emisión (S/)', t: 'ro', ayuda: 'Del conjunto sellado del ejercicio' },
          { k: 'c1', l: 'Cuota 1', t: 'ro', ayuda: 'Su vencimiento también es del conjunto sellado (D-02b)' },
          { k: 'c2', l: 'Cuota 2', t: 'ro' },
          { k: 'c3', l: 'Cuota 3', t: 'ro' },
          { k: 'c4', l: 'Cuota 4', t: 'ro' },
        ],
      },
    ],
    totales: [
      ['Valuo afecto', SIN_CIFRA, 0],
      ['Impuesto insoluto', SIN_CIFRA, 0],
      ['Derecho de emisión', SIN_CIFRA, 0],
      ['Total a pagar', SIN_CIFRA, 1],
    ],
    acciones: [
      ['Buscar', 0],
      ['Simular', 0],
      ['Calcular', 1],
    ],
    aviso: 'Simular enseña el resultado sin asentar nada. Calcular escribe la determinación en la cuenta corriente.',
  },

  masivo: {
    label: 'Predial — masivo',
    titulo: 'Cálculo masivo del impuesto predial',
    endpoint: 'POST /api/v1/rentas/predial/calculo-masivo',
    desc: 'Proceso de emisión anual. Recalcula todo el padrón para el ejercicio y deja constancia de los contribuyentes observados que quedan fuera de la emisión.',
    simula: 'Simular',
    filtros: [
      { l: 'Alcance', t: 'sel', v: ALCANCES_DE_LA_CORRIDA[0], o: [...ALCANCES_DE_LA_CORRIDA], k: 'alcance' },
      /* Los códigos los pone `GET /catastro/sectores` al abrir la hoja: los seis
         de aquí —«Todos», «01»…«05»— eran los de la maqueta, y con `SECTOR` el
         backend exige uno que exista. La lista vacía es a propósito. */
      { l: 'Sector', t: 'sel', v: '', o: [], k: 'sector' },
      /* La UIT y el derecho de emisión los pone el conjunto sellado del
         ejercicio, y no se teclean: escribirlos aquí sería la regla 5 —una cifra
         normativa compilada— y ademas dejaria que quien corre la emision de
         62 000 cuentas eligiera con qué UIT se calcula. */
      { l: 'UIT del ejercicio (S/)', v: SIN_CIFRA, bloqueado: DEL_CONJUNTO_SELLADO },
      { l: 'Derecho de emisión (S/)', v: SIN_CIFRA, bloqueado: DEL_CONJUNTO_SELLADO },
    ],
    tabla: {
      titulo: 'Resultado de la última corrida',
      conteo: SIN_LECTURA,
      min: '620px',
      cols: [
        ['Etapa', 0],
        ['Registros', 1],
        ['Monto S/', 1],
        ['Observados', 1],
        ['Estado', 0],
      ],
      filas: [],
      nota: 'Los observados quedan sin emisión hasta que se corrija la inconsistencia: predio sin arancel, ficha no conciliada o titularidad incompleta.',
    },
    secciones: [
      {
        label: 'Qué hace esta corrida',
        hint: 'Se confirma antes de ejecutar',
        campos: [
          /* Las dos que el backend RECHAZA con 422, y nacían marcadas: una
             corrida con «Incluye arbitrios» en verde se lee como que los emitió.
             `rechazarLoQueNoHace` de `PredialController` las contesta una a una. */
          {
            k: 'incArbitrios',
            l: 'Incluye arbitrios',
            t: 'chk',
            v: false,
            ph: 'Emitir arbitrios junto al predial',
            bloqueado: 'Esta corrida determina el impuesto predial. Los arbitrios son otro tributo, con su propia determinación por periodo, y el backend rechaza la petición que los pida.',
          },
          { k: 'recalcula', l: 'Recalcula ya emitidos', t: 'chk', v: false, ph: 'Sobrescribe cuponeras existentes' },
          {
            k: 'cuponera',
            l: 'Genera cuponera PDF',
            t: 'chk',
            v: false,
            ph: 'Produce archivo para imprenta',
            bloqueado: 'Esta corrida determina; no genera documentos. La cuponera se imprime desde la emisión de valores, con su numeración y su rastro.',
          },
        ],
      },
    ],
    acciones: [
      ['Simular', 0],
      ['Ver observados', 0],
      ['Ejecutar proceso', 1],
    ],
    aviso: 'Un proceso masivo toca el padrón entero. Simular primero no es una formalidad: es la única forma de ver los observados antes de emitir.',
  },

  arbitrios: {
    label: 'Arbitrios',
    titulo: 'Arbitrios municipales',
    endpoint: 'GET /api/v1/rentas/arbitrios',
    desc: 'Limpieza pública, parques y jardines y serenazgo. La tasa depende del uso del predio, la zona, la frecuencia del servicio y los metros de frontis declarados en la ficha catastral.',
    filtros: [
      /* El unico de los tres que el backend SI sabe servir —su 422 lo dice con
         todas las letras: «Acote por codigoPredial»—, y por eso su motivo es el
         de la hoja sin conectar y no el de los otros dos. */
      { l: 'Código predial', v: '', bloqueado: HOJA_SIN_CONECTAR },
      { l: 'Zona', t: 'sel', v: 'Zona 2', o: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'], bloqueado: ZONA_QUE_NO_EXISTE },
      {
        l: 'Uso',
        t: 'sel',
        v: 'CASA HABITACIÓN',
        o: ['CASA HABITACIÓN', 'COMERCIO', 'INDUSTRIA', 'SERVICIOS', 'TERRENO SIN CONSTRUIR'],
        bloqueado: USO_QUE_NO_EXISTE,
      },
    ],
    tabla: {
      titulo: 'Determinación por servicio',
      conteo: SIN_LECTURA,
      min: '700px',
      cols: [
        ['Servicio', 0],
        ['Criterio de distribución', 0],
        ['Frecuencia', 0],
        ['Tasa mensual S/', 1],
        ['Anual S/', 1],
        ['Condición', 0],
      ],
      filas: [],
    },
    totales: [
      ['Arbitrio anual', SIN_CIFRA, 0],
      ['Descuento pronto pago', SIN_CIFRA, 0],
      ['Cuotas', SIN_CIFRA, 0],
      ['Total del ejercicio', SIN_CIFRA, 1],
    ],
    acciones: [
      ['Recalcular', 0],
      ['Emitir cuponera de arbitrios', 1],
    ],
    aviso: 'Los arbitrios se determinan por predio, no por contribuyente: cada uno tiene su frontis y su zona.',
  },

  vehicular: {
    label: 'Vehicular',
    titulo: 'Cálculo del impuesto vehicular',
    endpoint: 'POST /api/v1/rentas/vehicular/calculo',
    desc: 'Aplica la alícuota del ejercicio sobre la base imponible, con el mínimo imponible del conjunto sellado, por los tres ejercicios en que el vehículo permanece afecto.',
    simula: 'Simular',
    /* Los dos viajan por la consulta, que es donde el contrato los declara y lo
       que permite compartir la búsqueda por la URL (#399). Con la placa el
       cálculo es de UN vehículo y un vehículo fuera de plazo se rechaza
       nombrándolo; con el contribuyente son todos los suyos y los no afectos se
       excluyen sin ruido. Son dos preguntas distintas, y por eso hay dos cajas. */
    filtros: [
      { l: 'Placa', v: '', k: 'placa', ph: 'ZLG-701' },
      { l: 'Cod. Contribuyente', v: '', k: 'codContribuyente', ph: 'C-000007' },
    ],
    tabla: {
      titulo: 'Determinación por ejercicio',
      conteo: SIN_LECTURA,
      min: '620px',
      cols: [
        ['Ejercicio', 0],
        ['Base imponible S/', 1],
        ['Tasa', 0],
        ['Impuesto S/', 1],
        ['Cuotas', 0],
        ['Estado', 0],
      ],
      filas: [],
    },
    memoria: {
      titulo: 'Base imponible del ejercicio',
      lineas: [
        ['', 'Valor de adquisición', 'Declarado por el titular', SIN_CIFRA],
        ['', 'Valor referencial del MEF', 'El de la tabla del año de fabricación, publicada para el ejercicio', SIN_CIFRA],
        ['=', 'Base imponible — el mayor de los dos', '', SIN_CIFRA, 'sub'],
        ['×', 'Alícuota del ejercicio', 'Del conjunto sellado, como todo lo que multiplica un importe', SIN_CIFRA],
        ['=', 'Impuesto anual', '', SIN_CIFRA, 'total'],
        ['', 'Mínimo imponible', 'Se compara con el impuesto y gana el mayor; su fracción de la UIT es del conjunto sellado', SIN_CIFRA],
      ],
      nota:
        'La afectación corre tres ejercicios desde el año siguiente a la primera inscripción registral. Al cuarto, el vehículo deja de estar afecto por vencimiento, no por baja. ' +
        MEMORIA_SIN_CIFRAS,
    },
    totales: [
      ['Base imponible', SIN_CIFRA, 0],
      ['Impuesto anual', SIN_CIFRA, 0],
      ['Cuota trimestral', SIN_CIFRA, 0],
      ['Total tres ejercicios', SIN_CIFRA, 1],
    ],
    acciones: [
      ['Simular', 0],
      ['Calcular', 0],
      ['Emitir cuponera', 1],
    ],
    aviso: 'Simular enseña el resultado sin asentar nada.',
  },

  alcabala: {
    label: 'Alcabala',
    titulo: 'Impuesto de alcabala',
    endpoint: 'POST /api/v1/rentas/alcabala',
    desc: 'Grava la transferencia de propiedad sobre el exceso de un tramo inafecto, tomando como base el mayor valor entre el de transferencia y el autovalúo ajustado.',
    filtros: [
      { l: 'Nº de liquidación', v: '', bloqueado: SIN_LECTURA_QUE_LISTE },
      { l: 'Nº de expediente', v: '', bloqueado: SIN_LECTURA_QUE_LISTE },
      { l: 'Fecha de la transferencia', v: '', bloqueado: SIN_LECTURA_QUE_LISTE },
    ],
    memoria: {
      titulo: 'Liquidación',
      lineas: [
        ['', 'Valor de transferencia', 'El que declara la minuta o la escritura', SIN_CIFRA],
        ['', 'Autovalúo del predio', 'El del ejercicio de la transferencia', SIN_CIFRA],
        [
          '×',
          'Índice de actualización del autovalúo',
          'El factor que la norma manda aplicar. No tiene fuente identificada todavía (D-11), y por eso ni siquiera se enseña un ejemplo',
          SIN_CIFRA,
        ],
        ['=', 'Base de cálculo — el mayor de los dos', '', SIN_CIFRA, 'sub'],
        ['−', 'Tramo inafecto', 'Las primeras UIT que la norma deja fuera; cuántas son y cuánto vale la UIT, del conjunto sellado', SIN_CIFRA],
        ['=', 'Base imponible', '', SIN_CIFRA, 'sub'],
        ['×', 'Alícuota', 'Del conjunto sellado del ejercicio', SIN_CIFRA],
        ['=', 'Impuesto de alcabala', 'Vence el último día hábil del mes siguiente', SIN_CIFRA, 'total'],
      ],
      nota:
        'El adquirente es el contribuyente de la alcabala. Si el vendedor es una empresa constructora y es la primera venta, solo se grava el valor del terreno. ' +
        MEMORIA_SIN_CIFRAS,
    },
    totales: [
      ['Base de cálculo', SIN_CIFRA, 0],
      ['Tramo inafecto', SIN_CIFRA, 0],
      ['Base imponible', SIN_CIFRA, 0],
      ['Alcabala a pagar', SIN_CIFRA, 1],
    ],
    acciones: [
      ['Liquidar', 0, 'El backend registra el acto; no acepta una marca de solo liquidar'],
      ['Generar orden de pago', 0],
      ['Imprimir liquidación', 1],
    ],
    aviso: 'Liquidar está declarado y apagado: la operación del backend registra el acto y no acepta una marca de «calcula y no asientes nada».',
  },

  espectaculos: {
    label: 'Espectáculos públicos',
    titulo: 'Espectáculos públicos no deportivos',
    endpoint: 'POST /api/v1/rentas/espectaculos',
    desc: 'Grava el monto que se abona por presenciar el espectáculo. La alícuota depende del tipo de evento y el organizador actúa como agente perceptor.',
    filtros: [
      { l: 'Nº de expediente', v: '', bloqueado: SIN_LECTURA_QUE_LISTE },
      { l: 'Organizador', v: '', bloqueado: SIN_LECTURA_QUE_LISTE },
      {
        l: 'Tipo de espectáculo',
        t: 'sel',
        v: 'CONCIERTO DE MÚSICA POPULAR',
        o: ['CONCIERTO DE MÚSICA POPULAR', 'ESPECTÁCULO TAURINO', 'CARRERA DE CABALLOS', 'DISCOTECA', 'CINE', 'TEATRO', 'FOLCLORE NACIONAL'],
        bloqueado: SIN_LECTURA_QUE_LISTE,
      },
    ],
    tabla: {
      titulo: 'Espectáculos declarados',
      conteo: SIN_LECTURA,
      min: '780px',
      cols: [
        ['Expediente', 0],
        ['Organizador', 0],
        ['Espectáculo', 0],
        ['Fecha', 0],
        ['Aforo', 1],
        ['Recaudación S/', 1],
        ['Tasa', 0],
        ['Impuesto S/', 1],
      ],
      filas: [],
      nota: 'El cine, el teatro, los conciertos de música clásica, la ópera, el ballet y el folclore nacional están inafectos por ley.',
    },
    memoria: {
      titulo: 'Liquidación del evento',
      lineas: [
        ['', 'Entradas vendidas', 'Las que declara el organizador, dentro del aforo autorizado', SIN_CIFRA],
        ['×', 'Precio de la entrada', 'El otro operando de la base: el cuerpo del backend no tiene campo para él todavía', SIN_CIFRA],
        ['=', 'Recaudación declarada', 'Es la base imponible del art. 56, y la compone el servidor: no se multiplica en la pantalla', SIN_CIFRA, 'sub'],
        ['×', 'Alícuota del tipo de espectáculo', 'Del conjunto sellado. Los rótulos del desplegable de arriba no son sus llaves', SIN_CIFRA],
        ['=', 'Impuesto a pagar', '', SIN_CIFRA, 'total'],
        ['', 'Garantía depositada', 'Se devuelve al liquidar el evento', SIN_CIFRA],
      ],
      nota:
        'El organizador es agente perceptor: retiene y entrega. La garantía cubre el impuesto si no lo hace. ' + MEMORIA_SIN_CIFRAS,
    },
    secciones: [
      {
        label: 'Datos del evento',
        hint: 'Lo que se declara antes de realizarlo',
        campos: [
          { k: 'espDenom', l: 'Denominación del evento', t: 'text', ancho: true },
          { k: 'espLocal', l: 'Local', t: 'text' },
          { k: 'espFecha', l: 'Fecha del evento', t: 'text' },
          { k: 'espAforo', l: 'Aforo autorizado', t: 'text' },
          { k: 'espRuc', l: 'R.U.C. del organizador', t: 'text' },
          { k: 'espGarantia', l: 'Garantía depositada (S/)', t: 'text' },
        ],
      },
    ],
    acciones: [
      ['Liquidar', 0],
      ['Registrar', 0],
      ['Imprimir liquidación', 1],
    ],
    aviso: 'Los tres filtros de búsqueda están apagados: ninguna lectura del contrato lista los espectáculos declarados. Decían «cuatro» y son tres, y hasta ahora se dibujaban habilitados.',
  },
};

/* ══════════ Las dos transferencias ══════════
   Tres pasos: el acto, las partes y la validación de la deuda. El tercero no
   tiene campos: es la comprobación de lo que el transferente debe. */

export type PasoDeTransferencia = { label: string; nota: string; campos: CampoDef[] };
export type ClaveDeTransferencia = 'predio' | 'vehiculo';

/* Los valores por omision de este formulario se han ido, y no todos por el mismo
   motivo. Los que identifican el acto —codigo predial, placa, documentos de las
   dos partes, fecha, minuta— y los que lo cuantifican —% transferido, valor de
   transferencia— llegaban prellenados con una compraventa de la maqueta: quien
   abre la pantalla se encuentra un acto entero escrito, y pulsar tres veces
   «Continuar» y una «Registrar transferencia» cambiaria el titular de un predio
   real. Ademas el importe venia con separador de miles («95,000.00»), que
   `new BigDecimal(texto)` rechaza: 422 culpando al dato que el propio formulario
   escribio. Lo que se queda es el valor por omision de los desplegables cerrados,
   que es una eleccion legitima entre opciones y no un dato de nadie.

   Los cuatro `ro` de nombre y los cuatro de afectacion tampoco llevan valor: los
   resuelve la pantalla contra el padron —o contra el titular de la placa— y salen
   «—» mientras no haya a quien resolver. */
export const TRANSFERENCIAS: Record<ClaveDeTransferencia, { label: string; pasos: PasoDeTransferencia[] }> = {
  predio: {
    label: 'De predio',
    pasos: [
      {
        label: 'El acto',
        nota: 'Qué documento transfiere la propiedad y desde cuándo. La fecha del acto decide hasta cuándo responde el vendedor.',
        campos: [
          { k: 'exp', l: 'Nº de expediente', t: 'text', ayuda: 'No viaja: el cuerpo de la transferencia no tiene campo para él' },
          {
            k: 'tipoActo',
            l: 'Tipo de acto',
            t: 'sel',
            v: 'COMPRA-VENTA',
            o: ['COMPRA-VENTA', 'DONACIÓN', 'PERMUTA', 'ANTICIPO DE LEGÍTIMA', 'ADJUDICACIÓN', 'DACIÓN EN PAGO', 'SUCESIÓN'],
          },
          { k: 'fechaActo', l: 'Fecha del acto', t: 'date' },
          { k: 'minuta', l: 'Nº de minuta / escritura', t: 'text', ayuda: 'Es el sustento documental del acto: sin él no se registra' },
          { k: 'notaria', l: 'Notaría', t: 'text', ayuda: 'No viaja: el cuerpo de la transferencia no tiene campo para ella' },
          {
            k: 'codPredial',
            l: 'Código predial',
            t: 'text',
            ayuda: 'Se resuelve contra el padrón: el identificador interno no se teclea',
          },
          { k: 'pctTransf', l: '% transferido', t: 'text', ph: '100.00' },
          { k: 'valorTransf', l: 'Valor de transferencia (S/)', t: 'text', ph: '0.00', ayuda: 'Sin separador de miles: el backend lo lee como un número' },
        ],
      },
      {
        label: 'Las partes',
        nota: 'Quién vende y quién compra. Los nombres los pone el padrón; lo que se teclea es el documento.',
        campos: [
          { k: 'trDoc', l: 'Transferente — documento', t: 'text' },
          { k: 'trNom', l: 'Transferente — nombre', t: 'ro' },
          { k: 'trHasta', l: 'Transferente afecto hasta', t: 'ro' },
          { k: 'adDoc', l: 'Adquirente — documento', t: 'text' },
          { k: 'adNom', l: 'Adquirente — nombre', t: 'ro' },
          { k: 'adDesde', l: 'Adquirente afecto desde', t: 'ro' },
          { k: 'genAlcabala', l: 'Genera alcabala', t: 'chk', v: true, ph: 'Liquida el impuesto de alcabala al registrar' },
        ],
      },
      { label: 'Deuda y registro', nota: '', campos: [] },
    ],
  },
  vehiculo: {
    label: 'De vehículo',
    pasos: [
      {
        label: 'El acto',
        nota: 'El transferente responde por el impuesto hasta el 31 de diciembre del año en que se produce la venta.',
        campos: [
          { k: 'vPlaca', l: 'Placa', t: 'text', ph: 'T2G-418' },
          { k: 'vExp', l: 'Nº de expediente', t: 'text', ayuda: 'No viaja: el cuerpo de la transferencia no tiene campo para él' },
          { k: 'vFecha', l: 'Fecha de transferencia', t: 'date' },
          { k: 'vTipo', l: 'Tipo de acto', t: 'sel', v: 'COMPRA-VENTA', o: ['COMPRA-VENTA', 'DONACIÓN', 'REMATE', 'HERENCIA', 'DACIÓN EN PAGO'] },
          {
            k: 'vDocSust',
            l: 'Documento sustentatorio',
            t: 'sel',
            v: 'ACTA NOTARIAL DE TRANSFERENCIA',
            o: ['ACTA NOTARIAL DE TRANSFERENCIA', 'CONTRATO CON FIRMA LEGALIZADA', 'PARTE REGISTRAL', 'RESOLUCIÓN JUDICIAL'],
            ayuda: 'La clase no viaja: lo que se guarda como sustento es el número de abajo',
          },
          { k: 'vNumDoc', l: 'Nº del documento', t: 'text', ayuda: 'Es el sustento documental del acto: sin él no se registra' },
          { k: 'vValor', l: 'Valor de transferencia (S/)', t: 'text', ph: '0.00', ayuda: 'Sin separador de miles: el backend lo lee como un número' },
        ],
      },
      {
        label: 'Las partes',
        nota: 'El titular vigente lo resuelve el sistema desde la placa: no se elige.',
        campos: [
          /* «Transferente — documento» pasa de caja de texto a `ro`: el cuerpo de
             `POST /rentas/transferencias/vehiculo` no tiene `codTransferente` —el
             backend toma al titular vigente de la placa—, asi que lo que se
             tecleara ahi no llegaria a ningun sitio. Lo dice la nota del propio
             manual: «El titular vigente lo resuelve el sistema desde la placa». */
          { k: 'vTrDoc', l: 'Transferente — documento', t: 'ro' },
          { k: 'vTrNom', l: 'Transferente — nombre', t: 'ro' },
          { k: 'vTrHasta', l: 'Afecto hasta', t: 'ro' },
          { k: 'vAdDoc', l: 'Adquirente — documento', t: 'text' },
          { k: 'vAdNom', l: 'Adquirente — nombre', t: 'ro' },
          { k: 'vAdDesde', l: 'Afecto desde', t: 'ro' },
        ],
      },
      { label: 'Deuda y registro', nota: '', campos: [] },
    ],
  },
};

/* `DEUDA_DEL_TRANSFERENTE` se ha ido. Eran tres conceptos con sus importes
   —S/ 2,640.36 en total— dibujados en el ultimo paso, justo encima de «Registrar
   transferencia», como si fueran lo que debe el vendedor de ESTE acto. La deuda
   del transferente se lee de `GET /consultas/deuda` con su codigo, que en el
   predio sale del documento tecleado y en el vehiculo del titular de la placa. */

/* ══════════ Movimientos de deuda ══════════ */

export const CAMPOS_DEL_ALTA: CampoDef[] = [
  {
    k: 'altaConcepto',
    /* Los rotulos del manual —«IMPUESTO PREDIAL», «ARBITRIOS MUNICIPALES»— NO son
       el vocabulario del libro, y ofrecerlos tiene dos consecuencias distintas y
       las dos malas: `cuenta_corriente_asiento.tributo` es `varchar(20)` (V2), asi
       que «ARBITRIOS MUNICIPALES» (21) y «DERECHOS ADMINISTRATIVOS» (24) dan 422
       —«El tributo va de 1 a 20 caracteres»— DESPUES de rellenar el formulario; y
       los que si caben entrarian con una grafia que ninguna otra parte del sistema
       escribe, de modo que la obligacion nacida aqui quedaria al lado de la deuda
       del mismo tributo en vez de sumarse a ella, invisible para `consulta_deuda`.
       Se ofrecen las grafias que el sistema SI escribe —`Determinacion`,
       `DeterminarArbitrios`, `ObligacionDeLaPapeleta`, `TransferirARentas`— y la
       ayuda dice cual queda fuera. Es la regla de #427: parecerse no es serlo. */
    l: 'Concepto / tributo',
    t: 'sel',
    v: 'PREDIAL',
    o: ['PREDIAL', 'ARBITRIO', 'VEHICULAR', 'ALCABALA', 'MULTA_TRIBUTARIA', 'MULTA_ADMINISTRATIVA'],
    ayuda:
      'Son los nombres con que el libro escribe cada tributo, no los rótulos del manual: es lo que viaja y lo que decide sobre qué obligación cae el alta. «DERECHOS ADMINISTRATIVOS» queda fuera porque ningún acto del sistema lo asienta.',
  },
  {
    k: 'altaUnidad',
    l: 'Unidad (predio / placa)',
    t: 'text',
    ayuda:
      'Código predial o placa. Se resuelve contra el padrón antes de mandar: el identificador interno no se teclea. En blanco, el alta cae sobre la obligación SIN unidad, que es otra distinta de la del predio.',
  },
  /* El valor por omision es el primero de la lista a proposito: un desplegable que
     ensena «2026» y manda «2024» es el defecto de #331.

     Los cinco anios se quedan como el manual los dibuja, y la ayuda dice lo
     medido: `cuenta_corriente_asiento` esta particionada por ejercicio y `V2`
     declara solo 2026 y 2027, asi que los otros cuatro revientan con un 500
     opaco. **No se recortan a «2026»**: seria escribir a mano el conjunto de
     particiones de hoy, que quedaria viejo en silencio el dia que alguien anada
     2028 —el mismo modo de fallo que el issue describe, con otro nombre—. */
  {
    k: 'altaAnio',
    l: 'Año',
    t: 'sel',
    v: '2026',
    o: ['2026', '2025', '2024', '2023', '2022'],
    ayuda:
      'Medido el 2026-09-01: de estos cinco ejercicios sólo 2026 registra; los otros cuatro contestan un error interno del servidor, porque la cuenta corriente sólo tiene abiertos 2026 y 2027 (#597).',
  },
  /* Las dos cajas del manual, y las tres formas que el backend admite desde
     #538. Hasta entonces «Cuota hasta» se dibujaba y NO viajaba: Jackson la
     descartaba sin decir nada y el asiento quedaba en `periodo: 0` —que es un
     valor legitimo, la obligacion anual, asi que la fila mala era
     indistinguible de una buena—. */
  {
    k: 'altaCuotaD',
    l: 'Cuota desde',
    t: 'text',
    ayuda: 'En blanco las dos, la obligación anual. De 1 a 12, la cuota o el mes. 0 es la anual y no puede empezar un rango.',
  },
  {
    k: 'altaCuotaH',
    l: 'Cuota hasta',
    t: 'text',
    ayuda: 'Con las dos, un asiento por cuota — y el desglose se repite en cada una, no se reparte. En blanco, sólo la de la izquierda.',
  },
  /* Las cuatro son **de cada cuota** cuando hay rango, no del acto entero:
     medido, `1 a 4` con 100,00 deja cuatro asientos y un total de 400,00. La
     etiqueta no se cambia —es la del manual (RNF-080)— y lo dice la franja de
     totales, que ensena el total del ACTO y explica la multiplicacion. */
  { k: 'altaInsoluto', l: 'Insoluto (S/)', t: 'text', ph: '0.00' },
  { k: 'altaReajuste', l: 'Reajuste (S/)', t: 'text', ph: '0.00' },
  { k: 'altaInteres', l: 'Interés (S/)', t: 'text', ph: '0.00' },
  { k: 'altaGastos', l: 'Gastos (S/)', t: 'text', ph: '0.00' },
  {
    k: 'altaVence',
    l: 'Fecha de vencimiento',
    t: 'date',
    ayuda: 'No viaja: el cuerpo del movimiento sólo tiene la fecha con efecto tributario, y es la del acto',
  },
  {
    k: 'altaDocSust',
    l: 'Documento que sustenta',
    t: 'sel',
    v: 'RESOLUCIÓN DE DETERMINACIÓN',
    o: ['RESOLUCIÓN DE DETERMINACIÓN', 'RESOLUCIÓN DE MULTA', 'ACTA DE FISCALIZACIÓN', 'MIGRACIÓN DE SISTEMA ANTERIOR', 'RESOLUCIÓN GERENCIAL'],
    ayuda: 'La clase no viaja: lo que se guarda como sustento es el número de abajo',
  },
  { k: 'altaNumDoc', l: 'Nº del documento', t: 'text', ayuda: 'Obligatorio: sin la resolución que lo aprueba, un alta no se puede defender ante nadie' },
  { k: 'altaMotivo', l: 'Motivo del alta', t: 'area', ancho: true, ayuda: 'No viaja: el motivo que se audita es la observación del acto' },
];

export const CAMPOS_DE_LA_BAJA: CampoDef[] = [
  {
    k: 'causal',
    l: 'Causal',
    t: 'sel',
    v: 'PRESCRIPCIÓN DECLARADA',
    o: ['PRESCRIPCIÓN DECLARADA', 'RESOLUCIÓN QUE DEJA SIN EFECTO', 'ERROR MATERIAL', 'COMPENSACIÓN', 'DEUDA DE COBRANZA DUDOSA', 'CONDONACIÓN POR ORDENANZA'],
    /* `PeticionDeMovimiento` no tiene campo para la causal, asi que se copia a la
       observacion, que es donde queda auditada (RNF-052). Dejarla suelta seria un
       desplegable que se elige y no llega: el defecto de #331. */
    ayuda: 'El cuerpo del backend no tiene campo propio para la causal: se antepone a la observación, que es donde queda auditada',
  },
  { k: 'numRes', l: 'Nº de resolución', t: 'text', ayuda: 'Es el sustento documental de la baja: sin él no se registra' },
  {
    k: 'fechaRes',
    l: 'Fecha de resolución',
    t: 'date',
    /* Hace dos cosas: es la `fechaValor` del movimiento y es la fecha a la que se
       lee la deuda de arriba, porque el backend valida la baja contra
       `deudaActualizadaA(fechaValor)`. Leerla a hoy y darla de baja a otra fecha
       produciria `BajaMayorQueLaDeuda` sin que se viera por que. */
    ayuda: 'Es también la fecha a la que se lee la deuda de arriba: la baja se compara contra lo que se debía ese día',
  },
  { k: 'autorizado', l: 'Autorizado por', t: 'ro', ayuda: 'Ninguna lectura publica quién autoriza: va en la resolución' },
  { k: 'motivoBaja', l: 'Motivo', t: 'area', ancho: true, ayuda: 'No viaja: el motivo que se audita es la observación del acto' },
];

/* Las cuatro filas de muestra de la baja se han ido, y no por limpieza: eran la
   deuda de otra persona con una casilla al lado, y marcarlas extinguia —o lo
   habria hecho— una cuota que nadie miro. La deuda que se puede dar de baja se
   lee de `GET /consultas/deuda` a la fecha de la resolucion, que es la misma
   fecha contra la que el backend valida el movimiento. La columna «Unidad» sigue
   dibujandose porque el manual la dibuja, y sale «—»:
   `ObligacionConDeudaResource` publica `predioId`/`vehiculoId` —identificadores
   internos— y no el codigo predial ni la placa, que es lo que ahi se leeria. */
export const COLS_DE_LA_BAJA: ColDef[] = [
  ['Año', 0],
  ['Unidad', 0],
  ['Cuota', 0],
  ['Tributo', 0],
  ['Fase', 0],
  ['Insoluto S/', 1],
  ['Reajuste S/', 1],
  ['Interés S/', 1],
  ['Gasto S/', 1],
  ['Total S/', 1],
];

/* ══════════ Panel del módulo ══════════ */

export type EtapaDeEmision = { etapa: string; pct: number; registros: string; estado: string; tono: 'ok' | 'warn' | 'bad' };

export const ETAPAS_DE_LA_EMISION: EtapaDeEmision[] = [
  { etapa: 'Lectura del padrón', pct: 100, registros: '62,418', estado: 'Completa', tono: 'ok' },
  { etapa: 'Valuación de predios', pct: 100, registros: '78,204', estado: 'Completa', tono: 'ok' },
  { etapa: 'Determinación del impuesto', pct: 100, registros: '61,884', estado: 'Completa', tono: 'ok' },
  { etapa: 'Determinación de arbitrios', pct: 100, registros: '61,884', estado: 'Completa', tono: 'ok' },
  { etapa: 'Generación de cuponeras', pct: 98, registros: '61,350', estado: '534 observados', tono: 'warn' },
];

export const KPIS_DEL_PANEL = [
  { valor: '62,418', etiqueta: 'Contribuyentes en el padrón', nota: 'Activos. Los de baja siguen en determinaciones ya emitidas.' },
  { valor: 'S/ 9.4 M', etiqueta: 'Predial determinado 2026', nota: 'Sobre 61,884 cuentas emitidas.' },
  { valor: '534', etiqueta: 'Observados sin emisión', nota: 'Cada uno tiene una causa concreta y arreglable.' },
  { valor: '41.2 %', etiqueta: 'Recaudado del emitido', nota: 'Al 31 de agosto. Dos cuotas vencidas de cuatro.' },
];

/* ══════════ Padrón de contribuyentes ══════════ */

export type FilaDelPadron = {
  estado: string;
  tono: 'ok' | 'warn' | 'bad';
  codigo: string;
  nombre: string;
  doc: string;
  dir: string;
  unidades: string;
  deuda: string;
  /** La deuda se pinta en rojo cuando hay algo pendiente. */
  deudaRoja: boolean;
};

export const PADRON: FilaDelPadron[] = [
  {
    estado: 'A',
    tono: 'ok',
    codigo: '00000025673',
    nombre: 'SUC. RUFINA MEDINA MEDINA',
    doc: 'DNI 03593174',
    dir: 'URB. SANTA ROSA — EL ALTO 116',
    unidades: '2 predios',
    deuda: '1,842.60',
    deudaRoja: true,
  },
  {
    estado: 'A',
    tono: 'ok',
    codigo: '00000003541',
    nombre: 'CASTILLO PASCUALA, MARÍA ELENA',
    doc: 'DNI 44218937',
    dir: 'CALLE LAMA 482',
    unidades: '2 predios · 2 vehíc.',
    deuda: '591.94',
    deudaRoja: true,
  },
  {
    estado: 'A',
    tono: 'ok',
    codigo: '00000006550',
    nombre: 'DÍAZ MADRID, JULIO CÉSAR',
    doc: 'DNI 02718844',
    dir: 'C.P. BARRIO BUENOS AIRES',
    unidades: '3 predios',
    deuda: '9,412.15',
    deudaRoja: true,
  },
  {
    estado: 'I',
    tono: 'bad',
    codigo: '00000006551',
    nombre: 'NOBLECILLA ARISMENDIZ SAC',
    doc: 'RUC 20525118447',
    dir: 'AV. JOSÉ DE LAMA 1180',
    unidades: '1 predio',
    deuda: '412.00',
    deudaRoja: true,
  },
];

export const COLS_DEL_PADRON: ColDef[] = [
  ['Est.', 0],
  ['Código', 0],
  ['Nombre / razón social', 0],
  ['Documento', 0],
  ['Domicilio fiscal', 0],
  ['Unidades', 0],
  ['Deuda hoy S/', 1],
];

/** Los filtros rápidos del padrón. La clave va sin tilde; el rótulo la lleva. */
export const CHIPS_DEL_PADRON: [clave: string, label: string][] = [
  ['conDeuda', 'Con deuda vencida'],
  ['sinConciliar', 'Predio sin conciliar'],
  ['pensionista', 'Con beneficio vigente'],
  ['juridica', 'Persona jurídica'],
];

/* ══════════ Expediente: cabecera ══════════ */

/* `RESUMEN_DEL_EXPEDIENTE` se ha ido. Era el valor por omision de las seis celdas
   de la cabecera, y por tanto lo que se dibujaba cuando la lectura del
   contribuyente FALLABA: sobre el codigo real de quien se acababa de pulsar
   aparecian el codigo, el DNI, los dos predios, el autovaluo y la deuda de otra
   persona. Ahora la cabecera sale de la lectura o dice que no se pudo leer. */

/* ══════════ Declaración jurada ══════════ */

export const DJ_META: { k: string; v: string }[] = [
  { k: 'Contribuyente', v: 'SUC. RUFINA MEDINA MEDINA' },
  { k: 'Código', v: '00000025673' },
  { k: 'D.N.I.', v: '03593174' },
  { k: 'Domicilio fiscal', v: 'URB. SANTA ROSA — EL ALTO 116' },
  { k: 'Tipo de declaración', v: 'RECTIFICATORIA' },
];

export const DJ_COLS: ColDef[] = [
  ['Código predial', 0],
  ['Ubicación', 0],
  ['Uso', 0],
  ['% prop.', 1],
  ['Valuo afecto S/', 1],
];

export const DJ_FILAS: string[][] = [
  ['02-014-D-14-01', 'CALLE SANTA ROSA 116', 'Casa habitación', '100.00', '132,196.75'],
  ['04-021-B-07-00', 'MZ. B LT. 7 — BELLAVISTA', 'Terreno sin construir', '50.00', '19,210.00'],
];

export const DJ_TOTALES: { k: string; v: string }[] = [
  { k: 'Valuo afecto', v: 'S/ 151,406.75' },
  { k: 'Impuesto insoluto', v: 'S/ 587.44' },
  { k: 'Derecho de emisión', v: 'S/ 4.50' },
  { k: 'Total a pagar', v: 'S/ 591.94' },
];

/* ══════════ Las quince opciones del manual que el módulo resume ══════════ */

export const OPCIONES_DE_RENTAS: [label: string, dest: string][] = [
  ['Contribuyentes', 'padron'],
  ['Predios del contribuyente', 'expediente'],
  ['Vehículos', 'expediente'],
  ['Beneficios y exoneraciones', 'expediente'],
  ['Predial — individual', 'determinar'],
  ['Predial — masivo', 'determinar'],
  ['Arbitrios', 'determinar'],
  ['Cálculo vehicular', 'determinar'],
  ['Alcabala', 'determinar'],
  ['Espectáculos públicos', 'determinar'],
  ['Transferencia de predio', 'transferir'],
  ['Transferencia de vehículo', 'transferir'],
  ['Alta de deuda', 'deuda'],
  ['Baja de deuda', 'deuda'],
  ['Declaración jurada — HR, PU y PR', 'reporte'],
];

/* ══════════ Los valores por omisión del contribuyente ══════════
   Lo que el artboard llama `defectos()`: el estado inicial de todos los campos
   del expediente, de las determinaciones y de los movimientos de deuda. */

export const DEFECTOS: Record<string, string | boolean> = {
  codigo: '00000025673',
  tipoPersona: 'SUCESIÓN INDIVISA',
  apPaterno: 'MEDINA',
  apMaterno: 'MEDINA',
  nombres: 'RUFINA',
  razonSocial: '',
  dni: '03593174',
  ruc: '',
  nacimiento: '1948-08-30',
  sexo: 'FEMENINO',
  estadoCivil: 'VIUDO(A)',
  conyuge: '',
  calificacion: '003 — PEQUEÑO CONTRIBUYENTE',
  estado: 'A — ACTIVO',
  tipoVia: '02 — CA - CALLE',
  via: '99999999 — NO ESPECIFICADO',
  habUrbana: '200104000 — CATACAOS',
  numero: '116',
  numAd: '',
  dep: 'PIURA',
  prov: 'PIURA',
  dist: 'CATACAOS',
  nomEdif: '',
  tipoEdif: '99 — NO ESPECIFICADO',
  tipoInt: '99 — NO ESPECIFICADO',
  numInt: '',
  zonaNombre: 'URB. SANTA ROSA — EL ALTO',
  mz: '015',
  lt: '001',
  sublt: '',
  dirAd: '',
  tipoDoc: '02 — DNI',
  numDoc: '03593174',
  contacto: 'FERNANDO RUIZ INGA',
  cargo: 'GERENTE',
  email: 'FRUIZ159@GMAIL.COM',
  telefonos: '969032194',
  gestor: '00000001 — GESTOR 1',
  gestorIni: '2026-01-01',
  gestorFin: '2026-12-31',
  notifElec: true,
  tipoBen: 'PENSIONISTA — DEDUCCIÓN 50 UIT',
  benPredio: '02-014-D-14-01',
  benExp: '2026-0281',
  benFecha: '2026-03-04',
  benRes: 'RES-0412-2026-MDC',
  benEstado: 'VIGENTE',
  obs: 'MODIFICACIÓN DE PRUEBA',
  registrado: 'MRIOS — 12/08/2026 09:14',
  modificado: 'MRIOS — 03/07/2026 16:02',
  fotos: '2 imágenes — 12/08/2026, 03/07/2026',
  deduccion: 'NO APLICA',
  resBen: '',
  inafectacion: 'NINGUNA',
  /* Los cinco importes de la determinacion salen «—»: los produce el calculo,
     y el calculo no se puede pedir. Un «0.00» en «Monto deducido» se lee como
     «no le corresponde deduccion», que es una afirmacion, no una ausencia. */
  montoDed: '—',
  derecho: '—',
  c1: '—',
  c2: '—',
  c3: '—',
  c4: '—',
  espDenom: 'GRAN NOCHE DE CUMBIA',
  espLocal: 'COLISEO MUNICIPAL',
  espFecha: '18/07/2026',
  espAforo: '2400',
  espRuc: '20525118880',
  espGarantia: '8,400.00',
  /* Los valores por omision de las dos hojas de deuda se han ido. El alta y la
     baja escriben en la cuenta corriente, y llegaban con una obligacion entera
     escrita: S/ 1,842.60 de insoluto, su reajuste, su interes, el predio
     «02-014-D-14-01» y la resolucion «RD-2026-000418» que la sustenta —el numero
     que viaja como `documentoOrigen`—. Ninguna de esas cifras respalda ninguna
     norma ni ningun expediente: son de la maqueta, y un alta que las mandara
     incorporaria deuda inventada a quien estuviera abierto. Los importes ademas
     venian con separador de miles, que el backend rechaza con 422 nombrando el
     campo que el propio formulario relleno.

     `autorizado` es `ro` y ninguna lectura lo publica, asi que sale «—»
     (CONECTAR.md, salida 3) en vez de una gerencia que nadie firmo. */
  autorizado: '—',
};
