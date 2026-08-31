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
 * y ahi es donde se para:
 *
 *   las cinco etapas   existen, y **solo como respuesta del `POST` que corre la
 *                      emision**: `CorridaPredialResource.etapas` viaja en la
 *                      contestacion de `predial_masivo`. Ninguna lectura las
 *                      publica, asi que una portada que las enseñara al abrir el
 *                      modulo tendria que **lanzar la corrida** —un proceso que
 *                      toca 62 418 cuentas— o inventarlas
 *   tres indicadores   «Predial determinado», «Observados sin emision» y
 *                      «Recaudado del emitido» salen de esa misma corrida, o del
 *                      panel de recaudacion, que es una opcion de **otro modulo**
 *                      (`inicio`, `GET /indicadores/recaudacion`) y publica las
 *                      cifras de la municipalidad entera, no las de la emision
 *                      predial
 *   uno si esta        «Contribuyentes en el padron» es el `totalElementos` de
 *                      `GET /rentas/contribuyentes`
 *
 * Una portada con un numero de verdad y siete guiones no es mejor que el hub que
 * ya hay: el hub al menos lista lo que se puede hacer. Asi que el modulo se
 * queda con el generico, como los otros once, y lo que desbloquea esta fase
 * queda dicho: **una lectura que publique el resumen de la ultima corrida**.
 *
 * Estas pruebas se ponen **rojas el dia que exista**, que es el dia de releer
 * esto.
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
  it('ninguna lectura del contrato publica el estado de la emision', () => {
    const lecturas = operacionesDeLaCorrida().filter((o) => o.metodo === 'GET');
    expect(lecturas, 'un GET de la corrida: es lo que desbloquea #503 F6').toEqual([]);

    // Y el `POST` que sí la corre sigue ahí, para que esto no pase en verde
    // porque el camino haya cambiado de nombre.
    expect(operacionesDeLaCorrida().map((o) => `${o.metodo} ${o.ruta}`)).toContain(
      'POST /rentas/predial/calculo-masivo',
    );
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
