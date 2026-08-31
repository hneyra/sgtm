import { expect, test } from '@playwright/test';

/**
 * **La determinacion se pide y se lee, sin tocar el raton** (#393, RNF-082).
 *
 * «Calculo individual del impuesto predial» es la pantalla en la que se le dice
 * a un contribuyente cuanto debe, y su operacion del contrato es un `POST`: no
 * pide nada al abrir —abrir una pantalla no puede lanzar una determinacion—, asi
 * que sus importes salen con «—» hasta que alguien pulsa «Simular». Desde #395
 * lo que vuelve es el recurso que publica `PredialController`, pedido con
 * `simulacion: true` en el cuerpo: calcula y no asienta nada. Ese gesto es
 * el que esta prueba recorre entero, y lo recorre **con el teclado**: en
 * ventanilla el raton no se usa, y una cifra que solo se puede pedir con un clic
 * es una cola parada.
 *
 * Lo que cuesta caro si se rompe no es que falte un boton: es que **la cuenta
 * deje de verse**. Quien atiende tiene que poder responder «¿de donde sale ese
 * importe?» delante del contribuyente, y la respuesta es la memoria de calculo
 * —la base a un lado, el resultado al otro— con la banda diciendo con que
 * conjunto **sellado** de parametros se hizo. Sin la banda, la misma cifra
 * dentro de diez anos no se puede recalcular (`ARQ-09` §3); sin las dos mitades
 * de cada linea, el importe es un numero que hay que creerse.
 *
 * Y hay una segunda mitad, tan importante como la primera: **simular no es
 * guardar**. La accion que pide la cuenta es secundaria y no abre ninguna caja
 * de observacion —no modifica datos, asi que la regla 10 (RNF-052) no le
 * aplica—, y la primaria sigue apagada con su franja: lo que esta pantalla no
 * puede hacer todavia es **asentar** la determinacion, y poder ver la cuenta no
 * lo cambia.
 */

/** El contribuyente del prototipo, y el ejercicio con el que salieron sus cifras. */
const CONTRIBUYENTE = '00000025673';
const EJERCICIO = '2026';

/** El resultado de la escala progresiva, tal como lo sirve el servidor. */
const INSOLUTO_ANUAL = '587.44';

/**
 * Las dos mitades del primer tramo, **ya con el separador de millares que la
 * interfaz pone al dibujar** (#395): el recurso manda «80250.00» y «160.50».
 * El separador es un espacio, no una coma — ver `agruparMiles` en
 * `@sgtm/dominio`.
 */
const BASE_DEL_TRAMO_1 = 'S/ 80 250.00';
const APORTE_DEL_TRAMO_1 = 'S/ 160.50';

/** Lo que dice la banda mientras nadie ha pedido la cuenta. */
const SIN_DETERMINACION = /Todavía no hay determinación/;

