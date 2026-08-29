import { RESPUESTAS } from './respuestas.generado';

/**
 * Las operaciones que el backend **ya publica**, con la forma con la que las
 * publica.
 *
 * El resto del proxy contesta `DatosDePantalla` —la forma que comparten las 134
 * pantallas— porque es lo que las pantallas piden mientras no hay backend. Para
 * estas si lo hay, y lo que publica no es esa forma: es un recurso del dominio
 * dentro del sobre paginado de `RespuestaPaginada`. La interfaz habla ya ese
 * idioma, asi que el proxy tambien tiene que hablarlo; si no, se estaria
 * construyendo la pantalla contra una forma que el servidor no usa, que es justo
 * lo que este modo intermedio existe para evitar.
 *
 * Son las mismas que enumera `IMPLEMENTADAS` en el `ContratoDeApiTest` del
 * backend: las once de seguridad (#9, #12, #13), el catalogo vial y los
 * sectores (#16), las cuatro fichas (#18, #19), su consulta (#20), los
 * aranceles (#17), el padron de contribuyentes (#11), la ficha de vehiculo
 * (#26), la declaracion jurada (#28), los beneficios (#27) y los arbitrios
 * (#31) desde #73, y desde #72 la consulta de deuda (#22, #175), la
 * constancia de no adeudo (#25, #179), el padron vehicular consultable (#25,
 * #184), las altas y bajas de deuda (#24, #72), el historial de pagos (#25,
 * #219), los predios de un contribuyente (#25, #222) y, desde #75, los
 * valores emitidos (#37). Desde #72 se suman las tres ultimas de Consultas
 * que tienen controlador: la ficha unificada de un contribuyente, el resumen
 * predial y la consulta de valores emitidos (#25), y con #72 la ultima de
 * Consultas: la simulacion del acogimiento a una campana de beneficio (RF-107).
 * Desde #363 se suman las tres pestanas de la ficha 360° que la componian por
 * el camino comun sin declarar conexion: las papeletas de transito (#46), el
 * estado de cuenta de papeleta administrativa (#47) y los expedientes
 * coactivos (#40) — las tres con `Controller` desde antes de #363, y sin
 * conectar solo por la propia interfaz.
 * Desde #395 se suman las tres ultimas de Rentas · Registro que tienen
 * controlador: el padron predial de un contribuyente (`GET /rentas/predios`) y
 * las dos determinaciones prediales, que son `POST` y contestan por
 * `ESCRITURAS` porque su respuesta es un recurso del dominio y no un listado.
 * **Esta lista crece cuando crece aquella**, no antes: publicar aqui
 * una forma que el backend todavia no sirve seria inventarsela.
 *
 * **Los valores siguen siendo los del prototipo.** Aqui no se inventa ni un
 * dato: se leen las mismas filas que dibuja el catalogo portado y se les pone
 * el nombre de campo que declara cada `Resource` del backend. Lo que cambia es
 * el sobre y las claves, no el contenido.
 *
 * Lo que sigue sin simular es la semantica: no filtra, no ordena y no pagina de
 * verdad —siempre devuelve la pagina 0 con todo lo que hay—. Fingir que pagina
 * seria inventar un comportamiento del servidor, que es lo que el proxy no hace.
 *
 * Los aranceles tampoco vienen en el sobre paginado: `ArancelController`
 * publica un arreglo suelto, y el proxy lo respeta en vez de forzarlo a
 * `Paginado` (`LISTAS`, mas abajo).
 */

/** El sobre de un listado, tal como lo publica `RespuestaPaginada` (#6). */
export interface Paginado {
  readonly contenido: readonly Readonly<Record<string, unknown>>[];
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
  readonly hayMas: boolean;
}

/** Las celdas de una fila del prototipo, como texto. */
type Fila = readonly string[];

function filasDe(pantalla: string): readonly Fila[] {
  return (RESPUESTAS[pantalla]?.tabla?.filas ?? []).map((fila) => fila.map((celda) => celda.texto));
}

/** Envuelve el contenido en una sola pagina: el proxy no pagina, y lo dice. */
function unaPagina(contenido: readonly Readonly<Record<string, unknown>>[]): Paginado {
  return {
    contenido,
    pagina: 0,
    tamano: contenido.length,
    totalElementos: contenido.length,
    totalPaginas: 1,
    hayMas: false,
  };
}

/** `Activa`, `ACTIVA`, `HABILITADO` → `true`. Cualquier otra cosa, `false`. */
const activo = (texto = ''): boolean => /^(activ|habilitad)/i.test(texto);

/** `12/08/2026 09:41` → `2026-08-12T09:41:00Z`. El backend publica instantes ISO. */
function instante(texto = ''): string | null {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!partes) return null;
  const [, dia, mes, anio, hora = '00', minuto = '00'] = partes;
  return `${anio}-${mes}-${dia}T${hora}:${minuto}:00Z`;
}

/**
 * Un importe **como lo serializa el backend**: `1,842.60` → `1842.60`.
 *
 * El prototipo escribe las cifras para leerlas —con separador de miles—, y
 * `ImporteActualizado` publica lo que devuelve `BigDecimal.toPlainString()`:
 * digitos, un punto decimal y nada mas. No es un detalle de presentacion. La
 * baja de deuda manda la cifra de la fila elegida en el cuerpo, el controlador
 * la lee con `new BigDecimal(texto)` y ese constructor **lanza** con la coma
 * dentro: el proxy estaba sirviendo una forma que el backend no sirve, y contra
 * el backend de verdad la baja habria fallado con un 422 que aqui nunca aparece
 * (#332).
 *
 * Solo se quita el separador de grupo. Ni se redondea, ni se reescala, ni se
 * completan decimales: el valor sigue siendo el del prototipo.
 */
const comoImporte = (texto: string): string => texto.replace(/,/g, '');

/** `PC-CAJA3 · 10.0.2.43` → equipo e IP por separado, como los guarda la bitacora. */
function origen(texto = ''): { equipo: string | null; ip: string | null } {
  const [equipo = '', ip = ''] = texto.split('·').map((parte) => parte.trim());
  return { equipo: equipo === '' ? null : equipo, ip: ip === '' ? null : ip };
}

/* ── Rentas: el padron de contribuyentes ───────────────────────────────── */

const contribuyentes = (): Paginado =>
  unaPagina(
    filasDe('contribuyentes').map(([est, codigo, nombre, dni, ruc], i) => ({
      id: i + 1,
      codigo,
      tipoDocumento: ruc && ruc !== '—' ? 'RUC' : 'DNI',
      numeroDocumento: ruc && ruc !== '—' ? ruc : dni,
      tipoPersona: ruc && ruc !== '—' ? 'JURIDICA' : 'NATURAL',
      nombreRazonSocial: nombre,
      condicionEspecial: null,
      activo: (est ?? '').toUpperCase() === 'A',
    })),
  );

/**
 * Ficha de vehiculo (`VehiculoResource`, #26): registro puro, ni cifra ni
 * titular con nombre. Se lee de los `campos` del prototipo —no de su `tabla`,
 * que es la busqueda por criterios que este endpoint (por placa unica) no
 * hace— y solo lo que `VehiculoResource` publica de verdad.
 */
function vehiculo(): Readonly<Record<string, unknown>> {
  const campos = RESPUESTAS['vehiculos']?.campos ?? {};
  const valor = (clave: string): string =>
    typeof campos[clave] === 'string' ? (campos[clave] as string) : '';
  const anioDe = (fecha: string): number | null => {
    const anio = Number(fecha.slice(0, 4));
    return Number.isNaN(anio) ? null : anio;
  };
  return {
    id: 1,
    placa: valor('placa2') || valor('placa') || 'ABC-123',
    contribuyenteId: 1,
    marca: valor('marca'),
    modelo: valor('modelo'),
    categoria: valor('categoria') || null,
    anioFabricacion: Number(valor('anoDeFabricacion')) || new Date().getFullYear(),
    anioInscripcion: anioDe(valor('fechaDeInscripcion')) ?? new Date().getFullYear(),
    numeroMotor: valor('nroDeMotor') || null,
    numeroSerie: valor('nroDeSerie') || null,
    estado: 'ACTIVO',
    historialDePlacas: [],
  };
}

/** `27/02/2026` → `2026-02-27`. `DeclaracionJuradaResource` publica una fecha, no un instante. */
function fechaDe(texto: string): string | null {
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) return null;
  const [, dia, mes, anio] = partes;
  return `${anio}-${mes}-${dia}`;
}

/**
 * Declaracion jurada (`DeclaracionJuradaResource`, #28): `GET .../{djNro}` trae
 * **una**, y aqui se sirve la primera fila de «Declaraciones presentadas» del
 * prototipo con esa forma —contribuyente y predios no estan en el recurso
 * real, y aqui tampoco se inventan—.
 */
function declaracionJurada(): Readonly<Record<string, unknown>> {
  const [fila] = RESPUESTAS['declaracion_jurada']?.tabla?.filas ?? [];
  const [numero, ejercicio, , tipo, fecha, , , estado] = (fila ?? []).map((c) => c.texto);
  const fechaIso = fechaDe(fecha ?? '') ?? '2026-01-01';
  return {
    id: 1,
    numero: numero || '000000',
    ejercicio: Number(ejercicio) || new Date().getFullYear(),
    tipo: (tipo ?? 'INSCRIPCION').toUpperCase().replace(/\s+/g, '_'),
    predioId: 1,
    vehiculoId: null,
    fichaCatastralId: 1,
    fechaPresentacion: fechaIso,
    fechaLimite: fechaIso,
    fueraDePlazo: false,
    estado: estado === 'Procesada' ? 'CONFORME' : 'PENDIENTE',
    djRectificaId: null,
  };
}

/**
 * Beneficios y exoneraciones (`BeneficioResource`, #27): solo las filas del
 * prototipo que ya tienen resolucion y vigencia — «En trámite» es un estado de
 * un flujo de aprobacion que `Beneficio` no modela (es registro puro, no
 * calcula ni tramita), asi que esa fila del prototipo no tiene con que
 * llenarse sin inventar una resolucion que no existe.
 */
const beneficios = (): Paginado =>
  unaPagina(
    filasDe('beneficios')
      .filter(([, , , resolucion]) => resolucion !== undefined && resolucion !== '—')
      .map(([expediente, , tipo, resolucion, vigencia, deduccion], i) => {
        const [desde] = (vigencia ?? '').split(' — ');
        const indefinida = (vigencia ?? '').includes('indefinida');
        const numero = Number.parseFloat(deduccion ?? '');
        return {
          id: i + 1,
          contribuyenteId: i + 1,
          predioId: null,
          vehiculoId: null,
          tipo,
          tributo: 'PREDIAL',
          clase: 'DEDUCCION',
          porcentaje: Number.isNaN(numero) ? null : numero.toFixed(2),
          monto: null,
          vigenciaDesde: `${desde}-01-01`,
          vigenciaHasta: indefinida ? null : `${desde}-12-31`,
          baseLegal: resolucion,
          documentoOrigen: expediente,
        };
      }),
  );

/**
 * Arbitrios municipales (`ArbitrioResource`, #31): cada fila de «Determinación
 * por servicio» del prototipo —un servicio con su tasa mensual— se convierte
 * en **una** cuota de un mes, no en las doce que tendria un ejercicio
 * completo: el proxy no inventa un padron que el prototipo no dibuja, igual
 * que ya hace con `beneficios`.
 *
 * El prototipo separa «LIMPIEZA PÚBLICA — BARRIDO» de «— RECOLECCIÓN»; el
 * dominio real solo conoce un `Servicio.LIMPIEZA_PUBLICA` (V2, #31), asi que
 * las dos colapsan en el mismo codigo — la distincion es del prototipo, no
 * del dominio que el backend publica.
 */
const SERVICIO_DEL_MOCK: Readonly<Record<string, string>> = {
  'LIMPIEZA PÚBLICA': 'LIMPIEZA_PUBLICA',
  'PARQUES Y JARDINES': 'PARQUES_JARDINES',
  SERENAZGO: 'SERENAZGO',
};

const arbitrios = (): Paginado => {
  const ejercicio =
    typeof RESPUESTAS['arbitrios']?.campos?.['ejercicio'] === 'string'
      ? (RESPUESTAS['arbitrios'].campos['ejercicio'] as string)
      : '2026';
  return unaPagina(
    filasDe('arbitrios').map(([servicio, , , tasaMensual], i) => {
      const [nombre] = (servicio ?? '').split(' — ');
      return {
        id: i + 1,
        ejercicio,
        servicio: SERVICIO_DEL_MOCK[(nombre ?? '').trim()] ?? 'LIMPIEZA_PUBLICA',
        periodo: 1,
        contribuyenteId: 1,
        predioId: 1,
        monto: tasaMensual,
        fechaCalculo: '2026-08-13',
      };
    }),
  );
};

/**
 * Como escribe el prototipo el tipo de valor —«ORDEN DE PAGO», «RES. DETERMINACIÓN»,
 * «RES. DE MULTA»— frente al codigo de tres letras que publica `ValorResource.tipo`
 * (`TipoValor.codigo()`, V26): `OP`, `RD`, `RM`.
 */
const TIPO_DE_VALOR_DEL_MOCK: Readonly<Record<string, string>> = {
  'ORDEN DE PAGO': 'OP',
  'RES. DETERMINACIÓN': 'RD',
  'RES. DE MULTA': 'RM',
};

/**
 * Como escribe el prototipo el estado de un valor frente al `enum EstadoDeValor` (V3) que
 * `ValorResource.estado` publica de verdad. «Firme» y «Reclamado» no son ningun valor del
 * enum —la firmeza es una fecha derivada de la notificacion (`NotificacionResource
 * .exigibleDesde`, #39), no un estado, y el reclamo todavia no tiene estado propio—: el mas
 * cercano que el dominio ya modela es `NOTIFICADO`, que es el estado del que ambos parten.
 */
const ESTADO_DE_VALOR_DEL_MOCK: Readonly<Record<string, string>> = {
  Emitido: 'EMITIDO',
  Firme: 'NOTIFICADO',
  Reclamado: 'NOTIFICADO',
  Coactiva: 'COACTIVA',
};

/**
 * Valores emitidos (`ValorResource`, #37). `numero` sigue el formato provisional de
 * `RegistrarValor` —`TIPO-EJERCICIO-000001`, D-09 abierta—, y de ahi se lee el ejercicio:
 * es el mismo dato que publicaria el recurso real, sin inventar uno aparte.
 *
 * `codContribuyente` sale vacio: el prototipo solo dibuja el nombre en esta tabla, nunca
 * el codigo, y la busqueda de esta pantalla no se filtra de verdad (`proxy.ts`) — no hay
 * ningun filtro que dependa de que el codigo aqui sea real.
 */
const valores = (): Paginado =>
  unaPagina(
    filasDe('valores_busqueda').map(([numero, tipo, contribuyente, , , montoS, , estado], i) => {
      const ejercicio = Number((numero ?? '').split('-')[1]) || new Date().getFullYear();
      return {
        id: i + 1,
        tipo: TIPO_DE_VALOR_DEL_MOCK[tipo ?? ''] ?? 'OP',
        numero,
        ejercicio,
        codContribuyente: '',
        nombreContribuyente: contribuyente,
        baseLegal: '',
        estado: ESTADO_DE_VALOR_DEL_MOCK[estado ?? ''] ?? 'EMITIDO',
        proyectadoA: '2026-08-13',
        total: montoS,
        fechaEmision: '2026-08-13',
        observacion: '',
      };
    }),
  );

/* ── Rentas: los predios del padron y las dos determinaciones prediales ─── */

/**
 * Predios del contribuyente (`PredioDeRentasResource`, #395).
 *
 * **No publica autovaluo ni area construida, y es a proposito**: el sistema no
 * sabe valorizar un predio todavia (D-11, GOB-03), asi que el recurso no lleva
 * las dos columnas que el prototipo dibuja. Aqui no se rellenan con lo que el
 * prototipo capturo —serian dos cifras con aspecto de determinacion que ninguna
 * regla sostiene—: se quedan fuera del recurso, y la pantalla las dibuja con
 * «—», que es lo que distingue «no llego» de «vale cero».
 *
 * `tipo` sale «URBANO» para todas, que es lo que dice el campo «Clasificación»
 * del propio prototipo; su grilla no publica esa columna por fila, asi que
 * repartirla predio a predio seria inventar el reparto. Es ademas lo que ya
 * hace `predios` (#222) con el mismo dato. `sector` sale nulo por lo mismo: el
 * unico «Sector» del prototipo es el **filtro** («Todos»), no el de cada predio.
 */
const prediosDeRentas = (): Paginado =>
  unaPagina(
    filasDe('predios_rentas').map(
      ([codigoPredial, ubicacion, uso, terrenoM, , prop, , condicion], i) => ({
        predioId: i + 1,
        codigoReferenciaCatastral: codigoPredial,
        tipo: 'URBANO',
        direccion: ubicacion,
        uso: uso === undefined || uso === '' ? null : uso,
        sector: null,
        areaTerreno: comoImporte(terrenoM ?? ''),
        porcentajePropiedad: comoImporte(prop ?? '0.00'),
        condicion: condicion === undefined || condicion === '' ? null : condicion,
      }),
    ),
  );

/**
 * El conjunto sellado con el que se determinaron las cifras del prototipo.
 *
 * Estaba en `simulados.ts` mientras la determinacion se inventaba entera; ahora
 * viaja donde el backend lo publica —dentro del recurso, en `conjunto`— porque
 * es el unico que lo sabe (`ARQ-09` §3). Sigue siendo 2026 porque de 2026 son
 * las cifras que acompana.
 */
const CONJUNTO_DEL_PROTOTIPO = '2026 v1';

/** Un campo del prototipo **tal cual**, con el formato con que lo escribio. */
const campoCrudo = (pantalla: string, clave: string): string => {
  const valor = RESPUESTAS[pantalla]?.campos?.[clave];
  return typeof valor === 'string' ? valor : '';
};

/** El mismo campo, ya como lo serializa el backend: sin separador de miles. */
const campoDelPrototipo = (pantalla: string, clave: string): string =>
  comoImporte(campoCrudo(pantalla, clave));

/** Un total de la banda del prototipo, ya sin «S/» ni separador de miles. */
const totalDelPrototipo = (pantalla: string, etiqueta: string): string => {
  const total = (RESPUESTAS[pantalla]?.totales ?? []).find((t) => t.label === etiqueta);
  return total === undefined ? '' : comoImporte(total.value.replace('S/', '').trim());
};

/**
 * Las alicuotas de los tres tramos, **las que el propio rotulo del catalogo
 * dibuja** —«Tramo 1 — hasta 15 UIT (0.2 %)»—, que es de donde salen todos los
 * valores de este archivo.
 *
 * En el sistema de verdad no salen de aqui ni de ningun otro sitio del codigo:
 * viven en el conjunto de parametros sellado (#188, regla 5). Esto es el proxy,
 * y su unica fuente es la figura del manual.
 */
const ALICUOTA_DEL_TRAMO: Readonly<Record<number, string>> = { 1: '0.2', 2: '0.6', 3: '1.0' };

/** `S/ 80,250.00 → S/ 160.50` → el tramo con sus dos cifras, ya sin formato. */
function tramoDelPrototipo(clave: string, orden: number, limiteSuperior: string | null) {
  const [operacion = '', aporte = ''] = campoCrudo('predial_individual', clave).split('→');
  const cifra = (parte: string): string => comoImporte(parte.replace('S/', '').trim());
  return {
    orden,
    limiteSuperior,
    alicuota: ALICUOTA_DEL_TRAMO[orden] ?? '0',
    porcionGravada: cifra(operacion),
    aporte: cifra(aporte),
  };
}

