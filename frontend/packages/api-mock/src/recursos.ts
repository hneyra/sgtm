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
 * valores emitidos (#37).
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
  const importe = (valor: string) => ({ importe: valor, actualizadoA: fecha });

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
  const importe = (valor: string) => ({ importe: valor, actualizadoA: fecha });

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
          deuda: { importe: deudaS ?? '0.00', actualizadoA: fecha },
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
      monto: { importe: importeS ?? '0.00', actualizadoA: fechaDe(fecha ?? '') ?? '2026-08-13' },
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
      deuda: { importe: deudaS ?? '0.00', actualizadoA: fecha },
    })),
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
          monto: { importe: emitido, actualizadoA: `${ejercicio}-02-28` },
        });
      }
      if (pagado && pagado !== '0.00') {
        asientos.push({
          ...comun,
          id: asientos.length + 1,
          tipo: 'ABONO',
          monto: { importe: pagado, actualizadoA: `${ejercicio}-03-1${i % 9}` },
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

const fichas = (): Paginado =>
  unaPagina(
    filasDe('consulta_fichas').map(([codigo, , titular, uso, areaTerreno], i) => ({
      id: i + 1,
      predioId: i + 1,
      codRefCatastral: codigo,
      direccion: '',
      manzana: null,
      lote: null,
      tipo: 'UNICA',
      version: 1,
      areaTerreno,
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

const SUELTOS: Readonly<Record<string, () => Readonly<Record<string, unknown>>>> = {
  '/catastro/fichas/urbana/{codRefCatastral}': urbana,
  '/catastro/fichas/economica/{codRefCatastral}': economica,
  '/catastro/fichas/bienes-comunes/{codEdificacion}': bienesComunes,
  '/catastro/fichas/rural/{codUnidad}': rural,
  '/rentas/vehiculos/{placa}': vehiculo,
  '/rentas/declaraciones/{djNro}': declaracionJurada,
  '/consultas/constancias/no-adeudo': constanciaDeNoAdeudo,
  '/seguridad/sesion/permisos': permisosDeLaSesion,
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

/** Por camino del contrato, relativo a `/api/v1`. Casi todas son `GET`: ver `respaldo`. */
export const PAGINADOS: Readonly<Record<string, () => Paginado>> = {
  '/catastro/vias': vias,
  '/rentas/contribuyentes': contribuyentes,
  '/rentas/beneficios': beneficios,
  '/rentas/arbitrios': arbitrios,
  '/valores': valores,
  '/consultas/cuenta-corriente/{codigo}': cuentaCorriente,
  '/consultas/deuda': consultaDeuda,
  '/consultas/vehiculos': consultaVehiculos,
  '/consultas/altas-bajas': altasBajas,
  '/consultas/pagos': pagos,
  '/consultas/predios': predios,
  '/catastro/sectores': sectores,
  '/catastro/fichas': fichas,
  '/seguridad/modulos': modulos,
  '/seguridad/accesos': accesos,
  '/seguridad/grupos': grupos,
  '/seguridad/usuarios': usuarios,
  '/seguridad/auditoria': auditoria,
  '/seguridad/parametros': parametros,
  '/seguridad/respaldos': respaldo,
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
 * El reporte de la ficha del contribuyente, cuando pide un archivo (`?formato=`).
 *
 * A diferencia del resto de este archivo, aqui **si se inventa el contenido**:
 * no hay un `Resource` del prototipo del que copiarlo, porque un archivo
 * binario no es un dato de pantalla. Lo que se prueba con esto es el
 * mecanismo de descarga —la cabecera, el nombre, el tipo de medio—, no la
 * fidelidad del documento. Sin `formato`, la ruta sigue su camino de siempre
 * y responde JSON, como cualquier otra pantalla sin conectar.
 */
export function archivoDe(
  metodo: string,
  camino: string,
  formato: string | null,
): ArchivoSimulado | null {
  if (metodo.toUpperCase() !== 'GET' || formato === null || formato === '') return null;
  const relativo = camino.replace(/^\/api\/v1/, '');
  if (!/^\/catastro\/contribuyentes\/[^/]+\/ficha\.pdf$/.test(relativo)) return null;

  const tipoDeMedio = TIPOS_DE_MEDIO[formato.toUpperCase()];
  if (tipoDeMedio === undefined) return null;

  return {
    cuerpo: `Ficha del contribuyente — documento simulado por el proxy de datos (formato ${formato.toUpperCase()})`,
    tipoDeMedio,
    nombreDeArchivo: `ficha-simulada.${formato.toLowerCase()}`,
  };
}
