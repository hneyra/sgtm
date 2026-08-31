import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { MODULOS } from '../../catalogo/navegacion.generado';
import { accionesDeLaBarra } from '../actos';
import { PANTALLAS } from '../../catalogo/pantallas/rentas-registro.generado';
import { COMPOSICION_DE_RENTAS } from './composicion';

/**
 * **El alta de un contribuyente** (#503 F7).
 *
 * Es el acto con el que se empieza a trabajar en Rentas —lo que el rediseño pone
 * como accion primaria del modulo— y hasta hoy no existia: el «Nuevo» de la
 * barra estaba dibujado y muerto, y desde #442 ni siquiera se dibujaba, porque
 * `VOCABULARIO_UNIFORME` retira las acciones que no pueden hacer lo que
 * prometen. Declarar el formulario es lo que lo devuelve, y esa es la regla de
 * siempre —no una excepcion para esta pantalla—.
 */

const PADRON = '/rentas-registro/contribuyentes';
const RUTA = '/api/v1/rentas/contribuyentes';

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly cuerpo: string;
}
let peticiones: Peticion[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return proxy(entrada, opciones);
  };
});
afterEach(() => desinstalarProxyDeDatos());

const altas = () => peticiones.filter((p) => p.url.includes(RUTA) && p.metodo === 'POST');

/** Abre el panel desde el «Nuevo» de la barra y devuelve su dialogo. */
async function abrirElPanel(usuario: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  montarEnRuta(PADRON);
  await usuario.click(await screen.findByRole('button', { name: 'Nuevo' }));
  return screen.findByRole('dialog', { name: 'Nuevo contribuyente' });
}

async function rellenar(
  usuario: ReturnType<typeof userEvent.setup>,
  panel: HTMLElement,
): Promise<void> {
  await usuario.type(within(panel).getByLabelText('Código del contribuyente'), '00000099001');
  await usuario.selectOptions(within(panel).getByLabelText('Tipo de documento'), 'DNI');
  await usuario.type(within(panel).getByLabelText('Número de documento'), '03593174');
  await usuario.selectOptions(within(panel).getByLabelText('Tipo de persona'), 'NATURAL');
  await usuario.type(
    within(panel).getByLabelText('Nombre o razón social'),
    'MEDINA MEDINA, RUFINA',
  );
}

describe('«Nuevo» vuelve a la barra, y vuelve porque ahora abre algo', () => {
  /**
   * **La regla no cambia: se queda si la pantalla declara el formulario que
   * abre.** `VOCABULARIO_UNIFORME` lo retiro de las tres lecturas del padron
   * porque ninguna lo declaraba (#442), que es lo mismo que #321 cerro para el
   * catalogo vial. `contribuyentes` lo declara ahora.
   */
  it('la barra del padron pasa de «Imprimir» a «Nuevo · Imprimir»', () => {
    const acciones = PANTALLAS['contribuyentes']?.acciones ?? [];
    const declaradas = (COMPOSICION_DE_RENTAS['contribuyentes']?.altas ?? []).map((a) => a.accion);

    expect(accionesDeLaBarra('contribuyentes', acciones, declaradas).acciones).toEqual([
      'Nuevo',
      'Imprimir',
    ]);
    // Y sin declararlo se cae, que es lo que hacia hasta hoy.
    expect(accionesDeLaBarra('contribuyentes', acciones, []).acciones).toEqual(['Imprimir']);
  });

  /**
   * El modulo declara su accion primaria, y **su destino abre algo de verdad**:
   * `?nuevo=1` abre el asistente guiado cuando lo hay y el panel lateral cuando
   * no. Sin esto seria un boton que lleva a la pantalla y no hace nada.
   */
  it('el modulo declara «Registrar contribuyente» sobre una opcion que tiene alta', () => {
    const modulo = MODULOS.find((m) => m.id === 'rentas-registro');
    expect(modulo?.accionPrimaria).toEqual({
      opcion: 'contribuyentes',
      label: 'Registrar contribuyente',
    });
    const opcion = modulo?.accionPrimaria?.opcion ?? '';
    const composicion = COMPOSICION_DE_RENTAS[opcion];
    expect(
      composicion?.flujo !== undefined || (composicion?.altas ?? []).length > 0,
      'la opción de la acción primaria tiene un alta que «?nuevo=1» pueda abrir',
    ).toBe(true);
  });

  it('con ?nuevo=1 el panel se abre solo, que es como lo abre el shell', async () => {
    montarEnRuta(`${PADRON}?nuevo=1`);
    // El formulario llega en su propio trozo (`lazy`), y sin clic que lo
    // adelante tarda mas que el segundo por omision de `findBy`.
    expect(
      await screen.findByRole('dialog', { name: 'Nuevo contribuyente' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});

describe('el formulario manda lo que el backend admite, y nada mas', () => {
  it('sin observacion no se registra, aunque esté todo relleno', async () => {
    const usuario = userEvent.setup();
    const panel = await abrirElPanel(usuario);
    await rellenar(usuario, panel);

    const registrar = within(panel).getByRole('button', { name: 'Registrar contribuyente' });
    expect(registrar).toBeDisabled();
    expect(altas()).toHaveLength(0);

    await usuario.type(
      within(panel).getByLabelText('Observación'),
      'Alta en ventanilla con DNI a la vista.',
    );
    expect(registrar).toBeEnabled();
  });

  /**
   * **El tipo de persona se traduce, y no es la traducción que #427 rechazó.**
   * El manual escribe «JURÍDICA» y `TipoPersona` declara `JURIDICA`: la
   * diferencia es la tilde, no el significado. Aquí se comprueba sobre
   * «NATURAL», que es la misma cadena, y sobre el cuerpo entero.
   */
  it('manda los cinco campos con su observacion, y ni uno mas', async () => {
    const usuario = userEvent.setup();
    const panel = await abrirElPanel(usuario);
    await rellenar(usuario, panel);
    await usuario.type(
      within(panel).getByLabelText('Observación'),
      'Alta en ventanilla con DNI a la vista.',
    );

    // Rellenar no escribe: nada sale hasta que se pulsa.
    expect(altas()).toHaveLength(0);
    await usuario.click(within(panel).getByRole('button', { name: 'Registrar contribuyente' }));

    expect(altas()).toHaveLength(1);
    const cuerpo = JSON.parse(altas()[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo).toEqual({
      codigo: '00000099001',
      tipoDocumento: 'DNI',
      numeroDocumento: '03593174',
      tipoPersona: 'NATURAL',
      nombreRazonSocial: 'MEDINA MEDINA, RUFINA',
      observacion: 'Alta en ventanilla con DNI a la vista.',
    });
    // `activo` no se declara: un contribuyente nace activo, y darlo de alta ya
    // inactivo seria un alta y una baja en un solo acto.
    expect(cuerpo).not.toHaveProperty('activo');
  });

  /**
   * **La lista blanca es la de `escrituras.ts`, no la del formulario.** Los seis
   * campos que el panel dibuja son los que la declaración tiene; los cincuenta
   * de la ficha del manual no se pueden ni escribir aquí.
   */
  it('el panel no ofrece nada que la declaracion no tenga', async () => {
    const usuario = userEvent.setup();
    const panel = await abrirElPanel(usuario);

    for (const ausente of ['Apellido paterno', 'Fecha de nacimiento', 'Estado civil', 'Cónyuge']) {
      expect(within(panel).queryByLabelText(ausente), ausente).not.toBeInTheDocument();
    }
    // Y dice antes de teclear que aquí se crea la fila, no el expediente entero.
    expect(within(panel).getByText(/no el expediente entero/)).toBeInTheDocument();
  });
});
