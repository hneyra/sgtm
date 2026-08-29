import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { solicitar } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import {
  PANTALLAS_SIMULADAS,
  conLoSimulado,
  desinstalarProxyDeDatos,
  instalarProxyDeDatos,
} from './index';

/**
 * Lo que el proxy anade a la respuesta de las cinco pantallas que determinan.
 *
 * Se pide por HTTP y no llamando a `conLoSimulado` a secas porque lo que hay
 * que defender no es la funcion: es que el dato **llegue a la pantalla**. Entre
 * la funcion y la pantalla hay tres bifurcaciones del proxy —`paginadoDe`,
 * `recursoDe`, `escrituraDe`— que se llevan la respuesta antes del camino
 * comun, y una pantalla que caiga en cualquiera de ellas no ve la
 * determinacion aunque este declarada. Es exactamente lo que le pasa a
 * `arbitrios`, y por eso hay una prueba que lo fija.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('la respuesta dice con que conjunto se determino', () => {
  /**
   * Sin el conjunto, «587.44» no se puede volver a obtener (`ARQ-09` §3): la
   * misma pantalla, el mismo predio y otro conjunto sellado del mismo ejercicio
   * dan otro importe, y los dos son correctos. Y se comprueba a la vez que los
   * campos del prototipo **siguen ahi**: anadir el dato es envolver la
   * respuesta, no sustituirla, y una memoria de calculo sin sus tramos no es
   * una memoria de calculo.
   */
  it('el calculo individual del predial trae su conjunto, su sujeto y sus tramos', async () => {
    const datos = await solicitar<DatosDePantalla>('/rentas/predial/calculo-individual', {
      metodo: 'POST',
      cuerpo: {},
    });

    expect(datos.determinacion).toEqual({
      conjunto: '2026 v1',
      sujeto: 'SUC. RUFINA MEDINA MEDINA',
    });
    expect(datos.campos?.['impuestoInsolutoAnualS']).toBe('587.44');
    expect(datos.campos?.['tramo1Hasta15Uit02']).toContain('→');
  });

  /**
   * Y no es una sola: el sujeto de una determinacion masiva **no es un
   * nombre**. Si la interfaz tuviera que componerlo, aqui escribiria
   * «Contribuyente: —» encima del padron entero; el servidor lo redacta como lo
   * que es, un alcance.
   */
  it('el calculo masivo trae el mismo conjunto y un sujeto que no es una persona', async () => {
    const datos = await solicitar<DatosDePantalla>('/rentas/predial/calculo-masivo', {
      metodo: 'POST',
      cuerpo: {},
    });

    expect(datos.determinacion).toEqual({
      conjunto: '2026 v1',
      sujeto: 'Padrón completo del ejercicio',
    });
    expect(datos.campos?.['ejercicioACalcular']).toBe('2026');
  });

  /**
   * **Arbitrios esta declarada y no lo recibe, y eso se fija aqui.**
   *
   * `GET /rentas/arbitrios` la contesta `paginadoDe` con la forma de
   * `ArbitrioResource` dentro del sobre de `RespuestaPaginada` (#31, #73): ahi
   * el proxy habla el idioma que el backend publica de verdad, y anadirle un
   * campo que ese recurso no tiene seria decir que el contrato lo tiene. La
   * entrada se queda en `simulados.ts` porque la pantalla es una de las cinco
   * que determinan; lo que no se hace es colar el dato por una ruta que ya
   * tiene dueno.
   */
  it('arbitrios no la trae: esa ruta habla el idioma del Resource, no el del prototipo', async () => {
    const respuesta = await solicitar<Record<string, unknown>>('/rentas/arbitrios', {
      consulta: { anio: '2026' },
    });

    expect(Array.isArray(respuesta['contenido'])).toBe(true);
    expect(respuesta['determinacion']).toBeUndefined();
    expect(PANTALLAS_SIMULADAS).toContain('arbitrios');
  });

  /**
   * Y la pantalla que no determina sale **tal cual**. No se le pone un conjunto
   * vacio ni un «—»: un conjunto en blanco se leeria como «se determino sin
   * parametros», y eso no le pasa a ninguna cifra.
   *
   * El ejemplo es una que cae en el camino comun de verdad. `contribuyentes`
   * —el candidato obvio— no sirve para esto: su ruta esta en `PAGINADOS` desde
   * #11 y sale por la misma bifurcacion que arbitrios, asi que probar con ella
   * comprobaria otra vez lo de arriba y no esto.
   */
  it('una pantalla que no determina sale sin el dato, no con el dato vacio', async () => {
    const datos = await solicitar<DatosDePantalla>('/transito/reportes/resumen-papeletas');

    expect(datos.tabla?.filas.length).toBeGreaterThan(0);
    expect(datos.determinacion).toBeUndefined();
    expect('determinacion' in datos).toBe(false);
  });

  /** Y lo mismo dicho sobre la funcion, para `contribuyentes` incluida. */
  it.each(['contribuyentes', 'predios_rentas', 'caja_tributaria'])(
    '«%s» no esta declarada y sale intacta',
    (pantalla) => {
      const datos: DatosDePantalla = { fechaCalculo: '2026-08-13', campos: { ano: '2026' } };

      expect(conLoSimulado(pantalla, datos)).toBe(datos);
    },
  );
});

describe('el registro se consulta con Object.hasOwn', () => {
  /**
   * Indexar resuelve por la cadena de prototipos, asi que una pantalla llamada
   * `toString` recibiria la funcion heredada de `Object` como si fuera una
   * determinacion que alguien declaro. Se llama a la funcion directamente
   * porque `toString` no es ninguna de las 134 y por HTTP no hay forma de
   * pedirla: la barrera se prueba donde esta.
   */
  it.each(['toString', 'constructor', 'valueOf', 'hasOwnProperty'])(
    'una pantalla llamada «%s» no hereda ninguna determinacion',
    (heredada) => {
      const datos: DatosDePantalla = { fechaCalculo: '2026-08-13' };

      expect(conLoSimulado(heredada, datos)).toEqual(datos);
      expect(conLoSimulado(heredada, datos).determinacion).toBeUndefined();
    },
  );
});

describe('el inventario de lo simulado se puede leer entero', () => {
  /**
   * Son cinco, y estan enumeradas para que anadir una sexta sea un cambio que
   * se ve en el diff. `simulados.ts` es el unico sitio del proxy donde se
   * inventa algo (ADR-0010 §4): si crece en silencio, deja de verse de lejos,
   * que es la unica razon por la que esta apartado.
   */
  it('son exactamente las cinco pantallas que determinan', () => {
    expect([...PANTALLAS_SIMULADAS].sort()).toEqual([
      'alcabala',
      'arbitrios',
      'predial_individual',
      'predial_masivo',
      'vehicular_calculo',
    ]);
  });
});
