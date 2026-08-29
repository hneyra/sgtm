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
import { FILTROS_BLOQUEADOS } from '../composicion';
import { FILTROS_CON_MOTIVO } from '../prosa-textos';

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
 * De sus veintitres endpoints, veintidos estan conectados —ver
 * `pantallas/transito/index.ts`—: **dieciseis lecturas** (las trece de
 * #363/#77 mas los dos resumenes que #398 desbloqueo y la hoja informativa de
 * #396) y las dos escrituras propias (`transito_cambio_numero`,
 * `transito_valores`). Cuatro escrituras se quedan en `ACTOS_SIN_CAMPO`
 * (`pantallas/actos.ts`).
 *
 * El unico que sigue sin conectar es `transito_reportes`, y ya no por falta de
 * `Controller` —#396 lo publico—: es un `POST`, y ninguna de las dos puertas
 * que el frontend tiene para uno le sirve. Ver el docblock de
 * `pantallas/transito/index.ts`.
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
 * Las dieciseis lecturas conectadas con `definirConexion` (registran una
 * `Conexion`, que es lo que cuenta `OPCIONES_CONECTADAS`). Las dos escrituras
 * propias —`transito_cambio_numero`, `transito_valores`— no tienen `GET`, así
 * que no pasan por ahí: viven en `COMPONENTES_PROPIOS` y se comprueban aparte.
 */
const LAS_LECTURAS: readonly string[] = [
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
  // #398 — los dos que el backend no podia servir honestamente hasta ahora.
  'transito_resumen_papeletas',
  'transito_resumen_recaudacion',
  // #396 — la hoja informativa, que hasta ahora no tenia `Controller`.
  'transito_papeleta_reporte',
];

describe('el modulo conectado hasta donde llega el backend (#77, #396, #398)', () => {
  it('las dieciseis lecturas con Controller estan en el registro', () => {
    for (const opcion of LAS_LECTURAS) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
  });

  it('el emisor de reportes sigue sin conectar, y ya no por falta de Controller', () => {
    // `POST /transito/reportes` existe desde #396. Lo que falta es la puerta:
    // `useEscritura` exige observacion (regla 10) y este emisor no modifica
    // nada; `useSimulacion` exige `simulacion: true` en el cuerpo, una marca
    // que `PeticionDeReporteDeTransito` no puede declarar sin mentir; y una
    // `Conexion` dispararia el `POST` al abrir la pantalla, sin tipo de
    // reporte elegido. Ver el docblock de `pantallas/transito/index.ts`.
    expect(OPCIONES_CONECTADAS).not.toContain('transito_reportes');
  });

  it('los cinco filtros que no se pueden servir se dibujan bloqueados, con su motivo', () => {
    const bloqueados = FILTROS_BLOQUEADOS.filter(({ opcion }) =>
      opcion.startsWith('transito_resumen_'),
    );

    expect(bloqueados.map(({ opcion, campo }) => `${opcion}.${campo}`)).toEqual([
      'transito_resumen_papeletas.agrupadoPor',
      'transito_resumen_papeletas.cobranza',
      'transito_resumen_recaudacion.agrupadoPor',
      'transito_resumen_recaudacion.tipoDeCobranza',
      'transito_resumen_recaudacion.caja',
    ]);
    // Un filtro bloqueado sin motivo se lee como una pantalla rota: los dos
    // huecos que abre separar las listas son mudos (`prosa-textos.ts`).
    for (const { opcion, campo } of bloqueados) {
      expect(FILTROS_CON_MOTIVO).toContain(`${opcion}.${campo}`);
    }
  });
});

describe('los dos resumenes que #398 desbloqueo', () => {
  it('la columna «Año» del resumen de papeletas sale con un año, no con un estado', async () => {
    montarEnRuta('/transito/transito-resumen-papeletas');
    const fila = (await screen.findByText('2025')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');

    // `Linea.ano`, no `Linea.clave`: con `ANO` coinciden —y ese es el punto—,
    // pero el campo que promete un año es `ano` (RNF-080).
    expect(celdas.map((c) => c.textContent)).toEqual([
      '2025',
      '388',
      agruparMiles('76410.00'),
      agruparMiles('1042'),
      agruparMiles('162180.40'),
      '92',
      agruparMiles('32118.00'),
    ]);
  });

  it('la lectura pide siempre agrupadoPor=ANO, aunque la URL traiga otra cosa', async () => {
    const pedidas: string[] = [];
    const original = globalThis.fetch;
    const espia = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      pedidas.push(typeof entrada === 'string' ? entrada : String(entrada));
      return espia(entrada, opciones);
    };
    try {
      montarEnRuta('/transito/transito-resumen-papeletas?agrupadoPor=ESTADO');
      await screen.findByText('2025');
    } finally {
      globalThis.fetch = original;
    }

    const suya = pedidas.filter((url) => url.includes('/transito/reportes/resumen-papeletas'));
    expect(suya).not.toHaveLength(0);
    // Sin esto, la primera columna —que dice «Año»— se llenaria de nombres de
    // estado, que es exactamente lo que #398 existe para impedir.
    expect(suya.every((url) => url.includes('agrupadoPor=ANO'))).toBe(true);
    expect(suya.some((url) => url.includes('agrupadoPor=ESTADO'))).toBe(false);
  });

  it('«Total S/» sale del recurso, y «Papeletas pagadas» sale vacia: un abono no es una papeleta', async () => {
    montarEnRuta('/transito/transito-resumen-recaudacion');
    // Dentro de la tabla: «Enero» tambien es una opcion del desplegable «Mes»
    // que el prototipo dibuja en la barra de filtros.
    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('Enero')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');

    expect(celdas.map((c) => c.textContent)).toEqual([
      'Enero',
      agruparMiles('18412.00'),
      agruparMiles('4120.00'),
      agruparMiles('2180.00'),
      // Una papeleta se puede pagar en varios abonos y un recibo puede abonar
      // varias: `abonos` no es «papeletas pagadas».
      SIN_DATO,
      // Del `total` que compone el servidor, no de sumar las tres columnas
      // (RNF-083).
      agruparMiles('24712.00'),
    ]);
  });
});

