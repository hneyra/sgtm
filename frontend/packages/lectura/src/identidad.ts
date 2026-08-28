import type { ParametrosDe } from '@sgtm/api-client';
import { SIN_DATO, esObjeto, leerPaginado, texto } from './contrato';

/**
 * **Quien es**, leido del padron de personas y de una sola fila.
 *
 * Lo usan la ficha 360° del back-office (#297) y el portal del contribuyente
 * (#298): las dos preguntan a `GET /rentas/contribuyentes` y las dos necesitan
 * exactamente estos campos, asi que la lectura se escribe una vez.
 */
export interface Identidad {
  readonly codigo: string;
  readonly nombre: string;
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly activo: boolean;
  /**
   * Pensionista, adulto mayor o discapacidad, **tal como lo publica**
   * `ContribuyenteResource` (el nombre de la constante, sin traducir).
   *
   * Se muestra porque es lo que decide la deduccion del predial —las 50 UIT del
   * pensionista, NEG-05— y hay que verlo antes de explicar una cifra, no
   * despues.
   *
   * Sin rotulo inventado: el catalogo no publica uno para esta condicion, y
   * traducir `ADULTO_MAYOR` a una frase propia seria redactar en lenguaje del
   * dominio por cuenta de la interfaz (RNF-080).
   */
  readonly condicionEspecial?: string;
}

/**
 * La fila del padron **cuyo codigo coincide**, no la primera.
 *
 * No porque el backend resuelva por prefijo —no lo hace:
 * `ContribuyenteRepositoryJdbc` compara `codigo_contribuyente = :codigo` con el
 * criterio en mayusculas, que es igualdad exacta—, sino porque lo que llega es
 * un **listado** y quien lo sirve puede traer mas de una fila: el proxy de datos
 * no filtra y devuelve el padron entero, y un filtro que un dia se relaje aqui
 * no se nota. Tomar la primera de un listado es dar por buena la fila que venga.
 *
 * La comparacion no distingue mayusculas, por lo mismo que el backend las sube:
 * `00000025673a` y `00000025673A` son el mismo contribuyente para quien
 * responde, y aqui no pueden dejar de serlo.
 *
 * Devuelve `null` cuando ninguna coincide: eso es «ese codigo no esta en el
 * padron», que no es lo mismo que un fallo de lectura y no se dice igual.
 */
export function identidadPorCodigo(cuerpo: unknown, codigo: string): Identidad | null {
  const buscado = codigo.toUpperCase();
  return (
    primeraQueCumpla(
      cuerpo,
      (persona) =>
        typeof persona['codigo'] === 'string' && persona['codigo'].toUpperCase() === buscado,
    ) ?? null
  );
}

/**
 * Con que se pregunto al padron, y en que campo del recurso se comprueba.
 *
 * `ContribuyenteResource` publica **`numeroDocumento`**, no `dNI` ni `rUC`: esos
 * dos son nombres de **filtro** y el recurso los devuelve juntos en un solo
 * campo con su `tipoDocumento` al lado.
 *
 * **Sale del contrato, no de aqui.** Escrito como tres literales sueltos, esto
 * decia por su cuenta como se llaman los filtros de `GET /rentas/contribuyentes`
 * y podia quedarse diciendolo cuando el contrato dejara de llamarlos asi: la
 * peticion saldria con un parametro que el backend ya no declara —que no viaja,
 * porque `solicitar` solo manda lo que se le da— y el padron contestaria **el
 * padron entero**, del que este modulo se quedaria con la fila que coincidiera.
 * Atado con `Extract`, el nombre renombrado en `sgtm-v1.yaml` no compila.
 */
export type ClaveDelPadron = Extract<
  keyof ParametrosDe<'contribuyentes'>,
  'codigo' | 'dNI' | 'rUC'
>;

