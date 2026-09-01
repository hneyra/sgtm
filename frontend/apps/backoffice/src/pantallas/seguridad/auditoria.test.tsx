import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { OPERACIONES_DE_LA_BITACORA, TODAS } from './composicion';

/**
 * La bitacora filtra por lo que la bitacora guarda (#544).
 *
 * El defecto que cierra este archivo: el contrato declaraba `accion` —el nombre que el prototipo
 * le da a la columna «Acción»— y **ningun parametro del controlador lo leia**, asi que el filtro se
 * tecleaba, viajaba y no acotaba nada: medido sobre las 1 441 filas de la municipalidad 1,
 * `?accion=ALTA` las devolvia las 1 441. Y al reves, `tabla` y `operacion` —que acotan desde #13—
 * no estaban publicados, de modo que ninguna pantalla podia mandarlos: `parametrosDeBusqueda` solo
 * manda lo que el contrato declara.
 *
 * Aqui se comprueba lo que la pantalla hace con eso: que ofrece el vocabulario del backend y no el
 * del prototipo, que lo elegido viaja con el nombre del backend, y que «Todas» —que significa «sin
 * filtrar»— no viaja.
 */

const CONTRATO = resolve(process.cwd(), '../docs/50-api/openapi/sgtm-v1.yaml');

let peticiones: string[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    );
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

const aLaBitacora = () => peticiones.filter((url) => url.includes('/seguridad/auditoria'));

/** El desplegable «Acción» de la barra de busqueda, ya dibujado. */
async function desplegableDeAccion(): Promise<HTMLSelectElement> {
  const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });
  return within(busqueda).getByLabelText('Acción') as HTMLSelectElement;
}

describe('el filtro «Acción» habla el idioma de la bitacora, no el del prototipo', () => {
  it('ofrece las siete operaciones que la bitacora guarda, y ninguna que no pueda existir', async () => {
    montarEnRuta('/seguridad/auditoria');
    const desplegable = await desplegableDeAccion();

    expect([...desplegable.options].map((opcion) => opcion.value)).toEqual([
      TODAS,
      ...OPERACIONES_DE_LA_BITACORA,
    ]);
    // La quinta palabra del desplegable del manual. No existe ni puede existir:
    // la aplicacion no borra (RNF-051, regla 4).
    expect([...desplegable.options].map((o) => o.value)).not.toContain('ELIMINACIÓN');
    // Y las tres que el manual no ofrece y la bitacora si registra. PERMISO es
    // la que mas falta hacia: los cambios de la propia seguridad (ADR-0008 §5).
    expect([...desplegable.options].map((o) => o.value)).toContain('PERMISO');
  });

  it('lo elegido viaja como «operacion», que es el nombre que el contrato declara', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/seguridad/auditoria');
    await desplegableDeAccion();

    await usuario.selectOptions(await desplegableDeAccion(), 'ANULACION');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    const ultima = aLaBitacora().at(-1) ?? '';
    expect(ultima).toContain('operacion=ANULACION');
    expect(ultima).not.toContain('accion=');
  });

  it('«Todas» significa «sin filtrar», y no viaja', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/seguridad/auditoria');

    await usuario.selectOptions(await desplegableDeAccion(), 'ANULACION');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    await usuario.selectOptions(await desplegableDeAccion(), TODAS);
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    // Mandarla seria filtrar por la palabra: el controlador la rechaza con 422
    // —su vocabulario es el de la bitacora—, y quien la eligio esperaba verlo todo.
    const ultima = aLaBitacora().at(-1) ?? '';
    expect(ultima).not.toContain('operacion=');
  });
});

describe('el filtro «Tabla», que el servicio acota y el manual no dibuja', () => {
  it('se dibuja al final de la barra y viaja como «tabla»', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/seguridad/auditoria');

    const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });
    await usuario.type(within(busqueda).getByLabelText('Tabla'), 'recibo');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(aLaBitacora().at(-1) ?? '').toContain('tabla=recibo');
  });

  it('la barra conserva los filtros del manual, con su rotulo', async () => {
    montarEnRuta('/seguridad/auditoria');
    const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });

    // «Acción» se sustituye **en su sitio**: la barra del manual no se reordena
    // porque el filtro cambie de nombre (RNF-080).
    expect(
      [...busqueda.querySelectorAll('label')].map((etiqueta) => etiqueta.textContent),
    ).toEqual(['Usuario', 'Acción', 'Desde', 'Hasta', 'Tabla']);
  });
});

describe('el vocabulario que ofrece la pantalla es el que el contrato publica', () => {
  /**
   * El eslabon del medio de una cadena de tres.
   *
   * `Operacion` (Java) → el `enum` del contrato → este desplegable. El primer eslabon lo mide
   * `ParametrosDeLaConsultaTest` contra el enumerado; este mide el segundo. Sin el, la lista de la
   * pantalla seria una tercera copia del vocabulario que nadie compara con las otras dos, que es
   * exactamente el hueco que #192 documento para las llaves de los parametros.
   */
  it('las siete palabras son, letra por letra, las del contrato', () => {
    const yaml = readFileSync(CONTRATO, 'utf8');
    const desde = yaml.indexOf('  "/seguridad/auditoria":');
    expect(desde).toBeGreaterThan(0);
    const bloque = yaml.slice(desde, yaml.indexOf('\n  "/', desde + 1));
    const linea = bloque
      .split('\n')
      .find((l) => l.includes('enum: [') && bloque.indexOf(l) > bloque.indexOf('- name: operacion'));

    expect(linea).toBeDefined();
    const valores = (/enum: \[([^\]]+)\]/.exec(linea ?? '')?.[1] ?? '')
      .split(',')
      .map((valor) => valor.trim());
    expect(valores).toEqual([...OPERACIONES_DE_LA_BITACORA]);
  });
});
