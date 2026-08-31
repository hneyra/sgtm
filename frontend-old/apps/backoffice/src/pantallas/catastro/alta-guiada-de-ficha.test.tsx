import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';

/**
 * El alta guiada de la ficha: cuatro pasos que validan sobre el territorio (#320).
 *
 * Lo que se comprueba es lo que distingue el asistente del formulario de
 * cuarenta campos que dibuja el prototipo:
 *
 * - **nada se guarda hasta el paso 4** (regla 10, RNF-052): recorrer los tres
 *   primeros no manda ni una escritura, y sin observación el cierre no se
 *   habilita;
 * - el paso 2 **avisa del duplicado antes** de llenar el resto, con quién lo
 *   tiene y un enlace a esa ficha;
 * - lo que viaja es **la lista blanca declarada**, incluida la tabla de pisos y
 *   el bloque de titular: un campo que el asistente no declare no se manda;
 * - un reintento del mismo intento **no crea dos fichas**: la clave de
 *   idempotencia es la misma.
 */

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly clave: string | null;
  readonly cuerpo: string;
}

let peticiones: Peticion[] = [];

/** El código del prototipo, ya inscrito: 21 dígitos, sector «01». */
const YA_INSCRITO = '200601010150010101001';

/** Uno que **no** está en el juego de datos, con un sector que sí está («02»). */
const LIBRE = '200601020010200101003';

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

const altas = () =>
  peticiones.filter((p) => p.url.includes('/api/v1/catastro/fichas/urbana') && p.metodo === 'POST');

/** Abre el asistente desde la acción «Nuevo» de la ficha urbana. */
async function abrirElAsistente(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  montarEnRuta('/catastro/ficha-urbana');
  await usuario.click(await screen.findByRole('button', { name: 'Nuevo' }));
  await screen.findByRole('region', { name: 'Alta de ficha catastral urbana' });
  // El asistente llega en su propio trozo (`lazy`) y su primer paso espera al
  // catalogo territorial: se aguarda al campo, no al contenedor.
  await screen.findByLabelText('Dirección');
}

/** Compone el código tramo a tramo pegándolo en el primero: es lo que hace quien lo tiene. */
async function componer(
  usuario: ReturnType<typeof userEvent.setup>,
  codigo: string,
): Promise<void> {
  const primerTramo = screen.getByLabelText('Código de referencia catastral · Depto.');
  await usuario.click(primerTramo);
  await usuario.paste(codigo);
}

const continuar = async (usuario: ReturnType<typeof userEvent.setup>): Promise<void> =>
  usuario.click(screen.getByRole('button', { name: 'Continuar' }));

/* ── El riel y el orden ────────────────────────────────────────────────── */

describe('cuatro pasos, uno visible a la vez', () => {
  it('el riel dice cuál está hecho, cuál va y cuáles faltan, con texto y no solo con color', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    const riel = screen.getByRole('list', { name: 'Pasos del alta' });
    const pasos = within(riel).getAllByRole('listitem');
    expect(pasos).toHaveLength(4);
    expect(pasos[0]).toHaveTextContent('En curso');
    expect(pasos[1]).toHaveTextContent('Pendiente');

    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    expect(within(riel).getAllByRole('listitem')[0]).toHaveTextContent('Hecho');
    // Un paso a la vez: el campo del primero ya no está en pantalla.
    expect(screen.queryByLabelText('Dirección')).not.toBeInTheDocument();
  });

  it('sin dirección no se continúa, y se dice por qué', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    expect(screen.getByText('Falta la dirección del predio.')).toBeInTheDocument();
  });

  it('la vía y el sector salen del catálogo de Territorio, no de un campo libre', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    // Las dos lecturas son las que Catastro ya publica: ninguna consulta nueva.
    await waitFor(() =>
      expect(peticiones.some((p) => p.url.includes('/api/v1/catastro/sectores'))).toBe(true),
    );
    expect(peticiones.some((p) => p.url.includes('/api/v1/catastro/vias'))).toBe(true);
    expect(screen.getByLabelText('Sector').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Vía').tagName).toBe('SELECT');
  });
});

