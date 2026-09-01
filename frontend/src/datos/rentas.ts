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

export type BloqueDef = { titulo?: string; nota?: string; campos: CampoDef[]; tabla?: TablaDef };

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

  {
    id: 'unidades',
    label: 'Predios y vehículos',
    hint: 'Las unidades afectas de las que sale el impuesto',
    conteo: '2 predios · 1 vehículo',
    bloques: [
      {
        titulo: 'Predios',
        nota: 'El padrón predial de rentas. El código predial es el mismo código de referencia catastral: no hay dos padrones de predios.',
        campos: [],
        tabla: {
          titulo: 'Predios registrados',
          conteo: '2 predios · autovalúo S/ 170,616.75',
          accion: 'Ver ficha catastral',
          min: '800px',
          cols: [
            ['Código predial', 0],
            ['Ubicación', 0],
            ['Uso', 0],
            ['Terreno m²', 1],
            ['Const. m²', 1],
            ['% prop.', 1],
            ['Autovalúo S/', 1],
            ['Condición', 0],
          ],
          filas: [
            ['02-014-D-14-01', 'CALLE SANTA ROSA 116', 'Casa habitación', '210.00', '164.50', '100.00', '132,196.75', 'Afecto'],
            ['04-021-B-07-00', 'MZ. B LT. 7 — BELLAVISTA', 'Terreno sin construir', '184.00', '0.00', '50.00', '38,420.00', 'Afecto'],
          ],
          nota: 'El autovalúo del conjunto es la base imponible del predial: se determina por contribuyente, no por predio.',
        },
      },
      {
        titulo: 'Vehículos',
        nota: 'La afectación corre tres ejercicios desde el año siguiente a la primera inscripción registral.',
        campos: [],
        tabla: {
          titulo: 'Vehículos afectos',
          conteo: '2 registros',
          accion: '+ Añadir vehículo',
          min: '760px',
          cols: [
            ['Placa', 0],
            ['Clase', 0],
            ['Marca', 0],
            ['Modelo', 0],
            ['Año fab.', 0],
            ['Base imponible S/', 1],
            ['Afectación', 0],
            ['Estado', 0],
          ],
          filas: [
            ['T2G-418', 'AUTOMÓVIL', 'TOYOTA', 'YARIS GLI', '2018', '61,400.00', '2019 — 2021', 'Baja por vencimiento'],
            ['V1H-882', 'CAMIONETA', 'HYUNDAI', 'TUCSON', '2024', '112,800.00', '2025 — 2027', 'Afecto'],
          ],
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

export type FiltroDef = { l: string; v: string; t?: 'sel'; o?: string[]; ph?: string };

/** Una línea de la memoria del cálculo: operador, rótulo, detalle, importe y
 *  —cuando la hay— la clase que la destaca como subtotal o como total. */
export type LineaDeMemoria = [op: string, label: string, detalle: string, valor: string, clase?: 'sub' | 'total'];

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

export const DETERMINACIONES: Record<ClaveDeDeterminacion, DeterminacionDef> = {
  predial: {
    label: 'Predial — individual',
    titulo: 'Cálculo individual del impuesto predial',
    endpoint: 'POST /api/v1/rentas/predial/calculo-individual',
    desc: 'Determina el impuesto de un contribuyente sobre el autovalúo acumulado de todos sus predios en el distrito, con la escala progresiva acumulativa y el mínimo imponible de 0.6 % de la UIT.',
    filtros: [
      { l: 'Cod. Contribuyente', v: '00000025673' },
      { l: 'DJ N°', v: '000418' },
      { l: 'Tipo de declaración', t: 'sel', v: 'RECTIFICATORIA', o: ['INSCRIPCIÓN', 'DESCARGO', 'RECTIFICATORIA', 'ANUAL MECANIZADA'] },
      { l: 'Fecha de declaración', v: '27/02/2026' },
    ],
    tabla: {
      titulo: 'Predios que integran la base imponible',
      conteo: '2 predios',
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
      filas: [
        ['02-014-D-14-01', 'CALLE SANTA ROSA 116', 'Casa habitación', '100.00', '132,196.75', '0.00', '132,196.75'],
        ['04-021-B-07-00', 'MZ. B LT. 7 — BELLAVISTA', 'Terreno sin construir', '50.00', '38,420.00', '0.00', '19,210.00'],
      ],
      nota: 'Fases del cálculo: REGISTRO → HR (hoja resumen) → PU (predio urbano) → PR (predio rústico). No se emite cuponera si alguna fase presenta inconsistencia.',
    },
    memoria: {
      titulo: 'Escala progresiva acumulativa',
      lineas: [
        ['', 'Valuo total del conjunto', '2 predios, al 100 % y al 50 %', '170,616.75'],
        ['−', 'Valuo exonerado', 'Sin beneficio aplicado este ejercicio', '0.00'],
        ['=', 'Valuo afecto', '', '151,406.75', 'sub'],
        ['×', 'Tramo 1 — hasta 15 UIT · 0.2 %', 'S/ 80,250.00 del afecto', '160.50'],
        ['×', 'Tramo 2 — de 15 a 60 UIT · 0.6 %', 'S/ 71,156.75 del afecto', '426.94'],
        ['×', 'Tramo 3 — más de 60 UIT · 1.0 %', 'S/ 0.00 del afecto', '0.00'],
        ['=', 'Impuesto insoluto anual', '', '587.44', 'total'],
        ['', 'Mínimo imponible — 0.6 % de la UIT', 'Comprobación: el insoluto lo supera', '32.10'],
      ],
      nota: 'UIT vigente 2026: S/ 5,350.00. La escala y su conjunto sellado los pone el servidor; la pantalla no calcula ninguna de estas cifras.',
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
          { k: 'montoDed', l: 'Monto deducido (S/)', t: 'ro' },
        ],
      },
      {
        label: 'Emisión y cuotas',
        hint: 'Cómo se cobra',
        campos: [
          { k: 'modalidad', l: 'Modalidad', t: 'sel', o: ['AL CONTADO', 'FRACCIONADO EN 4 CUOTAS'] },
          { k: 'derecho', l: 'Derecho de emisión (S/)', t: 'ro' },
          { k: 'c1', l: 'Cuota 1 — vence 28/02', t: 'ro' },
          { k: 'c2', l: 'Cuota 2 — vence 31/05', t: 'ro' },
          { k: 'c3', l: 'Cuota 3 — vence 31/08', t: 'ro' },
          { k: 'c4', l: 'Cuota 4 — vence 30/11', t: 'ro' },
        ],
      },
    ],
    totales: [
      ['Valuo afecto', 'S/ 151,406.75', 0],
      ['Impuesto insoluto', 'S/ 587.44', 0],
      ['Derecho de emisión', 'S/ 4.50', 0],
      ['Total a pagar', 'S/ 591.94', 1],
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
    filtros: [
      { l: 'Alcance', t: 'sel', v: 'TODO EL PADRÓN', o: ['TODO EL PADRÓN', 'POR SECTOR', 'POR RANGO DE CÓDIGO', 'SOLO OBSERVADOS'] },
      { l: 'Sector', t: 'sel', v: 'Todos', o: ['Todos', '01', '02', '03', '04', '05'] },
      { l: 'UIT del ejercicio (S/)', v: '5,350.00' },
      { l: 'Derecho de emisión (S/)', v: '4.50' },
    ],
    tabla: {
      titulo: 'Resultado de la última corrida',
      conteo: 'Ejecutada el 28/01/2026 — 02:14 h',
      min: '620px',
      cols: [
        ['Etapa', 0],
        ['Registros', 1],
        ['Monto S/', 1],
        ['Observados', 1],
        ['Estado', 0],
      ],
      filas: [
        ['Lectura del padrón', '62,418', '—', '0', 'Completa'],
        ['Valuación de predios', '78,204', '1,842,116,420.00', '412', 'Completa'],
        ['Determinación del impuesto', '61,884', '9,418,204.60', '534', 'Completa'],
        ['Determinación de arbitrios', '61,884', '5,884,110.20', '188', 'Completa'],
        ['Generación de cuponeras', '61,350', '—', '534', 'Con observados'],
      ],
      nota: 'Los observados quedan sin emisión hasta que se corrija la inconsistencia: predio sin arancel, ficha no conciliada o titularidad incompleta.',
    },
    secciones: [
      {
        label: 'Qué hace esta corrida',
        hint: 'Se confirma antes de ejecutar',
        campos: [
          { k: 'incArbitrios', l: 'Incluye arbitrios', t: 'chk', ph: 'Emitir arbitrios junto al predial' },
          { k: 'recalcula', l: 'Recalcula ya emitidos', t: 'chk', ph: 'Sobrescribe cuponeras existentes' },
          { k: 'cuponera', l: 'Genera cuponera PDF', t: 'chk', ph: 'Produce archivo para imprenta' },
        ],
      },
    ],
    acciones: [
      ['Simular', 0],
      ['Ver observados', 0],
      ['Ejecutar proceso', 1],
    ],
    aviso: 'Un proceso masivo toca 62,418 cuentas. Simular primero no es una formalidad: es la única forma de ver los observados antes de emitir.',
  },

  arbitrios: {
    label: 'Arbitrios',
    titulo: 'Arbitrios municipales',
    endpoint: 'GET /api/v1/rentas/arbitrios',
    desc: 'Limpieza pública, parques y jardines y serenazgo. La tasa depende del uso del predio, la zona, la frecuencia del servicio y los metros de frontis declarados en la ficha catastral.',
    filtros: [
      { l: 'Código predial', v: '02-014-D-14-01' },
      { l: 'Zona', t: 'sel', v: 'Zona 2', o: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'] },
      { l: 'Uso', t: 'sel', v: 'CASA HABITACIÓN', o: ['CASA HABITACIÓN', 'COMERCIO', 'INDUSTRIA', 'SERVICIOS', 'TERRENO SIN CONSTRUIR'] },
    ],
    tabla: {
      titulo: 'Determinación por servicio',
      conteo: '4 servicios · 12 cuotas',
      min: '700px',
      cols: [
        ['Servicio', 0],
        ['Criterio de distribución', 0],
        ['Frecuencia', 0],
        ['Tasa mensual S/', 1],
        ['Anual S/', 1],
        ['Condición', 0],
      ],
      filas: [
        ['LIMPIEZA PÚBLICA — BARRIDO', 'Metros lineales de frontis', 'DIARIA', '8.40', '100.80', 'Afecto'],
        ['LIMPIEZA PÚBLICA — RECOLECCIÓN', 'Área construida y uso', 'INTERDIARIA', '14.20', '170.40', 'Afecto'],
        ['PARQUES Y JARDINES', 'Ubicación del predio', 'PERMANENTE', '6.10', '73.20', 'Afecto'],
        ['SERENAZGO', 'Uso y peligrosidad de zona', 'PERMANENTE', '11.80', '141.60', 'Afecto'],
      ],
    },
    totales: [
      ['Arbitrio anual', 'S/ 486.00', 0],
      ['Descuento pronto pago', '− S/ 48.60', 0],
      ['Cuotas', '12 mensuales', 0],
      ['Total 2026', 'S/ 437.40', 1],
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
    desc: 'Aplica el 1 % sobre la base imponible con un mínimo del 1.5 % de la UIT, por los tres ejercicios en que el vehículo permanece afecto.',
    filtros: [
      { l: 'Placa', v: 'V1H-882' },
      { l: 'Cod. Contribuyente', v: '00000003541' },
    ],
    tabla: {
      titulo: 'Determinación por ejercicio',
      conteo: '3 ejercicios afectos',
      min: '620px',
      cols: [
        ['Ejercicio', 0],
        ['Base imponible S/', 1],
        ['Tasa', 0],
        ['Impuesto S/', 1],
        ['Cuotas', 0],
        ['Estado', 0],
      ],
      filas: [
        ['2025', '112,800.00', '1.0 %', '1,128.00', '4', 'Cancelado'],
        ['2026', '112,800.00', '1.0 %', '1,128.00', '4', 'Emitido'],
        ['2027', '112,800.00', '1.0 %', '1,128.00', '4', 'Proyectado'],
      ],
    },
    memoria: {
      titulo: 'Base imponible del ejercicio',
      lineas: [
        ['', 'Valor de adquisición', 'Declarado por el titular', '112,400.00'],
        ['', 'Tabla referencial MEF 2024', 'Publicada para el año de fabricación', '112,800.00'],
        ['=', 'Base imponible — el mayor de los dos', '', '112,800.00', 'sub'],
        ['×', 'Tasa', '1.0 %', '1,128.00'],
        ['=', 'Impuesto anual', '', '1,128.00', 'total'],
        ['', 'Mínimo imponible — 1.5 % de la UIT', 'Comprobación: el impuesto lo supera', '80.25'],
      ],
      nota: 'La afectación corre tres ejercicios desde el año siguiente a la primera inscripción registral. Al cuarto, el vehículo deja de estar afecto por vencimiento, no por baja.',
    },
    totales: [
      ['Base imponible', 'S/ 112,800.00', 0],
      ['Impuesto anual', 'S/ 1,128.00', 0],
      ['Cuota trimestral', 'S/ 282.00', 0],
      ['Total tres ejercicios', 'S/ 3,384.00', 1],
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
    desc: 'Grava la transferencia de propiedad con el 3 % sobre el exceso de las primeras 10 UIT, tomando como base el mayor valor entre el de transferencia y el autovalúo ajustado por el IPM.',
    filtros: [
      { l: 'Nº de liquidación', v: 'ALC-2026-00418' },
      { l: 'Nº de expediente', v: '2026-0918' },
      { l: 'Fecha de la transferencia', v: '18/07/2026' },
    ],
    memoria: {
      titulo: 'Liquidación',
      lineas: [
        ['', 'Valor de transferencia', 'Según minuta EP-2218-2026', '95,000.00'],
        ['', 'Autovalúo del predio', 'Ejercicio 2026', '76,840.00'],
        ['×', 'IPM aplicado al autovalúo', 'Índice de precios al por mayor · 1.0206', '78,420.00'],
        ['=', 'Base de cálculo — el mayor de los dos', '', '95,000.00', 'sub'],
        ['−', 'Tramo inafecto — 10 UIT', 'S/ 5,350.00 × 10', '53,500.00'],
        ['=', 'Base imponible', '', '41,500.00', 'sub'],
        ['×', 'Tasa', '3.0 %', '1,245.00'],
        ['=', 'Impuesto de alcabala', 'Vence el 31/08/2026, último día hábil del mes siguiente', '1,245.00', 'total'],
      ],
      nota: 'El adquirente es el contribuyente de la alcabala. Si el vendedor es una empresa constructora y es la primera venta, solo se grava el valor del terreno.',
    },
    totales: [
      ['Base de cálculo', 'S/ 95,000.00', 0],
      ['Tramo inafecto', 'S/ 53,500.00', 0],
      ['Base imponible', 'S/ 41,500.00', 0],
      ['Alcabala a pagar', 'S/ 1,245.00', 1],
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
    desc: 'Grava el monto que se abona por presenciar el espectáculo. La tasa depende del tipo de evento y el organizador actúa como agente perceptor.',
    filtros: [
      { l: 'Nº de expediente', v: '2026-0884' },
      { l: 'Organizador', v: 'PRODUCCIONES DEL NORTE EIRL' },
      {
        l: 'Tipo de espectáculo',
        t: 'sel',
        v: 'CONCIERTO DE MÚSICA POPULAR',
        o: ['CONCIERTO DE MÚSICA POPULAR', 'ESPECTÁCULO TAURINO', 'CARRERA DE CABALLOS', 'DISCOTECA', 'CINE', 'TEATRO', 'FOLCLORE NACIONAL'],
      },
    ],
    tabla: {
      titulo: 'Espectáculos declarados',
      conteo: '3 de 84',
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
      filas: [
        ['2026-0884', 'PRODUCCIONES DEL NORTE EIRL', 'Concierto de cumbia', '18/07/2026', '2,400', '84,000.00', '10 %', '8,400.00'],
        ['2026-0912', 'ASOC. TAURINA CATACAOS', 'Corrida de toros', '02/08/2026', '1,800', '126,000.00', '10 %', '12,600.00'],
        ['2026-0918', 'CINE PLAZA SAC', 'Función de cine', '10/08/2026', '320', '4,800.00', '0 %', '0.00'],
      ],
      nota: 'El cine, el teatro, los conciertos de música clásica, la ópera, el ballet y el folclore nacional están inafectos por ley.',
    },
    memoria: {
      titulo: 'Liquidación del evento',
      lineas: [
        ['', 'Entradas vendidas', '2,240 de 2,400 de aforo autorizado', '2,240'],
        ['×', 'Precio promedio', 'S/ 37.50', '84,000.00'],
        ['=', 'Recaudación declarada', '', '84,000.00', 'sub'],
        ['×', 'Tasa del tipo de espectáculo', 'Concierto de música popular · 10 %', '8,400.00'],
        ['=', 'Impuesto a pagar', '', '8,400.00', 'total'],
        ['', 'Garantía depositada', 'Se devuelve al liquidar el evento', '8,400.00'],
      ],
      nota: 'El organizador es agente perceptor: retiene y entrega. La garantía cubre el impuesto si no lo hace.',
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
    aviso: 'Los cuatro filtros de búsqueda están bloqueados: ninguna lectura del contrato lista los espectáculos declarados, así que elegirlos cambiaría la URL y nada más.',
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
     ensena «2026» y manda «2024» es el defecto de #331. */
  { k: 'altaAnio', l: 'Año', t: 'sel', v: '2026', o: ['2026', '2025', '2024', '2023', '2022'] },
  { k: 'altaCuotaD', l: 'Cuota desde', t: 'text', ayuda: '0 es anual; 1 a 12, la cuota o el mes' },
  { k: 'altaCuotaH', l: 'Cuota hasta', t: 'text', ayuda: 'No viaja: el backend registra una cuota por acto' },
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
  montoDed: '0.00',
  modalidad: 'FRACCIONADO EN 4 CUOTAS',
  derecho: '4.50',
  c1: '147.98',
  c2: '146.86',
  c3: '146.86',
  c4: '146.86',
  incArbitrios: true,
  recalcula: false,
  cuponera: true,
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
