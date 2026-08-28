import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
 *    ciudadano todavia no esta.
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
      expect(within(caja).getByText(cifra.label)).toBeInTheDocument();
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
      .getByText('Total')
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
});
