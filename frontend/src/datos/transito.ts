/* Lo que queda del artboard `Transito.dc.html` una vez que el módulo lee del
   backend: los rótulos, la prosa, las columnas y los criterios de cada hoja.

   **Aquí ya no hay ni una cifra ni una fila inventada.** Las que había —12,844
   papeletas, seis filas de padrón, tres vehículos en depósito, quince hojas con
   sus filas— salían del prototipo, y una cifra del prototipo es indistinguible
   de una correcta en cuanto sale de la pantalla. Lo que el backend publica lo
   dibuja `Transito.tsx`; lo que no publica sale «—» diciendo por qué. */

/** Una columna de tabla: su rótulo y si es numérica (alineada a la derecha). */
export type Columna = [label: string, numerica: 0 | 1];

/** Una fila de tabla, celda a celda, en el orden de sus columnas. */
export type Fila = string[];

/** Un campo de formulario tal como lo declara el artboard. */
export type CampoDef = {
  k: string;
  l: string;
  t?: 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';
  o?: string[];
  v?: string;
  ancho?: boolean;
  ayuda?: string;
  ph?: string;
};

/* ══════════ PANEL ══════════ */

/**
 * Los siete estados de `EstadoDePapeleta`, con el rótulo con que se leen y en
 * el orden del procedimiento.
 *
 * **No es el embudo del artboard.** Aquel tenía cuatro etapas —Levantada,
 * Notificada, Firme, Cobrada— y ninguna de las cuatro es un valor del
 * enumerado: «Levantada» no es `IMPUESTA` y «Firme» no es `RESUELTA`. Se
 * enseñan los siete que el dominio tiene, con su propia palabra.
 */
export const ESTADOS_DE_PAPELETA: [clave: string, rotulo: string, nota: string][] = [
  ['IMPUESTA', 'Impuesta', 'El inspector la levantó y todavía no se notificó'],
  ['NOTIFICADA', 'Notificada', 'Aquí empieza a correr el plazo de descargo'],
  ['RESUELTA', 'Resuelta', 'Se resolvió el recurso presentado contra ella'],
  ['PAGADA', 'Pagada', 'Cerrada con recibo'],
  ['COACTIVA', 'En coactiva', 'Firme y sin pagar: pasó a ejecución'],
  ['ANULADA', 'Anulada', 'Dejada sin efecto; no se cobra'],
  ['PRESCRITA', 'Prescrita', 'Venció el plazo para exigirla'],
];

/* ══════════ PADRÓN ══════════ */

/** Por qué campo busca la caja del padrón. Los tres los admite el endpoint. */
export const CRITERIOS_DE_BUSQUEDA: [clave: string, rotulo: string, ph: string][] = [
  ['placa', 'Placa', 'NB-21169'],
  ['nroPapeleta', 'Nº de papeleta', 'MDC-2026-041182'],
  ['documentoDelInfractor', 'Documento del infractor', '03593174'],
];

/**
 * Las columnas de la grilla, en la forma que `PapeletaResource` la devuelve.
 *
 * **Sin «Código» ni «Conductor»**: ese recurso no publica el código de la
 * infracción ni el nombre del obligado, aunque la papeleta los tenga dentro.
 * Los publica el padrón (`GET /transito/reportes/padron`), que es otra
 * operación y está en el centro de reportes.
 */
export const COLS_PADRON: Columna[] = [
  ['Papeleta', 0], ['Fecha', 0], ['Lugar', 0], ['Placa', 0],
  ['Importe S/', 1], ['A pagar S/', 1], ['Estado', 0],
];

/* ══════════ INTERNAMIENTO ══════════ */

/** Los tres valores de `EstadoDeInternamiento`, más el «todos» de la pantalla. */
export const ESTADOS_DE_INTERNAMIENTO = ['Todos', 'INTERNADO', 'LIBERADO', 'EN_ABANDONO'];

/** Los campos del acta de liberación, uno por campo de `PeticionDeLiberacion`. */
export const CAMPOS_LIBERACION: CampoDef[] = [
  { k: 'libFecha', l: 'Fecha de liberación', t: 'date' },
  { k: 'libRecibo', l: 'Nº de recibo de la custodia', t: 'text', ph: '000049406', ayuda: 'El backend lo acredita contra tesorería; sin recibo pagado el vehículo no sale' },
  { k: 'libPersona', l: 'Persona que retira', t: 'text', ph: 'Nombre completo' },
  { k: 'libDoc', l: 'Documento de quien retira', t: 'text', ph: 'DNI' },
];

/* ══════════ PROCESOS ══════════ */

export type Proceso = {
  k: string;
  label: string;
  titulo: string;
  endpoint: string;
  desc: string;
  nota: string;
  aviso: string;
  primaria: string;
};

