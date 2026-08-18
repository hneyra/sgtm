import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ACENTOS, ACENTOS_HOVER, PADDING_DE_NAVEGACION } from '@sgtm/design-system';
import type { Acento, Densidad } from '@sgtm/design-system';

/**
 * Las preferencias que el prototipo declara configurables (FRO-02 §3).
 *
 * `entidad` es el nombre de la municipalidad que se ve en la barra lateral y en
 * la cabecera de los reportes. Hoy es un valor por omision: cuando haya sesion
 * real vendra del token, igual que todo lo demas que depende de la
 * municipalidad —que es lo que el frontend nunca envia (FRO-01 §4)—.
 */
export interface Preferencias {
  readonly entidad: string;
  readonly densidad: Densidad;
  readonly acento: Acento;
  /** El chip con la operacion del contrato en la cabecera. Util en desarrollo. */
  readonly mostrarEndpoint: boolean;
}

export const PREFERENCIAS_POR_OMISION: Preferencias = {
  entidad: 'Municipalidad Provincial de Sullana',
  densidad: 'normal',
  acento: 'navy',
  mostrarEndpoint: true,
};

interface ContextoDePreferencias {
  readonly preferencias: Preferencias;
  readonly cambiar: (parciales: Partial<Preferencias>) => void;
}

const Contexto = createContext<ContextoDePreferencias>({
  preferencias: PREFERENCIAS_POR_OMISION,
  cambiar: () => undefined,
});

export function ProveedorDePreferencias({
  children,
  inicial = PREFERENCIAS_POR_OMISION,
}: {
  readonly children: ReactNode;
  readonly inicial?: Preferencias;
}) {
  const [preferencias, fijar] = useState<Preferencias>(inicial);
  const valor = useMemo(
    () => ({
      preferencias,
      cambiar: (parciales: Partial<Preferencias>) =>
        fijar((previas) => ({ ...previas, ...parciales })),
    }),
    [preferencias],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const usePreferencias = (): ContextoDePreferencias => useContext(Contexto);

/**
 * Las preferencias que cambian medidas se aplican como variables CSS sobre el
 * shell, no como estilos en cada componente: asi el acento alternativo alcanza
 * a todo lo que ya usa `var(--accent)` sin que nadie lo enchufe uno a uno.
 */
export function variablesDe(preferencias: Preferencias): Record<string, string> {
  return {
    '--accent': ACENTOS[preferencias.acento],
    '--accent-2': ACENTOS_HOVER[preferencias.acento],
    '--nav-alto': `${PADDING_DE_NAVEGACION[preferencias.densidad]}px`,
  };
}
