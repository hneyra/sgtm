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
import { rm } from 'node:fs/promises';
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

if (!fallos.length) {
  console.log(`${comprobados} opciones de «Tipo de acto», todas con su traducción; y ninguna traducción sobra`);
  process.exit(0);
}
console.log('vocabulario descuadrado entre la pantalla y el backend:\n');
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
