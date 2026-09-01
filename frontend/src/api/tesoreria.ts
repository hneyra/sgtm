import { descargar, solicitar, type RespuestaPaginada } from './cliente';
import type { FormatoDeDocumento } from './descarga';
import type { Paginacion } from './catastro';

/**
 * Lo que `tesoreria` publica: caja, convenios, recibos, cierre y recaudación.
 *
 * Los tipos son los `record` del backend campo por campo —`ReciboResource`,
 * `ArqueoResource`, `CierreResource`, `ConvenioResource`, `RecaudacionResource`,
 * `DuplicadoResource`, `AnulacionResource`— y los importes llegan como **texto**
 * (RNF-055): se dibujan como texto, porque pasarlos por `Number` para volver a
 * formatearlos es como se pierde un céntimo en el papel que firma el
 * contribuyente.
 *
 * <h2>Cinco controladores y ninguna ruta de más</h2>
 *
 * `CajaController` (dos POST), `ConvenioController` (un POST, un GET, un POST de
 * cierre), `ReciboController` (un GET y un POST), `CierreController` (un POST) y
 * `RecaudacionController` (dos GET). Eso es todo lo que hay: **no existe** un
 * listado de recibos, ni un catálogo de cajas, ni uno de conceptos del TUPA, ni
 * un `GET` del arqueo por su cuenta. Lo que la pantalla no puede pedir se dice en
 * pantalla; no se rellena con el juego de datos del prototipo.
 */

/** Un importe con la fecha a la que está actualizado. Es `ImporteActualizado`. */
export type Importe = { importe: string; actualizadoA: string };


/* ══════════ La deuda que la ventanilla cobra ══════════
   No la publica tesorería: la publica `GET /consultas/deuda`, que es de cuenta
   corriente (ARQ-01 §3.8, «tesorería asienta abonos; nunca determina»). La caja
   marca filas de esa lectura y las manda identificadas —tributo, ejercicio y
   unidad—, nunca valoradas: el cuánto lo resuelve el libro al releerlo a la
   fecha de pago. */

/** Es `DeudaResource`: las cinco cifras, cada una con su fecha (regla 9). */
export type DeudaActualizada = {
  insoluto: Importe;
  reajuste: Importe;
  interes: Importe;
  gasto: Importe;
  total: Importe;
};

/** Una fila de `consulta_deuda`. Es `ObligacionConDeudaResource`. */
export type ObligacionConDeuda = {
  tributo: string;
  ejercicio: number;
  /** La unidad, si la obligación es predial o de arbitrios. */
  predioId: number | null;
  /** La unidad, si es vehicular. */
  vehiculoId: number | null;
  periodoDesde: number;
  periodoHasta: number;
  /** `ORDINARIA` | `VALOR` | `COACTIVA` | `CONVENIO`, el `Fase` del dominio. */
  fase: string;
  deuda: DeudaActualizada;
};

/** Las cuatro fases que `Fase` declara. Se escriben aquí para que un valor que
 *  el enumerado no tiene no compile: el 422 aparecería en ventanilla. */
export type FaseDeCobranza = 'ORDINARIA' | 'VALOR' | 'COACTIVA' | 'CONVENIO';

export type FiltroDeDeuda = {
  codContribuyente: string;
  /** La fecha a la que se actualiza la deuda. Sin ella, hoy (regla 9). */
  fechaDeCorte?: string;
  fase?: FaseDeCobranza;
};

