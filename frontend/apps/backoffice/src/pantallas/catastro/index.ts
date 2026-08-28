import type { Celda, DatosDePantalla, DetalleDeFila, ValorDeCampo } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  datosDe,
  esObjeto,
  estado,
  leerLista,
  leerPaginado,
  tablaDe,
  tablaDeLista,
  texto,
} from '../seguridad/listado';
import { campo, leerFicha } from './fichas';
import type { Ficha } from './fichas';
import { normalizarCodigoCatastral } from './codigo';

/**
 * Catastro, conectado hasta donde llega el backend: **diez opciones de doce**.
 *
 * Las dos que faltan son valores unitarios y depreciacion, y ya no es
 * (solo) porque su contenido sea D-02: `ValorUnitarioController` y
 * `DepreciacionController` publican **una fila por partida** (o por estado de
 * conservacion) y el prototipo dibuja una **matriz** —categoria × siete
 * partidas; antiguedad × cuatro estados—. Volcar filas sueltas bajo columnas
 * fijas las mostraria bajo la cabecera de otra partida, que es peor que un
 * hueco. Y para valores unitarios hay una segunda dimension que NEG-05 exige
 * —el ano de construccion— que el prototipo ni siquiera dibuja como filtro:
 * conectarla tal cual eligiria en silencio que rango de anos mostrar. Las dos
 * necesitan una decision de diseno —una tabla nueva, o filtros que el
 * prototipo no declara— antes de que esto sea "conectar", no un adaptador.
 *
 * Aranceles si es la fila suelta que el resto de este modulo ya usa: un
 * `Arancel` por fila, sin pivote. Su endpoint tampoco pagina ni filtra de
 * verdad —`ArancelController` solo lee `anio`—, y aqui se acepta el mismo
 * corte que ya acepto #70 para `accesos` o `usuarios`: el contrato declara mas
 * filtros de los que el controlador recibe, y fingir que la interfaz los
 * aplica seria peor que dejarlos sin efecto.
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
  // El codigo puede llegar troquelado —`20-06-…`— en un enlace compartido: el
  // propio formato que `formatearCodigoCatastral` produce. Al backend viajan
  // los digitos, porque el prefijo por rango no encuentra un valor con guiones.
  // Se normaliza aqui y no solo en el widget: la peticion del montaje lee la
  // URL directamente, sin pasar por ningun formulario.
  parametros: (contexto) => {
    const parametros = deLaBusqueda('consulta_fichas')(contexto);
    const normalizados: Record<string, string> = { ...parametros };
    // **`conciliadaConRentas` no viaja nunca** (ADR-0015 §2). El contrato lo
    // declara y `ConsultaController` lo rechaza con 422 con cualquier valor,
    // «Todas» incluida: la lectura que lo responderia vive en rentas y no
    // existe. Su desplegable ya se dibuja bloqueado (`catastro/composicion.ts`),
    // asi que desde la pantalla no puede entrar en la URL; esto cubre el otro
    // camino, que es real —el montaje lee la URL directamente— y el mas caro: un
    // enlace compartido con el filtro puesto deja la consulta de fichas en 422
    // antes de que nadie toque nada.
    delete normalizados['conciliadaConRentas'];
    const codigo = parametros['codRefCatastral'];
    if (codigo === undefined) return normalizados;
    const digitos = normalizarCodigoCatastral(codigo);
    // Un valor sin ningun digito no es un codigo: no viaja como filtro vacio.
    if (digitos === '') delete normalizados['codRefCatastral'];
    else normalizados['codRefCatastral'] = digitos;
    return normalizados;
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'las fichas'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (fila): readonly Celda[] => [
          { texto: texto(fila['codRefCatastral']) },
          // **El «Cod. Predial Rentas» es el mismo codigo de referencia
          // catastral** (ADR-0015 §Contexto): no hay dos padrones de predios ni
          // dos codigos. `sgtm-rentas` los trata como sinonimos por escrito
          // —`CriterioDeArbitrio` documenta `codigoPredial` como «el código de
          // referencia catastral del predio» y su repositorio lo traduce a
          // `p.codigo_ref_catastral`—, asi que la columna del prototipo se
          // rellena con el mismo valor de la primera.
          //
          // Y se rellena **sin troquelar**, identico: pintarlo con otro formato
          // fabricaria la apariencia de un segundo codigo distinto, que es justo
          // la ilusion de los dos padrones que el ADR desmonta. Que las dos
          // columnas coincidan es el dato; el aviso de la pantalla lo dice con
          // todas sus letras.
          //
          // (El comentario anterior decia que este codigo «lo tiene
          // contribuyentes». Es falso: no existe ningun codigo predial de rentas
          // aparte del catastral. El unico que puede no coincidir es el
          // **heredado** del sistema anterior, y emparejarlo es migracion —D-04,
          // ADR-0015 §5—, no una columna de la operacion diaria.)
          { texto: texto(fila['codRefCatastral']) },
          // El titular sale como **nombre y nada mas**, y por eso la fila no
          // enlaza a su ficha de contribuyente (#322): `FichaEncontradaResource`
          // publica `titular`, no el codigo del contribuyente, y un enlace
          // armado por nombre abre al homonimo o a nadie. Para que enlace, el
          // recurso tiene que publicar ese codigo.
          { texto: texto(fila['titular']) },
          { texto: texto(fila['uso']) },
          { texto: texto(fila['areaTerreno']) },
          // El area construida **si** la publica el recurso, y viene ya sumada
          // desde el servidor (#290): la interfaz la pinta, no la suma
          // (RNF-083). Nula —un terreno sin construir— sale con «—» y no con un
          // cero, que seria un area declarada.
          { texto: texto(fila['areaConstruida']) },
          // «Conciliada» es un **derivado, no un estado guardado, y lleva su
          // ejercicio** (ADR-0015 §1): un predio esta conciliado a un ejercicio
          // cuando existe una declaracion jurada de ese ejercicio sobre **el
          // predio** —`declaracion_jurada.predio_id`, de V2— en estado
          // PRESENTADA u OBSERVADA. El predicado va por `predio_id` y no por
          // `ficha_catastral_id`: esa columna es *nullable* por diseno —«nulo si
          // el predio no tiene ficha registrada todavia»— y nula en toda fila
          // anterior a V19, asi que derivar de ella marcaria «no conciliado» a
          // quien si declaro. Es el falso omiso, y aqui costaria acusar de
          // omiso a un padron entero.
          //
          // Hoy **ninguna lectura lo publica**, y catastro no puede publicarlo
          // sin depender de rentas —el ciclo que `verificarArquitectura`
          // rechaza—: la lectura compuesta le toca a `sgtm-rentas` (§2). Hasta
          // entonces «—», que es la verdad; un «No» inventado acusaria de omiso
          // a quien quiza no lo es.
          { texto: SIN_DATO },
        ],
        'fichas',
      ),
    ),
});

/* ── Los sectores ──────────────────────────────────────────────────────── */

