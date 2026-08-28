import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { cambiarEjercicio, montarEnRuta, montarEnRutas, volverAtras } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada, primariaEncendida } from '../../pruebas/acciones';

/**
 * Baja de deuda: **la pantalla elige su fila** (#332, RF-044).
 *
 * Su catalogo dibuja una primera columna vacia desde el prototipo, y esa columna
 * es la obligacion que se extingue. Hasta ahora no era nada: para dar de baja
 * una cuota habia que volver a teclear a mano su ano, su cuota y su tributo al
 * lado de la tabla que ya los muestra —o, peor, pulsar «Dar de baja» y mandar
 * solo la observacion—.
 *
 * Lo que se comprueba aqui son propiedades, no dibujo:
 *
 * 1. **La interfaz no suma.** La banda dice cuantas filas hay elegidas y quien
 *    pone el importe es el servidor (RNF-083). El total de una baja no es la
 *    suma de lo que se ve: el interes corre hasta la fecha del acto.
 * 2. **El cuerpo identifica la obligacion, entera.** `ClaveDeSaldo` la compara
 *    por (contribuyente, tributo, ejercicio, periodo, predioId, vehiculoId) con
 *    igualdad exacta: la fila que viaja lleva los seis o la baja cae sobre otra
 *    obligacion del mismo contribuyente.
 * 3. **La baja registra una obligacion por acto**, porque eso es lo que
 *    `MovimientosDeDeudaController.PeticionDeMovimiento` acepta.
 * 4. **Lo que el backend no puede leer no se manda, y se dice**: un rango de
 *    cuotas, un tributo sin codigo, un importe con separador de miles.
 * 5. **Lo elegido no sobrevive a un cambio de lo que se mira**, ni siquiera al
 *    boton Atras del navegador.
 */

/** La pantalla, con el contribuyente en el filtro: la baja es sobre su cuenta. */
const BAJA = '/rentas-registro/baja-deuda?codContribuyente=00000006550';
/** La misma pantalla, otro contribuyente: es a lo que se vuelve con Atras. */
const OTRA_BAJA = '/rentas-registro/baja-deuda?codContribuyente=00000025673';

const original = globalThis.fetch;
let peticiones: { metodo: string; cuerpo: string }[] = [];
/** Las URL con las que se leyo la deuda. Lo que mira la prueba de la fecha de corte. */
let lecturasDeDeuda: string[] = [];
/**
 * Si el padron ya cambio debajo.
 *
 * Se dispara a mano y no contando lecturas: **la pantalla lee mas de una vez por
 * motivos legitimos** —escribir la fecha de la resolucion vuelve a pedir la deuda
 * a esa fecha (#337)—, asi que «la segunda lectura» dejo de significar «alguien
 * pago mientras tanto», que es lo que la prueba quiere simular.
 */
let cambiadaDebajo = false;

/** Alguien pago en la ventanilla de al lado: desde aqui, la lectura trae lo otro. */
const laDeudaCambia = (): void => {
  cambiadaDebajo = true;
};

/**
 * Una obligacion tal como la publica `ObligacionConDeudaResource` (#22).
 *
 * Los importes van **como los serializa el backend** —`toPlainString`, sin
 * separador de miles—, que es exactamente el punto de varias de estas pruebas.
 */
function obligacion(campos: {
  tributo: string;
  ejercicio: number;
  periodoDesde: number;
  periodoHasta: number;
  predioId?: number | null;
  vehiculoId?: number | null;
  insoluto: string;
  interes: string;
}): Readonly<Record<string, unknown>> {
  const importe = (valor: string) => ({ importe: valor, actualizadoA: '2026-08-13' });
  return {
    tributo: campos.tributo,
    ejercicio: campos.ejercicio,
    predioId: campos.predioId ?? null,
    vehiculoId: campos.vehiculoId ?? null,
    periodoDesde: campos.periodoDesde,
    periodoHasta: campos.periodoHasta,
    fase: 'ORDINARIA',
    deuda: {
      insoluto: importe(campos.insoluto),
      reajuste: importe('0.00'),
      interes: importe(campos.interes),
      gasto: importe('0.00'),
      total: importe(campos.insoluto),
    },
  };
}

/** Una cuota que **si** se puede dar de baja: cuota unica, tributo con codigo, predio. */
const CUOTA_UNICA = obligacion({
  tributo: 'PREDIAL',
  ejercicio: 2026,
  periodoDesde: 2,
  periodoHasta: 2,
  predioId: 41,
  insoluto: '1842.60',
  interes: '84.12',
});

