import { expect, test } from '@playwright/test';

/**
 * **Los artboards de rentas, cotejados contra la interfaz que se construyo**
 * (#442, #445).
 *
 * `FRO-05` remite a `design/propuestas/`, asi que esos artboards **se leen como
 * especificacion**. #413 lo aprendio a base de encontrar cinco divergencias en
 * los de catastro —una hoja que abria en otra pestaña, un «Guardar» navy sobre
 * una pantalla que no puede guardar, una tabla dibujada con la mitad de sus
 * columnas—, todas hacia lo que el producto **si** hace: el codigo tenia razon
 * en las cinco.
 *
 * Esta prueba cierra ese hueco por delante en vez de por detras. Lo que afirma
 * cada constante de abajo esta dibujado en un artboard concreto, y se comprueba
 * contra el navegador de verdad. Si alguien cambia el producto, se pone roja; si
 * alguien cambia el artboard sin cambiar el producto, tambien.
 *
 * **Solo cubre lo implementado.** Las dos superficies que a #442 le faltan
 * —transferencias y emision del ejercicio— siguen siendo propuesta, y sus
 * artboards lo dicen: cotejarlas aqui seria exigirle al producto algo que nadie
 * ha construido todavia.
 */

/* ── Lo que dibuja `design/propuestas/rentas-superficies/PropuestaC.dc.html` ── */

/** El titulo de la superficie, sobre la tira de hojas. */
const SUPERFICIE = 'Movimientos de deuda';
/** Sus dos hojas, con el rotulo del catalogo (RNF-080). */
const HOJA_DE_ALTA = 'Alta de deuda';
const HOJA_DE_BAJA = 'Baja de deuda';
/** Las dos primarias, que en esta superficie escriben las dos. */
const PRIMARIA_DEL_ALTA = 'Dar de alta';
const PRIMARIA_DE_LA_BAJA = 'Dar de baja';
/** Y sus secundarias, que enseñan antes de escribir. */
const SECUNDARIA_DEL_ALTA = 'Validar';
const SECUNDARIA_DE_LA_BAJA = 'Previsualizar';

/* ── Lo que dibuja `design/propuestas/rentas-superficies/Anatomia.dc.html` ──
   La tabla «Las tres que si son el mismo caso que las fichas de catastro»: lo
   que queda de cada barra despues de la regla del vocabulario uniforme. */
const BARRAS_DEL_PADRON: readonly {
  readonly ruta: string;
  readonly quedan: readonly string[];
  readonly conAlta?: true;
}[] =
  [
    /* **«Nuevo» vuelve al padrón con #503 F7**, y no es una excepción a la
       espina: la regla siempre fue que se queda si la pantalla declara el
       formulario que abre. Cuando se midió esto, ninguna de las tres lo
       declaraba; ahora `contribuyentes` sí, y ese botón abre el panel de alta.
       Sigue **sin ser la primaria**: el padrón es una consulta. */
    { ruta: '/rentas-registro/contribuyentes', quedan: ['Nuevo', 'Imprimir'], conAlta: true },
    { ruta: '/rentas-registro/predios-rentas', quedan: ['Ver ficha catastral'] },
    { ruta: '/rentas-registro/vehiculos', quedan: ['Excel', 'Imprimir'] },
  ];

/** Y los botones que la regla se lleva, que es de lo que trata el artboard. */
const LOS_QUE_NO_SON_ACTOS = ['Modificar', 'Guardar'];

test('la superficie de los movimientos de deuda es la del artboard', async ({ page }) => {
  await page.goto('/rentas-registro/baja-deuda?codContribuyente=00000006550');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(HOJA_DE_BAJA);
  await page.waitForLoadState('networkidle');

  /* ── 1. La tira: el objeto arriba, sus dos caras debajo ────────────────── */
  await expect(page.locator('.sgtm-superficie__titulo')).toHaveText(SUPERFICIE);
  const tira = page.getByRole('tablist', { name: `Hojas de ${SUPERFICIE}` });
  await expect(tira).toBeVisible();
  await expect(tira.getByRole('tab')).toHaveText([HOJA_DE_ALTA, HOJA_DE_BAJA]);
  await expect(tira.getByRole('tab', { name: HOJA_DE_BAJA })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  /* ── 2. La hoja de la baja: la rejilla, su sustento y su primaria ──────── */
  await expect(page.locator('.sgtm-tabla')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Observación del usuario' })).toBeVisible();
  const barra = page.locator('.sgtm-acciones');
  await expect(barra.getByRole('button', { name: SECUNDARIA_DE_LA_BAJA })).toBeVisible();
  await expect(barra.locator('.sgtm-boton--primario')).toContainText(PRIMARIA_DE_LA_BAJA);

  /* ── 3. Cambiar de hoja **navega**, y se lleva el contribuyente ─────────
     Es la mitad del artboard que no se ve en una captura: el enlace de lo que se
     esta mirando se puede compartir, y el sujeto no se vuelve a teclear. */
  await tira.getByRole('tab', { name: HOJA_DE_ALTA }).click();
  await expect(page).toHaveURL(/\/rentas-registro\/alta-deuda\?codContribuyente=00000006550$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(HOJA_DE_ALTA);

  /* ── 4. Y la otra hoja tiene su acto, tambien de verdad ────────────────── */
  await page.waitForLoadState('networkidle');
  const barraDelAlta = page.locator('.sgtm-acciones');
  await expect(barraDelAlta.getByRole('button', { name: SECUNDARIA_DEL_ALTA })).toBeVisible();
  await expect(barraDelAlta.locator('.sgtm-boton--primario')).toContainText(PRIMARIA_DEL_ALTA);
});

test('las tres barras del padrón son las de la espina', async ({ page }) => {
  for (const { ruta, quedan, conAlta } of BARRAS_DEL_PADRON) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');

    const barra = page.locator('.sgtm-acciones');
    await expect(barra).toBeVisible();
    await expect(barra.getByRole('button')).toHaveText([...quedan]);

    /* **Y ninguna es la primaria**: las tres son lecturas, asi que ninguna de
       sus acciones escribe y ninguna se dibuja navy. Es lo que el artboard
       enseña tachado. */
    /* Con alta declarada, la primaria es **el botón que la abre** —el padrón no
       escribe, y `altaEsElActo` dice que entonces el acto es abrir el alta—; sin
       ella, ninguna es primaria: las dos restantes son lecturas y ninguna de sus
       acciones escribe. Es lo que el artboard enseña tachado. */
    await expect(barra.locator('.sgtm-boton--primario')).toHaveCount(conAlta === true ? 1 : 0);
    for (const rotulo of LOS_QUE_NO_SON_ACTOS) {
      await expect(barra.getByRole('button', { name: rotulo, exact: true })).toHaveCount(0);
    }
    if (conAlta !== true) {
      await expect(barra.getByRole('button', { name: 'Nuevo', exact: true })).toHaveCount(0);
    }
  }
});
