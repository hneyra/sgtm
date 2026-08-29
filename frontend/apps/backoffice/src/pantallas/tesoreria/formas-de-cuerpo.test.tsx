import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { montarEnRuta } from '../../pruebas/montar';
import { COMPONENTES_PROPIOS } from '../Pantalla';
import {
  motivoDeLaPrimaria,
  primariaApagada,
  primariaDeLaPantalla,
  primariaEncendida,
} from '../../pruebas/acciones';

/**
 * **Las dos formas de cuerpo que `escrituras.ts` no sabia declarar** (#423).
 *
 * `escrituras.ts` declara el cuerpo como campos sueltos —la observacion y la
 * lista blanca de claves—, y dos opciones de tesoreria no cabian ahi:
 *
 * - `cierre_caja` manda **un mapa por forma de pago**: `PeticionDeCierre.declarado`
 *   es `{"EFECTIVO": "120.00", …}` con las cinco `FormaDePago` del recibo, no
 *   cinco campos con nombre fijo. Un mapa cuyas claves son un vocabulario del
 *   dominio.
 * - `anulacion_convenio` manda **un discriminador**: el cuerpo cambia segun que
 *   boton se pulso —«Anular» y «Quebrar» son dos actos por la misma ruta—.
 *
 * Las dos se conectan con esas formas y **ninguna entra en `COMPONENTES_PROPIOS`**:
 * el objetivo era justo el contrario, que las dos sigan cubiertas por las pruebas
 * transversales del camino de escritura (`escritura.test.tsx`,
 * `actos-honestos.test.tsx`).
 */

const CIERRE = '/tesoreria/cierre-caja?caja=001&cajero=mgarcia';
const ANULACION = '/tesoreria/anulacion-convenio/F-2026-000123';

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly cuerpo: Readonly<Record<string, unknown>>;
}

const original = globalThis.fetch;
let peticiones: Peticion[] = [];

/**
 * El arqueo **con la forma que el backend produce y el prototipo no puede**.
 *
 * Es el hueco de #398 leido con cuidado. Alli la columna «Total S/» coincidia
 * con la suma de las otras tres en el juego de datos del prototipo, asi que una
 * suma escrita en la interfaz pasaba en verde; aqui pasa algo mas fuerte y hay
 * que decirlo: **todos** los totales de `ArqueoResource` coinciden con la suma
 * de sus lineas **por construccion** —`ArqueoDelTurno` las suma para
 * calcularlos—, asi que una suma escrita en el adaptador no se puede distinguir
 * de la cifra buena.
 *
 * Lo que si se distingue es la otra composicion, que es ademas la plausible: el
 * total de lo que el cajero **esta tecleando**. El avance en vivo del turno pasa
 * `Map.of()` como declarado (`ConsultaDeRecaudacion.delTurno`), asi que el
 * servidor publica `declarado = 0.00` y `diferencia = −neto` mientras el turno
 * no se cierre. Con eso:
 *
 *   lo declarado que publica el servidor            0.00
 *   la diferencia que publica el servidor       −1 480.00
 *   la suma de lo que la prueba teclea             900.00
 *
 * Una interfaz que retotalizara al teclear enseñaria 900,00 donde el arqueo
 * archivado dice 0,00, y −580,00 donde dice −1 480,00.
 */
const IMPORTE = (valor: string) => ({ importe: valor, actualizadoA: '2026-08-20' });

const ARQUEO_DEL_TURNO = {
  desde: '2026-08-20',
  hasta: '2026-08-20',
  aLaFecha: '2026-08-20',
  filas: [],
  cobrado: IMPORTE('1500.00'),
  anulado: IMPORTE('20.00'),
  neto: IMPORTE('1480.00'),
  turno: {
    caja: '001',
    cajero: 'mgarcia',
    fecha: '2026-08-20',
    estadoDelTurno: 'ABIERTO',
    arqueo: {
      turnoId: 7,
      fecha: '2026-08-20',
      recibosEmitidos: 14,
      recibosAnulados: 1,
      cobrado: IMPORTE('1500.00'),
      anulado: IMPORTE('20.00'),
      neto: IMPORTE('1480.00'),
      // Nada declarado todavia: el turno sigue abierto y el cajero no ha contado
      // el cajon. Es lo que este `GET` publica siempre.
      declarado: IMPORTE('0.00'),
      diferencia: IMPORTE('-1480.00'),
      cuadra: false,
      lineas: [
        { formaDePago: 'EFECTIVO', ...lineaDe('400.00', '20.00', '380.00') },
        { formaDePago: 'CHEQUE', ...lineaDe('600.00', '0.00', '600.00') },
        { formaDePago: 'DEPOSITO', ...lineaDe('200.00', '0.00', '200.00') },
        { formaDePago: 'TARJETA', ...lineaDe('180.00', '0.00', '180.00') },
        { formaDePago: 'TRANSFERENCIA', ...lineaDe('120.00', '0.00', '120.00') },
      ],
    },
  },
};

