import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { cambiarEjercicio, montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { SIN_DATO } from '../seguridad/listado';
import { agruparPorMaterial, agruparPorTramo, documentosFuente } from './CuadroDeValuacion';

/**
 * **El cuadro de valuación del ejercicio** (propuesta B de
 * `design/propuestas/catastro`): `aranceles`, `valores_unitarios` y
 * `depreciacion` en una sola superficie.
 *
 * Lo que esta prueba defiende, y que ninguna podía defender mientras las tres
 * fueran tres pantallas sueltas:
 *
 * 1. **Las tres rutas siguen siendo tres.** La que se abre decide qué hoja llega
 *    activa, cambiar de pestaña **navega**, y la pestaña de una opción que este
 *    perfil no puede ver no se dibuja.
 * 2. **Un solo ejercicio, y es el de la sesión.** No el del reloj: el 1 de enero
 *    la pantalla pediría un cuadro que nadie ha sellado mientras la sesión sigue
 *    trabajando el ejercicio anterior.
 * 3. **La banda de procedencia dice lo que la API publica y nada más.** El
 *    `documentoFuente` de cada fila —todos, si son varios— y cuatro «—» con su
 *    motivo, que no se rellenan desde el corpus.
 * 4. **La cabecera sale del cuadro.** Una partida que no venga no tiene columna,
 *    nunca una cifra bajo la cabecera de otra; una celda que falte es «—».
 * 5. **El año de construcción es visible**, y las matrices de dos tramos
 *    distintos no se mezclan.
 * 6. **Los filtros que no viajan se ven bloqueados y no viajan**, tampoco por un
 *    enlace compartido.
 * 7. **No hay «Importar tabla del año» ni «Guardar»**: ninguno de los dos podía
 *    escribir (ADR-0017, V55, V18).
 *
 * **Las filas de las dos hojas nacionales se interponen por encima del proxy**,
 * como ya hace `territorio-unificado.test.tsx`: el proxy no puede fingir un
 * valor unitario ni un porcentaje de depreciación que nadie ha sellado
 * (D-02a, ADR-0010 §4), y lo que aquí se prueba es la forma de la respuesta que
 * `ValorUnitarioResource` y `DepreciacionResource` declaran, no sus cifras.
 */

const ARANCELES = '/api/v1/catastro/tablas/aranceles';
const VALORES_UNITARIOS = '/api/v1/catastro/tablas/valores-unitarios';
const DEPRECIACION = '/api/v1/catastro/tablas/depreciacion';

const HOJA_DE_ARANCELES = 'Aranceles de terreno';
const HOJA_DE_UNITARIOS = 'Valores unitarios de edificación';
const HOJA_DE_DEPRECIACION = 'Tabla de depreciación';

const ESTE_ANIO = new Date().getFullYear();

let peticiones: string[] = [];
let interpuestas: { readonly ruta: string; readonly filas: readonly unknown[] }[] = [];

/**
 * Interpone las filas de una ruta **por encima del proxy**, sin tocarlo.
 *
 * Se declara antes de montar y la responde el mismo `fetch` que apunta las
 * peticiones, para que una respuesta interpuesta siga apareciendo en la lista:
 * media prueba de este archivo mira **lo que se pidió**, no solo lo que se
 * dibujó.
 */
function elBackendResponde(ruta: string, filas: readonly unknown[]): void {
  interpuestas.push({ ruta, filas });
}

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  interpuestas = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    const url =
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    peticiones.push(url);
    const puesta = interpuestas.find((una) => url.includes(una.ruta));
    if (puesta !== undefined && (opciones?.method ?? 'GET') === 'GET') {
      return Promise.resolve(
        new Response(JSON.stringify(puesta.filas), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }
    return proxy(entrada, opciones);
  };
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

const alaRuta = (ruta: string) => peticiones.filter((url) => url.includes(ruta));

const banda = async () =>
  within(await screen.findByRole('region', { name: 'Procedencia del cuadro' }));

/** La cabecera-resumen del cuadro: qué ejercicio, qué hoja y de qué ámbito. */
const cabecera = () => screen.findByRole('region', { name: 'Resumen del cuadro' });

/** El identificador de esa cabecera, que es el ejercicio. */
const elIdentificador = () =>
  screen.getByRole('region', { name: 'Resumen del cuadro' }).querySelector('.sgtm-resumen__codigo');

/** Una fila de valores unitarios, con la forma exacta de `ValorUnitarioResource`. */
const valorUnitario = (
  partida: string,
  categoria: string,
  valorM2: string,
  desde = 2000,
  hasta: number | null = null,
  documentoFuente = 'R.M. N.º 277-2025-VIVIENDA',
) => ({
  id: `${partida}-${categoria}-${desde}`,
  partida,
  categoria,
  anioConstruccionDesde: desde,
  anioConstruccionHasta: hasta,
  valorM2,
  documentoFuente,
});

/** Una fila de depreciación, con la forma exacta de `DepreciacionResource`. */
const depreciacion = (
  material: string,
  estadoConservacion: string,
  antiguedadHasta: number,
  porcentaje: string,
) => ({
  id: `${material}-${estadoConservacion}-${antiguedadHasta}`,
  material,
  estadoConservacion,
  antiguedadHasta,
  porcentaje,
  documentoFuente: 'Reglamento Nacional de Tasaciones, Anexo I',
});

/* ── 1. Las tres rutas, una superficie ─────────────────────────────────── */

describe('las tres tablas de valuacion caen en la misma superficie', () => {
  it.each([
    { ruta: '/catastro/aranceles', activa: HOJA_DE_ARANCELES },
    { ruta: '/catastro/valores-unitarios', activa: HOJA_DE_UNITARIOS },
    { ruta: '/catastro/depreciacion', activa: HOJA_DE_DEPRECIACION },
  ])('$ruta abre con «$activa» seleccionada, y las tres pestañas a la vista', async ({
    ruta,
    activa,
  }) => {
    montarEnRuta(ruta);

    expect(await screen.findByRole('tab', { name: activa })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const barra = within(screen.getByRole('tablist', { name: 'Hojas del cuadro de valuación' }));
    expect(barra.getAllByRole('tab')).toHaveLength(3);
    // Las otras dos se ven y **no** están seleccionadas: son enlaces, no un
    // `useState`, así que el permiso lo sigue decidiendo el guardia de la ruta.
    for (const otra of [HOJA_DE_ARANCELES, HOJA_DE_UNITARIOS, HOJA_DE_DEPRECIACION].filter(
      (hoja) => hoja !== activa,
    )) {
      expect(barra.getByRole('tab', { name: otra })).toHaveAttribute('aria-selected', 'false');
    }
  });

  it('cambiar de pestaña navega: la dirección cambia y con ella la hoja', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/aranceles');

    await usuario.click(await screen.findByRole('tab', { name: HOJA_DE_DEPRECIACION }));

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: HOJA_DE_DEPRECIACION })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    // Y pide **su** cuadro, no el de la hoja anterior.
    await waitFor(() => expect(alaRuta(DEPRECIACION).length).toBeGreaterThan(0));
  });

  it('la pestaña de una opcion que este perfil no ve no se dibuja', async () => {
    entraCon({ aranceles: ['lectura'] });
    montarEnRuta('/catastro/aranceles');

    expect(await screen.findByRole('tab', { name: HOJA_DE_ARANCELES })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: HOJA_DE_UNITARIOS })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: HOJA_DE_DEPRECIACION })).not.toBeInTheDocument();
  });
});

