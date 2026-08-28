import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemaDeApi } from '@sgtm/api-client';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { QueryClientProvider } from '@tanstack/react-query';
import { clienteDePruebas, montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';
import type { SeccionDePantalla } from '../../catalogo';
import { composicionDe } from '../composicion';
import { CODIGOS_DE_TRIBUTO, unidadDelTributo } from '../escrituras';
import { Formulario, soloSusCampos } from '../bloques/Formulario';
import { cruceDelTitular, esNoEncontrado, esSinPermiso } from './ResolutorDeUnidad';

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

/**
 * El nombre accesible del botón que suelta la unidad resuelta.
 *
 * No es su rótulo visible —«Cambiar»—: en una lista de controles, «Cambiar» a
 * secas no se distingue de ningún otro «Cambiar» de la pantalla, así que el
 * botón dice de qué (revisión de #331, `aria-label`).
 */
const CAMBIAR = 'Cambiar la unidad resuelta';

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
    await llenarAnoYDocumento(usuario);

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
   * **`MINIMO = 6` no protegía nada** (#342, nit 2): las pruebas de este
   * archivo siempre escriben el código entero (21 dígitos) o la placa entera
   * (6 caracteres, que ya es el mínimo), así que ninguna ejercía el aviso de
   * «todavía no se ha buscado» con menos. Aquí se escriben cinco: uno menos
   * que el mínimo, para que la guarda tenga algo que impedir.
   */
  it('con menos de MINIMO caracteres no sale ninguna consulta, y lo dice', async () => {
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

    // Cinco caracteres: uno menos que el minimo de seis.
    await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), CODIGO.slice(0, 5));

    const region = document.querySelector('.sgtm-resolutor__nota');
    await waitFor(() =>
      expect(region?.textContent).toBe(
        'Todavía no se ha buscado: hacen falta al menos 6 caracteres.',
      ),
    );
    // El respiro del `useValorAposentado` (300 ms) ya paso al esperar arriba:
    // si algo hubiera salido, ya habria llegado.
    expect(consultas).toHaveLength(0);
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

    /* El margen es para el reintento: la búsqueda reintenta **una vez** antes
       de rendirse (`retry: 1`), que es lo que cubre un corte de un instante sin
       dejar «Buscando…» diez segundos con la red caída. */
    expect(
      await screen.findByText('No se pudo buscar la unidad', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Y **no** la frase que afirma algo sobre el catastro.
    expect(screen.queryByText(/No hay ninguna unidad con ese código/)).not.toBeInTheDocument();
  });

  /**
   * **El error no se queda pegado sobre una lista encontrada** (#379, esta
   * pasada). Cada búsqueda distinta es otra clave de `useQuery` —el texto
   * escrito entra en ella—, así que un fallo con un código y un acierto con
   * otro no comparten estado: seguir tecleando hasta un código que sí resuelve
   * tiene que quitar el banner rojo, no dejarlo encima de los candidatos.
   */
  it('un fallo se limpia con una busqueda posterior que si encuentra', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    const proxy = globalThis.fetch;
    let fallar = true;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (fallar && url.includes('/catastro/fichas')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ type: 'about:blank', title: 'Error', status: 500, detail: 'roto' }),
            { status: 500, headers: { 'content-type': 'application/problem+json' } },
          ),
        );
      }
      return proxy(entrada, opciones);
    };

    const campo = screen.getByLabelText('Unidad (predio / placa)');
    await usuario.type(campo, CODIGO);
    expect(
      await screen.findByText('No se pudo buscar la unidad', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    // Deja de fallar y dispara otra búsqueda: distinto texto, distinta clave de
    // `useQuery` —el mismo texto no volvería a preguntar, con la respuesta ya
    // en caché con error—. El proxy no filtra (ADR-0010): un dígito más sigue
    // devolviendo la misma ficha.
    fallar = false;
    await usuario.type(campo, '9');

    // La lista de verdad aparece: el candidato se nombra por el código…
    expect(await screen.findByRole('button', { name: new RegExp(CODIGO) })).toBeInTheDocument();
    // …y el banner de la búsqueda anterior ya no está.
    expect(screen.queryByText('No se pudo buscar la unidad')).not.toBeInTheDocument();
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
  await screen.findByRole('button', { name: CAMBIAR });
}

/* ══ Lo que la triple revisión encontró, y que no se veía ═══════════════════ */

/**
 * **De qué unidad cuelga cada tributo, leído del caso de uso** (A1).
 *
 * `MULTA_ADMINISTRATIVA` estaba clasificada «sin unidad», y eso es falso:
 * `RegistrarPapeleta.registrarAdministrativa` (`RegistrarPapeleta.java:164-170`)
 * asienta el cargo **con** el `predioId` de la papeleta, que es `@Nullable`. La
 * multa de una infracción de construcción cuelga de su predio; la de una
 * infracción sin predio, de ninguno. Las dos existen en el libro, y por eso la
 * cuarta clasificación no exige ni rechaza.
 */
describe('de que unidad cuelga cada tributo', () => {
  it('la multa administrativa admite predio, y no lo exige', () => {
    expect(unidadDelTributo('MULTA_ADMINISTRATIVA')).toBe('predio-opcional');
  });

  it('el predial no admite ninguna, y arbitrios y vehicular exigen la suya', () => {
    expect(unidadDelTributo('PREDIAL')).toBe('ninguna');
    expect(unidadDelTributo('ARBITRIO')).toBe('predio');
    expect(unidadDelTributo('ALCABALA')).toBe('predio');
    expect(unidadDelTributo('VEHICULAR')).toBe('vehiculo');
  });

  /**
   * **Y lo que no está clasificado no pasa: da motivo.**
   *
   * La clasificación se leía con `?? 'ninguna'`, que es abrir por omisión: un
   * código nuevo en el diccionario del desplegable y olvidado aquí dejaba
   * registrar el alta **sin unidad y sin decir nada** sobre un tributo que
   * quizá cuelga de una. Ahora devuelve nada, y `faltaEnElAlta` lo cuenta.
   */
  it('un tributo que nadie clasifico no resuelve a «ninguna»', () => {
    expect(unidadDelTributo('LO_QUE_SEA')).toBeUndefined();
    // Ni por la cadena de prototipos, que es la otra forma de colarse.
    expect(unidadDelTributo('constructor')).toBeUndefined();
    expect(unidadDelTributo('toString')).toBeUndefined();
  });

  /**
   * Y la red que hace que esa guarda no llegue a hacer falta: **cada código que
   * el alta sabe mandar está clasificado**. Es lo que se rompe el día que
   * alguien añada un tributo al desplegable y no aquí.
   */
  it('todos los codigos que el alta puede mandar estan clasificados', () => {
    for (const codigo of CODIGOS_DE_TRIBUTO) {
      expect(unidadDelTributo(codigo), `«${codigo}» no dice de qué unidad cuelga`).toBeDefined();
    }
  });
});

describe('la multa administrativa se puede asentar sobre su predio', () => {
  const original = globalThis.fetch;
  let escrituras: string[] = [];

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

  /**
   * La rama que **nadie ejercitaba**: hasta hoy, «sin unidad» con unidad
   * resuelta solo la recorría el predial, que la rechaza. Con la multa
   * administrativa clasificada igual, resolver su predio quedaba rechazado —y
   * si alguien quitaba el rechazo, el alta creaba la obligación gemela que
   * `ClaveDeSaldo` no vuelve a encontrar—.
   */
  it('con predio resuelto, el alta se guarda y el predio viaja', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'MULTA ADMINISTRATIVA',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Multa de construcción sin licencia.');

    primariaEncendida(screen.getByRole('button', { name: 'Dar de alta' }));
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    const cuerpo = JSON.parse(escrituras[0] ?? '{}') as Record<string, unknown>;
    expect(cuerpo['tributo']).toBe('MULTA_ADMINISTRATIVA');
    expect(cuerpo['predioId']).toBe(1);
  });

  /** Y **sin** predio también, que es la otra mitad de «opcional». */
  it('sin predio resuelto tambien se guarda: no se exige', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'MULTA ADMINISTRATIVA',
    );
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Multa sin predio asociado.');

    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));
    await waitFor(() => expect(escrituras).toHaveLength(1));
    const cuerpo = JSON.parse(escrituras[0] ?? '{}') as Record<string, unknown>;
    expect(cuerpo['tributo']).toBe('MULTA_ADMINISTRATIVA');
    expect(cuerpo).not.toHaveProperty('predioId');
  });
});

