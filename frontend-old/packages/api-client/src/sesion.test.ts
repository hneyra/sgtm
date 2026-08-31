import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cerrarSesion, irAAutenticar, type ConfiguracionDeIdentidad } from './sesion';

/**
 * El paquete no debe conocer el dominio donde se sirve.
 *
 * Vite resuelve las `VITE_*` AL COMPILAR: una URL absoluta en la configuracion
 * de identidad hornea el nombre del servidor dentro del paquete estatico. Como
 * la etiqueta de la imagen vive fuera del estado de Pulumi (`ADR-0011` §5),
 * cambiar `sgtm:domain` actualiza el ingreso y NO el paquete, y las dos mitades
 * quedan apuntando a sitios distintos sin que nada se ponga rojo. En `prod` eso
 * dejo el boton de acceso mandando el navegador a un nombre sin registro A.
 *
 * Keycloak se sirve en el mismo origen que la interfaz, asi que basta una ruta.
 */

const irA = vi.fn();

/** Configuracion minima; `autorizacion` es lo que cada prueba cambia. */
function configuracion(autorizacion: string, finDeSesion?: string): ConfiguracionDeIdentidad {
  return {
    autorizacion,
    token: '/keycloak/realms/sgtm/protocol/openid-connect/token',
    ...(finDeSesion ? { finDeSesion } : {}),
    cliente: 'sgtm-backoffice',
    alcance: 'openid profile',
    redireccion: `${window.location.origin}/`,
  };
}

beforeEach(() => {
  irA.mockReset();
  // `jsdom` no implementa la navegacion; interesa el argumento, no el efecto.
  vi.stubGlobal('location', { ...window.location, assign: irA });
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** La url a la que se mando el navegador, o falla la prueba. */
function aDondeFue(): URL {
  const llamada = irA.mock.calls.at(-1);
  if (!llamada) throw new Error('No se navego a ninguna parte');
  return new URL(String(llamada[0]));
}

describe('el paquete no conoce el dominio donde se sirve', () => {
  it('una ruta relativa se resuelve contra el origen desde el que se sirve', async () => {
    await irAAutenticar(configuracion('/keycloak/realms/sgtm/protocol/openid-connect/auth'), '/');

    const url = aDondeFue();
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe('/keycloak/realms/sgtm/protocol/openid-connect/auth');
  });

  it('la ruta relativa sigue llevando todos los parametros de PKCE', async () => {
    await irAAutenticar(configuracion('/keycloak/realms/sgtm/protocol/openid-connect/auth'), '/');

    const url = aDondeFue();
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('sgtm-backoffice');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBeTruthy();
    // `redirect_uri` tiene que ser absoluta —lo exige OAuth— y ya se calculaba
    // en ejecucion, que es el patron que este cambio extiende a los tres extremos.
    expect(url.searchParams.get('redirect_uri')).toBe(`${window.location.origin}/`);
  });

  it('una URL absoluta sigue mandando: `despliegue/compose.yaml` no se rompe', async () => {
    // Ahi Keycloak vive en OTRO origen (`localhost:8180`), asi que la base no
    // debe pisarlo. `new URL()` ignora la base cuando lo primero ya es absoluto.
    await irAAutenticar(
      configuracion('http://localhost:8180/realms/sgtm/protocol/openid-connect/auth'),
      '/',
    );

    const url = aDondeFue();
    expect(url.origin).toBe('http://localhost:8180');
    expect(url.pathname).toBe('/realms/sgtm/protocol/openid-connect/auth');
  });

  it('el fin de sesion tambien admite una ruta', () => {
    cerrarSesion(
      configuracion(
        '/keycloak/realms/sgtm/protocol/openid-connect/auth',
        '/keycloak/realms/sgtm/protocol/openid-connect/logout',
      ),
    );

    expect(irA).toHaveBeenCalledWith('/keycloak/realms/sgtm/protocol/openid-connect/logout');
  });
});
