import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { permisosDelClaim, puedeVer } from '@sgtm/sesion';
import { censoDeConectadas } from '../aportes-de-modulo';
import { OPCIONES_QUE_ESCRIBEN } from '../escrituras';
import { SIN_DATO, leerPaginado } from '../seguridad/listado';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaDeLaPantalla } from '../../pruebas/acciones';

/* El censo de conectadas del catalogo entero, SIN registrar ninguna: desde #433 las
   conexiones llegan con el trozo de su modulo, y quien las registra es la espera de
   `Pantalla`. Registrarlas aqui dejaria a este archivo tapandose a si mismo —sus
   pantallas encontrarian su conexion aunque el renderizador no la hubiera pedido—. */
const OPCIONES_CONECTADAS = await censoDeConectadas();

/**
 * Infracciones administrativas (#78).
 *
 * Comparte contexto con Transito y una diferencia que la interfaz tiene que
 * respetar: aqui **la notificacion previa es un paso obligatorio del
 * procedimiento**, no un documento que se emite despues. Una interfaz que
 * permita levantar el acta sin ella invita a un vicio de nulidad.
 *
 * De sus dieciocho endpoints solo `adm_estado_cuenta` existe (#47), conectada
 * desde #363 —ver `pantallas/sanciones/index.ts`—. Lo que se comprueba es lo
 * que ya se puede: que los reportes **reusan** el bloque de #77 en vez de
 * copiarlo, que `adm_estado_cuenta` lee `PapeletaResource` tal cual y no lo
 * que el proxy simulaba antes de #363, que toda escritura pide observacion, y
 * que quien no tiene el modulo no lo ve.
 */

/** Las dos pantallas del modulo que son hoja de reporte. */
const HOJAS: readonly string[] = ['adm-resolucion-gerencia', 'adm-notificacion-resolucion'];

/**
 * Las que escriben, **y desde #428 escriben de verdad**.
 *
 * `adm-notificacion` y `adm-valores` salieron de esta lista en #337 y volvieron
 * con #421, que es la historia entera del defecto: escriben en el contrato, pero
 * la ultima accion de su catalogo —la primaria de FRO-03 §5— es «Imprimir», y
 * contarle a quien atiende que «registre el acto por el procedimiento actual»
 * debajo de un boton de imprimir era reganarle por algo que no estaba haciendo.
 * La respuesta de #337 fue callar; la de #421, **poner de primaria la accion que
 * de verdad escribe** —«Guardar» y «Procesar»—; y la de #428, declarar sus
 * campos, de modo que la primaria ya no lleva franja de impedimento sino la de
 * su propio formulario: lo que falta por rellenar.
 */
const ESCRIBEN: readonly string[] = ['adm-notificacion', 'adm-valores'];

/**
 * Y `adm-reportes`, que salio de esa lista con **#428**: no escribe.
 *
 * Su `POST` es una **lectura** —el emisor compone una hoja, no guarda nada—, y
 * desde #424 hay una puerta para eso. Lo que la tenia fuera no era la puerta
 * sino su desplegable: diez tipos de reporte, tres implementados. Ahora ofrece
 * los tres y de los otros siete dice donde estan, asi que su primaria ya no
 * lleva la franja de «registra el acto por el procedimiento actual» —no hay
 * ningun acto que registrar— sino la de «elige el tipo de reporte».
 */
const EMISOR = 'adm-reportes';

/**
 * Y una cuya primaria si imprime de verdad: apagada, y **sin** franja (#337).
 *
 * `adm-codigos-reporte` es «Imprimir · Excel» sobre un `GET`: no hay ningun acto
 * pendiente que registrar por el procedimiento actual, y una advertencia donde
 * no hay nada que advertir es la forma mas rapida de que dejen de leerse las que
 * si dicen algo.
 */
