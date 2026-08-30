import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { impedimentoDelActo } from '../actos';
import { OPCIONES_QUE_LEEN_POR_POST } from '../lecturas-por-post';
import { escrituraDe } from '../escrituras';
import { montarEnRuta } from '../../pruebas/montar';
import {
  motivoDeLaPrimaria,
  primariaApagada,
  primariaDeLaPantalla,
  primariaEncendida,
} from '../../pruebas/acciones';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Autorizaciones y licencias, conectado (#79): siete lecturas de once, y por qué las cuatro
 * escrituras se quedan sin conectar. Ver el javadoc de `pantallas/licencias/index.ts`.
 */

const dibujada = async (): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
};

const esperarFilas = async (tabla: HTMLElement): Promise<void> => {
  await waitFor(() => expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(1));
};

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('las siete lecturas de licencias están conectadas', () => {
  it('exactamente estas siete, ni una más', () => {
    const deLicencias = [
      'anuncios',
      'licencia_funcionamiento',
      'licencia_resumen_anual',
      'fue_edificacion',
      'edificacion_reporte',
      'ciiu',
      'certificados',
    ];
    for (const id of deLicencias) expect(OPCIONES_CONECTADAS).toContain(id);
    /* Las otras cuatro no son conexiones de lectura, y desde #427 cada una por
       su motivo: los dos padrones leen por la **tercera puerta** —un `POST` que
       no escribe, `lecturas-por-post.ts`— y las dos resoluciones son hojas sin
       superficie (FRO-06). Ninguna de las cuatro tiene un `GET` que pedir al
       abrir. */
    for (const id of [
      'anuncios_reportes',
      'licencia_padron',
      'licencia_resolucion_cancelacion',
      'licencia_resolucion_duplicado',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(id);
    }
  });

  it('anuncios dibuja el D.N.I. que publica AnuncioResource, y R.U.C. sale con SIN_DATO', async () => {
    montarEnRuta('/autorizaciones-y-licencias/anuncios');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    // `AnuncioResource` solo publica un documento por titular: la columna
    // «R.U.C.» (la sexta) sale siempre con SIN_DATO, nunca inventada.
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[5]).toBe(SIN_DATO);
    }
    expect(tabla.textContent).toMatch(/\d{8}/);
  });

  it('licencia-funcionamiento dibuja el estado derivado (VIGENTE/VENCIDA/CANCELADA), no el del prototipo', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-funcionamiento');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const insignias = within(tabla).getAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    expect(insignias.every((i) => (i.textContent ?? '').trim() !== '')).toBe(true);
  });

  it('licencia-resumen-anual lee su sobre sin paginación ({ aLaFecha, filas }), no RespuestaPaginada', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-resumen-anual');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // Los millares del prototipo («4,182») llegan sin la coma: el mock los
    // limpia como si vinieran de `count(*)` (#342).
    expect(tabla.textContent).not.toMatch(/\d,\d{3},\d{3}/);
  });

  it('fue-edificacion dibuja las seis columnas que declara FueResource, sin «Est.»', async () => {
    montarEnRuta('/autorizaciones-y-licencias/fue-edificacion');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((c) => (c.textContent ?? '').trim());
    expect(cabeceras).toHaveLength(6);
  });

  it('edificacion-reporte no inventa el valor de obra que ValorizacionDeObra no pudo calcular', async () => {
    montarEnRuta('/autorizaciones-y-licencias/edificacion-reporte');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // Ninguna celda de «Valor de obra S/» es un cero fabricado: o trae el
    // importe real del mock, o SIN_DATO.
    const filas = within(tabla).getAllByRole('row').slice(1);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[7]).not.toBe('0.00');
    }
  });

  it('ciiu es un buscador contra el servidor: el filtro «Descripción» es texto, no un desplegable', async () => {
    montarEnRuta('/autorizaciones-y-licencias/ciiu');
    await dibujada();
    const filtro = await screen.findByLabelText('Descripción');
    expect(filtro.tagName).toBe('INPUT');
    expect(filtro).not.toHaveAttribute('list');
  });

  it('certificados conecta certificados_listado (GET), no certificados (POST)', async () => {
    montarEnRuta('/autorizaciones-y-licencias/certificados');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    expect(tabla.textContent).toMatch(/CN-|CZ-|CP-/);
  });

  it('anuncios_reportes y licencia_padron leen por POST: ni escriben ni tienen impedimento', () => {
    for (const opcion of ['anuncios_reportes', 'licencia_padron']) {
      expect(OPCIONES_QUE_LEEN_POR_POST).toContain(opcion);
      // Ni con la lista del catálogo —cuya última es «Cancelar»— ni con la
      // compuesta: su acto funciona, y lo que hace es leer.
      expect(impedimentoDelActo(opcion, ['Exportar', 'Imprimir', 'Pantalla', 'Cancelar'])).toBe(
        undefined,
      );
      expect(escrituraDe(opcion)).toBeUndefined();
    }
  });
});

