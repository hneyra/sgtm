import type { ReactNode } from 'react';
import type { Tono } from '@sgtm/dominio';

/**
 * Insignia de estado.
 *
 * **El texto va siempre dentro**, no solo el color: la interfaz tiene que poder
 * distinguirse sin ver color (FRO-02 §2.1, FRO-04 §7). Por eso `children` es
 * obligatorio y no hay variante que pinte solo un punto.
 */
export interface InsigniaProps {
  readonly tono: Tono;
  readonly children: ReactNode;
}

export function Insignia({ tono, children }: InsigniaProps) {
  return <span className={`sgtm-insignia sgtm-insignia--${tono}`}>{children}</span>;
}
