import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { todasLasPantallas } from '../../catalogo';
import { censoDeAportes } from '../aportes-de-modulo';
import { SIN_DATO } from '../seguridad/listado';
import { datosDeLaCabecera, sectorYManzana } from './ResumenDeFicha';

/* La composicion llega con el trozo de su modulo desde #433, y este archivo monta
   pantallas: se lee el censo **sin registrarlo**, para que lo que las pantallas
   encuentren siga siendo solo lo que `Pantalla` pidio. */
const COMPOSICIONES = (await censoDeAportes()).composiciones;

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

  /* ── Los dos datos que le faltaban a la cabecera (#413 A3) ───────────── */

  /**
   * El artboard de la propuesta A ensena **seis** datos y la cabecera publicaba
   * cuatro. Los dos que faltaban no piden nada al backend, y por motivos
   * opuestos: uno esta **dentro del identificador** con que se abrio la ficha, y
   * el otro **no lo tiene nadie**.
   */
  it('«Sector · manzana» sale del propio código, sin pedir nada', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    // `200601010150010101001` reparte 20-06-01-**01**-**015**-001-01-01-00-1: el
    // sector es el cuarto tramo y la manzana el quinto. No es una peticion mas:
    // es leer lo que ya esta en la ruta, con el troquel de `codigo.ts`.
    expect(cabecera.getByText('Sector · manzana').nextElementSibling).toHaveTextContent('01 · 015');
  });

  /**
   * **El autovaluo es la cifra que todo el mundo viene a buscar, y no la tiene
   * nadie** (D-02a). Sale «—», y el guion va con su motivo por lo mismo que la
   * conciliacion: suelto en la rejilla se leeria como «la ficha no lo trae».
   */
  it('«Autovalúo» sale «—», y dice que no lo determina nadie todavía', async () => {
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const cabecera = within(resumen());
    expect(cabecera.getByText('Autovalúo').nextElementSibling).toHaveTextContent(SIN_DATO);
    expect(cabecera.getByText(`Autovalúo: ${SIN_DATO}`)).toBeInTheDocument();
    expect(
      cabecera.getByText(/todavía no hay ninguna determinación de este ejercicio que lo calcule/),
    ).toBeInTheDocument();
    // Y dice la otra mitad: tampoco se compone aqui con lo que se ve (RNF-083).
    expect(
      cabecera.getByText(/no se compone aquí con lo que se ve en pantalla/),
    ).toBeInTheDocument();
  });

  /**
   * **Y «Área construida» se queda en «—», que no es lo mismo que un olvido.**
   *
   * `FichaResource` publica `areaTerreno` y **no** `areaConstruida`: la unica que
   * la publica es `FichaEncontradaResource` —la del listado de «Consulta de
   * fichas»— y la trae ya sumada **desde el servidor** (#290). La ficha, en
   * cambio, carga sus construcciones piso a piso, asi que la suma esta al
   * alcance de la mano: 118.50 + 46.00. Justo por eso el hueco es una decision y
   * no una falta de datos —sumarlas seria componer una cifra en la interfaz
   * (RNF-083)—, y esta prueba mide las dos mitades: que los sumandos estan, y
   * que el total no.
   */
  it('«Área construida» sigue vacía aunque los pisos estén: la interfaz no suma', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(URBANA);
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    expect(within(resumen()).getByText('Área construida').nextElementSibling).toHaveTextContent(
      SIN_DATO,
    );

    // Los dos sumandos estan en la pantalla, y su suma —164.50— no aparece en
    // ningun sitio: si alguien la compusiera, esto se pondria rojo.
    await usuario.click(screen.getByRole('tab', { name: 'Valorización' }));
    const tabla = await screen.findByRole('region', { name: 'Versiones registradas por piso' });
    expect(within(tabla).getByText('118.50')).toBeInTheDocument();
    expect(within(tabla).getByText('46.00')).toBeInTheDocument();
    expect(screen.queryByText('164.50')).not.toBeInTheDocument();
  });

  it('sin registro abierto no hay resumen: no hay ficha que resumir', async () => {
    montarEnRuta('/catastro/ficha-urbana');
    expect(await screen.findByText(/Elige un predio/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen de la ficha' })).not.toBeInTheDocument();
  });
});

/* ── La rejilla, sin montar nada (#413 A3) ─────────────────────────────── */

/**
 * Los seis datos son una funcion pura de (codigo, campos), y se miran de frente.
 *
 * Es lo mismo que hace `seccionesDeLaPestana` con el reparto de pestanas: aqui
 * vive la decision, y comprobarla montando la ficha entera la dejaria escondida
 * detras de un proxy, un catalogo y cinco pestanas.
 */
describe('la rejilla de la cabecera, como funcion', () => {
  const CAMPOS = { nombreDelContribuyente: 'PEÑA GARCÍA, ROSA E.', uso2: 'Casa habitación' };

  it('los seis del artboard, en su orden', () => {
    expect(datosDeLaCabecera('200601010150010101001', CAMPOS).map((dato) => dato.etiqueta)).toEqual(
      ['Titular', 'Uso', 'Área de terreno', 'Área construida', 'Sector · manzana', 'Autovalúo'],
    );
  });

  /**
   * **El autovaluo va declarado `cifra` con la fecha en blanco, y a proposito.**
   *
   * Asi la regla 9 la sostiene el tipo y no un comentario: el dia que la cifra
   * llegue, quien la ponga tiene que traer su `aLaFecha` o `CabeceraDeRegistro`
   * la seguira dibujando «—» (ver `bloques/CabeceraDeRegistro.test.tsx`). Un
   * valor inventado aqui no llega ni a pintarse; esta prueba caza ademas el
   * intento, que es lo que un `toHaveTextContent` sobre el DOM no puede.
   */
  it('el autovalúo es un hueco declarado como cifra sin fecha, no un texto suelto', () => {
    const autovaluo = datosDeLaCabecera('200601010150010101001', CAMPOS).find(
      (dato) => dato.etiqueta === 'Autovalúo',
    );
    expect(autovaluo).toEqual({
      etiqueta: 'Autovalúo',
      valor: SIN_DATO,
      cifra: true,
      aLaFecha: '',
    });
  });

  /** Y el area construida sigue siendo el hueco que RNF-083 exige. */
  it('el área construida es «—» y no una suma', () => {
    const area = datosDeLaCabecera('200601010150010101001', CAMPOS).find(
      (dato) => dato.etiqueta === 'Área construida',
    );
    expect(area?.valor).toBe(SIN_DATO);
  });
});