/**
 * **Elegir es un acto** (A2).
 *
 * El desplegable de concepto se dibujaba mostrando «IMPUESTO PREDIAL» sin que
 * nadie lo tocara —un `<select value="">` cuyas opciones no incluyen la cadena
 * vacía se pinta con su primera opción—, el borrador estaba vacío,
 * `faltaEnElAlta` no veía nada y el `POST` salía con `{codContribuyente,
 * observacion}`: **sin `tributo`**, sobre una obligación que nadie puede
 * identificar. La pantalla enseñaba una elección que nadie hizo.
 */
describe('el concepto no se elige solo', () => {
  const original = globalThis.fetch;
  let escrituras: string[] = [];

  beforeEach(() => {
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
  });

  afterEach(() => {
    globalThis.fetch = original;
  });

  it('sin tocar el desplegable, el cuerpo no sale y se dice por que', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    const desplegable = await screen.findByLabelText('Concepto / tributo');
    // Lo que se ve es lo que hay: nada elegido todavía.
    expect((desplegable as HTMLSelectElement).value).toBe('');
    await usuario.type(await laObservacion(), 'Deuda migrada del sistema anterior.');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta el concepto/);
    // Y dice **dónde está**, porque la franja se lee al pie y la sección se pliega.
    expect(motivoDeLaPrimaria()).toMatch(/Concepto \/ tributo/);

    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));
    expect(escrituras).toHaveLength(0);
  });

  it('elegido el concepto, el alta sale y lleva su tributo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'IMPUESTO PREDIAL',
    );
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Deuda migrada del sistema anterior.');
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    expect((JSON.parse(escrituras[0] ?? '{}') as Record<string, unknown>)['tributo']).toBe(
      'PREDIAL',
    );
  });

  /**
   * Y **solo a los que se escriben**: un `sel` de solo lectura pinta lo que
   * sirvió el servidor, y anteponerle una vacía lo dejaría en blanco. El de
   * «Documento que sustenta» no está declarado en `escrituras.ts`, así que no
   * manda nada y no cambia.
   */
  it('un desplegable que la opcion no declara se dibuja como se dibujaba', async () => {
    montarEnRuta(ALTA);
    const noDeclarado = await screen.findByLabelText('Documento que sustenta');
    expect(noDeclarado).toBeDisabled();
    expect((noDeclarado as HTMLSelectElement).value).toBe('RESOLUCIÓN DE DETERMINACIÓN');
  });
});

