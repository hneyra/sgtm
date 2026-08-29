import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { agruparMiles } from '@sgtm/dominio';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { SIN_DATO, leerPaginado } from '../seguridad/listado';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaDeLaPantalla } from '../../pruebas/acciones';
import { ACTOS_SIN_CAMPO, impedimentoDelActo } from '../actos';

/**
 * Transito (#77): el modulo mas grande del menu, y **trece reportes**.
 *
 * La tentacion de este modulo es escribir trece pantallas de reporte. Lo que
 * hay es **un** bloque de hoja parametrizado al que se le conectan trece
 * operaciones, y eso no es una preferencia de estilo: trece copias divergen a
 * la primera correccion, y la hoja que sale de la municipalidad con firma no
 * puede depender de cual de las trece se toco por ultima vez (RNF-081,
 * RNF-084).
 *
 * De sus veintitres endpoints, veintiuno estan conectados desde #363/#77 —ver
 * `pantallas/transito/index.ts`—: trece lecturas y las dos escrituras propias
 * (`transito_cambio_numero`, `transito_valores`). Cuatro escrituras se quedan
 * en `ACTOS_SIN_CAMPO` (`pantallas/actos.ts`), y dos resumenes —
 * `transito_resumen_recaudacion`, `transito_resumen_papeletas`— sin conectar
 * porque su catalogo no encaja con ningun agrupador real de
 * `AgrupacionDelResumen`. `transito_reportes` y `transito_papeleta_reporte`
 * no tienen `Controller` todavia.
 */

/** Las seis pantallas del modulo que son hoja de reporte. */
const HOJAS: readonly string[] = [
  'transito-record-conductor',
  'transito-record-vehicular',
  'transito-constancia-libre',
  'transito-papeleta-reporte',
  'transito-rg-ordinaria',
  'transito-rg-sancionadora',
];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('las trece hojas son la misma hoja', () => {
  it.each(HOJAS)('%s se dibuja con el bloque de hoja compartido', async (ranura) => {
    const montada = montarEnRuta(`/transito/${ranura}`);
    await dibujada('[data-hoja="1"]');

    const hoja = document.querySelector('[data-hoja="1"]');
    expect(hoja).not.toBeNull();

    // Las dos lineas de firma son lo que convierte la hoja en un documento, y
    // las trae el bloque: si una pantalla tuviera su propia copia, podria
    // perderlas sin que nadie se enterara.
    const firmas = hoja?.querySelector('.sgtm-hoja__firmas');
    expect(firmas?.textContent).toContain('Contribuyente');

    montada.unmount();
  });

  it.each(HOJAS)('%s no imprime la barra de acciones', async (ranura) => {
    const montada = montarEnRuta(`/transito/${ranura}`);
    await dibujada('[data-hoja="1"]');

    // Lo que no es la hoja va marcado, y la regla de impresion lo esconde. Sin
    // la marca, el papel que sale de la municipalidad lleva botones dibujados.
    const botones = document.querySelector('.sgtm-hoja__botones');
    expect(botones).not.toBeNull();
    expect(botones?.getAttribute('data-no-imprimible')).toBe('1');

    montada.unmount();
  });
});

/**
 * Las trece lecturas conectadas con `definirConexion` (registran una
 * `Conexion`, que es lo que cuenta `OPCIONES_CONECTADAS`). Las dos escrituras
 * propias —`transito_cambio_numero`, `transito_valores`— no tienen `GET`, así
 * que no pasan por ahí: viven en `COMPONENTES_PROPIOS` y se comprueban aparte.
 */
const LAS_TRECE_LECTURAS: readonly string[] = [
  'papeletas',
  'transito_busqueda',
  'transito_estado_cuenta',
  'codigos_transito',
  'internamiento',
  'transito_documentos',
  'transito_padron',
  'transito_padron_coactiva',
  'transito_padron_constancias',
  'transito_record_conductor',
  'transito_record_vehicular',
  'transito_resumen_codigo',
  'transito_resumen_placa',
];

describe('el modulo conectado hasta donde llega el backend (#77)', () => {
  it('las trece lecturas con Controller estan en el registro', () => {
    for (const opcion of LAS_TRECE_LECTURAS) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
  });

  it('los dos resumenes que no encajan con ningun agrupador real siguen sin conectar', () => {
    expect(OPCIONES_CONECTADAS).not.toContain('transito_resumen_recaudacion');
    expect(OPCIONES_CONECTADAS).not.toContain('transito_resumen_papeletas');
  });

  it('las dos opciones sin Controller siguen sin conectar', () => {
    expect(OPCIONES_CONECTADAS).not.toContain('transito_reportes');
    expect(OPCIONES_CONECTADAS).not.toContain('transito_papeleta_reporte');
  });
});

