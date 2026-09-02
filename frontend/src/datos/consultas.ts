/**
 * Lo que el módulo de Consultas necesita saber y no sale del backend: los
 * rótulos de sus columnas, las once opciones del manual que resume y la prosa
 * que explica de dónde viene cada cifra.
 *
 * **Ya no hay datos de muestra.** Las seis vistas del estado de cuenta, la
 * búsqueda y la constancia leen del backend; lo que el artboard traía
 * —«CASTILLO PASCUALA, MARÍA ELENA», la ordenanza 012-2026-MDC, los cuatro
 * ejemplos de búsqueda— era la maqueta, y una cifra de maqueta es
 * indistinguible de una correcta en cuanto sale de la pantalla.
 */

/** Una columna de tabla: rótulo y si es numérica (alineada a la derecha). */
export type ColDef = [string, 0 | 1];

/** Lo que se escribe donde no hay dato. Una raya, nunca un cero ni un blanco. */
export const SIN_DATO = '—';

/* ══════════ Las seis vistas del estado de cuenta ══════════ */

export type Vista = 'resumen' | 'deuda' | 'pagos' | 'unidades' | 'valores' | 'movimientos';

export const VISTAS: { k: Vista; label: string }[] = [
  { k: 'resumen', label: 'Resumen' },
  { k: 'deuda', label: 'Deuda' },
  { k: 'pagos', label: 'Pagos' },
  { k: 'unidades', label: 'Unidades' },
  { k: 'valores', label: 'Valores' },
  { k: 'movimientos', label: 'Altas y bajas' },
];

/* ══════════ Columnas ══════════ */

export const COLS_DEUDA: ColDef[] = [
  ['Año', 0],
  ['Unidad', 0],
  ['Cuota', 0],
  ['Tributo', 0],
  ['Fase', 0],
  ['Insoluto', 1],
  ['Reajuste', 1],
  ['Interés', 1],
  ['Gastos', 1],
  ['Total', 1],
];

/**
 * Los pagos. **«Caja» y «Medio de pago» no están**, y no por olvido: ningún
 * campo del asiento distingue efectivo de tarjeta ni dice en qué caja se cobró
 * —esa distinción es de tesorería—, así que las dos columnas del prototipo
 * dibujarían un guion en todas las filas. Lo que sí trae el libro es el
 * documento con que se registró el cobro y su fecha valor.
 */
export const COLS_PAGOS: ColDef[] = [
  ['Documento', 0],
  ['Fecha valor', 0],
  ['Tributo', 0],
  ['Concepto', 0],
  ['Ejercicio', 0],
  ['Cuota', 0],
  ['Importe S/', 1],
];

export const COLS_PREDIOS: ColDef[] = [
  ['Código predial', 0],
  ['Dirección', 0],
  ['Tipo', 0],
  ['% titularidad', 1],
  ['Deuda S/', 1],
];

export const COLS_VEHICULOS: ColDef[] = [
  ['Placa', 0],
  ['Clase', 0],
  ['Marca y modelo', 0],
  ['Año fab.', 0],
  ['Afectación', 0],
  ['Estado', 0],
  ['Deuda S/', 1],
];

export const COLS_VALORES: ColDef[] = [
  ['Nº valor', 0],
  ['Tipo', 0],
  ['Emitido', 0],
  ['Tributo', 0],
  ['Periodo', 0],
  ['Exigible desde', 0],
  ['Importe S/', 1],
  ['Situación', 0],
];

export const COLS_MOVIMIENTOS: ColDef[] = [
  ['Documento', 0],
  ['A/B', 0],
  ['Fecha valor', 0],
  ['Tributo', 0],
  ['Concepto', 0],
  ['Ejercicio', 0],
  ['Unidad', 0],
  ['Importe S/', 1],
  ['Motivo', 0],
];

export const COLS_CONSTANCIA: ColDef[] = [
  ['Tributo', 0],
  ['Ejercicio', 0],
  ['Cuotas', 0],
  ['Unidad', 0],
  ['Fase', 0],
  ['Importe S/', 1],
];

/* `COLS_BENEFICIO` se ha ido. Era la declaración de las ocho columnas con que
   la maqueta del prototipo dibujaba la deuda acogida a una campaña de
   beneficio. Se fue cuando la simulación pasó a leer del backend: las columnas
   de esa tabla las declara ahora la pantalla, sobre los campos que el recurso
   publica de verdad. */

/* ══════════ Las notas de cada vista ══════════
   Dicen de dónde sale lo que se ve y qué NO se ve, que es la mitad que se
   olvida. Ninguna afirma una cifra. */

