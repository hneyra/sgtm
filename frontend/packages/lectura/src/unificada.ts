import type { Celda } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { SIN_DATO, esObjeto, importeDe, texto } from './contrato';

/**
 * **Lo que `GET /consultas/unificada` publica de una persona, ya leido** (#25).
 *
 * Vive en un paquete y no en una pantalla porque lo dibujan **dos**
 * aplicaciones: la ficha 360° del back-office (#297, ADR-0016 §2) y el portal
 * del contribuyente (#298, ADR-0016 §3). Las dos ensenan **las mismas cifras a
 * la misma fecha de calculo**, y esa es la frase que justifica el paquete: dos
 * lecturas del mismo cuerpo acaban leyendo campos distintos, y una de las dos
 * mal.
 *
 * Aqui no hay React ni catalogo: son adaptadores puros —de la respuesta a las
 * celdas—, de modo que cada aplicacion los dibuja como le toca. El back-office
 * los pone en una tabla de siete columnas; el portal, en 390 px, no tiene siete
 * columnas y los dibuja como pares rotulo/valor con **el mismo rotulo y el mismo
 * valor** (RNF-080).
 *
 * ── Donde falta un importe y por que falta ─────────────────────────────────
 *
 * La regla es una y se aplica igual a las seis: un importe se dibuja solo cuando
 * su fecha esta a la vista —o la rejilla entera comparte una y la banda la dice,
 * o la fila la trae en una columna—. Donde no se cumple ninguna de las dos, el
 * importe no se dibuja y la nota dice donde esta (regla 9, RNF-075).
 */

/**
 * Una de las seis rejillas que `consulta_unificada` trae en su respuesta.
 *
 * `rotulos` nombra la opcion de cuyo catalogo salen sus columnas: son dos
 * lecturas del mismo dato —la unificada las consolida y la opcion hermana las
 * lista con sus filtros—, asi que se nombran como ya se llaman.
 */
export interface RejillaDeLaFicha {
  /** Como la nombra el manual. Del catalogo, no inventado. */
  readonly titulo: string;
  /** La seccion de `ConsultaUnificadaResource` de la que salen sus filas. */
  readonly clave: string;
  /**
   * La opcion de cuyo catalogo salen los rotulos de sus columnas, **y a la que
   * se sale cuando la seccion trae mas de lo que cabe**: es la que pagina.
   *
   * Solo la usa el back-office: el portal no tiene catalogo al que salir
   * (ADR-0016 §3).
   */
  readonly rotulos: string;
  /**
   * Como se llama **una** de sus filas, y como se llaman varias.
   *
   * El conteo se redacta con esto —«3 de 43 deudas»— y no con «filas»: quien
   * atiende lee obligaciones, pagos y convenios, no filas de una tabla. A
   * diferencia de los rotulos de columna, que se comparan letra a letra contra
   * el catalogo, estos sustantivos no tienen rotulo del manual contra el que
   * probarse: son redaccion en lenguaje del dominio, y los vigila la revision,
   * no una prueba.
   */
  readonly una: string;
  readonly varias: string;
  readonly cols: readonly string[];
  readonly num?: readonly number[];
  readonly fila: (registro: Readonly<Record<string, unknown>>) => readonly Celda[];
  /**
   * Sus cifras estan todas a la fecha de corte de la consulta, y la banda la
   * dice una vez.
   *
   * Sin esto, la rejilla no dibuja banda porque **cada fila trae la suya** —un
   * pago de marzo no se actualiza— o porque no dibuja ninguna cifra. Las tres
   * situaciones son distintas y ninguna admite la fecha de otra (regla 9).
   */
  readonly aLaFechaDeCorte?: true;
  /** Que falta en esta rejilla y donde esta. Se dibuja bajo la tabla. */
  readonly nota?: string;
}

/** Un importe con su fecha, o el guion. Nunca el importe sin la fecha (regla 9). */
const importe = (valor: unknown): string => importeDe(valor)?.importe ?? SIN_DATO;

