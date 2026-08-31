import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';
import { CAJERO, entraCon, limpiarSesion } from '../pruebas/sesion';

/**
 * El menu de la persona (ADR-0014 §3).
 *
 * Lo que se comprueba es que **dice la verdad**: no ofrece cerrar lo que no
 * esta abierto, sus dos puertas de catalogo salen del catalogo visible
 * (REQ-03 §5), y el boton se llama por el nombre que ensena —quien dicta por
 * voz dice lo que lee (WCAG 2.5.3)—.
 */

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

describe('el menu de la persona dice la verdad', () => {
  it('sin sesion no ofrece «Cerrar sesión», y lo personal sale del catalogo', async () => {
    const usuario = userEvent.setup();
    // Sin proveedor de identidad: como contra el proxy de datos. Hay catalogo
    // entero que ver, pero ninguna sesion que cerrar.
    montarEnRuta('/inicio/inicio');

    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Menú de Sin sesión' }));

    const menu = screen.getByRole('menu', { name: 'Menú personal' });
    // Las dos puertas del catalogo, resueltas por el catalogo: la opcion
    // `cambiar_anio` con su etiqueta y el modulo Seguridad con la suya.
    expect(within(menu).getByRole('menuitem', { name: 'Cambiar el año' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Seguridad' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });

  it('el boton se llama por el nombre que ensena, no en vez de el', async () => {
    // WCAG 2.5.3: el nombre accesible contiene el texto visible. Y es el unico
    // sitio de la cabecera que dice quien esta en la caja.
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    const boton = await screen.findByRole('button', { name: 'Menú de María Quispe' });
    expect(within(boton).getByText('María Quispe')).toBeInTheDocument();
  });

  it('«Cambiar el año» lleva a la opcion de Seguridad', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Menú de Sin sesión' }));
    await usuario.click(screen.getByRole('menuitem', { name: 'Cambiar el año' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Cambiar el año de trabajo',
    );
  });

  it('con la sesion del cajero ofrece cerrar sesion, y no lo que sus permisos niegan', async () => {
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    await usuario.click(await screen.findByRole('button', { name: 'Menú de María Quispe' }));

    const menu = screen.getByRole('menu', { name: 'Menú personal' });
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
    // El cajero no ve la opcion `cambiar_anio` ni el modulo Seguridad: sus
    // entradas no estan, igual que no estan en la barra ni en la paleta.
    expect(
      within(menu).queryByRole('menuitem', { name: 'Cambiar el año' }),
    ).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Seguridad' })).not.toBeInTheDocument();
  });
});

describe('el menu de la persona se opera entero con el teclado (RNF-082)', () => {
  it('Enter abre, el foco entra, y Enter sobre la entrada enfocada la elige', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Menú de Sin sesión' });
    boton.focus();
    await usuario.keyboard('{Enter}');
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();

    // Abajo: de «Cambiar el año» a «Seguridad», que es la que Enter abre.
    await usuario.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveTextContent('Seguridad');
    await usuario.keyboard('{Enter}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Seguridad' })).toBeInTheDocument();
  });

  it('la flecha arriba abre por la ultima entrada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    screen.getByRole('button', { name: 'Menú de Sin sesión' }).focus();
    await usuario.keyboard('{ArrowUp}');

    expect(screen.getAllByRole('menuitem').at(-1)).toHaveFocus();
    expect(document.activeElement).toHaveTextContent('Seguridad');
  });

  it('Esc cierra y el foco vuelve al boton', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Menú de Sin sesión' });
    boton.focus();
    await usuario.keyboard('{Enter}{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });
});
