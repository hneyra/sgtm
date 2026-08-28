import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  esObjeto,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';

/**
 * Consultas, conectado hasta donde llega el backend: **siete opciones de once**.
 *
 * `cuenta_corriente` (#21) ya estaba. Se suman `consulta_deuda` (#22, #175),
 * `constancia` (#25, #179), `consulta_vehiculos` (#25, #184),
 * `consulta_altas_bajas` (#24, #186), `consulta_pagos` (#25, #219) y
 * `consulta_predios` (#25, #222). Las otras cuatro —`consulta_unificada`,
 * `consulta_resumen_predial`, `consulta_valores`, `consulta_deudas_beneficio`—
 * siguen esperando su backend (#25 sigue abierto).
 */

/**
 * Un importe con su fecha, tal como lo publica `ImporteActualizado`.
 *
 * Los dos juntos o ninguno: una cifra sin fecha es una cifra que dentro de tres
 * dias es otra (regla 9, RNF-075). Se lee asi y no como dos campos sueltos
 * porque asi es como el backend impide que se separen.
 */
interface ImporteConFecha {
  readonly importe: string;
  readonly actualizadoA: Fecha;
}

function importeDe(valor: unknown): ImporteConFecha | undefined {
  if (!esObjeto(valor)) return undefined;
  const importe = valor['importe'];
  const actualizadoA = valor['actualizadoA'];
  if (typeof importe !== 'string' || typeof actualizadoA !== 'string') return undefined;
  return { importe, actualizadoA: actualizadoA as Fecha };
}

/**
 * Si un importe es cero, por texto: `Number()`/`parseFloat()` sobre un importe
 * pierde centimos (RNF-055, FRO-04 §4) y la regla de ESLint lo prohibe. No
 * hace falta el valor, solo el signo, y eso se lee del propio texto.
 */
const esCero = (importe: string): boolean => /^-?0+(\.0+)?$/.test(importe.trim());

/**
 * El estado de cuenta: el libro, con una fila por asiento.
 *
 * **Un asiento es un importe y un tipo, no tres columnas.** El prototipo dibuja
 * «Emitido», «Pagado» y «Saldo»; el recurso publica un `monto` y un `tipo`, asi
 * que el monto va a la columna que le toca —cargo a emitido, abono a pagado— y
 * el saldo sale vacio. Restar aqui produciria una cifra que el backend no puede
 * sustentar (RNF-083), y el saldo proyectado es #23, que sigue bloqueado.
 */
const cuenta_corriente = definirConexion({
  operacion: 'cuenta_corriente',
  parametros: ({ ruta, busqueda }) => ({
    codigo: ruta['codigo'] ?? '',
    ...parametrosDeBusqueda('cuenta_corriente', ruta['codigo'], busqueda),
  }),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el estado de cuenta'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (asiento): readonly Celda[] => {
        const monto = importeDe(asiento['monto']);
        const esAbono = asiento['tipo'] === 'ABONO';
        return [
          { texto: texto(asiento['ejercicio']) },
          { texto: texto(asiento['tributo']) },
          { texto: texto(asiento['predioId'] ?? asiento['vehiculoId']) },
          { texto: texto(asiento['periodo']) },
          { texto: esAbono ? SIN_DATO : (monto?.importe ?? SIN_DATO) },
          { texto: esAbono ? (monto?.importe ?? SIN_DATO) : SIN_DATO },
          // El saldo es el proyectado (#23) y no se compone restando.
          { texto: SIN_DATO },
          { texto: texto(asiento['fase']) },
        ];
      },
      'asientos',
    );

    return {
      // La fecha de la pantalla es la del asiento mas reciente: es a lo que
      // estan actualizadas las cifras que se ven, y sale del backend —no del
      // reloj del navegador, que diria «hoy» sobre datos de anteayer—.
      fechaCalculo: masReciente(paginado.contenido),
      tabla,
      // Los cuatro totales los calcula el backend a partir del saldo proyectado
      // (#23). Vacios mientras no exista: un cero seria una cifra, y un total
      // compuesto aqui seria una cifra que nadie puede sustentar.
      totales: [
        { label: 'Deuda insoluta', value: SIN_DATO },
        { label: 'Reajuste e interés', value: SIN_DATO },
        { label: 'Costas y gastos', value: SIN_DATO },
        { label: 'Saldo total', value: SIN_DATO },
      ],
    };
  },
});

