import { expect, test } from '@playwright/test';

/**
 * El mapa catastral, recorrido entero en un navegador de verdad (#500, ADR-0022).
 *
 * Este camino existe por lo que **no se puede montar en jsdom**: Leaflet mide su
 * contenedor al montarse y dibuja sobre un lienzo, así que la prueba de pantalla
 * lo sustituye por un doble y comprueba todo lo demás. Lo que queda sin medir
 * ahí es justo lo que rompe una integración de mapas:
 *
 * 1. **Que el visor llegue.** Leaflet entra por `import()` en su propio trozo
 *    (ADR-0022 §4); un trozo que no se emita, o una hoja de estilos que no
 *    viaje, deja un rectángulo vacío y ningún error.
 * 2. **Que el plano se dibuje sin las teselas.** Aquí no hay salida a internet
 *    —como en la mayoría de las municipalidades—, así que OpenStreetMap no
 *    contesta. El plano son los polígonos y tiene que salir igual: si dependiera
 *    de las teselas, este caso lo diría.
 * 3. **Que se opere con el teclado.** En ventanilla no se usa el ratón
 *    (RNF-082), y un lienzo de teselas no tiene contenido que recorrer: el
 *    equivalente es la lista de lotes, y este camino no da un solo clic.
 */
test('el plano se dibuja, y se elige un lote sin tocar el ratón', async ({ page }) => {
  await page.goto('/catastro/mapa');

  await expect(page.getByRole('heading', { level: 1, name: 'Mapa catastral' })).toBeVisible();

  // El lienzo de Leaflet, montado de verdad: su contenedor gana la clase que la
  // biblioteca le pone al inicializarse. Sin el trozo o sin su hoja, esto no
  // aparece —y el rectangulo vacio que quedaria no se distingue de un plano sin
  // lotes—.
  await expect(page.locator('.sgtm-plano__mapa.leaflet-container')).toBeVisible();

  // Y la atribucion de OpenStreetMap, que no es adorno: es su licencia (ODbL).
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');

  // Las dos capas que no se pueden dibujar dicen por que, y no se pueden
  // encender: una capa que falta sin explicacion se lee como una que no existe.
  const capas = page.getByLabel('Capas');
  await expect(capas.getByRole('checkbox', { name: /Vías y calles/ })).toBeDisabled();
  await expect(capas.getByText(/La vía no tiene geometría en el sistema/)).toBeVisible();
  await expect(capas.getByText(/El arancel es de un tramo de vía/)).toBeVisible();

  // El plano dice siempre cuantos predios no tiene dibujados, aunque sean cero.
  await expect(
    page.getByText(/predios de este marco|Todos los predios de este marco/),
  ).toBeVisible();

  /* Del campo de busqueda a la lista de lotes y de ahi al panel, **solo con el
     teclado**. El lienzo esta `aria-hidden`, asi que el tabulador no entra en
     el: lo que se recorre es la lista, que es el equivalente. */
  await page.getByLabel('Código predial o lote').focus();
  const lista = page.getByLabel('Lotes de la vista');
  const primero = lista.getByRole('button').first();
  await primero.focus();
  await page.keyboard.press('Enter');

  const panel = page.getByLabel('Lote seleccionado');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Abrir el predio' })).toHaveAttribute(
    'href',
    /^\/catastro\/ficha-urbana\//,
  );

  /* El arancel de la via sale «—» y con su motivo al lado: es de un tramo de
     via y el predio no dice en cual esta (ADR-0022 §5). Una cifra ahi seria
     plausible y equivocada, que es lo peor que un plano puede enseñar. */
  await expect(panel.getByText('Arancel de la vía')).toBeVisible();
  await expect(panel.getByText(/se consulta con su importe exacto en «Aranceles»/)).toBeVisible();
});
