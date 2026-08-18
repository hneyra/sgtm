import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';

/**
 * El shell: navegacion de dos niveles, cabecera y paleta de comandos.
 *
 * Se consulta por rol y por texto accesible, no por clase (FRO-04 §8): una
 * prueba que se rompe al cambiar una clase no prueba comportamiento.
 */

beforeEach(() => {
  instalarProxyDeDatos();
  globalThis.localStorage?.clear();
});
afterEach(() => desinstalarProxyDeDatos());

describe('la cabecera dice donde esta uno', () => {
  it('muestra el modulo, el titulo de la pantalla y su operacion del contrato', async () => {
    montarEnRuta('/catastro/ficha-urbana');

    const cabecera = await screen.findByRole('banner');
    expect(within(cabecera).getByRole('heading', { level: 1 })).toHaveTextContent(
      'Ficha catastral urbana individual',
    );
    expect(within(cabecera).getByText('Catastro')).toBeInTheDocument();
    expect(
      within(cabecera).getByText('GET /api/v1/catastro/fichas/urbana/{codRefCatastral}'),
    ).toBeInTheDocument();
  });
});

describe('la barra lateral de dos niveles', () => {
  it('al abrir una opcion queda en el nivel de su modulo, con la opcion marcada', () => {
    montarEnRuta('/tesoreria/caja-tributaria');

    const navegacion = screen.getByRole('navigation', { name: 'Opciones de Tesorería' });
    expect(within(navegacion).getByText('Tesorería')).toBeInTheDocument();
    expect(within(navegacion).getByRole('link', { current: 'page' })).toHaveTextContent(
      'Caja tributaria',
    );
  });

  it('«Todos los módulos» devuelve al nivel raiz sin cambiar de pantalla', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/caja-tributaria');

    await usuario.click(screen.getByRole('button', { name: /Todos los módulos/ }));

    const navegacion = screen.getByRole('navigation', { name: 'Módulos del sistema' });
    expect(within(navegacion).getByText('Coactiva')).toBeInTheDocument();
    // La pantalla no se ha movido: solo cambio el nivel de la navegacion.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Caja tributaria');
  });

  it('los bloques del modulo se pliegan uno a uno', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/caja-tributaria');

    const bloque = screen.getByRole('button', { name: /Registro y mantenimiento/ });
    expect(bloque).toHaveAttribute('aria-expanded', 'true');
    await usuario.click(bloque);
    expect(bloque).toHaveAttribute('aria-expanded', 'false');

    // El de al lado sigue como estaba: el colapso es por bloque, no global.
    expect(screen.getByRole('button', { name: /Consultas/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('anota en «Recientes» la opcion visitada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/caja-tributaria');

    await usuario.click(screen.getByRole('button', { name: /Todos los módulos/ }));
    const navegacion = screen.getByRole('navigation', { name: 'Módulos del sistema' });
    expect(within(navegacion).getByText('Recientes')).toBeInTheDocument();
    expect(within(navegacion).getByText('Caja tributaria')).toBeInTheDocument();
  });
});

describe('la paleta de comandos', () => {
  it('se abre con Ctrl+K y se cierra con Escape', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Buscar en el sistema' })).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('busca sobre las 134 opciones y navega a la elegida', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Buscar en el sistema' }));
    const paleta = screen.getByRole('dialog');
    expect(within(paleta).getByText('10 de 134 opciones')).toBeInTheDocument();

    await usuario.type(within(paleta).getByRole('textbox'), 'alcabala');
    await usuario.click(within(paleta).getByRole('button', { name: /Alcabala/ }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/alcabala/i);
  });
});

describe('el hub de modulo', () => {
  it('ensena las opciones del modulo repartidas en sus bloques', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/valores');

    expect(screen.getByRole('heading', { level: 2, name: 'Valores' })).toBeInTheDocument();
    expect(screen.getByText(/6 opciones en \d+ bloques?/)).toBeInTheDocument();

    await usuario.click(screen.getAllByRole('link')[0] as HTMLElement);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Valores');
  });
});
