import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { permisosDelClaim, puedeEscribir, puedeVer } from '@sgtm/sesion';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';

/**
 * Rentas · Registro (#73): el modulo que mas escribe.
 *
 * Quince opciones, de las cuales **nueve tienen verbo de escritura**. Es donde la
 * observacion obligatoria (#64) deja de ser una regla escrita y se convierte en
 * nueve formularios que no guardan sin ella, asi que aqui se comprueba sobre las
 * nueve a la vez y no una por una.
 *
 * Conectadas para lectura hay seis: el padron de contribuyentes (#11), la
 * ficha de vehiculo (#26), la declaracion jurada (#28), los beneficios (#27),
 * los arbitrios (#31) y, desde #395, el padron predial de un contribuyente.
 * `alta_deuda` (#24) y `baja_deuda` (#332) fueron las primeras escrituras
 * conectadas del modulo, con su lista blanca en `escrituras.ts` — ver ahi por
 * que `cuotaHasta` no viaja todavia.
 *
 * **Y las dos determinaciones prediales van por la otra puerta** (#395): su
 * operacion es un `POST`, asi que no se pide al abrir la pantalla y no declaran
 * `Conexion` sino `Adaptacion` —solo el adaptador de la respuesta—. Su bateria
 * entera esta en `predial-conectado.test.tsx`.
 *
 * **`transferencia_predio` y `transferencia_vehiculo` se suman aqui** (#73):
 * a las dos les faltaba `valorTransferencia`, un dato que ninguna pantalla
 * del manual dibuja, y ahora lo llena un resolutor de `rentas/composicion.ts`
 * —el mismo mecanismo que ya resolvia `predioId`/`vehiculoId` para
 * `alta_deuda`—. Su bateria entera esta en `transferencias.test.tsx`.
 *
 * `alcabala` y `espectaculos` tienen ya su backend (#32) y se quedan fuera: a
 * `alcabala` le falta `transferenciaId` —ninguna lectura publicada lo resuelve,
 * porque no hay `GET` de transferencias— y `autoavaluoAjustado` —marcado de
 * solo lectura en el catalogo, aunque el controlador lo pide como dato de
 * entrada (D-11)—; a `espectaculos` le falta `ingresoDeclarado`, con el mismo
 * defecto de marcado. Ninguna de las dos es una entrada mas en la lista
 * blanca: ver el doc de `rentas/index.ts`. Las demas esperan a su backend.
 *
 * **`predial_masivo` salio de esa lista** (#445): es la primera de las cinco
 * determinaciones que asienta de verdad. Su cuerpo es plano —el de
 * `predial_individual` lleva ademas un arreglo de predios, que la lista blanca
 * no sabe declarar suelto todavia—, asi que fue la barata de las cinco. La
 * marca que separa simular de asentar (`simulacion: false`) va por
 * `constantes`, y las dos casillas que el backend rechaza apagan la primaria
 * **antes** de pulsar en vez de producir un 422: `asiento-del-predial.test.tsx`.
 *
 * **`vehicular_calculo` ya no esta en esa lista** (#399): su desacuerdo de
 * transporte —el contrato declaraba `placa`, `codContribuyente` y `ejercicio`
 * de consulta y el controlador los leia del cuerpo— se cerro corrigiendo el
 * controlador, y desde entonces la pantalla **lee** su determinacion
 * (`vehicular-conectado.test.tsx`). Lo que sigue sin poder hacer es
 * **asentarla**: eso exige la observacion del usuario (regla 10) y una lista
 * blanca en `escrituras.ts`, asi que su primaria sigue apagada y por eso sigue
 * en `LAS_QUE_ESCRIBEN_SIN_DECLARAR`.
 *
 * **Desde #385, `alcabala` y `espectaculos` cuentan ese motivo en pantalla**:
 * las dos estan en `ACTOS_SIN_CAMPO`, y su franja gana a la primaria de
 * impresion que hasta entonces las silenciaba.
 */