/**
 * Determinacion individual del predial (`DeterminacionPredialResource`, #395).
 *
 * **`simulacion` sale de la peticion**, no fijo: es lo unico que distingue
 * mirar la cuenta de asentarla, y una respuesta que dijera siempre `true`
 * dejaria sin probar la marca que hace segura la accion de la pantalla (ver
 * `useSimulacion`). `id` es 0 cuando se simula, como en el recurso real: no hay
 * determinacion asentada a la que apuntar.
 *
 * **Solo vienen dos tramos**, y eso tambien es del recurso: el backend publica
 * los tramos que **aportaron**, y el tercero de este contribuyente no aporta
 * nada. La pantalla dibuja el tercero con «—», que es lo correcto; un cero ahi
 * seria una cifra.
 */
function determinacionPredial(cuerpo: unknown): Readonly<Record<string, unknown>> {
  const simulacion = marcaDeSimulacion(cuerpo);
  const campo = (clave: string): string => campoDelPrototipo('predial_individual', clave);
  return {
    id: simulacion ? 0 : 1,
    simulacion,
    ejercicio: '2026',
    codContribuyente: '00000025673',
    sujeto: 'SUC. RUFINA MEDINA MEDINA',
    conjuntoId: 1,
    conjunto: CONJUNTO_DEL_PROTOTIPO,
    fechaCalculo: `${EL_DIA_DEL_PROTOTIPO}T09:00:00Z`,
    predios: filasDe('predial_individual').map(
      ([codigoPredial, ubicacion, uso, prop, valuoTotal, valuoExonerado, valuoAfecto], i) => ({
        predioId: i + 1,
        codigoPredial,
        ubicacion,
        uso: uso === undefined || uso === '' ? null : uso,
        porcentajePropiedad: comoImporte(prop ?? '0.00'),
        autovaluo: comoImporte(valuoTotal ?? '0.00'),
        valuoExonerado: comoImporte(valuoExonerado ?? '0.00'),
        valuoAfecto: comoImporte(valuoAfecto ?? '0.00'),
        // La base de cada predio es su valuo afecto **ya ponderado** por el `%`
        // de propiedad, y lo pondera el servidor (`RT-011`): el prototipo lo
        // trae asi en la columna «Valuo Afecto S/» de esta misma tabla.
        baseImponible: comoImporte(valuoAfecto ?? '0.00'),
      }),
    ),
    valuoTotal: campo('valuoTotalS'),
    valuoExonerado: campo('valuoExoneradoS'),
    valuoAfecto: campo('valuoAfectoS'),
    baseImponible: campo('valuoAfectoS'),
    uit: campo('uitVigente2026S'),
    tramos: [
      tramoDelPrototipo('tramo1Hasta15Uit02', 1, '80250.00'),
      tramoDelPrototipo('tramo2De15A60Uit06', 2, '321000.00'),
    ],
    minimoImponible: campo('minimoImponible06Uit'),
    impuestoInsoluto: campo('impuestoInsolutoAnualS'),
    derechoDeEmision: campo('derechoDeEmisionS'),
    // El total lo publica el servidor ya sumado; aqui se lee de la banda de
    // totales del prototipo, que es donde el prototipo lo escribio (RNF-083).
    totalAPagar: totalDelPrototipo('predial_individual', 'Total a pagar'),
    modalidad: 'FRACCIONADO',
    cuotas: [
      { numero: 1, vencimiento: '2026-02-28', importe: campo('cuota1Vence2802') },
      { numero: 2, vencimiento: '2026-05-31', importe: campo('cuota2Vence3105') },
      { numero: 3, vencimiento: '2026-08-31', importe: campo('cuota3Vence3108') },
      { numero: 4, vencimiento: '2026-11-30', importe: campo('cuota4Vence3011') },
    ],
    // Las reglas que se aplicaron, como las nombra NEG-05 (`RT-001`…). El
    // prototipo no las dibuja en ninguna parte y ninguna pantalla las lee.
    reglasAplicadas: [],
  };
}

/**
 * Como escribe el prototipo el estado de una etapa —«Completa», «Con
 * observados»— frente a los dos que publica `CorridaPredialResource`: `OK` y
 * `CON OBSERVACIONES`.
 */
const ESTADO_DE_ETAPA_DEL_MOCK: Readonly<Record<string, string>> = {
  Completa: 'OK',
  'Con observados': 'CON OBSERVACIONES',
};

/**
 * Corrida masiva del predial (`CorridaPredialResource`, #395).
 *
 * `monto` sale **cadena vacia** en las etapas que no mueven dinero —leer el
 * padron, generar cuponeras—, que es como lo publica el recurso: el «—» del
 * prototipo es la forma de dibujarlo, no la de mandarlo.
 *
 * `observados` sale vacia: el prototipo cuenta cuantos hay por etapa y **no
 * publica ninguna lista** de quienes son. Rellenarla con nombres seria lo unico
 * de este archivo que no sale de una figura del manual.
 */
function corridaPredial(cuerpo: unknown): Readonly<Record<string, unknown>> {
  return {
    ejercicio: '2026',
    // El prototipo dice «TODO EL PADRÓN»; el recurso lo dice con su enum.
    alcance: 'TODOS',
    simulacion: marcaDeSimulacion(cuerpo),
    conjunto: CONJUNTO_DEL_PROTOTIPO,
    fechaCalculo: `${EL_DIA_DEL_PROTOTIPO}T09:00:00Z`,
    etapas: filasDe('predial_masivo').map(([etapa, registros, montoS, observados, estado]) => ({
      etapa,
      registros: Number(comoImporte(registros ?? '0')) || 0,
      monto: montoS === undefined || montoS === '—' ? '' : comoImporte(montoS),
      observados: Number(comoImporte(observados ?? '0')) || 0,
      estado: ESTADO_DE_ETAPA_DEL_MOCK[estado ?? ''] ?? 'OK',
    })),
    observados: [],
  };
}

/** La marca con la que la peticion dice que solo quiere ver la cuenta. */
const marcaDeSimulacion = (cuerpo: unknown): boolean =>
  typeof cuerpo === 'object' &&
  cuerpo !== null &&
  (cuerpo as Record<string, unknown>)['simulacion'] === true;

/* ── Consultas: deuda y constancia ──────────────────────────────────────── */

/** «Ordinaria», «Valor emitido», «Coactiva» del prototipo → el `enum Fase` (V2). */
const FASE_DEL_MOCK: Readonly<Record<string, string>> = {
  Ordinaria: 'ORDINARIA',
  'Valor emitido': 'VALOR',
  Coactiva: 'COACTIVA',
};

/** `1-4` → periodo 1 a 4; `1` → 1 a 1; vacio o `Anual` → 0 y 0 (anual, V2). */
function periodoDe(cuota: string): { desde: number; hasta: number } {
  const partes = cuota
    .split('-')
    .map((p) => Number(p.trim()))
    .filter((n) => !Number.isNaN(n));
  const [desde = 0, hasta = desde] = partes;
  return { desde, hasta };
}

/**
 * Deuda de todas las obligaciones de un contribuyente (`ObligacionConDeudaResource`, #22, #175).
 *
 * Las cinco cifras de cada obligacion comparten la fecha de corte del `campos`
 * del prototipo: es lo que `DeudaResource` exige (regla 9), y el proxy no
 * inventa una fecha por cifra.
 */
const consultaDeuda = (): Paginado => {
  const fecha =
    typeof RESPUESTAS['consulta_deuda']?.campos?.['fechaDeCorte'] === 'string'
      ? (RESPUESTAS['consulta_deuda'].campos['fechaDeCorte'] as string)
      : '2026-08-13';
  const importe = (valor: string) => ({ importe: comoImporte(valor), actualizadoA: fecha });

  return unaPagina(
    filasDe('consulta_deuda').map(
      ([ano, tributo, cuota, insoluto, reajuste, interes, gasto, total, fase], i) => {
        const { desde, hasta } = periodoDe(cuota ?? '');
        return {
          tributo,
          ejercicio: Number(ano) || new Date().getFullYear(),
          predioId: i + 1,
          vehiculoId: null,
          periodoDesde: desde,
          periodoHasta: hasta,
          fase: FASE_DEL_MOCK[fase ?? ''] ?? 'ORDINARIA',
          deuda: {
            insoluto: importe(insoluto ?? '0.00'),
            reajuste: importe(reajuste ?? '0.00'),
            interes: importe(interes ?? '0.00'),
            gasto: importe(gasto ?? '0.00'),
            total: importe(total ?? '0.00'),
          },
        };
      },
    ),
  );
};

/**
 * Constancia de no adeudo (`ConstanciaResource`, RF-049, #25, #179).
 *
 * El prototipo dibuja «Tributo | Ejercicios | Situación | Saldo S/» con un
 * rango de ejercicios por fila; `ObligacionConDeudaResource` es por ejercicio
 * suelto, asi que se toma el primero del rango — es una simplificacion del
 * proxy, no del backend real, que sí publica una fila por ejercicio.
 */
function constanciaDeNoAdeudo(): Readonly<Record<string, unknown>> {
  const reporte = RESPUESTAS['constancia']?.reporte;
  const fecha = '2026-08-13';
  const codigo = reporte?.meta.find((dato) => dato.k === 'Código')?.v ?? '00000000000';
  const importe = (valor: string) => ({ importe: comoImporte(valor), actualizadoA: fecha });

  const obligaciones = (reporte?.filas ?? []).map(([tributo, rango, , saldo], i) => {
    const primerAnio = Number((rango ?? '').split('—')[0]?.trim());
    return {
      tributo,
      ejercicio: Number.isNaN(primerAnio) ? new Date().getFullYear() : primerAnio,
      predioId: i + 1,
      vehiculoId: null,
      periodoDesde: 0,
      periodoHasta: 0,
      fase: 'ORDINARIA',
      deuda: {
        insoluto: importe(saldo ?? '0.00'),
        reajuste: importe('0.00'),
        interes: importe('0.00'),
        gasto: importe('0.00'),
        total: importe(saldo ?? '0.00'),
      },
    };
  });

  return {
    codigoContribuyente: codigo,
    fechaDeCorte: fecha,
    seNiega: obligaciones.some((o) => Number(o.deuda.total.importe) > 0),
    obligaciones,
  };
}

/**
 * Padron vehicular (`VehiculoEncontradoResource`, RF-024, #25, #184).
 *
 * «Marca y modelo» es una sola celda en el prototipo; el recurso real trae `marca` y `modelo`
 * separados, y aqui no hay como partirlos sin adivinar — se guarda todo en `marca` y `modelo`
 * queda vacio. El adaptador de la pantalla los junta con un espacio, que es lo mismo que hace
 * con el dato real.
 *
 * «Afectación» trae un rango («2019 — 2021», con raya, no guion): se parte por el separador y
 * se guarda como los dos enteros que publica el recurso real.
 */
function consultaVehiculos(): Paginado {
  const fecha = '2026-08-13';
  return unaPagina(
    filasDe('consulta_vehiculos').map(
      ([placa, clase, marcaYModelo, anioFab, titular, afectacion, , deudaS], i) => {
        const [desde, hasta] = (afectacion ?? '').split('—').map((parte) => Number(parte.trim()));
        const anioPorOmision = new Date().getFullYear();
        return {
          placa,
          clase: clase || null,
          marca: marcaYModelo ?? '',
          modelo: '',
          anioFabricacion: Number(anioFab) || anioPorOmision,
          estado: 'ACTIVO',
          afectoDesde: Number.isNaN(desde) ? anioPorOmision : desde,
          afectoHasta: Number.isNaN(hasta) ? anioPorOmision : hasta,
          contribuyenteId: i + 1,
          codigoContribuyente: `C-VEH-${String(i + 1).padStart(4, '0')}`,
          titular,
          deuda: { importe: comoImporte(deudaS ?? '0.00'), actualizadoA: fecha },
        };
      },
    ),
  );
}

/**
 * Altas y bajas de deuda (`AsientoResource`, RF-045, #24, #72): la misma forma que publica
 * `cuenta_corriente`, no las columnas de expediente que dibuja el prototipo.
 *
 * «A/B» del prototipo («A» ok, «B» bad) se traduce al `tipo` del asiento: `CARGO` es alta,
 * `ABONO` es baja (`MovimientoDeDeuda#enAsientos`). «Doc. Aprob.» va a `documentoOrigen` — es el
 * unico campo de documento que trae el recurso real — y «Fecha Reg.» a `fechaValor`.
 */
function altasBajas(): Paginado {
  return unaPagina(
    filasDe('consulta_altas_bajas').map(([, aB, , , docAprob, , fechaReg], i) => ({
      id: i + 1,
      ejercicio: new Date().getFullYear(),
      tributo: 'PREDIAL',
      concepto: 'INSOLUTO',
      tipo: aB === 'A' ? 'CARGO' : 'ABONO',
      fase: 'ORDINARIA',
      periodo: null,
      predioId: null,
      vehiculoId: null,
      referenciaExterna: null,
      monto: { importe: '100.00', actualizadoA: fechaDe(fechaReg ?? '') ?? '2026-08-13' },
      documentoOrigen: docAprob || 'S/D',
      asientoReversadoId: null,
      usuarioId: null,
      motivo: null,
    })),
  );
}

/**
 * Historial de pagos (`AsientoResource`, RF-048, #25, #219): la misma forma que publica
 * `cuenta_corriente` y `consulta_altas_bajas`, filtrada a los abonos de concepto `PAGO`.
 *
 * «Concepto» del prototipo es un texto libre («Impuesto predial cuotas 1 y 2»), no un tributo del
 * enum: se guarda tal cual en `tributo` porque es lo mas cercano que hay, y la pantalla solo lo
 * muestra como texto — no lo compara contra ningun valor. «Recibo» va a `documentoOrigen`, que es
 * el unico campo de documento que trae el recurso real. «Medio» y «Caja» no viajan: el recurso no
 * los publica todavia (ver `ConsultaPagosController` en el backend).
 */
function pagos(): Paginado {
  return unaPagina(
    filasDe('consulta_pagos').map(([fecha, recibo, concepto, ano, , , importeS], i) => ({
      id: i + 1,
      ejercicio: Number(ano) || new Date().getFullYear(),
      tributo: concepto || 'PAGO',
      concepto: 'PAGO',
      tipo: 'ABONO',
      fase: 'ORDINARIA',
      periodo: null,
      predioId: null,
      vehiculoId: null,
      referenciaExterna: null,
      monto: {
        importe: comoImporte(importeS ?? '0.00'),
        actualizadoA: fechaDe(fecha ?? '') ?? '2026-08-13',
      },
      documentoOrigen: recibo || 'S/D',
      asientoReversadoId: null,
      usuarioId: null,
      motivo: null,
    })),
  );
}

/**
 * Predios de un contribuyente (`PredioEncontradoResource`, #25, #222): solo los campos que el
 * recurso real publica — código, tipo, dirección, porcentaje de titularidad y deuda. «Titular»,
 * «Uso», «Terreno m²», «Const. m²» y «Autovalúo S/» del prototipo no tienen con que llenarse
 * todavia (ver el adaptador de la pantalla).
 */
function predios(): Paginado {
  const fecha = '2026-08-13';
  return unaPagina(
    filasDe('consulta_predios').map(([codigoPredial, , direccion, , , , , deudaS], i) => ({
      predioId: i + 1,
      codigoReferenciaCatastral: codigoPredial,
      tipo: 'URBANO',
      direccion,
      porcentajeTitularidad: '100.0000',
      deuda: { importe: comoImporte(deudaS ?? '0.00'), actualizadoA: fecha },
    })),
  );
}

/* ── Consultas: resumen predial, valores y ficha unificada (#25, #72) ───── */

/**
 * El dia al que esta escrito el prototipo entero.
 *
 * Se nombra una vez en vez de repetir el literal: es la fecha de la que salen
 * todas sus capturas, no un valor de negocio.
 */
const EL_DIA_DEL_PROTOTIPO = '2026-08-13';

/**
 * Predios del resumen predial (`PredioDelResumenResource`, RF-046, #25, #72).
 *
 * Las cuatro columnas de «Predios encontrados» del prototipo son exactamente las
 * cuatro que publica el recurso, asi que aqui no falta ni sobra ninguna. Lo que
 * se anade —`fichaId`, `predioId`, `uso`, `tipo`, `version`, `vigenciaDesde`— es
 * lo que el recurso lleva y la tabla no dibuja: con `codCatastral` y `tipo` se
 * pide el historico de la ficha, que es la pestaña «Movimientos del Predio».
 *
 * **No lleva ningun importe, y eso es el dato**: el recurso real tampoco lo
 * lleva. Ponerle uno aqui construiria la pantalla contra una forma que el
 * servidor no tiene.
 */
function resumenPredial(): Paginado {
  return unaPagina(
    filasDe('consulta_resumen_predial').map(
      ([codCatastral, codPropietario, nombre, direccion], i) => ({
        fichaId: i + 1,
        predioId: i + 1,
        codCatastral,
        codPropietario: codPropietario || null,
        nombreDelPropietario: nombre || null,
        direccionDelPredio: direccion,
        uso: 'CASA HABITACION',
        tipo: 'URBANA',
        version: 1,
        vigenciaDesde: '2026-01-01',
      }),
    ),
  );
}

/**
 * Como escribe el prototipo el estado de un valor frente a `SituacionDelValor`,
 * que es lo que publica `ValorConsultadoResource.situacion`.
 *
 * «Firme» es `EXIGIBLE` —el plazo vencio—, y asi lo dice el propio enum.
 * «Reclamado» **no existe en el dominio**: no hay reclamacion de valores
 * todavia, y el mas cercano que si se modela es `NOTIFICADO`, que es del que
 * parte. Es la misma traduccion que ya hacia `ESTADO_DE_VALOR_DEL_MOCK` para la
 * cabecera, con el vocabulario de la situacion en vez del de la cabecera.
 */
const SITUACION_DEL_MOCK: Readonly<Record<string, string>> = {
  Emitido: 'EMITIDO',
  Firme: 'EXIGIBLE',
  Reclamado: 'NOTIFICADO',
  Coactiva: 'COACTIVA',
};

/** El `EstadoDeValor` (V3) del que parte cada situacion del prototipo. */
const ESTADO_TRAS_LA_SITUACION: Readonly<Record<string, string>> = {
  EMITIDO: 'EMITIDO',
  EXIGIBLE: 'NOTIFICADO',
  NOTIFICADO: 'NOTIFICADO',
  COACTIVA: 'COACTIVA',
};

/**
 * Valores emitidos consultados (`ValorConsultadoResource`, RF-041, #25, #72).
 *
 * **Dos fechas distintas, y ninguna es la otra.** `monto.actualizadoA` es
 * `proyectadoA` —el dia al que estaban proyectados los importes cuando se emitio
 * el valor, congelado desde entonces (AC de #37)— y `situacionA` es el dia desde
 * el que se miro si el plazo ya vencio. El prototipo dibuja una sola fecha,
 * «Notificado», que es una tercera: la de la diligencia. Aqui se respetan las
 * tres, porque es lo que hace el recurso real.
 *
 * «Pendiente» en la columna «Notificado» del prototipo no es una fecha: es la
 * ausencia de diligencia, y el recurso la publica como `null` — la pantalla
 * pinta un guion.
 */
