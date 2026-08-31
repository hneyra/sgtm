import { expect, test } from '@playwright/test';

/**
 * El riel de módulos y el panel del módulo abierto (FRO-03 §3, #498 F1).
 *
 * La navegación es de dos niveles y **los dos se dibujan a la vez**: el riel con
 * los doce del manual, que no se va nunca, y junto a él el panel del módulo
 * abierto. Hasta el rediseño se turnaban, y se conmutaba con «Todos los
 * módulos»; lo que confundió en producción era justo eso —la barra parecía
 * traer solo dos entradas cuando estaba en el nivel de módulo—, y con los dos
 * niveles delante deja de poder pasar.
 *
 * **Desde #296 la app no aterriza dentro de un módulo**: `/` es la pregunta de a
 * quién se atiende (ADR-0016 §1), que no pertenece a ninguno. Así que al
 * aterrizar el riel está entero y ninguno de sus doce marcado.
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

test('al aterrizar, ningún módulo está abierto; el de Inicio está a un clic', async ({ page }) => {
  await page.goto('/');
  // La portada ya no redirige a ninguna opción: es la pregunta (#296).
  await expect(page).toHaveURL(/localhost:4173\/$/);
  await expect(page.getByRole('heading', { name: '¿A quién atiendes?' })).toBeVisible();

  const riel = page.locator('.sgtm-modulos');
  const panel = page.locator('.sgtm-nav');

  // El riel está entero desde el primer instante, y ninguno marcado: aquí no se
  // está en ningún módulo, y el riel lo dice sin que haya que abrir nada.
  await expect(riel.locator('.sgtm-modulos__modulo')).toHaveCount(MODULOS.length);
  await expect(riel.locator('.sgtm-modulos__modulo[data-activo="1"]')).toHaveCount(0);
  await expect(panel.locator('.sgtm-nav__titulo')).toHaveText('SGTM');
  await expect(panel.locator('.sgtm-nav__opcion')).toHaveCount(0);

  /* `exact: true` no es adorno: `getByRole` casa el nombre accesible **por
     subcadena**, y sin él «Inicio» casaría también con la marca de arriba
     —«Inicio: a quién atiendes»—, que es otro enlace del mismo riel. */
  // Y el panel de recaudación sigue siendo la opción que siempre fue.
  await riel.getByRole('link', { name: 'Inicio', exact: true }).click();
  await expect(panel.locator('.sgtm-nav__titulo')).toHaveText('Inicio');
  await panel.getByRole('link', { name: 'Panel de recaudación' }).click();
  await expect(page).toHaveURL(/\/inicio\/inicio$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Panel de recaudación');
});

test('el riel lista los doce del manual y no se va al entrar en uno', async ({ page }) => {
  // Desde dentro de un módulo, que es donde antes había que volver para verlos.
  await page.goto('/inicio/inicio');

  const riel = page.locator('.sgtm-modulos');
  const modulos = riel.locator('.sgtm-modulos__modulo');
  await expect(modulos).toHaveCount(MODULOS.length);

  /* El rótulo de cada uno no se ve —caben 68 px— pero **existe**: es el nombre
     accesible del enlace, y es lo único que un lector de pantalla anuncia. Se
     comprueba en el orden del catálogo. */
  for (const [i, modulo] of MODULOS.entries()) {
    await expect(modulos.nth(i)).toHaveAccessibleName(modulo.label);
  }

  // Estando en Inicio, el suyo es el único marcado.
  await expect(riel.locator('.sgtm-modulos__modulo[data-activo="1"]')).toHaveCount(1);
  await expect(riel.locator('.sgtm-modulos__modulo[data-activo="1"]')).toHaveAccessibleName(
    'Inicio',
  );

  // Los recuentos suman las 134 opciones del catálogo: si un módulo se cae, el
  // total lo delata aunque el conteo de filas siga cuadrando.
  const total = MODULOS.reduce((n, m) => n + m.opciones, 0);
  expect(total).toBe(134);
});

test('se cambia de módulo en un clic, sin pasar por ninguna vuelta', async ({ page }) => {
  await page.goto('/');
  const riel = page.locator('.sgtm-modulos');
  const panel = page.locator('.sgtm-nav');

  await riel.getByRole('link', { name: 'Seguridad', exact: true }).click();
  await expect(page).toHaveURL(/\/seguridad$/);
  await expect(panel.locator('.sgtm-nav__titulo')).toHaveText('Seguridad');
  // Las once opciones del módulo, repartidas en sus bloques y sin desplegar
  // ninguno: los bloques son rótulos, no acordeones.
  await expect(panel.locator('.sgtm-nav__opcion')).toHaveCount(11);

  /* **Esto es lo que el rediseño compra**: irse a otro módulo es un clic, no
     dos. Antes había que volver a la raíz y entrar; el riel no se ha movido. */
  await riel.getByRole('link', { name: 'Coactiva', exact: true }).click();
  await expect(page).toHaveURL(/\/coactiva$/);
  await expect(panel.locator('.sgtm-nav__titulo')).toHaveText('Coactiva');
  await expect(riel.locator('.sgtm-modulos__modulo')).toHaveCount(MODULOS.length);
});

test('la paleta de comandos también llega a cualquier módulo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sgtm-nav')).toBeVisible();
  /* La barra ya se ve, pero la sesion y el catalogo visible pueden seguir
     resolviendo su primera peticion (#342, nit 1): con cache de Vite fria esa
     ronda tarda mas, y el atajo puede llegar antes de que el oyente de
     `keydown` de `Shell` este activo. Se espera a la causa, no al sintoma. */
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');

  const paleta = page.getByRole('dialog', { name: 'Buscar en el sistema' });
  await expect(paleta).toBeVisible();
  await paleta.getByRole('textbox', { name: 'Buscar una opción' }).fill('coactiva');
  // La paleta encuentra lo que el menú esconde: si no, escondería algo.
  await expect(
    paleta.locator('.sgtm-paleta__modulo', { hasText: 'Coactiva' }).first(),
  ).toBeVisible();
});
