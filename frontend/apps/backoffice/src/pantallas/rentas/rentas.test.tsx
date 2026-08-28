import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { permisosDelClaim, puedeEscribir, puedeVer } from '../../app/sesion/permisos';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';
import {
  motivoDeLaPrimaria,
  primariaApagada,
  primariaDeLaPantalla,
  primariaEncendida,
} from '../../pruebas/acciones';

/**
 * Rentas · Registro (#73): el modulo que mas escribe.
 *
 * Quince opciones, de las cuales **ocho tienen verbo de escritura**. Es donde la
 * observacion obligatoria (#64) deja de ser una regla escrita y se convierte en
 * ocho formularios que no guardan sin ella, asi que aqui se comprueba sobre las
 * ocho a la vez y no una por una.
 *
 * Conectadas para lectura hay cinco: el padron de contribuyentes (#11), la
 * ficha de vehiculo (#26), la declaracion jurada (#28), los beneficios (#27)
 * y los arbitrios (#31). `alta_deuda` (#24) se suma como la primera escritura
 * conectada del modulo, con su lista blanca en `escrituras.ts` — ver ahi por
 * que `unidadPredioPlaca` y `cuotaHasta` no viajan todavia.
 *
 * `transferencia_predio`, `transferencia_vehiculo` y `baja_deuda` quedan
 * fuera a proposito: las dos primeras necesitan resolver un codigo contra un
 * identificador interno antes de poder enviar (busqueda que no existe
 * todavia), y `baja_deuda` es buscar-y-seleccionar-varias-filas, no un
 * formulario plano — ninguna de las tres es solo una entrada mas en la lista
 * blanca (ver #73). `alcabala`, `vehicular_calculo` y `espectaculos` tienen
 * ya su backend (#32) pero el mismo tipo de hueco: un identificador interno o
 * un valor que el catalogo marca de solo lectura y que el controlador no
 * calcula (ver el doc de `rentas/index.ts`). Las demas esperan a su backend.
 */

/**
 * Las siete opciones del modulo cuya operacion escribe y que **no declaran**
 * todavia que campos suyos acepta el backend.
 *
 * Hasta #332 esta lista eran las nueve, y la prueba decia: sin observacion la
 * primaria esta apagada, con observacion se habilita. Las dos mitades eran
 * ciertas y la segunda era el defecto: lo que la observacion habilitaba en estas
 * siete era mandar **solo la observacion** —catorce campos rellenos que no
 * viajan, y un backend que rechaza o que no existe—. Ahora quedan apagadas y
 * dicen por que, que es lo que #332 pedia; la observacion sigue siendo la
 * condicion de guardado de `alta_deuda` y de `baja_deuda`, que si estan
 * declaradas, y eso se comprueba abajo y en `pantallas/escritura.test.tsx`.
 */
const LAS_QUE_ESCRIBEN_SIN_DECLARAR: readonly string[] = [
  'predial-individual',
  'predial-masivo',
  'transferencia-predio',
  'vehicular-calculo',
  'transferencia-vehiculo',
];

/**
 * Y las dos cuya **primaria no es un acto**: «Imprimir liquidación» (#337).
 *
 * Escriben en el contrato y tampoco declaran, pero la ultima accion de su
 * catalogo —que es la primaria (FRO-03 §5)— imprime. Contarle a quien atiende
 * que «registre el acto por el procedimiento actual» debajo de un boton de
 * imprimir es regañarle por algo que no estaba haciendo, y eso pasaba en 50 de
 * las 134 pantallas. La primaria sigue apagada; lo que se quita es la franja.
 */
const LAS_DE_SALIDA: readonly string[] = ['alcabala', 'espectaculos'];

