import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { BarraDeAcciones, ID_DE_LAS_ACCIONES } from './BarraDeAcciones';
import { IndiceDeSecciones } from './IndiceDeSecciones';
import { TablaDePantalla } from './TablaDePantalla';

/**
 * La barra de acciones y el indice de secciones: lo que hace que una pantalla
 * larga se pueda operar (#332).
 *
 * Tres defectos que solo se ven en una pantalla larga de verdad —el padron de
 * contribuyentes apilado mide 4 800 px— y que ninguna prueba de dibujo
 * encontraba:
 *
 * 1. la franja del motivo no acompanaba a la barra fija: el operador veia
 *    «Guardar» apagado al pie y su explicacion a cuatro mil pixeles;
 * 2. la region viva se montaba con su texto dentro, y una region que aparece
 *    con contenido no anuncia nada;
 * 3. del indice se salia a 55 controles apilados sin ninguna salida hacia el
 *    acto.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const HOJA = readFileSync(join(AQUI, '../../estilos/aplicacion.css'), 'utf8');

/** El bloque de una clase en la hoja, tal cual. */
function bloqueDe(selector: string): string {
  const desde = HOJA.indexOf(`\n${selector} {`);
  expect(desde, `«${selector}» no esta en la hoja`).toBeGreaterThan(0);
  return HOJA.slice(desde, HOJA.indexOf('}', desde));
}

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('la franja del motivo va donde va la barra', () => {
  it('las dos cuelgan del **mismo** bloque fijo, y solo ese es `sticky`', async () => {
    montarEnRuta('/rentas-registro/transferencia-predio');
    // La franja se busca por su `id` y no por su rol: en una pantalla con campos
    // de solo lectura hay mas de un `role="status"`, y la que importa es la que
    // la primaria referencia con `aria-describedby`.
    await waitFor(() => expect(document.getElementById(ID_DE_LAS_ACCIONES)).not.toBeNull());
    const franja = document.getElementById('sgtm-motivo-de-la-accion');
    const acciones = document.getElementById(ID_DE_LAS_ACCIONES);
    expect(franja?.textContent).not.toBe('');

    // El mismo padre: lo que sube con el desplazamiento sube entero.
    expect(franja?.parentElement).not.toBeNull();
    expect(franja?.parentElement).toBe(acciones?.parentElement);
    expect(franja?.parentElement).toHaveClass('sgtm-acciones__fija');

    // Y quien se queda pegada es la envolvente, no la barra: si lo fuera la
    // barra, la franja volveria a quedarse arriba y esto no serviria de nada.
    expect(bloqueDe('.sgtm-acciones__fija')).toMatch(/position:\s*sticky/);
    expect(bloqueDe('.sgtm-acciones')).not.toMatch(/position:\s*sticky/);
  });

  it('la region viva se dibuja siempre, vacía y sin ocupar, para poder anunciar', async () => {
    // Una pantalla cuya primaria **si** puede guardar: no hay motivo que contar.
    montarEnRuta('/catastro/calles');
    await waitFor(() => expect(document.getElementById(ID_DE_LAS_ACCIONES)).not.toBeNull());
    const franja = document.getElementById('sgtm-motivo-de-la-accion');

    expect(franja).not.toBeNull();
    expect(franja?.getAttribute('role')).toBe('status');
    expect(franja?.textContent).toBe('');
    // Vacia no se ve, pero sigue en el arbol: es lo que permite que la
    // aparicion del motivo sea un **cambio**, que es lo que un lector anuncia.
    expect(HOJA).toMatch(/\.sgtm-acciones__motivo:empty \{/);
  });
});

describe('el indice ofrece la salida hacia las acciones', () => {
  const SECCIONES = [
    { label: 'Identificación', campos: [] },
    { label: 'Domicilio fiscal', campos: [] },
  ];

  it('la entrada final lleva el foco al primer control de la barra', async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <IndiceDeSecciones secciones={SECCIONES} anclaDe={(i) => `s-${i}`} haciaLasAcciones />
        {/* «Buscar» abre algo, asi que esta viva: un boton `disabled` no puede
            recibir el foco, y el que abre la barra en una pantalla real es el
            que si lo recibe. */}
        <BarraDeAcciones acciones={['Buscar', 'Guardar']} altas={{ Buscar: () => {} }} />
      </MemoryRouter>,
    );

    const salida = screen.getByRole('button', { name: 'Ir a las acciones' });
    await usuario.click(salida);

    // El contenedor no es enfocable; lo que se vino a hacer es pulsar.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Buscar' }));
  });

  /**
   * **Cada rotulo de seccion es dos botones**, y hay que poder distinguirlos
   * (#337).
   *
   * La cabecera de la seccion tambien es un boton —la que la pliega— y se llama
   * exactamente igual que su entrada del indice: quien navega por lista de
   * controles oia «Identificación» dos veces sin nada que las separe, y una
   * lleva a la seccion y la otra la esconde. El rotulo visible no cambia: en el
   * indice, lo que hay que leer es el nombre de la seccion.
   */
  it('la entrada del índice dice que **va** a la sección, y el rótulo visible no cambia', () => {
    render(
      <MemoryRouter>
        <IndiceDeSecciones secciones={SECCIONES} anclaDe={(i) => `s-${i}`} />
      </MemoryRouter>,
    );

    const entrada = screen.getByRole('button', { name: 'Ir a Identificación' });
    expect(entrada).toHaveTextContent('Identificación');
    // Y el nombre a secas ya no nombra a la entrada del indice: es el de la
    // cabecera plegable, que es el otro boton.
    expect(screen.queryByRole('button', { name: 'Identificación' })).not.toBeInTheDocument();
  });

  it('sin barra de acciones no se ofrece una salida a ninguna parte', () => {
    render(
      <MemoryRouter>
        <IndiceDeSecciones secciones={SECCIONES} anclaDe={(i) => `s-${i}`} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Ir a las acciones' })).not.toBeInTheDocument();
  });
});