function lineaDe(cobrado: string, anulado: string, neto: string) {
  return {
    cobrado: IMPORTE(cobrado),
    anulado: IMPORTE(anulado),
    neto: IMPORTE(neto),
    declarado: IMPORTE('0.00'),
    diferencia: IMPORTE(`-${neto}`),
  };
}

function laApiResponde(cuerpo: unknown, estado = 200): void {
  peticiones = [];
  globalThis.fetch = async (entrada, opciones) => {
    const crudo = typeof opciones?.body === 'string' ? opciones.body : '{}';
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      cuerpo: JSON.parse(crudo),
    });
    return new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'content-type': 'application/json' },
    });
  };
}

beforeEach(() => laApiResponde(ARQUEO_DEL_TURNO));
afterEach(() => {
  globalThis.fetch = original;
});

/** La caja de observación de la pantalla, que es la condición de guardado (regla 10). */
const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

/** Lo que el último `POST` mandó, sin el ruido de las lecturas. */
const loEscrito = (): Peticion | undefined => peticiones.filter((p) => p.metodo === 'POST').at(-1);

/* ── El mapa: el arqueo del cierre de caja ─────────────────────────────── */

describe('cierre_caja manda un mapa por forma de pago, no cinco campos', () => {
  it('dibuja las cinco del dominio —con el cheque— y no las cuatro del prototipo', async () => {
    montarEnRuta(CIERRE);

    // Las cinco `FormaDePago` del recibo (V3). El cheque es la que el manual no
    // dibuja, y la que hace que un turno con uno salga descuadrado si no está.
    for (const etiqueta of [
      'Efectivo (S/)',
      'Cheque (S/)',
      'Depósito en cuenta (S/)',
      'Tarjeta de débito / crédito (S/)',
      'Transferencia / pago en línea (S/)',
    ]) {
      expect(await screen.findByLabelText(etiqueta)).toBeInTheDocument();
    }
    // Y la casilla del prototipo a la que sustituye ya no está: dibujar las dos
    // dejaría nueve cajas de importe, cuatro de ellas muertas.
    expect(screen.queryByLabelText('Pago en línea (S/)')).not.toBeInTheDocument();
  });

  it('el cuerpo lleva las cinco formas y ninguna clave fuera del vocabulario', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CIERRE);

    await usuario.type(await screen.findByLabelText('Efectivo (S/)'), '300.00');
    await usuario.type(screen.getByLabelText('Cheque (S/)'), '200.00');
    await usuario.type(screen.getByLabelText('Depósito en cuenta (S/)'), '150.00');
    await usuario.type(screen.getByLabelText('Tarjeta de débito / crédito (S/)'), '150.00');
    await usuario.type(screen.getByLabelText('Transferencia / pago en línea (S/)'), '100.00');
    await usuario.type(await observacion(), 'Cierre del turno de la mañana.');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar caja' }));
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(loEscrito()).toBeDefined());
    const enviada = loEscrito();
    expect(enviada?.url).toContain('/tesoreria/caja/cierre');
    expect(enviada?.cuerpo['declarado']).toEqual({
      EFECTIVO: '300.00',
      CHEQUE: '200.00',
      DEPOSITO: '150.00',
      TARJETA: '150.00',
      TRANSFERENCIA: '100.00',
    });
    // La caja y el cajero salen del filtro: el catálogo los dibuja «ro».
    expect(enviada?.cuerpo['caja']).toBe('001');
    expect(enviada?.cuerpo['cajero']).toBe('mgarcia');
    // Y ni un total, ni el turno, ni las horas: los calcula o los ignora el
    // servidor, y ninguno está en la lista blanca.
    for (const clave of [
      'totalDeclaradoS',
      'totalSistemaS',
      'diferenciaS',
      'turno',
      'horaDeApertura',
      'horaDeCierre',
      'recibosEmitidos',
      'observacionesDelArqueo',
      'motivoDeReversion',
    ]) {
      expect(enviada?.cuerpo, `«${clave}» no debería viajar`).not.toHaveProperty(clave);
    }
  });

  /**
   * **Las cifras del arqueo no se suman en la interfaz** (RNF-083), medido con
   * la forma que el backend produce.
   *
   * Con el juego de datos del prototipo esto no se ve —es el hueco de #398—:
   * ahí las partes suman el total. Aquí el turno tiene un cheque de 600 que el
   * manual no dibuja y una anulación de 20, así que las tres cifras son
   * distintas y una suma escrita en la interfaz se distingue de la buena.
   */
  it('teclear el arqueo no retotaliza nada: las tres cifras siguen siendo las del servidor', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CIERRE);

    // Las cinco filas arrancan vacías: son lo que se cuenta en el cajón, no lo
    // que el sistema ya sabe. Rellenarlas con `lineas[].declarado` sería enseñar
    // como declarado lo que nadie contó todavía.
    expect(await screen.findByLabelText('Cheque (S/)')).toHaveValue('');

    await usuario.type(screen.getByLabelText('Efectivo (S/)'), '300.00');
    await usuario.type(screen.getByLabelText('Cheque (S/)'), '200.00');
    await usuario.type(screen.getByLabelText('Depósito en cuenta (S/)'), '150.00');
    await usuario.type(screen.getByLabelText('Tarjeta de débito / crédito (S/)'), '150.00');
    await usuario.type(screen.getByLabelText('Transferencia / pago en línea (S/)'), '100.00');

    // Los tres campos «ro» del catálogo siguen diciendo lo que dijo el servidor
    // —se dibujan como `<output>`, no como caja de texto—, y el arqueo en vivo
    // publica «nada declarado» hasta que el cierre se firme.
    expect(screen.getByText('Total declarado (S/)').parentElement).toHaveTextContent('0.00');
    expect(screen.getByText('Total sistema (S/)').parentElement).toHaveTextContent('1480.00');
    expect(screen.getByText('Diferencia (S/)').parentElement).toHaveTextContent('-1480.00');

    // Y **ninguna** de las cifras que la interfaz habría compuesto al teclear:
    // ni el total de lo declarado (900.00) ni la diferencia que saldría de él
    // (-580.00). Las dos parecen correctas, y las dos contradicen al arqueo.
    expect(screen.queryByText('900.00')).not.toBeInTheDocument();
    expect(screen.queryByText('-580.00')).not.toBeInTheDocument();
  });

  it('sin observación no se cierra el turno (regla 10)', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(CIERRE);

    await usuario.type(await screen.findByLabelText('Efectivo (S/)'), '400.00');
    primariaApagada(screen.getByRole('button', { name: 'Cerrar caja' }));
    expect(motivoDeLaPrimaria()).toMatch(/observación/);

    await usuario.type(await observacion(), 'Cierre del turno.');
    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Cerrar caja' })));
    expect(loEscrito()).toBeUndefined();
  });

  it('sin caja ni cajero no hay turno al que apuntar, y lo dice', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/tesoreria/cierre-caja');

    await usuario.type(await observacion(), 'Cierre del turno.');

    primariaApagada(screen.getByRole('button', { name: 'Cerrar caja' }));
    expect(motivoDeLaPrimaria()).toMatch(/Falta la caja/);
    expect(loEscrito()).toBeUndefined();
  });
});

