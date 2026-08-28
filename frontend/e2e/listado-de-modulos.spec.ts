import { expect, test } from '@playwright/test';

/**
 * El listado de módulos de la barra lateral (FRO-03 §3).
 *
 * La navegación es de dos niveles. **Desde #296 la app ya no aterriza dentro de
 * un módulo**: `/` es la pregunta de a quién se atiende (ADR-0016 §1), que no
 * pertenece a ninguno, así que la barra arranca en el nivel raíz con los doce
 * del manual. El nivel de módulo es donde deja a quien entra en uno, y de ahí se
 * vuelve con «Todos los módulos». Lo que confundió en producción era lo
 * contrario —la barra parecía traer solo dos entradas cuando estaba en el nivel
 * de módulo—, y por eso los dos niveles se siguen recorriendo aquí.
 *
 * **El panel de recaudación no desapareció**: dejó de ser la portada y sigue
 * siendo la opción que siempre fue, dentro de Inicio. El primer caso lo abre.
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

test('al aterrizar, la barra está en el nivel raíz; el módulo Inicio está a un clic', async ({
  page,
}) => {
  await page.goto('/');
  // La portada ya no redirige a ninguna opción: es la pregunta (#296).
  await expect(page).toHaveURL(/localhost:4173\/$/);
  await expect(page.getByRole('heading', { name: '¿A quién atiendes?' })).toBeVisible();

  const barra = page.locator('.sgtm-nav');
  await expect(barra.locator('.sgtm-nav__modulo')).toHaveCount(MODULOS.length);
  await expect(barra.locator('.sgtm-nav__modulo-actual')).toHaveCount(0);

  // Y el panel de recaudación sigue siendo la opción que siempre fue.
  await barra.locator('.sgtm-nav__modulo', { hasText: 'Inicio' }).click();
  await expect(barra.locator('.sgtm-nav__modulo-actual')).toHaveText('Inicio');
  await barra.getByRole('link', { name: 'Panel de recaudación' }).click();
  await expect(page).toHaveURL(/\/inicio\/inicio$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Panel de recaudación');
});

test('«Todos los módulos» lista los doce del manual, con su recuento de opciones', async ({
  page,
}) => {
  // Desde dentro de un módulo, que es donde el botón de volver existe.
  await page.goto('/inicio/inicio');
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
  // El inicio ya deja la barra en el nivel raíz: no hay a qué volver primero.
  await page.goto('/');
  const barra = page.locator('.sgtm-nav');

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
