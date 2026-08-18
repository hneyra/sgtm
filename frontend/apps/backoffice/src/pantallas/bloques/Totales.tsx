import { formatearFecha } from '@sgtm/dominio';
import type { Fecha } from '@sgtm/dominio';
import type { Total } from '@sgtm/api-client';

/**
 * Banda de totales (FRO-03 §5, bloque 6).
 *
 * Los importes llegan **ya sumados por el backend** y la banda dice a que fecha
 * estan calculados: no existe «la deuda», existe la deuda a una fecha (regla 9,
 * RNF-075). Sumar aqui produciria una cifra que el backend no puede sustentar
 * (RNF-083).
 */
export interface TotalesProps {
  readonly estructura: readonly { readonly label: string; readonly fuerte: boolean }[];
  readonly datos?: readonly Total[];
  readonly fechaCalculo?: Fecha;
}

export function Totales({ estructura, datos, fechaCalculo }: TotalesProps) {
  const porEtiqueta = new Map((datos ?? []).map((t) => [t.label, t.value]));

  return (
    <section className="sgtm-totales-marco">
      <div className="sgtm-totales">
        {estructura.map((total) => (
          <div
            key={total.label}
            className="sgtm-totales__celda"
            data-fuerte={total.fuerte ? '1' : '0'}
          >
            <span className="sgtm-totales__etiqueta">{total.label}</span>
            <span className="sgtm-totales__valor">{porEtiqueta.get(total.label) ?? '—'}</span>
          </div>
        ))}
      </div>
      {fechaCalculo && (
        <p className="sgtm-totales__fecha">Cifras actualizadas al {formatearFecha(fechaCalculo)}</p>
      )}
    </section>
  );
}
