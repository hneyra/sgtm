import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as EventoDeTeclado, RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * El comportamiento comun de los dos menus desplegables de la cabecera: el
 * lanzador de modulos y el menu de la persona (ADR-0014 §2 y §3).
 *
 * **Se operan enteros con el teclado**, con el mismo patron que la paleta de
 * comandos (RNF-082): el boton abre con Enter o Espacio, ↑ ↓ recorren las
 * entradas, Enter abre la elegida y Esc cierra devolviendo el foco al boton.
 * El foco no abandona el boton mientras el menu esta abierto —como en la
 * paleta no abandona el campo—: la entrada activa se marca con
 * `data-elegido`, no moviendo el foco.
 *
 * Navegar cierra el menu (el mismo efecto con que el shell cierra la paleta
 * al cambiar `pathname`), y el clic fuera tambien.
 */
export interface MenuDeCabecera {
  readonly abierto: boolean;
  /** Indice de la entrada activa, ya acotado al total. */
  readonly activo: number;
  readonly contenedor: RefObject<HTMLDivElement | null>;
  readonly boton: RefObject<HTMLButtonElement | null>;
  readonly alternar: () => void;
  readonly cerrar: () => void;
  readonly alTeclear: (evento: EventoDeTeclado<HTMLElement>) => void;
}

export function useMenuDeCabecera(
  total: number,
  alElegir: (indice: number) => void,
): MenuDeCabecera {
  const [abierto, fijarAbierto] = useState(false);
  const [elegido, fijarElegido] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // Navegar cierra: si otra puerta (la paleta, la barra) cambio de pantalla
  // con el menu abierto, el menu no se queda flotando sobre la nueva.
  useEffect(() => {
    fijarAbierto(false);
  }, [pathname]);

  // El clic fuera cierra; el teclado tiene Esc, que es el camino real.
  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => {
      // `as Node`: el target de un MouseEvent del DOM siempre es un nodo.
      if (!contenedor.current?.contains(evento.target as Node)) fijarAbierto(false);
    };
    document.addEventListener('mousedown', alPulsarFuera);
    return () => document.removeEventListener('mousedown', alPulsarFuera);
  }, [abierto]);

  const activo = Math.min(elegido, Math.max(total - 1, 0));

  return {
    abierto,
    activo,
    contenedor,
    boton,
    alternar: () => {
      fijarElegido(0);
      fijarAbierto((estaba) => !estaba);
    },
    cerrar: () => fijarAbierto(false),
    alTeclear: (evento) => {
      if (!abierto) {
        // Enter y Espacio abren solos —son el clic nativo del boton—; la
        // flecha abajo abre ademas sin que haga falta soltar las flechas.
        if (evento.key === 'ArrowDown') {
          evento.preventDefault();
          fijarElegido(0);
          fijarAbierto(true);
        }
        return;
      }
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        fijarElegido((n) => Math.min(n + 1, total - 1));
      } else if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        fijarElegido((n) => Math.max(n - 1, 0));
      } else if (evento.key === 'Enter') {
        // Sin el preventDefault, Enter tambien dispararia el clic del boton
        // y el menu se cerraria y volveria a abrir.
        evento.preventDefault();
        alElegir(activo);
        fijarAbierto(false);
      } else if (evento.key === 'Escape') {
        fijarAbierto(false);
        boton.current?.focus();
      }
    },
  };
}
