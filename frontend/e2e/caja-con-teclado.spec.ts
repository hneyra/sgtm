import { expect, test } from '@playwright/test';

/**
 * El cobro en caja, **sin tocar el raton** (RNF-082).
 *
 * En ventanilla el raton no se usa: se cobra con el teclado, y cada paso que
 * exige un clic es una cola que se para. Esta prueba no mueve el puntero ni una
 * vez —solo escribe y pulsa teclas—, asi que si algun paso solo se puede hacer
 * con el raton, falla.
 */
test('de la paleta de comandos al cobro, solo con el teclado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // La paleta de comandos es el camino rapido de quien atiende: Ctrl K.
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.type('caja tributaria');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Caja/i);

  // La observacion es la condicion de guardado (regla 10, RNF-052), y se llega
  // a ella tabulando.
  const observacion = page.getByRole('textbox', { name: 'Observación' });
  await expect(observacion).toBeVisible();
  await observacion.focus();
  await page.keyboard.type('Cobro en ventanilla, caja 3.');

  // La accion primaria se alcanza con el teclado y se dispara con Enter.
  const cobrar = page.getByRole('button', { name: /Cobrar|Registrar|Guardar/i }).last();
  await expect(cobrar).toBeEnabled();
  await cobrar.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText(/Guardado, con tu observación/)).toBeVisible();
});

test('sin observacion, el teclado no consigue cobrar', async ({ page }) => {
  await page.goto('/tesoreria/caja-tributaria');
  const cobrar = page.getByRole('button', { name: /Cobrar|Registrar|Guardar/i }).last();
  await expect(cobrar).toBeDisabled();
});
