import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemaDeApi } from '@sgtm/api-client';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';
import { composicionDe } from '../composicion';
import { esNoEncontrado } from './ResolutorDeUnidad';

/**
 * **El campo que resuelve** (#331): de un código catastral o una placa al
 * identificador interno que el backend pide.
 *
 * Lo que estaba roto y no se veía: `alta_deuda` dibuja «Unidad (predio /
 * placa)», quien atiende escribía ahí el código del predio, y ese texto **no
 * viajaba** —`PeticionDeMovimiento` acepta `predioId`/`vehiculoId`, que son
 * identificadores internos—. El alta se registraba igual, a nivel de
 * contribuyente, y `ClaveDeSaldo` compara los seis campos con igualdad exacta:
 * la deuda quedaba asentada sobre **otra obligación** del mismo contribuyente,
 * sin ningún síntoma.
 *
 * Las cuatro cosas que se comprueban aquí son las cuatro que pueden volver a
 * romperse en silencio: que lo resuelto viaja, que sin resolver no se guarda,
 * que no se pregunta por tecla, y que un fallo no se lee como «no existe».
 */

const ALTA = '/rentas-registro/alta-deuda';

/** El código catastral que el juego de datos del prototipo trae en la primera ficha. */
const CODIGO = '200601010150010101001';

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('el resolutor es un opt-in de la composicion, no una bifurcacion del renderizador', () => {
  it('solo `alta_deuda` lo declara, y declara los dos campos que llena', () => {
    expect(composicionDe('alta_deuda').resolutores?.['unidadPredioPlaca']?.campos).toEqual([
      'predioId',
      'vehiculoId',
    ]);
    // Las demás siguen dibujando su `Campo` de siempre: negación por omisión.
    for (const opcion of ['transferencia_predio', 'baja_deuda', 'contribuyentes']) {
      expect(composicionDe(opcion).resolutores).toBeUndefined();
    }
  });
});

describe('lo resuelto viaja; lo tecleado, no', () => {
  const original = globalThis.fetch;
  let escrituras: string[] = [];

  /**
   * El proxy sigue contestando las **lecturas** —es quien publica el predio—, y
   * solo se intercepta el `POST` del alta: así se comprueba el cuerpo de verdad
   * que sale, sin fingir la búsqueda que lo alimenta.
   */
  function seEspiaElAlta(): void {
    escrituras = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      if ((opciones?.method ?? 'GET') === 'POST') {
        escrituras.push(typeof opciones?.body === 'string' ? opciones.body : '');
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1 }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    };
  }

  afterEach(() => {
    globalThis.fetch = original;
  });

  it('el predio elegido viaja como `predioId`, y el codigo tecleado no viaja', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    // Arbitrios, que **sí** cuelgan de un predio (ver `UNIDAD_DEL_TRIBUTO`).
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);

    await usuario.type(
      within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
        'Observación',
      ),
      'Arbitrios del predio, incorporados a mano.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    const cuerpo = JSON.parse(escrituras[0] ?? '{}') as Record<string, unknown>;
    // El identificador interno, **como número**: `PeticionDeMovimiento` lo
    // declara `Long`.
    expect(cuerpo['predioId']).toBe(1);
    // Y ni rastro del texto tecleado: el backend no sabe leerlo.
    expect(JSON.stringify(cuerpo)).not.toContain(CODIGO);
    expect(cuerpo['unidadPredioPlaca']).toBeUndefined();
  });

  /**
   * **Y el predial no admite unidad**, que es el mismo no-negociable que #333
   * explica en la memoria de cálculo: se determina por contribuyente sobre el
   * conjunto de sus predios (NEG-05 §1), y el esquema lo hace imposible de otra
   * forma (`determinacion_predial_sin_predio_ck`, V20). Un alta predial atada a
   * un predio crea una obligación que la emisión anual no encuentra nunca:
   * quedan las dos, el contribuyente paga una y sigue debiendo la otra.
   */
  it('con el predial, una unidad resuelta apaga la primaria y dice por que', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(screen.getByLabelText('Concepto / tributo'), 'IMPUESTO PREDIAL');
    await elegirLaPrimeraUnidad(usuario, CODIGO);
    await usuario.type(
      within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
        'Observación',
      ),
      'Predial incorporado a mano.',
    );

    const primaria = screen.getByRole('button', { name: 'Dar de alta' });
    primariaApagada(primaria);
    expect(motivoDeLaPrimaria()).toMatch(/por contribuyente, no por predio/);

    await usuario.click(primaria);
    expect(escrituras).toHaveLength(0);
  });

  it('sin resolver, un tributo que cuelga de un predio no se puede guardar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await usuario.type(
      within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
        'Observación',
      ),
      'Arbitrios incorporados a mano.',
    );

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta la unidad/);
    // Y dice **qué hacer**, no solo qué falta.
    expect(motivoDeLaPrimaria()).toMatch(/código catastral/);

    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));
    expect(escrituras).toHaveLength(0);
  });
});

