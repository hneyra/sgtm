import { descargar, solicitar, type RespuestaPaginada } from './cliente';
import type { FormatoDeDocumento } from './descarga';

/**
 * Lo que `catastro` publica sobre predios. Los tipos son los `record` del
 * backend, campo por campo: `PredioDelCatastroResource`, `PredioResource` y
 * `TitularesDelPredioResource`.
 */

/** Una fila del padrón. Es `PredioDelCatastroResource`. */
export type PredioDelCatastro = {
  predioId: number;
  codRefCatastral: string;
  /** `URBANO` | `RUSTICO`, el `TipoPredio` del dominio. */
  tipo: string;
  direccion: string;
  numeroMunicipal: string | null;
  codigoDeVia: string | null;
  /** El nombre de la vía. No es redundante: el código viaja y el nombre se lee. */
  via: string | null;
  codigoDeSector: string | null;
  codigoDeManzana: string | null;
  lote: string | null;
  ubigeo: string | null;
  /** `ACTIVO` | `BAJA`, el `EstadoPredio` del dominio. */
  estado: string;
  fichado: boolean;
};

/** El predio que devuelven el alta, la baja y la reactivación. Es `PredioResource`. */
export type Predio = {
  predioId: number;
  codRefCatastral: string;
  tipo: string;
  direccion: string;
  numeroMunicipal: string | null;
  lote: string | null;
  ubigeo: string | null;
  estado: string;
};

/**
 * Los titulares vigentes a una fecha. Es `TitularesDelPredioResource`.
 *
 * `codigo` y `nombre` nulos significan que esa persona ya no está en el padrón:
 * sale así y sale en la lista, porque es el predio que hay que revisar.
 */
export type TitularesDelPredio = {
  predioId: number;
  /** La fecha a la que se resolvió. Viene siempre, se pida o no (regla 9). */
  vigenteA: string;
  titulares: {
    codigo: string | null;
    nombre: string | null;
    condicion: string;
    porcentaje: number;
  }[];
};

/**
 * Los dos estados que `EstadoPredio` declara. Se escriben aquí y no como
 * `string` porque el segundo es `DADO_DE_BAJA` y no `BAJA`: con un `string`
 * libre, la abreviatura plausible compila y el 422 aparece en ventanilla.
 */
export type EstadoDePredio = 'ACTIVO' | 'DADO_DE_BAJA';

/** Los dos tipos que `TipoPredio` declara. */
export type TipoDePredio = 'URBANO' | 'RUSTICO';

/** Los cuatro filtros que el endpoint admite. No hay más, y por eso no se inventan. */
export type FiltroDePredios = {
  /** Por prefijo del código de referencia catastral. */
  codRefCatastral?: string;
  codigoDeSector?: string;
  estado?: EstadoDePredio;
  /** `true` = con ficha; `false` = sin ella; sin declarar, los dos. */
  fichado?: boolean;
};

export type Paginacion = {
  pagina?: number;
  tamano?: number;
  ordenarPor?: string;
  direccion?: 'ASCENDENTE' | 'DESCENDENTE';
};

