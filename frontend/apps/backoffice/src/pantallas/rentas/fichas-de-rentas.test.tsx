import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { cifrasEnPantalla, cifrasServidas } from '../../pruebas/cifras';
import { AVISOS } from '../prosa-textos';
import { hayQueResumir } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Rentas · Registro: la ficha del contribuyente y la del vehiculo (#330).
 *
 * Nueve pestanas y 56 campos en el padron; seis y 54 en la ficha de vehiculo. El
 * backend llena siete y ocho. Averiguar si un dato existe costaba nueve clics, y
 * el que mas se mira —cuanto debe— no existe en ningun sitio.
 *
 * Lo que se comprueba aqui es lo que #319 comprobo para las fichas catastrales,
 * sobre otro objeto: que la cabecera-resumen se compone **con lo que el
 * adaptador ya trae** —ni una peticion mas, ni una cifra recompuesta—, que el
 * indice sustituye a las pestanas **solo en las opciones declaradas**, y que el
 * hueco de la deuda sale como un guion **explicado** y nunca como un cero.
 */

const CONTRIBUYENTE = '00000025673';
/* El registro va en la **ruta**, no en el filtro: desde #503 la lista y el
   expediente no se dibujan a la vez, y `?codigo=` es una lista de una fila. */
const PADRON = `/rentas-registro/contribuyentes/${CONTRIBUYENTE}`;
const VEHICULO = '/rentas-registro/vehiculos/T2G-418';
const DECLARACION = '/rentas-registro/declaracion-jurada/000418?ano=2026';

const fetchOriginal = globalThis.fetch;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  globalThis.fetch = fetchOriginal;
});