/** El sobre paginado de `RespuestaPaginada` (#6), con lo que la prueba quiera dentro. */
const pagina = (contenido: readonly Readonly<Record<string, unknown>>[]) => ({
  contenido,
  pagina: 0,
  tamano: contenido.length,
  totalElementos: contenido.length,
  totalPaginas: 1,
  hayMas: false,
});

/**
 * El proxy contesta la lectura y la prueba intercepta la escritura.
 *
 * Con `deuda`, ademas, **la lectura la sirve la prueba**: el juego de datos del
 * prototipo no tiene ninguna fila que se pueda dar de baja —sus cuotas son
 * rangos y su unica cuota suelta es una multa administrativa, que no tiene
 * codigo de tributo—, y eso mismo se comprueba mas abajo contra el proxy.
 */
function laApiResponde(
  deuda?: readonly Readonly<Record<string, unknown>>[],
  /** Lo que sirve **desde que alguien llama a {@link laDeudaCambia}**, no antes. */
  despues?: readonly Readonly<Record<string, unknown>>[],
): void {
  peticiones = [];
  lecturasDeDeuda = [];
  cambiadaDebajo = false;
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const metodo = opciones?.method ?? 'GET';
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (metodo === 'GET') {
      if (url.includes('/consultas/deuda')) lecturasDeDeuda.push(url);
      if (deuda !== undefined && url.includes('/consultas/deuda')) {
        const servida = cambiadaDebajo ? (despues ?? deuda) : deuda;
        return Promise.resolve(
          new Response(JSON.stringify(pagina(servida)), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return proxy(entrada, opciones);
    }
    peticiones.push({
      metodo,
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return Promise.resolve(
      new Response(JSON.stringify({ sentido: 'BAJA' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

/** Y la lectura que **no se puede hacer**: 403 sobre `GET /consultas/deuda`. */
function laDeudaNoSeDejaLeer(): void {
  peticiones = [];
  lecturasDeDeuda = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (url.includes('/consultas/deuda')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: 403, title: 'Sin permiso', detail: 'No autorizado' }),
          { status: 403, headers: { 'content-type': 'application/problem+json' } },
        ),
      );
    }
    return proxy(entrada, opciones);
  };
}

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  laApiResponde();
});
afterEach(() => {
  desinstalarProxyDeDatos();
  globalThis.fetch = original;
});

/** Las casillas de la tabla, en el orden de las filas. */
async function casillas(): Promise<HTMLInputElement[]> {
  await waitFor(() =>
    expect(document.querySelectorAll('.sgtm-tabla__casilla input').length).toBeGreaterThan(0),
  );
  return [...document.querySelectorAll<HTMLInputElement>('.sgtm-tabla__casilla input')];
}

/** El sustento que el backend exige: sin resolucion no se registra. */
async function sustento(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  const numero = screen.getByLabelText('Nº de resolución');
  await usuario.clear(numero);
  await usuario.type(numero, 'RGAT-0244-2026-MPS');
  const fecha = screen.getByLabelText('Fecha de resolución');
  await usuario.clear(fecha);
  await usuario.type(fecha, '2026-08-04');
}

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

const banda = (): string => document.querySelector('.sgtm-seleccion')?.textContent ?? '';

/**
 * Salir de la pestaña y volver, que es lo que dispara la relectura.
 *
 * El cliente de consultas mira `visibilityState`, no el evento suelto: sin el
 * paso por «oculta» no hay cambio que recuperar y no vuelve a pedir nada.
 */
function volverALaPestana(): void {
  const fijar = (estado: DocumentVisibilityState): void => {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(window, new Event('visibilitychange'));
  };
  fijar('hidden');
  fijar('visible');
}

describe('la tabla elige sus filas, y la banda las cuenta sin sumarlas', () => {
  it('la banda dice cuantas y **ninguna cifra**: el total lo pone el servidor', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera, segunda] = await casillas();
    expect(banda()).toContain('0 cuotas elegidas');

    await usuario.click(primera as HTMLInputElement);
    expect(banda()).toContain('1 cuota elegida');

    await usuario.click(segunda as HTMLInputElement);
    expect(banda()).toContain('2 cuotas elegidas');
    // **Ni una cifra.** Sumar las dos columnas que tiene delante daria un total
    // que el backend no puede sustentar (RNF-083), y ademas seria el equivocado.
    expect(banda()).not.toMatch(/\d+[.,]\d\d/);
    expect(banda()).toMatch(/previsualización todavía no está disponible/);
  });

  /**
   * La region viva es **el recuento**, no la banda entera.
   *
   * Con `role="status"` en el parrafo, marcar una casilla hacia releer las
   * veintidos palabras de la explicacion —que no ha cambiado—: quien elige seis
   * cuotas con lector de pantalla se las oye seis veces.
   */
  it('solo el recuento se anuncia; la explicación se queda fuera de la región viva', async () => {
    montarEnRuta(BAJA);
    await casillas();

    const viva = document.querySelector('.sgtm-seleccion [role="status"]');
    expect(viva?.textContent).toContain('0 cuotas elegidas');
    expect(viva?.textContent).not.toMatch(/previsualización/);
  });

  it('la primaria dice sobre cuantas actua', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    expect(await screen.findByRole('button', { name: 'Dar de baja (0)' })).toBeInTheDocument();
    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(screen.getByRole('button', { name: 'Dar de baja (1)' })).toBeInTheDocument();
  });

  /**
   * El nombre accesible de la casilla lleva **el tributo**, que es lo que separa
   * dos obligaciones del mismo año y la misma cuota.
   *
   * Se caia por el guion: la columna «Unidad» sale siempre `SIN_DATO`, se
   * contaba como dato y se llevaba uno de los tres huecos, dejando fuera
   * precisamente el tributo. En un acto que no se deshace.
   */
  it('la casilla se nombra con sus datos, y el guión no es un dato', async () => {
    montarEnRuta(BAJA);
    const [primera] = await casillas();
    const nombre = primera?.parentElement?.textContent ?? '';

    expect(nombre).not.toContain('—');
    expect(nombre).toMatch(/^Elegir la cuota /);
    expect(nombre).toContain('IMPUESTO PREDIAL');
  });

  it('buscar otra vez vacia lo elegido: el indice 3 de la pagina nueva es otra cuota', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(banda()).toContain('1 cuota elegida');

    const busqueda = await screen.findByRole('region', { name: 'Búsqueda' });
    await usuario.click(within(busqueda).getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(banda()).toContain('0 cuotas elegidas'));
  });

  /**
   * **Y el boton Atras tambien**, que es el que se escapaba (#332).
   *
   * No pasa por «Buscar»: restaura la busqueda anterior y ya. Con la seleccion
   * guardada por indice y sin vaciar, la casilla seguia marcada sobre la pagina
   * restaurada y lo que se mandaba era esa fila con el `codContribuyente` del
   * filtro de vuelta: la baja de un contribuyente cargada a la cuenta de otro.
   */
  /**
   * La fila elegida se identifica **por su contenido**, no por su posicion.
   *
   * Con el indice, marcar la segunda casilla y que la respuesta cambiara debajo
   * dejaba marcada «la segunda», que ya es otra cuota. Aqui se ve por los dos
   * lados: la casilla que queda marcada es **la que se pulso**, y si la deuda se
   * vuelve a leer y esa fila ya no esta, la accion no manda nada y lo dice.
   */
  it('la casilla que queda marcada es la de la fila pulsada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const filas = await casillas();
    await usuario.click(filas[1] as HTMLInputElement);

    expect(filas[0]?.checked).toBe(false);
    expect(filas[1]?.checked).toBe(true);
  });

  it('si la deuda cambia debajo, lo elegido deja de valer y no se manda', async () => {
    const usuario = userEvent.setup();
    // La segunda lectura trae **otra** obligacion: alguien pago mientras tanto.
    laApiResponde(
      [CUOTA_UNICA],
      [
        obligacion({
          tributo: 'ARBITRIO',
          ejercicio: 2025,
          periodoDesde: 3,
          periodoHasta: 3,
          predioId: 7,
          insoluto: '120.00',
          interes: '4.00',
        }),
      ],
    );
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await sustento(usuario);
    await usuario.type(await observacion(), 'Prescripción declarada de oficio.');
    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Dar de baja (1)' })));

    // Salir de la pestaña y volver relee la deuda —es lo que hace el cliente de
    // consultas al recuperar la visibilidad—, y es justo cuando el padron puede
    // haber cambiado: alguien pago en la ventanilla de al lado.
    laDeudaCambia();
    volverALaPestana();

    // La tabla trae ya la otra obligacion…
    await waitFor(() => expect(document.querySelector('tbody')?.textContent).toContain('2025'));
    // …y lo que estaba elegido ya no señala a ninguna de sus filas.
    await waitFor(() => expect(motivoDeLaPrimaria()).toMatch(/ya no está en esta página/));
    primariaApagada(screen.getByRole('button', { name: /^Dar de baja/ }));
    expect(peticiones).toHaveLength(0);
  });

  it('volver atrás con el navegador vacía lo elegido', async () => {
    const usuario = userEvent.setup();
    montarEnRutas([BAJA, OTRA_BAJA]);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(banda()).toContain('1 cuota elegida');

    volverAtras();

    await waitFor(() => expect(banda()).toContain('0 cuotas elegidas'));
    // Y la accion vuelve a pedir que se elija: no queda nada capturado detras.
    expect(motivoDeLaPrimaria()).toMatch(/Elige en la tabla la cuota/);
  });

  /**
   * **Y cambiar el año de trabajo tambien lo vacia** (#337).
   *
   * El ejercicio es global a la sesion: cambiarlo cambia lo que muestran las doce
   * modulos, esta tabla incluida. La cuota que estaba marcada era del ejercicio
   * anterior, y dejarla marcada sobre el padron del ano nuevo es la misma clase
   * de defecto que el boton Atras: lo que viaja no es lo que se esta mirando.
   * `Pantalla` ya lo vaciaba —el efecto depende de `trabajo.ejercicio`— y nada lo
   * comprobaba: quitar esa dependencia dejaba las 767 en verde.
   */
  it('cambiar el año de trabajo vacía lo elegido', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(banda()).toContain('1 cuota elegida');

    cambiarEjercicio(2025);

    await waitFor(() => expect(banda()).toContain('0 cuotas elegidas'));
    expect(motivoDeLaPrimaria()).toMatch(/Elige en la tabla la cuota/);
  });
});

