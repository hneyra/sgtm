/* Los tipos de `grupos-por-tarea.mjs`, que es JavaScript de build.
 *
 * Existen para que su prueba lo importe **tipado** sin compilar el guion: el
 * portador corre con `node`, tal cual, y la prueba tiene que ejercitar
 * exactamente eso. Si la firma de `asignacionPorTarea` cambia, esto se queda
 * corto y la prueba deja de compilar, que es justo lo que se quiere. */

/** Pares `[id, etiqueta]` de una opcion, como los trae el prototipo. */
export type ItemDelPrototipo = readonly [string, string];

/** Lo que un grupo declara ademas de su nombre y sus opciones. */
export interface OpcionesDeGrupo {
  /**
   * El grupo se pliega en el menu: una entrada unica en vez de sus opciones,
   * porque su superficie ya sabe navegar entre ellas. Sin carril.
   */
  readonly plegado?: boolean;
  /**
   * El grupo se pliega **y ademas** sus hojas van dentro del carril del centro
   * de reportes (ADR-0014 §5). Excluyente con `plegado`: `centro` ya pliega.
   */
  readonly centro?: boolean;
}

/**
 * `[nombre del grupo, ids de sus opciones]` —opcionalmente con sus opciones de
 * grupo—, en el orden de la barra lateral.
 */
export type GrupoDeTarea =
  readonly [string, readonly string[]] | readonly [string, readonly string[], OpcionesDeGrupo];

export type TablaDeGrupos = Readonly<Record<string, readonly GrupoDeTarea[]>>;

export const GRUPOS_POR_TAREA: TablaDeGrupos;

export function asignacionPorTarea(
  moduloId: string,
  items: readonly ItemDelPrototipo[],
  tabla?: TablaDeGrupos,
): Map<string, string> | null;

export function nombresDeLosGrupos(moduloId: string, tabla?: TablaDeGrupos): readonly string[];

export function bloquesPlegadosDe(moduloId: string, tabla?: TablaDeGrupos): readonly string[];

export function centroDeReportesDe(moduloId: string, tabla?: TablaDeGrupos): string | null;

/**
 * La accion primaria de un modulo: el acto con el que se empieza a trabajar en
 * el. `opcion` la abre —con su id y su permiso— y `label` la rotula.
 */
export interface AccionPrimaria {
  readonly opcion: string;
  readonly label: string;
}

export type TablaDeAccionesPrimarias = Readonly<Record<string, AccionPrimaria>>;

export const ACCION_PRIMARIA: TablaDeAccionesPrimarias;

export function accionPrimariaDe(
  moduloId: string,
  tabla?: TablaDeAccionesPrimarias,
): AccionPrimaria | null;

/**
 * Como se ensena un grupo en el panel lateral: su icono, y una nota que dice de
 * que va. `panel` no es un grupo del catalogo sino la portada del modulo.
 */
export interface DestinoDeModulo {
  readonly label?: string;
  /** Que opcion abre, si no es la primera del grupo. Cae a la primera visible. */
  readonly entrada?: string;
  /** Segmento de la ruta, cuando el destino no es un grupo del catalogo (#500). */
  readonly ranura?: string;
  /** Tras que grupo se dibuja un destino de ruta: el orden del panel es del diseño. */
  readonly tras?: string;
  /** Que opcion del catalogo tiene que poder ver quien abre un destino de ruta. */
  readonly exige?: string;
  readonly nota: string;
  readonly icono: readonly string[];
}

export type TablaDeDestinos = Readonly<Record<string, Readonly<Record<string, DestinoDeModulo>>>>;

export const DESTINOS: TablaDeDestinos;

export function destinosDe(
  moduloId: string,
  tabla?: TablaDeDestinos,
): Readonly<Record<string, DestinoDeModulo>> | null;

/**
 * Comprueba los destinos de un modulo contra sus grupos.
 *
 * Falla ruidosamente: un destino que no es `panel`, ni un grupo, ni una ruta
 * bien declarada, no se dibujaria y **nadie lo notaria** —el panel sale con una
 * entrada menos, que es lo mismo que sale cuando el destino no se declaro—.
 */
export function comprobarDestinos(
  moduloId: string,
  bloques: readonly string[],
  tabla?: TablaDeDestinos,
): void;
