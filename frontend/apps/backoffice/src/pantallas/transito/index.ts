import type { Celda, DatosDePantalla, Paginado, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  datosDe,
  esObjeto,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';

/**
 * Tránsito, conectado hasta donde llega el backend: **veintiuna de veintitrés
 * opciones** (#77, sobre `papeletas` de #363).
 *
 * Los cinco `Controller` de solo lectura de `sgtm-sanciones` publican
 * `PapeletaResource` (`papeletas`, `transito_busqueda`, `transito_estado_cuenta`
 * — las tres leen el mismo repositorio con otro criterio), `PapeletaDelPadronResource`
 * (los tres padrones y los dos records), `CodigoInfraccionResource`,
 * `InternamientoResource`, `ExpedienteResource` (`transito_documentos`) y
 * `ResumenDePapeletasResource` (`transito_resumen_codigo`/`_placa`). Cada
 * `leer` abre el sobre que el contrato todavia no describe; cada `adaptar`
 * traduce con los nombres del recurso, nunca con los del catalogo del
 * prototipo (RNF-080).
 *
 * **Dos resúmenes se quedan sin conectar, y no por descuido.**
 * `AgrupacionDelResumen` (`backend/sgtm-sanciones/.../dominio/AgrupacionDelResumen.java`)
 * solo agrupa por `ESTADO`, `CODIGO`, `PLACA` o `MES` — no existe una
 * agrupación por año. `transito_resumen_codigo` y `transito_resumen_placa`
 * encajan letra por letra con `CODIGO`/`PLACA`: cada columna del catálogo tiene
 * su campo en `Linea`. Pero `transito_resumen_papeletas` dibuja «Año» como
 * primera columna, y ningún agrupador de `ResumenDePapeletasResource` produce
 * un año — conectarla con `ESTADO` (la opción por omisión del backend)
 * pondría nombres de estado bajo un rótulo que dice «Año», y RNF-080 no lo
 * permite. `transito_resumen_recaudacion` tiene el mismo problema **y** uno
 * peor: sus columnas «Ordinaria S/»/«Coactiva S/»/«Convenios S/» piden pivotar
 * varias `Linea` de `RecaudacionDeMultasResource` en una sola fila por mes —
 * que no suma nada, solo reordena—, pero su columna «Total S/» no tiene de
 * donde salir sin sumarlas (RNF-083): el recurso solo publica el total
 * **general**, no uno por mes. Las dos se quedan como estaban.
 *
 * **Seis escrituras.** `transito_cambio_numero` y `transito_valores` viven en
 * su propio componente (`COMPONENTES_PROPIOS` de `Pantalla.tsx`), por el mismo
 * motivo que `pase_coactiva` (#75): el catálogo dibuja sus acciones sin la que
 * escribe al final. `transito_descargos`, `transito_constancia_libre`,
 * `transito_rg_ordinaria` y `transito_rg_sancionadora` van en `ACTOS_SIN_CAMPO`
 * (`pantallas/actos.ts`): a las cuatro les falta un dato que ninguna sección
 * de su pantalla dibuja editable —el número de expediente de un descargo nuevo
 * es un campo `"ro"`, y las tres restantes no declaran ni una sola sección.
 */

/**
 * `EstadoDePapeleta` (V4), con el mismo tono en las cinco lecturas que lo
 * publican: el recurso manda siempre el nombre literal del enum —«Pendiente»,
 * «Con descargo» y compañía son etiquetas del catálogo, no valores reales
 * (RNF-080)—.
 *
 * `RESUELTA` queda sin tono: puede significar que el descargo prosperó o que
 * se desestimó, y el recurso no distingue cuál de las dos fue.
 */
const TONO_DEL_ESTADO_DE_PAPELETA: Readonly<Record<string, TonoDeCelda>> = {
  IMPUESTA: 'warn',
  NOTIFICADA: 'warn',
  PAGADA: 'ok',
  COACTIVA: 'bad',
  ANULADA: 'bad',
  PRESCRITA: 'bad',
};

function estadoDePapeletaCelda(cruda: unknown): Celda {
  const nombre = texto(cruda);
  const tono = TONO_DEL_ESTADO_DE_PAPELETA[nombre];
  return tono === undefined ? { texto: nombre } : { texto: nombre, tono };
}

/**
 * Papeletas de infracción de tránsito (RF-060, #46, #363).
 *
 * `leer` valida el sobre paginado que publica `RespuestaPaginada<PapeletaResource>` —falla
 * nombrando la operación si el cuerpo no lo trae (`leerPaginado`)— y `adaptar` traduce cada
 * fila con los nombres del recurso, no con los del catálogo del prototipo.
 */
const papeletas = definirConexion({
  operacion: 'papeletas',
  parametros: ({ busqueda }) => parametrosDeBusqueda('papeletas', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las papeletas de tránsito'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => [
          { texto: texto(papeleta['numero']) },
          { texto: texto(papeleta['fechaInfraccion']) },
          { texto: texto(papeleta['placa']) },
          // Infractor: el recurso solo publica `infractorId` (una llave), no un nombre.
          { texto: SIN_DATO },
          // Código: `codigoInfraccionId` no viaja en `PapeletaResource`.
          { texto: SIN_DATO },
          // Gravedad: no existe ese campo en `Papeleta` ni en su recurso.
          { texto: SIN_DATO },
          { texto: texto(papeleta['importeAPagar']) },
          estadoDePapeletaCelda(papeleta['estado']),
        ],
        'papeletas',
      ),
    ),
});