function valoresConsultados(): Paginado {
  return unaPagina(
    filasDe('consulta_valores').map(
      ([numero, tipoLargo, contribuyente, tributo, periodo, montoS, notificado, estado], i) => {
        const situacion = SITUACION_DEL_MOCK[estado ?? ''] ?? 'EMITIDO';
        const notificadoEl = fechaDe(notificado ?? '');
        // El prototipo dibuja **una** fecha por fila, la de la diligencia, y de
        // la emision no dibuja ninguna. Aqui se usa la misma para las dos: el
        // proxy no inventa una tercera. Lo que si respeta es que sean campos
        // distintos, porque en el recurso real lo son y no coinciden.
        const emision = notificadoEl ?? EL_DIA_DEL_PROTOTIPO;
        return {
          id: i + 1,
          numero,
          tipo: TIPO_DE_VALOR_DEL_MOCK[tipoLargo ?? ''] ?? 'OP',
          codContribuyente: '',
          contribuyente,
          tributo: tributo || null,
          periodo: periodo || null,
          // Congelado a `proyectadoA`, la fecha de la emision: no es la de hoy,
          // y no lo es a proposito.
          monto: { importe: comoImporte(montoS ?? '0.00'), actualizadoA: emision },
          notificadoEl,
          // La exigibilidad la fija la diligencia: sin acuse no hay desde
          // cuando, y sin fecha de notificacion tampoco.
          exigibleDesde: situacion === 'EXIGIBLE' ? notificadoEl : null,
          situacion,
          estado: ESTADO_TRAS_LA_SITUACION[situacion] ?? 'EMITIDO',
          // El dia desde el que se miro el plazo. Es de la consulta, no de la
          // fila: todas las filas comparten la misma.
          situacionA: EL_DIA_DEL_PROTOTIPO,
          fechaEmision: emision,
        };
      },
    ),
  );
}

/**
 * La ficha unificada de un contribuyente (`ConsultaUnificadaResource`, RF-046, #25, #72).
 *
 * No es un listado: es **un objeto** con cabecera, resumen y seis rejillas
 * paginadas dentro, cada una con su propio sobre de `RespuestaPaginada`. Se
 * sirve entero con esa forma porque es la que tiene el backend; que la pantalla
 * hoy solo dibuje el resumen no es motivo para publicar menos.
 *
 * **Lo que no lleva, y no por olvido**: ninguna clave de la rejilla «Impuesto
 * anual» del prototipo —`valuoAfecto`, `imptoPredial`, `limpPublica`,
 * `parqYJardines`, `rellSanitario`, `serenazgo`—. El recurso real tampoco las
 * lleva (D-02a, D-02b, y el predial es por contribuyente), asi que ponerlas aqui
 * seria construir la pantalla contra una respuesta que el servidor no da.
 *
 * `valores` sale como pagina vacia y es la unica seccion que se queda sin
 * filas: `ValorDeLaFicha` publica el desglose del valor en cinco cifras
 * —insoluto, reajuste, interes, gasto y total— y el prototipo dibuja **una**,
 * el monto. Repartirla en cinco seria inventar un desglose; ponerla en el total
 * y cero en las otras cuatro tambien. Las demas secciones se leen de las filas
 * que el prototipo ya dibuja en las pantallas de esas mismas pestañas.
 */
function consultaUnificada(): Readonly<Record<string, unknown>> {
  const campos = RESPUESTAS['consulta_unificada']?.campos ?? {};
  const valor = (clave: string): string =>
    typeof campos[clave] === 'string' ? (campos[clave] as string) : '';
  const fecha = RESPUESTAS['consulta_unificada']?.fechaCalculo ?? '2026-08-13';
  const aLaFecha = (cifra: string) => ({
    importe: comoImporte(cifra || '0.00'),
    actualizadoA: fecha,
  });

  // Una sola persona en la cabecera, la primera del padron del prototipo: el
  // proxy no filtra, y mezclar el codigo de una con el nombre de otra daria una
  // ficha de nadie.
  const [titular] = filasDe('contribuyentes');
  const [, codigo = '', nombre = '', dni = '', ruc = ''] = titular ?? [];

  return {
    contribuyente: {
      codigo,
      nombre,
      documento: ruc && ruc !== '—' ? ruc : dni,
    },
    aLaFecha: fecha,
    resumenDeSaldos: {
      insoluto: aLaFecha(valor('insoluto')),
      reajuste: aLaFecha(valor('reajuste')),
      interes: aLaFecha(valor('interes')),
      gasto: aLaFecha(valor('gasto')),
      total: aLaFecha(valor('total')),
      estadoDeLaConsulta: valor('estadoDeLaConsulta'),
    },
    deudasPendientes: unaPagina(deudasDeLaFicha(fecha)),
    pagosRealizados: unaPagina(pagos().contenido.map(movimientoDeLaFicha)),
    altasYBajas: unaPagina(altasBajas().contenido.map(movimientoDeLaFicha)),
    fraccionamientos: unaPagina(conveniosDeLaFicha(fecha)),
    valores: unaPagina([]),
    declaracionesJuradas: unaPagina([declaracionJurada()]),
  };
}

/**
 * La situacion del ciudadano en todas las municipalidades donde figure
 * (`SituacionDelCiudadanoResource`, #57, RF-131, ADR-0020).
 *
 * ── Sin parametros, y por eso sin filtro que fingir ────────────────────────
 *
 * `GET /portal/situacion` no recibe nada: el sujeto sale del claim
 * `numero_documento` del token del realm del ciudadano. Aqui no hay token que
 * leer —el proxy no autentica—, asi que se responde por la primera persona del
 * padron del prototipo, que es la misma con la que se prueba la ficha 360°.
 *
 * ── Las dos municipalidades llevan las MISMAS filas, y hay que decirlo ─────
 *
 * El prototipo tiene **un** padron. Lo que este recurso demuestra es la
 * composicion —dos bloques, un total consolidado, una sola fecha de corte—, no
 * dos juegos de datos: los dos bloques repiten las obligaciones y los predios
 * del prototipo, y por eso el total es exactamente el doble del de uno. No es un
 * defecto disimulado: inventar un segundo padron seria inventar deuda, que es lo
 * que este archivo no hace nunca (ver la cabecera del modulo).
 *
 * Las dos municipalidades son las que el proyecto ya nombra: la del manual
 * —Sullana, de donde salen las 231 figuras— y la del piloto de D-01, Catacaos.
 * Sus ubigeos son los reales.
 */
function situacionDelCiudadano(): Readonly<Record<string, unknown>> {
  const ficha = consultaUnificada();
  const cabecera = esObjetoDelMock(ficha['contribuyente']) ? ficha['contribuyente'] : {};
  const fecha = typeof ficha['aLaFecha'] === 'string' ? ficha['aLaFecha'] : EL_DIA_DEL_PROTOTIPO;
  const resumen = esObjetoDelMock(ficha['resumenDeSaldos']) ? ficha['resumenDeSaldos'] : {};
  const obligaciones = deudasDeLaFicha(fecha);

  // El titular del padron, con su documento partido en tipo y numero: el recurso
  // los publica separados justamente para que la interfaz pueda comparar el
  // numero con el claim de su token.
  const [titular] = filasDe('contribuyentes');
  const [, , , dni = '', ruc = ''] = titular ?? [];
  const esRuc = ruc !== '' && ruc !== '—';

  const enLaMunicipalidad = (ubigeo: string, nombre: string) => ({
    ubigeo,
    nombre,
    codigoContribuyente: cabecera['codigo'] ?? '',
    nombreContribuyente: cabecera['nombre'] ?? '',
    activo: true,
    resumenDeSaldos: resumen,
    obligaciones,
    predios: prediosDelCiudadano(),
  });

  const total = esObjetoDelMock(resumen['total']) ? resumen['total'] : null;
  const importeDelTotal =
    total !== null && typeof total['importe'] === 'string' ? total['importe'] : '0.00';

  return {
    tipoDocumento: esRuc ? 'RUC' : 'DNI',
    numeroDocumento: esRuc ? ruc : dni,
    aLaFecha: fecha,
    municipalidadesRecorridas: 2,
    // Las dos ramas se leyeron, asi que hay total. Se suma aqui porque es lo que
    // hace el servidor (RNF-083): la interfaz no compone ninguna cifra.
    // Sumado **aqui**, porque es lo que hace el servidor (RNF-083): la interfaz
    // no compone ninguna cifra. Y con la suma exacta del propio archivo, que no
    // pasa por coma flotante (regla 1).
    totalConsolidado: {
      importe: sumaDeImportes([importeDelTotal, importeDelTotal]),
      actualizadoA: fecha,
    },
    notaDelTotal: null,
    sinRegistros: false,
    municipalidades: [
      enLaMunicipalidad('200601', 'MUNICIPALIDAD PROVINCIAL DE SULLANA'),
      enLaMunicipalidad('200104', 'MUNICIPALIDAD DISTRITAL DE CATACAOS'),
    ],
  };
}

/** Los predios, con la forma que tienen dentro de la situacion: sin `predioId` ni deuda. */
function prediosDelCiudadano(): readonly Readonly<Record<string, unknown>>[] {
  return predios().contenido.map((predio) => ({
    codigoReferenciaCatastral: predio['codigoReferenciaCatastral'],
    tipo: predio['tipo'],
    direccion: predio['direccion'],
    porcentajeTitularidad: predio['porcentajeTitularidad'],
  }));
}

/** Un objeto JSON y no un arreglo: el mismo predicado que usa la interfaz. */
const esObjetoDelMock = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/**
 * «Deudas Pendientes» de la ficha (`ObligacionDeLaFicha`): las mismas filas que
 * `consulta_deuda`, con el desglose **plano** en vez de anidado bajo `deuda`.
 * Son dos recursos distintos del mismo dato, y el proxy respeta las dos formas.
 */
function deudasDeLaFicha(fecha: string): readonly Readonly<Record<string, unknown>>[] {
  const importe = (cifra: string) => ({ importe: comoImporte(cifra), actualizadoA: fecha });
  return filasDe('consulta_deuda').map(
    ([ano, tributo, , insoluto, reajuste, interes, gasto, total], i) => ({
      tributo,
      ejercicio: Number(ano) || new Date().getFullYear(),
      predioId: i + 1,
      vehiculoId: null,
      insoluto: importe(insoluto ?? '0.00'),
      reajuste: importe(reajuste ?? '0.00'),
      interes: importe(interes ?? '0.00'),
      gasto: importe(gasto ?? '0.00'),
      total: importe(total ?? '0.00'),
    }),
  );
}

/**
 * Un asiento del libro, con la forma que tiene dentro de la ficha unificada.
 *
 * `MovimientoDeLaFicha` es `AsientoResource` menos lo que la ficha no necesita
 * —`referenciaExterna`, `asientoReversadoId`, `usuarioId`— y con el monto a su
 * **fecha valor**, que es lo que ya trae el asiento: un pago de marzo no se
 * actualiza.
 */
function movimientoDeLaFicha(
  asiento: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return {
    id: asiento['id'],
    ejercicio: asiento['ejercicio'],
    tributo: asiento['tributo'],
    concepto: asiento['concepto'],
    tipo: asiento['tipo'],
    fase: asiento['fase'],
    periodo: asiento['periodo'],
    predioId: asiento['predioId'],
    vehiculoId: asiento['vehiculoId'],
    monto: asiento['monto'],
    documentoOrigen: asiento['documentoOrigen'],
    motivo: asiento['motivo'],
  };
}

/**
 * «Fraccionamientos» de la ficha (`ConvenioDeLaFicha`), de las filas de
 * `consulta_convenios`.
 *
 * Las dos cifras llevan **fechas distintas** y por eso viajan separadas: la
 * deuda acogida a la fecha de corte del convenio —la del propio convenio— y el
 * saldo a la de la consulta. Aplanarlas dejaria dos cifras de dias distintos
 * bajo la misma cabecera, que es justo lo que el recurso real evita.
 */
function conveniosDeLaFicha(fecha: string): readonly Readonly<Record<string, unknown>>[] {
  return filasDe('consulta_convenios').map(
    ([numero, , suscrito, acogida, cuotas, pagadas, vencidas, saldo, estado]) => {
      const fechaDelConvenio = fechaDe(suscrito ?? '') ?? fecha;
      return {
        numero,
        fecha: fechaDelConvenio,
        deudaAcogida: {
          importe: comoImporte(acogida ?? '0.00'),
          actualizadoA: fechaDelConvenio,
        },
        cuotas: Number(cuotas) || 0,
        pagadas: Number(pagadas) || 0,
        vencidas: Number(vencidas) || 0,
        saldo: { importe: comoImporte(saldo ?? '0.00'), actualizadoA: fecha },
        estado: (estado ?? '').toUpperCase(),
        motivoDelCierre: null,
      };
    },
  );
}

/* ── Cuenta corriente: el libro de asientos ────────────────────────────── */

/**
 * Un asiento por cada cifra emitida y otro por cada cifra pagada.
 *
 * El prototipo dibuja una fila por cuota con «emitido», «pagado» y «saldo» en la
 * misma linea; el libro no funciona asi —cada movimiento es su propio asiento— y
 * lo que publica `AsientoResource` es uno. Aqui se desdobla, que es la forma que
 * tiene el backend, y el monto viaja con su fecha (`ImporteActualizado`).
 */
const cuentaCorriente = (): Paginado => {
  const asientos: Readonly<Record<string, unknown>>[] = [];
  filasDe('cuenta_corriente').forEach(
    ([ejercicio, tributo, unidad, cuota, emitido, pagado, , fase], i) => {
      const comun = {
        ejercicio: Number(ejercicio),
        tributo,
        concepto: 'INSOLUTO',
        fase: (fase ?? '').toUpperCase(),
        periodo: Number((cuota ?? '').split(' ')[0]) || null,
        predioId: unidad,
        vehiculoId: null,
        referenciaExterna: null,
        documentoOrigen: `Emisión ${ejercicio}`,
        asientoReversadoId: null,
        usuarioId: null,
        motivo: null,
      };
      if (emitido && emitido !== '0.00') {
        asientos.push({
          ...comun,
          id: asientos.length + 1,
          tipo: 'CARGO',
          monto: { importe: comoImporte(emitido), actualizadoA: `${ejercicio}-02-28` },
        });
      }
      if (pagado && pagado !== '0.00') {
        asientos.push({
          ...comun,
          id: asientos.length + 1,
          tipo: 'ABONO',
          monto: { importe: comoImporte(pagado), actualizadoA: `${ejercicio}-03-1${i % 9}` },
        });
      }
    },
  );
  return unaPagina(asientos);
};

/* ── Catastro: sectores, fichas y su consulta ──────────────────────────── */

const sectores = (): Paginado =>
  unaPagina(
    filasDe('sectores').map(([codigo, nombre, , , , zona, estado], i) => ({
      id: i + 1,
      codigo,
      nombre,
      zona,
      activo: activo(estado),
    })),
  );

/**
 * Aranceles de terreno (`ArancelResource`, #17).
 *
 * No es `Paginado`: el controlador real devuelve `List<ArancelResource>` tal
 * cual, sin sobre. `viaId` no esta en el prototipo —su columna es el nombre de
 * la via, no un identificador—, asi que aqui se numera por posicion, igual que
 * las demas conexiones que necesitan un identificador que el prototipo no
 * dibuja (`fichas`, `sectores`). `tramo` reutiliza «Cuadra desde» del
 * prototipo: es lo mas cercano que hay a esa subdivision libre.
 */
const aranceles = (): readonly Readonly<Record<string, unknown>>[] =>
  filasDe('aranceles').map(([, cuadraDesde, , , arancelSM], i) => ({
    id: i + 1,
    viaId: i + 1,
    tramo: cuadraDesde === '' ? null : cuadraDesde,
    valorM2: arancelSM,
    documentoFuente: 'Resolución de Alcaldía 0142-2026-MPS',
  }));

/**
 * Las fichas de la consulta transversal (`FichaEncontradaResource`, #20).
 *
 * `areaConstruida` **se sirve**, y no es un adorno: el recurso la publica ya
 * sumada desde el servidor (#290) y es lo que la interfaz tiene prohibido
 * componer (RNF-083). Sin ella en el proxy, la unica columna que ejercita esa
 * prohibicion salia con «—» en todas las filas y ninguna prueba podia distinguir
 * «la pinta tal cual» de «la suma en el cliente». El prototipo la trae en la
 * columna 6 —«Área const. m²»—, que es la que la destructuracion no llegaba a
 * leer.
 */
const fichas = (): Paginado =>
  unaPagina(
    filasDe('consulta_fichas').map(([codigo, , titular, uso, areaTerreno, areaConstruida], i) => ({
      id: i + 1,
      predioId: i + 1,
      codRefCatastral: codigo,
      direccion: '',
      manzana: null,
      lote: null,
      tipo: 'UNICA',
      version: 1,
      areaTerreno,
      areaConstruida,
      uso,
      vigenciaDesde: '2026-01-01',
      titular,
    })),
  );

/**
 * Una ficha con su historico.
 *
 * **Tres versiones y no una**, porque una sola no ejercita nada: el bloque de
 * versionado existe para ensenar que el area de hoy no es la de siempre, y con
 * una version la pantalla se ve igual con el bloque y sin el. Las fechas y las
 * observaciones salen del prototipo; la forma, de `FichaResource`.
 */
function ficha(
  pantalla: string,
  tipo: string,
  detalle: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const campos = RESPUESTAS[pantalla]?.campos ?? {};
  const valor = (clave: string): string =>
    typeof campos[clave] === 'string' ? (campos[clave] as string) : '';

  const actual = {
    version: 3,
    vigenciaDesde: '2026-03-12',
    vigenciaHasta: null,
    vigente: true,
    origen: 'FISCALIZACION',
    documentoOrigen: 'Acta de inspección 0244-2026',
    observacion: 'Fiscalización de campo: se verificó ampliación en el segundo piso no declarada.',
  };

  return {
    id: 1,
    predioId: 1,
    tipo,
    areaTerreno: valor('areaTotalHa') || '210.00',
    uso: valor('uso2') || 'Casa habitación',
    denominacion: valor('denominacion2') || null,
    ...actual,
    construcciones: [
      {
        id: 1,
        piso: '01',
        areaConstruida: '118.50',
        anioConstruccion: 1998,
        material: 'NOBLE',
        estadoConservacion: 'BUENO',
        categorias: 'C B C C B C B',
      },
      {
        id: 2,
        piso: '02',
        areaConstruida: '46.00',
        anioConstruccion: 2024,
        material: 'NOBLE',
        estadoConservacion: 'MUY_BUENO',
        categorias: 'B B B C B C B',
      },
    ],
    economico: null,
    bienesComunes: null,
    rural: null,
    ...detalle,
    historico: [
      {
        id: 3,
        ...actual,
        areaTerreno: '210.00',
        uso: 'Casa habitación',
        usuario: 'mrios',
        registradaEn: '2026-03-12T10:22:00Z',
      },
      {
        id: 2,
        version: 2,
        areaTerreno: '210.00',
        uso: 'Casa habitación',
        vigenciaDesde: '2021-06-01',
        vigenciaHasta: '2026-03-11',
        vigente: false,
        origen: 'DECLARACION',
        documentoOrigen: 'DJ 2021-004182',
        observacion: 'Declaración jurada del contribuyente por ampliación del primer piso.',
        usuario: 'jcardenas',
        registradaEn: '2021-06-01T09:05:00Z',
      },
      {
        id: 1,
        version: 1,
        areaTerreno: '210.00',
        uso: 'Casa habitación',
        vigenciaDesde: '2006-01-01',
        vigenciaHasta: '2021-05-31',
        vigente: false,
        origen: 'CATASTRO',
        documentoOrigen: 'Levantamiento catastral 2006',
        observacion: 'Ficha inicial del levantamiento catastral.',
        usuario: 'catastro',
        registradaEn: '2006-01-01T00:00:00Z',
      },
    ],
  };
}

const urbana = (): Readonly<Record<string, unknown>> => ficha('ficha_urbana', 'UNICA', {});

const economica = (): Readonly<Record<string, unknown>> =>
  ficha('ficha_economica', 'ECONOMICA', {
    economico: {
      actividades: [
        {
          id: 1,
          conductor: 'MEDINA MEDINA, RUFINA (SUC.)',
          nombreComercial: 'BODEGA EL SOL',
          ciiu: 'G-5211-01 — VENTA AL POR MENOR EN ALMACENES',
          areaOcupada: '48.00',
          licenciaNumero: '2010-006549',
          licenciaFecha: '2010-04-18',
          anuncioNumero: null,
        },
      ],
      informacionComplementaria: null,
      sinLicencia: 0,
    },
  });

