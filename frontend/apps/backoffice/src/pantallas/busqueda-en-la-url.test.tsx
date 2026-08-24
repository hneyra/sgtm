import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { clienteDePruebas, montarEnRuta } from '../pruebas/montar';

/**
 * La pantalla deja de describir una operacion y pasa a hacerla.
 *
 * Lo que se comprueba aqui es el camino de un usuario de ventanilla: abrir una
 * ficha por su enlace, buscar, ordenar, pasar de pagina, y que nada de eso se
 * pierda al recargar ni se mezcle en la cache con la busqueda de al lado.
 */

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

const a = (camino: string): string[] => peticiones.filter((u) => u.includes(camino));
const aCatastro = (): string[] => a('/api/v1/catastro/');

/**
 * Los filtros, no los campos de la ficha: media pantalla del manual repite las
 * mismas etiquetas —«Sector» es un filtro y tambien un campo del predio—, asi
 * que hay que decir en cual de los dos se busca.
 */
const enLosFiltros = () => within(screen.getByRole('region', { name: 'Búsqueda' }));

describe('el registro abierto vive en la ruta', () => {
  it('sin registro no se pide nada: no hay ficha inventada', async () => {
    montarEnRuta('/catastro/ficha-urbana');

    // La pantalla se dibuja entera —el catalogo la conoce— y dice que falta
    // elegir un registro, en vez de pedir uno de relleno.
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/Elige un registro/)).toBeInTheDocument();
    expect(aCatastro()).toEqual([]);
  });

  it('la URL de una ficha abierta es compartible: pegarla abre esa ficha', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    // La ficha ya viene del backend: lo que se ve es su version, no una fila
    // del prototipo (#71).
    expect(await screen.findByText('Versión 3')).toBeInTheDocument();
    expect(aCatastro()).toHaveLength(1);
    expect(aCatastro()[0]).toContain('/api/v1/catastro/fichas/urbana/200601010150010101001');
    expect(screen.queryByText(/Elige un registro/)).not.toBeInTheDocument();
  });

  it('buscar por el identificador abre el registro: la placa en la mano', async () => {
    // Es el ejemplo del issue: `GET /rentas/vehiculos/{placa}` se pedia con la
    // cadena «ejemplo» porque nadie llegaba nunca con una placa.
    const usuario = userEvent.setup();
    montarEnRuta('/rentas-registro/vehiculos');

    expect(await screen.findByText(/Elige un registro/)).toBeInTheDocument();
    expect(a('/api/v1/rentas/vehiculos')).toEqual([]);

    await usuario.type(enLosFiltros().getByLabelText('Placa'), 'ABC-123');
    await usuario.click(enLosFiltros().getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(a('/api/v1/rentas/vehiculos/ABC-123').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Elige un registro/)).not.toBeInTheDocument();
  });
});

describe('los filtros viajan, y solo si tienen valor', () => {
  it('un filtro con valor se manda; vacio no manda ni la cadena vacia', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/calles');
    await screen.findByText('SANTA ROSA');

    await usuario.click(enLosFiltros().getByRole('button', { name: 'Buscar' }));
    expect(aCatastro().some((u) => u.includes('nombreDeCalle='))).toBe(false);

    await usuario.type(enLosFiltros().getByLabelText('Nombre de calle'), 'SANTA ROSA');
    await usuario.click(enLosFiltros().getByRole('button', { name: 'Buscar' }));
    await waitFor(() =>
      expect(aCatastro().some((u) => u.includes('nombreDeCalle=SANTA+ROSA'))).toBe(true),
    );
  });

  it('lo buscado sobrevive a recargar: esta en la URL, no en el componente', async () => {
    const primera = montarEnRuta('/catastro/calles?nombreDeCalle=SANTA+ROSA');
    await screen.findByText('SANTA ROSA');
    expect(enLosFiltros().getByLabelText('Nombre de calle')).toHaveValue('SANTA ROSA');
    primera.unmount();

    // Recargar es montar de nuevo con la misma URL.
    montarEnRuta('/catastro/calles?nombreDeCalle=SANTA+ROSA');
    await screen.findByText('SANTA ROSA');
    expect(enLosFiltros().getByLabelText('Nombre de calle')).toHaveValue('SANTA ROSA');
  });
});

describe('orden y pagina, contra el servidor', () => {
  it('pulsar una cabecera pide otro orden y conserva el filtro', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/calles?sector=01');
    await screen.findByText('SANTA ROSA');

    await usuario.click(screen.getByRole('button', { name: 'Nombre' }));

    await waitFor(() => expect(aCatastro().at(-1) ?? '').toContain('ordenarPor=nombre'));
    const ultima = aCatastro().at(-1) ?? '';
    expect(ultima).toContain('direccion=ASCENDENTE');
    // Cambiar de orden no puede perder lo que se estaba buscando.
    expect(ultima).toContain('sector=01');
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('la cache no mezcla paginas: la pagina 2 de una busqueda no es la de otra', async () => {
    const cliente = clienteDePruebas();

    // Sobre una opcion **sin conectar**: aqui se prueba la cache de la forma
    // que comparten las 134 (`depreciacion` ya pide su recurso propio, #71).
    // El numero de papeleta se repite en mas de un sitio de la pantalla
    // (la tabla y la ficha), asi que se busca con `findAllBy`.
    const primera = montarEnRuta('/transito/papeletas?placa=AAA-111&pagina=2', cliente);
    await screen.findAllByText('MPS-2026-041182');
    primera.unmount();

    const segunda = montarEnRuta('/transito/papeletas?placa=BBB-222&pagina=2', cliente);
    await screen.findAllByText('MPS-2026-041182');
    segunda.unmount();

    // Solo las de datos: la del catalogo del modulo es otra cosa y se comparte.
    const claves = cliente
      .getQueryCache()
      .getAll()
      .map((consulta) => JSON.stringify(consulta.queryKey))
      .filter((clave) => clave.startsWith('["pantalla"'));
    expect(claves).toHaveLength(2);
    expect(claves.some((clave) => clave.includes('"placa":"AAA-111"'))).toBe(true);
    expect(claves.some((clave) => clave.includes('"placa":"BBB-222"'))).toBe(true);
    // La 2 de la URL es la 1 del backend.
    expect(claves.every((clave) => clave.includes('"pagina":"1"'))).toBe(true);
  });
});
