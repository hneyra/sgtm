import { Suspense } from 'react';
import type { ComposicionDeOpcion } from '../composicion';
import { PanelLateral } from './PanelLateral';

/**
 * El panel de la alta abierta.
 *
 * Vive en su propio componente y no en linea porque el formulario de dentro
 * llama a `useEscritura`, y un hook no se llama a veces: montarlo solo cuando el
 * panel esta abierto es lo que evita que la escritura exista mientras nadie la
 * pidio.
 *
 * **Esta aqui y no dentro de `Pantalla`** porque lo dibujan dos renderizadores:
 * el comun de las 134 y el propio del territorio (`catastro/Territorio.tsx`),
 * que compone las altas de sector, manzana y via alrededor de su arbol. Copiarlo
 * habria dejado dos maneras de abrir el mismo formulario, y la copia es la que
 * un dia se olvida de devolver el foco al boton que la abrio.
 */

/** Cual de las altas de la opcion esta abierta, y de que fila cuelga. */
export type AltaAbierta =
  | { readonly indice: number; readonly deFila?: false; readonly contexto?: undefined }
  | { readonly deFila: true; readonly contexto: string; readonly indice?: undefined };

export function PanelDeAlta({
  composicion,
  abierta,
  onCerrar,
}: {
  readonly composicion: ComposicionDeOpcion;
  readonly abierta: AltaAbierta;
  readonly onCerrar: () => void;
}) {
  const alta =
    abierta.deFila === true ? composicion.altaDeFila : composicion.altas?.[abierta.indice];
  if (alta === undefined) return null;
  const Formulario = alta.Formulario;

  return (
    // El `Suspense` envuelve al panel **entero** y no a su contenido: el panel
    // lleva el foco a su primer control al montarse, y montarlo alrededor de un
    // hueco que todavia se esta cargando dejaria el foco en el boton de cerrar
    // y no lo volveria a mover cuando llegara el formulario.
    <Suspense fallback={null}>
      <PanelLateral
        titulo={alta.titulo}
        {...(alta.descripcion === undefined ? {} : { descripcion: alta.descripcion })}
        onCerrar={onCerrar}
      >
        <Formulario
          {...(abierta.contexto === undefined ? {} : { contexto: abierta.contexto })}
          onCerrar={onCerrar}
        />
      </PanelLateral>
    </Suspense>
  );
}
