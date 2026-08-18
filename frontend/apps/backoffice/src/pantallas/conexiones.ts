import type { DatosDePantalla, IdDeOperacion, ParametrosDe, RespuestaDe } from '@sgtm/api-client';
import { pedirOperacion } from '@sgtm/api-client';
import { conexionDeRecaudacion } from './inicio/recaudacion';

/**
 * La puerta lateral: una opcion con operacion tipada y adaptador propios.
 *
 * Las 134 pantallas piden hoy la misma forma —`DatosDePantalla`, con campos,
 * tabla, totales, indicadores y reporte opcionales—. Fue la decision correcta
 * para dibujarlas todas contra el proxy, pero no sobrevive al backend real: una
 * ficha catastral versionada, un cobro de caja y un padron paginado no son la
 * misma respuesta, y forzarlos a serlo obligaria al backend a aplanar su
 * dominio para caber en el renderizador.
 *
 * Esto **no tira el renderizador**. Abre una puerta al lado: una opcion puede
 * declarar su operacion y su adaptador cuando su respuesta ya no cabe, y las
 * otras 133 no se enteran. Mientras no lo haga, sigue por `useDatosDePantalla`.
 *
 * Las tres piezas de una conexion, y por que estan separadas:
 *
 *   parametros  de donde salen los valores de la peticion (ruta y consulta)
 *   leer        la frontera: valida el cuerpo que el contrato todavia no
 *               describe y lo convierte en el recurso del dominio
 *   adaptar     traduce el recurso a lo que dibujan los bloques. **Puro**
 *
 * `leer` es lo unico que cambia el dia que el backend sirva su recurso de
 * verdad: el adaptador ya trabaja sobre el dominio, no sobre el transporte.
 */

/** De donde salen los parametros de una peticion: la ruta y la consulta de la URL. */
export interface ContextoDePantalla {
  readonly ruta: Readonly<Record<string, string | undefined>>;
  readonly busqueda: URLSearchParams;
}

/** Una conexion ya montada, sin los tipos de su operacion: es lo que guarda el registro. */
export interface Conexion {
  readonly operacion: IdDeOperacion;
  /** Los parametros de la peticion. Entran en la clave de cache, no solo en la URL. */
  readonly parametros: (contexto: ContextoDePantalla) => Readonly<Record<string, string>>;
  readonly cargar: (
    parametros: Readonly<Record<string, string>>,
    senal?: AbortSignal,
  ) => Promise<DatosDePantalla>;
}

export interface DefinicionDeConexion<O extends IdDeOperacion, R> {
  readonly operacion: O;
  readonly parametros: (contexto: ContextoDePantalla) => ParametrosDe<O>;
  readonly leer: (cuerpo: RespuestaDe<O>, parametros: ParametrosDe<O>) => R;
  readonly adaptar: (recurso: R) => DatosDePantalla;
}

/**
 * Ata las tres piezas y borra los tipos hacia afuera.
 *
 * Dentro esta todo tipado contra el contrato —`ParametrosDe<O>`, `RespuestaDe<O>`—
 * y hacia afuera queda una `Conexion` uniforme, que es lo que el registro puede
 * guardar. Las conversiones viven aqui y solo aqui.
 */
export function definirConexion<O extends IdDeOperacion, R>(
  definicion: DefinicionDeConexion<O, R>,
): Conexion {
  return {
    operacion: definicion.operacion,
    parametros: (contexto) => sinVacios(definicion.parametros(contexto)),
    cargar: async (parametros, senal) => {
      const tipados = parametros as ParametrosDe<O>;
      const cuerpo = await pedirOperacion(definicion.operacion, tipados, senal);
      return definicion.adaptar(definicion.leer(cuerpo, tipados));
    },
  };
}

/**
 * Un parametro sin valor no entra en la clave de cache ni en la URL.
 *
 * Si entrara, `{ ejercicio: undefined }` y `{}` serian dos claves distintas para
 * la misma peticion, y la cache guardaria dos veces la misma respuesta.
 */
function sinVacios(parametros: object): Readonly<Record<string, string>> {
  const limpios: Record<string, string> = {};
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (typeof valor === 'string' && valor !== '') limpios[nombre] = valor;
  }
  return limpios;
}

/**
 * Las opciones conectadas, por su identificador del catalogo.
 *
 * Empieza con una. Crece opcion por opcion, cuando la operacion de cada una
 * exista de verdad en el backend (FRO-03 §7, paso 4).
 */
const CONEXIONES: Readonly<Record<string, Conexion>> = {
  inicio: conexionDeRecaudacion,
};

export const conexionDe = (opcion: string): Conexion | undefined => CONEXIONES[opcion];

/** Cuantas opciones estan conectadas. La prueba de convivencia lo mira. */
export const OPCIONES_CONECTADAS = Object.keys(CONEXIONES);