const bienesComunes = (): Readonly<Record<string, unknown>> =>
  ficha('ficha_bienes', 'BIENES_COMUNES', {
    bienesComunes: {
      bienes: [
        {
          id: 1,
          descripcion: 'Escalera común',
          area: '24.00',
          material: 'NOBLE',
          estadoConservacion: 'BUENO',
        },
      ],
      participaciones: filasDe('ficha_bienes').map(([unidad, , , porcentaje], i) => ({
        predioId: i + 1,
        porcentaje,
        unidad,
      })),
      areaComunTotal: '124.00',
    },
  });

const rural = (): Readonly<Record<string, unknown>> =>
  ficha('ficha_rural', 'RURAL', {
    rural: {
      tierras: [
        {
          id: 1,
          clasificacion: 'CULTIVO EN LIMPIO',
          calidadAgrologica: 'MEDIA',
          riego: 'BAJO_RIEGO',
          hectareas: '8.2000 HA',
        },
        {
          id: 2,
          clasificacion: 'PASTOS',
          calidadAgrologica: null,
          riego: 'SECANO',
          hectareas: '4.3000 HA',
        },
      ],
      colindantes: [{ orientacion: 'NORTE', descripcion: 'Fundo San Miguel' }],
      hectareasTotales: '12.5000 HA',
    },
  });

/** Recursos que no son listados: se sirven tal cual, sin sobre paginado. */
/**
 * La matriz de permisos efectivos de la sesion (`GET /seguridad/sesion/permisos`, ADR-0013).
 *
 * Contra el proxy —modo prototipo, sin backend— se devuelven **todas** las opciones del catalogo
 * con los siete privilegios: el proxy no tiene una sesion de la que sacar permisos reales, y la
 * demostracion tiene que poder llegar a las 134 pantallas. La forma es la del backend:
 * `{ opcion: [privilegios] }`, con los privilegios en minuscula como los nombra el manual.
 */
const SIETE_PRIVILEGIOS = [
  'ejecucion',
  'lectura',
  'registro',
  'modificacion',
  'eliminacion',
  'impresion',
  'especial',
] as const;

const permisosDeLaSesion = (): Readonly<Record<string, unknown>> =>
  Object.fromEntries(filasDe('accesos').map(([codigo]) => [codigo, SIETE_PRIVILEGIOS]));

/**
 * Simulacion del acogimiento a una campana de beneficio
 * (`DeudasConBeneficioResource`, RF-107, #72).
 *
 * No es un listado: es **un objeto** con la cabecera del contribuyente, el
 * resumen del acogimiento, las campanas aplicables y la rejilla de obligaciones
 * dentro de su sobre paginado. Se sirve con esa forma porque es la que tiene el
 * backend.
 *
 * **Aqui si hay una campana con su descuento, y contra el backend puede no
 * haberla**: las campanas son dato del conjunto de parametros sellado (D-02b,
 * D-02c) y hoy no hay ninguna cargada, asi que el servidor de verdad responde
 * `simulacion: null` y `campaniasAplicables: []` hasta que alguien selle una. El
 * proxy es simulacion declarada (ADR-0010) y publica la del prototipo para que
 * la pantalla se pueda dibujar entera; las cifras son las suyas, no se inventa
 * ninguna aqui.
 *
 * `registrosAcogidos` es **cuantas filas se sirven**, no el «36 de 128» del
 * prototipo: el proxy no filtra ni pagina, y decir otra cosa seria fingir un
 * comportamiento del servidor.
 */
function deudasConBeneficio(): Readonly<Record<string, unknown>> {
  const campos = RESPUESTAS['consulta_deudas_beneficio']?.campos ?? {};
  const valor = (clave: string): string =>
    typeof campos[clave] === 'string' ? (campos[clave] as string) : '';
  const fecha = RESPUESTAS['consulta_deudas_beneficio']?.fechaCalculo ?? EL_DIA_DEL_PROTOTIPO;
  const aLaFecha = (cifra: string) => ({
    importe: comoImporte(cifra || '0.00'),
    actualizadoA: fecha,
  });

  const obligaciones = filasDe('consulta_deudas_beneficio').map(
    ([ano, unidad, , , , nomTrib, , , , insoluto, reajuste, interes, gastos, total], i) => ({
      tributo: nomTrib,
      ejercicio: Number(ano) || new Date().getFullYear(),
      predioId: unidad && unidad !== '—' ? i + 1 : null,
      vehiculoId: null,
      insoluto: aLaFecha(insoluto ?? '0.00'),
      reajuste: aLaFecha(reajuste ?? '0.00'),
      interes: aLaFecha(interes ?? '0.00'),
      gasto: aLaFecha(gastos ?? '0.00'),
      total: aLaFecha(total ?? '0.00'),
    }),
  );

  const campania = valor('benefAplicable');

  return {
    contribuyente: {
      codigo: valor('contribuyente'),
      nombre: valor('contribuyente2'),
      documento: '',
      domicilioFiscal: valor('domicilioFiscal'),
    },
    aLaFecha: fecha,
    deudaTotal: aLaFecha(valor('deudaTotalS')),
    deudaAcogida: aLaFecha(valor('deudaAcogidaS')),
    registrosAcogidos: obligaciones.length,
    simulacion: {
      campania,
      alicuotaAplicada: valor('tasaAplicada'),
      baseDelBeneficio: 'TOTAL',
      baseDelBeneficioImporte: aLaFecha(valor('deudaAcogidaS')),
      ahorro: aLaFecha(valor('beneficioS')),
      deudaConBeneficio: aLaFecha(valor('deudaConBeneficioS')),
    },
    campaniasAplicables: [{ nombre: campania, alicuota: valor('tasaAplicada'), base: 'TOTAL' }],
    estadoDeLaSimulacion:
      'Acogimiento simulado a «' +
      campania +
      '»: ' +
      valor('tasaAplicada') +
      ' % sobre toda la deuda acogida. Es una simulación: no modifica la deuda registrada.',
    obligaciones: unaPagina(obligaciones),
  };
}

/* ── Coactiva: expedientes, su proceso y la deuda en cobranza (#76) ─────── */

/**
 * Prototipo → `EstadoDelExpediente` (V33, `coactiva/dominio/EstadoDelExpediente.java`).
 *
 * Los seis codigos del manual —`011` a `051`— mas `INICIADO` (`000`), que es con
 * lo que nace el expediente al importar y no se elige en ningun desplegable. El
 * prototipo escribe solo tres de esos siete en la grilla de expedientes
 * («Iniciado», «Con medida», «Concluido»): las demas filas del padron real caen
 * en algun punto intermedio, y aqui no se inventa uno — se usa `INICIADO` como
 * el que menos compromete cuando la etiqueta del prototipo no es ninguna de las
 * tres reconocidas.
 */
const ESTADO_DEL_EXPEDIENTE_DEL_MOCK: Readonly<
  Record<string, { readonly estado: string; readonly estadoCodigo: string }>
> = {
  Iniciado: { estado: 'INICIADO', estadoCodigo: '000' },
  'Con medida': { estado: 'MEDIDA CAUTELAR', estadoCodigo: '031' },
  Concluido: { estado: 'CONCLUIDO', estadoCodigo: '051' },
};

const estadoDelExpedienteDe = (
  cruda: string,
): { readonly estado: string; readonly estadoCodigo: string } =>
  ESTADO_DEL_EXPEDIENTE_DEL_MOCK[cruda] ?? ESTADO_DEL_EXPEDIENTE_DEL_MOCK['Iniciado']!;

/** El importe de una cifra con otro sumado, sin perder la representacion decimal simple. */
const masImporte = (a: string, b: string): string =>
  (Number(comoImporte(a)) + Number(comoImporte(b))).toFixed(2);

/**
 * Expedientes coactivos (`ExpedienteResource`, #40, RF-100).
 *
 * `ExpedienteResource` **no publica el nombre del contribuyente**, solo su
 * `codContribuyente` — el nombre vive en `ResumenDeContribuyente`, que
 * `ExpedienteController` resuelve aparte y no expone en esta grilla (RF-100). La
 * columna «Contribuyente» del prototipo sale con un codigo, no con el nombre
 * que dibuja la captura: es lo que el recurso real tiene para dar.
 *
 * «Medida cautelar» tampoco esta en `ExpedienteResource` — la medida es del
 * acto que la trabo (`ActoResource.medida`), no del expediente, y esta grilla no
 * trae actuaciones (`valores=[]`, `historial=[]`: «una pagina de veinte no puede
 * costar veinte lecturas de detalle», segun el propio controlador). Sale con
 * `SIN_DATO`.
 */
function expedientesCoactivos(): Paginado {
  return unaPagina(
    filasDe('coactiva_expedientes').map(
      ([numero, , valoresTexto, deudaS, costasS, , estadoCrudo], i) => {
        const { estado, estadoCodigo } = estadoDelExpedienteDe(estadoCrudo ?? '');
        const deuda = comoImporte(deudaS ?? '0.00');
        const costas = comoImporte(costasS ?? '0.00');
        return {
          numero,
          ejercicio: Number((numero ?? '').split('-')[1]) || new Date().getFullYear(),
          correlativo: i + 1,
          codContribuyente: `C-COACT-${String(i + 1).padStart(4, '0')}`,
          ejecutor: 'R. MENDOZA CRUZ',
          auxiliar: null,
          fechaDeApertura: '2026-01-05',
          asunto: null,
          direccionReferencial: null,
          estado,
          estadoCodigo,
          valores: Number(valoresTexto) || 0,
          insoluto: deuda,
          reajuste: '0.00',
          interes: '0.00',
          gastos: '0.00',
          deudaMateriaDeCobranza: deuda,
          costas,
          totalExigible: masImporte(deuda, costas),
          deudaAlDia: EL_DIA_DEL_PROTOTIPO,
          valoresImportados: [],
          historial: [],
        };
      },
    ),
  );
}

/**
 * El seguimiento de un expediente (`ProcesoResource`, #41, RF-101):
 * `{ expediente: ExpedienteResource, actuaciones: ActoResource[] }`.
 *
 * Es un recurso suelto —se abre por su `numero` en la ruta, como una ficha
 * catastral— y no un listado: por eso vive en `SUELTOS` y no en `PAGINADOS`. El
 * proxy no filtra (arriba, en `proxy.ts`): el mismo expediente sale sin
 * importar el numero que se pida, igual que ya hace `vehiculo()` con la placa.
 *
 * `actuaciones` sale vacia: los actos del proceso (REC, embargos, sus
 * diligencias) no tienen fila propia en el prototipo capturado —esta pantalla
 * solo dibuja «Medida cautelar — REC 2» como un formulario suelto, no como una
 * lista de actuaciones—, y un arreglo con un acto inventado seria construir la
 * pantalla contra una respuesta que el proxy no tiene de donde sacar.
 */
function procesoCoactivo(): Readonly<Record<string, unknown>> {
  const campos = RESPUESTAS['proceso_coactivo']?.campos ?? {};
  const valor = (clave: string): string =>
    typeof campos[clave] === 'string' ? (campos[clave] as string) : '';
  const insoluto = comoImporte(valor('insolutoS') || '0.00');
  const reajuste = comoImporte(valor('reajusteS') || '0.00');
  const interes = comoImporte(valor('interesS') || '0.00');
  const gastos = comoImporte(valor('gastosS') || '0.00');
  const materiaDeCobranza = [insoluto, reajuste, interes, gastos].reduce(
    (suma, parte) => masImporte(suma, parte),
    '0.00',
  );

  const expediente = {
    numero: valor('numero') || '0000001201',
    ejercicio: Number(valor('ano')) || new Date().getFullYear(),
    correlativo: 1,
    codContribuyente: valor('contribuyente') || '00000003542',
    // `ejecutor` no es `@Nullable` en `ExpedienteResource`: siempre lleva un
    // valor, aunque sea «no especificado» — el prototipo lo dibuja como una
    // opcion mas del desplegable, no como una ausencia.
    ejecutor: valor('ejecutor') || 'NO ESPECIFICADO',
    auxiliar: valor('auxiliar') || null,
    fechaDeApertura: valor('fechaDeCreacion') || '2022-10-01',
    asunto: valor('asunto') === '.' ? null : valor('asunto') || null,
    direccionReferencial: null,
    estado: 'REC 01 EMITIDO',
    estadoCodigo: '011',
    valores: 1,
    insoluto,
    reajuste,
    interes,
    gastos,
    deudaMateriaDeCobranza: materiaDeCobranza,
    costas: '0.00',
    totalExigible: comoImporte(valor('totalS') || materiaDeCobranza),
    deudaAlDia: valor('proyectadaAl') || EL_DIA_DEL_PROTOTIPO,
    valoresImportados: [],
    historial: [],
  };

  return { expediente, actuaciones: [] };
}

/**
 * Deuda en cobranza coactiva (`DeudaCoactivaResource`, #42, RF-107): la base
 * comun de `coactiva_consulta_deudas` y `coactiva_deudas_beneficio`.
 *
 * **El estado que publica el recurso es uno de los seis del manual**
 * (`EstadoDelExpediente.etiqueta()`); «Fraccionado», que el prototipo dibuja en
 * la primera pantalla, no es ninguno de ellos —`DeudaCoactivaController` lo
 * rechaza explicitamente si se pide como filtro, porque fraccionar mueve la
 * deuda a la fase `CONVENIO` del libro y no el estado del procedimiento— y se
 * traduce aqui al mas cercano, `SUSPENDIDO`, documentandolo en vez de
 * inventar un septimo estado que el backend no tiene.
 */
const ESTADO_DE_DEUDA_DEL_MOCK: Readonly<Record<string, string>> = {
  'REC 01 emitido': 'REC 01 EMITIDO',
  Notificado: 'REC 01 NOTIFICADA',
  'Medida cautelar': 'MEDIDA CAUTELAR',
  Fraccionado: 'SUSPENDIDO',
};

/**
 * Consulta de deudas en coactiva (`coactiva_consulta_deudas`, #42, RF-107).
 *
 * `contribuyente` sale del propio nombre que dibuja el prototipo —esta grilla
 * si lo publica, a diferencia de `expedientesCoactivos()`—, y el estado se
 * traduce con `ESTADO_DE_DEUDA_DEL_MOCK`.
 */
const deudasCoactivas = (): Paginado =>
  unaPagina(
    filasDe('coactiva_consulta_deudas').map(
      ([expediente, ano, contribuyente, tributo, deudaS, costasS, , estadoCrudo], i) => {
        const deuda = comoImporte(deudaS ?? '0.00');
        const costas = comoImporte(costasS ?? '0.00');
        return {
          expediente,
          ano: Number(ano) || new Date().getFullYear(),
          codContribuyente: `C-COACT-${String(i + 1).padStart(4, '0')}`,
          contribuyente,
          tributos: (tributo ?? '')
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t !== ''),
          deudaS: deuda,
          costasS: costas,
          totalS: masImporte(deuda, costas),
          aLaFecha: EL_DIA_DEL_PROTOTIPO,
          estado: ESTADO_DE_DEUDA_DEL_MOCK[estadoCrudo ?? ''] ?? 'INICIADO',
          ultimaActuacion: null,
          beneficios: null,
        };
      },
    ),
  );

/**
 * Deuda acogible a un beneficio, en coactiva (`coactiva_deudas_beneficio`, #42, RF-107).
 *
 * `DeudaCoactivaResource` **no desglosa** insoluto, reajuste ni interes por
 * separado — solo la deuda materia de cobranza, las costas y el total—, asi
 * que las columnas «Insoluto S/» e «Interés S/» del prototipo salen con
 * `SIN_DATO`: desglosarlas aqui seria inventar una particion que el recurso
 * real no tiene. Y **sin ninguna cifra «con beneficio»**, por lo mismo que dice
 * el javadoc de `DeudaCoactivaResource.de(DeudaConBeneficio, ...)`: el efecto
 * de un beneficio sobre el importe es D-02b (#191).
 */
function deudasCoactivasBeneficio(): Paginado {
  return unaPagina(
    filasDe('coactiva_deudas_beneficio').map(([expediente, ano, tributo, , , , totalS], i) => {
      const total = comoImporte(totalS ?? '0.00');
      return {
        expediente,
        ano: Number(ano) || new Date().getFullYear(),
        codContribuyente: `C-COACT-${String(i + 1).padStart(4, '0')}`,
        contribuyente: '',
        tributos: [tributo ?? ''].filter((t) => t !== ''),
        deudaS: total,
        costasS: '0.00',
        totalS: total,
        aLaFecha: EL_DIA_DEL_PROTOTIPO,
        estado: 'INICIADO',
        ultimaActuacion: null,
        beneficios: [],
      };
    }),
  );
}

/* ── Autorizaciones y licencias (#79) ────────────────────────────────────
 * `AnuncioResource`, `LicenciaResource`, `FueResource`, `ReporteDeEdificacionResource`,
 * `CiiuResource`, `CertificadoResource` y `ResumenAnualResource`: la misma regla de siempre, las
 * filas del prototipo con el nombre de campo que declara cada `Resource`. Ningun dato inventado;
 * lo que la fila no distingue —`ejecutor` en el coactivo de arriba, aqui `tipoDeLicencia`,
 * `giroPrincipal`— sale del `campos` de la ficha demo del propio catalogo, reutilizado por fila
 * por la misma razon que ya lo hace `expedientesCoactivos`.
 */

/** `EstadoDeLicencia` (V37): el desplegable del prototipo tiene mas letras que el backend. */
const ESTADO_DE_LICENCIA_DEL_MOCK: Readonly<Record<string, string>> = {
  A: 'VIGENTE',
  P: 'VIGENTE',
  C: 'CANCELADA',
  S: 'CANCELADA',
  X: 'CANCELADA',
};
const estadoDeLicenciaDe = (letra: string): string =>
  ESTADO_DE_LICENCIA_DEL_MOCK[letra] ?? 'VIGENTE';

/** `EstadoDelAnuncio` (V45): el prototipo solo dibuja «A» y variantes en su columna «Est.». */
const ESTADO_DE_ANUNCIO_DEL_MOCK: Readonly<Record<string, string>> = {
  A: 'VIGENTE',
  I: 'CESADO',
  P: 'VIGENTE',
  X: 'CESADO',
};
const estadoDeAnuncioDe = (letra: string): string => ESTADO_DE_ANUNCIO_DEL_MOCK[letra] ?? 'VIGENTE';

/** `EstadoDelFue` (V43): el reporte del prototipo escribe la etiqueta del trámite, no el enum. */
const ESTADO_DEL_FUE_DEL_MOCK: Readonly<Record<string, string>> = {
  Aprobada: 'VIGENTE',
  'Conforme de obra': 'VIGENTE',
  Observada: 'EN_TRAMITE',
  Denegada: 'ANULADA',
};
const estadoDelFueDe = (etiqueta: string): string =>
  ESTADO_DEL_FUE_DEL_MOCK[etiqueta] ?? 'EN_TRAMITE';

/** `RiesgoItse`: «Bajo/Medio/Alto» del prototipo, en mayúsculas como lo publica el backend. */
const riesgoItseDe = (etiqueta: string): string | null =>
  etiqueta === '' ? null : etiqueta.toUpperCase();

