/**
 * Iconografia: SVG de linea escritos a mano, sin libreria y sin emoji.
 *
 * `viewBox` 24x24, `stroke-width` 1.7, extremos redondeados, `currentColor`.
 * Los trazos son los del prototipo `design/SGTM.dc.html`; los de los doce
 * modulos no estan aqui sino en el catalogo, porque cada modulo trae el suyo
 * como dato (`IconoDeModulo`).
 */

/** Un circulo de radio 1.3 centrado en (x, y): un «punto» del set de linea. */
const punto = (x: number, y: number): string =>
  `M${x + 1.3} ${y}a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0`;

const TRAZOS = {
  lupa: ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0', 'M20 20l-4.3-4.3'],
  chevronDerecha: ['M9 6l6 6-6 6'],
  chevronIzquierda: ['M15 6l-6 6 6 6'],
  chevronAbajo: ['M6 9l6 6 6-6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  // La accion primaria del modulo: el mas de «Registrar predio» (#498 F2).
  mas: ['M12 5v14', 'M5 12h14'],
  // Lanzador de modulos (ADR-0014 §2): la rejilla de nueve puntos, dibujada
  // como nueve circulos de linea para quedarse en el idioma del set.
  nuevePuntos: [5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => punto(x, y))),
} as const;

export type NombreDeIcono = keyof typeof TRAZOS;

export interface IconoProps {
  readonly nombre: NombreDeIcono;
  readonly tamano?: number;
}

/** Decorativo por definicion: el significado lo pone el texto que acompana. */
export function Icono({ nombre, tamano = 16 }: IconoProps) {
  return <IconoDeModulo trazos={TRAZOS[nombre]} tamano={tamano} />;
}

export interface IconoDeModuloProps {
  readonly trazos: readonly string[];
  readonly tamano?: number;
}

export function IconoDeModulo({ trazos, tamano = 16 }: IconoDeModuloProps) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {trazos.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
