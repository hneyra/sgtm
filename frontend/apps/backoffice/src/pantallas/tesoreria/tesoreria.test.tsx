import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { censoDeConectadas } from '../aportes-de-modulo';
import { permisosDelClaim, puedeVer } from '@sgtm/sesion';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';
import { ACTOS_SIN_CAMPO } from '../actos';
import { OPERACIONES } from '@sgtm/api-client';

/* El censo de conectadas del catalogo entero, SIN registrar ninguna: desde #433 las
   conexiones llegan con el trozo de su modulo, y quien las registra es la espera de
   `Pantalla`. Registrarlas aqui dejaria a este archivo tapandose a si mismo —sus
   pantallas encontrarian su conexion aunque el renderizador no la hubiera pedido—. */
const OPCIONES_CONECTADAS = await censoDeConectadas();

/**
 * Tesorería (#74): **donde el sistema se usa a diario y donde un clic de más se
 * paga cien veces al día** (FRO-03 §6).
 *
 * Backend servido para las diez opciones (#33–#36), y de ahí no se sigue que las
 * diez lean o escriban ya de verdad. Lo que se comprueba aquí:
 *
 * - `consulta_convenios`, `duplicado_recibo`, `avance_recaudacion` y
 *   `recaudacion_area` **leen** el recurso que publica el backend.
 * - `caja_tributaria` lee su grilla de deuda real, aunque su cobro siga sin
 *   poder guardarse.
 * - `anulacion_recibo` **escribe**, con el número de recibo que trae la URL,
 *   la observación como condición de guardado, la confirmación de lo
 *   irreversible y una petición por pulsación.
 * - `caja_tasas` y `fraccionamiento` siguen sin poder guardar, y ahora lo
 *   dicen nombrando el dato que falta (#332, `ACTOS_SIN_CAMPO`) en vez del
 *   genérico «esta pantalla aún no manda estos campos».
 */

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});

/* ── Lo que sigue apagado, y ahora dice por qué exactamente ─────────────── */

describe('la caja de tasas no puede cobrar: le faltan los conceptos, no la declaración', () => {
  /**
   * **`caja_tributaria` ya no está aquí** (#430): declara su escritura, y lo que
   * la apaga es lo que le falta al formulario, no un impedimento. Ver el
   * `describe` de abajo, «la caja cobra».
   *
   * Su gemela sigue, y con el hueco más grande de las dos: además del medio de
   * pago, la caja y el cajero, le faltan **los conceptos del TUPA**, y ninguna
   * consulta del sistema publica todavía ese catálogo con su tarifa vigente
   * —`TasaRepository` tiene un solo método, `vigenteA(codigo, fecha)`, y el
   * contrato no declara ningún `GET /tesoreria/tasas`—.
   */
  it('caja de tasas lo dice nombrando el dato, con la causa «sin-campo»', async () => {
    const usuario = userEvent.setup();
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ contenido: [], totalElementos: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    montarEnRuta('/tesoreria/caja-tasas');
    await screen.findByRole('button', { name: /Cobrar/ });

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/conceptos del TUPA/);
    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    // La causa no se pinta: es para quien mantiene el sistema, no para quien
    // atiende (`ImpedimentoDelActo.causa`). Que sea «sin-campo» y no
    // «sin-declaracion» dice cuál de las dos cosas falta.
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-campo',
    );

    await usuario.click(screen.getByRole('button', { name: /Cobrar/ }));
    // Sin escritura declarada no hay ni caja de observación: no hay adónde
    // escribir, y pedirla no habría pedido nada.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();
  });

  it('y nombra los cuatro datos que le faltan, no solo el medio de pago', () => {
    /* La lista es lo que quien mantiene lee para saber que falta sin abrir el
       controlador, y hasta #430 nombraba **uno** de los cuatro. */
    expect(ACTOS_SIN_CAMPO['caja_tasas']?.campos).toEqual([
      'conceptos',
      'formaDePago',
      'caja',
      'cajero',
    ]);
  });

  /**
   * **El censo de la deuda: el catalogo del TUPA no lo publica nadie** (#430).
   *
   * De los cuatro datos que le faltan a `caja_tasas`, tres son controles que se
   * teclean —el medio de pago, la caja, el cajero, exactamente como en
   * `caja_tributaria`— y el cuarto **no se puede teclear**: `PeticionDeConcepto`
   * lleva el **codigo** del concepto y su cantidad, y la tarifa la resuelve el
   * servidor con `TasaRepository.vigenteA(codigo, fecha)`. Sin una lectura que
   * publique el catalogo no hay de donde elegir el codigo.
   *
   * Esta prueba es el censo de esa deuda, con la forma de
   * `EL_MISMO_DESAJUSTE_TODAVIA_ABIERTO` del backend: **se acorta, nunca se
   * alarga sin decir por que**. El dia que la lectura exista se pone roja, y lo
   * que hay que revisar entonces esta escrito en `pantallas/tesoreria/index.ts`
   * —porque publicarla no basta: hace falta que la tabla `tasa` tenga filas, y
   * eso es D-02b fila 29 (#197), no interfaz—.
   */
  it('ninguna operacion del contrato publica el catalogo del TUPA', () => {
    const conTasas = Object.entries(OPERACIONES).filter(([, descriptor]) =>
      descriptor.ruta.includes('tasas'),
    );

    // Una sola, y es el `POST` que **cobra**: no hay ningun `GET` del catalogo.
    expect(conTasas.map(([id]) => id)).toEqual(['caja_tasas']);
    expect(conTasas[0]?.[1].metodo).toBe('POST');
  });

  it('fraccionamiento dice que le falta la grilla de deuda, no un campo suelto', async () => {
    globalThis.fetch = async () => new Response('{}', { status: 404 });
    montarEnRuta('/tesoreria/fraccionamiento');
    await screen.findByRole('button', { name: /Aceptar/ });

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/las deudas que se acogen al convenio/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-campo',
    );
  });
});