/** Anuncio y propaganda (`AnuncioResource`, #51). */
function anuncios(): Paginado {
  const campos = RESPUESTAS['anuncios']?.campos ?? {};
  const claseAnuncio = typeof campos['claseAnuncio'] === 'string' ? campos['claseAnuncio'] : '';
  const tipoAnuncio = typeof campos['tipoAnuncio'] === 'string' ? campos['tipoAnuncio'] : '';
  return unaPagina(
    filasDe('anuncios').map(
      (
        [estadoLetra, nroAutorizacion, nroExpediente, contribuyente, dni, , direccion, tasaS],
        i,
      ) => ({
        nroAutorizacion,
        est: estadoLetra || 'V',
        estado: estadoDeAnuncioDe(estadoLetra ?? ''),
        estadoALaFecha: EL_DIA_DEL_PROTOTIPO,
        contribuyente,
        codContribuyente: `C-ANU-${String(i + 1).padStart(4, '0')}`,
        documentoDelTitular: dni,
        nroLicencia: null,
        claseAnuncio: claseAnuncio.replace(/\s+/g, '_') || 'LETRERO',
        tipoAnuncio: tipoAnuncio.replace(/\s+/g, '_') || 'AVISO_SIMPLE',
        ubicacion: null,
        forma: null,
        denominacion: null,
        direccion,
        area: '0.00',
        nroLados: 1,
        cantidad: 1,
        fecInicio: EL_DIA_DEL_PROTOTIPO,
        fecVenc: null,
        nroDeExpediente: nroExpediente,
        fechaExp: null,
        tasaDevengada: {
          importe: comoImporte(tasaS ?? '0.00'),
          actualizadoA: EL_DIA_DEL_PROTOTIPO,
        },
        historial: [],
      }),
    ),
  );
}

/** Licencia de funcionamiento (`LicenciaResource`, #44). */
function licenciaFuncionamiento(): Paginado {
  const campos = RESPUESTAS['licencia_funcionamiento']?.campos ?? {};
  const tipoDeLicencia =
    typeof campos['tipoDeLicencia'] === 'string' ? campos['tipoDeLicencia'] : 'DEFINITIVA';
  return unaPagina(
    filasDe('licencia_funcionamiento').map(
      (
        [estadoLetra, nroLicencia, contribuyente, nExpediente, denominacionComercial, direccion],
        i,
      ) => ({
        nroLicencia,
        est: estadoLetra || 'A',
        estado: estadoDeLicenciaDe(estadoLetra ?? ''),
        estadoALaFecha: EL_DIA_DEL_PROTOTIPO,
        contribuyente,
        codContribuyente: `C-LIC-${String(i + 1).padStart(4, '0')}`,
        denominacionComercial,
        direccion,
        tipoDeLicencia,
        areaDelEstablecimiento: '0.00',
        zonificacion: null,
        aforo: null,
        fechaDeEmision: EL_DIA_DEL_PROTOTIPO,
        fechaDeVencimiento: null,
        nExpediente,
        fechaDeExpediente: null,
        fichaEconomica: null,
        giros: [],
        historial: [],
        duplicados: [],
      }),
    ),
  );
}

/** Resumen de licencias por año (`ResumenAnualResource`, #54): sin sobre paginado. */
function resumenAnualDeLicencias(): Readonly<Record<string, unknown>> {
  return {
    aLaFecha: EL_DIA_DEL_PROTOTIPO,
    filas: filasDe('licencia_resumen_anual').map(
      ([ano, emitidas, canceladas, duplicados, vigentesAlCierre, derechoS]) => ({
        ano: Number(ano) || new Date().getFullYear(),
        emitidas: Number(comoImporte(emitidas ?? '0')) || 0,
        canceladas: Number(comoImporte(canceladas ?? '0')) || 0,
        duplicados: Number(comoImporte(duplicados ?? '0')) || 0,
        vigentesAlCierre: Number(comoImporte(vigentesAlCierre ?? '0')) || 0,
        derechoDeTramiteS: {
          importe: comoImporte(derechoS ?? '0.00'),
          actualizadoA: EL_DIA_DEL_PROTOTIPO,
        },
        derechoNoDisponible: null,
        alCierre: EL_DIA_DEL_PROTOTIPO,
      }),
    ),
  };
}

/** El formulario único de edificación, solo su grilla (`FueResource`, #48). */
function fueEdificacion(): Paginado {
  const campos = RESPUESTAS['fue_edificacion']?.campos ?? {};
  const solicitantePropietario = campos['solicitante'] === 'PROPIETARIO';
  return unaPagina(
    filasDe('fue_edificacion').map(
      ([
        nroExpediente,
        contribuyente,
        nombreContribuyente,
        tipoTramite,
        nroLicencia,
        modalidadEtiqueta,
      ]) => ({
        nroExpediente,
        fechaDeclaracion: EL_DIA_DEL_PROTOTIPO,
        nroLicencia: nroLicencia === '000000' ? null : nroLicencia,
        est: 'V',
        estado: 'VIGENTE',
        estadoALaFecha: EL_DIA_DEL_PROTOTIPO,
        contribuyente,
        nombreContribuyente,
        tipoTramite: (tipoTramite ?? '').replace(/\s+/g, '_'),
        obra: 'EDIFICACION_NUEVA',
        modalidad: (modalidadEtiqueta ?? '').replace(/^APROBACI[ÓO]N\s+/i, '').charAt(0) || 'A',
        revision: null,
        nroExpedienteAnterior: null,
        solicitanteEsPropietario: solicitantePropietario,
        representanteLegal: null,
        terreno: null,
        proyecto: null,
        valorizacion: [],
        valorDeObra: null,
        valorDeObraNoDisponible: 'D-02a: sin cuadro de valores unitarios sellado (#48)',
        llaveQueFalta: null,
        profesionales: [],
        documentos: [],
        historial: [],
        vigencias: [],
        seccionesFaltantes: [],
        completo: false,
      }),
    ),
  );
}

/** Reporte general de licencias de edificación (`ReporteDeEdificacionResource`, #48). */
function edificacionReporte(): Paginado {
  return unaPagina(
    filasDe('edificacion_reporte').map(
      ([
        nLicencia,
        expediente,
        fecha,
        administrado,
        predio,
        modalidad,
        areaM,
        valorObraS,
        estadoEtiqueta,
      ]) => ({
        nLicencia,
        expediente,
        fecha: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        administrado,
        predio,
        modalidad,
        areaAConstruirM: areaM,
        valorDeObraS: {
          importe: comoImporte(valorObraS ?? '0.00'),
          actualizadoA: EL_DIA_DEL_PROTOTIPO,
        },
        valorDeObraNoDisponible: null,
        estado: estadoDelFueDe(estadoEtiqueta ?? ''),
        estadoALaFecha: EL_DIA_DEL_PROTOTIPO,
      }),
    ),
  );
}

/** Catálogo CIIU de giros (`CiiuResource`, #44). Cientos de filas de verdad; aquí, seis. */
function ciiu(): Paginado {
  return unaPagina(
    filasDe('ciiu').map(
      ([codigo, descripcion, seccion, riesgo, zonificacion, requiereSectorial]) => ({
        codigo,
        descripcion,
        seccion,
        riesgoItse: riesgoItseDe(riesgo ?? ''),
        zonificacionCompatible: zonificacion,
        requiereSectorial: (requiereSectorial ?? '').startsWith('S'),
        extendido: false,
        activo: true,
      }),
    ),
  );
}

/** Certificados de numeración y zonificación (`CertificadoResource`, #54): solo su grilla. */
function certificadosDeNumeracion(): Paginado {
  return unaPagina(
    filasDe('certificados').map(
      ([nCertificado, tipoEtiqueta, predio, solicitante, fecha, derechoS, estado], i) => ({
        nCertificado,
        tipo: (tipoEtiqueta ?? '').replace(/\s+Y\s+/g, '_').replace(/\s+/g, '_'),
        tipoEtiqueta,
        predio,
        direccion: '',
        solicitante,
        codContribuyente: `C-CERT-${String(i + 1).padStart(4, '0')}`,
        fecha: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        vigenciaHasta: EL_DIA_DEL_PROTOTIPO,
        derechoS: { importe: comoImporte(derechoS ?? '0.00'), actualizadoA: EL_DIA_DEL_PROTOTIPO },
        estado: (estado ?? '').toUpperCase(),
        estadoALaFecha: EL_DIA_DEL_PROTOTIPO,
        nExpediente: null,
        documento: nCertificado,
        zonificacion: null,
        alturaMaximaPermitida: null,
        areaLibreMinima: null,
        retiroMunicipal: null,
        coeficienteDeEdificacion: null,
      }),
    ),
  );
}

/* ── Fiscalizacion (#80) ───────────────────────────────────────────────── */

/**
 * `Hallazgo`/`CondicionFiscalizada` del prototipo → el nombre del backend.
 * Las dos comparten vocabulario (`CondicionFiscalizada` javadoc), asi que una
 * sola tabla sirve para `fisc_omisos`.
 */
const CONDICION_FISCALIZADA_DEL_MOCK: Readonly<Record<string, string>> = {
  Conforme: 'CONFORME',
  Omiso: 'OMISO',
  Subvaluador: 'SUBVALUADOR',
  'Uso distinto': 'USO_DISTINTO',
  'No ubicado': 'NO_UBICADO',
};

/**
 * Omisos y subvaluadores (`OmisoResource`, #49, #80).
 *
 * **Las cuatro columnas de importe salen `null`, tal como las publica el
 * recurso real** — `valorCatastralS`, `valorDeclaradoS`, `diferenciaS` e
 * `impuestoOmitidoS` son D-02a (#198) y `OmisoResource.de` nunca les pone
 * cifra, ni siquiera aqui: reescribirlas con las del prototipo inventaria un
 * impuesto omitido que ningun cuadro de valores unitarios sustenta.
 */
const omisosFiscalizacion = (): Paginado =>
  unaPagina(
    filasDe('fisc_omisos').map(([codRefCatastral, titular, condicionCruda]) => ({
      codRefCatastral,
      titular,
      sector: null,
      condicion: CONDICION_FISCALIZADA_DEL_MOCK[condicionCruda ?? ''] ?? 'OMISO',
      declaroFueraDePlazo: false,
      areaCatastral: null,
      areaDeclarada: null,
      diferenciaDeArea: null,
      valorCatastralS: null,
      valorDeclaradoS: null,
      diferenciaS: null,
      impuestoOmitidoS: null,
    })),
  );

/**
 * Estado de cuenta de fiscalizacion (`EstadoDeCuentaResource`, #49, #80).
 *
 * **Ninguna linea trae `importe`**: `EstadoDeCuentaDeFiscalizacion` lo lee del
 * libro de cuenta corriente, y una liquidacion de fiscalizacion solo llega ahi
 * por transferencia (#52) — mientras nadie transfiera, no hay asiento que
 * leer, y el recurso real sale igual de vacio. `total` sale `null` por la
 * misma razon: `EstadoDeCuentaResource` lo deja `null` si **cualquier** linea
 * no tiene cifra, y aqui ninguna la tiene.
 */
const estadoCuentaFiscalizacion = (): Readonly<Record<string, unknown>> => {
  const campos = RESPUESTAS['fisc_estado_cuenta']?.campos ?? {};
  const codigo = typeof campos['contribuyente'] === 'string' ? campos['contribuyente'] : '';
  const fecha =
    typeof campos['fechaDeConsulta'] === 'string'
      ? campos['fechaDeConsulta']
      : EL_DIA_DEL_PROTOTIPO;

  return {
    codContribuyente: codigo,
    fechaDeConsulta: fecha,
    lineas: filasDe('fisc_estado_cuenta').map(([deuda, , ano, , , , , nomTrib, , , estad]) => ({
      deuda,
      ano: Number(ano) || new Date().getFullYear(),
      nomTrib,
      unidad: null,
      estad,
      importe: null,
    })),
    total: null,
  };
};

/**
 * `EstadoDeLiquidacion` (V39) → el codigo de una sola letra que dibuja
 * `fisc_historico`: «A» abierta, «L» liquidada. El prototipo no capturo
 * «EN PROCESO», «NOTIFICADA» ni «ANULADA» en ninguna fila de su muestra.
 */
const ESTADO_DE_LIQUIDACION_DEL_MOCK: Readonly<Record<string, string>> = {
  A: 'ABIERTA',
  L: 'LIQUIDADA',
};

/**
 * Historico de fiscalizacion predial (`LiquidacionResource.VersionResource`,
 * #49, #80).
 *
 * `LiquidacionController.historico` responde el proceso completo de un acta
 * cuando se pide `nLiquidacion`, y la grilla paginada de versiones sueltas
 * cuando no — el proxy no filtra (#80, mismo criterio que el resto de este
 * archivo), asi que devuelve siempre la segunda forma: cada fila **es** una
 * `VersionResource`, con `cambios`/`importesSinCifra` vacios, que es
 * exactamente lo que sirve `LiquidacionController.historico` sin numero
 * («cada fila es una version suelta»).
 *
 * **`numero` no viaja en la fila del prototipo** —su columna es «—»—, asi que
 * se compone con el codigo de contribuyente, igual que `procesoCoactivo` cae
 * a un numero fijo cuando el campo que lo trae esta vacio. Las cifras de la
 * liquidacion —`insolutoOmitido`, `multaTributaria`— son D-02a: `null`, con
 * `esperaSusCifras: true`.
 */
const historicoFiscalizacion = (): Paginado => {
  const campos = RESPUESTAS['fisc_historico']?.campos ?? {};
  const desde = Number(campos['periodoFiscalizadoDesde']) || new Date().getFullYear();
  const hasta = Number(campos['periodoFiscalizadoHasta']) || desde;
  const tipo =
    typeof campos['tipoDeFiscalizacion'] === 'string' ? campos['tipoDeFiscalizacion'] : 'CIERTA';

  return unaPagina(
    filasDe('fisc_historico').map(([estCrudo, codCont, contribuyente, , , versionTexto], i) => {
      const version = Number(versionTexto) || 1;
      const liquidacion = {
        numero: `LIQ-${codCont}`,
        actaId: i + 1,
        version,
        liquidacionAnterior: version > 1 ? i : null,
        periodoDesde: desde,
        periodoHasta: hasta,
        tipoDeFiscalizacion: tipo.replace(' ', '_'),
        motivoDeterminante: `Fiscalización de ${contribuyente}`,
        fecha: EL_DIA_DEL_PROTOTIPO,
        numeroNotificacion: null,
        estado: ESTADO_DE_LIQUIDACION_DEL_MOCK[estCrudo ?? ''] ?? 'ABIERTA',
        esperaSusCifras: true,
        lineas: [],
        historial: [],
      };
      return { version: liquidacion, cambios: [], importesSinCifra: [] };
    }),
  );
};

/**
 * Resolucion de determinacion de fiscalizacion (`ResolucionResource`, #52,
 * #80): un recurso suelto, abierto por `{numero}` en la ruta — el mismo
 * mecanismo que `duplicado_recibo` (#74).
 *
 * **`determinado`, `declarado` y `diferencia` salen `null`**, igual que
 * `insolutoOmitido`/`baseHallada`/`baseDeclarada` en `LiquidacionResource`: son
 * D-02a. `multa` tampoco tiene cifra, y no tiene columna en el catalogo donde
 * ir — la pantalla dibuja «Interés S/», que `LineaDeterminadaResource` no
 * publica en absoluto (no distingue interes de multa), asi que esa columna
 * sale `SIN_DATO` desde el adaptador, no desde aqui.
 */
const resolucionDeterminacionFiscalizacion = (): Readonly<Record<string, unknown>> => {
  const reporte = RESPUESTAS['resolucion_determinacion_fisc']?.reporte;
  const meta = new Map((reporte?.meta ?? []).map((dato) => [dato.k, dato.v]));
  const [ejercicioDesde, ejercicioHasta] = (meta.get('Periodo fiscalizado') ?? '').split('—');

  return {
    numero: meta.get('Nº de resolución') ?? reporte?.code ?? '',
    fecha: EL_DIA_DEL_PROTOTIPO,
    aLaFecha: EL_DIA_DEL_PROTOTIPO,
    nLiquidacion: `LIQ-${meta.get('R.U.C.') ?? ''}`,
    versionDeLaLiquidacion: 1,
    periodoDesde: Number((ejercicioDesde ?? '').trim()) || new Date().getFullYear(),
    periodoHasta: Number((ejercicioHasta ?? '').trim()) || new Date().getFullYear(),
    codContribuyente: meta.get('R.U.C.') ?? null,
    contribuyente: meta.get('Contribuyente') ?? null,
    predioId: null,
    vehiculoId: null,
    documentoSustento: meta.get('Predio') ?? '',
    sustento: 'Acta de inspección y liquidación de fiscalización predial.',
    baseLegal: 'Art. 76 y 77 del Texto Único Ordenado del Código Tributario.',
    fichaAnteriorId: null,
    fichaNuevaId: null,
    usuarioRegistro: null,
    observacion: 'Transferencia del resultado de fiscalización al padrón.',
    lineas: (reporte?.filas ?? []).map(([ejercicio]) => ({
      ejercicio: Number(ejercicio) || new Date().getFullYear(),
      determinado: null,
      declarado: null,
      diferencia: null,
      multa: null,
      total: null,
      condicion: 'SUBVALUADOR',
      areaDeclarada: null,
      areaHallada: null,
    })),
    cargosAsentados: null,
  };
};

const SUELTOS: Readonly<Record<string, () => Readonly<Record<string, unknown>>>> = {
  '/catastro/fichas/urbana/{codRefCatastral}': urbana,
  '/catastro/fichas/economica/{codRefCatastral}': economica,
  '/catastro/fichas/bienes-comunes/{codEdificacion}': bienesComunes,
  '/catastro/fichas/rural/{codUnidad}': rural,
  '/rentas/vehiculos/{placa}': vehiculo,
  '/rentas/declaraciones/{djNro}': declaracionJurada,
  '/tesoreria/recibos/{nro}/duplicado': duplicadoRecibo,
  '/tesoreria/recaudacion/avance': avanceRecaudacion,
  '/tesoreria/recaudacion/por-area': recaudacionPorArea,
  '/consultas/constancias/no-adeudo': constanciaDeNoAdeudo,
  '/consultas/unificada': consultaUnificada,
  '/portal/situacion': situacionDelCiudadano,
  '/consultas/deudas-con-beneficio': deudasConBeneficio,
  '/seguridad/sesion/permisos': permisosDeLaSesion,
  '/coactiva/expedientes/{numero}/proceso': procesoCoactivo,
  '/fiscalizacion/estado-cuenta': estadoCuentaFiscalizacion,
  '/fiscalizacion/resoluciones/{numero}': resolucionDeterminacionFiscalizacion,
  '/licencias/funcionamiento/reportes/resumen-anual': resumenAnualDeLicencias,
  '/infracciones/administrativas/reportes/resumen-recaudacion': resumenRecaudacionAdministrativa,
  '/transito/papeletas/{numero}/actos': expedienteDeLaPapeleta,
  '/transito/reportes/resumen-por-codigo': resumenPorCodigoDeTransito,
  '/transito/reportes/resumen-por-placa': resumenPorPlacaDeTransito,
};

/* ── Una funcion por recurso, con los campos que declara su `Resource` ──── */

/**
 * El catalogo vial (`ViaResource`, #16).
 *
 * El prototipo dibuja siete columnas y el recurso publica cuatro de ellas: no
 * trae sector, zona de arancel ni el arancel por metro cuadrado. Aqui no se
 * rellenan —el `Resource` manda—, y la pantalla los ensena con «—».
 */
const vias = (): Paginado =>
  unaPagina(
    filasDe('calles').map(([codigo, tipo, nombre, , , , estado], i) => ({
      id: i + 1,
      codigo,
      tipo,
      nombre,
      ubigeo: null,
      activa: activo(estado),
    })),
  );

const modulos = (): Paginado =>
  unaPagina(
    filasDe('modulos').map(([codigo, , nombre, estado], i) => ({
      id: i + 1,
      codigo,
      nombre,
      orden: i + 1,
      activo: activo(estado),
    })),
  );

const accesos = (): Paginado =>
  unaPagina(
    filasDe('accesos').map(([codigo, tipo, nombre, , , estado], i) => ({
      id: i + 1,
      moduloId: 1,
      tipo,
      codigo,
      nombre,
      activo: activo(estado),
    })),
  );

const grupos = (): Paginado =>
  unaPagina(
    filasDe('grupos').map(([nombre, descripcion, , , estado], i) => ({
      id: i + 1,
      nombre,
      descripcion,
      habilitado: activo(estado),
      vigenciaDesde: null,
      vigenciaHasta: null,
    })),
  );

