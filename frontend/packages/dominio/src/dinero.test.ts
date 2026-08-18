import { describe, expect, it } from 'vitest';
import { formatearFecha, formatearFechaHora, formatearImporte } from './dinero';

const ESPACIO_FINO = ' ';

describe('formatearImporte', () => {
  it('agrupa millares y siempre muestra dos decimales', () => {
    expect(formatearImporte('1240.5')).toBe(`S/ 1${ESPACIO_FINO}240,50`);
    expect(formatearImporte('0')).toBe('S/ 0,00');
    expect(formatearImporte('153.82')).toBe('S/ 153,82');
  });

  it('conserva los centimos de cifras que un number redondearia', () => {
    // 71402118.4 ya no es exacto en punto flotante; el texto si lo es.
    expect(formatearImporte('71402118.40')).toBe(`S/ 71${ESPACIO_FINO}402${ESPACIO_FINO}118,40`);
    expect(formatearImporte('9007199254740993.07')).toBe(
      `S/ 9${ESPACIO_FINO}007${ESPACIO_FINO}199${ESPACIO_FINO}254${ESPACIO_FINO}740${ESPACIO_FINO}993,07`,
    );
  });

  it('antepone el signo en importes negativos, como un vuelto insuficiente', () => {
    expect(formatearImporte('-67.30')).toBe('-S/ 67,30');
  });

  it('no inventa un cero cuando no hay cifra', () => {
    expect(formatearImporte('')).toBe('—');
  });
});

describe('formatearFecha', () => {
  it('presenta la fecha tributaria en formato peruano', () => {
    expect(formatearFecha('2026-08-13')).toBe('13/08/2026');
  });

  it('devuelve el valor sin tocar si no reconoce el formato', () => {
    expect(formatearFecha('Mensual')).toBe('Mensual');
  });

  it('agrega la hora cuando el instante la trae', () => {
    expect(formatearFechaHora('2026-08-13T11:44:00Z')).toBe('13/08/2026 11:44');
  });
});
