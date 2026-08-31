import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icono } from '@sgtm/design-system';
import { buscarOpciones } from '../catalogo';
import { useCatalogoVisible } from './sesion/useCatalogoVisible';

/**
 * Paleta de comandos: `Ctrl/Cmd + K`.
 *
 * Con 134 opciones repartidas en doce modulos, es el camino corto que un menu
 * de dos niveles no da (FRO-03 §3). Busca por etiqueta, titulo y modulo.
 *
 * **Se opera entera con el teclado**: se abre con Ctrl K, se escribe, se elige
 * con las flechas y se abre con Enter. En ventanilla el raton no se usa
 * (RNF-082), y una paleta que obliga a apuntar y hacer clic para elegir el
 * primer resultado es mas lenta que el menu que venia a sustituir.
 */
export interface PaletaDeComandosProps {
  readonly abierta: boolean;
  readonly onCerrar: () => void;
}

export function PaletaDeComandos({ abierta, onCerrar }: PaletaDeComandosProps) {
  const [consulta, fijarConsulta] = useState('');
  const [elegido, fijarElegido] = useState(0);
  const navegar = useNavigate();
  const entrada = useRef<HTMLInputElement>(null);
  const catalogo = useCatalogoVisible();

  useEffect(() => {
    if (abierta) {
      fijarConsulta('');
      fijarElegido(0);
      entrada.current?.focus();
    }
  }, [abierta]);

  if (!abierta) return null;

  // La paleta es el camino mas rapido a una opcion, y por eso es la que se
  // olvida al filtrar por permisos: una paleta que encuentra lo que el menu
  // esconde no esconde nada (REQ-03 §5).
  const resultados = buscarOpciones(consulta, catalogo.opciones);
  const activo = Math.min(elegido, Math.max(resultados.length - 1, 0));

  const abrir = (ruta: string) => {
    navegar(ruta);
    onCerrar();
  };

  return (
    <>
      {/* El scrim cierra al pulsar fuera; el teclado tiene Esc, que es el camino real. */}
      <div className="sgtm-paleta__scrim" onClick={onCerrar} aria-hidden="true" />
      <div
        className="sgtm-paleta"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar en el sistema"
      >
        <div className="sgtm-paleta__campo">
          <Icono nombre="lupa" tamano={17} />
          <input
            ref={entrada}
            value={consulta}
            onChange={(e) => {
              fijarConsulta(e.target.value);
              // Otra busqueda, otro primer resultado: dejar el indice donde
              // estaba abriria una opcion que ya no es la que se esta mirando.
              fijarElegido(0);
            }}
            onKeyDown={(evento) => {
              if (evento.key === 'ArrowDown') {
                evento.preventDefault();
                fijarElegido((n) => Math.min(n + 1, resultados.length - 1));
              } else if (evento.key === 'ArrowUp') {
                evento.preventDefault();
                fijarElegido((n) => Math.max(n - 1, 0));
              } else if (evento.key === 'Enter') {
                evento.preventDefault();
                const opcion = resultados[activo];
                if (opcion) abrir(opcion.ruta);
              }
            }}
            placeholder="Escribe una opción, un módulo o un trámite…"
            aria-label="Buscar una opción"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="sgtm-paleta__resultados">
          {resultados.map((opcion, i) => (
            <li key={opcion.id}>
              <button
                type="button"
                data-elegido={i === activo ? '1' : '0'}
                aria-current={i === activo ? 'true' : undefined}
                onClick={() => abrir(opcion.ruta)}
              >
                <span className="sgtm-paleta__etiqueta">{opcion.label}</span>
                <span className="sgtm-paleta__modulo">{opcion.modulo.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sgtm-paleta__pie">
          <span>
            {resultados.length} de {catalogo.opciones.length} opciones
          </span>
          <span>↑ ↓ para elegir · Enter para abrir · Ctrl K cierra</span>
        </div>
      </div>
    </>
  );
}
