import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import {
  LONGITUD_DEL_CODIGO,
  TRAMOS_DEL_CODIGO,
  formatearCodigoCatastral,
  repartirEnTramos,
} from './CodigoCatastral';

/**
 * El codigo de referencia catastral se compone, no se teclea (#318, RF-005).
 *
 * Lo que se comprueba aqui, y por que cada cosa:
 *
 * - que los tramos son **los del backend**, leidos de `ComposicionCatastral`:
 *   dos listas que dicen la misma plantilla se separan a la primera correccion,
 *   y un codigo compuesto con la plantilla vieja no falla, sale desalineado;
 * - que pegar un codigo entero lo reparte, con guiones o sin ellos;
 * - que el foco salta de tramo en tramo, que es lo que hace que teclear 23
 *   digitos no obligue a tabular;
 * - y que lo que viaja al filtro y a la URL es **la misma cadena de antes**: el
 *   contrato y el enlace compartible quedan exactamente igual.
 */

const JAVA = resolve(
  process.cwd(),
  '../backend/sgtm-dominio-compartido/src/main/java/pe/gob/sgtm/dominio/ComposicionCatastral.java',
);

/** Los `new Tramo("nombre", n)` de `DEL_MANUAL`, en el orden en que estan. */
function tramosDelBackend(): readonly { readonly nombre: string; readonly longitud: number }[] {
  const fuente = readFileSync(JAVA, 'utf8');
  const desde = fuente.indexOf('DEL_MANUAL');
  if (desde < 0) throw new Error('ComposicionCatastral ya no declara DEL_MANUAL.');
  const bloque = fuente.slice(desde, fuente.indexOf('public ComposicionCatastral {', desde));
  return [...bloque.matchAll(/new Tramo\("([a-z]+)",\s*(\d+)\)/g)].map((encontrado) => ({
    nombre: encontrado[1] ?? '',
    longitud: Number(encontrado[2]),
  }));
}

describe('los tramos son los de ComposicionCatastral, no una copia', () => {
  it('mismos nombres, mismas longitudes y mismo orden que la clase del dominio', () => {
    const backend = tramosDelBackend();
    // Diez tramos y 23 posiciones: la plantilla `DDPPddSSMMMLLLEEeeppUUU` del
    // manual lleva delante el ubigeo —departamento, provincia, distrito—, que es
    // lo que la clase Java dice y lo que manda mientras D-10 siga abierta.
    expect(backend).toHaveLength(10);
    expect(TRAMOS_DEL_CODIGO.map((t) => ({ nombre: t.nombre, longitud: t.longitud }))).toEqual(
      backend,
    );
    expect(LONGITUD_DEL_CODIGO).toBe(23);
  });

  it('repartir es el inverso exacto de concatenar: no rellena con ceros', () => {
    // 21 digitos, que es lo que traen los ejemplos del prototipo: los dos
    // ultimos tramos quedan a medias y el valor sigue siendo el mismo. Rellenar
    // con ceros convertiria una busqueda por prefijo en un codigo distinto.
    const veintiuno = '200601010150010101001';
    expect(repartirEnTramos(veintiuno).join('')).toBe(veintiuno);
    expect(repartirEnTramos(veintiuno).at(-1)).toBe('1');
  });

  it('el formato con guiones troquela lo mismo que reparte el componente', () => {
    expect(formatearCodigoCatastral('20060101015001010100123')).toBe(
      '20-06-01-01-015-001-01-01-00-123',
    );
    // Los 21 digitos del prototipo tambien: exigir las 23 posiciones del manual
    // dejaria sin troquelar justo los codigos que hay mientras D-10 siga
    // abierta.
    expect(formatearCodigoCatastral('200601010150010101001')).toBe(
      '20-06-01-01-015-001-01-01-00-1',
    );
    // Un identificador que no es el codigo —la unidad catastral rural— sale tal
    // cual: troquelarlo diria de el algo que no es cierto.
    expect(formatearCodigoCatastral('11024-0418')).toBe('11024-0418');
  });
});

/* ── El componente, dentro de la pantalla que lo usa ───────────────────── */

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

const busqueda = () => within(screen.getByRole('region', { name: 'Búsqueda' }));

