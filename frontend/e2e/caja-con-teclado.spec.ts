import { expect, test } from '@playwright/test';

/**
 * Un acto de ventanilla, **sin tocar el raton** (RNF-082).
 *
 * En ventanilla el raton no se usa: se atiende con el teclado, y cada paso que
 * exige un clic es una cola que se para. Esta prueba no mueve el puntero ni una
 * vez —solo escribe y pulsa teclas—, asi que si algun paso solo se puede hacer
 * con el raton, falla.
 *
 * **Se recorre «Alta de deuda» y ya no la caja, y no es un cambio de comodidad**
 * (#332): `caja_tasas` y `caja_tributaria` no declaran todavia que campos suyos
 * acepta el backend, asi que su accion primaria ya no se habilita —mandaba solo
 * la observacion, que para un cobro no es cobrar—. El segundo caso comprueba
 * justamente eso: que la caja lo dice en vez de ofrecer un boton que promete.
 */
test('de la paleta de comandos al acto, solo con el teclado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // La paleta de comandos es el camino rapido de quien atiende: Ctrl K.
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.type('alta de deuda');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Alta de deuda/i);

  // La observacion es la condicion de guardado (regla 10, RNF-052), y se llega
  // a ella tabulando.
  const observacion = page.getByRole('textbox', { name: 'Observación' });
  await expect(observacion).toBeVisible();
  await observacion.focus();
  await page.keyboard.type('Determinación de fiscalización.');

  // La accion primaria se alcanza con el teclado y se dispara con Enter.
  const guardar = page.getByRole('button', { name: 'Dar de alta', exact: true });
  await expect(guardar).toBeEnabled();
  await guardar.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText(/Guardado, con tu observación/)).toBeVisible();
});

test('la caja dice por que todavia no puede cobrar, en vez de prometerlo', async ({ page }) => {
  await page.goto('/tesoreria/caja-tributaria');
  const cobrar = page.getByRole('button', { name: /Cobrar/i }).last();
  await expect(cobrar).toBeDisabled();

  // Y el motivo se **ve**: un `title` sobre un boton `disabled` no existe ni
  // para el teclado ni para el lector de pantalla (FRO-04 §6).
  await expect(page.getByText(/todavía no puede guardar/i)).toBeVisible();
  // Sin escritura declarada no hay ni caja de observacion: no hay a donde escribir.
  await expect(page.getByRole('textbox', { name: 'Observación' })).toHaveCount(0);
});