describe('el motivo por el que todavia no se puede dar de baja se ve', () => {
  it('sin ninguna fila elegida, lo dice antes que la observacion', async () => {
    montarEnRuta(BAJA);
    await screen.findByRole('button', { name: 'Dar de baja (0)' });
    expect(motivoDeLaPrimaria()).toMatch(/Elige en la tabla la cuota/);
  });

  /**
   * **Una fila cuya cuota es un rango no se puede dar de baja, y se dice.**
   *
   * Es el caso normal del padron —`ConsultarDeuda` agrega periodos, y el juego
   * de datos escribe «1 - 4» y «1 - 12»—, y era el mas caro: `cuota` viajaba con
   * `entero: true`, «1 - 4» no es un entero, el campo no salia, y el backend lee
   * la cuota ausente como periodo 0, que es **la obligacion anual**. Otra fila.
   */
  it('una cuota en rango se rechaza, y el motivo lo dice sin hablar del contrato', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    // La primera fila del juego de datos es «2026 · 1 - 4 · IMPUESTO PREDIAL».
    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);

    const motivo = motivoDeLaPrimaria() ?? '';
    expect(motivo).toMatch(/agrupa varias cuotas/);
    expect(motivo).toContain('1 - 4');
    expect(motivo).not.toMatch(/backend|periodo 0|entero/i);
    primariaApagada();
  });

  /**
   * **Una multa si se puede dar de baja**, y ese rechazo era falso (#337).
   *
   * La pantalla apagaba la accion diciendo que «el sistema todavía no tiene un
   * código para ese tributo», y lo tiene: `RegistrarPapeleta` asienta
   * `MULTA_TRANSITO` y `MULTA_ADMINISTRATIVA`, la columna `tributo` del libro es
   * `varchar` sin `CHECK` y `PeticionDeMovimiento.tributo` es un `String` libre
   * que `ClaveDeSaldo` solo normaliza. Lo que sobraba era traducir un tributo
   * que **ya viene del backend** por el diccionario del desplegable de otra
   * pantalla. El motivo falso dejaba sin dar de baja toda la deuda por multas.
   */
  it('una multa se puede dar de baja: su tributo viaja tal cual', async () => {
    const usuario = userEvent.setup();
    laApiResponde([
      obligacion({
        tributo: 'MULTA ADMINISTRATIVA',
        ejercicio: 2023,
        periodoDesde: 1,
        periodoHasta: 1,
        insoluto: '350.00',
        interes: '61.25',
      }),
    ]);
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await sustento(usuario);
    await usuario.type(await observacion(), 'Resolución que deja sin efecto la multa.');

    // Ni motivo que lo impida, ni accion apagada.
    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Dar de baja (1)' })));
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja (1)' }));
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    // Verbatim: es el vocabulario del libro, no el del prototipo.
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}').tributo).toBe('MULTA ADMINISTRATIVA');
  });

  it('con dos filas elegidas dice que la baja registra una obligacion por acto', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const [primera, segunda] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await usuario.click(segunda as HTMLInputElement);

    expect(motivoDeLaPrimaria()).toMatch(/una obligación por acto/);
    primariaApagada(screen.getByRole('button', { name: 'Dar de baja (2)' }));
  });

  it('con la fila elegida y sin sustento, pide la resolucion', async () => {
    const usuario = userEvent.setup();
    laApiResponde([CUOTA_UNICA]);
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    expect(motivoDeLaPrimaria()).toMatch(/Falta el documento que sustenta/);
  });

  it('con todo puesto, la accion se habilita', async () => {
    const usuario = userEvent.setup();
    laApiResponde([CUOTA_UNICA]);
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await sustento(usuario);
    await usuario.type(await observacion(), 'Prescripción declarada de oficio.');

    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Dar de baja (1)' })));
  });
});

