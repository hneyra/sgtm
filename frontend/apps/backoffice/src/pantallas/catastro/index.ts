import type { Celda, DatosDePantalla, ValorDeCampo } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, estado, leerPaginado, tablaDe, texto } from '../seguridad/listado';
import { campo, leerFicha } from './fichas';
import type { Ficha } from './fichas';

/**
 * Catastro, conectado hasta donde llega el backend: **nueve opciones de doce**.
 *
 * Las tres que faltan son las tablas de valuacion —aranceles, valores unitarios
 * y depreciacion—, y no faltan por el frontend: su endpoint es #17 y su
 * **contenido** es D-02. Conectarlas hoy con lo que dibuja el prototipo seria
 * publicar como parametro del sistema una cifra que nadie ha verificado, y en
 * esta pantalla eso parece normativo.
 *
 * **Lo que se ve es lo que el backend manda.** El prototipo dibuja para la
 * ficha urbana once pestanas con noventa campos —suministro de luz, merced
 * conductiva, peligrosidad de la zona— y `FichaResource` publica quince. El
 * resto sale con «—»: que se vea el hueco dice que falta y a quien le toca.
 */

const deLaBusqueda =
  (operacion: Parameters<typeof parametrosDeBusqueda>[0]) =>
  ({ ruta, busqueda }: ContextoDePantalla) =>
    parametrosDeBusqueda(operacion, ruta['codigo'], busqueda);

/**
 * El catalogo vial.
 *
 * El prototipo dibuja siete columnas y `ViaResource` publica cuatro: no trae
 * sector, ni zona de arancel, ni el arancel por metro cuadrado. Las tres salen
 * con «—», y la del arancel importa mas que las otras dos: es una **cifra**, y
 * una cifra inventada en la pantalla que alimenta la valuacion de un predio es
 * de las que acaban en un valor mal emitido. Que falte se ve; que este mal, no.
 */
const calles = definirConexion({
  operacion: 'calles',
  parametros: deLaBusqueda('calles'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las vias'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (via): readonly Celda[] => [
          { texto: texto(via['codigo']) },
          { texto: texto(via['tipo']) },
          { texto: texto(via['nombre']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          // «Activa», en femenino: es una via. El manual lo escribe asi y la
          // pantalla es lo que lee quien atiende.
          estado(via['activa'], 'ACTIVA', 'INACTIVA'),
        ],
        'vías',
      ),
    ),
});

/* ── Las cuatro fichas ─────────────────────────────────────────────────── */

/**
 * Lo comun a las cuatro: el registro que abren, la fecha a la que se pide y su
 * historico.
 *
 * **El historico se pide siempre**, y es una decision con coste: son todas las
 * versiones de la ficha y la pantalla que solo pinta la vigente no tendria por
 * que pagarlas. Se pagan porque el versionado es la funcionalidad de este
 * modulo (#18) y una ficha que no ensena de donde viene su area es una ficha
 * que no se puede defender ante una reclamacion.
 *
 * La **fecha** sale de la URL: sin ella el backend devuelve la que rige hoy;
 * con ella, la que regia entonces. Es lo que contesta «como estaba este predio
 * cuando se emitio el valor de 2027».
 */
const deLaFicha = ({ busqueda }: ContextoDePantalla) => ({
  historico: 'true',
  ...(busqueda.get('fecha') ? { fecha: busqueda.get('fecha') ?? '' } : {}),
});

/** El codigo que abre la ficha. Sin el no hay peticion: no se inventa ninguno. */
const registro = (contexto: ContextoDePantalla): string => contexto.ruta['codigo'] ?? '';

/** Lo que las cuatro publican igual: area, uso y la version que se esta viendo. */
const comunes = (ficha: Ficha): Record<string, ValorDeCampo> => ({
  areaTotalHa: campo(ficha.areaTerreno),
  uso2: campo(ficha.uso),
  denominacion2: campo(ficha.denominacion),
});

const deLaFichaComun = (ficha: Ficha): DatosDePantalla => ({
  fechaCalculo: ficha.versionado.actual.vigenciaDesde,
  campos: comunes(ficha),
  versionado: ficha.versionado,
});