/**
 * **El foco sobre un candidato se ve** (A3).
 *
 * jsdom no aplica hojas de estilo, así que lo que se puede afirmar aquí son dos
 * cosas y se afirman las dos: que el foco **llega** al botón del candidato, y
 * que la hoja le da un `outline-offset` negativo. Lo segundo hace falta porque
 * la lista recorta lo que sobresale (`overflow: hidden`) y el `outline` global
 * va con desplazamiento **positivo**: del recuadro solo quedaba una raya, y
 * encima sobre la fila de arriba. Quien recorría la lista con teclado no veía
 * cuál iba a elegir, y Enter asienta la deuda sobre un predio.
 */
describe('el foco sobre un candidato', () => {
  const HOJA = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../estilos/aplicacion.css'),
    'utf8',
  );

  it('la lista no recorta el recuadro del foco', () => {
    const desde = HOJA.indexOf('.sgtm-asistente__resultados button:focus-visible {');
    expect(desde, 'la lista de candidatos no declara su foco').toBeGreaterThan(-1);
    const bloque = HOJA.slice(desde, HOJA.indexOf('}', desde));
    expect(bloque).toMatch(/outline-offset:\s*-\d/);
  });

  it('y el foco llega al candidato, que es lo que jsdom si ve', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    await usuario.type(await screen.findByLabelText('Unidad (predio / placa)'), CODIGO);

    const candidato = await screen.findByRole('button', { name: new RegExp(CODIGO) });
    candidato.focus();
    expect(candidato).toHaveFocus();
  });
});

