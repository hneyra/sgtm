/**
 * La única puerta por la que salen las peticiones al backend.
 *
 * No hay `fetch` suelto en ninguna pantalla: pasa todo por aquí, que es lo que
 * permite cambiar el origen, el token o el trato de los errores en un sitio.
 *
 * El backend contesta RFC 9457 (`ProblemDetail`) con dos extensiones propias,
 * `codigo` y `mensaje`, y en un fallo interno además `incidencia`. La interfaz
 * reacciona al **código**, nunca al texto: el texto se reescribe en cuanto
 * alguien lo lee en voz alta, y el código es estable por contrato.
 */

/** El catálogo de errores del backend, tal como lo declara `CodigoDeError`. */
export type CodigoDeError =
  | 'NO_AUTENTICADO'
  | 'SIN_MUNICIPALIDAD'
  | 'SIN_DOCUMENTO'
  | 'SIN_PRIVILEGIO'
  | 'VALIDACION'
  | 'ORDEN_NO_ADMITIDO'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'ERROR_INTERNO'
  /* No lo produce el servidor: es lo que se sabe cuando la petición no llegó a
     tener respuesta —red caída, servidor apagado, CORS—. Se distingue del
     ERROR_INTERNO porque ese sí llegó y trae incidencia con la que preguntar. */
  | 'SIN_RESPUESTA';

export class ErrorDeApi extends Error {
  constructor(
    readonly codigo: CodigoDeError,
    readonly mensaje: string,
    readonly estado: number,
    readonly incidencia?: string,
    readonly detalles?: string[],
  ) {
    super(mensaje);
    this.name = 'ErrorDeApi';
  }

  /** Si tiene sentido volver a intentarlo tal cual, sin cambiar nada. */
  get reintentable(): boolean {
    return this.codigo === 'SIN_RESPUESTA' || this.codigo === 'ERROR_INTERNO';
  }
}

/** La raíz de la API. En desarrollo la sirve el proxy de Vite, así que es relativa. */
const RAIZ = import.meta.env.VITE_SGTM_API ?? '/api/v1';

/**
 * El token con el que se firma cada petición.
 *
 * Mientras no haya puerta de sesión, sale de `VITE_SGTM_TOKEN` o de
 * `localStorage`, que es lo que permite probar contra el backend real sin
 * montar el canje OIDC. Cuando la sesión exista, cambia solo esta función.
 */
export function token(): string | null {
  const deEntorno = import.meta.env.VITE_SGTM_TOKEN;
  if (deEntorno) return deEntorno;
  try {
    return localStorage.getItem('sgtm.token');
  } catch {
    /* Una ventana privada puede prohibir el acceso al almacenamiento, y eso no
       es motivo para que la aplicación no arranque. */
    return null;
  }
}

export type Opciones = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  /** Los parámetros de consulta. Los `undefined`, `null` y `''` no viajan. */
  parametros?: Record<string, string | number | boolean | null | undefined>;
  cuerpo?: unknown;
  senal?: AbortSignal;
};

export async function solicitar<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { metodo = 'GET', parametros, cuerpo, senal } = opciones;

  const url = new URL(RAIZ + ruta, window.location.origin);
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor === undefined || valor === null || valor === '') continue;
    url.searchParams.set(clave, String(valor));
  }

  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  const jwt = token();
  if (jwt) cabeceras.Authorization = `Bearer ${jwt}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: senal,
    });
  } catch (fallo) {
    /* Una cancelación no es un fallo: se propaga tal cual para que quien la
       pidió la distinga y no dibuje un error por haber cambiado de pantalla. */
    if (fallo instanceof DOMException && fallo.name === 'AbortError') throw fallo;
    throw new ErrorDeApi('SIN_RESPUESTA', 'No se pudo contactar con el servidor', 0);
  }

  if (respuesta.status === 204) return undefined as T;

  const texto = await respuesta.text();
  const datos: unknown = texto ? intentarLeer(texto) : null;

  if (!respuesta.ok) throw errorDe(respuesta.status, datos);
  return datos as T;
}

function intentarLeer(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Traduce la respuesta de error a un `ErrorDeApi`.
 *
 * Si el cuerpo no trae `codigo` —un 502 del proxy, una página de error de
 * nginx— se deduce del estado. Lo que no se hace nunca es enseñar el cuerpo
 * crudo: puede traer una traza.
 */
function errorDe(estado: number, datos: unknown): ErrorDeApi {
  const cuerpo = (datos ?? {}) as Record<string, unknown>;
  const codigo = typeof cuerpo.codigo === 'string' ? (cuerpo.codigo as CodigoDeError) : porEstado(estado);
  const mensaje =
    typeof cuerpo.mensaje === 'string'
      ? cuerpo.mensaje
      : typeof cuerpo.detail === 'string'
        ? cuerpo.detail
        : 'No se pudo completar la operación';
  const incidencia = typeof cuerpo.incidencia === 'string' ? cuerpo.incidencia : undefined;
  const detalles = Array.isArray(cuerpo.detalles) ? (cuerpo.detalles as string[]) : undefined;
  return new ErrorDeApi(codigo, mensaje, estado, incidencia, detalles);
}

function porEstado(estado: number): CodigoDeError {
  if (estado === 401) return 'NO_AUTENTICADO';
  if (estado === 403) return 'SIN_PRIVILEGIO';
  if (estado === 404) return 'NO_ENCONTRADO';
  if (estado === 409) return 'CONFLICTO';
  if (estado === 422) return 'VALIDACION';
  return 'ERROR_INTERNO';
}

/** El sobre en que sale todo listado. Uno solo, para las 134 pantallas. */
export type RespuestaPaginada<T> = {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  hayMas: boolean;
};