/** La fecha valor de un asiento: es la que lleva su propio monto. */
const fechaDelMonto = (registro: Readonly<Record<string, unknown>>): string =>
  importeDe(registro['monto'])?.actualizadoA ?? SIN_DATO;

/**
 * `CARGO` incorpora deuda (alta); `ABONO` la extingue (baja) — `MovimientoDeDeuda`.
 *
 * Es la unica traduccion de esta tabla, y no contradice «el texto es siempre el
 * del backend»: CARGO/ABONO son vocabulario del **contrato**, no del manual, y
 * el manual llama a estos movimientos altas y bajas. `condicionEspecial`, en
 * cambio, viaja ya redactada por el backend —«PENSIONISTA», «ADULTO MAYOR»— y
 * por eso se muestra tal cual, sin diccionario que mantener.
 */
function altaOBaja(tipo: unknown): string {
  if (tipo === 'CARGO') return 'ALTA';
  if (tipo === 'ABONO') return 'BAJA';
  return SIN_DATO;
}

/**
 * El tono de un estado. **El texto es siempre el del backend**: aqui solo se
 * decide el color, y nunca en lugar de la palabra (FRO-02 §2.1).
 */
function conTono(valor: unknown, buenos: readonly string[], malos: readonly string[]): Celda {
  const nombre = texto(valor);
  if (buenos.includes(nombre)) return { texto: nombre, tono: 'ok' };
  if (malos.includes(nombre)) return { texto: nombre, tono: 'bad' };
  return { texto: nombre };
}

/**
 * Las seis rejillas de `consulta_unificada`, en el orden en que el manual las
 * dibuja: primero lo que se debe, que es a lo que viene la gente.
 */
