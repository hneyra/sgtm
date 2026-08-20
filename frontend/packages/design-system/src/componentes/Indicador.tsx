/**
 * Indicador del panel de recaudacion (el `Stat` del design system).
 *
 * `valor` llega ya redactado por el backend —«S/ 18.42 M»—; la interfaz no
 * compone cifras ni abrevia magnitudes (RNF-080, RNF-083).
 */
export interface IndicadorProps {
  readonly valor: string;
  readonly etiqueta: string;
}

export function Indicador({ valor, etiqueta }: IndicadorProps) {
  return (
    <div>
      <div className="sgtm-indicador__valor">{valor}</div>
      <div className="sgtm-indicador__etiqueta">{etiqueta}</div>
    </div>
  );
}
