import { describe, expect, it } from 'vitest';
import { recursoDe } from './recursos';

/**
 * **El mes de una fila no se resuelve con un valor por omision** (#398, AC 3 de
 * #429).
 *
 * El prototipo escribe **«Agosto (al 13)»** para el mes en curso —la etiqueta
 * lleva el corte dentro—, y el diccionario de meses no reconoce esa cadena
 * entera. El `?? '1'` que habia antes mandaba esa fila a **enero**: una segunda
 * fila de enero con las cifras de agosto, indistinguible de la buena.
 *
 * `mesDelPrototipo` lo arreglo mirando **la primera palabra**, y hasta ahora
 * nada lo sujetaba: el arreglo vivia en un docblock. Esto lo mide sobre los dos
 * resumenes de recaudacion que lo usan —el de transito y el administrativo—,
 * que es donde la etiqueta llega tal cual la escribe el prototipo.
 *
 * Se comprueba lo que no puede pasar, y no la lista de meses: **ninguna fila
 * cae en un mes que la tabla no nombra**, y agosto aparece con su numero.
 */

const RESUMENES: readonly (readonly [string, string])[] = [
  ['transito', '/transito/reportes/resumen-recaudacion'],
  ['administrativas', '/infracciones/administrativas/reportes/resumen-recaudacion'],
];

/** Los meses de las lineas de ese resumen, tal como los publica el proxy. */
function mesesDe(ruta: string): readonly number[] {
  const recurso = recursoDe('GET', `/api/v1${ruta}`);
  expect(recurso, `el proxy no publica ${ruta}`).not.toBeNull();
  const lineas = recurso?.['lineas'];
  expect(Array.isArray(lineas), `${ruta} no trae lineas`).toBe(true);
  return (lineas as readonly Readonly<Record<string, unknown>>[]).map((linea) =>
    Number(linea['mes']),
  );
}

describe('el mes de una fila sale de su etiqueta, no de un valor por omision', () => {
  it.each(RESUMENES)('el resumen de %s no manda ninguna fila a un mes inventado', (_, ruta) => {
    const meses = mesesDe(ruta);
    expect(meses.length).toBeGreaterThan(0);
    /* El 0 es lo que devuelve `mesDelPrototipo` cuando no reconoce la etiqueta:
       no es un mes, y ninguna fila del prototipo llega a el. Antes de #398 lo
       que devolvia era **1**, que si lo parece. */
    expect(new Set(meses), 'hay una fila con un mes que la tabla no nombra').not.toContain(0);
  });

  it('«Agosto (al 13)» es agosto, y no una segunda fila de enero', () => {
    // El mes en curso es el unico que el prototipo escribe con el corte dentro,
    // y es exactamente la fila que el `?? '1'` perdia.
    const meses = mesesDe('/transito/reportes/resumen-recaudacion');
    expect(new Set(meses), 'agosto no llego con su numero').toContain(8);
  });
});
