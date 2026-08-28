import type { Celda } from '@sgtm/api-client';
import { SIN_DATO, esObjeto, texto } from '../seguridad/listado';
import { importeDe } from '../consultas';

/**
 * **De qué compone la ficha 360°, pestaña a pestaña** (#297, ADR-0016 §2).
 *
 * Aquí no hay ninguna pantalla: hay una tabla de composición, que es lo que el
 * ADR decide. Cada entrada nombra **una opción del catálogo** y de ella salen
 * las cuatro cosas que la pestaña necesita, sin que la ficha invente ninguna:
 *
 *   el rótulo    `opcion.label`, y el de su módulo para la línea «Fuente»
 *   la lectura   su operación del contrato, con los parámetros de aquí
 *   el permiso   el suyo: sin él la pestaña **no se dibuja** (ADR-0016 §2)
 *   la vuelta    su ruta, con el contexto puesto en el filtro
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

/**
 * Una de las seis rejillas que `consulta_unificada` trae en su respuesta.
 *
 * `rotulos` nombra la opción de cuyo catálogo salen sus columnas: son dos
 * lecturas del mismo dato —la unificada las consolida y la opción hermana las
 * lista con sus filtros—, así que la ficha las nombra como ya se llaman.
 */
export interface RejillaDeLaFicha {
  /** Como la nombra el manual. Del catálogo, no inventado. */
  readonly titulo: string;
  /** La sección de `ConsultaUnificadaResource` de la que salen sus filas. */
  readonly clave: string;
  /** La opción de cuyo catálogo salen los rótulos de sus columnas. */
  readonly rotulos: string;
  readonly cols: readonly string[];
  readonly num?: readonly number[];
  readonly fila: (registro: Readonly<Record<string, unknown>>) => readonly Celda[];
  /**
   * Sus cifras están todas a la fecha de corte de la consulta, y la banda la
   * dice una vez.
   *
   * Sin esto, la rejilla no dibuja banda porque **cada fila trae la suya** —un
   * pago de marzo no se actualiza— o porque no dibuja ninguna cifra. Las tres
   * situaciones son distintas y ninguna admite la fecha de otra (regla 9).
   */
  readonly aLaFechaDeCorte?: true;
  /** Qué falta en esta rejilla y dónde está. Se dibuja bajo la tabla. */
  readonly nota?: string;
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

/** Un importe con su fecha, o el guion. Nunca el importe sin la fecha (regla 9). */
const importe = (valor: unknown): string => importeDe(valor)?.importe ?? SIN_DATO;

/** La fecha valor de un asiento: es la que lleva su propio monto. */
const fechaDelMonto = (registro: Readonly<Record<string, unknown>>): string =>
  importeDe(registro['monto'])?.actualizadoA ?? SIN_DATO;

/** `CARGO` incorpora deuda (alta); `ABONO` la extingue (baja) — `MovimientoDeDeuda`. */
function altaOBaja(tipo: unknown): string {
  if (tipo === 'CARGO') return 'ALTA';
  if (tipo === 'ABONO') return 'BAJA';
  return SIN_DATO;
}

/**
 * El tono de un estado. **El texto es siempre el del backend**: aquí solo se
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
 *
 * **Dónde falta un importe y por qué falta.** La regla es una y se aplica igual
 * a las seis: un importe se dibuja solo cuando su fecha está a la vista —o la
 * rejilla entera comparte una y la banda la dice, o la fila la trae en una
 * columna—. Donde no se cumple ninguna de las dos, el importe no se dibuja aquí
 * y la nota dice dónde está (regla 9, RNF-075).
 */
export const REJILLAS_DE_LA_UNIFICADA: readonly RejillaDeLaFicha[] = [
  {
    titulo: 'Deudas Pendientes',
    clave: 'deudasPendientes',
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
    rotulos: 'consulta_pagos',
    cols: ['Fecha', 'Recibo', 'Concepto', 'Año', 'Importe S/'],
    num: [4],
    // Sin banda: **cada fila trae su fecha**, que es la fecha valor del asiento.
    // Un pago de marzo no se actualiza, y fecharlo hoy sería mentir sobre una
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
    rotulos: 'consulta_altas_bajas',
    cols: ['A/B', 'Doc. Aprob.', 'Fecha Reg.'],
    fila: (asiento) => [
      { texto: altaOBaja(asiento['tipo']) },
      { texto: texto(asiento['documentoOrigen']) },
      { texto: fechaDelMonto(asiento) },
    ],
    // La lista de altas y bajas del manual **no tiene columna de importe**, y
    // esta no se la inventa: lo que movió cada asiento se lee en el libro.
    nota: 'El importe de cada movimiento se ve en «Estado de cuenta corriente».',
  },
  {
    titulo: 'Fraccionamientos',
    clave: 'fraccionamientos',
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
    // la de suscripción—. Dos cifras de días distintos bajo una sola banda es
    // exactamente lo que el recurso separa en dos `ImporteActualizado`.
    nota: 'La deuda acogida va a la fecha de corte del convenio: se ve en «Consulta de convenios».',
  },
  {
    titulo: 'Valores',
    clave: 'valores',
    rotulos: 'consulta_valores',
    cols: ['Nro. valor', 'Tipo', 'Tributo', 'Periodo', 'Estado'],
    fila: (valor) => [
      { texto: texto(valor['numero']) },
      { texto: texto(valor['tipo']) },
      { texto: texto(valor['tributos']) },
      { texto: texto(valor['periodo']) },
      conTono(valor['situacion'], ['PAGADO'], ['COACTIVA', 'EXIGIBLE']),
    ],
    // Sin importe, y no por olvido: el desglose de un valor está **congelado** a
    // su `proyectadoA` —la fecha de la emisión (AC de #37)—, que no es la de la
    // consulta y que ninguna columna del catálogo nombra. Sin sitio donde poner
    // esa fecha, la cifra no se dibuja.
    nota: 'El importe de cada valor está congelado a la fecha de su emisión: se ve, con ella, en «Consulta de valores emitidos».',
  },
  {
    titulo: 'Declaraciones presentadas',
    clave: 'declaracionesJuradas',
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
 * Los rótulos del «Resumen de saldos», tal como los declara el catálogo de
 * `consulta_unificada` (pestaña «Resumen de Deudas»).
 *
 * Las cinco cifras salen **sumadas por el servidor** y la frase que las explica
 * viene redactada: aquí no se suma ni se compone texto con cifras dentro
 * (RNF-083). El día que el total y el desglose discreparan, la explicación tiene
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
  },
  {
    opcion: 'papeletas',
    // Se compone **por el documento**, que es la única clave que `GET
    // /transito/papeletas` ofrece para una persona: no hay filtro por código de
    // contribuyente. Y el documento lo publica el padrón, así que hacen falta
    // los dos permisos.
    tambien: ['contribuyentes'],
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
  },
];

/** Las filas de una sección paginada de la respuesta de la unificada. */
export function filasDeLaSeccion(
  ficha: Readonly<Record<string, unknown>> | undefined,
  clave: string,
): readonly Readonly<Record<string, unknown>>[] {
  const seccion = ficha?.[clave];
  if (!esObjeto(seccion) || !Array.isArray(seccion['contenido'])) return [];
  return seccion['contenido'].filter(esObjeto);
}
