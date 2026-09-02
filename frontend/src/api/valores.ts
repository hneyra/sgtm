import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion, TipoDeValor } from './consultas';

/**
 * Lo que el módulo de **Valores** lee y escribe.
 *
 * La lectura que da la *situación* de cada valor —en qué punto de la cobranza
 * está a día de hoy— vive en `consultas.ts`, porque su ruta es
 * `/consultas/valores` y su acceso es `consulta_valores`. Aquí está lo demás:
 * la cabecera (`valores_busqueda`) y los cuatro actos que se escriben.
 *
 * **Cuatro escrituras, y las cuatro exigen observación** (regla 10, RNF-052):
 * emitir, generar en lote, notificar, mover a coactiva y declarar prescripción.
 * El backend las rechaza sin ella con 422; la interfaz apaga la acción antes.
 */

/* ══════════ La cabecera del valor ══════════ */

/**
 * La cabecera de un valor emitido. Es `ValorResource` (`valores_busqueda`).
 *
 * `total` viaja como **texto suelto** y su fecha va en `proyectadoA`, al lado.
 * Es el mismo par que `ImporteActualizado` mantiene junto en el resto del
 * contrato, aquí partido en dos campos: se dibujan siempre juntos, porque una
 * cifra sin su fecha es una cifra que mañana es otra (regla 9).
 */
export type Valor = {
  id: number;
  /** `OP` | `RD` | `RM`. */
  tipo: string;
  numero: string;
  ejercicio: number;
  codContribuyente: string;
  nombreContribuyente: string;
  /** El artículo del TUO que sustenta el tipo. Lo pone el dominio, no el cliente. */
  baseLegal: string;
  /** `EstadoDeValor`: lo que la cabecera guarda. La situación a la fecha es otra cosa. */
  estado: string;
  proyectadoA: string;
  total: string;
  fechaEmision: string;
  observacion: string;
};

