/**
 * Recorre cada destino de cada módulo en un navegador de verdad y guarda una
 * captura, informando de cualquier error de consola. No compara con nada: sirve
 * para VER lo que se dibuja, que es lo que el objetivo de este frontend pide.
 *
 *   node verificaciones/mirar.mjs [modulo] [--alto=1600]
 *
 * Necesita una vista previa levantada (`yarn dev`) y el Chromium de Playwright.
 */
import { chromium } from 'playwright-core';
import { mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

/* El registro de módulos es la única fuente de las rutas: se compila al vuelo
   en vez de repetirlo aquí, porque una lista copiada se queda vieja sin ruido. */
const temporal = new URL('./.modulos.mjs', import.meta.url);
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
const SALIDA = process.env.SGTM_CAPTURAS ?? '.capturas';
const soloModulo = process.argv[2]?.startsWith('--') ? null : process.argv[2];
const alto = Number(process.argv.find((a) => a.startsWith('--alto='))?.slice(7) ?? 1600);

await mkdir(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: alto } });

const fallos = [];
let vistas = 0;

for (const m of MODULOS) {
  if (soloModulo && m.k !== soloModulo) continue;
  const paradas = [
    ...m.destinos.map((d) => d.k),
    ...(m.accion ? [m.accion.k] : []),
    ...(m.documento ? [m.documento.k] : []),
  ];
  for (const d of paradas.length ? paradas : ['panel']) {
    const errores = [];
    const oyeConsola = (msg) => msg.type() === 'error' && errores.push(msg.text());
    const oyePagina = (e) => errores.push('PAGEERROR: ' + e.message);
    pagina.on('console', oyeConsola);
    pagina.on('pageerror', oyePagina);
    await pagina.goto(`${BASE}/#/${m.k}/${d}`, { waitUntil: 'networkidle' });
    await pagina.waitForTimeout(700);
    await pagina.screenshot({ path: `${SALIDA}/${m.k}-${d}.png` });
    pagina.off('console', oyeConsola);
    pagina.off('pageerror', oyePagina);
    vistas++;
    if (errores.length) fallos.push(`${m.k}/${d}\n  ${errores.join('\n  ')}`);
    /* Una pantalla que no dibuja nada bajo el shell no falla: se queda en
       blanco, y eso no lo dice ningún error de consola. */
    const cuerpo = await pagina.locator('main').innerText().catch(() => '');
    if (cuerpo.trim().length < 40) fallos.push(`${m.k}/${d}\n  el <main> está prácticamente vacío`);
  }
}

await navegador.close();
console.log(`${vistas} pantallas recorridas · capturas en ${SALIDA}/`);
if (fallos.length) {
  console.error(`\n${fallos.length} con problema:\n\n${fallos.join('\n\n')}`);
  process.exit(1);
}
console.log('ninguna con errores de consola ni con el cuerpo vacío');