/**
 * **La unidad resuelta puede no ser de quien paga** (A4).
 *
 * Se busca un predio por su código y se elige de una lista donde el titular es
 * una columna más; nada lo cruza con el contribuyente del alta, así que
 * resolver la unidad de otra persona —un dígito de más— asienta la deuda sobre
 * una obligación que no es de nadie que la deba. El cruce de fondo es del
 * backend —`RegistrarMovimientoDeDeuda` tiene las dos cosas—; esto es la mitad
 * de delante: avisa y **no bloquea**, porque una titularidad puede estar en
 * trámite y quien atiende sabe cosas que la pantalla no.
 */
describe('el cruce del titular', () => {
  it('sin titular publicado no se afirma nada', () => {
    expect(cruceDelTitular('', 'MEDINA MEDINA, RUFINA', '00000025673')).toBeUndefined();
    // Un guion no es un titular: es lo que la interfaz pinta donde no hay dato.
    expect(cruceDelTitular('—', 'MEDINA MEDINA, RUFINA', '00000025673')).toBeUndefined();
  });

  it('cuando la pantalla sabe el nombre y no coincide, lo dice sin rodeos', () => {
    const cruce = cruceDelTitular(
      'QUIROGA RAMOS, ELEODORO',
      'MEDINA MEDINA, RUFINA',
      '00000025673',
    );
    expect(cruce?.tipo).toBe('no-coincide');
    expect(cruce?.titulo).toMatch(/OTRO titular/);
    expect(cruce?.titulo).toContain('QUIROGA RAMOS, ELEODORO');
    expect(cruce?.detalle).toContain('MEDINA MEDINA, RUFINA');
  });

  /** Y no por un acento ni un «(SUC.)»: lo que produce es un aviso, no un veto. */
  it('el mismo nombre escrito distinto no dispara el aviso', () => {
    expect(
      cruceDelTitular('MEDINA MEDINA, RUFINA (SUC.)', 'medina medina rufina suc', '1'),
    ).toBeUndefined();
    expect(cruceDelTitular('DÍAZ MADRID, JULIO', 'DIAZ MADRID JULIO', '1')).toBeUndefined();
  });

  /**
   * Y cuando la pantalla **no** sabe de quién es la cuenta —hoy el caso normal:
   * «Alta de deuda» es un `POST` y no pide nada al abrir, así que su campo
   * «Nombre» está vacío— no se calla: dice a nombre de quién figura la unidad.
   */
  it('sin nombre que cruzar, se dice a nombre de quien figura la unidad', () => {
    const cruce = cruceDelTitular('QUIROGA RAMOS, ELEODORO', '', '00000025673');
    expect(cruce?.tipo).toBe('sin-cruzar');
    expect(cruce?.titulo).toContain('QUIROGA RAMOS, ELEODORO');
    expect(cruce?.detalle).toContain('00000025673');
  });

  it('en la pantalla, la tarjeta lo enseña junto a la unidad resuelta', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);

    const aviso = await screen.findByText(/figura a nombre de MEDINA MEDINA, RUFINA/);
    expect(aviso).toBeInTheDocument();
    // Avisa y no bloquea: con año, documento y su observación, la primaria se enciende.
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Arbitrios del predio.');
    primariaEncendida(screen.getByRole('button', { name: 'Dar de alta' }));
  });
});

/**
 * **Un resolutor solo escribe lo que declaró llenar** (A5).
 *
 * Recibía el `fijarCampo` de la pantalla entera, y ese acepta cualquier clave
 * que la opción declare: un control que llenara `codContribuyente` —o
 * `insolutoS`— lo conseguía sin que nada lo dijera, y el cuerpo salía con un
 * campo que el operador no escribió. `CampoResolutor.campos` existe para
 * declarar qué llena; aquí se hace valer.
 */
describe('onCampo se acota a los campos del resolutor', () => {
  it('lo declarado pasa y lo demas no llega al formulario', () => {
    const escrito: [string, string][] = [];
    const acotado = soloSusCampos(
      (campo, valor) => escrito.push([campo, valor]),
      ['predioId', 'unidadResuelta'],
    );

    acotado('predioId', '7');
    acotado('unidadResuelta', '{}');
    // Lo que intentaría un resolutor que se saliera de lo suyo.
    acotado('codContribuyente', '00000000001');
    acotado('insolutoS', '999999.00');

    expect(escrito).toEqual([
      ['predioId', '7'],
      ['unidadResuelta', '{}'],
    ]);
  });

  it('la composicion declara exactamente lo que este resolutor toca', () => {
    const declarado = composicionDe('alta_deuda').resolutores?.['unidadPredioPlaca'];
    expect(declarado?.campos).toEqual(['predioId', 'vehiculoId']);
    // Lo que guarda para enseñarlo, y que no viaja.
    expect(declarado?.memoria).toEqual(['unidadResuelta']);
    // Y lo que lee, que es de solo lectura.
    expect(declarado?.contexto).toEqual(['codContribuyente', 'nombre']);
  });
});

