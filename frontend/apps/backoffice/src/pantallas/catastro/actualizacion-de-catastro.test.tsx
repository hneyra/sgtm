import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Actualización del catastro: guarda una lista de construcciones, no campos
 * planos (#71). Lo que se comprueba: que carga los pisos de la versión
 * vigente antes de dejar guardar —para que no desaparezcan sin querer—, que
 * agregar y quitar pisos cambia exactamente lo que se manda, y que el cuerpo
 * es la lista blanca real de `ActualizacionController`, no lo que dibuja el
 * prototipo (mes, año, MEP, ECS, ECC, UCA no viajan).
 */

let peticiones: { url: string; metodo: string; cuerpo: string }[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url:
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      metodo: opciones?.method ?? 'GET',
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

const aLaOperacion = (camino: string) => peticiones.filter((p) => p.url.includes(camino));
const PUT = () =>
  aLaOperacion('/api/v1/catastro/fichas/200601010150010101001/actualizacion').filter(
    (p) => p.metodo === 'PUT',
  );

describe('carga los pisos de la version vigente antes de dejar guardar', () => {
  it('dibuja los dos pisos de la ficha, con sus categorias separadas', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');

    const filaUno = (await screen.findByText('01')).closest('tr');
    expect(filaUno).not.toBeNull();
    // «C B C C B C B»: muros, techos, pisos, puertas, revest., banios, instalaciones.
    expect(within(filaUno as HTMLElement).getByText('118.50')).toBeInTheDocument();

    expect(await screen.findByText('02')).toBeInTheDocument();
    expect(screen.getByText('2 pisos')).toBeInTheDocument();
  });
});

describe('guardar manda exactamente la lista blanca del controlador', () => {
  it('sin quitar ni agregar nada, guarda los dos pisos cargados', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');
    await screen.findByText('02');

    await userEvent.type(
      screen.getByLabelText('Documento de origen'),
      'Declaración jurada 2026-118',
    );
    await userEvent.type(
      screen.getByLabelText('Observación'),
      'Se confirma la ficha sin cambios de piso.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(PUT()).toHaveLength(1));
    const cuerpo = JSON.parse(PUT()[0]?.cuerpo ?? '{}');
    expect(cuerpo.construcciones).toHaveLength(2);
    expect(cuerpo.construcciones[0]).toEqual({
      piso: '01',
      areaConstruida: '118.50',
      categoriaMuros: 'C',
      categoriaTechos: 'B',
      categoriaPisos: 'C',
      categoriaPuertas: 'C',
      categoriaRevestimientos: 'B',
      categoriaBanios: 'C',
      categoriaInstalaciones: 'B',
    });
    // Lo que el prototipo dibuja y el controlador no acepta no viaja.
    expect(cuerpo).not.toHaveProperty('mes');
    expect(cuerpo).not.toHaveProperty('mep');
    expect(cuerpo.documentoOrigen).toBe('Declaración jurada 2026-118');
    expect(cuerpo.origen).toBe('DECLARACION_JURADA');
  });

  it('quitar un piso lo deja fuera de lo que se guarda', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');
    await screen.findByText('02');

    const filaDos = (await screen.findByText('02')).closest('tr');
    await userEvent.click(within(filaDos as HTMLElement).getByRole('button', { name: 'Quitar' }));
    expect(screen.getByText('1 pisos')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Documento de origen'), 'Acta 2026-9');
    await userEvent.type(screen.getByLabelText('Observación'), 'Se retira el segundo piso.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(PUT()).toHaveLength(1));
    const cuerpo = JSON.parse(PUT()[0]?.cuerpo ?? '{}');
    expect(cuerpo.construcciones).toHaveLength(1);
    expect(cuerpo.construcciones[0].piso).toBe('01');
  });

  it('agregar un piso nuevo lo incluye en lo que se guarda', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');
    await screen.findByText('02');

    await userEvent.type(screen.getByLabelText('Nº Piso'), '03');
    await userEvent.type(screen.getByLabelText('Área construida (m²)'), '32.00');
    await userEvent.type(screen.getByLabelText('Muros'), 'b');
    await userEvent.type(screen.getByLabelText('Techos'), 'b');
    await userEvent.type(screen.getByLabelText('Pisos'), 'b');
    await userEvent.type(screen.getByLabelText('Puertas'), 'b');
    await userEvent.type(screen.getByLabelText('Revest.'), 'b');
    await userEvent.type(screen.getByLabelText('Baños'), 'b');
    await userEvent.type(screen.getByLabelText('Instalaciones'), 'b');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar piso' }));

    expect(screen.getByText('3 pisos')).toBeInTheDocument();
    // La letra se guarda en mayuscula, aunque se haya tecleado en minuscula:
    // las siete categorias de la fila nueva son «B».
    const filaTres = (await screen.findByText('03')).closest('tr');
    expect(within(filaTres as HTMLElement).getAllByText('B')).toHaveLength(7);

    await userEvent.type(screen.getByLabelText('Documento de origen'), 'Acta 2026-10');
    await userEvent.type(screen.getByLabelText('Observación'), 'Se declara el tercer piso.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(PUT()).toHaveLength(1));
    const cuerpo = JSON.parse(PUT()[0]?.cuerpo ?? '{}');
    expect(cuerpo.construcciones).toHaveLength(3);
    expect(cuerpo.construcciones[2]).toEqual({
      piso: '03',
      areaConstruida: '32.00',
      categoriaMuros: 'B',
      categoriaTechos: 'B',
      categoriaPisos: 'B',
      categoriaPuertas: 'B',
      categoriaRevestimientos: 'B',
      categoriaBanios: 'B',
      categoriaInstalaciones: 'B',
    });
  });

  it('sin documento de origen, guardar falla en voz alta y no manda nada', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');
    await screen.findByText('02');

    await userEvent.type(screen.getByLabelText('Observación'), 'Falta el documento.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(PUT()).toHaveLength(0);
  });
});
