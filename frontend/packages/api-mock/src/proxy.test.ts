import { afterEach, describe, expect, it, vi } from 'vitest';
import { solicitar, ProblemaDeApi } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import {
  OPERACIONES_SIMULADAS,
  RESPUESTAS,
  RUTAS,
  YA_SERVIDAS,
  desinstalarProxyDeDatos,
  instalarProxyDeDatos,
  proxyDeDatosInstalado,
} from './index';

/**
 * El proxy de datos responde el contrato, y se quita sin dejar rastro.
 *
 * Lo que se prueba aqui no es que devuelva unos datos —eso es una constante—
 * sino **que la aplicacion pueda pedirselos por HTTP con el mismo cliente que
 * usara contra el backend**. Si esto vale, integrar el backend es apagar el
 * proxy; si no vale, es reescribir las pantallas.
 */

afterEach(() => desinstalarProxyDeDatos());

describe('el proxy cubre el contrato', () => {
  it('responde las 134 operaciones del catalogo', () => {
    expect(OPERACIONES_SIMULADAS).toBe(134);
    expect(RUTAS).toHaveLength(134);
  });

  it('toda respuesta dice a que fecha estan calculadas sus cifras', () => {
    // Regla 9 de CLAUDE.md: no existe «la deuda», existe la deuda a una fecha.
    for (const [id, datos] of Object.entries(RESPUESTAS)) {
      expect(datos.fechaCalculo, `sin fechaCalculo: ${id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('los importes de los totales viajan como texto, nunca como number', () => {
    for (const [id, datos] of Object.entries(RESPUESTAS)) {
      for (const total of datos.totales ?? []) {
        expect(typeof total.value, `${id} · ${total.label}`).toBe('string');
      }
    }
  });
});

describe('instalar y desinstalar', () => {
  it('sustituye fetch y lo devuelve tal cual estaba', () => {
    const antes = globalThis.fetch;
    const desinstalar = instalarProxyDeDatos();
    expect(proxyDeDatosInstalado()).toBe(true);
    expect(globalThis.fetch).not.toBe(antes);
    desinstalar();
    expect(globalThis.fetch).toBe(antes);
    expect(proxyDeDatosInstalado()).toBe(false);
  });

  it('no toca lo que no cuelga de /api/v1', async () => {
    // Una tipografia, un recurso: el proxy tiene que dejarlos pasar al fetch
    // que habia. Se comprueba con un espia en su sitio, no con la red.
    const espia = vi.fn(async () => new Response('recurso'));
    const original = globalThis.fetch;
    globalThis.fetch = espia as unknown as typeof fetch;
    try {
      instalarProxyDeDatos();
      await fetch('https://fonts.googleapis.com/css2');
      expect(espia).toHaveBeenCalledOnce();
      desinstalarProxyDeDatos();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('la aplicacion pide por HTTP y el proxy contesta', () => {
  it('sirve una pantalla con tabla por su ruta del contrato', async () => {
    instalarProxyDeDatos();
    const datos = await solicitar<DatosDePantalla>('/catastro/vias');
    expect(datos.tabla?.filas.length).toBeGreaterThan(0);
    expect(datos.fechaCalculo).toBe('2026-08-13');
  });

  it('resuelve rutas con parametro, venga el valor que venga', async () => {
    instalarProxyDeDatos();
    const datos = await solicitar<DatosDePantalla>('/rentas/vehiculos/X1A-742');
    expect(datos.campos).toBeDefined();
  });

  it('los parametros de consulta no cambian la respuesta: filtrar es del backend', async () => {
    instalarProxyDeDatos();
    const sinFiltro = await solicitar<DatosDePantalla>('/catastro/vias');
    const conFiltro = await solicitar<DatosDePantalla>('/catastro/vias', {
      consulta: { nombre: 'SANTA ROSA' },
    });
    expect(conFiltro).toEqual(sinFiltro);
  });

  it('una operacion que no existe devuelve un error de negocio, no un cuelgue', async () => {
    instalarProxyDeDatos();
    await expect(solicitar('/catastro/lo-que-sea')).rejects.toBeInstanceOf(ProblemaDeApi);
    await expect(solicitar('/catastro/lo-que-sea')).rejects.toMatchObject({
      problema: { status: 404 },
    });
  });

  it('distingue el verbo: un GET sobre una operacion POST no cuela', async () => {
    instalarProxyDeDatos();
    const soloPost = RUTAS.find((r) => r.metodo === 'POST');
    expect(soloPost).toBeDefined();
    if (!soloPost) return;
    const ruta = soloPost.ruta.replace(/^\/api\/v1/, '').replace(/\{\w+\}/g, 'ejemplo');
    await expect(solicitar(ruta)).rejects.toBeInstanceOf(ProblemaDeApi);
    await expect(solicitar(ruta, { metodo: 'POST', cuerpo: {} })).resolves.toBeDefined();
  });
});

describe('el proxy se apaga operacion por operacion', () => {
  // Estas pruebas sustituyen `fetch` **antes** de instalar el proxy, que es lo
  // que convierte al doble en «el backend»: lo que el proxy deja pasar va ahi.
  const deVerdad = globalThis.fetch;
  afterEach(() => {
    desinstalarProxyDeDatos();
    globalThis.fetch = deVerdad;
  });

  /** El «backend»: lo que hay detras del proxy cuando una ruta ya esta servida. */
  function elBackendSirve(rutas: Readonly<Record<string, number>>): string[] {
    const pedidas: string[] = [];
    globalThis.fetch = ((entrada: RequestInfo | URL) => {
      const camino = new URL(
        typeof entrada === 'string' ? entrada : String(entrada),
        'http://localhost',
      ).pathname;
      pedidas.push(camino);
      const estado = rutas[camino] ?? 404;
      return Promise.resolve(
        new Response(JSON.stringify({ fechaCalculo: '2026-08-13', deLaBase: true }), {
          status: estado,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }) as typeof fetch;
    return pedidas;
  }

  it('con la lista a medias, una pide al backend y otra al proxy, en la misma sesion', async () => {
    const alBackend = elBackendSirve({ '/api/v1/catastro/vias': 200 });
    instalarProxyDeDatos({
      latencia: false,
      yaServidas: [{ metodo: 'GET', ruta: '/catastro/vias' }],
    });

    const servida = await solicitar<{ deLaBase?: boolean }>('/catastro/vias');
    const simulada = await solicitar<{ deLaBase?: boolean }>('/catastro/sectores');

    // La conectada sale de verdad; la otra ni se asoma.
    expect(servida.deLaBase).toBe(true);
    expect(simulada.deLaBase).toBeUndefined();
    expect(alBackend).toEqual(['/api/v1/catastro/vias']);
  });

  it('una ruta declarada que el backend no sirve falla ruidosamente, no cae al proxy', async () => {
    elBackendSirve({});
    instalarProxyDeDatos({
      latencia: false,
      yaServidas: [{ metodo: 'GET', ruta: '/catastro/vias' }],
    });

    await expect(solicitar('/catastro/vias')).rejects.toThrow(/lista de operaciones/);
  });

  it('el parametro de ruta no impide reconocer la operacion servida', async () => {
    const alBackend = elBackendSirve({ '/api/v1/rentas/vehiculos/ABC-123': 200 });
    instalarProxyDeDatos({
      latencia: false,
      yaServidas: [{ metodo: 'GET', ruta: '/rentas/vehiculos/{placa}' }],
    });

    await solicitar('/rentas/vehiculos/ABC-123');
    expect(alBackend).toEqual(['/api/v1/rentas/vehiculos/ABC-123']);
  });

  it('hoy la lista esta vacia: el backend todavia no sirve ninguna operacion', () => {
    expect(YA_SERVIDAS).toEqual([]);
  });
});
