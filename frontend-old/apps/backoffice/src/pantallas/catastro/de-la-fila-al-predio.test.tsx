import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';

/**
 * **De la fila al predio, en un clic** (#498, artboard de «Predios»).
 *
 * Ahí la fila entera es pulsable y abre la ficha. Aquí es un enlace en su
 * propia celda: es lo mismo para el ratón, y además se alcanza con el tabulador
 * y anuncia a dónde lleva (RNF-082). Sin él, ir de la búsqueda a la ficha era
 * copiar a mano un código de veintitrés dígitos que la fila ya tiene delante.
 *
 * Ésta es **la una de quince** que la regla de `accionDeFila` nombra: de las
 * pantallas que abren un registro y traen tabla, la primera columna es ese
 * registro sólo aquí. Por eso se declara por opción y no se cablea en la tabla.
 */

const CONSULTA = '/catastro/consulta-fichas';

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});
afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

const primeraFila = async () => {
  const tabla = await screen.findByRole('table');
  const filas = within(tabla).getAllByRole('row');
  return within(filas[1] as HTMLElement);
};

describe('la búsqueda lleva al predio sin teclear su código', () => {
  it('cada fila enlaza a su ficha, con el código que la fila trae', async () => {
    montarEnRuta(CONSULTA);

    const fila = await primeraFila();
    const enlace = await waitFor(() => fila.getByRole('link', { name: /Abrir el predio/ }));
    // La ficha urbana, que es la que se abre por el código de referencia.
    expect(enlace.getAttribute('href')).toMatch(/^\/catastro\/ficha-urbana\/\d+$/);
  });

  it('y seguirlo abre esa ficha, no otra', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CONSULTA);

    const fila = await primeraFila();
    const enlace = await waitFor(() => fila.getByRole('link', { name: /Abrir el predio/ }));
    const codigo = (enlace.getAttribute('href') ?? '').split('/').pop();

    await usuario.click(enlace);

    // La ficha del predio que decía la fila, resumida arriba.
    const resumen = await screen.findByRole('region', { name: 'Resumen de la ficha' });
    expect(codigo).toBeTruthy();
    /* El identificador de la cabecera, que sale **troquelado** —«20-06-01-…»—:
       se compara por sus dígitos, que es lo que viajó en la ruta. */
    const identificador = resumen.querySelector('.sgtm-resumen__codigo')?.textContent ?? '';
    expect(identificador.replace(/\D/g, '')).toBe(codigo);
  });

  /**
   * El destino trae **su permiso**: quien puede consultar el padrón pero no ver
   * una ficha no recibe un enlace a un aviso de «no tienes permiso» (REQ-03 §5).
   */
  it('quien no puede ver la ficha no ve el enlace', async () => {
    entraCon({ consulta_fichas: ['lectura'] });
    montarEnRuta(CONSULTA);

    const fila = await primeraFila();
    await waitFor(() => expect(fila.queryAllByRole('link').length).toBe(0));
  });
});