/* ── El discriminador: la anulación de un convenio ─────────────────────── */

describe('anulacion_convenio manda el cuerpo de la acción que se pulsó', () => {
  const completar = async (usuario: ReturnType<typeof userEvent.setup>): Promise<void> => {
    await usuario.type(await screen.findByLabelText('Motivo'), 'Incumplimiento de tres cuotas.');
    await usuario.type(await observacion(), 'Se cierra el convenio a pedido del área.');
  };

  /**
   * **El navy es «Anular», que es lo que la pantalla se llama** (#421,
   * `LA_QUE_ESCRIBE`). Con el orden del catálogo la primaria sería «Quebrar»
   * —la última de las siete—, que es el acto excepcional: el que se dicta cuando
   * el contribuyente incumple. «Quebrar» sigue estando y sigue escribiendo, pero
   * como secundaria.
   */
  it('la primaria es «Anular»; «Quebrar» escribe de secundaria', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completar(usuario);

    // La de **la barra de acciones**, no la primera del documento: el shell
    // dibuja las suyas.
    expect(primariaDeLaPantalla()).toHaveTextContent('Anular');
    expect(document.querySelectorAll('.sgtm-acciones .sgtm-boton--primario')).toHaveLength(1);
    const quebrar = screen.getByRole('button', { name: 'Quebrar' });
    expect(quebrar).not.toHaveClass('sgtm-boton--primario');
    // Y escribe igual: apagarla sería dejar el acto sin ningún botón que lo haga.
    expect(quebrar).toBeEnabled();
  });

  it('«Anular» manda ANULACION, con el número del convenio en la ruta', async () => {
    const usuario = userEvent.setup();
    laApiResponde({ estado: 'ANULADO' }, 201);
    montarEnRuta(ANULACION);
    await completar(usuario);

    await usuario.click(screen.getByRole('button', { name: 'Anular' }));
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(loEscrito()).toBeDefined());
    expect(loEscrito()?.url).toContain('/tesoreria/convenios/F-2026-000123/anulacion');
    expect(loEscrito()?.cuerpo['accion']).toBe('ANULACION');
    expect(loEscrito()?.cuerpo['motivo']).toBe('Incumplimiento de tres cuotas.');
  });

  /**
   * **La que este issue existe para poder escribir.** Con «devolver siempre el
   * cuerpo del primer verbo», pulsar «Quebrar» anularía el convenio: los dos
   * actos existen, se piden por la misma ruta y solo `accion` los distingue.
   */
  it('«Quebrar» manda QUIEBRE, no lo que mandaría «Anular»', async () => {
    const usuario = userEvent.setup();
    laApiResponde({ estado: 'QUEBRADO' }, 201);
    montarEnRuta(ANULACION);
    await completar(usuario);

    await usuario.click(screen.getByRole('button', { name: 'Quebrar' }));
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(loEscrito()).toBeDefined());
    expect(loEscrito()?.cuerpo).toEqual({
      accion: 'QUIEBRE',
      motivo: 'Incumplimiento de tres cuotas.',
      observacion: 'Se cierra el convenio a pedido del área.',
    });
  });

  /**
   * «Reformar» **no se declara**: `REFORMULACION` exige además el convenio nuevo
   * que sustituye al anterior, y esta pantalla no dibuja ninguna grilla de deuda
   * donde acogerla. Un botón declarado a medias mandaría `accion: REFORMULACION`
   * sin `reformulacion`, que es el 422 que el controlador contesta nombrándolo.
   */
  it('«Reformar» no escribe: no está declarada, y no manda nada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completar(usuario);

    const reformar = screen.getByRole('button', { name: 'Reformar' });
    expect(reformar).toBeDisabled();
    await usuario.click(reformar);

    expect(loEscrito()).toBeUndefined();
  });

  it('sin motivo no se puede ni anular ni quebrar (el backend lo exige)', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await usuario.type(await observacion(), 'Se cierra el convenio.');

    primariaApagada(screen.getByRole('button', { name: 'Anular' }));
    expect(motivoDeLaPrimaria()).toMatch(/Falta el motivo/);
    // Y la secundaria que también escribe se apaga con el mismo motivo: si no,
    // la mitad de la pantalla guardaría lo que la otra mitad no deja guardar.
    expect(screen.getByRole('button', { name: 'Quebrar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await usuario.click(screen.getByRole('button', { name: 'Quebrar' }));
    expect(loEscrito()).toBeUndefined();
  });

  it('los dos actos son irreversibles: no salen hasta confirmar', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ANULACION);
    await completar(usuario);

    await usuario.click(screen.getByRole('button', { name: 'Quebrar' }));
    expect(loEscrito()).toBeUndefined();
    expect(screen.getByText(/no se deshace/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(loEscrito()).toBeUndefined();
  });
});

/* ── Y ninguna de las dos gana un componente propio ────────────────────── */

describe('las dos siguen en el renderizador común', () => {
  it('ni `cierre_caja` ni `anulacion_convenio` entran en COMPONENTES_PROPIOS', () => {
    // El objetivo del issue es exactamente el contrario: cada entrada de esa
    // lista es una pantalla que deja de estar cubierta por las pruebas
    // transversales del camino de escritura.
    expect(Object.hasOwn(COMPONENTES_PROPIOS, 'cierre_caja')).toBe(false);
    expect(Object.hasOwn(COMPONENTES_PROPIOS, 'anulacion_convenio')).toBe(false);
  });
});
