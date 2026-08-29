import type { ComposicionDeOpcion } from '../composicion';

/**
 * Tesorería compone alrededor de los bloques comunes (#74, esta pasada).
 *
 * `caja_tributaria` es la única: su catálogo no declara `filtros` —el
 * prototipo no le dibuja una barra de búsqueda, solo el formulario de
 * cobranza— y sin uno, `Filtros` nunca se dibuja: el «Cód. Contribuyente» de
 * la pantalla se ve, sale de solo lectura para siempre y «Cargar deudas» se
 * queda apagado. `caja_tributaria` lee `consulta_deuda`
 * (`pantallas/tesoreria/index.ts`, igual que `baja_deuda`), así que la
 * grilla sí sabe qué hacer con `codContribuyente` una vez que llega: lo único
 * que faltaba era el control para escribirlo.
 */
export const COMPOSICION_DE_TESORERIA: Readonly<Record<string, ComposicionDeOpcion>> = {
  caja_tributaria: {
    filtrosPropios: [{ clave: 'codContribuyente', label: 'Cód. Contribuyente', t: 'text' }],
  },
};
