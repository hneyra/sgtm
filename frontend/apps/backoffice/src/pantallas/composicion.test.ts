import { describe, expect, it } from 'vitest';
import { filtrosDe, resolutorDeCampo, widgetDeFiltro } from './composicion';
import { cargarTodosLosAportes } from './aportes-de-modulo';

/* Lo que se prueba aqui es **el registro mismo** —que `widgetDeFiltro` y
   `resolutorDeCampo` no resuelvan por la cadena de prototipos—, asi que hay que
   llenarlo. Es el unico archivo que registra los doce y puede hacerlo sin
   taparse: no monta ninguna pantalla, de modo que no hay carga diferida a la que
   este registro le pueda ahorrar el trabajo (#433). */
await cargarTodosLosAportes();

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

/**
 * `filtrosDelBackend`: lo que el servicio acota y el prototipo no dibuja (#544).
 *
 * Las tres propiedades que sostienen el mecanismo, y ninguna es cosmetica: sustituir
 * **en el sitio** conserva el orden de la barra que el manual dibujo (RNF-080);
 * anadir al final es lo que permite ofrecer un filtro que el prototipo nunca tuvo
 * sin reordenar los suyos; y **negacion por omision**, que es lo que garantiza que
 * las otras 133 pantallas se dibujen como se dibujaban.
 */
describe('filtrosDe compone lo que el catalogo dibuja con lo que el servicio acota', () => {
  const DEL_CATALOGO = [
    { clave: 'usuario', label: 'Usuario', t: 'sel' as const },
    { clave: 'accion', label: 'Acción', t: 'sel' as const },
    { clave: 'desde', label: 'Desde', t: 'date' as const },
  ];

  it('sustituye en el sitio del filtro al que releva, y anade el suyo al final', () => {
    const compuestos = filtrosDe('auditoria', DEL_CATALOGO) ?? [];

    expect(compuestos.map((campo) => campo.clave)).toEqual([
      'usuario',
      'operacion',
      'desde',
      'tabla',
    ]);
    // El rotulo sigue siendo el del manual: lo que cambia es a donde va y con
    // que vocabulario.
    expect(compuestos[1]?.label).toBe('Acción');
  });

  it('una opcion que no declara nada se dibuja exactamente como se dibujaba', () => {
    expect(filtrosDe('modulos', DEL_CATALOGO)).toEqual(DEL_CATALOGO);
  });

  it('sin filtros en el catalogo no hay barra que completar', () => {
    // Anadir un filtro no puede hacer aparecer un bloque de busqueda donde el
    // prototipo no dibujo ninguno: para eso esta `filtrosPropios`, que es otra
    // decision y se toma pantalla por pantalla.
    expect(filtrosDe('auditoria', undefined)).toBeUndefined();
  });
});
