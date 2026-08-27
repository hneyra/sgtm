import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';

/**
 * Las dos puertas de la cabecera (ADR-0014 §2 y §3): el lanzador de nueve
 * puntos y el menu de la persona.
 *
 * Lo que se comprueba no es que «se abra un menu»: es que las dos puertas
 * ensenan **el catalogo visible y solo el** (REQ-03 §5), que se operan enteras
 * con el teclado (RNF-082), y que sin sesion el menu dice la verdad: no ofrece
 * cerrar lo que no esta abierto.
 */

/** Los permisos de un cajero, tal como los describe REQ-03 §3: caja, sin coactiva. */
const CAJERO = {
  caja_tributaria: ['ejecucion', 'lectura', 'registro'],
  caja_tasas: ['ejecucion', 'lectura', 'registro'],
  duplicado_recibo: ['ejecucion', 'lectura', 'impresion'],
};

const CONFIGURACION = {
  VITE_SGTM_OIDC_CLIENTE: 'sgtm-backoffice',
  VITE_SGTM_OIDC_AUTORIZACION: 'https://identidad.gob.pe/oauth2/authorize',
  VITE_SGTM_OIDC_TOKEN: 'https://identidad.gob.pe/oauth2/token',
};

const base64url = (texto: string) =>
  btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const originalFetch = globalThis.fetch;

/**
 * Entra un usuario con estos permisos, como en `permisos.test.tsx`: el token
 * solo autentica y la matriz la responde `GET /seguridad/sesion/permisos`
 * (ADR-0013).
 */
function entraCon(permisos: Readonly<Record<string, readonly string[]>>): void {
  for (const [clave, valor] of Object.entries(CONFIGURACION)) vi.stubEnv(clave, valor);
  const token = `${base64url('{"alg":"none"}')}.${base64url(
    JSON.stringify({
      name: 'María Quispe',
      municipalidad_nombre: 'Municipalidad Provincial de Sullana',
      exp: 2_000_000_000,
    }),
  )}.firma`;

  const proxy = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.startsWith('https://identidad.gob.pe')) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: token, expires_in: 300 }), { status: 200 }),
      );
    }
    if (url.replace(/^.*\/api\/v1/, '') === '/seguridad/sesion/permisos') {
      return Promise.resolve(new Response(JSON.stringify(permisos), { status: 200 }));
    }
    return proxy(entrada, opciones);
  }) as typeof fetch;
}

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  desinstalarProxyDeDatos();
  globalThis.fetch = originalFetch;
});

describe('el lanzador ensena el catalogo visible, no el entero', () => {
  it('sin permiso sobre coactiva, Coactiva no esta en el lanzador', async () => {
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    const boton = await screen.findByRole('button', { name: 'Abrir los módulos' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(boton);

    const menu = screen.getByRole('menu', { name: 'Módulos del sistema' });
    // El mismo filtro que la barra, el hub y la paleta (REQ-03 §5): el modulo
    // del cajero esta, y el que sus permisos niegan no aparece ni vacio.
    expect(within(menu).getByText('Tesorería')).toBeInTheDocument();
    expect(within(menu).queryByText('Coactiva')).not.toBeInTheDocument();
    expect(within(menu).queryByText('Catastro')).not.toBeInTheDocument();
    // Y el conteo es el de las opciones visibles, no el del catalogo.
    expect(within(menu).getByText('3 opciones')).toBeInTheDocument();
  });

  it('contra el proxy, sin proveedor de identidad, lista los doce', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    expect(screen.getAllByRole('menuitem')).toHaveLength(12);
  });

  it('elegir un modulo con el raton navega a su hub y cierra el panel', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    await usuario.click(screen.getByRole('menuitem', { name: /Valores/ }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Valores' })).toBeInTheDocument();
  });
});

describe('el lanzador se opera entero con el teclado (RNF-082)', () => {
  it('Enter abre, las flechas recorren, Enter navega y el panel se cierra', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    boton.focus();
    await usuario.keyboard('{Enter}');
    const menu = screen.getByRole('menu', { name: 'Módulos del sistema' });
    expect(boton).toHaveAttribute('aria-expanded', 'true');

    // Dos flechas abajo: del primero (Inicio) al tercero (Rentas · Registro).
    await usuario.keyboard('{ArrowDown}{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { current: true })).toHaveTextContent(
      'Rentas · Registro',
    );
    // Una arriba: el recorrido va en las dos direcciones.
    await usuario.keyboard('{ArrowUp}');
    expect(within(menu).getByRole('menuitem', { current: true })).toHaveTextContent('Catastro');

    await usuario.keyboard('{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Catastro' })).toBeInTheDocument();
  });

  it('Esc cierra sin navegar y el foco queda en el boton', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    const boton = screen.getByRole('button', { name: 'Abrir los módulos' });
    boton.focus();
    await usuario.keyboard('{Enter}{ArrowDown}{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
    // Y no se ha movido de pantalla: Esc no elige nada.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/recaudación/i);
  });

  it('el clic fuera cierra el panel', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir los módulos' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await usuario.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('el menu de la persona dice la verdad', () => {
  it('sin sesion no ofrece «Cerrar sesión», y lo personal sale del catalogo', async () => {
    const usuario = userEvent.setup();
    // Sin proveedor de identidad: como contra el proxy de datos. Hay catalogo
    // entero que ver, pero ninguna sesion que cerrar.
    montarEnRuta('/inicio/inicio');

    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Abrir el menú personal' }));

    const menu = screen.getByRole('menu', { name: 'Menú personal' });
    // Las dos puertas del catalogo, resueltas por el catalogo: la opcion
    // `cambiar_anio` con su titulo y el modulo Seguridad con su etiqueta.
    expect(
      within(menu).getByRole('menuitem', { name: 'Cambiar el año de trabajo' }),
    ).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Seguridad' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });

  it('«Cambiar el año de trabajo» lleva a la opcion de Seguridad', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/inicio/inicio');

    await usuario.click(screen.getByRole('button', { name: 'Abrir el menú personal' }));
    await usuario.click(screen.getByRole('menuitem', { name: 'Cambiar el año de trabajo' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Cambiar el año de trabajo',
    );
  });

  it('con la sesion del cajero ofrece cerrar sesion, y no lo que sus permisos niegan', async () => {
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    await usuario.click(await screen.findByRole('button', { name: 'Abrir el menú personal' }));

    const menu = screen.getByRole('menu', { name: 'Menú personal' });
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
    // El cajero no ve la opcion `cambiar_anio` ni el modulo Seguridad: sus
    // entradas no estan, igual que no estan en la barra ni en la paleta.
    expect(
      within(menu).queryByRole('menuitem', { name: 'Cambiar el año de trabajo' }),
    ).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Seguridad' })).not.toBeInTheDocument();
  });
});
