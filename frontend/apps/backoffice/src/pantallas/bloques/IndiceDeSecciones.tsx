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
  /**
   * Una entrada **antes** de las secciones, para el bloque que la pantalla
   * dibuja encima de ellas y fuera de la rejilla del indice: hoy, la tabla
   * (FRO-03 §5).
   *
   * Existe porque un indice que empieza por la segunda cosa de la pagina no es
   * un indice de la pagina. En «Cálculo individual del impuesto predial» eso se
   * veia sin disimulo: el paso 1 del calculo —los predios que integran la base—
   * no tenia entrada, y el indice arrancaba en la escala. El rotulo es el del
   * catalogo, no uno inventado (RNF-080).
   */
  readonly previa?: { readonly rotulo: string; readonly ancla: string };
}

export function IndiceDeSecciones({
  secciones,
  anclaDe,
  haciaLasAcciones = false,
  previa,
}: IndiceDeSeccionesProps) {
  const [activa, fijarActiva] = useState(0);

  /* Cambiar de pestana cambia las secciones: la activa vuelve a la primera, que
     es la que se esta viendo tras el cambio. La dependencia son **los rotulos**
     y no el arreglo: `seccionesDe` devuelve uno nuevo en cada dibujo, y con el
     arreglo por dependencia el efecto correria siempre y borraria la entrada
     que se acaba de pulsar. */
  /* Las entradas del indice, en el orden de la pagina: el bloque de encima
     —cuando lo hay— y despues las secciones. Se compone una sola lista para que
     `activa`, el observador y el dibujo cuenten lo mismo; con dos listas, la
     entrada marcada dejaria de ser la que se esta viendo en cuanto hubiera
     previa. */
  const entradas = [
    ...(previa === undefined ? [] : [{ rotulo: previa.rotulo, ancla: previa.ancla }]),
    ...secciones.map((seccion, indice) => ({ rotulo: seccion.label, ancla: anclaDe(indice) })),
  ];

  const rotulos = entradas.map((entrada) => entrada.rotulo).join('|');
  useEffect(() => fijarActiva(0), [rotulos]);

  const anclasEnUnaLinea = entradas.map((entrada) => entrada.ancla).join('|');

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
      // `observadas` y no `entradas`: las del indice se llaman asi desde que
      // hay una que no sale de las secciones, y dos cosas distintas con el
      // mismo nombre en el mismo componente se confunden a la primera lectura.
      (observadas) => {
        const visibles = observadas
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

  if (entradas.length === 0) return null;

  return (
    <nav className="sgtm-indice" aria-label="Secciones de la pantalla" data-no-imprimible="1">
      <p className="sgtm-indice__eyebrow">
        {entradas.length} {entradas.length === 1 ? 'sección' : 'secciones'}
      </p>
      {entradas.map((entrada, indice) => (
        <button
          key={`${indice}|${entrada.rotulo}`}
          type="button"
          className="sgtm-indice__entrada"
          /* **El nombre accesible dice que hace, no solo a que se refiere.**
             La cabecera de cada seccion es tambien un boton —la que la pliega—,
             y se llama exactamente igual: quien navega por lista de controles
             veia «Identificación» dos veces, sin nada que los distinga, y uno
             lleva a la seccion y el otro la esconde. El rotulo visible no
             cambia: es el de la seccion, que es lo que hay que leer en el
             indice. */
          aria-label={`Ir a ${entrada.rotulo}`}
          data-activa={indice === activa ? '1' : '0'}
          aria-current={indice === activa ? 'true' : undefined}
          onClick={() => {
            fijarActiva(indice);
            const ancla = document.getElementById(entrada.ancla);
            // `scrollIntoView` no existe en jsdom, y aqui no hace falta fingirlo:
            // lo que se prueba es que la entrada lleva a **su** ancla, no que el
            // navegador sepa desplazarse.
            ancla?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
            // El foco va con la vista: quien navega con teclado tiene que quedar
            // dentro de la seccion a la que acaba de ir, no donde estaba.
            ancla?.focus?.({ preventScroll: true });
          }}
        >
          {entrada.rotulo}
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