/* ── El paso 2: el código, comprobado ──────────────────────────────────── */

describe('el paso del código comprueba antes de dejar seguir llenando', () => {
  it('avisa del duplicado con su titular y enlaza a esa ficha', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    await componer(usuario, YA_INSCRITO);

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/ya está inscrita/);
    expect(aviso).toHaveTextContent(/a nombre de/);
    const enlace = within(aviso).getByRole('link', { name: 'Ver esa ficha' });
    expect(enlace).toHaveAttribute('href', `/catastro/ficha-urbana/${YA_INSCRITO}`);
  });

  it('y **no** avisa de un código que no está inscrito: la coincidencia es exacta', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    // Primero el que sí está, para que el aviso llegue a existir: sin esto, «no
    // hay aviso» podría ser «todavía no se ha preguntado».
    await componer(usuario, YA_INSCRITO);
    const aviso = await screen.findByRole('alert');
    // Y rotula **el código hallado**, no el tecleado: son el mismo mientras el
    // filtro exacto funcione, y por eso hay que rotular el hallado —el backend
    // resuelve por prefijo y el proxy ni siquiera filtra, así que un fallo del
    // filtro avisaría de un duplicado que no existe con el código de otra ficha—.
    expect(aviso).toHaveTextContent('20-06-01-01-015-001-01-01-00-1');

    // Y ahora uno libre. El proxy de datos **no filtra**: devuelve el juego
    // entero para cualquier código, así que sin la coincidencia exacta todo
    // código de 8 dígitos o más avisaría de estar ya inscrito.
    await componer(usuario, LIBRE);

    // Se espera a que la comprobación del código libre **haya contestado**: sin
    // esto, «no hay aviso» se cumpliría en el hueco entre lanzar la consulta y
    // recibirla, y la prueba pasaría diga lo que diga el filtro. Mientras está
    // en vuelo el asistente lo dice, así que dejar de decirlo es haber
    // contestado.
    const porElLibre = () => peticiones.filter((p) => p.url.includes(`codRefCatastral=${LIBRE}`));
    await waitFor(() => expect(porElLibre().length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(screen.queryByText('Comprobando si ya está inscrita…')).not.toBeInTheDocument(),
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si la comprobación falla, lo dice: callar se lee «no hay duplicado»', async () => {
    const usuario = userEvent.setup();
    // La consulta de fichas responde 500 **solo ella**: el resto del asistente
    // —sectores, vías— sigue contestando, para que lo que se mide sea el aviso
    // y no una pantalla rota entera.
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/api/v1/catastro/fichas?')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ title: 'Error interno', status: 500, detail: 'Algo se rompió.' }),
            { status: 500, headers: { 'content-type': 'application/problem+json' } },
          ),
        );
      }
      return proxy(entrada, opciones);
    };

    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);
    await componer(usuario, LIBRE);

    // Sin esto la pantalla quedaba **idéntica** a la de un código libre: la
    // consulta fallaba, `data` era `undefined` y el paso 2 no dibujaba nada.
    expect(await screen.findByText('No se pudo comprobar si ya está inscrita')).toBeInTheDocument();
  });

  it('dice cuando el sector del código no está en el catálogo', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    // Mismo ubigeo, sector «99»: el catálogo del prototipo llega hasta el 05.
    await componer(usuario, '200601990150010101002');

    expect(await screen.findByText('El sector 99 no está en el catálogo')).toBeInTheDocument();
  });
});

/* ── Nada se guarda hasta el paso 4 ────────────────────────────────────── */

