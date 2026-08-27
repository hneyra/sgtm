import { guardarToken } from './cliente';

/**
 * Authorization Code con PKCE contra el proveedor OIDC (ADR-0005, FRO-01 §5).
 *
 * Vive en `@sgtm/api-client` y no en la aplicacion por una razon concreta: es
 * el unico paquete donde `fetch` esta en su sitio. El proveedor de identidad no
 * cuelga de `/api/v1`, asi que `solicitar()` no le sirve, y sacar la peticion a
 * una pantalla abriria la puerta que la regla de ESLint cierra.
 *
 * Lo que este modulo **no** hace: guardar el token. El token vive en memoria
 * (`guardarToken`), y recargar la pagina vuelve a autenticar. Es el precio, y es
 * barato al lado de un token robado por un XSS.
 */

export interface ConfiguracionDeIdentidad {
  readonly autorizacion: string;
  readonly token: string;
  readonly finDeSesion?: string;
  readonly cliente: string;
  readonly alcance: string;
  readonly redireccion: string;
}

/**
 * La configuracion del proveedor, o `null` si no hay ninguno configurado.
 *
 * Sin proveedor la aplicacion arranca igual —es como se trabaja contra el proxy
 * de datos, que no pide token—, y en produccion es un despliegue mal
 * configurado, no un modo de uso.
 */
export function configuracionDeIdentidad(): ConfiguracionDeIdentidad | null {
  const entorno = import.meta.env;
  const cliente = entorno['VITE_SGTM_OIDC_CLIENTE'];
  const autorizacion = entorno['VITE_SGTM_OIDC_AUTORIZACION'];
  const token = entorno['VITE_SGTM_OIDC_TOKEN'];
  if (!cliente || !autorizacion || !token) return null;

  return {
    autorizacion,
    token,
    ...(entorno['VITE_SGTM_OIDC_FIN_DE_SESION']
      ? { finDeSesion: entorno['VITE_SGTM_OIDC_FIN_DE_SESION'] }
      : {}),
    cliente,
    alcance: entorno['VITE_SGTM_OIDC_ALCANCE'] ?? 'openid profile',
    redireccion: `${window.location.origin}/`,
  };
}

/* ── PKCE ──────────────────────────────────────────────────────────────── */

const base64url = (bytes: Uint8Array): string => {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Verificador de PKCE: 64 bytes de azar, que son 86 caracteres. */
export function nuevoVerificador(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(64)));
}

/** El reto es el SHA-256 del verificador. Sin secreto de cliente: no hay donde guardarlo. */
export async function retoDe(verificador: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  return base64url(new Uint8Array(resumen));
}

/**
 * Donde espera el verificador mientras el navegador va y vuelve del proveedor.
 *
 * Es almacenamiento del navegador, si, y la prohibicion de FRO-01 §5 es sobre
 * **el token**. Un verificador sin su codigo de autorizacion no abre nada: es de
 * un solo uso, va atado al codigo que el proveedor emite, y se borra al
 * canjearlo. Guardarlo en memoria no es una opcion —la redireccion recarga la
 * pagina entera— y la alternativa seria no usar PKCE.
 */
const DONDE_ESPERA = 'sgtm.pkce';

interface Intercambio {
  readonly verificador: string;
  readonly estado: string;
  /** A donde volver despues de autenticar. */
  readonly volverA: string;
}

export async function irAAutenticar(
  configuracion: ConfiguracionDeIdentidad,
  volverA: string,
): Promise<void> {
  const verificador = nuevoVerificador();
  const estado = nuevoVerificador();
  const intercambio: Intercambio = { verificador, estado, volverA };
  sessionStorage.setItem(DONDE_ESPERA, JSON.stringify(intercambio));

  // Con `window.location.origin` de base, `autorizacion` puede ser una RUTA del
  // mismo origen —`/keycloak/realms/...`— y no una URL absoluta. Es lo que
  // permite que el dominio no viaje dentro del paquete: Vite resuelve las
  // `VITE_*` al compilar, asi que una URL absoluta ahi convierte el nombre del
  // servidor en una constante horneada, y cambiarlo obliga a reconstruir la
  // imagen. Cuando no se reconstruye, el ingreso apunta a un dominio y el
  // paquete a otro, sin que nada se ponga rojo: paso en `prod`, con el boton de
  // acceso mandando el navegador a un nombre que ni siquiera resolvia.
  //
  // No rompe lo que ya funciona: `new URL()` ignora la base cuando el primer
  // argumento YA es absoluto, asi que `despliegue/compose.yaml` —donde Keycloak
  // vive en otro origen, `localhost:8180`— sigue igual. Lo absoluto gana; lo
  // relativo pasa a ser posible.
  const url = new URL(configuracion.autorizacion, window.location.origin);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', configuracion.cliente);
  url.searchParams.set('redirect_uri', configuracion.redireccion);
  url.searchParams.set('scope', configuracion.alcance);
  url.searchParams.set('state', estado);
  url.searchParams.set('code_challenge', await retoDe(verificador));
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(url.toString());
}

export interface Sesion {
  readonly token: string;
  /** Segundos que dura el token, tal como los declara el proveedor. */
  readonly dura: number;
}

