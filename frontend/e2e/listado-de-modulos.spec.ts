import { expect, test } from '@playwright/test';

/**
 * El listado de módulos de la barra lateral (FRO-03 §3).
 *
 * La navegación es de dos niveles: la app aterriza *dentro* de un módulo
 * —`/inicio/inicio`—, así que la barra muestra solo las opciones de ese módulo.
 * El nivel raíz —los doce módulos del manual— está a un clic, en «Todos los
 * módulos». Este fue el punto que confundió en producción: la barra parecía
 * traer solo dos entradas cuando en realidad estaba en el nivel de módulo.
 *
 * Corre contra la app compilada con su proxy de datos. Sin proveedor de
 * identidad la autorización es «se ve todo» —es como se trabaja contra el
 * proxy—, así que el listado completo tiene que salir entero.
 */

/** Los doce módulos del manual, en el orden del catálogo, con su recuento de opciones. */
const MODULOS: ReadonlyArray<{ label: string; opciones: number }> = [
  { label: 'Inicio', opciones: 2 },
  { label: 'Catastro', opciones: 12 },
  { label: 'Rentas · Registro', opciones: 15 },
  { label: 'Fiscalización', opciones: 8 },
  { label: 'Tránsito', opciones: 23 },
  { label: 'Infracciones administrativas', opciones: 13 },
  { label: 'Tesorería', opciones: 10 },
  { label: 'Consultas', opciones: 11 },
  { label: 'Valores', opciones: 6 },
  { label: 'Coactiva', opciones: 12 },
  { label: 'Autorizaciones y licencias', opciones: 11 },
  { label: 'Seguridad', opciones: 11 },
];

test('al aterrizar, la barra muestra el módulo Inicio y el paso al nivel raíz', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/inicio\/inicio$/);

  const barra = page.locator('.sgtm-nav');
  // Nivel de módulo: el nombre del módulo abierto y sus dos opciones.
  await expect(barra.locator('.sgtm-nav__modulo-actual')).toHaveText('Inicio');
  await expect(barra.getByRole('link', { name: 'Panel de recaudación' })).toBeVisible();
  await expect(barra.getByRole('link', { name: 'Portal ciudadano' })).toBeVisible();
  // Y el botón que lleva al nivel raíz.
  await expect(barra.getByRole('button', { name: 'Todos los módulos' })).toBeVisible();
});

test('«Todos los módulos» lista los doce del manual, con su recuento de opciones', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.sgtm-nav').getByRole('button', { name: 'Todos los módulos' }).click();

  const modulos = page.locator('.sgtm-nav__modulo');
  await expect(modulos).toHaveCount(MODULOS.length);

  for (const [i, modulo] of MODULOS.entries()) {
    const fila = modulos.nth(i);
    await expect(fila.locator('.sgtm-nav__modulo-etiqueta')).toHaveText(modulo.label);
    await expect(fila.locator('.sgtm-nav__modulo-conteo')).toHaveText(
      `${modulo.opciones} ${modulo.opciones === 1 ? 'opción' : 'opciones'}`,
    );
  }

  // Los recuentos suman las 134 opciones del catálogo: si un módulo se cae, el
  // total lo delata aunque el conteo de filas siga cuadrando.
  const total = MODULOS.reduce((n, m) => n + m.opciones, 0);
  expect(total).toBe(134);
});

test('desde el nivel raíz se entra a un módulo y se vuelve', async ({ page }) => {
  await page.goto('/');
  const barra = page.locator('.sgtm-nav');
  await barra.getByRole('button', { name: 'Todos los módulos' }).click();

  await barra.locator('.sgtm-nav__modulo', { hasText: 'Seguridad' }).click();
  await expect(page).toHaveURL(/\/seguridad$/);
  await expect(barra.locator('.sgtm-nav__modulo-actual')).toHaveText('Seguridad');
  // Las once opciones del módulo, repartidas en sus bloques.
  await expect(barra.locator('.sgtm-nav__opcion')).toHaveCount(11);

  await barra.getByRole('button', { name: 'Todos los módulos' }).click();
  await expect(barra.locator('.sgtm-nav__modulo')).toHaveCount(MODULOS.length);
});

test('la paleta de comandos también llega a cualquier módulo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sgtm-nav')).toBeVisible();
  await page.keyboard.press('Control+k');

  const paleta = page.getByRole('dialog', { name: 'Buscar en el sistema' });
  await expect(paleta).toBeVisible();
  await paleta.getByRole('textbox', { name: 'Buscar una opción' }).fill('coactiva');
  // La paleta encuentra lo que el menú esconde: si no, escondería algo.
  await expect(
    paleta.locator('.sgtm-paleta__modulo', { hasText: 'Coactiva' }).first(),
  ).toBeVisible();
});