describe('el registro de conexiones dice la verdad sobre las diez', () => {
  it('seis leen ya un recurso real; cuatro siguen sin poder', () => {
    for (const opcion of [
      'caja_tributaria',
      'consulta_convenios',
      'duplicado_recibo',
      'avance_recaudacion',
      'recaudacion_area',
      // `cierre_caja` lee el arqueo en vivo de su turno por `avance_recaudacion`
      // (#423), que es lo que la pantalla llama «Cuadrar»: su propia operación es
      // un `POST` y no se pide al abrir.
      'cierre_caja',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
    // `anulacion_recibo` y `anulacion_convenio` escriben (se declaran en
    // `escrituras.ts`) y no tienen conexión propia: no hay ningún `GET` que leer
    // para ellas — las dos se abren por la URL, con su número impreso.
    for (const opcion of [
      'caja_tasas',
      'fraccionamiento',
      'anulacion_recibo',
      'anulacion_convenio',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });
});

describe('SoD-3: la interfaz oculta lo demás; lo que no puede, lo dice', () => {
  it('un cajero ve su caja y no ve el cierre ni la recaudación por área', () => {
    const CAJERO = permisosDelClaim({
      caja_tributaria: ['ejecucion', 'lectura', 'registro'],
      caja_tasas: ['ejecucion', 'lectura', 'registro'],
      anulacion_recibo: ['ejecucion', 'lectura'],
    });

    expect(puedeVer(CAJERO, 'caja_tributaria')).toBe(true);
    expect(puedeVer(CAJERO, 'anulacion_recibo')).toBe(true);
    // Lo que la interfaz **no** puede es distinguir «recibos de mi caja y de
    // hoy» de los demás: el permiso es por opción, no por caja ni por día. Esa
    // mitad de SoD-3 la hace el servidor —`ReciboController.exigirQuePuedaAnularEsteRecibo`,
    // con el privilegio ESPECIAL— y la interfaz no puede fingirla.
    expect(puedeVer(CAJERO, 'cierre_caja')).toBe(false);
    expect(puedeVer(CAJERO, 'recaudacion_area')).toBe(false);
  });
});

/* ── Las cuatro lecturas puras ────────────────────────────────────────── */

const paginado = (contenido: readonly Readonly<Record<string, unknown>>[]) => ({
  contenido,
  pagina: 0,
  tamano: contenido.length,
  totalElementos: contenido.length,
  totalPaginas: 1,
  hayMas: false,
});

function responde(cuerpo: unknown, estado = 200): void {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'content-type': 'application/json' },
    });
}

describe('consulta_convenios lee la fila corta que publica ConvenioController.listar', () => {
  it('la tabla sale del sobre paginado, con las nueve columnas de la grilla', async () => {
    responde(
      paginado([
        {
          nroConvenio: 'F-2026-000123',
          contribuyente: '00000006550',
          fecha: '2026-03-10',
          deudaAcogidaS: '1842.60',
          cuotas: 6,
          pagadas: 2,
          vencidas: 0,
          saldoS: 1228.4,
          estado: 'VIGENTE',
        },
      ]),
    );
    montarEnRuta('/tesoreria/consulta-convenios');

    const fila = (await screen.findByText('F-2026-000123')).closest('tr');
    expect(fila).not.toBeNull();
    // Se busca dentro de la fila y no con `getByText`: «VIGENTE» es también una
    // opción del filtro «Estado» de la búsqueda, y el texto suelto ambiguaria.
    expect(within(fila as HTMLElement).getByText('VIGENTE')).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText('1 842.60')).toBeInTheDocument();
  });

  it('una respuesta que no es un listado paginado se para en voz alta, no con una tabla vacía', async () => {
    // La forma equivocada: un objeto suelto donde `ConvenioController.listar`
    // manda el sobre `{contenido, totalElementos, ...}`.
    responde({ numero: 'F-2026-000123' });
    montarEnRuta('/tesoreria/consulta-convenios');

    expect(await screen.findByText('No se pudieron cargar los datos')).toBeInTheDocument();
  });
});

