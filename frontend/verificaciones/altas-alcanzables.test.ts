import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { altasDeclaradas } from '../apps/backoffice/src/pantallas/composicion';
import { censoDeAportes } from '../apps/backoffice/src/pantallas/aportes-de-modulo';

/* Las altas declaradas llegan con el trozo de su modulo desde #433, asi que hay que
   censar los doce —sin registrarlos— antes de recorrerlas con `it.each`. */
const ALTAS_DECLARADAS = altasDeclaradas((await censoDeAportes()).composiciones);

/**
 * Ningun alta se queda sin boton que la abra.
 *
 * Un alta se abre desde **la accion que el prototipo ya dibuja** —«Nuevo
 * sector», «Nuevo»— y no desde un boton nuevo al lado: dos botones con el mismo
 * texto, uno vivo y uno apagado, no se pueden distinguir. La contrapartida es
 * que la declaracion y el catalogo tienen que decir lo mismo, **letra por
 * letra**, y si no coinciden el sintoma es el peor posible: no pasa nada. Ni
 * error, ni boton apagado, ni traza. El formulario simplemente no existe.
 *
 * Es la gemela de `actos-inalcanzables.test.ts`, que vigila el hueco de al lado:
 * alli, un acto escondido detras de una accion secundaria; aqui, un alta cuya
 * accion no esta en la barra.
 */

const CATALOGO = resolve(process.cwd(), 'apps/backoffice/src/catalogo');

interface Pantalla {
  readonly acciones?: readonly string[];
}

function modulos(): readonly { readonly id: string }[] {
  const fuente = readFileSync(resolve(CATALOGO, 'navegacion.generado.ts'), 'utf8');
  const json = fuente.slice(fuente.indexOf('= [') + 2, fuente.lastIndexOf('];') + 1);
  return JSON.parse(json) as never;
}

/** Las acciones que el catalogo dibuja, por opcion, leidas de los doce trozos. */
function accionesPorOpcion(): Readonly<Record<string, readonly string[]>> {
  const acciones: Record<string, readonly string[]> = {};
  for (const modulo of modulos()) {
    const fuente = readFileSync(resolve(CATALOGO, `pantallas/${modulo.id}.generado.ts`), 'utf8');
    const json = fuente.slice(fuente.indexOf('= {') + 2, fuente.lastIndexOf('};') + 1);
    const pantallas = JSON.parse(json) as Readonly<Record<string, Pantalla>>;
    for (const [opcion, pantalla] of Object.entries(pantallas)) {
      acciones[opcion] = pantalla.acciones ?? [];
    }
  }
  return acciones;
}

describe('toda alta declarada tiene una accion del catalogo que la abre', () => {
  const acciones = accionesPorOpcion();

  it('hay altas declaradas que verificar', () => {
    // Sin esto, la prueba de abajo pasaria en verde con la lista vacia y no
    // estaria diciendo nada.
    expect(ALTAS_DECLARADAS.length).toBeGreaterThan(0);
  });

  it.each(ALTAS_DECLARADAS)('$opcion abre su alta con «$accion»', ({ opcion, accion }) => {
    const delCatalogo = acciones[opcion];
    expect(delCatalogo, `la opcion «${opcion}» no existe en el catalogo`).toBeDefined();
    expect(
      delCatalogo,
      `«${accion}» no es una de las acciones que el catalogo dibuja para «${opcion}»: ` +
        `el alta no se podria abrir desde ningun sitio`,
    ).toContain(accion);
  });
});
