/**
 * Lo que cada pantalla dice que NO puede hacer, y si lo dice de verdad.
 *
 *   node verificaciones/impedimentos.mjs
 *
 * Los otros tres arneses miran lo que la interfaz **enseña**: que dibuja
 * (`mirar`), que no inventa cifras (`sin-red`) y que se opera con el teclado
 * (`paleta`). Ninguno mira lo que la interfaz **no hace**, y ahi es donde vive
 * la mitad de este producto: de los 65 destinos, muchos tienen actos que el
 * backend todavia no sirve o que le faltan campos, y lo unico que separa una
 * pantalla honesta de una rota es que su boton apagado **diga por que**.
 *
 * <h2>Lo que se comprueba</h2>
 *
 *   1. **Ningun boton apagado esta mudo.** Un `disabled` sin `title` ni
 *      `aria-describedby` es un callejon: quien lo pulsa no sabe si le falta
 *      rellenar algo, si no tiene permiso, o si el sistema no sabe hacerlo. Es
 *      RNF-082 —un dato al que solo se llega pasando el raton no esta
 *      disponible para quien usa el teclado— aplicado a la causa de un acto.
 *   2. **Ningun motivo esta vacio o es un relleno.** «No disponible», «Proximo»
 *      y «En construccion» no dicen nada: no nombran el dato que falta, ni la
 *      llave que hay que publicar, ni el permiso que hace falta.
 *   3. **Ningun motivo promete una fecha.** «Proximamente», «en la siguiente
 *      version», «pronto»: nadie puede sostener eso desde una pantalla, y quien
 *      lo lee planifica con ello.
 *
 * <h2>Lo que NO se comprueba, y por que</h2>
 *
 * **Que el motivo sea cierto.** Eso no lo puede medir un navegador: exige leer
 * el controlador. Lo que este arnes sujeta es que exista y que diga algo; que
 * diga la verdad lo sujeta la revision, y cuando se ha medido queda escrito en
 * el comentario del codigo.
 *
 * Necesita la vista previa levantada. No necesita token: un boton apagado por
 * falta de sesion tambien tiene que decirlo.
 */
import { chromium } from 'playwright-core';
import { rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const temporal = new URL('./.modulos-impedimentos.mjs', import.meta.url);
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
const TOKEN = process.env.SGTM_TOKEN;
const soloModulo = process.argv[2];

/* Las palabras que no dicen nada. Un motivo que sea SOLO una de estas —o que
   empiece por ella y no anada nada— es un relleno: no nombra el dato que falta,
   ni la llave, ni el permiso. */
const RELLENOS = [
  /^no disponible\.?$/i,
  /^en construcci[oó]n\.?$/i,
  /^pr[oó]xima?mente\.?$/i,
  /^no implementado\.?$/i,
  /^pendiente\.?$/i,
  /^—$/,
];

/* Y las que prometen una fecha que nadie puede sostener desde una pantalla. */
const PROMESAS = /pr[oó]ximamente|en la (siguiente|pr[oó]xima) versi[oó]n|muy pronto|proximo release/i;

const nav = await chromium.launch();
const contexto = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
if (TOKEN) await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), TOKEN);

const mudos = [];
const rellenos = [];
const promesas = [];
let apagados = 0;
let vistas = 0;

for (const m of MODULOS) {
  if (soloModulo && m.k !== soloModulo) continue;
  /* Los destinos del carril **y** la accion del panel y su documento, igual que
     `sin-red`: enumerando solo `m.destinos` esto seria ciego a las altas y a las
     hojas imprimibles, que es justo donde mas actos apagados hay. */
  const paradas = [
    ...m.destinos.map((d) => d.k),
    ...(m.accion ? [m.accion.k] : []),
    ...(m.documento ? [m.documento.k] : []),
  ];
  for (const d of paradas.length ? paradas : ['']) {
    const ruta = d ? `/${m.k}/${d}` : `/${m.k}`;
    const pagina = await contexto.newPage();
    try {
      await pagina.goto(`${BASE}/#${ruta}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await pagina.waitForTimeout(900);
    } catch {
      await pagina.close();
      continue;
    }
    vistas++;

    const encontrados = await pagina.evaluate(() => {
      const salida = [];
      for (const b of document.querySelectorAll('button')) {
        const apagado = b.disabled || b.getAttribute('aria-disabled') === 'true';
        if (!apagado) continue;
        const rotulo = (b.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (rotulo === '') continue;
        /* Un boton cuyo PROPIO texto lleva la explicacion dentro no esta mudo, y
           los hay: los pasos del alta de una sancion dicen «Se habilita cuando la
           notificacion este registrada. Sin notificacion previa el procedimiento
           sancionador es nulo» en el propio boton. El limite de 60 caracteres
           separa un rotulo de una frase; es una heuristica y por eso se dice, en
           vez de dejarla pasar por criterio. */
        if (rotulo.length > 60) continue;
        /* El motivo puede estar en el `title` o en el elemento al que apunta
           `aria-describedby` — las dos formas valen y las dos las lee un lector
           de pantalla; lo que no vale es ninguna. */
        const descrito = b.getAttribute('aria-describedby');
        const porDescripcion = descrito
          ? descrito
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
          : '';
        salida.push({ rotulo, motivo: ((b.getAttribute('title') ?? '') + ' ' + porDescripcion).trim() });
      }
      return salida;
    });

    for (const { rotulo, motivo } of encontrados) {
      apagados++;
      if (motivo === '') mudos.push(`${ruta} · «${rotulo}»`);
      else if (RELLENOS.some((r) => r.test(motivo))) rellenos.push(`${ruta} · «${rotulo}» → «${motivo}»`);
      else if (PROMESAS.test(motivo)) promesas.push(`${ruta} · «${rotulo}» → «${motivo}»`);
    }
    await pagina.close();
  }
}

await nav.close();

console.log(`${vistas} pantallas recorridas · ${apagados} acto(s) apagado(s)`);

const fallos = [];
if (mudos.length) fallos.push(`${mudos.length} apagado(s) SIN motivo:\n  ${mudos.join('\n  ')}`);
if (rellenos.length) fallos.push(`${rellenos.length} con un motivo que no dice nada:\n  ${rellenos.join('\n  ')}`);
if (promesas.length) fallos.push(`${promesas.length} prometiendo una fecha:\n  ${promesas.join('\n  ')}`);

if (fallos.length) {
  console.error(`\n${fallos.join('\n\n')}`);
  process.exit(1);
}
console.log('todos dicen por qué: ninguno mudo, ninguno con relleno, ninguno prometiendo fecha');
