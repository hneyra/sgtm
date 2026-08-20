import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { esIrreversible } from '../escritura';
import type { Escritura } from '../escritura';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Valores (#75): **un valor emitido es un acto administrativo**.
 *
 * Sale de la municipalidad, se notifica y no se corrige: se anula. Ninguno de
 * sus seis endpoints existe todavia, asi que lo que se comprueba aqui es lo que
 * la interfaz tiene que hacer bien **antes** de que exista, porque despues ya
 * habria valores emitidos de por medio.
 */

/** Las seis opciones del modulo, por su ranura. */
const LAS_SEIS: readonly string[] = [
  'valores-individual',
  'valores-masivo',
  'valores-busqueda',
  'notificacion-valores',
  'prescripcion',
  'pase-coactiva',
];

const original = globalThis.fetch;
let peticiones = 0;

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = 0;
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    if ((opciones?.method ?? 'GET') !== 'GET') peticiones += 1;
    return proxy(entrada, opciones);
  };
});

afterEach(() => {
  desinstalarProxyDeDatos();
  globalThis.fetch = original;
});

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

const primaria = (): HTMLButtonElement => {
  const acciones = document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton');
  return acciones[acciones.length - 1] as HTMLButtonElement;
};

describe('en el SGTM no se borra: se anula (regla 4)', () => {
  it.each(LAS_SEIS)('%s no ofrece ninguna accion de borrar', async (ranura) => {
    const montada = montarEnRuta(`/valores/${ranura}`);
    await screen.findByRole('heading', { level: 1 });

    const acciones = screen.getAllByRole('button').map((b) => (b.textContent ?? '').trim());
    // «Anular», «Inactivar» y «Dar de baja» si; «Borrar» y «Eliminar» no. Lo
    // que se hace queda asentado, y corregirlo exige otro acto (RNF-051).
    expect(acciones.filter((t) => /borrar|eliminar|suprimir/i.test(t))).toEqual([]);

    montada.unmount();
  });

  it('anular es irreversible, y por eso se confirma', () => {
    // La lista de lo que no se deshace es la que decide si hay confirmacion.
    expect(esIrreversible('Anular valor')).toBe(true);
    expect(esIrreversible('Emitir valor')).toBe(true);
    expect(esIrreversible('Generar valores')).toBe(true);
    // Los tres que #75 nombra y que la lista no cubria: generar una tanda,
    // notificar —el acuse sostiene el plazo— y pasar a coactiva.
    expect(esIrreversible('Registrar notificación')).toBe(true);
    expect(esIrreversible('Derivar a coactiva')).toBe(true);
    // Y lo que si se deshace no molesta con una confirmacion.
    expect(esIrreversible('Excel')).toBe(false);
    expect(esIrreversible('Previsualizar')).toBe(false);
  });
});

describe('lo irreversible se confirma diciendo que va a pasar y sobre cuantos', () => {
  it('dice **que** va a pasar, no «¿estas seguro?»', async () => {
    const usuario = userEvent.setup();
    // Sobre una pantalla que **escribe** y cuya accion primaria es
    // irreversible: «Buscar valores» es un `GET` —y una accion de lectura sigue
    // deshabilitada (#64)—, y la primaria de «pase a coactiva» es «Imprimir».
    montarEnRuta('/valores/valores-masivo');

    await usuario.type(await observacion(), 'Emisión anual del ejercicio 2026.');
    await usuario.click(primaria());

    const aviso = await screen.findByText(/y eso no se deshace/);
    expect(aviso.textContent).toMatch(/generar valores/i);
    // «¿Estas seguro?» no da ninguna informacion nueva: quien pulsa siempre
    // esta seguro. Lo que hace falta saber es que va a pasar.
    expect(aviso.textContent).not.toMatch(/seguro/i);

    // Y hasta que no se confirma, no sale nada.
    expect(peticiones).toBe(0);
  });

  it('y sobre cuantos, cuando la pantalla sabe cuantos son', async () => {
    const usuario = userEvent.setup();
    // Se prueba el bloque directamente, y por un motivo que conviene dejar
    // dicho: **una pantalla que escribe no carga sus datos** (#64), asi que hoy
    // ninguna conoce su propio alcance al abrirse. Lo conocera la emision
    // masiva cuando «Simular» rellene su tabla, que es #38. El cableado esta y
    // se comprueba aqui para que ese dia no haya que acordarse de el.
    render(
      <BarraDeAcciones
        acciones={['Simular', 'Generar valores']}
        alcance="4,182 valores · S/ 3.84 M"
        escritura={escrituraDeMentira()}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Generar valores' }));
    const aviso = await screen.findByText(/y eso no se deshace/);
    expect(aviso.textContent).toContain('sobre 4,182 valores · S/ 3.84 M');
  });

  it('cancelar no emite, y confirmar emite una vez', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/valores/valores-masivo');

    await usuario.type(await observacion(), 'Emisión anual del ejercicio 2026.');
    await usuario.click(primaria());
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(peticiones).toBe(0);

    await usuario.click(primaria());
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));
    await waitFor(() => expect(peticiones).toBe(1));
  });
});

describe('emitir la misma tanda dos veces es imposible desde la interfaz', () => {
  it('tras emitir, la accion vuelve a estar deshabilitada hasta que haya otra observacion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/valores/valores-masivo');

    await usuario.type(await observacion(), 'Emisión anual del ejercicio 2026.');
    await usuario.click(primaria());
    const confirmar = screen.queryByRole('button', { name: /^Confirmar/ });
    if (confirmar) await usuario.click(confirmar);

    await screen.findByText(/Guardado, con tu observación/);
    await waitFor(() => expect(peticiones).toBe(1));

    // La observacion se vacia al guardar, asi que la accion vuelve a estar
    // deshabilitada: para emitir otra tanda hay que decir por que, y eso es lo
    // que impide emitir la misma dos veces de un doble golpe.
    await waitFor(() => expect(primaria().disabled).toBe(true));
    expect(await observacion()).toHaveValue('');
  });
});

/** Una escritura ya lista para enviar: lo que interesa aqui es la confirmacion. */
const escrituraDeMentira = (): Escritura => ({
  operacion: 'valores_masivo',
  campos: new Set<string>(),
  borrador: {},
  fijarCampo: () => {},
  observacion: 'Emisión anual del ejercicio 2026.',
  fijarObservacion: () => {},
  puedeEnviar: true,
  enviando: false,
  enviada: false,
  errorPorCampo: {},
  error: null,
  enviar: () => {},
  clave: 'clave-de-prueba',
});
