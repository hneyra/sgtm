import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { configurarProveedor, entraCon, limpiarSesion } from '../../pruebas/sesion';
import { anotarAtencion, leerAtenciones, olvidarAtenciones } from './atenciones';
import { preguntasDe } from './busqueda-de-atencion';

/**
 * **El inicio pregunta a quien se atiende** (#296, ADR-0016 §1).
 *
 * Lo que estas pruebas defienden, en una linea cada cosa:
 *
 * 1. la heuristica manda a cada lectura lo que le corresponde, y **nunca
 *    esconde** lo que otra si cubre;
 * 2. una opcion sin permiso **no se consulta y no se dibuja** —ni franja vacia
 *    ni error—, que es la decision de fondo del ADR;
 * 3. un 403 y un fallo de red se dicen distintos, y ninguno se lee como «no
 *    existe»;
 * 4. Intro abre el destino cuando hay uno solo, y **no elige por nadie** cuando
 *    hay varios;
 * 5. las atenciones recientes **no llegan al disco del navegador**.
 */

/** Los tres permisos que abren el abanico entero. */
const VENTANILLA = {
  contribuyentes: ['lectura'],
  consulta_vehiculos: ['lectura'],
  consulta_fichas: ['lectura'],
};

/** Un perfil que solo tiene el padron de personas. */
const SOLO_PERSONAS = { contribuyentes: ['lectura'] };

/** Un perfil sin ninguna de las tres lecturas del inicio. */
const SIN_PADRONES = { caja_tributaria: ['ejecucion', 'lectura'] };

/** Las peticiones que salieron, para poder afirmar que una **no** salio. */
let pedidas: string[] = [];

/**
 * Espia lo que sale, y opcionalmente contesta por una ruta.
 *
 * Se interpone **despues** de `entraCon`, asi que envuelve al `fetch` que ya
 * atiende al proveedor de identidad y a la matriz de permisos, y deja pasar al
 * proxy todo lo demas.
 */
function espiar(responder?: (camino: string) => Response | undefined): void {
  const debajo = globalThis.fetch;
  globalThis.fetch = ((entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    const camino = url.replace(/^.*\/api\/v1/, '');
    if (url.includes('/api/v1')) pedidas.push(camino);
    const respuesta = responder?.(camino);
    return respuesta === undefined ? debajo(entrada, opciones) : Promise.resolve(respuesta.clone());
  }) as typeof fetch;
}

/** Un problema del contrato, tal como lo devuelve el backend. */
const problema = (estado: number): Response =>
  new Response(
    JSON.stringify({ type: 'about:blank', title: 'No', status: estado, detail: 'No.' }),
    { status: estado, headers: { 'content-type': 'application/problem+json' } },
  );