/**
 * Búsqueda avanzada de papeletas (`transito_busqueda`, `BusquedaDePapeletasController`,
 * RF-061). Lee el mismo `PapeletaResource` que `papeletas`, con doce columnas en vez
 * de ocho.
 *
 * **Siete de las doce salen con `SIN_DATO`**, y no por descuido: «A.Coa»/«Coact»
 * son de `coactiva` —contexto todavía vacío—; «Fec. Reg.» y «Deuda» no tienen
 * campo propio en `Papeleta` (solo hay `fechaInfraccion`, y «estado de deuda»
 * es un filtro, no una columna que el recurso publique); «Serie» no existe —el
 * número ya es el identificador completo del acta—; e «Infracción» necesitaría
 * el catálogo de códigos, que esta lectura no trae por fila. El pie de página
 * con los tres totales del prototipo tampoco viaja: sumarlos en la interfaz
 * sería RNF-083.
 */
const transito_busqueda = definirConexion({
  operacion: 'transito_busqueda',
  parametros: ({ busqueda }) => parametrosDeBusqueda('transito_busqueda', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la búsqueda de papeletas'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => [
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(papeleta['numero']) },
          { texto: texto(papeleta['placa']) },
          { texto: texto(papeleta['fechaInfraccion']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(papeleta['importeInfraccion']) },
          { texto: texto(papeleta['importeAPagar']) },
        ],
        'papeletas encontradas',
      ),
    ),
});

/**
 * Estado de cuenta de infracciones (`transito_estado_cuenta`,
 * `EstadoDeCuentaTransitoController`, RF-062). Mismo `PapeletaResource`,
 * filtrado siempre a lo pendiente por el propio backend
 * (`CriterioDePapeleta.soloPendientes()`).
 */
const transito_estado_cuenta = definirConexion({
  operacion: 'transito_estado_cuenta',
  parametros: ({ busqueda }) => parametrosDeBusqueda('transito_estado_cuenta', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el estado de cuenta de infracciones'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => [
          { texto: texto(papeleta['numero']) },
          { texto: texto(papeleta['placa']) },
          { texto: texto(papeleta['fechaInfraccion']) },
          { texto: SIN_DATO },
          { texto: texto(papeleta['importeAPagar']) },
          { texto: texto(papeleta['importeConBeneficio']) },
          // La situacion de coactiva es del contexto `coactiva`, todavia vacio
          // (ver el javadoc de `EstadoDeCuentaTransitoController`).
          { texto: SIN_DATO },
        ],
        'papeletas pendientes',
      ),
    ),
});

