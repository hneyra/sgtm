import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * **La emision anual del predial, asentada** (#445 B1).
 *
 * `predial_masivo` es la primera de las cinco determinaciones que escribe de
 * verdad. Hasta #395 no tenia controlador; desde #395 y hasta aqui solo podia
 * **simular**, y su primaria «Ejecutar proceso» estaba apagada con la franja
 * `sin-declaracion` — la unica de las cuatro causas que pedia trabajo de este
 * lado y no del backend.
 *
 * Lo que estas pruebas fijan:
 *
 *   1. **el cuerpo lleva `simulacion: false`**, y es lo unico que separa mirar
 *      la cuenta de emitir deuda a todo un padron. Va por `constantes` porque no
 *      es un dato del expediente sino cual de las dos mitades de la operacion se
 *      pide, y el backend rechaza el nulo (`exigirSimulacion`)
 *   2. **la observacion viaja**, que es la regla 10 sobre la escritura mas
 *      grande del modulo
 *   3. **el alcance se traduce**: el manual ofrece cuatro y el sistema hace dos
 *   4. **lo que el sistema no hace se dice antes de pulsar**, no despues: las
 *      dos casillas que `rechazarLoQueNoHace` devuelve con un 422
 *   5. **un desplegable que enseña un valor no lo ha elegido**: la misma trampa
 *      que #342 cerro en `alta_deuda`
 */

const MASIVO = '/rentas-registro/predial-masivo';

interface Peticion {
  readonly url: string;
  readonly cuerpo: unknown;
}

let peticiones: Peticion[] = [];

function espiarLaRed(): void {
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada.toString();
    if (opciones?.method === 'POST' && url.includes('/predial/calculo-masivo')) {
      peticiones.push({
        url,
        cuerpo: typeof opciones.body === 'string' ? JSON.parse(opciones.body) : null,
      });
    }
    return original(entrada, opciones);
  };
}

beforeEach(() => {
  peticiones = [];
  instalarProxyDeDatos({ latencia: false });
  espiarLaRed();
});
afterEach(() => desinstalarProxyDeDatos());

const laSeccion = (): HTMLElement => {
  const rejilla = document.querySelector<HTMLElement>('.sgtm-seccion__rejilla');
  expect(rejilla, 'no hay seccion de parametros en la pantalla').not.toBeNull();
  return rejilla as HTMLElement;
};

const laPrimaria = (): HTMLButtonElement => {
  const boton = document.querySelector<HTMLButtonElement>('.sgtm-acciones .sgtm-boton--primario');
  expect(boton, 'no hay primaria en la barra').not.toBeNull();
  return boton as HTMLButtonElement;
};

/** La caja de la observacion: dentro de su bloque, para no chocar con el rotulo de la seccion. */
const laObservacion = (): HTMLElement => {
  const bloque = document.querySelector<HTMLElement>('.sgtm-escritura');
  expect(bloque, 'no hay bloque de observacion en la pantalla').not.toBeNull();
  return within(bloque as HTMLElement).getByLabelText('Observación');
};

/** La primaria se apaga con `aria-disabled`, nunca con `disabled`: un boton sin foco no se lee (RNF-082). */
const laPrimariaEstaApagada = (): boolean =>
  laPrimaria().getAttribute('aria-disabled') === 'true';

const elMotivo = (): string =>
  document.querySelector<HTMLElement>('.sgtm-acciones__motivo')?.textContent?.trim() ?? '';

async function abrir(): Promise<void> {
  montarEnRuta(MASIVO);
  await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());
}

/** Deja la corrida lista para asentarse: ejercicio, alcance y observacion. */
async function corridaValida(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  const seccion = laSeccion();
  await usuario.selectOptions(within(seccion).getByLabelText('Ejercicio a calcular'), '2026');
  await usuario.selectOptions(within(seccion).getByLabelText('Alcance'), 'TODO EL PADRÓN');
  await usuario.type(
    laObservacion(),
    'Emisión anual 2026, aprobada en sesión de concejo.',
  );
}

