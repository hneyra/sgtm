import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * El historico de respaldos, conectado en lectura (#70).
 *
 * El controlador es un `POST` que solo consulta —la aplicacion no puede
 * ejecutar copias de seguridad, por diseño (ARQ-03 §4)—, asi que lo unico
 * honesto es conectar la lectura y dejar los dos botones del prototipo
 * deshabilitados, con la razon dicha en vez de fingir una escritura que no
 * hace lo que dice.
 */

let peticiones: { url: string; metodo: string }[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url:
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      metodo: opciones?.method ?? 'GET',
    });
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

describe('el historico de respaldos lee el recurso del backend', () => {
  it('dibuja el resultado de cada respaldo, con su tono', async () => {
    montarEnRuta('/seguridad/respaldo');

    const exitosa = (await screen.findByText('EXITOSO')).closest('tr');
    expect(exitosa).not.toBeNull();
    expect(within(exitosa as HTMLElement).getByText(/MB/)).toBeInTheDocument();

    expect(await screen.findByText('FALLIDO')).toBeInTheDocument();
  });

  it('pide con POST, como declara el contrato, y no con GET', async () => {
    montarEnRuta('/seguridad/respaldo');
    await screen.findByText('EXITOSO');

    const [peticion] = peticiones.filter((p) => p.url.includes('/api/v1/seguridad/respaldos'));
    expect(peticion?.metodo).toBe('POST');
  });
});

describe('ejecutar respaldo y restaurar no ejecutan nada todavia', () => {
  it('los dos botones estan deshabilitados, y se dice por que', async () => {
    montarEnRuta('/seguridad/respaldo');
    await screen.findByText('EXITOSO');

    expect(screen.getByRole('button', { name: 'Ejecutar respaldo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restaurar' })).toBeDisabled();
    expect(screen.getByText(/no puede ejecutar copias de seguridad/)).toBeInTheDocument();
  });
});