test('de los filtros a la memoria del cálculo, solo con el teclado', async ({ page }) => {
  await page.goto('/rentas-registro/predial-individual');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Cálculo individual del impuesto predial/i,
  );

  /* El arranque no termina con el encabezado pintado: la sesion y el catalogo
     visible siguen resolviendo su primera peticion, y el indice de secciones
     —por el que se llega a la barra de acciones— llega con ellos. Es la misma
     espera que `caja-con-teclado.spec.ts` hace por el mismo motivo. */
  await page.waitForLoadState('networkidle');

  const memoria = page.locator('.sgtm-memoria');
  await expect(memoria).toBeVisible();
  const resultado = page.locator('.sgtm-memoria__resultado-valor');
  const tramo1 = page
    .locator('.sgtm-memoria__linea')
    .filter({ hasText: 'Tramo 1 — hasta 15 UIT (0.2 %)' });

  /* ── 1. Al abrir, la cuenta esta vacia y lo dice con guiones ─────────────
     «—» y no un cero: lo que distingue «no llego» de «vale cero» es el guion, y
     un cero en el impuesto insoluto de un contribuyente con predios es una cifra
     equivocada que nadie mira dos veces. */
  await expect(resultado).toHaveText('—');
  await expect(tramo1.locator('.sgtm-memoria__importe')).toHaveText('—');
  await expect(tramo1.locator('.sgtm-memoria__operacion')).toHaveCount(0);

  /* Y la banda todavia **no esta**: sin sujeto no hay nada que encabezar. La
     pantalla se abre sin filtros contestados, asi que a estas alturas no se sabe
     ni sobre quien se determinaria; la banda aparece en cuanto se dice a quien
     se atiende, y es entonces cuando cuenta que aun no hay determinacion. */
  const banda = page.locator(
    'section.sgtm-resumen[aria-label="Sujeto y parámetros de la determinación"]',
  );
  await expect(banda).toHaveCount(0);

  /* ── 2. Se dice a quien se atiende, tecleando ────────────────────────────
     El foco entra en el primer filtro y de ahi se tabula: lo que se comprueba
     con el tabulador es el **orden**, que es lo que se rompe sin que nadie lo
     note cuando un bloque nuevo se cuela en medio. */
  const codigo = page.getByLabel('Cod. Contribuyente');
  await codigo.focus();
  await page.keyboard.type(CONTRIBUYENTE);
  await expect(codigo).toHaveValue(CONTRIBUYENTE);

  await page.keyboard.press('Tab');
  const ano = page.getByLabel('Año', { exact: true });
  await expect(ano).toBeFocused();
  /* Un `select` se opera escribiendo sobre el: la busqueda por prefijo del
     navegador lleva a la opcion que empieza por lo tecleado. Se elige asi y no
     con la flecha porque el resultado no depende de en que opcion estuviera:
     lo tecleado dice el ejercicio, y el ejercicio decide la cifra. */
  await page.keyboard.type(EJERCICIO);
  await expect(ano).toHaveValue(EJERCICIO);

  /* «Buscar» del bloque de busqueda —no la del catalogo, que es una accion mas
     de la barra y esta apagada— lleva lo tecleado a la URL, que es de donde la
     simulacion saca sus parametros. */
  const buscar = page.locator('.sgtm-filtros').getByRole('button', { name: 'Buscar' });
  await buscar.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`codContribuyente=${CONTRIBUYENTE}`));

  /* ── 3. Con sujeto y sin determinacion, la banda lo dice ─────────────────
     Es la mitad que hace reproducible una cifra, dicha **antes** de que haya
     cifra: hasta que alguien pida el calculo, esta banda no puede nombrar
     ningun conjunto de parametros, y callarlo la dejaria afirmando mas de lo
     que sabe. */
  await expect(banda).toBeVisible();
  await expect(banda).toContainText(SIN_DETERMINACION);
  await expect(banda.getByText(/sellado/)).toHaveCount(0);

  /* ── 4. Se llega a «Simular» con el teclado y se pulsa ───────────────────
     Por el indice de secciones, que es el camino que la pantalla ofrece: su
     salida lleva el foco al primer control **vivo** de la barra de acciones. Y
     el primero vivo es este, porque «Buscar» del catalogo esta deshabilitada y
     «Calcular» no puede guardar todavia. Sin el indice, llegar aqui serian
     veintitantas pulsaciones del tabulador por encima de la tabla de predios y
     de los campos de las tres secciones. */
  const salida = page.getByRole('button', { name: 'Ir a las acciones' });
  await salida.focus();
  await page.keyboard.press('Enter');

  const simular = page.locator('.sgtm-acciones').getByRole('button', { name: 'Simular' });
  await expect(simular).toBeFocused();
  await page.keyboard.press('Enter');

  /* ── 5. La cuenta se llena, y se lee de una pasada ───────────────────────
     Las dos mitades **separadas** son lo que este camino existe para poder
     ensenar: «S/ 80 250.00 → S/ 160.50» es la base del tramo y lo que ese tramo
     aporta. Ni una de las dos la compone la interfaz (RNF-083): el servidor
     manda «80250.00» y «160.50» —lo que devuelve `BigDecimal.toPlainString()`—
     y lo unico que pasa aqui es el separador de millares de `agruparMiles`, que
     es presentacion y no aritmetica (#395). */
  await expect(resultado).toHaveText(INSOLUTO_ANUAL);
  await expect(tramo1.locator('.sgtm-memoria__operacion')).toHaveText(BASE_DEL_TRAMO_1);
  await expect(tramo1.locator('.sgtm-memoria__importe')).toHaveText(APORTE_DEL_TRAMO_1);

  /* ── 6. Y la banda dice con que se calculo, y sobre quien ────────────────
     El conjunto **sellado**, con la palabra dentro y no solo por color: dos
     conjuntos del mismo ejercicio dan dos importes distintos y los dos
     correctos. Y el sujeto pasa a ser el que redacto el servidor —el nombre—,
     no el codigo que se tecleo arriba. */
  await expect(banda).not.toContainText(SIN_DETERMINACION);
  await expect(banda.getByText(`Parámetros ${EJERCICIO} v1 · sellado`)).toBeVisible();
  await expect(banda.getByText('SUC. RUFINA MEDINA MEDINA')).toBeVisible();
});

