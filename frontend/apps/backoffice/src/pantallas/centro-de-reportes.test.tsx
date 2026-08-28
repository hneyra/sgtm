import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { MODULOS, hojasDelCentro } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { entraCon, limpiarSesion } from '../pruebas/sesion';

/**
 * El centro de reportes (#295, ADR-0014 §5), estrenado por Transito y hoy en
 * tres modulos: la fase 1c le sumo Infracciones administrativas (#304) y
 * Autorizaciones y licencias (#308).
 *
 * Las trece hojas dejan de competir con las diez operaciones del modulo: en el
 * menu son **una** entrada y el centro las lista dentro. Lo que hay que
 * comprobar no es que «se dibuje un carril»:
 *
 * 1. que **ninguna hoja se pierda** —las trece siguen alcanzables por su ruta y
 *    listadas para quien puede verlas—;
 * 2. que el carril **esconda lo mismo que el menu** (REQ-03 §5), porque una
 *    lista que ensena lo que los permisos niegan es una superficie de
 *    exploracion nueva;
 * 3. que la barra lateral quede en once entradas, que es de lo que iba la
 *    decision;
 * 4. y que el carril **no se imprima**: el documento que sale de la
 *    municipalidad lleva la hoja, no la lista de hojas (RNF-084).
 *
 * Las cuatro se comprueban sobre Transito, que es donde el mecanismo nacio. Al
 * final del archivo, las mismas dos que mas importan —el conteo de la barra y
 * lo que el carril lista— se repiten sobre uno de los centros que la fase 1c
 * anadio **sin tocar un componente**: si el pliegue hubiera acabado cableado en
 * `CentroDeReportes` o en `BarraLateral`, ese bloque estaria rojo.
 */

/** El modulo del catalogo, con sus trece hojas plegadas. */
const TRANSITO = MODULOS.find((m) => m.id === 'transito');
const HOJAS = TRANSITO ? hojasDelCentro(TRANSITO) : [];

const carril = () => screen.getByRole('navigation', { name: 'Reportes de Tránsito' });
const menuDelModulo = () => screen.getByRole('navigation', { name: 'Opciones de Tránsito' });

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  globalThis.localStorage?.clear();
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

describe('las trece hojas siguen siendo trece opciones', () => {
  it('el catalogo declara trece', () => {
    expect(HOJAS).toHaveLength(13);
  });

  it.each(HOJAS.map((h) => ({ id: h.id, ranura: h.ranura, label: h.label, title: h.title })))(
    '$id se abre por su ruta, dentro del centro',
    async ({ ranura, label, title }) => {
      const montada = montarEnRuta(`/transito/${ranura}`);

      // La hoja se dibuja igual que siempre: mismo renderizador, mismo titulo.
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(title);

      // Y el centro la envuelve: el carril lista las trece y marca la abierta.
      const hojas = within(carril()).getAllByRole('link');
      expect(hojas).toHaveLength(13);
      expect(within(carril()).getByRole('link', { current: 'page' })).toHaveTextContent(label);

      montada.unmount();
    },
  );

  it('el carril lleva a otra hoja sin salir del centro', async () => {
    montarEnRuta('/transito/transito-record-conductor');
    await screen.findByRole('heading', { level: 1 });

    const otra = within(carril()).getByRole('link', { name: 'Record vehicular' });
    expect(otra).toHaveAttribute('href', '/transito/transito-record-vehicular');
  });

  it('una opcion de Transito que no es hoja se dibuja sin centro', async () => {
    montarEnRuta('/transito/papeletas');
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.queryByRole('navigation', { name: 'Reportes de Tránsito' }),
    ).not.toBeInTheDocument();
  });
});