/**
 * Ficha urbana (RF-001). Su tabla del prototipo es la de direcciones del
 * predio, que `FichaResource` no publica; las construcciones si, y son lo que
 * la pantalla necesita para explicar el area construida.
 */
const ficha_urbana = definirConexion({
  operacion: 'ficha_urbana',
  parametros: (contexto) => ({ codRefCatastral: registro(contexto), ...deLaFicha(contexto) }),
  leer: (cuerpo) => leerFicha(cuerpo, 'urbana'),
  adaptar: (ficha) => ({
    ...deLaFichaComun(ficha),
    tabla: {
      // Las construcciones salen **con sus categorias, nunca con importes**:
      // cuanto vale cada categoria es D-02a y vive en datos versionados
      // (regla 5). Una columna de soles aqui seria una cifra inventada.
      filas: ficha.construcciones.map((construccion): readonly Celda[] => [
        { texto: construccion.piso },
        {
          texto:
            construccion.anioConstruccion === undefined
              ? SIN_DATO
              : String(construccion.anioConstruccion),
        },
        { texto: construccion.material ?? SIN_DATO },
        { texto: construccion.estadoConservacion ?? SIN_DATO },
        { texto: construccion.categorias },
        { texto: construccion.areaConstruida },
      ]),
      conteo: `${ficha.construcciones.length} pisos declarados`,
    },
  }),
});

/** Ficha economica (RF-002): que se hace en la unidad y con que licencias. */
const ficha_economica = definirConexion({
  operacion: 'ficha_economica',
  parametros: (contexto) => ({ codRefCatastral: registro(contexto), ...deLaFicha(contexto) }),
  leer: (cuerpo) => leerFicha(cuerpo, 'economica'),
  adaptar: (ficha) => {
    const actividades = listaDe(ficha.economico?.['actividades']);
    const [primera] = actividades;
    return {
      ...deLaFichaComun(ficha),
      campos: {
        ...comunes(ficha),
        // El prototipo dibuja **una** actividad; el recurso publica todas. Se
        // muestra la primera y se dice cuantas hay: recortar en silencio
        // esconderia justo lo que fiscalizacion viene a mirar.
        nombreComercial: campo(cadena(primera?.['nombreComercial'])),
        ciiu2: campo(cadena(primera?.['ciiu'])),
        nDeLicenciaDeFuncionamiento: campo(cadena(primera?.['licenciaNumero'])),
        areaDestinadaAlNegocioM: campo(cadena(primera?.['areaOcupada'])),
        fechaDeInicioDeActividades: campo(cadena(primera?.['licenciaFecha'])),
        cuentaConAnuncioPublicitario: campo(cadena(primera?.['anuncioNumero'])),
        // `licenciaNumero` nulo no es un dato que falte: es el hallazgo.
        estadoDeLaLicencia:
          primera === undefined
            ? SIN_DATO
            : cadena(primera['licenciaNumero']) === undefined
              ? 'SIN LICENCIA'
              : 'CON LICENCIA',
      },
    };
  },
});

