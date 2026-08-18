/**
 * Cliente HTTP del SGTM.
 *
 * Hace cumplir por construccion tres reglas del proyecto:
 *
 * 1. **Ninguna firma acepta `municipalidadId`.** El backend lo toma del claim
 *    `municipalidad_id` del token validado (regla 2 de CLAUDE.md, ARQ-03 §3.1).
 *    Si apareciera en un parametro, seria un defecto del contrato, no del
 *    frontend. La regla de ESLint de FRO-04 §4 lo impide ademas en todo el
 *    codigo del cliente.
 * 2. **El token vive en memoria**, nunca en `localStorage` ni `sessionStorage`
 *    (FRO-01 §5). Recargar la pagina vuelve a autenticar; es el precio, y es
 *    barato al lado de un token robado por un XSS.
 * 3. **Toda mutacion que asienta deuda o registra un pago lleva
 *    `Idempotency-Key` y no se reintenta sola** (FRO-04 §5). Un reintento
 *    automatico de un cobro es un cobro doble.
 *
 * Las operaciones concretas (las 134 del contrato) no viven aqui: cada una
 * llega con su pantalla, tipada desde `docs/50-api/openapi/sgtm-v1.yaml`.
 */

/** Camino base. En desarrollo Vite lo reenvia al backend; en produccion es el mismo origen. */
const BASE = import.meta.env['VITE_SGTM_API'] ?? '/api/v1';

let tokenEnMemoria: string | null = null;

/**
 * Fija o borra el token de la sesion.
 *
 * Al cambiar de municipalidad activa hay que emitir un token nuevo **y vaciar
 * toda la cache** (FRO-01 §4): mostrar datos de la municipalidad anterior es
 * una fuga percibida por el usuario aunque el backend este correcto.
 */
export function guardarToken(token: string | null): void {
  tokenEnMemoria = token;
}

export function hayToken(): boolean {
  return tokenEnMemoria !== null;
}

/** Error de negocio del backend, en formato RFC 9457 (Problem Details). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  traza?: string;
  errores?: { campo: string; mensaje: string }[];
}

export class ProblemaDeApi extends Error {
  readonly problema: ProblemDetails;

  constructor(problema: ProblemDetails) {
    // El backend ya redacta el mensaje en lenguaje del dominio y en castellano
    // (RNF-080): no se reescribe aqui ni se reemplaza por un texto generico.
    super(problema.detail || problema.title);
    this.name = 'ProblemaDeApi';
    this.problema = problema;
  }

  get titulo(): string {
    return this.problema.title;
  }

  get detalle(): string {
    return this.problema.detail;
  }

  get traza(): string | undefined {
    return this.problema.traza;
  }

  get errores(): { campo: string; mensaje: string }[] {
    return this.problema.errores ?? [];
  }
}

export interface OpcionesDeSolicitud {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  cuerpo?: unknown;
  consulta?: Record<string, string | number | undefined>;
  /**
   * Clave de idempotencia. Obligatoria en toda mutacion que asienta deuda,
   * registra un pago o emite un valor (FRO-04 §5).
   */
  claveDeIdempotencia?: string;
  senal?: AbortSignal;
}

export async function solicitar<T>(ruta: string, opciones: OpcionesDeSolicitud = {}): Promise<T> {
  const url = new URL(`${BASE}${ruta}`, window.location.origin);
  for (const [clave, valor] of Object.entries(opciones.consulta ?? {})) {
    if (valor !== undefined && valor !== '') url.searchParams.set(clave, String(valor));
  }

  const cabeceras: Record<string, string> = { accept: 'application/json' };
  if (tokenEnMemoria) cabeceras['authorization'] = `Bearer ${tokenEnMemoria}`;
  if (opciones.cuerpo !== undefined) cabeceras['content-type'] = 'application/json';
  if (opciones.claveDeIdempotencia) cabeceras['idempotency-key'] = opciones.claveDeIdempotencia;

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: opciones.metodo ?? 'GET',
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      signal: opciones.senal,
    });
  } catch (fallo) {
    // Cancelar no es fallar: si la pantalla se cerro, la consulta se descarta.
    if (fallo instanceof Error && fallo.name === 'AbortError') throw fallo;

    // Sin red, `fetch` rechaza con un error del navegador que no dice nada al
    // usuario. Se convierte aqui en un problema del mismo formato que los del
    // backend para que la pantalla lo cuente igual que los demas, en vez de
    // quedarse cargando para siempre (FRO-01 §7).
    throw new ProblemaDeApi({
      type: 'https://sgtm.gob.pe/problemas/sin-conexion',
      title: 'No se pudo contactar con el servidor',
      status: 0,
      detail:
        'Revisa la conexion de la municipalidad y vuelve a intentarlo. Si la red esta bien, puede que el servicio este detenido.',
    });
  }

  if (!respuesta.ok) {
    const problema = (await respuesta.json().catch(() => null)) as ProblemDetails | null;
    throw new ProblemaDeApi(
      problema ?? {
        type: 'about:blank',
        title: 'No se pudo completar la operacion',
        status: respuesta.status,
        detail:
          'Ocurrio un error inesperado. Si vuelve a pasar, comparte el identificador de traza con soporte.',
      },
    );
  }

  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/** Clave nueva por intento del usuario, estable mientras dure ese intento. */
export function nuevaClaveDeIdempotencia(): string {
  return crypto.randomUUID();
}
