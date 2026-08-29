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

  /**
   * Y `cierre_caja` es la segunda, por el mismo motivo y con una consecuencia
   * mas (#423).
   *
   * Su catálogo tampoco declara `filtros` —el prototipo dibuja el turno ya
   * abierto, porque el cliente de escritorio sabía de qué caja y de qué cajero
   * era la sesión—, y aquí **la caja y el cajero son el sujeto de la pantalla
   * entera**: identifican el turno (`cierre_uq` de V3 lo hace único por caja,
   * cajero y fecha), el backend los exige en el cuerpo (`PeticionDeCierre`) y son
   * los dos parámetros con que `GET /tesoreria/recaudacion/avance` responde el
   * arqueo en vivo, que es lo que la pantalla llama «Cuadrar».
   *
   * Los dos campos que el catálogo dibuja con esos rótulos son `"ro"` y siguen
   * siéndolo: enseñan lo que el servidor encontró, no lo que se tecleó. El
   * mismo reparto que en `caja_tributaria` —donde «Cód. Contribuyente» se
   * pregunta arriba y la grilla la responde el backend—, y el mismo que
   * `EscrituraDeclarada.delFiltro` documenta para el cuerpo.
   */
  cierre_caja: {
    filtrosPropios: [
      { clave: 'caja', label: 'Caja', t: 'text' },
      { clave: 'cajero', label: 'Cajero', t: 'text' },
    ],
  },
};
