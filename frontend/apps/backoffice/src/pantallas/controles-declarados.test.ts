import { describe, expect, it } from 'vitest';
import { todasLasPantallas } from '../catalogo';
import type { CampoDePantalla, EstructuraDePantalla, SeccionDePantalla } from '../catalogo';
import { controlesDe, controlesDeLaSeccion, controlesDeclarados } from './composicion';
import { cargarTodosLosAportes, censoDeAportes } from './aportes-de-modulo';
import { ACTOS_SIN_CAMPO } from './actos';
import { escrituraDe } from './escrituras';

/* Los controles declarados llegan con el trozo de su modulo desde #433: el censo se
   hace sobre lo que los doce aportan, leido sin registrarlo (`censoDeAportes`).
   Y ademas se registran, porque dos de estas pruebas comprueban las funciones del
   registro —`controlesDe` y `controlesDeLaSeccion`, las que usa el renderizador—.
   Este archivo puede hacerlo sin taparse: no monta ninguna pantalla, asi que no
   hay carga diferida a la que este registro le ahorre el trabajo. */
await cargarTodosLosAportes();
const CONTROLES_DECLARADOS = controlesDeclarados((await censoDeAportes()).composiciones);

/**
 * **El censo de los controles declarados** (#422).
 *
 * Un control añadido es la única declaración de este repositorio que dice a la
 * vez algo del catálogo —en qué sección va— y algo de la escritura —qué campo
 * llena—, y las dos cosas se rompen en silencio: una sección mal escrita deja el
 * control sin dibujar y una clave no declarada lo deja escribiendo al vacío. En
 * ninguno de los dos casos falla nada: la pantalla se dibuja, la primaria se
 * enciende y el cuerpo sale sin el dato, que es exactamente el 422 tardío que
 * `ACTOS_SIN_CAMPO` existía para evitar.
 *
 * Así que se comprueban las dos, contra el catálogo portado y contra
 * `escrituras.ts`, para **todos** los declarados. Es el mismo trato que reciben
 * los rótulos de `LA_QUE_ESCRIBE` (#421) y los filtros bloqueados (#322).
 */

const pantallas = await todasLasPantallas();

/** La estructura de esa opcion, o una vacia: la prueba de arriba ya exige que exista. */
const estructuraDe = (opcion: string): EstructuraDePantalla =>
  pantallas[opcion] ?? { id: opcion, mod: '', title: '', endpoint: '' };

/** Todas las secciones de una pantalla: las sueltas y las de sus pestañas. */
const seccionesDe = (opcion: string): readonly SeccionDePantalla[] => [
  ...(estructuraDe(opcion).secciones ?? []),
  ...(estructuraDe(opcion).tabs ?? []).flatMap((pestana) => pestana.secciones),
];

/** Todos los campos que el catálogo dibuja en esa pantalla, filtros incluidos. */
const camposDe = (opcion: string): readonly CampoDePantalla[] => [
  ...(estructuraDe(opcion).filtros ?? []),
  ...seccionesDe(opcion).flatMap((seccion) => seccion.campos),
];

