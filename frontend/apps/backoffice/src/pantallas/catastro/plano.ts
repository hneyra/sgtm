import { pedirOperacion } from '@sgtm/api-client';

/**
 * Lo que la lectura del plano devuelve (`GET /catastro/predios/plano`, ADR-0022).
 *
 * **Es el contrato, no una comodidad de esta pantalla.** Los nombres son los del
 * `Resource` que el backend tendra que publicar, y el proxy los sirve ya con esa
 * forma (`packages/api-mock/src/recursos.ts`), que es lo que permite encender la
 * ruta sin reescribir nada (#400).
 *
 * Lo que **no** trae, y esta dicho en el ADR: ni titular —se resuelve al clic,
 * de un predio cada vez (ADR-0015 §2.4)—, ni areas —la del poligono no es la
 * imponible (ADR-0021)—, ni arancel —no es resoluble por lote, ADR-0022 §5—.
 */
export interface LoteDelPlano {
  readonly predioId: number;
  readonly codRefCatastral: string;
  readonly codigoDeSector: string | null;
  readonly codigoDeManzana: string | null;
  readonly lote: string | null;
  readonly codigoDeVia: string | null;
  readonly via: string | null;
  readonly estado: string;
  readonly fichado: boolean;
  readonly geometria: GeometriaDelLote;
}

/** GeoJSON tal cual sale de `ST_AsGeoJSON` sobre `geography(MultiPolygon, 4326)`. */
export interface GeometriaDelLote {
  readonly type: string;
  /** Poligonos → anillos → vertices `[lon, lat]`, en grados WGS84. */
  readonly coordinates: readonly (readonly (readonly (readonly number[])[])[])[];
}

export interface Plano {
  /** El marco que se pidio, devuelto por el servidor: `oeste,sur,este,norte`. */
  readonly marco: string;
  readonly limite: number;
  readonly lotes: readonly LoteDelPlano[];
  /**
   * Cuantos predios del mismo marco **no tienen poligono**.
   *
   * Es la mitad de esta lectura y no un extra (ADR-0022 §3): sin esta cifra un
   * plano con doscientos lotes dibujados y ochocientos sin levantar dice «este
   * sector tiene doscientos lotes», y lo que pasa es que tiene mil.
   */
  readonly sinGeometria: number;
}

/** `oeste,sur,este,norte` en grados. Es como viaja el marco y como lo lee Leaflet. */
export interface Marco {
  readonly oeste: number;
  readonly sur: number;
  readonly este: number;
  readonly norte: number;
}

export const comoTexto = (marco: Marco): string =>
  [marco.oeste, marco.sur, marco.este, marco.norte].map((g) => g.toFixed(6)).join(',');

/**
 * El marco con el que se abre el visor.
 *
 * **No es la posicion de ninguna municipalidad**: es un encuadre inicial del que
 * el mapa sale en cuanto tiene lotes que enseñar —se ajusta a ellos— o en cuanto
 * el usuario mueve la vista. Fijar aqui las coordenadas del distrito piloto
 * seria cablear una municipalidad en un producto multi-municipal.
 */
export const MARCO_INICIAL: Marco = {
  oeste: -80.702,
  sur: -4.906,
  este: -80.669,
  norte: -4.881,
};

/** Cuantos lotes se piden como maximo. Si el marco tiene mas, el servidor se niega. */
export const LIMITE = 2000;

export async function pedirPlano(
  marco: Marco,
  filtros: { readonly codigoDeSector?: string; readonly codigoDeManzana?: string },
  signal?: AbortSignal,
): Promise<Plano> {
  const cuerpo = await pedirOperacion(
    'plano_catastral',
    {
      bbox: comoTexto(marco),
      limite: String(LIMITE),
      ...(filtros.codigoDeSector === undefined ? {} : { codigoDeSector: filtros.codigoDeSector }),
      ...(filtros.codigoDeManzana === undefined
        ? {}
        : { codigoDeManzana: filtros.codigoDeManzana }),
    },
    signal,
  );
  return leerPlano(cuerpo);
}

/**
 * Lee la respuesta **comprobando que sea la del plano**.
 *
 * Un cuerpo que no traiga `lotes` no es un plano vacio: es otra cosa. Sin esta
 * guarda, la pantalla dibujaria un mapa sin lotes y un contador en cero —el
 * defecto de #363, que deja la tabla vacia en silencio— en vez de decir que la
 * respuesta no es la que esperaba.
 */
