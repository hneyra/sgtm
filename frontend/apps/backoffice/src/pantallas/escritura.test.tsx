import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { crearClienteDeConsultas } from '../app/App';
import { clienteDePruebas, montarEnRuta } from '../pruebas/montar';
import { primariaApagada, primariaEncendida } from '../pruebas/acciones';
import { useEscritura } from './escritura';
import type { OpcionesDeEscritura } from './escritura';

/**
 * El camino de escritura completo (regla 10 de CLAUDE.md, RNF-052).
 *
 * Ninguna accion de las 134 pantallas escribia, y no por falta de backend:
 * **toda modificacion de datos exige observacion del usuario**, y un boton que
 * guardara sin ella seria un defecto del formulario, no una funcionalidad a
 * medias. Esto comprueba que ahora escribe, y que no puede hacerlo sin ella.
 */

/**
 * Una pantalla que escribe **y lo tiene declarado**: `POST /rentas/deuda/altas`.
 *
 * Era «Predial — masivo» hasta #332. Dejo de servir por lo mismo que #332
 * arreglo: una opcion sin declarar en `escrituras.ts` mandaba solo su
 * observacion —«guardaba» sin guardar nada—, y ahora su accion se queda apagada
 * diciendo por que. Para probar el camino de escritura hace falta una pantalla
 * que **pueda** recorrerlo entero; que las otras no puedan se comprueba en
 * `actos-honestos.test.tsx`, que es donde toca.
 */
const ALTA = '/rentas-registro/alta-deuda';
/**
 * Su accion primaria notifica, y eso no se deshace —el acuse sostiene el plazo—:
 * `POST /valores/{nro}/notificacion`, declarada en `escrituras.ts`.
 */
const CUPONERA = '/valores/notificacion-valores/OP-2026-004182';

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly clave: string | null;
  readonly cuerpo: string;
}

const original = globalThis.fetch;
let peticiones: Peticion[] = [];

function laApiResponde(estado: number, cuerpo: unknown = { fechaCalculo: '2026-08-13' }): void {
  peticiones = [];
  globalThis.fetch = (entrada, opciones) => {
    const cabeceras = new Headers(opciones?.headers);
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      clave: cabeceras.get('idempotency-key'),
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

afterEach(() => {
  globalThis.fetch = original;
});

/** La caja de escritura, cuando ya llego el trozo del modulo. */
const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

/**
 * Elige el concepto del alta de deuda, y desde #342 (nit 3) tambien su año y
 * su documento: los tres **hay que llenarlos**, con la misma dureza.
 *
 * Antes solo hacia falta el concepto y esa era justamente la mitad del
 * defecto de #331: el desplegable se dibujaba mostrando «IMPUESTO PREDIAL» sin
 * que nadie lo tocara —un `sel` sin opcion vacia se pinta con su primera
 * opcion—, el borrador estaba vacio y el cuerpo salia **sin `tributo`**. El
 * año tenia el mismo hueco (`escrituras.ts`, `faltaEnElAlta`): un desplegable
 * que tambien lleva `eleccionObligatoria` y al que nada obligaba a elegir.
 * Estas pruebas usan «Alta de deuda» como la pantalla que escribe, no como el
 * caso de negocio: eligen el predial, que no cuelga de ninguna unidad, y lo
 * demas se comprueba igual.
 */
const elConcepto = async (
  usuario: ReturnType<typeof userEvent.setup>,
  concepto = 'IMPUESTO PREDIAL',
): Promise<void> => {
  await usuario.selectOptions(await screen.findByLabelText('Concepto / tributo'), concepto);
  await usuario.selectOptions(await screen.findByLabelText('Año'), '2026');
  await usuario.type(screen.getByLabelText('Nº del documento'), 'RD-2026-000123');
};

describe('sin observacion no se guarda', () => {
  it('abrir una pantalla que escribe no escribe nada', async () => {
    laApiResponde(201);
    montarEnRuta(ALTA);

    await screen.findByRole('heading', { level: 1 });
    // Abrir «alta de deuda» no puede dar de alta ninguna deuda.
    expect(peticiones).toEqual([]);
  });

  it.each([
    { pantalla: 'alta de deuda', ruta: ALTA, primaria: 'Dar de alta' },
    { pantalla: 'notificación de valores', ruta: CUPONERA, primaria: 'Registrar notificación' },
  ])(
    '$pantalla: la accion primaria esta deshabilitada hasta que hay observacion',
    async ({ ruta, primaria }) => {
      const usuario = userEvent.setup();
      laApiResponde(201);
      montarEnRuta(ruta);

      const accion = await screen.findByRole('button', { name: primaria });
      // Apagada con `aria-disabled`, no con `disabled`: sigue siendo enfocable
      // para que el motivo que lleva al lado se pueda leer (#332).
      primariaApagada(accion);

      if (ruta === ALTA) await elConcepto(usuario);
      await usuario.type(await observacion(), 'Corrección solicitada por el contribuyente.');
      primariaEncendida(accion);

      // Y si se borra, vuelve a apagarse: no es una puerta que se abre una vez.
      await usuario.clear(await observacion());
      primariaApagada(accion);
    },
  );

  it('la observacion viaja en el cuerpo, que es donde la audita el backend', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'Emisión anual 2026.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('POST');
    // El concepto, el año, el documento y la observacion —los cuatro que
    // `elConcepto` llena (#342, nit 3)— **y nada mas**: los otros diez campos
    // del formulario siguen sin tocarse, y lo que no se toca no viaja.
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      tributo: 'PREDIAL',
      ano: '2026',
      documentoOrigen: 'RD-2026-000123',
      observacion: 'Emisión anual 2026.',
    });
  });
});