/**
 * El catalogo territorial, con **los conteos que el sector trae** (#309, #321).
 *
 * `SectorResource` publica `manzanas`, `predios` y `lotes` contados por la base
 * sobre la pagina ya limitada. Aqui se dibujan **tal cual**: no se suman, no se
 * completan y no se deducen unos de otros. Que significa cada uno lo decide el
 * backend y conviene saberlo antes de leer la tabla como si fuera un cuadre:
 *
 * - `predios` son los **activos**. Los dados de baja siguen en la base porque
 *   aparecen en determinaciones ya emitidas (RNF-051) y el sector ya no los
 *   tiene.
 * - `lotes` cuenta pares (manzana, lote) **distintos**: tres departamentos de un
 *   mismo lote son tres predios y **un** lote. Que `lotes` sea menor que
 *   `predios` es lo normal, no un descuadre.
 * - **Un predio sin sector no cuenta en ninguno.** La suma de los `predios` de
 *   todos los sectores puede ser menor que el padron, y eso es informacion —hay
 *   predios sin ubicacion territorial asignada— y no un error de la tabla.
 *
 * Mientras la ruta la conteste el proxy de datos, los tres salen «—», y **eso es
 * correcto**: el proxy no finge lo que el backend no le ha dado (ADR-0010 §4).
 * El dia que la operacion se sirva de verdad se pintan sin tocar esta pantalla.
 */