/**
 * **La rama de la placa** (M1), que hasta la revisión no la verificaba nada: se
 * podía romper entera y las pruebas seguían en verde.
 */
describe('resolver por placa', () => {
  const original = globalThis.fetch;
  let escrituras: string[] = [];

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

  it('sin vehiculo resuelto, el patrimonio vehicular no se puede guardar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000003541');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'PATRIMONIO VEHICULAR',
    );
    await usuario.type(await laObservacion(), 'Vehicular incorporado a mano.');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Falta la unidad/);
    expect(motivoDeLaPrimaria()).toMatch(/placa/);

    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));
    expect(escrituras).toHaveLength(0);
  });

  it('el vehiculo elegido viaja como `vehiculoId` entero, y sin `predioId`', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    seEspiaElAlta();

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000003541');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'PATRIMONIO VEHICULAR',
    );
    await elegirPorPlaca(usuario, PLACA);
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Vehicular incorporado a mano.');
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    const cuerpo = JSON.parse(escrituras[0] ?? '{}') as Record<string, unknown>;
    // `PeticionDeMovimiento` lo declara `Long`.
    expect(cuerpo['vehiculoId']).toBe(1);
    // Y **solo uno de los dos**: una obligación cuelga de un predio, de un
    // vehículo o de ninguno, y `ClaveDeSaldo` los compara con igualdad exacta.
    expect(cuerpo).not.toHaveProperty('predioId');
    expect(cuerpo['tributo']).toBe('VEHICULAR');
    // Ni rastro de la placa tecleada: el backend no la sabe leer.
    expect(JSON.stringify(cuerpo)).not.toContain(PLACA);
  });

  it('un 404 de placa habla del padron de vehiculos, no del catastro', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/rentas/vehiculos/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ type: 'about:blank', title: 'No existe', status: 404, detail: 'no' }),
            { status: 404, headers: { 'content-type': 'application/problem+json' } },
          ),
        );
      }
      return proxy(entrada, opciones);
    };

    await usuario.selectOptions(
      await screen.findByLabelText('Unidad (predio / placa) — buscar por'),
      'PLACA',
    );
    await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), PLACA);

    expect(
      await screen.findByText(
        'No hay ningún vehículo con esa placa en el padrón.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/con ese código en el catastro/)).not.toBeInTheDocument();
  });
});

/**
 * **El privilegio del acto gatea el control, y un 403 no es «vuelve a
 * intentarlo»** (M2).
 *
 * El docblock de `ResolutorProps.bloqueado` decía que el perfil sin privilegio
 * lo bloqueaba y no era cierto: `useEscritura` recibe los campos declarados
 * haya o no permiso —lo que apaga la escritura es que la operación llegue
 * `undefined`—, así que `escribibles` los tenía igual y el control buscaba
 * contra el padrón para alguien que no puede registrar nada.
 */
