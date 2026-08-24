import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { agruparPorTramo } from './ValoresUnitarios';

/**
 * Valores unitarios de edificación (#71).
 *
 * Dos cosas, por separado: que agrupar filas sueltas en una matriz categoría
 * × partida hace lo correcto (una función pura, sin backend), y que la
 * pantalla conectada muestra el vacío explícito que D-02a impone hoy —sin
 * eso, no habría nada que ver hasta que se resuelva la decisión normativa—.
 */

describe('agruparPorTramo cruza categoria y partida dentro de cada tramo', () => {
  it('separa dos tramos de año de construcción, cada uno con su propia matriz', () => {
    const filas = [
      {
        partida: 'MUROS',
        categoria: 'B',
        anioConstruccionDesde: 2000,
        anioConstruccionHasta: 2010,
        valorM2: '450.00',
      },
      {
        partida: 'TECHOS',
        categoria: 'B',
        anioConstruccionDesde: 2000,
        anioConstruccionHasta: 2010,
        valorM2: '320.00',
      },
      {
        partida: 'MUROS',
        categoria: 'B',
        anioConstruccionDesde: 2011,
        anioConstruccionHasta: undefined,
        valorM2: '480.00',
      },
    ];

    const tramos = agruparPorTramo(filas);

    expect(tramos).toHaveLength(2);
    expect(tramos[0]).toMatchObject({ desde: 2000, hasta: 2010, categorias: ['B'] });
    expect(tramos[0]?.valores['B·MUROS']).toBe('450.00');
    expect(tramos[0]?.valores['B·TECHOS']).toBe('320.00');
    // Una partida sin fila para esta categoria no tiene entrada: la pantalla
    // la dibuja como «—», no como «0.00».
    expect(tramos[0]?.valores['B·PISOS']).toBeUndefined();

    expect(tramos[1]).toMatchObject({ desde: 2011, categorias: ['B'] });
    expect(tramos[1]?.hasta).toBeUndefined();
    expect(tramos[1]?.valores['B·MUROS']).toBe('480.00');
  });

  it('varias categorias en el mismo tramo salen ordenadas, cada una en su fila', () => {
    const filas = [
      { partida: 'MUROS', categoria: 'C', anioConstruccionDesde: 2000, valorM2: '300.00' },
      { partida: 'MUROS', categoria: 'A', anioConstruccionDesde: 2000, valorM2: '600.00' },
    ];

    const tramos = agruparPorTramo(filas);

    expect(tramos).toHaveLength(1);
    expect(tramos[0]?.categorias).toEqual(['A', 'C']);
  });

  it('un arreglo vacio no produce ningun tramo', () => {
    expect(agruparPorTramo([])).toEqual([]);
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

describe('conectada: sin conjunto sellado, vacio explicito y no cifras de ejemplo', () => {
  it('pide con el anio del ejercicio, y dice que no hay valores para el ejercicio', async () => {
    montarEnRuta('/catastro/valores-unitarios');

    expect(
      await screen.findByText(new RegExp(`Sin valores unitarios sellados para ${new Date().getFullYear()}`)),
    ).toBeInTheDocument();

    const [peticion] = peticiones.filter((p) => p.url.includes('/catastro/tablas/valores-unitarios'));
    expect(peticion?.url).toContain(`anio=${new Date().getFullYear()}`);

    // Ninguna cifra de ejemplo: ni un numero de sol, ni una tabla dibujada.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
