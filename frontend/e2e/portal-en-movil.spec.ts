import { devices, expect, test } from '@playwright/test';

/**
 * La consulta del portal, en un movil de 360 px (FRO-03 §6).
 *
 * El contribuyente entra desde su telefono o no entra: es el unico flujo del
 * sistema que no usa alguien de la municipalidad. Lo que se comprueba es que
 * quepa —que no haya que desplazarse en horizontal para leer una deuda— y que
 * el camino entero se recorra: elegir el documento, teclearlo, consultar, y ver
 * la cifra **con su fecha**.
 *
 * ── Contra `apps/portal`, no contra el back-office (#298, ADR-0016 §3) ─────
 *
 * Hasta #298 esta prueba abria `/inicio/portal`, que es la opcion del catalogo
 * dibujada dentro del shell: barra lateral, cabecera y las 134 opciones detras.
 * Esa opcion **sigue existiendo** —es la vista del funcionario y conserva su
 * cobertura en `todas-las-pantallas.test.tsx`—, pero lo que el ciudadano
 * descarga ya no es eso: es su propia aplicacion, servida en `/portal/` del
 * mismo origen, y es la que hay que recorrer. Su servidor de vista previa es el
 * segundo de `playwright.config.ts`.
 */
const PORTAL = 'http://localhost:4174/portal/';

/** La primera persona del padron del prototipo, la misma con la que se prueba la ficha. */
const DNI = '03593174';

test.use({ ...devices['Pixel 5'], viewport: { width: 360, height: 740 } });

/**
 * Nada se sale de la pantalla: desplazarse en horizontal para leer es no poder
 * leer.
 *
 * **Se compara contra el ancho del dispositivo, no contra `window.innerWidth`**,
 * y ahi estaba el defecto: con emulacion movil —`devices['Pixel 5']`, que es la
 * que hace que esta prueba mida un telefono— Chromium **aleja la pagina** cuando
 * el contenido desborda, y `innerWidth` crece hasta el ancho del contenido. Las
 * dos cifras acaban siendo la misma y la comprobacion pasa siempre. Se midio:
 * con `min-width: 900px` en la columna del portal, la sonda devolvio
 * `{sw: 900, iw: 900}` y la version anterior de esta prueba seguia en verde.
 */
async function cabeEnLaPantalla(pagina: import('@playwright/test').Page): Promise<boolean> {
  const ancho = pagina.viewportSize()?.width ?? 0;
  const contenido = await pagina.evaluate(() => document.documentElement.scrollWidth);
  return ancho > 0 && contenido <= ancho + 1;
}

test('el portal se consulta entero en un viewport de 360 px', async ({ page }) => {
  await page.goto(PORTAL);

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // El punto de referencia de la pagina, en el navegador de verdad: sin `main`
  // no hay a donde saltar desde la cabecera.
  await expect(page.getByRole('main')).toBeVisible();
  // Lo que la pantalla dice antes de que nadie teclee: de aqui no sale un pago.
  await expect(page.getByText('Aquí solo se consulta')).toBeVisible();
  expect(await cabeEnLaPantalla(page)).toBe(true);

  // El camino del ciudadano: elige su documento, lo teclea y consulta.
  await page.getByLabel('Tipo de documento').selectOption('DNI');
  await page.getByLabel('Número de documento').fill(DNI);
  await page.getByRole('button', { name: 'Consultar' }).click();

  // Quien es, y lo que debe: la cifra **con su fecha** (regla 9, RNF-075).
  await expect(page.getByRole('heading', { name: 'SUC. RUFINA MEDINA MEDINA' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lo que debes' })).toBeVisible();
  await expect(page.getByText(/Cifras actualizadas al/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Deudas Pendientes' })).toBeVisible();

  // Y con la deuda entera dibujada tampoco se sale: es donde se salia, porque
  // la rejilla del back-office tiene siete columnas.
  expect(await cabeEnLaPantalla(page)).toBe(true);
});

test('el ciudadano no descarga el catalogo de navegacion', async ({ page }) => {
  const pedidos: string[] = [];
  page.on('request', (peticion) => pedidos.push(peticion.url()));

  await page.goto(PORTAL);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  /* Los doce trozos del catalogo llevan «.generado» en el nombre del archivo
     (`comprobar-compilaciones` cuenta con ello). Ninguno se pide aqui: el
     portal no tiene modulos que navegar (ADR-0016 §3). Y ni barra lateral, ni
     paleta de comandos, ni lanzador. */
  expect(pedidos.filter((url) => url.includes('.generado'))).toEqual([]);
  await expect(page.locator('.sgtm-barra-lateral')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
});
