import type { Celda, DatosDePantalla, Total } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { importeDe } from '@sgtm/lectura';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, esObjeto, hoy, leerObjeto, leerPaginado, tablaDe, texto } from '../seguridad/listado';
import { fechaDeCorteDe, obligacionDeDeuda } from '../consultas';

/**
 * Tesorería, conectada hasta donde llega el backend: **cinco opciones de diez** (#74, esta
 * pasada).
 *
 * Cuatro son `GET` con `Controller` desde antes de esta conexión —`ConvenioController` (#35),
 * `ReciboController` (#34) y `RecaudacionController` (#36)—, y hasta aquí salían por el camino
 * común: el proxy servía `RESPUESTAS[pantalla]` sin envolver, con la forma que comparten las 134.
 * Desde que `packages/api-mock/src/recursos.ts` empezó a hablar con la forma real del `Resource`
 * de cada una, esa forma dejó de coincidir con la que el camino común espera —`tabla.filas`, no
 * `contenido` ni un objeto suelto— y sin esta conexión la tabla se dibuja vacía, en silencio,
 * exactamente el defecto que #363 ya documentó para tránsito y coactiva.
 *
 * La quinta, `caja_tributaria`, es distinta: su operación (`POST /tesoreria/caja/cobranza`) no
 * se pide al abrir —una pantalla no puede lanzar un cobro—, así que lo que se lee no es la suya:
 * es `consulta_deuda`, exactamente el mismo mecanismo que ya usa `baja_deuda` (#332,
 * `pantallas/rentas/index.ts`). Su bloque de búsqueda sale de `filtrosPropios`
 * (`pantallas/tesoreria/composicion.ts`): el catálogo de esta opción no declara `filtros`.
 *
 * `caja_tasas`, `fraccionamiento`, `anulacion_recibo`, `anulacion_convenio` y `cierre_caja`
 * siguen sin conectar: las cinco son `POST` y ninguna tiene todavía una lectura propia que
 * alimentarla (`tesoreria.test.tsx`).
 */

/* ── Consulta de convenios ────────────────────────────────────────────────── */

/**
 * Convenios de fraccionamiento, listado (`ConvenioResource.FilaResource`, RF-084, #35).
 *
 * Las columnas del catálogo ya llevan el nombre del campo real —`nroConvenio`, `contribuyente`,
 * `fecha`, `deudaAcogidaS`, `cuotas`, `pagadas`, `vencidas`, `saldoS`, `estado`—: no hay ninguna
 * que reescribir, solo que leer con su tipo.
 */
const consulta_convenios = definirConexion({
  operacion: 'consulta_convenios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_convenios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los convenios de fraccionamiento'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (convenio): readonly Celda[] => [
          { texto: texto(convenio['nroConvenio']) },
          { texto: texto(convenio['contribuyente']) },
          { texto: texto(convenio['fecha']) },
          { texto: texto(convenio['deudaAcogidaS']) },
          { texto: texto(convenio['cuotas']) },
          { texto: texto(convenio['pagadas']) },
          { texto: texto(convenio['vencidas']) },
          { texto: texto(convenio['saldoS']) },
          { texto: texto(convenio['estado']) },
        ],
        'convenios',
      ),
    ),
});

/* ── Duplicado de recibo ──────────────────────────────────────────────────── */

/**
 * El duplicado de un recibo (`DuplicadoResource`, RF-082, #34).
 *
 * `GET /tesoreria/recibos/{nro}/duplicado` pide el número **en la ruta**, y esta pantalla no
 * tiene parámetro de ruta: el catálogo lo pide como filtro, «Nro. de recibo» (`nroDeRecibo`).
 * `parametros` hace la traducción — sin ella el filtro se tecleaba y no viajaba, igual que le
 * pasaba a `unidadPredioPlaca` de `alta_deuda` antes de #331.
 *
 * `ReciboResource` no publica el nombre del contribuyente en ningún sitio de este endpoint: la
 * columna «Contribuyente» del prototipo sale con {@link SIN_DATO} (RNF-083), igual que
 * `papeletas` deja sin dato la columna que su recurso no tiene.
 */
