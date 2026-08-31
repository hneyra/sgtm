import { solicitar, type RespuestaPaginada } from './cliente';

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