/** La fecha del asiento mas reciente. Sin asientos, no hay cifras que fechar. */
function masReciente(asientos: readonly unknown[]): Fecha {
  let mayor: string | undefined;
  for (const asiento of asientos) {
    if (!esObjeto(asiento)) continue;
    const monto = importeDe(asiento['monto']);
    if (monto !== undefined && (mayor === undefined || monto.actualizadoA > mayor)) {
      mayor = monto.actualizadoA;
    }
  }
  return (mayor ?? hoy()) as Fecha;
}

/**
 * «Fase» del prototipo no habla el vocabulario del backend: sus opciones son
 * «Todas», «ORDINARIA», «VALOR EMITIDO» y «COACTIVA», y el `enum Fase` del
 * libro es `ORDINARIA | VALOR | COACTIVA | CONVENIO` (V2). Mandar «VALOR
 * EMITIDO» tal cual no filtra nada: `Fase.valueOf` lanza, porque ese literal
 * no es ninguno de los cuatro. Se traduce aqui, y lo que no se reconoce
 * —incluida «Todas»— no se manda: sin filtro trae todas las fases, que es lo
 * que «Todas» significa.
 */
const FASES_DEL_BACKEND: Readonly<Record<string, string>> = {
  ORDINARIA: 'ORDINARIA',
  'VALOR EMITIDO': 'VALOR',
  COACTIVA: 'COACTIVA',
};

const faseDe = (cruda: string | null): string | undefined =>
  cruda === null ? undefined : FASES_DEL_BACKEND[cruda];

/**
 * Una obligacion de `consulta_deuda`, leida en las cifras que publica.
 *
 * Se exporta porque **la baja de deuda lee la misma operacion** (#332): su
 * pantalla es un `POST`, asi que no puede pedir su propia tabla, y la deuda que
 * se puede dar de baja es exactamente esta. Dos lecturas del mismo recurso
 * acabarian leyendo campos distintos —y una de las dos, mal—; se lee una vez.
 *
 * Todo sale **tal cual lo publica el backend**: ni se suma, ni se resta, ni se
 * completa el total a partir de las partes (RNF-083).
 */
export interface ObligacionDeDeuda {
  readonly ejercicio: string;
  readonly tributo: string;
  /** `3`, `3 - 7` o `Anual`, como lo escribe el manual. */
  readonly cuota: string;
  readonly insoluto: string;
  readonly reajuste: string;
  readonly interes: string;
  readonly gasto: string;
  readonly total: string;
  readonly fase: string;
}

export function obligacionDeDeuda(
  obligacion: Readonly<Record<string, unknown>>,
): ObligacionDeDeuda {
  const deuda = esObjeto(obligacion['deuda']) ? obligacion['deuda'] : undefined;
  const parte = (nombre: string): string => importeDe(deuda?.[nombre])?.importe ?? SIN_DATO;
  return {
    ejercicio: texto(obligacion['ejercicio']),
    tributo: texto(obligacion['tributo']),
    cuota: cuotaDe(obligacion['periodoDesde'], obligacion['periodoHasta']),
    insoluto: parte('insoluto'),
    reajuste: parte('reajuste'),
    interes: parte('interes'),
    gasto: parte('gasto'),
    total: parte('total'),
    fase: texto(obligacion['fase']),
  };
}

/** `3` → `3`; `3` y `7` → `3 - 7`; `0` y `0` → `Anual` (periodo 0, V2). */
function cuotaDe(desde: unknown, hasta: unknown): string {
  const d = typeof desde === 'number' ? desde : Number.NaN;
  const h = typeof hasta === 'number' ? hasta : Number.NaN;
  if (Number.isNaN(d) || Number.isNaN(h)) return SIN_DATO;
  if (d === 0 && h === 0) return 'Anual';
  return d === h ? String(d) : `${d} - ${h}`;
}

/**
 * Deuda de todas las obligaciones de un contribuyente (RF-041, #22, #175).
 *
 * Los cuatro totales de la banda **no se componen aqui**: sumarian filas de
 * distinta fase, y RNF-083 lo prohibe — es la misma razon por la que
 * `cuenta_corriente` los deja vacios. `@sgtm/dominio` no exporta ninguna
 * funcion de sumar, y no es un olvido.
 */
