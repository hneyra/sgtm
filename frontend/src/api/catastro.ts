import { descargar, solicitar, type RespuestaPaginada } from './cliente';
import type { FormatoDeDocumento } from './descarga';
import { buscarContribuyentes, type Contribuyente as ContribuyenteDelPadron } from './rentas';

/**
 * Lo que `catastro` publica sobre predios. Los tipos son los `record` del
 * backend, campo por campo: `PredioDelCatastroResource`, `PredioResource` y
 * `TitularesDelPredioResource`.
 */

/** Una fila del padrón. Es `PredioDelCatastroResource`. */
/** Lo que `Observacion.de` exige y el `CHECK` de la auditoria repite (ADR-0008). */
const LARGO_MINIMO_DE_OBSERVACION = 5;

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
    /**
     * Una CADENA, «50.0000», y no un número.
     *
     * `Porcentaje` se serializa como texto igual que `Dinero` (RNF-055), y aquí
     * estaba declarado `number` mientras `api/consultas.ts` lo declaraba
     * `string` para el mismo `TitularesDelPredioResource`. Los dos no podían
     * tener razón, y la mentira no la caza el compilador: se ve el día que
     * alguien SUMA la lista, porque `0 + "50.0000" + "50.0000"` concatena y da
     * `NaN`, mientras que con un solo titular la coerción del `*` lo salva y
     * parece que funciona.
     *
     * Se conserva la escala del padrón: son cuatro decimales, y acortarla al
     * dibujar cambia una cifra del padrón.
     */
    porcentaje: string;
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
  /**
   * El estado de saneamiento de la titularidad del predio (#690).
   *
   * `SIN_TITULAR` es el predio que **no figura a nombre de nadie** y `INCOMPLETA`
   * aquel cuyas cuotas vigentes no suman 100 %. Los dos importan por lo mismo:
   * el `%` de propiedad **pondera la base imponible** (NEG-05), así que un predio
   * cuyas cuotas suman el 10 % tributa por el 10 % de su valor, y uno sin titular
   * no tiene a quién cargárselo. Ninguna cifra parece mal en ninguna pantalla: la
   * determinación sale correcta *para lo registrado*.
   *
   * Medido contra el backend, y son las cifras con las que se abrió #690:
   *
   * ```
   *                SIN_TITULAR  INCOMPLETA  COMPLETA
   * Sullana demo             5           2        25
   * Catacaos              4 977         304     9 141
   * ```
   *
   * Una palabra que no sea una de las tres es **422 nombrando las tres**, no la
   * página vacía —que se leería como «no hay ninguno», que es lo contrario—.
   */
  titularidad?: 'SIN_TITULAR' | 'INCOMPLETA' | 'COMPLETA';
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

/* ══════════ El alta de titularidad: el segundo acto del alta de un predio ══════════ */

/**
 * Las seis condiciones que `CondicionDeTitularidad` declara, **letra por letra**.
 *
 * El desplegable del manual ofrece otras seis —«PROPIETARIO ÚNICO»,
 * «COPROPIETARIO», «POSEEDOR», «SUCESIÓN INDIVISA», «ARRENDATARIO»,
 * «OCUPANTE»— y sólo dos coinciden carácter a carácter con el enumerado:
 * `COPROPIETARIO` y `POSEEDOR`. De las otras cuatro, dos se parecen —«PROPIETARIO
 * ÚNICO» a `PROPIETARIO_UNICO`, «SUCESIÓN INDIVISA» a `SUCESION`— y **dos no son
 * titularidad en absoluto**: un arrendatario y un ocupante no son dueños de nada,
 * son la ocupación, que tiene su propio acto —`POST
 * /catastro/predios/{predioId}/inquilinos`— y su propia tabla.
 *
 * Y el enumerado tiene dos que el desplegable del manual **no ofrece**, `CONYUGE`
 * y `USUFRUCTUARIO`; la primera es justo la que la tabla de titulares del propio
 * prototipo pinta en su columna «Condición» —«CÓNYUGE»—, o sea que el manual
 * enseña un valor que su propio desplegable no deja elegir.
 *
 * Aquí no se traduce ninguno, por lo mismo que #427 no tradujo «ACTIVA» a
 * `VIGENTE`: parecerse no es serlo, y una tabla de equivalencias se queda vieja
 * en silencio. Se ofrecen los seis del dominio con su nombre exacto, y la
 * pantalla dice cuáles del manual quedan fuera y por qué.
 */
export const CONDICIONES_DE_TITULARIDAD = [
  'PROPIETARIO_UNICO',
  'COPROPIETARIO',
  'CONYUGE',
  'POSEEDOR',
  'SUCESION',
  'USUFRUCTUARIO',
] as const;

export type CondicionDeTitularidad = (typeof CONDICIONES_DE_TITULARIDAD)[number];

/** La única que el dominio considera «por el total»: su porcentaje no se declara. */
export const CONDICION_POR_EL_TOTAL: CondicionDeTitularidad = 'PROPIETARIO_UNICO';

/**
 * La cuota de titularidad recién registrada. Es `TitularidadResource`.
 *
 * Trae el `contribuyenteId` porque es la respuesta al acto de registrarlo —quien
 * acaba de declarar de quién es el predio ya sabe de quién es—; la lectura de
 * {@link titularesDelPredio} no lo publica, porque allí pregunta quien todavía no
 * lo sabe (ADR-0015 §2.4).
 *
 * `porcentaje` llega como **texto** y se dibuja como texto: es un objeto de valor
 * y pasarlo por `Number` para volver a formatearlo es como se pierde un decimal.
 * Medido: el titular único vuelve con `"100"` y la lectura del mismo predio lo
 * publica como `"100.0000"` — dos escalas del mismo dato, otra razón para no
 * recomponerlo aquí.
 */
export type Titularidad = {
  titularidadId: number;
  predioId: number;
  contribuyenteId: number;
  condicion: string;
  porcentaje: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  documentoOrigen: string;
};

/**
 * El cuerpo de `POST /catastro/predios/{predioId}/titulares`. **Lista blanca**:
 * es `PeticionDeTitular` del backend, campo por campo.
 *
 * Dos nombres que sorprenden y son los que viajan: el contribuyente entra por
 * `codContribuyente` —no `codigoContribuyente`— y el documento que sustenta la
 * titularidad es `documentoOrigen`, **obligatorio**: medido contra el backend,
 * sin él contesta `422 «Falta el campo 'documentoOrigen'»`. No lleva
 * `vigenciaHasta`: la cuota que se abre está abierta, y cerrarla es lo que hace
 * una transferencia.
 */