const usuarios = (): Paginado =>
  unaPagina(
    filasDe('usuarios').map(([cuenta, nombre, , , , , estado], i) => ({
      id: i + 1,
      cuenta,
      nombre,
      correo: null,
      habilitado: activo(estado),
      vigenciaDesde: null,
      vigenciaHasta: null,
    })),
  );

const auditoria = (): Paginado =>
  unaPagina(
    filasDe('auditoria').map(([fecha, usuario, tabla, operacion, clave, desde], i) => {
      const { equipo, ip } = origen(desde);
      return {
        id: i + 1,
        ejercicio: 2026,
        tabla,
        clave,
        operacion,
        usuario,
        origenEquipo: equipo,
        origenIp: ip,
        fecha: instante(fecha),
        observacion: '',
        datosAnteriores: null,
        datosNuevos: null,
      };
    }),
  );

/**
 * Los conjuntos de parametros por ejercicio.
 *
 * Esta pantalla del prototipo no trae tabla —dibuja campos—, asi que el
 * ejercicio vigente sale de sus propios campos. Es un solo conjunto: los
 * anteriores los tendra el backend, que es quien los guarda.
 */
const parametros = (): Paginado => {
  const campos = RESPUESTAS['parametros']?.campos ?? {};
  const vigente = campos['ejercicioVigente'];
  const ejercicio = typeof vigente === 'string' ? Number(vigente) : new Date().getFullYear();
  return unaPagina([
    {
      id: 1,
      ejercicio,
      version: 1,
      estado: 'SELLADO',
      fechaSellado: null,
      usuarioSellado: null,
    },
  ]);
};

/**
 * El historico de respaldos (RF-126, #70). Su verbo es `POST` —lo fija el
 * contrato del prototipo— pero solo consulta: `respaldo()` la publica junto
 * a las demas lecturas por la misma razon que `paginadoDe` la deja pasar.
 */
const respaldo = (): Paginado =>
  unaPagina([
    {
      id: 1,
      inicio: '2026-08-23T02:00:00Z',
      fin: '2026-08-23T02:04:12Z',
      resultado: 'EXITOSO',
      destino: 's3://sgtm-respaldos/2026-08-23.tar.gz.age',
      tamanoBytes: 187_342_211,
      detalle: null,
    },
    {
      id: 2,
      inicio: '2026-08-10T02:00:00Z',
      fin: '2026-08-10T02:01:03Z',
      resultado: 'FALLIDO',
      destino: 's3://sgtm-respaldos/2026-08-10.tar.gz.age',
      tamanoBytes: null,
      detalle: 'Sin espacio en el servidor de destino.',
    },
  ]);

/* ── Tesoreria: convenios, recibos y recaudacion ──────────────────────────── */

/**
 * Convenios de fraccionamiento, listado (`ConvenioResource.FilaResource`,
 * #35, #74).
 *
 * Las claves del prototipo ya coinciden letra por letra con los campos del
 * recurso real —`nroConvenio`, `contribuyente`, `fecha`, `deudaAcogidaS`,
 * `cuotas`, `pagadas`, `vencidas`, `saldoS`, `estado`—, asi que aqui no se
 * reescribe ninguna: se copian con el nombre que publica el backend.
 * `fechaCorte` no la dibuja el prototipo por separado: se repite la de
 * suscripcion, que es lo unico que hay. `motivo`, `cronograma`,
 * `deudaOriginal` y `movimientos` son el detalle de **un** convenio abierto
 * (`GET .../convenios?nroDeConvenio=...`, cuando la pagina trae una sola
 * fila): la lista los deja `null`, sin inventar ninguno.
 */
const convenios = (): Paginado =>
  unaPagina(
    filasDe('consulta_convenios').map(
      ([numero, contribuyente, suscrito, acogida, cuotas, pagadas, vencidas, saldo, estado]) => {
        const fecha = fechaDe(suscrito ?? '') ?? EL_DIA_DEL_PROTOTIPO;
        return {
          nroConvenio: numero,
          contribuyente,
          fecha,
          fechaCorte: fecha,
          deudaAcogidaS: comoImporte(acogida ?? '0.00'),
          cuotas: Number(cuotas) || 0,
          pagadas: Number(pagadas) || 0,
          vencidas: Number(vencidas) || 0,
          saldoS: comoImporte(saldo ?? '0.00'),
          saldoALaFecha: EL_DIA_DEL_PROTOTIPO,
          estado: (estado ?? '').toUpperCase(),
          motivo: null,
          cronograma: null,
          deudaOriginal: null,
          movimientos: null,
        };
      },
    ),
  );

/**
 * La vista previa de un recibo (`DuplicadoResource`, #34, #74).
 *
 * `GET .../recibos/{nro}/duplicado` trae **uno**, igual que `vehiculo()` y
 * `declaracionJurada()`: se sirve la primera fila de «Recibos localizados»
 * del prototipo con esa forma. El recurso real no publica el nombre del
 * contribuyente en `ReciboResource` —ni en ningun otro sitio de este
 * endpoint—, asi que la columna «Contribuyente» del prototipo no tiene con
 * que llenarse y no se inventa.
 */
function duplicadoRecibo(): Readonly<Record<string, unknown>> {
  const [fila] = RESPUESTAS['duplicado_recibo']?.tabla?.filas ?? [];
  const [numero, fecha, hora, , concepto, importeS, duplicados, estado] = (fila ?? []).map(
    (c) => c.texto,
  );
  const fechaIso = fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO;
  const horaIso = hora && hora !== '—' ? hora : '00:00';
  const total = comoImporte(importeS ?? '0.00');
  const [serie = '001', correlativoTexto = '1'] = (numero ?? '001-0000001').split('-');
  const correlativo = Number(correlativoTexto) || 1;
  const anulado = (estado ?? '').toUpperCase() === 'ANULADO';
  const importe = (valor: string) => ({ importe: valor, actualizadoA: fechaIso });
  return {
    estado: anulado ? 'ANULADO' : 'EMITIDO',
    duplicados: Number(duplicados) || 0,
    anulacion: anulado
      ? { fecha: fechaIso, motivo: 'Anulación registrada en ventanilla', usuario: null }
      : null,
    recibo: {
      numero: numero || `${serie}-${String(correlativo).padStart(7, '0')}`,
      serie,
      correlativo,
      cajero: 'admin',
      formaDePago: 'EFECTIVO',
      tipoDePago: 'NORMAL_TRIBUTARIO',
      beneficioDeclarado: null,
      emitidoEn: `${fechaIso}T${horaIso}:00Z`,
      total: importe(total),
      lineas: [
        {
          tributo: concepto || 'IMPUESTO PREDIAL',
          concepto: 'PAGO',
          ejercicio: null,
          predioId: null,
          vehiculoId: null,
          cantidad: null,
          precioUnitario: null,
          insoluto: importe(total),
          reajuste: importe('0.00'),
          interes: importe('0.00'),
          gasto: importe('0.00'),
          monto: importe(total),
        },
      ],
    },
  };
}

/**
 * El avance de recaudacion por tributo (`RecaudacionResource.Avance`, #36, #74).
 *
 * **Sin «Emitido», «Saldo», «% avance», «Meta» ni «% de meta»**: son las
 * columnas que dibuja el prototipo y que `RecaudacionController` no publica
 * —la meta no tiene tabla, y lo emitido son cargos del libro, que este
 * contexto no lee (javadoc de `RecaudacionResource.Avance`)—. Inventar un
 * numero ahi seria mostrar un avance que nadie calculo. Lo unico que el
 * recurso real trae por fila es `cobrado`/`anulado`/`neto`: el prototipo solo
 * distingue un importe, «Recaudado S/», que es el que mas se parece a `neto`
 * —lo que de verdad entro—; sin dato de anulaciones en el prototipo, se
 * publica en cero y no se inventa un reparto.
 */
function avanceRecaudacion(): Readonly<Record<string, unknown>> {
  const filas = filasDe('avance_recaudacion').map(([tributo, , recaudadoS]) => {
    const neto = comoImporte(recaudadoS ?? '0.00');
    return { tributo, cobrado: neto, anulado: '0.00', neto };
  });
  const totalNeto = sumaDeImportes(filas.map((f) => f.neto));
  const aLaFecha = EL_DIA_DEL_PROTOTIPO;
  const importe = (valor: string) => ({ importe: valor, actualizadoA: aLaFecha });
  return {
    desde: `${aLaFecha.slice(0, 4)}-01-01`,
    hasta: aLaFecha,
    aLaFecha,
    filas: filas.map((f) => ({
      tributo: f.tributo,
      cobrado: importe(f.cobrado),
      anulado: importe(f.anulado),
      neto: importe(f.neto),
    })),
    cobrado: importe(totalNeto),
    anulado: importe('0.00'),
    neto: importe(totalNeto),
    turno: null,
  };
}

/**
 * La recaudacion por area generadora y partida (`RecaudacionResource.Distribucion`,
 * #36, #74).
 *
 * El prototipo dibuja «Partida», «Descripción» y «Monto S/» —una fila por
 * partida, sin la unidad organica ni el tributo aparte—, y el recurso real
 * agrupa por (area, partida, tributo). Sin esos dos datos por separado en el
 * prototipo, `area` y `areaNombre` salen nulos —lo mismo que publica el
 * recurso para la parte tributaria, que no tiene area (javadoc de
 * `RecaudacionResource.FilaDePartida`)— y `tributo` se llena con la
 * descripcion de la partida, que es lo unico que la fila trae para nombrarla.
 */
function recaudacionPorArea(): Readonly<Record<string, unknown>> {
  const aLaFecha = EL_DIA_DEL_PROTOTIPO;
  const importe = (valor: string) => ({ importe: valor, actualizadoA: aLaFecha });
  const filas = filasDe('recaudacion_area').map(([partida, descripcion, montoS]) => {
    const monto = comoImporte(montoS ?? '0.00');
    return {
      area: null,
      // `FilaDePartida.areaNombre` es el unico texto explicativo que el
      // recurso trae para esta fila (javadoc del backend): se llena con la
      // «Descripción» del prototipo, que es la partida en prosa.
      // Nulo a proposito: el backend documenta que `areaNombre` sale nulo en lo
      // tributario, y un nombre inventado —reusar la descripcion de la partida—
      // se copia a un reporte presupuestal sin que nadie lo note.
      areaNombre: null,
      partida: partida && partida !== '—' ? partida : null,
      tributo: descripcion || 'SIN PARTIDA',
      cobrado: importe(monto),
      anulado: importe('0.00'),
      neto: importe(monto),
    };
  });
  const totalNeto = sumaDeImportes(filas.map((f) => f.neto.importe));
  return {
    desde: `${aLaFecha.slice(0, 4)}-01-01`,
    hasta: aLaFecha,
    aLaFecha,
    filas,
    neto: importe(totalNeto),
    netoSinPartida: importe('0.00'),
  };
}

/** Suma exacta de importes en texto plano, sin pasar por coma flotante (regla 1). */
function sumaDeImportes(valores: readonly string[]): string {
  let centavos = 0n;
  for (const valor of valores) {
    const [entero = '0', decimal = '00'] = valor.split('.');
    const signo = entero.startsWith('-') ? -1n : 1n;
    const enteroAbs = entero.replace('-', '') || '0';
    centavos += signo * (BigInt(enteroAbs) * 100n + BigInt(decimal.padEnd(2, '0').slice(0, 2)));
  }
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const texto = absoluto.toString().padStart(3, '0');
  const resultado = `${texto.slice(0, -2)}.${texto.slice(-2)}`;
  return negativo ? `-${resultado}` : resultado;
}

/* ── Papeletas: transito e infracciones administrativas ──────────────────── */

/**
 * Como escribe el prototipo el estado de una papeleta de transito, frente al
 * `enum EstadoDePapeleta` (V4) que `PapeletaResource.estado` publica de
 * verdad: `IMPUESTA`, `NOTIFICADA`, `RESUELTA`, `PAGADA`, `COACTIVA`,
 * `ANULADA`, `PRESCRITA`. «Pendiente», «Con descargo» y compania son
 * etiquetas del catalogo del prototipo, no del enum (#363).
 */
const ESTADO_DE_PAPELETA_DEL_MOCK: Readonly<Record<string, string>> = {
  Pendiente: 'IMPUESTA',
  'Con descargo': 'RESUELTA',
  Pagada: 'PAGADA',
  Coactiva: 'COACTIVA',
  Cancelada: 'PAGADA',
  'A cuenta': 'IMPUESTA',
};

/**
 * Papeletas de infraccion de transito (`PapeletaResource`, familia
 * `TRANSITO`, #46, #363).
 *
 * El recurso real no publica ni el nombre del infractor —solo `infractorId`—
 * ni el codigo de infraccion ni una gravedad: son columnas que el prototipo
 * dibuja y `Papeleta` no modela. Aqui tampoco se inventan; lo que se llena
 * son exactamente los campos que el `Resource` tiene, con el mismo valor que
 * ya dibuja el catalogo portado.
 */
/**
 * El porcentaje UIT de cada codigo del CUIS de transito, leido de la tabla que
 * el propio prototipo publica («M-02 · 10 % · 535.00»): permite que el
 * desglose guardado de cada papeleta VARIE con su codigo en vez de repetir
 * una cifra unica e identica por fila —el patron fantasma que la validacion
 * de #379 cazo con `areaNombre` y la de #389 volvio a cazar aqui—. El codigo
 * que no este en la tabla cae al 10 % del propio prototipo, dicho aqui y no
 * escondido fila a fila.
 */
const PORCENTAJE_DEL_CUIS: Readonly<Record<string, string>> = Object.fromEntries(
  filasDe('codigos_transito').map(([codigo, , , uit]) => [
    codigo ?? '',
    (Number((uit ?? '').replace('%', '').trim()) / 100).toFixed(2),
  ]),
);
const porcentajeDelCodigo = (codigo: string | undefined): string =>
  PORCENTAJE_DEL_CUIS[codigo ?? ''] ?? '0.10';
/** La base que el propio prototipo implica: su CUIS empareja 10 % con 535.00. */
const BASE_DEL_PROTOTIPO = '5350.00';

const papeletasTransito = (): Paginado =>
  unaPagina(
    filasDe('papeletas').map(([numero, fecha, placa, , codigo, , multaS, estado], i) => ({
      id: i + 1,
      familia: 'TRANSITO',
      numero,
      fechaInfraccion: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
      horaInfraccion: null,
      lugar: 'VÍA PÚBLICA',
      placa,
      vehiculoId: i + 1,
      infractorId: i + 1,
      propietarioId: null,
      contribuyenteId: null,
      predioId: null,
      notificacionPreviaId: null,
      baseImponible: BASE_DEL_PROTOTIPO,
      porcentajeInfraccion: porcentajeDelCodigo(codigo),
      importeInfraccion: comoImporte(multaS ?? '0.00'),
      porcentajeACobrar: porcentajeDelCodigo(codigo),
      importeAPagar: comoImporte(multaS ?? '0.00'),
      importeConBeneficio: null,
      estado: ESTADO_DE_PAPELETA_DEL_MOCK[estado ?? ''] ?? 'IMPUESTA',
      usuarioRegistro: 'admin',
    })),
  );

/**
 * Estado de cuenta de papeleta administrativa (`PapeletaResource`, familia
 * `ADMINISTRATIVA`, #47, #363).
 *
 * `EstadoDeCuentaAdministrativoController` sirve el mismo `PapeletaResource`
 * que `papeletasTransito`, no una fila por concepto de la deuda: el
 * prototipo dibuja «Concepto» y «Beneficio por pronto pago» como si fueran
 * dos lineas de un desglose, y el recurso real es una fila por papeleta. Se
 * toma la unica papeleta que el prototipo nombra (`campos.papeleta`), con
 * `importeAPagar` leido de la primera fila del prototipo — la segunda, el
 * descuento, no tiene con que llenar `importeConBeneficio` sin inventar un
 * porcentaje que el prototipo no publica como dato aparte, asi que se deja
 * `null`.
 */
const adminEstadoCuenta = (): Paginado => {
  const campos = RESPUESTAS['adm_estado_cuenta']?.campos ?? {};
  const numero = typeof campos['papeleta'] === 'string' ? campos['papeleta'] : 'P-000000';
  const [primera] = RESPUESTAS['adm_estado_cuenta']?.tabla?.filas ?? [];
  const fecha = primera?.[2]?.texto ?? '';
  const insoluto = primera?.[3]?.texto ?? '0.00';
  return unaPagina([
    {
      id: 1,
      familia: 'ADMINISTRATIVA',
      numero,
      fechaInfraccion: fechaDe(fecha) ?? EL_DIA_DEL_PROTOTIPO,
      horaInfraccion: null,
      lugar: 'INSPECCIÓN MUNICIPAL',
      placa: null,
      vehiculoId: null,
      infractorId: null,
      propietarioId: null,
      contribuyenteId: 1,
      predioId: null,
      notificacionPreviaId: null,
      baseImponible: '5350.00',
      porcentajeInfraccion: '0.50',
      importeInfraccion: comoImporte(insoluto),
      porcentajeACobrar: '0.50',
      importeAPagar: comoImporte(insoluto),
      importeConBeneficio: null,
      estado: 'IMPUESTA',
      usuarioRegistro: 'admin',
    },
  ]);
};

/**
 * Búsqueda avanzada de papeletas (`transito_busqueda`, `PapeletaResource`, #77).
 *
 * La fila del prototipo trae doce columnas y solo cinco tienen con qué
 * llenar `PapeletaResource`: «Serie»+«Número» componen el número del acta,
 * «Placa», «Fecha» y las dos columnas de importe. Las otras siete —A.Coa,
 * Coact, Fec. Reg., Deuda, Infracción, Conductor— son las que
 * `BusquedaDePapeletasControllerTest` no publica, y por eso el adaptador de
 * `pantallas/transito/index.ts` las dibuja con `SIN_DATO`: aquí tampoco se
 * inventan.
 */
const papeletasDeBusqueda = (): Paginado =>
  unaPagina(
    filasDe('transito_busqueda').map(
      ([, , , , serie, numero, placa, fecha, , , importe, aPagar], i) => ({
        id: i + 1,
        familia: 'TRANSITO',
        numero: `${serie ?? ''}${numero ?? ''}`,
        fechaInfraccion: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        horaInfraccion: null,
        lugar: 'VÍA PÚBLICA',
        placa,
        vehiculoId: i + 1,
        infractorId: i + 1,
        propietarioId: null,
        contribuyenteId: null,
        predioId: null,
        notificacionPreviaId: null,
        baseImponible: BASE_DEL_PROTOTIPO,
        // La tabla de busqueda del prototipo no publica el codigo de
        // infraccion: no hay con que variar el porcentaje, y se dice aqui.
        porcentajeInfraccion: porcentajeDelCodigo(undefined),
        importeInfraccion: comoImporte(importe ?? '0.00'),
        porcentajeACobrar: porcentajeDelCodigo(undefined),
        importeAPagar: comoImporte(aPagar ?? importe ?? '0.00'),
        importeConBeneficio: null,
        estado: 'IMPUESTA',
        usuarioRegistro: 'admin',
      }),
    ),
  );

/**
 * Estado de cuenta de infracciones (`transito_estado_cuenta`,
 * `PapeletaResource`, #77): la misma tabla de `papeletas`, ya siempre
 * pendiente —es lo que `EstadoDeCuentaTransitoController` garantiza con su
 * propio criterio (`soloPendientes()`)—.
 */