/**
 * **Los dos padrones, por la tercera puerta** (#427, #424).
 *
 * `anuncios_reportes` y `licencia_padron` son `POST` que sólo leen: no se piden
 * al abrir la pantalla —no hay criterio elegido—, no piden observación y su
 * respuesta no es un sobre paginado. Ver `licencias/EmisorDePadron.tsx`.
 */
describe('los dos padrones de licencias emiten por POST y no escriben nada (#427)', () => {
  it('anuncios_reportes: al abrir no pide nada, y «Pantalla» es la única acción', async () => {
    montarEnRuta('/autorizaciones-y-licencias/anuncios-reportes');
    await screen.findByRole('heading', { name: 'Criterios' });

    // Ninguna tabla todavía: la hoja sale al emitir, no al abrir.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const acciones = [...document.querySelectorAll('.sgtm-acciones .sgtm-boton')].map(
      (boton) => boton.textContent,
    );
    // Ni «Cancelar» —cierra un diálogo que aquí no existe— ni «Exportar»/
    // «Imprimir», que piden el documento por `?formato=` y sólo se descargan
    // con un `GET`.
    expect(acciones).toEqual(['Pantalla']);
    primariaEncendida();
  });

  it('anuncios_reportes dibuja bloqueados los tres criterios que no viajan, con su motivo', async () => {
    montarEnRuta('/autorizaciones-y-licencias/anuncios-reportes');
    await screen.findByRole('heading', { name: 'Criterios' });

    // Los cuatro que `PeticionDeReporteDeAnuncios` admite se teclean.
    for (const etiqueta of ['Contribuyente', 'Dirección', 'Desde', 'Hasta']) {
      expect(screen.getByLabelText(etiqueta)).not.toHaveAttribute('readonly');
    }
    // Y los tres que no tienen destino se ven, bloqueados y con su motivo: un
    // filtro que desaparece deja a quien lo buscaba pensando que algo se rompió.
    /* Un `text` bloqueado se dibuja `readOnly` —sigue siendo enfocable y
       copiable— y un `sel` bloqueado, `disabled`: es lo que hace `Campo`, y
       aquí se comprueba en la forma que a cada uno le toca. */
    for (const etiqueta of ['Nº anuncio — serie', 'Nº anuncio — número']) {
      expect(screen.getByLabelText(etiqueta), `«${etiqueta}» bloqueado`).toHaveAttribute(
        'readonly',
      );
    }
    expect(screen.getByLabelText('Estado')).toBeDisabled();
    expect(document.body.textContent).toMatch(/el padrón no se acota por número de autorización/i);
    expect(document.body.textContent).toMatch(/no admite ningún filtro de estado/i);
  });

  it('anuncios_reportes emite el padrón y su resumen sale con la fecha de corte', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/autorizaciones-y-licencias/anuncios-reportes');
    await screen.findByRole('heading', { name: 'Criterios' });

    await usuario.click(primariaDeLaPantalla());

    const tabla = await screen.findByRole('table');
    await waitFor(() => expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(1));
    // El recuento y el devengado los publica el servidor sobre todo el
    // criterio, y los dos llevan la fecha de corte (regla 9, RNF-075).
    expect(document.body.textContent).toMatch(/autorización\(es\).*devengados, al 2026-08-13/);
  });

  it('licencia_padron sólo ofrece los valores que el enumerado tiene, y nombra los cinco que no', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-padron');
    await screen.findByRole('heading', { name: 'Criterios' });

    const opcionesDe = (etiqueta: string): string[] =>
      [...(screen.getByLabelText(etiqueta) as HTMLSelectElement).options]
        .map((opcion) => opcion.textContent ?? '')
        .filter((texto) => texto !== '');

    /* `EstadoDeLicencia` (V37) declara VIGENTE, VENCIDA y CANCELADA; el
       desplegable del manual ofrece ACTIVA, CANCELADA, DUPLICADA, VENCIDA y
       TODAS. Se ofrecen los que existen letra por letra —más «TODAS», que el
       backend traduce a «sin filtro»— y **no se traduce ninguno**: «ACTIVA» se
       parece a VIGENTE, y parecerse no es serlo. */
    expect(opcionesDe('Estado')).toEqual(['CANCELADA', 'VENCIDA', 'TODAS']);
    expect(opcionesDe('Tipo Lic.')).toEqual(['(TODOS)', 'TEMPORAL']);

    // Y los cinco que quedan fuera se nombran, en vez de desaparecer.
    for (const fuera of ['ACTIVA', 'DUPLICADA', 'INDETERMINADA', 'CESIONARIO', 'MERCADO']) {
      expect(document.body.textContent, `«${fuera}» sin decir dónde está`).toContain(`«${fuera}»`);
    }
  });

  it('licencia_padron no dibuja las tres secciones que el backend no sabe hacer, y lo dice', async () => {
    montarEnRuta('/autorizaciones-y-licencias/licencia-padron');
    await screen.findByRole('heading', { name: 'Criterios' });

    // `PeticionDeReporteDeLicencias` no tiene ni un campo de agrupación, y el
    // controlador pagina con `ordenarPor` en `null`.
    for (const etiqueta of ['Agrupar', 'Subagrupar', 'Ordenar', 'Criterio']) {
      expect(screen.queryByLabelText(etiqueta), `«${etiqueta}» no debería dibujarse`).toBeNull();
    }
    expect(document.body.textContent).toMatch(/sin agrupar y ordenado por número de licencia/i);
  });

  it('licencia_padron emite, y sus cuatro recuentos salen como vienen, con su fecha', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/autorizaciones-y-licencias/licencia-padron');
    await screen.findByRole('heading', { name: 'Criterios' });

    await usuario.click(primariaDeLaPantalla());

    const tabla = await screen.findByRole('table');
    await waitFor(() => expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(1));
    expect(document.body.textContent).toMatch(
      /licencia\(s\) al 2026-08-13 · \d+ vigentes · \d+ vencidas · \d+ canceladas/,
    );
  });
});

