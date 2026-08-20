import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { datosDe, desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Inicio (#81): las dos opciones que cierran el sistema, y las mas distintas
 * entre si de las 134.
 *
 * El panel resume once modulos; el portal es **el unico flujo publico**, el que
 * usa quien no conoce el sistema, una vez al ano, desde un movil con red mala
 * (FRO-03 §6).
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('el panel no calcula nada: lo calcula el servidor', () => {
  it('cada indicador se ve exactamente como lo redacto el backend', async () => {
    montarEnRuta('/inicio/inicio');
    await screen.findByText('Recaudado 2026');

    const servidos = new Set((datosDe('inicio')?.kpis ?? []).map((kpi) => kpi.value));
    const enPantalla = [...document.querySelectorAll('.sgtm-kpis__tarjeta')]
      .map((tarjeta) => tarjeta.querySelector('.sgtm-indicador__valor')?.textContent?.trim())
      .filter((valor): valor is string => valor !== undefined && valor !== '');

    expect(enPantalla.length).toBeGreaterThan(0);
    // «S/ 18.42 M» y «73,4 %» son texto redactado por el servidor (RNF-080). La
    // interfaz no promedia, no suma y no calcula porcentajes de avance: si lo
    // hiciera, habria dos verdades sobre lo recaudado y ninguna sustentable.
    for (const valor of enPantalla) expect(servidos).toContain(valor);
  });

  it('el avance de cada linea es el que manda el servidor, no uno deducido', async () => {
    montarEnRuta('/inicio/inicio');
    await screen.findByText('Recaudado 2026');

    const barras = await screen.findAllByRole('img', { name: /Avance \d+ %/ });
    const servidos = new Set(
      (datosDe('inicio')?.paneles ?? []).flatMap((panel) =>
        panel.rows.map((fila) => `Avance ${fila.pct} %`),
      ),
    );

    expect(barras.length).toBeGreaterThan(0);
    for (const barra of barras) {
      expect(servidos).toContain(barra.getAttribute('aria-label'));
    }
  });

  it('y dice a que fecha estan sus cifras', async () => {
    montarEnRuta('/inicio/inicio');
    await screen.findByText('Recaudado 2026');

    // Un panel sin fecha de corte es un panel que miente en cuanto pasa un dia.
    expect(screen.getByText(/Cifras actualizadas al/)).toBeInTheDocument();
  });
});

describe('el portal es de quien no conoce el sistema', () => {
  it('sus pasos se ven al abrirlo, sin tener que buscarlos', async () => {
    montarEnRuta('/inicio/portal');
    await waitFor(() => expect(document.querySelector('.sgtm-pasos')).not.toBeNull());

    const pasos = document.querySelector('.sgtm-pasos');
    expect(pasos).not.toBeNull();
    // Cinco pasos: identificarse, ver la deuda, elegir que pagar, pagar y
    // descargar la constancia. Quien entra una vez al ano necesita ver el
    // camino entero antes de empezarlo.
    expect(within(pasos as HTMLElement).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('no ofrece ninguna accion de funcionario', async () => {
    montarEnRuta('/inicio/portal');
    await waitFor(() => expect(document.querySelector('.sgtm-pasos')).not.toBeNull());

    // El portal no escribe nada del backoffice: ni anula, ni emite, ni da de
    // baja. Lo que hace el ciudadano es consultar y pagar lo suyo.
    const acciones = [...document.querySelectorAll('.sgtm-acciones .sgtm-boton')].map(
      (boton) => boton.textContent ?? '',
    );
    expect(acciones.filter((t) => /anular|emitir|dar de baja|transferir/i.test(t))).toEqual([]);
  });
});
