import { descargar, solicitar, type RespuestaPaginada } from './cliente';
import type { FormatoDeDocumento } from './descarga';

/**
 * Lo que el módulo de **Consultas** lee del backend.
 *
 * Los tipos son los `record` del backend campo por campo, con los nombres que
 * viajan —incluidos los raros: `dNI` y `rUC`—. Los importes llegan
 * como **texto** (RNF-055) y salen como texto: pasarlos por `Number` para
 * volver a formatearlos es como se pierde un decimal.
 *
 * **Este archivo no importa nada de los `api/` de otros módulos**, ni siquiera
 * el tipo `Paginacion`, y es deliberado: hay varios módulos conectándose a la
 * vez, y una lectura de Consultas no debería dejar de compilar porque otro
 * módulo reorganizó su archivo. Lo que se repite son diez líneas de tipos; lo
 * que se evita es un acoplamiento que nadie declaró.
 *
 * <h2>El código que no está en el padrón (#622)</h2>
 *
 * Las **nueve** lecturas que identifican al contribuyente por su código
 * —predios, vehículos, deuda, pagos, valores, altas y bajas, la ficha
 * unificada, el beneficio y la constancia— preguntan al padrón **antes** de
 * listar, y un código que no figura en esta municipalidad es `404
 * NO_ENCONTRADO` nombrándolo, nunca una página vacía. Medido contra el backend
 * en marcha: con `C-999999` contestan 404 las nueve, y con `C-000001` contestan
 * 200 las nueve. El `200` con cero filas queda para lo único que de verdad
 * significa: está en el padrón y no tiene nada.
 *
 * **De ese 404 la pantalla no puede sacar el texto.** El mensaje son tres
 * redacciones del mismo hecho —«En el padron de esta municipalidad no hay ningun
 * contribuyente con codigo 'C-999999'» en seis, «No hay ningun contribuyente con
 * el codigo C-999999 en esta municipalidad» en la unificada y el beneficio, y
 * «No hay ningun contribuyente con el codigo C-999999» en la constancia—, así
 * que quien quiera que las siete pestañas digan lo mismo tiene que converger por
 * el **código**, que es estable por contrato, y dejar el texto del servidor
 * donde es evidencia y no titular.
 */

/* ══════════ Piezas comunes ══════════ */

/**
 * Un importe con la fecha a la que está actualizado. Es `ImporteActualizado`.
 *
 * Nunca lo primero sin lo segundo (RNF-075, regla 9): **no existe «la deuda»**,
 * existe la deuda a una fecha, y por eso el par viaja junto y se dibuja junto.
 */
export type Importe = { importe: string; actualizadoA: string };

export type Paginacion = {
  pagina?: number;
  tamano?: number;
  ordenarPor?: string;
  direccion?: 'ASCENDENTE' | 'DESCENDENTE';
};

/** Las cuatro fases de la cobranza que `Fase` declara. Ni una más. */
export type Fase = 'ORDINARIA' | 'VALOR' | 'COACTIVA' | 'CONVENIO';
export const FASES: readonly Fase[] = ['ORDINARIA', 'VALOR', 'COACTIVA', 'CONVENIO'];

/** Lo que `SentidoDelMovimiento` admite en el filtro «Alta / Baja». */
export type Sentido = 'ALTA' | 'BAJA';

/**
 * Las tres opciones de `impresion` en la consulta unificada.
 *
 * El backend traduce «ARBITRIOS» a `ARBITRIO` singular por su cuenta; aquí van
 * las palabras que él acepta, no las de la base.
 */
export type Alcance = 'PREDIAL' | 'ARBITRIOS' | 'PREDIAL Y ARBITRIOS';

/* ══════════ Contribuyentes ══════════ */

/** Una fila del padrón. Es `ContribuyenteResource`. */
export type Contribuyente = {
  id: number;
  codigo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  /** `NATURAL` | `JURIDICA`. */
  tipoPersona: string;
  nombreRazonSocial: string;
  condicionEspecial: string | null;
  activo: boolean;
};

