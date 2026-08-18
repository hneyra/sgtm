/**
 * Design system del SGTM — **Juris PE**.
 *
 * Expone las preferencias configurables del prototipo (FRO-02 §3), la hoja de
 * estilos con los tokens y los componentes que las 134 pantallas usan.
 *
 * **Sigue sin haber un componente que ninguna pantalla use**: el prototipo fija
 * las medidas exactas, y un componente escrito antes de su pantalla es un
 * componente que nadie pidio. Los de aqui salieron todos del renderizador.
 *
 * Hoja de estilos: `import '@sgtm/design-system/estilos.css'`.
 */

import type { Tono } from '@sgtm/dominio';
import type { TonoDeCelda } from '@sgtm/api-client';

export { Boton } from './componentes/Boton';
export type { BotonProps, VarianteDeBoton } from './componentes/Boton';
export { Insignia } from './componentes/Insignia';
export type { InsigniaProps } from './componentes/Insignia';
export { Importe } from './componentes/Importe';
export type { ImporteProps } from './componentes/Importe';
export { Indicador } from './componentes/Indicador';
export type { IndicadorProps } from './componentes/Indicador';
export { Esqueleto } from './componentes/Esqueleto';
export type { EsqueletoProps } from './componentes/Esqueleto';
export { Aviso } from './componentes/Aviso';
export type { AvisoProps } from './componentes/Aviso';
export { Icono, IconoDeModulo } from './componentes/Icono';
export type { IconoProps, IconoDeModuloProps, NombreDeIcono } from './componentes/Icono';
export { Campo } from './componentes/Campo';
export type { CampoProps, TipoDeCampo } from './componentes/Campo';

/**
 * Densidad de la interfaz. Cambia el alto de los items de navegacion
 * (8 | 10 | 13 px) y, con ella, cuanta informacion cabe sin desplazar.
 * Un cajero trabaja en compacta ocho horas al dia.
 */
export type Densidad = 'compacta' | 'normal' | 'amplia';

export const DENSIDADES: readonly Densidad[] = ['compacta', 'normal', 'amplia'];

/** Alto vertical de un item de navegacion, en pixeles, por densidad. */
export const PADDING_DE_NAVEGACION: Readonly<Record<Densidad, number>> = {
  compacta: 8,
  normal: 10,
  amplia: 13,
};

/** Acentos institucionales que el prototipo ofrece (FRO-02 §2.1). */
export type Acento = 'navy' | 'tierra' | 'moss' | 'slate';

export const ACENTOS: Readonly<Record<Acento, string>> = {
  navy: '#1F3A5F',
  tierra: '#7C2D12',
  moss: '#1f5f3a',
  slate: '#444444',
};

/** Hover del acento primario, en el mismo orden que `ACENTOS`. */
export const ACENTOS_HOVER: Readonly<Record<Acento, string>> = {
  navy: '#2a4d7a',
  tierra: '#963d1e',
  moss: '#2a734a',
  slate: '#5a5a5a',
};

/**
 * El prototipo pinta las insignias con tres nombres (`ok`, `warn`, `bad`) y la
 * API las manda asi en las celdas de tabla. El dominio tiene los suyos, en
 * castellano y con un cuarto para lo que no es ninguno de los tres. Esta es la
 * traduccion, y esta aqui porque es del design system (FRO-02 §2.1).
 */
export const TONO_DE_INSIGNIA: Readonly<Record<TonoDeCelda, Tono>> = {
  ok: 'ok',
  warn: 'atencion',
  bad: 'critico',
};