export function deudaDelContribuyente(
  filtro: FiltroDeDeuda,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ObligacionConDeuda>> {
  return solicitar('/consultas/deuda', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * El contribuyente al que se le cobra, resuelto de su código.
 *
 * Es la misma operación que usa Rentas y se declara aquí a propósito: la
 * ventanilla la usa para otra cosa —enseñar a quién se le está cobrando antes de
 * emitir el recibo—, y no puede quedarse sin sujeto porque otro módulo cambie su
 * firma. `CajaController` resuelve el código con `DirectorioDeContribuyentes`, y
 * si no existe contesta 404: preguntarlo antes es lo que evita descubrirlo
 * después de haber marcado seis deudas.
 */
export type ContribuyenteDeLaVentanilla = {
  id: number;
  codigo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreRazonSocial: string;
  condicionEspecial: string | null;
  activo: boolean;
};

export function contribuyentePorCodigo(
  codigo: string,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ContribuyenteDeLaVentanilla>> {
  return solicitar('/rentas/contribuyentes', { parametros: { codigo, tamano: 5 }, senal });
}


/* ══════════ El recibo ══════════ */

/** Una línea del recibo. Las cinco cifras van cada una con su fecha. */
export type LineaDeRecibo = {
  /** El tributo cobrado, o el código de la tasa. */
  tributo: string;
  /** `PAGO`, `TASA` o `CUOTA INICIAL`. */
  concepto: string;
  ejercicio: number | null;
  predioId: number | null;
  vehiculoId: number | null;
  /** Cuántas veces se cobró la tasa; nulo si no es una tasa. */
  cantidad: number | null;
  precioUnitario: Importe | null;
  insoluto: Importe;
  reajuste: Importe;
  interes: Importe;
  gasto: Importe;
  monto: Importe;
};

/**
 * El recibo emitido. Es `ReciboResource`.
 *
 * **No hay ningún campo de descuento**, y es deliberado del backend:
 * `beneficioDeclarado` sale tal como entró y no afecta al importe mientras D-02b
 * siga abierta. Publicar un «beneficio aplicado: 0.00» invitaría a la pantalla a
 * dibujar una línea que no significa nada.
 */
export type Recibo = {
  /** El número impreso, `001-0000123`. Es lo que se teclea para buscarlo. */
  numero: string;
  serie: string;
  correlativo: number;
  cajero: string;
  /** `EFECTIVO` | `CHEQUE` | `DEPOSITO` | `TARJETA` | `TRANSFERENCIA`. */
  formaDePago: string;
  /** `NORMAL` | `A_CUENTA` | `PRECONVENIO` | `CUOTA_CONVENIO` | `TASA`. */
  tipoDePago: string;
  beneficioDeclarado: string | null;
  emitidoEn: string;
  total: Importe;
  lineas: LineaDeRecibo[];
};

/**
 * El cuerpo de `POST /tesoreria/caja/cobranza`. **Lista blanca**: lo que no está
 * en `PeticionDeCobranza` no entra.
 *
 * **No hay ningún importe, ni total ni por línea.** El cuánto lo resuelve
 * `cuentacorriente` releyendo su libro a la fecha de pago, y mandar aquí una
 * cifra sería admitir que el cliente decide cuánto se cobra.
 */
export type PeticionDeCobranza = {
  /** El código de la ventanilla. No hay catálogo: se teclea. */
  caja: string;
  cajero: string;
  codContribuyente: string;
  formaDePago: string;
  /** Si falta, `NORMAL`. Con `PRECONVENIO` cobra la cuota inicial de un convenio. */
  tipoDePago?: string;
  /** La campaña declarada; **solo constancia** mientras D-02b siga abierta. */
  beneficioAplicable?: string;
  /** En ISO. Si falta, hoy; y es la fecha a la que se relee la deuda. */
  fechaDePago?: string;
  obligaciones: SeleccionDeObligacion[];
  /** Obligatorio con `tipoDePago = PRECONVENIO`, y solo entonces. */
  numeroDeConvenio?: string;
  observacion: string;
};

/** Una deuda marcada: la identifica, no la valora. */
export type SeleccionDeObligacion = {
  tributo: string;
  ejercicio: number;
  predioId?: number;
  vehiculoId?: number;
};

export function cobrarDeuda(peticion: PeticionDeCobranza): Promise<Recibo> {
  return solicitar('/tesoreria/caja/cobranza', { metodo: 'POST', cuerpo: peticion });
}

/**
 * El cuerpo de `POST /tesoreria/caja/tasas`.
 *
 * Se declara porque el endpoint existe, y **la pantalla no lo puede llamar**:
 * `conceptos[].conceptoTupa` es el código de un concepto del TUPA y ninguna
 * lectura del contrato publica ese catálogo —`TasaRepository` tiene un solo
 * método y no hay `GET /tesoreria/tasas`—, así que quien atiende no tiene de
 * dónde elegir. El precio tampoco viaja: lo resuelve el servidor con la tarifa
 * vigente a la fecha del cobro (regla 5).
 */
export type PeticionDeCobroDeTasas = {
  caja: string;
  cajero: string;
  codContribuyente: string;
  formaDePago: string;
  fechaDeCobro?: string;
  conceptos: { conceptoTupa: string; cantidad?: number }[];
  observacion: string;
};

export function cobrarTasas(peticion: PeticionDeCobroDeTasas): Promise<Recibo> {
  return solicitar('/tesoreria/caja/tasas', { metodo: 'POST', cuerpo: peticion });
}


/* ══════════ Duplicado y anulación ══════════ */

/**
 * La vista previa de un recibo. Es `DuplicadoResource`.
 *
 * `estado` se **deriva** del movimiento de anulación: no hay columna que lo
 * guarde, y V30 retiró la que V3 dejó puesta porque decía `EMITIDO` para siempre.
 */
export type DuplicadoDeRecibo = {
  /** `EMITIDO` o `ANULADO`, derivado. */
  estado: string;
  /** Cuántas veces se ha reimpreso ya. */
  duplicados: number;
  anulacion: { fecha: string; motivo: string; usuario: string | null } | null;
  recibo: Recibo;
};

export function duplicadoDeRecibo(numero: string, senal?: AbortSignal): Promise<DuplicadoDeRecibo> {
  return solicitar(`/tesoreria/recibos/${encodeURIComponent(numero)}/duplicado`, { senal });
}

/**
 * El duplicado **como papel**: `?formato=PDF|XLS|RTF` (RF-082, RF-132).
 *
 * <b>Escribe, aunque sea un `GET`.</b> Lo dice `ReciboController`: el verbo lo
 * fija el prototipo y el manual exige que cada reimpresión quede registrada con
 * quien la generó, así que la misma ruta que sin `formato` sólo mira, con
 * `formato` numera un duplicado más y pide la `observacion` (regla 10). Y pide
 * `IMPRESION`, no `LECTURA`: mirar el recibo y sacarlo por la impresora son dos
 * permisos distintos a propósito (cap. 4, RF-121).
 *
 * Por eso la pantalla no lo ofrece hasta que hay observación escrita: aquí no
 * hay «descargar y ya veremos», hay un acto.
 */
export function descargarDuplicadoDeRecibo(
  numero: string,
  formato: FormatoDeDocumento,
  observacion: string,
): Promise<void> {
  return descargar(`/tesoreria/recibos/${encodeURIComponent(numero)}/duplicado`, { formato, observacion });
}

/** El acta de anulación. Es `AnulacionResource`. */
export type ActaDeAnulacion = {
  numero: string;
  estado: string;
  fecha: string;
  motivo: string;
  autorizadoPor: string | null;
  documentoAutorizacion: string | null;
  usuario: string | null;
  /** Lo que deja de estar cobrado, a la fecha del recibo (no a la de hoy). */
  importe: Importe;
  /** Cuántas filas se escribieron en el libro; cero en caja de tasas. */
  asientosReversados: number;
  recibo: Recibo;
};

/**
 * El cuerpo de `POST /tesoreria/recibos/{nro}/anulacion`.
 *
 * `motivo` y `observacion` son cosas distintas y por eso son dos campos: el
 * motivo es el sustento del acto y se imprime en el duplicado; la observación
 * explica la operación a quien lea la bitácora (regla 10).
 *
 * **No existe la casilla «devuelve la deuda» del prototipo.** No es una opción:
 * la reversión va siempre, porque un recibo anulado sin deshacer sus abonos
 * dejaría al contribuyente al corriente sin haber pagado.
 */
export type PeticionDeAnulacion = {
  motivo: string;
  autorizadoPor?: string;
  nDeMemorando?: string;
  observacion: string;
};

export function anularRecibo(numero: string, peticion: PeticionDeAnulacion): Promise<ActaDeAnulacion> {
  return solicitar(`/tesoreria/recibos/${encodeURIComponent(numero)}/anulacion`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}


/* ══════════ Cierre y arqueo ══════════ */

/** Una fila del arqueo, por medio de pago. Es `ArqueoResource.LineaResource`. */
export type LineaDeArqueo = {
  formaDePago: string;
  cobrado: Importe;
  anulado: Importe;
  neto: Importe;
  declarado: Importe;
  diferencia: Importe;
};

/**
 * El arqueo de un turno. Es `ArqueoResource`.
 *
 * **Las cifras no se recomponen en la pantalla.** `neto` y `diferencia` salen de
 * `ArqueoDelTurno`, que las calcula de sus líneas; su propio javadoc lo dice con
 * todas las letras: «la interfaz no resta nada».
 *
 * Lo que el prototipo dibuja y aquí no está: `turno` (MAÑANA/TARDE/CONTINUO) no
 * existe como dato —`cierre_uq` (V3) hace único el turno por (caja, cajero,
 * fecha)—, y las horas salen en ISO dentro de `registradoEn`.
 */
export type Arqueo = {
  turnoId: number;
  fecha: string;
  recibosEmitidos: number;
  recibosAnulados: number;
  cobrado: Importe;
  anulado: Importe;
  neto: Importe;
  declarado: Importe;
  /** Lo declarado menos el neto; negativo si falta dinero. */
  diferencia: Importe;
  cuadra: boolean;
  lineas: LineaDeArqueo[];
};

/** El acta de un cierre —o de su reversión—. Es `CierreResource`. */
export type ActaDeCierre = {
  id: number;
  turnoId: number;
  caja: string;
  cajero: string;
  /** `CIERRE` o `REVERSION`. */
  tipo: string;
  secuencia: number;
  fecha: string;
  registradoEn: string;
  /** `CERRADO` tras un cierre, `ABIERTO` tras una reversión. Derivado. */
  estadoDelTurno: string;
  /** El arqueo congelado; nulo en una reversión. */
  arqueo: Arqueo | null;
  reversaCierreId: number | null;
  motivo: string | null;
  /** Lo que el libro confirmó; nulo en una reversión. */
  recaudadoConAsiento: Importe | null;
  /** Lo cobrado sin tocar el libro —tasas y cuotas iniciales—; nulo en una reversión. */
  recaudadoSinAsiento: Importe | null;
  observacion: string;
};

/**
 * El cuerpo de `POST /tesoreria/caja/cierre`. **Una ruta y dos actos**: con
 * `motivoDeReversion` reversa el cierre vigente; sin él, cierra.
 *
 * Las claves de `declarado` son las cinco `FormaDePago` del recibo, no las cuatro
 * casillas del prototipo: declarar por las casillas dejaría un turno con un
 * cheque descuadrado sin que el cajero pudiera decir nada. Y las cifras van como
 * **texto**: un número JSON pasa por coma flotante antes de que nadie pueda
 * comprobarlo (regla 1).
 */
export type PeticionDeCierre = {
  caja: string;
  cajero: string;
  /** En ISO. Sin ella, hoy. */
  fecha?: string;
  declarado?: Record<string, string>;
  /** Si viene, la petición reversa en vez de cerrar. Exige `ELIMINACION`. */
  motivoDeReversion?: string;
  observacion: string;
};

export function cerrarTurno(peticion: PeticionDeCierre): Promise<ActaDeCierre> {
  return solicitar('/tesoreria/caja/cierre', { metodo: 'POST', cuerpo: peticion });
}


/* ══════════ Recaudación ══════════ */

/** Una fila del avance, por tributo. */
export type FilaDeTributo = { tributo: string; cobrado: Importe; anulado: Importe; neto: Importe };

/** El avance en vivo de un turno: lo que el cajero lleva cobrado hoy. */
export type AvanceDelTurno = {
  caja: string;
  cajero: string;
  fecha: string;
  /** `ABIERTO` o `CERRADO`, derivado de sus movimientos. */
  estadoDelTurno: string;
  arqueo: Arqueo;
};

/**
 * El avance de recaudación del periodo. Es `RecaudacionResource.Avance`.
 *
 * **Sin columnas de emitido, saldo, avance ni meta**, que es lo que el prototipo
 * dibuja y no existe como dato: la meta no tiene tabla y lo emitido son cargos
 * del libro, que este contexto no lee. Publicar «meta: 0» invitaría a la pantalla
 * a mostrar un porcentaje de cumplimiento que nadie firmó.
 */
export type Avance = {
  desde: string;
  hasta: string;
  aLaFecha: string;
  filas: FilaDeTributo[];
  cobrado: Importe;
  anulado: Importe;
  neto: Importe;
  /** El arqueo en vivo, solo cuando se pidió por caja y cajero. */
  turno: AvanceDelTurno | null;
};

export type FiltroDeAvance = {
  ejercicio?: string;
  desde?: string;
  hasta?: string;
  tributo?: string;
  /** Con `caja` **y** `cajero` viene además el arqueo en vivo del turno. */
  caja?: string;
  cajero?: string;
};

export function avanceDeRecaudacion(filtro: FiltroDeAvance, senal?: AbortSignal): Promise<Avance> {
  return solicitar('/tesoreria/recaudacion/avance', { parametros: { ...filtro }, senal });
}

/**
 * Una fila de la distribución. `area`, `areaNombre` y `partida` salen **nulos**
 * en lo tributario, y es deliberado: el dato no existe y no se sustituye por un
 * «VARIOS». Un nulo obliga a la pantalla a decidir qué dibuja; un valor inventado
 * se copia a un reporte presupuestal sin que nadie lo note.
 */
export type FilaDePartida = {
  area: string | null;
  areaNombre: string | null;
  partida: string | null;
  tributo: string;
  cobrado: Importe;
  anulado: Importe;
  neto: Importe;
};

/** Es `RecaudacionResource.Distribucion`. */
export type Distribucion = {
  desde: string;
  hasta: string;
  aLaFecha: string;
  filas: FilaDePartida[];
  neto: Importe;
  /** Cuánto de ese total no se puede imputar a ninguna partida. Se publica a
   *  propósito: es todo lo tributario, que no tiene área en el esquema. */
  netoSinPartida: Importe;
};

export type FiltroDePorArea = { ejercicio?: string; desde?: string; hasta?: string; area?: string };

export function recaudacionPorArea(filtro: FiltroDePorArea, senal?: AbortSignal): Promise<Distribucion> {
  return solicitar('/tesoreria/recaudacion/por-area', { parametros: { ...filtro }, senal });
}


/* ══════════ Convenios de fraccionamiento ══════════ */

/** Una fila del cronograma. Es `ConvenioResource.CuotaResource`. */
export type CuotaDelConvenio = {
  nro: number;
  vencimiento: string;
  cuota: string;
  capital: string;
  interes: string;
  gasto: string;
};

/** Una fila de la deuda original acogida, con la fase de la que salió. */
export type DeudaAcogida = {
  tributo: string;
  ejercicio: number;
  periodo: number;
  predioId: number | null;
  vehiculoId: number | null;
  /** A dónde vuelve si el convenio se quiebra. */
  faseOrigen: string;
  aLaFecha: string;
  insoluto: string;
  reajuste: string;
  interes: string;
  gasto: string;
  total: string;
};

/** Un acto sobre el convenio: su formalización o su cierre. */
export type MovimientoDeConvenio = {
  tipo: string;
  fecha: string;
  motivo: string | null;
  autorizadoPor: string | null;
  documentoAutorizacion: string | null;
  importe: string;
  asientos: number;
  usuarioRegistro: string | null;
};

/**
 * Una fila del listado de convenios. Es `ConvenioResource.FilaResource`.
 *
 * Ligera a propósito: `cronograma`, `deudaOriginal` y `movimientos` llegan
 * **nulos** salvo cuando la consulta apunta a un solo convenio por su número —una
 * página de veinte no puede costar veinte lecturas de detalle—.
 */
export type FilaDeConvenio = {
  nroConvenio: string;
  /** El CÓDIGO del contribuyente, no su nombre. */
  contribuyente: string;
  fecha: string;
  fechaCorte: string;
  deudaAcogidaS: string;
  cuotas: number;
  pagadas: number;
  vencidas: number;
  saldoS: string;
  /** La fecha del saldo, que es la de la consulta y no la del convenio (regla 9). */
  saldoALaFecha: string;
  /** `PRECONVENIO` | `VIGENTE` | `ANULADO` | `QUEBRADO` | `REFORMULADO`. */
  estado: string;
  motivo: string | null;
  cronograma: CuotaDelConvenio[] | null;
  deudaOriginal: DeudaAcogida[] | null;
  movimientos: MovimientoDeConvenio[] | null;
};

/**
 * Los cinco estados que `EstadoDeConvenio` declara.
 *
 * «CUMPLIDO» y «EN RIESGO», que el prototipo ofrece, **no están**: no son estados
 * del convenio sino situaciones de sus cuotas, y cuántas impagas seguidas
 * producen la pérdida del beneficio es una cifra de ordenanza local (D-02b). El
 * backend las rechaza explícitamente en vez de traducirlas a algo parecido.
 */
export type EstadoDeConvenio = 'PRECONVENIO' | 'VIGENTE' | 'ANULADO' | 'QUEBRADO' | 'REFORMULADO';

export type FiltroDeConvenios = {
  /** Con él, la fila trae además su cronograma, su deuda original y sus actos. */
  nroDeConvenio?: string;
  codContribuyente?: string;
  estado?: EstadoDeConvenio;
  desde?: string;
  hasta?: string;
};

export function listarConvenios(
  filtro: FiltroDeConvenios,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<FilaDeConvenio>> {
  return solicitar('/tesoreria/convenios', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * El cuerpo de `POST /tesoreria/fraccionamientos`. **Lista blanca.**
 *
 * **No hay ningún importe, ni el interés.** El monto acogido lo resuelve el libro
 * a la fecha de corte, y el interés y el máximo de cuotas salen del conjunto
 * sellado (regla 5, D-02b). «Monto de cuota» e «Interés de fraccionamiento», que
 * el prototipo dibuja como campos, son **de salida**: los devuelve la simulación.
 */
export type PeticionDeFraccionamiento = {
  codContribuyente: string;
  /** `ORDINARIO` o `COACTIVO`. Si falta, `ORDINARIO`. */
  tipo?: string;
  /** El día del convenio, en ISO. Decide qué conjunto sellado rige. */
  fecha?: string;
  /** La fecha a la que se lee la deuda que se acoge. Si falta, la del convenio. */
  fechaDeCorte?: string;
  nroDeCuotas: number;
  /** El porcentaje de cuota inicial, en tanto por ciento. Admite «20 %». */
  cuotaInicial: string;
  primeraCuotaVence?: string;
  /** `NO REQUIERE` | `CARTA FIANZA` | `HIPOTECA` | `AVAL` | `PRENDA`. */
  tipoDeGarantia?: string;
  detalleDelOfrecimiento?: string;
  resolucion?: string;
  obligaciones: SeleccionDeObligacion[];
  /** Con `true` no escribe nada: solo devuelve el cronograma. */
  simular?: boolean;
  /** Obligatoria al registrar; la simulación no la necesita porque no escribe. */
  observacion?: string;
};

/**
 * La simulación: el cronograma que saldría, sin registrar nada.
 *
 * **No lleva número de convenio**, y eso es la mitad del punto: una simulación no
 * consume un correlativo, así que no se puede imprimir un papel con un número que
 * no existe.
 */
export type SimulacionDeConvenio = {
  montoTotal: string;
  aLaFecha: string;
  cuotaInicial: string;
  nroDeCuotas: number;
  totalDelCronograma: string;
  interesDeFraccionamientoMensual: string;
  cuotas: CuotaDelConvenio[];
  deudaOriginal: DeudaAcogida[];
};

export function simularFraccionamiento(
  peticion: PeticionDeFraccionamiento,
): Promise<SimulacionDeConvenio> {
  return solicitar('/tesoreria/fraccionamientos', {
    metodo: 'POST',
    cuerpo: { ...peticion, simular: true },
  });
}

/** El convenio registrado. Es `ConvenioResource`. */
export type Convenio = {
  numero: string;
  codContribuyente: string;
  tipo: string;
  estado: string;
  fecha: string;
  fechaCorte: string;
  montoTotal: string;
  cuotaInicial: string;
  nroDeCuotas: number;
  totalDelCronograma: string;
  interesDeFraccionamientoMensual: string;
  /** El conjunto sellado con el que se calculó, guardado para poder repetirlo. */
  conjuntoDeParametros: number;
  tipoDeGarantia: string | null;
  detalleDelOfrecimiento: string | null;
  resolucion: string | null;
  convenioDeOrigen: string | null;
  cuotas: CuotaDelConvenio[];
  deudaOriginal: DeudaAcogida[];
  movimientos: MovimientoDeConvenio[];
  aLaFecha: string | null;
  saldo: string | null;
  cuotasPagadas: number | null;
  cuotasVencidas: number | null;
};

/**
 * Registra el preconvenio.
 *
 * Lo que sale de aquí es **siempre** un preconvenio: no acoge deuda. Se pone en
 * vigor cobrando su cuota inicial por caja, con `tipoDePago = PRECONVENIO`; no
 * hay ninguna ruta para formalizar, porque publicarla permitiría poner un
 * convenio en vigor sin recibo.
 */
export function registrarPreconvenio(peticion: PeticionDeFraccionamiento): Promise<Convenio> {
  return solicitar('/tesoreria/fraccionamientos', {
    metodo: 'POST',
    cuerpo: { ...peticion, simular: false },
  });
}

/**
 * Las tres acciones que cierran un convenio, por la misma ruta.
 *
 * En el libro son el mismo acto: lo pendiente vuelve a la fase de la que salió.
 * `FORMALIZACION` no entra por aquí y el backend lo rechaza nombrándolo.
 */
export type AccionDeCierre = 'ANULACION' | 'QUIEBRE' | 'REFORMULACION';

/** El cuerpo de `POST /tesoreria/convenios/{numero}/anulacion`. */
export type PeticionDeCierreDeConvenio = {
  accion: AccionDeCierre;
  /** La fecha valor de la devolución, en ISO. Si falta, hoy. */
  fechaAnul?: string;
  motivo: string;
  responsableAnul?: string;
  nDeMemorando?: string;
  /** El convenio nuevo sobre el saldo; **solo** y obligatorio con `REFORMULACION`. */
  reformulacion?: PeticionDeFraccionamiento;
  observacion: string;
};

export function cerrarConvenio(
  numero: string,
  peticion: PeticionDeCierreDeConvenio,
): Promise<Convenio> {
  return solicitar(`/tesoreria/convenios/${encodeURIComponent(numero)}/anulacion`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}
