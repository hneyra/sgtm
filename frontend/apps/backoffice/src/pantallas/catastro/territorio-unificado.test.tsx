import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * **El territorio, en una sola superficie**: `sectores` y `calles` juntas.
 *
 * Lo que esta prueba defiende, y que ninguna otra podía defender mientras las
 * dos opciones fueran dos pantallas sueltas:
 *
 * 1. **Las dos rutas siguen siendo dos.** La que se abre decide qué hoja llega
 *    activa, y cambiar de pestaña **navega**: el enlace de lo que se está
 *    mirando se puede compartir y el permiso lo sigue decidiendo el guardia de
 *    `Pantalla`, que corre al entrar por la ruta.
 * 2. **Cada pestaña la decide el permiso de su opción.** La de una opción que
 *    este perfil no puede ver no se dibuja, y el árbol tampoco: ofrecerlos sería
 *    ofrecer un enlace a un aviso de «no tienes permiso».
 * 3. **El árbol no compone ninguna cifra.** Pinta el conteo que
 *    `SectorResource` mandó, por la misma función que lo pintaba en la tabla: un
 *    nulo es «—» y nunca un `0`, porque `0` afirma «ninguna».
 * 4. **El hueco del backend se dice una vez.** No hay `GET` que enumere las
 *    manzanas de un sector, y eso se cuenta dentro del sector desplegado —al
 *    lado del botón que sí puede añadir una—, no en cada fila del carril.
 * 5. **El código de referencia catastral se compone con lo señalado**, y sin
 *    inventar un dígito: los tramos que el árbol pone solo caben cuando lo
 *    tecleado llega hasta ellos.
 *
 * Lo que ya estaba —los conteos, las manzanas, las tres altas con su
 * observación— sigue probándose en `territorio.test.tsx`.
 */

/** El ubigeo del ejemplo: departamento 20, provincia 06, distrito 01. */
const UBIGEO = '200601';

let peticiones: string[] = [];