export function leerPlano(cuerpo: unknown): Plano {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    throw new Error('La respuesta del plano no es un objeto');
  }
  const dato = cuerpo as Record<string, unknown>;
  if (!Array.isArray(dato['lotes'])) {
    throw new Error('La respuesta del plano no trae la lista de lotes');
  }
  return {
    marco: typeof dato['marco'] === 'string' ? dato['marco'] : '',
    limite: typeof dato['limite'] === 'number' ? dato['limite'] : LIMITE,
    sinGeometria: typeof dato['sinGeometria'] === 'number' ? dato['sinGeometria'] : 0,
    lotes: dato['lotes'] as readonly LoteDelPlano[],
  };
}

/**
 * Como se rotula un lote: su lote dentro de su manzana, o su codigo si no lo tiene.
 *
 * Un predio del padron al que nadie le ha compuesto todavia su codigo predial no
 * tiene ni manzana ni lote, y **eso no se rellena**: se dice con su codigo de
 * referencia catastral, que es lo unico que se sabe de el.
 */
export function rotuloDelLote(lote: LoteDelPlano): string {
  if (lote.codigoDeManzana === null || lote.lote === null) return lote.codRefCatastral;
  return `Mz. ${lote.codigoDeManzana} · Lt. ${lote.lote}`;
}

/**
 * Si el lote casa con lo que se busca: por codigo de referencia catastral o por lote.
 *
 * Se compara **sin distinguir mayusculas y por contenido**, que es lo que hace
 * util una caja que acepta las dos cosas: quien teclea «14» busca el lote 14 y
 * quien pega los 21 digitos busca ese predio.
 */
export function casaConLaBusqueda(lote: LoteDelPlano, buscado: string): boolean {
  const q = buscado.trim().toLowerCase();
  if (q === '') return false;
  return (
    lote.codRefCatastral.toLowerCase().includes(q) ||
    (lote.lote ?? '').toLowerCase() === q ||
    rotuloDelLote(lote).toLowerCase().includes(q)
  );
}

/** Las capas del plano, en el orden del artboard. */
export type CapaDelPlano = 'predios' | 'manzanas' | 'sectores' | 'vias' | 'aranceles';

export interface DeclaracionDeCapa {
  readonly id: CapaDelPlano;
  readonly label: string;
  /**
   * Por que esta capa no se puede dibujar hoy, o `null` si se dibuja.
   *
   * **Se dice, no se esconde.** Una capa que falta sin explicacion se lee como
   * una capa que no existe; y las tres que faltan no faltan por descuido, cada
   * una tiene su motivo medido (ADR-0022 §5).
   */
  readonly impedimento: string | null;
}

export const CAPAS: readonly DeclaracionDeCapa[] = [
  { id: 'predios', label: 'Predios (lotes)', impedimento: null },
  {
    id: 'manzanas',
    label: 'Manzanas',
    // Se dibuja, pero **no como perimetro**: colorea y rotula los lotes por su
    // manzana. El contorno de una manzana no es la union de los lotes que
    // alguien haya digitalizado (ADR-0022 §5).
    impedimento: null,
  },
  { id: 'sectores', label: 'Sectores', impedimento: null },
  {
    id: 'vias',
    label: 'Vías y calles',
    impedimento:
      'La vía no tiene geometría en el sistema: la tabla `via` guarda su código, su nombre y su tipo, no su trazado. Hasta que se cargue una capa vial, dibujarla sería inventar la calle.',
  },
  {
    id: 'aranceles',
    label: 'Aranceles por zona',
    impedimento:
      'El arancel es de un tramo de vía y el predio no dice en qué tramo está, así que una vía con más de un arancel no se puede resolver a un lote. Los aranceles se consultan con su importe exacto y su documento fuente en «Aranceles».',
  },
];

/** Como se colorea el plano: por nada, por manzana o por sector. */
export type AgrupacionDelPlano = 'ninguna' | 'manzanas' | 'sectores';

/**
 * La clave por la que se agrupa un lote, o `null` si no la tiene.
 *
 * Un lote sin manzana no cae en «la manzana vacia»: cae fuera de la agrupacion y
 * se dibuja sin color, que es lo que se sabe de el.
 */
export function claveDeAgrupacion(lote: LoteDelPlano, por: AgrupacionDelPlano): string | null {
  if (por === 'manzanas') return lote.codigoDeManzana;
  if (por === 'sectores') return lote.codigoDeSector;
  return null;
}
