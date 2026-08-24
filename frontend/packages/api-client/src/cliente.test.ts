import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { descargar, guardarToken, hayToken, ProblemaDeApi, solicitar } from './cliente';

/** Ultima llamada a `fetch`, para poder mirar url y cabeceras. */
function respuestaDe(cuerpo: unknown, estado = 200) {
  return new Response(estado === 204 ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchFalso = vi.fn();

/** La ultima llamada a `fetch`, con url y opciones, o falla la prueba. */
function ultimaLlamada(): [string, RequestInit] {
  const llamada = fetchFalso.mock.calls.at(-1);
  if (!llamada) throw new Error('No se llamo a fetch');
  return [String(llamada[0]), llamada[1] as RequestInit];
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso);
  fetchFalso.mockReset();
  guardarToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('solicitar', () => {
  it('manda el token en la cabecera y no en la url', async () => {
    fetchFalso.mockResolvedValue(respuestaDe({ ok: true }));
    guardarToken('token-de-prueba');

    await solicitar('/predios');

    const [url, opciones] = ultimaLlamada();
    expect((opciones.headers as Record<string, string>)['authorization']).toBe(
      'Bearer token-de-prueba',
    );
    expect(url).not.toContain('token');
  });

  it('no manda cabecera de autorizacion cuando no hay token', async () => {
    fetchFalso.mockResolvedValue(respuestaDe({ ok: true }));

    await solicitar('/predios');

    const [, opciones] = ultimaLlamada();
    expect((opciones.headers as Record<string, string>)['authorization']).toBeUndefined();
  });

  it('el identificador de municipalidad no viaja en la peticion', async () => {
    fetchFalso.mockResolvedValue(respuestaDe({ ok: true }));
    guardarToken('token-de-prueba');

    await solicitar('/predios', { consulta: { ejercicio: 2026 } });

    const [url, opciones] = ultimaLlamada();
    const peticion = url + JSON.stringify(opciones);
    expect(peticion.toLowerCase()).not.toContain('municipalidad');
  });

  it('envia la clave de idempotencia cuando la operacion asienta', async () => {
    fetchFalso.mockResolvedValue(respuestaDe({ recibo: 'R-000418' }));

    await solicitar('/tesoreria/cobros', {
      metodo: 'POST',
      cuerpo: { cuotas: ['CUO-2026-000418-P1'] },
      claveDeIdempotencia: 'clave-fija',
    });

    const [, opciones] = ultimaLlamada();
    expect((opciones.headers as Record<string, string>)['idempotency-key']).toBe('clave-fija');
  });

  it('no reintenta por su cuenta: una peticion, una llamada', async () => {
    fetchFalso.mockResolvedValue(respuestaDe({ ok: true }));

    await solicitar('/tesoreria/cobros', { metodo: 'POST', cuerpo: {} });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('deja pasar el mensaje del backend sin reescribirlo', async () => {
    fetchFalso.mockResolvedValue(
      respuestaDe(
        {
          type: 'about:blank',
          title: 'Sin observacion',
          status: 400,
          detail: 'Toda modificacion exige una observacion del usuario.',
          traza: 'traza-1',
        },
        400,
      ),
    );

    const error = await solicitar('/catastro/predios').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemaDeApi);
    expect((error as ProblemaDeApi).detalle).toBe(
      'Toda modificacion exige una observacion del usuario.',
    );
    expect((error as ProblemaDeApi).traza).toBe('traza-1');
  });

  it('devuelve indefinido en un 204 sin cuerpo', async () => {
    fetchFalso.mockResolvedValue(respuestaDe(null, 204));

    await expect(solicitar('/valores/VAL-1')).resolves.toBeUndefined();
  });
});

describe('descargar', () => {
  const respuestaDeArchivo = (cuerpo: string, nombreDeArchivo: string, tipoDeMedio: string) =>
    new Response(cuerpo, {
      status: 200,
      headers: {
        'content-type': tipoDeMedio,
        'content-disposition': `attachment; filename="${nombreDeArchivo}"`,
      },
    });

  it('devuelve el archivo con el nombre que propuso el backend', async () => {
    fetchFalso.mockResolvedValue(
      respuestaDeArchivo('contenido', 'ficha-200601.xls', 'application/vnd.ms-excel'),
    );

    const archivo = await descargar('/catastro/contribuyentes/200601/ficha.pdf', {
      consulta: { formato: 'XLS' },
    });

    expect(archivo.nombreDeArchivo).toBe('ficha-200601.xls');
    expect(archivo.blob.type).toBe('application/vnd.ms-excel');
  });

  it('sin cabecera Content-Disposition, propone un nombre generico en vez de fallar', async () => {
    fetchFalso.mockResolvedValue(new Response('contenido', { status: 200 }));

    const archivo = await descargar('/catastro/contribuyentes/200601/ficha.pdf');

    expect(archivo.nombreDeArchivo).toBe('documento');
  });

  it('manda el token igual que solicitar, y no manda accept: application/json', async () => {
    fetchFalso.mockResolvedValue(respuestaDeArchivo('contenido', 'a.pdf', 'application/pdf'));
    guardarToken('token-de-prueba');

    await descargar('/catastro/contribuyentes/200601/ficha.pdf');

    const [, opciones] = ultimaLlamada();
    const cabeceras = opciones.headers as Record<string, string>;
    expect(cabeceras['authorization']).toBe('Bearer token-de-prueba');
    expect(cabeceras['accept']).not.toBe('application/json');
  });

  it('un error del backend se cuenta igual que en solicitar, sin intentar leer un archivo', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Formato invalido',
          status: 422,
          detail: "El formato va entre PDF, XLS y RTF: 'DOCX'",
        }),
        { status: 422, headers: { 'content-type': 'application/problem+json' } },
      ),
    );

    const error = await descargar('/catastro/contribuyentes/200601/ficha.pdf', {
      consulta: { formato: 'DOCX' },
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProblemaDeApi);
    expect((error as ProblemaDeApi).detalle).toContain('PDF, XLS y RTF');
  });
});

describe('el token vive en memoria', () => {
  it('no queda rastro del token en el almacenamiento del navegador', () => {
    guardarToken('token-de-prueba');

    expect(hayToken()).toBe(true);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
