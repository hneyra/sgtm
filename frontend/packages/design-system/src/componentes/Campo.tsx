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
   * Mensaje del backend para **este** campo (`ProblemaDeApi.errores`).
   *
   * Va tal cual: el servidor ya lo redacto en castellano y en lenguaje del
   * dominio (RNF-080), y reescribirlo aqui produce dos versiones del mismo
   * mensaje que se separan a la primera correccion.
   */
  readonly error?: string;
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
  error,
  onCambio,
}: CampoProps) {
  const id = useId();
  const idDelError = `${id}-error`;
  const clases = ['sgtm-campo'];
  if (ancho) clases.push('sgtm-campo--ancho');
  if (error !== undefined) clases.push('sgtm-campo--con-error');

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
    </div>
  );

  function control() {
    if (tipo === 'sel') {
      return (
        <select
          id={id}
          className="sgtm-campo__control"
          value={valor}
          disabled={cargando}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={error === undefined ? undefined : idDelError}
          onChange={(e) => onCambio?.(e.target.value)}
        >
          {(opciones ?? []).map((opcion) => (
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
          disabled={cargando}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={error === undefined ? undefined : idDelError}
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
            disabled={cargando}
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
        disabled={cargando}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : idDelError}
        onChange={(e) => onCambio?.(e.target.value)}
      />
    );
  }
}
