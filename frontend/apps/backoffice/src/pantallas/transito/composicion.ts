import type { ComposicionDeOpcion } from '../composicion';

/**
 * Lo que Tránsito compone alrededor de los bloques comunes (#398).
 *
 * Cinco negaciones, y todas del mismo tipo: **filtros que la pantalla dibuja y
 * no manda**. Los dos resúmenes que #398 conecta traen cada uno un desplegable
 * que el backend no puede honrar —o que la tabla del catálogo no puede
 * dibujar—, y hasta ahora estaban **vivos**: elegir cualquier cosa en ellos
 * cambiaba la URL y, contra el backend de verdad, o devolvía una tabla cuyas
 * filas no se distinguen o dejaba la consulta en 422. No lo veía ninguna prueba
 * porque el proxy de datos ignora los filtros, así que el camino completo solo
 * se recorre contra el backend real. Es el mismo hueco exacto que
 * `consulta_fichas.conciliadaConRentas` (#322) y `consulta_resumen_predial.palabra`
 * (#25, #72).
 *
 * Se **bloquean y no se quitan**: el rótulo del prototipo se conserva (RNF-080),
 * y un filtro que desaparece deja a quien lo buscaba pensando que se ha roto
 * algo. Aquí va la declaración; la redacción del motivo vive en
 * `prosa-textos.ts`, y `prosa.test.ts` exige que las dos listas digan lo mismo.
 */
export const COMPOSICION_DE_TRANSITO: Readonly<Record<string, ComposicionDeOpcion>> = {
  transito_resumen_papeletas: {
    filtrosBloqueados: ['agrupadoPor', 'cobranza'],
  },
  transito_resumen_recaudacion: {
    filtrosBloqueados: ['agrupadoPor', 'tipoDeCobranza', 'caja'],
  },
};
