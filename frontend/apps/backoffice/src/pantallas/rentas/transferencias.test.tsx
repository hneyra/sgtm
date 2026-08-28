import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';

/**
 * **Las dos transferencias, conectadas** (#73).
 *
 * `TransferenciaPredioController` y `TransferenciaVehiculoController` exigen
 * `valorTransferencia`, y ninguna de las dos pantallas del manual dibuja un
 * campo para él. La salida no fue declarar un campo que nadie puede escribir
 * —eso habría dejado la primaria apagada para siempre, como documentaba la
 * versión anterior de este archivo—: es un resolutor (`rentas/composicion.ts`,
 * `ResolutorDeTransferencia.tsx`) que **añade** el campo, con su propia
 * etiqueta, dentro de un control que ya sustituía a otro. En «Transferencia de
 * predio» va junto a la búsqueda del predio, porque los dos son el mismo
 * gesto; en «Transferencia de vehículo», junto a «Transferente — documento»,
 * un campo que sigue sin llegar a ningún sitio —el transferente lo resuelve el
 * backend del titular vigente— y que se sigue dibujando igual que antes.
 *
 * Lo que se comprueba aquí:
 *
 * 1. **El cuerpo lleva solo lo que la lista blanca declara**, con el predio
 *    resuelto como número y el valor tal como el backend lo lee.
 * 2. **Sin predio, sin valor o con un valor que no es cifra, la primaria se
 *    queda apagada y dice por qué** (#332): ninguna de las tres guardas es
 *    adorno.
 * 3. **Registrar una transferencia se confirma** (regla 4): no se deshace.
 * 4. **El campo que sustituye sigue diciendo lo que decía**: RNF-080 no se
 *    rompe por añadir un campo nuevo al lado.
 */

/** El código catastral que el juego de datos del prototipo resuelve. */
const CODIGO = '200601010150010101001';

const original = globalThis.fetch;
let escrituras: { url: string; cuerpo: string }[] = [];

/** El proxy sigue sirviendo las lecturas; solo se intercepta el `POST` del acto. */
function seEspiaElActo(): void {
  escrituras = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if ((opciones?.method ?? 'GET') === 'POST' && url.includes('/rentas/transferencias/')) {
      escrituras.push({ url, cuerpo: typeof opciones?.body === 'string' ? opciones.body : '' });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 501,
            objeto: url.includes('/predio') ? 'PREDIO' : 'VEHICULO',
            transferenteId: 1,
            adquirienteId: 2,
            tipoTransferencia: 'COMPRA-VENTA',
            fechaTransferencia: '2026-07-18',
            valorTransferencia: { importe: '95000.00', actualizadoA: '2026-07-18' },
            porcentajeTransferido: '100.00',
            afectaAlcabala: false,
            documentoOrigen: 'EP-2218-2026',
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    return proxy(entrada, opciones);
  };
}

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  globalThis.fetch = original;
});

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

/** Busca el predio por su código y elige el único candidato que ofrezca la lista. */
async function elegirElPredio(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  // El resolutor llega perezoso (`lazy`), así que el campo no está en el
  // primer dibujo: hay que esperarlo, no darlo por hecho con `getBy`.
  await usuario.type(await screen.findByLabelText('Código predial'), CODIGO);
  await usuario.click(await screen.findByRole('button', { name: new RegExp(CODIGO) }));
  await screen.findByRole('button', { name: 'Cambiar el predio resuelto' });
}