describe('«Total S/» es el del servidor, tambien cuando no es la suma de lo dibujado', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  /**
   * El caso real que el mock no puede publicar sin contradecir al prototipo: el
   * libro tiene **cuatro** fases y el manual dibuja tres. Lo cobrado de una
   * papeleta con su resolucion de multa ya emitida cae en `VALOR`, y ni se
   * reparte entre las tres columnas —seria inventar un reparto— ni se deja
   * fuera del total —seria publicar menos recaudacion de la que hubo—.
   *
   * Sin esta prueba, sumar las tres columnas en la interfaz pasaria en verde:
   * en el juego de datos del prototipo la columna «Total S/» **coincide** con
   * la suma de las otras tres, y la regla de ESLint de RNF-083 mira nombres de
   * campo de dinero —`total`, `importe`, `monto`—, no el `texto` de una celda.
   */
  it('un mes con fase VALOR dibuja el total del recurso, no la suma de las tres columnas', async () => {
    const conFaseValor = {
      desde: '2026-01-01',
      hasta: '2026-12-31',
      total: '1500.00',
      abonos: 4,
      actualizadoA: '2026-08-13',
      lineas: [],
      porMes: [
        {
          mes: 3,
          porFase: [
            { fase: 'ORDINARIA', recaudado: '400.00', abonos: 1, actualizadoA: '2026-08-13' },
            { fase: 'COACTIVA', recaudado: '300.00', abonos: 1, actualizadoA: '2026-08-13' },
            { fase: 'CONVENIO', recaudado: '200.00', abonos: 1, actualizadoA: '2026-08-13' },
            { fase: 'VALOR', recaudado: '600.00', abonos: 1, actualizadoA: '2026-08-13' },
          ],
          total: '1500.00',
          abonos: 4,
          actualizadoA: '2026-08-13',
        },
      ],
    };
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify(conFaseValor), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    montarEnRuta('/transito/transito-resumen-recaudacion');
    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('Marzo')).closest('tr');
    const celdas = within(fila as HTMLElement).getAllByRole('cell');

    expect(celdas.map((c) => c.textContent)).toEqual([
      'Marzo',
      '400.00',
      '300.00',
      '200.00',
      SIN_DATO,
      // 400 + 300 + 200 = 900, y lo recaudado del mes fueron 1 500: los 600 de
      // la fase VALOR no tienen columna en el manual y aun asi son dinero que
      // entro.
      agruparMiles('1500.00'),
    ]);
  });
});

describe('la hoja informativa de una papeleta (#396)', () => {
  it('se dibuja con los cinco conceptos del acta, y su fecha es la de la infraccion', async () => {
    montarEnRuta('/transito/transito-papeleta-reporte/C2025002635');

    await screen.findByText('Base imponible');
    const hoja = document.querySelector('[data-hoja="1"]');
    expect(hoja).not.toBeNull();

    // El detalle sale del recurso, no del catalogo del prototipo.
    expect(hoja?.textContent).toContain('DS F1');
    expect(hoja?.textContent).toContain('Porcentaje a cobrar');
    // Los importes son los del acta: la hoja los fecha el dia de la
    // infraccion, no el de hoy (regla 9).
    expect(hoja?.textContent).toContain('2025-04-12');
    // Y el pie del prototipo —«dentro de los cinco días hábiles»— no se copia:
    // ese plazo es un parametro normativo (regla 5, #192).
    expect(hoja?.textContent).not.toContain('cinco días hábiles');
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
      // `porcentajeUit` es una `Alicuota`, y una alicuota va en tanto por
      // ciento (0..100): el «10 %» del prototipo es 10.00, no 0.10 (#397).
      '10.00',
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
