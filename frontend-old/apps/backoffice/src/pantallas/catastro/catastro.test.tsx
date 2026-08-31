import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { censoDeConectadas } from '../aportes-de-modulo';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria } from '../../pruebas/acciones';
import { SIN_DATO as SIN_CIFRA } from '../seguridad/listado';

/* El censo de conectadas del catalogo entero, SIN registrar ninguna: desde #433 las
   conexiones llegan con el trozo de su modulo, y quien las registra es la espera de
   `Pantalla`. Registrarlas aqui dejaria a este archivo tapandose a si mismo —sus
   pantallas encontrarian su conexion aunque el renderizador no la hubiera pedido—. */
const OPCIONES_CONECTADAS = await censoDeConectadas();

/**
 * Catastro, conectado **hasta donde llega el backend** (#71).
 *
 * Las doce opciones tienen ya alguna conexion real. Lo que se comprueba aqui
 * es lo que distingue este modulo de los demas:
 *
 * - que las fichas **ensenan su version y su historico**, que es la
 *   funcionalidad de #18 —un backend que no sobrescribe no sirve de nada si la
 *   pantalla no lo cuenta—;
 * - que lo que el recurso no publica sale vacio, y en particular **ninguna
 *   cifra de valuacion se compone aqui** (D-02);
 * - que los aranceles leen un arreglo suelto, sin sobre de paginacion —lo
 *   dibuje quien lo dibuje: desde la propuesta B esa hoja vive en
 *   `CuadroDeValuacion`, y sus columnas y sus huecos no han cambiado—;
 * - que las tres tablas de valuacion caen en una sola superficie, y por que
 *   ninguna de las tres se conecta por `definirConexion`
 *   (`cuadro-de-valuacion.test.tsx`).
 */

let peticiones: string[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
    );
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

describe('el catalogo vial lee ViaResource', () => {
  it('dibuja codigo, tipo, nombre y estado, y deja vacio lo que el recurso no trae', async () => {
    montarEnRuta('/catastro/calles');

    const fila = (await screen.findByText('00001182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '00001182',
      'AVENIDA',
      'JOSÉ DE LAMA',
      // Sector, zona de arancel y arancel por m²: el prototipo los dibuja y
      // `ViaResource` no los publica. El del arancel es el que mas importa
      // —es una cifra que alimenta la valuacion de un predio—, y una cifra
      // inventada aqui acaba en un valor mal emitido. Que falte se ve.
      '—',
      '—',
      '—',
      'ACTIVA',
    ]);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/vias'))).toHaveLength(1);
  });

  it('el conteo sale del sobre paginado, no de contar las filas dibujadas', async () => {
    montarEnRuta('/catastro/calles');
    expect(await screen.findByText(/vías$/)).toBeInTheDocument();
  });
});

describe('los aranceles leen ArancelResource, sin sobre de paginacion', () => {
  it('vía sale como el id que publica el recurso; zona y variación quedan vacías', async () => {
    montarEnRuta('/catastro/aranceles');

    // Segunda fila del prototipo: via "AV. JOSÉ DE LAMA" cuadra 7-14, zona 1,
    // arancel 386.40. El recurso no publica el nombre de la via ni la zona.
    const fila = (await screen.findByText('386.40')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '2', // el id de la via, no su nombre: ArancelResource no publica cual es
      '7', // el tramo: una subdivision libre, no un rango numerico
      SIN_CIFRA, // «cuadra hasta»: no hay donde separarla del tramo
      SIN_CIFRA, // zona: ArancelResource no la publica
      '386.40',
      SIN_CIFRA, // variación vs. el ano anterior: componerla seria D-02
    ]);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/tablas/aranceles'))).toHaveLength(
      1,
    );
    // `anio` es el unico parametro que el controlador real recibe.
    const [peticion] = peticiones.filter((u) => u.includes('/api/v1/catastro/tablas/aranceles'));
    expect(peticion).toContain(`anio=${new Date().getFullYear()}`);
  });

  it('el conteo sale del arreglo, y el paginador no se dibuja: el controlador no pagina', async () => {
    montarEnRuta('/catastro/aranceles');
    expect(await screen.findByText(/aranceles$/)).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Paginación de la tabla' }),
    ).not.toBeInTheDocument();
  });
});

