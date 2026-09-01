/**
 * Con la red cortada, ninguna pantalla puede enseñar una cifra.
 *
 *   node verificaciones/sin-red.mjs [modulo]
 *
 * Es la verificación de la única regla que gobierna esta interfaz: cuando el
 * backend no sostiene lo que la pantalla dice, se dibuja `—` y el motivo, nunca
 * la cifra de la maqueta. Y el momento en que esa regla se rompe sin que nadie
 * lo vea es justamente éste — un 403, un 500, la red caída— porque con datos
 * delante la pantalla parece correcta.
 *
 * Cómo mide. Se abre cada destino con TODAS las peticiones a `/api/v1`
 * abortadas, y se busca en la página lo que sólo puede venir de un dato:
 *
 *   - un importe con dígitos (`S/ 1,842.60`),
 *   - un número de cuatro cifras o más con separador de millares (`62,418`),
 *   - un porcentaje con decimal (`77.7 %`).
 *
 * Lo que NO cuenta como cifra, a propósito: los años (2026), los números de un
 * rótulo estable —«6 tipos de cálculo»—, y `S/ —`, que es exactamente lo que se
 * quiere ver. Sin esas excepciones la verificación gritaría en verde y dejaría
 * de leerse, que es la forma en que un escáner deja de proteger.
 *
 * Necesita una vista previa levantada y el Chromium de Playwright.
 */
import { chromium } from 'playwright-core';
import { rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const temporal = new URL('./.modulos-sin-red.mjs', import.meta.url);
await build({
  entryPoints: ['src/shell/modulos.ts'],
  outfile: temporal.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { MODULOS } = await import(pathToFileURL(temporal.pathname).href);
await rm(temporal, { force: true });

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const soloModulo = process.argv[2]?.startsWith('--') ? null : process.argv[2];

/** Lo que sólo puede salir de un dato que aquí no se ha podido leer. */
const CIFRAS = [
  { nombre: 'importe', re: /S\/\s?-?\d[\d.,]*/g },
  { nombre: 'millares', re: /(?<![\d.,])\d{1,3}(?:,\d{3})+(?![\d.,])/g },
  { nombre: 'porcentaje', re: /\d+[.,]\d+\s?%/g },
  /* Un importe SIN su «S/» delante. Existe porque los hay: «Monto deducido
     (S/) 0.00» lleva el símbolo en la etiqueta y la cifra sola en la celda, y
     así se escapaba del patrón de arriba. Exactamente dos decimales, que es la
     forma del dinero: un año no casa, «1.0206» tampoco, y un porcentaje ya lo
     caza su propio patrón. */
  { nombre: 'importe suelto', re: /(?<![\d.,%])\d[\d,]*\.\d{2}(?![\d%])/g },
];

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1400 } });
/* Con token puesto: sin él, algunas pantallas ni intentan leer y la
   verificación mediría el camino equivocado —el de «no hay sesión»— en vez del
   de «se pidió y no se pudo». */
if (process.env.SGTM_TOKEN) {
  await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), process.env.SGTM_TOKEN);
}
const pagina = await contexto.newPage();
await pagina.route('**/api/v1/**', (r) => r.abort());

/**
 * Abre lo que nace plegado antes de mirar.
 *
 * `innerText` no ve lo que está oculto, así que una sección cerrada era un
 * escondite perfecto: la de «Emisión y cuotas» del predial llevaba dentro el
 * derecho de emisión, las cuatro cuotas y sus cuatro vencimientos —cifras del
 * conjunto sellado— y esta comprobación pasaba en verde por encima.
 */
async function desplegarlo(pagina) {
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const plegados = pagina.locator('[aria-expanded="false"]');
    const cuantos = await plegados.count();
    if (cuantos === 0) break;
    for (let i = 0; i < cuantos; i++) {
      await plegados.nth(i).click({ timeout: 900 }).catch(() => {});
    }
    await pagina.waitForTimeout(160);
  }
  await pagina.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await pagina.waitForTimeout(200);
}

const sucias = [];
let vistas = 0;

for (const m of MODULOS) {
  if (soloModulo && m.k !== soloModulo) continue;
  /* Los destinos del carril **y** la accion del panel y su documento.
     Enumerando solo `m.destinos` esto era ciego a trece pantallas —las altas y
     las hojas imprimibles—, y son justo donde mas cifras hay: `mirar.mjs` ya las
     recorria y esto no, asi que devolver las cifras del artboard a la hoja de
     una resolucion de determinacion la dejaba ensenandolas con la red cortada y
     este arnes informando «ninguna ensenia una cifra», en verde. */
  const paradas = [
    ...m.destinos.map((d) => d.k),
    ...(m.accion ? [m.accion.k] : []),
    ...(m.documento ? [m.documento.k] : []),
  ];
  for (const d of paradas.length ? paradas : ['']) {
    const ruta = d ? `#/${m.k}/${d}` : `#/${m.k}`;
    await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(900);
    vistas++;
    await desplegarlo(pagina);
    const texto = await pagina.locator('body').innerText();
    for (const { nombre, re } of CIFRAS) {
      const halladas = [...texto.matchAll(re)].map((x) => x[0]).filter((x) => !/^S\/\s?[—-]$/.test(x));
      if (halladas.length) {
        const unicas = [...new Set(halladas)];
        sucias.push({ ruta, nombre, halladas: unicas.slice(0, 6), total: unicas.length });
      }
    }
  }
}

await navegador.close();

console.log(`${vistas} pantallas recorridas con la red cortada`);
if (!sucias.length) {
  console.log('ninguna enseña una cifra: lo que no se puede leer, no se afirma');
  process.exit(0);
}
console.log(`\n${sucias.length} pantallas afirman una cifra que no han podido leer:\n`);
for (const s of sucias) {
  const mas = s.total > s.halladas.length ? ` … y ${s.total - s.halladas.length} más` : '';
  console.log(`  ${s.ruta.padEnd(30)} ${s.nombre.padEnd(14)} ${s.halladas.join(' · ')}${mas}`);
}
console.log('\nCon el backend caído sólo puede salir «—» y el motivo. Una cifra aquí es del prototipo.');
process.exit(1);