describe('la corrida del predial se asienta', () => {
  it('manda simulacion false, el alcance traducido y la observacion', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);

    expect(laPrimariaEstaApagada()).toBe(false);
    await usuario.click(laPrimaria());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.cuerpo).toMatchObject({
      simulacion: false,
      ejercicio: '2026',
      alcance: 'TODOS',
      observacion: 'Emisión anual 2026, aprobada en sesión de concejo.',
    });
  });

  it('no manda la UIT ni el derecho de emision, que no son suyos', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);
    await usuario.click(laPrimaria());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = peticiones[0]?.cuerpo as Record<string, unknown>;
    expect(Object.keys(cuerpo)).not.toContain('uitDelEjercicioS');
    expect(Object.keys(cuerpo)).not.toContain('derechoDeEmisionS');
    expect(Object.keys(cuerpo)).not.toContain('modalidad');
  });

  it('el sector «Todos» no viaja: no es un sector, es la ausencia de uno', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);
    await usuario.click(laPrimaria());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect((peticiones[0]?.cuerpo as Record<string, unknown>)['sector']).toBeUndefined();
  });

  it('con alcance por sector exige decir cual', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);
    await usuario.selectOptions(
      within(laSeccion()).getByLabelText('Alcance'),
      'POR SECTOR',
    );

    expect(laPrimariaEstaApagada()).toBe(true);
    expect(elMotivo()).toContain('hay que decir cuál');
    expect(peticiones).toHaveLength(0);
  });

  it('los dos alcances que el sistema no hace se dicen antes de pulsar', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);
    await usuario.selectOptions(
      within(laSeccion()).getByLabelText('Alcance'),
      'SOLO OBSERVADOS',
    );

    expect(laPrimariaEstaApagada()).toBe(true);
    expect(elMotivo()).toContain('SOLO OBSERVADOS');
    expect(peticiones).toHaveLength(0);
  });

  it('las dos casillas que el backend rechaza bloquean la primaria, no producen un 422', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);

    await usuario.click(within(laSeccion()).getByLabelText('Incluye arbitrios'));
    expect(laPrimariaEstaApagada()).toBe(true);
    expect(elMotivo()).toContain('Los arbitrios son otro tributo');

    await usuario.click(within(laSeccion()).getByLabelText('Incluye arbitrios'));
    await usuario.click(within(laSeccion()).getByLabelText('Genera cuponera PDF'));
    expect(laPrimariaEstaApagada()).toBe(true);
    expect(elMotivo()).toContain('La cuponera es un documento');
    expect(peticiones).toHaveLength(0);
  });

  it('el interruptor que el sistema si hace viaja como booleano', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await corridaValida(usuario);
    await usuario.click(within(laSeccion()).getByLabelText('Recalcula ya emitidos'));
    await usuario.click(laPrimaria());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect((peticiones[0]?.cuerpo as Record<string, unknown>)['recalculaYaEmitidos']).toBe(true);
  });

  it('el ejercicio abre en blanco, y sin elegirlo no se emite ningun padron', async () => {
    const usuario = userEvent.setup();
    await abrir();
    await usuario.type(laObservacion(), 'Emisión anual.');

    // Un `sel` escribible no enseña una eleccion que nadie hizo (revision de
    // #331). Aqui eso vale un padron entero: la primera opcion es 2026.
    expect(within(laSeccion()).getByLabelText<HTMLSelectElement>('Ejercicio a calcular').value).toBe(
      '',
    );
    expect(laPrimariaEstaApagada()).toBe(true);
    expect(elMotivo()).toContain('Elige el ejercicio');
  });

  it('la casilla que se pulsa se ve pulsada', async () => {
    const usuario = userEvent.setup();
    await abrir();
    const casilla = within(laSeccion()).getByLabelText<HTMLInputElement>('Incluye arbitrios');
    expect(casilla.checked).toBe(false);
    await usuario.click(casilla);
    // Sin esto la pantalla decia lo contrario de lo que iba a mandar: el
    // borrador guarda `'si'` y la casilla se dibujaba desmarcada.
    expect(within(laSeccion()).getByLabelText<HTMLInputElement>('Incluye arbitrios').checked).toBe(
      true,
    );
  });

  it('sin observacion no se asienta nada (regla 10)', async () => {
    const usuario = userEvent.setup();
    await abrir();
    const seccion = laSeccion();
    await usuario.selectOptions(within(seccion).getByLabelText('Ejercicio a calcular'), '2026');
    await usuario.selectOptions(within(seccion).getByLabelText('Alcance'), 'TODO EL PADRÓN');

    expect(laPrimariaEstaApagada()).toBe(true);
    expect(peticiones).toHaveLength(0);
  });
});
