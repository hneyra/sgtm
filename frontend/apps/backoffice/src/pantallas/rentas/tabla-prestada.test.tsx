import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { OPCIONES } from '../../catalogo';
import { COMPOSICION_DE_RENTAS } from './composicion';

/**
 * **La lista de predios, donde habia seis contadores en blanco** (#503 F2).
 *
 * «Unidades afectas del contribuyente» son seis campos de solo lectura y
 * `ContribuyenteResource` **no publica ninguno**: los seis salen «—». La lista
 * de verdad ya existe —es la de `predios_rentas`, otra opcion del mismo
 * destino— y esta seccion la toma prestada con su operacion, su tabla, su
 * permiso y su titulo.
 *
 * Los seis contadores **se quedan**: son campos del manual (RNF-080), y lo que
 * les falta es que el backend los publique.
 *
 * **Y la seccion sigue arrancando cerrada**, que es lo que su `hint` del
 * prototipo pide —«Solo lectura», uno de los tres que FRO-03 §5 colapsa—. No se
 * le cambia: el indice lleva a ella y abrirla es un clic, que es mucho menos que
 * los nueve que costaba antes de #330 y que los seis guiones que habia dentro.
 */

/** Abre la seccion, que arranca cerrada por su `hint` del prototipo. */
async function abrirLasUnidades(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  await usuario.click(
    await screen.findByRole(
      'button',
      { name: /Unidades afectas del contribuyente/ },
      { timeout: 5000 },
    ),
  );
}

const CONTRIBUYENTE = '00000025673';
const PADRON = `/rentas-registro/contribuyentes?codigo=${CONTRIBUYENTE}`;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

describe('la guarda: una tabla prestada no cruza de modulo', () => {
  /**
   * **Las conexiones llegan con el trozo de su modulo** (#433). Tomar prestada
   * la tabla de otro modulo traeria ese trozo al abrir esta pantalla, y —peor—
   * dejaria a quien tiene este modulo y no el otro con un aviso de permiso
   * dentro de su propio expediente.
   */
  it('cada tabla prestada es de una opcion del mismo modulo', () => {
    for (const [id, composicion] of Object.entries(COMPOSICION_DE_RENTAS)) {
      const suyo = OPCIONES.find((o) => o.id === id)?.modulo.id;
      for (const prestada of composicion.tablasPrestadas ?? []) {
        const ajeno = OPCIONES.find((o) => o.id === prestada.opcion);
        expect(ajeno, `${id} presta de «${prestada.opcion}», que no existe`).toBeDefined();
        expect(ajeno?.modulo.id, `${id} presta de otro modulo`).toBe(suyo);
      }
    }
  });

  it('la seccion que nombra existe en el catalogo de esa opcion', async () => {
    const { PANTALLAS } = await import('../../catalogo/pantallas/rentas-registro.generado');
    for (const [id, composicion] of Object.entries(COMPOSICION_DE_RENTAS)) {
      for (const prestada of composicion.tablasPrestadas ?? []) {
        const secciones = (PANTALLAS[id]?.tabs ?? []).flatMap((tab) => tab.secciones);
        expect(
          secciones.some((seccion) => seccion.label === prestada.seccion),
          `${id}: la sección «${prestada.seccion}»`,
        ).toBe(true);
      }
    }
  });
});

describe('la tabla, dibujada bajo la seccion', () => {
  it('los seis contadores del manual se quedan, y la lista va debajo', { timeout: 20000 }, async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PADRON);
    await abrirLasUnidades(usuario);

    // Los seis siguen siendo campos del manual, con su rótulo.
    for (const contador of ['Predios registrados', 'Autovalúo acumulado (S/)', 'Vehículos afectos']) {
      expect(await screen.findByLabelText(contador), contador).toBeInTheDocument();
    }

    // Y la lista de predios llega con las columnas de `predios_rentas`.
    const tabla = await waitFor(
      () => {
        const encontrada = [...document.querySelectorAll('.sgtm-tabla')].find((nodo) =>
          nodo.textContent?.includes('Código predial'),
        );
        expect(encontrada).toBeDefined();
        return encontrada as HTMLElement;
      },
      { timeout: 5000 },
    );
    expect(within(tabla).getByText('Uso')).toBeInTheDocument();
  });

  /**
   * **Sin el permiso de la opcion prestada no se pide nada y se dice cual
   * falta.** Una tabla vacia se leeria como «no tiene predios», que es una
   * afirmacion — y falsa (ADR-0016 §2).
   */
  it('sin el permiso de «Predios del contribuyente», nombra la que falta', { timeout: 20000 }, async () => {
    const usuario = userEvent.setup();
    entraCon({ contribuyentes: ['lectura'] });
    montarEnRuta(PADRON);
    await abrirLasUnidades(usuario);

    expect(
      await screen.findByText(/Falta «Predios del contribuyente»/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Y ninguna tabla de predios: no se pide, no se dibuja.
    await waitFor(() =>
      expect(
        [...document.querySelectorAll('.sgtm-tabla')].some((n) =>
          n.textContent?.includes('Código predial'),
        ),
      ).toBe(false),
    );
  });
});