/**
 * Tabla de códigos de infracción de tránsito (`codigos_transito`,
 * `CodigosTransitoController`, RF-063, NEG-03).
 *
 * **«Gravedad» y «Multa S/» salen con `SIN_DATO`.** `CodigoInfraccion` no
 * modela una gravedad —MUY GRAVE/GRAVE/LEVE es un rótulo del prototipo, no una
 * columna del dominio—, y `porcentajeUit` es exactamente eso: un porcentaje.
 * Multiplicarlo por la UIT del ejercicio para enseñar un sol compondría una
 * cifra tributaria en la interfaz, y con la UIT sin publicar todavía (D-02a),
 * cualquier valor sería inventado (regla 5).
 */
const codigos_transito = definirConexion({
  operacion: 'codigos_transito',
  parametros: ({ busqueda }) => parametrosDeBusqueda('codigos_transito', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el catálogo de códigos de infracción'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (codigo): readonly Celda[] => [
          { texto: texto(codigo['codigo']) },
          { texto: texto(codigo['descripcion']) },
          { texto: SIN_DATO },
          { texto: texto(codigo['porcentajeUit']) },
          { texto: SIN_DATO },
          { texto: texto(codigo['puntos']) },
          { texto: texto(codigo['medida']) },
        ],
        'códigos',
      ),
    ),
});

/**
 * Internamiento vehicular (`internamiento`, `InternamientosController`, #50, RF-064).
 * Solo la grilla `GET`: `registrar_internamiento` y `liberar_internamiento` no
 * son opciones del catálogo de tránsito por separado, y esta opción no
 * declara escritura propia.
 *
 * **«Tasa diaria S/» y «Custodia S/» salen con `SIN_DATO`**, tal como el
 * propio `InternamientosController` lo explica: la tarifa de la custodia es
 * dato de ordenanza (D-02b), y el importe lo pone la caja al cobrar, no esta
 * grilla.
 */
const internamiento = definirConexion({
  operacion: 'internamiento',
  parametros: ({ busqueda }) => parametrosDeBusqueda('internamiento', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los vehículos en depósito'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (fila): readonly Celda[] => [
          { texto: texto(fila['placa']) },
          { texto: texto(fila['papeleta']) },
          { texto: texto(fila['fechaDeIngreso']) },
          { texto: texto(fila['dias']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(fila['estado']) },
        ],
        'vehículos en depósito',
      ),
    ),
});

/**
 * Emisión de resoluciones y otros documentos (`transito_documentos`,
 * `ActosDeLaPapeletaController`, #50, RF-065, AC 4): se abre por el `numero`
 * de la papeleta, en la ruta, igual que `proceso_coactivo`.
 *
 * **Solo se conectan los `campos` de «Datos principales» que `ExpedienteResource`
 * publica** —el número de papeleta—: el resto de esa sección (placa,
 * infracción, obligado, domicilio, documento) y las dos secciones siguientes
 * viven en `Papeleta`/`Contribuyente`, que este `GET` no trae. Y la tabla
 * «Papeletas con expediente» del catálogo es una búsqueda por filtros —no lo
 * que esta ruta, atada a **una** papeleta por su número, puede servir—: se
 * queda sin datos, igual que las pestañas de `proceso_coactivo` que su propio
 * docblock deja documentadas.
 *
 * Los descargos y los actos que el recurso sí trae (`descargos`, `actos`) no
 * tienen dónde dibujarse honestamente: ninguna columna del catálogo nombra
 * clase/tipo/número/fecha de un acto administrativo, y reusar las cinco
 * columnas de «Papeletas con expediente» para eso rotularía datos de otra
 * cosa (RNF-080).
 */
