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
  toast: (t: string) => void;
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
