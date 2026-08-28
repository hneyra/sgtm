import { afterEach, describe, expect, it, vi } from 'vitest';
import { solicitar, ProblemaDeApi } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import {
  OPERACIONES_SIMULADAS,
  PAGINADOS,
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

  /**
   * **Y los de un recurso, como los serializa el backend** (#332).
   *
   * `ImporteActualizado` publica lo que devuelve `BigDecimal.toPlainString()`:
   * digitos, un punto y nada mas. El prototipo escribe las cifras para leerlas
   * —«1,842.60»— y el proxy las servia tal cual, asi que la interfaz se construyo
   * contra una forma que el servidor no usa. No es un detalle de presentacion: la
   * baja de deuda manda la cifra de la fila elegida en el cuerpo, el controlador
   * la lee con `new BigDecimal(texto)` y **ese constructor lanza con la coma
   * dentro**. Contra el proxy no se veia; contra el backend, 422.
   */
  it('los importes de un recurso salen como `toPlainString`, sin separador de miles', () => {
    const CIFRA = /^-?\d+(\.\d+)?$/;
    const mirar = (valor: unknown, donde: string): void => {
      if (Array.isArray(valor)) {
        valor.forEach((cada, i) => mirar(cada, `${donde}[${i}]`));
        return;
      }
      if (typeof valor !== 'object' || valor === null) return;
      const objeto = valor as Record<string, unknown>;
      // `ImporteActualizado` es el par (importe, actualizadoA): donde este ese
      // par, el importe es una cifra que el backend va a leer con `BigDecimal`.
      if (typeof objeto['importe'] === 'string' && objeto['actualizadoA'] !== undefined) {
        expect(objeto['importe'], `${donde}.importe`).toMatch(CIFRA);
      }
      for (const [clave, dentro] of Object.entries(objeto)) mirar(dentro, `${donde}.${clave}`);
    };

    let mirados = 0;
    for (const [camino, construir] of Object.entries(PAGINADOS)) {
      mirados += 1;
      mirar(construir().contenido, camino);
    }
    // Si el recorrido no encontrara nada que mirar, esto pasaria sin comprobar.
    expect(mirados).toBeGreaterThan(5);
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
    // Sin conectar: los valores unitarios y la depreciacion ya piden su
    // recurso propio (#71) y salen por el camino que se prueba mas abajo, no
    // por este. `/transito/papeletas` se conecto en #363 y ya no sirve para
    // este ejemplo — sale con la forma de `PapeletaResource`, no esta.
    const datos = await solicitar<DatosDePantalla>('/transito/codigos');
    expect(datos.tabla?.filas.length).toBeGreaterThan(0);
    expect(datos.fechaCalculo).toBe('2026-08-13');
  });

  it('y las doce que el backend ya sirve salen con **su** forma, no con esa', async () => {
    instalarProxyDeDatos();
    // El sobre de `RespuestaPaginada`, con la pagina contada desde 0. Sin esto,
    // la pantalla se estaria construyendo contra una forma que el servidor no
    // usa, y el dia de la integracion habria que rehacerla.
    const vias = await solicitar<Record<string, unknown>>('/catastro/vias');
    expect(Array.isArray(vias['contenido'])).toBe(true);
    expect(vias['pagina']).toBe(0);
    expect(vias['totalElementos']).toBeGreaterThan(0);
    expect(vias['tabla']).toBeUndefined();
  });

  it('resuelve rutas con parametro, venga el valor que venga', async () => {
    instalarProxyDeDatos();
    // Con #80 se conectaron las ocho rutas con parametro que el contrato
    // declara para las 134 opciones —la ultima era
    // `/fiscalizacion/resoluciones/{numero}`—, asi que esta prueba ya no tiene
    // un ejemplo sin backend donde probar el camino comun: comprueba en su
    // lugar que el mismo mecanismo de patron sigue resolviendo **sin
    // filtrar**, con la forma real de `ResolucionResource` — el proxy
    // devuelve la misma resolucion venga el numero que venga.
    const primera = await solicitar<Readonly<Record<string, unknown>>>(
      '/fiscalizacion/resoluciones/RES-2026-0001',
    );
    const segunda = await solicitar<Readonly<Record<string, unknown>>>(
      '/fiscalizacion/resoluciones/OTRO-NUMERO-CUALQUIERA',
    );
    expect(primera['numero']).toBeDefined();
    expect(primera).toEqual(segunda);
  });

  it('los parametros de consulta no cambian la respuesta: filtrar es del backend', async () => {
    instalarProxyDeDatos();
    const sinFiltro = await solicitar<DatosDePantalla>('/catastro/tablas/aranceles');
    const conFiltro = await solicitar<DatosDePantalla>('/catastro/tablas/aranceles', {
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
    const simulada = await solicitar<{ deLaBase?: boolean }>('/catastro/tablas/aranceles');

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