describe('nada se guarda hasta el paso 4', () => {
  it('recorrer los tres primeros pasos no manda ninguna escritura', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);
    await componer(usuario, '200601020010200101003');
    await continuar(usuario);
    await usuario.type(screen.getByLabelText('Área de terreno (m²)'), '180.00');
    await usuario.type(screen.getByLabelText('Uso'), 'CASA HABITACIÓN');
    await continuar(usuario);

    expect(altas()).toHaveLength(0);
    expect(screen.getByLabelText('Observación')).toBeInTheDocument();
  });

  it('sin observación, «Inscribir ficha» no se habilita', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);

    const inscribir = screen.getByRole('button', { name: 'Inscribir ficha' });
    expect(inscribir).toBeDisabled();

    await usuario.type(
      screen.getByLabelText('Observación'),
      'Levantamiento catastral de la manzana 001.',
    );
    expect(inscribir).toBeEnabled();
  });

  it('y sin documento de origen tampoco, porque el backend lo exige', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario, { conDocumento: false });

    await usuario.type(screen.getByLabelText('Observación'), 'Levantamiento catastral.');
    expect(screen.getByRole('button', { name: 'Inscribir ficha' })).toBeDisabled();
    expect(screen.getByText(/Falta el documento de origen/)).toBeInTheDocument();
  });
});

/* ── Lo que viaja ──────────────────────────────────────────────────────── */

describe('lo que se manda es la lista blanca declarada', () => {
  it('el predio, la ficha, los pisos y el titular, y nada más', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario, { conPiso: true });

    await usuario.type(screen.getByLabelText('Código del contribuyente'), '0000104821');
    await usuario.selectOptions(screen.getByLabelText('Condición'), 'PROPIETARIO_UNICO');
    await usuario.type(screen.getByLabelText('% de propiedad'), '100.00');
    await usuario.type(
      screen.getByLabelText('Documento que acredita la titularidad'),
      'Escritura pública 1120-2019',
    );
    await usuario.type(
      screen.getByLabelText('Observación'),
      'Levantamiento catastral de la manzana 001.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Inscribir ficha' }));

    await waitFor(() => expect(altas()).toHaveLength(1));
    const cuerpo = JSON.parse(altas()[0]?.cuerpo ?? '{}');
    expect(cuerpo.codRefCatastral).toBe('200601020010200101003');
    expect(cuerpo.direccion).toBe('AV. JOSÉ DE LAMA 1245');
    expect(cuerpo.areaTerreno).toBe('180.00');
    expect(cuerpo.uso).toBe('CASA HABITACIÓN');
    expect(cuerpo.documentoOrigen).toBe('Acta de inspección 0244-2026');
    expect(cuerpo.observacion).toBe('Levantamiento catastral de la manzana 001.');
    expect(cuerpo.construcciones).toEqual([
      { piso: '01', areaConstruida: '118.50', categoriaMuros: 'C' },
    ]);
    // El titular es **un bloque**, no una lista: así lo declara `PeticionDeAlta`,
    // y lleva sus cuatro campos —el documento del título incluido, que
    // `DeclaracionDeFicha.titularDe` exige con `exigir(...)` igual que el código
    // y la condición—.
    expect(cuerpo.titular).toEqual({
      codigoContribuyente: '0000104821',
      condicion: 'PROPIETARIO_UNICO',
      porcentaje: '100.00',
      documentoOrigen: 'Escritura pública 1120-2019',
    });
    // Ni un importe, ni un campo que el controlador no acepte.
    expect(cuerpo).not.toHaveProperty('autovaluo');
    expect(cuerpo).not.toHaveProperty('economico');
  });

  it('sin titular identificado también se inscribe: el bloque simplemente no viaja', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);

    await usuario.type(screen.getByLabelText('Observación'), 'Predio fichado sin titular aún.');
    await usuario.click(screen.getByRole('button', { name: 'Inscribir ficha' }));

    await waitFor(() => expect(altas()).toHaveLength(1));
    const cuerpo = JSON.parse(altas()[0]?.cuerpo ?? '{}');
    expect(cuerpo).not.toHaveProperty('titular');
    // La lista de construcciones **sí** viaja aunque esté vacía: en un alta,
    // ausente y vacía son lo mismo, y decirlo explícito es lo que evita que un
    // día signifiquen cosas distintas.
    expect(cuerpo.construcciones).toEqual([]);
  });
});