/** Ficha de bienes comunes (RF-003): las areas comunes y su reparto. */
const ficha_bienes = definirConexion({
  operacion: 'ficha_bienes',
  parametros: (contexto) => ({ codEdificacion: registro(contexto), ...deLaFicha(contexto) }),
  leer: (cuerpo) => leerFicha(cuerpo, 'de bienes comunes'),
  adaptar: (ficha) => {
    const participaciones = listaDe(ficha.bienesComunes?.['participaciones']);
    return {
      ...deLaFichaComun(ficha),
      campos: {
        ...comunes(ficha),
        areaComunDeTerrenoM: campo(cadena(ficha.bienesComunes?.['areaComunTotal'])),
      },
      tabla: {
        filas: participaciones.map((participacion): readonly Celda[] => [
          { texto: texto(participacion['predioId']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(participacion['porcentaje']) },
          // El valor asignado es D-02: sale de los valores unitarios, y
          // componerlo aqui seria inventar la cifra que reparte el gasto comun.
          { texto: SIN_DATO },
        ]),
        conteo: `${participaciones.length} unidades con participación`,
      },
      totales: [
        {
          label: 'Área común total',
          value: cadena(ficha.bienesComunes?.['areaComunTotal']) ?? SIN_DATO,
        },
        { label: 'Valor bienes comunes', value: SIN_DATO },
        { label: 'Participación asignada', value: SIN_DATO },
        { label: 'Unidades', value: String(participaciones.length) },
      ],
    };
  },
});

/** Ficha rural (RF-004): los grupos de tierra, en hectareas y sin arancel. */
const ficha_rural = definirConexion({
  operacion: 'ficha_rural',
  parametros: (contexto) => ({ codUnidad: registro(contexto), ...deLaFicha(contexto) }),
  leer: (cuerpo) => leerFicha(cuerpo, 'rural'),
  adaptar: (ficha) => {
    const tierras = listaDe(ficha.rural?.['tierras']);
    const [primera] = tierras;
    return {
      ...deLaFichaComun(ficha),
      campos: {
        ...comunes(ficha),
        // La superficie sale **con su unidad** —«12.5000 HA»— y no como numero
        // suelto: el arancel rural es por hectarea, y leer metros calcularia
        // diez mil veces de menos.
        areaTotalHa: campo(cadena(ficha.rural?.['hectareasTotales'])),
        tipoDeTierra: campo(cadena(primera?.['clasificacion'])),
        condicionDeRiego: campo(cadena(primera?.['riego'])),
        // Arancel, valor del terreno y autovaluo son D-02: no se componen aqui.
        arancelRuralSPorHa: SIN_DATO,
        valorDelTerrenoRusticoS: SIN_DATO,
        autovaluoRuralS: SIN_DATO,
      },
    };
  },
});

/* ── La consulta de fichas ─────────────────────────────────────────────── */

/**
 * De donde salen las cuatro fichas: buscar, elegir, abrir (#20).
 *
 * Pagina contra el servidor porque el padron no cabe en una respuesta: son
 * cientos de miles de predios, y traerlos para filtrar en el navegador deja de
 * funcionar el primer dia.
 */
const consulta_fichas = definirConexion({
  operacion: 'consulta_fichas',
  parametros: deLaBusqueda('consulta_fichas'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las fichas'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (fila): readonly Celda[] => [
          { texto: texto(fila['codRefCatastral']) },
          // El codigo predial de rentas y el area construida no los publica
          // `FichaEncontradaResource`: el primero lo tiene contribuyentes, y la
          // segunda hay que sumarla por piso —y la interfaz no suma (RNF-083)—.
          { texto: SIN_DATO },
          { texto: texto(fila['titular']) },
          { texto: texto(fila['uso']) },
          { texto: texto(fila['areaTerreno']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ],
        'fichas',
      ),
    ),
});

/* ── Los sectores ──────────────────────────────────────────────────────── */

const sectores = definirConexion({
  operacion: 'sectores',
  parametros: deLaBusqueda('sectores'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los sectores'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (sector): readonly Celda[] => [
          { texto: texto(sector['codigo']) },
          { texto: texto(sector['nombre']) },
          // Cuantas manzanas, cuantos lotes y cuantos predios inscritos tiene:
          // son conteos que `SectorResource` no publica, y contarlos aqui
          // exigiria traerse el padron entero.
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(sector['zona']) },
          estado(sector['activo']),
        ],
        'sectores',
      ),
    ),
});

const listaDe = (valor: unknown): readonly Readonly<Record<string, unknown>>[] =>
  Array.isArray(valor)
    ? valor.filter(
        (dato): dato is Readonly<Record<string, unknown>> =>
          typeof dato === 'object' && dato !== null && !Array.isArray(dato),
      )
    : [];

const cadena = (valor: unknown): string | undefined =>
  typeof valor === 'string' && valor !== '' ? valor : undefined;

/** Las opciones de catastro ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CATASTRO: Readonly<Record<string, Conexion>> = {
  calles,
  sectores,
  consulta_fichas,
  ficha_urbana,
  ficha_economica,
  ficha_bienes,
  ficha_rural,
};