/** Los tres actos que mueven la papeleta sin ser la papeleta. */
export const PROCESOS: Proceso[] = [
  {
    k: 'valores',
    label: 'Generación de valores',
    titulo: 'Generación de valores de tránsito',
    endpoint: 'POST /api/v1/transito/valores/generacion-masiva',
    desc: 'Registra el criterio con el que se emitirán después los valores de las papeletas pendientes. Se elige por rango de fechas de infracción o por la lista de números marcados, y exactamente uno de los dos: los dos a la vez se rechazan para que no gane uno en silencio.',
    nota: 'La corrida se registra y devuelve sus candidatos. NO emite ningún valor: la generación corre después, en el proceso por lotes. El número de cada resolución de multa lo pone el correlativo del servidor y no entra por el formulario.',
    aviso: 'El criterio de recaudo, la oficina y el vencimiento que el manual dibuja no están en el cuerpo que el backend acepta: no se piden.',
    primaria: 'Registrar la corrida',
  },
  {
    k: 'numero',
    label: 'Cambio de nº de papeleta',
    titulo: 'Cambio de número de papeleta de tránsito',
    endpoint: 'PATCH /api/v1/transito/papeletas/{numero}/codigo',
    desc: 'Corrige el número de papeleta registrado cuando hubo error del operador. Se identifica la papeleta por su número actual y se teclea el nuevo.',
    nota: 'Un cambio de número deja rastro: la bitácora anota quién lo hizo y con qué observación. La placa NO se cambia por aquí —el cuerpo que el backend acepta solo lleva el número nuevo—.',
    aviso: 'Si la papeleta ya está en coactiva, el expediente la referencia por su número: el cambio necesita resolución previa.',
    primaria: 'Cambiar el número',
  },
  {
    k: 'descargo',
    label: 'Descargos y reclamos',
    titulo: 'Descargo presentado contra una papeleta',
    endpoint: 'POST /api/v1/transito/descargos',
    desc: 'Registra el escrito que el administrado presenta contra la papeleta dentro del plazo. El backend calcula hasta cuándo se podía presentar y si llegó en plazo: no se teclea.',
    nota: 'Registrar el descargo no lo resuelve. Lo que lo resuelve es la resolución de gerencia, que es otro acto y otro permiso.',
    aviso: 'Una papeleta sin nada que impugnar —pagada, anulada— se rechaza: el descargo no tendría objeto.',
    primaria: 'Registrar el descargo',
  },
];

/** Los cuatro valores de `TipoDeRecurso`, letra por letra. */
export const TIPOS_DE_RECURSO = ['DESCARGO', 'RECONSIDERACION', 'APELACION', 'NULIDAD'];

/* ══════════ CÓDIGOS DE TRÁNSITO ══════════ */

/**
 * Las columnas del catálogo, en la forma que `CodigoInfraccionResource` la da.
 *
 * **Sin «Gravedad» y sin «Multa S/»**: `codigo_infraccion` no guarda la
 * clasificación de gravedad —el contrato llegó a declarar un filtro por ella
 * que ningún controlador lee— y la multa es el porcentaje por la UIT del
 * ejercicio, que sale del conjunto de parámetros sellado.
 */
export const COLS_COD: Columna[] = [
  ['Código', 0], ['Descripción', 0], ['% UIT', 1], ['Puntos', 1],
  ['Medida preventiva', 0], ['Base legal', 0], ['Vigente desde', 0],
];

/* ══════════ CENTRO DE REPORTES ══════════ */

export type Criterio = { l: string; t: 'text' | 'sel' | 'date'; v: string; o?: string[] };

/**
 * Los criterios que los reportes usan **de verdad**.
 *
 * El formulario del manual dibujaba diecinueve y apagaba los que no iban; el
 * carril del rediseño enseña solo los del reporte elegido. Aquí, además, solo
 * están los que algún controlador lee: los que el contrato declara y nadie
 * atiende —`ordenadoPor`, `cobranza`, `tipoDeCobranza`, `gravedad`— no se
 * dibujan, porque un filtro que se teclea y no filtra es peor que no tenerlo.
 */
export const CRITERIOS: Record<string, Criterio> = {
  papeleta: { l: 'Nº de papeleta', t: 'text', v: '' },
  placa: { l: 'Placa', t: 'text', v: '' },
  licencia: { l: 'Licencia de conducir', t: 'text', v: '' },
  documento: { l: 'Documento del infractor', t: 'text', v: '' },
  conductor: { l: 'Conductor', t: 'text', v: '' },
  nDeConstancia: { l: 'Nº de constancia', t: 'text', v: '' },
  usuarioQueEmitio: { l: 'Usuario que emitió', t: 'text', v: '' },
  codigoDeInfraccion: { l: 'Código de infracción', t: 'text', v: '' },
  iniciales2Letras: { l: 'Iniciales de placa (2 letras)', t: 'text', v: '' },
  desde: { l: 'Fecha desde', t: 'date', v: '' },
  hasta: { l: 'Fecha hasta', t: 'date', v: '' },
  estado: {
    l: 'Estado de la papeleta',
    t: 'sel',
    v: '',
    o: ['', 'IMPUESTA', 'NOTIFICADA', 'RESUELTA', 'PAGADA', 'COACTIVA', 'ANULADA', 'PRESCRITA'],
  },
  ano: { l: 'Año', t: 'sel', v: '', o: ['', '2026', '2025', '2024', '2023'] },
  agrupadoPor: { l: 'Agrupado por', t: 'sel', v: '', o: ['', 'ANO', 'MES', 'ESTADO', 'CODIGO', 'PLACA'] },
};