/* ── Idempotencia ──────────────────────────────────────────────────────── */

describe('un reintento no crea dos fichas', () => {
  it('el segundo envío del mismo intento manda la misma clave', async () => {
    const usuario = userEvent.setup();
    // El proxy responde 201; para reintentar hace falta un fallo, así que se
    // interpone uno por encima **solo para el POST**.
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/api/v1/catastro/fichas/urbana') && opciones?.method === 'POST') {
        void proxy(entrada, opciones);
        return Promise.resolve(
          new Response(
            JSON.stringify({ title: 'Servicio no disponible', status: 503, detail: 'Reintenta.' }),
            { status: 503, headers: { 'content-type': 'application/problem+json' } },
          ),
        );
      }
      return proxy(entrada, opciones);
    };

    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);
    await usuario.type(screen.getByLabelText('Observación'), 'Levantamiento catastral.');

    await usuario.click(screen.getByRole('button', { name: 'Inscribir ficha' }));
    await waitFor(() => expect(altas()).toHaveLength(1));
    await usuario.click(screen.getByRole('button', { name: 'Inscribir ficha' }));
    await waitFor(() => expect(altas()).toHaveLength(2));

    // Dos envíos del mismo intento: para el servidor es **uno**. Regenerar la
    // clave aquí inscribiría el predio dos veces.
    expect(altas()[0]?.clave).toBeTruthy();
    expect(altas()[0]?.clave).toBe(altas()[1]?.clave);
  });
});

/* ── El titular: o entero, o ninguno ───────────────────────────────────── */

describe('el titular declarado a medias no se puede inscribir', () => {
  it('con código de contribuyente y sin su documento, «Inscribir ficha» no se habilita', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);
    await usuario.type(screen.getByLabelText('Observación'), 'Levantamiento catastral.');

    // Con el titular sin declarar, se inscribe: el predio se ficha antes de
    // saber de quién es (DAT-01 §4.2).
    expect(screen.getByRole('button', { name: 'Inscribir ficha' })).toBeEnabled();

    await usuario.type(screen.getByLabelText('Código del contribuyente'), '0000104821');
    await usuario.selectOptions(screen.getByLabelText('Condición'), 'PROPIETARIO_UNICO');

    // `DeclaracionDeFicha.titularDe` exige los tres: sin el documento, la
    // petición es 422 y hasta hoy **no había campo en pantalla para llenarlo**.
    expect(screen.getByRole('button', { name: 'Inscribir ficha' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/documento que acredita la titularidad/i);

    await usuario.type(
      screen.getByLabelText('Documento que acredita la titularidad'),
      'Escritura pública 1120-2019',
    );
    expect(screen.getByRole('button', { name: 'Inscribir ficha' })).toBeEnabled();
  });

  it('la condición del titular arranca sin elegir, no en la primera de la lista', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);

    // Un `select` sin valor cuyas opciones no traen la vacía se dibuja mostrando
    // la primera: la pantalla enseñaba «PROPIETARIO_UNICO» y no mandaba nada.
    expect((screen.getByLabelText('Condición') as HTMLSelectElement).value).toBe('');
  });
});

/* ── Por qué no se puede guardar, dicho donde se lee ───────────────────── */