describe('las conexiones de catastro, por su mecanismo', () => {
  it('las siete de forma comun (lectura simple) estan en el registro de conexiones', () => {
    for (const opcion of [
      'calles',
      'sectores',
      'consulta_fichas',
      'ficha_urbana',
      'ficha_economica',
      'ficha_bienes',
      'ficha_rural',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
    // Las otras cinco tienen endpoint y no se conectan por `definirConexion`:
    // cada una cae en un componente propio, en `Pantalla.tsx`.
    //   actualizacion_catastro   escribe una lista de construcciones (#71)
    //   aranceles,               las tres son el mismo cuadro del ejercicio y
    //   valores_unitarios,       caen en una sola superficie
    //   depreciacion             (`CuadroDeValuacion.tsx`, propuesta B). La
    //                            banda de procedencia necesita la **fila
    //                            cruda** —`documentoFuente`—, que un adaptador
    //                            de celdas tira por el camino
    //   ficha_contribuyente_reporte   devuelve un archivo, no un recurso
    for (const opcion of [
      'actualizacion_catastro',
      'aranceles',
      'valores_unitarios',
      'depreciacion',
      'ficha_contribuyente_reporte',
    ]) {
      expect(OPCIONES_CONECTADAS).not.toContain(opcion);
    }
  });
});

/* ── El versionado, que es la funcionalidad de este modulo ─────────────── */

describe('la ficha ensena de cuando es lo que muestra', () => {
  it('la version que rige, su vigencia y de donde salio', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    const bloque = await screen.findByRole('region', { name: 'Versión de la ficha' });
    expect(within(bloque).getByText('Versión 3')).toBeInTheDocument();
    expect(within(bloque).getByText('VIGENTE')).toBeInTheDocument();
    // Sale dos veces: en la version que rige y en su fila del historico.
    expect(within(bloque).getAllByText('Desde 12/03/2026').length).toBeGreaterThan(0);
    // De donde salio: sin esto, «el área subió» no tiene explicación.
    expect(within(bloque).getByText(/Acta de inspección 0244-2026/)).toBeInTheDocument();
  });

  it('el historico dice quien, cuando y **por que** de cada version', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    const bloque = await screen.findByRole('region', { name: 'Versión de la ficha' });
    const versiones = within(bloque).getAllByRole('listitem');
    expect(versiones).toHaveLength(3);

    // La observacion es la mitad util, y va **entera**: es lo que se lee en voz
    // alta cuando el contribuyente pregunta por que le subio el recibo.
    expect(
      within(bloque).getByText(
        'Declaración jurada del contribuyente por ampliación del primer piso.',
      ),
    ).toBeInTheDocument();
    // Quien la escribio y cuando: la pista de auditoria, en la pantalla.
    expect(within(bloque).getByText(/jcardenas · 01\/06\/2021/)).toBeInTheDocument();
    // Y la que ya no rige dice hasta cuando rigio.
    expect(within(bloque).getByText('01/06/2021 — 11/03/2026')).toBeInTheDocument();
  });

  it('la fecha de la URL pide la ficha que regia entonces, no la de hoy', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001?fecha=2022-01-01');
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    const [peticion] = peticiones.filter((u) => u.includes('/catastro/fichas/urbana/'));
    expect(peticion).toContain('fecha=2022-01-01');
    // Y el historico se pide siempre: sin el, el bloque no puede dibujarse.
    expect(peticion).toContain('historico=true');
  });

  it('sin el codigo del predio no se pide ninguna ficha', async () => {
    montarEnRuta('/catastro/ficha-urbana');

    expect(await screen.findByText(/Elige un predio/)).toBeInTheDocument();
    // Ni una peticion: antes se pedia con un codigo de relleno y la pantalla
    // parecia funcionar mostrando un predio que no era de nadie.
    expect(peticiones.filter((u) => u.includes('/catastro/fichas/urbana/'))).toHaveLength(0);
  });
});

