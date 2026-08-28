import { describe, expect, it } from 'vitest';
import { resolutorDeCampo, widgetDeFiltro } from './composicion';

/**
 * `Object.hasOwn` en `widgetDeFiltro` y `resolutorDeCampo` (#342, nit 2).
 *
 * La barrera existe contra un campo llamado `constructor` —o `toString`,
 * `hasOwnProperty`…—: indexar un objeto plano con esa clave con `objeto[clave]`
 * no da `undefined`, da el método heredado del prototipo de `Object`, y el
 * renderizador intentaría dibujarlo como si fuera un widget o un resolutor
 * declarado. Ninguna opción real se llama así, así que la doctrina del repo
 * aplica: una barrera que ningún dato real ejercita no protege nada hasta que
 * una prueba la ejercita a propósito.
 */

describe('widgetDeFiltro no resuelve por la cadena de prototipos', () => {
  it('un campo declarado de verdad sí se resuelve', () => {
    // `consulta_fichas` declara `widgetsDeFiltro` para `codRefCatastral`
    // (`catastro/composicion.ts`).
    expect(widgetDeFiltro('consulta_fichas', 'codRefCatastral')).not.toBeUndefined();
  });

  it('un campo que no declaro nadie da `undefined`, aunque la opcion tenga widgets', () => {
    expect(widgetDeFiltro('consulta_fichas', 'campoQueNadieDeclaro')).toBeUndefined();
  });

  it('«constructor» no hereda el de `Object`: sin `Object.hasOwn` esto daria una funcion', () => {
    const heredado = widgetDeFiltro('consulta_fichas', 'constructor');
    expect(heredado).toBeUndefined();
    expect(typeof heredado).not.toBe('function');
  });
});

describe('resolutorDeCampo no resuelve por la cadena de prototipos', () => {
  it('un campo declarado de verdad si se resuelve', () => {
    // `alta_deuda` declara un resolutor para `unidadPredioPlaca`
    // (`rentas/composicion.ts`).
    expect(resolutorDeCampo('alta_deuda', 'unidadPredioPlaca')).not.toBeUndefined();
  });

  it('un campo que no declaro nadie da `undefined`, aunque la opcion tenga resolutores', () => {
    expect(resolutorDeCampo('alta_deuda', 'campoQueNadieDeclaro')).toBeUndefined();
  });

  it('«constructor» no hereda el de `Object`: sin `Object.hasOwn` esto daria una funcion', () => {
    const heredado = resolutorDeCampo('alta_deuda', 'constructor');
    expect(heredado).toBeUndefined();
    expect(typeof heredado).not.toBe('function');
  });

  it('«toString» tampoco: la misma barrera, otra clave heredada', () => {
    expect(resolutorDeCampo('alta_deuda', 'toString')).toBeUndefined();
  });
});
