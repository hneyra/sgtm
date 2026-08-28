import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Territorio operable: los conteos reales y el alta con observación (#321).
 *
 * Tres cosas, y las tres tienen la misma frontera detrás: **lo que el servidor
 * manda se pinta; lo que no manda se dice que falta**, y el proxy de datos no
 * inventa ni una cifra (ADR-0010 §4).
 *
 * 1. Los conteos de `SectorConConteos` —manzanas, lotes, predios activos— se
 *    dibujan **tal cual** cuando la respuesta los trae, y salen «—» cuando no.
 * 2. Las manzanas cuelgan de la fila del sector, con su conteo de lotes, y
 *    mientras el backend no las liste el desplegable lo dice.
 * 3. El alta de sector, de manzana y de vía escribe de verdad, y **sin
 *    observación no se habilita** (regla 10, RNF-052).
 */

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly clave: string | null;
  readonly cuerpo: string;
}

let peticiones: Peticion[] = [];

/** El sector tal como lo publica `SectorResource`, con los conteos que se le pidan. */
const sector = (
  codigo: string,
  nombre: string,
  conteos: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> => ({
  id: 1,
  codigo,
  nombre,
  zona: 'Zona 1',
  activo: true,
  ...conteos,
});

/**
 * Interpone la respuesta de `GET /catastro/sectores` **por encima del proxy**.
 *
 * No se toca el proxy: el proxy no debe fingir unos conteos que el backend
 * todavía no le da, y falsearlos ahí haría que las demás pruebas —y la
 * aplicación en desarrollo— vieran cifras que nadie sirvió.
 */
function elBackendResponde(contenido: readonly Readonly<Record<string, unknown>>[]): void {
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.includes('/api/v1/catastro/sectores') && (opciones?.method ?? 'GET') === 'GET') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            contenido,
            pagina: 0,
            tamano: contenido.length,
            totalElementos: contenido.length,
            totalPaginas: 1,
            hayMas: false,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    return proxy(entrada, opciones);
  };
}

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const cabeceras = new Headers(opciones?.headers);
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      clave: cabeceras.get('idempotency-key'),
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return proxy(entrada, opciones);
  };
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

const escrituras = (camino: string) =>
  peticiones.filter((p) => p.url.includes(camino) && p.metodo === 'POST');

/* ── 1. Los conteos ────────────────────────────────────────────────────── */

describe('los conteos del sector salen tal como llegan', () => {
  it('manzanas, lotes y predios se pintan sin recomponerse', async () => {
    elBackendResponde([sector('01', 'CERCADO', { manzanas: 12, lotes: 340, predios: 512 })]);
    montarEnRuta('/catastro/sectores');

    const fila = (await screen.findByText('CERCADO')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // La primera celda es el control de desplegado; después van las del catálogo.
    expect(celdas.slice(1).map((celda) => celda.textContent)).toEqual([
      '01',
      'CERCADO',
      '12',
      '340',
      '512',
      'Zona 1',
      'ACTIVO',
    ]);
  });

  it('mientras la ruta la conteste el proxy salen «—», y eso es correcto', async () => {
    // Sin interponer nada: el proxy responde el juego de datos del prototipo,
    // que no trae los conteos porque el backend no se los ha dado (ADR-0010 §4).
    montarEnRuta('/catastro/sectores');

    // Por el nombre y no por el codigo: «01» tambien es una opcion del filtro
    // «Sector», y esa no esta en ninguna fila.
    const fila = (await screen.findByText('CERCADO DE SULLANA')).closest('tr');
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas[3]?.textContent).toBe(SIN_DATO);
    expect(celdas[4]?.textContent).toBe(SIN_DATO);
    expect(celdas[5]?.textContent).toBe(SIN_DATO);
  });

  it('un cero no es lo mismo que «no se contó»', async () => {
    elBackendResponde([
      sector('07', 'SECTOR NUEVO', { manzanas: 0, lotes: 0, predios: 0 }),
      // `SectorResource` manda nulo en la respuesta de un alta: «no se contó».
      sector('08', 'SECTOR SIN CONTAR', { manzanas: null, lotes: null, predios: null }),
    ]);
    montarEnRuta('/catastro/sectores');

    const nuevo = (await screen.findByText('SECTOR NUEVO')).closest('tr');
    expect(within(nuevo as HTMLElement).getAllByRole('cell')[3]?.textContent).toBe('0');
    const sinContar = screen.getByText('SECTOR SIN CONTAR').closest('tr');
    expect(within(sinContar as HTMLElement).getAllByRole('cell')[3]?.textContent).toBe(SIN_DATO);
  });

  it('dice que un predio sin sector no cuenta en ninguno: es información, no descuadre', async () => {
    montarEnRuta('/catastro/sectores');
    expect(
      await screen.findByText('Los conteos son del catastro, no del padrón'),
    ).toBeInTheDocument();
    expect(screen.getByText(/no cuenta en ninguno de estos sectores/)).toBeInTheDocument();
  });
});

