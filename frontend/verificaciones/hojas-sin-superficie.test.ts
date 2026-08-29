import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACTOS_SIN_CAMPO } from '../apps/backoffice/src/pantallas/actos';
import { AVISOS } from '../apps/backoffice/src/pantallas/prosa-textos';

/**
 * **Las hojas sin superficie** (FRO-06, #427).
 *
 * Una opcion que el manual capturo como **el papel que sale** —un bloque
 * `reporte`, sin una sola seccion y sin una sola accion— y cuyo `endpoint`
 * **dicta el acto** que ese papel documenta. Hoy son siete, repartidas en tres
 * modulos, y hasta que se escribio la decision cada modulo estaba a punto de
 * contestarlo por su cuenta.
 *
 * La lista **no se escribe a mano**: se computa del catalogo generado, que es lo
 * que hace que una octava no pueda aparecer en silencio. De cada una se exige lo
 * que FRO-06 §1 decide:
 *
 *   `ACTOS_SIN_CAMPO`  que este clasificada ahi, nombrando el dato que le falta.
 *                      `sin-declaracion` —«la pantalla aún no manda estos
 *                      campos»— invita a declarar campos que no existen
 *   `AVISOS`           que **lo diga en la propia pantalla**. Y es aqui donde
 *                      esta el motivo de que el aviso sea el mecanismo:
 *                      `Pantalla.tsx` dibuja la barra solo
 *                      `{estructura.acciones && …}`, asi que estas siete no
 *                      tienen franja — la causa se calcula, entra en el censo de
 *                      `actos-honestos.test.tsx` y **no la lee nadie**
 *
 * Lo segundo se aplica modulo a modulo, asi que hay una lista de pendientes con
 * el issue que cubre cada una. Es el mismo mecanismo que `CONOCIDAS` de
 * `actos-inalcanzables.test.ts` —bajar de ahi es una buena noticia, subir hay que
 * mirarlo— con una exigencia mas: **no admite entradas rancias**. Una opcion que
 * ya tiene aviso no puede seguir figurando como pendiente, o la lista dejaria de
 * decir que falta.
 */

const CATALOGO = resolve(process.cwd(), 'apps/backoffice/src/catalogo');

interface Pantalla {
  readonly endpoint?: string;
  readonly acciones?: readonly string[];
  readonly secciones?: readonly { readonly campos?: readonly unknown[] }[];
  readonly tabs?: readonly {
    readonly secciones?: readonly { readonly campos?: readonly unknown[] }[];
  }[];
}

function modulos(): readonly { readonly id: string }[] {
  const fuente = readFileSync(resolve(CATALOGO, 'navegacion.generado.ts'), 'utf8');
  const json = fuente.slice(fuente.indexOf('= [') + 2, fuente.lastIndexOf('];') + 1);
  return JSON.parse(json) as never;
}

function pantallasDe(modulo: string): Readonly<Record<string, Pantalla>> {
  const fuente = readFileSync(resolve(CATALOGO, `pantallas/${modulo}.generado.ts`), 'utf8');
  const json = fuente.slice(fuente.indexOf('= {') + 2, fuente.lastIndexOf('};') + 1);
  return JSON.parse(json) as Readonly<Record<string, Pantalla>>;
}

/** Cuantos campos declara el catalogo de esa pantalla, planos y por pestana. */
function campos(pantalla: Pantalla): number {
  const deSecciones = (secciones: Pantalla['secciones'] = []): number =>
    secciones.reduce((total, seccion) => total + (seccion.campos ?? []).length, 0);
  return (
    deSecciones(pantalla.secciones) +
    (pantalla.tabs ?? []).reduce((total, tab) => total + deSecciones(tab.secciones), 0)
  );
}

/**
 * Las hojas sin superficie de hoy, computadas del catalogo.
 *
 * Las tres condiciones son las de FRO-06 §0, y las tres hacen falta: el verbo
 * —una hoja `GET` es una lectura, y esas se conectan como cualquier otra—, que
 * no haya donde pulsar, y que no haya donde escribir.
 */