/**
 * **`aria-current` dice cual se esta viendo, no cual se pulso.**
 *
 * jsdom no implementa `IntersectionObserver` y no calcula geometria, asi que
 * aqui no se puede rodar una pagina: lo que se prueba es **el cableado** —que
 * las anclas se observan y que la respuesta del observador mueve la marca—, con
 * un observador de mentira que la prueba dispara a mano. Que el navegador de
 * verdad intersecte cuando toca no lo comprueba esto, y se dice.
 */
describe('el indice sigue la seccion visible, no la ultima pulsada', () => {
  it('observa las anclas de las secciones, y la marca se mueve con lo que ve', () => {
    const observadas: Element[] = [];
    let responder: ((entradas: unknown[]) => void) | undefined;

    class ObservadorDeMentira {
      constructor(callback: (entradas: unknown[]) => void) {
        responder = callback;
      }
      observe(nodo: Element): void {
        observadas.push(nodo);
      }
      disconnect(): void {}
      unobserve(): void {}
    }
    vi.stubGlobal('IntersectionObserver', ObservadorDeMentira);

    const anclaDe = (i: number): string => `sgtm-seccion-0-${i}`;
    render(
      <MemoryRouter>
        {/* Las anclas, que es lo que dibuja `Formulario` en la pantalla real. */}
        <div id={anclaDe(0)} />
        <div id={anclaDe(1)} />
        <IndiceDeSecciones secciones={SECCIONES_DEL_INDICE} anclaDe={anclaDe} />
      </MemoryRouter>,
    );

    // Se observan las dos anclas: sin esto, `aria-current` no puede seguir nada.
    expect(observadas.map((nodo) => nodo.id)).toEqual([anclaDe(0), anclaDe(1)]);

    const entradas = (): HTMLElement[] =>
      within(screen.getByRole('navigation')).getAllByRole('button');
    expect(entradas()[0]).toHaveAttribute('aria-current', 'true');

    // La segunda entra en la franja de lectura sin que nadie pulse nada.
    act(() =>
      responder?.([
        {
          isIntersecting: true,
          target: document.getElementById(anclaDe(1)),
          boundingClientRect: { top: 10 },
        },
      ]),
    );

    expect(entradas()[1]).toHaveAttribute('aria-current', 'true');
    expect(entradas()[0]).not.toHaveAttribute('aria-current');

    vi.unstubAllGlobals();
  });
});

const SECCIONES_DEL_INDICE = [
  { label: 'Identificación', campos: [] },
  { label: 'Domicilio fiscal', campos: [] },
];

/**
 * La banda de la seleccion concuerda con lo que se elige.
 *
 * El participio estaba escrito a mano en femenino —«elegida»—, que funciona
 * para una cuota y falla para el primer valor o el primer recibo que estrene
 * columna de casilla: «2 valores elegidas». Lo declara ahora quien declara la
 * seleccion, y es obligatorio: no se hereda un genero por omision.
 */
describe('la banda concuerda con lo que se elige', () => {
  const TABLA = { title: 'Valores', cols: ['', 'Número'], claves: ['campo', 'numero'] };
  const DATOS = { filas: [[{ texto: '' }, { texto: 'OP-001' }]] };

  it.each([
    { genero: 'femenino' as const, una: 'cuota', varias: 'cuotas', dice: '1 cuota elegida' },
    { genero: 'masculino' as const, una: 'valor', varias: 'valores', dice: '1 valor elegido' },
  ])('$genero: «$dice»', ({ genero, una, varias, dice }) => {
    render(
      <TablaDePantalla
        estructura={TABLA}
        datos={DATOS}
        cargando={false}
        seleccion={{
          elegidas: new Set(['una']),
          claveDe: () => 'una',
          onAlternar: () => {},
          una,
          varias,
          genero,
        }}
      />,
    );
    expect(document.querySelector('.sgtm-seleccion')?.textContent).toContain(dice);
  });
});
