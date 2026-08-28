import type { DatosDePantalla, IdDeOperacion, ParametrosDe, RespuestaDe } from '@sgtm/api-client';
import { pedirOperacion } from '@sgtm/api-client';
import { CONEXIONES_DE_CATASTRO } from './catastro';
import { CONEXIONES_DE_CONSULTAS } from './consultas';
import { CONEXIONES_DE_RENTAS } from './rentas';
import { CONEXIONES_DE_VALORES } from './valores';
import { conexionDeRecaudacion } from './inicio/recaudacion';
import { CONEXIONES_DE_SEGURIDAD } from './seguridad';

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
  /**
   * El ejercicio de trabajo de la sesion, no el de la pantalla.
   *
   * Va aqui porque hay operaciones que lo exigen: la bitacora esta particionada
   * por ejercicio y su controlador lo pide obligatorio (#13). No es un filtro
   * que el usuario elija en esta pantalla; es el ano sobre el que trabaja la
   * sesion entera, y se ve en la cabecera.
   */
  readonly ejercicio: number;
  /**
   * Lo escrito en el formulario de la pantalla, **por su clave del catalogo**,
   * todavia sin enviar.
   *
   * Existe por un caso, y se entiende mejor con el delante: en «Baja de deuda»
   * la fecha con efecto tributario del acto es la de su resolucion, y el backend
   * valida la baja contra `deudaActualizadaA(fechaValor)`. Con la tabla leida a
   * la fecha de hoy —que es lo que hacia—, una resolucion anterior manda un
   * interes mayor que el que el backend calcula a esa fecha, y la baja vuelve
   * como 422 **despues** de confirmar un acto irreversible. La lectura tiene que
   * ir a la misma fecha que el acto, y esa fecha vive en el borrador.
   *
   * Es tambien la regla 9 de punta a punta: lo que se ve y lo que se manda son
   * de la misma fecha, y la que se pinta encima de la tabla sigue siendo la que
   * el backend devolvio con esas cifras.
   */
  readonly borrador: Readonly<Record<string, string>>;
}

/**
 * Un filtro **sin el cual la operacion no se puede pedir**, y que decir mientras
 * falte.
 *
 * `GET /consultas/deuda` declara `codContribuyente` como `@RequestParam`
 * obligatorio: abrir «Baja de deuda» sin haber buscado a nadie es un 400 contra
 * el backend real —el proxy lo tapa, porque contesta igual con filtro o sin el—.
 * Un 400 ahi no le dice nada a quien atiende; lo que hay que decirle es que
 * busque un contribuyente, que es lo que iba a hacer de todos modos.
 *
 * No es lo mismo que el registro que falta (`registroQueFalta`): aquel es el que
 * **abre** la pantalla y va en la direccion; este es un filtro de la busqueda. El
 * efecto sobre la peticion si es el mismo —sin el, no sale—, y por eso comparten
 * el estado «sin-registro» de la pantalla.
 */
export interface FiltroExigido {
  /** El parametro de consulta, tal como lo declara el contrato. */
  readonly parametro: string;
  readonly titulo: string;
  readonly detalle: string;
}

/**
 * Que decir cuando la lectura de esta pantalla responde 403.
 *
 * Existe porque hay opciones cuya lectura **no es la suya**: «Baja de deuda»
 * escribe con su permiso y lee la deuda por `consulta_deuda`, que es otra opcion
 * del catalogo con otro permiso. Quien tenga una y no la otra recibe el 403 de
 * la segunda, y el aviso generico —«no tienes permiso para esta opción»— le
 * miente: si tiene permiso para esta, lo que le falta es el de la que alimenta
 * su tabla. Sin declararlo, el sintoma es una pantalla que dice que no y un
 * administrador dando el permiso equivocado.
 */
export interface AvisoDeSinPermiso {
  readonly titulo: string;
  readonly detalle: string;
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
  /** Ver {@link AvisoDeSinPermiso}. Sin esto, el aviso generico de la pantalla. */
  readonly sinPermiso?: AvisoDeSinPermiso;
  /** Ver {@link FiltroExigido}. Sin uno de estos, la lectura no se dispara. */
  readonly exige?: readonly FiltroExigido[];
}

export interface DefinicionDeConexion<O extends IdDeOperacion, R> {
  readonly operacion: O;
  readonly parametros: (contexto: ContextoDePantalla) => ParametrosDe<O>;
  readonly leer: (cuerpo: RespuestaDe<O>, parametros: ParametrosDe<O>) => R;
  readonly adaptar: (recurso: R) => DatosDePantalla;
  readonly sinPermiso?: AvisoDeSinPermiso;
  readonly exige?: readonly FiltroExigido[];
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
    ...(definicion.sinPermiso === undefined ? {} : { sinPermiso: definicion.sinPermiso }),
    ...(definicion.exige === undefined ? {} : { exige: definicion.exige }),
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
  ...CONEXIONES_DE_SEGURIDAD,
  ...CONEXIONES_DE_CATASTRO,
  ...CONEXIONES_DE_CONSULTAS,
  ...CONEXIONES_DE_RENTAS,
  ...CONEXIONES_DE_VALORES,
};

export const conexionDe = (opcion: string): Conexion | undefined => CONEXIONES[opcion];

/** Cuantas opciones estan conectadas. La prueba de convivencia lo mira. */
export const OPCIONES_CONECTADAS = Object.keys(CONEXIONES);
