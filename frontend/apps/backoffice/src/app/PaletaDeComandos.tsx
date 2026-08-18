import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icono } from '@sgtm/design-system';
import { OPCIONES, buscarOpciones } from '../catalogo';

/**
 * Paleta de comandos: `Ctrl/Cmd + K`.
 *
 * Con 134 opciones repartidas en doce modulos, es el camino corto que un menu
 * de dos niveles no da (FRO-03 §3). Busca por etiqueta, titulo y modulo.
 */
export interface PaletaDeComandosProps {
  readonly abierta: boolean;
  readonly onCerrar: () => void;
}

export function PaletaDeComandos({ abierta, onCerrar }: PaletaDeComandosProps) {
  const [consulta, fijarConsulta] = useState('');
  const navegar = useNavigate();
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierta) {
      fijarConsulta('');
      entrada.current?.focus();
    }
  }, [abierta]);

  if (!abierta) return null;

  const resultados = buscarOpciones(consulta);

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
            onChange={(e) => fijarConsulta(e.target.value)}
            placeholder="Escribe una opción, un módulo o un trámite…"
            aria-label="Buscar una opción"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="sgtm-paleta__resultados">
          {resultados.map((opcion) => (
            <li key={opcion.id}>
              <button
                type="button"
                onClick={() => {
                  navegar(opcion.ruta);
                  onCerrar();
                }}
              >
                <span className="sgtm-paleta__etiqueta">{opcion.label}</span>
                <span className="sgtm-paleta__modulo">{opcion.modulo.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="sgtm-paleta__pie">
          <span>
            {resultados.length} de {OPCIONES.length} opciones
          </span>
          <span>Ctrl K abre y cierra este buscador</span>
        </div>
      </div>
    </>
  );
}