export function listarValores(
  filtro: { nroDeValor?: string; codContribuyente?: string; tipo?: TipoDeValor; ejercicio?: string },
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Valor>> {
  return solicitar('/valores', { parametros: { ...filtro, ...paginacion }, senal });
}

/* ══════════ Emisión individual ══════════ */

/**
 * Una obligación a formalizar. **No lleva importes**: un valor no crea deuda,
 * la formaliza, y el desglose que congela es exactamente el que la consulta de
 * deuda devuelve —nunca uno que mande el cliente—.
 *
 * Los cuatro campos son la llave con que el servidor la busca entre las
 * obligaciones con deuda del contribuyente, **por igualdad exacta**: una
 * obligación sin unidad tiene los dos identificadores en nulo, y mandar uno
 * inventado la deja sin encontrar (422 `ObligacionSinDeuda`).
 */
export type ObligacionAFormalizar = {
  tributo: string;
  ejercicio: number;
  predioId?: number | null;
  vehiculoId?: number | null;
};

/** El cuerpo de `POST /valores`. Lista blanca del backend: lo que no está, no entra. */
export type PeticionDeValor = {
  tipo: TipoDeValor;
  codContribuyente: string;
  obligaciones: ObligacionAFormalizar[];
  observacion: string;
};

export function emitirValor(peticion: PeticionDeValor): Promise<Valor> {
  return solicitar('/valores', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Emisión masiva ══════════ */

/**
 * La corrida masiva registrada. Es `ValorMasivoResource`.
 *
 * Solo registra la **etapa del criterio** (#38): la generación en sí —leer la
 * deuda de cada candidato y emitir su valor— corre en el perfil `batch`, aparte
 * de esta petición, para que una corrida de miles no compita con la caja.
 */
export type CorridaMasiva = {
  id: number;
  tipo: string;
  tributo: string | null;
  ejercicioDesde: number;
  ejercicioHasta: number;
  fechaCriterio: string | null;
  /** `SELECCION` | `IMPORTACION`. */
  origen: string;
  totalCandidatos: number;
  observacion: string;
};

/**
 * El cuerpo de `POST /valores/masivo`.
 *
 * **Exactamente uno** de `contribuyentes` o `archivoCsv`: los dos, o ninguno,
 * es 422. El archivo va en base64 —no hay adjuntos multiparte en este
 * contrato— con una sola columna, `codContribuyente`, un candidato por fila.
 */
export type PeticionDeValorMasivo = {
  tipo: TipoDeValor;
  tributo?: string;
  ejercicioDesde: number;
  ejercicioHasta: number;
  fechaCriterio?: string;
  contribuyentes?: string[];
  archivoCsv?: string;
  observacion: string;
};

export function generarValoresMasivos(peticion: PeticionDeValorMasivo): Promise<CorridaMasiva> {
  return solicitar('/valores/masivo', { metodo: 'POST', cuerpo: peticion });
}

/* ══════════ Notificación ══════════ */

/** Las cinco modalidades del art. 104 que `ModalidadDeNotificacion` declara. */
export type Modalidad = 'PERSONAL' | 'CEDULON' | 'PUBLICACION' | 'CORREO' | 'NEGATIVA';
export const MODALIDADES: readonly { k: Modalidad; label: string }[] = [
  { k: 'PERSONAL', label: 'PERSONAL — en el domicilio, con acuse' },
  { k: 'CEDULON', label: 'CEDULON — sin persona capaz o cerrado' },
  { k: 'PUBLICACION', label: 'PUBLICACION — web o diario oficial' },
  { k: 'CORREO', label: 'CORREO — medio electrónico con constancia' },
  { k: 'NEGATIVA', label: 'NEGATIVA — certificación de la negativa' },
];

/** Los tres resultados que `ResultadoDeNotificacion` declara. */
export type ResultadoDeDiligencia = 'NOTIFICADO' | 'NO_UBICADO' | 'RECHAZADO';
export const RESULTADOS: readonly { k: ResultadoDeDiligencia; label: string }[] = [
  { k: 'NOTIFICADO', label: 'NOTIFICADO — se entregó y hay acuse' },
  { k: 'NO_UBICADO', label: 'NO_UBICADO — no se ubicó el domicilio; se reintenta' },
  { k: 'RECHAZADO', label: 'RECHAZADO — se rehusó recibir; es notificación válida' },
];

/**
 * La diligencia registrada. Es `NotificacionResource`.
 *
 * `exigibleDesde` lo **deriva el servidor** del plazo parametrizado: no viaja
 * en el cuerpo, y no es un olvido —dejarlo entrar sería dejar que el cliente
 * decidiera cuándo puede empezar la cobranza coactiva—.
 */
export type Notificacion = {
  id: number;
  numeroDeValor: string;
  intento: number;
  fechaDeNotificacion: string;
  modalidad: string;
  resultado: string;
  notificador: string;
  direccion: string | null;
  personaQueRecibe: string | null;
  documentoDeQuienRecibe: string | null;
  vinculo: string | null;
  acuse: string | null;
  surtioEfecto: boolean;
  exigibleDesde: string | null;
  observacion: string;
};

/**
 * El cuerpo de `POST /valores/{nro}/notificacion`. Lista blanca.
 *
 * Los cinco campos que el prototipo dibuja y este `record` no tiene —número de
 * notificación, número de visita, «vence», la casilla de firma y las
 * características de la vivienda— **no se mandan**: Jackson los descartaría sin
 * decir nada, y la pantalla parecería estar guardando algo que no guarda. El
 * intento lo cuenta el servidor.
 */
export type PeticionDeNotificacion = {
  fechaDeNotificacion: string;
  tipoDeNotificacion: Modalidad;
  resultado: ResultadoDeDiligencia;
  notificador: string;
  direccion?: string;
  personaQueRecibe?: string;
  documentoDeQuienRecibe?: string;
  vinculo?: string;
  acuse?: string;
  observacion: string;
};

export function notificarValor(nro: string, peticion: PeticionDeNotificacion): Promise<Notificacion> {
  return solicitar(`/valores/${encodeURIComponent(nro)}/notificacion`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/* ══════════ Pase a coactiva ══════════ */

/**
 * El movimiento del valor. Es `MovimientoResource`.
 *
 * **Solo `PCO` se escribe aquí.** `ACO` y `RCO` son la respuesta de la
 * ejecutoría y los escribe el módulo de Coactiva; pedirlos por esta ruta
 * devuelve 422 con ese motivo. Y `ANU` —que el prototipo ofrece como cuarta
 * opción— no existe en `TipoDeMovimiento`: anular un valor no es un movimiento.
 */
export type MovimientoDelValor = {
  id: number;
  numeroDeValor: string;
  tipoDeMovimiento: string;
  descripcion: string;
  fechaDelMovimiento: string;
  notificacionId: number | null;
  exigibleDesde: string | null;
  observacion: string;
};

/**
 * El cuerpo de `POST /valores/{numero}/movimientos`.
 *
 * Es **idempotente**: pedirlo dos veces devuelve el mismo movimiento, no dos.
 * Lo garantiza la base (V28), no una comprobación previa.
 */
export type PeticionDeMovimiento = {
  tipoDeMovimiento: 'PCO';
  fechaDelMovimiento?: string;
  observacion: string;
};

export function pasarACoactiva(
  numero: string,
  peticion: PeticionDeMovimiento,
): Promise<MovimientoDelValor> {
  return solicitar(`/valores/${encodeURIComponent(numero)}/movimientos`, {
    metodo: 'POST',
    cuerpo: peticion,
  });
}

/* ══════════ Prescripción ══════════ */

/** Las tres causales del art. 43 que `CausalDePrescripcion` declara. */
export type Causal = 'DECLARACION_PRESENTADA' | 'SIN_DECLARACION' | 'AGENTE_RETENCION';
export const CAUSALES: readonly { k: Causal; label: string }[] = [
  { k: 'DECLARACION_PRESENTADA', label: 'DECLARACION_PRESENTADA — el deudor presentó la declaración' },
  { k: 'SIN_DECLARACION', label: 'SIN_DECLARACION — no la presentó' },
  { k: 'AGENTE_RETENCION', label: 'AGENTE_RETENCION — retuvo o percibió y no pagó' },
];

/**
 * Qué le hace un hecho al cómputo. La diferencia **no es de grado**: una
 * interrupción reinicia el plazo desde cero (art. 45) y una suspensión solo lo
 * detiene mientras dura (art. 46). Tratarlas igual adelanta o atrasa la
 * prescripción en años.
 */
export type ClaseDeHecho = 'INTERRUPCION' | 'SUSPENSION';

export type HechoDelComputo = {
  clase: ClaseDeHecho;
  causal: string;
  fechaDesde: string;
  /** Solo en una suspensión: una interrupción es un día, no un intervalo. */
  fechaHasta?: string;
};

/**
 * El cómputo de un ejercicio, con los **dos** inicios que la resolución tiene
 * que explicar: el que le tocaba y el que quedó tras las interrupciones.
 */
export type EjercicioDelComputo = {
  ejercicio: number;
  inicioDelComputo: string;
  nuevoInicioDelComputo: string;
  fechaDePrescripcion: string;
  prescrita: boolean;
};

/**
 * La prescripción declarada. Es `PrescripcionResource`.
 *
 * **Aquí está el reloj, y lo calcula el servidor.** El plazo es una cifra
 * normativa que vive en el conjunto de parámetros sellado (regla 5): la
 * interfaz no lo tiene, no lo puede leer —`GET /seguridad/parametros` publica
 * los conjuntos, no sus valores— y no lo compila. Lo que dibuja es `plazo`,
 * `inicioDelComputo` y `fechaDePrescripcion` tal como vienen.
 *
 * `resultado` es `PROCEDE`, `PROCEDE_EN_PARTE` o `NO_PROCEDE`: una solicitud
 * pide un rango y el cómputo se resuelve ejercicio por ejercicio, así que lo
 * normal es que los primeros hayan prescrito y los últimos no.
 */
export type Prescripcion = {
  id: number;
  codContribuyente: string;
  tributo: string;
  ejercicioDesde: number;
  ejercicioHasta: number;
  fechaDePresentacion: string;
  plazoAplicable: string;
  /** El plazo aplicado, con su unidad, tal como lo publica el parámetro sellado. */
  plazo: string;
  resultado: string;
  nDeResolucion: string | null;
  ejercicios: EjercicioDelComputo[];
  hechos: { clase: string; causal: string; fechaDesde: string; fechaHasta: string | null }[];
  observacion: string;
};

/**
 * El cuerpo de `POST /coactiva/prescripcion`. Lista blanca.
 *
 * Lo que el cliente **no** manda: el plazo, el inicio del cómputo, la fecha de
 * prescripción ni el resultado. Los cuatro los deriva el servidor, y son
 * precisamente los campos que el manual dibuja como de solo lectura. Dejar que
 * viajaran sería dejar que el cliente declarara prescrita una deuda que no lo
 * está.
 */
export type PeticionDePrescripcion = {
  codContribuyente: string;
  tributo: string;
  ejercicioDesde: number;
  ejercicioHasta: number;
  fechaDePresentacion?: string;
  plazoAplicable: Causal;
  hechos?: HechoDelComputo[];
  nDeResolucion?: string;
  observacion: string;
};

export function declararPrescripcion(peticion: PeticionDePrescripcion): Promise<Prescripcion> {
  return solicitar('/coactiva/prescripcion', { metodo: 'POST', cuerpo: peticion });
}

/**
 * Una fila del listado de solicitudes de prescripción. Es
 * `PrescripcionEnListaResource` (#674).
 *
 * **`ejerciciosPrescritos` es una lista y no un booleano**, y ésa es la mitad de
 * para qué existe la lectura: una solicitud pide un RANGO y el cómputo se
 * resuelve año por año, así que «procede en parte» es el caso corriente y decir
 * sólo que procedió dejaría sin contestar la única pregunta que importa — cuál
 * de los seis años sigue siendo exigible.
 *
 * **Ninguna cifra de dinero, y no es un olvido**: la prescripción no extingue un
 * importe, deja sin acción su cobro (art. 43 del TUO). Publicar una obligaría
 * además a decir a qué fecha (regla 9), y esa fecha no es un dato de esta fila
 * sino del libro.
 *
 * `codContribuyente` y `contribuyente` pueden venir **nulos**: es la solicitud
 * cuyo identificador el padrón ya no resuelve, y la fila sale igual porque es
 * justo la que hay que revisar.
 */
export type PrescripcionEnLista = {
  id: number;
  codContribuyente: string | null;
  contribuyente: string | null;
  tributo: string;
  ejercicioDesde: number;
  ejercicioHasta: number;
  fechaDePresentacion: string;
  plazoAplicable: string;
  plazo: string;
  resultado: string;
  nDeResolucion: string | null;
  ejerciciosPrescritos: number[];
  usuario: string;
  observacion: string;
};

/** Los cuatro filtros que `PrescripcionController` admite, y ni uno más. */
export type FiltroDePrescripciones = {
  codContribuyente?: string;
  tributo?: string;
  /**
   * Acota por el rango RESUELTO, **no** por lo que prescribió.
   *
   * Es deliberado del backend y conviene no «arreglarlo» aquí: filtrar por «los
   * que prescribieron» escondería las `NO_PROCEDE`, que son justamente las que
   * dicen que ese ejercicio **sigue siendo exigible**.
   */
  ejercicio?: number;
  /** `PROCEDE`, `PROCEDE_EN_PARTE` o `NO_PROCEDE`. Otra cosa es 422 diciendo cuáles hay. */
  resultado?: string;
};

/**
 * Las solicitudes de prescripción declaradas (#674).
 *
 * Es la contrapartida de la decisión que ese issue tomó: **una deuda cuya acción
 * de cobro prescribió sigue siendo cartera pendiente y emisión del ejercicio**,
 * y la declaración no escribe un solo asiento. Sin esta lectura, la deuda
 * inexigible no se podría ver en ninguna parte y la decisión sería
 * indistinguible de un descuido.
 *
 * Un `codContribuyente` que no está en el padrón es **404 nombrándolo**, no una
 * página vacía: esa respuesta se lee como «esta persona no tiene ninguna
 * declaración», que es lo contrario de lo que pasa (#622).
 */
export function listarPrescripciones(
  filtro: FiltroDePrescripciones,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PrescripcionEnLista>> {
  return solicitar('/coactiva/prescripcion', { parametros: { ...filtro, ...paginacion }, senal });
}
