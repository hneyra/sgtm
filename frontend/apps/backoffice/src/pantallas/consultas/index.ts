import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, hoy, leerObjeto, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Consultas, conectado hasta donde llega el backend: **tres opciones de once**.
 *
 * `cuenta_corriente` (#21) ya estaba. Se suman `consulta_deuda` (#22, #175) y
 * `constancia` (#25, #179). Las otras ocho —`consulta_unificada`,
 * `consulta_resumen_predial`, `consulta_altas_bajas`, `consulta_pagos`,
 * `consulta_predios`, `consulta_vehiculos`, `consulta_valores`,
 * `consulta_deudas_beneficio`— siguen esperando su backend.
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

const esObjeto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

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
        const deuda = esObjeto(obligacion['deuda']) ? obligacion['deuda'] : undefined;
        const insoluto = importeDe(deuda?.['insoluto']);
        const reajuste = importeDe(deuda?.['reajuste']);
        const interes = importeDe(deuda?.['interes']);
        const gasto = importeDe(deuda?.['gasto']);
        const total = importeDe(deuda?.['total']);
        return [
          { texto: texto(obligacion['ejercicio']) },
          { texto: texto(obligacion['tributo']) },
          { texto: cuotaDe(obligacion['periodoDesde'], obligacion['periodoHasta']) },
          { texto: insoluto?.importe ?? SIN_DATO },
          { texto: reajuste?.importe ?? SIN_DATO },
          { texto: interes?.importe ?? SIN_DATO },
          { texto: gasto?.importe ?? SIN_DATO },
          { texto: total?.importe ?? SIN_DATO },
          { texto: texto(obligacion['fase']) },
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

/** La fecha de corte con que se calculo, de cualquier obligacion: las cinco cifras la comparten. */
function fechaDeCorteDe(obligaciones: readonly unknown[]): Fecha {
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

/** Las opciones de Consultas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CONSULTAS: Readonly<Record<string, Conexion>> = {
  cuenta_corriente,
  consulta_deuda,
  constancia,
};