const estadoDeCuentaDeTransito = (): Paginado =>
  unaPagina(
    filasDe('papeletas').map(([numero, fecha, placa, , codigo, , multaS, estado], i) => ({
      id: i + 1,
      familia: 'TRANSITO',
      numero,
      fechaInfraccion: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
      horaInfraccion: null,
      lugar: 'VÍA PÚBLICA',
      placa,
      vehiculoId: i + 1,
      infractorId: i + 1,
      propietarioId: null,
      contribuyenteId: null,
      predioId: null,
      notificacionPreviaId: null,
      baseImponible: BASE_DEL_PROTOTIPO,
      porcentajeInfraccion: porcentajeDelCodigo(codigo),
      importeInfraccion: comoImporte(multaS ?? '0.00'),
      porcentajeACobrar: porcentajeDelCodigo(codigo),
      importeAPagar: comoImporte(multaS ?? '0.00'),
      importeConBeneficio: comoImporte(multaS ?? '0.00'),
      estado: ESTADO_DE_PAPELETA_DEL_MOCK[estado ?? ''] ?? 'IMPUESTA',
      usuarioRegistro: 'admin',
    })),
  );

/**
 * Tabla de códigos de infracción de tránsito (`codigos_transito`,
 * `CodigoInfraccionResource`, #43, #77).
 *
 * «Gravedad» y «Multa S/» del prototipo no tienen columna en el recurso real
 * —ver el docblock de `pantallas/transito/index.ts`—, así que no se leen de
 * la fila aunque estén ahí: se ignoran, igual que hace el adaptador.
 */
const codigosDeTransito = (): Paginado =>
  unaPagina(
    filasDe('codigos_transito').map(([codigo, descripcion, , uit, , puntos, medida], i) => ({
      id: i + 1,
      familia: 'TRANSITO',
      codigo,
      descripcion,
      porcentajeUit: (Number((uit ?? '0 %').replace('%', '').trim()) / 100).toFixed(2),
      medida: medida && medida !== '—' ? medida : null,
      puntos: Number(puntos) || 0,
      baseLegal: 'Reglamento Nacional de Tránsito, D.S. N.° 016-2009-MTC',
      vigenciaDesde: '2026-01-01',
      vigenciaHasta: null,
    })),
  );

/**
 * Internamiento vehicular (`internamiento`, `InternamientoResource`, #50, #77).
 *
 * «Tasa diaria S/» y «Custodia S/» del prototipo no se leen: el recurso real
 * no las publica —son de la ordenanza y de la caja, según el propio
 * `InternamientosController`—.
 */
const internamientos = (): Paginado =>
  unaPagina(
    filasDe('internamiento').map(([placa, papeleta, fechaDeIngreso, dias, , , estado], i) => ({
      id: i + 1,
      placa,
      papeleta,
      deposito: 'DEPÓSITO MUNICIPAL CENTRAL',
      fechaDeIngreso: fechaDe(fechaDeIngreso ?? '') ?? EL_DIA_DEL_PROTOTIPO,
      fechaDeSalida: null,
      dias: Number(dias) || 0,
      calculadoA: EL_DIA_DEL_PROTOTIPO,
      estado: (estado ?? '').toUpperCase() === 'INTERNADO' ? 'INTERNADO' : 'EN_ABANDONO',
      tasaDeCustodia: 'TC-01',
      acta: `ACTA-INT-${String(i + 1).padStart(4, '0')}`,
    })),
  );

/**
 * El expediente de una papeleta (`transito_documentos`, `ExpedienteResource`,
 * #50, #77): un recurso suelto, se abre por el número en la ruta —el proxy no
 * filtra, igual que `procesoCoactivo()`—.
 *
 * `descargos` y `actos` salen vacíos: son las dos secciones que el catálogo
 * ni siquiera declara con datos editables (ver `pantallas/transito/index.ts`),
 * y un arreglo con un acto inventado construiría la pantalla contra una
 * respuesta que el prototipo capturado no tiene de dónde sacar.
 */
function expedienteDeLaPapeleta(): Readonly<Record<string, unknown>> {
  const campos = RESPUESTAS['transito_documentos']?.campos ?? {};
  const valor = (clave: string): string =>
    typeof campos[clave] === 'string' ? (campos[clave] as string) : '';
  return {
    papeleta: valor('papeletaN2') || valor('papeletaN') || 'C2007005161',
    familia: 'TRANSITO',
    estado: 'NOTIFICADA',
    descargos: [],
    actos: [],
  };
}

/**
 * Padrón de papeletas de tránsito (`transito_padron`,
 * `PapeletaDelPadronResource`, #53, #77).
 *
 * «Importe S/» del catálogo no tiene con qué llenarse —el recurso solo
 * publica el importe **a pagar**, no un importe base distinto—, así que la
 * fila del prototipo se lee saltándose esa columna, igual que el adaptador.
 */
const padronDeTransito = (): Paginado =>
  unaPagina(
    filasDe('transito_padron').map(
      ([numero, fecha, placa, conductor, infraccion, , aPagar, estado], i) => ({
        numero,
        familia: 'TRANSITO',
        fechaInfraccion: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        horaInfraccion: null,
        lugar: 'VÍA PÚBLICA',
        placa,
        licenciaConducir: null,
        codigoInfraccion: infraccion ?? '',
        descripcionInfraccion: infraccion ?? '',
        obligadoCodigo: null,
        obligadoNombre: conductor ?? null,
        infractorNombre: conductor ?? null,
        estado: ESTADO_DE_PAPELETA_DEL_MOCK[estado ?? ''] ?? 'IMPUESTA',
        pendiente: (estado ?? '').toLowerCase() === 'pendiente',
        importeAPagar: comoImporte(aPagar ?? '0.00'),
        actualizadoA: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        valorNumero: null,
        id: i + 1,
      }),
    ),
  );

/**
 * Padrón de papeletas enviadas a coactiva (`transito_padron_coactiva`,
 * `PapeletaDelPadronResource`, #53, #77).
 *
 * `estado` sale siempre `COACTIVA`: toda fila de este padrón, por definición
 * de `PadronesDeTransitoController#padronCoactiva`, ya tiene resolución de
 * multa emitida. «Expediente» y «Fec. pase» del prototipo no se leen —ver el
 * docblock del adaptador—.
 */
const padronCoactivaDeTransito = (): Paginado =>
  unaPagina(
    filasDe('transito_padron_coactiva').map(([, papeleta, , placa, obligado, deuda], i) => ({
      numero: papeleta,
      familia: 'TRANSITO',
      fechaInfraccion: EL_DIA_DEL_PROTOTIPO,
      horaInfraccion: null,
      lugar: 'VÍA PÚBLICA',
      placa,
      licenciaConducir: null,
      codigoInfraccion: '',
      descripcionInfraccion: '',
      obligadoCodigo: null,
      obligadoNombre: obligado ?? null,
      infractorNombre: obligado ?? null,
      estado: 'COACTIVA',
      pendiente: true,
      importeAPagar: comoImporte(deuda ?? '0.00'),
      actualizadoA: EL_DIA_DEL_PROTOTIPO,
      valorNumero: null,
      id: i + 1,
    })),
  );

/**
 * Padrón de constancias libres de infracciones (`transito_padron_constancias`,
 * `ConstanciaLibreResource`, #53, #77).
 */
const padronDeConstancias = (): Paginado =>
  unaPagina(
    filasDe('transito_padron_constancias').map(([numero, fecha, placa, , , , usuario]) => ({
      numero,
      placa,
      verificadaAl: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
      fechaEmision: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
      usuarioQueEmitio: usuario ?? null,
      observacion: 'Verificación de papeletas pendientes de tránsito.',
    })),
  );

/** Las filas de un reporte del prototipo (`report.filas`), ya como texto suelto. */
function filasDelReporte(pantalla: string): readonly (readonly string[])[] {
  return RESPUESTAS[pantalla]?.reporte?.filas ?? [];
}

/**
 * Los dos records de tránsito (`transito_record_conductor`,
 * `transito_record_vehicular`; `PapeletaDelPadronResource`, #53, #77): el
 * mismo recurso que los padrones, paginado, aunque el catálogo lo dibuje como
 * hoja de reporte.
 */
const ESTADO_DEL_RECORD_DEL_MOCK: Readonly<Record<string, string>> = {
  Cancelada: 'PAGADA',
  Pendiente: 'IMPUESTA',
  Coactiva: 'COACTIVA',
  'A cuenta': 'IMPUESTA',
};

const recordDeConductor = (): Paginado =>
  unaPagina(
    filasDelReporte('transito_record_conductor').map(
      ([numero, fecha, placa, infraccion, importe, estado], i) => ({
        numero,
        familia: 'TRANSITO',
        fechaInfraccion: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        horaInfraccion: null,
        lugar: 'VÍA PÚBLICA',
        placa,
        licenciaConducir: 'Q-44218937',
        codigoInfraccion: infraccion ?? '',
        descripcionInfraccion: infraccion ?? '',
        obligadoCodigo: null,
        obligadoNombre: null,
        infractorNombre: 'SERNAQUE VILLEGAS, DORIS',
        estado: ESTADO_DEL_RECORD_DEL_MOCK[estado ?? ''] ?? 'IMPUESTA',
        pendiente: (estado ?? '').toLowerCase() === 'pendiente',
        importeAPagar: comoImporte(importe ?? '0.00'),
        actualizadoA: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        valorNumero: null,
        id: i + 1,
      }),
    ),
  );

const recordVehicular = (): Paginado =>
  unaPagina(
    filasDelReporte('transito_record_vehicular').map(
      ([numero, fecha, conductor, infraccion, importe, estado], i) => ({
        numero,
        familia: 'TRANSITO',
        fechaInfraccion: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        horaInfraccion: null,
        lugar: 'VÍA PÚBLICA',
        placa: 'NB-21169',
        licenciaConducir: null,
        codigoInfraccion: infraccion ?? '',
        descripcionInfraccion: infraccion ?? '',
        obligadoCodigo: null,
        obligadoNombre: conductor ?? null,
        infractorNombre: conductor ?? null,
        estado: ESTADO_DEL_RECORD_DEL_MOCK[estado ?? ''] ?? 'IMPUESTA',
        pendiente: (estado ?? '').toLowerCase() === 'pendiente',
        importeAPagar: comoImporte(importe ?? '0.00'),
        actualizadoA: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        valorNumero: null,
        id: i + 1,
      }),
    ),
  );

/**
 * Los dos resúmenes de papeletas cuyo agrupador existe de verdad en
 * `AgrupacionDelResumen` (`transito_resumen_codigo` con `CODIGO`,
 * `transito_resumen_placa` con `PLACA`; `ResumenDePapeletasResource`, #53,
 * #77). Es un recurso suelto —no pagina—, así que vive en `SUELTOS`.
 */
function resumenPorCodigoDeTransito(): Readonly<Record<string, unknown>> {
  const filas = filasDe('transito_resumen_codigo');
  const lineas = filas.map(([codigo, descripcion, pendientes, pendienteS, pagadas, pagadoS]) => ({
    clave: codigo,
    descripcion: descripcion ?? null,
    cantidad: (Number(pendientes) || 0) + (Number(pagadas) || 0),
    importe: masImporte(comoImporte(pendienteS ?? '0.00'), comoImporte(pagadoS ?? '0.00')),
    pagadas: Number(pagadas) || 0,
    importeDeLasPagadas: comoImporte(pagadoS ?? '0.00'),
    pendientes: Number(pendientes) || 0,
    importeDeLasPendientes: comoImporte(pendienteS ?? '0.00'),
    enCoactiva: 0,
    importeEnCoactiva: '0.00',
    actualizadoA: EL_DIA_DEL_PROTOTIPO,
  }));
  return {
    agrupadoPor: 'CODIGO',
    desde: '2026-01-01',
    hasta: EL_DIA_DEL_PROTOTIPO,
    papeletas: lineas.reduce((suma, linea) => suma + linea.cantidad, 0),
    importeTotal: lineas.reduce((suma, linea) => masImporte(suma, linea.importe), '0.00'),
    actualizadoA: EL_DIA_DEL_PROTOTIPO,
    lineas,
  };
}

function resumenPorPlacaDeTransito(): Readonly<Record<string, unknown>> {
  const filas = filasDe('transito_resumen_placa');
  const lineas = filas.map(([iniciales, cantidad, pendientes, pendienteS, pagadas, pagadoS]) => ({
    clave: iniciales,
    descripcion: null,
    cantidad: Number(cantidad) || 0,
    importe: masImporte(comoImporte(pendienteS ?? '0.00'), comoImporte(pagadoS ?? '0.00')),
    pagadas: Number(pagadas) || 0,
    importeDeLasPagadas: comoImporte(pagadoS ?? '0.00'),
    pendientes: Number(pendientes) || 0,
    importeDeLasPendientes: comoImporte(pendienteS ?? '0.00'),
    enCoactiva: 0,
    importeEnCoactiva: '0.00',
    actualizadoA: EL_DIA_DEL_PROTOTIPO,
  }));
  return {
    agrupadoPor: 'PLACA',
    desde: '2026-01-01',
    hasta: EL_DIA_DEL_PROTOTIPO,
    papeletas: lineas.reduce((suma, linea) => suma + linea.cantidad, 0),
    importeTotal: lineas.reduce((suma, linea) => masImporte(suma, linea.importe), '0.00'),
    actualizadoA: EL_DIA_DEL_PROTOTIPO,
    lineas,
  };
}

/** `5,350.00` con el separador de miles del prototipo → `5350.00`, como lo serializa el backend. */
const importeDelMock = comoImporte;

/** Un lugar fijo para las papeletas administrativas: ninguna tabla del prototipo lo publica. */
const LUGAR_DE_LA_INSPECCION = 'INSPECCIÓN MUNICIPAL';

/**
 * Papeletas administrativas por contribuyente (`PapeletaResource`, misma
 * familia, #47, #78): `GET .../reportes/por-contribuyente`.
 *
 * `infracciones_adm` (`GET /infracciones/actas`, el mismo `PapeletaResource`) se queda sin
 * conectar por este issue —ver `pantallas/sanciones/index.ts`—, así que no tiene su propia
 * función aquí: nada la registra en `PAGINADOS`, y la ruta sigue respondiendo el juego de datos
 * del prototipo tal cual, como el resto del camino común.
 *
 * `fechaInfraccion` se compone del año y el mes que dibuja el prototipo —no
 * publica el dia— con el primero del mes: es una composicion de presentacion
 * sobre dos columnas que si son del prototipo, no una cifra inventada.
 */
const notificacionesPorContribuyente = (): Paginado =>
  unaPagina(
    filasDe('adm_notificaciones_contribuyente').map(
      ([anio, mes, papeleta, , multaS, , , estado], i) => ({
        id: i + 1,
        familia: 'ADMINISTRATIVA',
        numero: papeleta,
        fechaInfraccion: `${anio}-${MES_DEL_PROTOTIPO[mes ?? ''] ?? '01'}-01`,
        horaInfraccion: null,
        lugar: LUGAR_DE_LA_INSPECCION,
        placa: null,
        vehiculoId: null,
        infractorId: null,
        propietarioId: null,
        contribuyenteId: 1,
        predioId: null,
        notificacionPreviaId: null,
        baseImponible: '5350.00',
        porcentajeInfraccion: '0.50',
        importeInfraccion: importeDelMock(multaS ?? '0.00'),
        porcentajeACobrar: '0.50',
        importeAPagar: importeDelMock(multaS ?? '0.00'),
        importeConBeneficio: null,
        estado: ESTADO_DE_DEUDA_ADMINISTRATIVA_DEL_MOCK[estado ?? ''] ?? 'IMPUESTA',
        usuarioRegistro: 'admin',
      }),
    ),
  );

/**
 * Como escribe el prototipo el estado de la deuda de una papeleta administrativa (columna
 * «Estado» de `adm_notificaciones_contribuyente`): Pendiente, A cuenta, Cancelada, Fraccionada,
 * Anulada — el vocabulario de cobranza del padron, no el del procedimiento sancionador. El
 * recurso real solo tiene los siete valores de `EstadoDePapeleta`.
 */
const ESTADO_DE_DEUDA_ADMINISTRATIVA_DEL_MOCK: Readonly<Record<string, string>> = {
  Pendiente: 'IMPUESTA',
  'A cuenta': 'NOTIFICADA',
  Cancelada: 'PAGADA',
  Fraccionada: 'RESUELTA',
  Anulada: 'ANULADA',
};

/** `Enero`..`Diciembre`, como los escribe el prototipo → el numero de mes de dos cifras. */
const MES_DEL_PROTOTIPO: Readonly<Record<string, string>> = {
  Enero: '01',
  Febrero: '02',
  Marzo: '03',
  Abril: '04',
  Mayo: '05',
  Junio: '06',
  Julio: '07',
  Agosto: '08',
  Setiembre: '09',
  Septiembre: '09',
  Octubre: '10',
  Noviembre: '11',
  Diciembre: '12',
};

/** `50 %` o `10` → `0.50`/`0.10`, como serializa `porcentajeUit` (`BigDecimal.toPlainString()`). */
function fraccionDeUit(texto: string): string {
  const numero = Number(texto.replace('%', '').trim());
  return Number.isFinite(numero) ? (numero / 100).toFixed(2) : '0.00';
}

/**
 * Cuadro unico de infracciones y sanciones administrativas
 * (`CodigoInfraccionResource`, familia `ADMINISTRATIVA`, #43, #78): `GET
 * /infracciones/cuis`.
 *
 * `baseLegal` es obligatorio en el recurso real y esta tabla del prototipo no
 * dibuja ninguna cita legal: se deja un texto fijo, igual que `lugar` en
 * `notificacionesPorContribuyente` — no es una cifra (regla 5, RNF-083 no
 * aplica), es el mismo hueco que ya resolvia `adminEstadoCuenta` para un campo
 * obligatorio que el prototipo no publica.
 */
const codigosCuis = (): Paginado =>
  unaPagina(
    filasDe('codigos_cuis').map(([codigo, , descripcion, uit, , medida], i) => ({
      id: i + 1,
      familia: 'ADMINISTRATIVA',
      codigo,
      descripcion,
      porcentajeUit: fraccionDeUit(uit ?? '0'),
      medida: medida && medida !== '—' ? medida : null,
      puntos: null,
      baseLegal: 'Ordenanza que aprueba el CUIS vigente',
      vigenciaDesde: '2020-01-01',
      vigenciaHasta: null,
    })),
  );

/**
 * Relacion impresa del CUIS (`CodigoInfraccionResource`, mismo catalogo que
 * `codigosCuis`, #43, #78): `GET
 * /infracciones/administrativas/codigos/reporte`.
 *
 * Es la **misma** tabla de codigos que `codigosCuis`, servida por el mismo
 * `CodigoInfraccionRepository` con otro privilegio (`IMPRESION`): el
 * prototipo la dibuja con otras columnas —«Base», «Sancion no pecuniaria»— y
 * otro juego de codigos, y aqui no se fuerzan a coincidir con los de
 * `codigos_cuis`: son dos tablas distintas del mismo prototipo portado, y
 * unificarlas inventaria una correspondencia que el prototipo no declara.
 * `baseLegal` sale de la columna «Base», que aqui si trae un valor real —«UIT»—
 * y no del texto fijo que usa `codigosCuis`.
 */
const codigosDeReporteAdministrativo = (): Paginado =>
  unaPagina(
    filasDe('adm_codigos_reporte').map(([codigo, infraccion, base, uit, , medida], i) => ({
      id: i + 1,
      familia: 'ADMINISTRATIVA',
      codigo,
      descripcion: infraccion,
      porcentajeUit: fraccionDeUit(uit ?? '0'),
      medida: medida && medida !== '—' ? medida : null,
      puntos: null,
      baseLegal: base && base !== '' ? base : 'Ordenanza que aprueba el CUIS vigente',
      vigenciaDesde: '2020-01-01',
      vigenciaHasta: null,
    })),
  );

/**
 * Padron de notificaciones administrativas (`NotificacionDelPadronResource`,
 * #53, #78): `GET .../reportes/padron-notificaciones`.
 *
 * `direccion` es obligatoria en el recurso real y esta tabla no la dibuja
 * —«Infractor», no «Dirección»—: se deja un texto fijo, la misma resolucion
 * que `baseLegal` en `codigosCuis`. `tienePapeleta`/`papeletaNumero` salen de
 * la columna «Papeleta» tal como la escribe el prototipo, `—` para «todavia
 * sin papeleta».
 */
