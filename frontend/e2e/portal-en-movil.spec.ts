import { devices, expect, test } from '@playwright/test';

/**
 * La consulta del portal, en un movil de 360 px (FRO-03 §6).
 *
 * El contribuyente entra desde su telefono o no entra: es el unico flujo del
 * sistema que no usa alguien de la municipalidad. Lo que se comprueba es que
 * quepa —que no haya que desplazarse en horizontal para leer— y que los pasos
 * se vean.
 */
test.use({ ...devices['Pixel 5'], viewport: { width: 360, height: 740 } });

test('el portal se completa en un viewport de 360 px', async ({ page }) => {
  await page.goto('/inicio/portal');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Nada se sale de la pantalla: desplazarse en horizontal para leer una deuda
  // es no poder consultarla.
  const ancho = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(ancho).toBe(true);

  // Los pasos del flujo publico estan a la vista.
  await expect(page.locator('.sgtm-portal, .sgtm-pasos').first()).toBeVisible();
});
