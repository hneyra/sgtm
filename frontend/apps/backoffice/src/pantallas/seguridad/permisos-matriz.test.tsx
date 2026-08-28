import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { primariaApagada } from '../../pruebas/acciones';

/**
 * La matriz de permisos, con su GET de lectura (#70).
 *
 * El issue quedaba abierto en «permisos» porque el backend solo publicaba el
 * `PUT` que guarda: sin un `GET`, la pantalla no podia cargar lo que un grupo
 * ya tenia configurado antes de dejar que alguien lo cambiara. Esto comprueba
 * las tres cosas que solo son ciertas con el GET puesto: que la matriz carga
 * lo ya otorgado, que no trae las 134 opciones del catalogo para hacerlo, y
 * que guarda exactamente lo que se ve —ni mas, ni menos— con su observacion.
 */

let peticiones: { url: string; metodo: string; cuerpo: string }[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url:
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      metodo: opciones?.method ?? 'GET',
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

const aLaOperacion = (camino: string) => peticiones.filter((p) => p.url.includes(camino));

describe('la matriz carga lo que el grupo ya tiene configurado', () => {
  it('dibuja el acceso ya otorgado, con su casilla marcada', async () => {
    montarEnRuta('/seguridad/permisos/1');

    const fila = (await screen.findByText('calles')).closest('tr');
    expect(fila).not.toBeNull();
    expect(within(fila as HTMLElement).getByLabelText('Consulta sobre calles')).toBeChecked();
    expect(within(fila as HTMLElement).getByLabelText('Ingresa sobre calles')).not.toBeChecked();

    expect(aLaOperacion('/api/v1/seguridad/grupos/1/permisos')).toHaveLength(1);
  });

  it('no trae las 134 opciones del catalogo para poder dibujarse', async () => {
    montarEnRuta('/seguridad/permisos/1');
    await screen.findByText('calles');

    expect(aLaOperacion('/api/v1/seguridad/accesos')).toHaveLength(0);
  });

  it('sin grupo en la URL, dice que falta elegir uno y no pide nada', async () => {
    montarEnRuta('/seguridad/permisos');
    expect(
      await screen.findByText('Elige un grupo para administrar sus permisos'),
    ).toBeInTheDocument();
    expect(aLaOperacion('/api/v1/seguridad/grupos')).toHaveLength(0);
  });
});

describe('guardar manda exactamente lo que se ve, y exige observacion', () => {
  it('sin observacion, la accion primaria esta deshabilitada', async () => {
    montarEnRuta('/seguridad/permisos/1');
    await screen.findByText('calles');

    // Apagada con `aria-disabled`: enfocable, para que la franja que dice que
    // falta la observacion tenga quien la lea (#332).
    primariaApagada(screen.getByRole('button', { name: 'Guardar' }));
  });

  it('marcar una casilla nueva y guardar manda los dos privilegios y la observacion', async () => {
    montarEnRuta('/seguridad/permisos/1');
    await screen.findByText('calles');

    await userEvent.click(screen.getByLabelText('Ingresa sobre calles'));
    await userEvent.type(
      screen.getByLabelText('Observación'),
      'Se habilita el registro por acuerdo de gerencia.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        aLaOperacion('/api/v1/seguridad/grupos/1/permisos').filter((p) => p.metodo === 'PUT'),
      ).toHaveLength(1),
    );
    const [peticion] = aLaOperacion('/api/v1/seguridad/grupos/1/permisos').filter(
      (p) => p.metodo === 'PUT',
    );
    expect(JSON.parse(peticion?.cuerpo ?? '{}')).toEqual({
      niveles: [{ acceso: 'calles', privilegios: ['LECTURA', 'REGISTRO'] }],
      observacion: 'Se habilita el registro por acuerdo de gerencia.',
    });
  });

  it('agregar un acceso por su codigo lo incluye en lo que se guarda', async () => {
    montarEnRuta('/seguridad/permisos/1');
    await screen.findByText('calles');

    await userEvent.type(screen.getByLabelText('Código del acceso a añadir'), 'sectores');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await userEvent.click(screen.getByLabelText('Consulta sobre sectores'));
    await userEvent.type(screen.getByLabelText('Observación'), 'Se agrega sectores al grupo.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        aLaOperacion('/api/v1/seguridad/grupos/1/permisos').filter((p) => p.metodo === 'PUT'),
      ).toHaveLength(1),
    );
    const [peticion] = aLaOperacion('/api/v1/seguridad/grupos/1/permisos').filter(
      (p) => p.metodo === 'PUT',
    );
    const cuerpo = JSON.parse(peticion?.cuerpo ?? '{}');
    expect(cuerpo.niveles).toEqual(
      expect.arrayContaining([
        { acceso: 'calles', privilegios: ['LECTURA'] },
        { acceso: 'sectores', privilegios: ['LECTURA'] },
      ]),
    );
  });

  it('quitar un acceso ya otorgado lo manda con los privilegios vacios, no lo omite', async () => {
    montarEnRuta('/seguridad/permisos/1');
    await screen.findByText('calles');

    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    // La fila se conserva: el PUT no borra lo ausente, hay que mandarlo vacio.
    expect(screen.getByText('calles')).toBeInTheDocument();
    expect(screen.getByLabelText('Consulta sobre calles')).not.toBeChecked();

    await userEvent.type(
      screen.getByLabelText('Observación'),
      'Se retira el acceso al catalogo vial.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        aLaOperacion('/api/v1/seguridad/grupos/1/permisos').filter((p) => p.metodo === 'PUT'),
      ).toHaveLength(1),
    );
    const [peticion] = aLaOperacion('/api/v1/seguridad/grupos/1/permisos').filter(
      (p) => p.metodo === 'PUT',
    );
    expect(JSON.parse(peticion?.cuerpo ?? '{}').niveles).toEqual([
      { acceso: 'calles', privilegios: [] },
    ]);
  });
});