export const NOTAS: Record<Vista, string> = {
  resumen:
    'Las siete secciones se leen en una sola transacción de GET /consultas/unificada, con un solo instante de lectura: es lo que hace que las cifras de dos pestañas no se contradigan. El resumen de saldos lo suma el servidor sobre todas las obligaciones, no sobre la página devuelta.',
  deuda:
    'Una fila por obligación —tributo, ejercicio y unidad—, con su deuda actualizada a la fecha de corte. La fase coactiva incluye costas y gastos del procedimiento. Un predio o un vehículo en blanco no es un error: es una obligación que se asentó sin unidad.',
  pagos:
    'Cada fila es el asiento con que se registró el cobro, con su documento y su fecha valor. La caja y el medio de pago no figuran: ningún campo del libro los guarda todavía, y son de tesorería.',
  unidades:
    'Los predios y los vehículos afectos, con la deuda de cada uno a la fecha. El uso, el área y el autovalúo no vienen en esta lectura —son de la ficha catastral y de la determinación—, así que no se dibujan en vez de dibujarse en blanco.',
  valores:
    'Los valores emitidos a nombre del contribuyente. El importe está congelado al día en que se emitió el valor, no al de hoy: reimprimirlo dos años después devuelve el mismo desglose. La situación, en cambio, sí se mira a hoy.',
  /* Decía «si el movimiento lo escribió una persona o una emisión masiva no
     consta: nada en el libro lo marca todavía», y era cierto hasta `V68`: el
     abono de una baja y el de una cobranza son, columna a columna, el mismo
     asiento, así que esta pestaña listaba TODO el libro —los pagos como bajas y
     los cargos de la emisión como altas (#640)—. Ahora el asiento dice de qué
     acto nace y la consulta trae sólo los dos que la pestaña promete.
     Lo que sigue sin poder distinguirse son los asientos ANTERIORES a esa
     migración, que tienen el acto en blanco y no se pueden reescribir —el libro
     no admite `UPDATE` (V7) y el migrador corre sin contexto de tenant—, así que
     una baja de antes no aparece aquí. Se dice, porque su ausencia se lee igual
     que «no hubo ninguna». */
  movimientos:
    'Toda alta o baja de deuda con su documento, su fecha y su motivo. Es la bitácora que se mira cuando el contribuyente dice que ya pagó. Los cobros y los cargos de la emisión no salen: son del libro, no de esta pestaña. Las bajas anteriores a la migración que empezó a marcar el acto tampoco, y no se pueden recuperar.',
};

/**
 * La misma pestana, leida por cuota (#551).
 *
 * Va aparte y no dentro de `NOTAS` porque `NOTAS` esta llaveado por `Vista` y
 * esto no es otra vista: es el mismo `GET /consultas/deuda` con `porPeriodo`,
 * o sea otro corte de la misma tabla. Se dice entero y no como apendice de la
 * nota agregada porque las dos afirmaciones que importan —que cada fila es una
 * cuota y que el desglose es el suyo— dejan de ser ciertas al cambiar de corte,
 * y una nota que valga para las dos no dice ninguna de las dos.
 */
export const NOTA_DEUDA_POR_CUOTA =
  'Una fila por cuota, con el desglose que el servidor calculó para esa cuota a la fecha de corte: es la única lectura que dice cuánto se debe de la cuota 1 y cuánto de la 2, porque la vista por obligación publica un solo desglose para todo el grupo. La cuota «Anual» es la obligación que no se divide —la tasa de una licencia, la de un anuncio, una costa—, no la cuota cero. La fase también es la de cada cuota: la vista por obligación publica la más avanzada del grupo, que puede no ser la de las cuotas que deben.';

/* ══════════ Buscar ══════════ */

/** Cómo se escribe cada identificador. Es la forma, no un dato de nadie. */
export const FORMAS: { que: string; como: string }[] = [
  { que: 'Contribuyente', como: 'su código del padrón, su DNI de 8 dígitos, su RUC de 11 o parte de su nombre' },
  { que: 'Predio', como: 'el código de referencia catastral, entero o su principio' },
  { que: 'Vehículo', como: 'la placa completa, con guion o sin él' },
  { que: 'Recibo', como: 'el número completo, serie y correlativo' },
  { que: 'Valor', como: 'el número completo del valor' },
];

/* ══════════ Paleta de comandos ══════════ */

/**
 * Las once opciones del manual que el módulo resume, cada una a la vista donde
 * se contesta. `constancia` es el documento.
 */
export const OPCIONES: [string, Vista | 'constancia'][] = [
  ['Cuenta corriente', 'movimientos'],
  ['Consulta de deuda', 'deuda'],
  ['Deudas con beneficio', 'deuda'],
  ['Unificada predial-arbitrios', 'resumen'],
  ['Resumen predial-arbitrios', 'resumen'],
  ['Consulta de pagos', 'pagos'],
  ['Consulta de predios', 'unidades'],
  ['Consulta de vehículos', 'unidades'],
  ['Consulta de valores emitidos', 'valores'],
  ['Consulta de altas y bajas', 'movimientos'],
  ['Constancia de no adeudo', 'constancia'],
];
