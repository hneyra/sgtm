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

  /* El encabezado ya esta pintado, pero el arranque no ha terminado: la sesion
     y el catalogo visible siguen resolviendo su primera peticion (#342, nit 1).
     Con cache de Vite fria esa ronda tarda mas, y el atajo puede llegar antes
     de que el oyente de `keydown` de `Shell` este activo. `networkidle` es la
     senal de que esa ronda de arranque ya asento: no repara el sintoma con un
     reintento, espera a la causa. */
  await page.waitForLoadState('networkidle');

  // La paleta de comandos es el camino rapido de quien atiende: Ctrl K.
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.type('alta de deuda');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Alta de deuda/i);

  /* **El concepto se elige, y con el teclado.** El desplegable arranca vacio a
     proposito (revision de #331): antes se dibujaba mostrando «IMPUESTO
     PREDIAL» sin que nadie lo tocara y el cuerpo salia sin `tributo`. Se baja
     una posicion con la flecha, que es como se opera un `select` sin raton. */
  const concepto = page.getByLabel('Concepto / tributo');
  await expect(concepto).toHaveValue('');
  await concepto.focus();
  await page.keyboard.press('ArrowDown');
  await expect(concepto).toHaveValue('IMPUESTO PREDIAL');

  /* **El año, con la misma dureza que el concepto** (#342, nit 3): el mismo
     `select` sin opcion vacia mostrada, la misma flecha para elegirla. */
  const ano = page.getByLabel('Año', { exact: true });
  await expect(ano).toHaveValue('');
  await ano.focus();
  await page.keyboard.press('ArrowDown');
  await expect(ano).not.toHaveValue('');

  // Y el documento que sustenta el alta, un texto que se teclea.
  const documento = page.getByLabel('Nº del documento');
  await documento.focus();
  await page.keyboard.type('RD-2026-000123');

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

/**
 * **Sin observacion, el teclado no consigue registrar el acto** (regla 10,
 * RNF-052).
 *
 * Es el camino que #332 dejo sin recorrer: era de la caja, y la caja ya no
 * escribe. Se recupera sobre «Alta de deuda», que es la que escribe hoy, y con
 * la semantica nueva —la primaria apagada es **enfocable**, para que el motivo
 * que lleva al lado se pueda leer—: eso hace el camino mas exigente, no menos,
 * porque ahora se puede llegar al boton con el teclado y pulsarlo, y aun asi no
 * tiene que pasar nada.
 */
test('sin observación, ni con el teclado se consigue registrar', async ({ page }) => {
  await page.goto('/rentas-registro/alta-deuda');

  const guardar = page.getByRole('button', { name: 'Dar de alta', exact: true });
  await expect(guardar).toHaveAttribute('aria-disabled', 'true');

  // Y el motivo se **ve**, y se puede llegar a el: el boton recibe el foco y su
  // `aria-describedby` apunta a la franja, que existe y no esta vacia.
  await guardar.focus();
  await expect(guardar).toBeFocused();
  const franja = page.locator('#sgtm-motivo-de-la-accion');
  // Lo primero que falta es el concepto: sin el, el cuerpo saldria sin
  // `tributo` y la deuda no señalaria a ninguna obligacion (revision de #331).
  await expect(franja).toHaveText(/Falta el concepto/);

  const concepto = page.getByLabel('Concepto / tributo');
  await concepto.focus();
  await page.keyboard.press('ArrowDown');
  // Con el concepto elegido, lo que falta ahora es el año (#342, nit 3).
  await expect(franja).toHaveText(/Falta el año/);

  const ano = page.getByLabel('Año', { exact: true });
  await ano.focus();
  await page.keyboard.press('ArrowDown');
  await expect(franja).toHaveText(/Falta el número del documento/);

  const documento = page.getByLabel('Nº del documento');
  await documento.focus();
  await page.keyboard.type('RD-2026-000123');
  await expect(franja).toHaveText(/Falta la observación/);

  // Pulsar no guarda nada: enfocable no es pulsable.
  await guardar.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Guardado, con tu observación/)).toHaveCount(0);

  // Y con la observacion escrita, el mismo Enter si registra.
  const observacion = page.getByRole('textbox', { name: 'Observación' });
  await observacion.focus();
  await page.keyboard.type('Determinación de fiscalización.');
  await guardar.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Guardado, con tu observación/)).toBeVisible();
});

test('la caja dice por que todavia no puede cobrar, en vez de prometerlo', async ({ page }) => {
  await page.goto('/tesoreria/caja-tributaria');
  const cobrar = page.getByRole('button', { name: /Cobrar/i }).last();
  // Apagada con `aria-disabled`, no con `disabled`: es lo que la deja enfocable
  // para que su motivo se lea (FRO-04 §6).
  await expect(cobrar).toHaveAttribute('aria-disabled', 'true');

  // Y el motivo se **ve**, en la lengua del mostrador y con la salida puesta.
  await expect(page.getByText(/Registra el acto por el procedimiento actual/i)).toBeVisible();
  // Sin escritura declarada no hay ni caja de observacion: no hay a donde escribir.
  await expect(page.getByRole('textbox', { name: 'Observación' })).toHaveCount(0);
});
