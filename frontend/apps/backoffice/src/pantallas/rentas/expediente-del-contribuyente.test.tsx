import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { PANTALLAS } from '../../catalogo/pantallas/rentas-registro.generado';
import { entradasDelIndice, seccionesApiladas } from '../../catalogo';
import { COMPOSICION_DE_RENTAS } from './composicion';

/**
 * **El expediente del contribuyente: cinco apartados donde habia doce entradas**
 * (#503 F2).
 *
 * `'en-vez-de-pestanas'` (#330) apilo las secciones de las nueve pestanas del
 * padron en una sola pagina. Fue una mejora —averiguar si un dato existe dejo de
 * costar nueve clics— y dejo el indice con **doce** entradas, que es la misma
 * lista de antes sin la barra de pestanas.
 *
 * Lo que este archivo fija es la forma de bajar a cinco **sin reescribir un solo
 * rotulo del manual** (RNF-080): se agrupa por la pestana, que es la unidad que
 * el manual ya tiene encima de la seccion, y por eso cuatro de los cinco
 * apartados llevan su rotulo literal. Solo los dos que unen varias pestanas
 * necesitan nombre, y entonces el nombre es una decision escrita.
 *
 * La pagina **no cambia**: sigue dibujando las doce secciones con su rotulo y en
 * su orden. Lo agrupado es la navegacion.
 */

const CONTRIBUYENTE = '00000025673';
const PADRON = `/rentas-registro/contribuyentes?codigo=${CONTRIBUYENTE}`;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** El indice de la pantalla abierta, esperando a que la estructura llegue. */
async function indice(): Promise<HTMLElement> {
  return screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
}

describe('la guarda: ninguna pestana se queda fuera del indice', () => {
  /**
   * **Se computa del catalogo, no de una lista escrita a mano.** Una pestana que
   * el porte anadiera —o una que cambiara de rotulo— se quedaria fuera de todos
   * los grupos, y sus secciones serian inalcanzables desde el indice: solo
   * rodando la pagina. Eso no puede pasar en silencio.
   */
  it('cada pestana del catalogo cae en exactamente un apartado', () => {
    for (const [id, composicion] of Object.entries(COMPOSICION_DE_RENTAS)) {
      const grupos = composicion.gruposDelIndice;
      if (grupos === undefined) continue;

      const declaradas = grupos.flatMap((grupo) => grupo.pestanas);
      expect(new Set(declaradas).size, `${id}: una pestana en dos apartados`).toBe(
        declaradas.length,
      );

      const delCatalogo = (PANTALLAS[id]?.tabs ?? []).map((pestana) => pestana.label);
      expect([...declaradas].sort(), `apartados de ${id}`).toEqual([...delCatalogo].sort());
    }
  });

  /**
   * Agrupar es navegacion, no contenido: si un apartado nombrara una pestana que
   * el catalogo no tiene, su entrada no llevaria a ningun sitio.
   */
  it('todo apartado declarado resuelve a una seccion de la pagina', () => {
    for (const [id, composicion] of Object.entries(COMPOSICION_DE_RENTAS)) {
      const grupos = composicion.gruposDelIndice;
      const estructura = PANTALLAS[id];
      if (grupos === undefined || estructura === undefined) continue;

      const entradas = entradasDelIndice(estructura, grupos);
      const cuantas = seccionesApiladas(estructura).length;
      expect(entradas.length, `${id}: apartados sin seccion`).toBe(grupos.length);
      for (const entrada of entradas) {
        expect(entrada.seccion, `${id}: «${entrada.rotulo}» fuera de rango`).toBeLessThan(cuantas);
      }
    }
  });

  /**
   * **La mitad que RNF-080 protege.** Un apartado de UNA pestana lleva su rotulo
   * literal: agrupar no es la ocasion de reescribir. Solo los que unen varias
   * pueden llevar nombre propio, y hoy son dos.
   */
  it('el apartado de una sola pestana lleva el rotulo del manual, sin tocar', () => {
    const grupos = COMPOSICION_DE_RENTAS['contribuyentes']?.gruposDelIndice ?? [];
    const deUna = grupos.filter((grupo) => grupo.pestanas.length === 1);
    expect(deUna.length).toBe(3);
    for (const grupo of deUna) {
      expect(grupo.titulo, 'el titulo es el rotulo de su pestana').toBe(grupo.pestanas[0]);
    }
  });
});

describe('el indice del padron de contribuyentes', () => {
  it('lista cinco apartados donde el catalogo declara doce secciones', async () => {
    // Las doce siguen ahi: es lo que la pagina dibuja.
    expect(seccionesApiladas(PANTALLAS['contribuyentes']!).length).toBe(12);

    montarEnRuta(PADRON);
    const nav = await indice();

    await waitFor(() =>
      expect(
        within(nav)
          .getAllByRole('button')
          .map((boton) => boton.textContent)
          .filter((texto) => texto !== 'Ir a las acciones'),
      ).toEqual([
        'Identificación del Contribuyente',
        'Domicilio Fiscal',
        'Documentos y contacto',
        'Predios y vehículos',
        'Observaciones y fotos',
      ]),
    );
  });

  /**
   * **La cabecerilla tiene que ser cierta de lo que hay debajo.** Decir «5
   * secciones» donde la pagina dibuja doce es una afirmacion falsa, y la unica
   * que un lector de pantalla oye antes de la lista.
   */
  it('la cabecerilla dice apartados, no secciones', async () => {
    montarEnRuta(PADRON);
    const nav = await indice();
    await waitFor(() => expect(nav.textContent).toContain('5 apartados'));
    expect(nav.textContent).not.toContain('5 secciones');
  });

  /**
   * El apartado que une cuatro pestanas lleva a la primera seccion de la
   * primera: «Documentos del contribuyente». Si llevara a otra, las tres de
   * arriba quedarian por encima del punto de llegada y nadie las veria.
   */
  it('cada apartado lleva a la primera seccion de su grupo', () => {
    const estructura = PANTALLAS['contribuyentes']!;
    const grupos = COMPOSICION_DE_RENTAS['contribuyentes']!.gruposDelIndice!;
    const secciones = seccionesApiladas(estructura);
    const entradas = entradasDelIndice(estructura, grupos);

    expect(entradas.map((entrada) => secciones[entrada.seccion]?.label)).toEqual([
      'Identificación',
      'Domicilio fiscal',
      'Documentos del contribuyente',
      'Unidades afectas del contribuyente',
      'Observaciones del registro',
    ]);
  });

  /**
   * La ficha de vehiculo tambien apila sus pestanas y **no** declara apartados:
   * seis pestanas con siete secciones no son doce entradas, y agrupar donde no
   * sobra nada solo aleja el contenido un nivel mas.
   */
  it('la ficha de vehiculo sigue con su indice de secciones', () => {
    expect(COMPOSICION_DE_RENTAS['vehiculos']?.gruposDelIndice).toBeUndefined();
  });
});
