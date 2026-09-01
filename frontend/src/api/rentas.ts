import { solicitar, type RespuestaPaginada } from './cliente';
import type { Paginacion } from './catastro';

/**
 * Lo que `rentas` publica. Los tipos son los `record` del backend, campo por
 * campo, y los nombres raros —`dNI`, `rUC`— son los del contrato generado: se
 * respetan porque son los que viajan.
 */

/** Una fila del padron. Es `ContribuyenteResource`. */
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
 * Los cuatro filtros que `ContribuyenteController` admite. No hay mas.
 *
 * `nombreRazonSocial` busca por PARECIDO, no por igualdad: «SULLON» devuelve
 * 129 de 10 603. Es lo que permite encontrar a quien esta mal escrito en el
 * padron, y por eso el buscador no exige el nombre exacto.
 */
export type FiltroDeContribuyentes = {
  codigo?: string;
  nombreRazonSocial?: string;
  /** Se llama asi en el contrato. No es una errata. */
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


/* ══════════ Los predios del contribuyente ══════════ */

/**
 * Un predio del padrón predial de rentas. Es `PredioDeRentasResource`.
 *
 * **Sin autovalúo, y no por olvido.** El recurso no lo publica porque no está
 * almacenado en ningún sitio ni se puede derivar: llegar a él desde la ficha
 * exige el cuadro de valores unitarios y la depreciación —a las dos les falta
 * una dimensión, GOB-03 H-14/H-15—, los aranceles de la ordenanza (D-02b) y el
 * `% actualización` (D-11). Su propio javadoc lo dice: una columna de dinero
 * siempre en blanco es peor que no tenerla, porque una cifra ausente y un cero
 * no se distinguen en una grilla.
 *
 * `areaTerreno` llega **sin unidad** —`valor.toPlainString()`— al revés que en
 * omisos, donde es `AreaM2.toString()` y trae los «m2» dentro. No se le añaden
 * aquí: la cabecera de la columna es la que dice en qué se mide.
 */
export type PredioDelContribuyente = {
  /** El identificador interno, que es con el que se declara el autovalúo al determinar. */
  predioId: number;
  codigoReferenciaCatastral: string;
  /** `URBANO` | `RUSTICO`. */
  tipo: string;
  direccion: string;
  /** De la ficha catastral vigente. Nulo si el predio no tiene ficha. */
  uso: string | null;
  sector: string | null;
  /** Metros cuadrados, sin unidad. Nula si la ficha no la trae. */
  areaTerreno: string | null;
  /** La cuota de ESTE contribuyente sobre el predio, de `titularidad`. */
  porcentajePropiedad: string;
  /** `PROPIETARIO_UNICO`, `COPROPIETARIO`, `CONYUGE`, `SUCESION`… La suya, no la del primer titular. */
  condicion: string | null;
};

/**
 * Los predios de un contribuyente.
 *
 * <h2>Tres respuestas distintas donde antes había una (#541)</h2>
 *
 * Hasta #541 esta lectura contestaba `200` con la página vacía en tres casos
 * que no son el mismo. Ahora los separa, y quien la llama tiene que separarlos
 * también —medido contra el backend—:
 *
 * <ul>
 *   <li>sin ningún contribuyente → **`422 VALIDACION`**, «Hay que decir de
 *       quién son los predios: falta «codContribuyente» (o su otro nombre,
 *       «contribuyente»)». Por eso el parámetro es obligatorio en esta firma:
 *       un `string` y no un `string | undefined`;
 *   <li>un código que no está en el padrón → **`404 NO_ENCONTRADO`**, «En el
 *       padron de esta municipalidad no hay ningun contribuyente con codigo
 *       'NO-EXISTE'»;
 *   <li>un contribuyente del padrón sin ningún predio → **`200` con cero
 *       filas**, que es lo único que de verdad significa «no tiene predios».
 * </ul>
 *
 * Las dos primeras eran idénticas byte a byte y la pantalla las dibujaba como
 * la tercera: «este contribuyente no tiene predios» sobre alguien que no
 * existe, que es de las lecturas más caras que se pueden dar en ventanilla.
 *
 * `codContribuyente` y `contribuyente` son el mismo filtro con dos nombres
 * —el prototipo dibuja «Cod. Contribuyente» y el resto de las lecturas usa
 * `contribuyente`—; se manda el primero, que es el del prototipo.
 *
 * Los otros tres filtros los resuelve el backend **en memoria** sobre la lista
 * del contribuyente: `codigoPredial` por prefijo, `sector` y `condicion` por
 * igualdad sin distinguir mayúsculas.
 */
export type FiltroDePrediosDeRentas = {
  codigoPredial?: string;
  sector?: string;
  condicion?: string;
};

export function listarPrediosDelContribuyente(
  codContribuyente: string,
  filtro: FiltroDePrediosDeRentas,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PredioDelContribuyente>> {
  return solicitar('/rentas/predios', {
    parametros: { codContribuyente, ...filtro, ...paginacion },
    senal,
  });
}

/**
 * Un vehículo del padrón, con su deuda a la fecha. Es `VehiculoEncontradoResource`.
 *
 * Es **la misma fila** que publica `/consultas/vehiculos`, y el backend lo dice
 * en su javadoc: dos formas distintas de la misma lectura dirían dos cosas del
 * mismo vehículo, y la que se leyera en el expediente sería la que nadie
 * compara. Aun así se pide por `/rentas/vehículos` y no por la de Consultas, y
 * el motivo también es suyo: las conexiones de la interfaz llegan con el trozo
 * de su módulo (#433), así que quien tenga Rentas y no Consultas vería un aviso
 * de permiso ajeno dentro de su propio expediente. El acceso de ésta es
 * `vehiculos`.
 *
 * `afectoDesde` y `afectoHasta` son `int` en el recurso, no nulos: el rango de
 * afectación se deriva del año de fabricación y siempre existe.
 */
export type VehiculoDelContribuyente = {
  placa: string;
  clase: string | null;
  marca: string;
  modelo: string;
  anioFabricacion: number;
  /** `ACTIVO` | `TRANSFERIDO` | `BAJA` | `ROBADO`. */
  estado: string;
  afectoDesde: number;
  afectoHasta: number;
  contribuyenteId: number;
  codigoContribuyente: string;
  titular: string;
  deuda: { importe: string; actualizadoA: string };
};

/**
 * Los vehículos de un contribuyente.
 *
 * **El parámetro se llama `contribuyente` y NO admite `codContribuyente`**,
 * al revés que su hermana de predios, que acepta los dos nombres. Medido:
 * `?codContribuyente=C-000007` contesta `422 «Falta el parametro obligatorio
 * 'contribuyente'»`. Por eso aquí va como argumento y no como filtro suelto:
 * mandarlo con el otro nombre da un 422 que nombra un parámetro que quien lee
 * la pantalla no ha escrito.
 *
 * Y a diferencia de los predios, un código que no está en el padrón **no da
 * 404** sino `200` con cero filas (medido). La pantalla no puede distinguirlos
 * por aquí, y no le hace falta: sabe quién está abierto porque acaba de leerlo.
 */
export function listarVehiculosDelContribuyente(
  contribuyente: string,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<VehiculoDelContribuyente>> {
  return solicitar('/rentas/vehiculos', { parametros: { contribuyente, ...paginacion }, senal });
}

/* ══════════ Escrituras ══════════
   Las cuatro exigen `observacion` (regla 10, RNF-052): sin motivo no se
   guarda, y el backend lo comprueba tambien de su lado. */

/**
 * Los nueve tipos de acto que el backend admite, y como se llama cada uno en la
 * pantalla (#542).
 *
 * **Es una tabla y no una funcion, a proposito.** `TipoTransferencia.de` del
 * backend no hace lectura tolerante —no quita tildes, ni guiones, ni espacios—
 * y su javadoc dice por que le toca a la interfaz decidir: quitar los signos
 * con una expresion regular haria entrar cualquier rotulo parecido, y lo que
 * queda registrado en el padron es el acto por el que un predio cambia de
 * dueño. Una tabla no puede acertar por casualidad.
 *
 * A la izquierda va **lo que el manual imprime** —con su tilde y su guion—,
 * porque eso es lo que la pantalla dibuja y no se toca (RNF-080); a la derecha,
 * el nombre del enumerado.
 *
 * `SUCESION` y `HERENCIA` nombran el mismo hecho y **no se funden**: son dos
 * rotulos que el manual dibuja en dos pantallas distintas —predio y vehiculo—,
 * y decidir aqui que uno es el otro cambiaria en silencio lo que quedo
 * registrado. Es la misma razon por la que #427 se nego a traducir «ACTIVA» a
 * `VIGENTE`.
 */
export const TIPO_DE_TRANSFERENCIA_DEL_BACKEND: Readonly<Record<string, string>> = {
  'COMPRA-VENTA': 'COMPRA_VENTA',
  'DONACIÓN': 'DONACION',
  PERMUTA: 'PERMUTA',
  'ANTICIPO DE LEGÍTIMA': 'ANTICIPO_DE_LEGITIMA',
  'ADJUDICACIÓN': 'ADJUDICACION',
  'DACIÓN EN PAGO': 'DACION_EN_PAGO',
  'SUCESIÓN': 'SUCESION',
  REMATE: 'REMATE',
  HERENCIA: 'HERENCIA',
};

/**
 * El rotulo de la pantalla, traducido al vocabulario del backend.
 *
 * Devuelve `null` cuando el rotulo no esta en la tabla, y quien llama tiene que
 * pararse: mandarlo tal cual da un 422 que nombra un valor que quien atiende
 * acaba de elegir de un desplegable, y eso se lee como que el sistema esta roto.
 */
export function tipoDeTransferenciaDelBackend(rotulo: string): string | null {
  return TIPO_DE_TRANSFERENCIA_DEL_BACKEND[rotulo.trim()] ?? null;
}

/** El cuerpo de `POST /rentas/transferencias/predio`. Lista blanca del backend. */
export type PeticionDeTransferenciaDePredio = {
  observacion: string;
  /** El identificador interno. **No se teclea**: se resuelve del codigo. */
  predioId: number;
  codTransferente: string;
  codAdquiriente: string;
  tipoTransferencia: string;
  fechaTransferencia: string;
  valorTransferencia: string;
  porcentajeTransferido: string;
  afectaAlcabala: boolean;
  documentoOrigen: string;
};

export function transferirPredio(peticion: PeticionDeTransferenciaDePredio): Promise<unknown> {
  return solicitar('/rentas/transferencias/predio', { metodo: 'POST', cuerpo: peticion });
}

/** El cuerpo de `POST /rentas/transferencias/vehiculo`. Va por PLACA, no por id. */
export type PeticionDeTransferenciaDeVehiculo = {
  observacion: string;
  placa: string;
  codAdquiriente: string;
  tipoTransferencia: string;
  fechaTransferencia: string;
  valorTransferencia: string;
  afectaAlcabala: boolean;
  documentoOrigen: string;
};

export function transferirVehiculo(peticion: PeticionDeTransferenciaDeVehiculo): Promise<unknown> {
  return solicitar('/rentas/transferencias/vehiculo', { metodo: 'POST', cuerpo: peticion });
}

/**
 * El cuerpo de un movimiento de deuda, alta o baja.
 *
 * **`cuota` es singular.** La pantalla del manual da de alta un rango —«cuotas
 * 1 a 4»— y este `record` no lo admite: `cuotaDesde`/`cuotaHasta` no estan en
 * la lista blanca, asi que Jackson los descartaria sin decir nada y el asiento
 * quedaria con `periodo: 0`. Se manda una cuota por peticion hasta que el
 * backend admita el rango.
 */
export type PeticionDeMovimientoDeDeuda = {
  observacion: string;
  codContribuyente: string;
  tributo: string;
  /** El ejercicio. Se llama `ano` en este cuerpo. */
  ano: string;
  cuota: number;
  predioId?: number;
  vehiculoId?: number;
  insoluto?: string;
  reajuste?: string;
  interes?: string;
  gasto?: string;
  fase?: string;
  fechaValor?: string;
  documentoOrigen?: string;
  referenciaExterna?: string;
};

export function altaDeDeuda(peticion: PeticionDeMovimientoDeDeuda): Promise<unknown> {
  return solicitar('/rentas/deuda/altas', { metodo: 'POST', cuerpo: peticion });
}

export function bajaDeDeuda(peticion: PeticionDeMovimientoDeDeuda): Promise<unknown> {
  return solicitar('/rentas/deuda/bajas', { metodo: 'POST', cuerpo: peticion });
}


/* ══════════ Indicadores y corrida ══════════ */

/** Es `IndicadoresResource`. Los importes llevan su fecha (regla 9). */
export type Indicadores = {
  ejercicio: number;
  fechaCalculo: string;
  kpis: { label: string; value: string; note: string; importe: { importe: string; actualizadoA: string } | null }[];
  /** «Recaudacion por tributo» y «por mes», cada uno con sus filas y su barra. */
  paneles: {
    title: string;
    note: string;
    rows: {
      label: string;
      sub: string;
      value: string;
      pct: number;
      /** `false` cuando no hay base sobre la que calcular el avance: la barra
       *  no se dibuja, porque un 0 % y un «no se sabe» no son lo mismo. */
      avanceConocido: boolean;
    }[];
  }[];
};

/**
 * El panel de recaudacion. Es el de INICIO (ARQ-01 §3.13), no el de un modulo:
 * no hay ninguna operacion de «panel de Rentas», y Rentas toma de aqui el
 * avance de cobranza porque es la unica lectura que lo publica.
 */
export function indicadores(ejercicio: string, senal?: AbortSignal): Promise<Indicadores> {
  return solicitar('/indicadores/recaudacion', { parametros: { ejercicio }, senal });
}

/**
 * La ultima corrida masiva del predial.
 *
 * **Devuelve 204 cuando no hay ninguna**, que es el estado de hoy: `solicitar`
 * lo traduce a `undefined`, y la pantalla lo dice en vez de dibujar un embudo
 * con ceros que se leeria como una corrida que salio vacia.
 */
export type CorridaPredial = {
  etapas: { etapa: string; registros: number; monto: string | null; observados: number; estado: string }[];
  observados: number;
};

export function ultimaCorridaPredial(senal?: AbortSignal): Promise<CorridaPredial | undefined> {
  return solicitar('/rentas/predial/corridas/ultima', { senal });
}


/* ══════════ Las determinaciones ══════════
   Cinco rutas de cálculo —predial individual, corrida masiva, vehicular,
   alcabala y espectáculos— y una división que no es la del manual: tres llevan
   una MARCA en el cuerpo con la que el servidor calcula sin asentar nada, y dos
   no la tienen porque su `POST` registra el acto.

   <h2>`simulacion` es obligatorio, y no hay omisión segura</h2>

   Medido contra el backend: sin la marca, las tres contestan
   «Hay que decir si esto simula o determina: «simulacion» es obligatorio».
   Resolverla aquí por omisión sería elegir en nombre de quien atiende entre
   enseñar una cuenta y emitir deuda, así que el campo es `boolean` a secas: el
   que llama tiene que escribirlo.

   <h2>Lo que falta publicar sale por 422, no por 500 (#540)</h2>

   Hoy ningún ejercicio tiene conjunto de parámetros sellado (D-02a), así que
   las cuatro que llegan al cálculo contestan
   `422 VALIDACION` con «El ejercicio 2026 no tiene un conjunto de parametros
   sellado…». Ese mensaje es el único que nombra lo que falta, y por eso la
   pantalla lo enseña tal cual en vez de reescribirlo: `ErrorDeApi.reintentable`
   ya sabe que un `VALIDACION` no se arregla pulsando otra vez. */

/**
 * El autovalúo declarado de un predio, tal como lo pide
 * `PeticionDeCalculoPredial.PredioDelCalculo`.
 *
 * **Es opcional en el cuerpo y no siempre se puede omitir.** Cuando no viaja,
 * `DeterminarPredial` relee los autovalúos ya declarados de ESE ejercicio; si
 * no hay ninguno —el estado de hoy: nunca se ha determinado un ejercicio— cada
 * predio sin autovalúo se nombra y el cálculo se detiene. El manual no dibuja
 * ningún campo para escribirlo y el sistema todavía no sabe valorizar un
 * predio, así que la pantalla no lo manda: lo dice.
 */
export type PredioDelCalculo = { predioId: number; autovaluo: string; valuoExonerado?: string };

/**
 * El cuerpo de `POST /rentas/predial/calculo-individual`.
 *
 * El contribuyente y el ejercicio viajan además por la CONSULTA
 * (`codContribuyente`, `ejercicio`), que es donde el contrato los declara y lo
 * que permite compartir la búsqueda por la URL (#399). El cuerpo gana si trae
 * los dos (#425), así que aquí sólo va lo que no es un filtro.
 *
 * <h2>Se manda `ejercicio` y no `ano`, y no es indiferente (#541)</h2>
 *
 * El contrato declara los dos y el controlador lee los dos —`ano` es el rótulo
 * del prototipo, `ejercicio` es como se llama el dato en el cuerpo y en el
 * dominio—, así que las dos formas contestan lo mismo. Se manda la canónica
 * porque **es la que el propio backend nombra cuando falta**: sin ninguno de
 * los dos responde «Hay que decir que ejercicio se determina: falta
 * «ejercicio»» (medido), y un mensaje que nombra un parámetro que la pantalla
 * no manda es de los que cuesta leer en ventanilla.
 */
export type PeticionDePredialIndividual = {
  /** Con `true` calcula y no asienta; con `false` escribe la determinación. */
  simulacion: boolean;
  /** Obligatoria al asentar (regla 10, RNF-052). Al simular la compone el servidor. */
  observacion?: string;
  modalidad?: string;
  predios?: PredioDelCalculo[];
};

/** Un predio de la base, tal como `DeterminacionPredialResource.PredioDeLaBase`. */
export type PredioDeLaBase = {
  predioId: number;
  codigoPredial: string;
  ubicacion: string;
  uso: string | null;
  porcentajePropiedad: string;
  autovaluo: string;
  valuoExonerado: string;
  valuoAfecto: string;
  baseImponible: string;
};

/**
 * Un tramo del artículo 13 y lo que aportó.
 *
 * `limiteSuperior` es nulo en el último: el tramo abierto no tiene tope. La
 * alícuota y el límite los pone el CONJUNTO SELLADO del ejercicio y llegan en la
 * respuesta — dibujarlos desde aquí sería la regla 5.
 */
export type TramoAplicado = {
  orden: number;
  limiteSuperior: string | null;
  alicuota: string;
  porcionGravada: string;
  aporte: string;
};

export type CuotaDeterminada = { numero: number; vencimiento: string; importe: string };

/** Es `DeterminacionPredialResource`, campo por campo. Los importes son texto (RNF-055). */
export type DeterminacionPredial = {
  id: number;
  simulacion: boolean;
  ejercicio: string;
  codContribuyente: string;
  sujeto: string;
  conjuntoId: number;
  /** El nombre del conjunto sellado con que se calculó: sin él la cifra no se puede recalcular. */
  conjunto: string;
  /** La fecha a la que está calculada toda cifra de esta respuesta (regla 9, RNF-075). */
  fechaCalculo: string;
  predios: PredioDeLaBase[];
  valuoTotal: string;
  valuoExonerado: string;
  valuoAfecto: string;
  baseImponible: string;
  uit: string;
  tramos: TramoAplicado[];
  minimoImponible: string;
  impuestoInsoluto: string;
  derechoDeEmision: string;
  totalAPagar: string;
  modalidad: string;
  cuotas: CuotaDeterminada[];
  reglasAplicadas: string[];
};

export function determinarPredial(
  sujeto: { codContribuyente: string; ejercicio: string },
  peticion: PeticionDePredialIndividual,
  senal?: AbortSignal,
): Promise<DeterminacionPredial> {
  return solicitar('/rentas/predial/calculo-individual', {
    metodo: 'POST',
    parametros: { ...sujeto },
    cuerpo: peticion,
    senal,
  });
}

/**
 * El cuerpo de `POST /rentas/predial/calculo-masivo`.
 *
 * Aquí NO hay filtros de consulta: el contrato no declara ninguno para esta ruta
 * y el controlador sólo lee el cuerpo, así que el ejercicio y el alcance van
 * dentro.
 *
 * `incluyeArbitrios` y `generaCuponeraPdf` **no se mandan nunca**: el backend
 * los rechaza con 422 —los arbitrios son otro tributo con su propia
 * determinación y la cuponera es un documento—, y son las dos casillas que el
 * manual dibuja en esta pantalla.
 */
export type PeticionDeCorridaPredial = {
  simulacion: boolean;
  observacion?: string;
  ejercicio: string;
  /** `TODOS` o `SECTOR`, letra por letra: `DeterminarPredialMasivo` no admite otra cosa. */
  alcance?: string;
  /** Obligatorio con `alcance: 'SECTOR'`. */
  sector?: string;
  recalculaYaEmitidos?: boolean;
};

/** Es `CorridaPredialResource`. `monto` llega vacío en las etapas que no suman dinero. */
export type CorridaDePredial = {
  ejercicio: string;
  alcance: string;
  simulacion: boolean;
  /** Vacío cuando la corrida no determinó nada: entonces no llegó a pedir ningún parámetro. */
  conjunto: string;
  fechaCalculo: string;
  etapas: { etapa: string; registros: number; monto: string; observados: number; estado: string }[];
  observados: { codContribuyente: string; nombre: string; motivo: string }[];
};

export function correrPredialMasivo(
  peticion: PeticionDeCorridaPredial,
  senal?: AbortSignal,
): Promise<CorridaDePredial> {
  return solicitar('/rentas/predial/calculo-masivo', { metodo: 'POST', cuerpo: peticion, senal });
}

/** Una determinación vehicular. Es `DeterminacionVehicularResource`. */
export type DeterminacionVehicular = {
  id: number;
  ejercicio: string;
  vehiculoId: number;
  placa: string;
  contribuyenteId: number;
  /** La base imponible: el mayor entre el valor de adquisición y el referencial del MEF. */
  valorReferencial: string;
  montoDeterminado: string;
  simulacion: boolean;
};

/**
 * Es `CalculoVehicularResource`.
 *
 * **No es una lista pelada, y eso importa**: un contribuyente con vehículos
 * activos y ninguno afecto es una respuesta legítima, y una lista vacía no
 * tendría dónde llevar su fecha (regla 9). Con `determinaciones: []` los cuatro
 * campos de cifras llegan vacíos.
 */
export type CalculoVehicular = {
  fechaCalculo: string;
  conjuntoId: number;
  conjunto: string;
  alicuota: string;
  minimoImponible: string;
  determinaciones: DeterminacionVehicular[];
};

/** El cuerpo de `POST /rentas/vehicular/calculo`. El sujeto viaja por la consulta (#399). */
export type PeticionDeCalculoVehicular = { simulacion: boolean; observacion?: string };

export function calcularVehicular(
  sujeto: { placa?: string; codContribuyente?: string; ejercicio: string },
  peticion: PeticionDeCalculoVehicular,
  senal?: AbortSignal,
): Promise<CalculoVehicular> {
  return solicitar('/rentas/vehicular/calculo', {
    metodo: 'POST',
    parametros: { ...sujeto },
    cuerpo: peticion,
    senal,
  });
}