describe('la barra lateral de Transito queda en once entradas', () => {
  it('diez opciones sueltas y una entrada «Reportes»', async () => {
    montarEnRuta('/transito/papeletas');
    await screen.findByRole('heading', { level: 1 });

    // Se cuentan los enlaces del nivel modulo: los de las opciones que no se
    // pliegan mas el del centro. Antes de plegar eran veintitres.
    const entradas = within(menuDelModulo()).getAllByRole('link');
    expect(entradas).toHaveLength(11);
    expect(entradas.filter((e) => e.textContent?.startsWith('Reportes'))).toHaveLength(1);
  });

  it('la entrada abre la primera hoja, no una ruta sin permiso propio', async () => {
    montarEnRuta('/transito/papeletas');
    await screen.findByRole('heading', { level: 1 });

    const entrada = within(menuDelModulo()).getByRole('link', { name: /^Reportes/ });
    expect(entrada).toHaveAttribute('href', `/transito/${HOJAS[0]?.ranura ?? ''}`);
  });
});

describe('el carril esconde lo mismo que el menu (REQ-03 §5)', () => {
  it('sin permiso sobre una hoja, esa hoja no esta en el carril', async () => {
    entraCon({
      papeletas: ['lectura'],
      transito_record_conductor: ['lectura', 'impresion'],
      transito_padron: ['lectura', 'impresion'],
    });
    montarEnRuta('/transito/transito-record-conductor');
    await screen.findByRole('heading', { level: 1 });

    const hojas = await waitFor(() => {
      const listadas = within(carril()).getAllByRole('link');
      expect(listadas).toHaveLength(2);
      return listadas;
    });
    expect(hojas.map((h) => h.textContent)).toEqual(['Record de conductor', 'Padrón de papeletas']);
    // Las once que sus permisos niegan no estan, ni siquiera deshabilitadas.
    expect(within(carril()).queryByText('Record vehicular')).not.toBeInTheDocument();
  });

  it('con una sola hoja visible, la barra sigue mostrando la entrada', async () => {
    entraCon({ papeletas: ['lectura'], transito_resumen_placa: ['lectura'] });
    montarEnRuta('/transito/papeletas');
    await screen.findByRole('heading', { level: 1 });

    await waitFor(() => {
      const entrada = within(menuDelModulo()).getByRole('link', { name: /^Reportes/ });
      // Y su conteo dice una, no trece.
      expect(entrada).toHaveTextContent('Reportes1');
      expect(entrada).toHaveAttribute('href', '/transito/transito-resumen-placa');
    });
  });

  it('sin ninguna hoja visible no hay entrada «Reportes» que abrir', async () => {
    entraCon({ papeletas: ['lectura'], internamiento: ['lectura'] });
    montarEnRuta('/transito/papeletas');
    await screen.findByRole('heading', { level: 1 });

    await waitFor(() => {
      expect(within(menuDelModulo()).getAllByRole('link')).toHaveLength(2);
    });
    expect(within(menuDelModulo()).queryByText(/^Reportes/)).not.toBeInTheDocument();
  });

  it('entrar por la URL a una hoja ajena no la dibuja, ni dentro del centro', async () => {
    entraCon({ papeletas: ['lectura'] });
    montarEnRuta('/transito/transito-record-conductor');

    expect(await screen.findByText('No tienes permiso para esta opción')).toBeInTheDocument();
    // Ni el carril, que delataria las trece hojas del modulo.
    expect(
      screen.queryByRole('navigation', { name: 'Reportes de Tránsito' }),
    ).not.toBeInTheDocument();
  });
});

describe('lo que se imprime es la hoja, no la lista de hojas', () => {
  it('el carril va marcado como no imprimible', async () => {
    montarEnRuta('/transito/transito-papeleta-reporte');
    await screen.findByRole('heading', { level: 1 });

    expect(carril()).toHaveAttribute('data-no-imprimible', '1');
  });
});

describe('el hub del modulo ensena el centro como una entrada', () => {
  it('la tarjeta del bloque plegado tiene una fila y el conteo de sus hojas', async () => {
    montarEnRuta('/transito');

    const tarjeta = (await screen.findByRole('heading', { level: 3, name: 'Reportes' })).closest(
      'section',
    ) as HTMLElement;
    expect(tarjeta).not.toBeNull();
    expect(within(tarjeta).getByText('13')).toBeInTheDocument();

    const filas = within(tarjeta).getAllByRole('link');
    expect(filas).toHaveLength(1);
    expect(filas[0]).toHaveAttribute('href', `/transito/${HOJAS[0]?.ranura ?? ''}`);
  });
});