const transito_documentos = definirConexion({
  operacion: 'transito_documentos',
  parametros: ({ ruta, busqueda }) => ({
    numero: ruta['codigo'] ?? '',
    ...parametrosDeBusqueda('transito_documentos', ruta['codigo'], busqueda),
  }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el expediente de la papeleta'),
  adaptar: (expediente): DatosDePantalla => ({
    fechaCalculo: hoy(),
    campos: {
      placa: SIN_DATO,
      papeletaN2: texto(expediente['papeleta']),
      fecPapeleta: SIN_DATO,
      exped: SIN_DATO,
      fecExp: SIN_DATO,
      infraccion: SIN_DATO,
      obligado: SIN_DATO,
      domicilio: SIN_DATO,
      dNI: SIN_DATO,
      rUC: SIN_DATO,
      fecSolicitud: SIN_DATO,
      argumento: SIN_DATO,
      informeN: SIN_DATO,
      fecInforme: SIN_DATO,
      glosa: SIN_DATO,
      documento: SIN_DATO,
      nDoc: SIN_DATO,
      fecDoc: SIN_DATO,
      nombreDeArchivo: SIN_DATO,
      glosaDelActo: SIN_DATO,
    },
  }),
});

/**
 * Una fila de `PapeletaDelPadronResource`: la base de los tres padrones y los
 * dos records (#53). `actualizadoA` es la fecha de la infracción —congelada al
 * registrar el acta, regla 9—, y por eso `fechaCalculo` de las cinco lecturas
 * que siguen sale de la **primera** fila y no del reloj del cliente.
 */
function filaDelPadron(papeleta: Readonly<Record<string, unknown>>): readonly Celda[] {
  return [
    { texto: texto(papeleta['numero']) },
    { texto: texto(papeleta['fechaInfraccion']) },
    { texto: texto(papeleta['placa']) },
    { texto: texto(papeleta['infractorNombre']) },
    { texto: texto(papeleta['descripcionInfraccion']) },
    // «Importe S/» de las tres columnas del padron no tiene de donde salir:
    // el recurso solo publica el importe **a pagar**, no un importe base
    // distinto de el (a diferencia de `PapeletaResource`, que si desglosa).
    { texto: SIN_DATO },
    { texto: texto(papeleta['importeAPagar']) },
    estadoDePapeletaCelda(papeleta['estado']),
  ];
}

function fechaDeLaPrimera(contenido: readonly unknown[]): string {
  const [primera] = contenido;
  if (!esObjeto(primera)) return hoy();
  const fecha = texto(primera['actualizadoA']);
  return fecha === SIN_DATO ? hoy() : fecha;
}

/**
 * Padrón de papeletas de tránsito (`transito_padron`,
 * `PadronesDeTransitoController#padron`, #53, RF-068, RF-073).
 */
const transito_padron = definirConexion({
  operacion: 'transito_padron',
  parametros: ({ busqueda }) => parametrosDeBusqueda('transito_padron', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el padrón de papeletas de tránsito'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(paginado, filaDelPadron, 'papeletas'),
  }),
});

/**
 * Padrón de papeletas enviadas a coactiva (`transito_padron_coactiva`,
 * `PadronesDeTransitoController#padronCoactiva`, #53).
 *
 * **«Expediente» y «Fec. pase» salen con `SIN_DATO`.** El propio controlador
 * lo dice en su javadoc: el ejecutor y el estado del expediente no son
 * columnas de la papeleta —viven en `coactiva`, contexto todavía vacío—, y
 * `PapeletaDelPadronResource` no publica el número de expediente coactivo ni
 * la fecha en que se pasó (solo `valorNumero`, que es el de la resolución de
 * multa, no el del expediente).
 */
const transito_padron_coactiva = definirConexion({
  operacion: 'transito_padron_coactiva',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('transito_padron_coactiva', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el padrón de papeletas en coactiva'),
  adaptar: (paginado): DatosDePantalla => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (papeleta): readonly Celda[] => [
        { texto: SIN_DATO },
        { texto: texto(papeleta['numero']) },
        { texto: SIN_DATO },
        { texto: texto(papeleta['placa']) },
        { texto: texto(papeleta['obligadoNombre']) },
        { texto: texto(papeleta['importeAPagar']) },
        estadoDePapeletaCelda(papeleta['estado']),
      ],
      'papeletas en coactiva',
    ),
  }),
});