/** Una pagina con **una sola** fila de contribuyente. El proxy no filtra; esto si. */
const unaSolaPersona = (): Response =>
  new Response(
    JSON.stringify({
      contenido: [
        {
          id: 7,
          codigo: '00000003541',
          tipoDocumento: 'DNI',
          numeroDocumento: '44218937',
          tipoPersona: 'NATURAL',
          nombreRazonSocial: 'CASTILLO PASCUALA, MARÍA ELENA',
          condicionEspecial: null,
          activo: true,
        },
      ],
      pagina: 0,
      tamano: 1,
      totalElementos: 1,
      totalPaginas: 1,
      hayMas: false,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

/** Una pagina con `cuantas` personas distintas. Para contar, no para leer. */
const variasPersonas = (cuantas: number): Response =>
  new Response(
    JSON.stringify({
      contenido: Array.from({ length: cuantas }, (_, i) => ({
        id: i + 1,
        codigo: `0000000000${i + 1}`,
        tipoDocumento: 'DNI',
        numeroDocumento: `4421893${i}`,
        tipoPersona: 'NATURAL',
        nombreRazonSocial: `MEDINA MEDINA, PERSONA ${i + 1}`,
        condicionEspecial: null,
        activo: true,
      })),
      pagina: 0,
      tamano: cuantas,
      totalElementos: cuantas,
      totalPaginas: 1,
      hayMas: false,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

beforeEach(() => {
  pedidas = [];
  olvidarAtenciones();
  configurarProveedor();
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
  localStorage.clear();
  sessionStorage.clear();
});

/** Teclea en la caja del inicio y espera a que la mano se «apose» (300 ms). */
async function teclear(usuario: ReturnType<typeof userEvent.setup>, texto: string) {
  const caja = await screen.findByRole('searchbox', { name: 'Buscar a quién atiendes' });
  await usuario.type(caja, texto);
  return caja;
}

describe('la heurística manda a cada lectura lo suyo', () => {
  it('ocho dígitos son un DNI, y **además** el prefijo de un código de predio', () => {
    // Las dos preguntas salen a la vez: quedarse solo con el DNI esconderia el
    // predio que ese mismo numero abre, y eso es lo que el ADR prohibe.
    expect(preguntasDe('44218937')).toEqual([
      { clave: 'dni', valor: '44218937' },
      { clave: 'predio', valor: '44218937' },
    ]);
  });

  it('once dígitos son un RUC, y el código municipal no se busca aquí', () => {
    // «00000025673» es un codigo de contribuyente **y** tiene el ancho de un
    // RUC: se pregunta por RUC, se dice en el codigo por que, y no se inventa
    // una tercera consulta que devolveria la misma franja dos veces.
    expect(preguntasDe('20487312956').map((p) => p.clave)).toEqual(['ruc', 'predio']);
    expect(preguntasDe('20487312956').some((p) => p.clave === 'nombre')).toBe(false);
  });

  it('las placas del padrón son placas, no solo las de tres letras', () => {
    // «T2G-418» y «V1H-882» son las que el padron tiene de verdad. Un patron
    // propio de «tres letras y tres digitos» las dejaria fuera; las reglas son
    // las de `Placa` en el dominio.
    //
    // Y **tambien se preguntan como nombre**: la forma de placa y la de razon
    // social se solapan, y son dos lecturas distintas.
    for (const placa of ['ABC-123', 'T2G-418', 'V1H882', 't2g 418']) {
      expect(
        preguntasDe(placa).map((p) => p.clave),
        placa,
      ).toEqual(['placa', 'nombre']);
    }
  });

  it('una razón social con forma de placa llega **a las dos** franjas', () => {
    /* Este es el defecto que la heuristica tenia: «AGRO 2000» y «TEXTIL 21»
       cumplen las reglas de `Placa` —alfanumerico, con letra y digito, de 5 a
       10— y son razones sociales del padron. Preguntando solo al padron
       vehicular, quien tiene la lectura de personas y no la de vehiculos se
       quedaba **sin ninguna franja**, que es justo lo que el propio archivo
       declara que la heuristica no puede hacer: decide a quien se pregunta, no
       que se ensena. */
    for (const razon of ['AGRO 2000', 'TEXTIL 21']) {
      expect(
        preguntasDe(razon).map((p) => p.clave),
        razon,
      ).toEqual(['placa', 'nombre']);
    }
    // El valor de cada una es el suyo: normalizado para la placa, tal cual para
    // el nombre —que es lo que el backend busca por aproximacion—.
    expect(preguntasDe('AGRO 2000')).toEqual([
      { clave: 'placa', valor: 'AGRO2000' },
      { clave: 'nombre', valor: 'AGRO 2000' },
    ]);
  });

  it('un nombre se busca desde tres letras, y con menos no se pregunta nada', () => {
    expect(preguntasDe('MEDINA MEDINA').map((p) => p.clave)).toEqual(['nombre']);
    expect(preguntasDe('PEÑ').map((p) => p.clave)).toEqual(['nombre']);
    expect(preguntasDe('PE')).toEqual([]);
    // Cuatro digitos no son ni un documento ni un codigo catastral buscable.
    expect(preguntasDe('4421')).toEqual([]);
  });
});

describe('el abanico consulta lo que el permiso cubre, y nada más', () => {
  it('con las tres lecturas, cada franja dice de qué padrón salió', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    montarEnRuta('/');
    await teclear(usuario, '44218937');

    // Dos franjas para ocho digitos: el padron de personas y el catastro.
    const personas = await screen.findByRole('region', { name: 'Contribuyentes' });
    const catastro = await screen.findByRole('region', {
      name: 'Consulta de fichas catastrales',
    });
    // Y cada una dice de donde salio con el rotulo del catalogo, sin
    // reescribirlo (FRO-03 §5, ADR-0014 §5): la opcion y el modulo.
    expect(within(personas).getByText('Rentas · Registro')).toBeInTheDocument();
    expect(within(catastro).getByText('Catastro')).toBeInTheDocument();
    /* El nombre de la region **es su encabezado**, no un `aria-label` que lo
       repita: el resto de la aplicacion titula con headings y quien navega por
       ellos tiene que encontrar las franjas. Con `aria-label` la region seguia
       llamandose igual y el encabezado no existia, asi que esto es lo unico que
       distingue las dos formas. */
    expect(within(personas).getByRole('heading', { name: 'Contribuyentes' })).toBeInTheDocument();
    expect(
      within(catastro).getByRole('heading', { name: 'Consulta de fichas catastrales' }),
    ).toBeInTheDocument();
  });

  it('sin el permiso de vehículos no hay franja de vehículos: ni vacía, ni con error', async () => {
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    espiar();
    montarEnRuta('/');
    await teclear(usuario, 'T2G-418');

    expect(screen.queryByRole('region', { name: 'Consulta de vehículos' })).not.toBeInTheDocument();
    // Lo que si se pregunto es el padron de personas, que este perfil si tiene:
    // «T2G-418» tiene tambien forma de razon social.
    await waitFor(() =>
      expect(pedidas.some((camino) => camino.startsWith('/rentas/contribuyentes'))).toBe(true),
    );
    // Y **no se pregunto** por vehiculos: sin permiso no se consulta, no es que
    // se consulte y se esconda la respuesta. La asercion va DESPUES del waitFor
    // a proposito: antes del rebote no ha salido peticion alguna y la lista
    // vacia no demostraria nada — la revision final lo cazo mutando el
    // `enabled` sin que esta linea se inmutara.
    expect(pedidas.filter((camino) => camino.startsWith('/consultas/vehiculos'))).toEqual([]);
  });

  it('sin ninguna de las tres, se dice que desde aquí no se puede buscar', async () => {
    const usuario = userEvent.setup();
    entraCon(SIN_PADRONES);
    montarEnRuta('/');
    await teclear(usuario, 'MEDINA');

    expect(
      await screen.findByText(/no tiene ninguna de las consultas del padrón/i, undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
  });

  it('con alguna consulta pero no la que responde, **se nombra la que falta**', async () => {
    /* Las dos frases son distintas, y la segunda no existia: con cualquier
       permiso del padron que no fuera el que responde a lo escrito salia «tu
       perfil no tiene ninguna de las consultas del padrón», que es falso. A
       quien lo lee le deja creyendo que desde aqui no puede buscar a nadie,
       cuando puede buscar a casi todos.

       Siete digitos solo los responde el catastro: no son ni un DNI (ocho) ni
       un RUC (once), y desde seis son el prefijo de un codigo de referencia
       catastral. Con el padron de personas y sin el de catastro, la frase tiene
       que **nombrar la fuente que falta con el rotulo del catalogo** —que es
       como se le pide al administrador— y decir el camino que si hay. */
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');
    await teclear(usuario, '2001060');

    const frase = await screen.findByText(/Consulta de fichas catastrales/, undefined, {
      timeout: 4000,
    });
    expect(frase).toHaveTextContent(/y tu perfil no la tiene/i);
    expect(frase).toHaveTextContent(/Desde aquí se busca por DNI, por RUC o por nombre/i);
    // Y **no** la frase de «ninguna consulta», que es la mentira que se corrige.
    expect(screen.queryByText(/no tiene ninguna de las consultas/i)).not.toBeInTheDocument();
  });

  it('un error en una franja no calla el recuento de las demás', async () => {
    /* El bloque del error tiene su `role="alert"` y su distincion entre el 403 y
       el fallo de red. Callar ademas el recuento deja a quien no ve la pantalla
       sin saber que debajo hay cuatro personas: el silencio es para cuando el
       error es lo unico que hay. */
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => {
      if (camino.startsWith('/catastro/fichas')) return problema(403);
      if (camino.startsWith('/rentas/contribuyentes')) return variasPersonas(4);
      return undefined;
    });
    montarEnRuta('/');
    await teclear(usuario, '44218937');

    expect(
      await screen.findByText(/4 resultados/, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    // Y el error sigue contandose donde le toca, sin repetirse en la region viva.
    const franja = await screen.findByRole(
      'region',
      { name: 'Consulta de fichas catastrales' },
      { timeout: 4000 },
    );
    expect(within(franja).getByText(/Tu perfil no puede consultar/)).toBeInTheDocument();
  });
});

describe('un 403 y un fallo de red no se leen como «no existe»', () => {
  it('el 403 manda al administrador, y lo que respondieron los demás sigue ahí', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/vehiculos') ? problema(403) : undefined));
    montarEnRuta('/');
    await teclear(usuario, 'T2G-418');

    // Con un reintento de por medio —uno, no tres: hay alguien esperando en el
    // mostrador— la franja tarda mas que una respuesta buena en decidirse.
    const franja = await screen.findByRole(
      'region',
      { name: 'Consulta de vehículos' },
      { timeout: 4000 },
    );
    expect(within(franja).getByText(/Tu perfil no puede consultar/)).toBeInTheDocument();
    expect(within(franja).getByText(/reintentar dará lo mismo/i)).toBeInTheDocument();
    // Lo que **no** dice en ningun sitio: que no haya nadie con esa placa.
    expect(screen.queryByText(/Nadie responde a eso/)).not.toBeInTheDocument();
  });

  it('un 500 dice que no se pudo preguntar, que es otra cosa', async () => {
    const usuario = userEvent.setup();
    entraCon(VENTANILLA);
    espiar((camino) => (camino.startsWith('/consultas/vehiculos') ? problema(500) : undefined));
    montarEnRuta('/');
    await teclear(usuario, 'T2G-418');

    const franja = await screen.findByRole(
      'region',
      { name: 'Consulta de vehículos' },
      { timeout: 4000 },
    );
    expect(within(franja).getByText(/No se pudo preguntar/)).toBeInTheDocument();
    expect(
      within(franja).getByText(/no quiere decir que no esté en el padrón/i),
    ).toBeInTheDocument();
  });
});

describe('Intro abre el destino, y no elige por nadie', () => {
  it('con un solo resultado, Intro lo abre', async () => {
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    espiar((camino) =>
      camino.startsWith('/rentas/contribuyentes') ? unaSolaPersona() : undefined,
    );
    montarEnRuta('/');
    const caja = await teclear(usuario, '44218937');

    await screen.findByText(/1 resultado/);
    await usuario.type(caja, '{Enter}');

    // El destino es el padron con el codigo puesto: la cabecera-resumen de #330
    // se dibuja sola. (Cuando exista la ficha 360° de #297, sera esa.)
    expect(await screen.findByRole('heading', { name: 'Contribuyentes' })).toBeInTheDocument();
  });

  it('dentro del rebote **no abre nada**: lo que hay en pantalla es de la pregunta anterior', async () => {
    /* El defecto, reproducido: se busca un DNI, sale una persona, y quien
       atiende se da cuenta de que se equivoco de digito. Corrige y pulsa Intro
       sin esperar los 300 ms del rebote — y se abre la ficha de **la persona de
       la pregunta anterior**, porque `encontrados` todavia son las respuestas de
       lo que ya no esta escrito. En ventanilla eso es abrir a otra persona y
       operar sobre ella.

       La guarda es la misma que ya protegia a la region viva: si lo escrito no
       es lo preguntado, no hay todavia nada que abrir. */
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    espiar((camino) =>
      camino.startsWith('/rentas/contribuyentes') ? unaSolaPersona() : undefined,
    );
    montarEnRuta('/');
    const caja = await teclear(usuario, '44218937');
    await screen.findByText(/1 resultado/);

    // Se corrige lo tecleado y se pulsa Intro sin esperar. Que estamos dentro
    // del rebote lo dice la propia region viva, y no el reloj de la prueba.
    await usuario.type(caja, '2');
    expect(screen.getByText('Buscando…')).toBeInTheDocument();
    await usuario.type(caja, '{Enter}');

    expect(screen.getByRole('heading', { name: '¿A quién atiendes?' })).toBeInTheDocument();
  });

  it('con la caja vaciada, Intro tampoco abre la ficha que sigue dibujada', async () => {
    // El mismo defecto por el otro lado: vaciar la caja no borra las franjas
    // hasta que el rebote vence, asi que Intro sobre una caja **vacia**
    // navegaba. La guarda cubre los dos, porque compara con lo preguntado.
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    espiar((camino) =>
      camino.startsWith('/rentas/contribuyentes') ? unaSolaPersona() : undefined,
    );
    montarEnRuta('/');
    const caja = await teclear(usuario, '44218937');
    await screen.findByText(/1 resultado/);

    await usuario.clear(caja);
    expect(caja).toHaveValue('');
    await usuario.type(caja, '{Enter}');

    expect(screen.getByRole('heading', { name: '¿A quién atiendes?' })).toBeInTheDocument();
  });

  it('la pregunta dice cómo se vuelve a ella desde media pantalla', async () => {
    // El inicio no es una opcion del catalogo, asi que sus dos caminos de vuelta
    // —la marca y la entrada del lanzador— hay que decirlos: nadie los deduce, y
    // quien no los conoce edita la barra de direcciones o se queda donde esta.
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');

    expect(await screen.findByText(/Desde cualquier pantalla se vuelve aquí/i)).toHaveTextContent(
      /la marca de arriba a la izquierda.*rejilla de módulos/i,
    );
  });

  it('si otro control ya tiene el foco cuando aterriza el trozo, no se lo roba', async () => {
    // El componente llega en un trozo diferido: su efecto de foco corre cuando
    // el trozo aterriza, que puede ser DESPUES de que el operador abriera la
    // paleta con Ctrl K. Robarle el foco a un dialogo abierto manda lo tecleado
    // a la caja equivocada — y era el flake de `caja-con-teclado.spec.ts` en
    // CI. Aqui la paleta se representa con un control cualquiera que ya tiene
    // el foco antes de que la caja exista.
    entraCon(SOLO_PERSONAS);
    const ajena = document.createElement('input');
    ajena.setAttribute('aria-label', 'control que llego primero');
    document.body.append(ajena);
    ajena.focus();

    montarEnRuta('/');
    await screen.findByRole('searchbox', { name: 'Buscar a quién atiendes' });

    expect(ajena).toHaveFocus();
    ajena.remove();
  });

  it('con el foco libre, la caja lo toma al entrar', async () => {
    // El caso normal de ventanilla: nadie tiene el foco y la caja lo toma para
    // que teclear sea lo primero que funciona (RNF-082).
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');
    const caja = await screen.findByRole('searchbox', { name: 'Buscar a quién atiendes' });
    await waitFor(() => expect(caja).toHaveFocus());
  });

  it('Esc vacía la caja y el foco se queda en ella', async () => {
    // El gesto de «esta no es, viene el siguiente»: sin el hay que borrar a mano
    // lo tecleado, y en una cola eso es lo que acaba llevando al raton (RNF-082).
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');
    const caja = await teclear(usuario, 'MEDINA');
    await screen.findByRole('region', { name: 'Contribuyentes' });

    await usuario.keyboard('{Escape}');

    expect(caja).toHaveValue('');
    expect(document.activeElement).toBe(caja);
  });

  it('con varios, Intro baja a la lista en vez de abrir el primero', async () => {
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');
    const caja = await teclear(usuario, 'MEDINA');

    const franja = await screen.findByRole('region', { name: 'Contribuyentes' });
    const filas = within(franja).getAllByRole('button');
    expect(filas.length).toBeGreaterThan(1);

    await usuario.type(caja, '{Enter}');
    // No se navego: la pregunta sigue en pantalla, y el foco esta en la primera
    // fila para elegirla con el teclado (RNF-082).
    expect(screen.getByRole('heading', { name: '¿A quién atiendes?' })).toBeInTheDocument();
    expect(document.activeElement).toBe(filas[0]);
  });
});

describe('las atenciones recientes', () => {
  it('se anotan al abrir a una persona y vuelven a estar al volver al inicio', async () => {
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');
    await teclear(usuario, 'MEDINA');

    const franja = await screen.findByRole('region', { name: 'Contribuyentes' });
    const primera = within(franja).getAllByRole('button')[0] as HTMLElement;
    const nombre = primera.textContent ?? '';
    await usuario.click(primera);

    expect(leerAtenciones().length).toBe(1);
    const anotada = leerAtenciones()[0];
    expect(anotada).toBeDefined();
    expect(nombre).toContain(anotada?.nombre ?? '');

    // Y al volver al inicio, ahi esta.
    montarEnRuta('/');
    const recientes = await screen.findByRole('region', { name: 'Atenciones recientes' });
    expect(within(recientes).getByText(anotada?.nombre ?? '')).toBeInTheDocument();
  });

  it('**no llegan al almacenamiento del navegador** (FRO-01 §5, y ver `atenciones.ts`)', async () => {
    anotarAtencion({
      codigo: '00000025673',
      nombre: 'SUC. RUFINA MEDINA MEDINA',
      documento: 'DNI 03593174',
    });
    entraCon(SOLO_PERSONAS);
    montarEnRuta('/');
    await screen.findByRole('region', { name: 'Atenciones recientes' });

    /* Un puesto de ventanilla es compartido y `localStorage` sobrevive al
       cierre de sesion, al cambio de operador y al cambio de municipalidad. Lo
       que se comprueba no es una clave concreta: es que **ni el codigo, ni el
       nombre, ni el documento** estan en ningun sitio del almacenamiento.
       Persistir la lista pone esto en rojo, que es de lo que se trata.

       **Y los dos almacenes, no uno.** Recorriendo solo `localStorage`, una
       sonda que persistiera la lista en `sessionStorage` dejaba todas las demas
       pruebas de este archivo en verde: la prohibicion es guardar esto en el
       navegador, y `sessionStorage` es el navegador igual —sobrevive a la
       recarga y al cambio de operador dentro de la misma pestana—. */
    const guardado = [localStorage, sessionStorage]
      .flatMap((almacen) =>
        Object.keys(almacen).map((clave) => `${clave} ${almacen.getItem(clave) ?? ''}`),
      )
      .join(' | ');
    expect(guardado).not.toContain('00000025673');
    expect(guardado).not.toContain('RUFINA');
    expect(guardado).not.toContain('03593174');
  });

  it('sin el permiso de `contribuyentes` no se dibujan, aunque estén en memoria', async () => {
    anotarAtencion({ codigo: '00000025673', nombre: 'SUC. RUFINA MEDINA MEDINA', documento: '' });
    entraCon(SIN_PADRONES);
    montarEnRuta('/');

    await screen.findByRole('heading', { name: '¿A quién atiendes?' });
    expect(leerAtenciones().length).toBe(1);
    expect(screen.queryByRole('region', { name: 'Atenciones recientes' })).not.toBeInTheDocument();
  });
});

describe('cada fila lleva a donde su propia lectura permite llegar', () => {
  it('el vehículo abre su ficha cuando el perfil la ve', async () => {
    const usuario = userEvent.setup();
    entraCon({ consulta_vehiculos: ['lectura'], vehiculos: ['lectura'] });
    montarEnRuta('/');
    await teclear(usuario, 'T2G-418');

    const franja = await screen.findByRole('region', { name: 'Consulta de vehículos' });
    await usuario.click(within(franja).getAllByRole('button')[0] as HTMLElement);

    expect(await screen.findByRole('heading', { name: 'Ficha de vehículo' })).toBeInTheDocument();
  });

  it('y vuelve a su propia consulta cuando no la ve, en vez de mandar a un 403', async () => {
    const usuario = userEvent.setup();
    entraCon({ consulta_vehiculos: ['lectura'] });
    montarEnRuta('/');
    await teclear(usuario, 'T2G-418');

    const franja = await screen.findByRole('region', { name: 'Consulta de vehículos' });
    await usuario.click(within(franja).getAllByRole('button')[0] as HTMLElement);

    // La consulta que respondio, con la placa puesta: no un «no tienes permiso»
    // al que le mando la propia interfaz.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Consulta de vehículos' })).toBeInTheDocument(),
    );
    expect(screen.queryByText('No tienes permiso para esta opción')).not.toBeInTheDocument();
  });
});
