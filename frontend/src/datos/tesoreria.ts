/**
 * Lo que queda del artboard `Tesoreria.dc.html` cuando el módulo lee del backend.
 *
 * <h2>Lo que se fue, y por qué</h2>
 *
 * Las cinco deudas, los cuatro conceptos del TUPA, los cuatro convenios, los tres
 * recibos, las cinco filas de avance, las seis de por área, los cuatro KPI y el
 * contribuyente de la barra de contexto **eran datos de muestra**, y todos tienen
 * ahora una lectura de verdad que los contradice o una razón escrita en pantalla
 * para no dibujarlos. Dejar la cifra del prototipo al lado de la del backend es
 * indistinguible de un dato correcto en cuanto sale de la pantalla.
 *
 * De `MEDIOS` y `ARQUEO_INICIAL` se fue además el vocabulario: el prototipo
 * declara «efectivo», «tarjeta de débito o crédito», «depósito en cuenta» y «pago
 * en línea», y `FormaDePago` (V3) declara EFECTIVO, CHEQUE, DEPOSITO, TARJETA y
 * TRANSFERENCIA. No coinciden en número ni en nombre: «pago en línea» no está en
 * el enumerado y el cheque no tiene casilla en el prototipo, de modo que un turno
 * con un cheque saldría descuadrado sin que el cajero pudiera decir nada.
 *
 * <h2>Lo que se queda</h2>
 *
 * Los rótulos que el manual escribe y el backend acepta como texto libre —los
 * motivos de una anulación, quién la autoriza— y los enumerados del dominio,
 * escritos letra por letra como los declara Java.
 */

/**
 * Las cinco formas de pago de `FormaDePago` (V3, `recibo_forma_pago_check`).
 *
 * El rótulo es para leerlo; lo que viaja es la clave. Ninguna se traduce por
 * parecido: «pago en línea» del prototipo no es `TRANSFERENCIA` —podría ser
 * tarjeta— y adivinarlo pondría el dinero del turno en la fila equivocada del
 * arqueo.
 */
export const FORMAS_DE_PAGO: readonly [string, string][] = [
  ['EFECTIVO', 'Efectivo'],
  ['CHEQUE', 'Cheque'],
  ['DEPOSITO', 'Depósito en cuenta'],
  ['TARJETA', 'Tarjeta de débito o crédito'],
  ['TRANSFERENCIA', 'Transferencia'],
];

/**
 * Las clases de cobranza que la caja **escribe hoy**, de las cinco que
 * `TipoDePago` declara.
 *
 * `A_CUENTA` y `CUOTA_CONVENIO` existen en el enumerado y el caso de uso las
 * rechaza con `TipoDePagoNoImplementado`: las dos son pagos parciales, y qué
 * parte de la deuda extingue un pago parcial es una **regla de imputación**
 * normativa (TUO del Código Tributario, art. 31) que no está transcrita ni
 * firmada. Ofrecerlas dejaría al cajero eligiendo una opción que contesta 422.
 *
 * `TASA` no está aquí porque no se elige: la pone la caja de tasas.
 */
export const TIPOS_DE_COBRANZA: readonly [string, string][] = [
  ['NORMAL', 'Cobranza normal'],
  ['PRECONVENIO', 'Cuota inicial de un convenio'],
];

/** Los nueve rótulos de «Forma de pago» del prototipo que no llegan a viajar. */
export const COBRANZAS_DEL_PROTOTIPO_SIN_BACKEND =
  'A cuenta, sólo gastos, beneficio total o parcial del año, adelanto de convenio, contado total y prescripción';

/**
 * Los dos de `EstadoDeRecibo` (#548). No hay un tercero.
 *
 * El prototipo escribe «Emitido» y «Anulado» con minúsculas y el enumerado los
 * declara en mayúsculas; lo que viaja es la clave, y «Todos» **no es un valor**:
 * es no mandar el parámetro. Mandarlo contesta 422 —«Estado de recibo
 * desconocido: 'Todos'. Se admite EMITIDO o ANULADO»—, que es lo que impide que
 * un filtro que no se entiende devuelva la lista entera a quien creía haberla
 * acotado.
 */
export const ESTADOS_DE_RECIBO: readonly [string, string][] = [
  ['EMITIDO', 'Emitido'],
  ['ANULADO', 'Anulado'],
];

/** Los cinco estados de `EstadoDeConvenio`. Ni «Cumplido» ni «En riesgo». */
export const ESTADOS_DE_CONVENIO: readonly [string, string][] = [
  ['PRECONVENIO', 'Preconvenio'],
  ['VIGENTE', 'Vigente'],
  ['ANULADO', 'Anulado'],
  ['QUEBRADO', 'Quebrado'],
  ['REFORMULADO', 'Reformulado'],
];

/** Los dos de `TipoDeConvenio`. */
export const TIPOS_DE_CONVENIO: readonly [string, string][] = [
  ['ORDINARIO', 'Ordinario'],
  ['COACTIVO', 'Coactivo'],
];

/** Los cinco de `TipoDeGarantia`. El backend admite el rótulo con espacios. */
export const TIPOS_DE_GARANTIA: readonly string[] = [
  'NO REQUIERE',
  'CARTA FIANZA',
  'HIPOTECA',
  'AVAL',
  'PRENDA',
];

/**
 * Los motivos de anulación que el manual dibuja.
 *
 * `PeticionDeAnulacion.motivo` es texto libre —es el sustento del acto, y se
 * imprime en el duplicado—, así que estos seis son sugerencias de verdad y no una
 * traducción de ningún enumerado.
 */
export const MOTIVOS_DE_ANULACION: readonly string[] = [
  'ERROR EN EL CONCEPTO COBRADO',
  'ERROR EN EL IMPORTE',
  'ERROR EN EL CONTRIBUYENTE',
  'PAGO DUPLICADO',
  'DESISTIMIENTO DEL ADMINISTRADO',
  'FALLA DE IMPRESIÓN',
];

/** Quién autoriza, tal como el manual lo escribe. También texto libre. */
export const AUTORIZANTES: readonly string[] = [
  'RESPONSABLE DE TESORERÍA',
  'GERENTE DE ADMINISTRACIÓN TRIBUTARIA',
];

/**
 * Las diez opciones del manual que el módulo resume, y el destino de cada una.
 * Es lo que alimenta la paleta de comandos.
 */
export const OPCIONES: readonly [string, string][] = [
  ['Caja tributaria', 'cobrar'],
  ['Caja de tasas', 'cobrar'],
  ['Fraccionamiento', 'convenios'],
  ['Convenios', 'convenios'],
  ['Anulación de convenio', 'convenios'],
  ['Duplicado de recibo', 'recibos'],
  ['Anulación de recibo', 'recibos'],
  ['Cierre de caja', 'cierre'],
  ['Avance de recaudación', 'recaudacion'],
  ['Recaudación por área', 'recaudacion'],
];
