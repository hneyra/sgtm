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
    for (const placa of ['ABC-123', 'T2G-418', 'V1H882', 't2g 418']) {
      expect(
        preguntasDe(placa).map((p) => p.clave),
        placa,
      ).toEqual(['placa']);
    }
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
    // reescribirlo (RNF-080): la opcion y el modulo al que pertenece.
    expect(within(personas).getByText('Rentas · Registro')).toBeInTheDocument();
    expect(within(catastro).getByText('Catastro')).toBeInTheDocument();
  });

  it('sin el permiso de vehículos no hay franja de vehículos: ni vacía, ni con error', async () => {
    const usuario = userEvent.setup();
    entraCon(SOLO_PERSONAS);
    espiar();
    montarEnRuta('/');
    await teclear(usuario, 'T2G-418');

    // La placa solo la responde `consulta_vehiculos`, y este perfil no la tiene.
    await screen.findByText(/no tiene ninguna de las consultas/i);
    expect(screen.queryByRole('region', { name: 'Consulta de vehículos' })).not.toBeInTheDocument();
    // Y **no se pregunto**: sin permiso no se consulta, no es que se consulte y
    // se esconda la respuesta.
    expect(pedidas.filter((camino) => camino.startsWith('/consultas/vehiculos'))).toEqual([]);
  });

  it('sin ninguna de las tres, se dice que desde aquí no se puede buscar', async () => {
    const usuario = userEvent.setup();
    entraCon(SIN_PADRONES);
    montarEnRuta('/');
    await teclear(usuario, 'MEDINA');

    expect(
      await screen.findByText(/no tiene ninguna de las consultas del padrón/i),
    ).toBeInTheDocument();
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
       Persistir la lista pone esto en rojo, que es de lo que se trata. */
    const guardado = Object.keys(localStorage)
      .map((clave) => `${clave} ${localStorage.getItem(clave) ?? ''}`)
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