const sectores = definirConexion({
  operacion: 'sectores',
  parametros: deLaBusqueda('sectores'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los sectores'),
  adaptar: (paginado) => {
    const tabla = tablaDe(
      paginado,
      (sector): readonly Celda[] => [
        { texto: texto(sector['codigo']) },
        { texto: texto(sector['nombre']) },
        { texto: conteo(sector['manzanas']) },
        { texto: conteo(sector['lotes']) },
        { texto: conteo(sector['predios']) },
        { texto: texto(sector['zona']) },
        estado(sector['activo']),
      ],
      'sectores',
    );
    return datosDe({
      ...tabla,
      // `esObjeto` del listado compartido y no una copia local: el predicado
      // son tres condiciones y la de `!Array.isArray` es justo la que se olvida
      // al copiarlo.
      detalles: paginado.contenido.filter(esObjeto).map(detalleDelSector),
    });
  },
});

/**
 * Lo que cuelga de un sector: sus manzanas.
 *
 * **El backend todavia no las lista.** `POST /catastro/sectores/{codigo}/manzanas`
 * da de alta una manzana y no hay ningun `GET` que las devuelva —el repositorio
 * tiene `manzanasDe(sectorId)` y ningun controlador lo publica—, asi que el
 * desplegable dice que falta en vez de aparecer vacio, que se leeria como «este
 * sector no tiene ninguna».
 *
 * Cuando lo publique, `manzanas` sera **una lista** donde hoy es un conteo, y las
 * fichas se pintan solas: es la misma clave porque es el mismo concepto —las
 * manzanas del sector—, contado mientras solo se cuenta y enumerado cuando se
 * enumere. Lo que **no** se hace es inventar aqui una clave que el contrato no
 * declara ni ensenar en el proxy unas manzanas que nadie sirvio (ADR-0010 §4).
 */
function detalleDelSector(sector: Readonly<Record<string, unknown>>): DetalleDeFila {
  const codigo = typeof sector['codigo'] === 'string' ? sector['codigo'] : '';
  const listadas = listaDe(sector['manzanas']);
  return {
    clave: codigo,
    titulo: `Manzanas del sector ${codigo === '' ? SIN_DATO : codigo}`,
    items: listadas.map((manzana) => {
      const lotes = manzana['lotes'];
      return {
        texto: texto(manzana['codigo']),
        // El conteo de lotes de la manzana, **si el servidor lo manda**. Un
        // «0 lotes» inventado diria de una manzana recien creada algo que nadie
        // ha comprobado.
        ...(typeof lotes === 'number' ? { nota: `${lotes} lotes` } : {}),
      };
    }),
    ...(listadas.length === 0
      ? {
          nota: 'El sistema todavía no publica las manzanas de un sector: solo su alta. Mientras tanto se ve cuántas hay en la columna «Manzanas», y desde aquí se puede añadir una.',
        }
      : {}),
  };
}

/**
 * Un conteo del servidor, tal cual.
 *
 * Numero, se muestra. Lista —el dia que el backend enumere lo que hoy cuenta—,
 * se muestra cuantos elementos mando, que es contar lo recibido y no componer
 * una cifra (lo mismo que ya hace `tablaDeLista` con su conteo). Cualquier otra
 * cosa, incluido el nulo con el que `SectorResource` dice «no se conto», sale
 * «—»: un `0` significaria «ninguna», que es una afirmacion distinta.
 */
function conteo(valor: unknown): string {
  if (typeof valor === 'number') return String(valor);
  if (Array.isArray(valor)) return String(valor.length);
  return SIN_DATO;
}

/* ── Aranceles: la unica tabla de valuacion sin pivote ──────────────────── */

/**
 * Aranceles de terreno (RF-009, #17).
 *
 * `ArancelController` no pagina —devuelve `List<ArancelResource>` tal cual— ni
 * filtra: solo lee `anio`, que es lo unico que se manda. El «Via», «Zona» y
 * «Ejercicio» que dibuja el prototipo siguen en el contrato porque #63 los
 * anadio automaticamente a toda pantalla con tabla; que el controlador no los
 * reciba es una brecha del backend, no algo que el frontend deba disimular
 * (mismo corte que ya acepto #70 para `accesos`).
 *
 * `ArancelResource` publica el id de la via, no su nombre: cruzarlo con el
 * catalogo vial (#16) para mostrarlo traeria las vias completas a una tabla
 * que solo necesita el arancel. Y `tramo` es una subdivision libre —«un tramo
 * con mayor valor que el resto de la cuadra»—, no un rango numerico: no hay
 * «cuadra hasta» que separarle.
 */
const aranceles = definirConexion({
  operacion: 'aranceles',
  // `via` y `zona` viajan si se escriben, igual que en `accesos` (#70): el
  // contrato los declara y el controlador los ignora, y eso no lo decide esta
  // pantalla. `anio` es aparte porque no es un filtro de la URL: es el
  // ejercicio de la sesion, y sin el la peticion ni siquiera es valida.
  parametros: (contexto) => ({
    ...deLaBusqueda('aranceles')(contexto),
    anio: String(contexto.ejercicio),
  }),
  leer: (cuerpo) => leerLista(cuerpo, 'los aranceles'),
  adaptar: (lista) =>
    datosDe(
      tablaDeLista(
        lista,
        (arancel): readonly Celda[] => [
          { texto: texto(arancel['viaId']) },
          { texto: texto(arancel['tramo']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(arancel['valorM2']) },
          // La variacion contra el ano anterior no la publica el recurso, y
          // calcularla aqui seria componer una cifra de valuacion (D-02).
          { texto: SIN_DATO },
        ],
        'aranceles',
      ),
    ),
});

const listaDe = (valor: unknown): readonly Readonly<Record<string, unknown>>[] =>
  Array.isArray(valor) ? valor.filter(esObjeto) : [];

const cadena = (valor: unknown): string | undefined =>
  typeof valor === 'string' && valor !== '' ? valor : undefined;

/**
 * Lo que este modulo compone alrededor de los bloques vive en
 * `catastro/composicion.ts` y **no se reexporta aqui**, a proposito: este
 * archivo son operaciones y adaptadores —datos—, y aquel son componentes. Quien
 * importa las conexiones no tiene por que arrastrarse React detras, y hay una
 * verificacion que lo nota: `adaptador-conserva-la-fecha.test.ts` compila el
 * adaptador de verdad con un `tsc` sin `--jsx`.
 */

/** Las opciones de catastro ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CATASTRO: Readonly<Record<string, Conexion>> = {
  calles,
  sectores,
  consulta_fichas,
  ficha_urbana,
  ficha_economica,
  ficha_bienes,
  ficha_rural,
  aranceles,
};
