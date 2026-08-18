import type { Fecha } from '@sgtm/dominio';
import { nuevaClaveDeIdempotencia, solicitar } from './cliente';

/**
 * El contrato de datos de una pantalla.
 *
 * Las 134 operaciones del contrato ([`sgtm-v1.yaml`](../../../../docs/50-api/openapi/sgtm-v1.yaml))
 * comparten forma de respuesta porque las 134 pantallas comparten renderizador:
 * un panel de indicadores, una tabla, unos totales, un formulario relleno o una
 * hoja de reporte. Esta es esa forma.
 *
 * **La estructura no viaja por aqui.** Que campos tiene una ficha catastral y
 * en que orden lo sabe la interfaz sin preguntar —es su catalogo, portado del
 * prototipo—. Lo que pide por HTTP es el **valor**: que dice cada campo, que
 * filas trae la tabla, a cuanto asciende cada total. Esa frontera es la que
 * permite apagar el proxy de datos y apuntar al backend sin tocar la interfaz.
 */
export interface DatosDePantalla {
  /**
   * Fecha a la que estan actualizadas las cifras de esta respuesta.
   *
   * Obligatoria, y por eso va primero: no existe «la deuda», existe la deuda a
   * una fecha (regla 9 de CLAUDE.md, RNF-075). Una respuesta sin ella no se
   * puede mostrar honestamente.
   */
  readonly fechaCalculo: Fecha;

  /** Valor de cada campo declarado por el catalogo, por su clave. */
  readonly campos?: Readonly<Record<string, ValorDeCampo>>;

  readonly kpis?: readonly Kpi[];
  readonly paneles?: readonly Panel[];
  readonly tabla?: DatosDeTabla;
  readonly totales?: readonly Total[];
  readonly reporte?: DatosDeReporte;
}

/** Texto en casi todo; booleano en las casillas. */
export type ValorDeCampo = string | boolean;

export interface Kpi {
  readonly label: string;
  /** Ya formateado por el backend: la interfaz no compone cifras (RNF-080). */
  readonly value: string;
  readonly note: string;
}

export interface Panel {
  readonly title: string;
  readonly note: string;
  readonly rows: readonly FilaDePanel[];
}

export interface FilaDePanel {
  readonly label: string;
  readonly sub: string;
  readonly value: string;
  /** Avance en porcentaje, 0-100. Lo calcula el backend, no la barra. */
  readonly pct: number;
}

export interface DatosDeTabla {
  readonly filas: readonly (readonly Celda[])[];
  /** Texto del conteo tal como lo redacta el backend: «3 vías registradas». */
  readonly conteo?: string;
}

/** Una celda es texto; si trae `tono`, se pinta como insignia de estado. */
export interface Celda {
  readonly texto: string;
  readonly tono?: TonoDeCelda;
}

export type TonoDeCelda = 'ok' | 'warn' | 'bad';

export interface Total {
  readonly label: string;
  readonly value: string;
}

export interface DatosDeReporte {
  readonly code: string;
  readonly date: string;
  readonly meta: readonly { readonly k: string; readonly v: string }[];
  readonly filas: readonly (readonly string[])[];
  readonly footer: string;
}

/**
 * Valor con el que se resuelve un parametro de ruta mientras la opcion no esta
 * conectada a un registro real.
 *
 * `GET /api/v1/rentas/vehiculos/{placa}` tiene que ser una URL para poder
 * pedirse, y hoy ninguna pantalla llega con una placa en la mano: el catalogo
 * describe la operacion, no un caso concreto. Conectar cada opcion a su
 * registro —la placa que el usuario busco, la ficha que abrio— es justamente el
 * trabajo del paso 4 de FRO-03 §7, y se hace opcion por opcion.
 */
const PARAMETRO_SIN_RESOLVER = 'ejemplo';

/**
 * Pide los datos de una pantalla a la operacion que declara su catalogo.
 *
 * `endpoint` es la cadena del contrato: `"GET /api/v1/catastro/fichas?anio=2026"`.
 * Se parte en verbo, camino y parametros, y se pide por el mismo cliente que
 * usara la interfaz cuando el backend responda de verdad.
 */
export function pedirDatosDePantalla(
  endpoint: string,
  senal?: AbortSignal,
): Promise<DatosDePantalla> {
  const [verbo = 'GET', completa = ''] = endpoint.split(/\s+/);
  const [camino = '', consulta = ''] = completa.split('?');

  const ruta = camino.replace(/^\/api\/v1/, '').replace(/\{\w+\}/g, PARAMETRO_SIN_RESOLVER);

  const parametros: Record<string, string> = {};
  for (const par of consulta.split('&').filter(Boolean)) {
    const [nombre = '', valor = ''] = par.split('=');
    if (nombre) parametros[nombre] = valor.replace(/[{}]/g, '');
  }

  const metodo = verbo.toUpperCase();
  return solicitar<DatosDePantalla>(ruta, {
    metodo:
      metodo === 'GET' || metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH'
        ? metodo
        : 'GET',
    consulta: parametros,
    // Una escritura desde una pantalla del catalogo todavia no manda cuerpo:
    // los formularios se conectan uno a uno (FRO-03 §7).
    ...(metodo === 'GET' ? {} : { cuerpo: {}, claveDeIdempotencia: nuevaClaveDeIdempotencia() }),
    senal,
  });
}