/**
 * La guarda de vuelta: **los tres siguen publicados**.
 *
 * `Extract` se queda con lo que exista en las dos partes, asi que por si solo
 * degrada en silencio —si el contrato dejara de publicar `rUC`, `ClaveDelPadron`
 * pasaria a ser dos claves y todo seguiria compilando, con la caja del RUC
 * mandando un filtro que nadie lee—. Esta constante obliga a la comparacion en
 * la otra direccion: es `true` mientras los tres esten, y no compila en cuanto
 * falte uno.
 */
export const LOS_TRES_FILTROS_DEL_PADRON: 'codigo' | 'dNI' | 'rUC' extends ClaveDelPadron
  ? true
  : never = true;

const CAMPO_DE: Readonly<Record<ClaveDelPadron, string>> = {
  codigo: 'codigo',
  dNI: 'numeroDocumento',
  rUC: 'numeroDocumento',
};

/**
 * Las filas del padron que **de verdad** coinciden con lo que se pregunto.
 *
 * Es la lectura del portal (#298), y comprueba la coincidencia aqui por el mismo
 * motivo que {@link identidadPorCodigo}: **lo que llega es un listado y quien lo
 * sirve puede traer mas de una fila**. El proxy de datos no filtra y devuelve el
 * padron entero (ADR-0010), asi que sin esta comprobacion el portal le ensenaria
 * a quien teclea su DNI la deuda de la primera persona del padron. No es una
 * concesion al proxy: un filtro del backend que un dia se relaje produce
 * exactamente el mismo destrozo, y aqui no se nota.
 *
 * No se mira el `tipoDocumento`, y es deliberado: un DNI son ocho digitos y un
 * RUC once, asi que el numero ya los separa, y comparar ademas un nombre de tipo
 * cuya forma exacta publica el backend —«DNI», «02 — DNI»— convertiria una
 * diferencia de rotulo en «esa persona no existe».
 *
 * Devuelve **todas** las coincidentes y no la primera: ninguna, una y varias son
 * tres respuestas distintas, y quien llama las dice de tres maneras.
 */
export function identidadesQueCoinciden(
  cuerpo: unknown,
  clave: ClaveDelPadron,
  valor: string,
): readonly Identidad[] {
  const campo = CAMPO_DE[clave];
  const buscado = valor.trim().toUpperCase();
  if (buscado === '') return [];
  const pagina = leerPaginado(cuerpo, 'los contribuyentes');
  return pagina.contenido
    .filter(esObjeto)
    .filter((fila) => typeof fila[campo] === 'string' && fila[campo].toUpperCase() === buscado)
    .map(identidadDe);
}

function primeraQueCumpla(
  cuerpo: unknown,
  cumple: (persona: Readonly<Record<string, unknown>>) => boolean,
): Identidad | undefined {
  const pagina = leerPaginado(cuerpo, 'los contribuyentes');
  const fila = pagina.contenido.filter(esObjeto).find(cumple);
  return fila === undefined ? undefined : identidadDe(fila);
}

/** Los campos de `ContribuyenteResource`, tal como llegan. */
function identidadDe(fila: Readonly<Record<string, unknown>>): Identidad {
  const condicion = fila['condicionEspecial'];
  return {
    codigo: texto(fila['codigo']),
    nombre: texto(fila['nombreRazonSocial']),
    tipoDocumento: typeof fila['tipoDocumento'] === 'string' ? fila['tipoDocumento'] : '',
    numeroDocumento: typeof fila['numeroDocumento'] === 'string' ? fila['numeroDocumento'] : '',
    activo: fila['activo'] !== false,
    // Tal cual llega, sin traducirla: los rotulos de esta condicion los escribe
    // quien la publica. Ver {@link Identidad}.
    ...(typeof condicion === 'string' && condicion !== '' ? { condicionEspecial: condicion } : {}),
  };
}

/** «DNI 03593174», o el guion. Como se escribe un documento en las dos aplicaciones. */
export function documentoDe(identidad: Identidad | undefined): string {
  if (identidad === undefined) return SIN_DATO;
  const escrito = `${identidad.tipoDocumento} ${identidad.numeroDocumento}`.trim();
  return escrito === '' ? SIN_DATO : escrito;
}
