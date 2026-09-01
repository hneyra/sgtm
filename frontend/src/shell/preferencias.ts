import { createContext, useContext } from 'react';

/** Las tres preferencias que los artboards exponen como props del lienzo:
 *  la entidad, el color de acento y la densidad. Aquí viven en el shell, que
 *  es quien las escribe sobre `document.documentElement`. */
export type Densidad = 'Compacta' | 'Normal' | 'Amplia';

export type Preferencias = {
  entidad: string;
  acento: string;
  densidad: Densidad;
  tema: 'claro' | 'oscuro';
  ejercicio: string;
};

export const ACENTOS = [
  { v: '#1F3A5F', label: 'Navy institucional' },
  { v: '#7C2D12', label: 'Terracota' },
  { v: '#1f5f3a', label: 'Musgo' },
  { v: '#444444', label: 'Pizarra' },
];

export const EJERCICIOS = ['2026', '2025', '2024', '2023'];

export const DENSIDADES: Record<Densidad, string> = {
  Compacta: '0.85',
  Normal: '1',
  Amplia: '1.18',
};

export const PreferenciasCtx = createContext<{
  pref: Preferencias;
  fijar: (p: Partial<Preferencias>) => void;
  /**
   * El aviso efímero de lo que acaba de pasar.
   *
   * `tono` es opcional y por omisión vale `bien`, que es lo que era antes: los
   * avisos existentes no cambian. Existe porque el aviso dibuja un **visto**, y
   * un visto sobre «El ejercicio 2026 no tiene un conjunto de parametros
   * sellado» dice que la operación salió bien encima del texto que dice que no
   * (#547). Con `mal` sale el aspa y el color de error.
   */
  toast: (t: string, tono?: 'bien' | 'mal') => void;
  ir: (modulo: string, dest?: string) => void;
}>({
  pref: { entidad: 'Municipalidad', acento: '#1F3A5F', densidad: 'Normal', tema: 'claro', ejercicio: '2026' },
  fijar: () => {},
  toast: () => {},
  ir: () => {},
});

export const usarPreferencias = () => useContext(PreferenciasCtx);

/** El importe en soles, con el separador de miles que usa el país. */
export const soles = (n: number) =>
  'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Un entero con separador de miles: conteos, no dinero. */
export const miles = (n: number) => Number(n).toLocaleString('es-PE');

/** El porcentaje con un decimal. */
export const pct = (n: number) => n.toFixed(1).replace('.', ',') + ' %';
