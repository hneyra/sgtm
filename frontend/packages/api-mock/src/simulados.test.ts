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
 * Lo que el proxy anade a la respuesta de las pantallas que determinan **y
 * todavia no tienen controlador**: tres, desde #395.
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
   * **Las dos prediales ya no pasan por aqui** (#395), y esta prueba lo fija.
   *
   * `PredialController` publica sus dos operaciones, asi que el proxy las
   * contesta por `recursos.ts` con la forma del backend —el recurso del
   * dominio— y su conjunto viaja **dentro** del recurso, que es donde el
   * servidor lo pone. Lo que se comprueba es que no queda ni rastro del dato
   * inventado: ni `determinacion` colgando de la respuesta, ni los campos del
   * prototipo, que era la otra mitad de lo que llegaba por el camino comun.
   */
  it('el calculo individual del predial responde su recurso, no la forma comun', async () => {
    const recurso = await solicitar<Record<string, unknown>>('/rentas/predial/calculo-individual', {
      metodo: 'POST',
      cuerpo: { simulacion: true },
    });

    // El conjunto va dentro del recurso, con el sujeto que redacto el servidor.
    expect(recurso['conjunto']).toBe('2026 v1');
    expect(recurso['sujeto']).toBe('SUC. RUFINA MEDINA MEDINA');
    // Ya no cuelga de la respuesta como un anadido del proxy.
    expect(recurso['determinacion']).toBeUndefined();
    expect(recurso['campos']).toBeUndefined();
    // Y las cifras salen como las serializa el backend: sin separador de miles.
    expect(recurso['impuestoInsoluto']).toBe('587.44');
    expect(recurso['valuoAfecto']).toBe('151406.75');
  });

  /**
   * Y la corrida masiva igual, con la diferencia que decide su banda: **no
   * publica ningun sujeto**. El de una corrida no es un registro sino un
   * alcance, y componerlo en la interfaz es lo que `DatosDeDeterminacion.sujeto`
   * existe para impedir; por eso el adaptador no dibuja banda en esa pantalla.
   */
  it('el calculo masivo responde su corrida, con conjunto y sin sujeto', async () => {
    const recurso = await solicitar<Record<string, unknown>>('/rentas/predial/calculo-masivo', {
      metodo: 'POST',
      cuerpo: { simulacion: true },
    });

    expect(recurso['conjunto']).toBe('2026 v1');
    expect(recurso['sujeto']).toBeUndefined();
    expect(recurso['determinacion']).toBeUndefined();
    expect(recurso['ejercicio']).toBe('2026');
    expect(Array.isArray(recurso['etapas'])).toBe(true);
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
  it.each(['contribuyentes', 'declaracion_jurada', 'caja_tributaria'])(
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
   * Eran cinco, fueron tres desde #395 y son **dos** desde #399:
   * `predial_individual` y `predial_masivo` se fueron el dia que su controlador
   * existio, y `vehicular_calculo` el dia que el suyo se pudo llamar —lo tenia
   * desde #32 y el contrato y el controlador no decian lo mismo sobre por donde
   * viajan sus filtros—. Es la regla del archivo cumpliendose. Estan enumeradas
   * para que anadir una tercera —o quitar otra— sea un cambio que se ve en el
   * diff. `simulados.ts` es el unico sitio del proxy donde se inventa algo
   * (ADR-0010 §4): si crece en silencio, deja de verse de lejos, que es la unica
   * razon por la que esta apartado.
   */
  it('son exactamente las dos que todavia no tienen controlador que las conteste', () => {
    expect([...PANTALLAS_SIMULADAS].sort()).toEqual(['alcabala', 'arbitrios']);
  });
});
