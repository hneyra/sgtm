import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Alta y baja de miembros de un grupo (#70).
 *
 * El backend solo publica `POST /seguridad/grupos/{grupo}/miembros`: no hay
 * consulta de quien pertenece al grupo todavia. Esto comprueba lo que si es
 * cierto hoy: que el alta y la baja mandan exactamente el cuerpo que el
 * controlador espera, con observacion, y que un identificador vacio no llega
 * a mandarse.
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

describe('afiliar o retirar un usuario', () => {
  it('el alta manda el usuario, activo=true y la observacion', async () => {
    montarEnRuta('/seguridad/miembros/3');
    await screen.findByLabelText('ID del usuario');

    await userEvent.type(screen.getByLabelText('ID del usuario'), '42');
    await userEvent.type(
      screen.getByLabelText('Observación'),
      'Ingresa al equipo de fiscalización.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() =>
      expect(aLaOperacion('/api/v1/seguridad/grupos/3/miembros')).toHaveLength(1),
    );
    const [peticion] = aLaOperacion('/api/v1/seguridad/grupos/3/miembros');
    expect(peticion?.metodo).toBe('POST');
    expect(JSON.parse(peticion?.cuerpo ?? '{}')).toEqual({
      usuarioId: 42,
      activo: true,
      observacion: 'Ingresa al equipo de fiscalización.',
    });
  });

  it('elegir «Baja» pide confirmar, porque no se deshace, y entonces manda activo=false', async () => {
    montarEnRuta('/seguridad/miembros/3');
    await screen.findByLabelText('ID del usuario');

    await userEvent.type(screen.getByLabelText('ID del usuario'), '42');
    await userEvent.click(screen.getByRole('button', { name: 'Baja' }));
    await userEvent.type(screen.getByLabelText('Observación'), 'Deja el grupo por cambio de área.');
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));

    // Es irreversible: pide confirmar antes de mandar nada.
    expect(aLaOperacion('/api/v1/seguridad/grupos/3/miembros')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: /Confirmar dar de baja/i }));

    await waitFor(() =>
      expect(aLaOperacion('/api/v1/seguridad/grupos/3/miembros')).toHaveLength(1),
    );
    const [peticion] = aLaOperacion('/api/v1/seguridad/grupos/3/miembros');
    expect(JSON.parse(peticion?.cuerpo ?? '{}')).toMatchObject({ usuarioId: 42, activo: false });
  });

  it('sin identificador de usuario, lo dice antes de que nadie pulse, y guardar no manda nada', async () => {
    montarEnRuta('/seguridad/miembros/3');
    await screen.findByLabelText('ID del usuario');

    expect(screen.getByText(/Escribe el identificador del usuario/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Observación'), 'Falta el identificador.');
    await userEvent.click(screen.getByRole('button', { name: 'Dar de alta' }));

    expect(aLaOperacion('/api/v1/seguridad/grupos/3/miembros')).toHaveLength(0);
  });

  it('sin grupo en la URL, dice que falta elegir uno', async () => {
    montarEnRuta('/seguridad/miembros');
    expect(
      await screen.findByText('Elige un grupo para administrar sus miembros'),
    ).toBeInTheDocument();
  });
});