/** Las dos que **si** declaran su lista blanca, y por tanto guardan de verdad. */
const LAS_DECLARADAS: readonly string[] = ['alta-deuda', 'baja-deuda'];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('ningun acto del modulo promete lo que no puede', () => {
  it.each(LAS_QUE_ESCRIBEN_SIN_DECLARAR)(
    '%s deja su primaria apagada, y la franja dice por que',
    async (ranura) => {
      const montada = montarEnRuta(`/rentas-registro/${ranura}`);
      await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

      // **La ultima accion es la primaria**, como en el prototipo (FRO-03 §5).
      // Apagada con `aria-disabled` y enfocable: es lo unico que hace que su
      // franja se lea (ver `primariaApagada`).
      primariaApagada();

      // Sin declaracion no hay a donde escribir: tampoco hay caja de observacion.
      expect(
        screen.queryByRole('region', { name: 'Observación del usuario' }),
      ).not.toBeInTheDocument();

      // Su operacion **escribe** en el contrato: lo que falta es la declaracion,
      // y eso lo dice el `data-causa` —la franja habla para la ventanilla—.
      expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
      expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
        'data-causa',
        'sin-declaracion',
      );

      montada.unmount();
    },
  );

  it.each(LAS_DE_SALIDA)(
    '%s imprime: la primaria esta apagada y **sin** franja',
    async (ranura) => {
      const montada = montarEnRuta(`/rentas-registro/${ranura}`);
      await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

      // Apagada con `disabled`, no con `aria-disabled`: no hay ningun motivo que
      // leer al lado, asi que tampoco hace falta que reciba el foco.
      expect(primariaDeLaPantalla()).toBeDisabled();
      expect(motivoDeLaPrimaria()).toBeUndefined();
      expect(document.getElementById('sgtm-motivo-de-la-accion')?.textContent).toBe('');

      montada.unmount();
    },
  );

  it.each(LAS_DECLARADAS)('%s si pide su observacion, y sin ella no guarda', async (ranura) => {
    const montada = montarEnRuta(`/rentas-registro/${ranura}`);

    const caja = await screen.findByRole('region', { name: 'Observación del usuario' });
    expect(within(caja).getByLabelText('Observación')).toBeInTheDocument();

    // Sin observacion, apagada. No es un `placeholder` amable: es la
    // condicion de guardado (regla 10, RNF-052).
    primariaApagada();

    montada.unmount();
  });

  it('la observacion sola habilita el alta, porque el alta si declara sus campos', async () => {
    const usuario = userEvent.setup();
    const montada = montarEnRuta('/rentas-registro/alta-deuda');

    const caja = await screen.findByRole('region', { name: 'Observación del usuario' });
    const primaria = await screen.findByRole('button', { name: 'Dar de alta' });
    primariaApagada(primaria);

    await usuario.type(within(caja).getByLabelText('Observación'), 'Motivo del acto.');
    await waitFor(() => primariaEncendida(primaria));

    montada.unmount();
  });
});