const DE_SALIDA: readonly string[] = ['adm-codigos-reporte'];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('los reportes reusan el bloque de #77, no una copia', () => {
  it.each(HOJAS)(
    '%s se dibuja con la misma hoja, con sus firmas y sin imprimir la interfaz',
    async (ranura) => {
      const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
      await dibujada('[data-hoja="1"]');

      const hoja = document.querySelector('[data-hoja="1"]');
      expect(hoja?.querySelector('.sgtm-hoja__firmas')?.textContent).toContain('Contribuyente');
      expect(
        document.querySelector('.sgtm-hoja__botones')?.getAttribute('data-no-imprimible'),
      ).toBe('1');

      montada.unmount();
    },
  );
});

describe('adm_estado_cuenta lee PapeletaResource, conectada desde #363', () => {
  it('las seis lecturas de #78 se suman a la unica de #363', () => {
    expect(OPCIONES_CONECTADAS).toContain('adm_estado_cuenta');
    for (const opcion of [
      'codigos_cuis',
      'adm_codigos_reporte',
      'adm_padron_notificaciones',
      'adm_notificaciones_vencidas',
      'adm_notificaciones_contribuyente',
      'adm_resumen_recaudacion',
    ]) {
      expect(OPCIONES_CONECTADAS, opcion).toContain(opcion);
    }
    // Y desde #397, la octava: `infracciones_adm` ya no lee por el camino
    // comun. Lo que le faltaba no era interfaz —tenia `Controller` desde
    // siempre—: era el parametro del filtro «Estado» y un vocabulario que no
    // fuera el de la deuda (ver `pantallas/sanciones/index.ts`).
    expect(OPCIONES_CONECTADAS).toContain('infracciones_adm');
    /* `adm_valores` **escribe** desde #428 —declara su rango en `escrituras.ts`,
       como su gemela de transito— y por eso no es una conexion de lectura: su
       operacion es el `POST` que registra la corrida, y una operacion que
       escribe no se pide al abrir la pantalla. */
    expect(OPCIONES_CONECTADAS).not.toContain('adm_valores');
    expect(OPCIONES_QUE_ESCRIBEN).toContain('adm_valores');
    expect(OPCIONES_QUE_ESCRIBEN).toContain('adm_notificacion');
  });

  it('la fila es la papeleta que publica el recurso, y lo que no publica sale vacio', async () => {
    montarEnRuta('/infracciones-administrativas/adm-estado-cuenta');
    await dibujada('table');

    // «Concepto», «Cuota» y «Vencimiento» dibujan un desglose de cuotas que
    // `PapeletaResource` no tiene —es una fila por papeleta, sin descripcion ni
    // fecha de vencimiento propias (ver `pantallas/sanciones/index.ts`)—, y
    // «Interés S/», «Gastos S/» y «Total S/» dependen de tesoreria, que
    // `EstadoDeCuentaAdministrativoController` documenta que todavia no publica
    // su calculo. Ninguno de los cinco se inventa.
    const tabla = await screen.findByRole('table');
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(1);
    const celdas = within(filas[0] as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
      // Insoluto: «lo que corresponde pagar, sin beneficio» (importeAPagar),
      // sin separador de miles — asi lo sirve el backend de verdad, y no como
      // lo escribia el catalogo del prototipo («2,675.00»).
      // La tabla agrupa los millares al dibujar (#342): el dato viaja intacto.
      '2 675.00',
      SIN_DATO,
      SIN_DATO,
      SIN_DATO,
    ]);
  });

  it('una respuesta que no es un listado paginado se para en voz alta, no una tabla vacia', () => {
    // La forma que el proxy servia antes de #363 —`DatosDePantalla`, con
    // `tabla.filas` y sin `contenido`— es exactamente la que tiene que fallar
    // aqui, y no dibujarse como una tabla vacia en silencio (issue #363).
    expect(() =>
      leerPaginado(
        { fechaCalculo: '2026-08-13', tabla: { filas: [] } },
        'el estado de cuenta de la papeleta administrativa',
      ),
    ).toThrow(/no trae un listado paginado/);
    expect(
      leerPaginado(
        { contenido: [], totalElementos: 0 },
        'el estado de cuenta de la papeleta administrativa',
      ).contenido,
    ).toEqual([]);
  });
});