describe('duplicado_recibo lee un recibo, no un padrón de resultados', () => {
  const RECIBO = {
    estado: 'EMITIDO',
    duplicados: 1,
    anulacion: null,
    recibo: {
      numero: '001-0000123',
      serie: '001',
      correlativo: 123,
      cajero: 'mgarcia',
      formaDePago: 'EFECTIVO',
      tipoDePago: 'NORMAL',
      beneficioDeclarado: null,
      emitidoEn: '2026-08-20T11:44:00Z',
      total: { importe: '1842.60', actualizadoA: '2026-08-20' },
      lineas: [{ tributo: 'PREDIAL', concepto: 'PAGO' }],
    },
  };

  it('la fila única trae fecha, hora, importe y estado del recurso, y contribuyente en blanco', async () => {
    responde(RECIBO);
    montarEnRuta('/tesoreria/duplicado-recibo/001-0000123');

    expect(await screen.findByText('001-0000123')).toBeInTheDocument();
    expect(screen.getByText('2026-08-20')).toBeInTheDocument();
    expect(screen.getByText('11:44')).toBeInTheDocument();
    expect(screen.getByText('PREDIAL')).toBeInTheDocument();
    expect(screen.getByText('1 842.60')).toBeInTheDocument();
    expect(screen.getByText('1 recibo')).toBeInTheDocument();
    // `ReciboResource` no publica ni el código ni el nombre de quien pagó.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('el registro es el de la URL, no el filtro «Nro. de recibo» de la pantalla', async () => {
    let pedido = '';
    globalThis.fetch = async (entrada) => {
      pedido = typeof entrada === 'string' ? entrada : String(entrada);
      return new Response(JSON.stringify(RECIBO), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    montarEnRuta('/tesoreria/duplicado-recibo/001-0000123?nroDeRecibo=999');

    await screen.findByText('001-0000123');
    expect(pedido).toContain('/tesoreria/recibos/001-0000123/duplicado');
    expect(pedido).not.toContain('nroDeRecibo');
  });

  it('sin recibo dentro del sobre, no se dibuja una fila inventada', async () => {
    responde({ estado: 'EMITIDO', duplicados: 0, anulacion: null });
    montarEnRuta('/tesoreria/duplicado-recibo/001-0000123');

    // No hay `recibo`: la fila sale toda con SIN_DATO y sin numero — y no un
    // «001-0000123» sacado del filtro de la URL, que seria inventar el dato.
    await waitFor(() => expect(screen.getByText('EMITIDO')).toBeInTheDocument());
    expect(screen.queryByText('001-0000123')).not.toBeInTheDocument();
  });
});

describe('avance_recaudacion lee un agregado, no un padrón paginado', () => {
  it('la fila trae el tributo y lo recaudado; lo demás sale con SIN_DATO', async () => {
    responde({
      desde: '2026-01-01',
      hasta: '2026-12-31',
      aLaFecha: '2026-08-20',
      filas: [
        {
          tributo: 'PREDIAL',
          cobrado: { importe: '48200.00', actualizadoA: '2026-08-20' },
          anulado: { importe: '0.00', actualizadoA: '2026-08-20' },
          neto: { importe: '48200.00', actualizadoA: '2026-08-20' },
        },
      ],
      cobrado: { importe: '48200.00', actualizadoA: '2026-08-20' },
      anulado: { importe: '0.00', actualizadoA: '2026-08-20' },
      neto: { importe: '48200.00', actualizadoA: '2026-08-20' },
      turno: null,
    });
    montarEnRuta('/tesoreria/avance-recaudacion');

    expect(await screen.findByText('PREDIAL')).toBeInTheDocument();
    expect(screen.getAllByText('48200.00').length).toBeGreaterThan(0);
    // Ninguna columna de emitido, saldo, meta ni % de meta: el recurso no las
    // publica, y componerlas aquí sería inventar un avance que nadie firmó.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('forzarlo por el paginado —un arreglo suelto— se para en voz alta', async () => {
    // La forma equivocada: `leerPaginado` esperaría esto; el agregado real es
    // un objeto, y `leerObjeto` lo rechaza en vez de dibujar una tabla vacía.
    responde([{ tributo: 'PREDIAL' }]);
    montarEnRuta('/tesoreria/avance-recaudacion');

    expect(await screen.findByText('No se pudieron cargar los datos')).toBeInTheDocument();
  });
});

describe('recaudacion_area lee la distribución por partida', () => {
  it('partida, nombre del área y el neto de la fila', async () => {
    responde({
      desde: '2026-08-01',
      hasta: '2026-08-31',
      aLaFecha: '2026-08-20',
      filas: [
        {
          area: '113200',
          areaNombre: 'TESORERÍA',
          partida: '1.5.1.1',
          tributo: 'PREDIAL',
          cobrado: { importe: '900.00', actualizadoA: '2026-08-20' },
          anulado: { importe: '0.00', actualizadoA: '2026-08-20' },
          neto: { importe: '900.00', actualizadoA: '2026-08-20' },
        },
      ],
      neto: { importe: '900.00', actualizadoA: '2026-08-20' },
      netoSinPartida: { importe: '0.00', actualizadoA: '2026-08-20' },
    });
    montarEnRuta('/tesoreria/recaudacion-area');

    expect(await screen.findByText('1.5.1.1')).toBeInTheDocument();
    expect(screen.getByText('TESORERÍA')).toBeInTheDocument();
    expect(screen.getByText('900.00')).toBeInTheDocument();
  });
});

describe('caja_tributaria lee la deuda real del contribuyente, aunque no la pueda cobrar', () => {
  const importe = (valor: string) => ({ importe: valor, actualizadoA: '2026-08-20' });

  it('la grilla trae el tributo, la cuota y los importes de `consulta_deuda`', async () => {
    responde(
      paginado([
        {
          tributo: 'PREDIAL',
          ejercicio: 2026,
          predioId: 41,
          vehiculoId: null,
          periodoDesde: 2,
          periodoHasta: 2,
          fase: 'ORDINARIA',
          deuda: {
            insoluto: importe('1842.60'),
            reajuste: importe('0.00'),
            interes: importe('84.12'),
            gasto: importe('0.00'),
            total: importe('1926.72'),
          },
        },
      ]),
    );
    montarEnRuta('/tesoreria/caja-tributaria?codContribuyente=00000006550');

    const fila = (await screen.findByText('PREDIAL')).closest('tr');
    expect(fila).not.toBeNull();
    expect(within(fila as HTMLElement).getByText('1 926.72')).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText('ORDINARIA')).toBeInTheDocument();
  });
});

/* ── anulacion_recibo: el camino de escritura, entero ────────────────────
   #34, #74. El recibo se anula por el número que trae la URL —igual que una
   ficha catastral se abre por su código—, con el motivo y el autorizante como
   texto libre y la observación como condición de guardado. */

const ANULACION = '/tesoreria/anulacion-recibo/001-0000123';

interface PeticionEscrita {
  readonly url: string;
  readonly metodo: string;
  readonly clave: string | null;
  readonly cuerpo: Readonly<Record<string, unknown>>;
}

let peticiones: PeticionEscrita[] = [];

function laApiResponde(estado: number, cuerpo: unknown = { estado: 'ANULADO' }): void {
  peticiones = [];
  globalThis.fetch = async (entrada, opciones) => {
    const cabeceras = new Headers(opciones?.headers);
    const crudo = typeof opciones?.body === 'string' ? opciones.body : '{}';
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      clave: cabeceras.get('idempotency-key'),
      cuerpo: JSON.parse(crudo),
    });
    return new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'content-type': 'application/json' },
    });
  };
}

