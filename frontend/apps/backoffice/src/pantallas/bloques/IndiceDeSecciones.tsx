import { useEffect, useState } from 'react';
import type { SeccionDePantalla } from '../../catalogo';
import { ID_DE_LAS_ACCIONES } from './BarraDeAcciones';

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
  /**
   * La pantalla tiene barra de acciones al final, asi que el indice ofrece la
   * salida hacia ella.
   *
   * Sin esto, quien navega con teclado sale del indice y entra en 55 controles
   * apilados —las secciones del padron de contribuyentes— sin ninguna forma de
   * saltar al acto que vino a hacer: hay que tabular por todos. El indice es
   * justamente el sitio donde esa salida se busca.
   */
  readonly haciaLasAcciones?: boolean;
}

export function IndiceDeSecciones({
  secciones,
  anclaDe,
  haciaLasAcciones = false,
}: IndiceDeSeccionesProps) {
  const [activa, fijarActiva] = useState(0);

  /* Cambiar de pestana cambia las secciones: la activa vuelve a la primera, que
     es la que se esta viendo tras el cambio. La dependencia son **los rotulos**
     y no el arreglo: `seccionesDe` devuelve uno nuevo en cada dibujo, y con el
     arreglo por dependencia el efecto correria siempre y borraria la entrada
     que se acaba de pulsar. */
  const rotulos = secciones.map((seccion) => seccion.label).join('|');
  useEffect(() => fijarActiva(0), [rotulos]);

  const anclas = secciones.map((_, indice) => anclaDe(indice));
  const anclasEnUnaLinea = anclas.join('|');

  /* **`aria-current` dice cual se esta viendo, no cual se pulso.**
     Se marcaba en el `onClick` y ahi se quedaba: rodando la pagina con la rueda
     o con AvPag —que es como se lee una ficha— el indice seguia senalando la
     seccion de hace diez minutos, y para un lector de pantalla eso no es una
     imprecision de dibujo: es una afirmacion falsa sobre donde esta el usuario.
     Un `IntersectionObserver` mira las anclas de verdad y la mas alta de las
     visibles es la que rige. Los margenes recortan la ventana a su franja
     central: sin ellos, cualquier seccion asomando por el borde inferior se
     declararia la actual.

     El clic sigue marcando ademas, y no sobra: el desplazamiento es suave y el
     observador tarda en confirmarlo; sin la marca inmediata la entrada pulsada
     parpadea. */
  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return undefined;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visibles = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const primera = visibles[0];
        if (primera === undefined) return;
        const indice = anclasEnUnaLinea.split('|').indexOf(primera.target.id);
        if (indice >= 0) fijarActiva(indice);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );
    for (const ancla of anclasEnUnaLinea.split('|')) {
      const nodo = document.getElementById(ancla);
      if (nodo !== null) observador.observe(nodo);
    }
    return () => observador.disconnect();
  }, [anclasEnUnaLinea]);

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
      {haciaLasAcciones && (
        <button
          type="button"
          className="sgtm-indice__entrada sgtm-indice__salida"
          onClick={() => {
            const acciones = document.getElementById(ID_DE_LAS_ACCIONES);
            acciones?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
            // El foco va al primer control de la barra y no al contenedor: el
            // contenedor no es enfocable, y lo que se vino a hacer es pulsar.
            acciones?.querySelector<HTMLElement>('button:not([disabled]), a')?.focus?.();
          }}
        >
          Ir a las acciones
        </button>
      )}
    </nav>
  );
}
