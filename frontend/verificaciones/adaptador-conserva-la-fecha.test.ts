import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compilar } from './compilar';

/**
 * Un adaptador que pierde la fecha de calculo no compila (regla 9, RNF-075).
 *
 * Es el criterio de #62 que no se puede comprobar ejecutando: si el adaptador
 * no compila, no hay nada que ejecutar. Asi que se compila la muestra que lo
 * viola y se exige que `tsc` se queje. El control positivo es todo lo demas:
 * `yarn typecheck` compila los adaptadores de verdad en cada verificacion.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

describe('la fecha de calculo no se puede perder por el camino', () => {
  it('un adaptador que la deja fuera no compila', () => {
    const quejas = compilar([join(AQUI, 'muestras/adaptador-sin-fecha.ts')], RAIZ);
    expect(quejas.join('\n')).toMatch(/fechaCalculo/);
  });

  it('el adaptador de verdad, el mismo que usa la pantalla, compila limpio', () => {
    const quejas = compilar(
      [join(RAIZ, 'apps/backoffice/src/pantallas/inicio/recaudacion.ts')],
      RAIZ,
    );
    expect(quejas).toEqual([]);
  });
});
