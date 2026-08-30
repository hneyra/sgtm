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

test('la caja de tasas dice por que todavia no puede cobrar, en vez de prometerlo', async ({
  page,
}) => {
  await page.goto('/tesoreria/caja-tasas');
  const cobrar = page.getByRole('button', { name: /Cobrar/i }).last();
  // Apagada con `aria-disabled`, no con `disabled`: es lo que la deja enfocable
  // para que su motivo se lea (FRO-04 §6).
  await expect(cobrar).toHaveAttribute('aria-disabled', 'true');

  // Y el motivo se **ve**, en la lengua del mostrador y con la salida puesta.
  // Desde #430 nombra los cuatro datos que le faltan, y el primero es el que la
  // separa de su gemela: ninguna consulta publica todavia el catalogo del TUPA.
  // La franja, no la descripcion de la pantalla: las dos hablan del TUPA.
  await expect(page.locator("#sgtm-motivo-de-la-accion")).toContainText(/conceptos del TUPA/i);
  await expect(page.getByText(/Registra el acto por el procedimiento actual/i)).toBeVisible();
  // Sin escritura declarada no hay ni caja de observacion: no hay a donde escribir.
  await expect(page.getByRole('textbox', { name: 'Observación' })).toHaveCount(0);
});

/**
 * **Cobrar en ventanilla, sin tocar el raton** (#430, #33, RF-080, FRO-03 §6).
 *
 * Es el camino que mas veces se recorre al dia en una municipalidad, y el unico
 * por el que entra dinero. Hasta #430 no se podia recorrer entero: faltaban el
 * medio de pago, la caja, el cajero y la grilla de la que elegir la deuda.
 *
 * Lo que este camino demuestra, y no una prueba de componente: que las cuatro
 * cosas se pueden **poner con el teclado** —la casilla de la fila con espacio,
 * los dos controles anadidos tecleando, el desplegable con las flechas— y que la
 * primaria no se enciende hasta que esta la observacion (regla 10).
 */
test('cobrar en ventanilla: elegir la deuda, el medio de pago y el turno, sin raton', async ({
  page,
}) => {
  await page.goto('/tesoreria/caja-tributaria?codContribuyente=00000006550');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Caja/i);

  const cobrar = page.getByRole('button', { name: /^Cobrar deuda/ });
  await expect(cobrar).toHaveAttribute('aria-disabled', 'true');

  // La deuda se elige en la grilla, con la barra espaciadora sobre su casilla.
  const casilla = page.locator('.sgtm-tabla__casilla input').first();
  await casilla.focus();
  await page.keyboard.press('Space');
  await expect(casilla).toBeChecked();
  // Y la banda lo cuenta **sin sumar ninguna cifra** (RNF-083).
  await expect(page.locator('.sgtm-seleccion')).toContainText(/1 deuda elegida/);

  // El medio de pago: un `select` se opera con las flechas.
  const medio = page.getByLabel('Medio de pago');
  await medio.focus();
  await page.keyboard.press('ArrowDown');
  await expect(medio).not.toHaveValue('');

  // Y el turno, tecleando. Los dos son controles anadidos (#422): el manual no
  // los dibuja, y llevan su propia etiqueta.
  await page.getByLabel('Caja', { exact: true }).focus();
  await page.keyboard.type('C01');
  await page.getByLabel('Cajero', { exact: true }).focus();
  await page.keyboard.type('jperez');

  // Con todo puesto y sin observacion, sigue apagada: la regla 10 no se negocia.
  await expect(cobrar).toHaveAttribute('aria-disabled', 'true');

  const observacion = page.getByRole('textbox', { name: 'Observación' });
  await observacion.focus();
  await page.keyboard.type('Cobro en ventanilla, turno de la mañana.');

  // Y entonces, y solo entonces, se enciende.
  await expect(cobrar).not.toHaveAttribute('aria-disabled', 'true');
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
