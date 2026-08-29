import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { todasLasPantallas } from '../../catalogo';
import { composicionDe } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * La ficha catastral, compuesta: cabecera-resumen, indice y acto (#319).
 *
 * Una ficha son hasta once pestanas de campos, y hasta ahora se abrian a pelo:
 * quien la abria tenia que bajar hasta el bloque de versionado para saber de
 * cuando era lo que estaba leyendo, rodar la pagina para llegar a una seccion, y
 * volver al menu para corregir el predio que tenia delante.
 *
 * Lo que se comprueba, y lo que **no**:
 *
 * - la cabecera-resumen ensena la vigencia que trae la respuesta, no una
 *   inventada, y lo que el recurso no publica sale con «—»;
 * - el indice lista **exactamente** las secciones declaradas, y ninguna otra
 *   pantalla lo gana: la composicion es opt-in por opcion;
 * - el acto de la ficha —actualizar— es alcanzable y lleva el codigo en la ruta.
 *
 * Y no se comprueba que la pagina se desplace: `scrollIntoView` no existe en
 * jsdom y fingirlo no diria nada. Lo que importa es que cada entrada lleva a
 * **su** ancla, y eso si se puede mirar.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const URBANA = '/catastro/ficha-urbana/200601010150010101001';

const resumen = () => screen.getByRole('region', { name: 'Resumen de la ficha' });
const indice = () => screen.getByRole('navigation', { name: 'Secciones de la pantalla' });

describe('la cabecera-resumen dice de que ficha es y de cuando', () => {
  it('el codigo con guiones, la version vigente y desde cuando rige', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    // El codigo de la ruta, troquelado por tramos para leerlo de un vistazo.
    expect(cabecera.getByText('20-06-01-01-015-001-01-01-00-1')).toBeInTheDocument();
    // La vigencia es **la de la respuesta**: v3, vigente desde el 12/03/2026 y
    // salida de fiscalizacion. Si el recurso dijera otra cosa, esto diria otra.
    expect(cabecera.getByText('VIGENTE')).toBeInTheDocument();
    expect(cabecera.getByText(/v3 · desde 12\/03\/2026 · FISCALIZACION/)).toBeInTheDocument();
  });

  it('lo que el recurso no publica sale con «—», nunca compuesto aqui', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    // `FichaResource` no trae titular —lo tiene contribuyentes— y no trae el
    // area construida total, que es la **suma** de los pisos: la interfaz no
    // suma (RNF-083). Las dos salen vacias y el hueco dice a quien le toca.
    expect(cabecera.getByText('Titular').nextElementSibling).toHaveTextContent(SIN_DATO);
    expect(cabecera.getByText('Área construida').nextElementSibling).toHaveTextContent(SIN_DATO);
    // El uso si lo publica, y sale tal cual.
    expect(cabecera.getByText('Uso').nextElementSibling).toHaveTextContent('Casa habitación');
  });

  /**
   * **La conciliacion con rentas, dicha en la cabecera** (#322, ADR-0015).
   *
   * Es la consecuencia mas cara del modulo —un predio que rentas no reconoce no
   * genera deuda predial— y la mas invisible: la ficha se leia entera sin que
   * nada la mencionara. La linea no inventa el dato: dice que **nadie lo publica
   * todavia**, que es lo unico cierto. El dato es un derivado —existe una
   * declaracion jurada del ejercicio sobre el predio, `declaracion_jurada
   * .predio_id`, en estado PRESENTADA u OBSERVADA (ADR-0015 §1)— y su lectura le
   * toca a rentas; catastro no puede componerla sin cerrar un ciclo de modulos.
   */
  it('la cabecera dice que la conciliación con rentas no se publica todavía', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    expect(cabecera.getByText(`Conciliación con rentas: ${SIN_DATO}`)).toBeInTheDocument();
    // **Y el sujeto es «rentas», el mismo que el aviso de la consulta de
    // fichas** (revision de #322): decia «el padrón», que en este sistema es el
    // de predios o el de contribuyentes segun quien lo lea, y las dos pantallas
    // hablan de la misma cosa.
    expect(
      cabecera.getByText(/rentas no publica todavía si reconoce este predio/),
    ).toBeInTheDocument();
    /* Y **no** se inventa un estado: ni «No», ni «Sin conciliar», ni una
       insignia de tono. Cuando el dato llegue sera insignia con texto —como la
       vigencia de al lado—, y hasta entonces la unica insignia de la cabecera es
       la de la version. */
    expect(cabecera.getAllByText(/./, { selector: '.sgtm-insignia' })).toHaveLength(1);
  });

  /** Las cuatro fichas la llevan: la conciliacion es del predio, no del tipo de ficha. */
  it.each([
    ['/catastro/ficha-economica/200601010150010101001'],
    ['/catastro/ficha-bienes/200601010150010101'],
    ['/catastro/ficha-rural/11024-0418'],
  ])('%s también la lleva', async (ruta) => {
    const montada = montarEnRuta(ruta);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    expect(within(resumen()).getByText(`Conciliación con rentas: ${SIN_DATO}`)).toBeInTheDocument();

    montada.unmount();
  });

  it('sin registro abierto no hay resumen: no hay ficha que resumir', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    expect(await screen.findByText(/Elige un predio/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen de la ficha' })).not.toBeInTheDocument();
  });
});

