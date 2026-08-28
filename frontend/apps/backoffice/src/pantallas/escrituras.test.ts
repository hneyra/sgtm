import { describe, expect, it } from 'vitest';
import { faltaEnElAlta, unidadDelTributo } from './escrituras';

/**
 * `faltaEnElAlta` en unidad, tras el repaso de #342 (seguimiento de #331/#341).
 *
 * Dos guardas que el camino feliz —montar la pantalla y elegir del
 * desplegable— no puede ejercer, y una doctrina del repo dice por que eso
 * importa: «una regla que no puede fallar no protege nada». Aqui se demuestra
 * lo contrario.
 */

const BORRADOR_PREDIAL = { conceptoTributo: 'IMPUESTO PREDIAL' };

describe('la rama `unidad === undefined` (#342, nit 2)', () => {
  it('con los cinco tributos reales, hoy ninguno la alcanza', () => {
    // Lo que sostiene que la rama no se alcanza con datos reales: los cinco
    // codigos que el alta puede mandar estan todos clasificados. Si un dia
    // deja de ser cierto, esta prueba lo dice antes que un contribuyente.
    for (const codigo of ['PREDIAL', 'ARBITRIO', 'VEHICULAR', 'ALCABALA', 'MULTA_ADMINISTRATIVA']) {
      expect(unidadDelTributo(codigo)).not.toBeUndefined();
    }
  });

  it('un codigo que la clasificacion todavia no cubre exige avisar a sistemas, no deja pasar', () => {
    // El concepto real («IMPUESTO PREDIAL») resuelve a un tributo real
    // («PREDIAL»); lo que se sustituye es solo el resolutor de unidad, para
    // simular que ese tributo *todavia* no esta en `UNIDAD_DEL_TRIBUTO` —sin
    // tocar la constante de produccion, que es la unica forma de reproducir
    // este caso hoy.
    const motivo = faltaEnElAlta(BORRADOR_PREDIAL, () => undefined);
    expect(motivo).toMatch(/todavía no sabe de qué unidad cuelga/);
    expect(motivo).toMatch(/Avísale a sistemas/);
  });

  it('con el resolutor real, el mismo borrador si pasa esa rama (control del caso anterior)', () => {
    // El complemento: si la prueba de arriba fallara por casualidad —un motivo
    // que sale igual pase lo que pase—, esta lo delataria. Con el resolutor
    // real la rama de unidad no se alcanza: `PREDIAL` resuelve a `'ninguna'`,
    // y sin predio ni vehiculo escritos, el año y el documento —la rama de
    // #342, nit 3— son lo unico que falta.
    expect(
      faltaEnElAlta({ ...BORRADOR_PREDIAL, ano: '2026', nDelDocumento: 'RD-2026-0001' }),
    ).toBeUndefined();
  });
});

describe('el año y el documento se exigen con la misma dureza que el concepto (#342, nit 3)', () => {
  it('sin año, el alta no pasa aunque el concepto y la unidad ya esten resueltos', () => {
    const motivo = faltaEnElAlta(BORRADOR_PREDIAL);
    expect(motivo).toMatch(/Falta el año/);
  });

  it('con año, sin documento que sustente, tampoco pasa', () => {
    const motivo = faltaEnElAlta({ ...BORRADOR_PREDIAL, ano: '2026' });
    expect(motivo).toMatch(/Falta el número del documento/);
  });

  it('con concepto, año y documento, el predial —que no exige unidad— pasa', () => {
    expect(
      faltaEnElAlta({ ...BORRADOR_PREDIAL, ano: '2026', nDelDocumento: 'RD-2026-0001' }),
    ).toBeUndefined();
  });
});