describe('el privilegio del acto y el 403 de la busqueda', () => {
  it('sin privilegio del acto, el control se dibuja y no resuelve', async () => {
    const seccion: readonly SeccionDePantalla[] = [
      {
        label: 'Deuda a dar de alta',
        campos: [{ clave: 'unidadPredioPlaca', label: 'Unidad (predio / placa)', t: 'text' }],
      },
    ];
    const props = {
      opcion: 'alta_deuda',
      valores: {},
      cargando: false,
      cerradas: {},
      onAlternar: () => {},
      pestana: 0,
      escribibles: new Set(['predioId', 'vehiculoId', 'unidadResuelta']),
      borrador: {},
      onCampo: () => {},
    } as const;

    // Con privilegio, la ayuda es la que invita a buscar. El control llega en
    // el trozo de su módulo (`lazy`), así que se espera a que baje.
    const con = render(
      <QueryClientProvider client={clienteDePruebas()}>
        <Formulario {...props} secciones={seccion} puedeActuar />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/Escribe lo que tengas y elige la unidad/)).toBeInTheDocument();
    con.unmount();

    // Sin él, el control dice que esta pantalla no puede mandar la unidad —y la
    // caja queda de solo lectura, así que no hay búsqueda que lanzar—.
    render(
      <QueryClientProvider client={clienteDePruebas()}>
        <Formulario {...props} secciones={seccion} puedeActuar={false} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/todavía no se puede resolver la unidad/)).toBeInTheDocument();
    // Y **no** invita a dejar el alta a nivel de contribuyente sin más: para
    // arbitrios o vehicular esa salida no existe (`faltaEnElAlta` la rechaza).
    expect(screen.queryByText(/el alta queda a nivel de contribuyente/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Unidad (predio / placa)')).toHaveAttribute('readonly');
  });

  it('esSinPermiso separa el 403 del resto', () => {
    const problema = (status: number): ProblemaDeApi =>
      new ProblemaDeApi({ type: 'about:blank', title: 't', status, detail: 'd' });
    expect(esSinPermiso(problema(403))).toBe(true);
    expect(esSinPermiso(problema(404))).toBe(false);
    expect(esSinPermiso(problema(500))).toBe(false);
    expect(esSinPermiso(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('un 403 al buscar dice que falta permiso, no que se reintente', async () => {
    const usuario = userEvent.setup();
    const original = globalThis.fetch;
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/catastro/fichas')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              type: 'about:blank',
              title: 'Sin permiso',
              status: 403,
              detail: 'no',
            }),
            { status: 403, headers: { 'content-type': 'application/problem+json' } },
          ),
        );
      }
      return proxy(entrada, opciones);
    };
    try {
      await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), CODIGO);
      expect(
        await screen.findByText(
          'No tienes permiso para consultar esa unidad',
          {},
          { timeout: 5000 },
        ),
      ).toBeInTheDocument();
      // Y **no** manda a reintentar lo que va a contestar lo mismo.
      expect(screen.queryByText(/Vuelve a intentarlo/)).not.toBeInTheDocument();
    } finally {
      globalThis.fetch = original;
    }
  });
});

/**
 * **Lo que la tarjeta enseña sobrevive a plegar la sección** (M5), y **guardar
 * deja la búsqueda limpia** (M3).
 */
describe('lo elegido se recuerda, y guardar lo suelta', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  it('plegar y volver a abrir no deja la tarjeta en «#1 / —»', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);
    expect(screen.getByText(CODIGO)).toBeInTheDocument();

    // El rótulo vivía en el estado de este control, y plegar la sección lo
    // desmonta: al volver quedaba el identificador interno pelado.
    const cabecera = screen.getByRole('button', { name: /Deuda a dar de alta/ });
    await usuario.click(cabecera);
    await usuario.click(cabecera);

    await screen.findByRole('button', { name: CAMBIAR });
    expect(screen.getByText(CODIGO)).toBeInTheDocument();
    // El titular aparece dos veces —en el detalle de la tarjeta y en el aviso
    // del cruce—, y las dos salen de lo recordado.
    expect(screen.getAllByText(/MEDINA MEDINA, RUFINA/).length).toBeGreaterThan(0);
  });

  it('el rotulo recordado no viaja en el cuerpo', async () => {
    const usuario = userEvent.setup();
    const escrituras: string[] = [];
    montarEnRuta(ALTA);
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

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Arbitrios del predio.');
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    const crudo = escrituras[0] ?? '';
    // Ni la clave ni el nombre del titular: es presentación, y no está en la
    // lista blanca del cuerpo.
    expect(crudo).not.toContain('unidadResuelta');
    expect(crudo).not.toContain('MEDINA MEDINA');
    expect(crudo).not.toContain(CODIGO);
  });

  /**
   * Y tras guardar, la búsqueda **empieza limpia**: el borrador se vacía, pero
   * lo tecleado era estado de este control y sobrevivía —con
   * `invalidateQueries` relanzando la consulta y la lista repintando el titular
   * del alta anterior al lado de un formulario vacío—.
   */
  it('tras guardar no queda el codigo del alta anterior escrito', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      if ((opciones?.method ?? 'GET') === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ id: 1 }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    };

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);
    await llenarAnoYDocumento(usuario);
    await usuario.type(await laObservacion(), 'Arbitrios del predio.');
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await screen.findByText(/Guardado, con tu observación/);
    const caja = await screen.findByLabelText('Unidad (predio / placa)');
    expect(caja).toHaveValue('');
    /* Y la lista deja de repintar el titular del alta anterior. Se espera
       porque la búsqueda va aposentada (300 ms): lo que se comprueba es que
       acaba limpia, no en qué milisegundo. */
    await waitFor(() =>
      expect(screen.queryByText(/MEDINA MEDINA, RUFINA/)).not.toBeInTheDocument(),
    );
  });
});