/**
 * Los cuatro filtros que `ContribuyenteController` admite. No hay más.
 *
 * `codigo`, `dNI` y `rUC` comparan por **igualdad**; `nombreRazonSocial` por
 * **parecido**. Es lo que permite encontrar a quien está mal escrito en el
 * padrón, y por eso el buscador de ventanilla no exige el nombre exacto.
 */
export type FiltroDeContribuyentes = {
  codigo?: string;
  nombreRazonSocial?: string;
  /** Se llama así en el contrato. No es una errata. */
  dNI?: string;
  rUC?: string;
};

export function buscarContribuyentes(
  filtro: FiltroDeContribuyentes,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Contribuyente>> {
  return solicitar('/rentas/contribuyentes', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ Deuda por contribuyente ══════════ */

/** Las cinco cifras del desglose, cada una con su fecha. Es `DeudaResource`. */
export type DesgloseDeDeuda = {
  insoluto: Importe;
  reajuste: Importe;
  interes: Importe;
  gasto: Importe;
  total: Importe;
};

/**
 * Una obligación con su deuda actualizada. Es `ObligacionConDeudaResource`.
 *
 * `predioId` y `vehiculoId` son la unidad sobre la que pesa: los dos pueden
 * venir nulos —el predial del contribuyente sin predio resuelto, por ejemplo—,
 * y eso no es un cero, es una obligación sin unidad.
 *
 * **`periodoDesde`/`periodoHasta` significan dos cosas distintas según el corte
 * que se pidió** (ver `FiltroDeDeuda.porPeriodo`): sin `porPeriodo` son el
 * mínimo y el máximo de las cuotas que la fila agrega, y con él son la misma
 * cuota repetida. Quien dibuje esta fila tiene que decir cuál de los dos está
 * mirando: «PREDIAL 2026» y «PREDIAL 2026 cuota 3» se parecen lo bastante como
 * para dar de baja la que no era.
 */
export type ObligacionConDeuda = {
  tributo: string;
  ejercicio: number;
  predioId: number | null;
  vehiculoId: number | null;
  periodoDesde: number;
  periodoHasta: number;
  fase: string;
  deuda: DesgloseDeDeuda;
};

export type FiltroDeDeuda = {
  codContribuyente: string;
  /** ISO `AAAA-MM-DD`. Sin ella, el servidor calcula a hoy con su reloj. */
  fechaDeCorte?: string;
  fase?: Fase;
  /**
   * Dónde se corta la lectura: una fila por **cuota** en vez de una por
   * obligación (#551).
   *
   * La forma del recurso no cambia —siguen siendo `periodoDesde`,
   * `periodoHasta` y un `DesgloseDeDeuda`—; lo que cambia es qué agrupa cada
   * fila. Sin el parámetro, `periodoDesde`/`periodoHasta` son el mínimo y el
   * máximo del grupo y el desglose es el de **toda** la obligación. Con
   * `true`, cada fila **es** una cuota, `periodoDesde === periodoHasta`, y el
   * desglose es el suyo.
   *
   * Medido contra el backend con `C-000001` de la municipalidad 1:
   *
   * ```
   * sin el parámetro   PREDIAL 2026 · cuotas 0-9 · insoluto 444.90
   * porPeriodo=true    PREDIAL 2026 · cuota 1 · 148.30
   *                    PREDIAL 2026 · cuota 2 · 148.30
   *                    PREDIAL 2026 · cuota 3 · 148.30
   *                    PREDIAL 2026 · cuotas 0, 4 y 9 · 0.00
   * ```
   *
   * Ahí está para qué existe: la fila agregada dice cuánto se debe por el
   * conjunto y **no** cuánto por cada cuota, así que con ella sola no se puede
   * componer el cuerpo de una baja de la cuota 1 —y repartirlo en la pantalla
   * sería componer dinero (RNF-083) sobre cifras que la lectura no publica—.
   *
   * **La `fase` también se corta distinto, y ésa es la que viaja en el acto.**
   * La fila agregada publica la más avanzada del grupo; la de una cuota, la
   * suya. Medido sobre la misma persona: `ARBITRIOS 2026 · predio 1` sale
   * agregada como `VALOR` con 146.00, y por cuota sale `VALOR` la cuota 0 —que
   * debe 0— y `ORDINARIA` las cuotas 1 a 4, que son las que deben los 146.00.
   *
   * Una palabra que no sea `true` ni `false` es **422 nombrando el parámetro**
   * (`?porPeriodo=si` → «El parametro «porPeriodo» admite «true» o «false»:
   * 'si'»), por lo mismo que el `activa` del catálogo vial: un «sí» leído como
   * «false» devolvería filas agregadas a quien pidió cuotas, y esa respuesta es
   * indistinguible de la correcta hasta que alguien intenta dar una de baja. El
   * tipo lo impide desde aquí.
   *
   * **No se declara en `api/tesoreria.ts`, y es deliberado**: la ventanilla lee
   * esta misma operación para cobrar, y `PeticionDeCobranza.PeticionDeObligacion`
   * identifica lo que se cobra con tributo, ejercicio y unidad — **sin
   * `periodo`**. Cuatro cuotas marcadas ahí serían cuatro veces la misma
   * obligación para el servidor. Lo mismo en Valores: ni
   * `PeticionDeValor.PeticionDeObligacion` ni `PeticionDePrescripcion` llevan
   * cuota. Que el filtro no exista en la fachada de tesorería es lo que impide
   * mandarlo por error donde rompería la cobranza.
   */
  porPeriodo?: boolean;
};

export function deudaDelContribuyente(
  filtro: FiltroDeDeuda,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ObligacionConDeuda>> {
  return solicitar('/consultas/deuda', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ El libro: cuenta corriente, pagos, altas y bajas ══════════ */

/**
 * Una fila del libro. Es `AsientoResource`, y las tres consultas la comparten
 * —cuenta corriente, pagos y altas y bajas son la misma tabla filtrada
 * distinto—.
 *
 * `tipo` es `CARGO` o `ABONO`. En el vocabulario del manual un **alta** de
 * deuda es un `CARGO` y una **baja** es un `ABONO`; el filtro se manda con las
 * palabras del manual y la columna se lee con las del libro, que es lo que hace
 * el backend en `AsientoRepositoryJdbc`.
 */
export type Asiento = {
  id: number;
  ejercicio: number;
  tributo: string;
  concepto: string;
  tipo: string;
  fase: string;
  periodo: number | null;
  predioId: number | null;
  vehiculoId: number | null;
  referenciaExterna: string | null;
  monto: Importe;
  documentoOrigen: string;
  asientoReversadoId: number | null;
  usuarioId: string | null;
  motivo: string | null;
};

export function cuentaCorriente(
  codigo: string,
  filtro: { ejercicio?: string; tributo?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Asiento>> {
  return solicitar(`/consultas/cuenta-corriente/${encodeURIComponent(codigo)}`, {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
}

/**
 * Los pagos del contribuyente.
 *
 * **`medioDePago` no es un filtro que se pueda mandar**: el contrato lo declara
 * y `ConsultaPagosController` lo ignora, porque ningún campo del asiento
 * distingue efectivo de tarjeta —esa distinción es de caja—. Aquí no se declara
 * para que no se pueda mandar por error un filtro que no filtra.
 */
export function pagosDelContribuyente(
  filtro: { codContribuyente: string; desde?: string; hasta?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Asiento>> {
  return solicitar('/consultas/pagos', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * Las altas y bajas de deuda.
 *
 * **El parámetro del contribuyente ya no es `codigoCont`, y no es comodidad.**
 * Hasta #622 ésta era la única lectura del expediente que llamaba al sujeto de
 * otra manera, y el comentario que había aquí decía que cambiarlo dejaría a la
 * pantalla mandando un filtro que el servidor no lee. Eso dejó de ser cierto: el
 * contrato declara para esta ruta **los dos** nombres —`codigoCont` queda como
 * alias, porque es el que la interfaz mandaba— y `AltasBajasController` los lee.
 * Medido: `?codContribuyente=C-000001` devuelve sus asientos con 200, y con
 * `C-999999` da 404. Se manda el nombre unificado para que las siete pestañas
 * identifiquen al sujeto de una sola manera.
 *
 * `autoManual` tampoco se declara: el contrato lo tiene y el backend lo ignora
 * —nada en el libro marca todavía si un movimiento lo escribió una persona o
 * una emisión masiva—.
 */
export function altasYBajas(
  filtro: { codContribuyente: string; ano?: string; tributo?: string; altaBaja?: Sentido },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Asiento>> {
  return solicitar('/consultas/altas-bajas', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ Unidades: predios y vehículos ══════════ */

/**
 * Un predio del contribuyente con su deuda. Es `PredioEncontradoResource`.
 *
 * Seis campos y ni uno más: **no publica uso, área, área construida ni
 * autovalúo**. El autovalúo depende de la determinación predial, bloqueada por
 * D-02a, y las otras tres son de la ficha catastral, que esta consulta no lee.
 */
export type PredioEncontrado = {
  predioId: number;
  codigoReferenciaCatastral: string;
  tipo: string;
  direccion: string;
  porcentajeTitularidad: string;
  deuda: Importe;
};

/**
 * Los predios de un contribuyente.
 *
 * **`codigoPredial`, `calle`, `manzana` y `lote` no se declaran aquí aunque el
 * contrato los tenga**: `ConsultaPrediosController` los acepta y no filtra con
 * ellos —`PrediosDelContribuyente` solo sabe listar los de una persona—. Un
 * filtro que viaja y no acota es peor que uno que no existe.
 *
 * El sujeto viaja como `codContribuyente`, el nombre unificado del expediente
 * (#622); el contrato declara `contribuyente` como alias y el controlador lo
 * sigue leyendo. Medido: los dos devuelven los dos predios de `C-000001` con 200
 * y los dos dan 404 con `C-999999`.
 */
export function prediosDelContribuyente(
  filtro: { codContribuyente: string; fecha?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PredioEncontrado>> {
  return solicitar('/consultas/predios', { parametros: { ...filtro, ...paginacion }, senal });
}

/** Un vehículo con su deuda. Es `VehiculoEncontradoResource`. */
export type VehiculoEncontrado = {
  /**
   * El identificador interno, que es lo que `ClaveDeSaldo` compara (#554).
   *
   * No estaba, y ése era el issue entero: `PeticionDeMovimiento` identifica la
   * unidad de una obligación con `predioId`/`vehiculoId` —nunca con la placa—,
   * y `ClaveDeSaldo` los compara por **igualdad exacta**, así que una obligación
   * con vehículo y una sin él son dos distintas. Sin este campo, un alta sobre
   * una placa o se mandaba sin unidad —y caía sobre otra obligación del mismo
   * contribuyente, invisible desde la ficha del vehículo— o no se mandaba. La
   * pantalla hacía lo segundo.
   *
   * `PredioDelCatastroResource` publica su `predioId` desde siempre; éste es el
   * mismo identificador para el otro padrón, no un dato nuevo.
   */
  vehiculoId: number;
  placa: string;
  clase: string;
  marca: string;
  modelo: string;
  anioFabricacion: number;
  /** `ACTIVO` | `TRANSFERIDO` | `BAJA` | `ROBADO`, el `EstadoVehiculo` del padrón. */
  estado: string;
  afectoDesde: number | null;
  afectoHasta: number | null;
  contribuyenteId: number;
  codigoContribuyente: string;
  titular: string;
  deuda: Importe;
};

/**
 * Los vehículos, por placa o por contribuyente.
 *
 * `placa` compara por **igualdad** sin el guion, no por prefijo: es lo que trae
 * ventanilla cuando busca un vehículo concreto. `codContribuyente` compara el
 * código del padrón, también por igualdad, y es el nombre unificado del
 * expediente (#622): el contrato declara `contribuyente` como alias y el
 * controlador lo sigue leyendo. Medido, los dos contestan igual —200 con cero
 * vehículos para `C-000001`, 404 para `C-999999`—.
 *
 * **Buscar por placa no lleva 404**, y no es una excepción olvidada: quien busca
 * una placa no ha dicho ningún código de contribuyente, así que ahí el 200 con
 * cero filas sigue significando exactamente lo que dice.
 *
 * **`estado` solo admite `BAJA`**: el desplegable del prototipo ofrece
 * AFECTO/INAFECTO/EXONERADO/BAJA, que son la afectación calculada de cada fila
 * y no valores de esta columna. El backend ignora los otros tres, así que aquí
 * el tipo es el único que sirve.
 */
export function buscarVehiculos(
  filtro: { placa?: string; nroMotor?: string; codContribuyente?: string; estado?: 'BAJA'; fecha?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<VehiculoEncontrado>> {
  return solicitar('/consultas/vehiculos', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ Valores emitidos, vistos desde Consultas ══════════ */

/**
 * Las siete situaciones que `SituacionDelValor` declara.
 *
 * `EXIGIBLE` es lo que el prototipo llama **FIRME**, y el backend acepta las dos
 * palabras. **`RECLAMADO` no está**: el prototipo lo ofrece y el dominio no lo
 * tiene, y pedirlo devuelve 422 con el motivo en vez del listado sin filtrar.
 */
export type Situacion = 'EMITIDO' | 'NOTIFICADO' | 'EXIGIBLE' | 'COACTIVA' | 'PAGADO' | 'ANULADO' | 'PRESCRITO';
export const SITUACIONES: readonly Situacion[] = [
  'EMITIDO',
  'NOTIFICADO',
  'EXIGIBLE',
  'COACTIVA',
  'PAGADO',
  'ANULADO',
  'PRESCRITO',
];

/** Los tres códigos que `TipoValor` declara. */
export type TipoDeValor = 'OP' | 'RD' | 'RM';
export const TIPOS_DE_VALOR: readonly { codigo: TipoDeValor; label: string }[] = [
  { codigo: 'OP', label: 'OP — Orden de pago' },
  { codigo: 'RD', label: 'RD — Resolución de determinación' },
  { codigo: 'RM', label: 'RM — Resolución de multa' },
];

/**
 * Una fila de `consulta_valores`. Es `ValorConsultadoResource`.
 *
 * **`monto.actualizadoA` no es hoy**: es `proyectadoA`, el día al que estaban
 * proyectados los importes **cuando se emitió el valor**. El desglose de un
 * valor está congelado, y actualizarlo al mirarlo convertiría un documento
 * notificado en una cifra que cambia sola. `situacionA` es otra cosa y va
 * aparte: el día desde el que se miró si el plazo ya venció.
 */
export type ValorConsultado = {
  id: number;
  numero: string;
  /** `OP` | `RD` | `RM`. */
  tipo: string;
  codContribuyente: string;
  contribuyente: string;
  tributo: string | null;
  periodo: string | null;
  monto: Importe;
  notificadoEl: string | null;
  exigibleDesde: string | null;
  situacion: string;
  /** Lo que la cabecera guarda, que no es lo mismo que la situación a la fecha. */
  estado: string;
  situacionA: string;
  fechaEmision: string;
};

export function consultarValores(
  filtro: { nroDeValor?: string; codContribuyente?: string; tipo?: TipoDeValor; estado?: Situacion },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ValorConsultado>> {
  return solicitar('/consultas/valores', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ La ficha unificada ══════════ */

/** Una obligación de la ficha unificada: el desglose va plano, no anidado. */
export type ObligacionPlana = {
  tributo: string;
  ejercicio: number;
  predioId: number | null;
  vehiculoId: number | null;
  insoluto: Importe;
  reajuste: Importe;
  interes: Importe;
  gasto: Importe;
  total: Importe;
};

/** Un asiento tal como lo publica la ficha unificada: cinco campos menos. */
export type AsientoBreve = {
  id: number;
  ejercicio: number;
  tributo: string;
  concepto: string;
  tipo: string;
  fase: string;
  periodo: number | null;
  predioId: number | null;
  vehiculoId: number | null;
  monto: Importe;
  documentoOrigen: string;
  motivo: string | null;
};

export type ConvenioDeLaFicha = {
  numero: string;
  fecha: string;
  deudaAcogida: Importe;
  cuotas: number;
  pagadas: number;
  vencidas: number;
  saldo: Importe;
  estado: string;
  motivoDelCierre: string | null;
};

export type ValorDeLaFicha = {
  tipo: string;
  numero: string;
  ejercicio: number;
  fechaEmision: string;
  tributos: string | null;
  periodo: string | null;
  situacion: string;
  situacionA: string;
  insoluto: Importe;
  reajuste: Importe;
  interes: Importe;
  gasto: Importe;
  total: Importe;
};

export type DeclaracionDeLaFicha = {
  id: number;
  numero: string;
  ejercicio: number;
  tipo: string;
  predioId: number | null;
  vehiculoId: number | null;
  fichaCatastralId: number | null;
  fechaPresentacion: string;
  fechaLimite: string | null;
  fueraDePlazo: boolean;
  estado: string;
  djRectificaId: number | null;
};

/**
 * La ficha consolidada del contribuyente. Es `ConsultaUnificadaResource`.
 *
 * Sus siete secciones se leen en **una** transacción, con un solo `SET LOCAL` y
 * un solo instante: es lo que hace que las cifras de dos pestañas no se
 * contradigan. Un código que no existe en esta municipalidad da **404**, no una
 * ficha vacía.
 */
export type FichaUnificada = {
  contribuyente: { codigo: string; nombre: string; documento: string };
  aLaFecha: string;
  resumenDeSaldos: DesgloseDeDeuda & { estadoDeLaConsulta: string };
  deudasPendientes: RespuestaPaginada<ObligacionPlana>;
  pagosRealizados: RespuestaPaginada<AsientoBreve>;
  altasYBajas: RespuestaPaginada<AsientoBreve>;
  fraccionamientos: RespuestaPaginada<ConvenioDeLaFicha>;
  valores: RespuestaPaginada<ValorDeLaFicha>;
  declaracionesJuradas: RespuestaPaginada<DeclaracionDeLaFicha>;
};

/**
 * La ficha unificada.
 *
 * `ordenarPor` y `direccion` se aceptan y **no se propagan**: siete rejillas de
 * siete tablas distintas no comparten columnas. Por eso no se declaran aquí.
 *
 * **Aquí el sujeto sigue llamándose `contribuyente`, y está medido**: pedirla
 * con `?codContribuyente=C-000001` contesta `422 VALIDACION` «Parametro
 * desconocido: 'codContribuyente'» —la guarda de #539—, porque ésta y la del
 * beneficio son las dos únicas del expediente a las que el contrato no les
 * declaró el nombre unificado. Mandarlo por simetría cambiaría un listado por un
 * rechazo.
 */
export function fichaUnificada(
  filtro: { contribuyente: string; impresion?: Alcance },
  paginacion: { pagina?: number; tamano?: number },
  senal?: AbortSignal,
): Promise<FichaUnificada> {
  return solicitar('/consultas/unificada', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ El beneficio: una simulación, no otra deuda ══════════ */

export type CampaniaAplicable = { nombre: string; alicuota: string; base: string };

export type SimulacionDelBeneficio = {
  campania: string;
  alicuotaAplicada: string;
  baseDelBeneficio: string;
  baseDelBeneficioImporte: Importe;
  ahorro: Importe;
  deudaConBeneficio: Importe;
};

/**
 * El acogimiento simulado. Es `DeudasConBeneficioResource`.
 *
 * **`simulacion` sale en `null` cuando no hay campaña elegida** —o cuando la
 * elegida no la publica ningún conjunto sellado, que entonces es un 422 y no un
 * cuerpo—. No sale con ceros: «se ahorraría 0,00» es una afirmación sobre una
 * campaña, y sin campaña no hay ninguna que hacer.
 *
 * `campaniasAplicables` son las que **esta** municipalidad publica. Sin ella, el
 * desplegable del prototipo sería la única fuente y diría las de otra ciudad.
 */
export type DeudasConBeneficio = {
  contribuyente: { codigo: string; nombre: string; documento: string; domicilioFiscal: string | null };
  aLaFecha: string;
  deudaTotal: Importe;
  deudaAcogida: Importe;
  registrosAcogidos: number;
  simulacion: SimulacionDelBeneficio | null;
  campaniasAplicables: CampaniaAplicable[];
  estadoDeLaSimulacion: string;
  obligaciones: RespuestaPaginada<ObligacionPlana>;
};

/**
 * Las tres familias de multa que `tipoDePapeleta` traduce, escritas como el
 * backend las espera. **«TRIBUTARIA» es la de fiscalización**, no una papeleta.
 */
export const TIPOS_DE_PAPELETA = ['TRIBUTARIA', 'P. TRÁNSITO', 'P. ADMINISTRATIVA'] as const;

/**
 * La simulación del acogimiento.
 *
 * El sujeto va como `contribuyente` por lo mismo que en la ficha unificada:
 * `?codContribuyente=` contesta 422 «Parametro desconocido», medido.
 *
 * `formaDePago` no se declara y no se manda: «CONTADO TOTAL» es lo que esta
 * consulta ya hace, y «PRECONVENIO» el backend lo **rechaza** con 422 porque
 * acogerse fraccionando tiene su propio cronograma y se simula en convenios.
 * Mandar el único valor que se acepta no aporta nada; ofrecer el otro sería
 * prometer una simulación que no se hace aquí.
 */
export function deudasConBeneficio(
  filtro: { contribuyente: string; tipoDePapeleta?: string; benefAplicable?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<DeudasConBeneficio> {
  return solicitar('/consultas/deudas-con-beneficio', {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
}

/* ══════════ La constancia de no adeudo ══════════ */

/**
 * La constancia. Es `ConstanciaResource`.
 *
 * `seNiega` es la decisión que RNF-084 exige mostrar antes que nada: la
 * pantalla no imprime un documento en blanco, **niega explícitamente**. Las
 * obligaciones son todas las del contribuyente en cualquier fase.
 */
export type Constancia = {
  codigoContribuyente: string;
  fechaDeCorte: string;
  seNiega: boolean;
  obligaciones: ObligacionConDeuda[];
};

export function constanciaDeNoAdeudo(
  filtro: { codContribuyente: string; fecha?: string },
  senal?: AbortSignal,
): Promise<Constancia> {
  return solicitar('/consultas/constancias/no-adeudo', { parametros: { ...filtro }, senal });
}

/**
 * La misma constancia, como archivo (RF-132, RNF-081).
 *
 * La hoja A4 que dibuja la pantalla se puede mandar a la impresora con Ctrl+P,
 * y ahi se acaba: **no produce `.xls` ni `.rtf`**, que es lo que el manual
 * promete y lo que el generador comun del servidor si sabe hacer.
 *
 * Sigue sin numerarse: `ConstanciaController` lo dice —«es una consulta: se
 * mira, se guarda y se imprime, pero no se numera»— y por eso basta `LECTURA`,
 * el mismo privilegio con el que la hoja ya esta en pantalla.
 */
export function descargarConstancia(
  filtro: { codContribuyente: string; fecha?: string },
  formato: FormatoDeDocumento,
): Promise<void> {
  return descargar('/consultas/constancias/no-adeudo', { ...filtro, formato });
}

/* ══════════ Lo que hace falta para buscar en los otros padrones ══════════ */

/**
 * Un predio del catastro. Es `PredioDelCatastroResource`.
 *
 * El buscador de ventanilla necesita encontrar un predio por su código, y
 * `GET /consultas/predios` no sabe hacerlo —solo lista los de un
 * contribuyente—. El único endpoint que busca por código de referencia
 * catastral es el del padrón de catastro, y **no publica al titular a
 * propósito** (ADR-0015 §2.4): quien puede listar predios no puede cosechar
 * predio→persona de toda la municipalidad. Se resuelve de uno en uno con
 * {@link titularesDelPredio}, y cada resolución deja su fila en la bitácora.
 */
export type PredioDelCatastro = {
  predioId: number;
  codRefCatastral: string;
  tipo: string;
  direccion: string;
  numeroMunicipal: string | null;
  codigoDeVia: string | null;
  via: string | null;
  codigoDeSector: string | null;
  codigoDeManzana: string | null;
  lote: string | null;
  ubigeo: string | null;
  estado: string;
  fichado: boolean;
};

/** Busca por **prefijo** del código de referencia catastral. */
export function buscarPredios(
  codRefCatastral: string,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PredioDelCatastro>> {
  return solicitar('/catastro/predios', { parametros: { codRefCatastral, ...paginacion }, senal });
}

/** Los titulares vigentes a una fecha. Es `TitularesDelPredioResource`. */
export type TitularesDelPredio = {
  predioId: number;
  vigenteA: string;
  titulares: { codigo: string | null; nombre: string | null; condicion: string; porcentaje: string }[];
};

export function titularesDelPredio(
  predioId: number,
  senal?: AbortSignal,
): Promise<TitularesDelPredio> {
  return solicitar(`/catastro/predios/${predioId}/titulares`, { senal });
}

/**
 * La vista previa de un recibo. Es `DuplicadoResource`.
 *
 * Sin `?formato`, es solo lectura: no numera ningún duplicado ni escribe nada.
 * Con `?formato=PDF|XLS|RTF` sí emite el documento, y ese camino no pasa por
 * aquí —`solicitar()` devuelve JSON—.
 *
 * **No publica el código del contribuyente**, así que un recibo encontrado por
 * su número no lleva a la persona a la que se le cobró: enseña el recibo y ahí
 * se acaba.
 */
export type ReciboDuplicado = {
  estado: string;
  duplicados: number;
  anulacion: { fecha: string; motivo: string; usuario: string } | null;
  recibo: {
    numero: string;
    serie: string;
    correlativo: number;
    cajero: string;
    formaDePago: string;
    tipoDePago: string;
    beneficioDeclarado: string | null;
    emitidoEn: string;
    total: Importe;
    lineas: {
      tributo: string;
      concepto: string;
      ejercicio: number;
      predioId: number | null;
      vehiculoId: number | null;
      cantidad: number | null;
      precioUnitario: Importe | null;
      insoluto: Importe;
      reajuste: Importe;
      interes: Importe;
      gasto: Importe;
      monto: Importe;
    }[];
  };
};

export function verRecibo(nro: string, senal?: AbortSignal): Promise<ReciboDuplicado> {
  return solicitar(`/tesoreria/recibos/${encodeURIComponent(nro)}/duplicado`, { senal });
}