export type PeticionDeTitular = {
  observacion: string;
  codContribuyente: string;
  condicion: CondicionDeTitularidad;
  /** Sólo para las cinco condiciones parciales. Texto, no número (regla 1). */
  porcentaje?: string;
  /** AAAA-MM-DD. Ausente, el servidor pone hoy. */
  vigenciaDesde?: string;
  documentoOrigen: string;
};

/**
 * Declara de quién es un predio (#490, RF-005).
 *
 * Es un acto **aparte** del alta del predio, con su propia observación: son dos
 * peticiones y dos motivos en la bitácora. Quien puede inscribir el predio puede
 * declararle titular —las dos exigen `REGISTRO` sobre `actualizacion_catastro`—,
 * así que no hace falta una guarda de permiso propia.
 *
 * **Pasarse del 100 % es un 409 que lo dice la base**, no un `if` de aquí: la
 * suma de cuotas vigentes la vigila un disparador *diferido*, que habla al
 * confirmar. Comprobarlo en la interfaz obligaría a leer los titulares vigentes
 * antes de escribir y a decidir qué hacer con la ventana en la que el total pasa
 * de 100 legítimamente —una transferencia cierra una cuota y abre otra en la
 * misma transacción—, que es exactamente lo que el disparador existe para no
 * tener que decidir. Medido: la segunda cuota de un predio que ya tiene
 * propietario único vuelve
 * `409 «Los porcentajes de titularidad vigentes del predio 14447 suman 110.0000,
 * no pueden exceder 100»`, sin nombrar tabla ni restricción (RNF-033).
 */
export function registrarTitular(predioId: number, peticion: PeticionDeTitular): Promise<Titularidad> {
  return solicitar(`/catastro/predios/${predioId}/titulares`, { metodo: 'POST', cuerpo: peticion });
}

/**
 * El padrón, para elegir al titular por el **código** que la escritura pide.
 *
 * El manual teclea un nombre y el backend quiere el código del contribuyente: es
 * el mismo tropiezo que #427 documentó con «Solicitante», y sin esta resolución
 * lo tecleado viajaría como código y produciría un 404 sobre una persona que sí
 * está en el padrón.
 *
 * Se importa de `./rentas` y **no se copia**: es su operación —`GET
 * /rentas/contribuyentes`—, y dos copias del mismo adaptador es como una de las
 * dos se queda vieja sin que nada lo diga.
 */
export type { Contribuyente } from './rentas';

/**
 * A qué filtro va lo tecleado, y por qué a veces son dos consultas.
 *
 * Los cuatro filtros comparan por igualdad salvo `nombreRazonSocial`, que compara
 * por parecido. La forma de lo tecleado decide, como en el buscador del padrón de
 * Rentas y por lo mismo: quien atiende teclea lo que tiene delante, no elige el
 * campo.
 *
 * **El código no tiene una sola forma, y por eso a veces se pregunta dos veces.**
 * Medido: en Sullana es `C-000001` —con letra y guion— y en Catacaos es
 * `00000000008`, once dígitos como un RUC. De ahí las dos ramas dobles: once
 * dígitos se preguntan como código *y* como RUC —`?codigo=00000000008` devuelve a
 * esa persona y `?rUC=00000000008` devuelve cero, así que elegir una sola deja
 * fuera a media instalación—; y algo sin espacios con algún dígito dentro se
 * pregunta como código *y* por nombre, que es lo que hace que `C-000001`
 * encuentre a alguien. Sin esa segunda rama, un código de Sullana caía en la
 * búsqueda por parecido en el nombre y contestaba «nadie del padrón responde a
 * eso» sobre una persona que sí está registrada — se vio en el navegador antes
 * de que ninguna prueba lo mirara.
 */
function filtrosDelPadron(criterio: string): { codigo?: string; nombreRazonSocial?: string; dNI?: string; rUC?: string }[] {
  const soloDigitos = /^[0-9]+$/.test(criterio);
  if (soloDigitos && criterio.length === 8) return [{ dNI: criterio }];
  if (soloDigitos && criterio.length === 11) return [{ codigo: criterio }, { rUC: criterio }];
  if (soloDigitos) return [{ codigo: criterio }];
  if (!/\s/.test(criterio) && /[0-9]/.test(criterio)) return [{ codigo: criterio }, { nombreRazonSocial: criterio }];
  return [{ nombreRazonSocial: criterio }];
}

/**
 * Busca en el padrón con lo que se tecleó, con las dos lecturas del caso ambiguo
 * ya unidas y sin repetir a nadie.
 *
 * **`totalElementos` de la unión es cuántas filas trae, no cuántas hay.** No se
 * suman los dos totales —quien salga en las dos consultas se contaría dos veces—
 * ni se hereda el de la primera —diría que hay más de lo que se enseña—, y no
 * hay forma de saber el de verdad sin una consulta que el backend no publica.
 * Por eso esta lista **no se pagina y su total no se dibuja en ninguna parte**:
 * lo único que se enseña son sus filas, y `hayMas` dice si alguna de las dos
 * consultas dejó a alguien fuera para que la pantalla lo pueda decir.
 */
