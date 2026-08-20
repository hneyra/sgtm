import { describe, expect, it } from 'vitest';
import { adaptarAvanceDeRecaudacion, leerAvanceDeRecaudacion } from './recaudacion';
import type { AvanceDeRecaudacion } from './recaudacion';

/**
 * El adaptador es una funcion pura: recurso del dominio → lo que dibujan los
 * bloques. Se prueba sin HTTP, sin proveedores y sin montar nada, que es
 * justamente lo que se gana al separarlo de la peticion.
 */

const AVANCE: AvanceDeRecaudacion = {
  fechaCalculo: '2026-08-13',
  indicadores: [{ concepto: 'Recaudado', cifra: 'S/ 18.42 M', nota: '77.6 % de lo emitido' }],
  carteras: [
    {
      titulo: 'Recaudación por tributo',
      nota: 'Ejercicio 2026',
      lineas: [
        {
          concepto: 'Impuesto predial',
          detalle: '24,118 contribuyentes',
          cifra: 'S/ 8.42 M',
          avance: 71,
        },
      ],
    },
  ],
};

describe('el adaptador traduce el recurso a los bloques', () => {
  it('los indicadores del dominio se dibujan como indicadores de la pantalla', () => {
    const datos = adaptarAvanceDeRecaudacion(AVANCE);
    expect(datos.kpis).toEqual([
      { label: 'Recaudado', value: 'S/ 18.42 M', note: '77.6 % de lo emitido' },
    ]);
  });

  it('la cartera se dibuja como panel, con el avance que calculo el backend', () => {
    const datos = adaptarAvanceDeRecaudacion(AVANCE);
    expect(datos.paneles?.[0]?.title).toBe('Recaudación por tributo');
    expect(datos.paneles?.[0]?.rows[0]).toEqual({
      label: 'Impuesto predial',
      sub: '24,118 contribuyentes',
      value: 'S/ 8.42 M',
      pct: 71,
    });
  });

  it('toda cifra que sale del adaptador lleva su fecha de calculo (RNF-075)', () => {
    // El tipo de salida la exige: un adaptador que la perdiera no compilaria.
    // `verificaciones/adaptador-conserva-la-fecha.test.ts` lo demuestra con tsc.
    expect(adaptarAvanceDeRecaudacion(AVANCE).fechaCalculo).toBe('2026-08-13');
  });

  it('no inventa cifras: lo que no viene en el recurso no aparece', () => {
    const vacio = adaptarAvanceDeRecaudacion({
      fechaCalculo: '2026-08-13',
      indicadores: [],
      carteras: [],
    });
    expect(vacio.kpis).toEqual([]);
    expect(vacio.paneles).toEqual([]);
    expect(vacio.totales).toBeUndefined();
  });
});

describe('la frontera valida lo que el contrato todavia no describe', () => {
  it('lee el cuerpo que sirve la operacion', () => {
    const recurso = leerAvanceDeRecaudacion({
      fechaCalculo: '2026-08-13',
      kpis: [{ label: 'Recaudado', value: 'S/ 18.42 M', note: '77.6 %' }],
      paneles: [
        {
          title: 'Por tributo',
          note: '2026',
          rows: [{ label: 'Predial', sub: '', value: 'S/ 8.42 M', pct: 71 }],
        },
      ],
    });
    expect(recurso.indicadores).toHaveLength(1);
    expect(recurso.carteras[0]?.lineas[0]?.avance).toBe(71);
  });

  it('cifras sin fecha de calculo no pasan: se para en la frontera (RNF-075)', () => {
    expect(() => leerAvanceDeRecaudacion({ kpis: [] })).toThrow(/fecha/);
  });

  it('un cuerpo que no es un objeto se rechaza en vez de dibujarse a medias', () => {
    expect(() => leerAvanceDeRecaudacion('vaya')).toThrow();
  });
});
