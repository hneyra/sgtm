/**
 * La puerta de sesión: código de autorización con PKCE contra Keycloak.
 *
 * <h2>Por qué rutas relativas y no una URL absoluta</h2>
 *
 * Keycloak se sirve bajo `/kc` del **mismo origen** que la interfaz, así que las
 * tres rutas de aquí son relativas. Un dominio escrito aquí quedaría horneado en
 * el paquete estático —Vite resuelve `import.meta.env` al compilar—, y como la
 * imagen se construye una vez y se despliega en varios sitios, las dos mitades
 * acabarían apuntando a servidores distintos, en verde y sin un solo síntoma.
 *
 * <h2>Por qué el 401 vuelve a la puerta en vez de pedir un token de refresco</h2>
 *
 * Un token dura minutos. En vez de guardar un token de refresco —que es una
 * credencial de vida larga en `localStorage`— se vuelve a pedir un código: si la
 * sesión de Keycloak sigue viva, el navegador va y vuelve sin enseñar nada y el
 * usuario no se entera; y si no lo está, ve el formulario, que es lo que tiene
 * que ver. La renovación silenciosa sale gratis de tener SSO.
 */

import { token } from './cliente';
export { token };

const REALM = import.meta.env.VITE_SGTM_OIDC_REALM ?? '/kc/realms/sgtm';
const CLIENTE = import.meta.env.VITE_SGTM_OIDC_CLIENTE ?? 'sgtm-backoffice';
const ALCANCE = import.meta.env.VITE_SGTM_OIDC_ALCANCE ?? 'openid profile';

const AUTORIZACION = `${REALM}/protocol/openid-connect/auth`;
const TOKEN = `${REALM}/protocol/openid-connect/token`;
const FIN_DE_SESION = `${REALM}/protocol/openid-connect/logout`;

/**
 * Una ruta del proveedor de identidad, resuelta contra el emisor que esta
 * interfaz ya usa para entrar.
 *
 * Lo que compone es la BASE, y nunca la ruta. La ruta la dice el servidor
 * —`PUT /seguridad/usuarios/{id}/clave` contesta `/account/password`— y su
 * javadoc explica por qué llega relativa: el emisor concreto es configuración
 * del ambiente (ADR-0005), y horneado en el backend obligaría a recompilar para
 * cambiar de proveedor. La base sale de la misma constante con la que se pide el
 * token, así que las dos mitades no pueden acabar apuntando a servidores
 * distintos — que es el defecto que este archivo ya evita con las tres rutas de
 * arriba.
 */
export function enElProveedorDeIdentidad(ruta: string): string {
  return REALM + ruta;
}

const VERIFICADOR = 'sgtm.pkce.verificador';
const ESTADO = 'sgtm.pkce.estado';
const DESTINO = 'sgtm.pkce.destino';
const ULTIMO_INTENTO = 'sgtm.pkce.intento';
const INTENTOS = 'sgtm.pkce.intentos';
const SALIDA = 'sgtm.pkce.salida';

/** Cuántas idas a la puerta se admiten seguidas antes de parar y explicarse. */
const TOPE_DE_INTENTOS = 3;

/** Lo que pasó al volver de Keycloak. */
export type Vuelta =
  | { estado: 'sin-vuelta' }
  | { estado: 'canjeado' }
  | { estado: 'fallo'; motivo: string; detalle?: string };

/**
 * En local no se manda a nadie a Keycloak.
 *
 * El cliente `sgtm-backoffice` declara sus URIs de retorno una a una, y el
 * puerto de la vista previa no tiene por qué estar entre ellas: el rebote
 * acabaría en «Invalid parameter: redirect_uri», que no dice nada de lo que pasa.
 * En desarrollo se pega el token a mano, que es lo que ya hacía.
 */
export function enLocal(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
}

/** Sin `crypto.subtle` no hay PKCE, y el navegador no lo expone fuera de un
 *  origen seguro. Sobre http:// que no sea localhost, la puerta no se ofrece. */
export function hayPuerta(): boolean {
  return !enLocal() && typeof crypto !== 'undefined' && crypto.subtle !== undefined;
}

/** Manda al formulario de Keycloak, guardando a dónde había que volver. */
export async function entrar(): Promise<void> {
  const verificador = aleatorio(64);
  const estado = aleatorio(24);
  sessionStorage.setItem(VERIFICADOR, verificador);
  sessionStorage.setItem(ESTADO, estado);
  sessionStorage.setItem(DESTINO, window.location.hash || '#/inicio');
  sessionStorage.setItem(ULTIMO_INTENTO, String(Date.now()));
  sessionStorage.setItem(INTENTOS, String(intentos() + 1));
  sessionStorage.removeItem(SALIDA);

  const parametros = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENTE,
    redirect_uri: retorno(),
    scope: ALCANCE,
    state: estado,
    code_challenge: await reto(verificador),
    code_challenge_method: 'S256',
  });
  window.location.assign(`${AUTORIZACION}?${parametros}`);
}

