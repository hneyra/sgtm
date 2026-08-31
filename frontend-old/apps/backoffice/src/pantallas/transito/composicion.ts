import type { ComposicionDeOpcion } from '../composicion';

/**
 * Lo que Tránsito compone alrededor de los bloques comunes (#398, #422).
 *
 * Dos cosas. La primera, **el campo que el manual no dibuja y el acto exige**
 * (#422): ver `transito_descargos`, abajo. La segunda, cinco negaciones del
 * mismo tipo: **filtros que la pantalla dibuja y no manda**.
 *
 * Los dos resúmenes que #398 conecta traen cada uno un desplegable
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
  /**
   * **El número de expediente de mesa de partes**, que ninguna sección dibuja (#422).
   *
   * `DescargosController` lo exige —«el número con que entra por mesa de partes»— y la
   * única sección editable del catálogo lo dibuja `"ro"`: ése es el del descargo que se
   * está **consultando**, no el del escrito que se registra. El «Nº de expediente» de los
   * filtros es la misma cosa vista desde la búsqueda.
   *
   * Así que se añade uno, al final de «Solicitud», y **con su propia etiqueta** (RNF-080):
   * dos campos que dicen «Nº de expediente» en la misma pantalla no se distinguen ni con
   * lector ni sin él, y el que se teclea aquí es el de mesa de partes. Su clave es
   * `nDeExpedienteDeMesaDePartes` por lo mismo, y `escrituras.ts` la traduce a
   * `nDeExpediente`, que es como viaja.
   *
   * **Sin componente propio**, que es todo el punto del mecanismo: este dato no se busca
   * contra nada ni se compone —lo teclea quien atiende, leyéndolo del cargo del escrito—,
   * así que no hace falta más que declararlo. Los que sí hay que resolver contra una lista
   * real siguen en `ACTOS_SIN_CAMPO`, con su franja.
   */
  transito_descargos: {
    controles: [
      {
        campo: 'nDeExpedienteDeMesaDePartes',
        etiqueta: 'Nº de expediente de mesa de partes',
        tipo: 'text',
        ph: 'EXP-2026-004182',
        ayuda:
          'El número con que el escrito entró por mesa de partes. El de arriba es el del descargo que se está consultando.',
        seccion: 'Solicitud',
      },
    ],
  },

  transito_resumen_papeletas: {
    filtrosBloqueados: ['agrupadoPor', 'cobranza'],
  },
  transito_resumen_recaudacion: {
    filtrosBloqueados: ['agrupadoPor', 'tipoDeCobranza', 'caja'],
  },
};