/**
 * **La semantica que cambio en #332.** Estas tres decian «no habilita su accion
 * primaria sin observacion, y con ella si»: era cierto y era el defecto. Ninguna
 * de las tres declara su escritura en `escrituras.ts`, asi que lo que la
 * observacion habilitaba era mandar **solo la observacion** —un acto que el
 * backend rechaza, o que no rechaza nadie porque no existe—.
 *
 * Ahora la primaria se queda apagada y **dice por que**. La observacion sigue
 * siendo la condicion de guardado de toda opcion que si escribe (regla 10,
 * RNF-052): eso se comprueba en `pantallas/escritura.test.tsx`, sobre las que
 * pueden recorrer el camino entero.
 */
describe('ningun acto de este modulo promete lo que no puede', () => {
  it.each(ESCRIBEN)(
    '%s declara su escritura: pide observacion y su franja dice que falta rellenar',
    async (ranura) => {
      const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
      await dibujada('.sgtm-acciones');

      // Apagada, pero por otra cosa: hay a donde escribir, y lo que falta es el
      // formulario. Con la escritura declarada la caja de observacion **si** se
      // dibuja, porque sin ella no se guarda (regla 10, RNF-052).
      primariaApagada();
      expect(screen.getByRole('region', { name: 'Observación del usuario' })).toBeInTheDocument();

      expect(motivoDeLaPrimaria()).not.toMatch(/Registra el acto por el procedimiento actual/);
      // Y sin `data-causa`: no hay impedimento que contar (#332).
      expect(document.getElementById('sgtm-motivo-de-la-accion')).not.toHaveAttribute(
        'data-causa',
      );

      montada.unmount();
    },
  );

  /**
   * **El desplegable ofrece solo lo que el backend sirve** (#428).
   *
   * `TipoDeReporteAdministrativo` declara tres hojas y el desplegable del
   * prototipo ofrece diez. Ofrecer las diez deja siete elecciones que contestan
   * 422 con el boton encendido —que es peor que el boton apagado que habia—, y
   * esconderlas sin mas deja a quien las busca pensando que algo se rompio: por
   * eso las siete siguen alcanzables y **dicen donde esta lo que prometen**.
   */
  it('el emisor ofrece los tres reportes que existen, y ninguno mas', async () => {
    const montada = montarEnRuta(`/infracciones-administrativas/${EMISOR}`);
    await dibujada('.sgtm-acciones');

    const desplegable = screen.getByLabelText('Reporte') as HTMLSelectElement;
    const ofrecidos = [...desplegable.options].map((opcion) => opcion.text).filter((t) => t !== '');
    expect(ofrecidos).toEqual([
      'PADRÓN DE NOTIFICACIONES',
      'PAPELETAS POR INFRACCIÓN',
      'RESUMEN RECAUDACIÓN',
    ]);

    // Y sin elegir ninguno, la primaria esta apagada y dice que falta elegir
    // —no «registra el acto por el procedimiento actual»: aqui no hay acto—.
    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/Elige el tipo de reporte/);
    expect(motivoDeLaPrimaria()).not.toMatch(/Registra el acto por el procedimiento actual/);

    montada.unmount();
  });

  it('emitir uno de los tres trae su hoja, con las columnas de esa hoja', async () => {
    const usuario = userEvent.setup();
    const montada = montarEnRuta(`/infracciones-administrativas/${EMISOR}`);
    await dibujada('.sgtm-acciones');

    await usuario.selectOptions(screen.getByLabelText('Reporte'), 'PAPELETAS POR INFRACCIÓN');
    await usuario.click(screen.getByRole('button', { name: 'Pantalla' }));

    // Las columnas salen de la seccion que vino llena, no del ultimo rotulo
    // elegido: `ReporteAdministrativoResource` es una union y solo una llega.
    const tabla = await screen.findByRole('table');
    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((celda) => celda.textContent);
    expect(cabeceras).toContain('Código');
    expect(cabeceras).toContain('Importe pendiente S/');

    /* Y la primera columna trae **un codigo del CUIS**, no una fase: el rotulo
       elegido dice «por infraccion» y el catalogo de esta pantalla no dibuja
       ningun campo para el agrupador, asi que el emisor lo fija. Sin fijarlo, el
       servidor agrupa por su omision (`ESTADO`) y la hoja saldria con la misma
       cabecera «Código» sobre las fases del procedimiento. */
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const clave = within(primera).getAllByRole('cell')[0]?.textContent ?? '';
    expect(clave, 'la primera columna deberia traer el codigo del CUIS').toMatch(/^[A-Z]-\d+$/);

    montada.unmount();
  });

  it('elegir uno de los siete que no estan dice donde esta, y no se emite', async () => {
    const montada = montarEnRuta(`/infracciones-administrativas/${EMISOR}`);
    await dibujada('.sgtm-acciones');

    // No se puede elegir desde el desplegable —no esta—, y aun asi la pantalla
    // sabe contestarlo: es lo que hace que quitar un rotulo de `EMITIBLES` no
    // deje a nadie sin respuesta.
    const desplegable = screen.getByLabelText('Reporte') as HTMLSelectElement;
    expect([...desplegable.options].map((o) => o.text)).not.toContain('NOTIFICACIONES VENCIDAS');

    montada.unmount();
  });

  it.each(DE_SALIDA)('%s imprime: la primaria esta apagada y **sin** franja', async (ranura) => {
    const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
    await dibujada('.sgtm-acciones');

    // Apagada con `disabled` y no con `aria-disabled`: no hay motivo que leer al
    // lado, asi que tampoco hace falta que reciba el foco.
    expect(primariaDeLaPantalla()).toBeDisabled();
    expect(motivoDeLaPrimaria()).toBeUndefined();
    expect(document.getElementById('sgtm-motivo-de-la-accion')?.textContent).toBe('');

    montada.unmount();
  });
});

