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
    // El titular es **un bloque**, no una lista: así lo declara `PeticionDeAlta`.
    expect(cuerpo.titular).toEqual({
      codigoContribuyente: '0000104821',
      condicion: 'PROPIETARIO_UNICO',
      porcentaje: '100.00',
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

/* ── El permiso ────────────────────────────────────────────────────────── */

describe('el alta exige privilegio de registro', () => {
  it('con solo lectura y modificación, «Nuevo» sigue apagado y no abre nada', async () => {
    const usuario = userEvent.setup();
    entraCon({ ficha_urbana: ['lectura', 'modificacion'] });
    montarEnRuta('/catastro/ficha-urbana');

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
    await usuario.type(screen.getByLabelText('Nº Piso'), '01');
    await usuario.type(screen.getByLabelText('Área construida (m²)'), '118.50');
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
