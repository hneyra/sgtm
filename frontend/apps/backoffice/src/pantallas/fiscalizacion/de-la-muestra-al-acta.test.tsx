import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';

/**
 * **De la fila de la muestra al acta que se levanta en ella** (#506 F3).
 *
 * Cada fila de «Predios seleccionados» es un predio que hay que ir a visitar, y
 * lo que se hace con él es levantar su acta. Hasta #506 F3 ese camino no
 * existía: había que volver al menú, abrir el acta y teclear a mano dos
 * identificadores que **la fila ya tiene y no dibuja en ninguna columna** — así
 * que en la práctica no se podían teclear.
 *
 * Lo que esta batería vigila:
 *
 * 1. Que el enlace se componga de los **valores crudos** de la fila y no del
 *    texto que se pintó (#332).
 * 2. Que una fila sin esos valores no dibuje un enlace a ninguna parte.
 * 3. Que el permiso del destino decida (REQ-03 §5), que aquí es SoD-4: quien
 *    sólo consulta el programa no levanta actas.
 * 4. Que el acta abierta así traiga de verdad su predio.
 */

const PROGRAMA = '/fiscalizacion/fisc-programa?nDePrograma=PF-2026-014';
const LEVANTAR = 'Levantar acta';

const TODO = {
  fisc_programa: ['lectura', 'registro'],
  fisc_predial: ['lectura', 'registro'],
} as const;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  limpiarSesion();
});

const laTabla = async (ruta: string = PROGRAMA): Promise<HTMLElement> => {
  montarEnRuta(ruta);
  await screen.findByRole('heading', { level: 1 });
  const tabla = await screen.findByRole('table');
  await waitFor(() => expect(within(tabla).queryAllByRole('row').length).toBeGreaterThan(1));
  return tabla;
};

describe('la muestra lleva al acta', () => {
  it('cada fila ofrece levantar su acta, con el programa y el predio en la direccion', async () => {
    entraCon(TODO);
    const tabla = await laTabla();

    const enlaces = within(tabla).getAllByRole('link', { name: new RegExp(LEVANTAR) });
    expect(enlaces.length).toBeGreaterThan(0);
    // Los dos identificadores salen de `MuestraResource`, no del texto pintado.
    expect(enlaces[0]).toHaveAttribute(
      'href',
      '/fiscalizacion/fisc-predial?programa=1&predio=1',
    );
  });

  /* El nombre accesible nombra **la fila**: quien recorre la tabla con el lector
     de pantalla oye una detrás de otra, y cuatro enlaces que dicen lo mismo no
     se distinguen entre sí. */
  it('cada enlace dice de que fila es', async () => {
    entraCon(TODO);
    const tabla = await laTabla();

    const enlaces = within(tabla).getAllByRole('link', { name: new RegExp(LEVANTAR) });
    const nombres = enlaces.map((a) => a.getAttribute('aria-label'));
    expect(new Set(nombres).size).toBe(nombres.length);
    expect(nombres[0]).toMatch(/^Levantar acta: /);
  });

  it('la columna existe para el lector de pantalla, sin robarle rotulo a las seis del manual', async () => {
    entraCon(TODO);
    const tabla = await laTabla();

    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((th) => th.textContent?.trim());
    // Las seis del catálogo, intactas y en su orden.
    expect(cabeceras.slice(0, 6)).toEqual([
      'Predio',
      'Contribuyente',
      'Uso declarado',
      'Área decl. m²',
      'Riesgo',
      'Estado',
    ]);
    // Y la séptima, la de la acción, con su rótulo sólo para quien lo necesita.
    expect(cabeceras).toHaveLength(7);
    expect(cabeceras[6]).toBe(LEVANTAR);
  });

  it('pulsarlo abre el acta con SU predio, no con el primero de la muestra', async () => {
    const usuario = userEvent.setup();
    entraCon(TODO);
    const tabla = await laTabla();

    const enlaces = within(tabla).getAllByRole('link', { name: new RegExp(LEVANTAR) });
    await usuario.click(enlaces[0] as HTMLElement);

    await waitFor(() => expect(document.querySelector('.sgtm-acta')).not.toBeNull());
    await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());
    expect(document.querySelector('.sgtm-resumen')?.textContent).toContain('02-014-D-14-01');
  });
});

describe('el permiso del destino decide', () => {
  /**
   * **SoD-4 otra vez, por el otro lado.** El fiscalizador de campo levanta actas
   * y no ve los resultados; el revés es quien sólo consulta el programa, que no
   * puede levantar ninguna. Ofrecerle el enlace sería ofrecerle un enlace a un
   * aviso de «no tienes permiso».
   */
  it('sin permiso sobre el acta, la columna no se dibuja', async () => {
    entraCon({ fisc_programa: ['lectura'] });
    const tabla = await laTabla();

    expect(within(tabla).queryAllByRole('link', { name: new RegExp(LEVANTAR) })).toHaveLength(0);
    const cabeceras = within(tabla).getAllByRole('columnheader');
    // Las seis del catálogo y ninguna más.
    expect(cabeceras).toHaveLength(6);
  });
});

describe('las otras tablas del sistema no cambian', () => {
  it('una tabla cuya opcion no declara accion de fila se dibuja como siempre', async () => {
    const tabla = await laTabla('/fiscalizacion/fisc-omisos');

    expect(within(tabla).queryAllByRole('link', { name: new RegExp(LEVANTAR) })).toHaveLength(0);
    // Las siete columnas de omisos, sin una octava.
    expect(within(tabla).getAllByRole('columnheader')).toHaveLength(7);
  });
});
