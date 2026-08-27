import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { esIrreversible } from '../escritura';
import type { Escritura } from '../escritura';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { SIN_DATO } from '../seguridad/listado';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Valores (#75): **un valor emitido es un acto administrativo**.
 *
 * Sale de la municipalidad, se notifica y no se corrige: se anula. De sus seis
 * endpoints, tres ya existen (#37, #38) y tres siguen en progreso (#39). Lo que
 * se comprueba aqui primero es lo que la interfaz tiene que hacer bien **para
 * las seis**, tengan o no backend: sin eso, conectar una no la distinguiria de
 * las que todavia esperan. `valores_busqueda` se conecta para lectura al final
 * de este archivo — ver `pantallas/valores/index.ts` para por que las otras
 * cinco no se conectan todavia.
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

describe('valores_busqueda lee ValorResource, conectado hasta donde llega el backend (#37)', () => {
  it('es la unica de las seis ya conectada', () => {
    expect(OPCIONES_CONECTADAS).toContain('valores_busqueda');
    for (const opcion of [
      'valores_individual',
      'valores_masivo',
      'notificacion_valores',
      'prescripcion',
      'pase_coactiva',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });

  it('cada fila es un valor, y lo que ValorResource no publica sale vacio', async () => {
    montarEnRuta('/valores/valores-busqueda');

    const fila = (await screen.findByText('OP-2026-004182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'OP-2026-004182',
      'OP',
      'CASTILLO PASCUALA, MARÍA E.',
      // Tributo y periodo son de ValorDetalle, que este recurso no publica.
      SIN_DATO,
      SIN_DATO,
      '195.98',
      // La notificacion es #39: todavia no existe ningun campo que la traiga.
      SIN_DATO,
      // El estado es el nombre literal de EstadoDeValor, no la etiqueta del
      // prototipo: «Firme» no es ningun valor del enum (ver el mock).
      'NOTIFICADO',
    ]);
  });

  it('el «Estado» nunca es una etiqueta que EstadoDeValor no reconoce', async () => {
    montarEnRuta('/valores/valores-busqueda');

    const tabla = (await screen.findByText('OP-2026-004182')).closest('table');
    expect(tabla).not.toBeNull();
    const dentroDeLaTabla = within(tabla as HTMLElement);

    // Las cuatro filas del mock, con su estado ya en el vocabulario del
    // backend: «Firme» y «Reclamado» —que EstadoDeValor no tiene— colapsan en
    // NOTIFICADO, que es el estado del que ambos parten.
    for (const invalido of ['Firme', 'Reclamado']) {
      expect(dentroDeLaTabla.queryByText(invalido)).not.toBeInTheDocument();
    }
    expect(dentroDeLaTabla.getAllByText('NOTIFICADO')).toHaveLength(2);
    expect(dentroDeLaTabla.getByText('EMITIDO')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('COACTIVA')).toBeInTheDocument();
  });
});
