/**
 * La paleta de comandos, sólo con el teclado.
 *
 *   node verificaciones/paleta.mjs
 *
 * Existe porque esto ya se rompió una vez. La paleta se abre con Ctrl-K, se
 * teclea para filtrar… y sin flechas ni Intro no hay forma de elegir nada: el
 * atajo lleva a un callejón. Quien navega con teclado —y quien no tiene ratón a
 * mano en una ventanilla— se queda fuera del acceso rápido a los 134 destinos.
 *
 * Lo que comprueba, en orden:
 *
 *   1. Ctrl-K abre.
 *   2. ↓ y ↑ mueven el foco, y ↑ vuelve donde estaba.
 *   3. Al filtrar, el foco vuelve al primero. **Este caso hay que medirlo con
 *      VARIOS resultados**: con uno solo, acotar el índice al último ya salva
 *      la situación y la comprobación pasaría con la guarda quitada.
 *   4. Intro abre la entrada enfocada —no la primera de la lista anterior— y
 *      cierra la paleta.
 *
 * Necesita la vista previa levantada y `SGTM_TOKEN`.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const TOKEN = process.env.SGTM_TOKEN;

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
if (TOKEN) await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), TOKEN);
const pagina = await contexto.newPage();
await pagina.goto(`${BASE}/#/catastro/panel`, { waitUntil: 'domcontentloaded' });
await pagina.waitForTimeout(1200);

const fallos = [];
const enfocada = () => pagina.locator('[role=option][aria-selected=true]').first().innerText();
const rotulo = (t) => t.split('\n')[0];

await pagina.keyboard.press('Control+k');
await pagina.waitForTimeout(300);
if (!(await pagina.locator('[role=listbox]').count())) fallos.push('Ctrl-K no abre la paleta');

const uno = await enfocada().catch(() => '');
await pagina.keyboard.press('ArrowDown');
await pagina.waitForTimeout(120);
const dos = await enfocada();
await pagina.keyboard.press('ArrowDown');
await pagina.waitForTimeout(120);
const tres = await enfocada();
await pagina.keyboard.press('ArrowUp');
await pagina.waitForTimeout(120);
const vuelta = await enfocada();
if (uno === dos || dos === tres) fallos.push('las flechas no mueven el foco');
if (vuelta !== dos) fallos.push('↑ no vuelve a la entrada anterior');

/* Filtrar a VARIOS: es el único caso que distingue tener la guarda de no tenerla. */
await pagina.keyboard.type('fic');
await pagina.waitForTimeout(400);
const cuantos = await pagina.locator('[role=option]').count();
const primera = await pagina.locator('[role=option]').first().innerText();
const trasFiltrar = await enfocada();
if (cuantos < 2) fallos.push(`el filtro «fic» debería dejar varias entradas, dejó ${cuantos}`);
else if (trasFiltrar !== primera) fallos.push(`al filtrar, el foco se queda en una fila que nadie eligió: ${rotulo(trasFiltrar)}`);
for (let i = 0; i < 3; i++) await pagina.keyboard.press('Backspace');
await pagina.waitForTimeout(300);

/* Y que Intro abra la enfocada, con el filtro puesto. */
await pagina.keyboard.type('mapa');
await pagina.waitForTimeout(400);
const elegida = rotulo(await enfocada());
await pagina.keyboard.press('Enter');
await pagina.waitForTimeout(700);
const destino = new URL(pagina.url()).hash;
if (!/mapa/i.test(destino)) fallos.push(`Intro no abrió «${elegida}»: fue a ${destino}`);
if (await pagina.locator('[role=listbox]').count()) fallos.push('la paleta no se cierra al elegir');

await navegador.close();

if (!fallos.length) {
  console.log('la paleta se opera sólo con el teclado: abre, mueve, filtra y elige');
  process.exit(0);
}
console.log('la paleta no se puede operar con el teclado:\n');
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
