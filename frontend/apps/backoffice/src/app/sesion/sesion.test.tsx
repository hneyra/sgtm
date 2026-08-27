import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { retoDe, solicitar } from '@sgtm/api-client';
import { useEscritura } from '../../pantallas/escritura';
import { ProveedorDeSesion, useSesion } from './ProveedorDeSesion';
import { PuertaDeSesion } from './PuertaDeSesion';

/**
 * La sesion de trabajo (FRO-01 §5, ADR-0005).
 *
 * Lo que se comprueba no es que «funcione el login»: es que el token no acabe
 * en ningun sitio donde un XSS pueda leerlo, que renovar no le quite a nadie el
 * formulario que estaba llenando, y que cambiar de municipalidad no deje ni una
 * fila de la anterior en la cache.
 */

const CONFIGURACION = {
  VITE_SGTM_OIDC_CLIENTE: 'sgtm-backoffice',
  VITE_SGTM_OIDC_AUTORIZACION: 'https://identidad.gob.pe/oauth2/authorize',
  VITE_SGTM_OIDC_TOKEN: 'https://identidad.gob.pe/oauth2/token',
};

/** Un JWT de mentira: cabecera y firma dan igual, lo que se lee es la carga. */
function tokenDe(carga: Readonly<Record<string, unknown>>): string {
  const base64url = (texto: string) =>
    btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url('{"alg":"none"}')}.${base64url(JSON.stringify(carga))}.firma`;
}

const CARGA = {
  name: 'María Quispe',
  municipalidad_nombre: 'Municipalidad Provincial de Sullana',
  exp: 2_000_000_000,
};

const originalFetch = globalThis.fetch;
let tokensEmitidos: string[] = [];
let peticiones: string[] = [];

function elProveedorResponde(): void {
  tokensEmitidos = [];
  peticiones = [];
  globalThis.fetch = (entrada) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    peticiones.push(url);
    if (url.startsWith('https://identidad.gob.pe')) {
      const token = tokenDe({ ...CARGA, sesion: tokensEmitidos.length });
      tokensEmitidos.push(token);
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: token, expires_in: 300 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ fechaCalculo: '2026-08-13' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

/**
 * jsdom no deja espiar `location.assign`, asi que la barra de direcciones se
 * sustituye entera. Es lo que hay que mirar en varias de estas pruebas.
 */
const ubicacionReal = window.location;
let irA: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const [clave, valor] of Object.entries(CONFIGURACION)) vi.stubEnv(clave, valor);
  irA = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000/inicio/inicio',
      pathname: '/inicio/inicio',
      search: '',
      assign: irA,
    },
  });
  sessionStorage.clear();
  localStorage.clear();
  elProveedorResponde();
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: ubicacionReal });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

/**
 * Un formulario a medio llenar, para comprobar que la renovacion no se lo lleva.
 *
 * Dos campos a proposito, y el segundo es el que de verdad prueba algo: el
 * primero es un `input` sin control, que sobrevive mientras el nodo no se
 * desmonte; el segundo vive en el **estado de React** —el borrador de
 * `useEscritura`— y se pierde en cuanto algo remonte el arbol. Es el caso del
 * manual: la declaracion jurada (HR, PU, PR) se llena en varios minutos, y
 * perderla a mitad por una renovacion de token es el defecto que mas duele de
 * los que se pueden cometer aqui (#73, FRO-01 §5).
 */
function Formulario() {
  const sesion = useSesion();
  const escritura = useEscritura(
    'cambiar_anio',
    {},
    { campos: { cambiarAlAno: { campo: 'ejercicio', entero: true } } },
  );
  return (
    <div>
      <p>Municipalidad: {sesion.datos?.municipalidad}</p>
      <p data-testid="datos">{JSON.stringify(Object.keys(sesion.datos ?? {}))}</p>
      <label htmlFor="motivo">Motivo</label>
      <input id="motivo" defaultValue="" />
      <label htmlFor="borrador">Año</label>
      <input
        id="borrador"
        value={escritura.borrador['cambiarAlAno'] ?? ''}
        onChange={(e) => escritura.fijarCampo('cambiarAlAno', e.target.value)}
      />
      <button type="button" onClick={() => void sesion.cambiarDeMunicipalidad('2601')}>
        Cambiar de municipalidad
      </button>
      <button type="button" onClick={sesion.salir}>
        Salir
      </button>
    </div>
  );
}

function montar(cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return {
    cliente,
    ...render(
      <QueryClientProvider client={cliente}>
        <ProveedorDeSesion>
          <PuertaDeSesion>
            <Formulario />
          </PuertaDeSesion>
        </ProveedorDeSesion>
      </QueryClientProvider>,
    ),
  };
}

describe('el flujo es Authorization Code con PKCE, sin secreto en el navegador', () => {
  it('la ida lleva el reto, que es el SHA-256 del verificador que se queda aqui', async () => {
    const usuario = userEvent.setup();
    // Sin sesion viva: el proveedor rechaza la renovacion y toca entrar.
    globalThis.fetch = () => Promise.resolve(new Response('{}', { status: 400 }));
    montar();

    await usuario.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(irA).toHaveBeenCalled());

    const ida = new URL(String(irA.mock.calls[0]?.[0]));
    expect(ida.searchParams.get('response_type')).toBe('code');
    expect(ida.searchParams.get('code_challenge_method')).toBe('S256');
    expect(ida.searchParams.get('client_id')).toBe('sgtm-backoffice');

    const guardado = JSON.parse(sessionStorage.getItem('sgtm.pkce') ?? '{}') as {
      verificador: string;
      estado: string;
      volverA: string;
    };
    // El verificador se queda aqui y el reto es lo unico que viaja.
    expect(ida.searchParams.get('code_challenge')).toBe(await retoDe(guardado.verificador));
    expect(ida.searchParams.get('state')).toBe(guardado.estado);
    // Y la ruta de vuelta va con el, para seguir donde se estaba.
    expect(guardado.volverA).toBe('/inicio/inicio');
  });

  it('la vuelta canjea el codigo y deja la barra de direcciones limpia', async () => {
    sessionStorage.setItem(
      'sgtm.pkce',
      JSON.stringify({
        verificador: 'v-de-prueba',
        estado: 'e-de-prueba',
        volverA: '/inicio/inicio',
      }),
    );
    window.location.search = '?code=un-codigo&state=e-de-prueba';
    window.location.href = 'http://localhost:3000/?code=un-codigo&state=e-de-prueba';
    const limpiar = vi.spyOn(window.history, 'replaceState');

    const enviados: string[] = [];
    const proveedor = globalThis.fetch;
    globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
      if (typeof opciones?.body === 'string') enviados.push(opciones.body);
      return proveedor(entrada, opciones);
    }) as typeof fetch;

    montar();
    expect(await screen.findByText(/Sullana/)).toBeInTheDocument();

    const canje = new URLSearchParams(enviados[0] ?? '');
    expect(canje.get('grant_type')).toBe('authorization_code');
    expect(canje.get('code')).toBe('un-codigo');
    expect(canje.get('code_verifier')).toBe('v-de-prueba');
    // El codigo es de un solo uso, pero una URL con credenciales se comparte.
    expect(limpiar).toHaveBeenCalled();
    expect(sessionStorage.getItem('sgtm.pkce')).toBeNull();
  });
});

describe('el token no se guarda donde alguien pueda leerlo', () => {
  it('ni en localStorage, ni en sessionStorage, ni en la URL', async () => {
    montar();
    expect(await screen.findByText(/Municipalidad Provincial de Sullana/)).toBeInTheDocument();

    const emitido = tokensEmitidos[0] ?? '';
    expect(emitido).not.toBe('');
    const guardado = [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage),
      window.location.href,
    ].join(' ');
    expect(guardado).not.toContain(emitido);
    expect(guardado).not.toContain('access_token');
  });
});

describe('renovar no le quita a nadie lo que estaba escribiendo', () => {
  it('el formulario a medio llenar sobrevive a la renovacion', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Sullana/);

    const motivo = screen.getByLabelText('Motivo');
    await usuario.type(motivo, 'Rectificación de área construida');
    expect(motivo).toHaveValue('Rectificación de área construida');

    // Y lo que vive en el estado de React, que es lo que de verdad se pierde si
    // algo remonta: el borrador de la escritura.
    await usuario.type(screen.getByLabelText('Año'), '2021');
    expect(screen.getByLabelText('Año')).toHaveValue('2021');

    // Al servidor le caduca el token mientras se escribe.
    const antes = tokensEmitidos.length;
    globalThis.fetch = ((entrada: RequestInfo | URL) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (!url.startsWith('https://identidad.gob.pe')) {
        return Promise.resolve(new Response('{}', { status: 401 }));
      }
      const token = tokenDe({ ...CARGA, sesion: tokensEmitidos.length });
      tokensEmitidos.push(token);
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: token, expires_in: 300 }), { status: 200 }),
      );
    }) as typeof fetch;

    await expect(solicitar('/catastro/vias')).rejects.toThrow();

    // Se renovo una vez —y solo una— y los dos campos siguen donde estaban.
    await waitFor(() => expect(tokensEmitidos.length).toBe(antes + 1));
    expect(screen.getByLabelText('Motivo')).toHaveValue('Rectificación de área construida');
    // El segundo vive en el **estado de React** —el borrador de `useEscritura`—
    // y es el que de verdad se pierde si algo remonta el arbol. Es el caso del
    // manual: la declaracion jurada se llena en varios minutos (#73).
    //
    // **Lo que esta prueba no consigue demostrar** es que muerda ante un
    // remontaje: la renovacion simulada resuelve en el mismo turno, asi que
    // React agrupa el cierre y la reapertura de la puerta y ningun render los
    // separa. Cubre la regresion evidente —que la renovacion cambie los datos
    // de la sesion sin tocar lo escrito—, no la sutil.
    expect(screen.getByLabelText('Año')).toHaveValue('2021');
  });
});

describe('cerrar sesion no deja nada de la sesion anterior', () => {
  it('la cache queda vacia', async () => {
    const usuario = userEvent.setup();
    const { cliente } = montar();
    await screen.findByText(/Sullana/);

    await cliente.fetchQuery({ queryKey: ['pantalla', 'calles', {}], queryFn: () => 'filas' });
    expect(cliente.getQueryCache().getAll()).toHaveLength(1);

    await usuario.click(screen.getByRole('button', { name: 'Salir' }));
    expect(cliente.getQueryCache().getAll()).toHaveLength(0);
    expect(await screen.findByText('Hay que iniciar sesión')).toBeInTheDocument();
  });
});

describe('cambiar de municipalidad vacia la cache antes de pedir', () => {
  it('el orden se comprueba, no solo el resultado', async () => {
    const usuario = userEvent.setup();
    const { cliente } = montar();
    await screen.findByText(/Sullana/);

    await cliente.fetchQuery({ queryKey: ['pantalla', 'calles', {}], queryFn: () => 'filas' });

    const orden: string[] = [];
    const vaciar = cliente.clear.bind(cliente);
    vi.spyOn(cliente, 'clear').mockImplementation(() => {
      orden.push('cache vaciada');
      vaciar();
    });
    const proveedor = globalThis.fetch;
    globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
      orden.push(`peticion ${typeof entrada === 'string' ? entrada : String(entrada)}`);
      return proveedor(entrada, opciones);
    }) as typeof fetch;

    await usuario.click(screen.getByRole('button', { name: 'Cambiar de municipalidad' }));
    await waitFor(() => expect(orden.length).toBeGreaterThan(1));

    // Primero se vacia y despues se pide: al reves, la respuesta de la
    // municipalidad anterior seguiria ahi cuando se dibuje la primera pantalla.
    expect(orden[0]).toBe('cache vaciada');
    expect(orden[1]).toMatch(/^peticion https:\/\/identidad/);
    expect(cliente.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('sin proveedor configurado, la aplicacion arranca igual', () => {
  it('no hay puerta que cruzar: es como se trabaja contra el proxy de datos', async () => {
    vi.unstubAllEnvs();
    montar();
    expect(await screen.findByLabelText('Motivo')).toBeInTheDocument();
    expect(screen.queryByText('Hay que iniciar sesión')).not.toBeInTheDocument();
    expect(peticiones.filter((u) => u.startsWith('https://identidad'))).toEqual([]);
  });
});

describe('si la renovacion falla, se vuelve a autenticar sin perder el sitio', () => {
  it('el 401 se reintenta una vez y despues lleva a la puerta', async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText(/Sullana/);

    // Ni la peticion ni la renovacion funcionan: la sesion se acabo de verdad.
    let renovaciones = 0;
    globalThis.fetch = ((entrada: RequestInfo | URL) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.startsWith('https://identidad.gob.pe')) {
        renovaciones += 1;
        return Promise.resolve(new Response('{}', { status: 400 }));
      }
      return Promise.resolve(new Response('{}', { status: 401 }));
    }) as typeof fetch;

    await expect(solicitar('/catastro/vias')).rejects.toThrow();
    expect(renovaciones).toBe(1);

    expect(await screen.findByText('Hay que iniciar sesión')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(irA).toHaveBeenCalled());

    const guardado = JSON.parse(sessionStorage.getItem('sgtm.pkce') ?? '{}') as { volverA: string };
    expect(guardado.volverA).toBe('/inicio/inicio');
  });
});

describe('la municipalidad del token es para mostrarla, no para mandarla', () => {
  it('de la sesion sale el nombre y nada mas, y ninguna peticion la lleva', async () => {
    montar();
    await screen.findByText(/Sullana/);

    // Lo que el token deja ver: quien es, donde trabaja y hasta cuando. No hay
    // identificador de municipalidad que mandar, asi que no se puede mandar
    // (regla 2, FRO-01 §4). Los permisos NO estan aqui: solo autentica; la
    // matriz la pide `GET /seguridad/sesion/permisos` (ADR-0013).
    expect(screen.getByTestId('datos')).toHaveTextContent(
      '["usuario","municipalidad","expira"]',
    );

    // Lo que la sesion ya pidio al abrirse —el token y la matriz de permisos
    // (ADR-0013)— no es lo que esta prueba mira: interesa la peticion de datos
    // que viene despues.
    peticiones.length = 0;
    await solicitar('/catastro/vias', { consulta: { sector: '01' } });
    const alBackend = peticiones.filter((u) => !u.startsWith('https://identidad'));
    expect(alBackend).toHaveLength(1);
    expect(alBackend[0]).toContain('sector=01');
    expect(alBackend.some((u) => /municipalidad/i.test(u))).toBe(false);
  });
});