/* ── 2. Un solo ejercicio, y es el de la sesion ────────────────────────── */

describe('el ejercicio sale de la sesion, no del reloj', () => {
  it('se pinta arriba una sola vez y es lo unico que viaja', async () => {
    montarEnRuta('/catastro/aranceles');

    // Desde #391 §4 el ejercicio es el **identificador** de la cabecera-resumen
    // y no un `Campo` de solo lectura dentro de una tarjeta: es lo que
    // identifica al cuadro, y lo unico que viaja.
    expect(await cabecera()).toHaveTextContent(String(ESTE_ANIO));
    await waitFor(() => expect(alaRuta(ARANCELES).length).toBeGreaterThan(0));
    expect(alaRuta(ARANCELES)[0]).toContain(`anio=${ESTE_ANIO}`);

    // Y **no** hay un segundo selector de ejercicio en el bloque de búsqueda:
    // la propuesta entera es que haya uno.
    expect(screen.queryByLabelText('Ejercicio de trabajo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ejercicio')).not.toBeInTheDocument();
  });

  it('cambiar el año de trabajo de la sesion cambia el cuadro que se pide', async () => {
    montarEnRuta('/catastro/depreciacion');
    await screen.findByRole('tab', { name: HOJA_DE_DEPRECIACION });

    cambiarEjercicio(2024);

    await waitFor(() => expect(elIdentificador()).toHaveTextContent('2024'));
    await waitFor(() => expect(alaRuta(DEPRECIACION).some((u) => u.includes('anio=2024'))).toBe(true));
  });

  it('un enlace con «?ejercicio=» no manda otro año que el de la sesion', async () => {
    montarEnRuta('/catastro/valores-unitarios?ejercicio=2019');
    await screen.findByRole('tab', { name: HOJA_DE_UNITARIOS });

    await waitFor(() => expect(alaRuta(VALORES_UNITARIOS).length).toBeGreaterThan(0));
    expect(alaRuta(VALORES_UNITARIOS).some((u) => u.includes('ejercicio=2019'))).toBe(false);
    expect(alaRuta(VALORES_UNITARIOS).every((u) => u.includes(`anio=${ESTE_ANIO}`))).toBe(true);
  });
});

