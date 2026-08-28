import { useMemo } from 'react';
import { puedeEscribir, puedeRegistrar, puedeVer } from '@sgtm/sesion';
import type { PermisosEfectivos } from '@sgtm/sesion';
import { useSesion } from '@sgtm/sesion';
import { MODULOS, situarOpciones } from '../../catalogo';
import type { ModuloDelCatalogo, OpcionDelCatalogo, OpcionSituada } from '../../catalogo';

/**
 * El catalogo que este usuario puede ver.
 *
 * La barra lateral, el hub de cada modulo y la paleta de comandos leen de aqui
 * y no del catalogo entero. **La paleta es la que se olvida**: es el camino mas
 * rapido a una opcion, y una paleta que encuentra lo que el menu esconde no
 * esconde nada.
 *
 * **Aplicar los permisos al catalogo vive aqui y no en `@sgtm/sesion`** (#298):
 * el paquete de la sesion lo comparten el back-office y el portal del
 * contribuyente, y el portal no navega modulos —no tiene catalogo que filtrar
 * (ADR-0016 §3)—. Que el paquete conociera los tipos del catalogo seria
 * exactamente la dependencia que la separacion existe para no tener.
 */
export interface CatalogoVisible {
  readonly modulos: readonly ModuloDelCatalogo[];
  readonly opciones: readonly OpcionSituada[];
  readonly puedeVer: (opcion: string) => boolean;
  readonly puedeEscribir: (opcion: string) => boolean;
  /** Dar de alta exige `registro`, no cualquier escritura: ver `puedeRegistrar`. */
  readonly puedeRegistrar: (opcion: string) => boolean;
}

/** El catalogo que este usuario puede ver. Un modulo sin opciones visibles no aparece. */
export function catalogoVisible(
  modulos: readonly ModuloDelCatalogo[],
  permisos: PermisosEfectivos,
): readonly ModuloDelCatalogo[] {
  if (permisos.sinProveedor) return modulos;

  const visibles: ModuloDelCatalogo[] = [];
  for (const modulo of modulos) {
    const opciones = modulo.opciones.filter((opcion: OpcionDelCatalogo) =>
      puedeVer(permisos, opcion.id),
    );
    if (opciones.length === 0) continue;
    visibles.push({
      ...modulo,
      opciones,
      // Un bloque cuyas opciones se fueron todas tampoco se dibuja.
      bloques: modulo.bloques.filter((bloque) => opciones.some((o) => o.bloque === bloque)),
    });
  }
  return visibles;
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
      puedeRegistrar: (opcion: string) => puedeRegistrar(permisos, opcion),
    };
  }, [permisos]);
}