const duplicado_recibo = definirConexion({
  operacion: 'duplicado_recibo',
  parametros: ({ busqueda }) => ({
    ...parametrosDeBusqueda('duplicado_recibo', undefined, busqueda),
    // El número va en la ruta del contrato (`{nro}`), y el catálogo lo pide como
    // filtro, «Nro. de recibo»: sin esta traducción se tecleaba y no viajaba.
    nro: (busqueda.get('nroDeRecibo') ?? '').trim(),
  }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el duplicado del recibo'),
  exige: [
    {
      parametro: 'nroDeRecibo',
      titulo: 'Escribe el número de recibo',
      detalle:
        'El duplicado se pide por el número impreso en el papel, serie-correlativo: «001-0000123». Escríbelo arriba y pulsa «Buscar».',
    },
  ],
  adaptar: (duplicado): DatosDePantalla => {
    const recibo = esObjeto(duplicado['recibo']) ? duplicado['recibo'] : {};
    const total = importeDe(recibo['total']);
    const emitidoEn = texto(recibo['emitidoEn']);
    const [fecha, resto = ''] = emitidoEn === SIN_DATO ? [SIN_DATO] : emitidoEn.split('T');
    const hora = resto.slice(0, 5) || SIN_DATO;
    const lineas = Array.isArray(recibo['lineas']) ? recibo['lineas'] : [];
    const conceptos = lineas
      .filter(esObjeto)
      .map((linea) => texto(linea['tributo']))
      .filter((valor) => valor !== SIN_DATO);
    const fila: readonly Celda[] = [
      { texto: texto(recibo['numero']) },
      { texto: fecha ?? SIN_DATO },
      { texto: hora },
      // El recurso no publica el nombre del contribuyente (arriba, en el docblock).
      { texto: SIN_DATO },
      { texto: conceptos.length > 0 ? conceptos.join(', ') : SIN_DATO },
      { texto: total?.importe ?? SIN_DATO },
      { texto: texto(duplicado['duplicados']) },
      { texto: texto(duplicado['estado']) },
    ];
    return {
      fechaCalculo: total?.actualizadoA ?? hoy(),
      tabla: { filas: [fila], conteo: '1 recibo' },
    };
  },
});

/* ── Avance de recaudación y recaudación por área ─────────────────────────── */

/**
 * Cuánto hay en cada total: los tres importes que `RecaudacionResource.Avance` publica de
 * verdad, con su fecha (regla 9). El resto de la fila del prototipo — «Emitido», «Saldo»,
 * «% avance», «Meta», «% de meta» — no tiene con qué llenarse: la meta no tiene tabla y lo
 * emitido son cargos del libro, que este contexto no lee (javadoc de `RecaudacionResource`).
 * Inventar un número ahí mostraría un avance que nadie calculó.
 */
function totalesDeRecaudacion(objeto: Readonly<Record<string, unknown>>): Total[] {
  const cobrado = importeDe(objeto['cobrado']);
  const anulado = importeDe(objeto['anulado']);
  const neto = importeDe(objeto['neto']);
  return [
    { label: 'Cobrado', value: cobrado?.importe ?? SIN_DATO },
    { label: 'Anulado', value: anulado?.importe ?? SIN_DATO },
    { label: 'Neto', value: neto?.importe ?? SIN_DATO },
  ];
}

function fechaDe(objeto: Readonly<Record<string, unknown>>): Fecha {
  const aLaFecha = objeto['aLaFecha'];
  return (typeof aLaFecha === 'string' && aLaFecha !== '' ? aLaFecha : hoy()) as Fecha;
}

const avance_recaudacion = definirConexion({
  operacion: 'avance_recaudacion',
  parametros: ({ busqueda }) => parametrosDeBusqueda('avance_recaudacion', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el avance de recaudación'),
  adaptar: (avance): DatosDePantalla => {
    const filas = Array.isArray(avance['filas']) ? avance['filas'].filter(esObjeto) : [];
    return {
      fechaCalculo: fechaDe(avance),
      tabla: {
        filas: filas.map((fila): readonly Celda[] => {
          const cobrado = importeDe(fila['cobrado']);
          return [
            { texto: texto(fila['tributo']) },
            // Emitido, Saldo, % avance, Meta y % de meta: sin dato (arriba).
            { texto: SIN_DATO },
            { texto: cobrado?.importe ?? SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
          ];
        }),
        conteo: `${filas.length} tributos`,
      },
      totales: totalesDeRecaudacion(avance),
    };
  },
});

const recaudacion_area = definirConexion({
  operacion: 'recaudacion_area',
  parametros: ({ busqueda }) => parametrosDeBusqueda('recaudacion_area', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'la recaudación por área'),
  adaptar: (distribucion): DatosDePantalla => {
    const filas = Array.isArray(distribucion['filas'])
      ? distribucion['filas'].filter(esObjeto)
      : [];
    return {
      fechaCalculo: fechaDe(distribucion),
      tabla: {
        filas: filas.map((fila): readonly Celda[] => {
          const cobrado = importeDe(fila['cobrado']);
          return [
            { texto: texto(fila['partida']) },
            { texto: texto(fila['tributo']) },
            { texto: cobrado?.importe ?? SIN_DATO },
          ];
        }),
        conteo: `${filas.length} partidas`,
      },
      totales: [
        ...totalesDeRecaudacion(distribucion),
        {
          label: 'Sin partida',
          value: importeDe(distribucion['netoSinPartida'])?.importe ?? SIN_DATO,
        },
      ],
    };
  },
});

/* ── Caja tributaria: la deuda del contribuyente que se va a cobrar ──────── */

/**
 * La deuda del contribuyente, para elegir qué cobrar (RF-041, RF-093, #332, #74).
 *
 * Misma lectura que `baja_deuda`: `GET /consultas/deuda`, con el mismo `sinPermiso` —quien
 * tenga «Caja tributaria» y no lectura de «Consulta de deuda» recibe el 403 de la segunda
 * opción, y hay que decir cuál falta— y el mismo `exige`, adaptado a esta pantalla: aquí no
 * hay «Buscar un contribuyente para verla», hay «cárgala antes de cobrar».
 *
 * A diferencia de `baja_deuda`, esta tabla **no elige filas** (`composicion.ts` no le declara
 * `seleccion`): «Cargar deudas» las trae todas a la vista, y lo que se cobra lo decide el
 * formulario de arriba —forma de pago, beneficio— cobrando la deuda entera. La primera
 * columna sale vacía igual, porque es la que dibuja el catálogo (`campo`), sin inventarle
 * una casilla que esta pantalla no tiene declarada.
 */
const caja_tributaria = definirConexion({
  operacion: 'consulta_deuda',
  parametros: ({ busqueda }) => parametrosDeBusqueda('consulta_deuda', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda del contribuyente'),
  exige: [
    {
      parametro: 'codContribuyente',
      titulo: 'Escribe el código del contribuyente',
      detalle:
        'La caja cobra la deuda de un contribuyente a la vez: escribe su código arriba y pulsa «Buscar» para cargarla.',
    },
  ],
  sinPermiso: {
    titulo: 'Falta el permiso de lectura de «Consulta de deuda»',
    detalle:
      'Para cargar la deuda hace falta lectura de «Consulta de deuda»: la tabla de aquí es la deuda del contribuyente, y esa la publica esa otra opción. Pídesela al administrador del sistema de tu municipalidad.',
  },
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeCorteDe(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (obligacion): readonly Celda[] => {
        const leida = obligacionDeDeuda(obligacion);
        return [
          { texto: '' },
          { texto: leida.ejercicio },
          { texto: SIN_DATO },
          { texto: leida.cuota },
          { texto: leida.tributo },
          { texto: leida.fase },
          { texto: leida.insoluto },
          { texto: leida.reajuste },
          { texto: leida.interes },
          { texto: leida.gasto },
          { texto: leida.total },
        ];
      },
      'cuotas',
    ),
  }),
});

/** Las opciones de Tesorería conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_TESORERIA: Readonly<Record<string, Conexion>> = {
  consulta_convenios,
  duplicado_recibo,
  avance_recaudacion,
  recaudacion_area,
  caja_tributaria,
};
