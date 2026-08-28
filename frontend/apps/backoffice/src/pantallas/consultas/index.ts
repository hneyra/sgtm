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
 * Consultas, conectado hasta donde llega el backend: **las once opciones**.
 *
 * `cuenta_corriente` (#21) ya estaba. Se sumaron `consulta_deuda` (#22, #175),
 * `constancia` (#25, #179), `consulta_vehiculos` (#25, #184),
 * `consulta_altas_bajas` (#24, #186), `consulta_pagos` (#25, #219),
 * `consulta_predios` (#25, #222), `consulta_unificada`,
 * `consulta_resumen_predial` y `consulta_valores` (#25, #72), y con la ultima
 * —`consulta_deudas_beneficio` (#72)— el modulo queda entero.
 *
 * **La ultima llego sin inventarse su cifra**, que era el motivo por el que
 * faltaba. Un beneficio cambia el importe que se debe, y cuanto descuenta lo
 * dice una ordenanza local (D-02b) o un acuerdo de concejo (D-02c). La salida no
 * fue esperar a que se firmen: fue que **la campana y su descuento sean dato**
 * del conjunto de parametros sellado. Mientras no haya ninguna publicada, la
 * lista de campanas sale vacia y simular contra una da un 422 que nombra la
 * llave que falta; ninguna cifra se inventa por el camino.
 *
 * Las tres que entran aqui traen, cada una, **una ausencia declarada**, y las
 * tres tienen el mismo origen: el impuesto predial se determina por
 * contribuyente y no por predio (NEG-05 §1), y el valuo y los arbitrios
 * dependen de tablas sin firmar (D-02a, D-02b). Lo que el recurso no publica
 * sale con {@link SIN_DATO}; lo que ni siquiera es una fila —la rejilla
 * «Impuesto anual» de la unificada— sale vacia y con su aviso permanente
 * (`prosa-textos.ts`). Ninguna cifra se compone aqui (RNF-083).
 */

/**
 * Un importe con su fecha, tal como lo publica `ImporteActualizado`.
 *
 * Los dos juntos o ninguno: una cifra sin fecha es una cifra que dentro de tres
 * dias es otra (regla 9, RNF-075). Se lee asi y no como dos campos sueltos
 * porque asi es como el backend impide que se separen.
 */
export interface ImporteConFecha {
  readonly importe: string;
  readonly actualizadoA: Fecha;
}

/**
 * Se exporta por lo mismo que {@link obligacionDeDeuda}: **la ficha 360° lee las
 * seis rejillas de la misma respuesta** (#297, ADR-0016 §2), y todas sus cifras
 * viajan con esta forma. Dos lecturas del mismo par acabarían leyendo campos
 * distintos —y una de las dos, el importe sin su fecha—; se lee una vez.
 */
export function importeDe(valor: unknown): ImporteConFecha | undefined {
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

/**
 * La ficha consolidada de un contribuyente (RF-046, #25, #72).
 *
 * `ConsultaUnificadaResource` no es un listado: es **un objeto** con una
 * cabecera, un resumen de saldos y seis rejillas paginadas dentro. De todo eso,
 * el renderizador de esta opcion dibuja el «Resumen de saldos» —las cinco cifras
 * y la frase que las explica, que el catalogo declara como campos de solo
 * lectura— y su fecha de corte.
 *
 * **La tabla «Impuesto anual» sale vacia, y es lo unico honesto que se puede
 * hacer con ella.** Sus trece columnas son valuo afecto, valuo exonerado, valuo
 * total, impuesto predial y los cuatro arbitrios por ejercicio, y el recurso
 * **no publica ninguna**: el predial se determina por contribuyente y no por
 * predio (NEG-05 §1), y el valuo y los arbitrios dependen de tablas sin firmar
 * (D-02a, D-02b). Rellenarla repartiendo cifras entre ejercicios produciria
 * numeros plausibles que nadie podria sustentar en una reclamacion. Lo que
 * explica el hueco es el aviso permanente de la opcion (`prosa-textos.ts`), no
 * un cero.
 *
 * Las seis rejillas de las pestañas —deudas, pagos, altas y bajas,
 * fraccionamientos, valores y declaraciones— **si viajan** en la respuesta, y
 * aqui no se dibujan porque el catalogo no declara ninguna tabla para ellas:
 * sus pestañas son solo criterios. Cada una tiene ademas su propia opcion del
 * menu, ya conectada, con sus filtros de verdad.
 *
 * Sin contribuyente no hay ficha: `GET /consultas/unificada` lo declara
 * obligatorio y un codigo que no existe da 404, no una ficha vacia.
 */
const consulta_unificada = definirConexion({
  operacion: 'consulta_unificada',
  parametros: ({ ruta, busqueda }) => ({
    ...parametrosDeBusqueda('consulta_unificada', undefined, busqueda),
    // El codigo de la ruta manda sobre el filtro: es el registro que se abrio.
    // Sin el, sigue valiendo el que el filtro «Contribuyente» haya puesto en la
    // direccion, que es como se llega a esta pantalla desde la busqueda.
    ...(ruta['codigo'] === undefined || ruta['codigo'] === ''
      ? {}
      : { contribuyente: ruta['codigo'] }),
  }),
  exige: [
    {
      parametro: 'contribuyente',
      titulo: 'Busca un contribuyente para ver su ficha unificada',
      detalle:
        'Esta consulta consolida lo de una sola persona: escribe su código arriba y pulsa «Buscar». Sin él no hay ficha que pedir.',
    },
  ],
  leer: (cuerpo) => leerObjeto(cuerpo, 'la consulta unificada'),
  adaptar: (ficha): DatosDePantalla => {
    const resumen = esObjeto(ficha['resumenDeSaldos']) ? ficha['resumenDeSaldos'] : undefined;
    const cifra = (nombre: string): string => importeDe(resumen?.[nombre])?.importe ?? SIN_DATO;
    const aLaFecha = texto(ficha['aLaFecha']);

    return {
      // La fecha de corte con la que el backend respondio todo lo que depende de
      // hoy. Sale de la respuesta, no del reloj del navegador (regla 9).
      fechaCalculo: aLaFecha === SIN_DATO ? hoy() : (aLaFecha as Fecha),
      campos: {
        insoluto: cifra('insoluto'),
        reajuste: cifra('reajuste'),
        interes: cifra('interes'),
        gasto: cifra('gasto'),
        total: cifra('total'),
        // Redactado por el backend, no compuesto aqui (RNF-080, RNF-083): el
        // dia que el total y el desglose discreparan, la frase que los explica
        // tiene que venir del mismo sitio que las cifras.
        estadoDeLaConsulta: texto(resumen?.['estadoDeLaConsulta']),
      },
      // Sin `tabla`: la rejilla «Impuesto anual» se dibuja vacia. Ver arriba.
    };
  },
});

/**
 * Predios de un sector o de un contribuyente, con su ficha vigente (RF-046, #25, #72).
 *
 * `PredioDelResumenResource` publica exactamente las cuatro columnas que dibuja
 * «Predios encontrados» —codigo catastral, codigo y nombre del propietario y
 * direccion— y **ningun importe**. Las dos pestañas de cifras del prototipo
 * quedan por tanto en {@link SIN_DATO}, cada una por su motivo:
 *
 * - «Impuesto Predial» (insoluto, reajuste, interes, gasto y total del predio):
 *   no existe esa cifra. Los tramos progresivos se aplican al conjunto de los
 *   predios del contribuyente (NEG-05 §1), asi que atribuir una parte a un
 *   predio concreto obliga a inventar un reparto.
 * - «Valúo Predial / Arbitrios» (valuo afecto y los cuatro servicios): depende
 *   de las tablas de valores unitarios, depreciacion y aranceles (D-02a) y de
 *   ordenanzas sin ratificar (D-02b). Un cero aqui se leeria como «este predio
 *   no paga arbitrios», que es peor que la ausencia.
 *
 * La tercera pestaña, «Movimientos del Predio», ya esta publicada en otra ruta:
 * el historico versionado de la ficha sale por
 * `GET /catastro/fichas/{tipo}/{cod}?historico=true`, y cada fila de esta tabla
 * lleva el `codCatastral` y el `tipo` con que pedirlo.
 *
 * El filtro «Palabra» **se dibuja y no se manda** (`consultas/composicion.ts`):
 * `ResumenPredialController` lo rechaza con 422 con cualquier valor, porque es
 * texto libre sin columna a la que apuntar.
 */
const consulta_resumen_predial = definirConexion({
  operacion: 'consulta_resumen_predial',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('consulta_resumen_predial', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los predios del resumen'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (predio): readonly Celda[] => [
        { texto: texto(predio['codCatastral']) },
        { texto: texto(predio['codPropietario']) },
        { texto: texto(predio['nombreDelPropietario']) },
        { texto: texto(predio['direccionDelPredio']) },
      ],
      'predios',
    );

    return {
      // **Ninguna cifra viaja en esta respuesta**, asi que no hay ninguna que
      // fechar con lo que mando el backend. La fecha es la del cliente porque
      // es tambien la que el controlador usa cuando la peticion no lleva
      // `fecha`: el listado son las fichas vigentes a hoy.
      fechaCalculo: hoy(),
      tabla,
      // **Sin `campos`**, y por eso las diez cifras de las dos pestañas se
      // dibujan con un guion: un campo de solo lectura sin valor lo pinta el
      // propio `Campo`, que nunca deja una cadena vacia. Declararlas aqui una a
      // una con «—» no anadiria nada al dibujo y sugeriria que el adaptador
      // sabe algo de ellas que no sabe. Lo que dice por que no estan es el
      // aviso permanente de la opcion.
    };
  },
});

/**
 * Valores emitidos a un contribuyente, con su situacion de hoy (RF-041, #25, #72).
 *
 * Se diferencia de `valores_busqueda` (RF-092) en lo que anade:
 * `ValorConsultadoResource` trae el tributo y el periodo que el valor formaliza,
 * la fecha en que se notifico y —sobre todo— **en que punto de la cobranza esta
 * a dia de hoy**, que no es la columna `estado` sino una funcion de ella y de la
 * fecha (`SituacionDelValor`).
 *
 * «Estado» de la tabla se dibuja con esa `situacion` y **no se reescribe a las
 * etiquetas del prototipo**: el backend ya redacta (RNF-080), y ademas «FIRME»
 * y «RECLAMADO» no son lo mismo que EXIGIBLE y que nada. Lo unico que anade
 * esta pantalla es el tono, para que el estado no se comunique solo por color
 * (FRO-02 §2.1) ni solo por texto.
 *
 * `tipo` sale tal cual lo publica el recurso —`OP`, `RD`, `RM`—, por el mismo
 * motivo y con el mismo criterio que `valores_busqueda`.
 *
 * Los cuatro filtros los resuelve el backend con el vocabulario del prototipo:
 * «ORDEN DE PAGO» y «RES. DETERMINACIÓN» se reconocen igual que `OP` y `RD`,
 * «Todos» es la ausencia de filtro y «FIRME» es EXIGIBLE. **«RECLAMADO» no**:
 * no hay reclamacion de valores en el dominio todavia, y el backend responde
 * 422 con el motivo en vez de devolver el listado completo. Se deja viajar a
 * proposito —ese 422 explica lo que pasa; ignorar el filtro enseñaria todos los
 * valores a quien cree estar viendo solo los reclamados—.
 */
const consulta_valores = definirConexion({
  operacion: 'consulta_valores',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_valores', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los valores emitidos'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (valor): readonly Celda[] => {
        const monto = importeDe(valor['monto']);
        return [
          { texto: texto(valor['numero']) },
          { texto: texto(valor['tipo']) },
          { texto: texto(valor['contribuyente']) },
          { texto: texto(valor['tributo']) },
          { texto: texto(valor['periodo']) },
          { texto: monto?.importe ?? SIN_DATO },
          { texto: texto(valor['notificadoEl']) },
          situacionDe(valor['situacion']),
        ];
      },
      'valores',
    );

    return {
      fechaCalculo: fechaDeValoresDe(paginado.contenido),
      tabla,
    };
  },
});

/**
 * El tono de la situacion. **El texto es siempre el que manda el backend**: aqui
 * solo se decide con que color acompañarlo, y nunca en lugar de la palabra.
 */
function situacionDe(situacion: unknown): Celda {
  const nombre = texto(situacion);
  if (nombre === 'PAGADO') return { texto: nombre, tono: 'ok' };
  if (nombre === 'COACTIVA' || nombre === 'EXIGIBLE') return { texto: nombre, tono: 'bad' };
  if (nombre === 'EMITIDO' || nombre === 'NOTIFICADO') return { texto: nombre, tono: 'warn' };
  return { texto: nombre };
}

/**
 * La fecha del valor emitido mas recientemente.
 *
 * **No es la de hoy, y por eso no sale del reloj.** El desglose de un valor esta
 * congelado a su `proyectadoA` —la fecha a la que se proyectaron los importes
 * cuando se emitio (AC de #37)—, asi que reimprimirlo dos años despues devuelve
 * los mismos importes. Es la misma eleccion que hace `cuenta_corriente` con los
 * asientos del libro: la fecha que se pinta encima es la de la cifra mas nueva
 * de las que se ven.
 *
 * `situacionA` es otra fecha y otra cosa —el dia desde el que se miro si el
 * plazo vencio—, y no se pinta aqui: la banda dice «cifras actualizadas al», y
 * la situacion no es una cifra.
 */
function fechaDeValoresDe(valores: readonly unknown[]): Fecha {
  let mayor: string | undefined;
  for (const valor of valores) {
    if (!esObjeto(valor)) continue;
    const monto = importeDe(valor['monto']);
    if (monto !== undefined && (mayor === undefined || monto.actualizadoA > mayor)) {
      mayor = monto.actualizadoA;
    }
  }
  return (mayor ?? hoy()) as Fecha;
}

/**
 * Simulacion del acogimiento a una campana de beneficio (RF-107, #72).
 *
 * **Simula, no acoge.** El backend no mueve un asiento: responde que quedaria
 * por pagar si esta deuda se acogiera hoy. Por eso la pantalla no habilita
 * ninguna escritura —«Bajar deuda» sigue con su impedimento, como cualquier acto
 * sin operacion declarada—.
 *
 * **Las campanas son dato, no codigo.** El desplegable «Benef. aplicable» del
 * prototipo lista cuatro ordenanzas de Sullana; las que valen son las que el
 * conjunto de parametros sellado de **esta** municipalidad publica, y viajan en
 * `campaniasAplicables`. Hoy no hay ninguna —son D-02b y D-02c—, asi que elegir
 * cualquiera de las cuatro devuelve un 422 que **nombra la llave que falta**
 * (`BENEFICIO:<CAMPANIA>`). Se deja viajar a proposito, con el mismo criterio
 * que «RECLAMADO» en `consulta_valores`: ese error explica lo que pasa, y
 * bloquear el filtro escondería que la campana no esta cargada.
 *
 * **Cinco columnas de la tabla salen vacias**, y ninguna por descuido:
 * «Convenio», «Cuota», «Fase», «Conc.» y «Est.» no las publica
 * `ObligacionPublica` —el puerto de `cuentacorriente` entrega el desglose que
 * otro contexto necesita para formalizar deuda, no la fila de una rejilla de
 * cobranza—. Quien las necesite tiene `consulta_deuda`, que si las trae porque
 * vive dentro de ese contexto. «Trib.» es el codigo del tributo y el recurso
 * publica su nombre: va a «Nom. Trib.», que es lo que es.
 *
 * Ninguna cifra se compone aqui (RNF-083): el total, lo acogido, el ahorro y lo
 * que quedaria los calcula el servidor, cada uno con su fecha.
 */
const consulta_deudas_beneficio = definirConexion({
  operacion: 'consulta_deudas_beneficio',
  parametros: ({ ruta, busqueda }) => ({
    ...parametrosDeBusqueda('consulta_deudas_beneficio', undefined, busqueda),
    // El codigo de la ruta manda sobre el filtro: es el registro que se abrio.
    ...(ruta['codigo'] === undefined || ruta['codigo'] === ''
      ? {}
      : { contribuyente: ruta['codigo'] }),
  }),
  exige: [
    {
      parametro: 'contribuyente',
      titulo: 'Busca un contribuyente para simular su acogimiento',
      detalle:
        'El acogimiento se simula sobre la deuda de una persona: escribe su código arriba y pulsa «Buscar». Sin él no hay deuda que acoger.',
    },
  ],
  leer: (cuerpo) => leerObjeto(cuerpo, 'la simulación del acogimiento'),
  adaptar: (simulacion): DatosDePantalla => {
    const contribuyente = esObjeto(simulacion['contribuyente'])
      ? simulacion['contribuyente']
      : undefined;
    const beneficio = esObjeto(simulacion['simulacion']) ? simulacion['simulacion'] : undefined;
    const aLaFecha = texto(simulacion['aLaFecha']);
    const cifra = (valor: unknown): string => importeDe(valor)?.importe ?? SIN_DATO;

    const obligaciones = esObjeto(simulacion['obligaciones'])
      ? leerPaginado(simulacion['obligaciones'], 'las obligaciones acogidas')
      : leerPaginado({ contenido: [] }, 'las obligaciones acogidas');

    const tabla = tablaDe(
      obligaciones,
      (obligacion): readonly Celda[] => [
        { texto: texto(obligacion['ejercicio']) },
        { texto: texto(obligacion['predioId'] ?? obligacion['vehiculoId']) },
        // Convenio, Cuota, Fase, Conc. y Est.: ver el comentario de arriba.
        { texto: SIN_DATO },
        { texto: SIN_DATO },
        { texto: SIN_DATO },
        { texto: texto(obligacion['tributo']) },
        { texto: SIN_DATO },
        { texto: SIN_DATO },
        { texto: SIN_DATO },
        { texto: cifra(obligacion['insoluto']) },
        { texto: cifra(obligacion['reajuste']) },
        { texto: cifra(obligacion['interes']) },
        { texto: cifra(obligacion['gasto']) },
        { texto: cifra(obligacion['total']) },
      ],
      'obligaciones',
    );

    return {
      // La fecha de corte con la que el servidor calculo todo. Sale de la
      // respuesta, no del reloj del navegador (regla 9).
      fechaCalculo: aLaFecha === SIN_DATO ? hoy() : (aLaFecha as Fecha),
      campos: {
        contribuyente2: texto(contribuyente?.['nombre']),
        domicilioFiscal: texto(contribuyente?.['domicilioFiscal']),
        fechaDeConsulta: aLaFecha,
        deudaTotalS: cifra(simulacion['deudaTotal']),
        deudaAcogidaS: cifra(simulacion['deudaAcogida']),
        registrosAcogidos: texto(simulacion['registrosAcogidos']),
        // Las tres del descuento **solo existen con campana elegida**. Sin ella
        // el recurso manda `simulacion: null`, y un cero aqui se leeria como
        // «no te ahorras nada», que es una afirmacion sobre una campana que
        // nadie eligio.
        deudaConBeneficioS: cifra(beneficio?.['deudaConBeneficio']),
        beneficioS: cifra(beneficio?.['ahorro']),
        // El rotulo del prototipo dice «Tasa aplicada (%)» y se conserva
        // (RNF-080); el contrato la llama `alicuotaAplicada`, que es como se
        // llama un porcentaje (regla 8).
        tasaAplicada: texto(beneficio?.['alicuotaAplicada']),
      },
      tabla,
    };
  },
});

/** Las opciones de Consultas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CONSULTAS: Readonly<Record<string, Conexion>> = {
  consulta_deudas_beneficio,
  cuenta_corriente,
  consulta_deuda,
  constancia,
  consulta_vehiculos,
  consulta_altas_bajas,
  consulta_pagos,
  consulta_predios,
  consulta_unificada,
  consulta_resumen_predial,
  consulta_valores,
};