const tramo = (nombre: string): HTMLInputElement =>
  busqueda().getByLabelText(`Cod. Ref. Catastral · ${nombre}`) as HTMLInputElement;

/** Los valores de `codRefCatastral` que salieron de verdad, uno por peticion. */
const codRefCatastralPedido = (): string[] =>
  peticiones
    .map((url) => new URL(url, 'http://localhost').searchParams.get('codRefCatastral'))
    .filter((valor): valor is string => valor !== null);

describe('la consulta de fichas compone el codigo en sus tramos', () => {
  it('dibuja los diez tramos con su nombre en vez de una caja de texto', async () => {
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByText('200601010150010101001');

    for (const declarado of TRAMOS_DEL_CODIGO) {
      expect(
        busqueda().getByLabelText(`Cod. Ref. Catastral · ${declarado.etiqueta}`),
      ).toBeVisible();
    }
    // Y el resto de los filtros sigue siendo lo que era: el widget es de un
    // campo, no del bloque.
    expect(busqueda().getByLabelText('Contribuyente')).toBeVisible();
  });

  it('pegar el codigo entero lo reparte, con guiones o sin ellos', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByText('200601010150010101001');

    await usuario.click(tramo('Depto.'));
    await usuario.paste('20-06-01-01-015-001-01-01-00-123');

    expect(tramo('Depto.').value).toBe('20');
    expect(tramo('Prov.').value).toBe('06');
    expect(tramo('Distrito').value).toBe('01');
    expect(tramo('Sector').value).toBe('01');
    expect(tramo('Manzana').value).toBe('015');
    expect(tramo('Lote').value).toBe('001');
    expect(tramo('Edif.').value).toBe('01');
    expect(tramo('Entrada').value).toBe('01');
    expect(tramo('Piso').value).toBe('00');
    expect(tramo('Unidad').value).toBe('123');
  });

  it('un tramo lleno salta al siguiente, y Retroceso en uno vacio vuelve al anterior', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByText('200601010150010101001');

    await usuario.click(tramo('Depto.'));
    await usuario.keyboard('2006');
    // Dos digitos llenan «Depto.» y el foco pasa solo a «Prov.», que se lleva
    // los dos siguientes: teclear el codigo no obliga a tabular diez veces.
    expect(tramo('Depto.').value).toBe('20');
    expect(tramo('Prov.').value).toBe('06');
    expect(tramo('Distrito')).toHaveFocus();

    // Retroceso en un tramo vacio vuelve al anterior, que es donde esta lo que
    // se quiere corregir.
    await usuario.keyboard('{Backspace}');
    expect(tramo('Prov.')).toHaveFocus();
  });

  it('las flechas mueven entre tramos, y solo se admiten digitos', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByText('200601010150010101001');

    // Con el ubigeo ya puesto: el codigo es un prefijo posicional y se llena de
    // izquierda a derecha, asi que un tramo del medio solo es «el del medio»
    // cuando los de su izquierda estan completos.
    await usuario.click(tramo('Depto.'));
    await usuario.paste('200601');

    await usuario.click(tramo('Sector'));
    await usuario.keyboard('{ArrowLeft}');
    expect(tramo('Distrito')).toHaveFocus();
    await usuario.keyboard('{ArrowRight}');
    expect(tramo('Sector')).toHaveFocus();

    // La letra no entra: un codigo catastral es solo digitos (RF-005).
    await usuario.keyboard('A7');
    expect(tramo('Sector').value).toBe('7');
    expect(tramo('Depto.').value).toBe('20');
  });

  it('lo compuesto viaja al filtro y a la URL igual que la caja de texto de antes', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/consulta-fichas');
    await screen.findByText('200601010150010101001');

    await usuario.click(tramo('Depto.'));
    await usuario.paste('200601010150010101001');
    await usuario.click(busqueda().getByRole('button', { name: 'Buscar' }));

    // Una sola cadena, la de siempre: el contrato declara `codRefCatastral` y
    // eso es **exactamente** lo que sale. Se compara el valor del parametro y no
    // un trozo de la URL: `includes` daria por bueno un codigo relleno de ceros
    // a la derecha, que es otro predio.
    await waitFor(() => expect(codRefCatastralPedido()).toEqual(['200601010150010101001']));
  });
});
