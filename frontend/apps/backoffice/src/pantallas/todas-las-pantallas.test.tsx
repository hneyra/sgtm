import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';

/**
 * **Las 134 pantallas se dibujan.**
 *
 * Un renderizador unico tiene una ventaja y un riesgo, y son el mismo: un
 * cambio alcanza a las 134 a la vez. Un descriptor con una forma que nadie
 * previo —una tabla sin columnas numericas, un reporte sin metadatos, una
 * pantalla con pestanas vacias— no rompe la compilacion: rompe **una** opcion
 * del menu, en produccion, el dia que alguien la abre.
 *
 * Esta prueba las abre todas. Sin latencia simulada, es cuestion de segundos.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('el renderizador aguanta el catalogo entero', () => {
  it.each(OPCIONES.map((o) => ({ id: o.id, ruta: o.ruta, modulo: o.modulo.label })))(
    '$modulo · $id',
    async ({ id, ruta }) => {
      montarEnRuta(ruta);
      const titulo = OPCIONES.find((o) => o.id === id)?.title;
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(titulo ?? '');
    },
  );
});
