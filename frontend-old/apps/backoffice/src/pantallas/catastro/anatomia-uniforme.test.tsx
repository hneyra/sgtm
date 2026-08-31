import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { formatearFecha } from '@sgtm/dominio';
import { montarEnRuta } from '../../pruebas/montar';
import { limpiarSesion } from '../../pruebas/sesion';
import { pantallasDelModulo } from '../../catalogo';
import { composicionDe } from '../composicion';
import { SIN_DATO, hoy } from '../seguridad/listado';

/**
 * **La misma anatomía en las doce opciones de Catastro** (#391 §4).
 *
 * La anatomía es **el orden y las ranuras**, no los tres bloques repetidos doce
 * veces. Las doce caen hoy en cuatro superficies —`FichaDelPredio`,
 * `Territorio`, `CuadroDeValuacion` y el renderizador común— y lo que esta
 * prueba defiende es que las cuatro se leen igual:
 *
 * 1. **El orden de los bloques** es el que impone `Pantalla` (FRO-03 §5): aviso
 *    → cabecera-resumen → versionado → filtros → tabla → totales → índice +
 *    formulario → barra de acciones. Ninguna superficie propia lo reordena.
 * 2. **Toda superficie con un registro abierto lo resume arriba**, con el mismo
 *    lenguaje visual: identificador en monoespaciada, insignias con su texto y
 *    debajo la rejilla de datos. Ese lenguaje vive en un solo sitio
 *    —`bloques/CabeceraDeRegistro`— y por eso las tres cabeceras son la misma
 *    cabecera con otro contenido.
 * 3. **Toda superficie con secciones lleva su índice**, con la entrada de salida
 *    hacia las acciones.
 * 4. **Donde una ranura no aplica se dice por qué**, y no se rellena con un dato
 *    que la API no publica (ADR-0010 §4). Los dos casos que más lo piden: el
 *    territorio, que el backend no versiona, y el cuadro de valuación, que se
 *    sella por conjunto y de eso no publica nada.
 * 5. **Ninguna cifra de una cabecera sin su fecha** (regla 9, RNF-075).
 *
 * Las cifras de los conteos y de los cuadros se **interponen por encima del
 * proxy**, como ya hacen `territorio.test.tsx` y `cuadro-de-valuacion.test.tsx`:
 * el proxy no finge lo que el backend no le ha dado, y lo que aquí se prueba es
 * la anatomía, no las cifras.
 */

const URBANA = '/catastro/ficha-urbana/200601010150010101001';
const HOY = formatearFecha(hoy());

/* ── El andamiaje: interponer respuestas sin tocar el proxy ─────────────── */

let interpuestas: { readonly ruta: string; readonly cuerpo: unknown }[] = [];

function elBackendResponde(ruta: string, cuerpo: unknown): void {
  interpuestas.push({ ruta, cuerpo });
}

/** Un sector con la forma exacta de `SectorResource`, con sus tres conteos. */
const sectorConConteos = {
  contenido: [
    {
      id: 1,
      codigo: '01',
      nombre: 'CERCADO',
      zona: 'Zona 1',
      activo: true,
      manzanas: 12,
      lotes: 340,
      predios: 512,
    },
  ],
  pagina: 0,
  tamano: 1,
  totalElementos: 1,
  totalPaginas: 1,
  hayMas: false,
};

