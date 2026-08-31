import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * El desplegable comun de la cabecera: el lanzador de modulos y el menu de la
 * persona (ADR-0014 §2 y §3) son el mismo mecanismo con distinto contenido, y
 * viven aqui para que el teclado se arregle **en un sitio**.
 *
 * Implementa el patron `menu` de WAI-ARIA APG con **foco itinerante**: las
 * entradas quedan fuera del orden de tabulacion (`tabIndex={-1}`), las flechas
 * mueven el foco de verdad de una a otra, y Enter o Espacio activan **la que
 * tiene el foco** porque el clic nativo del boton no se intercepta.
 *
 * La primera version dejaba el foco en el boton y marcaba la entrada activa con
 * un atributo. Eso hacia dos cosas mal: quien llegaba con Tab a la quinta
 * entrada y pulsaba Enter abria **la primera** —el `preventDefault` del panel se
 * comia la activacion nativa y elegia el indice marcado—, y un lector de
 * pantalla no anunciaba el recorrido, porque `role="menu"` sin foco dentro ni
 * `aria-activedescendant` no dice a donde se ha movido nadie.
 *
 * Esc cierra y devuelve el foco al boton **aunque el foco haya salido del
 * panel** —de ahi el oyente en `document`, y no solo en el contenedor—; Tab
 * cierra y sigue su camino; el clic fuera cierra tambien; y navegar cierra, por
 * si otra puerta cambio de pantalla con el menu abierto.
 */
export interface EntradaDeCabecera {
  readonly id: string;
  /** Lo que se dibuja dentro de la entrada; su texto es su nombre accesible. */
  readonly contenido: ReactNode;
  readonly elegir: () => void;
}

/** Las clases de cada pieza: es lo unico que separa un desplegable del otro. */
export interface ClasesDelMenu {
  readonly contenedor: string;
  readonly boton: string;
  readonly panel: string;
  readonly entrada: string;
}

export interface MenuDeCabeceraProps {
  readonly clases: ClasesDelMenu;
  /**
   * Nombre accesible del boton. Si el boton lleva texto visible, la etiqueta
   * tiene que **contenerlo** (WCAG 2.5.3): quien dicta por voz lee lo que ve.
   */
  readonly etiquetaDelBoton: string;
  readonly etiquetaDelPanel: string;
  readonly entradas: readonly EntradaDeCabecera[];
  readonly children: ReactNode;
}