describe('el indice lista las secciones declaradas, y solo esas', () => {
  it('las de la pestana abierta, en su orden y sin ninguna de mas', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    // Las secciones del catalogo **se conservan letra por letra** (RNF-080): lo
    // que cambia es en que pestana caen. «Identificación» recoge las tres que la
    // ficha urbana declaraba repartidas entre «Datos Generales», «Inf.
    // Complementaria» y «Observaciones».
    const declaradas = [
      'Ficha catastral urbana individual',
      'Información complementaria',
      'Notas de la ficha',
    ];

    const entradas = within(indice())
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    // La ultima entrada no es una seccion: es la **salida** hacia la barra de
    // acciones, que es lo que faltaba para no tener que tabular por los 55
    // controles de la ficha para llegar al acto (#332).
    expect(entradas).toEqual([...declaradas, 'Ir a las acciones']);
    expect(within(indice()).getByText('3 secciones')).toBeInTheDocument();
  });

  it('cada entrada lleva al ancla de su seccion, y la pulsada queda marcada', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    // Por su nombre accesible, que **no** es el rotulo a secas: la cabecera
    // plegable de la seccion es otro boton y se llama igual (#337).
    const segunda = within(indice()).getByRole('button', {
      name: 'Ir a Información complementaria',
    });
    await usuario.click(segunda);

    // El ancla existe y es la seccion que dice: sin el `id`, la entrada seria un
    // enlace a ninguna parte y nadie lo notaria.
    const encabezado = screen.getByRole('heading', { level: 2, name: 'Información complementaria' });
    const ancla = encabezado.closest('[id^="sgtm-seccion-"]');
    expect(ancla).not.toBeNull();
    expect(segunda).toHaveAttribute('data-activa', '1');
  });

  it('cambiar de pestana cambia el indice con el formulario', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    await usuario.click(screen.getByRole('tab', { name: 'Valorización' }));
    const entradas = within(indice())
      .getAllByRole('button')
      .map((boton) => boton.textContent);
    // La primera entrada es la **tabla** de la pestana, con el rotulo que le da
    // su catalogo; despues, sus secciones.
    expect(entradas).toEqual([
      'Versiones registradas por piso',
      'Obras complementarias',
      'Áreas legal y física',
      'Ir a las acciones',
    ]);
  });

  it('ninguna otra pantalla gana indice: la composicion es opt-in por opcion', async () => {
    // Una pantalla con secciones que no lo declara sigue dibujandose igual.
    // Era «vehiculos» hasta que #330 le dio indice a la ficha de vehiculo; se
    // usa otra que sigue sin declararlo, que es lo que la prueba comprueba.
    expect(composicionDe('transferencia_predio').indice).toBeUndefined();
    montarEnRuta('/rentas-registro/transferencia-predio');
    await screen.findByRole('heading', { level: 1 });
    expect(
      screen.queryByRole('navigation', { name: 'Secciones de la pantalla' }),
    ).not.toBeInTheDocument();
  });

  it('las cuatro fichas lo declaran con pestanas, y las dos de rentas en vez de ellas', async () => {
    const pantallas = await todasLasPantallas();
    const declarado = (valor: unknown): readonly string[] =>
      Object.keys(pantallas)
        .filter((opcion) => composicionDe(opcion).indice === valor)
        .sort();

    // `true` conserva la barra de pestanas y indexa la activa. Las cuatro fichas
    // **ya no lo declaran aqui**: desde que las cinco opciones del predio caen
    // en una sola superficie, el indice lo dibuja `FichaDelPredio` con las
    // secciones de su pestana activa, que son las cinco suyas y no las once del
    // catalogo. La declaracion sigue viva para lo que la sigue necesitando:
    // `predial_individual` (#333), una pantalla **sin** pestanas donde lo que el
    // indice recorre es la memoria de calculo —base, escala, beneficios y
    // cuotas—. Que el opt-in siga siendo opt-in lo comprueba la prueba de
    // arriba, con una pantalla con secciones que no lo declara.
    expect(declarado(true)).toEqual(['predial_individual']);
    // `'en-vez-de-pestanas'` las sustituye (#330): nueve pestanas de
    // contribuyentes y seis de la ficha de vehiculo pasan a una sola pagina.
    expect(declarado('en-vez-de-pestanas')).toEqual(['contribuyentes', 'vehiculos']);
  });
});

