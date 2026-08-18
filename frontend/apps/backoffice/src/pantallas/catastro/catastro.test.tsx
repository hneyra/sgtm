import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Catastro, conectado **hasta donde llega el backend** (#71).
 *
 * De sus doce opciones solo `calles` tiene endpoint publicado (#16). Lo que se
 * comprueba aqui es que esa lee el recurso de verdad, que las tres columnas que
 * el recurso no trae salen vacias en vez de inventadas, y —lo mas importante—
 * que **las otras once siguen sin conectar**: una lista de conexiones que
 * creciera por delante del backend seria una interfaz construida contra una
 * invencion del proxy (ADR-0010).
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

describe('el catalogo vial lee ViaResource', () => {
  it('dibuja codigo, tipo, nombre y estado, y deja vacio lo que el recurso no trae', async () => {
    montarEnRuta('/catastro/calles');

    const fila = (await screen.findByText('00001182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '00001182',
      'AVENIDA',
      'JOSÉ DE LAMA',
      // Sector, zona de arancel y arancel por m²: el prototipo los dibuja y
      // `ViaResource` no los publica. El del arancel es el que mas importa
      // —es una cifra que alimenta la valuacion de un predio—, y una cifra
      // inventada aqui acaba en un valor mal emitido. Que falte se ve.
      '—',
      '—',
      '—',
      'ACTIVA',
    ]);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/vias'))).toHaveLength(1);
  });

  it('el conteo sale del sobre paginado, no de contar las filas dibujadas', async () => {
    montarEnRuta('/catastro/calles');
    expect(await screen.findByText(/vías$/)).toBeInTheDocument();
  });
});

describe('las once opciones restantes de Catastro siguen sin conectar', () => {
  it('y es lo correcto: su backend no existe todavia', () => {
    // #17, #18, #19 y #20. Conectarlas hoy obligaria a inventarse su respuesta
    // en el proxy, que es lo que ADR-0010 decidio no hacer.
    for (const opcion of [
      'ficha_urbana',
      'ficha_economica',
      'ficha_bienes',
      'ficha_rural',
      'consulta_fichas',
      'actualizacion_catastro',
      'ficha_contribuyente_reporte',
      'sectores',
      'aranceles',
      'valores_unitarios',
      'depreciacion',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });

  it('una de ellas se sigue dibujando por la forma que comparten las 134', async () => {
    montarEnRuta('/catastro/sectores');
    expect(await screen.findByText('CERCADO DE SULLANA')).toBeInTheDocument();
  });
});