/* ── Ninguna cifra de valuacion se compone en la interfaz ──────────────── */

describe('las construcciones salen con sus categorias, nunca con importes', () => {
  it('la tabla de la ficha urbana lleva categorias y area, y ningun sol', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    // Las construcciones viven en **Valorizacion** desde que las cuatro fichas
    // y la actualizacion caen en una sola superficie: la ficha abre en su
    // primera pestana, no en la del cuadro de pisos. La propiedad que esta
    // prueba defiende no cambia —categorias si, soles no—, solo el sitio.
    await usuario.click(await screen.findByRole('tab', { name: 'Valorización' }));

    const fila = (await screen.findByText('118.50')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Las siete categorias van **una por columna**, bajo «Muro», «Tech», «Piso»…
    // Antes viajaban juntas en una celda —«C B C C B C B»— y se dibujaban bajo
    // las cabeceras de la tabla de **direcciones** del predio, que es la que
    // `ficha_urbana` declara en el catalogo y que `FichaResource` no publica.
    // Cabeceras de una cosa y datos de otra: eso es lo que dejo de pasar.
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      '01',
      SIN_CIFRA, // Mes: el recurso publica el ano, no el mes
      '1998',
      'NOBLE',
      'BUENO',
      SIN_CIFRA, // ECC
      'C',
      'B',
      'C',
      'C',
      'B',
      'C',
      'B',
      '118.50',
      SIN_CIFRA, // area verificada
      SIN_CIFRA, // UCA
    ]);
    // Cuanto vale cada categoria es D-02a y vive en datos versionados (regla 5).
    expect(within(fila as HTMLElement).queryByText(/S\//)).not.toBeInTheDocument();
  });

  it('la ficha rural muestra hectareas **con su unidad** y ningun arancel', async () => {
    montarEnRuta('/catastro/ficha-rural/11024-0418');
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    // «12.5000 HA» y no «12.5»: el arancel rural es por hectarea, y leer metros
    // calcularia diez mil veces de menos.
    await waitFor(() => expect(screen.getByLabelText('Área total (ha)')).toHaveValue('12.5000 HA'));
    // Arancel, valor del terreno y autovaluo son D-02: salen vacios.
    expect(screen.getByLabelText('Arancel rural (S/ por ha)')).toHaveTextContent(SIN_CIFRA);
    expect(screen.getByLabelText('Autovalúo rural (S/)')).toHaveTextContent(SIN_CIFRA);

    // Y la clasificacion del backend se ve tal cual, aunque el desplegable del
    // prototipo la escriba de otra manera: un `select` que mostrara «A1 —
    // CULTIVO EN LIMPIO» ensenaria una eleccion que nadie hizo.
    expect(screen.getByLabelText('Tipo de tierra')).toHaveValue('CULTIVO EN LIMPIO');
  });

  it('la ficha de bienes comunes reparte participacion, no valor', async () => {
    montarEnRuta('/catastro/ficha-bienes/200601010150010101');
    await screen.findByRole('region', { name: 'Versión de la ficha' });

    // El area comun la publica el recurso; el valor de los bienes comunes sale
    // de los valores unitarios, y componerlo aqui seria inventar la cifra que
    // reparte el gasto comun entre las unidades.
    expect(await screen.findByText('124.00')).toBeInTheDocument();
    const totales = screen.getByText('Valor bienes comunes').closest('div');
    expect(totales?.textContent).toContain(SIN_CIFRA);
  });
});

/* ── La consulta de fichas ─────────────────────────────────────────────── */