/**
 * **El certificado, que ahora emite** (#427, sobre #421 y #422).
 *
 * Necesitaba las tres declaraciones a la vez: cuál botón emite, dónde se teclea
 * el recibo del derecho de trámite, y cómo se resuelve el solicitante —que es un
 * **código** y la pantalla teclea como nombre—.
 */
describe('certificados emite, con su recibo y su solicitante resuelto (#427)', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  const laObservacion = async (): Promise<HTMLElement> =>
    within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
      'Observación',
    );

  it('el recibo del derecho de trámite se dibuja con su propia etiqueta, sin reescribir ninguna', async () => {
    montarEnRuta('/autorizaciones-y-licencias/certificados');
    await screen.findByRole('button', { name: 'Emitir' });

    expect(screen.getByLabelText('Nº de recibo del derecho de trámite')).not.toHaveAttribute(
      'readonly',
    );
    // No reescribe ninguna etiqueta del manual (RNF-080): «Nº de expediente»
    // sigue siendo el suyo y sigue dibujado.
    expect(screen.getByLabelText('Nº de expediente')).toBeInTheDocument();
  });

  it('sin el recibo, la primaria dice que falta y no se puede pulsar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/autorizaciones-y-licencias/certificados');
    await screen.findByRole('button', { name: 'Emitir' });

    await usuario.selectOptions(screen.getByLabelText('Tipo de certificado'), 'NUMERACIÓN');
    await usuario.type(screen.getByLabelText('Código predial'), '02-014-D-14-01');
    await elegirSolicitante(usuario);
    await usuario.type(await laObservacion(), 'Solicitud presentada en ventanilla.');

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/número del recibo del derecho de trámite/i);
  });

  it('los dos tipos que consignan parámetros urbanísticos no se emiten aquí, y lo dicen', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/autorizaciones-y-licencias/certificados');
    await screen.findByRole('button', { name: 'Emitir' });

    await usuario.selectOptions(
      screen.getByLabelText('Tipo de certificado'),
      'ZONIFICACIÓN Y VÍAS',
    );
    await usuario.type(await laObservacion(), 'Solicitud presentada en ventanilla.');

    /* Los cinco parámetros son `"ro"` en el catálogo y el papel imprime «Este
       certificado no consigna parámetros urbanísticos» cuando llegan vacíos:
       emitirlo sería gastar el correlativo en un papel que no certifica nada. */
    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/consigna la zonificación, la altura máxima/i);
    // Los cinco son `"ro"` en el catálogo, y `Campo` dibuja lo `ro` como un
    // `<output>`: no se teclea nunca, diga lo que diga `escrituras.ts`.
    for (const etiqueta of ['Zonificación', 'Altura máxima permitida']) {
      expect(screen.getByLabelText(etiqueta).tagName).toBe('OUTPUT');
    }
  });

  it('con todo relleno manda el código del solicitante, no el nombre, y sólo lo declarado', async () => {
    const usuario = userEvent.setup();
    const peticiones = unaApiQueRegistraLaEmision();
    montarEnRuta('/autorizaciones-y-licencias/certificados');
    await screen.findByRole('button', { name: 'Emitir' });

    await usuario.selectOptions(screen.getByLabelText('Tipo de certificado'), 'NUMERACIÓN');
    await usuario.type(screen.getByLabelText('Código predial'), '02-014-D-14-01');
    await usuario.type(screen.getByLabelText('Nº de expediente'), 'EXP-2026-000914');
    await usuario.type(screen.getByLabelText('Nº de recibo del derecho de trámite'), '001-0000123');
    const codigo = await elegirSolicitante(usuario);
    await usuario.type(await laObservacion(), 'Solicitud presentada en ventanilla.');

    primariaEncendida();
    await usuario.click(primariaDeLaPantalla());

    /* Emitir es irreversible —consume un correlativo y entrega un papel que V51
       no deja corregir—, así que no sale hasta confirmar. */
    expect(peticiones).toHaveLength(0);
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones[0]?.url).toContain('/licencias/certificados');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      // Sin tildes y con el guion bajo: `TipoDeCertificado` del backend.
      tipoDeCertificado: 'NUMERACION',
      codigoPredial: '02-014-D-14-01',
      nDeExpediente: 'EXP-2026-000914',
      // **El código, no el nombre**: `PeticionDeCertificado.solicitante` se
      // resuelve con `contribuyentes.porCodigo(...)`, y el prototipo teclea ahí
      // un nombre. Es el defecto que el resolutor cierra.
      solicitante: codigo,
      nDeRecibo: '001-0000123',
      observacion: 'Solicitud presentada en ventanilla.',
    });
  });
});

/** Busca en el padrón y elige al primer contribuyente. Devuelve su código. */
async function elegirSolicitante(usuario: ReturnType<typeof userEvent.setup>): Promise<string> {
  await usuario.type(screen.getByLabelText('Solicitante'), 'VAL');
  const lista = await screen.findByRole('list', {}, { timeout: 3000 });
  const candidato = within(lista).getAllByRole('button')[0] as HTMLElement;
  const codigo = candidato.querySelector('.sgtm-asistente__codigo')?.textContent ?? '';
  await usuario.click(candidato);
  await screen.findByRole('button', { name: 'Cambiar el solicitante resuelto' });
  return codigo;
}

/** Registra sólo la escritura: las lecturas siguen yendo al proxy de datos. */
function unaApiQueRegistraLaEmision(): { url: string; metodo: string; cuerpo: string }[] {
  const peticiones: { url: string; metodo: string; cuerpo: string }[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const metodo = opciones?.method ?? 'GET';
    if (metodo === 'GET') return anterior(entrada, opciones);
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo,
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return Promise.resolve(
      new Response(JSON.stringify({ nCertificado: 'CN-2026-000123' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
  return peticiones;
}