describe('el acto de la ficha es alcanzable', () => {
  it('«Actualizar catastro» es la primaria y lleva el codigo en la ruta', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const acto = screen.getByRole('link', { name: 'Actualizar catastro' });
    expect(acto).toHaveClass('sgtm-boton--primario');
    expect(acto).toHaveAttribute('href', '/catastro/actualizacion-catastro/200601010150010101001');

    // Y las del prototipo que siguen sin acto se quedan como estaban: visibles y
    // apagadas. Dos primarias en la misma barra dirian que hay dos actos.
    for (const etiqueta of ['Modificar', 'Deshacer', 'Imprimir', 'Guardar']) {
      const boton = screen.getByRole('button', { name: etiqueta });
      expect(boton).toBeDisabled();
      expect(boton).not.toHaveClass('sgtm-boton--primario');
    }

    // «Nuevo» si tiene acto desde #320 —abre el alta guiada—, y aun asi **no es
    // la primaria**: la primaria con un predio abierto es actualizarlo.
    const nuevo = screen.getByRole('button', { name: 'Nuevo' });
    expect(nuevo).toBeEnabled();
    expect(nuevo).not.toHaveClass('sgtm-boton--primario');

    await usuario.click(acto);
    // La pantalla de destino abre el predio por su codigo, sin volver a buscarlo.
    expect(await screen.findByText('Pisos declarados en la nueva versión')).toBeInTheDocument();
  });

  it('sin registro abierto no hay acto: no hay predio que actualizar', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    expect(await screen.findByText(/Elige un predio/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Actualizar catastro' })).not.toBeInTheDocument();
  });

  it('las dos fichas que no abren por el codigo catastral no lo ofrecen', () => {
    // `codEdificacion` y `codUnidad` no son codigos de referencia catastral, y
    // «Actualización del catastro» abre su predio pidiendo `ficha_urbana` por
    // `codRefCatastral`: el boton llevaria a un 404.
    expect(composicionDe('ficha_bienes').acto).toBeUndefined();
    expect(composicionDe('ficha_rural').acto).toBeUndefined();
    expect(composicionDe('ficha_urbana').acto).toBeDefined();
  });

  it('y la pantalla de actualizacion se abre componiendo el codigo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/actualizacion-catastro');

    await screen.findByText(/Elige un predio/);
    await usuario.click(screen.getByLabelText('Cod. Ref. Catastral · Depto.'));
    await usuario.paste('200601010150010101001');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Pisos declarados en la nueva versión')).toBeInTheDocument();
  });
});