describe('el motivo de no poder guardar se ve, no vive en un «title»', () => {
  it('sin observación lo dice en pantalla, y el botón lo referencia', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);

    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent(/Falta la observación/);
    // `aria-describedby` y no `title`: un `title` sobre un botón deshabilitado
    // no existe ni para el teclado —no se puede enfocar— ni para el lector.
    expect(screen.getByRole('button', { name: 'Inscribir ficha' })).toHaveAttribute(
      'aria-describedby',
      aviso.id,
    );

    await usuario.type(screen.getByLabelText('Observación'), 'Levantamiento catastral.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

/* ── El foco, la salida y el rótulo ────────────────────────────────────── */

describe('el asistente se puede operar y abandonar con el teclado', () => {
  it('el foco va al rótulo del paso al abrir y en cada paso', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    await waitFor(() => expect(document.activeElement?.tagName).toBe('H2'));
    expect(document.activeElement).toHaveTextContent('Paso 1 de 4');

    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    // Al avanzar, «Continuar» se deshabilita y suelta el foco al `body`: sin
    // llevarlo, el siguiente tabulador empieza por la cabecera de la aplicación.
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Paso 2 de 4'));
  });

  it('«Cancelar» está en los cuatro pasos, no solo en el primero', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    for (const paso of [1, 2, 3, 4]) {
      expect(
        screen.getByRole('button', { name: 'Cancelar' }),
        `paso ${paso} sin salida`,
      ).toBeInTheDocument();
      if (paso === 1) await usuario.type(screen.getByLabelText('Dirección'), 'AV. LAMA 1245');
      if (paso === 2) await componer(usuario, '200601020010200101003');
      if (paso === 3) {
        await usuario.type(screen.getByLabelText('Área de terreno (m²)'), '180.00');
        await usuario.type(screen.getByLabelText('Uso'), 'CASA HABITACIÓN');
      }
      if (paso < 4) await continuar(usuario);
    }
  });

  it('con el borrador escrito, Esc no descarta a la primera: lo confirma diciendo qué se pierde', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');

    await usuario.keyboard('{Escape}');

    // Cuatro pasos de captura no se tiran por una tecla. Y se dice **qué pasa**,
    // no «¿estás seguro?»: es el trato que `BarraDeAcciones` le da a lo
    // irreversible (FRO-04 §5).
    expect(screen.getByText('Vas a descartar la ficha que estás llenando')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Alta de ficha catastral urbana' }),
    ).toBeInTheDocument();

    // Y se puede volver a lo escrito, que sigue ahí.
    await usuario.click(screen.getByRole('button', { name: 'Seguir llenando' }));
    expect(screen.getByLabelText('Dirección')).toHaveValue('AV. JOSÉ DE LAMA 1245');

    // Confirmando sí sale.
    await usuario.keyboard('{Escape}');
    await usuario.click(screen.getByRole('button', { name: 'Descartar el borrador' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Alta de ficha catastral urbana' }),
      ).not.toBeInTheDocument(),
    );
    expect(altas()).toHaveLength(0);
  });

  it('Esc dentro de un desplegable cierra el desplegable, no el asistente', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    // El `preventDefault()` de Esc era incondicional, así que abrir la lista de
    // sectores y arrepentirse cerraba el asistente entero: la tecla es la misma,
    // el gesto no.
    screen.getByLabelText('Sector').focus();
    await usuario.keyboard('{Escape}');

    expect(
      screen.getByRole('region', { name: 'Alta de ficha catastral urbana' }),
    ).toBeInTheDocument();
    // Y sin confirmación tampoco: no se pidió salir.
    expect(
      screen.queryByText('Vas a descartar la ficha que estás llenando'),
    ).not.toBeInTheDocument();
  });

  it('Esc cierra el asistente y devuelve el foco a la acción que lo abrió', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    await usuario.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Alta de ficha catastral urbana' }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nuevo' })).toHaveFocus());
    expect(altas()).toHaveLength(0);
  });
});

/* ── El paso 2 compone lo elegido, y dice lo que todavía no comprobó ───── */

