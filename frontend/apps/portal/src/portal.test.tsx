import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { ProveedorDeSesion } from '@sgtm/sesion';
import { REJILLAS_DE_LA_UNIFICADA, RESUMEN_DE_SALDOS } from '@sgtm/lectura';
import { App } from './App';
import { Portal } from './Portal';
import { DOCUMENTOS, filtroDe, loQueFalta } from './consulta';

/**
 * **El portal del contribuyente, separado del back-office** (#298, ADR-0016 §3).
 *
 * Lo que estas pruebas defienden, en una linea cada cosa:
 *
 * 1. se consulta con **lo que el contrato publica** —codigo, DNI y RUC— y la
 *    fila que se ensena es la que se pidio, no la que venga: el proxy no filtra
 *    (ADR-0010) y sin comprobarlo el portal ensenaria la deuda de otra persona;
 * 2. las cifras son **las mismas** que las de la ficha 360° y con la **misma
 *    fecha de calculo**, porque salen de los mismos adaptadores;
 * 3. ninguna cifra sin su fecha: el resumen y las deudas llevan su banda, y las
 *    rejillas cuyas filas traen cada una la suya **no** la llevan (regla 9);
 * 4. los rotulos son los del catalogo, letra a letra (RNF-080);
 * 5. «no figura» y «hay mas de uno» son dos frases distintas, y ninguna es «no
 *    existe»;
 * 6. sin sesion no se ofrece una puerta que no existe: se dice que el acceso del
 *    ciudadano todavia no esta —y **con proveedor de identidad configurado**, que
 *    es el unico estado en el que esa rama se ejecuta de verdad—;
 * 7. lo que la pantalla dice le es verdad **a su lector**: aqui no hay catalogo
 *    ni navegacion, asi que no se le manda a opciones del back-office.
 */

/** La primera persona del padron del prototipo, la misma con la que se prueba la ficha. */
const DNI = '03593174';
const CODIGO = '00000025673';
const NOMBRE = 'SUC. RUFINA MEDINA MEDINA';

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  desinstalarProxyDeDatos();
});

/**
 * El portal, con un cliente de consultas **por prueba**.
 *
 * Sin proveedor de identidad configurado la sesion queda «sin proveedor», que es
 * como se trabaja contra el proxy: la puerta deja pasar y lo que se prueba es la
 * pantalla. La puerta tiene su propia prueba mas abajo.
 */
function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorDeSesion>
        <Portal />
      </ProveedorDeSesion>
    </QueryClientProvider>,
  );
}

/**
 * Se pone **encima del proxy ya instalado**: apunta lo que sale y, si se le da un
 * `responder`, contesta por su cuenta.
 *
 * Hace falta para las tres cosas que el proxy no puede dar: que el proveedor de
 * identidad rechace el canje, que el padron devuelva la misma persona dos veces
 * y que devuelva una fila sin codigo.
 */
function interceptar(responder?: (url: URL) => Response | undefined) {
  const pedidas: string[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = new URL(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      globalThis.location.origin,
    );
    pedidas.push(`${url.pathname}${url.search}`);
    return responder?.(url) ?? anterior(entrada, opciones);
  };
  return { pedidas, restaurar: () => (globalThis.fetch = anterior) };
}

