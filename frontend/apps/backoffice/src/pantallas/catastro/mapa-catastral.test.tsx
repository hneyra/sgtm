import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { CAPAS, casaConLaBusqueda, leerPlano, rotuloDelLote } from './plano';
import type { LoteDelPlano } from './plano';

/**
 * **El mapa catastral** (#500, ADR-0022).
 *
 * Lo que estas pruebas defienden, y que ninguna otra puede:
 *
 * 1. **Es una ruta del módulo, no una opción.** Las 134 siguen siendo 134, así
 *    que el visor no tiene id en el catálogo ni permiso propio: entra por
 *    `/catastro/mapa` y lo que exige es el permiso de encontrar un predio.
 * 2. **De las cinco capas del diseño, cuatro no se pueden dibujar y lo dicen.**
 *    Una capa que falta sin explicación se lee como una capa que no existe.
 * 3. **El plano vacío nombra su causa.** Hoy no hay una sola municipalidad con
 *    geometría cargada, así que ése es el estado normal y no un error.
 * 4. **`sinGeometria` se dice siempre.** Sin esa cifra, un plano con la mitad de
 *    los lotes afirma que la otra mitad no existe.
 * 5. **El plano se opera con el teclado.** Un lienzo de teselas no tiene
 *    contenido que un lector de pantalla pueda recorrer (RNF-082): el
 *    equivalente es la lista de lotes, y selecciona el mismo lote.
 * 6. **Ni un arancel ni un área salen del polígono.** El panel del lote enseña
 *    «—» donde el sistema no puede resolver el dato, que es lo contrario de una
 *    cifra plausible (ADR-0021, ADR-0022 §5).
 */

/**
 * Leaflet no se monta en jsdom, y **no hace falta que se monte**.
 *
 * El lienzo carga la biblioteca con `import()` dentro de un efecto y, si no
 * llega, lo dice y la pantalla sigue entera: es el mismo camino que recorre una
 * municipalidad sin salida a internet. Sustituirlo aquí por un doble prueba
 * exactamente esa rama —la que importa, porque es la que deja el visor usable— y
 * deja el resto de la superficie donde se puede medir.
 */