describe('el cuerpo lleva la obligacion entera, y solo lo que la lista blanca declara', () => {
  it('los seis campos de `ClaveDeSaldo`, con los importes tal como el backend los lee', async () => {
    const usuario = userEvent.setup();
    laApiResponde([CUOTA_UNICA]);
    montarEnRuta(BAJA);

    const [primera] = await casillas();
    await usuario.click(primera as HTMLInputElement);
    await sustento(usuario);
    await usuario.type(await observacion(), 'Prescripción declarada de oficio.');

    // Escribir la fecha de la resolución **vuelve a leer la deuda a esa fecha**
    // (ver la prueba de la fecha de corte): se espera a que la lectura vuelva.
    await waitFor(() => primariaEncendida(screen.getByRole('button', { name: 'Dar de baja (1)' })));
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja (1)' }));
    // Dar de baja no se deshace: se confirma diciendo que va a pasar (regla 4).
    const aviso = await screen.findByText(/y eso no se deshace/);
    expect(aviso.textContent).toContain('sobre 1 cuota');
    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('POST');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      // Del filtro, porque la tabla no publica una columna con el titular: la
      // pantalla entera es de un contribuyente.
      codContribuyente: '00000006550',
      tributo: 'PREDIAL',
      ano: '2026',
      // La cuota, entera, porque la obligacion es de una sola.
      cuota: 2,
      // **Y el predio.** Es el campo que faltaba: `ClaveDeSaldo` compara con
      // igualdad exacta, asi que sin el la baja caia sobre la obligacion que ese
      // contribuyente tuviera sin unidad, que es otra.
      predioId: 41,
      // Los importes como `BigDecimal` los lee: sin separador de miles. La celda
      // dibujada llevaria «1,842.60», y `new BigDecimal` con la coma lanza.
      insoluto: '1842.60',
      interes: '84.12',
      // **Y la fase.** Sin ella la baja resuelve a ORDINARIA y `proyectar` hace
      // `DO UPDATE SET fase = EXCLUDED.fase`: una baja parcial sobre deuda en
      // coactiva la devolvia a la fase ordinaria en silencio.
      fase: 'ORDINARIA',
      // El sustento documental: sin el, `MovimientoDeDeuda` no se construye.
      documentoOrigen: 'RGAT-0244-2026-MPS',
      fechaValor: '2026-08-04',
      observacion: 'Prescripción declarada de oficio.',
    });
    // `vehiculoId` no viaja: la obligacion cuelga de un predio, y un identificador
    // vacio no es un identificador.
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).not.toHaveProperty('vehiculoId');
    // Ni `unidad` ni el total: la primera es texto de presentacion y el segundo
    // lo rehace el servidor (RNF-083).
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).not.toHaveProperty('unidad');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).not.toHaveProperty('totalS');
  });
});

