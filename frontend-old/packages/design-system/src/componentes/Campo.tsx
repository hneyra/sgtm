import { useId } from 'react';

/**
 * Un campo del formulario, en los seis tipos que declara el catalogo.
 *
 * Las reglas de render son las del handoff: `sel` es un `select` con sus
 * opciones, `area` un `textarea` de tres filas con `resize: vertical`, `chk`
 * una casilla con su texto dentro de una caja con borde, y `ro` un valor de
 * solo lectura con borde discontinuo y monoespaciada. `ancho` ocupa la fila
 * entera de la rejilla.
 *
 * Todo control lleva su etiqueta asociada por `id` (FRO-04 §7): la caja de
 * ventanilla se opera con teclado (RNF-082) y un control sin etiqueta no se
 * puede anunciar.
 */
export type TipoDeCampo = 'text' | 'date' | 'sel' | 'area' | 'chk' | 'ro';

export interface CampoProps {
  readonly etiqueta: string;
  readonly tipo: TipoDeCampo;
  readonly valor?: string;
  readonly marcado?: boolean;
  readonly ph?: string;
  readonly opciones?: readonly string[];
  readonly ancho?: boolean;
  readonly cargando?: boolean;
  /**
   * El control se ve, pero no se escribe.
   *
   * No es lo mismo que `ro`: un campo `ro` es un valor que el sistema calcula y
   * nunca se teclea, y este es un campo que **esta pantalla** todavia no puede
   * mandar —o no debe—. La pantalla de contrasena lo usa para sus tres campos
   * de clave, que el backend no acepta a proposito (#70).
   *
   * Donde el HTML lo permite se usa `readonly` y no `disabled`: un campo
   * deshabilitado sale del recorrido del tabulador, y en ventanilla se trabaja
   * con teclado (RNF-082).
   */
  readonly bloqueado?: boolean;
  /**
   * Mensaje del backend para **este** campo (`ProblemaDeApi.errores`).
   *
   * Va tal cual: el servidor ya lo redacto en castellano y en lenguaje del
   * dominio (RNF-080), y reescribirlo aqui produce dos versiones del mismo
   * mensaje que se separan a la primera correccion.
   */
  readonly error?: string;
  /**
   * Indicacion permanente bajo el control.
   *
   * No es un `placeholder`: el `placeholder` desaparece al escribir y, en un
   * `input[type=date]`, **el navegador ni siquiera lo pinta** —dibuja su propia
   * mascara `dd/mm/aaaa`—, asi que lo que se pusiera ahi no lo leia nadie. Va
   * enlazada con `aria-describedby`, igual que el error.
   */
  readonly ayuda?: string;
  /**
   * Este `sel` **exige una eleccion**: mientras no la haya, se antepone una
   * opcion vacia y es la que se ve.
   *
   * Es opt-in, y por omision no se antepone nada, porque las dos familias de
   * `sel` del catalogo quieren cosas opuestas. Un `sel` de **escritura** —el
   * tipo de una via, la condicion de un titular— sin la vacia se dibuja
   * mostrando la primera opcion y no manda nada: la pantalla ensena una
   * eleccion que nadie hizo y el 422 llega despues. Un `sel` de **busqueda**
   * trae «Todos»/«Todas» como primera opcion, y esa **es** su posicion de
   * partida: anteponerle una vacia deja 78 filtros del catalogo en blanco y
   * convierte «Todos» en un literal que viajaria como valor de filtro.
   *
   * Por eso lo declara quien sabe cual de las dos es: el formulario que
   * escribe. `Filtros` no lo pasa, y por eso sus desplegables se dibujan como
   * el prototipo los dibuja.
   */
  readonly eleccionObligatoria?: boolean;
  readonly onCambio?: (valor: string) => void;
}

/** Lo que se muestra en un campo de solo lectura que todavia no tiene valor. */
const SIN_VALOR = '—';