/**
 * **El foco acompaña al gesto** (M7) y **la lista se anuncia** (M6).
 */
describe('el foco y lo que se anuncia', () => {
  it('al elegir, el foco va a «Cambiar»; al pulsarlo, a la caja de busqueda', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.type(await screen.findByLabelText('Unidad (predio / placa)'), CODIGO);
    await usuario.click(await screen.findByRole('button', { name: new RegExp(CODIGO) }));

    const cambiar = await screen.findByRole('button', { name: CAMBIAR });
    // El control que se pulsó ya no existe: sin esto, el foco se queda en el
    // `body` y el siguiente tabulador empieza por la cabecera.
    await waitFor(() => expect(cambiar).toHaveFocus());

    await usuario.click(cambiar);
    const caja = await screen.findByLabelText('Unidad (predio / placa)');
    await waitFor(() => expect(caja).toHaveFocus());
  });

  it('la busqueda se anuncia: cuantas hay, y cuando no hay ninguna', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    // La región vive desde el principio, vacía: una que se monta con su texto
    // dentro no anuncia nada.
    const region = document.querySelector('.sgtm-resolutor__nota');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('role', 'status');

    await usuario.type(await screen.findByLabelText('Unidad (predio / placa)'), CODIGO);
    await screen.findByRole('button', { name: new RegExp(CODIGO) });
    // El juego de datos del prototipo trae cuatro fichas y el proxy no filtra.
    await waitFor(() => expect(region?.textContent).toMatch(/\d+ unidades? encontradas?/));
  });

  it('cuando no hay ninguna, no se invita a lo que la guarda rechaza', async () => {
    const usuario = userEvent.setup();
    const original = globalThis.fetch;
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/catastro/fichas')) {
        return Promise.resolve(
          new Response(JSON.stringify(unaPaginaDe([], 0)), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    };
    try {
      await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), CODIGO);
      const region = document.querySelector('.sgtm-resolutor__nota');
      await waitFor(() => expect(region?.textContent).toMatch(/Ninguna unidad responde a eso/));
      /* Y **no** «deja el alta a nivel de contribuyente», que es lo que decía:
         para arbitrios, alcabala o vehicular esa salida no existe —la guarda de
         `faltaEnElAlta` la rechaza—, así que el texto invitaba a algo que la
         pantalla no deja hacer. */
      expect(region?.textContent).not.toMatch(/a nivel de contribuyente/);
      expect(region?.textContent).toMatch(/si el concepto no cuelga de ninguna/);
    } finally {
      globalThis.fetch = original;
    }
  });

  /**
   * **Y se dice cuando la lista está recortada** (M8). Un prefijo corto trae el
   * edificio entero; enseñar los ocho primeros sin decirlo hace creer que no
   * hay más, y quien no encuentre el suyo dejaría el alta sin unidad teniéndola.
   */
  it('con mas de las que caben, dice cuantas se enseñan y que hay que acotar', async () => {
    const usuario = userEvent.setup();
    const original = globalThis.fetch;
    montarEnRuta(ALTA);
    await screen.findByLabelText('Unidad (predio / placa)');

    const doce = Array.from({ length: 12 }, (_, i) => ({
      predioId: i + 1,
      codRefCatastral: `${CODIGO.slice(0, 18)}${String(i).padStart(3, '0')}`,
      direccion: '',
      titular: `TITULAR ${i}`,
    }));
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/catastro/fichas')) {
        return Promise.resolve(
          new Response(JSON.stringify(unaPaginaDe(doce, doce.length)), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    };
    try {
      await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), CODIGO.slice(0, 8));
      const region = document.querySelector('.sgtm-resolutor__nota');
      await waitFor(() => expect(region?.textContent).toMatch(/se enseñan las 8 primeras/));
      expect(region?.textContent).toMatch(/Escribe más dígitos/);
      // Y se enseñan ocho, no doce.
      expect(document.querySelectorAll('.sgtm-asistente__resultados button')).toHaveLength(8);
    } finally {
      globalThis.fetch = original;
    }
  });
});

