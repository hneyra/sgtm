import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OPERACIONES } from '@sgtm/api-client';

/**
 * **Por que Rentas no tiene todavia su panel de modulo** (#503 F6), medido en vez
 * de anotado en un comentario.
 *
 * El prototipo dibuja como portada del modulo el **estado de la emision**: las
 * cinco etapas de la corrida anual —lectura del padron, valuacion, determinacion
 * del impuesto, determinacion de arbitrios, generacion de cuponeras—, cada una
 * con sus registros y sus observados, y cuatro indicadores encima.
 *
 * La fase pide que **cada cifra salga de una operacion del contrato** (RNF-083),
 * y cuando se midio, de las nueve solo **una** podia: «Contribuyentes en el
 * padron», el `totalElementos` de `GET /rentas/contribuyentes`. Las cinco etapas
 * existian **solo como respuesta del `POST` que corre la emision**, asi que una
 * portada que las enseñara al abrir tendria que lanzar la corrida —un proceso
 * que toca decenas de miles de cuentas— o inventarlas.
 *
 * **Ese era el bloqueo, y #523 lo levanto.** El contrato publica ahora
 * `GET /rentas/predial/corridas/ultima` y sus observados, y esta prueba —que
 * estaba escrita para ponerse roja el dia que existieran— cambio de sitio lo que
 * mide: ya no que no haya lectura, sino que **la haya y no se pierda**. La
 * portada del modulo es lo que queda, y sigue faltandole tres indicadores.
 */

const CONTRATO = resolve(process.cwd(), '../docs/50-api/openapi/sgtm-v1.yaml');

/** Los caminos del contrato que hablan de la corrida masiva, con su verbo. */
function operacionesDeLaCorrida(): readonly { readonly metodo: string; readonly ruta: string }[] {
  const yaml = readFileSync(CONTRATO, 'utf8').split('\npaths:\n')[1] ?? '';
  const encontradas: { metodo: string; ruta: string }[] = [];
  let ruta: string | undefined;
  for (const linea of yaml.split('\n')) {
    const camino = /^ {2}"?(\/[^":\n]+)"?:\s*$/.exec(linea);
    if (camino) {
      ruta = camino[1] ?? undefined;
      continue;
    }
    const verbo = /^ {4}(get|post|put|patch|delete):\s*$/.exec(linea);
    // Acotado a `/rentas/predial`: `/fiscalizacion/predial/historico` y
    // `/consultas/resumen-predial` también dicen «predial» y son otra cosa —el
    // histórico de una fiscalización y el resumen de un contribuyente—, no el
    // estado de la corrida de emisión.
    if (verbo && ruta !== undefined && ruta.startsWith('/rentas/predial')) {
      encontradas.push({ metodo: (verbo[1] ?? '').toUpperCase(), ruta });
    }
  }
  return encontradas;
}

describe('el panel del modulo de Rentas espera a una lectura que no existe', () => {
  /**
   * **Las etapas viajan solo en la respuesta del `POST`.** Es lo que impide la
   * portada: una lectura de la ultima corrida seria un `GET`, y no hay ninguno.
   */
  it('el contrato publica la lectura de la corrida, y sus observados', () => {
    const rutas = operacionesDeLaCorrida().map((o) => `${o.metodo} ${o.ruta}`);

    expect(rutas, 'es lo que #523 añadió y lo que desbloquea la portada').toContain(
      'GET /rentas/predial/corridas/ultima',
    );
    expect(
      rutas,
      'y sus observados aparte: son cientos, y la cabecera no los trae',
    ).toContain('GET /rentas/predial/corridas/{corridaId}/observados');

    // Y el `POST` que la corre sigue ahí, para que esto no pase en verde porque
    // el camino haya cambiado de nombre.
    expect(rutas).toContain('POST /rentas/predial/calculo-masivo');
  });

  /**
   * **Lo que a la portada le sigue faltando**, para que quede medido y no en un
   * comentario: tres de sus cuatro indicadores no salen de este modulo.
   * «Predial determinado», «Observados sin emision» y «Recaudado del emitido»
   * salen de la corrida —los dos primeros ya se pueden leer— o del panel de
   * recaudacion, que es una opcion de **otro modulo** y publica las cifras de la
   * municipalidad entera, no las de la emision predial.
   */
  it('el avance de la recaudacion sigue siendo de otro modulo', async () => {
    const { OPCIONES } = await import('../../catalogo');
    expect(OPCIONES.find((o) => o.id === 'inicio')?.modulo.id).not.toBe('rentas-registro');
  });

  /**
   * El unico indicador de los cuatro que **si** tiene de donde salir. Se deja
   * escrito para que la portada, cuando llegue, no lo busque en otro sitio.
   */
  it('el padron si publica cuantos contribuyentes hay', () => {
    expect(Object.keys(OPERACIONES)).toContain('contribuyentes');
  });

  /**
   * Y los otros tres no salen de este modulo: `inicio` es del modulo Inicio, y
   * sus cifras son las de la municipalidad entera. Componer la portada de Rentas
   * con ellas seria enseñar el avance de toda la recaudacion bajo el rotulo de
   * la emision predial.
   */
  it('el panel de recaudacion es de otro modulo, y mide otra cosa', async () => {
    const { OPCIONES } = await import('../../catalogo');
    expect(OPCIONES.find((o) => o.id === 'inicio')?.modulo.id).not.toBe('rentas-registro');
  });
});