beforeEach(() => laApiResponde(201));

async function completarElFormulario(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  await usuario.selectOptions(await screen.findByLabelText('Motivo'), 'ERROR EN EL IMPORTE');
  await usuario.selectOptions(screen.getByLabelText('Autorizado por'), 'RESPONSABLE DE TESORERÍA');
  await usuario.type(screen.getByLabelText('Nº de memorando'), 'MEMO-2026-014');
  await usuario.type(
    screen.getByRole('textbox', { name: 'Observación' }),
    'Doble cobro por error de digitación.',
  );
}

describe('anulacion_recibo escribe sobre el recibo que abrió la pantalla', () => {
  it('el número viaja en la ruta —el de la URL—, no como campo del cuerpo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completarElFormulario(usuario);
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const [enviada] = peticiones;
    expect(enviada?.metodo).toBe('POST');
    expect(enviada?.url).toContain('/tesoreria/recibos/001-0000123/anulacion');
    expect(enviada?.cuerpo['motivo']).toBe('ERROR EN EL IMPORTE');
    expect(enviada?.cuerpo['autorizadoPor']).toBe('RESPONSABLE DE TESORERÍA');
    expect(enviada?.cuerpo['nDeMemorando']).toBe('MEMO-2026-014');
    expect(enviada?.cuerpo['observacion']).toBe('Doble cobro por error de digitación.');
    // Ni la casilla ni el «Detalle»: `PeticionDeAnulacion` no los admite.
    expect(enviada?.cuerpo['devuelveLaDeudaACuentaCorriente']).toBeUndefined();
    expect(enviada?.cuerpo['detalle']).toBeUndefined();
  });

  it('sin motivo, la primaria no se habilita aunque haya observación', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await usuario.type(
      await screen.findByRole('textbox', { name: 'Observación' }),
      'Falla de impresión.',
    );

    primariaApagada(await screen.findByRole('button', { name: 'Anular recibo' }));
    expect(motivoDeLaPrimaria()).toMatch(/motivo de la anulación/);

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'FALLA DE IMPRESIÓN');
    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Anular recibo' })));
    expect(peticiones).toEqual([]);
  });

  it('anular es irreversible: no manda hasta confirmar, y dice que no se deshace', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completarElFormulario(usuario);
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));

    expect(peticiones).toEqual([]);
    expect(screen.getByText(/no se deshace/)).toBeInTheDocument();
    expect(screen.getByText(/En el SGTM no se borra/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));
    await waitFor(() => expect(peticiones).toHaveLength(1));
  });

  it('cancelar no manda nada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completarElFormulario(usuario);
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(peticiones).toEqual([]);
    expect(screen.queryByText(/no se deshace/)).not.toBeInTheDocument();
  });

  it('el doble cobro es el riesgo mayor: dos pulsaciones, una petición', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completarElFormulario(usuario);
    const primaria = await screen.findByRole('button', { name: 'Anular recibo' });
    await usuario.click(primaria);
    const confirmar = screen.getByRole('button', { name: /^Confirmar/ });

    // Dos pulsaciones rápidas sobre la confirmación: una sola petición sale.
    await usuario.dblClick(confirmar);

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones).toHaveLength(1);
  });

  it('la clave de idempotencia es estable por intento: el mismo envío, la misma clave', async () => {
    const usuario = userEvent.setup();
    laApiResponde(500, { title: 'Error', status: 500, detail: 'No se pudo anular.' });
    montarEnRuta(ANULACION);
    await completarElFormulario(usuario);
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));

    await screen.findByText('No se pudo anular.');
    expect(peticiones).toHaveLength(1);
    const primeraClave = peticiones[0]?.clave;
    expect(primeraClave).toBeTruthy();

    // Reintentar el mismo intento —sin cambiar nada— manda la misma clave: es
    // el reintento que el navegador o el cajero repiten tras el fallo.
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));
    await waitFor(() => expect(peticiones).toHaveLength(2));
    expect(peticiones[1]?.clave).toBe(primeraClave);
  });

  it('corregir el motivo antes de reintentar es un intento nuevo: otra clave', async () => {
    const usuario = userEvent.setup();
    laApiResponde(500, { title: 'Error', status: 500, detail: 'No se pudo anular.' });
    montarEnRuta(ANULACION);
    await completarElFormulario(usuario);
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));
    await screen.findByText('No se pudo anular.');
    const primeraClave = peticiones[0]?.clave;

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'PAGO DUPLICADO');
    await usuario.click(await screen.findByRole('button', { name: 'Anular recibo' }));
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));
    await waitFor(() => expect(peticiones).toHaveLength(2));
    expect(peticiones[1]?.clave).not.toBe(primeraClave);
  });
});
