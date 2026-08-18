import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { MODULOS, OPCIONES } from '../../catalogo';
import { catalogoVisible, permisosDelClaim, puedeEscribir, puedeVer } from './permisos';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Visibilidad por rol (REQ-03).
 *
 * > **Que la interfaz oculte una opcion es comodidad, no seguridad** (REQ-03
 * > §5). La comprobacion es del servidor, que responde 403 igual. Esto reduce
 * > el error y la superficie de exploracion; no protege nada por si solo, y
 * > estas pruebas no deben leerse como si lo hiciera.
 */

/** Los permisos de un cajero, tal como los describe REQ-03 §3: caja, sin coactiva. */
const CAJERO = {
  caja_tributaria: ['ejecucion', 'lectura', 'registro'],
  caja_tasas: ['ejecucion', 'lectura', 'registro'],
  duplicado_recibo: ['ejecucion', 'lectura', 'impresion'],
};

/** El perfil de consulta: ve, y no toca nada. */
const CONSULTA = {
  calles: ['lectura'],
  predial_masivo: ['lectura'],
};

const CONFIGURACION = {
  VITE_SGTM_OIDC_CLIENTE: 'sgtm-backoffice',
  VITE_SGTM_OIDC_AUTORIZACION: 'https://identidad.gob.pe/oauth2/authorize',
  VITE_SGTM_OIDC_TOKEN: 'https://identidad.gob.pe/oauth2/token',
};

const base64url = (texto: string) =>
  btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const originalFetch = globalThis.fetch;

/** Entra un usuario con estos permisos: el proveedor emite su token y ya. */
function entraCon(permisos: Readonly<Record<string, readonly string[]>>): void {
  const token = `${base64url('{"alg":"none"}')}.${base64url(
    JSON.stringify({
      name: 'María Quispe',
      municipalidad_nombre: 'Municipalidad Provincial de Sullana',
      exp: 2_000_000_000,
      permisos,
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
    return proxy(entrada, opciones);
  }) as typeof fetch;
}

beforeEach(() => {
  for (const [clave, valor] of Object.entries(CONFIGURACION)) vi.stubEnv(clave, valor);
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
  desinstalarProxyDeDatos();
  globalThis.fetch = originalFetch;
  localStorage.clear();
});

describe('el perfil de cajero no ve coactiva', () => {
  it('ni en la barra lateral, ni en el hub, ni en la paleta de comandos', async () => {
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    const navegacion = await screen.findByRole('complementary');
    expect(within(navegacion).queryByText('Coactiva')).not.toBeInTheDocument();
    expect(within(navegacion).getByText('Tesorería')).toBeInTheDocument();

    // La paleta es la que se olvida: es el camino mas rapido a una opcion.
    await usuario.keyboard('{Control>}k{/Control}');
    const paleta = await screen.findByRole('dialog');
    await usuario.type(within(paleta).getByRole('textbox'), 'coactiv');
    expect(within(paleta).queryByText(/[Cc]oactiv/)).not.toBeInTheDocument();
    // Y busca entre las tres que el cajero tiene, no entre las 134.
    expect(within(paleta).getByText('0 de 3 opciones')).toBeInTheDocument();
  });

  it('y entrar por la URL no le filtra ni el titulo ni los campos', async () => {
    entraCon(CAJERO);
    montarEnRuta('/coactiva/coactiva-expedientes');

    expect(await screen.findByText('No tienes permiso para esta opción')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Búsqueda' })).not.toBeInTheDocument();
  });

  it('un modulo sin ninguna opcion visible no se dibuja, ni siquiera vacio', async () => {
    entraCon(CAJERO);
    montarEnRuta('/coactiva');

    expect(await screen.findByText('Ese módulo no existe')).toBeInTheDocument();
  });
});

describe('el perfil de consulta ve, y no toca', () => {
  it('la accion de escritura no se habilita ni con la observacion escrita', async () => {
    entraCon(CONSULTA);
    montarEnRuta('/rentas-registro/predial-masivo');

    const accion = await screen.findByRole('button', { name: 'Ejecutar proceso' });
    expect(accion).toBeDisabled();
    // Sin `registro` ni `modificacion` no hay campo de observacion que llenar:
    // la pantalla no escribe, asi que no se le ofrece guardar.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();
  });

  it('pero la pantalla se ve entera: mirar sin poder tocar es un caso normal', async () => {
    entraCon(CONSULTA);
    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('SANTA ROSA')).toBeInTheDocument();
  });
});

describe('«Recientes» no resucita lo que ya no se puede ver', () => {
  it('una opcion guardada en el navegador desaparece si se pierde el permiso', async () => {
    // El cajero estuvo en coactiva cuando tenia permiso; ahora ya no lo tiene.
    localStorage.setItem(
      'sgtm.recientes',
      JSON.stringify(['coactiva_expedientes', 'caja_tributaria']),
    );
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    const navegacion = await screen.findByRole('complementary');
    // La que si puede ver sigue en «Recientes» —la lista se dibuja de verdad—,
    // y la que ya no puede, no resucita.
    expect(within(navegacion).getAllByText('Caja tributaria').length).toBeGreaterThan(0);
    expect(within(navegacion).queryByText('Expedientes coactivos')).not.toBeInTheDocument();
  });
});

describe('las opciones permisibles salen del catalogo, no de una lista paralela', () => {
  it('las 134 opciones son 134 accesos: no hay una segunda lista que mantener', () => {
    // Contando: si alguien agrega una opcion al catalogo, es permisible sin
    // tocar una linea de permisos (REQ-03 §1, regla 3).
    const todas = Object.fromEntries(OPCIONES.map((o) => [o.id, ['lectura'] as const]));
    const permisos = permisosDelClaim(todas);

    expect(Object.keys(permisos.porOpcion)).toHaveLength(134);
    const visibles = catalogoVisible(MODULOS, permisos);
    expect(visibles).toHaveLength(12);
    expect(visibles.reduce((n, m) => n + m.opciones.length, 0)).toBe(134);
  });

  it('sin permiso explicito no hay acceso: negacion por omision', () => {
    const ninguno = permisosDelClaim(null);
    expect(catalogoVisible(MODULOS, ninguno)).toEqual([]);
    expect(puedeVer(ninguno, 'calles')).toBe(false);
    expect(puedeEscribir(ninguno, 'calles')).toBe(false);
  });

  it('un privilegio que no existe en el manual no cuenta como permiso', () => {
    const raro = permisosDelClaim({ calles: ['inventado'] });
    expect(puedeVer(raro, 'calles')).toBe(false);
  });

  it('los niveles de accesibilidad apagan acciones, no opciones', () => {
    const soloLectura = permisosDelClaim({ calles: ['lectura'] });
    expect(puedeVer(soloLectura, 'calles')).toBe(true);
    expect(puedeEscribir(soloLectura, 'calles')).toBe(false);

    const conRegistro = permisosDelClaim({ calles: ['lectura', 'registro'] });
    expect(puedeEscribir(conRegistro, 'calles')).toBe(true);
  });
});
