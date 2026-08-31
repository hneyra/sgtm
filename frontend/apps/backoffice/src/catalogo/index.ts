import { MODULOS } from './navegacion.generado';
import { CARGADORES } from './pantallas.generado';
import type { PantallasDeUnModulo } from './pantallas.generado';
import type {
  EstructuraDePantalla,
  ModuloDelCatalogo,
  OpcionDelCatalogo,
  SeccionDePantalla,
} from './tipos';

export { MODULOS };
export type { PantallasDeUnModulo };
export type * from './tipos';

/** Una opcion del menu con el modulo al que pertenece, para buscar y enrutar. */
export interface OpcionSituada extends OpcionDelCatalogo {
  readonly modulo: ModuloDelCatalogo;
  readonly ruta: string;
}

export const rutaDeModulo = (modulo: ModuloDelCatalogo): string => `/${modulo.id}`;

export const rutaDeOpcion = (modulo: ModuloDelCatalogo, opcion: OpcionDelCatalogo): string =>
  `/${modulo.id}/${opcion.ranura}`;

/**
 * Aplana los modulos en opciones situadas: cada una con su modulo, su ruta y el
 * titulo de su pantalla.
 *
 * Toma los modulos por parametro y no de la constante porque el usuario ve **su**
 * catalogo, no el entero: la barra lateral y la paleta trabajan sobre los
 * modulos que sus permisos dejan ver (REQ-03 §5).
 */
export function situarOpciones(modulos: readonly ModuloDelCatalogo[]): readonly OpcionSituada[] {
  return modulos.flatMap((modulo) =>
    modulo.opciones.map((opcion) => ({ ...opcion, modulo, ruta: rutaDeOpcion(modulo, opcion) })),
  );
}

/** Las 134, aplanadas una sola vez. */
export const OPCIONES: readonly OpcionSituada[] = situarOpciones(MODULOS);

const POR_ID = new Map(OPCIONES.map((o) => [o.id, o]));
const POR_RUTA = new Map(OPCIONES.map((o) => [o.ruta, o]));
const MODULOS_POR_ID = new Map(MODULOS.map((m) => [m.id, m]));

export const opcionPorId = (id: string): OpcionSituada | undefined => POR_ID.get(id);

export const opcionPorRuta = (moduloId: string, ranura: string): OpcionSituada | undefined =>
  POR_RUTA.get(`/${moduloId}/${ranura}`);

export const moduloPorId = (id: string): ModuloDelCatalogo | undefined => MODULOS_POR_ID.get(id);

/**
 * La estructura de las pantallas de un modulo, cargada **al entrar en el**.
 *
 * El catalogo entero son 445 KB de fuente, mas que la aplicacion: servido de una
 * vez, una municipalidad con red mala espera por las 134 pantallas para abrir
 * una. Partido por modulo, abrir Catastro no descarga Transito.
 *
 * La promesa se guarda, no el resultado: `use()` necesita **la misma** promesa
 * en cada render, y ademas asi dos pantallas del mismo modulo comparten la
 * descarga en vez de pedirla dos veces.
 */
const cargas = new Map<string, Promise<PantallasDeUnModulo>>();

export function pantallasDelModulo(moduloId: string): Promise<PantallasDeUnModulo> {
  const encurso = cargas.get(moduloId);
  if (encurso !== undefined) return encurso;

  const cargador = CARGADORES[moduloId];
  const carga =
    cargador === undefined
      ? Promise.resolve<PantallasDeUnModulo>({})
      : cargador().then((modulo) => modulo.PANTALLAS);
  cargas.set(moduloId, carga);
  return carga;
}

/** Todas, para las pruebas y para el hub que las lista. No se usa en la aplicacion. */
export async function todasLasPantallas(): Promise<PantallasDeUnModulo> {
  const porModulo = await Promise.all(MODULOS.map((modulo) => pantallasDelModulo(modulo.id)));
  return Object.assign({}, ...porModulo) as PantallasDeUnModulo;
}

/* La portada **no es una opcion del catalogo** (#296, ADR-0016 §1).
   Aqui vivia `OPCION_INICIAL`, que era `OPCIONES[0]` —el panel de
   recaudacion— y a la que `/` redirigia. El panel sigue siendo esa opcion y se
   sigue abriendo por su ruta; lo que dejo de ser es el inicio. Lo que hay en `/`
   es la pregunta de a quien se atiende, que no publica ninguna lectura propia y
   por eso no necesita —ni debe tener— un id en el catalogo ni un permiso. */

/**
 * Busqueda de la paleta de comandos: subcadena sobre etiqueta, titulo y modulo,
 * en minusculas y sin tildes, como en el prototipo. Sin consulta devuelve las
 * primeras diez; con consulta, hasta catorce resultados.
 */
export function buscarOpciones(
  consulta: string,
  entre: readonly OpcionSituada[] = OPCIONES,
): readonly OpcionSituada[] {
  const q = normalizar(consulta.trim());
  if (q === '') return entre.slice(0, 10);
  return entre
    .filter((o) => normalizar(`${o.label} ${o.title} ${o.modulo.label}`).includes(q))
    .slice(0, 14);
}

/** «Fiscalización» y «fiscalizacion» tienen que encontrarse la una a la otra. */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * «12 opciones», o «1 opción». La misma fila la dibujan la barra lateral y el
 * lanzador, y una de las dos pluralizando distinto seria un defecto tonto.
 */
export const conteoDeOpciones = (modulo: ModuloDelCatalogo): string =>
  `${modulo.opciones.length} ${modulo.opciones.length === 1 ? 'opción' : 'opciones'}`;