const sector = (
  codigo: string,
  nombre: string,
  extra: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> => ({
  id: 1,
  codigo,
  nombre,
  zona: 'Zona 1',
  activo: true,
  ...extra,
});

/**
 * Interpone la respuesta de `GET /catastro/sectores` **por encima del proxy**.
 *
 * No se toca el proxy: no debe fingir unos conteos ni unas manzanas que el
 * backend todavía no le da (ADR-0010 §4).
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
    peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
    return proxy(entrada, opciones);
  };
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

const HOJA_DE_SECTORES = 'Sectores, manzanas y lotes';
const HOJA_DE_VIAS = 'Mantenimiento de vías y calles';

const aSectores = () => peticiones.filter((url) => url.includes('/api/v1/catastro/sectores'));

const nodoDe = (nombre: string | RegExp) =>
  screen.findByRole('button', { name: typeof nombre === 'string' ? new RegExp(nombre) : nombre });

/**
 * El carril del territorio, esperado.
 *
 * `findBy` y no `getBy`: la superficie llega en su propio trozo (`lazy`), así
 * que en el primer dibujo lo que hay es el hueco, no el árbol.
 */
const carril = async () => within(await screen.findByRole('complementary', { name: 'Territorio' }));

/* ── 1. Las dos rutas, una superficie ──────────────────────────────────── */

describe('las dos opciones del territorio caen en la misma superficie', () => {
  it('«/catastro/sectores» abre la hoja de sectores, con el árbol al lado', async () => {
    montarEnRuta('/catastro/sectores');

    expect(await screen.findByRole('tab', { name: HOJA_DE_SECTORES })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: HOJA_DE_VIAS })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    // El árbol, con los cinco sectores del juego de datos.
    const enElCarril = await carril();
    expect(await enElCarril.findByText('CERCADO DE SULLANA')).toBeInTheDocument();
    expect(enElCarril.getByText('EJE CARRETERA PAITA')).toBeInTheDocument();
    // Y la hoja de sectores: lo señalado y el código que se compone con ello.
    expect(screen.getByText('Lo señalado en el territorio')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Código de referencia catastral' }),
    ).toBeInTheDocument();
  });

  it('«/catastro/calles» abre la hoja de vías, con el mismo árbol al lado', async () => {
    montarEnRuta('/catastro/calles');

    expect(await screen.findByRole('tab', { name: HOJA_DE_VIAS })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // El catálogo vial, tal como lo sirve hoy `calles`: mismas columnas y los
    // mismos «—» donde `ViaResource` no publica.
    const fila = (await screen.findByText('00001182')).closest('tr');
    expect(
      within(fila as HTMLElement)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['00001182', 'AVENIDA', 'JOSÉ DE LAMA', SIN_DATO, SIN_DATO, SIN_DATO, 'ACTIVA']);
    // Y el árbol sigue ahí: de la manzana a la vía que la limita sin volver al menú.
    expect((await carril()).getByText('CERCADO DE SULLANA')).toBeInTheDocument();
  });

  it('la hoja de sectores no pide dos veces lo mismo: el árbol y la hoja son la misma consulta', async () => {
    montarEnRuta('/catastro/sectores');
    await (await carril()).findByText('CERCADO DE SULLANA');

    await waitFor(() => expect(aSectores().length).toBeGreaterThan(0));
    expect(aSectores()).toHaveLength(1);
  });
});

/* ── 2. Cambiar de hoja **navega** ─────────────────────────────────────── */

describe('cambiar de hoja navega, no es estado local', () => {
  it('la pestaña es el enlace a la ruta de la otra opción', async () => {
    montarEnRuta('/catastro/sectores');

    const aVias = await screen.findByRole('tab', { name: HOJA_DE_VIAS });
    /* **El `href` es lo que hay que exigir.** Con un `useState` la hoja también
       cambiaría —y la prueba de más abajo seguiría en verde—, pero el enlace de
       lo que se está mirando dejaría de poder compartirse y, sobre todo, el
       guardia de permiso de `Pantalla` dejaría de correr: se entra en una
       opción sin pasar por la ruta que la protege (REQ-03 §5). */
    expect(aVias.tagName).toBe('A');
    expect(aVias).toHaveAttribute('href', '/catastro/calles');
    expect(await screen.findByRole('tab', { name: HOJA_DE_SECTORES })).toHaveAttribute(
      'href',
      '/catastro/sectores',
    );
  });

  it('al pulsarla cambia la pantalla entera, no solo el panel', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(HOJA_DE_SECTORES);

    await usuario.click(await screen.findByRole('tab', { name: HOJA_DE_VIAS }));

    // La cabecera de la aplicación la pone la **ruta**, no este componente: si
    // la pestaña fuera estado local seguiría diciendo «Sectores, manzanas y lotes».
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(HOJA_DE_VIAS);
    expect(await screen.findByText('00001182')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: HOJA_DE_VIAS })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

/* ── 3. Cada pestaña, con el permiso de su opción ──────────────────────── */

describe('la pestaña de una opción que no se puede ver no se dibuja', () => {
  it('sin «Vías y calles», su pestaña no está', async () => {
    entraCon({ sectores: ['lectura', 'registro'] });
    montarEnRuta('/catastro/sectores');

    expect(await screen.findByRole('tab', { name: HOJA_DE_SECTORES })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: HOJA_DE_VIAS })).not.toBeInTheDocument();
  });

  it('sin «Sectores y manzanas», ni su pestaña, ni el árbol, ni su petición', async () => {
    entraCon({ calles: ['lectura', 'registro'] });
    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('00001182')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: HOJA_DE_SECTORES })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Territorio' })).not.toBeInTheDocument();
    // Y no sale la lectura que el perfil no puede hacer: el 403 llegaría igual,
    // pero pedirlo es trabajo que nadie autorizó.
    expect(aSectores()).toEqual([]);
  });
});

/* ── 4. El árbol: conteos y el hueco del backend ───────────────────────── */

describe('el árbol pinta lo que llegó y nada más', () => {
  it('un sector sin conteo sale «—», nunca «0»', async () => {
    elBackendResponde([
      sector('07', 'SECTOR CONTADO', { predios: 512 }),
      // `SectorResource` manda nulo cuando no contó: «no se sabe», no «ninguno».
      sector('08', 'SECTOR SIN CONTAR', { predios: null }),
    ]);
    montarEnRuta('/catastro/sectores');

    const enElCarril = await carril();
    expect(await enElCarril.findByText('512 predios')).toBeInTheDocument();
    expect(enElCarril.getByText(`${SIN_DATO} predios`)).toBeInTheDocument();
    expect(enElCarril.queryByText('0 predios')).not.toBeInTheDocument();
  });

  it('que el backend no liste las manzanas se dice UNA vez, dentro del sector desplegado', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    // Con los cinco sectores dibujados y ninguno desplegado, no se dice nada.
    await (await carril()).findByText('CERCADO DE SULLANA');
    expect(screen.queryAllByText(/todavía no publica las manzanas de un sector/)).toHaveLength(0);

    await usuario.click(await nodoDe('CERCADO DE SULLANA'));

    /* **Una**, y no cinco.** Repetida en cada fila del carril, la advertencia se
       convierte en ruido de fondo y deja de leerse justo donde importa: al lado
       del botón que sí puede añadir una manzana. */
    expect(await screen.findAllByText(/todavía no publica las manzanas de un sector/)).toHaveLength(
      1,
    );
    // Y donde se dice está el alta que la resuelve.
    expect(screen.getByRole('button', { name: '+ Añadir manzana' })).toBeInTheDocument();
  });

  it('el buscador acota los sectores que ya se cargaron, y lo dice', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    const enElCarril = await carril();
    await enElCarril.findByText('CERCADO DE SULLANA');
    await usuario.type(enElCarril.getByLabelText('Buscar sector'), 'industrial');

    expect(enElCarril.getByText('ZONA INDUSTRIAL')).toBeInTheDocument();
    expect(enElCarril.queryByText('CERCADO DE SULLANA')).not.toBeInTheDocument();
    // No vuelve a pedir: acota lo que ya se trajo, y lo dice bajo la caja.
    expect(enElCarril.getByText('Acota los sectores que ya se cargaron.')).toBeInTheDocument();
    expect(aSectores()).toHaveLength(1);
  });
});