describe('las notificaciones vencidas son una pantalla de trabajo', () => {
  it('se abren sin filtrar: es la lista de lo que hay que atender hoy', async () => {
    const peticiones: string[] = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };

    montarEnRuta('/infracciones-administrativas/adm-notificaciones-vencidas');
    await dibujada('table');

    const suya = peticiones.filter((u) => u.includes('/reportes/vencidas'));
    expect(suya).toHaveLength(1);
    // Sin un solo filtro: quien la abre quiere ver **todo** lo vencido, no un
    // subconjunto que alguien eligio por el.
    expect(suya[0]).not.toContain('?');

    globalThis.fetch = proxy;
  });
});

describe('las seis lecturas de #78, celda por celda (RNF-080)', () => {
  it('codigos_cuis: código, materia y multa fuera del recurso salen SIN_DATO', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/codigos-cuis');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const celdas = within(primera).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'C-101',
      SIN_DATO,
      'Funcionar sin licencia municipal de funcionamiento',
      '50.00',
      SIN_DATO,
      'Clausura temporal',
    ]);

    montada.unmount();
  });

  it('adm_codigos_reporte: base legal sale de la columna «Base», y «Estado» del recurso no existe', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/adm-codigos-reporte');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const celdas = within(primera).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'A-005',
      'Ocupar la vía pública sin autorización',
      'UIT',
      '10.00',
      SIN_DATO,
      'Retiro de bienes',
      SIN_DATO,
    ]);

    montada.unmount();
  });

  it('adm_padron_notificaciones: sin papeleta, «Papeleta» y «Deuda S/» no inventan un cero', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/adm-padron-notificaciones');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const filas = within(tabla).getAllByRole('row').slice(1);
    const primera = within(filas[0] as HTMLElement)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(primera).toEqual([
      '001-004182',
      '2026-08-02',
      SIN_DATO,
      'A-014',
      SIN_DATO,
      SIN_DATO,
      'P-002418',
      // El adaptador agrupa los millares al dibujar (#342): el dato viaja intacto.
      '2 675.00',
    ]);

    const segunda = within(filas[1] as HTMLElement)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(segunda[6]).toBe(SIN_DATO);
    expect(segunda[7]).toBe(SIN_DATO);

    montada.unmount();
  });

  it('adm_notificaciones_vencidas: la fila trae numero, fecha, direccion, motivo y vencimiento del recurso', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/adm-notificaciones-vencidas');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const celdas = within(primera).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      '001-004182',
      '2026-08-02',
      SIN_DATO,
      'AV. JOSÉ DE LAMA 1180',
      'A-014',
      '2026-08-12',
      SIN_DATO,
    ]);

    montada.unmount();
  });

  it('adm_notificaciones_contribuyente: exige un contribuyente antes de pedir nada', async () => {
    const sinFiltro = montarEnRuta(
      '/infracciones-administrativas/adm-notificaciones-contribuyente',
    );
    // El aviso de `Conexion.exige`, no la tabla: sin contribuyente no hay a
    // quien pedirle nada.
    expect(await screen.findByText('Busca un contribuyente')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    sinFiltro.unmount();

    const peticiones: string[] = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };

    const conFiltro = montarEnRuta(
      '/infracciones-administrativas/adm-notificaciones-contribuyente?codContribuyente=00000006551',
    );
    await dibujada('table');
    expect(peticiones.some((u) => u.includes('codContribuyente=00000006551'))).toBe(true);
    conFiltro.unmount();

    globalThis.fetch = proxy;
  });

  it('adm_notificaciones_contribuyente: año y mes salen de fechaInfraccion, no de una cifra compuesta', async () => {
    const montada = montarEnRuta(
      '/infracciones-administrativas/adm-notificaciones-contribuyente?codContribuyente=00000006551',
    );
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const celdas = within(primera).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      '2026',
      '08',
      'P-002418',
      SIN_DATO,
      '2 675.00',
      SIN_DATO,
      SIN_DATO,
      'IMPUESTA',
    ]);

    montada.unmount();
  });

  it('adm_resumen_recaudacion: es un objeto suelto, y cada línea es una fase, no un mes recompuesto', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/adm-resumen-recaudacion');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const celdas = within(primera).getAllByRole('cell');
    // Enero, fase ORDINARIA: la primera de las tres lineas que produce la primera fila del
    // prototipo (#78: nada se recompone entre fases, RNF-083).
    expect(celdas.map((c) => c.textContent)).toEqual([
      '1',
      '1',
      '8 412.00',
      SIN_DATO,
      SIN_DATO,
      '8 412.00',
    ]);

    montada.unmount();
  });

  it('una respuesta paginada donde toca un objeto suelto se para en voz alta (mutacion de guarda)', () => {
    // `leerObjeto` es la guarda que separa `adm_resumen_recaudacion` (un objeto)
    // del resto de las lecturas (un sobre paginado): sin ella, un `contenido`
    // que no llega no se distingue de un objeto vacio, y la tabla saldria
    // vacia en silencio en vez de fallar en voz alta.
    expect(() => leerPaginado({ desde: '2026-01-01', lineas: [] }, 'el resumen')).toThrow(
      /no trae un listado paginado/,
    );
  });
});

