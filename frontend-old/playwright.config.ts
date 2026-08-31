import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo (FRO-03 §6).
 *
 * Las 134 pantallas se comprueban montadas, y eso vale para la estructura. Lo
 * que no dice nada de un camino completo —buscar, elegir, llenar, guardar,
 * imprimir— es justo el que rompe una integracion, y hay tres que cuestan mucho
 * si fallan:
 *
 *   1. **El cobro en caja, con el teclado.** En ventanilla no se usa el raton
 *      (RNF-082): si un paso exige un clic, la cola se para.
 *   2. **La consulta del portal en un movil.** El contribuyente entra desde su
 *      telefono o no entra.
 *   3. **La impresion de un reporte.** Sale de la municipalidad, se firma y se
 *      archiva (RNF-084).
 *
 * Corren contra la aplicacion **compilada** y su proxy de datos, que es lo mas
 * parecido a produccion que hay hasta que el backend sirva sus operaciones.
 */
/**
 * Chromium ya instalado en la maquina.
 *
 * Playwright descarga su propio navegador, y en una maquina que ya lo trae
 * —o sin salida a internet— eso es una descarga que sobra. Con `SGTM_CHROMIUM`
 * apuntando al binario, se usa ese.
 */
const chromium = process.env['SGTM_CHROMIUM'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    ...(chromium === undefined ? {} : { launchOptions: { executablePath: chromium } }),
  },
  projects: [{ name: 'escritorio', use: { ...devices['Desktop Chrome'] } }],
  /**
   * Dos servidores, uno por aplicacion (#298, ADR-0016 §3).
   *
   * El portal del contribuyente es su propio paquete y se sirve en `/portal/`
   * —igual que en produccion, donde `nginx.conf` lo pone ahi—, asi que su camino
   * no se puede recorrer contra la vista previa del back-office: son dos
   * `dist/` distintos. Cada uno compila el suyo; `yarn build` de la raiz compila
   * los dos, y `--strictPort` evita que uno se cuele en el puerto del otro y la
   * prueba mida la aplicacion equivocada.
   */
  webServer: [
    {
      command: 'yarn build:backoffice && yarn preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      command: 'yarn build:portal && yarn preview:portal --port 4174 --strictPort',
      url: 'http://localhost:4174/portal/',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