/**
 * **La deuda se lee a la fecha del acto** (#337, regla 9).
 *
 * `fechaValor` de la baja es la fecha de la resolucion, y el backend valida la
 * baja contra `deudaActualizadaA(fechaValor)`: manda el insoluto y el interes que
 * la pantalla eligio y los compara con los que el calcula **a esa fecha**. Con la
 * tabla leida a hoy —que es lo que pasaba, porque la pantalla no mandaba fecha de
 * corte— y una resolucion anterior, el interes que viaja es mayor, y la baja
 * volvia como `BajaMayorQueLaDeuda` (422) despues de confirmar un acto que no se
 * deshace.
 */
describe('lo que se ve y lo que se manda son de la misma fecha', () => {
  it('con la fecha de resolución escrita, la deuda se vuelve a leer a esa fecha', async () => {
    const usuario = userEvent.setup();
    laApiResponde([CUOTA_UNICA]);
    montarEnRuta(BAJA);

    await casillas();
    // La primera lectura es la de abrir la pantalla: sin fecha, la de hoy.
    expect(lecturasDeDeuda[0]).not.toContain('fechaDeCorte');

    const fecha = screen.getByLabelText('Fecha de resolución');
    await usuario.clear(fecha);
    await usuario.type(fecha, '2026-08-04');

    await waitFor(() => {
      const ultima = lecturasDeDeuda[lecturasDeDeuda.length - 1] ?? '';
      expect(ultima).toContain('fechaDeCorte=2026-08-04');
    });
  });

  /**
   * Y una fecha a medias no se manda: el campo se teclea caracter a caracter, y
   * «2026-0» es un 400 por cada pulsacion.
   */
  it('una fecha incompleta no viaja como fecha de corte', async () => {
    const usuario = userEvent.setup();
    laApiResponde([CUOTA_UNICA]);
    montarEnRuta(BAJA);

    await casillas();
    const fecha = screen.getByLabelText('Fecha de resolución');
    await usuario.clear(fecha);
    await usuario.type(fecha, '2026-08');

    // Ninguna lectura sale con una fecha que `LocalDate` no sabria leer.
    for (const url of lecturasDeDeuda) {
      expect(url).not.toMatch(/fechaDeCorte=(?!\d{4}-\d{2}-\d{2}(&|$))/);
    }
  });
});

