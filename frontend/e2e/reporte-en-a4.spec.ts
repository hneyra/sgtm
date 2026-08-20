import { expect, test } from '@playwright/test';

/**
 * La impresion de un reporte, en A4 vertical (RNF-084).
 *
 * El reporte sale de la municipalidad, se firma y se archiva. Si al imprimir se
 * parte en dos hojas o se cuelan los botones de la interfaz, el documento no
 * sirve: hay que volver a hacerlo.
 */

/** A4 vertical a 96 ppp: 210 x 297 mm. */
const A4 = { ancho: 794, alto: 1123 };

test('la hoja cabe en una A4, conserva las firmas y no imprime la interfaz', async ({ page }) => {
  await page.goto('/consultas/constancia');

  // La ventana pasa a medir lo que mide la hoja: es la unica forma de preguntar
  // «cuanto ocupa esto impreso» sin imprimirlo de verdad.
  await page.setViewportSize({ width: A4.ancho, height: A4.alto });
  await page.emulateMedia({ media: 'print' });

  const hoja = page.locator('[data-hoja="1"]');
  await expect(hoja).toBeVisible();

  const caja = await hoja.boundingBox();
  expect(caja).not.toBeNull();
  if (caja === null) return;
  expect(caja.width).toBeLessThanOrEqual(A4.ancho);
  expect(caja.height).toBeLessThanOrEqual(A4.alto);

  // Las dos lineas de firma son lo que convierte la hoja en un documento. Se
  // buscan **dentro del pie de firmas** y no en la hoja entera: «Contribuyente»
  // es tambien una de las claves de la cabecera del reporte, y buscarlo suelto
  // acertaba solo mientras los datos no hubieran llegado todavia.
  const firmas = page.locator('.sgtm-hoja__firmas');
  await expect(firmas.getByText('Cajero / Responsable')).toBeVisible();
  await expect(firmas.getByText('Contribuyente', { exact: true })).toBeVisible();

  // Y la interfaz no se imprime: ni la barra lateral, ni la cabecera, ni los
  // botones de la hoja. Se comprueba que **hay** algo marcado antes de exigir
  // que este oculto: si no hubiera, esto pasaria sin comprobar nada.
  const marcados = page.locator('[data-no-imprimible]');
  expect(await marcados.count()).toBeGreaterThan(0);
  for (let i = 0; i < (await marcados.count()); i++) {
    await expect(marcados.nth(i)).toBeHidden();
  }
  await expect(page.locator('.sgtm-nav')).toBeHidden();
  // Los botones de la hoja son el caso que importa: estan **dentro** del
  // documento, y sin la regla se imprimirian junto a las firmas.
  await expect(page.locator('.sgtm-hoja__botones')).toBeHidden();
});
