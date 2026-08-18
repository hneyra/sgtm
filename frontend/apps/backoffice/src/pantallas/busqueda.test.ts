import { describe, expect, it } from 'vitest';
import {
  conCambio,
  conOrden,
  leerBusqueda,
  parametrosDeBusqueda,
  registroQueFalta,
} from './busqueda';

/**
 * El estado de una busqueda, leido y escrito en la URL.
 *
 * Se prueba sin montar nada porque es una funcion: lo que hace es traducir
 * entre la barra de direcciones y los parametros de una peticion, y esa
 * traduccion es donde se pierden los filtros al cambiar de pagina.
 */

const url = (consulta: string): URLSearchParams => new URLSearchParams(consulta);

describe('lo buscado se lee de la URL', () => {
  it('los filtros son la consulta menos lo que la busqueda se reserva', () => {
    const estado = leerBusqueda(url('sector=01&uso=Comercio&ordenarPor=nombre&pagina=3'));
    expect(estado.filtros).toEqual({ sector: '01', uso: 'Comercio' });
    expect(estado.orden).toBe('nombre');
    expect(estado.pagina).toBe(3);
  });

  it('un filtro vacio no es un filtro', () => {
    // `?sector=` no significa «sector en blanco», y el backend no tiene por que
    // adivinar cual de las dos cosas es.
    expect(leerBusqueda(url('sector=')).filtros).toEqual({});
  });

  it('sin pagina o con una pagina que no lo es, la primera', () => {
    expect(leerBusqueda(url('')).pagina).toBe(1);
    expect(leerBusqueda(url('pagina=0')).pagina).toBe(1);
    expect(leerBusqueda(url('pagina=tres')).pagina).toBe(1);
  });

  it('el sentido solo puede ser uno de los dos', () => {
    expect(leerBusqueda(url('direccion=DESCENDENTE')).sentido).toBe('DESCENDENTE');
    expect(leerBusqueda(url('direccion=vaya')).sentido).toBe('ASCENDENTE');
  });
});

describe('cambiar de pagina o de orden no pierde los filtros', () => {
  it('cambiar la pagina conserva lo demas', () => {
    const siguiente = conCambio(url('sector=01&uso=Comercio'), { pagina: '2' });
    expect(siguiente.get('sector')).toBe('01');
    expect(siguiente.get('uso')).toBe('Comercio');
    expect(siguiente.get('pagina')).toBe('2');
  });

  it('ordenar conserva los filtros y vuelve a la primera pagina', () => {
    // La pagina 7 de otro orden no es ninguna pagina.
    const siguiente = conOrden(url('sector=01&pagina=7'), 'nombreCalle');
    expect(siguiente.get('sector')).toBe('01');
    expect(siguiente.get('ordenarPor')).toBe('nombreCalle');
    expect(siguiente.get('direccion')).toBe('ASCENDENTE');
    expect(siguiente.has('pagina')).toBe(false);
  });

  it('la misma columna alterna el sentido; otra empieza ascendente', () => {
    const descendente = conOrden(url('ordenarPor=nombreCalle&direccion=ASCENDENTE'), 'nombreCalle');
    expect(descendente.get('direccion')).toBe('DESCENDENTE');
    const otra = conOrden(descendente, 'sector');
    expect(otra.get('ordenarPor')).toBe('sector');
    expect(otra.get('direccion')).toBe('ASCENDENTE');
  });
});

describe('que se manda y que se queda en la URL', () => {
  it('el registro de la ruta resuelve el parametro del camino', () => {
    expect(parametrosDeBusqueda('ficha_urbana', '01-02-03', url(''))).toEqual({
      codRefCatastral: '01-02-03',
    });
  });

  it('sin registro no hay parametro que resolver, y la pantalla lo sabe', () => {
    expect(parametrosDeBusqueda('ficha_urbana', undefined, url(''))).toEqual({});
    expect(registroQueFalta('ficha_urbana', undefined)).toBe('codRefCatastral');
    expect(registroQueFalta('ficha_urbana', '01-02-03')).toBeUndefined();
    // Una pantalla que no abre registros nunca esta esperando ninguno.
    expect(registroQueFalta('calles', undefined)).toBeUndefined();
  });

  it('viaja el filtro que el contrato declara', () => {
    expect(parametrosDeBusqueda('calles', undefined, url('sector=01'))).toEqual({ sector: '01' });
  });

  it('un filtro que el contrato no declara se queda en la URL y no viaja', () => {
    // La semantica de un filtro la decide el backend (ADR-0010): hasta que la
    // declare, el valor es del usuario pero no de la peticion.
    expect(parametrosDeBusqueda('calles', undefined, url('inventado=1'))).toEqual({});
  });

  it('la primera pagina no viaja, y la segunda viaja como la cuenta el backend', () => {
    // En la URL la primera es la 1 —como la cuenta quien la lee— y en la
    // peticion la primera es la 0 —como la cuenta el backend—.
    expect(parametrosDeBusqueda('calles', undefined, url('pagina=1'))).toEqual({});
    expect(parametrosDeBusqueda('calles', undefined, url('pagina=2'))).toEqual({ pagina: '1' });
  });

  it('el orden viaja con su direccion, con los nombres del backend', () => {
    expect(
      parametrosDeBusqueda('calles', undefined, url('ordenarPor=sector&direccion=DESCENDENTE')),
    ).toEqual({ ordenarPor: 'sector', direccion: 'DESCENDENTE' });
  });

  it('ninguna peticion lleva la municipalidad, ni como filtro de conveniencia', () => {
    // El contrato no la declara y el generador no dejaria declararla: el filtro
    // se queda en la URL de quien lo escribio y no llega al servidor.
    expect(parametrosDeBusqueda('calles', undefined, url('municipalidadId=2'))).toEqual({});
  });
});