/**
 * **Sin contribuyente no hay deuda que leer** (#337).
 *
 * `codContribuyente` es `@RequestParam` obligatorio de `GET /consultas/deuda`:
 * abrir la pantalla sin buscar a nadie es un 400 contra el backend real. El proxy
 * lo tapa —contesta igual con filtro o sin el—, asi que el defecto solo se ve al
 * conectar; lo que se comprueba aqui es que **la peticion no sale** y que lo que
 * se dice es lo que hay que hacer.
 */
describe('la lectura no se dispara sin el filtro que su operacion exige', () => {
  it('sin contribuyente, ni petición ni tabla muda: se pide que se busque', async () => {
    laApiResponde([CUOTA_UNICA]);
    montarEnRuta('/rentas-registro/baja-deuda');

    expect(await screen.findByText('Busca un contribuyente para ver su deuda')).toBeInTheDocument();
    expect(lecturasDeDeuda).toEqual([]);
  });
});

/**
 * **La primaria apagada no abre la confirmación de un acto irreversible** (#337).
 *
 * Se apaga con `aria-disabled` y no con `disabled` —para que su motivo se pueda
 * leer con teclado y con lector—, y eso deja el `onClick` vivo: sin la guarda,
 * pulsarla abria «vas a dar de baja sobre 0 cuotas, y eso no se deshace», que
 * despues no hace nada. Una confirmacion de un acto que no va a ocurrir es peor
 * que ninguna.
 */
describe('la primaria apagada no promete nada al pulsarla', () => {
  it('pulsar la primaria con motivo no abre la confirmación', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(BAJA);

    const primaria = await screen.findByRole('button', { name: 'Dar de baja (0)' });
    primariaApagada(primaria);
    await usuario.click(primaria);

    expect(screen.queryByText(/y eso no se deshace/)).not.toBeInTheDocument();
    expect(peticiones).toEqual([]);
  });
});

/**
 * **Esta pantalla lee con un permiso que no es el suyo** (#332).
 *
 * Escribe con «Baja de deuda» y lee la deuda con «Consulta de deuda», que es
 * otra opcion del catalogo con su propio permiso. Quien tenga una y no la otra
 * recibia el aviso generico —«no tienes permiso para esta opción»—, que le manda
 * a pedir el permiso que ya tiene.
 */
describe('la lectura de la que depende se nombra cuando falta', () => {
  it('un 403 al leer la deuda dice **cuál** permiso falta', async () => {
    laDeudaNoSeDejaLeer();
    montarEnRuta(BAJA);

    expect(
      await screen.findByText(/Falta el permiso de lectura de «Consulta de deuda»/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/para elegir las cuotas hace falta lectura de «Consulta de deuda»/i),
    ).toBeInTheDocument();
    // Y no la tabla vacia y muda de antes, que se lee como «no hay deuda».
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