/** El padron responde **una** fila: la busqueda por documento o por nombre que acierta. */
function unSoloContribuyente(): void {
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const url = typeof entrada === 'string' ? entrada : String(entrada);
    if (!url.includes('/rentas/contribuyentes')) return proxy(entrada, opciones);
    const contenido = [
      {
        id: 1,
        codigo: CONTRIBUYENTE,
        tipoDocumento: 'DNI',
        numeroDocumento: '03593174',
        tipoPersona: 'NATURAL',
        nombreRazonSocial: 'SUC. RUFINA MEDINA MEDINA',
        condicionEspecial: null,
        activo: true,
      },
    ];
    return Promise.resolve(
      new Response(
        JSON.stringify({
          contenido,
          pagina: 0,
          tamano: 1,
          totalElementos: 1,
          totalPaginas: 1,
          hayMas: false,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
  };
}

describe('la cabecera-resumen dice a quien se tiene delante', () => {
  it('compone codigo, nombre, documento y estado con la fila que ya llego', async () => {
    montarEnRuta(PADRON);

    const resumen = await screen.findByRole('region', { name: 'Resumen del contribuyente' });
    expect(within(resumen).getByText(CONTRIBUYENTE)).toBeInTheDocument();
    expect(within(resumen).getByText('SUC. RUFINA MEDINA MEDINA')).toBeInTheDocument();
    expect(within(resumen).getByText('03593174')).toBeInTheDocument();
    // «A» del manual, con su texto dentro de la insignia: el estado nunca se
    // comunica solo por color (FRO-02 §2.1).
    expect(within(resumen).getByText('A')).toBeInTheDocument();
  });

  it('sin registro abierto no hay cabecera: el padron es un padron', async () => {
    montarEnRuta('/rentas-registro/contribuyentes');
    await screen.findByRole('columnheader', { name: 'Código' });
    expect(
      screen.queryByRole('region', { name: 'Resumen del contribuyente' }),
    ).not.toBeInTheDocument();
  });

  it('la deuda sale como un guion explicado, y en ningun caso como un cero', async () => {
    montarEnRuta(PADRON);

    const resumen = await screen.findByRole('region', { name: 'Resumen del contribuyente' });
    const linea = within(resumen)
      .getByText(/Deuda a hoy/)
      .closest('p') as HTMLElement;
    expect(linea.textContent).toContain(SIN_DATO);
    // **Es la cifra que mas se mira**: un cero se lee como «no debe», y no hay
    // nada que sostenga esa frase mientras `deudaActualizadaA(fecha)` no exista.
    expect(linea.textContent).not.toMatch(/0[.,]00|S\/\s*0/);
    // Y el guion va explicado, que es lo que lo distingue de un hueco.
    expect(linea.textContent).toMatch(/no la publica todavía/);
    /* Y **ahi se acaba**. La linea llevaba ademas «Es la deuda actualizada a una
       fecha, no un saldo guardado: hasta que exista, un guion — nunca un cero»,
       que es la justificacion de diseno: le explica a quien construye el sistema
       por que se decidio asi. Al mostrador no le sirve —ya sabe que el dato no
       esta— y ocupa el sitio de lo que si le sirve. La justificacion vive en el
       comentario de `LineaDeDeuda`, que es donde tiene lector. */
    expect(linea.textContent).not.toMatch(/saldo guardado|nunca un cero/);
    expect((linea.textContent ?? '').length).toBeLessThan(70);
  });

  /**
   * **Con un solo resultado, ese es** (#332).
   *
   * En ventanilla no se busca por codigo municipal: el contribuyente llega con
   * su DNI en la mano. La cabecera solo aparecia con `?codigo=`, asi que la
   * busqueda que de verdad se hace —por documento o por nombre— encontraba a la
   * persona, la ensenaba en una fila de ocho columnas y no resumia nada.
   */
  it('una búsqueda con un único resultado abre la cabecera aunque no haya código', async () => {
    // El proxy no filtra —y lo dice—, asi que el unico resultado lo sirve la
    // prueba: lo que se comprueba es la cabecera, no el filtrado del servidor.
    unSoloContribuyente();
    montarEnRuta(`/rentas-registro/contribuyentes?nombre=${encodeURIComponent('MEDINA')}`);
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBe(1));

    const resumen = await screen.findByRole('region', { name: 'Resumen del contribuyente' });
    // El codigo lo pone la fila: es el que se estaba buscando sin saberlo.
    expect(within(resumen).getByText(CONTRIBUYENTE)).toBeInTheDocument();
  });

  /**
   * Y con varios **no**: elegir por su cuenta cual de los cinco «GARCIA» es
   * seria decidir por quien atiende.
   */
  it('con varios resultados no se resume ninguno', async () => {
    montarEnRuta('/rentas-registro/contribuyentes');
    await waitFor(() => expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(1));
    expect(
      screen.queryByRole('region', { name: 'Resumen del contribuyente' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Y **ni siquiera se pide el trozo** cuando no hay nada que resumir (#332).
   *
   * Las tres cabeceras de rentas llegan en su propio `lazy` para no viajar en el
   * arranque, pero el `Suspense` que las envuelve se montaba siempre que la
   * opcion declarara una: el navegador bajaba el trozo para dibujar `null`, y el
   * padron sin nadie abierto es el caso normal de esa pantalla. Se ve en el
   * hueco de carga —el `Esqueleto` de 92 px del `fallback`—, que es lo unico que
   * ese `Suspense` deja en el DOM antes de resolver.
   */
  it.each([
    { caso: 'el padrón sin nadie abierto', codigo: undefined, url: '', filas: 4, resume: false },
    { caso: 'la ficha abierta por su ruta', codigo: '00028314', url: '', filas: 0, resume: true },
    {
      caso: 'el registro en el filtro',
      codigo: undefined,
      url: 'codigo=00028314',
      filas: 4,
      resume: true,
    },
    {
      caso: 'una búsqueda con un solo resultado',
      codigo: undefined,
      url: 'nombre=MEDINA',
      filas: 1,
      resume: true,
    },
    {
      caso: 'una búsqueda con varios',
      codigo: undefined,
      url: 'nombre=GARCIA',
      filas: 5,
      resume: false,
    },
    {
      caso: 'una búsqueda sin resultados',
      codigo: undefined,
      url: 'nombre=ZZZ',
      filas: 0,
      resume: false,
    },
  ])('$caso → $resume', ({ codigo, url, filas, resume }) => {
    expect(hayQueResumir(codigo, new URLSearchParams(url), filas)).toBe(resume);
  });

  it('la ficha de vehiculo resume lo que `VehiculoResource` publica, y el resto con «—»', async () => {
    montarEnRuta(VEHICULO);

    const resumen = await screen.findByRole('region', { name: 'Resumen del vehículo' });
    expect(within(resumen).getByText('T2G-418')).toBeInTheDocument();
    expect(within(resumen).getByText(/TOYOTA YARIS GLI/)).toBeInTheDocument();
    // El titular llega como identificador interno: no se ensena, y no se cruza
    // con el padron para inventarlo.
    const titular = within(resumen).getByText('Titular').closest('div');
    expect(titular?.textContent).toContain(SIN_DATO);
  });

  it('la declaracion jurada dice cual es antes de la tabla de una fila', async () => {
    montarEnRuta(DECLARACION);

    const resumen = await screen.findByRole('region', { name: 'Resumen de la declaración' });
    expect(within(resumen).getByText('DJ 000418')).toBeInTheDocument();
    expect(within(resumen).getByText(/Ejercicio 2026/)).toBeInTheDocument();
  });

  it('ninguna cifra del resumen se recompone: sale tal cual la sirvio la API', async () => {
    montarEnRuta(PADRON);
    await screen.findByRole('region', { name: 'Resumen del contribuyente' });

    /* **Ya no se espera a la tabla**, y no es un recorte: desde #503 la lista y
       el expediente no se dibujan a la vez, así que en la ruta del registro no
       hay `tbody`. Lo que este caso mide sigue entero —la cabecera repite datos
       de la fila, y ninguno puede llegar transformado (RNF-083)—, y las tablas
       prestadas no entran porque su sección arranca cerrada. */
    const servidas = cifrasServidas('contribuyentes');
    for (const cifra of cifrasEnPantalla()) expect(servidas).toContain(cifra);
  });
});

describe('el indice sustituye a las pestanas, y solo donde se declara', () => {
  /**
   * **Lo que este caso protege es que no se pierda ninguna seccion**, y desde
   * #503 F2 eso ya no se mide en el indice: el indice del padron agrupa sus
   * nueve pestanas en cinco apartados, y quien comprueba ese agrupamiento
   * —y que ninguna pestana se quede fuera de el— es
   * `expediente-del-contribuyente.test.tsx`.
   *
   * Aqui se sigue midiendo lo de #330, que es lo que no cambio: la barra de
   * pestanas desaparece y **las doce secciones se dibujan en una sola pagina**,
   * con su rotulo del manual (RNF-080). Se mira la pagina y no el indice
   * porque es la pagina la que las tiene.
   */
  it('el padron apila sus nueve pestanas en una pagina, con las doce secciones', async () => {
    montarEnRuta(PADRON);
    await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    // La barra de pestanas deja de dibujarse: era navegacion, y el indice hace
    // la misma navegacion desplazando en vez de recargar.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    const cabeceras = document.querySelectorAll('.sgtm-seccion__cabecera');
    const rotulos = [...cabeceras].map((nodo) => nodo.textContent ?? '');
    // De la pestana 1, de la 2 y de la novena: las tres que antes exigian un
    // clic cada una para saber si el dato existia.
    expect(rotulos.some((rotulo) => rotulo.includes('Identificación'))).toBe(true);
    expect(rotulos.some((rotulo) => rotulo.includes('Domicilio fiscal'))).toBe(true);
    expect(rotulos.some((rotulo) => rotulo.includes('Unidades afectas del contribuyente'))).toBe(
      true,
    );
    expect(cabeceras.length, 'las doce secciones de las nueve pestanas').toBe(12);
  });

  it('la ficha de vehiculo hace lo mismo con sus seis', async () => {
    montarEnRuta(VEHICULO);
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    const entradas = within(indice)
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    expect(entradas).toEqual([
      'Identificación',
      'Características técnicas',
      'Titular del vehículo',
      'Conductor habitual',
      'Impuesto al patrimonio vehicular',
      'Inafectación y exoneración',
      'Notas',
      'Ir a las acciones',
    ]);
  });

  it('la entrada lleva a su ancla, que existe y es la seccion que dice', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(VEHICULO);
    const indice = await screen.findByRole('navigation', { name: 'Secciones de la pantalla' });

    // «Ir a …»: el rotulo a secas es tambien el de la cabecera plegable de la
    // seccion, y dos botones con el mismo nombre accesible no se distinguen.
    const tercera = within(indice).getByRole('button', { name: 'Ir a Titular del vehículo' });
    await usuario.click(tercera);

    const ancla = document.getElementById('sgtm-seccion-0-2');
    expect(ancla).not.toBeNull();
    expect(within(ancla as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Titular del vehículo',
    );
    expect(tercera).toHaveAttribute('data-activa', '1');
  });

  it('la declaracion jurada lleva resumen y **no** indice: declara una sola seccion', async () => {
    montarEnRuta(DECLARACION);
    await screen.findByRole('region', { name: 'Resumen de la declaración' });
    expect(
      screen.queryByRole('navigation', { name: 'Secciones de la pantalla' }),
    ).not.toBeInTheDocument();
  });
});

describe('el aviso de dominio explica los «—» antes de que alguien los lea mal', () => {
  it('el padron y la ficha de vehiculo lo declaran, y dice de quien depende el hueco', async () => {
    expect(AVISOS['contribuyentes']?.detalle).toMatch(/salen con «—»/);
    expect(AVISOS['vehiculos']?.detalle).toMatch(/tabla referencial del MEF/);

    montarEnRuta(PADRON);
    expect(await screen.findByText(/Lo que el padrón publica hoy/)).toBeInTheDocument();
  });
});