const consulta_deuda = definirConexion({
  operacion: 'consulta_deuda',
  parametros: ({ busqueda }) => {
    const fase = faseDe(busqueda.get('fase'));
    return {
      ...parametrosDeBusqueda('consulta_deuda', undefined, busqueda),
      ...(fase === undefined ? {} : { fase }),
    };
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (obligacion): readonly Celda[] => {
        const leida = obligacionDeDeuda(obligacion);
        return [
          { texto: leida.ejercicio },
          { texto: leida.tributo },
          { texto: leida.cuota },
          { texto: leida.insoluto },
          { texto: leida.reajuste },
          { texto: leida.interes },
          { texto: leida.gasto },
          { texto: leida.total },
          { texto: leida.fase },
        ];
      },
      'obligaciones',
    );

    return {
      fechaCalculo: fechaDeCorteDe(paginado.contenido),
      tabla,
      totales: [
        { label: 'Fase ordinaria', value: SIN_DATO },
        { label: 'Valor emitido', value: SIN_DATO },
        { label: 'Fase coactiva', value: SIN_DATO },
        { label: 'Deuda total', value: SIN_DATO },
      ],
    };
  },
});

/**
 * La fecha de corte con que se calculo, de cualquier obligacion: las cinco
 * cifras la comparten.
 *
 * Se exporta por lo mismo que {@link obligacionDeDeuda}: la baja de deuda lee la
 * misma operacion, y **toda cifra se muestra con su fecha de calculo** (regla 9,
 * RNF-075). Sin esto, cada lectura resolveria «a que fecha» por su cuenta.
 */
export function fechaDeCorteDe(obligaciones: readonly unknown[]): Fecha {
  for (const obligacion of obligaciones) {
    if (!esObjeto(obligacion) || !esObjeto(obligacion['deuda'])) continue;
    const insoluto = importeDe(obligacion['deuda']['insoluto']);
    if (insoluto !== undefined) return insoluto.actualizadoA;
  }
  return hoy();
}

/**
 * Constancia de no adeudo (RF-049, RNF-084, #25, #179).
 *
 * El endpoint no lleva parametro de ruta: el contribuyente se abre como en
 * cualquier otra pantalla, por el codigo de la URL, y viaja como
 * `codContribuyente` en la consulta.
 *
 * `code` sale vacio a proposito: la numeracion del documento es D-09, abierta.
 * Un folio inventado aqui seria un correlativo que nadie mas conoce.
 */
const constancia = definirConexion({
  operacion: 'constancia',
  parametros: ({ ruta, busqueda }) => ({
    ...parametrosDeBusqueda('constancia', undefined, busqueda),
    codContribuyente: ruta['codigo'] ?? '',
  }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'la constancia'),
  adaptar: (constancia): DatosDePantalla => {
    const obligaciones = Array.isArray(constancia['obligaciones'])
      ? constancia['obligaciones']
      : [];
    const seNiega = constancia['seNiega'] === true;
    const fecha = texto(constancia['fechaDeCorte']);

    const filas = obligaciones.filter(esObjeto).map((obligacion): readonly string[] => {
      const deuda = esObjeto(obligacion['deuda']) ? obligacion['deuda'] : undefined;
      const total = importeDe(deuda?.['total']);
      const pendiente = total !== undefined && !esCero(total.importe);
      return [
        texto(obligacion['tributo']),
        texto(obligacion['ejercicio']),
        pendiente ? 'Pendiente' : 'Cancelado',
        total?.importe ?? SIN_DATO,
      ];
    });

    return {
      fechaCalculo: fecha === SIN_DATO ? hoy() : (fecha as Fecha),
      reporte: {
        code: '',
        date: fecha === SIN_DATO ? '' : fecha,
        meta: [
          { k: 'Contribuyente', v: texto(constancia['codigoContribuyente']) },
          {
            k: 'Resultado',
            v: seNiega
              ? 'SE NIEGA — hay deuda pendiente'
              : 'SE EMITE — no se registra deuda pendiente',
          },
        ],
        filas,
        footer: seNiega
          ? 'No se otorga la constancia: el contribuyente registra saldo pendiente a la fecha de corte indicada.'
          : 'Documento emitido por el Sistema de Gestión Tributaria Municipal. La información corresponde al registro a la fecha de emisión.',
      },
    };
  },
});

/**
 * Padron vehicular consultable, con la deuda vigente de cada unidad (RF-024, #25, #184).
 *
 * «Base imponible S/» sale vacia a proposito: el recurso no manda ese campo —el impuesto al
 * patrimonio vehicular necesita valores referenciales bloqueados por D-02—, y un cero inventado
 * aqui seria una cifra que el backend no puede sustentar (RNF-083).
 *
 * «Afectación» es el rango `afectoDesde — afectoHasta` que ya manda el recurso —estructural,
 * `Vehiculo#rangoDeAfectacion`, ninguna cifra calculada aqui—, salvo que el vehiculo este de
 * baja: el prototipo dibuja «2019 — 2021», no una palabra («AFECTO»/«INAFECTO»), y eso es lo
 * que hay que mostrar.
 */