describe('la consulta de fichas pagina contra el servidor', () => {
  /** La fila del primer predio del juego de datos, por su titular. */
  const primeraFila = async (): Promise<HTMLElement> => {
    const celda = await screen.findByText('MEDINA MEDINA, RUFINA (SUC.)');
    const fila = celda.closest('tr');
    expect(fila).not.toBeNull();
    return fila as HTMLElement;
  };

  it('lee FichaEncontradaResource y deja vacio lo que no publica', async () => {
    montarEnRuta('/catastro/consulta-fichas');

    const fila = await primeraFila();
    // **Un** hueco (#322, ADR-0015): el codigo predial de rentas dejo de serlo,
    // y el area construida tampoco lo es —el proxy ya la sirve—. El que queda es
    // la conciliacion, que es un derivado que **ninguna** lectura publica:
    // catastro no puede componerlo sin depender de rentas.
    expect(within(fila).getAllByText(SIN_CIFRA)).toHaveLength(1);

    expect(peticiones.filter((u) => u.includes('/api/v1/catastro/fichas?'))).toHaveLength(0);
    expect(peticiones.some((u) => u.endsWith('/api/v1/catastro/fichas'))).toBe(true);
  });

  /**
   * **El area construida se pinta, no se compone** (RNF-083, #290).
   *
   * `FichaEncontradaResource` la publica **ya sumada desde el servidor**, y la
   * interfaz tiene prohibido sumarla: sumar las areas por piso en el navegador
   * daria una cifra que el backend no puede sustentar, y nadie notaria la
   * diferencia mirando la tabla.
   *
   * La comprobacion es **igualdad exacta con el campo de la respuesta**, y no
   * contar guiones. Contar guiones dice que la celda no esta vacia y nada mas:
   * una celda con una suma hecha aqui —«284.50» en vez de «164.50»— pasaria
   * igual. Y ESLint no puede cazar esa aritmetica: la regla que prohibe componer
   * cifras mira `@sgtm/dominio` y los operadores sobre importes declarados, no un
   * `Number(a) + Number(b)` sobre dos campos cualesquiera de una respuesta. Si
   * esto no lo comprueba una prueba, no lo comprueba nada.
   */
  it('el área construida es la del recurso, tal cual', async () => {
    montarEnRuta('/catastro/consulta-fichas');

    const celdas = within(await primeraFila()).getAllByRole('cell');
    expect(celdas[5]?.textContent).toBe('164.50');
  });

  /**
   * **«Cod. Predial Rentas» es el codigo de referencia catastral** (ADR-0015).
   *
   * No hay dos padrones de predios: `sgtm-rentas` traduce su `codigoPredial` a
   * `p.codigo_ref_catastral`. Por eso las dos columnas traen **el mismo valor y
   * escrito igual**: troquelar una de las dos fabricaria la apariencia de un
   * segundo codigo distinto, que es la ilusion que el ADR desmonta.
   */
  it('las dos columnas de código traen el mismo valor, y escrito igual', async () => {
    montarEnRuta('/catastro/consulta-fichas');

    const celdas = within(await primeraFila()).getAllByRole('cell');
    expect(celdas[0]?.textContent).toBe('200601010150010101001');
    expect(celdas[1]?.textContent).toBe(celdas[0]?.textContent);
    // Y las dos son **el campo de la respuesta, sin tocar**: igualdad exacta con
    // `codRefCatastral`, no «no contiene guiones».
    //
    // La asercion anterior era `not.toContain('-')`, y no comprobaba lo que
    // decia: hay codigos legitimos con guion en esta misma pantalla —la columna
    // «Cod. Predial Rentas» del prototipo trae «02-014-D-14-01»—, asi que la
    // ausencia de guion no distingue «sin troquelar» de «troquelado de otra
    // forma». Lo que distingue las dos cosas es el valor entero.
    expect(celdas[1]?.textContent).toBe('200601010150010101001');
  });

  /**
   * **Lo que la columna «Conciliada» significa, dicho** (#322).
   *
   * Un predio que rentas no reconoce **no genera deuda predial**, y esa es la
   * consecuencia mas cara del modulo. Sin el aviso, un «—» en esa columna se lee
   * como un fallo de la tabla; con el, se lee lo que es —nadie publica todavia
   * esa lectura— y se sabe que hacer: registrar la declaracion jurada.
   */
  it('dice la consecuencia y el acto: sin declaración jurada no hay deuda predial', async () => {
    montarEnRuta('/catastro/consulta-fichas');

    expect(
      await screen.findByText('Un predio sin declaración jurada no genera deuda predial'),
    ).toBeInTheDocument();
    // El acto que concilia, nombrado: no es escribir un codigo en la ficha
    // —el codigo ya lo tiene— sino incorporar el predio al padron afecto.
    expect(screen.getByText(/registrar su declaración jurada/)).toBeInTheDocument();
    // Y por que las dos primeras columnas coinciden.
    expect(screen.getByText(/el mismo código de referencia catastral/)).toBeInTheDocument();
    // **Donde se registra, con el estado real** (revision de #322). El aviso
    // decia que el acto «tiene su propia opción», y la opcion `declaracion_jurada`
    // es solo `GET`: manda a buscar una puerta que no existe entre 134 pantallas.
    // Lo que dice ahora es lo que dice la franja de la accion apagada.
    expect(screen.getByText(/por el procedimiento actual, fuera del sistema/)).toBeInTheDocument();
    expect(screen.getByText(/solo consulta las ya presentadas/)).toBeInTheDocument();
    // La referencia al ADR se queda en el codigo: en ventanilla no es
    // informacion, es ruido con forma de numero de expediente.
    expect(screen.queryByText(/ADR-0015/)).not.toBeInTheDocument();
  });

  /**
   * **El pie del prototipo contradecia al aviso, en el mismo viewport**
   * (revision de #322).
   *
   * Bajo la tabla, el catalogo portado escribe «Las fichas no conciliadas no
   * generan deuda predial hasta que se les asigne código predial de rentas», y
   * un palmo mas arriba el aviso dice que **no hay ningun codigo predial de
   * rentas que asignar** —es el mismo codigo de referencia catastral que el
   * predio ya tiene— y que lo que falta es la declaracion jurada. Dos frases
   * opuestas a la vez no dejan al lector con media verdad: le dejan sin saber
   * cual creer, y la que el pie propone —«asignar un codigo»— es justamente el
   * acto que ADR-0015 demuestra que no existe.
   *
   * El pie viene de un `.generado.ts` que no se edita a mano, asi que la
   * correccion vive donde ya vive la prosa (`PIES`, en `prosa-textos.ts`) y
   * `TablaDePantalla` la consulta antes de pintar.
   */
  it('el pie del prototipo que contradecía al aviso ya no se pinta', async () => {
    montarEnRuta('/catastro/consulta-fichas');
    await primeraFila();

    expect(screen.queryByText(/asigne código predial de rentas/)).not.toBeInTheDocument();
    // Y lo que si se ve es el aviso, que dice la misma consecuencia con el acto
    // correcto detras: no falta un codigo, falta la declaracion jurada.
    expect(
      screen.getByText('Un predio sin declaración jurada no genera deuda predial'),
    ).toBeInTheDocument();
  });

  /**
   * **El filtro «Conciliada con rentas» garantizaba un 422** (ADR-0015 §2).
   *
   * Estaba vivo, el contrato lo declara como parametro de consulta y
   * `ConsultaController` lo rechaza **con cualquier valor** —«Todas» incluida en
   * cuanto se elige y viaja—, porque la lectura que lo responderia vive en rentas
   * y no existe. Elegir cualquier cosa en ese desplegable dejaba la consulta de
   * fichas rota. No lo veia ninguna prueba porque el proxy de datos ignora los
   * filtros: el camino entero solo se recorre contra el backend de verdad.
   *
   * Mismo trato que «Conciliar seleccionadas»: se ve —el rotulo del prototipo se
   * conserva (RNF-080)—, no se puede usar, y dice por que.
   */
  it('«Conciliada con rentas» se dibuja bloqueada, con su motivo, y no viaja', async () => {
    montarEnRuta('/catastro/consulta-fichas');

    /* Desde #498 F7 esta pantalla pliega tras «Búsqueda avanzada» los filtros
       de detras del primero, y este es uno de ellos: el codigo de referencia
       catastral es con lo que se busca y los otros cuatro acotan. Se despliega
       para mirarlo; lo que la prueba dice —que se ve, que no se puede usar y
       que no viaja— no cambia. */
    await userEvent.click(await screen.findByRole('button', { name: /Búsqueda avanzada/ }));

    const filtro = await screen.findByLabelText('Conciliada con rentas');
    expect(filtro).toBeDisabled();
    expect(screen.getByText(/todavía no publica si rentas reconoce un predio/)).toBeInTheDocument();

    // Y no viaja: ni el montaje lo manda, ni «Buscar» puede llevarlo a la URL
    // —el control no escribe en el borrador—.
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones.some((u) => u.includes('conciliadaConRentas'))).toBe(false);
  });

  it('un enlace compartido con el filtro puesto no lo lleva a la petición', async () => {
    // El control bloqueado cubre solo el camino barato: quien teclea. El caro
    // es la URL compartida —el montaje lee la consulta directamente, sin pasar
    // por ningun formulario—, y lo cubre el borrado de la clave en los
    // parametros de la conexion. Sin esta prueba, quitar ese borrado dejaba
    // las 856 en verde y el 422 volvia por el enlace.
    montarEnRuta('/catastro/consulta-fichas?conciliadaConRentas=S%C3%AD');
    await screen.findByText('MEDINA MEDINA, RUFINA (SUC.)');
    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones.some((u) => u.includes('conciliadaConRentas'))).toBe(false);
  });

  /**
   * **La tabla se alcanza con el teclado** (FRO-04 §7, RNF-082).
   *
   * El marco de la tabla desborda —siete columnas, y en 1366 px la ultima,
   * «Conciliada», queda fuera—, se desplaza con el raton y **sin raton no habia
   * forma de llegar a ella**: un contenedor con `overflow-x` no esta en el
   * recorrido del tabulador, y no hay ningun control dentro de la tabla a la
   * derecha del corte que obligara al navegador a desplazarla.
   *
   * Los tres atributos van juntos: `tabIndex` para entrar, `role="region"` para
   * que un lector de pantalla anuncie que se ha entrado en algo, y `aria-label`
   * porque una region sin nombre no se puede anunciar.
   */
  it('el marco de la tabla recibe el foco y se anuncia con su nombre', async () => {
    montarEnRuta('/catastro/consulta-fichas');
    await primeraFila();

    const marco = screen.getByRole('region', { name: 'Fichas encontradas' });
    expect(marco).toHaveClass('sgtm-tabla__marco');
    expect(marco).toHaveAttribute('tabindex', '0');
  });

  /**
   * **«Conciliar seleccionadas» no promete lo que no puede** (#337, ADR-0015 §3).
   *
   * La accion masiva a ciegas del prototipo no se implementa, y la operacion de
   * esta pantalla es un `GET`: no hay a donde guardar. La franja de actos
   * honestos lo dice, y la causa es `sin-backend` —no `sin-declaracion`, que
   * pediria una lista blanca para una escritura que no existe, ni ninguna de las
   * de salida, porque «Conciliar» no imprime ni exporta nada—.
   */
  it('«Conciliar seleccionadas» se queda apagada, y la franja lo explica', async () => {
    montarEnRuta('/catastro/consulta-fichas');
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    expect(screen.getByRole('button', { name: 'Conciliar seleccionadas' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      'sin-backend',
    );
  });
});
