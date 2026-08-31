import type { ComposicionDeOpcion } from '../composicion';

/**
 * Lo que Consultas compone alrededor de los bloques comunes (#25, #72).
 *
 * Una sola cosa hoy, y es una negacion: **«Palabra» de la consulta resumen
 * predial se dibuja y no se manda**.
 *
 * `ResumenPredialController` lo rechaza con 422 en cuanto llega con cualquier
 * valor, y lo dice sin rodeos: es texto libre sin columna a la que apuntar, y la
 * unica forma de responderlo seria un `LIKE '%…%'` sobre direccion, codigo y
 * nombre de todo el padron —justo lo que el diseño de `FiltroDeFichas` descarta
 * por escrito, porque bajo RLS ese patron no llega nunca al indice—.
 *
 * Vivo, este campo era la unica forma de romper la busqueda desde la propia
 * pantalla: escribir en el y pulsar «Buscar» dejaba la consulta en 422. No lo
 * veia ninguna prueba porque el proxy de datos ignora los filtros, asi que el
 * camino completo solo se recorre contra el backend de verdad. Es el mismo hueco
 * exacto que `consulta_fichas.conciliadaConRentas` (#322).
 *
 * Se **bloquea y no se quita**: el rotulo del prototipo se conserva (RNF-080), y
 * un filtro que desaparece deja a quien lo buscaba pensando que se ha roto algo.
 * Aqui va la declaracion; la redaccion del motivo vive en `prosa-textos.ts`, y
 * `prosa.test.ts` exige que las dos listas digan lo mismo.
 */
export const COMPOSICION_DE_CONSULTAS: Readonly<Record<string, ComposicionDeOpcion>> = {
  consulta_resumen_predial: {
    filtrosBloqueados: ['palabra'],
  },
};
