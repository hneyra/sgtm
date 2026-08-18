/**
 * Design system del SGTM — **Juris PE**.
 *
 * Hoy solo expone las preferencias que el prototipo declara como configurables
 * (FRO-02 §3) y la hoja de estilos con los tokens. Los componentes llegan con
 * la iteracion de interfaz: implementarlos antes de tener una pantalla que los
 * use produce componentes que nadie pidio.
 *
 * Hoja de estilos: `import '@sgtm/design-system/estilos.css'`.
 */

/**
 * Densidad de la interfaz. Cambia el alto de los items de navegacion
 * (8 | 10 | 13 px) y, con ella, cuanta informacion cabe sin desplazar.
 * Un cajero trabaja en compacta ocho horas al dia.
 */
export type Densidad = 'compacta' | 'normal' | 'amplia';

export const DENSIDADES: readonly Densidad[] = ['compacta', 'normal', 'amplia'];

/** Acentos institucionales que el prototipo ofrece (FRO-02 §2.1). */
export type Acento = 'navy' | 'tierra' | 'moss' | 'slate';

export const ACENTOS: Readonly<Record<Acento, string>> = {
  navy: '#1F3A5F',
  tierra: '#7C2D12',
  moss: '#1f5f3a',
  slate: '#444444',
};

/** Insignias de estado del prototipo. El mapeo desde `Tono` vive en FRO-02 §2.1. */
export type Insignia = 'ok' | 'warn' | 'bad';