describe('transferencia de predio: el predio y el valor los llena el resolutor', () => {
  const RUTA = '/rentas-registro/transferencia-predio';

  it('sin predio resuelto, la primaria dice que falta y no se puede pulsar', async () => {
    montarEnRuta(RUTA);
    await screen.findByLabelText('Código predial');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta el predio/);
    expect(motivoDeLaPrimaria()).toMatch(/Código predial/);
  });

  it('con el predio resuelto y sin valor, sigue apagada y dice qué falta', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegirElPredio(usuario);

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta el valor de la transferencia/);
  });

  it('un valor con separador de miles no llega como cifra, y se dice sin nombrar el contrato', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await elegirElPredio(usuario);
    await usuario.type(screen.getByLabelText('Valor de transferencia (S/)'), '95,000.00');

    const motivo = motivoDeLaPrimaria() ?? '';
    expect(motivo).toMatch(/no llegó como cifra/);
    expect(motivo).not.toMatch(/backend|BigDecimal|contrato/i);
  });

  /**
   * **El campo al que sustituye no cambia de significado** (RNF-080): «Código
   * predial» sigue siendo la búsqueda del predio, y el valor de la
   * transferencia tiene su propia etiqueta, no la de otro campo.
   */
  it('el rótulo del campo sustituido no cambia; el valor lleva el suyo propio', async () => {
    montarEnRuta(RUTA);
    expect(await screen.findByLabelText('Código predial')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor de transferencia (S/)')).toBeInTheDocument();
  });

  it('con todo puesto y observación, la primaria se habilita y pide confirmación al pulsarla', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    seEspiaElActo();
    await elegirElPredio(usuario);

    await usuario.type(screen.getByLabelText('Valor de transferencia (S/)'), '95000.00');
    await usuario.selectOptions(screen.getByLabelText('Tipo de acto'), 'COMPRA-VENTA');
    await usuario.type(screen.getByLabelText('Fecha del acto'), '2026-07-18');
    await usuario.type(screen.getByLabelText('Nº de minuta / escritura'), 'EP-2218-2026');
    await usuario.type(screen.getByLabelText('% transferido'), '100.00');
    await usuario.type(screen.getByLabelText('Transferente — documento'), '44218937');
    await usuario.type(screen.getByLabelText('Adquirente — documento'), '02718844');
    await usuario.type(await observacion(), 'Compraventa registrada con minuta EP-2218-2026.');

    const primaria = await screen.findByRole('button', { name: 'Registrar transferencia' });
    await waitFor(() => primariaEncendida(primaria));

    await usuario.click(primaria);
    // Registrar una transferencia no se deshace (regla 4): se confirma
    // diciendo que va a pasar, no preguntando si se está seguro.
    const aviso = await screen.findByText(/y eso no se deshace/);
    expect(aviso.textContent?.toLowerCase()).toContain('registrar transferencia');
    expect(escrituras).toHaveLength(0);

    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    const cuerpo = JSON.parse(escrituras[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo).toEqual({
      // El identificador interno, como número: `PeticionDeTransferenciaPredio`
      // lo declara `Long`.
      predioId: 1,
      codTransferente: '44218937',
      codAdquiriente: '02718844',
      tipoTransferencia: 'COMPRA-VENTA',
      fechaTransferencia: '2026-07-18',
      // El importe, tal como `new BigDecimal` lo lee: sin separador de miles.
      valorTransferencia: '95000.00',
      porcentajeTransferido: '100.00',
      documentoOrigen: 'EP-2218-2026',
      observacion: 'Compraventa registrada con minuta EP-2218-2026.',
    });
    // Ni el código catastral tecleado —el backend no lo sabe leer—, ni
    // `afectaAlcabala`: la casilla no viaja (`CampoDelCuerpo` no manda
    // booleanos), y el controlador ya trata su ausencia como «no marcada».
    expect(JSON.stringify(cuerpo)).not.toContain(CODIGO);
    expect(cuerpo).not.toHaveProperty('afectaAlcabala');
  });
});

describe('transferencia de vehículo: solo el valor, sin identificador que resolver', () => {
  const RUTA = '/rentas-registro/transferencia-vehiculo';

  it('sin valor, la primaria dice que falta junto al campo que lo sustituye', async () => {
    montarEnRuta(RUTA);
    await screen.findByLabelText('Placa');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta la placa/);

    await userEvent.setup().type(screen.getByLabelText('Placa'), 'ABC-123');
    expect(motivoDeLaPrimaria()).toMatch(/Falta el valor de la transferencia/);
    expect(motivoDeLaPrimaria()).toMatch(/Transferente — documento/);
  });

  /**
   * **El campo al que se cuelga sigue dibujándose tal cual**: no escribible,
   * porque no lo era antes de declararse aquí —ninguna de las dos peticiones
   * de transferencia acepta `codTransferente` para un vehículo—.
   */
  it('«Transferente — documento» sigue sin poder escribirse', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    const campo = await screen.findByLabelText('Transferente — documento');
    expect(campo).toHaveAttribute('readonly');
    await usuario.type(campo, '44218937');
    expect(campo).toHaveValue('');
  });

  it('con todo puesto, registra sin `codTransferente` ni `vehiculoId`', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    seEspiaElActo();

    // El resolutor llega perezoso (`lazy`): se espera su campo antes de tocar
    // el resto del formulario.
    await usuario.type(await screen.findByLabelText('Valor de transferencia (S/)'), '18500.00');
    await usuario.type(screen.getByLabelText('Placa'), 'ABC-123');
    await usuario.type(screen.getByLabelText('Fecha de transferencia'), '2026-07-18');
    await usuario.selectOptions(screen.getByLabelText('Tipo de acto'), 'COMPRA-VENTA');
    await usuario.type(screen.getByLabelText('Nº del documento'), 'PR-0044-2026');
    await usuario.type(screen.getByLabelText('Adquirente — documento'), '02718844');
    await usuario.type(await observacion(), 'Venta de vehículo con parte registral PR-0044-2026.');

    const primaria = await screen.findByRole('button', { name: 'Registrar transferencia' });
    await waitFor(() => primariaEncendida(primaria));
    await usuario.click(primaria);
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    const cuerpo = JSON.parse(escrituras[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo).toEqual({
      placa: 'ABC-123',
      fechaTransferencia: '2026-07-18',
      tipoTransferencia: 'COMPRA-VENTA',
      documentoOrigen: 'PR-0044-2026',
      codAdquiriente: '02718844',
      valorTransferencia: '18500.00',
      observacion: 'Venta de vehículo con parte registral PR-0044-2026.',
    });
    expect(cuerpo).not.toHaveProperty('codTransferente');
    expect(cuerpo).not.toHaveProperty('vehiculoId');
    expect(cuerpo).not.toHaveProperty('afectaAlcabala');
  });
});