/**
 * Las opciones del modulo cuya operacion escribe y que **no declaran** todavia
 * que campos suyos acepta el backend.
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
const LAS_QUE_ESCRIBEN_SIN_DECLARAR: readonly string[] = ['vehicular-calculo'];

/**
 * Y la que **no guarda campos: pide una determinacion** (#333).
 *
 * `predial-individual` estaba en la lista de arriba y su franja decia «la
 * pantalla aún no manda estos campos» sobre una pantalla con 15 de sus 19
 * campos en `"ro"`: ahi no hay ningun campo que mandar, y lo que falta no es una
 * entrada en la lista blanca sino la capa web entera de la determinacion —el
 * dominio calcula (`RT-001`…`RT-016`) y ningun controlador lo publica—. La
 * primaria sigue apagada; lo que cambia es que la franja dice la verdad.
 */
const LA_QUE_DETERMINA = 'predial-individual';

/**
 * Y las dos cuya **primaria no es un acto**: «Imprimir liquidación» (#337).
 *
 * Escriben en el contrato y tampoco declaran, pero la ultima accion de su
 * catalogo —que es la primaria (FRO-03 §5)— imprime. Contarle a quien atiende
 * que «registre el acto por el procedimiento actual» debajo de un boton de
 * imprimir es regañarle por algo que no estaba haciendo, y eso pasaba en 50 de
 * las 134 pantallas. Pero estas dos **tienen** algo que contar, y hasta #385
 * no lo contaban: el backend les exige un dato que la pantalla dibuja de solo
 * lectura, y ese motivo —declarado en `ACTOS_SIN_CAMPO`— gana ahora al filtro
 * de salida. El boton apagado con un `title` que nadie puede leer (RNF-082)
 * pasa a ser una franja con `role="status"`.
 */
const LAS_DE_SALIDA_CON_MOTIVO: readonly string[] = ['alcabala', 'espectaculos'];

/**
 * Y las cuatro que **si** declaran su lista blanca, y por tanto guardan de
 * verdad. Las dos transferencias tienen ademas su propia bateria, con el
 * resolutor que les llena el campo que les faltaba: `transferencias.test.tsx`.
 */
