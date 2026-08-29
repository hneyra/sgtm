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