describe('idempotencia: una clave por intento', () => {
  it('el reintento del mismo intento manda la misma clave', async () => {
    const usuario = userEvent.setup();
    laApiResponde(503, {
      title: 'Servicio no disponible',
      status: 503,
      detail: 'Vuelve a intentarlo.',
    });
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'Emisión anual 2026.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));
    await waitFor(() => expect(peticiones).toHaveLength(1));

    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));
    await waitFor(() => expect(peticiones).toHaveLength(2));

    // Dos envios del mismo intento: para el servidor es **uno**. Regenerar la
    // clave aqui convertiria un reintento en un segundo proceso.
    expect(peticiones[0]?.clave).toBe(peticiones[1]?.clave);
    expect(peticiones[0]?.clave).toBeTruthy();
  });

  it('corregir lo que se manda empieza un intento nuevo, con otra clave', async () => {
    const usuario = userEvent.setup();
    laApiResponde(503, {
      title: 'Servicio no disponible',
      status: 503,
      detail: 'Vuelve a intentarlo.',
    });
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'Emisión anual.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));
    await waitFor(() => expect(peticiones).toHaveLength(1));

    await usuario.type(await observacion(), ' Corregida.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));
    await waitFor(() => expect(peticiones).toHaveLength(2));

    // Con la clave anterior, el servidor devolveria el resultado del intento que
    // se estaba corrigiendo, y la correccion se perderia.
    expect(peticiones[0]?.clave).not.toBe(peticiones[1]?.clave);
  });
});

/**
 * **Tras guardar, entra el siguiente** (RNF-082).
 *
 * Venia de `tesoreria.test.tsx`, sobre la caja de tasas. Se movio aqui en #332
 * por un motivo y no por comodidad: `caja_tasas` no declara su escritura, asi
 * que desde entonces su accion no guarda —ni debe—, y una propiedad del camino
 * de escritura no se puede comprobar sobre una pantalla que no lo recorre. Lo
 * que se comprueba es lo mismo, con la misma exigencia, sobre una que si lo
 * recorre y que tambien tiene bloque de busqueda.
 */