const consulta_vehiculos = definirConexion({
  operacion: 'consulta_vehiculos',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_vehiculos', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el padron vehicular'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (vehiculo): readonly Celda[] => {
        const deuda = importeDe(vehiculo['deuda']);
        return [
          { texto: texto(vehiculo['placa']) },
          { texto: texto(vehiculo['clase']) },
          { texto: `${texto(vehiculo['marca'])} ${texto(vehiculo['modelo'])}`.trim() },
          { texto: texto(vehiculo['anioFabricacion']) },
          { texto: texto(vehiculo['titular']) },
          { texto: afectacionDe(vehiculo) },
          { texto: SIN_DATO },
          { texto: deuda?.importe ?? SIN_DATO },
        ];
      },
      'vehículos',
    );

    return {
      fechaCalculo: fechaDeVehiculosDe(paginado.contenido),
      tabla,
    };
  },
});

/** `estado === 'BAJA'` gana; si no, el rango que ya manda el recurso. */
function afectacionDe(vehiculo: Readonly<Record<string, unknown>>): string {
  if (vehiculo['estado'] === 'BAJA') return 'BAJA';
  const desde = vehiculo['afectoDesde'];
  const hasta = vehiculo['afectoHasta'];
  if (typeof desde !== 'number' || typeof hasta !== 'number') return SIN_DATO;
  return `${desde} — ${hasta}`;
}

/** La fecha de corte con que se calculo la deuda de cualquier fila: todas comparten la misma. */
function fechaDeVehiculosDe(vehiculos: readonly unknown[]): Fecha {
  for (const vehiculo of vehiculos) {
    if (!esObjeto(vehiculo)) continue;
    const deuda = importeDe(vehiculo['deuda']);
    if (deuda !== undefined) return deuda.actualizadoA;
  }
  return hoy();
}

/**
 * Movimientos de alta y baja de deuda (RF-045, #24, #72): la lista de por que se debe lo que se
 * debe, cada linea con el asiento que la sustenta.
 *
 * El endpoint publica `AsientoResource` —la misma forma que `cuenta_corriente`—, no las columnas
 * de documento que dibuja el prototipo (Num. Docum., Cod. Municipal, Fec. Doc. Aprob....): un alta
 * o baja es, en este backend, un asiento mas del libro (ADR-0006), sin una tabla de expedientes
 * aparte. Cuatro columnas quedan vacias porque esa informacion no existe todavia en el asiento:
 *
 * - «Num. Docum.»: el asiento trae un solo campo de documento —`documentoOrigen`—, que va a «Doc.
 *   Aprob.»; no hay un correlativo interno distinto del documento que lo sustenta.
 * - «A/M» (automatica/manual): el propio `AltasBajasController` dice que nada distingue hoy un
 *   movimiento a mano de uno que produjo una emision masiva (#30, mas adelante).
 * - «Cod. Municipal»: el asiento guarda el identificador interno de la unidad (`predioId` /
 *   `vehiculoId`), no un codigo externo — mostrarlo aqui seria un dato que no es el que pide la
 *   columna.
 * - «Fec. Doc. Aprob.»: el asiento trae una sola fecha, `fechaValor`, que va a «Fecha Reg.»; no
 *   hay una segunda fecha de aprobacion por separado.
 *
 * «A/B» sale de `tipo`: un alta es `CARGO` y una baja `ABONO` (`MovimientoDeDeuda#enAsientos`).
 * «Est.» distingue si el asiento es el mismo el que reversa a otro (`asientoReversadoId`) — no si
 * a el lo reversaron despues, que esta fila sola no lo puede saber.
 */
const consulta_altas_bajas = definirConexion({
  operacion: 'consulta_altas_bajas',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_altas_bajas', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las altas y bajas'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (asiento): readonly Celda[] => {
        const monto = importeDe(asiento['monto']);
        const documento = texto(asiento['documentoOrigen']);
        return [
          { texto: SIN_DATO },
          { texto: aBDe(asiento['tipo']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: documento },
          { texto: SIN_DATO },
          { texto: monto?.actualizadoA ?? SIN_DATO },
          { texto: asiento['asientoReversadoId'] != null ? 'REVERSIÓN' : 'VIGENTE' },
        ];
      },
      'movimientos',
    );

    return {
      fechaCalculo: fechaDeAltasBajasDe(paginado.contenido),
      tabla,
    };
  },
});

/** `CARGO` incorpora deuda (alta); `ABONO` la extingue (baja) — `MovimientoDeDeuda#enAsientos`. */
function aBDe(tipo: unknown): string {
  if (tipo === 'CARGO') return 'ALTA';
  if (tipo === 'ABONO') return 'BAJA';
  return SIN_DATO;
}