const LAS_DECLARADAS: readonly string[] = [
  'alta-deuda',
  'baja-deuda',
  'predial-masivo',
  'transferencia-predio',
  'transferencia-vehiculo',
];

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

  it(`${LA_QUE_DETERMINA} no promete campos: dice que la determinación la hace el servidor`, async () => {
    const montada = montarEnRuta(`/rentas-registro/${LA_QUE_DETERMINA}`);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Aquí no se calcula nada/);
    // Y **no** la frase de la causa anterior, que era la equivocada: aquí no se
    // escribe nada que se pueda mandar.
    expect(motivoDeLaPrimaria()).not.toMatch(/Lo que se escriba aquí/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-determinacion',
    );

    montada.unmount();
  });

  it.each(LAS_DE_SALIDA_CON_MOTIVO)(
    '%s imprime, pero su franja cuenta el dato que falta (#385)',
    async (ranura) => {
      const montada = montarEnRuta(`/rentas-registro/${ranura}`);
      await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

      // Apagada con `aria-disabled` y enfocable: hay un motivo que leer al lado.
      primariaApagada();
      // La franja nombra lo que falta —no la frase generica de las sin
      // declarar— y la causa tecnica viaja en el `data-`.
      expect(motivoDeLaPrimaria()).toMatch(
        /Falta un dato que esta pantalla no tiene dónde escribir/,
      );
      expect(motivoDeLaPrimaria()).not.toMatch(/Lo que se escriba aquí/);
      expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
        'data-causa',
        'sin-campo',
      );

      montada.unmount();
    },
  );

  /**
   * **Y la franja nombra el dato, no el campo del backend** (#432).
   *
   * Las dos declaraban dos datos con el mismo tono, y de los cuatro solo uno es
   * un campo que falte. Contarlos igual manda a buscar en la pantalla un campo
   * que no existe —el autovaluo ajustado es un resultado, no una entrada— y deja
   * sin decir lo unico accionable: que la transferencia no se puede elegir
   * porque ninguna consulta la devuelve.
   *
   * Se comprueba **lo que la franja tiene que contener**, no la frase entera: la
   * redaccion se puede afinar, y lo que no puede desaparecer es el dato dicho en
   * castellano. `franja-para-la-ventanilla.test.ts` cierra la otra mitad —que
   * ahi no aparezca `transferenciaId` ni ningun otro nombre de campo—.
   */
  const EL_DATO_DE_CADA_UNA: readonly (readonly [string, RegExp])[] = [
    ['alcabala', /transferencia ya registrada/i],
    ['alcabala', /autovalúo ajustado/i],
    ['espectaculos', /organizador/i],
    ['espectaculos', /recaudación declarada/i],
  ];

  it.each(EL_DATO_DE_CADA_UNA)('la franja de %s nombra %s', async (ranura, dicho) => {
    const montada = montarEnRuta(`/rentas-registro/${ranura}`);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    expect(motivoDeLaPrimaria()).toMatch(dicho);
    // Y no el nombre del campo: eso vive en `campos`, que no se pinta.
    expect(motivoDeLaPrimaria()).not.toMatch(/transferenciaId|autoavaluoAjustado/);
    expect(motivoDeLaPrimaria()).not.toMatch(/organizadorId|ingresoDeclarado/);

    montada.unmount();
  });

  it.each(LAS_DECLARADAS)('%s si pide su observacion, y sin ella no guarda', async (ranura) => {
    const montada = montarEnRuta(`/rentas-registro/${ranura}`);

    const caja = await screen.findByRole('region', { name: 'Observación del usuario' });
    expect(within(caja).getByLabelText('Observación')).toBeInTheDocument();

    // Sin observacion, apagada. No es un `placeholder` amable: es la
    // condicion de guardado (regla 10, RNF-052).
    primariaApagada();

    montada.unmount();
  });

  /**
   * **El concepto, el año, el documento y la observacion habilitan el alta**,
   * porque el alta si declara sus campos.
   *
   * Era «la observacion sola», y esa era la mitad de un defecto: el desplegable
   * de concepto se dibujaba mostrando «IMPUESTO PREDIAL» sin que nadie lo
   * tocara —un `sel` de escritura sin opcion vacia se pinta con su primera
   * opcion—, el borrador estaba vacio, `faltaEnElAlta` no veia nada, y el `POST`
   * salia con `{codContribuyente, observacion}`: **sin `tributo`**. Con eso, la
   * deuda no se asienta sobre ninguna obligacion identificable.
   *
   * **El año y el documento se sumaron en #342 (nit 3)**: `ano` tambien lleva
   * `eleccionObligatoria` —la opcion vacia antepuesta—, y sin esta rama la
   * primaria se habilitaba con el año sin elegir: `entero(peticion.ano(), "ano")`
   * de `MovimientosDeDeudaController` responde 422 «Falta el campo 'ano'», un
   * viaje de ida y vuelta que la pantalla ya podia evitar.
   */
  it('el concepto, el año, el documento y la observacion habilitan el alta', async () => {
    const usuario = userEvent.setup();
    const montada = montarEnRuta('/rentas-registro/alta-deuda');

    const caja = await screen.findByRole('region', { name: 'Observación del usuario' });
    const primaria = await screen.findByRole('button', { name: 'Dar de alta' });
    primariaApagada(primaria);

    await usuario.type(within(caja).getByLabelText('Observación'), 'Motivo del acto.');
    // Con la observacion escrita **sigue apagada**: falta el concepto.
    primariaApagada(primaria);
    expect(motivoDeLaPrimaria()).toMatch(/Falta el concepto/);

    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'IMPUESTO PREDIAL',
    );
    // Con el concepto elegido **sigue apagada**: falta el año (#342, nit 3).
    primariaApagada(primaria);
    expect(motivoDeLaPrimaria()).toMatch(/Falta el año/);

    await usuario.selectOptions(await screen.findByLabelText('Año'), '2026');
    // Y con el año, **sigue apagada**: falta el documento que sustenta el alta.
    primariaApagada(primaria);
    expect(motivoDeLaPrimaria()).toMatch(/Falta el número del documento/);

    await usuario.type(screen.getByLabelText('Nº del documento'), 'RD-2026-000123');
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

  it('las que faltan siguen sin Conexion propia, y las prediales van por la otra puerta', () => {
    for (const opcion of [
      // Las dos determinaciones prediales tienen backend desde #395 y **no**
      // son `Conexion`: su operacion es un `POST`, y una `Conexion` la pediria
      // al abrir la pantalla. Van por `Adaptacion`, que se comprueba abajo.
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
      // El padron predial de un contribuyente se suma en #395: es la unica de
      // las tres del predial cuya operacion es un `GET`.
      'predios_rentas',
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
    /* **La unidad se deja sin resolver, y para el predial esa es la unica forma
       correcta**: se determina por contribuyente sobre el conjunto de sus
       predios (NEG-05 §1), y el esquema lo hace imposible de otra forma
       —`determinacion_predial_sin_predio_ck`—. Con una unidad resuelta, `exigir`
       apaga la primaria y lo dice; eso se comprueba en `resolutor-de-unidad`. */
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

  /**
   * **Un concepto sin codigo ya no manda una peticion muda** (#331).
   *
   * Antes viajaba el cuerpo **sin** `tributo` y el backend contestaba «Falta el
   * campo 'tributo'», que es un mensaje sobre un campo que la pantalla si
   * ensenaba lleno: quien atiende habia elegido «MULTA TRIBUTARIA» y no tenia
   * como saber que el sistema no la sabe asentar. Ahora la primaria se queda
   * apagada y lo dice antes de escribir nada mas.
   *
   * Quedan **dos** conceptos asi, no tres: «MULTA ADMINISTRATIVA» si tiene
   * codigo en el libro —`RegistrarPapeleta` asienta `MULTA_ADMINISTRATIVA`—, y
   * la traduccion que faltaba se corrige en `escrituras.ts`.
   */
  it.each(['MULTA TRIBUTARIA', 'DERECHOS ADMINISTRATIVOS'])(
    '«%s» no tiene codigo en el libro: la primaria se apaga y lo dice, sin mandar nada',
    async (concepto) => {
      const usuario = userEvent.setup();
      laApiResponde();
      montarEnRuta('/rentas-registro/alta-deuda');

      await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
      await usuario.selectOptions(screen.getByLabelText('Concepto / tributo'), concepto);
      await usuario.type(
        within(
          await screen.findByRole('region', { name: 'Observación del usuario' }),
        ).getByLabelText('Observación'),
        'Multa por declaración jurada omisa.',
      );

      const primaria = screen.getByRole('button', { name: 'Dar de alta' });
      primariaApagada(primaria);
      expect(motivoDeLaPrimaria()).toMatch(/no tiene todavía un código de tributo/);
      expect(motivoDeLaPrimaria()).toContain(concepto);

      await usuario.click(primaria);
      expect(peticiones).toHaveLength(0);
    },
  );

  /** Y la que si lo tiene desde #331 viaja con el codigo que el libro usa. */
  it('«MULTA ADMINISTRATIVA» viaja como MULTA_ADMINISTRATIVA, que es lo que asienta el libro', async () => {
    const usuario = userEvent.setup();
    laApiResponde();
    montarEnRuta('/rentas-registro/alta-deuda');

    await usuario.type(await screen.findByLabelText('Cod. Contribuyente'), '00000025673');
    await usuario.selectOptions(
      screen.getByLabelText('Concepto / tributo'),
      'MULTA ADMINISTRATIVA',
    );
    // Año y documento, con la misma dureza que el concepto (#342, nit 3).
    await usuario.selectOptions(screen.getByLabelText('Año'), '2026');
    await usuario.type(screen.getByLabelText('Nº del documento'), 'RG-2026-0088');
    await usuario.type(
      within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
        'Observación',
      ),
      'Multa administrativa migrada del sistema anterior.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['tributo']).toBe('MULTA_ADMINISTRATIVA');
  });
});