describe('tras guardar, el foco vuelve a la busqueda', () => {
  it('al primer campo escribible, sin tocar el raton', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(CUPONERA);

    await usuario.type(await observacion(), 'Diligencia del 13 de agosto.');
    await usuario.click(await screen.findByRole('button', { name: 'Registrar notificación' }));
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));
    await screen.findByText(/Guardado, con tu observación/);

    // Si el foco se quedara en el boton, ese gesto se paga en cada acto, y en
    // una ventanilla son cientos al dia.
    const busqueda = screen.getByRole('region', { name: 'Búsqueda' });
    const primero = busqueda.querySelector('input:not([readonly]):not([disabled])');
    expect(primero).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(primero));
  });

  it('y no se lo lleva despues: el usuario puede mover el foco donde quiera', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(CUPONERA);

    await usuario.type(await observacion(), 'Diligencia del 13 de agosto.');
    await usuario.click(await screen.findByRole('button', { name: 'Registrar notificación' }));
    await usuario.click(await screen.findByRole('button', { name: /^Confirmar/ }));
    await screen.findByText(/Guardado, con tu observación/);
    await waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'));

    // Enfocar en cada render mientras «guardada» siga siendo cierto dejaria el
    // foco clavado: se enfoca en el flanco, una vez.
    const otro = screen.getAllByRole('button')[0];
    expect(otro).toBeDefined();
    otro?.focus();
    expect(document.activeElement).toBe(otro);

    // Y se provoca un render mas —escribir la observacion del siguiente acto—
    // porque sin el, «una vez» y «en cada render» no se distinguen.
    await usuario.type(await observacion(), 'Siguiente diligencia.');
    expect(document.activeElement).toBe(await observacion());
  });
});

describe('una escritura no se reintenta sola', () => {
  it('el cliente de la aplicacion lo tiene fijado, no solo el de las pruebas', () => {
    // Es una linea que alguien «optimiza» algun dia. Un reintento automatico de
    // un cobro es un cobro doble (FRO-04 §5).
    const cliente = crearClienteDeConsultas();
    expect(cliente.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('un fallo deja una peticion, no cuatro', async () => {
    const usuario = userEvent.setup();
    laApiResponde(500, { title: 'Error', status: 500, detail: 'No se pudo.' });
    // Con el cliente **de produccion**: con el de pruebas, que ya trae
    // `retry: false`, esta prueba no diria nada.
    montarEnRuta(ALTA, crearClienteDeConsultas());

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'Emisión anual.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));

    await screen.findByText('No se pudo.');
    // Un reintento automatico de un cobro es un cobro doble (FRO-04 §5).
    expect(peticiones).toHaveLength(1);
  });

  it('pulsar dos veces rapido manda una vez', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'Emisión anual.');
    const accion = await screen.findByRole('button', { name: 'Dar de alta' });
    await usuario.dblClick(accion);

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones).toHaveLength(1);
  });
});

describe('los errores se cuentan donde toca', () => {
  it('un 400 con errores por campo pinta cada mensaje junto al suyo, sin reescribirlo', async () => {
    const usuario = userEvent.setup();
    laApiResponde(400, {
      title: 'La solicitud no es válida',
      status: 400,
      detail: 'Revisa los campos marcados.',
      errores: [
        { campo: 'observacion', mensaje: 'La observación debe explicar el motivo del cálculo.' },
      ],
    });
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'x');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));

    const mensaje = await screen.findByText('La observación debe explicar el motivo del cálculo.');
    expect(mensaje).toBeInTheDocument();
    // Pegado a su campo, no en un aviso suelto arriba.
    expect(await observacion()).toHaveAttribute('aria-describedby', mensaje.id);
    expect(await observacion()).toHaveAttribute('aria-invalid', 'true');
  });

  it('un 403 dice que falta permiso y no que hay detras', async () => {
    const usuario = userEvent.setup();
    laApiResponde(403, {
      title: 'Sin permiso',
      status: 403,
      detail: 'El usuario no tiene el nivel de accesibilidad requerido.',
    });
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await observacion(), 'Emisión anual.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));

    expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
    expect(
      screen.getByText('El usuario no tiene el nivel de accesibilidad requerido.'),
    ).toBeInTheDocument();
  });
});

/* ── La lista blanca, **al escribir** ──────────────────────────────────── */