vi.mock('./PlanoConLeaflet', () => ({
  PlanoConLeaflet: ({
    lotes,
    onSeleccionar,
  }: {
    readonly lotes: readonly LoteDelPlano[];
    readonly onSeleccionar: (predioId: number) => void;
  }) => (
    <div data-testid="lienzo" data-lotes={lotes.length}>
      {lotes.map((lote) => (
        <button key={lote.predioId} type="button" onClick={() => onSeleccionar(lote.predioId)}>
          {`lienzo:${lote.codRefCatastral}`}
        </button>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
  vi.unstubAllGlobals();
});

const abrirElMapa = async () => {
  montarEnRuta('/catastro/mapa');
  return screen.findByRole('heading', { level: 1, name: 'Mapa catastral' });
};

/** Interpone una respuesta del plano por encima del proxy, sin tocarlo. */
function elPlanoResponde(cuerpo: unknown): void {
  const proxy = globalThis.fetch;
  vi.stubGlobal('fetch', (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.includes('/api/v1/catastro/predios/plano')) {
      return Promise.resolve(
        new Response(JSON.stringify(cuerpo), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }
    return proxy(entrada, opciones);
  });
}

const lote = (extra: Partial<LoteDelPlano> = {}): LoteDelPlano => ({
  predioId: 1,
  codRefCatastral: '200601010150010101001',
  codigoDeSector: '02',
  codigoDeManzana: '014',
  lote: '14',
  codigoDeVia: '00001182',
  via: 'JOSÉ DE LAMA',
  estado: 'ACTIVO',
  fichado: true,
  geometria: { type: 'MultiPolygon', coordinates: [[[[-80.6, -4.8]]]] },
  ...extra,
});

describe('el mapa catastral es una ruta del modulo, no una opcion', () => {
  it('abre en /catastro/mapa y su permiso es el de encontrar un predio', async () => {
    await abrirElMapa();
    expect(await screen.findByLabelText('Plano')).toBeInTheDocument();
  });

  it('sin «Consulta de fichas» no se dibuja el plano, y se dice que falta permiso', async () => {
    // No es un adorno: el visor lee predios, y quien no puede encontrarlos
    // tampoco puede verlos en el mapa. Sin esta guarda seria la unica pantalla
    // del sistema que se dibuja sin comprobar ningun permiso (REQ-03 §5).
    entraCon({ sectores: ['lectura'] });
    montarEnRuta('/catastro/mapa');
    expect(await screen.findByText('No tienes permiso para esta opción')).toBeInTheDocument();
    expect(screen.queryByLabelText('Plano')).not.toBeInTheDocument();
  });
});

describe('la entrada del panel lateral', () => {
  const menuDeCatastro = () => screen.getByRole('navigation', { name: 'Opciones de Catastro' });

  it('el destino va detras de «Predios» y lleva a la ruta del mapa', async () => {
    await abrirElMapa();

    const entrada = within(menuDeCatastro()).getByRole('link', { name: /^Mapa catastral/ });
    expect(entrada).toHaveTextContent('Buscar por manzana y lote');
    expect(entrada).toHaveAttribute('href', '/catastro/mapa');

    const rotulos = within(menuDeCatastro())
      .getAllByRole('link')
      .map((enlace) => enlace.textContent ?? '');
    expect(rotulos.findIndex((r) => r.startsWith('Mapa catastral'))).toBe(
      rotulos.findIndex((r) => r.startsWith('Predios')) + 1,
    );
  });

  it('y no se dibuja para quien no puede encontrar un predio', async () => {
    /* Un destino de ruta no tiene id en el catalogo ni permiso propio, asi que
       sin la comprobacion de su `exige` seria la unica entrada del panel que se
       dibuja para todo el mundo (REQ-03 §5): un enlace a un aviso de «no tienes
       permiso».

       **El perfil tiene que ser este y no otro.** La primera version le daba
       solo «Sectores y manzanas», y la mutacion —quitar la comprobacion de
       `exige`— paso en VERDE: sin ninguna opcion visible de «Predios», el grupo
       entero desaparece del panel (`catalogoVisible` lo filtra) y con el se iba
       el destino, asi que la guarda no era lo que lo escondia. Con «Ficha urbana
       individual» el grupo sobrevive y la consulta de fichas no, que es
       exactamente el caso que `exige` existe para cubrir. */
    entraCon({ ficha_urbana: ['lectura'] });
    montarEnRuta('/catastro/ficha-urbana');
    await screen.findByRole('heading', { level: 1 });

    await waitFor(() => {
      expect(within(menuDeCatastro()).getByRole('link', { name: /^Predios/ })).toBeInTheDocument();
    });
    expect(
      within(menuDeCatastro()).queryByRole('link', { name: /^Mapa catastral/ }),
    ).not.toBeInTheDocument();
  });
});

describe('las capas dicen cual se puede dibujar y cual no', () => {
  it('las cinco del diseño, y las dos que no se pueden dibujar salen apagadas', async () => {
    await abrirElMapa();
    const capas = within(await screen.findByLabelText('Capas'));

    expect(CAPAS.map((capa) => capa.label)).toEqual([
      'Predios (lotes)',
      'Manzanas',
      'Sectores',
      'Vías y calles',
      'Aranceles por zona',
    ]);
    expect(capas.getByRole('checkbox', { name: /Predios \(lotes\)/ })).toBeEnabled();
    expect(capas.getByRole('checkbox', { name: /Vías y calles/ })).toBeDisabled();
    expect(capas.getByRole('checkbox', { name: /Aranceles por zona/ })).toBeDisabled();
  });

  it('y cada una que no se dibuja dice por que, con su motivo y no con un hueco', async () => {
    await abrirElMapa();
    const capas = within(await screen.findByLabelText('Capas'));

    expect(capas.getByText(/La vía no tiene geometría en el sistema/)).toBeInTheDocument();
    expect(capas.getByText(/El arancel es de un tramo de vía/)).toBeInTheDocument();
  });

  it('apagar «Predios» deja el lienzo sin lotes, sin tocar la lectura', async () => {
    await abrirElMapa();
    await screen.findByTestId('lienzo');
    expect(screen.getByTestId('lienzo')).toHaveAttribute('data-lotes', '4');

    await userEvent.click(screen.getByRole('checkbox', { name: /Predios \(lotes\)/ }));

    expect(screen.getByTestId('lienzo')).toHaveAttribute('data-lotes', '0');
    // La lista sigue con los cuatro: apagar una capa es dejar de dibujarla, no
    // dejar de tenerla.
    expect(screen.getByText('Lotes de la vista (4)')).toBeInTheDocument();
  });
});

describe('el plano cuenta lo que no dibuja', () => {
  it('dice cuantos predios del marco no tienen poligono', async () => {
    elPlanoResponde({ marco: '', limite: 2000, sinGeometria: 812, lotes: [lote()] });
    await abrirElMapa();

    expect(
      await screen.findByText('812 predios de este marco no tienen polígono: no se dibujan.'),
    ).toBeInTheDocument();
  });

  it('y lo dice tambien cuando son cero: callar es afirmar que estan todos', async () => {
    elPlanoResponde({ marco: '', limite: 2000, sinGeometria: 0, lotes: [lote()] });
    await abrirElMapa();

    expect(
      await screen.findByText('Todos los predios de este marco tienen su polígono.'),
    ).toBeInTheDocument();
  });

  it('el plano vacio nombra la causa y la salida, no se queda en blanco', async () => {
    elPlanoResponde({ marco: '', limite: 2000, sinGeometria: 3418, lotes: [] });
    await abrirElMapa();

    // Este es el estado de TODA municipalidad hoy: ninguna tiene un poligono
    // cargado (ADR-0021). Un plano mudo aqui se lee como un distrito sin
    // predios en vez de como un catastro sin levantar.
    expect(
      await screen.findByText('Este marco no tiene ningún lote levantado'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/se carga desde el plano catastral de la municipalidad/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('lienzo')).not.toBeInTheDocument();
  });
});

describe('el lote se elige, y con el teclado', () => {
  it('la lista de lotes selecciona el mismo lote que el lienzo', async () => {
    elPlanoResponde({
      marco: '',
      limite: 2000,
      sinGeometria: 0,
      lotes: [lote(), lote({ predioId: 2, codRefCatastral: 'OTRO', lote: '15' })],
    });
    await abrirElMapa();

    const lista = within(await screen.findByLabelText('Lotes de la vista'));
    await userEvent.click(lista.getByRole('button', { name: /Mz\. 014 · Lt\. 14/ }));

    const panel = within(screen.getByLabelText('Lote seleccionado'));
    expect(panel.getByText('200601010150010101001')).toBeInTheDocument();
  });

  it('«Ubicar» encuentra el lote por su numero y no calla cuando no lo hay', async () => {
    elPlanoResponde({ marco: '', limite: 2000, sinGeometria: 0, lotes: [lote()] });
    await abrirElMapa();
    await screen.findByLabelText('Lotes de la vista');

    await userEvent.type(screen.getByLabelText('Código predial o lote'), '99');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar' }));
    expect(
      await screen.findByText('Ningún lote de los 1 de esta vista responde a «99».'),
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Código predial o lote'));
    await userEvent.type(screen.getByLabelText('Código predial o lote'), '14');
    await userEvent.click(screen.getByRole('button', { name: 'Ubicar' }));

    await waitFor(() => {
      const panel = within(screen.getByLabelText('Lote seleccionado'));
      expect(panel.getByText('200601010150010101001')).toBeInTheDocument();
    });
  });
});

describe('el panel del lote no inventa ninguna cifra', () => {
  it('el arancel de la via sale «—», y se dice donde se consulta de verdad', async () => {
    elPlanoResponde({ marco: '', limite: 2000, sinGeometria: 0, lotes: [lote()] });
    await abrirElMapa();

    await userEvent.click(
      within(await screen.findByLabelText('Lotes de la vista')).getByRole('button'),
    );

    const panel = within(screen.getByLabelText('Lote seleccionado'));
    const filas = panel.getAllByRole('term').map((dt) => dt.textContent);
    expect(filas).toEqual([
      'Código predial',
      'Contribuyente',
      'Sector / manzana',
      'Lote',
      'Frente a vía',
      'Uso',
      'Área de terreno',
      'Área construida',
      'Arancel de la vía',
    ]);
    // La novena fila existe **y esta vacia**: el arancel es de un tramo de via y
    // el predio no dice en cual esta (ADR-0022 §5). Quitar la fila escondería la
    // pregunta; ponerle una cifra sería contestarla mal.
    const arancel = panel.getAllByRole('definition')[8];
    expect(arancel).toHaveTextContent('—');
    expect(panel.getByText(/se consulta con su importe exacto en «Aranceles»/)).toBeInTheDocument();
  });

  it('un lote sin codigo predial compuesto no se rellena: sector, manzana y lote van vacios', async () => {
    elPlanoResponde({
      marco: '',
      limite: 2000,
      sinGeometria: 0,
      lotes: [lote({ codigoDeSector: null, codigoDeManzana: null, lote: null })],
    });
    await abrirElMapa();

    await userEvent.click(
      within(await screen.findByLabelText('Lotes de la vista')).getByRole('button'),
    );

    const panel = within(screen.getByLabelText('Lote seleccionado'));
    const valores = panel.getAllByRole('definition').map((dd) => dd.textContent);
    // «Sector / manzana» y «Lote» en «—»: es un predio del padron al que nadie
    // le ha compuesto todavia su codigo, y rellenarlo seria el «—» de #322 al
    // reves (RNF-080).
    expect(valores[2]).toBe('—');
    expect(valores[3]).toBe('—');
  });
});

describe('el modelo del plano', () => {
  it('una respuesta sin lotes no es un plano vacio: es otra cosa, y falla en voz alta', () => {
    // Sin esta guarda, el defecto de #363: la pantalla dibuja un mapa sin lotes
    // y un contador en cero, en silencio, en vez de decir que la respuesta no es
    // la que esperaba.
    expect(() => leerPlano({ contenido: [] })).toThrow(/no trae la lista de lotes/);
    expect(() => leerPlano(null)).toThrow(/no es un objeto/);
  });

  it('el rotulo de un lote sin manzana es su codigo, no «Mz. — · Lt. —»', () => {
    expect(rotuloDelLote(lote())).toBe('Mz. 014 · Lt. 14');
    expect(rotuloDelLote(lote({ codigoDeManzana: null, lote: null }))).toBe(
      '200601010150010101001',
    );
  });

  it('la busqueda vacia no casa con nada: «Ubicar» sin escribir no elige el primero', () => {
    expect(casaConLaBusqueda(lote(), '')).toBe(false);
    expect(casaConLaBusqueda(lote(), '  ')).toBe(false);
    expect(casaConLaBusqueda(lote(), '14')).toBe(true);
  });
});
