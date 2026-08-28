import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OPERACIONES, consultaDeOperacion, descriptorDe, rutaDeOperacion } from './index';

/**
 * Lo que el contrato genera es lo que el contrato dice.
 *
 * Tres de los criterios de #61 se verifican **sobre la salida generada** y no
 * sobre el codigo escrito a mano, que es donde la regla de ESLint no llega: un
 * generador que se tragara un `municipalidadId` lo repartiria por las 134
 * operaciones sin que ninguna regla del proyecto lo viera pasar.
 */

// Se lee como texto, no como modulo: lo que hay que comprobar es lo que el
// generador escribio, incluidos los tipos, que en tiempo de ejecucion no existen.
const GENERADO = readFileSync(
  resolve(process.cwd(), 'packages/api-client/src/operaciones.generado.ts'),
  'utf8',
);

/**
 * El archivo sin sus comentarios. Lo que se comprueba es el codigo generado: la
 * prosa del encabezado habla de la municipalidad precisamente para explicar por
 * que ninguna operacion la recibe.
 */
const CODIGO = GENERADO.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** La misma lista de nombres con dinero que usan la regla de ESLint y el generador. */
const CAMPOS_DE_DINERO =
  'monto|importe|saldo|deuda|total|insoluto|interes|autovaluo|arbitrio|recargo|vuelto|recibido';

describe('las operaciones generadas son las del contrato', () => {
  it('son las 134 del manual, mas catorce operaciones sin pantalla propia', () => {
    // Operaciones que no son opciones del catalogo y no tienen pantalla propia
    // de la que salir (generar-openapi.mjs, OPERACIONES_ADICIONALES):
    //   - `permisos_de_grupo` (#70): el GET que carga la matriz que `permisos`
    //     guarda antes de guardarla.
    //   - `permisos_de_la_sesion` (ADR-0013): la matriz de permisos efectivos
    //     del usuario en curso, de la que la interfaz dibuja el menu.
    //   - `registrar_via` / `editar_via` (#290): el alta y la edicion de la
    //     pantalla `calles`, que declara «GET /catastro/vias» como su endpoint
    //     —la lectura— y necesita un verbo aparte para escribir.
    //   - `registrar_sector` / `editar_sector` / `registrar_manzana` (#290): lo
    //     mismo para `sectores`, que declara «GET /catastro/sectores». Las
    //     manzanas no tienen pantalla propia en el manual: cuelgan del sector,
    //     y solo se dan de alta —el codigo de una manzana es un tramo del
    //     codigo catastral de sus predios, asi que no se edita—.
    //   - `registrar_ficha_urbana` / `_economica` / `_bienes` / `_rural`
    //     (#290): el alta de la primera version de cada ficha. Las cuatro
    //     pantallas declaran «GET .../{codigo}» —leer la ficha de un predio—,
    //     y el alta no lleva codigo en la ruta porque el predio todavia no
    //     existe: nace en el mismo acto que su ficha.
    //   - `actualizar_ficha_economica` / `_bienes` / `_rural` (#290): el
    //     versionado de los otros tres tipos. `actualizacion_catastro` es una
    //     sola opcion del manual y su endpoint ya publica el PUT de la urbana,
    //     asi que los otros tres necesitan verbo propio bajo la misma opcion.
    //   - `costas_procesales_listado` (#42): la grilla «Liquidaciones
    //     encontradas» de la pantalla `costas_procesales`, que declara «POST
    //     /coactiva/liquidaciones-costas» como su endpoint —la liquidacion— y
    //     necesita un verbo aparte para listar. Hacer que el POST devolviera
    //     tambien la grilla convertiria una consulta en una escritura, y una
    //     pantalla que lista al abrirse consumiria un correlativo cada vez.
    // Las 134 opciones del manual siguen siendo 134.
    expect(Object.keys(OPERACIONES)).toHaveLength(149);
  });

  it('cada una declara verbo y camino relativo a /api/v1', () => {
    for (const [id, operacion] of Object.entries(OPERACIONES)) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], id).toContain(operacion.metodo);
      expect(operacion.ruta, id).toMatch(/^\//);
      // El camino base lo pone el cliente: repetirlo aqui daria /api/v1/api/v1.
      expect(operacion.ruta, id).not.toMatch(/^\/api\/v1/);
    }
  });

  it('los parametros de ruta declarados son los que la ruta trae entre llaves', () => {
    for (const [id, operacion] of Object.entries(OPERACIONES)) {
      const enLaRuta = [...operacion.ruta.matchAll(/\{(\w+)\}/g)].map(([, nombre]) => nombre);
      expect([...operacion.parametrosDeRuta], id).toEqual(enLaRuta);
    }
  });
});

describe('las reglas del proyecto, verificadas sobre lo generado', () => {
  it('ninguna firma generada acepta la municipalidad (regla 2, FRO-01 §4)', () => {
    expect(CODIGO).not.toMatch(/municipalidad/i);
  });

  it('ningun campo de importe se genera como number (regla 1, RNF-055)', () => {
    const importeComoNumero = new RegExp(`(${CAMPOS_DE_DINERO})\\w*\\??:\\s*number`, 'i');
    expect(CODIGO).not.toMatch(importeComoNumero);
  });

  it('el archivo generado dice que lo es, y como se regenera', () => {
    expect(GENERADO.startsWith('/* ARCHIVO GENERADO')).toBe(true);
    expect(GENERADO).toContain('yarn generar-operaciones');
  });
});

describe('la URL de una operacion sale del contrato', () => {
  it('sustituye el parametro de ruta por el valor que se le da', () => {
    expect(rutaDeOperacion('ficha_urbana', { codRefCatastral: '01-02-03' })).toBe(
      '/catastro/fichas/urbana/01-02-03',
    );
  });

  it('un parametro con barras no se cuela en el camino', () => {
    expect(rutaDeOperacion('ficha_urbana', { codRefCatastral: 'a/b' })).toBe(
      '/catastro/fichas/urbana/a%2Fb',
    );
  });

  it('sin el valor no hay peticion: no se inventa un registro', () => {
    expect(() => rutaDeOperacion('ficha_urbana', { codRefCatastral: '' })).toThrow(/necesita/);
  });

  it('el descriptor es el que declara el contrato', () => {
    expect(descriptorDe('inicio')).toEqual({
      metodo: 'GET',
      ruta: '/indicadores/recaudacion',
      parametrosDeRuta: [],
      parametrosDeConsulta: ['ejercicio'],
    });
  });
});

describe('la consulta solo lleva lo que el contrato declara y trae valor', () => {
  it('un filtro con valor viaja', () => {
    expect(consultaDeOperacion('inicio', { ejercicio: '2026' })).toEqual({ ejercicio: '2026' });
  });

  it('un filtro vacio no manda el parametro, ni siquiera vacio', () => {
    expect(consultaDeOperacion('inicio', { ejercicio: '' })).toEqual({});
    expect(consultaDeOperacion('inicio', {})).toEqual({});
  });
});