/* ── 2. Las manzanas del sector, desplegadas ───────────────────────────── */

describe('las manzanas cuelgan de la fila del sector', () => {
  it('se despliegan con su código y su conteo de lotes cuando la respuesta las trae', async () => {
    const usuario = userEvent.setup();
    elBackendResponde([
      sector('01', 'CERCADO', {
        manzanas: [
          { codigo: '001', lotes: 14 },
          { codigo: '002', lotes: 9 },
        ],
      }),
    ]);
    montarEnRuta('/catastro/sectores');

    const fila = (await screen.findByText('CERCADO')).closest('tr');
    await usuario.click(
      within(fila as HTMLElement).getByRole('button', { name: /Desplegar Manzanas del sector 01/ }),
    );

    expect(await screen.findByText('001')).toBeInTheDocument();
    expect(screen.getByText('14 lotes')).toBeInTheDocument();
    expect(screen.getByText('9 lotes')).toBeInTheDocument();
  });

  it('mientras el backend no las liste, el desplegable lo dice en vez de salir vacío', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    const fila = (await screen.findByText('CERCADO DE SULLANA')).closest('tr');
    await usuario.click(
      within(fila as HTMLElement).getByRole('button', { name: /Desplegar Manzanas del sector/ }),
    );

    expect(
      await screen.findByText(/todavía no publica las manzanas de un sector/),
    ).toBeInTheDocument();
  });
});

/* ── 3. Las altas ──────────────────────────────────────────────────────── */

