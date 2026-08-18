import { formatearFecha, formatearImporte } from '@sgtm/dominio';
import type { Fecha, Importe as ImporteDecimal } from '@sgtm/dominio';

/**
 * Un importe, con la fecha a la que esta calculado.
 *
 * `fechaCalculo` es obligatoria y no tiene valor por omision: **no existe «la
 * deuda», existe la deuda a una fecha** (regla 9 de CLAUDE.md, RNF-075). Una
 * regla de ESLint rechaza el uso de este componente sin ella, con su muestra en
 * `verificaciones/muestras/importe-sin-fecha.tsx`; el tipo lo rechaza tambien,
 * que es la segunda barrera.
 *
 * No hace aritmetica: formatea el texto que envio el backend (RNF-083).
 */
export interface ImporteProps {
  readonly valor: ImporteDecimal;
  readonly fechaCalculo: Fecha;
  /** Oculta la fecha cuando ya la muestra la fila o la pantalla entera. */
  readonly fechaImplicita?: boolean;
}

export function Importe({ valor, fechaCalculo, fechaImplicita = false }: ImporteProps) {
  return (
    <span className="sgtm-importe">
      <span className="sgtm-importe__valor">{formatearImporte(valor)}</span>
      {!fechaImplicita && (
        <span className="sgtm-importe__fecha">al {formatearFecha(fechaCalculo)}</span>
      )}
    </span>
  );
}