/**
 * Una hoja del centro de reportes.
 *
 * `k` es lo que `Transito.tsx` usa para saber a qué ruta preguntar. `sirve`
 * dice si hay una lectura detrás: las tres que no la tienen se dibujan igual,
 * con su motivo, porque esconderlas dejaría el centro con doce entradas y
 * nadie sabría que faltan.
 */
export type Hoja = {
  k: string;
  g: string;
  label: string;
  sub: string;
  crit: string[];
  cierre: string;
  /** Lo que impide dibujar la hoja, cuando lo hay. */
  sinLectura?: string;
};

export const HOJAS: Hoja[] = [
  {
    k: 'record_conductor', g: 'Historiales', label: 'Record de conductor',
    sub: 'Historial de infracciones de tránsito de un conductor',
    crit: ['licencia', 'documento'],
    cierre: 'Uno de los dos criterios es obligatorio: sin ninguno esto sería el padrón entero con otro título, y el servidor lo rechaza. El puntaje acumulado no sale en esta lectura.',
  },
  {
    k: 'record_vehicular', g: 'Historiales', label: 'Record vehicular',
    sub: 'Historial de papeletas de un vehículo',
    crit: ['placa'],
    cierre: 'La placa es obligatoria, por el mismo motivo que la licencia en el record de conductor. El propietario responde solidariamente por las papeletas impuestas al conductor.',
  },
  {
    k: 'constancia_libre', g: 'Constancias', label: 'Constancia libre de infracciones',
    sub: 'Certificación de no adeudo por infracciones de tránsito',
    crit: [],
    cierre: 'Se expide a solicitud del interesado. Si a la fecha verificada hay una sola papeleta pendiente, el servidor la niega y dice cuáles lo impiden.',
    sinLectura:
      'Es una escritura, no una consulta: numera la constancia, exige la placa y la observación de quien la emite (regla 10), y si a la fecha verificada hay una sola papeleta pendiente la niega con 409 y la lista de las que lo impiden. Aquí no hay ni un campo para nada de eso: la hoja del carril no declara ninguno. Bajar el archivo sí se sabe —el emisor es un POST y `descargar()` los admite—, lo que falta es el formulario del acto. Lo que sí se ve, ya emitida, es en «Relación de constancias emitidas» (#589).',
  },
  {
    k: 'padron_constancias', g: 'Constancias', label: 'Relación de constancias emitidas',
    sub: 'Padrón de constancias libres de infracciones',
    crit: ['desde', 'hasta', 'nDeConstancia', 'usuarioQueEmitio'],
    cierre: 'Cada fila lleva su «verificada al» junto a la fecha de emisión: son cosas distintas y la que acredita es la primera.',
  },
  {
    k: 'padron', g: 'Padrones', label: 'Padrón de papeletas de infracción',
    sub: 'Relación de papeletas por periodo',
    crit: ['desde', 'hasta', 'estado'],
    cierre: 'El importe de cada fila es el del acta, congelado al registrar la papeleta, y por eso su fecha es la de la infracción y no la de hoy.',
  },
  {
    k: 'padron_coactiva', g: 'Padrones', label: 'Papeletas enviadas a coactiva',
    sub: 'Relación de papeletas con su resolución de multa emitida',
    crit: ['desde', 'hasta'],
    cierre: 'El ejecutor y el estado del expediente no son columnas de la papeleta: viven en el expediente coactivo, y ese corte lo sirve Coactiva. Pedirlos aquí se rechaza en vez de devolver el padrón sin filtrar.',
  },
  {
    k: 'estado_cuenta', g: 'Estados de cuenta', label: 'Estado de cuenta de infracciones',
    sub: 'Papeletas pendientes de un conductor o de un vehículo',
    crit: ['conductor', 'placa'],
    cierre: 'Esta lectura devuelve siempre las pendientes: el servidor lo fija y no lo publica como filtro. Los importes son los del acta; el interés del día lo lleva el libro.',
  },
  {
    k: 'hoja_papeleta', g: 'Documentos de la papeleta', label: 'Hoja informativa de la papeleta',
    sub: 'El acta con su desglose, su código y a quién se le cobra',
    crit: ['papeleta'],
    cierre: 'Los seis importes son los del acta, congelados al registrarla. La hoja NO dice lo que se debe hoy: esa cifra es del libro.',
  },
  {
    k: 'actos', g: 'Documentos de la papeleta', label: 'Actos y notificaciones',
    sub: 'Los documentos emitidos sobre la papeleta y sus acuses',
    crit: ['papeleta'],
    cierre: 'La notificación es lo que hace correr el plazo. Sin ella la papeleta no llega a ser firme y no se puede cobrar.',
  },
  {
    k: 'rg_ordinaria', g: 'Resoluciones', label: 'Resolución de gerencia ordinaria',
    sub: 'Resolución que resuelve el recurso presentado',
    crit: [],
    cierre: 'Contra ella procede apelación dentro de los quince días hábiles siguientes a su notificación.',
    sinLectura:
      'El backend la dicta —es una escritura que devuelve el documento— y no publica ninguna lectura que la liste. Lo que sí se puede ver es su rastro: sale en «Actos y notificaciones» de la papeleta.',
  },
  {
    k: 'rg_sancionadora', g: 'Resoluciones', label: 'Resolución de gerencia sancionadora',
    sub: 'Resolución que impone la sanción firme',
    crit: [],
    cierre: 'Se dicta sobre la ordinaria ya notificada y con su plazo vencido: el servidor comprueba las dos cosas.',
    sinLectura:
      'Lo mismo que la ordinaria: se dicta, no se lista. Su rastro sale en «Actos y notificaciones» de la papeleta.',
  },
  {
    k: 'resumen_recaudacion', g: 'Resúmenes', label: 'Resumen de recaudación',
    sub: 'Lo recaudado por papeletas de tránsito, según el libro',
    crit: ['ano'],
    cierre: 'No se recompone sumando papeletas pagadas: esa cifra no cuenta los intereses cobrados, cuenta entero un pago parcial y sigue contando un recibo anulado. El filtro por caja no se sirve aquí —la caja es de tesorería—.',
  },
  {
    k: 'resumen_papeletas', g: 'Resúmenes', label: 'Resumen de pendientes y pagadas',
    sub: 'Cuántas papeletas hay y por cuánto',
    crit: ['desde', 'hasta', 'agrupadoPor'],
    cierre: 'Todos los importes son los de las actas, no lo cobrado. Cada línea trae las pendientes y las coactivas en columnas separadas, así que no hace falta pedir el resumen dos veces.',
  },
  {
    k: 'resumen_codigo', g: 'Resúmenes', label: 'Resumen por código de infracción',
    sub: 'Papeletas agrupadas por código del reglamento',
    crit: ['codigoDeInfraccion', 'desde', 'hasta', 'estado'],
    cierre: 'Es la lectura que orienta dónde poner los operativos: qué códigos concentran las papeletas del periodo.',
  },
  {
    k: 'resumen_placa', g: 'Resúmenes', label: 'Resumen por iniciales de placa',
    sub: 'Papeletas agrupadas por las dos letras iniciales de la placa',
    crit: ['iniciales2Letras', 'desde', 'hasta', 'estado'],
    cierre: 'Sirve para el cruce con los padrones de transporte: una serie concentrada suele ser una empresa. El filtro se resuelve como rango y no como LIKE.',
  },
];