export const REJILLAS_DE_LA_UNIFICADA: readonly RejillaDeLaFicha[] = [
  {
    titulo: 'Deudas Pendientes',
    clave: 'deudasPendientes',
    una: 'deuda',
    varias: 'deudas',
    rotulos: 'consulta_deuda',
    cols: ['Año', 'Tributo', 'Insoluto S/', 'Reajuste S/', 'Interés S/', 'Gastos S/', 'Total S/'],
    num: [2, 3, 4, 5, 6],
    aLaFechaDeCorte: true,
    fila: (obligacion) => [
      { texto: texto(obligacion['ejercicio']) },
      { texto: texto(obligacion['tributo']) },
      { texto: importe(obligacion['insoluto']) },
      { texto: importe(obligacion['reajuste']) },
      { texto: importe(obligacion['interes']) },
      { texto: importe(obligacion['gasto']) },
      { texto: importe(obligacion['total']) },
    ],
    // «Cuota» y «Fase» son columnas de `consulta_deuda` y `ObligacionDeLaFicha`
    // no las publica: la unificada consolida por tributo y ejercicio.
    nota: 'La cuota y la fase de cada obligación se ven en «Consulta de deuda».',
  },
  {
    titulo: 'Pagos Realizados',
    clave: 'pagosRealizados',
    una: 'pago',
    varias: 'pagos',
    rotulos: 'consulta_pagos',
    cols: ['Fecha', 'Recibo', 'Concepto', 'Año', 'Importe S/'],
    num: [4],
    // Sin banda: **cada fila trae su fecha**, que es la fecha valor del asiento.
    // Un pago de marzo no se actualiza, y fecharlo hoy seria mentir sobre una
    // cifra que no se ha movido.
    fila: (asiento) => [
      { texto: fechaDelMonto(asiento) },
      { texto: texto(asiento['documentoOrigen']) },
      { texto: texto(asiento['tributo']) },
      { texto: texto(asiento['ejercicio']) },
      { texto: importe(asiento['monto']) },
    ],
  },
  {
    titulo: 'Altas y Bajas',
    clave: 'altasYBajas',
    una: 'movimiento',
    varias: 'movimientos',
    rotulos: 'consulta_altas_bajas',
    cols: ['A/B', 'Doc. Aprob.', 'Fecha Reg.'],
    fila: (asiento) => [
      { texto: altaOBaja(asiento['tipo']) },
      { texto: texto(asiento['documentoOrigen']) },
      { texto: fechaDelMonto(asiento) },
    ],
    // La lista de altas y bajas del manual **no tiene columna de importe**, y
    // esta no se la inventa: lo que movio cada asiento se lee en el libro.
    nota: 'El importe de cada movimiento se ve en «Estado de cuenta corriente».',
  },
  {
    titulo: 'Fraccionamientos',
    clave: 'fraccionamientos',
    una: 'convenio',
    varias: 'convenios',
    rotulos: 'consulta_convenios',
    cols: ['Nro. convenio', 'Fecha', 'Cuotas', 'Pagadas', 'Vencidas', 'Saldo S/', 'Estado'],
    num: [2, 3, 4, 5],
    aLaFechaDeCorte: true,
    fila: (convenio) => [
      { texto: texto(convenio['numero']) },
      { texto: texto(convenio['fecha']) },
      { texto: texto(convenio['cuotas']) },
      { texto: texto(convenio['pagadas']) },
      { texto: texto(convenio['vencidas']) },
      { texto: importe(convenio['saldo']) },
      conTono(convenio['estado'], ['VIGENTE'], ['QUEBRADO']),
    ],
    // La deuda acogida se queda fuera **por su fecha**: va a la fecha de corte
    // del convenio, que no es la de esta consulta ni la columna «Fecha» —esa es
    // la de suscripcion—. Dos cifras de dias distintos bajo una sola banda es
    // exactamente lo que el recurso separa en dos `ImporteActualizado`.
    nota: 'La deuda acogida va a la fecha de corte del convenio: se ve en «Consulta de convenios».',
  },
  {
    titulo: 'Valores',
    clave: 'valores',
    una: 'valor',
    varias: 'valores',
    rotulos: 'consulta_valores',
    cols: ['Nro. valor', 'Tipo', 'Tributo', 'Periodo', 'Estado'],
    fila: (valor) => [
      { texto: texto(valor['numero']) },
      { texto: texto(valor['tipo']) },
      { texto: texto(valor['tributos']) },
      { texto: texto(valor['periodo']) },
      conTono(valor['situacion'], ['PAGADO'], ['COACTIVA', 'EXIGIBLE']),
    ],
    // Sin importe, y no por olvido: el desglose de un valor esta **congelado** a
    // su `proyectadoA` —la fecha de la emision (AC de #37)—, que no es la de la
    // consulta y que ninguna columna del catalogo nombra. Sin sitio donde poner
    // esa fecha, la cifra no se dibuja.
    nota: 'El importe de cada valor está congelado a la fecha de su emisión: se ve, con ella, en «Consulta de valores emitidos».',
  },
  {
    titulo: 'Declaraciones presentadas',
    clave: 'declaracionesJuradas',
    una: 'declaración',
    varias: 'declaraciones',
    rotulos: 'declaracion_jurada',
    cols: ['DJ N°', 'Año', 'Tipo', 'Fecha', 'Estado'],
    fila: (declaracion) => [
      { texto: texto(declaracion['numero']) },
      { texto: texto(declaracion['ejercicio']) },
      { texto: texto(declaracion['tipo']) },
      { texto: texto(declaracion['fechaPresentacion']) },
      conTono(declaracion['estado'], ['CONFORME'], ['OBSERVADA']),
    ],
  },
];

/**
 * Los rotulos del «Resumen de saldos», tal como los declara el catalogo de
 * `consulta_unificada` (pestana «Resumen de Deudas»).
 *
 * Las cinco cifras salen **sumadas por el servidor** y la frase que las explica
 * viene redactada: aqui no se suma ni se compone texto con cifras dentro
 * (RNF-083). El dia que el total y el desglose discreparan, la explicacion tiene
 * que venir del mismo sitio que las cifras.
 */
export const RESUMEN_DE_SALDOS: readonly { readonly clave: string; readonly label: string }[] = [
  { clave: 'insoluto', label: 'Insoluto' },
  { clave: 'reajuste', label: 'Reajuste' },
  { clave: 'interes', label: 'Interés' },
  { clave: 'gasto', label: 'Gasto' },
  { clave: 'total', label: 'Total' },
];

