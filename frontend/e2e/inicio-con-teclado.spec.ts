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

  // Y desde ahí, Intro sobre la fila enfocada abre **su ficha 360°** (#297,
  // ADR-0016 §2), no el padrón con el código en el filtro.
  await page.keyboard.press('Enter');
  // El código viaja en la dirección: el enlace de la atención se puede compartir.
  await expect(page).toHaveURL(/\/atencion\/\d+$/);
  // Y lo que encabeza la ficha es **quién es**, no el título de una opción: la
  // ficha no es una de las 134.
  await expect(page.getByRole('heading', { name: /MEDINA/ })).toBeVisible();
});

/**
 * **De la pregunta a la ficha, y por la ficha, sin tocar el ratón**
 * (#297, ADR-0016 §2, RNF-082).
 *
 * La ficha compone seis opciones en seis pestañas, y una barra de pestañas a la
 * que solo se llega con el ratón deja media ficha fuera del alcance de quien
 * atiende. Este camino la recorre con el teclado, y recorre además **el traspaso
 * del foco**: al llegar a la ficha nadie le dice al navegador dónde está —una
 * navegación de React Router deja el foco en `body`, y desde ahí hay diecinueve
 * pulsaciones del tabulador hasta la barra—, así que la ficha se lo lleva al
 * nombre de quien se atiende. Antes esta prueba enfocaba la primera pestaña **a
 * mano**, que es justamente saltarse lo que había que comprobar.
 *
 * Y la barra va con **activación manual**: las flechas mueven el foco y Enter
 * activa. Recorrerla con activación automática pedía las cinco lecturas por el
 * camino, que es lo que ADR-0016 §2 evita al no consultarlas al abrir.
 */
test('la ficha 360° recibe el foco y se recorre con el teclado', async ({ page }) => {
  await page.goto('/');
  // El trozo del inicio llega diferido: se espera al foco, que es la señal de
  // que la caja ya existe. Sin esto lo tecleado se pierde antes de aterrizar.
  await expect(page.getByRole('searchbox', { name: 'Buscar a quién atiendes' })).toBeFocused();
  await page.keyboard.type('MEDINA');
  await expect(page.getByRole('region', { name: 'Contribuyentes' })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atencion\/\d+$/);

  // **El foco llega solo**: al nombre de quien se atiende, que es lo primero que
  // hay que saber al abrir una ficha. Se pide por el nombre y no por el nivel:
  // las tarjetas de dentro también encabezan con `h2`.
  const nombre = page.getByRole('heading', { name: /MEDINA/ });
  await expect(nombre).toBeFocused();

  // La cabecera dice quién es y cuánto debe, con la fecha de la respuesta.
  await expect(page.getByRole('region', { name: 'Resumen de saldos' })).toContainText(
    /Cifras actualizadas al/,
  );

  const barra = page.getByRole('tablist', { name: /se compone de esta persona/i });
  await expect(barra).toBeVisible();

  // Y desde el nombre se llega a la barra tabulando, sin tocar el ratón: dos
  // pulsaciones —la acción de la cabecera va en medio—, no diecinueve. La
  // primera pestaña es la única tabulable de las seis.
  const primera = page.getByRole('tab').first();
  await expect(primera).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(primera).toBeFocused();

  // La flecha mueve el foco y **no activa**: pasar por encima no pide su padrón.
  await page.keyboard.press('ArrowRight');
  const segunda = page.getByRole('tab').nth(1);
  await expect(segunda).toBeFocused();
  await expect(segunda).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('tabpanel')).toContainText(
    'Fuente: Consultas · Consulta unificada predial-arbitrios',
  );

  // Enter sí: y entonces lo que se ve es lo de la pestaña activa, con su fuente.
  await page.keyboard.press('Enter');
  await expect(segunda).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Fuente: Consultas · Consulta de predios');

  /* Fin lleva a la última —hoy los beneficios del contribuyente, que #393 sumó
     a la ficha— y Enter la abre. Lo que se prueba es Fin y Enter, no cuál es la
     última: el rótulo se lee del propio botón enfocado, así que la barra puede
     crecer sin que esto se ponga rojo por un motivo que no es el que mide. */
  await page.keyboard.press('End');
  const ultima = page.getByRole('tab').last();
  await expect(ultima).toBeFocused();
  const rotulo = (await ultima.textContent())?.trim() ?? '';
  expect(rotulo).not.toBe('');
  await page.keyboard.press('Enter');
  await expect(ultima).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText(`Fuente: `);
  await expect(page.getByRole('tabpanel')).toContainText(rotulo);
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
