import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';

/**
 * Los cuatro estados de una pantalla (FRO-01 §7).
 *
 * El prototipo no los disena: dibuja la pantalla con datos y ya. Contra el
 * proxy eso se nota poco —responde siempre y rapido—; contra un backend real,
 * una consulta que tarda, un filtro sin resultados o una red caida son el
 * estado normal de la pantalla varias veces al dia.
 */

const original = globalThis.fetch;

/** Sustituye al proxy para que la API conteste lo que la prueba necesita. */
function laApiResponde(estado: number, cuerpo: unknown): void {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { 'content-type': 'application/problem+json' },
      }),
    );
}

/** Se cayo la red: `fetch` ni siquiera llega a salir. */
function noHayRed(): void {
  globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
}

afterEach(() => {
  globalThis.fetch = original;
  desinstalarProxyDeDatos();
});

describe('error: el mensaje es el del backend, sin reescribir', () => {
  it('el detalle que redacto el servidor aparece literal (RNF-080)', async () => {
    laApiResponde(409, {
      type: 'https://sgtm.gob.pe/problemas/deuda-ya-cancelada',
      title: 'La deuda ya está cancelada',
      status: 409,
      detail: 'El recibo 000123 canceló esta cuota el 12/08/2026 en la caja 3.',
      traza: '7f3a91c2',
    });

    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('La deuda ya está cancelada')).toBeInTheDocument();
    expect(
      screen.getByText('El recibo 000123 canceló esta cuota el 12/08/2026 en la caja 3.'),
    ).toBeInTheDocument();
  });

  it('la traza se copia de un gesto: quien atiende por telefono la dicta', async () => {
    const usuario = userEvent.setup();
    const copiar = vi.fn(() => Promise.resolve());
    // jsdom no trae portapapeles y `navigator.clipboard` es de solo lectura.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: copiar },
      configurable: true,
    });

    laApiResponde(500, {
      type: 'about:blank',
      title: 'Error del servidor',
      status: 500,
      detail: 'No se pudo completar la consulta.',
      traza: '7f3a91c2',
    });

    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('Traza 7f3a91c2')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(copiar).toHaveBeenCalledWith('7f3a91c2');
    expect(await screen.findByText('Copiada')).toBeInTheDocument();
  });

  it('se puede reintentar una consulta, y el reintento vuelve a pedir', async () => {
    const usuario = userEvent.setup();
    let veces = 0;
    globalThis.fetch = () => {
      veces += 1;
      return Promise.resolve(
        new Response(JSON.stringify({ title: 'Se cayó', status: 503, detail: 'Otra vez.' }), {
          status: 503,
        }),
      );
    };

    montarEnRuta('/catastro/calles');
    await screen.findByText('Se cayó');
    expect(veces).toBe(1);

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(veces).toBe(2));
  });
});

describe('sin red, la pantalla lo dice', () => {
  it('no se queda cargando para siempre', async () => {
    noHayRed();
    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('No se pudo contactar con el servidor')).toBeInTheDocument();
    expect(screen.getByText(/Revisa la conexion de la municipalidad/)).toBeInTheDocument();
  });
});

