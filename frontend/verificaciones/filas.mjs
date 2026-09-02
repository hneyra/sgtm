/**
 * Una fila que se abre con el ratón se abre con el teclado.
 *
 *   node verificaciones/filas.mjs
 *
 * Existe por el mismo motivo que `paleta.mjs`: esto ya se rompió, y no en un
 * rótulo. La ficha de un predio se abría pulsando una fila de «Predios
 * encontrados», y esa fila no se podía alcanzar con el teclado **por ninguna
 * vía** — ni con Tab, ni con Enter en la búsqueda, ni con las flechas, ni por la
 * paleta, que navega pantallas y no predios (#683). Detrás de esa fila están los
 * 123 campos de la ficha, su histórico y un acto irreversible.
 *
 * <h2>La regla, y por qué se mide así</h2>
 *
 * **Una `<tr>` que el ratón puede pulsar tiene que poder recibir el foco, o
 * contener algo que lo reciba.** No hay forma de preguntarle al DOM si un
 * elemento tiene `onClick` —React no lo publica como atributo—, así que lo que
 * se mira es lo que la propia pantalla usa para decir «esto se pulsa»:
 * `cursor: pointer` computado sobre la fila. Es la misma señal que ve quien
 * mueve el ratón por encima, así que una fila que la lleve y no sea alcanzable
 * es, exactamente, una promesa hecha al ratón y negada al teclado.
 *
 * Eso deja fuera las filas que sólo se leen —la inmensa mayoría—, y no hay
 * falsos positivos por hover: `cursor` se computa del estado en reposo.
 *
 * <h2>Y no basta con que reciba el foco</h2>
 *
 * Se comprueban tres cosas por fila pulsable, porque fallan por separado:
 *
 *   1. **Alcanzable**: la fila o algo dentro de ella tiene `tabIndex >= 0`.
 *   2. **Anunciada**: eso enfocable tiene un nombre accesible que **nombra el
 *      sujeto** —el código del predio, el del contribuyente— y no «fila 3». Un
 *      botón que se llama «Abrir» en veinte filas no dice cuál se abre.
 *   3. **Operable**: se recorre con Tab de verdad y se pulsa Enter, y el `h1`
 *      tiene que cambiar. Sin esto, un `tabIndex={0}` sin `onKeyDown` pasaría
 *      las dos primeras y seguiría siendo un callejón — que es la forma más
 *      probable de «arreglar» esto a medias.
 *
 * La tercera sólo se hace sobre la PRIMERA pantalla con filas pulsables de cada
 * módulo: operar las 65 con teclado cuesta minutos y lo que cambia entre filas
 * de la misma tabla no es el mecanismo.
 *
 * <h2>Exige `SGTM_TOKEN`, y por eso no está en CI</h2>
 *
 * Sin sesión ninguna tabla trae filas, así que la comprobación pasaría en verde
 * sin haber mirado una sola —medido: «0 filas pulsables», y verde—. Eso es
 * exactamente el modo de fallo que #625 cerró en `errores.mjs`: una verificación
 * que no encuentra su fuente **no se salta, falla**. Así que se exige el token y,
 * además, se exige haber medido al menos una fila.
 *
 * Su sitio es un trabajo con el compose levantado, como `flujos.mjs`, y no lo hay
 * todavía.
 */
import { chromium } from 'playwright-core';
import { rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const TOKEN = process.env.SGTM_TOKEN;

/* Los destinos salen del catálogo del producto, compilado con `esbuild`: es el
   mismo molde que `errores.mjs`, y evita una lista aquí dentro que se quedaría
   vieja en silencio. */
const salida = new URL('./.filas-modulos.mjs', import.meta.url);
await build({
  entryPoints: ['src/shell/modulos.ts'],
  outfile: salida.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  define: { 'import.meta.env': '{}' },
});
const { MODULOS } = await import(pathToFileURL(salida.pathname).href);
await rm(salida, { force: true });

if (!TOKEN) {
  console.error('Falta SGTM_TOKEN: sin sesion ninguna tabla trae filas, y esto pasaria en verde sin mirar ninguna.');
  process.exit(1);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
if (TOKEN) await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), TOKEN);
const pagina = await contexto.newPage();

const fallos = [];
let pulsables = 0;
let operadas = 0;

/** Lo que el lector de pantalla diría de un elemento, sin inventarlo. */
const NOMBRE = `(e) => {
  const propio = e.getAttribute('aria-label');
  if (propio !== null && propio.trim() !== '') return propio.trim();
  const descrito = e.getAttribute('aria-labelledby');
  if (descrito !== null) {
    const n = document.getElementById(descrito);
    if (n !== null) return n.innerText.trim();
  }
  return (e.innerText ?? '').trim();
}`;

const paradas = MODULOS.flatMap((m) => m.destinos.map((d) => `#/${m.k}/${d.k}`));
const yaOperado = new Set();

