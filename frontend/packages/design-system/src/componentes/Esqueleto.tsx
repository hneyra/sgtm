/**
 * Marcador de carga.
 *
 * El prototipo no diseno los estados de carga: el handoff manda resolverlos con
 * los patrones del repositorio, y este es el que FRO-01 §7 nombra.
 */
export interface EsqueletoProps {
  readonly alto?: number;
  readonly ancho?: string;
}

export function Esqueleto({ alto = 14, ancho = '100%' }: EsqueletoProps) {
  return (
    <span
      className="sgtm-esqueleto"
      style={{ display: 'block', height: alto, width: ancho }}
      aria-hidden="true"
    />
  );
}