/* ── 5. El código de referencia catastral ──────────────────────────────── */

describe('el código se compone con lo señalado en el árbol', () => {
  const tramo = (nombre: string) =>
    screen.getByLabelText(`Código de referencia catastral · ${nombre}`);

  it('el sector señalado ocupa su tramo en cuanto lo tecleado llega hasta él', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    await usuario.click(await nodoDe('CERCADO DE SULLANA'));

    // Con el código vacío no se coloca nada: el tramo de sector empieza en la
    // séptima posición, y escribir «01» ahí lo pondría en el departamento.
    expect(tramo('Sector')).toHaveValue('');
    expect(
      screen.getByText(/se colocará en su tramo en cuanto el código llegue hasta él/),
    ).toBeInTheDocument();

    // Tecleado el ubigeo, el sector cae en su sitio solo.
    await usuario.click(tramo('Depto.'));
    await usuario.keyboard(UBIGEO);

    await waitFor(() => expect(tramo('Sector')).toHaveValue('01'));
    expect(tramo('Depto.')).toHaveValue('20');
    expect(tramo('Prov.')).toHaveValue('06');
    expect(tramo('Distrito')).toHaveValue('01');
    expect(
      screen.queryByText(/se colocará en su tramo en cuanto el código llegue hasta él/),
    ).not.toBeInTheDocument();
  });

  it('la manzana señalada ocupa el suyo, detrás del sector', async () => {
    const usuario = userEvent.setup();
    elBackendResponde([sector('01', 'CERCADO', { manzanas: [{ codigo: '003', lotes: 14 }] })]);
    montarEnRuta('/catastro/sectores');

    await usuario.click(await nodoDe('CERCADO'));
    await usuario.click(await screen.findByRole('button', { name: /003/ }));

    await usuario.click(tramo('Depto.'));
    await usuario.keyboard(UBIGEO);

    await waitFor(() => expect(tramo('Sector')).toHaveValue('01'));
    expect(tramo('Manzana')).toHaveValue('003');
  });

  it('«Abrir la ficha» solo con el código completo, y dice por qué mientras no lo esté', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/sectores');

    const abrir = await screen.findByRole('button', { name: 'Abrir la ficha' });
    expect(abrir).toBeDisabled();
    const motivo = document.getElementById(abrir.getAttribute('aria-describedby') ?? '');
    expect(motivo).not.toBeNull();
    expect(motivo).toHaveTextContent(/La ficha se abre con el código completo/);

    /* **Y con el código a medias sigue apagada**, que es lo que separa
       «completo» de «no vacío»: un prefijo abre la ficha de ningún predio —o de
       otro—, porque `/catastro/ficha-urbana/{codigo}` pide un registro, no una
       búsqueda. Sin esta parada, un `codigo.length > 0` pasaba en verde. */
    await usuario.click(tramo('Depto.'));
    await usuario.keyboard(UBIGEO);
    expect(tramo('Distrito')).toHaveValue('01');
    expect(abrir).toBeDisabled();

    // Las 23 posiciones de `ComposicionCatastral.DEL_MANUAL`, tecleadas de
    // corrido: cada caja llena pasa el foco a la siguiente.
    await usuario.keyboard('01003001010101001');

    await waitFor(() => expect(abrir).toBeEnabled());
    await usuario.click(abrir);

    // Y lleva a la ficha urbana de ese predio: el código va en la dirección.
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Ficha catastral urbana',
    );
  });
});