/**
 * **El motivo manda a lo que hay en pantalla** (M4).
 *
 * Resuelta una unidad y cambiado el concepto a uno del otro tipo, el motivo
 * decía «búscalo y elígelo en la lista» — y la lista no está: su sitio lo ocupa
 * la tarjeta de la unidad ya resuelta. Ahora dice lo que hay que hacer con lo
 * que se ve, y las tres ramas dicen además dónde está el campo, porque la
 * franja se lee al pie y la sección se pliega.
 */
describe('cambiar de concepto con una unidad ya resuelta', () => {
  it('con un predio resuelto y concepto vehicular, manda a «Cambiar», no a la lista', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    await elegirLaPrimeraUnidad(usuario, CODIGO);
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'PATRIMONIO VEHICULAR',
    );

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Hay un predio resuelto/);
    expect(motivoDeLaPrimaria()).toMatch(/Cambiar/);
    // Y **no** manda a una lista que no está en pantalla.
    expect(motivoDeLaPrimaria()).not.toMatch(/elígelo en la lista/);
  });

  it('y al revés: con un vehiculo resuelto y concepto de arbitrios', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'PATRIMONIO VEHICULAR',
    );
    await elegirPorPlaca(usuario, PLACA);
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Hay un vehículo resuelto/);
    expect(motivoDeLaPrimaria()).not.toMatch(/elígelo en la lista/);
  });

  /** Y las tres ramas dicen dónde está el campo, plegada la sección o no. */
  it('los motivos de la unidad dicen donde esta el campo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'ARBITRIOS MUNICIPALES',
    );
    expect(motivoDeLaPrimaria()).toMatch(/Unidad \(predio \/ placa\)/);

    await elegirLaPrimeraUnidad(usuario, CODIGO);
    await usuario.selectOptions(screen.getByLabelText('Concepto / tributo'), 'IMPUESTO PREDIAL');
    expect(motivoDeLaPrimaria()).toMatch(/por contribuyente, no por predio/);
    expect(motivoDeLaPrimaria()).toMatch(/Unidad \(predio \/ placa\)/);
  });
});

/** La caja de observación, cuando ya llegó el trozo del módulo. */
const laObservacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

/**
 * Llena el año y el documento que sustenta el alta: desde #342 (nit 3) los
 * dos son tan obligatorios como el concepto, así que ninguna prueba de este
 * archivo que llegue a guardar puede dejarlos sin elegir.
 */
const llenarAnoYDocumento = async (usuario: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await usuario.selectOptions(await screen.findByLabelText('Año'), '2026');
  await usuario.type(screen.getByLabelText('Nº del documento'), 'RD-2026-000123');
};

/** La placa que el juego de datos del prototipo trae en la ficha de vehículo. */
const PLACA = 'T2G-418';

/** Elige la forma «PLACA», teclea la placa y elige el vehículo que salga. */
async function elegirPorPlaca(
  usuario: ReturnType<typeof userEvent.setup>,
  placa: string,
): Promise<void> {
  await usuario.selectOptions(
    await screen.findByLabelText('Unidad (predio / placa) — buscar por'),
    'PLACA',
  );
  await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), placa);
  await usuario.click(await screen.findByRole('button', { name: new RegExp(placa) }));
  await screen.findByRole('button', { name: CAMBIAR });
}

/** El sobre paginado que `leerPaginado` espera, con lo que se le ponga dentro. */
const unaPaginaDe = (
  contenido: readonly Readonly<Record<string, unknown>>[],
  totalElementos: number,
): Readonly<Record<string, unknown>> => ({
  contenido,
  pagina: 0,
  tamano: contenido.length,
  totalElementos,
  totalPaginas: 1,
  hayMas: false,
});
