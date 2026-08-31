import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { PANTALLAS } from '../../catalogo/pantallas/rentas-registro.generado';
import { COMPOSICION_DE_RENTAS } from './composicion';

/**
 * **Las seis determinaciones, una superficie de seis hojas** (#503 F3).
 *
 * #393 les dio la misma anatomia a cinco de ellas y las dejo siendo cinco
 * pantallas: pasar del calculo individual a la corrida masiva del mismo
 * ejercicio era volver al menu, y la franja de «la determinacion la hace el
 * servidor» se leia una vez por pantalla, como si fueran seis averias distintas
 * en vez de una causa.
 *
 * La tira las une **sin que ninguna pierda nada**: cada hoja conserva su id, su
 * ruta y su permiso, y el guardia de `Pantalla` sigue corriendo al entrar. Es el
 * mismo mecanismo con el que #442 C unio el alta y la baja de deuda, aplicado al
 * destino que mas pantallas tiene del modulo.
 */

const HOJAS = [
  'predial_individual',
  'predial_masivo',
  'arbitrios',
  'vehicular_calculo',
  'alcabala',
  'espectaculos',
] as const;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('las seis hojas se declaran igual, y son las seis del destino', () => {
  /**
   * **Las declaran todas con la misma lista.** Asi la tira se dibuja igual se
   * entre por donde se entre; con una que se olvidara, entrar por ella dejaria
   * a quien atiende sin la tira y sin saber que las otras cinco existen.
   */
  it('las seis declaran la misma superficie', () => {
    for (const hoja of HOJAS) {
      const superficie = COMPOSICION_DE_RENTAS[hoja]?.superficie;
      expect(superficie, `${hoja} declara superficie`).toBeDefined();
      expect(superficie?.titulo).toBe('Determinaciones');
      expect(superficie?.hojas, `hojas de ${hoja}`).toEqual([...HOJAS]);
    }
  });

  /**
   * Ninguna hoja de otra superficie se cuela: `alta_deuda` y `baja_deuda`
   * siguen siendo «Movimientos de deuda», que es otro destino y otro objeto.
   */
  it('la deuda sigue en su propia superficie', () => {
    for (const hoja of ['alta_deuda', 'baja_deuda']) {
      expect(COMPOSICION_DE_RENTAS[hoja]?.superficie?.titulo).toBe('Movimientos de deuda');
    }
  });

  /** Las seis son opciones del catalogo, con su ruta y su permiso. */
  it('las seis existen en el catalogo del modulo', () => {
    for (const hoja of HOJAS) expect(PANTALLAS[hoja], hoja).toBeDefined();
  });

  /**
   * **Espectaculos entra en la tira y no en la anatomia de #393.**
   * `DETERMINACION` le da a las otras cinco la cabecera-resumen que se diseño
   * para la emision del ejercicio, y espectaculos no la tuvo nunca: la tira une
   * pantallas, no les cambia lo que dibujan.
   */
  it('espectaculos no gana la cabecera-resumen al entrar en la tira', () => {
    expect(COMPOSICION_DE_RENTAS['espectaculos']?.resumen).toBeUndefined();
    expect(COMPOSICION_DE_RENTAS['predial_individual']?.resumen).toBeDefined();
  });
});

describe('la tira, dibujada', () => {
  it('desde el predial individual se llega a las otras cinco sin volver al menu', async () => {
    montarEnRuta('/rentas-registro/predial-individual');
    const tira = await screen.findByRole('tablist', { name: 'Hojas de Determinaciones' });

    const pestanas = within(tira).getAllByRole('tab');
    expect(pestanas.map((p) => p.textContent)).toEqual([
      'Cálculo individual del impuesto predial',
      'Cálculo masivo del impuesto predial',
      'Arbitrios municipales',
      'Cálculo del impuesto vehicular',
      'Impuesto de alcabala',
      'Espectáculos públicos no deportivos',
    ]);
    // El rotulo es el titulo del catalogo, sin reescribir (RNF-080).
    expect(pestanas[0]?.getAttribute('aria-selected')).toBe('true');
  });

  /**
   * **La busqueda viaja con el enlace.** Es lo que evita volver a teclear el
   * contribuyente al pasar del predial a los arbitrios, y lo que la hoja de
   * destino no declare como filtro lo ignora, igual que cualquier parametro de
   * mas.
   */
  it('el contribuyente tecleado viaja en el enlace de cada hoja', async () => {
    montarEnRuta('/rentas-registro/predial-individual?codContribuyente=00000025673');
    const tira = await screen.findByRole('tablist', { name: 'Hojas de Determinaciones' });

    // El enlace, y no la navegacion: la tira son enlaces a proposito —el de lo
    // que se esta mirando se puede compartir (FRO-04 §5)— y lo que hay que
    // medir es que la cola de la busqueda va dentro.
    expect(within(tira).getByRole('tab', { name: 'Arbitrios municipales' })).toHaveAttribute(
      'href',
      '/rentas-registro/arbitrios?codContribuyente=00000025673',
    );
    expect(
      within(tira).getByRole('tab', { name: 'Cálculo del impuesto vehicular' }),
    ).toHaveAttribute('href', '/rentas-registro/vehicular-calculo?codContribuyente=00000025673');
  });
});