/* ── 3. La banda de procedencia ────────────────────────────────────────── */

describe('la banda de procedencia dice lo que la API publica, y solo eso', () => {
  it('un solo documento fuente se pinta tal cual, con su ambito', async () => {
    elBackendResponde(ARANCELES, [
      { id: 1, viaId: 1, tramo: 'Cuadras 1 a 4', valorM2: '412.00', documentoFuente: 'R.A. 0142' },
      { id: 2, viaId: 2, tramo: 'Cuadra 5', valorM2: '388.00', documentoFuente: 'R.A. 0142' },
    ]);
    montarEnRuta('/catastro/aranceles');

    const procedencia = await banda();
    // `findBy` y no `getBy`: mientras el cuadro no ha llegado, la norma es un
    // hueco de carga —no un «—», que sería afirmar que no consta—.
    expect(await procedencia.findByText('R.A. 0142')).toBeInTheDocument();
    expect(procedencia.getByText('Municipal')).toBeInTheDocument();
  });

  /**
   * **Varios documentos: se dicen todos.**
   *
   * Pintar el primero es lo cómodo y es exactamente lo que no se puede hacer: un
   * cuadro cuyas filas vienen de dos resoluciones se estaría atribuyendo entero
   * a una de las dos, y esa es la frase que acaba en el sustento de una
   * determinación.
   */
  it('varios documentos distintos se enumeran todos, y se dice cuantos son', async () => {
    elBackendResponde(ARANCELES, [
      { id: 1, viaId: 1, tramo: 'Cuadras 1 a 4', valorM2: '412.00', documentoFuente: 'R.A. 0142' },
      { id: 2, viaId: 2, tramo: 'Cuadra 5', valorM2: '388.00', documentoFuente: 'R.A. 0311' },
    ]);
    montarEnRuta('/catastro/aranceles');

    const procedencia = await banda();
    expect(await procedencia.findByText('R.A. 0142')).toBeInTheDocument();
    expect(procedencia.getByText('R.A. 0311')).toBeInTheDocument();
    expect(procedencia.getByText(/citan 2 documentos distintos/)).toBeInTheDocument();
  });

  /**
   * **Lo que la API no publica sale «—», y la banda dice por qué.**
   *
   * No hay fecha de publicación, ni las dos firmas de ADR-0007, ni estado de
   * sellado en ningún recurso ni en el contrato. Rellenarlos desde el corpus de
   * `docs/10-negocio/valores-normativos/` daría una banda que jura por un cuadro
   * que nadie ha comprobado que sea ese.
   */
  it('la fecha, las dos firmas y el sellado salen «—», y dice que no se rellenan del corpus', async () => {
    elBackendResponde(ARANCELES, [
      { id: 1, viaId: 1, tramo: 'Cuadras 1 a 4', valorM2: '412.00', documentoFuente: 'R.A. 0142' },
    ]);
    montarEnRuta('/catastro/aranceles');

    const procedencia = await banda();
    // Con el cuadro ya llegado: así los cuatro huecos son los cuatro datos que
    // nadie publica, y no el hueco de carga de la norma.
    await procedencia.findByText('R.A. 0142');
    for (const dato of ['Publicada', 'Transcribió', 'Verificó', 'Estado del conjunto']) {
      expect(procedencia.getByText(dato)).toBeInTheDocument();
    }
    // Cuatro huecos, y ni uno solo relleno.
    const huecos = procedencia.getAllByText(SIN_DATO);
    expect(huecos).toHaveLength(4);

    // Ni una fecha inventada —la de hoy es la del bloque de la regla 9, que está
    // fuera de la banda— ni un estado de sellado que nadie publica.
    const texto = (await screen.findByRole('region', { name: 'Procedencia del cuadro' }))
      .textContent;
    expect(texto).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(texto).not.toMatch(/SELLADO|ABIERTO/);
    expect(procedencia.getByText(/no se rellenan desde el corpus/)).toBeInTheDocument();
  });

  it('sin ninguna fila no se inventa una norma: el documento tambien sale «—»', async () => {
    elBackendResponde(VALORES_UNITARIOS, []);
    montarEnRuta('/catastro/valores-unitarios');

    const procedencia = await banda();
    // Cinco huecos: el documento fuente y los cuatro que nadie publica.
    await waitFor(() => expect(procedencia.getAllByText(SIN_DATO)).toHaveLength(5));
    expect(procedencia.getByText('Nacional')).toBeInTheDocument();
  });
});