export function listarPredios(
  filtro: FiltroDePredios,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<PredioDelCatastro>> {
  return solicitar('/catastro/predios', {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
}

/**
 * El titular del predio, resuelto al clic y de uno en uno.
 *
 * No hay forma de pedir varios en una petición y es deliberado del backend: un
 * endpoint que acepte una lista vuelve a ser el extractor masivo que el listado
 * evita. Cada resolución deja su fila en la bitácora.
 */
export function titularesDelPredio(
  predioId: number,
  vigenteA?: string,
  senal?: AbortSignal,
): Promise<TitularesDelPredio> {
  return solicitar(`/catastro/predios/${predioId}/titulares`, {
    parametros: { vigenteA },
    senal,
  });
}

export function inscribirPredio(peticion: {
  observacion: string;
  codRefCatastral: string;
  tipoPredio?: string;
  direccion: string;
  codigoDeVia?: string;
  numeroMunicipal?: string;
  codigoDeSector?: string;
  codigoDeManzana?: string;
  lote?: string;
  ubigeo?: string;
}): Promise<Predio> {
  return solicitar('/catastro/predios', { metodo: 'POST', cuerpo: peticion });
}

export function darDeBaja(predioId: number, observacion: string): Promise<Predio> {
  return solicitar(`/catastro/predios/${predioId}/baja`, { metodo: 'POST', cuerpo: { observacion } });
}

export function reactivar(predioId: number, observacion: string): Promise<Predio> {
  return solicitar(`/catastro/predios/${predioId}/reactivacion`, {
    metodo: 'POST',
    cuerpo: { observacion },
  });
}

/* ══════════ El plano catastral ══════════ */

/**
 * Una posición de GeoJSON: `[longitud, latitud]`, en grados WGS84.
 *
 * **Ese orden y no el contrario.** Es el de RFC 7946 y el de toda biblioteca de
 * mapas; leerlo al revés no falla, dibuja otro sitio —el de Catacaos saldría en
 * mitad del Índico—. Y son `number` y no texto: no es un importe (regla 1), es
 * una coordenada que hay que proyectar para dibujarla.
 */
export type PosicionGeoJson = [number, number];

/** Un anillo: la lista cerrada de posiciones de un contorno. */
export type AnilloGeoJson = PosicionGeoJson[];

/** Un polígono: su anillo exterior y, detrás, los huecos. */
export type PoligonoGeoJson = AnilloGeoJson[];

/**
 * La geometría de un lote, tal como `ST_AsGeoJSON` la produjo.
 *
 * La columna es `geography(MultiPolygon, 4326)` (ADR-0021), así que en la
 * práctica siempre llega `MultiPolygon`; se admite además `Polygon` porque un
 * lector que sólo reconozca una de las dos formas dibuja **nada** ante la otra,
 * y un lote que no se dibuja no se ve como un error: se ve como un lote que no
 * está en el padrón.
 *
 * Las claves son `type` y `coordinates`, en inglés, y no se traducen: son las de
 * RFC 7946.
 */
export type GeometriaDelLote =
  | { type: 'Polygon'; coordinates: PoligonoGeoJson }
  | { type: 'MultiPolygon'; coordinates: PoligonoGeoJson[] };

/**
 * Un lote del plano. Es `PlanoCatastralResource.LoteDelPlanoResource`.
 *
 * **No trae titular, ni área, ni importe**, y no es un olvido del que haya que
 * caer de pie inventándolos: quien puede listar predios no puede cosechar
 * predio→persona (ADR-0015 §2.4), el área del polígono no es la imponible y
 * publicarlas juntas invita a compararlas donde no se decide nada (ADR-0021).
 * El titular se resuelve al clic, de uno en uno, con {@link titularesDelPredio}.
 */
export type LoteDelPlano = {
  predioId: number;
  codRefCatastral: string;
  direccion: string;
  codigoDeSector: string | null;
  codigoDeManzana: string | null;
  lote: string | null;
  /** `ACTIVO` | `DADO_DE_BAJA`, el `EstadoPredio` del dominio. */
  estado: string;
  geometria: GeometriaDelLote;
};

/**
 * El plano de un marco. Es `PlanoCatastralResource`.
 *
 * **No hay sobre paginado y no hay marca de recorte**, y las dos ausencias son
 * la misma decisión (ADR-0022 §2): si en el marco caben más lotes que el tope,
 * la respuesta es un **422 con la cuenta**, nunca una página con los primeros.
 * Un plano al que le faltan lotes no se ve recortado —se ve como un plano donde
 * ahí no hay lotes—, así que quien lo dibuja no puede tener la opción de
 * ignorar una marca.
 *
 * @property sinGeometria cuántos predios **del padrón**, con los mismos filtros
 *   de sector y manzana, no tienen polígono. Sale **siempre**, cero incluido.
 *   Y no es «los de este marco», aunque la descripción del contrato lo diga:
 *   `prediosSinGeometria` consulta con `WHERE p.geometria IS NULL` y **sin** el
 *   marco a propósito —un predio sin polígono no tiene sitio en ningún marco—.
 *   Medido: con `bbox=-180,-90,180,90` y con el marco de Piura, la misma cifra
 *   (14 422 en la municipalidad 9), y con `codigoDeSector=01`, 1. La
 *   descripción del contrato dice lo otro, y eso es #613.
 */
export type PlanoCatastral = {
  lotes: LoteDelPlano[];
  sinGeometria: number;
};

/**
 * El marco en que se pide el plano: grados WGS84.
 *
 * Se escribe como `oeste,sur,este,norte` —el orden de GeoJSON, el mismo que el
 * contrato publica en su ejemplo— y el backend lo rechaza si está del revés o
 * fuera de rango, con un 422 que nombra el parámetro.
 */
export type MarcoDelPlano = { oeste: number; sur: number; este: number; norte: number };

export function comoBbox(marco: MarcoDelPlano): string {
  return `${marco.oeste},${marco.sur},${marco.este},${marco.norte}`;
}

/**
 * Lee un marco tecleado. Devuelve `null` si no son cuatro números.
 *
 * No comprueba rangos ni que no esté del revés: eso lo dice el backend, y
 * repetir aquí su validación es garantizar que las dos se separen. Lo único que
 * se hace en la interfaz es no mandar una cadena que no llega ni a ser un marco.
 */
export function marcoDe(texto: string): MarcoDelPlano | null {
  const partes = texto.split(',').map((p) => p.trim());
  if (partes.length !== 4) return null;
  const n = partes.map(Number);
  if (n.some((v) => !Number.isFinite(v))) return null;
  return { oeste: n[0]!, sur: n[1]!, este: n[2]!, norte: n[3]! };
}

/** Los cuatro parámetros que `PlanoCatastralController` admite, y ni uno más. */
export type FiltroDelPlano = {
  /** Obligatorio. Sin él la consulta sería el padrón entero, y el backend contesta 422. */
  bbox: string;
  codigoDeSector?: string;
  codigoDeManzana?: string;
  /** Cuántos lotes se admiten. Por encima de 2 000 el servidor contesta 422 diciendo su tope. */
  limite?: number;
};

/**
 * El plano catastral de un marco (#536, ADR-0022).
 *
 * **Su 422 no siempre es un error.** «En este marco hay N lotes y el máximo que
 * se sirve son T» es una respuesta que se puede obedecer —acercarse— y comparte
 * el código `VALIDACION` con «el marco está del revés», que sí es un defecto de
 * quien pregunta. La interfaz no los separa leyendo el texto: enseña el mensaje
 * del servidor tal cual y ofrece acercar, que es lo honesto en los dos casos.
 * Separarlos por contrato es #611.
 */
export function planoCatastral(filtro: FiltroDelPlano, senal?: AbortSignal): Promise<PlanoCatastral> {
  return solicitar('/catastro/predios/plano', { parametros: { ...filtro }, senal });
}


/**
 * Un sector del catastro. Es `SectorResource`.
 *
 * Los tres conteos son opcionales porque el listado los trae y el alta no: un
 * `null` ahí significa «no se contó», no «cero».
 */
export type Sector = {
  id: number;
  codigo: string;
  nombre: string;
  zona: string | null;
  activo: boolean;
  manzanas: number | null;
  predios: number | null;
  lotes: number | null;
};

/**
 * Los sectores, para el filtro del padrón.
 *
 * **Exige otro acceso que el padrón** —`sectores`, no `actualizacion_catastro`—,
 * así que puede contestar 403 a quien sí puede listar predios. Quien la llame
 * tiene que saber caer de pie: es lo que hace la pantalla, que cambia el
 * desplegable por una caja de texto en vez de quedarse sin filtro.
 */
export function listarSectores(senal?: AbortSignal): Promise<RespuestaPaginada<Sector>> {
  return solicitar('/catastro/sectores', { parametros: { tamano: 200 }, senal });
}

/**
 * Una manzana del sector. Es `ManzanaResource`.
 *
 * `predios` son los **activos** que la declaran, y `lotes` cuantos valores de
 * lote distintos hay entre ellos. Que `lotes` sea menor que `predios` es lo
 * normal y no un descuadre: tres departamentos de un mismo lote son tres
 * predios y UN lote.
 *
 * **No trae `activa`, y es a proposito**: `manzana` no tiene columna de estado
 * porque una manzana no se edita ni se da de baja —su codigo es un tramo del
 * codigo catastral de sus predios— y un `true` constante seria una columna que
 * no dice nada.
 */
export type Manzana = {
  id: number;
  sectorId: number;
  sectorCodigo: string;
  codigo: string;
  predios: number;
  lotes: number;
};

/**
 * Las manzanas de un sector (#537).
 *
 * Pagina como el resto de listados, y hace falta: un sector de una
 * municipalidad grande pasa de mil manzanas.
 *
 * Un codigo que no existe contesta **404**, no una pagina vacia. La diferencia
 * importa al dibujarlo: cero filas significa «ese sector todavia no tiene
 * manzanas», que es lo contrario de «ese sector no existe».
 */
export function listarManzanasDelSector(
  codigo: string,
  pagina = 0,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Manzana>> {
  return solicitar(`/catastro/sectores/${encodeURIComponent(codigo)}/manzanas`, {
    parametros: { pagina, tamano: 50 },
    senal,
  });
}


/** Una via del catalogo. Es `ViaResource`. */
export type Via = {
  id: number;
  codigo: string;
  tipo: string;
  nombre: string;
  ubigeo: string | null;
  activa: boolean;
};

/**
 * Lo que el catalogo vial deja acotar (#565).
 *
 * `sector` esta declarado en el contrato y **se rechaza con 422 diciendo por
 * que**: una via no pertenece a un sector en el modelo —es del ubigeo, y
 * atraviesa varios—, asi que no se manda.
 */
export type FiltroDeVias = {
  nombreDeCalle?: string;
  codigoDeVia?: string;
  tipoDeVia?: string;
  /** `true` deja fuera las dadas de baja. El alta de un predio siempre lo pide. */
  activa?: boolean;
};

/**
 * El catalogo vial, acotado por el servidor.
 *
 * Hasta #565 esta operacion **no admitia ningun filtro**, asi que un buscador de
 * vias no lo podia resolver el servidor: o se traia el catalogo entero y se
 * filtraba aqui —tres peticiones de 500 al abrir el alta, para las 1 110 vias de
 * Catacaos— o no habia buscador. Ahora busca el servidor, y la busqueda por
 * prefijo llega al indice: se escribe como rango y no con `LIKE`, porque bajo
 * RLS un `LIKE 'prefijo%'` no lo alcanza (DAT-01 §0, tercer hallazgo).
 */
export function listarVias(
  filtro: FiltroDeVias,
  paginacion: Paginacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<Via>> {
  return solicitar('/catastro/vias', { parametros: { ...filtro, ...paginacion }, senal });
}

/**
 * Como se busca una via con lo que se teclea.
 *
 * El codigo es todo digitos —«010128»— y el nombre no, asi que la forma de lo
 * tecleado decide por cual de los dos se pregunta. Es el mismo criterio con que
 * el padron enruta un DNI, un RUC o un nombre, y por lo mismo: quien atiende
 * teclea lo que tiene delante, no elige el campo.
 */
export function filtroDeViaPorCriterio(criterio: string): FiltroDeVias {
  const limpio = criterio.trim();
  return /^\d+$/.test(limpio) ? { codigoDeVia: limpio } : { nombreDeCalle: limpio };
}

/* ══════════ Las tres tablas con que se valoriza un predio ══════════
   Devuelven una LISTA suelta, no el sobre paginado: son cuadros completos de un
   ejercicio, no un padron que se recorra. Y las tres contestan 404 cuando el
   ejercicio no tiene conjunto de parametros sellado, que es lo que pasa hoy
   (D-02a): no es un fallo, es el estado del sistema. */

/** Es `ArancelResource`. El importe llega como texto (RNF-055). */
export type Arancel = {
  id: number;
  viaId: number;
  tramo: string | null;
  valorM2: string;
  documentoFuente: string;
};

/** Es `ValorUnitarioResource`. */
export type ValorUnitario = {
  id: number;
  partida: string;
  categoria: string;
  anioConstruccionDesde: number;
  anioConstruccionHasta: number | null;
  valorM2: string;
  documentoFuente: string;
};

/** Es `DepreciacionResource`. */
export type Depreciacion = {
  id: number;
  uso: string;
  material: string;
  estadoConservacion: string;
  antiguedadHasta: number | null;
  porcentaje: string;
  documentoFuente: string;
};

export function listarAranceles(anio: number, senal?: AbortSignal): Promise<Arancel[]> {
  return solicitar('/catastro/tablas/aranceles', { parametros: { anio }, senal });
}

export function listarValoresUnitarios(anio: number, senal?: AbortSignal): Promise<ValorUnitario[]> {
  return solicitar('/catastro/tablas/valores-unitarios', { parametros: { anio }, senal });
}

export function listarDepreciacion(anio: number, senal?: AbortSignal): Promise<Depreciacion[]> {
  return solicitar('/catastro/tablas/depreciacion', { parametros: { anio }, senal });
}


/**
 * La conciliacion catastro↔rentas (ADR-0015).
 *
 * **Vive bajo `/catastro/fichas/conciliacion` y la sirve `rentas`**: el dato que
 * distingue una ficha conciliada —si el predio declaro— es de rentas, y catastro
 * no puede depender de el sin cerrar un ciclo de modulos.
 *
 * `conciliadaConRentas=No` exige ademas el permiso de fiscalizacion: es la lista
 * de quien tiene ficha y no declara, y esa lista no la ve cualquiera.
 *
 * **Su `totalElementos` NO cuenta lo que el filtro dice.** El filtro se aplica
 * sobre la pagina ya devuelta y el total sigue siendo el del padron sin filtrar
 * —lo dice el javadoc de `ConsultaDeConciliacion`—, asi que
 * `contarFichas({conciliadaConRentas:'No'}).totalElementos` es el padron entero:
 * en Catacaos, 14 422 «sin conciliar» sobre 14 422 predios. Por eso el panel de
 * catastro **no la llama** y dice «—» con su motivo. Sirve para RECORRER la lista
 * pagina a pagina; para contarla, no.
 */
export function contarFichas(
  parametros: { conciliadaConRentas?: 'Si' | 'No' },
  senal?: AbortSignal,
): Promise<RespuestaPaginada<unknown>> {
  return solicitar('/catastro/fichas/conciliacion', { parametros: { ...parametros, tamano: 1 }, senal });
}


/**
 * La ficha del contribuyente. Es lo que devuelve
 * `GET /catastro/contribuyentes/{codigo}/ficha.pdf` **sin** `formato`.
 *
 * Que la ruta acabe en `.pdf` y conteste JSON es deliberado del backend: es el
 * mismo recurso, y `?formato=PDF|XLS|RTF` devuelve el documento. Ese camino
 * **funciona desde #535** —el generador ya consulta el regimen en su propia
 * transaccion—, asi que la pantalla dibuja la hoja con este JSON y ofrece los
 * tres archivos con {@link descargarFichaDelContribuyente}.
 */
export type FichaDelContribuyente = {
  aLaFecha: string;
  codigo: string;
  nombre: string;
  documento: string;
  domicilioFiscal: string | null;
  unidades: {
    codRefCatastral: string;
    direccion: string;
    condicion: string;
    porcentaje: string;
    /* Los tres pueden venir nulos, y significan «predio registrado y todavia
       SIN ficha». Estaban declarados no-nulos, asi que la hoja dibujaba la celda
       vacia: un hueco se lee como «no se dibujo el dato» y no como «este predio
       no tiene con que valorizarse», que es lo que el nulo dice. */
    areaTerreno: string | null;
    uso: string | null;
    version: number | null;
  }[];
};

export function fichaDelContribuyente(
  codigo: string,
  fecha?: string,
  senal?: AbortSignal,
): Promise<FichaDelContribuyente> {
  return solicitar(`/catastro/contribuyentes/${encodeURIComponent(codigo)}/ficha.pdf`, {
    parametros: { fecha },
    senal,
  });
}

/**
 * La misma ficha, como archivo (RF-132).
 *
 * Es la MISMA ruta con `?formato`: el backend no publica una por formato, y
 * pedirla desde aqui en vez de con un enlace es lo que le pone la cabecera
 * `Authorization` —un `<a href>` saldria sin ella y bajaria un 401 con nombre
 * de PDF—. El privilegio es `LECTURA`, el mismo con el que se dibuja la hoja:
 * `ReporteController` lo razona en su javadoc.
 */
export function descargarFichaDelContribuyente(
  codigo: string,
  formato: FormatoDeDocumento,
  fecha?: string,
): Promise<void> {
  return descargar(`/catastro/contribuyentes/${encodeURIComponent(codigo)}/ficha.pdf`, { formato, fecha });
}
