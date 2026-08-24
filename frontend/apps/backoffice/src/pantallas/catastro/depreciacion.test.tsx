import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { agruparPorMaterial } from './Depreciacion';

/**
 * Tabla de depreciación (#71). Misma pareja de pruebas que valores unitarios:
 * la función que agrupa por material y cruza antigüedad × estado, y la
 * pantalla conectada mostrando el vacío que D-02a impone hoy.
 */

describe('agruparPorMaterial cruza antiguedad y estado dentro de cada material', () => {
  it('separa dos materiales, cada uno con su propia matriz', () => {
    const filas = [
      { material: 'NOBLE', estadoConservacion: 'BUENO', antiguedadHasta: 5, porcentaje: '2.00' },
      { material: 'NOBLE', estadoConservacion: 'REGULAR', antiguedadHasta: 5, porcentaje: '5.00' },
      { material: 'RUSTICO', estadoConservacion: 'BUENO', antiguedadHasta: 5, porcentaje: '4.00' },
    ];

    const grupos = agruparPorMaterial(filas);

    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toMatchObject({ material: 'NOBLE', tramos: [5], estados: ['BUENO', 'REGULAR'] });
    expect(grupos[0]?.valores['5·BUENO']).toBe('2.00');
    expect(grupos[0]?.valores['5·REGULAR']).toBe('5.00');
    expect(grupos[1]).toMatchObject({ material: 'RUSTICO', tramos: [5], estados: ['BUENO'] });
  });

  it('los tramos de antiguedad salen ordenados de menor a mayor', () => {
    const filas = [
      { material: 'NOBLE', estadoConservacion: 'BUENO', antiguedadHasta: 20, porcentaje: '10.00' },
      { material: 'NOBLE', estadoConservacion: 'BUENO', antiguedadHasta: 5, porcentaje: '2.00' },
    ];

    const [grupo] = agruparPorMaterial(filas);

    expect(grupo?.tramos).toEqual([5, 20]);
  });

  it('un arreglo vacio no produce ningun grupo', () => {
    expect(agruparPorMaterial([])).toEqual([]);
  });
});

let peticiones: { url: string }[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url:
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    });
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

describe('conectada: sin conjunto sellado, vacio explicito y no porcentajes de ejemplo', () => {
  it('pide con el anio del ejercicio, y dice que no hay tabla para el ejercicio', async () => {
    montarEnRuta('/catastro/depreciacion');

    expect(
      await screen.findByText(
        new RegExp(`Sin tabla de depreciación sellada para ${new Date().getFullYear()}`),
      ),
    ).toBeInTheDocument();

    const [peticion] = peticiones.filter((p) => p.url.includes('/catastro/tablas/depreciacion'));
    expect(peticion?.url).toContain(`anio=${new Date().getFullYear()}`);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