/** La clave de la frase que el backend redacta bajo el resumen. */
export const ESTADO_DE_LA_CONSULTA = 'estadoDeLaConsulta';

/**
 * Una seccion paginada de la respuesta de la unificada: **sus filas y cuantas
 * hay detras**.
 *
 * Las tres cosas juntas y no solo las filas, que era el defecto: cada seccion
 * viaja en su propio sobre `RespuestaPaginada` y el agregador **la pagina a
 * veinte**, asi que dibujar `contenido.length` decia «20 deudas» junto a un
 * total de cabecera que cubre las cuarenta y tres. La cifra no estaba mal
 * calculada: estaba contando otra cosa, y nada en la pantalla lo decia.
 *
 * `totalElementos` y `hayMas` los trae la propia seccion; aqui no se deducen.
 * Cuando falten —una respuesta sin sobre— el total es lo que se ve, que es la
 * unica afirmacion que se puede sostener.
 */
export interface SeccionDeLaFicha {
  readonly filas: readonly Readonly<Record<string, unknown>>[];
  /** Cuantas hay en total, segun la propia seccion. Nunca deducido. */
  readonly totalElementos: number;
  /** Quedan mas detras de las que llegaron: la salida es la opcion que pagina. */
  readonly hayMas: boolean;
}

export function seccionDeLaFicha(
  ficha: Readonly<Record<string, unknown>> | undefined,
  clave: string,
): SeccionDeLaFicha {
  const seccion = ficha?.[clave];
  if (!esObjeto(seccion) || !Array.isArray(seccion['contenido'])) {
    return { filas: [], totalElementos: 0, hayMas: false };
  }
  const filas = seccion['contenido'].filter(esObjeto);
  const total = seccion['totalElementos'];
  return {
    filas,
    totalElementos: typeof total === 'number' ? total : filas.length,
    hayMas: seccion['hayMas'] === true,
  };
}

/**
 * «3 deudas», «20 de 43 deudas», «1 convenio».
 *
 * Contar no es redactar en lenguaje del dominio (RNF-080), pero **decir de que
 * se cuenta si**, y por eso el sustantivo lo declara la rejilla en vez de salir
 * de aqui como «filas». Las dos cifras cuando no coinciden: cada seccion de la
 * unificada viaja paginada y ensenar solo las que caben, sin el total que la
 * propia seccion trae, es la cifra que se lee como «esto es todo lo que hay».
 */
export function conteoDeLaRejilla(rejilla: RejillaDeLaFicha, seccion: SeccionDeLaFicha): string {
  const cuantas = seccion.filas.length;
  const nombre = seccion.totalElementos === 1 ? rejilla.una : rejilla.varias;
  return seccion.totalElementos > cuantas
    ? `${cuantas} de ${seccion.totalElementos} ${nombre}`
    : `${cuantas} ${cuantas === 1 ? rejilla.una : rejilla.varias}`;
}

/**
 * La fecha de corte con la que el backend respondio todo lo que depende de hoy.
 *
 * Sale de `aLaFecha` de la respuesta y **no del reloj del navegador**: la banda
 * dice a que fecha estan actualizadas las cifras, y el reloj del cliente diria
 * «hoy» sobre lo que se calculo anteayer (regla 9, RNF-075).
 */
export function fechaDeCorteDe(ficha: Readonly<Record<string, unknown>> | undefined): {
  readonly fecha?: Fecha;
} {
  const aLaFecha = ficha?.['aLaFecha'];
  return typeof aLaFecha === 'string' && aLaFecha !== '' ? { fecha: aLaFecha as Fecha } : {};
}

/** El resumen consolidado de la respuesta, si lo trae. */
export function resumenDeSaldosDe(
  ficha: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  return esObjeto(ficha?.['resumenDeSaldos']) ? ficha['resumenDeSaldos'] : undefined;
}
