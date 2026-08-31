import { devices, expect, test } from '@playwright/test';

/**
 * La situacion del contribuyente, en un movil de 360 px (FRO-03 §6, ADR-0020).
 *
 * El contribuyente entra desde su telefono o no entra: es el unico flujo del
 * sistema que no usa alguien de la municipalidad. Lo que se comprueba es que
 * quepa —que no haya que desplazarse en horizontal para leer una deuda— y que
 * lo que hay dentro sea lo que #57 promete: **las municipalidades donde figura,
 * cada una con su codigo y su deuda, y un total con su fecha**.
 *
 * ── Lo que ya no se recorre, y es la mitad del cambio (#57) ────────────────
 *
 * La caja de documento. Hasta ADR-0020 esta prueba elegia el tipo, tecleaba
 * ocho digitos y pulsaba «Consultar»: era el camino de un endpoint que contesta
 * por cualquiera a quien los teclee. Ahora el sujeto llega firmado en el token y
 * aqui no hay nada que escribir; contra el proxy de datos —que no autentica— la
 * pantalla se dibuja igual, con la situacion que el proxy compone.
 *
 * ── Contra `apps/portal`, no contra el back-office (#298, ADR-0016 §3) ─────
 *
 * Lo que el ciudadano descarga es su propia aplicacion, servida en `/portal/`
 * del mismo origen. Su servidor de vista previa es el segundo de
 * `playwright.config.ts`.
 */
const PORTAL = 'http://localhost:4174/portal/';

/** Las dos municipalidades que el proxy compone: la del manual y la del piloto. */
const SULLANA = 'MUNICIPALIDAD PROVINCIAL DE SULLANA';
const CATACAOS = 'MUNICIPALIDAD DISTRITAL DE CATACAOS';

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

test('el ciudadano ve sus dos municipalidades en un viewport de 360 px', async ({ page }) => {
  await page.goto(PORTAL);

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // El punto de referencia de la pagina, en el navegador de verdad: sin `main`
  // no hay a donde saltar desde la cabecera.
  await expect(page.getByRole('main')).toBeVisible();
  // Lo que la pantalla dice antes de nada: de aqui no sale un pago.
  await expect(page.getByText('Aquí solo se consulta')).toBeVisible();

  // **Y no hay documento que teclear**: es lo que ADR-0020 retira.
  await expect(page.getByLabel('Número de documento')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Consultar' })).toHaveCount(0);

  // El total de todo, sumado por el servidor y **con su fecha** (regla 9, RNF-075).
  await expect(page.getByRole('heading', { name: 'Lo que debes en total' })).toBeVisible();
  await expect(page.getByText(/Cifras actualizadas al/).first()).toBeVisible();

  // Las dos municipalidades donde figura, cada una con lo suyo.
  await expect(page.getByRole('heading', { name: SULLANA })).toBeVisible();
  await expect(page.getByRole('heading', { name: CATACAOS })).toBeVisible();
  const sullana = page.getByRole('heading', { name: SULLANA }).locator('..');
  await expect(sullana.getByText('Tu código de contribuyente')).toBeVisible();
  await expect(sullana.getByText('Deuda S/')).toBeVisible();

  // Y con las dos dibujadas enteras tampoco se sale: es donde se salia, porque
  // la rejilla del back-office tiene siete columnas.
  expect(await cabeEnLaPantalla(page)).toBe(true);
});

test('el ciudadano no descarga el catalogo, y no manda ningun documento', async ({ page }) => {
  const pedidos: string[] = [];
  page.on('request', (peticion) => pedidos.push(peticion.url()));

  await page.goto(PORTAL);
  await expect(page.getByRole('heading', { name: SULLANA })).toBeVisible();

  /* **Ni un documento en la URL** (#57, ADR-0020) — y aqui se comprueba solo la
     mitad que el navegador puede ver.

     Contra la vista previa, el proxy de datos **sustituye `globalThis.fetch`**
     (ADR-0010), asi que las peticiones a la API no llegan a salir a la red y
     `page.on('request')` no las ve: exigir aqui que ninguna lleve `?doc=` seria
     una comprobacion que pasa por vacia. Lo que si se ve, y es lo que se exige,
     es que **ninguna peticion de red lleve un documento** —ni la del paquete, ni
     la de un recurso—, que es lo que quedaria si alguien devolviera la caja y
     construyera la URL a mano.

     La comprobacion de verdad esta donde puede hacerse: el escaner de fuentes
     (`verificaciones/portal-separado.test.ts`, «no manda ningun documento como
     parametro») y la pantalla montada (`portal.test.tsx`, «pregunta **una**
     ruta, sin un solo parametro»), que intercepta el `fetch` de dentro. */
  for (const url of pedidos) {
    expect(url, `la peticion ${url} lleva un documento`).not.toMatch(
      /[?&](doc|dni|dNI|ruc|rUC|numeroDocumento)=/i,
    );
  }

  /* Los doce trozos del catalogo llevan «.generado» en el nombre del archivo
     (`comprobar-compilaciones` cuenta con ello). Ninguno se pide aqui: el
     portal no tiene modulos que navegar (ADR-0016 §3). Y ni barra lateral, ni
     paleta de comandos, ni lanzador. */
  expect(pedidos.filter((url) => url.includes('.generado'))).toEqual([]);
  // `.sgtm-nav` es la clase real de la barra (`BarraLateral.tsx`): la primera
  // version buscaba `.sgtm-barra-lateral`, que no existe en el producto, asi
  // que la asercion resolvia a 0 incluso contra el back-office con su barra
  // dibujada — una comprobacion que no podia fallar.
  await expect(page.locator('.sgtm-nav')).toHaveCount(0);
  // Y el riel de modulos, que desde #498 es la otra mitad del shell del
  // back-office: mirar solo `.sgtm-nav` dejaria pasar un shell a medias.
  await expect(page.locator('.sgtm-modulos')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
});
