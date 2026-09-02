/**
 * La versión de Node se declara en dos sitios, y los dos tienen que decir lo mismo.
 *
 *   node verificaciones/node.mjs
 *
 * `.nvmrc` es lo que instalan CI y quien clona; `engines` de `package.json` es lo
 * que **yarn comprueba al instalar**. Si se desincronizan, CI instala una versión
 * que el propio proyecto rechaza —o, peor, una que acepta y que no es la que se
 * probó—, y el síntoma llega como una tanda de pruebas rojas cuyo mensaje no se
 * parece a la causa (#439, y el pendiente que #162 dejó abierto).
 *
 * <h2>De dónde sale el rango, medido y no elegido</h2>
 *
 * De lo que las dependencias piden, leído de sus propios `engines`:
 *
 * ```
 * vite            ^18.0.0 || ^20.0.0 || >=22.0.0    ← el que manda
 * playwright-core >=20                              ← el que descarta 18
 * esbuild, rollup >=18
 * typescript      >=14.17
 * react           >=0.10.0
 * ```
 *
 * La intersección es `^20 || >=22`, y se declara con los mínimos de parche que
 * Vite 6 pide en su documentación (`20.19` y `22.12`). **21 queda fuera** y no
 * por descuido: Vite no la admite, y es la clase de versión que alguien instala
 * sin pensar porque «es más nueva que la 20».
 *
 * <h2>Que la guarda muerde está medido, no supuesto</h2>
 *
 * Declarando `">=99.0.0"` y corriendo `yarn install --frozen-lockfile`:
 *
 * ```
 * error sgtm-frontend@0.1.0: The engine "node" is incompatible with this module.
 *       Expected version ">=99.0.0". Got "22.22.1"
 * error Found incompatible module.
 * ```
 *
 * Nombra las dos versiones, que es lo que el AC 2 pide. **Y con `npm` no pasa
 * nada** —`npm install --dry-run` no dijo una palabra— porque este proyecto se
 * instala con yarn; `engine-strict=true` en `.npmrc` está para quien llegue por
 * ahí, y no es lo que sujeta.
 *
 * No abre navegador ni necesita backend.
 */
import { readFile } from 'node:fs/promises';

const raiz = new URL('../', import.meta.url);
const nvmrc = (await readFile(new URL('.nvmrc', raiz), 'utf8')).trim();
const paquete = JSON.parse(await readFile(new URL('package.json', raiz), 'utf8'));
const rango = paquete.engines?.node;

const fallos = [];
if (rango === undefined) fallos.push('`package.json` no declara `engines.node`: yarn no comprueba nada al instalar');
if (nvmrc === '') fallos.push('`.nvmrc` está vacío');

/**
 * Si la versión que `.nvmrc` nombra cae dentro del rango declarado.
 *
 * Se comparan **mayores**, que es lo que `.nvmrc` nombra: «22» no dice qué parche
 * se instalará —lo elige `actions/setup-node`—, así que exigir el parche aquí
 * sería comprobar algo que este fichero no puede saber. Lo que sí puede saber, y
 * es lo que falla en la práctica, es que alguien escriba «18» o «21».
 */
function mayorAdmitido(mayor, r) {
  return r.split('||').some((parte) => {
    const t = parte.trim();
    const n = Number((t.match(/(\d+)/) ?? [])[1]);
    if (Number.isNaN(n)) return false;
    if (t.startsWith('^')) return mayor === n;
    if (t.startsWith('>=')) return mayor >= n;
    if (t.startsWith('>')) return mayor > n;
    return mayor === n;
  });
}

const mayor = Number(nvmrc.replace(/^v/, '').split('.')[0]);
if (rango !== undefined && !Number.isNaN(mayor) && !mayorAdmitido(mayor, rango)) {
  fallos.push(
    `«.nvmrc» dice Node ${nvmrc} y «engines.node» pide ${rango}: CI instalaría una versión que ` +
      'el propio proyecto rechaza al instalar, y el error llegaría como una tanda de pruebas rojas',
  );
}

/* Y que el rango siga cubriendo lo que las dependencias piden: si vite sube su
   mínimo y aquí no, se instala una versión que él no admite y el fallo aparece
   al compilar, no al instalar. Se lee de `node_modules`, que es lo que de verdad
   está puesto, y no de una copia. */
let deVite = null;
try {
  deVite = JSON.parse(await readFile(new URL('node_modules/vite/package.json', raiz), 'utf8')).engines?.node ?? null;
} catch {
  fallos.push('no se pudo leer `node_modules/vite/package.json`: sin él esta comprobación no mide nada');
}
if (deVite !== null && !mayorAdmitido(mayor, deVite)) {
  fallos.push(`vite pide Node ${deVite} y «.nvmrc» dice ${nvmrc}: la versión que CI instala no la admite vite`);
}

if (!fallos.length) {
  console.log(`.nvmrc dice ${nvmrc} · engines pide ${rango} · vite pide ${deVite ?? '—'}: los tres cuadran`);
  process.exit(0);
}
console.log(`${fallos.length} problemas con la versión de Node:\n`);
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
