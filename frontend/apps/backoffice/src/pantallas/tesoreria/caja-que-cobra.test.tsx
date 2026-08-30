import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';

/**
 * **La ventanilla cobra** (#430, RF-080, sobre #33).
 *
 * Es la única pantalla del sistema desde la que entra dinero, y la mitad de
 * abajo lleva probada desde #33 contra PostgreSQL real —la cobranza atómica, el
 * `FOR UPDATE` sobre la fila del turno, la numeración de la serie, el doble cobro
 * que sólo aparece con diez cajas y diez series—. Lo que faltaba era la de
 * arriba, y le faltaban **cuatro** cosas, no una: el medio de pago, la caja, el
 * cajero y las deudas que se cobran.
 *
 * Lo que se comprueba aquí son propiedades, no dibujo:
 *
 * 1. **El cuerpo lleva lo declarado y nada más.** `PeticionDeCobranza` es una
 *    lista blanca, y los trece campos que el catálogo dibuja y el backend no
 *    lee se quedan bloqueados —«Forma de pago» entre ellos, que es el *tipo de
 *    cobranza* y no el medio—.
 * 2. **La interfaz no suma.** La banda cuenta filas; el importe lo relee el
 *    libro a la fecha del pago (RNF-083, y el interés corre).
 * 3. **La cobranza es idempotente desde aquí**: dos envíos del mismo intento
 *    llevan la misma clave, porque para el servidor son **uno**. Regenerarla
 *    convertiría un reintento en un segundo cobro.
 * 4. **Sin observación no se cobra** (regla 10, RNF-052).
 */

/** La pantalla, con el contribuyente en el filtro: la caja cobra sobre su cuenta. */
const CAJA = '/tesoreria/caja-tributaria?codContribuyente=00000006550';

const original = globalThis.fetch;
let peticiones: { metodo: string; cuerpo: string; clave: string | null }[] = [];

afterEach(() => {
  globalThis.fetch = original;
  desinstalarProxyDeDatos();
});

/** Una obligación tal como la publica `ObligacionConDeudaResource` (#22). */
function obligacion(campos: {
  tributo: string;
  ejercicio: number;
  predioId?: number | null;
  vehiculoId?: number | null;
}): Readonly<Record<string, unknown>> {
  const importe = (valor: string) => ({ importe: valor, actualizadoA: '2026-08-13' });
  return {
    tributo: campos.tributo,
    ejercicio: campos.ejercicio,
    predioId: campos.predioId ?? null,
    vehiculoId: campos.vehiculoId ?? null,
    periodoDesde: 2,
    periodoHasta: 2,
    fase: 'ORDINARIA',
    deuda: {
      insoluto: importe('1842.60'),
      reajuste: importe('0.00'),
      interes: importe('84.12'),
      gasto: importe('0.00'),
      total: importe('1926.72'),
    },
  };
}

const LA_DEUDA = [
  obligacion({ tributo: 'PREDIAL', ejercicio: 2026, predioId: 41 }),
  obligacion({ tributo: 'VEHICULAR', ejercicio: 2025, vehiculoId: 7 }),
];

const pagina = (contenido: readonly Readonly<Record<string, unknown>>[]) => ({
  contenido,
  pagina: 0,
  tamano: contenido.length,
  totalElementos: contenido.length,
  totalPaginas: 1,
  hayMas: false,
});

/**
 * El proxy contesta lo que no sea la deuda ni el cobro; la prueba sirve la deuda
 * y **registra** el cobro.
 *
 * La deuda la sirve la prueba porque lo que importa aquí es que la fila lleve sus
 * cuatro identificadores —el juego de datos del prototipo no publica `predioId`
 * ni `vehiculoId`—, que es exactamente lo que el cuerpo necesita.
 */