describe('el alta de sector, en panel lateral y con observación', () => {
  it('sin observación, «Registrar sector» no se habilita', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo sector' }));
    const panel = await screen.findByRole('dialog', { name: 'Nuevo sector' });

    await usuario.type(within(panel).getByLabelText('Código de sector'), '09');
    await usuario.type(within(panel).getByLabelText('Denominación'), 'NUEVO SECTOR');

    const registrar = within(panel).getByRole('button', { name: 'Registrar sector' });
    expect(registrar).toBeDisabled();

    await usuario.type(within(panel).getByLabelText('Observación'), 'Nuevo sector del PDU 2026.');
    expect(registrar).toBeEnabled();
  });

  it('manda solo lo declarado, con la observación, y no manda nada antes', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo sector' }));
    const panel = await screen.findByRole('dialog', { name: 'Nuevo sector' });
    await usuario.type(within(panel).getByLabelText('Código de sector'), '09');
    await usuario.type(within(panel).getByLabelText('Denominación'), 'NUEVO SECTOR');
    await usuario.type(within(panel).getByLabelText('Zona de arbitrios'), 'Zona 2');

    // Rellenar el formulario no escribe: nada se guarda hasta que hay observación.
    expect(escrituras('/api/v1/catastro/sectores')).toHaveLength(0);

    await usuario.type(within(panel).getByLabelText('Observación'), 'Nuevo sector del PDU 2026.');
    await usuario.click(within(panel).getByRole('button', { name: 'Registrar sector' }));

    await waitFor(() => expect(escrituras('/api/v1/catastro/sectores')).toHaveLength(1));
    expect(JSON.parse(escrituras('/api/v1/catastro/sectores')[0]?.cuerpo ?? '{}')).toEqual({
      codigo: '09',
      nombre: 'NUEVO SECTOR',
      zona: 'Zona 2',
      observacion: 'Nuevo sector del PDU 2026.',
    });
  });

  it('sin privilegio de registro no hay panel, aunque se pueda modificar', async () => {
    const usuario = userEvent.setup();
    // `modificacion` sin `registro`: puede corregir lo que hay y no puede crear.
    // Es exactamente lo que exige `SectorController` en su `POST`.
    entraCon({ sectores: ['lectura', 'modificacion'] });
    montarEnRuta('/catastro/sectores');

    await screen.findByRole('table');
    // La accion se queda **como estaba antes de #321**: dibujada y apagada. No
    // desaparece —el prototipo la dibuja— y no abre nada.
    const boton = await screen.findByRole('button', { name: 'Nuevo sector' });
    expect(boton).toBeDisabled();
    await usuario.click(boton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('el alta de manzana cuelga del sector desplegado', () => {
  it('manda el código de la manzana bajo la ruta del sector', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    const fila = (await screen.findByText('CERCADO DE SULLANA')).closest('tr');
    await usuario.click(
      within(fila as HTMLElement).getByRole('button', { name: /Desplegar Manzanas del sector/ }),
    );
    await usuario.click(await screen.findByRole('button', { name: '+ Añadir manzana' }));

    const panel = await screen.findByRole('dialog', { name: 'Nueva manzana del sector' });
    // El sector no se elige aquí: es el de la fila que se desplegó.
    expect(within(panel).getByLabelText('Sector')).toHaveTextContent('01');
    await usuario.type(within(panel).getByLabelText('Código de manzana'), '007');
    await usuario.type(
      within(panel).getByLabelText('Observación'),
      'Manzana levantada en campo el 12/08.',
    );
    await usuario.click(within(panel).getByRole('button', { name: 'Registrar manzana' }));

    const enviadas = escrituras('/api/v1/catastro/sectores/01/manzanas');
    await waitFor(() => expect(enviadas.length).toBeGreaterThan(0));
    expect(JSON.parse(enviadas[0]?.cuerpo ?? '{}')).toEqual({
      codigo: '007',
      observacion: 'Manzana levantada en campo el 12/08.',
    });
  });
});

describe('el alta de vía', () => {
  it('manda tipo, código y nombre con su observación', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/calles');

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo' }));
    const panel = await screen.findByRole('dialog', { name: 'Nueva vía' });

    await usuario.type(within(panel).getByLabelText('Código de vía'), '00001999');
    await usuario.selectOptions(within(panel).getByLabelText('Tipo de vía'), 'JIRON');
    await usuario.type(within(panel).getByLabelText('Nombre'), 'SANTA ROSA');

    const registrar = within(panel).getByRole('button', { name: 'Registrar vía' });
    expect(registrar).toBeDisabled();

    await usuario.type(
      within(panel).getByLabelText('Observación'),
      'Vía nueva de la habilitación urbana 0142.',
    );
    await usuario.click(registrar);

    await waitFor(() => expect(escrituras('/api/v1/catastro/vias')).toHaveLength(1));
    expect(JSON.parse(escrituras('/api/v1/catastro/vias')[0]?.cuerpo ?? '{}')).toEqual({
      codigo: '00001999',
      tipo: 'JIRON',
      nombre: 'SANTA ROSA',
      observacion: 'Vía nueva de la habilitación urbana 0142.',
    });
  });

  it('el panel se cierra con Esc, sin haber mandado nada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/calles');

    await usuario.click(await screen.findByRole('button', { name: 'Nuevo' }));
    await screen.findByRole('dialog', { name: 'Nueva vía' });
    await usuario.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Nueva vía' })).not.toBeInTheDocument(),
    );
    expect(escrituras('/api/v1/catastro/vias')).toHaveLength(0);
  });
});
