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

  /* **El concepto se elige, y con el teclado.** El desplegable arranca vacio a
     proposito (revision de #331): antes se dibujaba mostrando «IMPUESTO
     PREDIAL» sin que nadie lo tocara y el cuerpo salia sin `tributo`. Se baja
     una posicion con la flecha, que es como se opera un `select` sin raton. */
  const concepto = page.getByLabel('Concepto / tributo');
  await expect(concepto).toHaveValue('');
  await concepto.focus();
  await page.keyboard.press('ArrowDown');
  await expect(concepto).toHaveValue('IMPUESTO PREDIAL');

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
  // Desde #74 nombra el dato exacto que falta —el medio de pago, no la lista
  // blanca—: `caja_tributaria` esta en `ACTOS_SIN_CAMPO`, no en «sin-declaracion».
  await expect(page.getByText(/el medio de pago/i)).toBeVisible();
  await expect(page.getByText(/Registra el acto por el procedimiento actual/i)).toBeVisible();
  // Sin escritura declarada no hay ni caja de observacion: no hay a donde escribir.
  await expect(page.getByRole('textbox', { name: 'Observación' })).toHaveCount(0);
});

/**
 * **Anular un recibo, sin tocar el raton** (#34, #74, RNF-082).
 *
 * Es el primer acto de tesoreria que llega hasta el final: caja tributaria y
 * caja de tasas siguen sin poder cobrar —les falta el medio de pago en el
 * cuerpo, y ninguna pantalla del prototipo dibuja ese campo (`ACTOS_SIN_CAMPO`)—,
 * asi que el camino completo de ventanilla se recorre aqui, sobre el acto que
 * si declara su cuerpo entero: se abre por el numero impreso del recibo —igual
 * que una ficha catastral se abre por su codigo—, se elige el motivo y quien
 * autoriza con el teclado, y la anulacion **se confirma**: no se deshace
 * (regla 4, RNF-051).
 */
test('anular un recibo: identificar, elegir, confirmar, sin raton', async ({ page }) => {
  await page.goto('/tesoreria/anulacion-recibo/001-0000123');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Anulación de recibo/i);

  // El motivo se elige con el teclado: un `select` se opera con las flechas.
  const motivo = page.getByLabel('Motivo');
  await motivo.focus();
  await page.keyboard.press('ArrowDown');
  await expect(motivo).not.toHaveValue('');

  const autorizadoPor = page.getByLabel('Autorizado por');
  await autorizadoPor.focus();
  await page.keyboard.press('ArrowDown');
  await expect(autorizadoPor).not.toHaveValue('');

  const memorando = page.getByLabel('Nº de memorando');
  await memorando.focus();
  await page.keyboard.type('MEMO-2026-014');

  const observacion = page.getByRole('textbox', { name: 'Observación' });
  await observacion.focus();
  await page.keyboard.type('Pago duplicado, verificado con el contribuyente.');

  // La primaria es irreversible: no manda hasta confirmar (regla 4).
  const anular = page.getByRole('button', { name: 'Anular recibo', exact: true });
  await expect(anular).toBeEnabled();
  await anular.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText(/no se deshace/i)).toBeVisible();
  const confirmar = page.getByRole('button', { name: /^Confirmar/i });
  await confirmar.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText(/Guardado, con tu observación/)).toBeVisible();
});