describe('sectorYManzana lee dos tramos del codigo, y no inventa ninguno', () => {
  it('con el código completo, los dos tramos tal como están escritos', () => {
    expect(sectorYManzana('200601010150010101001')).toBe('01 · 015');
    // El de bienes comunes es el mismo sin el tramo de unidad: los dos tramos
    // que interesan van antes, asi que sale igual.
    expect(sectorYManzana('200601010150010101')).toBe('01 · 015');
  });

  /**
   * **Un identificador que no es un codigo de referencia catastral sale «—»**, y
   * es el caso real: la ficha rural se abre por su unidad catastral
   * —`11024-0418`, con guion—. Repartirla en los diez tramos del manual leeria
   * «11» como departamento y diria de ella algo que no es cierto.
   *
   * **Y hay que medirlo con un identificador largo, no con el corto.** Quitar la
   * guarda y probar solo con `11024-0418` deja la prueba en VERDE: sus nueve
   * digitos no llegan a completar la manzana, asi que quien devuelve «—» es la
   * guarda de longitud y no esta. Con uno que si los complete —los guiones se
   * caen y quedan quince digitos— la diferencia se ve: sin la guarda saldria
   * «41 · 801», un sector y una manzana leidos de una numeracion que no es
   * posicional. La cabecera tiene que decir lo mismo que el conmutador de
   * modalidades, que apaga sus chips con **este mismo** predicado.
   */
  it('un identificador que no es catastral sale «—», aunque tenga dígitos de sobra', () => {
    expect(sectorYManzana('11024-0418')).toBe(SIN_DATO);
    expect(sectorYManzana('11024-0418-015-001')).toBe(SIN_DATO);
    expect(sectorYManzana('')).toBe(SIN_DATO);
  });

  /**
   * **Y un codigo a medio componer tampoco.** Escribir un prefijo es una
   * busqueda legitima (`codigo.ts`), y ahi la manzana llega corta: pintar
   * «01 · 0» diria que el predio esta en la manzana 0, que es otra manzana.
   */
  it('un prefijo que no llega a completar la manzana sale «—»', () => {
    // 20-06-01-01-0 : el sector esta entero, la manzana lleva un digito de tres.
    expect(sectorYManzana('200601010')).toBe(SIN_DATO);
    // Sin llegar siquiera al sector.
    expect(sectorYManzana('2006')).toBe(SIN_DATO);
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
    const encabezado = screen.getByRole('heading', {
      level: 2,
      name: 'Información complementaria',
    });
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
    expect(COMPOSICIONES['transferencia_predio']?.indice).toBeUndefined();
    montarEnRuta('/rentas-registro/transferencia-predio');
    await screen.findByRole('heading', { level: 1 });
    expect(
      screen.queryByRole('navigation', { name: 'Secciones de la pantalla' }),
    ).not.toBeInTheDocument();
  });

  it('las cuatro fichas lo declaran con pestanas, y las dos de rentas en vez de ellas', async () => {
    /* Recorre las 134, asi que necesita la composicion de los doce modulos: desde
       #433 llega con el trozo de cada uno. Se lee **sin registrarla**
       (`censoDeAportes`), porque este archivo tambien monta pantallas y
       registrarla lo dejaria tapandose a si mismo. */
    const composiciones = (await censoDeAportes()).composiciones;
    const pantallas = await todasLasPantallas();
    const declarado = (valor: unknown): readonly string[] =>
      Object.keys(pantallas)
        .filter((opcion) => composiciones[opcion]?.indice === valor)
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

    /* Y la del prototipo que sigue sin acto se queda como estaba: visible y
       apagada. Dos primarias en la misma barra dirian que hay dos actos.

       **Son una, y no cuatro, desde #391 §2**: «Modificar» y «Deshacer» son
       modos y salen de la barra, y «Guardar» tambien —la ficha es un `GET`, asi
       que ese boton no podia guardar ni el dia que llegara el backend—. Lo que
       queda de las cinco del catalogo es «Nuevo», que abre el alta guiada, y
       «Imprimir». */
    const imprimir = screen.getByRole('button', { name: 'Imprimir' });
    expect(imprimir).toBeDisabled();
    expect(imprimir).not.toHaveClass('sgtm-boton--primario');
    for (const etiqueta of ['Modificar', 'Deshacer', 'Guardar']) {
      expect(
        screen.queryByRole('button', { name: etiqueta }),
        `«${etiqueta}» sigue en la barra de la ficha`,
      ).not.toBeInTheDocument();
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
    expect(COMPOSICIONES['ficha_bienes']?.acto).toBeUndefined();
    expect(COMPOSICIONES['ficha_rural']?.acto).toBeUndefined();
    expect(COMPOSICIONES['ficha_urbana']?.acto).toBeDefined();
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