/**
 * **Simular no es guardar** (regla 10, RNF-052, #332).
 *
 * La misma accion, pulsada con la barra espaciadora —el otro modo de pulsar un
 * boton sin raton—, y lo que se mira despues es lo que **no** aparece: no hay
 * caja de observacion, porque no se modifica ningun dato y no hay nada que
 * justificar en la auditoria; y la primaria sigue apagada con su franja, porque
 * lo que esta pantalla no puede hacer todavia es asentar la determinacion.
 *
 * Si esto se rompiera al reves —una accion que dice «Simular» y escribe—, el
 * sintoma seria deuda emitida por mirar una cuenta, y ninguna cifra de la
 * pantalla pareceria mal.
 */
test('simular no abre observación ni enciende la primaria', async ({ page }) => {
  await page.goto(
    `/rentas-registro/predial-individual?codContribuyente=${CONTRIBUYENTE}&ano=${EJERCICIO}`,
  );
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Cálculo individual del impuesto predial/i,
  );

  const simular = page.locator('.sgtm-acciones').getByRole('button', { name: 'Simular' });
  // Secundaria, y encendida: no compite con la primaria porque no hace lo mismo.
  await expect(simular).toHaveClass(/sgtm-boton--secundario/);
  await expect(page.getByRole('textbox', { name: 'Observación' })).toHaveCount(0);

  await simular.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.sgtm-memoria__resultado-valor')).toHaveText(INSOLUTO_ANUAL);

  // Con la cuenta ya en pantalla, sigue sin haber donde escribir.
  await expect(page.getByRole('textbox', { name: 'Observación' })).toHaveCount(0);

  /* Y la primaria sigue apagada **con su motivo al lado**: apagada con
     `aria-disabled` para que se pueda enfocar y el motivo se lea (FRO-04 §6), y
     la causa tecnica en `data-causa` para quien mantiene el sistema. `sin-
     determinacion` es la unica de las cuatro causas que dice la verdad aqui: no
     falta la lista blanca de campos ni falta paciencia con el backend, falta la
     determinacion que solo el servidor puede asentar. */
  const calcular = page.locator('.sgtm-acciones').getByRole('button', { name: 'Calcular' });
  await expect(calcular).toHaveAttribute('aria-disabled', 'true');
  const franja = page.locator('.sgtm-acciones__motivo');
  await expect(franja).toHaveAttribute('data-causa', 'sin-determinacion');
  await expect(franja).not.toBeEmpty();
});