export function MenuDeCabecera({
  clases,
  etiquetaDelBoton,
  etiquetaDelPanel,
  entradas,
  children,
}: MenuDeCabeceraProps) {
  const [abierto, fijarAbierto] = useState(false);
  // A que entrada llevar el foco cuando el panel aparezca. `null` es «a
  // ninguna»: abierto con el raton el foco se queda en el boton, y ninguna
  // entrada sale resaltada de fantasma.
  const [aEnfocar, fijarAEnfocar] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const nodos = useRef<(HTMLButtonElement | null)[]>([]);
  const idDelPanel = useId();
  const { pathname } = useLocation();

  const cerrar = useCallback(() => {
    fijarAbierto(false);
    fijarAEnfocar(null);
  }, []);

  const cerrarYVolverAlBoton = useCallback(() => {
    cerrar();
    boton.current?.focus();
  }, [cerrar]);

  // Navegar cierra: si otra puerta (la paleta, la barra) cambio de pantalla
  // con el menu abierto, el menu no se queda flotando sobre la nueva.
  useEffect(() => {
    cerrar();
  }, [pathname, cerrar]);

  // El foco itinerante se mueve aqui y solo aqui: el estado dice a que entrada
  // toca, y el efecto la enfoca cuando ya esta en el DOM.
  useLayoutEffect(() => {
    if (!abierto || aEnfocar === null) return;
    nodos.current[aEnfocar]?.focus();
  }, [abierto, aEnfocar]);

  // Esc cierra **desde donde sea**. El oyente del panel no basta: en cuanto el
  // foco sale del contenedor —volvio al boton, o el usuario tabulo fuera— el
  // menu se quedaba abierto sin forma de cerrarlo con el teclado.
  useEffect(() => {
    if (!abierto) return;
    const alTeclearEnElDocumento = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrarYVolverAlBoton();
    };
    document.addEventListener('keydown', alTeclearEnElDocumento);
    return () => document.removeEventListener('keydown', alTeclearEnElDocumento);
  }, [abierto, cerrarYVolverAlBoton]);

  // El clic fuera cierra; el teclado tiene Esc, que es el camino real.
  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => {
      // `as Node`: el target de un MouseEvent del DOM siempre es un nodo.
      if (!contenedor.current?.contains(evento.target as Node)) cerrar();
    };
    document.addEventListener('mousedown', alPulsarFuera);
    return () => document.removeEventListener('mousedown', alPulsarFuera);
  }, [abierto, cerrar]);

  const ultima = entradas.length - 1;

  return (
    <div className={clases.contenedor} ref={contenedor}>
      <button
        type="button"
        ref={boton}
        className={clases.boton}
        aria-label={etiquetaDelBoton}
        aria-haspopup="menu"
        aria-expanded={abierto}
        // Solo mientras el panel existe: un `aria-controls` que apunta a nada
        // es una referencia rota, no una ayuda.
        aria-controls={abierto ? idDelPanel : undefined}
        onClick={(evento) => {
          if (abierto) {
            cerrar();
            return;
          }
          // `detail === 0` distingue la activacion por teclado —Enter o Espacio
          // sobre el boton, que disparan el clic nativo— del clic de raton. Con
          // teclado el foco entra a la primera entrada; con raton se queda en el
          // boton y el panel se abre sin resalte.
          fijarAEnfocar(evento.detail === 0 ? 0 : null);
          fijarAbierto(true);
        }}
        onKeyDown={(evento) => {
          // Las flechas abren y entran: abajo por la primera, arriba por la
          // ultima, como manda el patron APG.
          if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            fijarAEnfocar(evento.key === 'ArrowDown' ? 0 : ultima);
            fijarAbierto(true);
          }
        }}
      >
        {children}
      </button>
      {abierto && (
        <div
          id={idDelPanel}
          className={clases.panel}
          role="menu"
          aria-label={etiquetaDelPanel}
          // Nunca por Tab: el foco vive en las entradas. Va aqui porque un
          // contenedor con rol interactivo y teclado tiene que poder recibirlo
          // (`jsx-a11y/interactive-supports-focus`).
          tabIndex={-1}
          // El teclado se atiende en el panel porque el evento burbujea desde
          // la entrada enfocada. Enter y Espacio **no** estan aqui a proposito:
          // los resuelve el clic nativo del boton que tiene el foco.
          onKeyDown={(evento) => {
            if (evento.key === 'ArrowDown') {
              evento.preventDefault();
              fijarAEnfocar((n) => (n === null || n >= ultima ? 0 : n + 1));
            } else if (evento.key === 'ArrowUp') {
              evento.preventDefault();
              fijarAEnfocar((n) => (n === null || n <= 0 ? ultima : n - 1));
            } else if (evento.key === 'Home') {
              evento.preventDefault();
              fijarAEnfocar(0);
            } else if (evento.key === 'End') {
              evento.preventDefault();
              fijarAEnfocar(ultima);
            } else if (evento.key === 'Tab') {
              // Tabular sale del menu: se cierra y el foco sigue su camino.
              cerrar();
            }
          }}
        >
          {entradas.map((entrada, i) => (
            <button
              key={entrada.id}
              type="button"
              role="menuitem"
              className={clases.entrada}
              // Foco itinerante: fuera del orden de tabulacion. El recorrido es
              // con flechas, y la entrada activa es la que tiene el foco de
              // verdad —no hace falta marcarla con un atributo—.
              tabIndex={-1}
              ref={(nodo) => {
                nodos.current[i] = nodo;
              }}
              onClick={() => {
                entrada.elegir();
                cerrar();
              }}
            >
              {entrada.contenido}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