describe('no se pregunta por tecla, y un fallo no es un «no existe»', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
    vi.useRealTimers();
  });

  /**
   * **21 dígitos no son 21 consultas.**
   *
   * El código de referencia catastral se compone de izquierda a derecha, así que
   * con la consulta en la clave del `useQuery` cada tecla era una búsqueda por
   * prefijo contra el padrón de fichas —y las veinte primeras devuelven medio
   * catastro—. Se espera a que la mano pare (`useValorAposentado`, 300 ms).
   */
  it('teclear el codigo entero deja una busqueda, no una por pulsacion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    const proxy = globalThis.fetch;
    const consultas: string[] = [];
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/catastro/fichas')) consultas.push(url);
      return proxy(entrada, opciones);
    };

    await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), CODIGO);
    await waitFor(() => expect(consultas.length).toBeGreaterThan(0));
    // Un respiro por si la espera dejara alguna más en camino.
    await waitFor(() => expect(screen.queryByText('Buscando la unidad…')).not.toBeInTheDocument());

    // Una, no veintiuna. El margen es para el reintento que jsdom pueda
    // encadenar; lo que la prueba niega es «una por tecla».
    expect(consultas.length).toBeLessThanOrEqual(3);
    expect(consultas.length).toBeLessThan(CODIGO.length);
  });

  /**
   * **Callar ante un error lo convierte en «no existe»**, y «no existe» es lo que
   * autoriza a dar de alta sin unidad una deuda que sí tiene la suya.
   *
   * La distinción entera está en `esNoEncontrado`, y se comprueba las dos veces:
   * como función —los dos casos, sin montar nada— y en la pantalla, donde un 500
   * tiene que sacar el aviso de error y **no** la frase del padrón.
   */
  it('esNoEncontrado separa la respuesta del padron de un fallo de la consulta', () => {
    const problema = (status: number): ProblemaDeApi =>
      new ProblemaDeApi({ type: 'about:blank', title: 't', status, detail: 'd' });
    expect(esNoEncontrado(problema(404))).toBe(true);
    expect(esNoEncontrado(problema(500))).toBe(false);
    expect(esNoEncontrado(problema(403))).toBe(false);
    // Ni una red caída, que no es un `ProblemaDeApi` en absoluto.
    expect(esNoEncontrado(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('un 500 al buscar se cuenta como fallo, no como unidad inexistente', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/catastro/fichas')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ type: 'about:blank', title: 'Error', status: 500, detail: 'roto' }),
            { status: 500, headers: { 'content-type': 'application/problem+json' } },
          ),
        );
      }
      return proxy(entrada, opciones);
    };

    await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), CODIGO);

    expect(await screen.findByText('No se pudo buscar la unidad')).toBeInTheDocument();
    // Y **no** la frase que afirma algo sobre el catastro.
    expect(screen.queryByText(/No hay ninguna unidad con ese código/)).not.toBeInTheDocument();
  });
});

/** Teclea el código y elige el primer candidato que ofrezca la lista. */
async function elegirLaPrimeraUnidad(
  usuario: ReturnType<typeof userEvent.setup>,
  codigo: string,
): Promise<void> {
  await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), codigo);
  /* Se busca **por el código que el candidato rotula** y no por «el primer
     botón de la lista»: el candidato lleva su código en el nombre accesible
     justamente para que quien elige vea cuál está eligiendo, y una búsqueda por
     posición pasaría igual si la lista enseñara otra ficha. */
  await usuario.click(await screen.findByRole('button', { name: new RegExp(codigo) }));
  // Resuelto: la tarjeta sustituye a la búsqueda y ofrece «Cambiar».
  await screen.findByRole('button', { name: 'Cambiar' });
}