function laApiResponde(estado = 201): void {
  peticiones = [];
  instalarProxyDeDatos({ latencia: false });
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const metodo = opciones?.method ?? 'GET';
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (metodo === 'GET') {
      if (url.includes('/consultas/deuda')) {
        return Promise.resolve(
          new Response(JSON.stringify(pagina(LA_DEUDA)), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    }
    const cabeceras = new Headers(opciones?.headers ?? {});
    peticiones.push({
      metodo,
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
      clave: cabeceras.get('Idempotency-Key'),
    });
    return Promise.resolve(
      new Response(JSON.stringify({ numero: '001-0000123' }), {
        status: estado,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

async function casillas(): Promise<HTMLInputElement[]> {
  await waitFor(() =>
    expect(document.querySelectorAll('.sgtm-tabla__casilla input').length).toBeGreaterThan(0),
  );
  return [...document.querySelectorAll<HTMLInputElement>('.sgtm-tabla__casilla input')];
}

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

const laSeccion = (titulo: string): ReturnType<typeof within> => {
  const seccion = screen.getByRole('heading', { name: titulo }).closest('section');
  expect(seccion).not.toBeNull();
  return within(seccion as HTMLElement);
};

/** El turno: los dos controles que ninguna sección del manual dibuja. */
async function elTurno(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  const datos = laSeccion('Forma de pago y beneficio');
  await usuario.selectOptions(datos.getByLabelText('Medio de pago'), 'EFECTIVO');
  await usuario.type(datos.getByLabelText('Caja'), 'C01');
  await usuario.type(datos.getByLabelText('Cajero'), 'jperez');
}

describe('la caja cobra: los tres controles que el manual no dibuja (#430)', () => {
  it('«Medio de pago» es un campo propio, y «Forma de pago» sigue siendo del manual', async () => {
    laApiResponde();
    montarEnRuta(CAJA);
    await screen.findByRole('button', { name: /^Cobrar deuda/ });

    const datos = laSeccion('Forma de pago y beneficio');
    // El añadido, con su etiqueta propia (RNF-080): dos cosas distintas no se
    // llaman igual en la misma pantalla.
    expect(datos.getByLabelText('Medio de pago')).not.toBeDisabled();
    expect(datos.getByLabelText('Caja')).not.toHaveAttribute('readonly');
    expect(datos.getByLabelText('Cajero')).not.toHaveAttribute('readonly');

    /* Y el del manual sigue dibujado y **bloqueado**: es el `tipoDePago` del
       backend, y de sus nueve opciones sólo dos llegarían a cobrar. Lo bloquea
       no declararlo, que es lo que `Formulario` hace con lo que no está en la
       lista blanca. */
    expect(datos.getByLabelText('Forma de pago')).toBeDisabled();
    expect(datos.getByLabelText('Beneficio aplicable')).toBeDisabled();
  });

  it('la banda cuenta las deudas elegidas y no suma ni una cifra', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta(CAJA);

    const [primera, segunda] = await casillas();
    const banda = (): string => document.querySelector('.sgtm-seleccion')?.textContent ?? '';
    expect(banda()).toContain('0 deudas elegidas');

    await usuario.click(primera as HTMLInputElement);
    expect(banda()).toContain('1 deuda elegida');
    await usuario.click(segunda as HTMLInputElement);
    expect(banda()).toContain('2 deudas elegidas');
    // Ni una cifra: el importe lo relee el libro a la fecha del pago (RNF-083).
    expect(banda()).not.toMatch(/\d+[.,]\d\d/);
  });

  it('sin lo que falta, la primaria lo dice en su orden y no manda nada', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta(CAJA);
    const [primera] = await casillas();

    // Con contribuyente y sin nada más: lo primero que falta es la deuda.
    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Marca al menos una deuda/);

    await usuario.click(primera as HTMLInputElement);
    expect(motivoDeLaPrimaria()).toMatch(/Falta el medio de pago/);

    const datos = laSeccion('Forma de pago y beneficio');
    await usuario.selectOptions(datos.getByLabelText('Medio de pago'), 'EFECTIVO');
    expect(motivoDeLaPrimaria()).toMatch(/Falta la caja/);

    await usuario.type(datos.getByLabelText('Caja'), 'C01');
    expect(motivoDeLaPrimaria()).toMatch(/Falta el cajero/);

    await usuario.type(datos.getByLabelText('Cajero'), 'jperez');
    // Y con todo puesto, lo único que queda es la observación (regla 10).
    primariaApagada();
    expect(peticiones).toHaveLength(0);
  });

  it('con todo relleno, el cuerpo lleva las cinco cosas declaradas y ninguna más', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta(CAJA);
    const [primera] = await casillas();

    await usuario.click(primera as HTMLInputElement);
    await elTurno(usuario);
    await usuario.type(await observacion(), 'Cobro en ventanilla, turno de la mañana.');

    primariaEncendida();
    await usuario.click(screen.getByRole('button', { name: /^Cobrar deuda/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      formaDePago: 'EFECTIVO',
      caja: 'C01',
      cajero: 'jperez',
      // Del filtro, que es donde la pantalla lo pregunta.
      codContribuyente: '00000006550',
      // La fila identifica la obligación, no la valora: el importe lo relee el
      // libro. `ejercicio` y `predioId` van como enteros, no como cadenas (#73).
      obligaciones: [{ tributo: 'PREDIAL', ejercicio: 2026, predioId: 41 }],
      observacion: 'Cobro en ventanilla, turno de la mañana.',
    });
  });

  /**
   * **Una clave por intento, no una por envío** (AC 4 de #430).
   *
   * Para el servidor los dos envíos del mismo intento son **uno**: reenviar con
   * otra clave sería cobrar dos veces al mismo contribuyente por la misma deuda,
   * que es justo lo que `recibo_idempotencia_uq` (V29) existe para impedir del
   * otro lado.
   */
  it('el reintento del mismo cobro manda la misma clave de idempotencia', async () => {
    const usuario = userEvent.setup();
    laApiResponde(503);
    montarEnRuta(CAJA);
    const [primera] = await casillas();

    await usuario.click(primera as HTMLInputElement);
    await elTurno(usuario);
    await usuario.type(await observacion(), 'Cobro en ventanilla.');

    await usuario.click(screen.getByRole('button', { name: /^Cobrar deuda/ }));
    await waitFor(() => expect(peticiones).toHaveLength(1));
    await usuario.click(screen.getByRole('button', { name: /^Cobrar deuda/ }));
    await waitFor(() => expect(peticiones).toHaveLength(2));

    expect(peticiones[0]?.clave).toBeTruthy();
    expect(peticiones[0]?.clave).toBe(peticiones[1]?.clave);
  });

  it('sin observación no se cobra, ni con todo lo demás puesto', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta(CAJA);
    const [primera] = await casillas();

    await usuario.click(primera as HTMLInputElement);
    await elTurno(usuario);

    primariaApagada();
    await usuario.click(screen.getByRole('button', { name: /^Cobrar deuda/ }));
    expect(peticiones).toHaveLength(0);
  });
});
