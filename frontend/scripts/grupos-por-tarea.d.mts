/* Los tipos de `grupos-por-tarea.mjs`, que es JavaScript de build.
 *
 * Existen para que su prueba lo importe **tipado** sin compilar el guion: el
 * portador corre con `node`, tal cual, y la prueba tiene que ejercitar
 * exactamente eso. Si la firma de `asignacionPorTarea` cambia, esto se queda
 * corto y la prueba deja de compilar, que es justo lo que se quiere. */

/** Pares `[id, etiqueta]` de una opcion, como los trae el prototipo. */
export type ItemDelPrototipo = readonly [string, string];

/** `[nombre del grupo, ids de sus opciones]`, en el orden de la barra lateral. */
export type TablaDeGrupos = Readonly<
  Record<string, readonly (readonly [string, readonly string[]])[]>
>;

export const GRUPOS_POR_TAREA: TablaDeGrupos;

export function asignacionPorTarea(
  moduloId: string,
  items: readonly ItemDelPrototipo[],
  tabla?: TablaDeGrupos,
): Map<string, string> | null;

export function nombresDeLosGrupos(moduloId: string, tabla?: TablaDeGrupos): readonly string[];
