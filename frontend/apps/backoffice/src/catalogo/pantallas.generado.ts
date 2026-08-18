/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * Como se carga la estructura de cada modulo: un `import()` por modulo, que el
 * empaquetador convierte en un trozo aparte.
 *
 * Lo que viaja siempre es la navegacion —el menu, los titulos y los resumenes—;
 * la estructura de las pantallas llega al entrar en su modulo.
 */

import type { EstructuraDePantalla } from './tipos';

export type PantallasDeUnModulo = Readonly<Record<string, EstructuraDePantalla>>;

export const CARGADORES: Readonly<
  Record<string, () => Promise<{ readonly PANTALLAS: PantallasDeUnModulo }>>
> = {
  "inicio": () => import('./pantallas/inicio.generado'),
  "catastro": () => import('./pantallas/catastro.generado'),
  "rentas-registro": () => import('./pantallas/rentas-registro.generado'),
  "fiscalizacion": () => import('./pantallas/fiscalizacion.generado'),
  "transito": () => import('./pantallas/transito.generado'),
  "infracciones-administrativas": () => import('./pantallas/infracciones-administrativas.generado'),
  "tesoreria": () => import('./pantallas/tesoreria.generado'),
  "consultas": () => import('./pantallas/consultas.generado'),
  "valores": () => import('./pantallas/valores.generado'),
  "coactiva": () => import('./pantallas/coactiva.generado'),
  "autorizaciones-y-licencias": () => import('./pantallas/autorizaciones-y-licencias.generado'),
  "seguridad": () => import('./pantallas/seguridad.generado'),
};
