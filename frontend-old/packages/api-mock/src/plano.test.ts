import { describe, expect, it } from 'vitest';
import { paginadoDe, recursoDe } from './recursos';

/**
 * **El plano que el proxy sirve es el padrón que el proxy sirve** (#500, ADR-0022).
 *
 * Lo que estas pruebas defienden es la correspondencia, que es toda la gracia de
 * la superficie: quien encuentra un lote en el mapa y quien lo encuentra en la
 * grilla tienen que estar mirando el mismo predio. Si el proxy inventara aquí un
 * padrón aparte, el mapa enseñaría lotes que la consulta de fichas no conoce y
 * ninguna prueba de pantalla lo notaría —las dos saldrían llenas—.
 *
 * Y lo que **no** defienden, porque no se puede: que la forma sea la del
 * `Resource`. Ese guardia es `verificaciones/formas-del-backend.test.ts`, y esta
 * operación está en su lista de las que el backend todavía no describe: no hay
 * controlador del que derivarla. Lo único que sostiene la forma hoy es haberla
 * escrito mirando el ADR, y eso está dicho allí con su issue.
 */
const plano = () => recursoDe('GET', '/api/v1/catastro/predios/plano');

describe('el plano del proxy', () => {
  it('publica el sobre entero: marco, límite, lotes y los que no tienen polígono', () => {
    const cuerpo = plano();
    expect(cuerpo).not.toBeNull();
    expect(Object.keys(cuerpo ?? {}).sort()).toEqual(['limite', 'lotes', 'marco', 'sinGeometria']);
  });

  it('cada lote lleva su geometría en GeoJSON, y es un MultiPolygon', () => {
    const lotes = (plano()?.['lotes'] ?? []) as readonly Record<string, unknown>[];
    expect(lotes.length).toBeGreaterThan(0);
    for (const lote of lotes) {
      const geometria = lote['geometria'] as { type?: string; coordinates?: unknown };
      // `MultiPolygon` y no `Polygon`, porque es lo que la columna acepta
      // (ADR-0021): un predio puede tener partes disjuntas.
      expect(geometria.type).toBe('MultiPolygon');
      expect(Array.isArray(geometria.coordinates)).toBe(true);
    }
  });

  it('los lotes son los mismos predios que la consulta de fichas', () => {
    const lotes = (plano()?.['lotes'] ?? []) as readonly Record<string, unknown>[];
    const fichas = (paginadoDe('GET', '/api/v1/catastro/fichas')?.contenido ??
      []) as readonly Record<string, unknown>[];

    expect(lotes.map((lote) => lote['predioId'])).toEqual(fichas.map((f) => f['predioId']));
    expect(lotes.map((lote) => lote['codRefCatastral'])).toEqual(
      fichas.map((f) => f['codRefCatastral']),
    );
  });

  it('el predio sin código predial compuesto no se rellena: sector, manzana y lote van nulos', () => {
    const lotes = (plano()?.['lotes'] ?? []) as readonly Record<string, unknown>[];
    // La tercera fila del prototipo trae «—» en su código predial: es un predio
    // del padrón al que nadie le ha compuesto todavía el suyo. Inventarle un
    // sector aquí sería el «—» de #322 al revés (RNF-080), y en el mapa
    // colocaría el lote dentro de una manzana que no es la suya.
    const sinCodigo = lotes.filter((lote) => lote['codigoDeSector'] === null);
    expect(sinCodigo).toHaveLength(1);
    expect(sinCodigo[0]?.['codigoDeManzana']).toBeNull();
    expect(sinCodigo[0]?.['lote']).toBeNull();
  });

  it('ninguno trae un área ni un arancel: los dos están prohibidos aquí', () => {
    const lotes = (plano()?.['lotes'] ?? []) as readonly Record<string, unknown>[];
    for (const lote of lotes) {
      // El área del polígono no es la imponible (ADR-0021) y el arancel no es
      // resoluble por lote (ADR-0022 §5). Publicarlos aquí sería exactamente lo
      // que el issue de este visor existe para no hacer.
      for (const clave of Object.keys(lote)) {
        expect(clave).not.toMatch(/area|arancel|autovaluo|importe/i);
      }
    }
  });
});
