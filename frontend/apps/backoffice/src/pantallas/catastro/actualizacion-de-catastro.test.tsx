import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { primariaApagada, primariaEncendida } from '../../pruebas/acciones';

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

/**
 * La tabla de pisos, por su nombre accesible.
 *
 * Desde que la ficha y su edicion caen en la misma superficie
 * (`FichaDelPredio.tsx`), la pagina lleva las secciones del predio ademas del
 * cuadro de pisos: buscar «01» a secas encuentra el sector antes que el piso, y
 * «Piso» encuentra la columna de acabados ademas del campo del alta. Acotar es
 * lo que devuelve a estas pruebas su sujeto.
 */
const pisos = () => screen.getByRole('table', { name: 'Pisos declarados en la nueva versión' });

/**
 * La fila de alta del cuadro de pisos.
 *
 * «Piso» tambien es un tramo del codigo de referencia catastral, y la ficha lo
 * dibuja en «Localización»: sin acotar, el campo que se teclea aqui no se
 * distingue del de alla.
 */
const altaDePiso = () =>
  within(document.querySelector('.sgtm-pisos__alta') as HTMLElement);

const aLaOperacion = (camino: string) => peticiones.filter((p) => p.url.includes(camino));
const PUT = () =>
  aLaOperacion('/api/v1/catastro/fichas/200601010150010101001/actualizacion').filter(
    (p) => p.metodo === 'PUT',
  );

describe('carga los pisos de la version vigente antes de dejar guardar', () => {
  it('dibuja los dos pisos de la ficha, con sus categorias separadas', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');

    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });
    const filaUno = within(pisos()).getByText('01').closest('tr');
    expect(filaUno).not.toBeNull();
    // «C B C C B C B»: muros, techos, pisos, puertas, revest., banios, instalaciones.
    expect(within(filaUno as HTMLElement).getByText('118.50')).toBeInTheDocument();

    expect(within(pisos()).getByText('02')).toBeInTheDocument();
    expect(screen.getByText('2 pisos')).toBeInTheDocument();
  });
});

describe('guardar manda exactamente la lista blanca del controlador', () => {
  it('sin quitar ni agregar nada, guarda los dos pisos cargados', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

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
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

    const filaDos = within(pisos()).getByText('02').closest('tr');
    // El boton dice **de que piso es**: diez «Quitar» iguales no se distinguen.
    await userEvent.click(
      within(filaDos as HTMLElement).getByRole('button', { name: 'Quitar el piso 02' }),
    );
    expect(screen.getByText('1 piso')).toBeInTheDocument();

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
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

    await userEvent.type(altaDePiso().getByLabelText('Piso'), '03');
    await userEvent.type(screen.getByLabelText('Área m²'), '32.00');
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
    const filaTres = within(pisos()).getByText('03').closest('tr');
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

  it('mientras se leen los pisos de la versión vigente, guardar no manda nada', async () => {
    // La barra de acciones se dibuja **desde el primer render**, también durante
    // la carga. En ese momento la tabla está vacía, y en este verbo una lista
    // vacía no es «no lo sé»: es «ningún piso». Guardar ahí borraba las
    // construcciones del predio sin que nadie lo pidiera y sin que ningún
    // `DELETE` apareciera en el diff.
    let soltar: () => void = () => undefined;
    const espera = new Promise<void>((resolver) => {
      soltar = resolver;
    });
    const proxy = globalThis.fetch;
    globalThis.fetch = async (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (
        url.includes('/api/v1/catastro/fichas/urbana/200601010150010101001') &&
        (opciones?.method ?? 'GET') === 'GET'
      ) {
        await espera;
      }
      return proxy(entrada, opciones);
    };

    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');

    await userEvent.type(await screen.findByLabelText('Documento de origen'), 'Acta 2026-1');
    await userEvent.type(screen.getByLabelText('Observación'), 'Se confirma la ficha.');

    const guardar = screen.getByRole('button', { name: 'Guardar' });
    // Apagada con `aria-disabled` y enfocable: es lo que permite leer el motivo
    // que lleva al lado (#332).
    primariaApagada(guardar);
    expect(screen.getByText(/Todavía se están leyendo los pisos/)).toBeInTheDocument();
    await userEvent.click(guardar);
    expect(PUT()).toHaveLength(0);

    // Y en cuanto llegan, se puede guardar con ellos dentro.
    soltar();
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });
    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Guardar' })));
  });

  it('sin documento de origen, guardar falla en voz alta y no manda nada', async () => {
    montarEnRuta('/catastro/actualizacion-catastro/200601010150010101001');
    await screen.findByRole('table', { name: 'Pisos declarados en la nueva versión' });

    await userEvent.type(screen.getByLabelText('Observación'), 'Falta el documento.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(PUT()).toHaveLength(0);
  });
});
