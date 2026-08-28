import { useEffect, useState } from 'react';
import type { SeccionDePantalla } from '../../catalogo';

/**
 * Indice de las secciones de la pantalla. **Desplaza, no recarga** (#319).
 *
 * Una ficha catastral apila secciones de campos, y llegar a «Áreas legal y
 * física» obliga a rodar la pagina buscando su cabecera. Este bloque las lista
 * en una columna estrecha y lleva a cada una por su ancla: no cambia la ruta, no
 * vuelve a pedir nada y no toca el estado de la busqueda —lo que hay en la URL
 * sigue siendo lo que se busco—.
 *
 * **Lista exactamente lo que dibuja `Formulario`**: recibe las mismas secciones
 * —las de la pestana activa, si la pantalla tiene pestanas— y el mismo
 * generador de anclas. Un indice que se calculara aparte enseñaria entradas que
 * no llevan a ningun sitio en cuanto una pantalla cambiara de pestañas.
 *
 * Es opt-in por opcion (`composicion.ts`): una pantalla que no lo declara se
 * dibuja como se dibujaba.
 */
export interface IndiceDeSeccionesProps {
  readonly secciones: readonly SeccionDePantalla[];
  /** El `id` del ancla de cada seccion; el mismo que pone `Formulario`. */
  readonly anclaDe: (indice: number) => string;
}

export function IndiceDeSecciones({ secciones, anclaDe }: IndiceDeSeccionesProps) {
  const [activa, fijarActiva] = useState(0);

  /* Cambiar de pestana cambia las secciones: la activa vuelve a la primera, que
     es la que se esta viendo tras el cambio. La dependencia son **los rotulos**
     y no el arreglo: `seccionesDe` devuelve uno nuevo en cada dibujo, y con el
     arreglo por dependencia el efecto correria siempre y borraria la entrada
     que se acaba de pulsar. */
  const rotulos = secciones.map((seccion) => seccion.label).join('|');
  useEffect(() => fijarActiva(0), [rotulos]);

  if (secciones.length === 0) return null;

  return (
    <nav className="sgtm-indice" aria-label="Secciones de la pantalla" data-no-imprimible="1">
      <p className="sgtm-indice__eyebrow">
        {secciones.length} {secciones.length === 1 ? 'sección' : 'secciones'}
      </p>
      {secciones.map((seccion, indice) => (
        <button
          key={`${indice}|${seccion.label}`}
          type="button"
          className="sgtm-indice__entrada"
          data-activa={indice === activa ? '1' : '0'}
          aria-current={indice === activa ? 'true' : undefined}
          onClick={() => {
            fijarActiva(indice);
            const ancla = document.getElementById(anclaDe(indice));
            // `scrollIntoView` no existe en jsdom, y aqui no hace falta fingirlo:
            // lo que se prueba es que la entrada lleva a **su** ancla, no que el
            // navegador sepa desplazarse.
            ancla?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
            // El foco va con la vista: quien navega con teclado tiene que quedar
            // dentro de la seccion a la que acaba de ir, no donde estaba.
            ancla?.focus?.({ preventScroll: true });
          }}
        >
          {seccion.label}
        </button>
      ))}
    </nav>
  );
}
