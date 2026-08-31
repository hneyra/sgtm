/**
 * Un icono del sistema es una lista de trazos sobre una caja de 24×24, con el
 * grosor y los remates que el artboard fija. No hay biblioteca de iconos: los
 * trazos vienen literales del diseño, que es lo que permite que el riel de
 * módulos se vea exactamente igual que en `design/design-sgtm/`.
 */
import type { Trazos } from './iconos';
export type { Trazos };

export function Icono({
  d,
  tam = 15,
  grosor = 1.7,
  style,
}: {
  d: Trazos;
  tam?: number;
  grosor?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