export function Campo({
  etiqueta,
  tipo,
  valor = '',
  marcado = false,
  ph,
  opciones,
  ancho = false,
  cargando = false,
  bloqueado = false,
  error,
  ayuda,
  eleccionObligatoria = false,
  onCambio,
}: CampoProps) {
  const id = useId();
  const idDelError = `${id}-error`;
  const idDeLaAyuda = `${id}-ayuda`;
  const clases = ['sgtm-campo'];
  if (ancho) clases.push('sgtm-campo--ancho');
  if (error !== undefined) clases.push('sgtm-campo--con-error');
  // El error primero: cuando hay los dos, lo que hay que corregir se lee antes
  // que lo que se explicaba.
  const describe =
    [error === undefined ? undefined : idDelError, ayuda === undefined ? undefined : idDeLaAyuda]
      .filter((identificador) => identificador !== undefined)
      .join(' ') || undefined;

  return (
    <div className={clases.join(' ')}>
      <label className="sgtm-campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {control()}
      {error !== undefined && (
        <p className="sgtm-campo__error" id={idDelError}>
          {error}
        </p>
      )}
      {ayuda !== undefined && (
        <p className="sgtm-campo__ayuda" id={idDeLaAyuda}>
          {ayuda}
        </p>
      )}
    </div>
  );

  function control() {
    if (tipo === 'sel') {
      // **Lo que sirvio la API manda sobre la lista del prototipo.** Las dos
      // vienen de sitios distintos —las opciones del catalogo portado, el valor
      // del backend— y no tienen por que coincidir: la clasificacion de una
      // tierra rural es `CULTIVO EN LIMPIO` en el dominio y «A1 — CULTIVO EN
      // LIMPIO» en el desplegable. Sin esto, un `select` con un valor que no
      // esta en su lista se dibuja mostrando la primera opcion, y entonces la
      // pantalla ensena una eleccion que nadie hizo.
      const declaradas = opciones ?? [];
      // **Un `select` de escritura sin valor no ensena una eleccion que nadie
      // hizo.** Un `<select value="">` cuyas opciones no incluyen la cadena
      // vacia se dibuja mostrando la primera —«AVENIDA»— y no manda nada: el
      // formulario dice una cosa y el cuerpo dice otra, y el 422 llega despues.
      // Con la opcion vacia delante, lo que se ve es lo que hay: nada elegido
      // todavia. Solo para quien lo pide (`eleccionObligatoria`): un filtro del
      // catalogo empieza en «Todos» a proposito —ver el javadoc de la prop—.
      const conVacia =
        eleccionObligatoria && !declaradas.includes('') ? ['', ...declaradas] : declaradas;
      const todas =
        valor === '' ? conVacia : declaradas.includes(valor) ? declaradas : [valor, ...declaradas];
      return (
        <select
          id={id}
          className="sgtm-campo__control"
          value={valor}
          disabled={cargando || bloqueado}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describe}
          onChange={(e) => onCambio?.(e.target.value)}
        >
          {todas.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      );
    }

    if (tipo === 'area') {
      return (
        <textarea
          id={id}
          className="sgtm-campo__control"
          rows={3}
          value={valor}
          placeholder={ph}
          readOnly={bloqueado}
          aria-readonly={bloqueado || undefined}
          disabled={cargando}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describe}
          onChange={(e) => onCambio?.(e.target.value)}
        />
      );
    }

    if (tipo === 'chk') {
      return (
        <span className="sgtm-campo__casilla">
          <input
            id={id}
            type="checkbox"
            checked={marcado}
            disabled={cargando || bloqueado}
            onChange={(e) => onCambio?.(e.target.checked ? 'si' : '')}
          />
          <span>{ph ?? etiqueta}</span>
        </span>
      );
    }

    if (tipo === 'ro') {
      return (
        <output id={id} className="sgtm-campo__control sgtm-campo__control--lectura">
          {cargando ? '' : valor || SIN_VALOR}
        </output>
      );
    }

    return (
      <input
        id={id}
        type={tipo === 'date' ? 'date' : 'text'}
        className="sgtm-campo__control"
        value={valor}
        placeholder={ph}
        readOnly={bloqueado}
        aria-readonly={bloqueado || undefined}
        disabled={cargando}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describe}
        onChange={(e) => onCambio?.(e.target.value)}
      />
    );
  }
}