/** El cuerpo paginado del padron, con las filas que se le den. */
const padronCon = (...filas: readonly Readonly<Record<string, unknown>>[]): Response =>
  new Response(
    JSON.stringify({
      contenido: filas,
      pagina: 0,
      tamano: filas.length,
      totalElementos: filas.length,
      totalPaginas: 1,
      hayMas: false,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

/** Consulta por DNI, como lo haria el ciudadano: elige, teclea y pulsa. */
async function consultar(documento: string, numero: string) {
  const usuario = userEvent.setup();
  await usuario.selectOptions(screen.getByLabelText('Tipo de documento'), documento);
  await usuario.clear(screen.getByLabelText('Número de documento'));
  await usuario.type(screen.getByLabelText('Número de documento'), numero);
  await usuario.click(screen.getByRole('button', { name: 'Consultar' }));
}

describe('el portal se abre sin nada del back-office', () => {
  it('tiene su encabezado, y ni un modulo que navegar', () => {
    montar();

    expect(
      screen.getByRole('heading', { level: 1, name: /Consulta tu deuda/ }),
    ).toBeInTheDocument();
    // Ni barra lateral, ni lanzador, ni paleta: la unica navegacion del
    // back-office es la que aqui no existe (ADR-0016 §3).
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('lo suyo esta dentro de un `main`', () => {
    montar();

    // El unico punto de referencia de la aplicacion: sin el, quien navega con
    // lector de pantalla no tiene a donde saltar desde la cabecera.
    const principal = screen.getByRole('main');
    expect(
      within(principal).getByRole('heading', { level: 1, name: /Consulta tu deuda/ }),
    ).toBeInTheDocument();
  });

  it('dice, antes de que nadie teclee, que de aqui no sale ningun pago', () => {
    montar();

    expect(screen.getByText('Aquí solo se consulta')).toBeInTheDocument();
    expect(screen.getByText(/El pago en línea todavía no está disponible/)).toBeInTheDocument();
  });

  it('dice tambien lo que todavia no se puede consultar', () => {
    montar();

    expect(
      screen.getByText(/carné de extranjería, un pasaporte o una partida/),
    ).toBeInTheDocument();
  });

  it('no ofrece una puerta de sesion que no lleva al portal', () => {
    // Sin proveedor de identidad la sesion pasa; lo que se comprueba es que el
    // portal envuelve su pantalla con la puerta compartida y no con una propia.
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Consulta tu deuda/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).toBeNull();
  });
});

/**
 * **La rama anonima, con proveedor de identidad y sin sesion** (ADR-0016 §3).
 *
 * La prueba de arriba corre en estado «sin proveedor» —que es como se trabaja
 * contra el proxy— y ahi la puerta **deja pasar por diseno**: comprueba que el
 * portal usa la puerta compartida, y no puede comprobar lo que la puerta hace
 * cuando no hay sesion. Se midio: dibujando `{anonima}{children}` en
 * `PuertaDeSesion` —o sea, la pantalla del ciudadano **junto** al aviso— las
 * quince pruebas de este archivo seguian en verde.
 *
 * Con las tres `VITE_SGTM_OIDC_*` puestas la sesion arranca «entrando», pide
 * token al proveedor, el proveedor lo rechaza y queda «anonima». Lo que entonces
 * tiene que verse es el aviso **y nada mas**: ni el titulo, ni la caja, ni el
 * boton. Y ni una peticion a la API: la pantalla que las hace no llego a
 * montarse.
 */
describe('sin sesion no se ve el portal, se ve por que no se ve', () => {
  it('con proveedor configurado y el canje rechazado, solo el aviso', async () => {
    vi.stubEnv('VITE_SGTM_OIDC_CLIENTE', 'sgtm-portal');
    vi.stubEnv('VITE_SGTM_OIDC_AUTORIZACION', '/oidc/auth');
    vi.stubEnv('VITE_SGTM_OIDC_TOKEN', '/oidc/token');
    const espia = interceptar((url) =>
      url.pathname === '/oidc/token' ? new Response('{}', { status: 400 }) : undefined,
    );

    try {
      render(<App />);

      expect(await screen.findByText('Todavía no hay acceso del ciudadano')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
      expect(screen.queryByLabelText('Número de documento')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Consultar' })).toBeNull();
      // Y no se ofrece la puerta del back-office: el `redirect_uri` es la raiz
      // del origen y devolveria al ciudadano a la ventanilla.
      expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).toBeNull();
      // Ninguna lectura del padron sale de una pantalla que no se monto.
      expect(espia.pedidas.filter((ruta) => ruta.startsWith('/api/'))).toEqual([]);
    } finally {
      espia.restaurar();
      vi.unstubAllEnvs();
    }
  });
});

describe('se consulta con lo que el contrato publica', () => {
  it('ofrece los tres documentos del prototipo, y ninguno mas', () => {
    montar();

    const tipos = within(screen.getByLabelText('Tipo de documento')).getAllByRole('option');
    expect(tipos.map((opcion) => opcion.textContent)).toEqual(['DNI', 'RUC', 'Código']);
  });

  it('cada uno viaja por su filtro del contrato', () => {
    expect(DOCUMENTOS.map((documento) => documento.filtro)).toEqual(['dNI', 'rUC', 'codigo']);
    expect(filtroDe(DOCUMENTOS[0]!, ' 035 931 74 ')).toEqual({ dNI: '03593174' });
    expect(filtroDe(DOCUMENTOS[2]!, ` ${CODIGO} `)).toEqual({ codigo: CODIGO });
  });

  it('dice lo que falta en vez de dejar la caja muda', () => {
    expect(loQueFalta(DOCUMENTOS[0]!, '')).toMatch(/Escribe tu DNI/);
    expect(loQueFalta(DOCUMENTOS[0]!, '0359')).toMatch(/8 dígitos/);
    expect(loQueFalta(DOCUMENTOS[0]!, DNI)).toBe('');
    // El codigo no declara largo: quien decide si existe es el padron.
    expect(loQueFalta(DOCUMENTOS[2]!, 'X')).toBe('');
  });

  it('no se puede consultar mientras falte algo', async () => {
    montar();

    expect(screen.getByRole('button', { name: 'Consultar' })).toBeDisabled();

    await userEvent.setup().type(screen.getByLabelText('Número de documento'), DNI);
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeEnabled();
  });

  it('la primaria apagada dice por que, y de forma programatica', () => {
    // El motivo esta en la ayuda del campo y `aria-describedby` lo asocia al
    // boton (el patron de #332). Sin esta prueba, quitar el atributo dejaba
    // las 21 del archivo en verde: existia y funcionaba, pero no lo exigia
    // nadie.
    montar();

    const boton = screen.getByRole('button', { name: 'Consultar' });
    expect(boton).toBeDisabled();
    const descriptor = boton.getAttribute('aria-describedby');
    expect(descriptor).not.toBeNull();
    const ayuda = document.getElementById(descriptor ?? '');
    expect(ayuda?.textContent ?? '').not.toBe('');
  });
});

describe('lo que se ve al consultar', () => {
  it('es la persona que se pidio, con su codigo y su documento', async () => {
    montar();
    await consultar('DNI', DNI);

    await waitFor(() => expect(screen.getByRole('heading', { name: NOMBRE })).toBeInTheDocument());
    expect(screen.getByText(CODIGO)).toBeInTheDocument();
    expect(screen.getByText(`DNI ${DNI}`)).toBeInTheDocument();
  });

  it('el resumen sale con las cinco cifras del servidor y su fecha debajo', async () => {
    montar();
    await consultar('DNI', DNI);

    const resumen = await screen.findByRole('heading', { name: 'Lo que debes' });
    const caja = resumen.parentElement as HTMLElement;
    for (const cifra of RESUMEN_DE_SALDOS) {
      /* Con su unidad: el rotulo es el del catalogo —letra a letra, RNF-080— y
         el «S/» se le anade al dibujar, como ya hacen las columnas de las
         rejillas. Sin el, «279.03» no dice en que moneda esta. */
      expect(within(caja).getByText(`${cifra.label} S/`)).toBeInTheDocument();
    }
    // La fecha es la de la respuesta, no la del reloj del navegador (regla 9).
    expect(within(caja).getByText(/Cifras actualizadas al/)).toBeInTheDocument();
    expect(within(caja).getByText('13/08/2026')).toBeInTheDocument();
  });

  it('las seis secciones de la unificada, con los rotulos de su catalogo', async () => {
    montar();
    await consultar('DNI', DNI);

    for (const rejilla of REJILLAS_DE_LA_UNIFICADA) {
      expect(await screen.findByRole('heading', { name: rejilla.titulo })).toBeInTheDocument();
    }

    // Los rotulos de columna se dibujan **como rotulo de cada valor**: la tabla
    // de siete columnas cabe en 390 px sin que nadie se desplace en horizontal.
    const deudas = (await screen.findByRole('heading', { name: 'Deudas Pendientes' }))
      .parentElement as HTMLElement;
    for (const columna of REJILLAS_DE_LA_UNIFICADA[0]!.cols) {
      expect(within(deudas).getAllByText(columna).length).toBeGreaterThan(0);
    }
  });
});

describe('ninguna cifra sin su fecha (regla 9, RNF-075)', () => {
  it('las deudas llevan su banda, y los pagos no', async () => {
    montar();
    await consultar('DNI', DNI);

    const deudas = (await screen.findByRole('heading', { name: 'Deudas Pendientes' }))
      .parentElement as HTMLElement;
    expect(within(deudas).getByText(/Cifras actualizadas al/)).toBeInTheDocument();

    /* **Los pagos no llevan banda, y no es un olvido**: cada fila trae su propia
       fecha —la fecha valor del asiento— y un pago de marzo no se actualiza.
       Una banda encima diria que se recalcularon hoy. */
    const pagos = (await screen.findByRole('heading', { name: 'Pagos Realizados' }))
      .parentElement as HTMLElement;
    expect(within(pagos).queryByText(/Cifras actualizadas al/)).toBeNull();
    expect(within(pagos).getAllByText('Fecha').length).toBeGreaterThan(0);
  });

  it('el importe del resumen es el que mando el servidor, sin recomponer', async () => {
    montar();
    await consultar('DNI', DNI);

    const resumen = (await screen.findByRole('heading', { name: 'Lo que debes' }))
      .parentElement as HTMLElement;
    const total = within(resumen)
      .getByText('Total S/')
      .parentElement?.querySelector('dd')?.textContent;
    /* La cifra que publica `consulta_unificada`, tal cual y sin recomponer: la
       interfaz no suma ni completa el total a partir de las partes (RNF-083).
       Es **la misma que ve quien atiende** en la ficha 360° —la que su prueba
       nombra al explicar por que no se compone una ficha de un codigo que no
       existe—, y lo es porque las dos la leen con el mismo adaptador. */
    expect(total).toBe('279.03');
  });
});

describe('lo que no se encuentra no se dice como «no existe»', () => {
  it('un documento que no figura se dice asi, y no como un fallo', async () => {
    montar();
    await consultar('DNI', '00000000');

    expect(await screen.findByText(/Ese DNI no figura en el padrón/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: NOMBRE })).toBeNull();
    // Y no se compone nada debajo: el resumen de otra persona seria peor que
    // no ensenar nada.
    expect(screen.queryByRole('heading', { name: 'Lo que debes' })).toBeNull();
  });

  it('mientras no se ha preguntado no hay resultado que leer', () => {
    montar();

    expect(screen.queryByRole('region', { name: 'Resultado de la consulta' })).toBeNull();
  });

  it('en un 403 la region viva no invita a reintentar', async () => {
    /* El aviso dibujado ya distinguia el rechazo («Reintentar dará lo mismo»),
       pero `role=status` anunciaba «La consulta no se pudo hacer» —la frase del
       error reintentable—. Quien consulta con lector de pantalla oia lo
       contrario de lo que el aviso decia (el patron que #331 ya pago). */
    const espia = interceptar((url) =>
      url.pathname === '/api/v1/consultas/unificada'
        ? new Response(JSON.stringify({ title: 'Acceso denegado', status: 403 }), {
            status: 403,
            headers: { 'content-type': 'application/problem+json' },
          })
        : undefined,
    );

    try {
      montar();
      await consultar('DNI', DNI);

      expect(
        // El hook reintenta una vez (`retry: 1`) y el reintento corre por
        // detras del tope por defecto: mismo trato que en la ficha 360°.
        await screen.findByText(
          'El servidor rechazó la consulta; reintentar dará lo mismo',
          undefined,
          { timeout: 4000 },
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText('La consulta no se pudo hacer')).toBeNull();
    } finally {
      espia.restaurar();
    }
  });

  it('un numero que corresponde a dos personas manda a ventanilla, y no elige', async () => {
    /* La otra rama de `identidadesQueCoinciden`: **ninguna, una y varias son
       tres respuestas**, y con varias no se elige aqui. El padron del prototipo
       no tiene dos filas con el mismo DNI, asi que se le hace devolver la misma
       persona dos veces —que es lo que un padron con un duplicado real haria—. */
    const espia = interceptar((url) =>
      url.pathname === '/api/v1/rentas/contribuyentes'
        ? padronCon(
            {
              codigo: CODIGO,
              nombreRazonSocial: NOMBRE,
              tipoDocumento: 'DNI',
              numeroDocumento: DNI,
            },
            {
              codigo: '00000099999',
              nombreRazonSocial: 'OTRA PERSONA',
              tipoDocumento: 'DNI',
              numeroDocumento: DNI,
            },
          )
        : undefined,
    );

    try {
      montar();
      await consultar('DNI', DNI);

      /* Dos veces: el aviso que se ve y el anuncio en voz alta del `role=status`
         —quien consulta con lector de pantalla no ve el aviso—. */
      expect(
        await screen.findAllByText('Ese documento corresponde a más de un registro'),
      ).toHaveLength(2);
      expect(screen.getByText(/Acércate a la municipalidad con tu documento/)).toBeInTheDocument();
      // Ni se elige una, ni se compone la deuda de ninguna de las dos.
      expect(screen.queryByRole('heading', { name: NOMBRE })).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Lo que debes' })).toBeNull();
      expect(espia.pedidas.filter((ruta) => ruta.startsWith('/api/v1/consultas/'))).toEqual([]);
    } finally {
      espia.restaurar();
    }
  });

  it('una fila sin codigo no se convierte en una consulta por el guion', async () => {
    /* `texto()` devuelve «—» cuando el dato falta, asi que comparar el codigo
       con la cadena vacia dejaba pasar el guion y salia
       `GET /consultas/unificada?contribuyente=—`: una espera y una respuesta
       vacia por un contribuyente que no existe. */
    const espia = interceptar((url) =>
      url.pathname === '/api/v1/rentas/contribuyentes'
        ? padronCon({ nombreRazonSocial: NOMBRE, tipoDocumento: 'DNI', numeroDocumento: DNI })
        : undefined,
    );

    try {
      montar();
      await consultar('DNI', DNI);

      await waitFor(() =>
        expect(screen.getByRole('heading', { name: NOMBRE })).toBeInTheDocument(),
      );
      expect(espia.pedidas.filter((ruta) => ruta.startsWith('/api/v1/consultas/'))).toEqual([]);
      expect(espia.pedidas.some((ruta) => ruta.includes('%E2%80%94'))).toBe(false);
    } finally {
      espia.restaurar();
    }
  });
});

/**
 * **Lo que se dice aqui le es verdad a quien lo lee** (#298).
 *
 * Las notas de las rejillas las escribio la ficha 360° del back-office, y ahi
 * terminan nombrando la opcion hermana a la que ir: «se ven en «Consulta de
 * deuda»». Desde el portal esas cuatro opciones no existen —no hay navegacion,
 * ni catalogo, ni permiso que las abra—, asi que mandar ahi al ciudadano es
 * mandarlo a un sitio al que no puede ir. Lo que falta se sigue diciendo, con la
 * salida que si es suya.
 */
describe('al ciudadano no se le manda a opciones que no puede abrir', () => {
  it('ninguna nota nombra una opcion del catalogo', async () => {
    montar();
    await consultar('DNI', DNI);
    await screen.findByRole('heading', { name: 'Deudas Pendientes' });

    // Sobre la pantalla entera, no sobre la lista de rejillas: la nota podria
    // llegar por cualquier otro sitio y contaria igual.
    const escrito = document.body.textContent ?? '';
    expect(escrito).not.toMatch(/se ven? en «/);
    for (const rejilla of REJILLAS_DE_LA_UNIFICADA) {
      if (rejilla.nota !== undefined) expect(escrito).not.toContain(rejilla.nota);
    }
  });

  it('pero lo que falta se sigue diciendo, y donde preguntarlo', async () => {
    montar();
    await consultar('DNI', DNI);
    await screen.findByRole('heading', { name: 'Deudas Pendientes' });

    const conNota = REJILLAS_DE_LA_UNIFICADA.filter((r) => r.notaDelCiudadano !== undefined);
    expect(conNota.length).toBe(4);
    for (const rejilla of conNota) {
      expect(screen.getByText(rejilla.notaDelCiudadano as string)).toBeInTheDocument();
    }
  });
});
