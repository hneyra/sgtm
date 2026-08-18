import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Boton del prototipo. Tres variantes y dos tamanos, ni uno mas.
 *
 * En una barra de acciones **la ultima es la primaria** y las demas
 * secundarias (FRO-03 §5); quien compone la barra decide, no este componente.
 */
export type VarianteDeBoton = 'primario' | 'secundario' | 'fantasma';

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variante?: VarianteDeBoton;
  readonly menudo?: boolean;
  readonly children: ReactNode;
}

export function Boton({ variante = 'secundario', menudo = false, children, ...resto }: BotonProps) {
  const clases = ['sgtm-boton', `sgtm-boton--${variante}`];
  if (menudo) clases.push('sgtm-boton--menudo');
  return (
    <button
      type="button"
      {...resto}
      className={[...clases, resto.className].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
}