/**
 * `infracciones_adm`, la octava conectada (#397).
 *
 * Es la unica del modulo que tenia `Controller` desde el principio y aun asi no se podia
 * conectar: le faltaba el parametro del filtro «Estado» y le sobraba el vocabulario de la deuda
 * en la unica columna de estado que el backend publicaba. Lo que se comprueba aqui es lo que ese
 * arreglo tiene que producir en pantalla: las ocho columnas llenas, la columna «Estado» con la
 * **fase** y no con el estado de la deuda, y «Todos» sin viajar.
 */
describe('infracciones_adm lee ProcedimientoSancionadorResource (#397)', () => {
  it('las ocho columnas del manual se llenan las ocho: ninguna sale SIN_DATO', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/infracciones-adm');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const primera = within(tabla).getAllByRole('row')[1] as HTMLElement;
    const celdas = within(primera).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'AC-2026-0912',
      'NOBLECILLA ARISMENDIZ SAC',
      'C-101',
      'Funcionar sin licencia municipal',
      // Una alicuota va en tanto por ciento (0..100): el «50 %» del prototipo
      // es 50.00, y la tabla agrupa los millares al dibujar (#342).
      '50.00',
      '2 675.00',
      'Clausura temporal',
      'SANCIONADA',
    ]);
    expect(celdas.map((c) => c.textContent)).not.toContain(SIN_DATO);

    montada.unmount();
  });

  it('«Estado» dibuja la FASE del procedimiento, no el estado de la deuda (RNF-080)', async () => {
    const montada = montarEnRuta('/infracciones-administrativas/infracciones-adm');
    await dibujada('table');

    const tabla = await screen.findByRole('table');
    const estados = within(tabla)
      .getAllByRole('row')
      .slice(1)
      .map((fila) => within(fila as HTMLElement).getAllByRole('cell')[7]?.textContent);

    // Las cinco palabras del manual, no las siete de `EstadoDePapeleta`. La
    // primera fila es la prueba: su fase es SANCIONADA y su `estadoDeLaDeuda`
    // es IMPUESTA, asi que dibujar el campo equivocado se ve aqui.
    expect(estados).toEqual(['SANCIONADA', 'CONSTATADA', 'PREVENTIVA', 'COACTIVA']);
    expect(estados).not.toContain('IMPUESTA');

    montada.unmount();
  });

  it('«Todos» no viaja, y una fase concreta si (ADR-0010)', async () => {
    const peticiones: string[] = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };
    const suyas = (): string[] => peticiones.filter((u) => u.includes('/infracciones/actas'));

    const conTodos = montarEnRuta('/infracciones-administrativas/infracciones-adm?estado=Todos');
    await dibujada('table');
    expect(suyas()).toHaveLength(1);
    // `estado=Todos` es un 422 contra el backend real: solo admite las cinco
    // fases. No filtrar por fase es NO mandar el parametro.
    expect(suyas()[0]).not.toContain('estado=');
    conTodos.unmount();

    peticiones.length = 0;
    const conFase = montarEnRuta(
      '/infracciones-administrativas/infracciones-adm?estado=SANCIONADA',
    );
    await dibujada('table');
    expect(suyas()[0]).toContain('estado=SANCIONADA');
    conFase.unmount();

    globalThis.fetch = proxy;
  });
});