/**
 * Padrón de constancias libres de infracciones (`transito_padron_constancias`,
 * `PadronesDeTransitoController#padronDeConstancias`, #53). Lee
 * `ConstanciaLibreResource`, que no tiene «Solicitante», «Recibo» ni
 * «Importe S/»: una constancia libre no cobra nada — acredita, no liquida.
 */
const transito_padron_constancias = definirConexion({
  operacion: 'transito_padron_constancias',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('transito_padron_constancias', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el padrón de constancias libres'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (constancia): readonly Celda[] => [
          { texto: texto(constancia['numero']) },
          { texto: texto(constancia['fechaEmision']) },
          { texto: texto(constancia['placa']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(constancia['usuarioQueEmitio']) },
        ],
        'constancias emitidas',
      ),
    ),
});

/** El texto de un filtro elegido, o `SIN_DATO` si no se pidió ninguno. */
function criterioDe(valor: string | undefined): string {
  return valor === undefined || valor === '' ? SIN_DATO : valor;
}

/**
 * Los dos records de tránsito (`transito_record_conductor`,
 * `transito_record_vehicular`; `RecordsDeTransitoController`, #53, RF-068):
 * el mismo `PapeletaDelPadronResource`, servido como hoja de reporte
 * (`kind: 'report'`) en vez de tabla.
 *
 * **Ninguna de las dos pantallas dibuja un filtro** —ni siquiera en el
 * prototipo, que las capturó con datos de ejemplo ya resueltos en
 * `report.meta`—: `RecordsDeTransitoController` exige a quien (licencia o
 * documento del conductor; placa del vehículo) porque sin sujeto la consulta
 * sería el padrón entero con otro título, y sin filtro que teclear la única
 * forma de pedirlo es por la URL. El contrato no lo declaraba —el generador
 * solo conocía `formato`—, así que se amplió (`docs/50-api/generar-openapi.mjs`,
 * `DEL_BACKEND.transito_record_conductor`/`_vehicular`, #77): sin eso, ninguna
 * de las dos se podía pedir de ninguna forma, ni por URL.
 */
interface RecordLeido {
  readonly paginado: Paginado<unknown>;
  readonly criterio: readonly { readonly k: string; readonly v: string }[];
}

function reporteDelRecord(
  { paginado, criterio }: RecordLeido,
  columnaDeConductorOPlaca: (papeleta: Readonly<Record<string, unknown>>) => string,
): DatosDePantalla {
  const filas = paginado.contenido
    .filter(esObjeto)
    .map((papeleta): readonly string[] => [
      texto(papeleta['numero']),
      texto(papeleta['fechaInfraccion']),
      columnaDeConductorOPlaca(papeleta),
      texto(papeleta['descripcionInfraccion']),
      texto(papeleta['importeAPagar']),
      texto(papeleta['estado']),
    ]);
  return {
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    reporte: {
      code: SIN_DATO,
      date: hoy(),
      meta: [...criterio, { k: 'Papeletas registradas', v: String(paginado.totalElementos) }],
      filas,
      footer: `${paginado.totalElementos} papeleta(s) encontradas.`,
    },
  };
}

const transito_record_conductor = definirConexion({
  operacion: 'transito_record_conductor',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('transito_record_conductor', undefined, busqueda),
  leer: (cuerpo, parametros): RecordLeido => ({
    paginado: leerPaginado(cuerpo, 'el record de conductor'),
    criterio: [
      { k: 'Licencia', v: criterioDe(parametros['licencia']) },
      { k: 'Documento', v: criterioDe(parametros['documento']) },
    ],
  }),
  adaptar: (leido): DatosDePantalla =>
    reporteDelRecord(leido, (papeleta) => texto(papeleta['placa'])),
});