export interface BloqueDeNavegacion {
  readonly label: string;
  readonly opciones: readonly OpcionDelCatalogo[];
  /**
   * El bloque se pliega (ADR-0014 §5): el menu ensena una entrada unica en vez
   * de sus opciones una a una, y esa entrada abre la primera visible.
   */
  readonly plegado: boolean;
  /**
   * Y ademas sus opciones se dibujan dentro del carril del centro de reportes,
   * que lista las demas. **`carril` implica `plegado`, y no al reves**: donde
   * la superficie ya navega entre sus opciones —el territorio, el cuadro de
   * valuacion— se pliega sin carril, porque un carril al lado de las pestanas
   * serian dos formas de navegar lo mismo.
   */
  readonly carril: boolean;
}

/**
 * Las opciones de un modulo repartidas en sus bloques, **en el orden que el
 * propio modulo declara**: los grupos por tarea donde el modulo esta disenado
 * (ADR-0014 §4) y los cuatro bloques tecnicos de FRO-03 §4 en los demas. El
 * orden lo fija el portador del catalogo; aqui solo se reparte.
 */
export function bloquesDe(modulo: ModuloDelCatalogo): readonly BloqueDeNavegacion[] {
  const plegados = new Set(modulo.bloquesPlegados ?? []);
  return modulo.bloques.map((label) => ({
    label,
    opciones: modulo.opciones.filter((o) => o.bloque === label),
    plegado: plegados.has(label),
    carril: label === modulo.centroDeReportes,
  }));
}

/**
 * Las hojas del centro de reportes de un modulo (ADR-0014 §5), en el orden del
 * catalogo; vacio si el modulo no pliega ninguno.
 *
 * Se pasa el modulo **visible** —el que `useCatalogoVisible` filtro— y no la
 * constante: el carril del centro esconde lo mismo que el menu (REQ-03 §5).
 */
export function hojasDelCentro(modulo: ModuloDelCatalogo): readonly OpcionDelCatalogo[] {
  if (modulo.centroDeReportes === undefined) return [];
  return modulo.opciones.filter((o) => o.bloque === modulo.centroDeReportes);
}

/** Si esta opcion es una de las hojas que su modulo pliega en el centro. */
export const esHojaDelCentro = (modulo: ModuloDelCatalogo, opcion: OpcionDelCatalogo): boolean =>
  modulo.centroDeReportes !== undefined && opcion.bloque === modulo.centroDeReportes;

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

/**
 * **Todas** las secciones de la pantalla, con las de sus pestanas apiladas en el
 * orden en que el manual las declara.
 *
 * Es lo que mira una opcion cuyo indice **sustituye** a las pestanas (#330): el
 * padron de contribuyentes reparte 56 campos en nueve pestanas y la ficha de
 * vehiculo 54 en seis, y saber si un dato existe cuesta nueve clics. Apiladas en
 * una sola pagina, el indice las recorre desplazando.
 *
 * **No renombra ni agrupa nada** (RNF-080): las secciones son las del catalogo,
 * con su rotulo del manual y en su orden. Lo unico que desaparece es la barra de
 * pestanas, que era navegacion, no contenido.
 */
export function seccionesApiladas(pantalla: EstructuraDePantalla): readonly SeccionDePantalla[] {
  if (pantalla.tabs && pantalla.tabs.length > 0) {
    return pantalla.tabs.flatMap((pestana) => pestana.secciones);
  }
  return pantalla.secciones ?? [];
}

/**
 * Las entradas del indice cuando la opcion **agrupa** sus pestanas
 * (`ComposicionDeOpcion.gruposDelIndice`, #503 F2).
 *
 * Devuelve un rotulo por grupo y **la posicion de su primera seccion** dentro de
 * `seccionesApiladas`, que es a donde lleva la entrada. Las secciones no se
 * tocan: la pagina sigue dibujando las doce del padron de contribuyentes con su
 * rotulo del manual. Lo que se agrupa es la navegacion.
 *
 * Un grupo cuyas pestanas no declaren ni una seccion **no devuelve entrada**: no
 * hay a donde llevar, y una entrada de indice que no desplaza a ningun sitio es
 * peor que no tenerla. Ocurre con una pestana de solo tabla.
 *
 * El tipo del parametro es estructural a proposito: `GrupoDelIndice` vive en
 * `pantallas/composicion.ts`, que importa de aqui, y el catalogo no importa de
 * las pantallas.
 */
export function entradasDelIndice(
  pantalla: EstructuraDePantalla,
  grupos: readonly { readonly titulo: string; readonly pestanas: readonly string[] }[],
): readonly { readonly rotulo: string; readonly seccion: number }[] {
  const pestanas = pantalla.tabs ?? [];
  const entradas: { readonly rotulo: string; readonly seccion: number }[] = [];
  for (const grupo of grupos) {
    // La primera seccion del grupo en el orden APILADO, que es el orden de la
    // pagina: se recorren las pestanas del catalogo contando secciones, y la
    // primera que pertenezca al grupo fija el ancla.
    let contadas = 0;
    let primera: number | undefined = undefined;
    for (const pestana of pestanas) {
      if (
        primera === undefined &&
        grupo.pestanas.includes(pestana.label) &&
        pestana.secciones.length > 0
      ) {
        primera = contadas;
      }
      contadas += pestana.secciones.length;
    }
    if (primera !== undefined) entradas.push({ rotulo: grupo.titulo, seccion: primera });
  }
  return entradas;
}

/** Arrancan cerradas las secciones que el prototipo marca asi (FRO-03 §5). */
const HINTS_CERRADOS = new Set(['Colapsado', 'Opcional', 'Solo lectura']);

export const arrancaCerrada = (seccion: SeccionDePantalla): boolean =>
  seccion.hint !== undefined && HINTS_CERRADOS.has(seccion.hint);
