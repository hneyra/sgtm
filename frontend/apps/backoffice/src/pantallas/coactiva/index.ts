import type { Celda, TonoDeCelda } from '@sgtm/api-client';
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
 * Coactiva, conectado hasta donde llega el backend con seguridad: **las
 * cuatro lecturas de doce** (#76).
 *
 * `coactiva_expedientes` (#40), `proceso_coactivo` (#41), `coactiva_consulta_deudas`
 * y `coactiva_deudas_beneficio` (#42) tienen `Controller` y se conectan aqui, con el
 * patron de siempre: `leer` abre el sobre del contrato, `adaptar` traduce el
 * recurso del dominio a lo que dibuja el renderizador. Ninguna cifra se
 * compone (RNF-083): lo que el recurso no publica sale con {@link SIN_DATO}.
 *
 * **Las otras ocho —todas escrituras— se quedan sin conectar, y no por
 * descuido.** Las doce tienen `Controller` en `sgtm-coactiva` (ver
 * `backend/sgtm-coactiva/.../infraestructura/web`), pero conectarlas de verdad
 * chocaba con dos problemas estructurales que ya bloquearon otras opciones en
 * este repositorio (`pase_coactiva`, `valores_individual`, `valores_masivo` en
 * `pantallas/valores/index.ts`):
 *
 * 1. **La primaria no era la accion que guarda** —cerrado por #421, y aqui se
 *    deja el censo porque es el que aquel issue uso—. FRO-03 §5 fija la primaria
 *    en la ultima accion, y asi la dibujaba `BarraDeAcciones`; el prototipo
 *    capturo estas pantallas como barras de herramientas de escritorio —Nuevo,
 *    Modificar, Guardar, Imprimir…— y en **seis de las ocho** la ultima no es
 *    «Guardar». Desde #421 las seis declaran cual escribe en
 *    `LA_QUE_ESCRIBE` (`pantallas/actos.ts`), esa pasa al final de la barra y es
 *    la que lleva el color del acto; lo que sigue faltando es lo del punto 2:
 *
 *      `importacion_valores`      última: «Limpiar campos» (la que importa,
 *                                 «Importar valores», es la **primera**)
 *      `rec_impresion`            última: «REC 2» (un boton de las dos
 *                                 resoluciones, no un guardado generico —
 *                                 `PeticionDeRec.rec` no tiene de donde salir)
 *      `expediente_historial`     última: «Limpiar» (la que guarda,
 *                                 «Guardar cambios», es la penultima)
 *      `costas_procesales`        última: «Imprimir» (la que liquida,
 *                                 «Guardar», es la penultima)
 *      `actos_coactivos`          última: «Padrón» (un reporte, no un guardado)
 *      `notificaciones_coactivas` última: «Resol. consentida»
 *
 *    Declarar la escritura ahi habilitaba la primaria equivocada: pulsar
 *    «Limpiar campos» en `importacion_valores` importaria valores a coactiva
 *    —irreversible, RF-100— cuando quien atiende solo queria borrar el
 *    formulario. Lo que faltaba era una forma de decirle a `BarraDeAcciones`
 *    cual boton guarda cuando no es el ultimo **sin** tocar la convencion que
 *    vale para las otras 123 pantallas, y eso es lo que #421 anadio: una
 *    declaracion opt-in por opcion, por el **rotulo** que el catalogo dibuja.
 *    Aqui las seis lo declaran; ninguna conecta su escritura todavia.
 *
 * 2. **Un campo que el backend exige no tiene donde escribirse.** De las dos
 *    que si tienen el boton correcto en su sitio:
 *
 *      `cambiar_direccion_ref`    `PeticionDeDireccionReferencial.motivo` es
 *                                 obligatorio (`exigir(peticion.motivo(),
 *                                 "motivo")`) y la seccion «Nueva dirección»
 *                                 del prototipo no dibuja ningun campo para
 *                                 el —solo «Hab. Urbana», «Vía» y la propia
 *                                 direccion—.
 *      `fraccionamiento_coactivo` `PeticionDeConvenioCoactivo.nroExpedCoact`
 *                                 es obligatorio y solo existe como filtro de
 *                                 busqueda («Nro. Exped. Coact.» no esta en la
 *                                 seccion que se escribe); `obligaciones[]`
 *                                 pide `predioId`/`vehiculoId` por fila, y esta
 *                                 pantalla no tiene una tabla conectada de la
 *                                 que sacarlos —a diferencia de `baja_deuda`,
 *                                 que los toma de `consulta_deuda`, aqui no hay
 *                                 ningun listado por obligacion con esa
 *                                 granularidad conectado todavia—.
 *
 *    Y las dos que quedan de las seis con boton equivocado tienen **ademas**
 *    este segundo problema, asi que resolver el primero no bastaria:
 *    `costas_procesales`/`nroExpedCoact` y `notificaciones_coactivas`/`acto`
 *    (el numero del documento que se notifica, que no es «Valor Nº» del
 *    filtro) son igual de inalcanzables. Solo `importacion_valores`
 *    (`codContribuyente`, sin campo propio: la pantalla solo tiene el filtro
 *    «Contribuyente») se suma a la lista de identidades sin donde escribirse.
 *
 * Ninguna de las ocho esta bloqueada por falta de UI generica: el renderizador
 * comun ya cumple lo que #76 pide de todas ellas —sin boton de editar ni
 * quitar un acto asentado (regla 4), insignia con texto ademas de color— y eso
 * ya lo prueba `coactiva.test.tsx` contra las doce, conectadas o no. De las dos
 * cosas que faltaban para conectar las ocho escrituras, **la primera ya esta**:
 * marcar cual boton guarda cuando no es el ultimo (#421). Queda la segunda —que
 * la pantalla resuelva su identidad con un componente propio, como
 * `ResolutorDeUnidad`, en vez de con la lista blanca generica de
 * `escrituras.ts`—, y es trabajo del issue de conexion de este modulo.
 */

/**
 * `EstadoDelExpediente` (V33): los seis codigos del manual mas `INICIADO`,
 * con el mismo tono que ya usan `estados.ts`/`estadoDeValor` — el texto es
 * siempre el nombre literal que publica el backend, nunca una etiqueta
 * inventada (FRO-02 §2.1: un estado no se comunica solo por color).
 */
const TONO_DEL_ESTADO_COACTIVO: Readonly<Record<string, TonoDeCelda>> = {
  INICIADO: 'warn',
  'REC 01 EMITIDO': 'warn',
  'REC 01 NOTIFICADA': 'warn',
  'REC 02 EMITIDA': 'warn',
  'MEDIDA CAUTELAR': 'bad',
  SUSPENDIDO: 'warn',
  CONCLUIDO: 'ok',
};

function estadoDeExpediente(cruda: unknown): Celda {
  const valor = texto(cruda);
  return valor === SIN_DATO
    ? { texto: SIN_DATO }
    : { texto: valor, tono: TONO_DEL_ESTADO_COACTIVO[valor] };
}

/**
 * Expedientes coactivos (`ExpedienteResource`, #40, RF-100).
 *
 * **«Medida cautelar» sale con `SIN_DATO`**: el recurso no la publica en la
 * grilla —es del acto que la trabo, no del expediente, y esta lectura no trae
 * actuaciones (`GET /coactiva/expedientes` sin `nroDeExpediente` no las pide:
 * «una pagina de veinte no puede costar veinte lecturas de detalle»,
 * `ExpedienteController.listar`)—. **«Contribuyente» tampoco es el nombre**:
 * `ExpedienteResource` solo publica `codContribuyente`, y ese es lo que sale
 * en la columna — un codigo, no la razon social que dibuja el prototipo.
 *
 * Los cuatro totales del catalogo —«Deuda en coactiva», «Costas y gastos»,
 * «Retenido», «Total exigible»— no los publica esta lectura por fila: sumarlos
 * aqui seria RNF-083. Salen con `SIN_DATO`.
 */
const coactiva_expedientes = definirConexion({
  operacion: 'coactiva_expedientes',
  parametros: ({ busqueda }) => parametrosDeBusqueda('coactiva_expedientes', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los expedientes coactivos'),
  adaptar: (paginado) => ({
    fechaCalculo: hoy(),
    tabla: tablaDe(
      paginado,
      (expediente): readonly Celda[] => [
        { texto: texto(expediente['numero']) },
        { texto: texto(expediente['codContribuyente']) },
        { texto: texto(expediente['valores']) },
        { texto: texto(expediente['deudaMateriaDeCobranza']) },
        { texto: texto(expediente['costas']) },
        { texto: SIN_DATO },
        estadoDeExpediente(expediente['estado']),
      ],
      'expedientes',
    ),
    totales: [
      { label: 'Deuda en coactiva', value: SIN_DATO },
      { label: 'Costas y gastos', value: SIN_DATO },
      { label: 'Retenido', value: SIN_DATO },
      { label: 'Total exigible', value: SIN_DATO },
    ],
  }),
});

/**
 * El seguimiento de un expediente (`ProcesoResource`, #41, RF-101): se abre
 * por su `numero`, en la ruta, igual que una ficha catastral por su codigo.
 *
 * Solo se conectan los `campos` de «Datos Generales»: la tabla «Expedientes del
 * contribuyente» —una busqueda por `codContribuyente` que este `GET` no
 * ofrece, esa la sirve `coactiva_expedientes`— y las pestañas «Proceso
 * Coactivo»/«Detalle Valores» —que piden `actuaciones`, y el proxy no las
 * simula (`packages/api-mock/src/recursos.ts`)— se quedan con lo que dibuje
 * el catalogo, sin datos de verdad detras todavia.
 */
const proceso_coactivo = definirConexion({
  operacion: 'proceso_coactivo',
  parametros: ({ ruta, busqueda }) => ({
    numero: ruta['codigo'] ?? '',
    ...parametrosDeBusqueda('proceso_coactivo', ruta['codigo'], busqueda),
  }),
  leer: (cuerpo) => {
    const proceso = leerObjeto(cuerpo, 'el proceso coactivo');
    const expediente = proceso['expediente'];
    if (!esObjeto(expediente)) {
      throw new Error('La respuesta del proceso coactivo no trae el expediente.');
    }
    return expediente;
  },
  adaptar: (expediente) => ({
    // `deudaAlDia` es a que fecha estan las cinco cifras de deuda de la
    // pestaña «Datos Generales» (regla 9, RNF-075): la misma que `proyectadaAl`.
    fechaCalculo:
      texto(expediente['deudaAlDia']) === SIN_DATO ? hoy() : texto(expediente['deudaAlDia']),
    campos: {
      numero: texto(expediente['numero']),
      ano: texto(expediente['ejercicio']),
      // `ExpedienteResource` no publica el expediente anterior.
      expAnterior: SIN_DATO,
      asunto: texto(expediente['asunto']),
      direccionReferencialDelContribuyente: texto(expediente['direccionReferencial']),
      // Tampoco publica una observacion general del expediente: la observacion
      // vive por movimiento, dentro de `historial` (`MovimientoResource`).
      observaciones: SIN_DATO,
      fechaDeCreacion: texto(expediente['fechaDeApertura']),
      auxiliar: texto(expediente['auxiliar']),
      ejecutor: texto(expediente['ejecutor']),
      insolutoS: texto(expediente['insoluto']),
      reajusteS: texto(expediente['reajuste']),
      interesS: texto(expediente['interes']),
      gastosS: texto(expediente['gastos']),
      totalS: texto(expediente['totalExigible']),
      proyectadaAl: texto(expediente['deudaAlDia']),
    },
  }),
});

/**
 * Deuda en cobranza coactiva (`DeudaCoactivaResource`, #42, RF-107): la base
 * comun de `coactiva_consulta_deudas` y `coactiva_deudas_beneficio`.
 */
function tributosDe(cruda: unknown): string {
  if (!Array.isArray(cruda)) return SIN_DATO;
  const nombres = cruda.filter((t): t is string => typeof t === 'string' && t !== '');
  return nombres.length === 0 ? SIN_DATO : nombres.join(', ');
}

/**
 * Consulta de deudas en coactiva (`coactiva_consulta_deudas`, #42, RF-107).
 */
const coactiva_consulta_deudas = definirConexion({
  operacion: 'coactiva_consulta_deudas',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('coactiva_consulta_deudas', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda en cobranza coactiva'),
  adaptar: (paginado) => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (deuda): readonly Celda[] => [
        { texto: texto(deuda['expediente']) },
        { texto: texto(deuda['ano']) },
        { texto: texto(deuda['contribuyente']) },
        { texto: tributosDe(deuda['tributos']) },
        { texto: texto(deuda['deudaS']) },
        { texto: texto(deuda['costasS']) },
        { texto: ultimaActuacionDe(deuda['ultimaActuacion']) },
        estadoDeExpediente(deuda['estado']),
      ],
      'deudas',
    ),
  }),
});

function ultimaActuacionDe(cruda: unknown): string {
  if (!esObjeto(cruda)) return SIN_DATO;
  return texto(cruda['acto']);
}

/** La fecha de la primera fila, o hoy si no hay ninguna: es la `aLaFecha` que trae cada fila. */
function fechaDeLaPrimera(contenido: readonly unknown[]): string {
  const [primera] = contenido;
  if (!esObjeto(primera)) return hoy();
  const fecha = texto(primera['aLaFecha']);
  return fecha === SIN_DATO ? hoy() : fecha;
}

/**
 * Deuda acogible a un beneficio, en coactiva (`coactiva_deudas_beneficio`, #42, RF-107).
 *
 * **«Insoluto S/» e «Interés S/» salen con `SIN_DATO`**: `DeudaCoactivaResource`
 * no desglosa la deuda materia de cobranza en esas dos partes, solo publica el
 * total. Y **«Con beneficio S/» tambien**, y no por falta de dato: el propio
 * recurso lo deja fuera a proposito —el efecto de un beneficio sobre el
 * importe es D-02b (#191)— y una cifra rebajada aqui se imprimiria y se
 * entregaria en ventanilla.
 */
const coactiva_deudas_beneficio = definirConexion({
  operacion: 'coactiva_deudas_beneficio',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('coactiva_deudas_beneficio', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda acogible en coactiva'),
  adaptar: (paginado) => ({
    fechaCalculo: fechaDeLaPrimera(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (deuda): readonly Celda[] => [
        { texto: texto(deuda['expediente']) },
        { texto: texto(deuda['ano']) },
        { texto: tributosDe(deuda['tributos']) },
        { texto: SIN_DATO },
        { texto: SIN_DATO },
        { texto: texto(deuda['costasS']) },
        { texto: texto(deuda['totalS']) },
        { texto: SIN_DATO },
      ],
      'deudas',
    ),
  }),
});

export const CONEXIONES_DE_COACTIVA: Readonly<Record<string, Conexion>> = {
  coactiva_expedientes,
  proceso_coactivo,
  coactiva_consulta_deudas,
  coactiva_deudas_beneficio,
};
