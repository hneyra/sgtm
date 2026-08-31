import { SIN_DATO, esObjeto, leerPaginado, texto } from './contrato';

/**
 * **Quien es**, leido del padron de personas y de una sola fila.
 *
 * La lee la ficha 360° del back-office (#297), que pregunta a
 * `GET /rentas/contribuyentes` y necesita exactamente estos campos.
 *
 * El portal ya no: desde ADR-0020 el ciudadano no teclea ningun documento y su
 * situacion la compone el servidor (ver `situacion.ts`). Este archivo se quedo
 * con lo que usa ventanilla.
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
 * ── Lo que aqui habia y ya no ──────────────────────────────────────────────
 *
 * `ClaveDelPadron`, `LOS_TRES_FILTROS_DEL_PADRON` e `identidadesQueCoinciden`
 * vivian aqui y se han retirado con la caja de documento del portal (#57,
 * ADR-0020). Los tres existian **solo** para ella: el ciudadano elegia DNI, RUC
 * o codigo, se preguntaba a `GET /rentas/contribuyentes` con ese filtro, y sobre
 * el listado que llegaba se comprobaba que la fila fuera la pedida.
 *
 * Con la sesion del ciudadano no hay documento que teclear ni listado del padron
 * que filtrar: el sujeto sale del token y el servidor compone la respuesta. La
 * desconfianza no se ha perdido —seria lo grave—: se mudo a
 * `esLaSituacionDe` en `situacion.ts`, que comprueba que la situacion que llego
 * sea la del documento de **este** token. Es la misma guarda sobre la unica fila
 * que queda.
 *
 * Lo que se queda aqui es lo que usa la ficha 360° del back-office:
 * {@link identidadPorCodigo} y {@link documentoDe}.
 */

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
