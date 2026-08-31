import { describe, expect, it } from 'vitest';
import { agruparMiles, formatearFecha, formatearFechaHora, formatearImporte } from './dinero';

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

describe('agruparMiles', () => {
  it('agrupa la parte entera y no toca el punto decimal ni antepone «S/» (#342, nit 6)', () => {
    // A diferencia de `formatearImporte`: sin simbolo de moneda, sin forzar
    // decimales, y el punto sigue siendo punto — no coma.
    expect(agruparMiles('1848.66')).toBe(`1${ESPACIO_FINO}848.66`);
    expect(agruparMiles('71402118.40')).toBe(`71${ESPACIO_FINO}402${ESPACIO_FINO}118.40`);
  });

  it('un numero de tres cifras o menos sale igual: no hay millar que agrupar', () => {
    expect(agruparMiles('386.40')).toBe('386.40');
    expect(agruparMiles('6.10')).toBe('6.10');
  });

  it('antepone el signo, como `formatearImporte`', () => {
    expect(agruparMiles('-67302.10')).toBe(`-67${ESPACIO_FINO}302.10`);
  });

  /**
   * **Lo que no es un numero simple se devuelve tal cual** (#342, nit 6): un
   * codigo con ceros a la izquierda no es una cantidad, y agruparle los
   * millares le cambiaria el valor que identifica. Es la misma razon por la
   * que el catalogo portado no marca esas columnas como `num` —ver
   * `TablaDePantalla`—, y esta funcion no intenta adivinar lo que el catalogo
   * ya decidio.
   */
  it('un codigo, un porcentaje o «—» no son numeros simples: pasan sin tocar', () => {
    expect(agruparMiles('00001182')).toBe('00001182');
    expect(agruparMiles('50.00%')).toBe('50.00%');
    expect(agruparMiles('—')).toBe('—');
    expect(agruparMiles('')).toBe('');
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
