import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { cifrasEnPantalla, cifrasServidas } from '../../pruebas/cifras';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Transito (#77): el modulo mas grande del menu, y **trece reportes**.
 *
 * La tentacion de este modulo es escribir trece pantallas de reporte. Lo que
 * hay es **un** bloque de hoja parametrizado al que se le conectan trece
 * operaciones, y eso no es una preferencia de estilo: trece copias divergen a
 * la primera correccion, y la hoja que sale de la municipalidad con firma no
 * puede depender de cual de las trece se toco por ultima vez (RNF-081,
 * RNF-084).
 *
 * Ninguno de sus endpoints existe todavia. Lo que se comprueba es lo que la
 * interfaz ya tiene que garantizar: que las hojas son la misma hoja, que la
 * interfaz no se imprime, y que **ninguna cifra de la papeleta se recompone**.
 */

/** Las seis pantallas del modulo que son hoja de reporte. */
const HOJAS: readonly string[] = [
  'transito-record-conductor',
  'transito-record-vehicular',
  'transito-constancia-libre',
  'transito-papeleta-reporte',
  'transito-rg-ordinaria',
  'transito-rg-sancionadora',
];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('las trece hojas son la misma hoja', () => {
  it.each(HOJAS)('%s se dibuja con el bloque de hoja compartido', async (ranura) => {
    const montada = montarEnRuta(`/transito/${ranura}`);
    await dibujada('[data-hoja="1"]');

    const hoja = document.querySelector('[data-hoja="1"]');
    expect(hoja).not.toBeNull();

    // Las dos lineas de firma son lo que convierte la hoja en un documento, y
    // las trae el bloque: si una pantalla tuviera su propia copia, podria
    // perderlas sin que nadie se enterara.
    const firmas = hoja?.querySelector('.sgtm-hoja__firmas');
    expect(firmas?.textContent).toContain('Contribuyente');

    montada.unmount();
  });

  it.each(HOJAS)('%s no imprime la barra de acciones', async (ranura) => {
    const montada = montarEnRuta(`/transito/${ranura}`);
    await dibujada('[data-hoja="1"]');

    // Lo que no es la hoja va marcado, y la regla de impresion lo esconde. Sin
    // la marca, el papel que sale de la municipalidad lleva botones dibujados.
    const botones = document.querySelector('.sgtm-hoja__botones');
    expect(botones).not.toBeNull();
    expect(botones?.getAttribute('data-no-imprimible')).toBe('1');

    montada.unmount();
  });
});

describe('la papeleta muestra su desglose guardado, no uno recalculado', () => {
  it('cada cifra que se ve esta tal cual en lo que sirvio la API', async () => {
    montarEnRuta('/transito/papeletas');
    // Se espera a una **fila con datos**, no a que exista la tabla: la tabla
    // existe desde el catalogo, con su esqueleto, y esperar a ella dejaria la
    // comprobacion mirando celdas vacias (#76).
    await screen.findAllByText('MPS-2026-041182');

    const servidas = cifrasServidas('papeletas');
    const enPantalla = cifrasEnPantalla();

    expect(enPantalla.length).toBeGreaterThan(0);
    // El importe se determino el dia de la infraccion con los parametros de ese
    // dia. Recalcularlo al mostrar es el error clasico de este modulo: la
    // papeleta dejaria de decir lo que dice el documento que se notifico.
    for (const cifra of enPantalla) expect(servidas).toContain(cifra);
  });
});

describe('el cambio de numero es la unica correccion permitida', () => {
  it('exige observacion, como cualquier otra escritura', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/transito/transito-cambio-numero');
    await dibujada('.sgtm-acciones');

    const acciones = document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton');
    const primaria = acciones[acciones.length - 1];
    expect(primaria).toBeDefined();
    if (!primaria) return;
    expect(primaria.disabled).toBe(true);

    const caja = await screen.findByRole('region', { name: 'Observación del usuario' });
    await usuario.type(within(caja).getByLabelText('Observación'), 'Error de tipeo en el número.');
    await waitFor(() => expect(primaria.disabled).toBe(false));
  });
});