/** La fecha valor del asiento mas reciente: todas las filas comparten como se calcularon. */
function fechaDeAltasBajasDe(asientos: readonly unknown[]): Fecha {
  let mayor: string | undefined;
  for (const asiento of asientos) {
    if (!esObjeto(asiento)) continue;
    const monto = importeDe(asiento['monto']);
    if (monto !== undefined && (mayor === undefined || monto.actualizadoA > mayor)) {
      mayor = monto.actualizadoA;
    }
  }
  return (mayor ?? hoy()) as Fecha;
}

/**
 * Historial de pagos de un contribuyente (RF-048, #25, #219): cada fila es el asiento `ABONO`
 * de concepto `PAGO` con que se registro el cobro — la misma forma que `consulta_altas_bajas`,
 * filtrada distinto.
 *
 * «Concepto» se lee del `tributo` del asiento y no de `concepto`: el backend ya filtro por
 * `concepto = PAGO`, asi que ese campo diria siempre lo mismo en las once filas; lo que
 * distingue un pago de otro es a que tributo se imputo.
 *
 * «Medio» y «Caja» salen vacias a proposito: ningun campo del asiento distingue el medio de
 * cobro ni la caja que lo atendio —esa distincion es de `tesoreria`, que todavia no existe—,
 * igual que documenta `ConsultaPagosController` en el backend.
 */
const consulta_pagos = definirConexion({
  operacion: 'consulta_pagos',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_pagos', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los pagos'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (asiento): readonly Celda[] => {
        const monto = importeDe(asiento['monto']);
        return [
          { texto: monto?.actualizadoA ?? SIN_DATO },
          { texto: texto(asiento['documentoOrigen']) },
          { texto: texto(asiento['tributo']) },
          { texto: texto(asiento['ejercicio']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: monto?.importe ?? SIN_DATO },
        ];
      },
      'pagos',
    );

    return {
      fechaCalculo: fechaDePagosDe(paginado.contenido),
      tabla,
    };
  },
});

/** La fecha valor del pago mas reciente: todas las filas comparten como se calcularon. */
function fechaDePagosDe(asientos: readonly unknown[]): Fecha {
  let mayor: string | undefined;
  for (const asiento of asientos) {
    if (!esObjeto(asiento)) continue;
    const monto = importeDe(asiento['monto']);
    if (monto !== undefined && (mayor === undefined || monto.actualizadoA > mayor)) {
      mayor = monto.actualizadoA;
    }
  }
  return (mayor ?? hoy()) as Fecha;
}

/**
 * Predios de un contribuyente, con la deuda de cada uno (#25, #72, #222).
 *
 * «Titular», «Uso», «Terreno m²» y «Const. m²» salen vacias a proposito: `PredioEncontradoResource`
 * no las publica todavia —el nombre necesita cruzar con el contribuyente, y uso/area son de la
 * ficha catastral, que esta pantalla no consulta—. «Autovalúo S/» tambien: depende de la
 * determinacion predial (#30, #188), bloqueada por D-02a. Solo el filtro «Contribuyente» resuelve
 * de verdad; «Código predial», «Calle», «Manzana» y «Lote» los ignora el backend (ver
 * `ConsultaPrediosController`), y por eso tampoco filtran aqui.
 */
const consulta_predios = definirConexion({
  operacion: 'consulta_predios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_predios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los predios'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (predio): readonly Celda[] => {
        const deuda = importeDe(predio['deuda']);
        return [
          { texto: texto(predio['codigoReferenciaCatastral']) },
          { texto: SIN_DATO },
          { texto: texto(predio['direccion']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: deuda?.importe ?? SIN_DATO },
        ];
      },
      'predios',
    );

    return {
      fechaCalculo: fechaDePrediosDe(paginado.contenido),
      tabla,
    };
  },
});

/** La fecha de corte con que se calculo la deuda de cualquier fila: todas comparten la misma. */
function fechaDePrediosDe(predios: readonly unknown[]): Fecha {
  for (const predio of predios) {
    if (!esObjeto(predio)) continue;
    const deuda = importeDe(predio['deuda']);
    if (deuda !== undefined) return deuda.actualizadoA;
  }
  return hoy();
}

/** Las opciones de Consultas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CONSULTAS: Readonly<Record<string, Conexion>> = {
  cuenta_corriente,
  consulta_deuda,
  constancia,
  consulta_vehiculos,
  consulta_altas_bajas,
  consulta_pagos,
  consulta_predios,
};