describe('papeletas lee PapeletaResource, conectada desde #363', () => {
  it('cada fila es una papeleta, y lo que PapeletaResource no publica sale vacio', async () => {
    montarEnRuta('/transito/papeletas');
    // Se espera a una **fila con datos**, no a que exista la tabla: la tabla
    // existe desde el catalogo, con su esqueleto, y esperar a ella dejaria la
    // comprobacion mirando celdas vacias (#76).
    const fila = (await screen.findByText('MPS-2026-041182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'MPS-2026-041182',
      // La fecha de infraccion, tal como la publica el recurso (LocalDate ISO),
      // no el «02/08/2026» del catalogo del prototipo.
      '2026-08-02',
      'T2G-418',
      // Infractor, Codigo y Gravedad: PapeletaResource no los publica (ver
      // pantallas/transito/index.ts).
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      // El importe se determino el dia de la infraccion con los parametros de
      // ese dia (`importeAPagar`, «tal cual del acta fisica»): no se recalcula
      // ni se reformatea con separador de miles, que es como lo sirve el
      // backend de verdad.
      '535.00',
      // El estado es el nombre literal de EstadoDePapeleta, no la etiqueta del
      // prototipo: «Pendiente» no es ningun valor del enum (ver el mock).
      'IMPUESTA',
    ]);
  });

  it('el «Estado» nunca es una etiqueta que EstadoDePapeleta no reconoce', async () => {
    montarEnRuta('/transito/papeletas');

    const tabla = await screen.findByRole('table');
    const dentroDeLaTabla = within(tabla);

    // Las cuatro filas del mock, con su estado ya en el vocabulario del
    // backend: «Pendiente» y «Con descargo» —que no son valores del enum—
    // colapsan en `IMPUESTA`/`RESUELTA`.
    for (const invalido of ['Pendiente', 'Con descargo', 'Pagada', 'Coactiva']) {
      expect(dentroDeLaTabla.queryByText(invalido)).not.toBeInTheDocument();
    }
    expect(dentroDeLaTabla.getByText('IMPUESTA')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('RESUELTA')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('PAGADA')).toBeInTheDocument();
    expect(dentroDeLaTabla.getByText('COACTIVA')).toBeInTheDocument();
  });

  it('una respuesta que no es un listado paginado se para en voz alta, no una tabla vacia', () => {
    // La forma que el proxy servia antes de #363 —`DatosDePantalla`, con
    // `tabla.filas` y sin `contenido`— es exactamente la que tiene que fallar
    // aqui, y no dibujarse como una tabla vacia en silencio (issue #363).
    expect(() =>
      leerPaginado(
        { fechaCalculo: '2026-08-13', tabla: { filas: [] } },
        'las papeletas de tránsito',
      ),
    ).toThrow(/no trae un listado paginado/);
    expect(
      leerPaginado({ contenido: [], totalElementos: 0 }, 'las papeletas de tránsito').contenido,
    ).toEqual([]);
  });
});

describe('transito_busqueda lee el mismo PapeletaResource, con doce columnas (#77)', () => {
  it('numero compone serie+numero, y las siete columnas sin dato salen vacias', async () => {
    montarEnRuta('/transito/transito-busqueda');
    const fila = (await screen.findByText('D007782')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      'D007782',
      'NB-21169',
      '2026-07-01',
      SIN_DATO,
      SIN_DATO,
      '144.00',
      '144.00',
    ]);
  });
});

describe('codigos_transito lee CodigoInfraccionResource (#43, #77)', () => {
  it('«Gravedad» y «Multa S/» salen con SIN_DATO: el recurso no las publica', async () => {
    montarEnRuta('/transito/codigos-transito');
    const fila = (await screen.findByText('M-02')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'M-02',
      'Conducir con presencia de alcohol en la sangre',
      SIN_DATO,
      '0.10',
      SIN_DATO,
      '50',
      'Retención de licencia',
    ]);
  });
});

describe('internamiento lee InternamientoResource, sin importes (#50, #77)', () => {
  it('«Tasa diaria S/» y «Custodia S/» salen con SIN_DATO: son de ordenanza y de caja', async () => {
    montarEnRuta('/transito/internamiento');
    const fila = (await screen.findByText('T2G-418')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'T2G-418',
      'MPS-2026-041182',
      '2026-08-02',
      '11',
      SIN_DATO,
      SIN_DATO,
      'INTERNADO',
    ]);
  });
});

