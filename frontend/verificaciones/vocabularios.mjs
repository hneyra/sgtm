/**
 * Los vocabularios cerrados del backend, contra lo que la pantalla ofrece.
 *
 *   node verificaciones/vocabularios.mjs
 *
 * Hay desplegables cuyas opciones el backend **no** admite tal cual, porque el
 * manual imprime el rótulo con su tilde y su guion —«DACIÓN EN PAGO»— y el
 * enumerado se llama de otra forma —`DACION_EN_PAGO`—. La interfaz traduce con
 * una tabla, y una tabla se queda vieja en silencio: basta con que alguien
 * añada un rótulo al desplegable para que esa opción se lleve un 422 que nombra
 * un valor que quien atiende acaba de elegir de una lista.
 *
 * Esto compara las DOS FUENTES REALES —el desplegable y la tabla, compilando
 * los módulos del árbol— y no una copia. Escrito de la otra forma no muerde:
 * la primera versión llevaba su propia copia de la tabla dentro, y quitarle una
 * entrada a la del producto la dejaba igual de verde.
 *
 * No necesita navegador ni backend.
 */
import { build } from 'esbuild';
import { readFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function cargar(entrada, nombre) {
  const salida = new URL(`./.${nombre}.mjs`, import.meta.url);
  /* `import.meta.env` es de Vite y aqui no existe: se sustituye al compilar,
     porque estos modulos lo leen al cargarse para saber a donde apunta el API.
     Lo que se mide no es eso. */
  await build({
    entryPoints: [entrada],
    outfile: salida.pathname,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    define: { 'import.meta.env': '{}' },
  });
  const modulo = await import(pathToFileURL(salida.pathname).href);
  await rm(salida, { force: true });
  return modulo;
}

const { TRANSFERENCIAS } = await cargar('src/datos/rentas.ts', 'datos-rentas');
const { TIPO_DE_TRANSFERENCIA_DEL_BACKEND } = await cargar('src/api/rentas.ts', 'api-rentas');

const fallos = [];
let comprobados = 0;

/* Los dos desplegables de «Tipo de acto»: el del predio y el del vehículo. */
for (const [clave, tramite] of Object.entries(TRANSFERENCIAS)) {
  for (const paso of tramite.pasos) {
    for (const campo of paso.campos ?? []) {
      if (!/tipo/i.test(campo.l ?? '') || !Array.isArray(campo.o)) continue;
      for (const rotulo of campo.o) {
        comprobados++;
        if (TIPO_DE_TRANSFERENCIA_DEL_BACKEND[rotulo] === undefined) {
          fallos.push(`${clave} · «${rotulo}» no tiene traducción al vocabulario del backend`);
        }
      }
    }
  }
}

/* Y al revés: una entrada que ya no ofrece ninguna pantalla es una traducción
   muerta, y una traducción muerta esconde que el rótulo cambió de nombre. */
const ofrecidos = new Set(
  Object.values(TRANSFERENCIAS).flatMap((t) =>
    t.pasos.flatMap((p) => (p.campos ?? []).filter((c) => /tipo/i.test(c.l ?? '') && Array.isArray(c.o)).flatMap((c) => c.o)),
  ),
);
for (const rotulo of Object.keys(TIPO_DE_TRANSFERENCIA_DEL_BACKEND)) {
  if (!ofrecidos.has(rotulo)) fallos.push(`la tabla traduce «${rotulo}» y ninguna pantalla lo ofrece`);
}

/* ── El tributo del libro, contra el enumerado de Java (#553) ───────────────

   `cuenta_corriente_asiento.tributo` es parte de la clave de una obligación, y
   `ClaveDeSaldo` la compara por igualdad exacta: **dos grafías del mismo
   tributo son dos deudas distintas**. Eso no era una hipótesis — el libro tenía
   `ARBITRIO` y `ARBITRIOS` a la vez, y el filtro «Arbitrios» de la consulta
   unificada no encontraba la deuda de arbitrios sembrada—, y `V74` lo cerró del
   lado de la base con un `CHECK`.

   Del lado de la pantalla lo que queda es que el desplegable del alta ofrezca
   sólo palabras que ese enumerado tiene. Si ofrece una que no está, el 422 llega
   nombrando un valor que quien atiende **acaba de elegir de una lista**; y si la
   grafía se desvía, el alta cae sobre una obligación que no es la que se ve.

   Se lee el fuente de Java, no una copia: una lista aquí dentro se quedaría
   vieja en el momento en que alguien añada el decimotercero.

   **Sólo en una dirección.** Los seis del desplegable son un subconjunto
   deliberado —los que un alta manual puede asentar—, así que un valor del
   enumerado que ninguna pantalla ofrezca NO es un defecto: `COSTAS PROCESALES`
   lo asienta la liquidación de costas y nadie lo teclea. */
const JAVA = 'backend/sgtm-cuentacorriente/src/main/java/pe/gob/sgtm/cuentacorriente/TributoDelLibro.java';
const fuente = await readFile(new URL(`../../${JAVA}`, import.meta.url), 'utf8');
const cuerpo = fuente.slice(fuente.indexOf('public enum TributoDelLibro {'), fuente.indexOf(';', fuente.indexOf('public enum')));
const DEL_LIBRO = new Set(
  [...cuerpo.matchAll(/^\s{4}([A-Z_]+)(?:\("([^"]+)"\))?,?\s*$/gm)].map((m) => m[2] ?? m[1]),
);
if (DEL_LIBRO.size < 5) {
  fallos.push(`no se pudo leer el enumerado de ${JAVA}: salieron ${DEL_LIBRO.size} valores`);
}

const { CAMPOS_DEL_ALTA } = await cargar('src/datos/rentas.ts', 'datos-rentas-alta');
const tributos = (CAMPOS_DEL_ALTA ?? []).find((c) => c.k === 'altaConcepto')?.o ?? [];
if (tributos.length === 0) fallos.push('no se encontró el desplegable de tributo del alta de deuda');
for (const t of tributos) {
  comprobados++;
  if (!DEL_LIBRO.has(t)) {
    fallos.push(`el alta de deuda ofrece «${t}» y TributoDelLibro no lo declara: el 422 nombraría lo que se acaba de elegir de la lista`);
  }
}

if (!fallos.length) {
  console.log(
    `${comprobados} opciones comprobadas · «Tipo de acto» con su traducción y sin traducciones que sobren · ` +
      `${tributos.length} tributos del alta, los ${DEL_LIBRO.size} del libro leídos del enumerado`,
  );
  process.exit(0);
}
console.log('vocabulario descuadrado entre la pantalla y el backend:\n');
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