describe('el código se compone sobre lo elegido en el paso anterior', () => {
  it('el sector, la manzana y el lote se ponen detrás del ubigeo tecleado', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);

    await usuario.selectOptions(screen.getByLabelText('Sector'), '02');
    await usuario.type(screen.getByLabelText('Manzana'), '001');
    await usuario.type(screen.getByLabelText('Lote'), '020');
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    // Solo el ubigeo: lo demás lo pone lo que se eligió arriba, que es lo que el
    // subtítulo del paso promete y hasta hoy había que volver a teclear.
    await componer(usuario, '200601');

    await waitFor(() =>
      expect(screen.getByLabelText('Código de referencia catastral · Sector')).toHaveValue('02'),
    );
    expect(screen.getByLabelText('Código de referencia catastral · Manzana')).toHaveValue('001');
    expect(screen.getByLabelText('Código de referencia catastral · Lote')).toHaveValue('020');
  });

  it('con menos dígitos de los necesarios dice que todavía no comprobó el duplicado', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);

    // Callar se lee como «no hay duplicado», que es lo contrario de lo que pasa.
    expect(
      screen.getByText(/Todavía no se ha comprobado si el código ya está inscrito/),
    ).toBeInTheDocument();

    await componer(usuario, '20060102');
    await waitFor(() =>
      expect(
        screen.queryByText(/Todavía no se ha comprobado si el código ya está inscrito/),
      ).not.toBeInTheDocument(),
    );
  });
});

/* ── Las búsquedas en vivo no preguntan por tecla ──────────────────────── */

describe('lo que se teclea no es una consulta por pulsación', () => {
  it('buscar en el padrón pregunta una vez, cuando la mano para', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);

    const alPadron = () =>
      peticiones.filter((p) => p.url.includes('nombreRazonSocial=') && p.metodo === 'GET');
    expect(alPadron()).toHaveLength(0);

    // Seis pulsaciones. Sin espera, cuatro de ellas —de «GAR» en adelante—
    // eran una consulta contra el padrón cada una.
    await usuario.type(screen.getByLabelText('Buscar en el padrón'), 'GARCIA');

    await waitFor(() => expect(alPadron().length).toBeGreaterThan(0));
    expect(alPadron()).toHaveLength(1);
    expect(alPadron()[0]?.url).toContain('GARCIA');
  });
});

/* ── El duplicado, otra vez donde se decide ────────────────────────────── */

describe('el aviso de duplicado sobrevive hasta el momento de inscribir', () => {
  it('se repite en el resumen del paso 4, con el titular y el enlace', async () => {
    const usuario = userEvent.setup();
    await abrirElAsistente(usuario);
    await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
    await continuar(usuario);
    await componer(usuario, YA_INSCRITO);
    await screen.findByRole('alert');

    await continuar(usuario);
    await usuario.type(screen.getByLabelText('Área de terreno (m²)'), '180.00');
    await usuario.type(screen.getByLabelText('Uso'), 'CASA HABITACIÓN');
    await continuar(usuario);

    // Tres pasos después, en el momento de pulsar «Inscribir ficha», es cuando
    // hace falta saber que el código ya está tomado.
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/ya está inscrita/);
    expect(within(aviso).getByRole('link', { name: 'Ver esa ficha' })).toHaveAttribute(
      'href',
      `/catastro/ficha-urbana/${YA_INSCRITO}`,
    );
  });
});

/* ── Después del 201 ───────────────────────────────────────────────────── */