describe('transito_documentos abre el expediente por el numero de la ruta (#50, #77)', () => {
  it('solo el numero de papeleta llega: el resto del expediente no lo publica ExpedienteResource', async () => {
    montarEnRuta('/transito/transito-documentos/C2007005161');
    await screen.findByText('C2007005161');
    // Placa, infraccion, obligado, domicilio, documento: nada de eso viaja en
    // `ExpedienteResource`, y el catalogo del prototipo no puede rellenarlo.
    const sinDato = screen.getAllByText(SIN_DATO);
    expect(sinDato.length).toBeGreaterThan(0);
  });
});

describe('transito_padron lee PapeletaDelPadronResource (#53, #77)', () => {
  it('«Importe S/» sale con SIN_DATO: el recurso solo publica el importe a pagar', async () => {
    montarEnRuta('/transito/transito-padron');
    const fila = (await screen.findByText('C2026004182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'C2026004182',
      '2026-08-02',
      'T2G-418',
      'CASTILLO PASCUALA, M.',
      'M-20',
      SIN_DATO,
      '123.60',
      'IMPUESTA',
    ]);
  });
});

describe('transito_padron_coactiva: toda fila sale COACTIVA (#53, #77)', () => {
  it('«Expediente» y «Fec. pase» salen con SIN_DATO: son del contexto coactiva, todavia vacio', async () => {
    montarEnRuta('/transito/transito-padron-coactiva');
    const fila = (await screen.findByText('C2022006230')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      SIN_DATO,
      'C2022006230',
      SIN_DATO,
      'NB-21169',
      'SERNAQUE VILLEGAS, D.',
      '34.00',
      'COACTIVA',
    ]);
  });
});

describe('transito_padron_constancias lee ConstanciaLibreResource (#53, #77)', () => {
  it('«Solicitante», «Recibo» e «Importe S/» salen con SIN_DATO: la constancia no cobra nada', async () => {
    montarEnRuta('/transito/transito-padron-constancias');
    const fila = (await screen.findByText('000742-2026')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      '000742-2026',
      '2026-08-13',
      'B7T-221',
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      'VRETO',
    ]);
  });
});