export async function buscarEnElPadron(
  criterio: string,
  tamano: number,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<ContribuyenteDelPadron>> {
  const filtros = filtrosDelPadron(criterio.trim());
  const respuestas = await Promise.all(filtros.map((f) => buscarContribuyentes(f, { tamano }, senal)));
  if (respuestas.length === 1) return respuestas[0]!;
  const vistos = new Set<number>();
  const contenido: ContribuyenteDelPadron[] = [];
  for (const r of respuestas)
    for (const c of r.contenido)
      if (!vistos.has(c.id)) {
        vistos.add(c.id);
        contenido.push(c);
      }
  return {
    ...respuestas[0]!,
    contenido,
    totalElementos: contenido.length,
    totalPaginas: contenido.length === 0 ? 0 : 1,
    hayMas: respuestas.some((r) => r.hayMas),
  };
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
 * la respuesta es un **422 `MARCO_CON_DEMASIADOS_LOTES` con la cuenta**, nunca
 * una página con los primeros.
 * Un plano al que le faltan lotes no se ve recortado —se ve como un plano donde
 * ahí no hay lotes—, así que quien lo dibuja no puede tener la opción de
 * ignorar una marca.
 *
 * @property sinGeometria cuántos predios **del padrón**, con los mismos filtros
 *   de sector y manzana, no tienen polígono. Sale **siempre**, cero incluido.
 *   Y no es «los de este marco»: `prediosSinGeometria` consulta con `WHERE
 *   p.geometria IS NULL` y **sin** el marco a propósito —un predio sin polígono
 *   no tiene sitio en ningún marco—. Medido: con `bbox=-180,-90,180,90` y con el
 *   marco de Piura, la misma cifra (14 422 en la municipalidad 9), y con
 *   `codigoDeSector=01`, 1.
 *
 *   Esta frase se escribió **contra la medición y contra el contrato**, que decía
 *   lo otro. #613 le dio la razón a la medición y #644 corrigió la descripción,
 *   así que hoy los dos dicen lo mismo. Lo que ahí se descartó conviene tenerlo a
 *   mano por si alguien quiere «arreglar» la consulta metiéndole el marco: sería
 *   peor que el defecto, porque las cuatro columnas `marco_*` de un predio sin
 *   polígono son nulas y la cifra caería a **cero siempre**, justo cuando más
 *   hace falta —hoy, sin un solo lote digitalizado en ninguna municipalidad—.
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
 * **Su 422 no siempre es un error, y desde #611 se sabe cuál es cuál por el
 * código.** «En este marco hay N lotes y el máximo que se sirve son T» llega con
 * `MARCO_CON_DEMASIADOS_LOTES`: la petición está bien y lo que la resuelve es
 * acercarse. Los demás rechazos llegan con `VALIDACION` y dicen lo contrario
 * —«corrige lo que pediste»—: `PlanoCatastralController` los lanza en cinco
 * sitios, y medidos contra el backend en marcha son «Falta 'bbox'…», «El marco
 * 'bbox' se escribe como 'oeste,sur,este,norte'…», «El marco esta del reves o es
 * degenerado…», «La latitud norte tiene que estar entre -90 y 90 grados…», «La
 * longitud oeste tiene que estar entre -180 y 180 grados…» y los tres de
 * `limite` —no numérico, no positivo, y por encima del tope del servidor—.
 *
 * Antes los compartían todos, y lo único que los separaba era el texto en
 * castellano, que se reescribe.
 */
export function planoCatastral(filtro: FiltroDelPlano, senal?: AbortSignal): Promise<PlanoCatastral> {
  return solicitar('/catastro/predios/plano', { parametros: { ...filtro }, senal });
}

/**
 * Dónde está la municipalidad: el rectángulo que envuelve lo ya digitalizado
 * (#612, PR #689). Es `MarcoDelPlanoResource`.
 *
 * **`marco` puede venir nulo, y las dos ausencias son distintas** porque se
 * arreglan distinto:
 *
 *   - `lotes: 0` es que **ningún predio que alcancen esos filtros tiene polígono
 *     cargado**. Lo que falta es la carga cartográfica, y es el estado de hoy en
 *     las dos municipalidades: medido, `{"marco":null,"lotes":0,…}`.
 *   - `lotes > 0` con `marco` nulo es que lo levantado **no encuadra**: PostGIS
 *     admite un `MULTIPOLYGON` de vértices colineales, así que hay geometría y su
 *     rectángulo es degenerado.
 *
 * Nunca llega `0,0,0,0`, y eso importa: ese rectángulo es un punto en el golfo
 * de Guinea y encuadrar sobre él no se distingue de encuadrar bien cuando no hay
 * base cartográfica debajo. `notaDelMarco` dice cuál de las dos es.
 */
export type MarcoDeLoLevantado = {
  marco: MarcoDelPlano | null;
  lotes: number;
  notaDelMarco: string;
};

/**
 * El encuadre inicial del plano.
 *
 * Se pide con **los mismos filtros** que el plano y no sin ellos: un marco
 * calculado sobre otro conjunto de predios encuadraría sobre algo que después no
 * se dibuja, y sobre un plano sin base cartográfica eso no se ve. Por eso el
 * parámetro es el `FiltroDelPlano` sin su `bbox` —que es justo lo que esta
 * lectura viene a averiguar— ni su `limite`, que aquí no significa nada.
 */
export function marcoDelPlano(
  filtro: Omit<FiltroDelPlano, 'bbox' | 'limite'>,
  senal?: AbortSignal,
): Promise<MarcoDeLoLevantado> {
  return solicitar('/catastro/predios/plano/marco', { parametros: { ...filtro }, senal });
}

/**
 * Las dos cifras del «acércate», leídas de `detalles` y no de la frase.
 *
 * `PlanoCatastralController` las manda como dato —`["lotes=3","tope=2"]`— por lo
 * mismo que manda el código: la frase se reescribe. La prueba de frontera del
 * backend lo fija con un `containsExactly`, así que reescribir el mensaje sin
 * tocar las cifras tiene que dejar esto funcionando.
 *
 * **Devuelve `null` en cada cifra que no venga, y ninguna se inventa.** Un tope
 * ausente no es `LOTES_POR_MARCO` aunque sea lo que se pidió —el servidor tiene
 * el suyo y es él quien lo dice—, y unos lotes ausentes no son cero: cero lotes
 * es exactamente lo contrario de lo que este rechazo significa. Quien las dibuje
 * tiene que saber quedarse sin ellas.
 *
 * No suma, ni resta, ni compara: publicar «faltan N» sería componer una cifra
 * que el servidor no publica (RNF-083 tiene la misma forma para el dinero).
 */
export function cifrasDelMarcoLleno(detalles: readonly string[] | undefined): {
  lotes: number | null;
  tope: number | null;
} {
  return { lotes: enteroDe(detalles, 'lotes'), tope: enteroDe(detalles, 'tope') };
}

/**
 * Un `clave=valor` de `detalles`, y sólo si el valor es un entero entero.
 *
 * Con `Number.parseInt` un «2 000» se leería como 2 y nadie lo notaría (#342 lo
 * midió con las cuotas), así que la forma se exige entera antes de convertir.
 */
function enteroDe(detalles: readonly string[] | undefined, clave: string): number | null {
  const fila = (detalles ?? []).find((d) => d.startsWith(clave + '='));
  if (fila === undefined) return null;
  const valor = fila.slice(clave.length + 1);
  return /^\d+$/.test(valor) ? Number(valor) : null;
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
 * El recuento de la conciliacion catastro↔rentas. Es
 * `ResumenDeConciliacionResource`, campo por campo (#564).
 *
 * Los tres numeros vienen con sus dos referencias y ninguna sobra: **no existe
 * «sin conciliar», existe «sin conciliar a 2026»** (regla 9, RNF-075) —el padron
 * afecto se rehace cada ejercicio, y declarar 2024 no concilia 2026—, y
 * `aLaFecha` porque la poblacion es la de las fichas vigentes ESE dia.
 *
 * `noConciliados` **llega restado del servidor y no se recompone aqui**: es una
 * cifra, componerla en la pantalla es lo que RNF-083 prohibe, y restarla contra
 * el total de otra lectura es exactamente el defecto que este endpoint cierra.
 */
export type ResumenDeConciliacion = {
  ejercicio: number;
  aLaFecha: string;
  total: number;
  conciliados: number;
  noConciliados: number;
};

/**
 * La conciliacion catastro↔rentas, contada (ADR-0015, #564).
 *
 * **Vive bajo `/catastro/fichas/conciliacion` y la sirve `rentas`**: el dato que
 * distingue una ficha conciliada —si el predio declaro— es de rentas, y catastro
 * no puede depender de el sin cerrar un ciclo de modulos.
 *
 * **Esta es la unica forma de contar la conciliacion, y sigue haciendo falta una
 * aparte aunque la grilla ya cuente bien.** Hasta #631 el motivo era que no
 * contaba: su filtro se aplicaba sobre la pagina ya devuelta y su
 * `totalElementos` seguia siendo el del padron SIN filtrar, asi que con
 * `conciliadaConRentas=No` decia 14 422 «sin conciliar» sobre un padron de
 * 14 422 predios en Catacaos. Eso quedo arreglado, y **el motivo ahora es otro**:
 * cada consulta de la grilla con `No` deja una fila `ACCESO` en la bitacora
 * (ADR-0015 §2.3), asi que pedirla solo para leer su total ensuciaria la
 * auditoria con una entrada por cada pintada del panel. Aquella sirve para
 * RECORRER la lista; para contarla, esta.
 *
 * Y a diferencia de aquella con `No`, esta **no exige el permiso de
 * fiscalizacion** (`fisc_omisos`) y **no deja fila en la bitacora**: aquella
 * nombra —es la lista de a quien no le va a llegar recibo— y esta cuenta. Sigue
 * pidiendo el acceso de la pantalla, `consulta_fichas`, que es lo que puede
 * contestar `403` en un perfil que no la tenga.
 */
export function resumenDeConciliacion(
  parametros: { ejercicio?: string; fecha?: string },
  senal?: AbortSignal,
): Promise<ResumenDeConciliacion> {
  return solicitar('/catastro/fichas/conciliacion/resumen', { parametros, senal });
}

/**
 * Una fila de la grilla de fichas con su conciliacion. Es
 * `FichaConciliadaResource`, campo por campo (ADR-0015, #344).
 *
 * Es la fila de `GET /catastro/fichas` con **dos campos mas y ninguno menos**:
 * `conciliada` y el ejercicio al que ese si o ese no responde. No existe
 * «conciliada»: existe `conciliadaA(ejercicio)` (regla 9, RNF-075), porque el
 * padron afecto se rehace cada año y declarar 2024 no concilia 2026.
 *
 * **Lo que NO trae, y es el motivo de que el recurso exista** (ADR-0015 §2.2):
 * ni el numero de la declaracion jurada, ni su tipo, ni su fecha, ni sus
 * importes, ni quien la presento. Quien puede mirar el catastro no adquiere con
 * eso permiso de mirar las declaraciones de nadie.
 *
 * `titular` es **el nombre y nada mas**: ni su codigo ni su identificador
 * (ADR-0015 §2.4), asi que la celda no enlaza a ninguna parte. Y llega nulo
 * cuando el predio no tiene titular vigente a la fecha —4 977 de los 14 422 de
 * Catacaos (#690)—, que no es un hueco del recurso sino el predio que hay que
 * revisar.
 *
 * Las dos areas llegan como **texto** y se dibujan como llegan: son `AreaM2`,
 * que `ConfiguracionDeJson` serializa con la cifra sola —`"360.00"`— y sin su
 * unidad, que la pone la cabecera de la columna (#607).
 */
export type FichaConciliada = {
  /** El de la FICHA, no el del predio: una ficha nueva versiona y cambia de id. */
  id: number;
  predioId: number;
  codRefCatastral: string;
  direccion: string;
  manzana: string | null;
  lote: string | null;
  /** `UNICA` | `ECONOMICA` | `BIENES_COMUNES` | `RURAL`, el `TipoFicha` del dominio. */
  tipo: string;
  version: number;
  areaTerreno: string;
  areaConstruida: string | null;
  uso: string;
  vigenciaDesde: string;
  titular: string | null;
  conciliada: boolean;
  /** A que ejercicio responde `conciliada`. Viene siempre, se pida o no (regla 9). */
  conciliadaA: number;
};

/**
 * Los tres valores del desplegable «Conciliada con rentas», tal como el
 * controlador los lee.
 *
 * Se escriben aqui y no como `string` libre porque `ConciliacionController`
 * admite exactamente estos —y `Todos` y `Si` sin tilde, que no se ofrecen para
 * no tener dos grafias de lo mismo— y **contesta 422 con cualquier otro**: con
 * un `string` la abreviatura plausible compila y el rechazo aparece en
 * ventanilla.
 *
 * **`'No'` no es un filtro mas.** Es la lista de los predios que no generan
 * deuda predial, o sea el mapa de a quien no le va a llegar recibo: exige
 * **ademas** privilegio de lectura sobre `fisc_omisos` y **deja fila en la
 * bitacora** con operacion `ACCESO` (ADR-0015 §2.3). Las otras dos no, porque
 * dicen quien esta dentro y no quien falta.
 */
export type ConciliadaConRentas = 'Todas' | 'Sí' | 'No';


/**
 * Lo que la grilla de la conciliacion deja acotar.
 *
 * **Los ocho acotan de verdad, medido contra el backend** — que es lo que hay
 * que comprobar antes de dibujar un filtro, porque uno declarado y no leido
 * devuelve la tabla entera con un 200 encima y eso se lee como un padron que
 * esta mal (#544, #431, #541). Sobre la municipalidad de demostracion, con 23
 * fichas vigentes:
 *
 * ```
 *   sin filtro                              23
 *   codRefCatastral=200104010010 (prefijo)   3
 *   contribuyente=Ramirez Chulle             2
 *   manzana=001                              6
 *   lote=001                                15
 *   tipo=UNICA / ECONOMICA / RURAL      13 / 5 / 3
 *   conciliadaConRentas=Sí / No           0 / 23
 *   fecha=2020-01-01                         0
 * ```
 *
 * `ejercicio` no cambia **cuantas** filas salen —la poblacion son las fichas
 * vigentes a la fecha— sino **a que año** contesta la columna: con `2024` las 23
 * salen con `conciliadaA: 2024`.
 *
 * `contribuyente` **se resuelve por parecido contra el padron** y no por
 * subcadena: el umbral es 0,30 de `similarity` sobre el nombre entero, asi que
 * «Ramirez Chulle» encuentra a «DEMO Ramirez Chulle Marina» y «Ramirez» solo
 * **no llega** —medido: 2 filas y 0—. La pantalla lo dice, porque cero filas por
 * quedarse corto es indistinguible de cero filas porque no hay ninguna.
 *
 * `uso` **no esta**, aunque `FiltroDeFichas` lo tenga: `FichasDelPadronCatastro`
 * le pasa `null` a esta ruta, asi que no se dibuja.
 */
export type FiltroDeConciliacion = {
  /** Prefijo del codigo de referencia catastral. */
  codRefCatastral?: string;
  contribuyente?: string;
  manzana?: string;
  lote?: string;
  tipo?: TipoDeFicha;
  conciliadaConRentas?: ConciliadaConRentas;
  /** A que ejercicio responde la conciliacion; si falta, el de la fecha de corte. */
  ejercicio?: string;
  /** Fecha de corte a la que se resuelven la version vigente y el titular. */
  fecha?: string;
};

/**
 * Por que campo deja ordenar el servidor, **medido uno a uno**.
 *
 * Los otros nueve que la fila publica contestan **422 «No se puede ordenar por
 * ese campo»**: `manzana`, `lote`, `tipo`, `areaTerreno`, `areaConstruida`,
 * `version`, `titular`, `conciliada` y `predioId`. Se escriben como union y no
 * como `string` por lo mismo que los tres filtros cerrados: con `string` la
 * columna plausible compila y el 422 llega despues de pulsar la cabecera.
 *
 * **`conciliada` no esta, y es la que se echaria en falta**: ordenar por la
 * columna de la conciliacion no se puede, y por eso la lista de los que no
 * declararon se pide con el filtro y no con el orden.
 */
export type OrdenDeConciliacion = 'codRefCatastral' | 'direccion' | 'uso' | 'vigenciaDesde' | 'id';

export type PaginacionDeConciliacion = Omit<Paginacion, 'ordenarPor'> & {
  ordenarPor?: OrdenDeConciliacion;
};

/**
 * La grilla de fichas con su conciliacion catastro↔rentas (ADR-0015, #344).
 *
 * **Es la lista que el recuento cuenta.** `resumenDeConciliacion` dice *cuantos*
 * y esta dice *cuales*, y esa es toda la diferencia: aquel no pide el permiso de
 * fiscalizacion ni deja rastro porque no nombra a nadie; esta con
 * `conciliadaConRentas: 'No'` hace las dos cosas, porque nombrar es justo lo que
 * hace.
 *
 * **Vive bajo `/catastro/fichas/…` y la sirve `rentas`**: el dato que distingue
 * una ficha conciliada —si el predio declaro— es de rentas, y catastro no puede
 * depender de el sin cerrar un ciclo de modulos. El acceso que exige, en cambio,
 * es el de la **pantalla** y no el del modulo: `consulta_fichas`.
 *
 * El predicado, entero: un predio esta conciliado a un ejercicio cuando existe
 * una declaracion jurada de ese ejercicio, **con su mismo `predio_id`**, en
 * estado `PRESENTADA` u `OBSERVADA`. Que se derive del predio y no de la ficha
 * es lo que impide acusar de omiso a quien declaro (#344): la DJ que produce
 * ventanilla antes de que el predio tenga ficha —y **toda** fila anterior a
 * `V19`— lleva `ficha_catastral_id` nulo.
 *
 * Pagina, y hace falta: son 14 422 fichas en Catacaos.
 */
export function listarFichasConciliadas(
  filtro: FiltroDeConciliacion,
  paginacion: PaginacionDeConciliacion,
  senal?: AbortSignal,
): Promise<RespuestaPaginada<FichaConciliada>> {
  return solicitar('/catastro/fichas/conciliacion', {
    parametros: { ...filtro, ...paginacion },
    senal,
  });
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

/* ══════════ La ficha catastral: leerla antes de escribirla ══════════

   Cuatro lecturas y cuatro escrituras para un solo objeto, porque el manual
   tiene cuatro fichas y cada una es una opcion suya. Los cuatro `GET` devuelven
   el MISMO `FichaResource` —con el bloque de detalle que le toca y los otros
   dos en nulo— y los cuatro `PUT` reciben el mismo cuerpo. */

/** Los cuatro valores de `TipoFicha`, tal como los publica la lectura. */
export type TipoDeFicha = 'UNICA' | 'ECONOMICA' | 'BIENES_COMUNES' | 'RURAL';

/**
 * Los cuatro, en el orden en que `TipoFicha` los declara: es el del desplegable
 * que filtra la consulta de fichas.
 *
 * El backend **no lee con tolerancia** ahí: cualquier otra palabra es 422 —«El
 * tipo de ficha va entre UNICA, ECONOMICA, BIENES_COMUNES y RURAL»—, así que la
 * abreviatura plausible no vale y una tilde tampoco. La lista se escribe una
 * vez y el desplegable la recorre, para que no pueda ofrecer una quinta.
 *
 * El rótulo con que se dibujan es otra cosa y vive en la pantalla
 * (`rotuloDeModalidad`): el manual llama «urbana individual» a `UNICA`.
 */
export const TIPOS_DE_FICHA: readonly TipoDeFicha[] = ['UNICA', 'ECONOMICA', 'BIENES_COMUNES', 'RURAL'];

/** El tramo de ruta de cada tipo. No es el nombre del enumerado, y por eso hay tabla. */
export type ModalidadDeFicha = 'urbana' | 'economica' | 'bienes-comunes' | 'rural';

/**
 * De que tipo de ficha es cada modalidad de la ruta.
 *
 * `UNICA` se sirve en `/urbana/`, que es la asimetria mas visible de este
 * contrato: el manual llama «ficha urbana individual» a lo que el dominio llama
 * ficha unica. Se respeta porque es la ruta publicada.
 */
export const MODALIDAD_DE_TIPO: Record<TipoDeFicha, ModalidadDeFicha> = {
  UNICA: 'urbana',
  ECONOMICA: 'economica',
  BIENES_COMUNES: 'bienes-comunes',
  RURAL: 'rural',
};

/**
 * Lo construido en un piso. Es `FichaResource.ConstruccionResource`.
 *
 * `categorias` llega como el dominio la imprime —`"[CCDCCDC]"`—: siete letras
 * en el orden muros, techos, pisos, puertas y ventanas, revestimientos, banos e
 * instalaciones. No se parte aqui para volver a juntarla al escribir: se parte
 * donde se dibuja, y viaja letra a letra en siete campos distintos.
 *
 * **`porcentajeConstruido` se lee y no se puede escribir**, y es lo que decide
 * que esta pantalla no mande la lista: `DeclaracionDeFicha.ConstruccionDeclarada`
 * no tiene ese campo, asi que devolver las construcciones tal como se leyeron
 * deja el porcentaje de TODOS los pisos en nulo. Medido contra el backend: se
 * mando una construccion completa y volvio `"porcentajeConstruido": null`.
 */
export type ConstruccionDeLaFicha = {
  id: number;
  piso: string;
  /** Metros cuadrados, sin unidad dentro. La cabecera de la columna la pone. */
  areaConstruida: string;
  anioConstruccion: number | null;
  material: string | null;
  estadoConservacion: string | null;
  categorias: string;
  /** `"100.0000 %"`. Nulo es «la ficha no lo declara», que no es declarar cero. */
  porcentajeConstruido: string | null;
};

/**
 * Una obra complementaria. Es `FichaResource.InstalacionResource`.
 *
 * `cantidad` viene con su unidad dentro —`"42.00 ML"`— y `unidad` viene aparte:
 * son el mismo dato dos veces, y la columna de una grilla usa la segunda para
 * no tener que partir la primera.
 */
export type InstalacionDeLaFicha = {
  id: number;
  descripcion: string;
  unidad: string;
  cantidad: string;
  anioConstruccion: number | null;
  estadoConservacion: string | null;
};

/**
 * Una actividad economica declarada. Es `FichaResource.ActividadResource`.
 *
 * `licenciaNumero` nulo **no es un dato que falte**: es el hallazgo —este local
 * no tiene licencia—, y fiscalizacion sale de ahi.
 *
 * `vigenciaDesde` es el otro campo que se lee y no se puede escribir
 * (`ActividadDeclarada` no lo lleva), asi que reenviar las actividades tal como
 * se leyeron dejaria sin fecha la declaracion de todas.
 */
export type ActividadDeLaFicha = {
  id: number;
  conductor: string;
  nombreComercial: string | null;
  ciiu: string | null;
  areaOcupada: string | null;
  licenciaNumero: string | null;
  licenciaFecha: string | null;
  anuncioNumero: string | null;
  anuncioFecha: string | null;
  vigenciaDesde: string | null;
};

/** Un area comun de la edificacion. Es `FichaResource.BienResource`. */
export type BienComunDeLaFicha = {
  id: number;
  descripcion: string;
  area: string;
  material: string | null;
  estadoConservacion: string | null;
  anioConstruccion: number | null;
};

/**
 * Cuanto de lo comun le toca a una unidad. Es `FichaResource.ParticipacionResource`.
 *
 * La unidad se nombra por su `predioId` y no por su codigo catastral: es como
 * la publica la lectura y como la pide la escritura, y resolver el codigo por
 * unidad seria una consulta por fila.
 */
export type ParticipacionDeLaFicha = { predioId: number; porcentaje: string };

/**
 * Un grupo de tierra del predio rustico. Es `FichaResource.TierraResource`.
 *
 * Las superficies van **en hectareas y con su unidad dentro** —`"1.0500 HA"`—:
 * el arancel rural es por hectarea, y leerlas como metros calcularia diez mil
 * veces de menos.
 */
export type TierraDeLaFicha = {
  id: number;
  clasificacion: string;
  calidadAgrologica: string | null;
  riego: string;
  hectareas: string;
  hectareasComunes: string | null;
};

/** Con quien linda el predio rustico. Es `FichaResource.ColindanteResource`. */
export type ColindanteDeLaFicha = { orientacion: string; descripcion: string };

/**
 * Una fila del historico. Es `FichaResource.VersionResource`.
 *
 * La observacion es la mitad util: un diff dice que el area paso de 120 a 180 y
 * solo ella dice que fue una fiscalizacion de campo y no un error de tecleo.
 */
export type VersionDeLaFicha = {
  id: number;
  version: number;
  areaTerreno: string;
  uso: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  vigente: boolean;
  origen: string;
  documentoOrigen: string;
  observacion: string;
  usuario: string;
  registradaEn: string;
};

/**
 * Una version de la ficha catastral. Es `FichaResource`, campo por campo.
 *
 * **Ni un importe.** Ni valor unitario, ni arancel, ni valor de obra
 * complementaria, ni autovaluo: son D-02a/D-11 y viven en datos versionados
 * (regla 5). Lo que se publica es lo que el tecnico midio y clasifico, y por eso
 * las cuatro cifras de «Valuacion del ejercicio» del artboard no tienen de donde
 * salir.
 *
 * Los tres bloques de detalle son **nulos salvo el que toca**: una ficha rural
 * no publica un bloque economico vacio, porque «este predio no declara
 * actividad» y «esta ficha no es de las que la declaran» no son lo mismo.
 *
 * `historico` nulo significa «no lo pediste»; una lista vacia no puede pasar.
 */
export type FichaCatastral = {
  id: number;
  predioId: number;
  tipo: TipoDeFicha;
  version: number;
  areaTerreno: string;
  uso: string;
  /** Metros lineales, con su unidad dentro: `"12.50 ML"`. */
  frontis: string | null;
  condicionPropiedad: string | null;
  tipoEdificacion: string | null;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  vigente: boolean;
  origen: string;
  documentoOrigen: string;
  /** La observacion con que se registro ESTA version, no la del acto siguiente. */
  observacion: string;
  denominacion: string | null;
  construcciones: ConstruccionDeLaFicha[];
  instalaciones: InstalacionDeLaFicha[];
  economico: {
    actividades: ActividadDeLaFicha[];
    informacionComplementaria: string | null;
    /** Cuantas de las actividades no tienen licencia. Lo cuenta el servidor. */
    sinLicencia: number;
  } | null;
  bienesComunes: {
    bienes: BienComunDeLaFicha[];
    participaciones: ParticipacionDeLaFicha[];
    areaComunTotal: string;
  } | null;
  rural: {
    tierras: TierraDeLaFicha[];
    colindantes: ColindanteDeLaFicha[];
    hectareasTotales: string;
  } | null;
  historico: VersionDeLaFicha[] | null;
};

/**
 * La ficha vigente de un predio, del tipo que sea.
 *
 * Contesta **404** cuando el predio no tiene ficha de ese tipo vigente a la
 * fecha, y no es un fallo del sistema: lo que falta es la PRIMERA version, y esa
 * se registra con el `POST` de su tipo. Medido: pedir `/rural/` sobre un predio
 * con ficha unica devuelve `404 «El predio no tiene ficha RURAL vigente al …»`.
 *
 * Cada modalidad exige **su propio acceso** —`ficha_urbana`, `ficha_economica`,
 * `ficha_bienes`, `ficha_rural`—, asi que un perfil puede leer unas y no otras.
 */
export function leerFicha(
  modalidad: ModalidadDeFicha,
  codigo: string,
  opciones: { fecha?: string; historico?: boolean } = {},
  senal?: AbortSignal,
): Promise<FichaCatastral> {
  return solicitar(`/catastro/fichas/${modalidad}/${encodeURIComponent(codigo)}`, {
    parametros: { fecha: opciones.fecha, historico: opciones.historico ? 'true' : undefined },
    senal,
  });
}

/**
 * Una fila de la consulta de fichas. Es `FichaEncontradaResource`.
 *
 * Se usa para **una sola cosa** y conviene decirlo: `GET /catastro/predios` no
 * publica de que TIPO es la ficha de un predio —solo `fichado: true|false`—, y
 * sin el tipo no se sabe cual de las cuatro lecturas pedir. Preguntarlo aqui
 * cuesta una peticion; probar las cuatro costaria hasta cuatro y tres serian
 * `404` a proposito.
 *
 * Exige el acceso `consulta_fichas`, que **no** es el de la ficha ni el de la
 * actualizacion: un perfil que actualice el catastro sin poder consultar fichas
 * recibe `403` aqui y la pantalla lo dice en vez de quedarse en blanco.
 */
export type FichaEncontrada = {
  id: number;
  predioId: number;
  codRefCatastral: string;
  direccion: string;
  manzana: string | null;
  lote: string | null;
  tipo: TipoDeFicha;
  version: number;
  areaTerreno: string;
  /** La construida del predio entero. La suma la hace el servidor, no la pantalla. */
  areaConstruida: string | null;
  uso: string;
  vigenciaDesde: string;
  titular: string | null;
};

/**
 * De que tipo es la ficha vigente de este predio, si tiene alguna.
 *
 * Devuelve `null` cuando la consulta no encuentra ninguna: es lo mismo que dice
 * `fichado: false` del padron, medido —el filtro compara el codigo por igualdad
 * y un codigo que no esta devuelve `totalElementos: 0`—.
 */
export async function fichaDelPredio(codigo: string, senal?: AbortSignal): Promise<FichaEncontrada | null> {
  const pagina = await solicitar<RespuestaPaginada<FichaEncontrada>>('/catastro/fichas', {
    parametros: { codRefCatastral: codigo, tamano: 1 },
    senal,
  });
  /* Se comprueba que la fila devuelta sea la que se pidio. El filtro es exacto
     hoy; si dejara de serlo, la pantalla ensenaria la ficha de otro predio bajo
     el codigo de este, que es indistinguible de lo correcto. */
  const fila = pagina.contenido[0];
  return fila !== undefined && fila.codRefCatastral === codigo ? fila : null;
}

/**
 * Los cuatro valores de `OrigenDeLaFicha`, **letra por letra**.
 *
 * El desplegable «Fuente de la informacion» del manual ofrece otros cuatro
 * —«DECLARACION DEL TITULAR», «INSPECCION DE CAMPO», «CONVENIO
 * INTERINSTITUCIONAL», «BARRIDO CATASTRAL»— y **ninguno coincide** con estos:
 * dos se parecen —«DECLARACION DEL TITULAR» a `DECLARACION_JURADA`,
 * «INSPECCION DE CAMPO» a `FISCALIZACION`— y los otros dos no tienen
 * equivalente, mientras `RESOLUCION` y `MIGRACION` no estan en el desplegable.
 *
 * Aqui no se traduce ninguno, por lo mismo que #427 no tradujo «ACTIVA» a
 * `VIGENTE`: parecerse no es serlo, y una declaracion jurada del contribuyente
 * no es lo mismo que una inspeccion de campo —la primera admite discusion con su
 * documento y la segunda se sustenta en un acta—. La pantalla ofrece los cuatro
 * del dominio y dice cuales del manual quedan fuera.
 */
export const ORIGENES_DE_FICHA = ['DECLARACION_JURADA', 'FISCALIZACION', 'RESOLUCION', 'MIGRACION'] as const;
export type OrigenDeFicha = (typeof ORIGENES_DE_FICHA)[number];

/**
 * El cuerpo de `PUT /catastro/fichas/…/actualizacion`. **Lista blanca**: es
 * `ActualizacionController.PeticionDeActualizacion`, campo por campo.
 *
 * <h2>Lo que este cuerpo NO lleva, y por eso no se puede escribir</h2>
 *
 * Ni `areaTerreno`, ni `uso`, ni `denominacion`, ni `frontis`, ni
 * `condicionPropiedad`, ni `tipoEdificacion`. Los tres primeros solo entran en
 * el `POST` del alta; el area y el uso los cambia ademas `actualizarEstructura`,
 * que tiene **un solo llamador** —el puerto por el que fiscalizacion escribe en
 * el padron— y una regla de arquitectura que lo vigila. Los tres ultimos no los
 * lleva ningun cuerpo del contrato: se leen y no se escriben desde ninguna
 * pantalla.
 *
 * <h2>Nulo es «no cambia»; presente aunque vacio es «esto es»</h2>
 *
 * Una lista ausente copia la de la version vigente; una lista **presente aunque
 * vacia** la reemplaza. Confundirlas vacia las construcciones, las actividades o
 * los grupos de tierra sin que ningun `DELETE` aparezca en ningun sitio, que es
 * justo lo que el versionado existe para evitar. Por eso los campos son
 * opcionales y **no se rellenan con `[]` por comodidad**.
 */
export type PeticionDeActualizacionDeFicha = {
  /** Obligatoria (regla 10, RNF-052). Sin ella el backend contesta 422 y no guarda nada. */
  observacion: string;
  /** Obligatorio. Medido: sin el, `422 «Falta el campo 'documentoOrigen'»`. */
  documentoOrigen: string;
  /**
   * De donde sale la version. **Opcional en el backend, obligatorio aqui.**
   * Medido: sin el, la peticion entra y queda registrada como
   * `DECLARACION_JURADA` —o sea, «lo declaro el contribuyente» dicho de una
   * inspeccion de campo—, que es una afirmacion que nadie hizo.
   */
  origen: OrigenDeFicha;
  /**
   * Desde cuando rige la version nueva. Sin ella, hoy.
   *
   * Medido: **dos versiones no pueden empezar el mismo dia**. Versionar una
   * ficha que ya se versiono hoy responde `422 «No se puede cerrar el
   * 2026-09-01 una version que empezo a regir el 2026-09-02»`, porque la
   * anterior se cierra el dia de antes.
   */
  vigenciaDesde?: string;
  construcciones?: {
    piso: string;
    areaConstruida: string;
    anioConstruccion?: number;
    material?: string;
    estadoConservacion?: string;
    categoriaMuros?: string;
    categoriaTechos?: string;
    categoriaPisos?: string;
    categoriaPuertas?: string;
    categoriaRevestimientos?: string;
    categoriaBanios?: string;
    categoriaInstalaciones?: string;
  }[];
  instalaciones?: {
    descripcion: string;
    /** Sin unidad dentro: la unidad va en su propio campo. */
    cantidad: string;
    unidad: string;
    anioConstruccion?: number;
    estadoConservacion?: string;
  }[];
  economico?: {
    actividades?: {
      conductor: string;
      nombreComercial?: string;
      ciiu?: string;
      areaOcupada?: string;
      licenciaNumero?: string;
      licenciaFecha?: string;
      anuncioNumero?: string;
      anuncioFecha?: string;
    }[];
    informacionComplementaria?: string;
  };
  bienesComunes?: {
    bienes?: { descripcion: string; area: string; material?: string; estadoConservacion?: string; anioConstruccion?: number }[];
    participaciones?: { predioId: number; porcentaje: string }[];
  };
  rural?: {
    tierras?: { clasificacion: string; calidadAgrologica?: string; riego: string; hectareas: string; hectareasComunes?: string }[];
    colindantes?: { orientacion: string; descripcion: string }[];
  };
  /**
   * La correccion de los datos **del predio**, no de su ficha. Trivaluada
   * tambien: ausente es «no cambia» y la cadena vacia es «se borra». El codigo
   * de referencia catastral no esta, y no es un olvido: identifica al predio, y
   * cambiarlo no es corregirlo sino declarar otro.
   */
  predio?: {
    tipoPredio?: TipoDePredio;
    direccion?: string;
    codigoDeVia?: string;
    numeroMunicipal?: string;
    codigoDeSector?: string;
    codigoDeManzana?: string;
    lote?: string;
    ubigeo?: string;
  };
};

/**
 * Las claves que el cuerpo admite. Se declaran aparte de su tipo porque el tipo
 * se borra al compilar y el arnes de `verificaciones/ficha-catastral.mjs` las
 * necesita para comprobar que ningun campo de la pantalla dice viajar por una
 * clave que este cuerpo no tiene.
 */
export const CAMPOS_DEL_CUERPO_DE_ACTUALIZACION = [
  'observacion',
  'documentoOrigen',
  'origen',
  'vigenciaDesde',
  'construcciones',
  'instalaciones',
  'economico',
  'bienesComunes',
  'rural',
  'predio.tipoPredio',
  'predio.direccion',
  'predio.codigoDeVia',
  'predio.numeroMunicipal',
  'predio.codigoDeSector',
  'predio.codigoDeManzana',
  'predio.lote',
  'predio.ubigeo',
] as const;

/**
 * Lo que impide versionar la ficha, dicho entero, o `null` si nada lo impide.
 *
 * Es una funcion pura y esta aparte del componente **para que se pueda romper**:
 * el arnes le quita la observacion, o la ficha leida, y comprueba que se niega
 * nombrando lo que falta. Dentro de un `useEffect` no habria como.
 *
 * Las dos negativas que importan:
 *
 * 1. **Sin observacion no se guarda** (regla 10, RNF-052). No es cortesia con el
 *    backend —que tambien contesta 422—: es que la version anterior queda en el
 *    historico y lo unico que explica por que se cambio es esa frase.
 * 2. **Sin haber leido la ficha no se manda nada.** Mandar sin leer es crear una
 *    version nueva de una ficha real con lo que hubiera en pantalla, y como
 *    versionar no borra, la buena queda cerrada debajo de la inventada sin
 *    forma de deshacerlo.
 */
export function impedimentoDeActualizacion(estado: {
  ficha: FichaCatastral | null;
  observacion: string;
  documentoOrigen: string;
  vigenciaDesde: string;
}): string | null {
  if (estado.ficha === null) {
    return 'La ficha de este predio no se ha podido leer, y sin leerla no se manda nada: la versión nueva se escribiría con lo que haya en pantalla y dejaría la buena cerrada debajo.';
  }
  if (estado.observacion.trim().length < LARGO_MINIMO_DE_OBSERVACION) {
    return 'Falta la observación: toda modificación exige el motivo de quien la hace, y es lo único que explica el cambio cuando esta versión pase al histórico.';
  }
  if (estado.documentoOrigen.trim() === '') {
    return 'Falta el documento de origen: es el papel que sustenta la versión nueva, y el backend lo exige.';
  }
  /* La fecha tiene que ser POSTERIOR a la que rige, porque la version vigente se
     cierra el dia de antes. Se comprueba aqui para no gastar una peticion en un
     422 que se puede explicar mejor: el mensaje del servidor habla de cerrar una
     version, y quien atiende necesita saber que la ficha ya se versiono hoy. */
  if (estado.vigenciaDesde !== '' && estado.vigenciaDesde <= estado.ficha.vigenciaDesde) {
    return (
      'La versión ' +
      estado.ficha.version +
      ' rige desde el ' +
      estado.ficha.vigenciaDesde +
      ', así que la siguiente no puede empezar ese mismo día ni antes: se cerraría la anterior el día anterior a su propio comienzo.'
    );
  }
  return null;
}

/**
 * Versiona la ficha catastral (RF-001…RF-004).
 *
 * **`PUT` no significa sobrescribir**: lo que hace por debajo es crear la
 * version siguiente y cerrar la anterior el dia antes. La ficha de ayer sigue
 * entera y se lee con `?historico=true`.
 *
 * La ruta de la urbana **no lleva el tramo del tipo** —`/catastro/fichas/{codigo}/actualizacion`—
 * y las otras tres si. Es la asimetria del contrato y se respeta: renombrarla
 * seria renombrar una operacion publicada.
 */
export function actualizarFicha(
  modalidad: ModalidadDeFicha,
  codigo: string,
  peticion: PeticionDeActualizacionDeFicha,
): Promise<FichaCatastral> {
  const tramo = modalidad === 'urbana' ? '' : `${modalidad}/`;
  return solicitar(`/catastro/fichas/${tramo}${encodeURIComponent(codigo)}/actualizacion`, {
    metodo: 'PUT',
    cuerpo: peticion,
  });
}