/**
 * Lo declarado por la opcion de prueba: un campo, una tabla y una columna.
 *
 * La lista blanca se comprobaba solo **al enviar**, y eso la dejaba asimetrica:
 * un campo no declarado no viajaba pero **si entraba en el estado de React**, y
 * una columna no declarada de una fila, tambien. Es exactamente lo que la lista
 * blanca vino a impedir —que una contrasena escrita en un formulario exista en
 * algun sitio del cliente— y no lo impedia. Se comprobo que estas pruebas
 * faltaban de la unica forma que vale: quitando `if (!declaradas.has(tabla))
 * return;` de `fijarFilas`, la bateria entera seguia en verde.
 */
const DECLARADA: OpcionesDeEscritura = {
  campos: { declarado: { campo: 'declarado' } },
  tablas: {
    construcciones: { campo: 'construcciones', columnas: { piso: { campo: 'piso' } } },
  },
};

function escrituraDePrueba() {
  const cliente = clienteDePruebas();
  return renderHook(() => useEscritura('registrar_ficha_urbana', {}, DECLARADA), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    ),
  });
}

describe('lo que la opcion no declara no entra en el estado, no solo no viaja', () => {
  it('un campo no declarado no llega al borrador', () => {
    const { result } = escrituraDePrueba();

    act(() => result.current.fijarCampo('noDeclarado', 'x'));

    expect(result.current.borrador).not.toHaveProperty('noDeclarado');
    // Y el declarado si, para que la prueba no pase por no escribir nada.
    act(() => result.current.fijarCampo('declarado', 'si'));
    expect(result.current.borrador['declarado']).toBe('si');
  });

  it('una tabla no declarada no llega ni al estado ni al cuerpo', async () => {
    laApiResponde(201);
    const { result } = escrituraDePrueba();

    act(() => result.current.fijarFilas('noDeclarada', [{ loQueSea: 'x' }]));
    expect(result.current.filasDe('noDeclarada')).toEqual([]);

    act(() => result.current.fijarObservacion('Alta de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}');
    expect(cuerpo).not.toHaveProperty('noDeclarada');
  });

  it('un campo o una columna que se llame como algo de `Object.prototype` tampoco', async () => {
    laApiResponde(201);
    const { result } = escrituraDePrueba();

    // `constructor` y `toString` **no** estan declarados, pero la indexacion
    // cruda —`campos[campo]`, `columnas[columna]`— los resuelve por la cadena de
    // prototipos y devuelve una funcion: un «declarado» que no declaro nadie.
    // Con eso, la columna se quedaba en la fila y al enviar `declarado.campo`
    // era `undefined`, asi que el cuerpo salia con una clave literal
    // «undefined». La lista blanca decia que si a lo unico que tenia que
    // negar sin pensarlo.
    act(() => result.current.fijarCampo('constructor', 'x'));
    act(() => result.current.fijarCampo('toString', 'y'));
    act(() =>
      result.current.fijarFilas('construcciones', [
        { piso: '01', constructor: 'x', toString: 'y' },
      ]),
    );

    // `Object.hasOwn` y no `toHaveProperty`: **todo** objeto tiene `constructor`
    // por herencia, asi que `toHaveProperty` estaria en verde diga lo que diga
    // el borrador.
    expect(Object.hasOwn(result.current.borrador, 'constructor')).toBe(false);
    expect(Object.hasOwn(result.current.borrador, 'toString')).toBe(false);
    expect(result.current.filasDe('construcciones')).toEqual([{ piso: '01' }]);

    act(() => result.current.fijarObservacion('Alta de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}');
    expect(cuerpo.construcciones).toEqual([{ piso: '01' }]);
    // Ni la clave heredada, ni la que produce leerla: `cuerpo[declarado.campo]`
    // con `declarado.campo` indefinido escribe la cadena «undefined».
    expect(cuerpo).not.toHaveProperty('undefined');
  });

  it('una columna de mas no se queda en la fila', () => {
    const { result } = escrituraDePrueba();

    // `mep` es una de las que el prototipo dibuja y el controlador no acepta.
    act(() => result.current.fijarFilas('construcciones', [{ piso: '01', mep: 'X' }]));

    expect(result.current.filasDe('construcciones')).toEqual([{ piso: '01' }]);
  });
});

describe('idempotencia: una tabla que no cambia no empieza otro intento', () => {
  it('cambiar las filas da clave nueva; fijar las mismas, la misma', () => {
    const { result } = escrituraDePrueba();

    const alPrincipio = result.current.clave;
    act(() => result.current.fijarFilas('construcciones', [{ piso: '01' }]));
    const conUnPiso = result.current.clave;
    expect(conUnPiso).not.toBe(alPrincipio);

    // Volver a fijar **lo mismo** no es corregir nada: con clave nueva, el
    // reintento de un envio fallido dejaria de ser un reintento.
    act(() => result.current.fijarFilas('construcciones', [{ piso: '01' }]));
    expect(result.current.clave).toBe(conUnPiso);

    act(() => result.current.fijarFilas('construcciones', [{ piso: '02' }]));
    expect(result.current.clave).not.toBe(conUnPiso);
  });
});

/**
 * **Un entero es entero entero** (#332).
 *
 * `Number.parseInt('1 - 4')` devuelve 1, y eso no es una conversion: es una
 * reinterpretacion silenciosa. En «Baja de deuda» la cuota de una fila puede ser
 * un rango —asi escribe el manual las cuatro cuotas de un ano—, y mandar 1
 * daria de baja una cuota dejando tres vivas sin que nada lo dijera. Lo que no
 * es un entero no viaja, igual que un campo vacio; el backend ya sabe leer la
 * cuota ausente como «anual».
 */
describe('un entero que no lo es no viaja, en vez de viajar a medias', () => {
  const CON_ENTERO: OpcionesDeEscritura = {
    campos: { cuota: { campo: 'cuota', entero: true } },
  };

  const conCuota = () => {
    const cliente = clienteDePruebas();
    return renderHook(() => useEscritura('registrar_ficha_urbana', {}, CON_ENTERO), {
      wrapper: ({ children }: { readonly children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      ),
    });
  };

  it.each([
    { escrito: '4', viaja: 4 },
    { escrito: ' 4 ', viaja: 4 },
    // Los tres que `parseInt` aceptaria quedandose con el prefijo.
    { escrito: '1 - 4', viaja: undefined },
    { escrito: '1-4', viaja: undefined },
    { escrito: 'Anual', viaja: undefined },
  ])('«$escrito» viaja como $viaja', async ({ escrito, viaja }) => {
    laApiResponde(201);
    const { result } = conCuota();

    act(() => result.current.fijarCampo('cuota', escrito));
    act(() => result.current.fijarObservacion('Baja de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['cuota']).toBe(viaja);
  });
});

/**
 * **Lo que el backend no puede leer no sale**, y son dos casos hermanos (#332).
 *
 * Los dos aparecen por el mismo camino nuevo: una fila de tabla que se elige y
 * viaja al cuerpo. Sus celdas son texto de presentacion, y ahi el importe lleva
 * separador de miles —«1,842.60», que `new BigDecimal` **rechaza lanzando**— y
 * lo que el backend no mando se dibuja con un guion —«—», que no es un valor de
 * nada—. Cualquiera de los dos producia un 422 despues de confirmar un acto
 * irreversible; ahora no salen, y la opcion que los declara lo dice ademas en su
 * `exigir`.
 */
/**
 * **`TablaDelCuerpo.columnaUnica`**: un arreglo de valores sueltos, no de
 * objetos (#75, `valores_masivo`). El cuarto caso de una tabla —despues de la
 * simple, `plana` y `unica`—: `contribuyentes` de `IniciarCorridaMasiva` es
 * `List<String>`, un codigo por elemento, y sin esto la unica forma de
 * mandarlo era `cuerpo`, la salida de emergencia, perdiendo la lista blanca
 * por columna.
 */
describe('una tabla de columna unica manda un arreglo de valores, no de objetos', () => {
  const CON_COLUMNA_UNICA: OpcionesDeEscritura = {
    tablas: {
      contribuyentes: {
        campo: 'contribuyentes',
        columnaUnica: 'codigo',
        columnas: { codigo: { campo: 'codigo' } },
      },
    },
  };

  const conColumnaUnica = () => {
    const cliente = clienteDePruebas();
    return renderHook(() => useEscritura('registrar_ficha_urbana', {}, CON_COLUMNA_UNICA), {
      wrapper: ({ children }: { readonly children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      ),
    });
  };

  it('cada fila aporta un valor, no un objeto con una sola clave', async () => {
    laApiResponde(201);
    const { result } = conColumnaUnica();

    act(() =>
      result.current.fijarFilas('contribuyentes', [
        { codigo: '00000003541' },
        { codigo: '00000006550' },
      ]),
    );
    act(() => result.current.fijarObservacion('Corrida de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['contribuyentes']).toEqual(['00000003541', '00000006550']);
  });

  it('una fila cuya columna llega vacía no manda un hueco en el arreglo', async () => {
    laApiResponde(201);
    const { result } = conColumnaUnica();

    act(() =>
      result.current.fijarFilas('contribuyentes', [
        { codigo: '00000003541' },
        { codigo: '' },
        { codigo: '00000006550' },
      ]),
    );
    act(() => result.current.fijarObservacion('Corrida de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['contribuyentes']).toEqual(['00000003541', '00000006550']);
  });

  it('sin ninguna fila, el arreglo viaja vacío: es lo mismo que dice el backend sin selección', async () => {
    laApiResponde(201);
    const { result } = conColumnaUnica();

    act(() => result.current.fijarObservacion('Corrida de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['contribuyentes']).toEqual([]);
  });
});

describe('un importe con formato de pantalla, y un guion, no viajan', () => {
  const CON_IMPORTE: OpcionesDeEscritura = {
    campos: {
      insoluto: { campo: 'insoluto', importe: true },
      documento: { campo: 'documento' },
    },
  };

  const conImporte = () => {
    const cliente = clienteDePruebas();
    return renderHook(() => useEscritura('registrar_ficha_urbana', {}, CON_IMPORTE), {
      wrapper: ({ children }: { readonly children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      ),
    });
  };

  it.each([
    { escrito: '1842.60', viaja: '1842.60' },
    { escrito: '0', viaja: '0' },
    { escrito: '-84.12', viaja: '-84.12' },
    // Lo que una celda de tabla lleva de verdad, y `new BigDecimal` no lee.
    { escrito: '1,842.60', viaja: undefined },
    { escrito: 'S/ 1842.60', viaja: undefined },
    { escrito: '—', viaja: undefined },
  ])('el importe «$escrito» viaja como $viaja', async ({ escrito, viaja }) => {
    laApiResponde(201);
    const { result } = conImporte();

    act(() => result.current.fijarCampo('insoluto', escrito));
    act(() => result.current.fijarObservacion('Baja de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo['insoluto']).toBe(viaja);
  });

  /**
   * **Y la guarda vale igual en una columna de tabla**, que es de donde vino el
   * problema (#337).
   *
   * Esta mitad no estaba probada por separado: en «Baja de deuda» la tapa
   * `faltaEnLaCuota`, que apaga la accion antes de que nadie pueda enviar, asi
   * que quitarle el `importe: true` a las dos columnas de la baja dejaba la
   * bateria entera en verde. Son dos defensas distintas —una explica, la otra
   * impide— y hay que poder perder una sin perder las dos: aqui se comprueba la
   * que impide, sobre una tabla que **no** tiene la que explica.
   */
  it('una columna de importe con separador de miles no viaja, aunque nadie lo explique', async () => {
    laApiResponde(201);
    const cliente = clienteDePruebas();
    const { result } = renderHook(
      () =>
        useEscritura(
          'registrar_ficha_urbana',
          {},
          {
            tablas: {
              // `plana` como la de la baja: sus columnas se despliegan en el
              // nivel superior del cuerpo.
              cuotas: {
                campo: 'cuotas',
                plana: true,
                columnas: {
                  insolutoS: { campo: 'insoluto', importe: true },
                  ano: { campo: 'ano' },
                },
              },
            },
          },
        ),
      {
        wrapper: ({ children }: { readonly children: ReactNode }) => (
          <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
        ),
      },
    );

    // Lo que lleva de verdad una celda dibujada, si alguien la copia al cuerpo.
    act(() => result.current.fijarFilas('cuotas', [{ insolutoS: '1,842.60', ano: '2026' }]));
    act(() => result.current.fijarObservacion('Baja de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    // `new BigDecimal("1,842.60")` **lanza**: lo que el backend no puede leer no
    // sale. Y el resto de la fila si viaja, para que la prueba no pase por no
    // haber mandado nada.
    expect(cuerpo).not.toHaveProperty('insoluto');
    expect(cuerpo['ano']).toBe('2026');
  });

  /**
   * **Y el alta lo declara igual que la baja** (#337): son los dos lados del
   * mismo movimiento, y sus cuatro importes los teclea quien atiende —donde
   * «1,842.60» no es un caso raro, es como se escribe—. Sin la guarda, el 422
   * llega despues de pulsar «Dar de alta».
   */
  it('un importe tecleado con separador de miles no viaja en el alta de deuda', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(ALTA);

    await elConcepto(usuario);
    await usuario.type(await screen.findByLabelText('Insoluto (S/)'), '1,842.60');
    await usuario.type(await screen.findByLabelText('Reajuste (S/)'), '10.00');
    await usuario.type(await observacion(), 'Determinación de fiscalización.');
    await usuario.click(await screen.findByRole('button', { name: 'Dar de alta' }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    const cuerpo = JSON.parse(peticiones[0]?.cuerpo ?? '{}') as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('insoluto');
    // Y el que si es una cifra viaja: la guarda es por campo, no por formulario.
    expect(cuerpo['reajuste']).toBe('10.00');
  });

  it('y el guion tampoco viaja en un campo de texto: no es un documento llamado «—»', async () => {
    laApiResponde(201);
    const { result } = conImporte();

    act(() => result.current.fijarCampo('documento', '—'));
    act(() => result.current.fijarObservacion('Baja de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).not.toHaveProperty('documento');
  });
});

describe('lo que se escribe viaja sin los espacios de alrededor', () => {
  it('un campo de solo espacios no viaja, y uno con espacios viaja recortado', async () => {
    laApiResponde(201);
    const { result } = escrituraDePrueba();

    act(() => result.current.fijarCampo('declarado', '  Acta 0244-2026  '));
    act(() => result.current.fijarObservacion('Alta de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}').declarado).toBe('Acta 0244-2026');
  });

  it('solo espacios es no haber escrito nada', async () => {
    laApiResponde(201);
    const { result } = escrituraDePrueba();

    act(() => result.current.fijarCampo('declarado', '   '));
    act(() => result.current.fijarObservacion('Alta de prueba.'));
    act(() => result.current.enviar());

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).not.toHaveProperty('declarado');
  });
});

describe('el motivo por el que no se puede guardar se puede pintar', () => {
  it('sin observacion, el motivo lo dice; con ella, no hay motivo', () => {
    const { result } = escrituraDePrueba();

    // `falta` es solo lo que la opcion exige; `motivo` incluye la observacion,
    // que es el motivo mas frecuente y el que vivia en un `title`.
    expect(result.current.falta).toBeUndefined();
    expect(result.current.motivo).toMatch(/observación/i);

    act(() => result.current.fijarObservacion('Alta de prueba.'));
    expect(result.current.motivo).toBeUndefined();
  });
});

describe('lo irreversible se confirma diciendo que va a pasar', () => {
  it('notificar no manda hasta confirmar, y la confirmacion dice que va a pasar', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(CUPONERA);

    await usuario.type(await observacion(), 'Diligencia del 13 de agosto.');
    await usuario.click(await screen.findByRole('button', { name: 'Registrar notificación' }));

    // Todavia no se ha mandado nada.
    expect(peticiones).toEqual([]);
    expect(screen.getByText(/no se deshace/)).toBeInTheDocument();
    expect(screen.getByText(/En el SGTM no se borra/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));
    await waitFor(() => expect(peticiones).toHaveLength(1));
  });

  it('cancelar no manda nada', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(CUPONERA);

    await usuario.type(await observacion(), 'Diligencia del 13 de agosto.');
    await usuario.click(await screen.findByRole('button', { name: 'Registrar notificación' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(peticiones).toEqual([]);
    expect(screen.queryByText(/no se deshace/)).not.toBeInTheDocument();
  });
});