/**
 * El centro que la fase 1c anadio a Autorizaciones y licencias (#308).
 *
 * Siete de sus once opciones son hojas: sin plegarlas, el menu del modulo es un
 * menu de reportes con tres tramites al lado. Y todo lo que hizo falta para
 * plegarlas fue **una marca en `GRUPOS_POR_TAREA` y una regeneracion**: ni un
 * componente nuevo, ni una lista de ids en ningun `.tsx`. Esto es lo que lo
 * demuestra —si el mecanismo estuviera cableado a Transito, aqui no habria ni
 * carril ni entrada—.
 */
const LICENCIAS = MODULOS.find((m) => m.id === 'autorizaciones-y-licencias');
const HOJAS_DE_LICENCIAS = LICENCIAS ? hojasDelCentro(LICENCIAS) : [];

const carrilDeLicencias = () =>
  screen.getByRole('navigation', { name: 'Reportes de Autorizaciones y licencias' });
const menuDeLicencias = () =>
  screen.getByRole('navigation', { name: 'Opciones de Autorizaciones y licencias' });

describe('Autorizaciones y licencias pliega sus siete hojas sin componente nuevo', () => {
  it('el catalogo declara siete', () => {
    expect(HOJAS_DE_LICENCIAS).toHaveLength(7);
  });

  it('la barra del modulo queda en cinco entradas, una de ellas «Reportes 7»', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-funcionamiento');
    await screen.findByRole('heading', { level: 1 });

    // Tres tramites, un catalogo y la entrada del centro. Antes eran once.
    const entradas = within(menuDeLicencias()).getAllByRole('link');
    expect(entradas).toHaveLength(5);

    const entrada = within(menuDeLicencias()).getByRole('link', { name: /^Reportes/ });
    expect(entrada).toHaveTextContent('Reportes7');
    expect(entrada).toHaveAttribute(
      'href',
      `/autorizaciones-y-licencias/${HOJAS_DE_LICENCIAS[0]?.ranura ?? ''}`,
    );
  });

  it('el carril lista las siete, marca la abierta y no se imprime', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-padron');
    await screen.findByRole('heading', { level: 1 });

    const hojas = within(carrilDeLicencias()).getAllByRole('link');
    expect(hojas.map((h) => h.textContent)).toEqual(HOJAS_DE_LICENCIAS.map((h) => h.label));
    expect(within(carrilDeLicencias()).getByRole('link', { current: 'page' })).toHaveTextContent(
      'Padrón de licencias',
    );
    expect(carrilDeLicencias()).toHaveAttribute('data-no-imprimible', '1');
  });

  it('el carril esconde lo mismo que el menu (REQ-03 §5)', async () => {
    entraCon({
      licencia_funcionamiento: ['lectura'],
      licencia_padron: ['lectura', 'impresion'],
      certificados: ['lectura', 'impresion'],
    });
    montarEnRuta('/autorizaciones-y-licencias/licencia-padron');
    await screen.findByRole('heading', { level: 1 });

    const hojas = await waitFor(() => {
      const listadas = within(carrilDeLicencias()).getAllByRole('link');
      expect(listadas).toHaveLength(2);
      return listadas;
    });
    expect(hojas.map((h) => h.textContent)).toEqual(['Padrón de licencias', 'Certificados']);
    // Y la barra dice dos, no siete.
    expect(within(menuDeLicencias()).getByRole('link', { name: /^Reportes/ })).toHaveTextContent(
      'Reportes2',
    );
  });

  it('una opcion que no es hoja se dibuja sin centro', async () => {
    montarEnRuta('/autorizaciones-y-licencias/ciiu');
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.queryByRole('navigation', { name: 'Reportes de Autorizaciones y licencias' }),
    ).not.toBeInTheDocument();
  });
});