describe('cada control declarado nombra algo que existe', () => {
  it('hay controles que censar: si no, el resto de este archivo no prueba nada', () => {
    expect(CONTROLES_DECLARADOS.length).toBeGreaterThan(0);
  });

  it('su opcion esta en el catalogo', () => {
    for (const { opcion } of CONTROLES_DECLARADOS) {
      expect(Object.hasOwn(pantallas, opcion), `«${opcion}» no esta en el catalogo`).toBe(true);
    }
  });

  /**
   * **La sección existe, letra por letra.**
   *
   * `controlesDeLaSeccion` filtra comparando la etiqueta con la del catálogo, y
   * una que no case devuelve la lista vacía: el control no se dibuja, y la
   * pantalla queda exactamente como estaba —con su primaria encendida, porque la
   * escritura sí está declarada—. Nada lo diría en ventanilla.
   */
  it('su seccion es una que el catalogo de esa opcion dibuja', () => {
    for (const { opcion, control } of CONTROLES_DECLARADOS) {
      const etiquetas = seccionesDe(opcion).map((seccion) => seccion.label);
      expect(etiquetas, `«${opcion}» no dibuja ninguna seccion «${control.seccion}»`).toContain(
        control.seccion,
      );
      // Y el filtro la encuentra de verdad: la comprobación de arriba mira el
      // catálogo, ésta mira la función que el renderizador usa.
      expect(controlesDeLaSeccion(opcion, control.seccion)).toContain(control);
    }
  });

  /**
   * **El campo está en la lista blanca de esa opción** (`escrituras.ts`).
   *
   * Sin él, `Formulario` lo dibuja bloqueado —eso ya está probado— pero la
   * pantalla queda con un campo muerto en medio del formulario, y la primaria
   * encendida si lo demás está. Declarar el control y olvidar la escritura es
   * el error natural: son dos archivos.
   */
  it('su campo es uno que esa opcion declara escribir', () => {
    for (const { opcion, control } of CONTROLES_DECLARADOS) {
      const declarada = escrituraDe(opcion);
      expect(declarada, `«${opcion}» declara un control y no declara escritura`).toBeDefined();
      expect(
        Object.hasOwn(declarada?.campos ?? {}, control.campo),
        `«${opcion}» no declara el campo «${control.campo}» en escrituras.ts`,
      ).toBe(true);
    }
  });

  /**
   * **El campo no lo dibuja ya el catálogo.**
   *
   * Si lo dibujara, esto no sería un control que falta: sería un campo que
   * bastaba declarar en `escrituras.ts`, y añadir otro dejaría dos controles
   * escribiendo la misma clave —el segundo pisando al primero, o al revés, según
   * el orden de la rejilla—. La clave de un control añadido es suya y de nadie
   * más.
   */
  it('su campo no es la clave de ningun campo que el catalogo ya dibuje', () => {
    for (const { opcion, control } of CONTROLES_DECLARADOS) {
      const claves = camposDe(opcion).map((campo) => campo.clave);
      expect(
        claves,
        `«${opcion}» ya dibuja un campo «${control.campo}»: declaralo en escrituras.ts, no aqui`,
      ).not.toContain(control.campo);
    }
  });

  /**
   * **Su etiqueta es suya** (RNF-080, AC 3 de #422).
   *
   * Dos controles con el mismo nombre en la misma pantalla no se distinguen: ni
   * con lector, ni leyendo, ni al dictar por teléfono cuál hay que rellenar. Y
   * es exactamente el caso que se da aquí —el catálogo de `transito_descargos`
   * ya dibuja un «Nº de expediente», que es otra cosa—, así que la coincidencia
   * no es hipotética.
   */
  it('su etiqueta no repite la de ningun campo del catalogo de esa opcion', () => {
    for (const { opcion, control } of CONTROLES_DECLARADOS) {
      const etiquetas = camposDe(opcion).map((campo) => campo.label);
      expect(
        etiquetas,
        `«${opcion}» ya dibuja un campo etiquetado «${control.etiqueta}»`,
      ).not.toContain(control.etiqueta);
    }
  });

  /** Dos controles de la misma opción no pueden llenar el mismo campo. */
  it('ninguna opcion declara dos controles para el mismo campo', () => {
    for (const opcion of new Set(CONTROLES_DECLARADOS.map(({ opcion }) => opcion))) {
      const campos = controlesDe(opcion).map((control) => control.campo);
      expect(new Set(campos).size, `«${opcion}» declara dos controles para el mismo campo`).toBe(
        campos.length,
      );
    }
  });

  /** Y cada uno dice por qué hace falta: un campo que el manual no tiene, sin explicar, se lee inventado. */
  it('cada control trae su ayuda, y no vacia', () => {
    for (const { opcion, control } of CONTROLES_DECLARADOS) {
      expect(control.ayuda.trim(), `«${opcion}» declara un control sin ayuda`).not.toBe('');
    }
  });
});

/**
 * **Generalizar el mecanismo no borra ninguna franja** (AC 4 de #422).
 *
 * Es la mitad del issue que no se ve en ninguna pantalla nueva, y la que más
 * fácil se pierde: teniendo el mecanismo delante, la salida cómoda para las trece
 * que quedan en `ACTOS_SIN_CAMPO` es declararles un control y darlas por
 * cerradas. Para las de la tercera forma —`alcabala` con su autovalúo ajustado,
 * `espectaculos` con su ingreso declarado— eso sería darle a quien atiende una
 * caja donde teclear una cifra que ninguna norma respalda (D-11, D-02a), y de
 * esa cifra sale el impuesto.
 *
 * Las dos listas son disjuntas **por construcción**: `impedimentoDelActo`
 * devuelve `undefined` en cuanto la opción declara escritura, y un control
 * declarado exige esa declaración (probado arriba). Esto lo hace explícito.
 */
describe('las que siguen sin campo siguen sin campo', () => {
  it('ninguna opcion de ACTOS_SIN_CAMPO declara controles', () => {
    for (const opcion of Object.keys(ACTOS_SIN_CAMPO)) {
      expect(
        controlesDe(opcion),
        `«${opcion}» declara un control y sigue diciendo que le falta el campo`,
      ).toEqual([]);
    }
  });

  it('alcabala sigue ahi, con el dato que nadie publica nombrado', () => {
    // La de la tercera forma: el autovalúo ajustado lo determina el sistema, y
    // hoy no lo determina nadie. Ver `rentas/index.ts`.
    expect(ACTOS_SIN_CAMPO['alcabala']?.campos).toContain('autoavaluoAjustado');
    expect(controlesDe('alcabala')).toEqual([]);
    expect(escrituraDe('alcabala')).toBeUndefined();
  });

  it('las trece que quedan son las trece que quedan', () => {
    /* La lista se **nombra**, no se cuenta, y por eso avisa cuando cambia por
       otro sitio: al integrar `main` aparecieron dos que este issue no habia
       visto —las dos hojas de resolucion de licencias, que FRO-06 (#427) trajo
       desde `sin-declaracion`—, y la prueba se puso roja diciendo cuales. Un
       `toHaveLength(11)` habria pasado igual de rojo sin decir nada, y un
       recuento recalculado no se habria enterado. */
    expect(Object.keys(ACTOS_SIN_CAMPO).sort()).toEqual([
      'alcabala',
      'caja_tasas',
      'caja_tributaria',
      'espectaculos',
      'fisc_predial',
      'fisc_programa',
      'fisc_vehicular',
      'fraccionamiento',
      'licencia_resolucion_cancelacion',
      'licencia_resolucion_duplicado',
      'transito_constancia_libre',
      'transito_rg_ordinaria',
      'transito_rg_sancionadora',
    ]);
  });
});
