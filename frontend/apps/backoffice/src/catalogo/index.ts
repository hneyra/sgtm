import { MODULOS } from './navegacion.generado';
import { PANTALLAS } from './pantallas.generado';
import type {
  EstructuraDePantalla,
  ModuloDelCatalogo,
  OpcionDelCatalogo,
  SeccionDePantalla,
} from './tipos';

export { MODULOS, PANTALLAS };
export type * from './tipos';

/** Una opcion del menu con el modulo al que pertenece, para buscar y enrutar. */
export interface OpcionSituada extends OpcionDelCatalogo {
  readonly modulo: ModuloDelCatalogo;
  readonly ruta: string;
  /** Titulo de la pantalla, que no siempre coincide con la etiqueta del menu. */
  readonly title: string;
}

export const rutaDeModulo = (modulo: ModuloDelCatalogo): string => `/${modulo.id}`;

export const rutaDeOpcion = (modulo: ModuloDelCatalogo, opcion: OpcionDelCatalogo): string =>
  `/${modulo.id}/${opcion.ranura}`;

/** Las 134, aplanadas una sola vez. La paleta de comandos busca sobre esto. */
export const OPCIONES: readonly OpcionSituada[] = MODULOS.flatMap((modulo) =>
  modulo.opciones.map((opcion) => ({
    ...opcion,
    modulo,
    ruta: rutaDeOpcion(modulo, opcion),
    title: PANTALLAS[opcion.id]?.title ?? opcion.label,
  })),
);

const POR_ID = new Map(OPCIONES.map((o) => [o.id, o]));
const POR_RUTA = new Map(OPCIONES.map((o) => [o.ruta, o]));
const MODULOS_POR_ID = new Map(MODULOS.map((m) => [m.id, m]));

export const opcionPorId = (id: string): OpcionSituada | undefined => POR_ID.get(id);

export const opcionPorRuta = (moduloId: string, ranura: string): OpcionSituada | undefined =>
  POR_RUTA.get(`/${moduloId}/${ranura}`);

export const moduloPorId = (id: string): ModuloDelCatalogo | undefined => MODULOS_POR_ID.get(id);

export const pantallaDe = (id: string): EstructuraDePantalla | undefined => PANTALLAS[id];

/** La primera opcion del catalogo: el panel de recaudacion. Es la portada. */
export const OPCION_INICIAL = OPCIONES[0] as OpcionSituada;

/**
 * Busqueda de la paleta de comandos: subcadena sobre etiqueta, titulo y modulo,
 * en minusculas y sin tildes, como en el prototipo. Sin consulta devuelve las
 * primeras diez; con consulta, hasta catorce resultados.
 */
export function buscarOpciones(consulta: string): readonly OpcionSituada[] {
  const q = normalizar(consulta.trim());
  if (q === '') return OPCIONES.slice(0, 10);
  return OPCIONES.filter((o) =>
    normalizar(`${o.label} ${o.title} ${o.modulo.label}`).includes(q),
  ).slice(0, 14);
}

/** «Fiscalización» y «fiscalizacion» tienen que encontrarse la una a la otra. */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Las opciones de un modulo repartidas en sus bloques, en el orden de FRO-03 §4. */
export function bloquesDe(
  modulo: ModuloDelCatalogo,
): readonly { readonly label: string; readonly opciones: readonly OpcionDelCatalogo[] }[] {
  return modulo.bloques.map((label) => ({
    label,
    opciones: modulo.opciones.filter((o) => o.bloque === label),
  }));
}

/**
 * Las secciones que toca mostrar: las de la pestana activa si la pantalla tiene
 * pestanas, y si no las sueltas. Cinco pantallas declaran las dos cosas; el
 * prototipo ignora las sueltas cuando hay pestanas, y aqui se hace igual para
 * que la interfaz muestre lo mismo que el diseno aprobado.
 */
export function seccionesDe(
  pantalla: EstructuraDePantalla,
  pestana: number,
): readonly SeccionDePantalla[] {
  if (pantalla.tabs && pantalla.tabs.length > 0) {
    const activa = pantalla.tabs[Math.min(pestana, pantalla.tabs.length - 1)];
    return activa?.secciones ?? [];
  }
  return pantalla.secciones ?? [];
}

/** Arrancan cerradas las secciones que el prototipo marca asi (FRO-03 §5). */
const HINTS_CERRADOS = new Set(['Colapsado', 'Opcional', 'Solo lectura']);

export const arrancaCerrada = (seccion: SeccionDePantalla): boolean =>
  seccion.hint !== undefined && HINTS_CERRADOS.has(seccion.hint);
