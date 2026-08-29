import type { DatosDePantalla, ProblemDetails } from '@sgtm/api-client';
import { RESPUESTAS, RUTAS } from './respuestas.generado';
import { archivoDe, escrituraDe, listaDe, paginadoDe, recursoDe } from './recursos';
import { YA_SERVIDAS, laSirveElBackend } from './servidas';
import { conLoSimulado } from './simulados';
import type { OperacionServida } from './servidas';

/**
 * Proxy de datos: la API del SGTM, simulada en el navegador.
 *
 * **Por que existe.** Cuando se escribio, el backend no servia ninguna de las
 * 134 operaciones que el catalogo declara —una por pantalla—, y la interfaz no
 * podia esperar. Hoy publica 171 de las 174 del contrato, y lo que queda es
 * apagar esto: es #400.
 *
 * La salida facil habria sido que cada pantalla leyera sus datos de una
 * constante importada; la trampa de esa salida es que el dia que el backend
 * existiera habria que reescribir las 134 pantallas para que pidan por HTTP.
 *
 * Este proxy evita eso interceptando **en la frontera del transporte**, no en
 * la de la aplicacion: sustituye `fetch`. La aplicacion llama a `solicitar()`
 * de `@sgtm/api-client` con la ruta real del contrato —`GET
 * /api/v1/catastro/fichas`— y recibe un `Response` con JSON, cabeceras y
 * codigo de estado de verdad. Todo el camino se ejerce: la URL se compone, los
 * parametros de consulta viajan, el token se adjunta, el error se convierte en
 * `ProblemaDeApi`.
 *
 * **Como se apaga.** `VITE_SGTM_PROXY_DE_DATOS=false`, o simplemente no
 * llamando a `instalarProxyDeDatos()`. Entonces `fetch` va a `/api/v1`, Vite lo
 * reenvia al Spring Boot de `SGTM_API` y la interfaz no se entera.
 *
 * **Y se apaga tambien operacion por operacion**, que es como se va a integrar
 * de verdad: `servidas.ts` lista las rutas que el backend ya sirve, y esas el
 * proxy las deja pasar. El backend llega contexto por contexto; sin este modo
 * intermedio, la integracion seria un unico salto de 134 operaciones que nadie
 * puede probar.
 *
 * **Lo que deliberadamente NO simula.** No filtra, no ordena, no pagina, no
 * valida y no persiste lo que se envia. Un proxy que fingiera la semantica de
 * `?uso=Comercio` estaria inventando un comportamiento que el backend aun no ha
 * decidido, y la interfaz se acabaria construyendo contra esa invencion. Filtrar
 * es del servidor: aqui la peticion se hace de verdad y la respuesta es siempre
 * el juego de datos del prototipo. Lo mismo con las escrituras: un `POST`
 * responde 201 con los datos de la pantalla, sin guardar nada.
 */

/** Camino base del contrato. Debe coincidir con el de `@sgtm/api-client`. */
const BASE = '/api/v1';

/** Latencia simulada, para que los estados de carga se vean en desarrollo. */
const LATENCIA_MINIMA_MS = 120;
const LATENCIA_MAXIMA_MS = 320;

interface RutaCompilada {
  readonly metodo: string;
  readonly patron: RegExp;
  readonly pantalla: string;
}

