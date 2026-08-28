import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria } from '../../pruebas/acciones';

/**
 * Baja de deuda: **la pantalla elige su fila** (#332, RF-044).
 *
 * Su catalogo dibuja una primera columna vacia desde el prototipo, y esa columna
 * es la obligacion que se extingue. Hasta ahora no era nada: para dar de baja
 * una cuota habia que volver a teclear a mano su ano, su cuota y su tributo al
 * lado de la tabla que ya los muestra —o, peor, pulsar «Dar de baja» y mandar
 * solo la observacion—.
 *
 * Tres cosas se comprueban aqui, y las tres son propiedades y no dibujo:
 *
 * 1. **La interfaz no suma.** La banda dice cuantas filas hay elegidas y quien
 *    pone el importe es el servidor (RNF-083). El total de una baja no es la
 *    suma de lo que se ve: el interes corre hasta la fecha del acto.
 * 2. **El cuerpo lleva exactamente la fila elegida, y solo sus columnas
 *    declaradas.** `unidad` y `totalS` estan en la tabla y no viajan.
 * 3. **La baja registra una obligacion por acto**, porque eso es lo que
 *    `MovimientosDeDeudaController.PeticionDeMovimiento` acepta. Con dos filas
 *    elegidas la accion no guarda, y lo dice: mandar la primera y callarse la
 *    segunda daria de baja una cuota y dejaria otra viva sin que nada lo dijera.
 */

/** La pantalla, con el contribuyente en el filtro: la baja es sobre su cuenta. */
const BAJA = '/rentas-registro/baja-deuda?codContribuyente=00000006550';

const original = globalThis.fetch;
let peticiones: { metodo: string; cuerpo: string }[] = [];

/** El proxy contesta la lectura; la escritura la intercepta la prueba. */
function laApiResponde(): void {
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const metodo = opciones?.method ?? 'GET';
    if (metodo === 'GET') return proxy(entrada, opciones);
    peticiones.push({
      metodo,
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return Promise.resolve(
      new Response(JSON.stringify({ sentido: 'BAJA' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  laApiResponde();
});
afterEach(() => {
  desinstalarProxyDeDatos();
  globalThis.fetch = original;
});

/** Las casillas de la tabla, en el orden de las filas. */
async function casillas(): Promise<HTMLInputElement[]> {
  await waitFor(() =>
    expect(document.querySelectorAll('.sgtm-tabla__casilla input').length).toBeGreaterThan(1),
  );
  return [...document.querySelectorAll<HTMLInputElement>('.sgtm-tabla__casilla input')];
}

/** El sustento que el backend exige: sin resolucion no se registra. */
async function sustento(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  const numero = screen.getByLabelText('Nº de resolución');
  await usuario.clear(numero);
  await usuario.type(numero, 'RGAT-0244-2026-MPS');
  const fecha = screen.getByLabelText('Fecha de resolución');
  await usuario.clear(fecha);
  await usuario.type(fecha, '2026-08-04');
}

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

describe('la tabla elige sus filas, y la banda las cuenta sin sumarlas', () => {
  it('la banda dice cuantas y **ninguna cifra**: el total lo pone el servidor', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera, segunda] = await casillas();
    expect(document.querySelector('.sgtm-seleccion')?.textContent).toContain('0 cuotas elegidas');

    await usuario.click(primera as HTMLInputElement);
    expect(document.querySelector('.sgtm-seleccion')?.textContent).toContain('1 cuota elegida');

    await usuario.click(segunda as HTMLInputElement);
    const texto = document.querySelector('.sgtm-seleccion')?.textContent ?? '';
    expect(texto).toContain('2 cuotas elegidas');
    // **Ni una cifra.** Sumar las dos columnas que tiene delante daria un total
    // que el backend no puede sustentar (RNF-083), y ademas seria el equivocado.
    expect(texto).not.toMatch(/\d+[.,]\d\d/);
    expect(texto).toMatch(/previsualización todavía no está disponible/);
  });

  it('la primaria dice sobre cuantas actua', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    expect(await screen.findByRole('button', { name: 'Dar de baja (0)' })).toBeInTheDocument();
    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(screen.getByRole('button', { name: 'Dar de baja (1)' })).toBeInTheDocument();
  });

  it('buscar otra vez vacia lo elegido: el indice 3 de la pagina nueva es otra cuota', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(document.querySelector('.sgtm-seleccion')?.textContent).toContain('1 cuota elegida');

    const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });
    await usuario.click(within(busqueda).getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(document.querySelector('.sgtm-seleccion')?.textContent).toContain('0 cuotas elegidas'),
    );
  });
});

describe('el motivo por el que todavia no se puede dar de baja se ve', () => {
  it('sin ninguna fila elegida, lo dice antes que la observacion', async () => {
    montarEnRuta(BAJA);
    await screen.findByRole('button', { name: 'Dar de baja (0)' });
    expect(motivoDeLaPrimaria()).toMatch(/Elige en la tabla la cuota/);
  });

  it('con la fila elegida y sin sustento, pide la resolucion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(motivoDeLaPrimaria()).toMatch(/Falta el documento que sustenta/);
  });

  it('con dos filas elegidas dice que la baja registra una obligacion por acto', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera, segunda] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await usuario.click(segunda as HTMLInputElement);

    expect(motivoDeLaPrimaria()).toMatch(/una obligación por acto/);
    expect(screen.getByRole('button', { name: 'Dar de baja (2)' })).toBeDisabled();
  });

  it('con todo puesto, la accion se habilita', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await sustento(usuario);
    await usuario.type(await observacion(), 'Prescripción declarada de oficio.');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Dar de baja (1)' })).toBeEnabled(),
    );
  });
});

describe('el cuerpo lleva la fila elegida, y solo lo que la lista blanca declara', () => {
  it('la fila viaja por columnas declaradas; `unidad` y el total se quedan fuera', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await sustento(usuario);
    await usuario.type(await observacion(), 'Prescripción declarada de oficio.');

    await usuario.click(screen.getByRole('button', { name: 'Dar de baja (1)' }));
    // Dar de baja no se deshace: se confirma diciendo que va a pasar (regla 4).
    const aviso = await screen.findByText(/y eso no se deshace/);
    expect(aviso.textContent).toContain('sobre 1 cuota');
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('POST');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      // Del filtro, porque la tabla no publica una columna con el titular: la
      // pantalla entera es de un contribuyente.
      codContribuyente: '00000006550',
      // «IMPUESTO PREDIAL» del prototipo, `PREDIAL` del dominio.
      tributo: 'PREDIAL',
      ano: '2026',
      // **No viaja `cuota`**, y esa ausencia es correcta: la fila es una
      // obligacion anual —periodo 0 en el libro—, que `ObligacionDeDeuda` escribe
      // «Anual». Un entero es entero entero: mandar el prefijo de un rango
      // («1 - 4» → 1) perderia tres cuotas en silencio, y el backend ya traduce
      // la cuota ausente a 0, que es «anual».
      insoluto: '1,842.60',
      interes: '84.12',
      // El sustento documental: sin el, `MovimientoDeDeuda` no se construye.
      documentoOrigen: 'RGAT-0244-2026-MPS',
      fechaValor: '2026-08-04',
      observacion: 'Prescripción declarada de oficio.',
    });
  });
});
