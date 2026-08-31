import { vi } from 'vitest';

/**
 * El arnes de sesion de las pruebas: entra un usuario con unos permisos.
 *
 * Estaba copiado en dos archivos y las copias ya habian divergido, que es lo que
 * pasa siempre: la de `permisos.test.tsx` configuraba el proveedor de identidad
 * en su `beforeEach` —lo necesitan tambien las pruebas que no llaman a
 * `entraCon`— y la del lanzador lo configuraba dentro, para que las pruebas que
 * no entran corran **sin proveedor**, que es como se trabaja contra el proxy.
 *
 * Aqui el matiz se resuelve con dos piezas en vez de con dos copias:
 * `configurarProveedor()` para quien lo necesita suelto, y `entraCon()`, que lo
 * llama antes de responder la matriz.
 *
 * El token **no lleva los permisos** (ADR-0013): solo autentica. La matriz la
 * pide la interfaz a `GET /seguridad/sesion/permisos`.
 */

/** Los permisos de un cajero, tal como los describe REQ-03 §3: caja, sin coactiva. */
export const CAJERO = {
  caja_tributaria: ['ejecucion', 'lectura', 'registro'],
  caja_tasas: ['ejecucion', 'lectura', 'registro'],
  duplicado_recibo: ['ejecucion', 'lectura', 'impresion'],
};

/** El perfil de consulta: ve, y no toca nada. */
export const CONSULTA = {
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

/** El `fetch` con el que arranco el archivo de prueba, para devolverlo al final. */
const original = globalThis.fetch;

/**
 * Deja la aplicacion con proveedor de identidad configurado. Sin esto la sesion
 * queda en `sin-proveedor` y la autorizacion es «se ve todo».
 */
export function configurarProveedor(): void {
  for (const [clave, valor] of Object.entries(CONFIGURACION)) vi.stubEnv(clave, valor);
}

/** Un token que solo autentica: nombre, municipalidad y expiracion lejana. */
function token(usuario: string): string {
  return `${base64url('{"alg":"none"}')}.${base64url(
    JSON.stringify({
      name: usuario,
      municipalidad_nombre: 'Municipalidad Provincial de Sullana',
      exp: 2_000_000_000,
    }),
  )}.firma`;
}

/**
 * Interpone un `fetch` que atiende al proveedor de identidad y a la matriz de
 * permisos, y deja pasar todo lo demas al proxy de datos.
 */
function interponer(responderPermisos: () => Response, usuario: string): void {
  const proxy = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.startsWith('https://identidad.gob.pe')) {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: token(usuario), expires_in: 300 }), {
          status: 200,
        }),
      );
    }
    if (url.replace(/^.*\/api\/v1/, '') === '/seguridad/sesion/permisos') {
      return Promise.resolve(responderPermisos());
    }
    return proxy(entrada, opciones);
  }) as typeof fetch;
}

/** Entra un usuario con estos permisos. */
export function entraCon(
  permisos: Readonly<Record<string, readonly string[]>>,
  usuario = 'María Quispe',
): void {
  configurarProveedor();
  interponer(() => new Response(JSON.stringify(permisos), { status: 200 }), usuario);
}

/**
 * Entra un usuario cuya matriz de permisos **no se puede leer**: el endpoint
 * responde 500. Negacion por omision, que es lo que el manual manda: sin matriz
 * no se ve nada, ni siquiera un menu vacio que falle en cada pulsacion.
 */
export function entraSinPoderLeerPermisos(usuario = 'María Quispe'): void {
  configurarProveedor();
  interponer(() => new Response('', { status: 500 }), usuario);
}

/** Deshace lo que dejaron `configurarProveedor` y `entraCon`. */
export function limpiarSesion(): void {
  vi.unstubAllEnvs();
  globalThis.fetch = original;
}
