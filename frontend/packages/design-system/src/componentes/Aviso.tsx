import type { ReactNode } from 'react';

/**
 * Mensaje centrado entre hairlines: vacio o error (FRO-01 §7).
 *
 * El detalle de un error de negocio llega **ya redactado por el backend**, en
 * castellano y en lenguaje del dominio (RNF-080). Este componente lo muestra;
 * no lo reescribe ni lo sustituye por un texto generico.
 */
export interface AvisoProps {
  readonly tipo?: 'vacio' | 'error';
  readonly titulo: string;
  readonly detalle?: string;
  /** Identificador de traza, para que soporte pueda seguir el caso. */
  readonly traza?: string;
  readonly children?: ReactNode;
}

export function Aviso({ tipo = 'vacio', titulo, detalle, traza, children }: AvisoProps) {
  return (
    <div className={`sgtm-aviso sgtm-aviso--${tipo}`} role={tipo === 'error' ? 'alert' : undefined}>
      <p className="sgtm-aviso__titulo">{titulo}</p>
      {detalle && <p className="sgtm-aviso__detalle">{detalle}</p>}
      {traza && <p className="sgtm-aviso__traza">Traza {traza}</p>}
      {children}
    </div>
  );
}