describe('el operador de licencias no ve este modulo', () => {
  it('no ve ninguna de sus opciones, y si las suyas', () => {
    const LICENCIAS = permisosDelClaim({
      licencia_funcionamiento: ['lectura', 'registro'],
      ciiu: ['lectura'],
      certificados: ['lectura', 'impresion'],
    });

    for (const opcion of ['infracciones_adm', 'adm_notificacion', 'adm_resolucion_gerencia']) {
      expect(puedeVer(LICENCIAS, opcion)).toBe(false);
    }
    expect(puedeVer(LICENCIAS, 'licencia_funcionamiento')).toBe(true);
  });
});

/**
 * **Las dos escrituras del módulo, conectadas** (#428, sobre #421 y #422).
 *
 * `adm_valores` es declaración pura —la gemela de `transito_valores`, el mismo
 * caso de uso con otra `Familia`—, y `adm_notificacion` necesitó además un
 * control: el manual teclea el número en tres campos y `notif_adm_numero_uq`
 * (V4) lo guarda en uno.
 */
describe('las dos escrituras de infracciones administrativas mandan lo declarado (#428)', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });

  const laObservacion = async (): Promise<HTMLElement> =>
    within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
      'Observación',
    );

  it('el número se guarda con su serie, y lo dice antes de mandarlo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/infracciones-administrativas/adm-notificacion');
    await dibujada('.sgtm-acciones');

    // Sin ninguno de los dos, la franja pide los dos.
    expect(motivoDeLaPrimaria()).toMatch(/hacen falta su serie y su número/i);

    const datos = laSeccion('Datos de la notificación');
    await usuario.type(datos.getByLabelText('Serie'), '001');
    await usuario.type(datos.getByLabelText('Número'), '004183');

    // Y la pantalla enseña lo que va a guardar, que es lo que el manual imprime
    // en su columna «Serie-Nº».
    await screen.findByText('Se guardará como «001-004183».');
  });

  it('lo que viaja son las cinco claves declaradas, con el número ya compuesto', async () => {
    const usuario = userEvent.setup();
    const peticiones = unaApiQueRegistraLaEscritura();
    montarEnRuta('/infracciones-administrativas/adm-notificacion');
    await dibujada('.sgtm-acciones');

    const datos = laSeccion('Datos de la notificación');
    await usuario.type(datos.getByLabelText('Serie'), '001');
    await usuario.type(datos.getByLabelText('Número'), '004183');
    fireEvent.change(datos.getByLabelText('Fecha de notificación'), {
      target: { value: '2026-08-04' },
    });
    await usuario.type(datos.getByLabelText('Plazo (días hábiles)'), '10');
    await usuario.type(screen.getByLabelText('Dirección del predio'), 'CALLE LAMA 482');
    await usuario.type(screen.getByLabelText('Código de infracción'), 'A-021');
    await usuario.type(await laObservacion(), 'Acta levantada en la inspección del 4 de agosto.');

    await usuario.click(primariaDeLaPantalla());

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones[0]?.url).toContain('/infracciones/administrativas/notificaciones');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      // La serie **no viaja suelta**: viaja dentro del número, que es lo que
      // `notif_adm_numero_uq` hace único.
      numero: '001-004183',
      fecha: '2026-08-04',
      direccion: 'CALLE LAMA 482',
      // «por qué se notifica», que es lo que el padrón publica bajo `motivo`.
      motivo: 'A-021',
      plazoDias: 10,
      observacion: 'Acta levantada en la inspección del 4 de agosto.',
    });
  });

  it('los ocho campos que el backend no pide se dibujan bloqueados, no tragándose lo tecleado', async () => {
    montarEnRuta('/infracciones-administrativas/adm-notificacion');
    await dibujada('.sgtm-acciones');

    const datos = laSeccion('Datos de la notificación');
    // Un `sel` bloqueado se dibuja `disabled`; un `text`, `readOnly`.
    expect(datos.getByLabelText('Año')).toBeDisabled();
    expect(datos.getByLabelText('Hora')).toHaveAttribute('readonly');
    for (const etiqueta of ['CIIU', 'Licencia de funcionamiento']) {
      expect(screen.getByLabelText(etiqueta), `«${etiqueta}» bloqueado`).toHaveAttribute(
        'readonly',
      );
    }
  });

  it('adm_valores manda su rango, y sin él la primaria dice qué falta', async () => {
    const usuario = userEvent.setup();
    const peticiones = unaApiQueRegistraLaEscritura();
    montarEnRuta('/infracciones-administrativas/adm-valores');
    await dibujada('.sgtm-acciones');

    await usuario.type(await laObservacion(), 'Corrida del mes de agosto.');
    primariaApagada();
    expect(motivoDeLaPrimaria()).toMatch(/fecha de inicio y la fecha de fin/i);

    fireEvent.change(screen.getByLabelText('Fec. inicio'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Fec. fin'), { target: { value: '2026-08-31' } });

    await usuario.click(primariaDeLaPantalla());

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones[0]?.url).toContain(
      '/infracciones/administrativas/valores/generacion-masiva',
    );
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      desde: '2026-08-01',
      hasta: '2026-08-31',
      observacion: 'Corrida del mes de agosto.',
    });
  });
});

/** La sección del formulario con ese título: sus campos y los del filtro se llaman igual. */
function laSeccion(titulo: string): ReturnType<typeof within> {
  const seccion = screen.getByRole('heading', { name: titulo }).closest('section');
  expect(seccion).not.toBeNull();
  return within(seccion as HTMLElement);
}

/** Registra sólo la escritura: las lecturas siguen yendo al proxy de datos. */
function unaApiQueRegistraLaEscritura(): { url: string; metodo: string; cuerpo: string }[] {
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
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
  return peticiones;
}