function hojasSinSuperficie(): string[] {
  const hojas: string[] = [];
  for (const modulo of modulos()) {
    for (const [opcion, pantalla] of Object.entries(pantallasDe(modulo.id))) {
      const [verbo] = (pantalla.endpoint ?? '').split(/\s+/);
      if (verbo === 'GET' || verbo === undefined) continue;
      if ((pantalla.acciones ?? []).length > 0) continue;
      if (campos(pantalla) > 0) continue;
      hojas.push(opcion);
    }
  }
  return hojas.sort();
}

/** Que FRO-06 §1 esta aplicado a esta hoja: clasificada **y** diciendolo. */
function aplicada(opcion: string): boolean {
  return Object.hasOwn(ACTOS_SIN_CAMPO, opcion) && Object.hasOwn(AVISOS, opcion);
}

/**
 * Las que **todavia** no lo tienen, con el issue que las cubre.
 *
 * La decision es transversal y se aplica modulo a modulo, asi que esta lista
 * existe. Solo puede encoger: cada issue quita las suyas y el diff lo ensena.
 */
const SIN_APLICAR_TODAVIA: readonly string[] = [
  'transito_constancia_libre', // #429 — clasificada desde #77; le falta el aviso
  'transito_rg_ordinaria', // #429 — idem
  'transito_rg_sancionadora', // #429 — idem
];

describe('una hoja sin superficie dice lo que es y lo que le falta', () => {
  it('son estas siete, y la lista sale del catalogo', () => {
    expect(hojasSinSuperficie()).toEqual([
      'adm_notificacion_resolucion',
      'adm_resolucion_gerencia',
      'licencia_resolucion_cancelacion',
      'licencia_resolucion_duplicado',
      'transito_constancia_libre',
      'transito_rg_ordinaria',
      'transito_rg_sancionadora',
    ]);
  });

  it('cada una esta clasificada y lo dice, o esta declarada como pendiente con su issue', () => {
    for (const opcion of hojasSinSuperficie()) {
      expect(
        aplicada(opcion) || SIN_APLICAR_TODAVIA.includes(opcion),
        `«${opcion}» es una hoja sin superficie sin FRO-06 aplicado: le falta su entrada en ACTOS_SIN_CAMPO —su causa seria «sin-declaracion», que pide declarar campos que la pantalla no tiene— o su aviso permanente, que es lo unico que se dibuja cuando no hay acciones`,
      ).toBe(true);
    }
  });

  it('la que ya lo tiene nombra el dato que falta, para los dos lectores', () => {
    for (const opcion of hojasSinSuperficie().filter(aplicada)) {
      const declarado = ACTOS_SIN_CAMPO[opcion];
      // Para quien mantiene: como lo llama el backend.
      expect(declarado?.campos.length, opcion).toBeGreaterThan(0);
      // Para quien atiende: dicho en castellano, y en los dos sitios.
      expect(declarado?.dato.length, opcion).toBeGreaterThan(10);
      expect(AVISOS[opcion]?.detalle.length, opcion).toBeGreaterThan(40);
    }
  });

  it('la lista de pendientes no se pudre: nada aplicado ni ajeno sigue en ella', () => {
    expect(
      SIN_APLICAR_TODAVIA.filter(aplicada),
      'ya tienen FRO-06 aplicado y siguen declaradas como pendientes',
    ).toEqual([]);
    // Y ninguna pendiente que no sea una hoja sin superficie: una entrada que no
    // describe a nadie es una excepcion abierta para siempre.
    const hojas = hojasSinSuperficie();
    expect(
      SIN_APLICAR_TODAVIA.filter((opcion) => !hojas.includes(opcion)),
      'declaradas pendientes y no son hojas sin superficie',
    ).toEqual([]);
  });
});