/** Lo que el proveedor responde en el canje. */
interface RespuestaDelProveedor {
  readonly access_token?: string;
  readonly expires_in?: number;
}

/**
 * Canjea el codigo de la vuelta del proveedor, si es que hay uno.
 *
 * Deja la barra de direcciones limpia: el codigo es de un solo uso, pero una URL
 * con credenciales se comparte, se guarda en el historial y acaba en un correo
 * de soporte.
 */
export async function canjearSiVuelve(
  configuracion: ConfiguracionDeIdentidad,
): Promise<{ readonly sesion: Sesion; readonly volverA: string } | null> {
  const consulta = new URLSearchParams(window.location.search);
  const codigo = consulta.get('code');
  const estado = consulta.get('state');
  if (codigo === null) return null;

  const guardado = sessionStorage.getItem(DONDE_ESPERA);
  sessionStorage.removeItem(DONDE_ESPERA);
  limpiarLaBarraDeDirecciones();
  if (guardado === null)
    throw new Error('La vuelta del proveedor no corresponde a ninguna entrada.');

  const intercambio = JSON.parse(guardado) as Intercambio;
  if (estado !== intercambio.estado) {
    // Un `state` que no cuadra es una vuelta que no empezo aqui.
    throw new Error('La vuelta del proveedor no cuadra con la peticion que salio.');
  }

  const cuerpo = new URLSearchParams({
    grant_type: 'authorization_code',
    code: codigo,
    client_id: configuracion.cliente,
    redirect_uri: configuracion.redireccion,
    code_verifier: intercambio.verificador,
  });

  return { sesion: await pedirToken(configuracion, cuerpo), volverA: intercambio.volverA };
}

/**
 * Renueva el token con el refresh token, que viaja en una cookie `HttpOnly`.
 *
 * Por eso la peticion lleva `credentials: 'include'` y no manda ningun secreto:
 * el navegador adjunta la cookie y el JavaScript nunca la ve.
 */
export function renovar(
  configuracion: ConfiguracionDeIdentidad,
  municipalidad?: string,
): Promise<Sesion> {
  const cuerpo = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: configuracion.cliente,
  });
  // D-06: el nombre del parametro con el que se pide la municipalidad activa
  // esta sin cerrar. Vive aqui, en una linea, hasta que se cierre.
  if (municipalidad !== undefined) cuerpo.set('municipalidad', municipalidad);
  return pedirToken(configuracion, cuerpo);
}

async function pedirToken(
  configuracion: ConfiguracionDeIdentidad,
  cuerpo: URLSearchParams,
): Promise<Sesion> {
  const respuesta = await fetch(configuracion.token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
    credentials: 'include',
  });
  if (!respuesta.ok) throw new Error('El proveedor de identidad rechazo la peticion de token.');

  const datos = (await respuesta.json()) as RespuestaDelProveedor;
  if (!datos.access_token) throw new Error('El proveedor no devolvio ningun token de acceso.');

  guardarToken(datos.access_token);
  return { token: datos.access_token, dura: datos.expires_in ?? 300 };
}

export function cerrarSesion(configuracion: ConfiguracionDeIdentidad | null): void {
  guardarToken(null);
  if (configuracion?.finDeSesion) window.location.assign(configuracion.finDeSesion);
}

function limpiarLaBarraDeDirecciones(): void {
  const limpia = new URL(window.location.href);
  limpia.search = '';
  window.history.replaceState({}, '', limpia.toString());
}

/**
 * Lo que la interfaz necesita saber del token, y nada mas.
 *
 * **El identificador de municipalidad no se lee para mandarlo a ningun sitio**
 * (regla 2, FRO-01 §4): el backend lo toma del claim del token que el mismo
 * valida. Aqui se lee para poder escribir el nombre de la municipalidad activa
 * en la cabecera, que es distinto.
 */
export interface DatosDelToken {
  readonly usuario: string;
  readonly municipalidad: string;
  /** Instante de expiracion, en segundos desde la epoca. */
  readonly expira: number;
  /**
   * Los permisos efectivos, tal como los manda el servidor.
   *
   * Se devuelve **sin interpretar**: quien sabe que significa cada privilegio es
   * la aplicacion, no el cliente HTTP. Que los traiga el token o una operacion
   * del contrato lo deciden #9 y #12; el sitio donde se leen es este.
   */
  readonly permisos: unknown;
}

export function leerToken(token: string): DatosDelToken | null {
  const [, carga] = token.split('.');
  if (carga === undefined) return null;
  try {
    const json = JSON.parse(atob(carga.replace(/-/g, '+').replace(/_/g, '/'))) as Readonly<
      Record<string, unknown>
    >;
    return {
      usuario: typeof json['name'] === 'string' ? json['name'] : (json['sub'] as string) || '',
      municipalidad:
        typeof json['municipalidad_nombre'] === 'string' ? json['municipalidad_nombre'] : '',
      expira: typeof json['exp'] === 'number' ? json['exp'] : 0,
      permisos: json['permisos'] ?? null,
    };
  } catch {
    return null;
  }
}