/**
 * Si venimos de Keycloak, canjea el código por un token.
 *
 * Devuelve **por qué** no se pudo, y no un `false` mudo. Quien la llama tiene
 * que decidir entre volver a la puerta y pararse a explicarse, y esas dos cosas
 * no se distinguen sin el motivo: con un `false` para todo, un `?error=` del
 * emisor se trataba igual que «esta URL no traía código», y el arranque volvía
 * a mandar a la puerta —que devolvía el mismo error— sin fin.
 */
export async function canjearSiVuelve(): Promise<Vuelta> {
  const url = new URL(window.location.href);
  const codigo = url.searchParams.get('code');
  const estado = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (!codigo && !error) return { estado: 'sin-vuelta' };

  const verificador = sessionStorage.getItem(VERIFICADOR);
  const esperado = sessionStorage.getItem(ESTADO);
  const destino = sessionStorage.getItem(DESTINO) ?? '#/inicio';
  sessionStorage.removeItem(VERIFICADOR);
  sessionStorage.removeItem(ESTADO);
  sessionStorage.removeItem(DESTINO);

  /* La URL se limpia SIEMPRE, haya salido bien o mal: un código ya usado no
     vale dos veces, y dejarlo en la barra hace que recargar dé un error que no
     tiene nada que ver con lo que pasó. */
  const limpia = () => window.history.replaceState(null, '', url.pathname + destino);

  if (error) {
    limpia();
    return {
      estado: 'fallo',
      motivo: motivoDelEmisor(error),
      detalle: url.searchParams.get('error_description') ?? `El emisor contestó «${error}».`,
    };
  }
  /* El estado es lo único que distingue nuestra vuelta de un código que alguien
     nos hizo llegar. Sin comprobarlo, la puerta acepta cualquier código. */
  if (!codigo || !verificador || !esperado || estado !== esperado) {
    limpia();
    return {
      estado: 'fallo',
      motivo: 'La vuelta no cuadra con la ida',
      detalle:
        'El código llegó sin el estado que se guardó al salir. Suele pasar al abrir un enlace de vuelta ' +
        'antiguo o en otra pestaña; también es lo que se ve si alguien intenta colar un código ajeno.',
    };
  }

  let respuesta: Response;
  try {
    /* Con tope. Sin él, un emisor que no contesta deja la aplicación SIN DIBUJAR
       NADA para siempre —ni un error ni un esqueleto—, porque el arranque espera
       aquí antes de montar React. */
    respuesta = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENTE,
        code: codigo,
        redirect_uri: retorno(),
        code_verifier: verificador,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    limpia();
    return {
      estado: 'fallo',
      motivo: 'El emisor no contestó',
      detalle: 'La petición del token no llegó a completarse. Puede estar apagado o no alcanzable desde aquí.',
    };
  }
  limpia();
  if (!respuesta.ok) {
    return {
      estado: 'fallo',
      motivo: 'El emisor rechazó el canje',
      detalle: `La petición del token volvió con ${respuesta.status}. Suele ser la URI de retorno o el cliente.`,
    };
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as { access_token?: string; id_token?: string };
  if (!cuerpo.access_token) {
    return { estado: 'fallo', motivo: 'El emisor no devolvió ningún token', detalle: 'La respuesta del canje no trae `access_token`.' };
  }
  localStorage.setItem('sgtm.token', cuerpo.access_token);
  if (cuerpo.id_token) localStorage.setItem('sgtm.id_token', cuerpo.id_token);
  /* Salió bien: la cuenta de idas vuelve a cero, para que el tope proteja de
     una racha de fallos y no de haber entrado muchas veces en el día. */
  sessionStorage.removeItem(INTENTOS);
  return { estado: 'canjeado' };
}

function motivoDelEmisor(error: string): string {
  switch (error) {
    case 'access_denied':
      return 'No se completó la entrada';
    case 'invalid_scope':
      return 'El alcance que se pide no existe en el emisor';
    case 'unauthorized_client':
    case 'invalid_client':
      return 'El emisor no reconoce a este cliente';
    case 'temporarily_unavailable':
    case 'server_error':
      return 'El emisor tuvo un problema';
    default:
      return 'El emisor no dejó entrar';
  }
}

function intentos(): number {
  return Number(sessionStorage.getItem(INTENTOS) ?? 0);
}

/**
 * ¿Se puede volver a la puerta, o hay que pararse y explicarse?
 *
 * Tres idas seguidas sin canjear son un bucle, no mala suerte. Sin este tope el
 * arranque rebota sin fin: pantalla en blanco parpadeando, ninguna traza y el
 * emisor recibiendo la ráfaga. Y sólo se puede dar en despliegue —en local no
 * hay puerta—, que es donde nadie está mirando.
 */
export function puedeIrALaPuerta(): boolean {
  return intentos() < TOPE_DE_INTENTOS;
}

/** Se acaba de cerrar la sesión: el arranque NO debe volver a entrar solo. */
export function vieneDeSalir(): boolean {
  return sessionStorage.getItem(SALIDA) === '1';
}

/** Vuelve a permitir la ida a la puerta. Es el «Entrar» de la pantalla parada. */
export function olvidarLaParada(): void {
  sessionStorage.removeItem(INTENTOS);
  sessionStorage.removeItem(ULTIMO_INTENTO);
  sessionStorage.removeItem(SALIDA);
}

/**
 * Vuelve a la puerta cuando el token deja de valer.
 *
 * Con la sesión de Keycloak viva esto no enseña nada: va y vuelve. La guarda de
 * los diez segundos es lo que impide el bucle cuando el canje funciona y la API
 * sigue diciendo 401 —un token de otro emisor, un `aud` que no cuadra—: en vez
 * de rebotar sin fin, se para y la pantalla dice lo que pasa.
 */
export function reintentarLaSesion(): boolean {
  if (!hayPuerta()) return false;
  const ultimo = Number(sessionStorage.getItem(ULTIMO_INTENTO) ?? 0);
  if (Date.now() - ultimo < 10_000) return false;
  localStorage.removeItem('sgtm.token');
  void entrar();
  return true;
}

/** Cierra la sesión aquí y en Keycloak. */
export function salir(): void {
  const id = localStorage.getItem('sgtm.id_token');
  localStorage.removeItem('sgtm.token');
  localStorage.removeItem('sgtm.id_token');
  sessionStorage.removeItem(ULTIMO_INTENTO);
  sessionStorage.removeItem(INTENTOS);
  /* La marca es lo que impide volver a entrar solo al instante.
     `post_logout_redirect_uri` trae de vuelta a la raíz sin token, y el arranque
     veía eso y llamaba a `entrar()`: con la sesión del emisor viva —o sin
     `id_token_hint`, que es lo que pasa cuando el token se pegó a mano— el
     usuario acababa DENTRO OTRA VEZ con la misma cuenta, sin haber hecho nada. */
  sessionStorage.setItem(SALIDA, '1');
  if (!hayPuerta()) {
    window.location.reload();
    return;
  }
  const parametros = new URLSearchParams({ post_logout_redirect_uri: retorno() });
  if (id) parametros.set('id_token_hint', id);
  window.location.assign(`${FIN_DE_SESION}?${parametros}`);
}

/**
 * La cuenta de la sesión, leída del token.
 *
 * **Solo para enseñarla.** El token no se verifica aquí —de eso vive el
 * backend—; se lee su carga para poder decir en pantalla con qué cuenta se está
 * mirando. Sin esto, un 403 dice «tu perfil no puede» y no dice de quién habla,
 * que es justo lo que hay que saber para arreglarlo.
 */
export function cuentaActual(): string | null {
  return carga()?.preferred_username ?? null;
}

/** El nombre completo de la sesión, si el token lo trae. */
export function nombreDeLaSesion(): string | null {
  return carga()?.name ?? null;
}

/**
 * De qué municipalidad es la sesión.
 *
 * Sólo el número: **ningún endpoint del contrato publica el nombre**, y el token
 * tampoco lo trae. Lo que hay es este identificador, y con él se puede decir una
 * cosa cierta —de quién son las cifras que se están mirando— en lugar de
 * afirmar un nombre concreto y equivocado.
 */
export function municipalidadDeLaSesion(): number | null {
  const id = carga()?.municipalidad_id;
  return typeof id === 'number' ? id : null;
}

/**
 * El rótulo de la entidad, para la cabecera y para las hojas que se imprimen.
 *
 * Decía «Municipalidad Distrital de Catacaos» **siempre**, era una constante sin
 * ninguna interfaz que la cambiara, y se imprimía en siete hojas. Con el token
 * de otra municipalidad, esa cabecera afirmaba de quién son unas cifras que no
 * son suyas. Hasta que alguna lectura publique el nombre (#555), se dice lo que
 * se sabe y ni una palabra más.
 */
export function rotuloDeLaEntidad(): string {
  const id = municipalidadDeLaSesion();
  return id === null ? 'Municipalidad' : `Municipalidad n.º ${id}`;
}

type Claims = { preferred_username?: string; name?: string; municipalidad_id?: number };

function carga(): Claims | null {
  const t = token();
  if (!t) return null;
  try {
    const parte = t.split('.')[1];
    if (!parte) return null;
    const bytes = Uint8Array.from(atob(parte.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Claims;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------

/** Siempre la raíz, aunque se entrara por una ruta profunda: es una sola URI de
 *  retorno que declarar en el cliente, y el destino viaja aparte. */
function retorno(): string {
  return window.location.origin + '/';
}

function aleatorio(largo: number): string {
  const bytes = new Uint8Array(largo);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function reto(verificador: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  return base64url(new Uint8Array(resumen));
}

function base64url(bytes: Uint8Array): string {
  let texto = '';
  bytes.forEach((b) => (texto += String.fromCharCode(b)));
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
