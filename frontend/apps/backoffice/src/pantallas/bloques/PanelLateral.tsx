import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Un panel lateral: el alta que **no saca de la pantalla** (#321).
 *
 * Dar de alta un sector o una via es un formulario de tres campos, y el manual
 * lo dibuja como una pantalla aparte. Sacar a quien esta revisando el catalogo
 * territorial para pedirle tres campos y devolverlo despues pierde su busqueda,
 * su pagina y el sitio de la tabla en el que estaba; el panel deja lo de detras
 * a la vista, que es lo que permite copiar un codigo de la fila de al lado.
 *
 * Lo que resuelve, y que ningun alta deberia volver a resolver:
 *
 * - **Esc cierra**, oido en `document` y no en el panel: quien acaba de pulsar
 *   «Nuevo» todavia no ha llevado el foco dentro (mismo motivo que el menu de la
 *   persona, ADR-0014).
 * - **El foco entra al abrir** y **vuelve al boton al cerrar**. Sin lo segundo,
 *   cerrar deja el foco en el `body` y el siguiente tabulador empieza por la
 *   cabecera de la aplicacion.
 * - **El foco no se escapa por detras**: el panel es `aria-modal`, y el
 *   tabulador circula dentro mientras esta abierto.
 *
 * No vive en `@sgtm/design-system` porque hoy lo usa un solo modulo, y un
 * componente compartido antes de su segundo uso es un componente que nadie pidio
 * (CLAUDE.md). Sube cuando lo pida el segundo.
 */
export interface PanelLateralProps {
  readonly titulo: string;
  readonly descripcion?: string;
  readonly onCerrar: () => void;
  readonly children: ReactNode;
}

/** Lo que puede recibir el foco dentro del panel, en orden de documento. */
const ENFOCABLES =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function PanelLateral({ titulo, descripcion, onCerrar, children }: PanelLateralProps) {
  const panel = useRef<HTMLDivElement>(null);
  // A donde vuelve el foco al cerrar: donde estaba justo antes de abrir.
  const devolverA = useRef<HTMLElement | null>(null);

  useEffect(() => {
    devolverA.current = document.activeElement as HTMLElement | null;
    const primero = panel.current?.querySelector<HTMLElement>(ENFOCABLES);
    primero?.focus();
    return () => devolverA.current?.focus();
  }, []);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCerrar();
        return;
      }
      if (evento.key !== 'Tab' || panel.current === null) return;
      const dentro = [...panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)];
      const primero = dentro[0];
      const ultimo = dentro[dentro.length - 1];
      if (primero === undefined || ultimo === undefined) return;
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <>
      {/* El velo cierra al pulsar fuera; el teclado tiene Esc, que es el camino real. */}
      <div className="sgtm-lateral__velo" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={panel}
        className="sgtm-lateral"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        data-no-imprimible="1"
      >
        <div className="sgtm-lateral__cabecera">
          <h2 className="sgtm-lateral__titulo">{titulo}</h2>
          <button
            type="button"
            className="sgtm-boton sgtm-boton--menudo"
            onClick={onCerrar}
            aria-label={`Cerrar ${titulo}`}
          >
            Cerrar
          </button>
        </div>
        {descripcion !== undefined && <p className="sgtm-lateral__nota">{descripcion}</p>}
        <div className="sgtm-lateral__cuerpo">{children}</div>
      </div>
    </>
  );
}
