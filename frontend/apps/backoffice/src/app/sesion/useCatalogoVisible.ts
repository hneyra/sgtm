import { useMemo } from 'react';
import { MODULOS, situarOpciones } from '../../catalogo';
import type { ModuloDelCatalogo, OpcionSituada } from '../../catalogo';
import { catalogoVisible, puedeEscribir, puedeVer } from './permisos';
import { useSesion } from './ProveedorDeSesion';

/**
 * El catalogo que este usuario puede ver.
 *
 * La barra lateral, el hub de cada modulo y la paleta de comandos leen de aqui
 * y no del catalogo entero. **La paleta es la que se olvida**: es el camino mas
 * rapido a una opcion, y una paleta que encuentra lo que el menu esconde no
 * esconde nada.
 */
export interface CatalogoVisible {
  readonly modulos: readonly ModuloDelCatalogo[];
  readonly opciones: readonly OpcionSituada[];
  readonly puedeVer: (opcion: string) => boolean;
  readonly puedeEscribir: (opcion: string) => boolean;
}

export function useCatalogoVisible(): CatalogoVisible {
  const { permisos } = useSesion();

  return useMemo(() => {
    const modulos = catalogoVisible(MODULOS, permisos);
    return {
      modulos,
      opciones: situarOpciones(modulos),
      puedeVer: (opcion: string) => puedeVer(permisos, opcion),
      puedeEscribir: (opcion: string) => puedeEscribir(permisos, opcion),
    };
  }, [permisos]);
}