/* ══════════ PALETA ══════════ */

/** Las veintitrés opciones del manual, con el destino al que lleva cada una. */
export const OPCIONES: [label: string, dest: string][] = [
  ['Papeletas', 'padron'],
  ['Búsqueda de infracciones', 'padron'],
  ['Estado de cuenta de infracciones', 'reportes'],
  ['Descargos y reclamos', 'procesos'],
  ['Internamiento vehicular', 'internamiento'],
  ['Códigos de tránsito', 'codigos'],
  ['Generación de valores', 'procesos'],
  ['Cambio de nº de papeleta', 'procesos'],
  ['Resoluciones y documentos', 'reportes'],
  ['Record de conductor', 'reportes'],
  ['Record vehicular', 'reportes'],
  ['Constancia libre de infracciones', 'reportes'],
  ['Relación de constancias emitidas', 'reportes'],
  ['Padrón de papeletas', 'reportes'],
  ['Papeletas enviadas a coactiva', 'reportes'],
  ['Reporte papeleta de infracción', 'reportes'],
  ['Notificación de papeleta', 'reportes'],
  ['Resolución de gerencia ordinaria', 'reportes'],
  ['Resolución de gerencia sancionadora', 'reportes'],
  ['Resumen de recaudación', 'reportes'],
  ['Resumen de pendientes y pagadas', 'reportes'],
  ['Resumen por código de infracción', 'reportes'],
  ['Resumen por iniciales de placa', 'reportes'],
];