describe('el padron de contribuyentes lee ContribuyenteResource', () => {
  it('el numero va a la columna de su tipo de documento, y lo que no publica sale vacio', async () => {
    montarEnRuta('/rentas-registro/contribuyentes');

    const fila = (await screen.findByText('00000025673')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'A',
      '00000025673',
      'SUC. RUFINA MEDINA MEDINA',
      '03593174',
      // Sin RUC: es una persona natural, no un dato que falte.
      SIN_DATO,
      // Domicilio (#15), predios (catastro) y **deuda** (#22). La deuda es la
      // que mas se mira y la que mas importa no inventar: es la respuesta a
      // «¿cuánto debo?», que es lo que trae a la gente a la ventanilla.
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
    ]);
  });

  it('las nueve restantes siguen sin Conexion propia', () => {
    for (const opcion of [
      'predios_rentas',
      'predial_individual',
      'predial_masivo',
      'transferencia_predio',
      'alcabala',
      'vehicular_calculo',
      'transferencia_vehiculo',
      'espectaculos',
      'alta_deuda',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
    for (const opcion of [
      'contribuyentes',
      'vehiculos',
      'declaracion_jurada',
      'beneficios',
      'arbitrios',
      // `baja_deuda` se suma en #332, y es la unica del sistema cuya conexion
      // **lee otra operacion**: la suya es un `POST`, que no se pide al abrir la
      // pantalla, y la deuda que se da de baja la publica `consulta_deuda` (#22).
      // Sin eso, su tabla —y la columna de seleccion que el prototipo dibuja—
      // se quedaban vacias para siempre.
      'baja_deuda',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
  });
});

describe('la ficha de vehiculo lee VehiculoResource', () => {
  it('las claves que el recurso publica se ven; el resto sale con «—»', async () => {
    montarEnRuta('/rentas-registro/vehiculos/T2G-418');

    // «marca» y «modelo» estan en la primera seccion de la primera pestana,
    // que arranca abierta. Se espera por «modelo» (`text`) y no por «marca»
    // (`sel`): «TOYOTA» es tambien la primera opcion de su lista del
    // catalogo, asi que un `select` sin cargar ya la muestra por omision —
    // esperar por ella seria un falso positivo que resuelve antes de que
    // llegue el dato. Un `<input>` de texto no tiene ese problema: vacio
    // hasta que la consulta responde.
    expect(await screen.findByDisplayValue('YARIS GLI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TOYOTA')).toBeInTheDocument();
    // El titular es solo `contribuyenteId` en el recurso: nombre y documento
    // no estan, y no se inventan uniendo con `contribuyentes` a mano.
    expect(screen.queryByText('CASTILLO PASCUALA, MARÍA ELENA')).not.toBeInTheDocument();
  });
});

describe('la declaracion jurada lee DeclaracionJuradaResource', () => {
  it('se dibuja como una tabla de una fila, no el padron del prototipo', async () => {
    montarEnRuta('/rentas-registro/declaracion-jurada/000418?ano=2026');

    const fila = (await screen.findByText('000418')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas).toHaveLength(8);
    // El contribuyente y el conteo de predios no estan en el recurso.
    expect(celdas[2]?.textContent).toBe(SIN_DATO);
    expect(screen.getByText('1 declaración')).toBeInTheDocument();
  });
});

describe('los beneficios leen BeneficioResource', () => {
  it('la deduccion sale como porcentaje y el estado se deriva de vigenciaHasta', async () => {
    montarEnRuta('/rentas-registro/beneficios');

    const fila = (await screen.findByText('2026-0281')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      '2026-0281',
      SIN_DATO,
      'PENSIONISTA',
      'RES-0412-2026-MPS',
      'Desde 2026-01-01',
      '50.00%',
      'VIGENTE',
    ]);
  });
});

describe('los arbitrios leen ArbitrioResource', () => {
  it('cada fila es la cuota de un mes, y lo que el recurso no publica sale vacio', async () => {
    montarEnRuta('/rentas-registro/arbitrios');

    const fila = (await screen.findByText('PARQUES_JARDINES')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'PARQUES_JARDINES',
      // Criterio de distribucion y frecuencia no estan en ArbitrioResource.
      SIN_DATO,
      SIN_DATO,
      // La cuota de ese mes, tal cual la publica el recurso.
      '6.10',
      // El anual no se compone sumando cuotas (RNF-083), y la condicion
      // tampoco esta en el recurso.
      SIN_DATO,
      SIN_DATO,
    ]);
  });

  it('«— BARRIDO» y «— RECOLECCIÓN» colapsan en el mismo Servicio del dominio', async () => {
    montarEnRuta('/rentas-registro/arbitrios');

    // El prototipo dibuja dos filas de limpieza publica; el dominio solo
    // conoce un LIMPIEZA_PUBLICA (V2) — las dos llegan con ese mismo codigo.
    const filas = await screen.findAllByText('LIMPIEZA_PUBLICA');
    expect(filas).toHaveLength(2);
  });
});

/* ── SoD-2: quien cobra no da de baja lo que cobra ─────────────────────── */

describe('un cajero no ve el alta ni la baja de deuda', () => {
  /** Los permisos de un cajero, tal como los describe REQ-03 §3: caja, y nada mas. */
  const CAJERO = permisosDelClaim({
    caja_tributaria: ['ejecucion', 'lectura', 'registro'],
    caja_tasas: ['ejecucion', 'lectura', 'registro'],
    duplicado_recibo: ['ejecucion', 'lectura', 'impresion'],
    contribuyentes: ['lectura'],
  });

  it('no las ve, y tampoco las ve el que solo tiene lectura del padron', () => {
    // **SoD-2** (REQ-03 §4): quien cobra no puede dar de baja lo que cobra. La
    // interfaz lo refleja no dibujando la opcion; el servidor lo impide de
    // verdad, y las dos cosas hacen falta —esta solo es la comodidad—.
    expect(puedeVer(CAJERO, 'alta_deuda')).toBe(false);
    expect(puedeVer(CAJERO, 'baja_deuda')).toBe(false);
    // Lo que si atiende, lo atiende.
    expect(puedeVer(CAJERO, 'caja_tributaria')).toBe(true);
    // Y el padron lo consulta sin poder tocarlo.
    expect(puedeVer(CAJERO, 'contribuyentes')).toBe(true);
    expect(puedeEscribir(CAJERO, 'contribuyentes')).toBe(false);
  });
});

/* ── alta_deuda: la primera escritura conectada del modulo (#24, #73) ───── */

describe('alta_deuda manda solo lo que su lista blanca declara', () => {
  const original = globalThis.fetch;
  let peticiones: { url: string; metodo: string; cuerpo: string }[] = [];

  function laApiResponde(): void {
    peticiones = [];
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push({
        url: typeof entrada === 'string' ? entrada : String(entrada),
        metodo: opciones?.method ?? 'GET',
        cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
      });
      return Promise.resolve(
        new Response(JSON.stringify({ id: 1 }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      );
    };
  }

  afterEach(() => {
    globalThis.fetch = original;
  });

  it('traduce el tributo al codigo corto, y deja fuera lo que no se resuelve todavia', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta('/rentas-registro/alta-deuda');

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(screen.getByLabelText('Concepto / tributo'), 'IMPUESTO PREDIAL');
    // «Unidad (predio / placa)» se llena pero no viaja: ver escrituras.ts.
    await usuario.type(screen.getByLabelText('Unidad (predio / placa)'), '01-02-03-04-05-06');
    await usuario.selectOptions(screen.getByLabelText('Año'), '2026');
    await usuario.type(screen.getByLabelText('Cuota desde'), '1');
    await usuario.type(screen.getByLabelText('Cuota hasta'), '4');
    await usuario.type(screen.getByLabelText('Insoluto (S/)'), '150.50');
    await usuario.type(screen.getByLabelText('Nº del documento'), 'RD-2026-0042');
    await usuario.type(
      within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
        'Observación',
      ),
      'Determinación de fiscalización.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('POST');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      codContribuyente: '00000025673',
      // «IMPUESTO PREDIAL» del prototipo, «PREDIAL» del backend.
      tributo: 'PREDIAL',
      ano: '2026',
      // Solo la cuota desde: el backend no admite un rango (ver escrituras.ts).
      cuota: 1,
      insoluto: '150.50',
      documentoOrigen: 'RD-2026-0042',
      observacion: 'Determinación de fiscalización.',
    });
  });

  it('un tributo sin codigo establecido no viaja, y la peticion falla en el backend', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta('/rentas-registro/alta-deuda');

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    // Ninguna de las tres tiene codigo de tributo establecido todavia.
    await usuario.selectOptions(screen.getByLabelText('Concepto / tributo'), 'MULTA TRIBUTARIA');
    await usuario.type(
      within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
        'Observación',
      ),
      'Multa por declaración jurada omisa.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['tributo']).toBeUndefined();
  });
});
