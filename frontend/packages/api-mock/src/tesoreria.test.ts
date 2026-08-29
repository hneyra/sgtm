import { describe, expect, it } from 'vitest';
import { paginadoDe, recursoDe } from './recursos';

/**
 * Las cuatro lecturas de tesorería que el proxy pasó a hablar con la forma
 * del `Resource` real del backend (#74, esta pasada).
 *
 * `/tesoreria/convenios` es un listado paginado (`RespuestaPaginada<ConvenioResource.FilaResource>`);
 * las otras tres son un recurso suelto (`DuplicadoResource` y
 * `RecaudacionResource.Avance`/`Distribucion`), sin sobre de paginación. Antes
 * de esta pasada `packages/api-mock/src/recursos.ts` no tenía ninguna ruta
 * `/tesoreria/*`, así que las cuatro salían por el camino común, con la forma
 * que comparten las 134 pantallas (el prototipo, sin envolver).
 */
describe('tesoreria: la forma que publica el backend', () => {
  it('/tesoreria/convenios trae contenido con los campos de FilaResource', () => {
    const paginado = paginadoDe('GET', '/api/v1/tesoreria/convenios');
    expect(paginado).not.toBeNull();
    expect(paginado?.contenido.length).toBeGreaterThan(0);
    const [fila] = paginado?.contenido ?? [];
    expect(fila).toMatchObject({
      nroConvenio: expect.any(String),
      contribuyente: expect.any(String),
      fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      deudaAcogidaS: expect.stringMatching(/^-?\d+\.\d{2}$/),
      cuotas: expect.any(Number),
      pagadas: expect.any(Number),
      vencidas: expect.any(Number),
      saldoS: expect.stringMatching(/^-?\d+\.\d{2}$/),
      estado: expect.any(String),
    });
  });

  it('/tesoreria/recibos/{nro}/duplicado trae DuplicadoResource, con ReciboResource dentro', () => {
    const recurso = recursoDe('GET', '/api/v1/tesoreria/recibos/001-0000123/duplicado');
    expect(recurso).not.toBeNull();
    expect(recurso).toMatchObject({
      estado: expect.stringMatching(/^(EMITIDO|ANULADO)$/),
      duplicados: expect.any(Number),
      recibo: {
        numero: expect.any(String),
        serie: expect.any(String),
        correlativo: expect.any(Number),
        cajero: expect.any(String),
        total: {
          importe: expect.stringMatching(/^-?\d+\.\d{2}$/),
          actualizadoA: expect.any(String),
        },
        lineas: expect.arrayContaining([
          expect.objectContaining({
            tributo: expect.any(String),
            insoluto: { importe: expect.any(String), actualizadoA: expect.any(String) },
          }),
        ]),
      },
    });
  });

  it('/tesoreria/recaudacion/avance trae RecaudacionResource.Avance, sin columnas inventadas', () => {
    const recurso = recursoDe('GET', '/api/v1/tesoreria/recaudacion/avance');
    expect(recurso).not.toBeNull();
    expect(recurso).toMatchObject({
      desde: expect.any(String),
      hasta: expect.any(String),
      aLaFecha: expect.any(String),
      cobrado: { importe: expect.any(String), actualizadoA: expect.any(String) },
      anulado: { importe: expect.any(String), actualizadoA: expect.any(String) },
      neto: { importe: expect.any(String), actualizadoA: expect.any(String) },
    });
    // Nada de «emitido», «saldo», «avance» ni «meta»: el recurso real no los publica.
    expect(recurso).not.toHaveProperty('emitido');
    expect(recurso).not.toHaveProperty('meta');
    const filas = recurso?.['filas'] as readonly Record<string, unknown>[];
    expect(filas.length).toBeGreaterThan(0);
    expect(filas[0]).toMatchObject({
      tributo: expect.any(String),
      cobrado: { importe: expect.any(String), actualizadoA: expect.any(String) },
    });
  });

  it('/tesoreria/recaudacion/por-area trae RecaudacionResource.Distribucion', () => {
    const recurso = recursoDe('GET', '/api/v1/tesoreria/recaudacion/por-area');
    expect(recurso).not.toBeNull();
    expect(recurso).toMatchObject({
      desde: expect.any(String),
      hasta: expect.any(String),
      aLaFecha: expect.any(String),
      neto: { importe: expect.any(String), actualizadoA: expect.any(String) },
      netoSinPartida: { importe: expect.any(String), actualizadoA: expect.any(String) },
    });
    const filas = recurso?.['filas'] as readonly Record<string, unknown>[];
    expect(filas.length).toBeGreaterThan(0);
    expect(filas[0]).toMatchObject({
      tributo: expect.any(String),
      cobrado: { importe: expect.any(String), actualizadoA: expect.any(String) },
    });
  });

  /**
   * La rotura demostrada: sin la ruta en el mapa, la lectura desaparece del
   * proxy en vez de dejar la tabla vacía en silencio. Es lo que hace que las
   * cuatro pruebas de arriba no puedan pasar por accidente.
   */
  it('sin la ruta en el mapa, la lectura desaparece del proxy (mutación de la guarda)', () => {
    expect(paginadoDe('GET', '/api/v1/tesoreria/no-existe')).toBeNull();
    expect(recursoDe('GET', '/api/v1/tesoreria/no-existe')).toBeNull();
  });
});