/** Dos aranceles con la forma exacta de `ArancelResource`, del mismo documento. */
const ARANCELES_DEL_BACKEND = [
  { id: 1, viaId: 1, tramo: 'Cuadras 1 a 4', valorM2: '412.00', documentoFuente: 'R.A. 0142' },
  { id: 2, viaId: 2, tramo: 'Cuadra 5', valorM2: '388.00', documentoFuente: 'R.A. 0142' },
];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  interpuestas = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const url =
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const puesta = interpuestas.find((una) => url.includes(una.ruta));
    if (puesta !== undefined && (opciones?.method ?? 'GET') === 'GET') {
      return Promise.resolve(
        new Response(JSON.stringify(puesta.cuerpo), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }
    return proxy(entrada, opciones);
  };
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

/* ── Cómo se lee la anatomía de una pantalla ───────────────────────────── */

/**
 * Los bloques de la anatomía **en el orden en que están en el documento**.
 *
 * Se leen por su clase y no por su rótulo a propósito: el rótulo lo pone cada
 * pantalla y la ranura la pone el sistema, y lo que aquí se compara es la
 * ranura. `querySelectorAll` devuelve en orden de documento, que es el orden en
 * que se lee la página.
 */
const RANURAS: readonly (readonly [string, string])[] = [
  ['sgtm-resumen', 'cabecera'],
  ['sgtm-versionado', 'versionado'],
  ['sgtm-procedencia', 'procedencia'],
  ['sgtm-filtros', 'filtros'],
  ['sgtm-tabla__marco', 'tabla'],
  ['sgtm-indice', 'indice'],
  ['sgtm-acciones', 'acciones'],
];

function anatomiaDe(contenedor: HTMLElement): readonly string[] {
  const selector = RANURAS.map(([clase]) => `.${clase}`).join(', ');
  const vistas: string[] = [];
  for (const nodo of contenedor.querySelectorAll(selector)) {
    const ranura = RANURAS.find(([clase]) => nodo.classList.contains(clase))?.[1];
    // Cada ranura una sola vez: una pantalla puede llevar tres matrices, y lo
    // que se compara es el orden de los bloques y no cuántos hay de cada uno.
    if (ranura !== undefined && !vistas.includes(ranura)) vistas.push(ranura);
  }
  return vistas;
}

/** ¿`a` va antes que `b` en la anatomía dibujada? */
const antes = (anatomia: readonly string[], a: string, b: string): boolean =>
  anatomia.includes(a) && anatomia.includes(b) && anatomia.indexOf(a) < anatomia.indexOf(b);

const cabeceraDe = (nombre: string) => screen.findByRole('region', { name: nombre });

/* ── 1. El orden de los bloques, en las cuatro superficies ─────────────── */

describe('las cuatro superficies dibujan los bloques en el mismo orden', () => {
  it('la ficha del predio: cabecera, versionado, tabla, índice y acciones', async () => {
    const { container } = montarEnRuta(URBANA);
    await cabeceraDe('Resumen de la ficha');

    const anatomia = anatomiaDe(container);
    expect(antes(anatomia, 'cabecera', 'versionado')).toBe(true);
    expect(antes(anatomia, 'versionado', 'indice')).toBe(true);
    expect(antes(anatomia, 'indice', 'acciones')).toBe(true);
  });

  it('el territorio: la cabecera antes de los filtros, la tabla y el índice', async () => {
    elBackendResponde('/api/v1/catastro/sectores', sectorConConteos);
    const { container } = montarEnRuta('/catastro/calles');
    await cabeceraDe('Lo señalado en el territorio');
    await screen.findByRole('button', { name: 'Buscar' });

    const anatomia = anatomiaDe(container);
    expect(antes(anatomia, 'cabecera', 'filtros')).toBe(true);
    expect(antes(anatomia, 'filtros', 'tabla')).toBe(true);
    expect(antes(anatomia, 'tabla', 'indice')).toBe(true);
    expect(antes(anatomia, 'indice', 'acciones')).toBe(true);
  });

  it('el cuadro de valuación: la cabecera antes de la procedencia, y las dos antes de los filtros', async () => {
    elBackendResponde('/api/v1/catastro/tablas/aranceles', ARANCELES_DEL_BACKEND);
    const { container } = montarEnRuta('/catastro/aranceles');
    await cabeceraDe('Resumen del cuadro');

    const anatomia = anatomiaDe(container);
    expect(antes(anatomia, 'cabecera', 'procedencia')).toBe(true);
    expect(antes(anatomia, 'procedencia', 'filtros')).toBe(true);
    expect(antes(anatomia, 'filtros', 'tabla')).toBe(true);
  });

  it('la consulta de fichas, en el renderizador común: filtros, tabla y acciones', async () => {
    const { container } = montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('button', { name: 'Buscar' });

    const anatomia = anatomiaDe(container);
    expect(antes(anatomia, 'filtros', 'tabla')).toBe(true);
    expect(antes(anatomia, 'tabla', 'acciones')).toBe(true);
  });
});

/* ── 2. La cabecera del registro abierto, con un solo lenguaje visual ──── */

/**
 * Las tres cabeceras son **la misma cabecera**: el identificador en
 * monoespaciada, las insignias con su texto y la rejilla de datos debajo.
 *
 * Se comprueban las tres piezas y no el texto de cada una: el contenido es de
 * cada superficie —un código catastral, un sector, un ejercicio— y la forma es
 * del sistema. Si esto se pudiera cumplir en una y no en las otras dos, el
 * bloque compartido no estaría compartido.
 */
describe('toda superficie con un registro abierto lo resume arriba, y del mismo modo', () => {
  const conLasTresPiezas = (region: HTMLElement): void => {
    expect(region.querySelector('.sgtm-resumen__codigo')).not.toBeNull();
    expect(region.querySelector('.sgtm-insignia')).not.toBeNull();
    expect(region.querySelector('.sgtm-resumen__datos')).not.toBeNull();
  };

  it('la ficha del predio resume el predio abierto', async () => {
    montarEnRuta(URBANA);
    const region = await cabeceraDe('Resumen de la ficha');
    conLasTresPiezas(region);
    // El identificador es el código de referencia catastral, **troquelado**:
    // el mismo `200601010150010101001` de la ruta, en los tramos del manual.
    expect(region.querySelector('.sgtm-resumen__codigo')?.textContent).toBe(
      '20-06-01-01-015-001-01-01-00-1',
    );
  });

  it('el territorio resume lo señalado en el árbol', async () => {
    const usuario = userEvent.setup();
    elBackendResponde('/api/v1/catastro/sectores', sectorConConteos);
    montarEnRuta('/catastro/sectores');

    await usuario.click(await screen.findByRole('button', { name: /CERCADO/ }));
    const region = await cabeceraDe('Lo señalado en el territorio');
    conLasTresPiezas(region);
    expect(region.querySelector('.sgtm-resumen__codigo')).toHaveTextContent('01');
    expect(within(region).getByText('SECTOR')).toBeInTheDocument();
  });

  it('el cuadro de valuación resume el cuadro del ejercicio', async () => {
    elBackendResponde('/api/v1/catastro/tablas/aranceles', ARANCELES_DEL_BACKEND);
    montarEnRuta('/catastro/aranceles');

    const region = await cabeceraDe('Resumen del cuadro');
    conLasTresPiezas(region);
    expect(region.querySelector('.sgtm-resumen__codigo')).toHaveTextContent(
      String(new Date().getFullYear()),
    );
    // El ámbito decide quién puede cargar el cuadro (ADR-0017), y va con texto.
    expect(within(region).getByText('MUNICIPAL')).toBeInTheDocument();
  });

  /**
   * **La cabecera del territorio está en la anatomía, no al lado.**
   *
   * Era una tarjeta del panel de la derecha —`.sgtm-territorio__panel`—, o sea
   * fuera del orden que las otras once respetan y debajo de las pestañas. Ahora
   * es la primera ranura de la página: antes del árbol, antes de las pestañas y
   * a lo ancho. Devolverla a su sitio de antes pone esta prueba en rojo aunque
   * el contenido no cambie ni una letra, que es de lo que se trata.
   */
  it('la del territorio va arriba y a lo ancho, no dentro del panel de la derecha', async () => {
    const usuario = userEvent.setup();
    elBackendResponde('/api/v1/catastro/sectores', sectorConConteos);
    const { container } = montarEnRuta('/catastro/sectores');

    await usuario.click(await screen.findByRole('button', { name: /CERCADO/ }));
    const region = await cabeceraDe('Lo señalado en el territorio');
    const superficie = container.querySelector('.sgtm-territorio');

    expect(region.closest('.sgtm-territorio__panel')).toBeNull();
    expect(region.closest('.sgtm-territorio')).toBeNull();
    expect(superficie).not.toBeNull();
    // Antes que el árbol y que las pestañas, que es lo que «arriba» significa.
    expect(
      region.compareDocumentPosition(superficie as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  /** Y sin nada señalado la ranura no desaparece: dice qué hay que elegir. */
  it('sin nada señalado la cabecera sigue estando, y dice qué elegir', async () => {
    montarEnRuta('/catastro/sectores');
    const region = await cabeceraDe('Lo señalado en el territorio');
    expect(within(region).getByText(/Elige un sector en el árbol/)).toBeInTheDocument();
  });
});

/* ── 3. Ninguna cifra de la cabecera sin su fecha (regla 9) ────────────── */

describe('las cifras de una cabecera van con la fecha a la que están', () => {
  it('los conteos del sector llevan la fecha de la respuesta que los trajo', async () => {
    const usuario = userEvent.setup();
    elBackendResponde('/api/v1/catastro/sectores', sectorConConteos);
    montarEnRuta('/catastro/sectores');

    await usuario.click(await screen.findByRole('button', { name: /CERCADO/ }));
    const region = await cabeceraDe('Lo señalado en el territorio');

    for (const rotulo of ['Manzanas', 'Lotes', 'Predios inscritos']) {
      expect(within(region).getByLabelText(rotulo)).toHaveTextContent(`al ${HOY}`);
    }
    // Y la denominación, que no es una cifra, no se fecha.
    expect(within(region).getByLabelText('Denominación')).not.toHaveTextContent('al ');
  });

  it('un conteo que no llegó sigue siendo un hueco, y un hueco no se fecha', async () => {
    const usuario = userEvent.setup();
    // Sin interponer: el proxy no finge conteos que el backend no le ha dado.
    montarEnRuta('/catastro/sectores');

    await usuario.click(await screen.findByRole('button', { name: /CERCADO DE SULLANA/ }));
    const region = await cabeceraDe('Lo señalado en el territorio');
    const manzanas = within(region).getByLabelText('Manzanas');

    expect(manzanas).toHaveTextContent(SIN_DATO);
    expect(manzanas).not.toHaveTextContent('al ');
  });

  it('el conteo de filas del cuadro lleva el día en que se leyó', async () => {
    elBackendResponde('/api/v1/catastro/tablas/aranceles', ARANCELES_DEL_BACKEND);
    montarEnRuta('/catastro/aranceles');

    const region = await cabeceraDe('Resumen del cuadro');
    await waitFor(() =>
      expect(within(region).getByLabelText('Filas del cuadro')).toHaveTextContent(`2 al ${HOY}`),
    );
  });
});

/* ── 4. El índice, donde hay secciones ────────────────────────────────── */

describe('toda superficie con secciones lleva su índice, con su salida a las acciones', () => {
  it('la hoja de vías lo lleva, con la tabla como entrada previa', async () => {
    montarEnRuta('/catastro/calles');
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    // La entrada previa es la tabla, con **el rótulo del catálogo** (RNF-080):
    // se dibuja encima de las secciones y fuera de la rejilla del índice, así
    // que sin ella el índice empezaría por la segunda cosa de la hoja.
    const pantallas = await pantallasDelModulo('catastro');
    const tabla = pantallas['calles']?.tabla?.title;
    expect(tabla).toBeDefined();
    expect(within(indice).getByRole('button', { name: `Ir a ${tabla ?? ''}` })).toBeInTheDocument();
    // Y la salida: sin ella se sale del índice a los ocho campos de la vía y no
    // hay forma de saltar al acto que se vino a hacer.
    expect(within(indice).getByRole('button', { name: 'Ir a las acciones' })).toBeInTheDocument();
  });

  it('la ficha del predio lo lleva, que es de donde salió el bloque', async () => {
    montarEnRuta(URBANA);
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
    expect(within(indice).getByRole('button', { name: 'Ir a las acciones' })).toBeInTheDocument();
  });

  /**
   * **Y donde no hay secciones no hay índice, y eso no es una excepción.**
   *
   * Se comprueba contra el catálogo portado y no contra una lista escrita aquí:
   * lo que hace honesta la ausencia del índice es que la opción no declare ni
   * una sección, y eso lo dice el catálogo. El día que el prototipo le añada
   * una, esta prueba se pone roja y habrá que darle su índice.
   */
  it('sectores y las tres hojas del cuadro no declaran ni una sección, y por eso no lo llevan', async () => {
    const pantallas = await pantallasDelModulo('catastro');
    for (const opcion of ['sectores', 'aranceles', 'valores_unitarios', 'depreciacion']) {
      expect(pantallas[opcion]?.secciones ?? [], `«${opcion}» declara secciones`).toHaveLength(0);
      expect(pantallas[opcion]?.tabs ?? [], `«${opcion}» declara pestañas`).toHaveLength(0);
    }

    montarEnRuta('/catastro/aranceles');
    await cabeceraDe('Resumen del cuadro');
    expect(
      screen.queryByRole('navigation', { name: 'Secciones de la pantalla' }),
    ).not.toBeInTheDocument();
  });
});

/* ── 5. Lo que no aplica no se rellena ────────────────────────────────── */

describe('donde una ranura no aplica, no se inventa el dato que la llenaría', () => {
  /**
   * El cuadro **no lleva banda de versionado**, y no por descuido: los cuadros
   * no se versionan por fecha, se sellan por conjunto (ADR-0007, V9), y de eso
   * no publica nada ni el recurso ni el contrato. `ArancelResource`,
   * `ValorUnitarioResource` y `DepreciacionResource` publican `documentoFuente`
   * y nada más.
   */
  it('el cuadro de valuación no dibuja versión, vigencia ni histórico', async () => {
    elBackendResponde('/api/v1/catastro/tablas/aranceles', ARANCELES_DEL_BACKEND);
    const { container } = montarEnRuta('/catastro/aranceles');
    await cabeceraDe('Resumen del cuadro');

    expect(container.querySelector('.sgtm-versionado')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Versión de la ficha' })).not.toBeInTheDocument();
    // Ni las insignias de una versión, que es lo que una banda inventada traería.
    expect(screen.queryByText('VIGENTE')).not.toBeInTheDocument();
    expect(screen.queryByText('HISTÓRICA')).not.toBeInTheDocument();
  });

  it('el territorio tampoco: el backend no versiona el sector ni la vía', async () => {
    elBackendResponde('/api/v1/catastro/sectores', sectorConConteos);
    const { container } = montarEnRuta('/catastro/calles');
    await cabeceraDe('Lo señalado en el territorio');

    expect(container.querySelector('.sgtm-versionado')).toBeNull();
  });

  /**
   * **El `documentoFuente` se dice una vez.**
   *
   * Vive en la banda de procedencia, que es la que sabe enumerarlos todos
   * cuando las filas citan varios. Repetirlo en la cabecera obligaría a elegir
   * uno —que es justo lo que la banda existe para no hacer— o a decir lo mismo
   * dos veces en la misma pantalla.
   */
  it('el documento fuente sale en la banda y no se repite en la cabecera', async () => {
    elBackendResponde('/api/v1/catastro/tablas/aranceles', ARANCELES_DEL_BACKEND);
    montarEnRuta('/catastro/aranceles');

    const banda = await screen.findByRole('region', { name: 'Procedencia del cuadro' });
    await within(banda).findByText('R.A. 0142');

    expect(screen.getAllByText('R.A. 0142')).toHaveLength(1);
    const cabecera = await cabeceraDe('Resumen del cuadro');
    expect(cabecera).not.toHaveTextContent('R.A. 0142');
  });

  /**
   * Las dos opciones que sirve el renderizador común **declaran la ranura
   * vacía**, y se comprueba donde se declara: en `composicion.ts`.
   *
   * `consulta_fichas` es una lista y no tiene registro abierto que resumir —cada
   * predio se abre en su ficha, donde sí hay cabecera—; el reporte de la ficha
   * del contribuyente es una hoja, y su anatomía es la de la hoja.
   */
  it('la consulta de fichas no tiene registro abierto, y su ranura queda vacía', async () => {
    expect(composicionDe('consulta_fichas').resumen).toBeUndefined();
    expect(composicionDe('consulta_fichas').indice).toBeUndefined();

    const { container } = montarEnRuta('/catastro/consulta-fichas');
    await screen.findByRole('button', { name: 'Buscar' });
    expect(container.querySelector('.sgtm-resumen')).toBeNull();
  });

  it('el reporte de la ficha del contribuyente es una hoja, con la anatomía de la hoja', async () => {
    expect(composicionDe('ficha_contribuyente_reporte').resumen).toBeUndefined();
    expect(composicionDe('ficha_contribuyente_reporte').indice).toBeUndefined();

    const { container } = montarEnRuta('/catastro/ficha-contribuyente-reporte/20260101015001');
    // La hoja, con su membrete: es la anatomía del papel, y es la suya entera.
    await screen.findByRole('heading', { name: 'Ficha del contribuyente' });
    expect(container.querySelector('.sgtm-hoja')).not.toBeNull();
    expect(container.querySelector('.sgtm-resumen')).toBeNull();
    expect(container.querySelector('.sgtm-indice')).toBeNull();
  });
});
