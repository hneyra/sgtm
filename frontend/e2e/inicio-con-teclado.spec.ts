import { expect, test } from '@playwright/test';

/**
 * **El inicio pregunta a quién atiendes, y se responde sin tocar el ratón**
 * (#296, ADR-0016 §1, RNF-082).
 *
 * En ventanilla el ratón no se usa: se atiende con el teclado, y cada paso que
 * exige un clic es una cola que se para. Este camino no mueve el puntero ni una
 * vez —escribe y pulsa teclas—, así que si algún paso solo se puede hacer con el
 * ratón, falla.
 *
 * Corre contra la app compilada con su proxy de datos, que **no filtra**: una
 * búsqueda por nombre devuelve el padrón del prototipo entero. Por eso lo que se
 * recorre es el camino de varios resultados —Intro baja a la lista, se elige con
 * el tabulador y se abre con Intro—, que es además el que no puede equivocarse
 * de persona.
 */
test('de la pregunta del inicio a la ficha, solo con el teclado', async ({ page }) => {
  await page.goto('/');

  // El foco entra en la caja: se empieza a teclear sin buscar dónde.
  const caja = page.getByRole('searchbox', { name: 'Buscar a quién atiendes' });
  await expect(caja).toBeFocused();

  await page.keyboard.type('MEDINA');

  // La región viva dice cuántos hay antes de bajar: quien no ve la pantalla
  // necesita saber si Intro basta o si hay que elegir.
  const franja = page.getByRole('region', { name: 'Contribuyentes' });
  await expect(franja).toBeVisible();
  await expect(page.getByText(/resultados?\./)).toBeVisible();
  // Y dice de qué padrón salieron: con otro permiso, esta franja no estaría.
  await expect(franja.getByText('Rentas · Registro')).toBeVisible();

  // Intro con varios resultados **no abre el primero**: baja a la lista.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '¿A quién atiendes?' })).toBeVisible();

  // Y desde ahí, Intro sobre la fila enfocada abre a esa persona.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Contribuyentes');
  // El código viaja en la dirección: el enlace de la atención se puede compartir.
  await expect(page).toHaveURL(/codigo=/);
});

/**
 * **La vuelta al inicio existe y es la de siempre.**
 *
 * El inicio no es una de las 134 opciones —no publica ninguna lectura propia ni
 * tiene permiso que conceder—, así que ni el menú, ni el lanzador, ni la paleta
 * llegan a él. Sin un camino de vuelta, quien entra en cualquier pantalla no
 * puede volver a preguntar por la siguiente persona sin editar la barra de
 * direcciones.
 */
test('la marca de la barra lateral vuelve a la pregunta', async ({ page }) => {
  await page.goto('/tesoreria/caja-tributaria');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Caja/i);

  await page.getByRole('link', { name: 'Inicio: a quién atiendes' }).click();
  await expect(page).toHaveURL(/localhost:4173\/$/);
  await expect(page.getByRole('heading', { name: '¿A quién atiendes?' })).toBeVisible();
});