describe('sin permiso: se dice que falta, no que hay detras', () => {
  it('un 403 no filtra ni las columnas ni los campos de la pantalla', async () => {
    laApiResponde(403, {
      type: 'https://sgtm.gob.pe/problemas/sin-permiso',
      title: 'Sin permiso',
      status: 403,
      detail: 'El usuario no tiene el acceso requerido.',
    });

    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('No tienes permiso para esta opción')).toBeInTheDocument();
    // Ni una columna de la tabla que hay detras.
    expect(screen.queryByRole('columnheader', { name: 'Zona' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('vacio: no es lo mismo un padron vacio que un filtro sin resultados', () => {
  beforeEach(() => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ fechaCalculo: '2026-08-13', tabla: { filas: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
  });

  it('sin filtros: todavia no hay nada que buscar', async () => {
    montarEnRuta('/catastro/calles');
    expect(await screen.findByText(/Todavía no hay/)).toBeInTheDocument();
  });

  it('con un filtro puesto: hay algo que hacer, y se dice cual', async () => {
    montarEnRuta('/catastro/calles?nombreDeCalle=SANTA+ROSA');
    expect(await screen.findByText('Ningún resultado para esta búsqueda')).toBeInTheDocument();
    expect(screen.getByText(/Quita alguno o corrige el valor/)).toBeInTheDocument();
  });
});

describe('cargando: esqueleto, y del tamano de lo que sustituye', () => {
  beforeEach(() => instalarProxyDeDatos({ latencia: false }));

  it('el panel dibuja las mismas tarjetas antes y despues de la respuesta', async () => {
    montarEnRuta('/inicio/inicio');

    // En cuanto llega el modulo —antes que la respuesta— ya hay cuatro tarjetas:
    // si fueran menos, la pantalla saltaria al llegar los datos.
    await waitFor(() =>
      expect(document.querySelectorAll('.sgtm-kpis__tarjeta').length).toBeGreaterThan(0),
    );
    const antes = document.querySelectorAll('.sgtm-kpis__tarjeta').length;
    expect(antes).toBe(4);

    await screen.findByText('Recaudado 2026');
    expect(document.querySelectorAll('.sgtm-kpis__tarjeta')).toHaveLength(antes);
  });

  it('la tabla carga con sus columnas, no con un girador', async () => {
    montarEnRuta('/catastro/calles');

    const columnas = await screen.findAllByRole('columnheader');
    expect(columnas.length).toBeGreaterThan(0);
    // Cada fila del esqueleto ocupa una celda por columna: el ancho de las
    // columnas no cambia al llegar las filas.
    const primeraFila = document.querySelectorAll('tbody tr')[0];
    expect(primeraFila?.querySelectorAll('td')).toHaveLength(columnas.length);

    await screen.findByText('SANTA ROSA');
  });
});

/**
 * Que estados tiene cada uno de los diez bloques de contenido (FRO-03 §5).
 *
 * No los diez tienen los cuatro, y no es un olvido:
 *
 * - **el error y el sin permiso son de la pantalla**, porque hay una peticion
 *   por pantalla: no puede fallar la tabla y no el formulario si los dos salen
 *   de la misma respuesta;
 * - cinco bloques se dibujan **del catalogo** —descripcion, portal, filtros,
 *   pestanas y barra de acciones—: no esperan a nadie, asi que no tienen ni
 *   carga ni vacio;
 * - **el formulario vacio no es un error**: es un formulario listo para
 *   llenarse, y sus campos sin valor muestran «—».
 *
 * Esta tabla es la especificacion, y esta escrita como prueba para que no se
 * quede desactualizada.
 */
describe('los diez bloques y los estados que tiene cada uno', () => {
  const BLOQUES = [
    { bloque: 'descripcion', delCatalogo: true, carga: false, vacio: false },
    { bloque: 'indicadores', delCatalogo: false, carga: true, vacio: true },
    { bloque: 'portal', delCatalogo: true, carga: false, vacio: false },
    { bloque: 'filtros', delCatalogo: true, carga: false, vacio: false },
    { bloque: 'tabla', delCatalogo: false, carga: true, vacio: true },
    { bloque: 'totales', delCatalogo: false, carga: true, vacio: false },
    { bloque: 'pestanas', delCatalogo: true, carga: false, vacio: false },
    { bloque: 'formulario', delCatalogo: false, carga: true, vacio: false },
    { bloque: 'reporte', delCatalogo: false, carga: true, vacio: true },
    { bloque: 'acciones', delCatalogo: true, carga: false, vacio: false },
  ];

  it('son diez, y los que esperan datos tienen estado de carga', () => {
    expect(BLOQUES).toHaveLength(10);
    for (const bloque of BLOQUES) {
      expect(bloque.carga, `${bloque.bloque}`).toBe(!bloque.delCatalogo);
    }
  });

  it('el vacio solo lo tiene quien puede quedarse sin nada que mostrar', () => {
    // Totales pinta «—» en cada celda y el formulario deja sus campos vacios:
    // son su estado vacio, y decir ademas «no hay datos» seria repetirlo.
    expect(BLOQUES.filter((b) => b.vacio).map((b) => b.bloque)).toEqual([
      'indicadores',
      'tabla',
      'reporte',
    ]);
  });
});