describe('inscribir termina en la ficha inscrita, no en un formulario vacío', () => {
  it('dice qué se inscribió, enlaza a la ficha y ofrece salir', async () => {
    const usuario = userEvent.setup();
    // El proxy todavía no sirve este `POST` —responde 404, y así se ve en las
    // demás pruebas de esta batería—, así que el 201 se interpone: lo que se
    // comprueba aquí es qué hace la pantalla **después** de que el servidor
    // acepte, no que el proxy lo acepte.
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      if (url.includes('/api/v1/catastro/fichas/urbana') && opciones?.method === 'POST') {
        void proxy(entrada, opciones);
        return Promise.resolve(
          new Response(JSON.stringify({ codRefCatastral: '200601020010200101003' }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    };

    await abrirElAsistente(usuario);
    await llegarAlCierre(usuario);
    await usuario.type(screen.getByLabelText('Observación'), 'Levantamiento catastral.');
    await usuario.click(screen.getByRole('button', { name: 'Inscribir ficha' }));

    const hecho = await screen.findByRole('region', { name: 'Ficha inscrita' });
    expect(within(hecho).getByRole('link', { name: 'Ver la ficha inscrita' })).toHaveAttribute(
      'href',
      '/catastro/ficha-urbana/200601020010200101003',
    );
    expect(within(hecho).getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    // Y el asistente ya no está: quedarse en el paso 4 con los campos vacíos se
    // leía como un formulario que se acababa de borrar solo.
    expect(screen.queryByLabelText('Observación')).not.toBeInTheDocument();
  });
});

/* ── El permiso ────────────────────────────────────────────────────────── */

describe('el alta exige privilegio de registro', () => {
  it('con solo lectura y modificación, «Nuevo» sigue apagado y no abre nada', async () => {
    const usuario = userEvent.setup();
    entraCon({ ficha_urbana: ['lectura', 'modificacion'] });
    // La precondición es que la matriz de permisos **ya llegó**: hasta entonces
    // no se ve nada (negación por omisión) y el botón estaría apagado por un
    // motivo que no es el que se quiere comprobar. Se espera a la respuesta,
    // como hace `sesion.test.tsx`.
    const conSesion = globalThis.fetch;
    let matrizLeida = false;
    globalThis.fetch = (entrada, opciones) => {
      const url = typeof entrada === 'string' ? entrada : String(entrada);
      const respuesta = conSesion(entrada, opciones);
      if (url.includes('/sesion/permisos')) {
        void respuesta.then(() => {
          matrizLeida = true;
        });
      }
      return respuesta;
    };
    montarEnRuta('/catastro/ficha-urbana');
    await waitFor(() => expect(matrizLeida).toBe(true));

    const boton = await screen.findByRole('button', { name: 'Nuevo' });
    expect(boton).toBeDisabled();
    await usuario.click(boton);
    expect(
      screen.queryByRole('region', { name: 'Alta de ficha catastral urbana' }),
    ).not.toBeInTheDocument();
  });
});

/**
 * Lleva el asistente hasta el paso 4, con lo mínimo que el backend exige.
 *
 * El código usado no es el del prototipo: es del sector «02», que sí está en el
 * catálogo, para que ninguno de los dos avisos del paso 2 se dispare.
 */
async function llegarAlCierre(
  usuario: ReturnType<typeof userEvent.setup>,
  { conDocumento = true, conPiso = false }: { conDocumento?: boolean; conPiso?: boolean } = {},
): Promise<void> {
  await usuario.type(screen.getByLabelText('Dirección'), 'AV. JOSÉ DE LAMA 1245');
  await continuar(usuario);
  await componer(usuario, '200601020010200101003');
  await continuar(usuario);
  await usuario.type(screen.getByLabelText('Área de terreno (m²)'), '180.00');
  await usuario.type(screen.getByLabelText('Uso'), 'CASA HABITACIÓN');
  if (conPiso) {
    await usuario.type(screen.getByLabelText('Piso'), '01');
    await usuario.type(screen.getByLabelText('Área m²'), '118.50');
    await usuario.type(screen.getByLabelText('Muros'), 'c');
    await usuario.click(screen.getByRole('button', { name: 'Agregar piso' }));
  }
  await continuar(usuario);
  if (conDocumento) {
    await usuario.type(
      screen.getByLabelText('Documento de origen'),
      'Acta de inspección 0244-2026',
    );
  }
}