const transito_record_vehicular = definirConexion({
  operacion: 'transito_record_vehicular',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('transito_record_vehicular', undefined, busqueda),
  leer: (cuerpo, parametros): RecordLeido => ({
    paginado: leerPaginado(cuerpo, 'el record vehicular'),
    criterio: [{ k: 'Placa', v: criterioDe(parametros['placa']) }],
  }),
  adaptar: (leido): DatosDePantalla =>
    reporteDelRecord(leido, (papeleta) => texto(papeleta['infractorNombre'])),
});

/**
 * Los dos resúmenes que encajan con un agrupador real de
 * `AgrupacionDelResumen` (`transito_resumen_codigo` con `CODIGO`,
 * `transito_resumen_placa` con `PLACA`; `ResumenesDeTransitoController`, #53).
 *
 * El recurso no está paginado —es un objeto con `lineas[]`—, así que se lee
 * con `leerObjeto` y se dibuja con la tabla plana del catálogo, sin paginador
 * (igual que `leerLista`/`tablaDeLista` en `seguridad/listado.ts`, pero
 * partiendo de un campo del objeto y no de un arreglo suelto).
 */
function lineasDelResumen(
  resumen: Readonly<Record<string, unknown>>,
): readonly Readonly<Record<string, unknown>>[] {
  const lineas = resumen['lineas'];
  return Array.isArray(lineas) ? lineas.filter(esObjeto) : [];
}

/** `actualizadoA` del resumen, o hoy si el objeto no lo trae. */
function fechaDelResumen(resumen: Readonly<Record<string, unknown>>): string {
  const fecha = texto(resumen['actualizadoA']);
  return fecha === SIN_DATO ? hoy() : fecha;
}

const transito_resumen_codigo = definirConexion({
  operacion: 'transito_resumen_codigo',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('transito_resumen_codigo', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el resumen de papeletas por código de infracción'),
  adaptar: (resumen): DatosDePantalla => {
    const lineas = lineasDelResumen(resumen);
    return {
      fechaCalculo: fechaDelResumen(resumen),
      tabla: {
        filas: lineas.map((linea): readonly Celda[] => [
          { texto: texto(linea['clave']) },
          { texto: texto(linea['descripcion']) },
          { texto: texto(linea['pendientes']) },
          { texto: texto(linea['importeDeLasPendientes']) },
          { texto: texto(linea['pagadas']) },
          { texto: texto(linea['importeDeLasPagadas']) },
        ]),
        conteo: `${lineas.length} código(s)`,
      },
    };
  },
});

const transito_resumen_placa = definirConexion({
  operacion: 'transito_resumen_placa',
  parametros: ({ busqueda }) => parametrosDeBusqueda('transito_resumen_placa', undefined, busqueda),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el resumen de papeletas por iniciales de placa'),
  adaptar: (resumen): DatosDePantalla => {
    const lineas = lineasDelResumen(resumen);
    return {
      fechaCalculo: fechaDelResumen(resumen),
      tabla: {
        filas: lineas.map((linea): readonly Celda[] => [
          { texto: texto(linea['clave']) },
          { texto: texto(linea['cantidad']) },
          { texto: texto(linea['pendientes']) },
          { texto: texto(linea['importeDeLasPendientes']) },
          { texto: texto(linea['pagadas']) },
          { texto: texto(linea['importeDeLasPagadas']) },
        ]),
        conteo: `${lineas.length} inicial(es)`,
      },
    };
  },
});

/** Las opciones de Tránsito conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_TRANSITO: Readonly<Record<string, Conexion>> = {
  papeletas,
  transito_busqueda,
  transito_estado_cuenta,
  codigos_transito,
  internamiento,
  transito_documentos,
  transito_padron,
  transito_padron_coactiva,
  transito_padron_constancias,
  transito_record_conductor,
  transito_record_vehicular,
  transito_resumen_codigo,
  transito_resumen_placa,
};