describe('los dos records viven como hoja, con PapeletaDelPadronResource paginado (#53, #77)', () => {
  it('record de conductor: la placa es la tercera columna', async () => {
    montarEnRuta('/transito/transito-record-conductor?licencia=Q-44218937');
    await dibujada('[data-hoja="1"]');
    const hoja = document.querySelector('[data-hoja="1"]') as HTMLElement;
    await within(hoja).findByText('D2026007782');
    const fila = within(hoja).getByText('D2026007782').closest('tr');
    expect(fila).not.toBeNull();
    expect(
      within(fila as HTMLElement)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['D2026007782', '2026-07-01', 'NB-21169', 'OM F-16', '144.00', 'PAGADA']);
    // La licencia pedida viaja en la meta de la hoja, no un codigo inventado.
    expect(hoja.textContent).toContain('Q-44218937');
  });

  it('record vehicular: el conductor es la tercera columna', async () => {
    montarEnRuta('/transito/transito-record-vehicular?placa=NB-21169');
    await dibujada('[data-hoja="1"]');
    const hoja = document.querySelector('[data-hoja="1"]') as HTMLElement;
    await within(hoja).findByText('D2026007782');
    const fila = within(hoja).getByText('D2026007782').closest('tr');
    expect(fila).not.toBeNull();
    expect(
      within(fila as HTMLElement)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual([
      'D2026007782',
      '2026-07-01',
      'SERNAQUE VILLEGAS, D.',
      'OM F-16',
      '144.00',
      'PAGADA',
    ]);
  });
});

describe('los dos resumenes que encajan con un agrupador real (#53, #77)', () => {
  it('resumen por codigo: clave y descripcion salen del recurso, sin pivotar nada', async () => {
    montarEnRuta('/transito/transito-resumen-codigo');
    const fila = (await screen.findByText('M-20')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Las tablas agrupan millares al dibujar (#342): las celdas >999 llevan el
    // separador de `agruparMiles`.
    expect(celdas.map((c) => c.textContent)).toEqual([
      'M-20',
      'Conducir en estado de ebriedad',
      '18',
      agruparMiles('14842.00'),
      '42',
      agruparMiles('34180.00'),
    ]);
  });

  it('resumen por placa: clave son las iniciales, y «Papeletas» es el total del recurso', async () => {
    montarEnRuta('/transito/transito-resumen-placa');
    const fila = (await screen.findByText('NB')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'NB',
      '412',
      '118',
      agruparMiles('18412.00'),
      '294',
      agruparMiles('41180.00'),
    ]);
  });
});

/** Como `unaApiQueRegistraLasPeticiones` de `valores.test.tsx`, para las dos componentes propias. */
function unaApiQueRegistraLasPeticiones(
  cuerpoDeRespuesta: unknown = { id: 1 },
): { url: string; metodo: string; cuerpo: string }[] {
  const peticiones: { url: string; metodo: string; cuerpo: string }[] = [];
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return Promise.resolve(
      new Response(JSON.stringify(cuerpoDeRespuesta), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
  return peticiones;
}

describe('transito_cambio_numero vive en su propio componente porque «Salir» no corrige nada (#77)', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  it('sin numero de papeleta, pide elegir una y no dibuja ninguna accion', async () => {
    montarEnRuta('/transito/transito-cambio-numero');
    await screen.findByText('Elige una papeleta para corregir su número');
    expect(screen.queryByRole('button', { name: /^Cambiar/ })).not.toBeInTheDocument();
  });

  it('con la papeleta abierta, la primaria pide observación y manda solo numeroNuevo', async () => {
    const usuario = userEvent.setup();
    const peticiones = unaApiQueRegistraLasPeticiones();
    montarEnRuta('/transito/transito-cambio-numero/D007782');
    await dibujada('.sgtm-acciones');

    // Sin escribir nada, la primaria sigue apagada: falta la observacion.
    primariaApagada();

    const nuevo = screen.getByLabelText('Cod. papeleta nueva');
    await usuario.type(nuevo, 'D007999');
    const observacion = within(
      await screen.findByRole('region', { name: 'Observación del usuario' }),
    ).getByLabelText('Observación');
    await usuario.type(observacion, 'Error del operador al digitar el número.');

    /* Cambiar el numero de un documento oficial no se deshace: entra al
       patron de lo irreversible (regla 4) y se confirma diciendo que va a
       pasar — la primera version mandaba el PATCH al primer clic, y la
       validacion de seguridad de #389 lo señalo. */
    await usuario.click(primariaDeLaPantalla());
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('PATCH');
    expect(peticiones[0]?.url).toContain('/transito/papeletas/D007782/codigo');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      numeroNuevo: 'D007999',
      observacion: 'Error del operador al digitar el número.',
    });
  });
});

describe('transito_valores vive en su propio componente porque «Imprimir» no genera nada (#53, #77)', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  it('sin las dos fechas, la primaria no se habilita', async () => {
    montarEnRuta('/transito/transito-valores');
    await dibujada('.sgtm-acciones');
    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/fecha de inicio y la fecha de fin/i);
  });

  it('con el rango completo, manda solo desde/hasta y la observación', async () => {
    const usuario = userEvent.setup();
    const peticiones = unaApiQueRegistraLasPeticiones({ id: 1, totalCandidatos: 7 });
    montarEnRuta('/transito/transito-valores');
    await dibujada('.sgtm-acciones');

    fireEvent.change(screen.getByLabelText('Fec. inicio'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Fec. fin'), { target: { value: '2026-08-13' } });
    const observacion = within(
      await screen.findByRole('region', { name: 'Observación del usuario' }),
    ).getByLabelText('Observación');
    await usuario.type(observacion, 'Corrida del mes de agosto.');

    // «Generar valor…» es irreversible (regla 4): se confirma diciendo que va
    // a pasar, no con un «¿estas seguro?».
    await usuario.click(primariaDeLaPantalla());
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('POST');
    expect(peticiones[0]?.url).toContain('/transito/valores/generacion-masiva');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      desde: '2026-06-01',
      hasta: '2026-08-13',
      observacion: 'Corrida del mes de agosto.',
    });

    /* Y el conteo se ENSENA, no solo viaja: el criterio de aceptacion de #77
       pide decir cuantos se van a generar, la respuesta trae `totalCandidatos`
       y la primera version de esta prueba solo miraba la peticion — el
       recorrido en Chromium de la validacion de #389 encontro la pantalla
       muda con la prueba en verde. */
    expect(await screen.findByText(/El servidor cuenta 7 candidato/)).toBeInTheDocument();
  });
});

describe('las cuatro opciones sin campo donde escribir el dato que el backend exige (#77)', () => {
  it('transito_descargos: falta el numero de expediente, de solo lectura en el catalogo', () => {
    expect(ACTOS_SIN_CAMPO['transito_descargos']).toBeDefined();
    expect(
      impedimentoDelActo('transito_descargos', [
        'Registrar descargo',
        'Resolver',
        'Notificar al administrado',
      ])?.causa,
    ).toBe('sin-campo');
  });

  it('transito_constancia_libre, transito_rg_ordinaria y transito_rg_sancionadora: sin ninguna sección', () => {
    for (const opcion of [
      'transito_constancia_libre',
      'transito_rg_ordinaria',
      'transito_rg_sancionadora',
    ]) {
      expect(ACTOS_SIN_CAMPO[opcion]).toBeDefined();
      expect(impedimentoDelActo(opcion, [])?.causa).toBe('sin-campo');
    }
  });
});
