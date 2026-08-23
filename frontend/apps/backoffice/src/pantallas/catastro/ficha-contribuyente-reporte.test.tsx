import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * El reporte de la ficha del contribuyente se descarga en tres formatos (#71,
 * RNF-081). Es el único de los trece reportes cuyo backend ya sirve el
 * archivo —los otros doce siguen con «Descargar PDF» deshabilitado, a la
 * espera de D-05—, así que esto comprueba justo la diferencia: que aquí sí
 * hay una descarga de verdad, con el formato correcto en la petición y el
 * archivo entregado al navegador.
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
  // Solo se sustituyen estas dos: `URL` sigue siendo el constructor real —
  // `cliente.ts` lo usa para componer cada peticion—, y reemplazarlo entero
  // (por ejemplo con `{...URL, createObjectURL: ...}`) lo convertiria en un
  // objeto plano que ya no se puede invocar con `new`. jsdom no las define,
  // asi que no hay nada que `vi.spyOn` pueda envolver: se asignan a mano.
  URL.createObjectURL = vi.fn(() => 'blob:simulado');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  desinstalarProxyDeDatos();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const aLaOperacion = (camino: string) => peticiones.filter((p) => p.url.includes(camino));

describe('los tres formatos se descargan, cada uno con su peticion', () => {
  it('«Descargar XLS» pide el archivo con formato=XLS y se lo entrega al navegador', async () => {
    montarEnRuta('/catastro/ficha-contribuyente-reporte/20260101015001');
    await screen.findByRole('button', { name: 'Descargar XLS' });

    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await userEvent.click(screen.getByRole('button', { name: 'Descargar XLS' }));

    // Dos peticiones a la misma ruta: la del JSON al abrir la pantalla, y la
    // de la descarga. Se identifica esta ultima por su `formato`.
    await waitFor(() =>
      expect(
        aLaOperacion('/api/v1/catastro/contribuyentes/20260101015001/ficha.pdf').filter((p) =>
          p.url.includes('formato='),
        ),
      ).toHaveLength(1),
    );
    const [peticion] = aLaOperacion(
      '/api/v1/catastro/contribuyentes/20260101015001/ficha.pdf',
    ).filter((p) => p.url.includes('formato='));
    expect(peticion?.url).toContain('formato=XLS');

    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1));
    clic.mockRestore();
  });

  it('mientras una descarga esta en curso, los tres botones quedan deshabilitados', async () => {
    montarEnRuta('/catastro/ficha-contribuyente-reporte/20260101015001');
    await screen.findByRole('button', { name: 'Descargar PDF' });

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // Se congela la respuesta del archivo para poder observar el estado «en
    // curso»: con la respuesta real, resuelve tan rapido que el estado
    // intermedio nunca llegaria a verse.
    let liberar: (() => void) | undefined;
    const congelada = new Promise<void>((resuelve) => (liberar = resuelve));
    const proxy = globalThis.fetch;
    globalThis.fetch = async (entrada, opciones) => {
      const url =
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      if (url.includes('formato=PDF')) await congelada;
      return proxy(entrada, opciones);
    };

    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    // El boton pulsado dice que esta en curso, y los otros dos formatos
    // tambien se deshabilitan: no se pide una segunda descarga a la vez.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Descargando…' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Descargar RTF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descargar XLS' })).toBeDisabled();

    liberar?.();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Descargar PDF' })).not.toBeDisabled(),
    );
  });
});

describe('el reporte sigue viendose sin formato, como cualquier pantalla sin conectar', () => {
  it('abrir la pantalla no pide ningun archivo, solo el JSON de la ficha', async () => {
    montarEnRuta('/catastro/ficha-contribuyente-reporte/20260101015001');
    await screen.findByText('Ficha del contribuyente');

    await waitFor(() =>
      expect(
        aLaOperacion('/api/v1/catastro/contribuyentes/20260101015001/ficha.pdf'),
      ).toHaveLength(1),
    );
    const [peticion] = aLaOperacion(
      '/api/v1/catastro/contribuyentes/20260101015001/ficha.pdf',
    );
    expect(peticion?.url).not.toContain('formato=');
  });
});
