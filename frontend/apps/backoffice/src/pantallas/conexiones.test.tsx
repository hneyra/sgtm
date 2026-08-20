import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from './conexiones';
import { clienteDePruebas, montarEnRuta } from '../pruebas/montar';

/**
 * La puerta lateral, vista desde fuera.
 *
 * Dos cosas que tienen que ser ciertas a la vez: que una opcion conectada pida
 * su operacion tipada, y que las otras 133 sigan pidiendo por donde pedian.
 * Conectar una no puede ser el dia en que hay que conectarlas todas.
 */

let peticiones: string[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    );
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

const alaOperacion = (camino: string): string[] => peticiones.filter((u) => u.includes(camino));

describe('una opcion conectada y una sin conectar conviven', () => {
  it('la conectada pide su operacion tipada; la otra, la forma que comparten las 134', async () => {
    const cliente = clienteDePruebas();

    const conectada = montarEnRuta('/inicio/inicio', cliente);
    expect(await screen.findByText('Recaudado 2026')).toBeInTheDocument();
    conectada.unmount();

    const sinConectar = montarEnRuta('/catastro/aranceles', cliente);
    expect((await screen.findAllByText('AV. JOSÉ DE LAMA'))[0]).toBeInTheDocument();
    sinConectar.unmount();

    // Las dos piden por HTTP la ruta que declara el contrato, asi que la URL no
    // distingue un camino del otro. La clave de cache si: la conectada es una
    // operacion con sus parametros; la otra, la pantalla entera.
    const claves = cliente
      .getQueryCache()
      .getAll()
      .map((consulta) => consulta.queryKey);
    expect(claves).toContainEqual(['operacion', 'inicio', {}]);
    expect(claves).toContainEqual(['pantalla', 'aranceles', {}]);

    expect(alaOperacion('/api/v1/indicadores/recaudacion')).toHaveLength(1);
    expect(alaOperacion('/api/v1/catastro/tablas/aranceles')).toHaveLength(1);
  });

  it('el registro dice cuales estan conectadas, y son pocas todavia', () => {
    expect(OPCIONES_CONECTADAS).toContain('inicio');
    // De las doce de Catastro hay nueve conectadas; las tres tablas de
    // valuacion esperan a #17, y su contenido a D-02.
    expect(OPCIONES_CONECTADAS).toContain('calles');
    expect(OPCIONES_CONECTADAS).not.toContain('aranceles');
  });
});

describe('la clave de cache lleva los parametros de la peticion', () => {
  it('dos ejercicios distintos son dos consultas, no una compartida', async () => {
    const cliente = clienteDePruebas();

    const primera = montarEnRuta('/inicio/inicio?ejercicio=2026', cliente);
    expect(await screen.findByText('Recaudado 2026')).toBeInTheDocument();
    primera.unmount();

    const segunda = montarEnRuta('/inicio/inicio?ejercicio=2025', cliente);
    expect(await screen.findByText('Recaudado 2026')).toBeInTheDocument();
    segunda.unmount();

    // Dos peticiones, cada una con su ejercicio: la segunda no se sirvio de la
    // primera. Compartirlas mostraria cifras de un ano como si fueran de otro.
    expect(alaOperacion('/api/v1/indicadores/recaudacion')).toHaveLength(2);
    expect(peticiones.some((u) => u.includes('ejercicio=2026'))).toBe(true);
    expect(peticiones.some((u) => u.includes('ejercicio=2025'))).toBe(true);

    // Solo las de datos: la del catalogo del modulo es otra cosa y se comparte.
    const claves = cliente
      .getQueryCache()
      .getAll()
      .map((consulta) => JSON.stringify(consulta.queryKey))
      .filter((clave) => clave.startsWith('["operacion"'));
    expect(claves).toHaveLength(2);
    expect(claves.some((clave) => clave.includes('2026'))).toBe(true);
    expect(claves.some((clave) => clave.includes('2025'))).toBe(true);
  });

  it('un parametro sin valor no viaja ni ensucia la clave', async () => {
    const cliente = clienteDePruebas();
    const montada = montarEnRuta('/inicio/inicio', cliente);
    expect(await screen.findByText('Recaudado 2026')).toBeInTheDocument();
    montada.unmount();

    expect(peticiones.some((u) => u.includes('ejercicio='))).toBe(false);
    expect(
      cliente
        .getQueryCache()
        .getAll()
        .map((consulta) => consulta.queryKey)
        .find((clave) => clave[0] === 'operacion'),
    ).toEqual(['operacion', 'inicio', {}]);
  });
});