const padronDeNotificaciones = (): Paginado =>
  unaPagina(
    filasDe('adm_padron_notificaciones').map(
      ([numero, fecha, , infraccion, , , papeleta, deudaS], i) => {
        const tienePapeleta = (papeleta ?? '—') !== '—';
        return {
          id: i + 1,
          numero,
          fecha: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
          direccion: LUGAR_DE_LA_INSPECCION,
          motivo: infraccion,
          plazoDias: 10,
          estado: tienePapeleta ? 'SUBSANADA' : 'VENCIDA',
          tienePapeleta,
          papeletaNumero: tienePapeleta ? papeleta : null,
          papeletaEstado: tienePapeleta ? 'IMPUESTA' : null,
          importeDeLaPapeleta: tienePapeleta ? importeDelMock(deudaS ?? '0.00') : null,
          actualizadoA: fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO,
        };
      },
    ),
  );

/**
 * Notificaciones vencidas (`NotificacionAdministrativaResource`, #47, #78):
 * `GET .../reportes/vencidas`.
 *
 * `plazoDias` se compone contando los dias de calendario entre «Fecha» y
 * «Venció» —las dos son columnas reales del prototipo—, no una cifra
 * inventada: es la misma composicion de presentacion que ya hace `vehiculo()`
 * con el año de una fecha.
 */
const notificacionesVencidasAdministrativas = (): Paginado =>
  unaPagina(
    filasDe('adm_notificaciones_vencidas').map(
      ([numero, fecha, , direccion, infraccion, vencio], i) => {
        const fechaIso = fechaDe(fecha ?? '') ?? EL_DIA_DEL_PROTOTIPO;
        const vencimientoIso = fechaDe(vencio ?? '') ?? fechaIso;
        return {
          id: i + 1,
          numero,
          fecha: fechaIso,
          contribuyenteId: i + 1,
          predioId: null,
          direccion,
          motivo: infraccion,
          plazoDias: diasEntre(fechaIso, vencimientoIso),
          vencimiento: vencimientoIso,
          estado: 'VENCIDA',
          usuarioRegistro: 'admin',
        };
      },
    ),
  );

/** Dias de calendario entre dos fechas ISO, sin horas: lo que separa a `desde` de `hasta`. */
function diasEntre(desde: string, hasta: string): number {
  const unDia = 24 * 60 * 60 * 1000;
  const diferencia = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Number.isFinite(diferencia) ? Math.max(0, Math.round(diferencia / unDia)) : 0;
}

/**
 * Resumen de recaudacion por multas administrativas
 * (`RecaudacionDeMultasResource`, #53, #78): `GET
 * .../reportes/resumen-recaudacion`.
 *
 * No es un sobre paginado: el controlador real devuelve **un** objeto con una
 * linea por (tributo, ejercicio, mes, fase). El prototipo dibuja una fila por
 * mes con tres columnas de fase ya repartidas —«Ordinaria S/», «Coactiva S/»,
 * «Convenios S/»—, y aqui no se inventa como el backend reparte una cifra
 * entre fases: se publican **tres lineas por mes**, una por fase, cada una con
 * su propio `recaudado` literal —el mismo numero que ya dibuja esa columna del
 * prototipo—, tal como las devolveria de verdad `RecaudadoEnElLibro`.
 */
function resumenRecaudacionAdministrativa(): Readonly<Record<string, unknown>> {
  const filas = filasDe('adm_resumen_recaudacion');
  const lineas = filas.flatMap(([mes, , ordinariaS, coactivaS, conveniosS]) =>
    (
      [
        ['ORDINARIA', ordinariaS],
        ['COACTIVA', coactivaS],
        ['CONVENIO', conveniosS],
      ] as const
    ).map(([fase, recaudadoS]) => ({
      tributo: 'MULTA_ADMINISTRATIVA',
      ejercicio: 2026,
      mes: Number(MES_DEL_PROTOTIPO[mes ?? ''] ?? '1'),
      fase,
      abonos: 1,
      recaudado: importeDelMock(recaudadoS ?? '0.00'),
      actualizadoA: EL_DIA_DEL_PROTOTIPO,
    })),
  );
  return {
    desde: '2026-01-01',
    hasta: '2026-12-31',
    total: importeDelMock(
      filas
        .reduce((suma, [, , , , , totalS]) => suma + Number(importeDelMock(totalS ?? '0')), 0)
        .toFixed(2),
    ),
    abonos: filas.length,
    actualizadoA: EL_DIA_DEL_PROTOTIPO,
    lineas,
  };
}

/*
 * `adm_notificacion` (`POST .../notificaciones`) y `adm_valores` (`POST
 * .../valores/generacion-masiva`) se quedan sin conectar por este issue —ver
 * `pantallas/sanciones/index.ts`—, así que no tienen respuesta propia aquí: sus rutas siguen
 * respondiendo el juego de datos del prototipo, como el resto del camino común.
 */

/* ── Coactiva: expedientes ─────────────────────────────────────────────── */

/**
 * Expedientes coactivos (`ExpedienteResource`, #40, #363).
 *
 * `Contribuyente` sale de `codContribuyente`, que en el recurso real es el
 * **codigo** del obligado (`ExpedienteController.codigoDe`) y no su nombre:
 * el prototipo dibuja el nombre en esa columna, y aqui no se inventa un
 * codigo — se guarda el mismo texto que trae el prototipo, tal como haria un
 * codigo de contribuyente cualquiera, sin fingir que es uno de verdad.
 *
 * `insoluto`, `reajuste`, `interes`, `gastos` y `totalExigible` no los
 * dibuja la grilla («Deuda S/» es `deudaMateriaDeCobranza` y «Costas S/» es
 * `costas`, las dos columnas que si estan en el prototipo): se rellenan sin
 * inventar un reparto, con el mismo criterio que ya usa
 * `constanciaDeNoAdeudo` para las cifras que su recurso no distingue.
 */
/** Por camino del contrato, relativo a `/api/v1`. Casi todas son `GET`: ver `respaldo`. */
export const PAGINADOS: Readonly<Record<string, () => Paginado>> = {
  '/fiscalizacion/omisos': omisosFiscalizacion,
  '/fiscalizacion/predial/historico': historicoFiscalizacion,
  '/catastro/vias': vias,
  '/tesoreria/convenios': convenios,
  '/rentas/contribuyentes': contribuyentes,
  '/rentas/beneficios': beneficios,
  '/rentas/arbitrios': arbitrios,
  '/rentas/predios': prediosDeRentas,
  '/valores': valores,
  '/consultas/cuenta-corriente/{codigo}': cuentaCorriente,
  '/consultas/deuda': consultaDeuda,
  '/consultas/vehiculos': consultaVehiculos,
  '/consultas/altas-bajas': altasBajas,
  '/consultas/pagos': pagos,
  '/consultas/predios': predios,
  '/consultas/resumen-predial': resumenPredial,
  '/consultas/valores': valoresConsultados,
  '/catastro/sectores': sectores,
  '/catastro/fichas': fichas,
  '/seguridad/modulos': modulos,
  '/seguridad/accesos': accesos,
  '/seguridad/grupos': grupos,
  '/seguridad/usuarios': usuarios,
  '/seguridad/auditoria': auditoria,
  '/seguridad/parametros': parametros,
  '/seguridad/respaldos': respaldo,
  '/transito/papeletas': papeletasTransito,
  '/transito/papeletas/busqueda': papeletasDeBusqueda,
  '/transito/estado-cuenta': estadoDeCuentaDeTransito,
  '/transito/codigos': codigosDeTransito,
  '/transito/internamientos': internamientos,
  '/transito/reportes/padron': padronDeTransito,
  '/transito/reportes/padron-coactiva': padronCoactivaDeTransito,
  '/transito/reportes/padron-constancias': padronDeConstancias,
  '/transito/reportes/record-conductor': recordDeConductor,
  '/transito/reportes/record-vehicular': recordVehicular,
  '/infracciones/administrativas/estado-cuenta': adminEstadoCuenta,
  '/infracciones/cuis': codigosCuis,
  '/infracciones/administrativas/codigos/reporte': codigosDeReporteAdministrativo,
  '/infracciones/administrativas/reportes/padron-notificaciones': padronDeNotificaciones,
  '/infracciones/administrativas/reportes/vencidas': notificacionesVencidasAdministrativas,
  '/infracciones/administrativas/reportes/por-contribuyente': notificacionesPorContribuyente,
  '/coactiva/expedientes': expedientesCoactivos,
  '/coactiva/deudas': deudasCoactivas,
  '/coactiva/deudas-en-beneficio': deudasCoactivasBeneficio,
  '/autorizaciones/anuncios': anuncios,
  '/licencias/funcionamiento': licenciaFuncionamiento,
  '/licencias/edificacion': fueEdificacion,
  '/licencias/edificacion/reportes/general': edificacionReporte,
  '/licencias/ciiu': ciiu,
  '/licencias/certificados': certificadosDeNumeracion,
};

/**
 * Los permisos ya otorgados de un grupo (`GET .../grupos/{id}/permisos`, #70).
 *
 * El proxy no filtra ni persiste (arriba, en `proxy.ts`): la misma fila sale
 * sin importar que grupo se pida, igual que ya hace `cuentaCorriente` con su
 * `{codigo}`. Sirve para probar que la matriz carga lo que haya **sin** traer
 * las 134 opciones del catalogo — aqui hay una, a proposito.
 */
const permisosDeGrupo = (): readonly Readonly<Record<string, unknown>>[] => [
  { id: 1, acceso: 'calles', grupoId: 1, usuarioId: null, privilegios: ['LECTURA'] },
];

/**
 * Por camino del contrato, para los listados que el backend publica **sin**
 * sobre de paginacion: un arreglo suelto, tal como lo devuelve el controlador.
 */
/**
 * Valores unitarios y depreciacion (#71): un arreglo vacio, siempre.
 *
 * No es una simplificacion del proxy: es lo que hay. Las dos estan bloqueadas
 * por D-02a —ningun valor unitario ni porcentaje de depreciacion tiene fuente
 * verificada todavia—, y poner aqui una fila de ejemplo las haria parecer
 * normativas. La pantalla tiene que poder mostrar el vacio explicito, y esta
 * es la unica respuesta que no se lo impide.
 */
const sinSellarTodavia = (): readonly Readonly<Record<string, unknown>>[] => [];

export const LISTAS: Readonly<Record<string, () => readonly Readonly<Record<string, unknown>>[]>> =
  {
    '/catastro/tablas/aranceles': aranceles,
    '/catastro/tablas/valores-unitarios': sinSellarTodavia,
    '/catastro/tablas/depreciacion': sinSellarTodavia,
    '/seguridad/grupos/{id}/permisos': permisosDeGrupo,
  };

/** El arreglo suelto de un camino, si el proxy lo publica sin sobre. */
export function listaDe(
  metodo: string,
  camino: string,
): readonly Readonly<Record<string, unknown>>[] | null {
  if (metodo.toUpperCase() !== 'GET') return null;
  const relativo = camino.replace(/^\/api\/v1/, '');
  const directa = LISTAS[relativo];
  if (directa !== undefined) return directa();
  // Hay listados cuya ruta lleva el registro que acotan —el grupo, aqui—: se
  // comparan por patron, igual que `paginadoDe`.
  for (const [ruta, construir] of Object.entries(LISTAS)) {
    if (ruta.includes('{') && patron(ruta).test(relativo)) return construir();
  }
  return null;
}

/* ── Lo que devuelven las dos escrituras que la interfaz ya usa ─────────── */

/**
 * Respuesta del `PUT` que cambia el ejercicio de trabajo.
 *
 * **Devuelve el ejercicio que se le pidio**, y no uno fijo, porque es lo que
 * hace el backend: la interfaz adopta el que responde el servidor, no el que
 * ella misma eligio. Con una respuesta fija la cabecera se quedaria clavada y
 * la pantalla pareceria no hacer nada.
 */
function sesionConEjercicio(cuerpo: unknown): Readonly<Record<string, unknown>> {
  const pedido =
    typeof cuerpo === 'object' && cuerpo !== null
      ? (cuerpo as Readonly<Record<string, unknown>>)['ejercicio']
      : undefined;
  return {
    id: 1,
    usuarioId: 1,
    inicio: new Date().toISOString(),
    ejercicioDeTrabajo: typeof pedido === 'number' ? pedido : new Date().getFullYear(),
  };
}

/**
 * Respuesta del `PUT` que inicia el cambio de contrasena.
 *
 * Lo que devuelve el backend es **a donde tiene que ir la interfaz**, no una
 * confirmacion: el sistema no recibe contrasenas y el cambio lo hace el
 * proveedor de identidad (ADR-0005).
 */
const cambioDeClaveIniciado = (): Readonly<Record<string, unknown>> => ({
  gestionadaPor: 'PROVEEDOR_DE_IDENTIDAD',
  destino: '/proveedor-de-identidad/cambiar-clave',
});

/** Por verbo y camino del contrato. Las que no estan aqui siguen el camino de siempre. */
const ESCRITURAS: Readonly<Record<string, (cuerpo: unknown) => Readonly<Record<string, unknown>>>> =
  {
    'PUT /seguridad/sesion/ejercicio': sesionConEjercicio,
    'PUT /seguridad/usuarios/{id}/clave': cambioDeClaveIniciado,
    /* Las dos determinaciones prediales (#395). Son `POST` y su respuesta **no
       es la forma comun**: es el recurso del dominio —la memoria de calculo con
       sus tramos y sus cuotas, o las etapas de la corrida—, que es lo que
       `PredialController` publica. Sin esto seguirian contestando el juego de
       datos del prototipo, y la pantalla lo leeria como si fuera el recurso: el
       defecto de #363, la tabla vacia en silencio. */
    'POST /rentas/predial/calculo-individual': determinacionPredial,
    'POST /rentas/predial/calculo-masivo': corridaPredial,
  };

/** La respuesta de una escritura de seguridad, si el proxy la publica con la forma del backend. */
export function escrituraDe(
  metodo: string,
  camino: string,
  cuerpo: unknown,
): Readonly<Record<string, unknown>> | null {
  const relativo = camino.replace(/^\/api\/v1/, '');
  const clave = `${metodo.toUpperCase()} ${relativo}`;
  const directa = ESCRITURAS[clave];
  if (directa) return directa(cuerpo);
  // El camino de la clave lleva un parametro: se compara por patron.
  for (const [declarada, construir] of Object.entries(ESCRITURAS)) {
    const [verbo = '', ruta = ''] = declarada.split(' ');
    if (verbo !== metodo.toUpperCase()) continue;
    if (patron(ruta).test(relativo)) return construir(cuerpo);
  }
  return null;
}

/** `/seguridad/usuarios/{id}/clave` → `^/seguridad/usuarios/[^/]+/clave$`. */
function patron(ruta: string): RegExp {
  const escapado = ruta
    .split(/(\{\w+\})/)
    .map((trozo) =>
      /^\{\w+\}$/.test(trozo) ? '[^/]+' : trozo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${escapado}$`);
}

/**
 * El recurso paginado de un camino, si el proxy lo publica con la forma del backend.
 *
 * Casi siempre es un `GET`. La excepcion es `/seguridad/respaldos`: su verbo
 * es `POST` porque asi lo fijo el contrato del prototipo, pero el controlador
 * solo consulta —la aplicacion no puede ejecutar copias de seguridad (ARQ-03
 * §4)— y su respuesta es el mismo sobre paginado que las demas lecturas. Por
 * eso este comparador mira el metodo real de cada entrada y no descarta el
 * `POST` de entrada.
 */
export function paginadoDe(metodo: string, camino: string): Paginado | null {
  const verbo = metodo.toUpperCase();
  if (verbo !== 'GET' && !(verbo === 'POST' && camino.endsWith('/seguridad/respaldos'))) {
    return null;
  }
  const relativo = camino.replace(/^\/api\/v1/, '');
  const directo = PAGINADOS[relativo];
  if (directo !== undefined) return directo();
  // Hay listados cuya ruta lleva el registro que acotan —el estado de cuenta de
  // un contribuyente—: se comparan por patron.
  for (const [ruta, construir] of Object.entries(PAGINADOS)) {
    if (ruta.includes('{') && patron(ruta).test(relativo)) return construir();
  }
  return null;
}

/**
 * El recurso suelto de un camino: una ficha, no un listado.
 *
 * Va por patron porque su ruta lleva el codigo del predio, y el proxy no filtra
 * —devuelve la misma ficha venga el codigo que venga—. Fingir que busca seria
 * simular una semantica que el backend ya tiene y este archivo no.
 */
export function recursoDe(
  metodo: string,
  camino: string,
): Readonly<Record<string, unknown>> | null {
  if (metodo.toUpperCase() !== 'GET') return null;
  const relativo = camino.replace(/^\/api\/v1/, '');
  for (const [ruta, construir] of Object.entries(SUELTOS)) {
    if (patron(ruta).test(relativo)) return construir();
  }
  return null;
}

/** El tipo de medio de cada formato que `ReporteController` sirve (#71). */
const TIPOS_DE_MEDIO: Readonly<Record<string, string>> = {
  PDF: 'application/pdf',
  XLS: 'application/vnd.ms-excel',
  RTF: 'application/rtf',
};

/** Un archivo descargable, tal como lo sirve el proxy: cuerpo, tipo y nombre. */
export interface ArchivoSimulado {
  readonly cuerpo: string;
  readonly tipoDeMedio: string;
  readonly nombreDeArchivo: string;
}

/**
 * Las rutas cuyo backend sirve el documento con `?formato=`, y como se llama lo
 * que devuelven.
 *
 * Dos, y las dos por el mismo motivo: son consultas que se miran, no emisiones
 * que se numeren, asi que su backend las dibuja en los tres formatos de RF-132
 * sin registrar nada. La ficha del contribuyente (#71) y la constancia de no
 * adeudo (#72, RNF-081).
 */
const RUTAS_CON_ARCHIVO: ReadonlyArray<{
  readonly ruta: RegExp;
  readonly titulo: string;
  readonly base: string;
}> = [
  {
    ruta: /^\/catastro\/contribuyentes\/[^/]+\/ficha\.pdf$/,
    titulo: 'Ficha del contribuyente',
    base: 'ficha-simulada',
  },
  {
    ruta: /^\/consultas\/constancias\/no-adeudo$/,
    titulo: 'Constancia de no adeudo',
    base: 'constancia-simulada',
  },
];

/**
 * Un reporte que sale como archivo, cuando la peticion lo pide (`?formato=`).
 *
 * A diferencia del resto de este archivo, aqui **si se inventa el contenido**:
 * no hay un `Resource` del prototipo del que copiarlo, porque un archivo
 * binario no es un dato de pantalla. Lo que se prueba con esto es el
 * mecanismo de descarga —la cabecera, el nombre, el tipo de medio—, no la
 * fidelidad del documento: quien la comprueba es el backend, que dibuja los
 * tres formatos del mismo modelo y verifica que reimprimir da los mismos bytes.
 * Sin `formato`, la ruta sigue su camino de siempre y responde JSON.
 */
export function archivoDe(
  metodo: string,
  camino: string,
  formato: string | null,
): ArchivoSimulado | null {
  if (metodo.toUpperCase() !== 'GET' || formato === null || formato === '') return null;
  const relativo = camino.replace(/^\/api\/v1/, '');
  const reporte = RUTAS_CON_ARCHIVO.find((candidata) => candidata.ruta.test(relativo));
  if (reporte === undefined) return null;

  const tipoDeMedio = TIPOS_DE_MEDIO[formato.toUpperCase()];
  if (tipoDeMedio === undefined) return null;

  return {
    cuerpo: `${reporte.titulo} — documento simulado por el proxy de datos (formato ${formato.toUpperCase()})`,
    tipoDeMedio,
    nombreDeArchivo: `${reporte.base}.${formato.toLowerCase()}`,
  };
}