for (const ruta of paradas) {
  await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'domcontentloaded' });
  await pagina.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await pagina.waitForTimeout(1500);

  const filas = await pagina.evaluate(
    ([nombreDe]) => {
      const nombre = eval(nombreDe);
      const salida = [];
      for (const tr of document.querySelectorAll('main table tbody tr')) {
        if (getComputedStyle(tr).cursor !== 'pointer') continue;
        const dentro = [...tr.querySelectorAll('a[href], button, input, select, [tabindex]')].filter(
          (e) => Number(e.getAttribute('tabindex') ?? (e.tagName === 'A' || e.tagName === 'BUTTON' ? 0 : 0)) >= 0,
        );
        const propia = Number(tr.getAttribute('tabindex') ?? -1) >= 0;
        salida.push({
          /* Las celdas llegan separadas por TABULADORES en `innerText`, no por
             espacios: partir por espacios daba «001-0000006\t02/09/2026» como
             una sola palabra y ningún nombre podía contenerla. Medido. */
          texto: (tr.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
          fichas: (tr.innerText ?? '').split(/\s+/).filter((x) => x.length > 3),
          alcanzable: propia || dentro.length > 0,
          nombres: propia ? [nombre(tr)] : dentro.map(nombre),
        });
      }
      return salida;
    },
    [NOMBRE],
  );
  if (filas.length === 0) continue;
  pulsables += filas.length;

  /* 1 y 2, sobre todas las filas de la pantalla. */
  for (const f of filas) {
    if (!f.alcanzable) {
      fallos.push(`${ruta} · la fila «${f.texto}» se pulsa con el ratón y no recibe el foco por ninguna vía`);
      continue;
    }
    /* El nombre tiene que nombrar el sujeto. Se comprueba contra el propio texto
       de la fila: si el nombre accesible no contiene nada de lo que la fila
       enseña, está diciendo otra cosa —«Abrir», «fila 3»— y en veinte filas
       iguales eso no distingue ninguna. */
    /* Basta con que el nombre contenga UNA de las palabras que la fila enseña:
       eso separa «Abrir el recibo 001-0000006» de «Abrir» o de «fila 3», que es
       lo que se quiere, sin exigir que repita la fila entera. */
    const util = f.nombres.some((n) => f.fichas.some((x) => n.includes(x)));
    if (!util) {
      fallos.push(
        `${ruta} · la fila «${f.texto}» sí recibe el foco, y lo que se anuncia es ${JSON.stringify(f.nombres)}: no nombra el sujeto`,
      );
    }
  }

  /* 3, una vez por módulo: se opera de verdad. */
  const modulo = ruta.split('/')[1];
  if (yaOperado.has(modulo)) continue;
  yaOperado.add(modulo);

  /* La huella de la pantalla: su texto MÁS el valor de cada control. No basta el
     `h1` — en Tesorería la fila no navega, rellena la caja de búsqueda, y el
     valor de un `<input>` no está en `innerText`—, así que con el `h1` solo esa
     pantalla salía roja por un motivo que no era el suyo. Medido. */
  const huella = () =>
    pagina.evaluate(() => {
      const m = document.querySelector('main');
      const controles = [...document.querySelectorAll('main input, main select, main textarea')].map((e) => e.value).join('|');
      return (m?.innerText ?? '') + '\u0000' + controles;
    });
  const antes = await huella();
  let abierto = false;
  for (let i = 0; i < 60 && !abierto; i++) {
    await pagina.keyboard.press('Tab');
    const enFila = await pagina.evaluate(() => {
      const a = document.activeElement;
      return a !== null && a.closest('main table tbody tr') !== null;
    });
    if (!enFila) continue;
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1600);
    abierto = (await huella()) !== antes;
    if (!abierto) {
      fallos.push(`${ruta} · con el foco en una fila, Enter no cambia nada de la pantalla: el gesto es un callejón`);
      break;
    }
    operadas++;
  }
  if (!abierto && !fallos.some((f) => f.startsWith(ruta))) {
    fallos.push(`${ruta} · el tabulador no llega a ninguna fila en 60 saltos`);
  }
}

console.log(
  `${paradas.length} pantallas recorridas · ${pulsables} fila(s) pulsable(s) con el ratón · ${operadas} abierta(s) con Enter`,
);
/* Cero filas medidas no es un aprobado: es que no se miró nada. */
if (pulsables === 0) {
  console.error('\nNinguna fila pulsable en las 65 pantallas: o la sesion no vale, o el padron esta vacio. No se ha medido nada.');
  await navegador.close();
  process.exit(1);
}
if (!fallos.length) {
  console.log('lo que se abre con el ratón se abre con el teclado, y se anuncia diciendo de qué');
  await navegador.close();
  process.exit(0);
}
console.log(`\n${fallos.length} problemas:\n`);
for (const f of fallos) console.log('  - ' + f);
await navegador.close();
process.exit(1);