/** `/api/v1/rentas/vehiculos/{placa}` → `^/api/v1/rentas/vehiculos/[^/]+$`. */
function compilar(ruta: string): RegExp {
  const escapado = ruta
    .split(/(\{\w+\})/)
    .map((trozo) =>
      /^\{\w+\}$/.test(trozo) ? '[^/]+' : trozo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${escapado}$`);
}

const TABLA: readonly RutaCompilada[] = RUTAS.map((r) => ({
  metodo: r.metodo.toUpperCase(),
  patron: compilar(r.ruta),
  pantalla: r.pantalla,
}));

function pantallaDe(metodo: string, camino: string): string | null {
  const buscado = metodo.toUpperCase();
  return TABLA.find((r) => r.metodo === buscado && r.patron.test(camino))?.pantalla ?? null;
}

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/** El cuerpo JSON de una peticion, si lo trae. Nada mas: el proxy no persiste. */
function cuerpoDe(opciones?: RequestInit): unknown {
  if (typeof opciones?.body !== 'string') return undefined;
  try {
    return JSON.parse(opciones.body);
  } catch {
    return undefined;
  }
}

function json(cuerpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': estado === 404 ? 'application/problem+json' : 'application/json' },
  });
}

/** La ruta esta en la lista de servidas y el backend dice que no la conoce. */
function noLaSirve(metodo: string, camino: string, estado: number): Response {
  const problema: ProblemDetails = {
    type: 'https://sgtm.gob.pe/problemas/operacion-declarada-y-no-servida',
    title: 'La operacion esta declarada como servida y el backend no la sirve',
    status: 502,
    detail: `«${metodo} ${camino}» esta en la lista de operaciones que el backend ya sirve, y el backend respondio ${estado}. Quita la ruta de «packages/api-mock/src/servidas.ts» o implementa la operacion: caer al proxy en silencio esconderia el desajuste.`,
  };
  return json(problema, 502);
}

function noEncontrada(metodo: string, camino: string): Response {
  const problema: ProblemDetails = {
    type: 'https://sgtm.gob.pe/problemas/operacion-no-implementada',
    title: 'La operacion no existe en el proxy de datos',
    status: 404,
    detail: `El proxy de datos no conoce ${metodo} ${camino}. Las 134 operaciones que simula se declaran en el catalogo del prototipo; si esta es nueva, regenera el catalogo con «yarn portar-catalogo».`,
  };
  return json(problema, 404);
}

/** Datos de una pantalla por su identificador, sin pasar por HTTP. Para pruebas. */
export function datosDe(pantalla: string): DatosDePantalla | undefined {
  return RESPUESTAS[pantalla];
}

/** Cuantas operaciones responde el proxy. Son las del contrato. */
export const OPERACIONES_SIMULADAS = TABLA.length;

/** El `fetch` que habia antes de instalar. Se devuelve tal cual al desinstalar. */
let original: typeof fetch | null = null;
let latenciaActiva = true;

export interface OpcionesDelProxy {
  /**
   * Latencia simulada. Encendida en desarrollo, para que los estados de carga
   * se vean; apagada en las pruebas, donde 134 pantallas por 200 ms son
   * medio minuto de espera que no prueba nada.
   */
  readonly latencia?: boolean;
  /** Las que ya sirve el backend. Por omision, las de `servidas.ts`. */
  readonly yaServidas?: readonly OperacionServida[];
}

/**
 * Sustituye `fetch` por el proxy. Devuelve la funcion que lo desinstala.
 *
 * Solo intercepta lo que cuelga de `/api/v1`; cualquier otra peticion —una
 * fuente tipografica, un recurso— sigue su camino sin tocarse.
 */
export function instalarProxyDeDatos({
  latencia = true,
  yaServidas = YA_SERVIDAS,
}: OpcionesDelProxy = {}): () => void {
  latenciaActiva = latencia;
  if (original) return desinstalarProxyDeDatos;
  original = globalThis.fetch;
  // Para delegar hace falta ligarlo; para restaurar, no: devolver el envoltorio
  // ligado en vez de la funcion original dejaria una capa pegada en cada ciclo.
  const anterior = original.bind(globalThis);

  globalThis.fetch = async (
    entrada: RequestInfo | URL,
    opciones?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      globalThis.location?.origin ?? 'http://localhost',
    );
    if (!url.pathname.startsWith(BASE)) return anterior(entrada, opciones);

    const metodo = (
      opciones?.method ??
      (typeof entrada === 'object' && 'method' in entrada ? entrada.method : 'GET')
    ).toUpperCase();

    // Lo que el backend ya sirve, sale de verdad. Si contesta que no la conoce,
    // se dice en voz alta: caer al proxy en silencio esconderia justo lo que se
    // quiere ver —que la ruta de la lista y la del backend no cuadran—.
    if (laSirveElBackend(yaServidas, metodo, url.pathname)) {
      const respuesta = await anterior(entrada, opciones);
      return respuesta.status === 404 || respuesta.status === 501
        ? noLaSirve(metodo, url.pathname, respuesta.status)
        : respuesta;
    }

    if (latenciaActiva) {
      await esperar(LATENCIA_MINIMA_MS + Math.random() * (LATENCIA_MAXIMA_MS - LATENCIA_MINIMA_MS));
    }

    // El reporte de la ficha del contribuyente, cuando pide un archivo: no es
    // JSON, y sin esto un `?formato=PDF` recibiria la misma respuesta que sin
    // el (#71).
    const archivo = archivoDe(metodo, url.pathname, url.searchParams.get('formato'));
    if (archivo) {
      return new Response(archivo.cuerpo, {
        status: 200,
        headers: {
          'content-type': archivo.tipoDeMedio,
          'content-disposition': `attachment; filename="${archivo.nombreDeArchivo}"`,
        },
      });
    }

    // Las operaciones que el backend ya sirve salen con **su** forma, no con
    // la que comparten las 134: para esas la pantalla ya habla su idioma (ver
    // `recursos.ts`) — sobre paginado, recurso suelto o arreglo, segun lo que
    // publique cada una.
    const paginado = paginadoDe(metodo, url.pathname);
    if (paginado) return json(paginado, 200);

    // Y las que no son listados —una ficha catastral es un recurso, no una
    // pagina— salen sueltas, con su version y su historico.
    const recurso = recursoDe(metodo, url.pathname);
    if (recurso) return json(recurso, 200);

    // Ni sobre paginado ni recurso suelto: un arreglo tal cual, como lo
    // publican las tablas de valuacion (#17).
    const lista = listaDe(metodo, url.pathname);
    if (lista) return json(lista, 200);

    // Y las dos escrituras de sesion devuelven el recurso que devuelve el
    // backend, no los datos de la pantalla: la cabecera adopta el ejercicio que
    // responde el servidor, asi que la respuesta tiene que traerlo.
    const escrita = escrituraDe(metodo, url.pathname, cuerpoDe(opciones));
    if (escrita) return json(escrita, 200);

    const pantalla = pantallaDe(metodo, url.pathname);
    if (!pantalla) return noEncontrada(metodo, url.pathname);

    const datos = RESPUESTAS[pantalla];
    if (!datos) return noEncontrada(metodo, url.pathname);

    // Una escritura responde 201 y no guarda nada: simular persistencia sin
    // reglas de negocio produciria un sistema que acepta lo que el backend
    // rechazara.
    //
    // Lo que el proxy simula se anade **aqui**, al servir, y no dentro de
    // `respuestas.generado.ts`: lo generado es el prototipo tal cual —cada
    // valor sale de una figura del manual—, y una invencion escrita dentro del
    // generador seria indistinguible de una captura, ademas de irse en el
    // siguiente `yarn portar-catalogo`. Al ponerla en el camino de salida se ve
    // quien la anade y de donde sale (`simulados.ts`).
    return json(conLoSimulado(pantalla, datos), metodo === 'GET' ? 200 : 201);
  };

  return desinstalarProxyDeDatos;
}

export function desinstalarProxyDeDatos(): void {
  if (!original) return;
  globalThis.fetch = original;
  original = null;
}

export function proxyDeDatosInstalado(): boolean {
  return original !== null;
}