/* ── 4 y 5. Las columnas salen del cuadro, y el año de construccion se ve ─ */

describe('la cabecera de la matriz se construye con lo que vino en la respuesta', () => {
  /**
   * **La rotura que este issue existe para impedir.**
   *
   * El prototipo dibuja siete partidas fijas —muros, techos, pisos, puertas,
   * revestimientos, baños, instalaciones— y el sistema publica una fila por
   * partida. Con la lista fija, un cuadro que solo trae dos partidas pinta cinco
   * columnas vacías y, en cuanto el orden de las partidas no coincida, una cifra
   * bajo la cabecera de otra: eso valoriza mal un padrón entero sin que ninguna
   * celda parezca mal.
   */
  it('solo las partidas que trajo el cuadro tienen columna; las del prototipo que no vinieron, no', async () => {
    elBackendResponde(VALORES_UNITARIOS, [
      valorUnitario('TECHOS', 'B', '320.00'),
      valorUnitario('MUROS', 'B', '450.00'),
      valorUnitario('MUROS', 'C', '300.00'),
    ]);
    montarEnRuta('/catastro/valores-unitarios');

    const tabla = await screen.findByRole('table');
    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((celda) => celda.textContent);
    // Ordenadas de forma estable —alfabéticamente—, no por orden de llegada.
    expect(cabeceras).toEqual(['Categoría', 'MUROS', 'TECHOS']);

    // Ninguna de las cinco partidas restantes del prototipo tiene columna.
    for (const ausente of [
      'Pisos',
      'Puertas y ventanas',
      'Revestimientos',
      'Baños',
      'Instalaciones eléctricas y sanitarias',
    ]) {
      expect(within(tabla).queryByRole('columnheader', { name: ausente })).not.toBeInTheDocument();
    }
  });

  it('una celda que el cuadro no trae sale «—», nunca un cero', async () => {
    elBackendResponde(VALORES_UNITARIOS, [
      valorUnitario('MUROS', 'B', '450.00'),
      valorUnitario('TECHOS', 'B', '320.00'),
      // La categoría C solo trae muros: su techo no existe en el cuadro.
      valorUnitario('MUROS', 'C', '300.00'),
    ]);
    montarEnRuta('/catastro/valores-unitarios');

    const tabla = await screen.findByRole('table');
    const fila = within(tabla).getByText('C').closest('tr');
    expect(fila).not.toBeNull();
    expect(within(fila as HTMLElement).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'C',
      '300.00',
      SIN_DATO,
    ]);
  });

  /**
   * **El año de construcción, visible.** Es la segunda dimensión que NEG-05
   * exige y que el prototipo no dibuja: colapsarla haría que el valor de una
   * edificación de 1990 y el de una de 2020 cayeran en la misma celda, y ganaría
   * el último que llegase.
   */
  it('dos tramos de año de construccion son dos matrices, cada una con su titulo', async () => {
    elBackendResponde(VALORES_UNITARIOS, [
      valorUnitario('MUROS', 'B', '450.00', 2000, 2010),
      valorUnitario('MUROS', 'B', '480.00', 2011, null),
    ]);
    montarEnRuta('/catastro/valores-unitarios');

    expect(await screen.findByText('Edificaciones de 2000 a 2010')).toBeInTheDocument();
    expect(screen.getByText('Edificaciones de 2011 a más')).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('sin cuadro sellado para el ejercicio se dice, y no se dibuja ninguna cifra', async () => {
    elBackendResponde(VALORES_UNITARIOS, []);
    montarEnRuta('/catastro/valores-unitarios');

    expect(
      await screen.findByText(new RegExp(`Sin valores unitarios sellados para ${ESTE_ANIO}`)),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('la depreciacion cruza antiguedad con los estados que vinieron', () => {
  it('las columnas son los estados de conservacion de la respuesta', async () => {
    elBackendResponde(DEPRECIACION, [
      depreciacion('LADRILLO', 'REGULAR', 5, '5.00'),
      depreciacion('LADRILLO', 'BUENO', 5, '2.00'),
      depreciacion('LADRILLO', 'BUENO', 10, '4.00'),
    ]);
    montarEnRuta('/catastro/depreciacion');

    const tabla = await screen.findByRole('table');
    expect(
      within(tabla)
        .getAllByRole('columnheader')
        .map((celda) => celda.textContent),
    ).toEqual(['Antigüedad hasta (años)', 'BUENO', 'REGULAR']);

    // Los cuatro estados del prototipo no salen si el cuadro no los trae.
    for (const ausente of ['Muy bueno %', 'Malo %']) {
      expect(within(tabla).queryByRole('columnheader', { name: ausente })).not.toBeInTheDocument();
    }
  });

  /**
   * **`materialMep` acota en el navegador y no viaja.** `material` viene en cada
   * fila, así que elegir uno es elegir entre lo recibido; el desplegable ofrece
   * los materiales del cuadro y no los cinco del prototipo, porque ofrecer
   * «QUINCHA» cuando el cuadro no la trae es ofrecer un filtro que siempre vacía
   * la tabla.
   */
  it('el desplegable de material ofrece lo que vino, acota sin volver a pedir y no viaja', async () => {
    const usuario = userEvent.setup();
    elBackendResponde(DEPRECIACION, [
      depreciacion('LADRILLO', 'BUENO', 5, '2.00'),
      depreciacion('ADOBE', 'BUENO', 5, '4.00'),
    ]);
    montarEnRuta('/catastro/depreciacion');

    const desplegable = await screen.findByLabelText('Material (MEP)');
    expect(within(desplegable).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todos',
      'ADOBE',
      'LADRILLO',
    ]);
    expect(screen.getAllByRole('table')).toHaveLength(2);

    const antes = alaRuta(DEPRECIACION).length;
    await usuario.selectOptions(desplegable, 'ADOBE');

    await waitFor(() => expect(screen.getAllByRole('table')).toHaveLength(1));
    expect(screen.getByText('ADOBE', { selector: '.sgtm-tarjeta__titulo' })).toBeInTheDocument();
    // Ni una petición más: acota lo que ya llegó.
    expect(alaRuta(DEPRECIACION)).toHaveLength(antes);
    expect(peticiones.some((u) => u.includes('materialMep'))).toBe(false);
  });
});

/* ── 6. Los filtros que no viajan ──────────────────────────────────────── */

describe('los filtros que ninguna respuesta puede responder se ven y no se mandan', () => {
  it('«Región» se dibuja bloqueada, con su motivo', async () => {
    elBackendResponde(VALORES_UNITARIOS, []);
    montarEnRuta('/catastro/valores-unitarios');

    const filtro = await screen.findByLabelText('Región');
    expect(filtro).toBeDisabled();
    expect(screen.getByText(/La región no se puede filtrar/)).toBeInTheDocument();
  });

  it('«Uso» se dibuja bloqueado, y manda a acotar por material', async () => {
    elBackendResponde(DEPRECIACION, []);
    montarEnRuta('/catastro/depreciacion');

    const filtro = await screen.findByLabelText('Uso');
    expect(filtro).toBeDisabled();
    expect(screen.getByText(/El uso no se puede filtrar/)).toBeInTheDocument();
  });

  /**
   * El control bloqueado cubre el camino barato —quien teclea—. El caro es el
   * enlace compartido: el montaje lee la URL directamente, sin pasar por ningún
   * formulario. Es el mismo agujero que `consulta_fichas` cierra para
   * `conciliadaConRentas`.
   */
  it.each([
    { ruta: '/catastro/valores-unitarios?region=SIERRA', pedida: VALORES_UNITARIOS, filtro: 'region' },
    { ruta: '/catastro/depreciacion?uso=INDUSTRIA', pedida: DEPRECIACION, filtro: 'uso' },
  ])('un enlace con «$filtro» puesto no lo lleva a la peticion', async ({ ruta, pedida, filtro }) => {
    elBackendResponde(pedida, []);
    montarEnRuta(ruta);

    await screen.findByRole('region', { name: 'Procedencia del cuadro' });
    await waitFor(() => expect(alaRuta(pedida).length).toBeGreaterThan(0));
    expect(alaRuta(pedida).some((u) => u.includes(filtro))).toBe(false);
  });

  /**
   * **La brecha de `aranceles` no se disimula.** `ArancelController` tampoco
   * recibe «Vía» ni «Zona» —solo `anio`—, pero el contrato sí los declara y esta
   * propuesta no cierra esa brecha: es la misma que #70 aceptó para `accesos`, y
   * fingir que la interfaz los aplica sería peor que dejarlos sin efecto.
   */
  it('los filtros de aranceles siguen viajando, como hasta hoy', async () => {
    montarEnRuta('/catastro/aranceles?via=0142&zona=Zona%201');

    await screen.findByRole('tab', { name: HOJA_DE_ARANCELES });
    await waitFor(() => expect(alaRuta(ARANCELES).length).toBeGreaterThan(0));
    expect(alaRuta(ARANCELES)[0]).toContain('via=0142');
    expect(screen.getByLabelText('Vía')).toBeEnabled();
  });
});

/* ── 7. Los dos botones que no podian guardar ──────────────────────────── */

describe('no hay «Importar tabla del año» ni «Guardar»', () => {
  it.each([
    { ruta: '/catastro/aranceles' },
    { ruta: '/catastro/valores-unitarios' },
    { ruta: '/catastro/depreciacion' },
  ])('$ruta no dibuja ninguna barra de acciones', async ({ ruta }) => {
    montarEnRuta(ruta);

    await screen.findByRole('tablist', { name: 'Hojas del cuadro de valuación' });
    expect(document.querySelector('.sgtm-acciones')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Importar tabla del año' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });
});

/* ── 8. Los aranceles, con las mismas columnas y los mismos huecos ─────── */

describe('la hoja de aranceles conserva las columnas del catalogo', () => {
  it('las seis del prototipo, con el id de la via y los huecos que el recurso no publica', async () => {
    montarEnRuta('/catastro/aranceles');

    const fila = (await screen.findByText('386.40')).closest('tr');
    expect(fila).not.toBeNull();
    expect(within(fila as HTMLElement).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '2',
      '7',
      SIN_DATO,
      SIN_DATO,
      '386.40',
      // La variación contra el año anterior no la publica el recurso, y
      // calcularla aquí sería componer una cifra de valuación (RNF-083).
      SIN_DATO,
    ]);
  });
});

/* ── Lo que agrupa, sin montar nada ────────────────────────────────────── */

describe('agruparPorTramo cruza categoria y partida dentro de cada tramo', () => {
  it('separa dos tramos de año de construccion, cada uno con sus propias partidas', () => {
    const tramos = agruparPorTramo([
      valorUnitario('MUROS', 'B', '450.00', 2000, 2010),
      valorUnitario('TECHOS', 'B', '320.00', 2000, 2010),
      valorUnitario('MUROS', 'B', '480.00', 2011, null),
    ]);

    expect(tramos).toHaveLength(2);
    expect(tramos[0]).toMatchObject({
      desde: 2000,
      hasta: 2010,
      categorias: ['B'],
      partidas: ['MUROS', 'TECHOS'],
    });
    expect(tramos[0]?.valores['B·MUROS']).toBe('450.00');
    // Una partida sin fila para esa categoria no tiene entrada: la pantalla la
    // dibuja como «—», no como «0.00».
    expect(tramos[0]?.valores['B·PISOS']).toBeUndefined();

    // El segundo tramo **solo** trae muros: no hereda la columna del primero.
    expect(tramos[1]).toMatchObject({ desde: 2011, partidas: ['MUROS'] });
    expect(tramos[1]?.hasta).toBeUndefined();
  });

  it('un arreglo vacio no produce ningun tramo', () => {
    expect(agruparPorTramo([])).toEqual([]);
  });
});

describe('agruparPorMaterial cruza antiguedad y estado dentro de cada material', () => {
  it('separa dos materiales, cada uno con los estados que trajo', () => {
    const grupos = agruparPorMaterial([
      depreciacion('NOBLE', 'BUENO', 5, '2.00'),
      depreciacion('NOBLE', 'REGULAR', 5, '5.00'),
      depreciacion('RUSTICO', 'BUENO', 20, '4.00'),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toMatchObject({
      material: 'NOBLE',
      tramos: [5],
      estados: ['BUENO', 'REGULAR'],
    });
    expect(grupos[0]?.valores['5·BUENO']).toBe('2.00');
    expect(grupos[1]).toMatchObject({ material: 'RUSTICO', tramos: [20], estados: ['BUENO'] });
  });

  it('los tramos de antiguedad salen ordenados de menor a mayor', () => {
    const [grupo] = agruparPorMaterial([
      depreciacion('NOBLE', 'BUENO', 20, '10.00'),
      depreciacion('NOBLE', 'BUENO', 5, '2.00'),
    ]);

    expect(grupo?.tramos).toEqual([5, 20]);
  });
});

describe('documentosFuente no elige uno: los devuelve todos, sin repetir', () => {
  it('dos filas con el mismo documento dan uno; con documentos distintos, los dos', () => {
    expect(documentosFuente([{ documentoFuente: 'A' }, { documentoFuente: 'A' }])).toEqual(['A']);
    expect(documentosFuente([{ documentoFuente: 'B' }, { documentoFuente: 'A' }])).toEqual([
      'A',
      'B',
    ]);
  });

  it('una fila sin documento no aporta ninguno: no se inventa una norma', () => {
    expect(documentosFuente([{ documentoFuente: null }, { documentoFuente: '  ' }, {}])).toEqual(
      [],
    );
  });
});
