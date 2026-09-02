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

/**
 * Las constantes de un `enum` de Java, leidas de su propio archivo.
 *
 * Se lee el fuente y no una copia por lo mismo que la tabla se compila en vez
 * de repetirse aqui: una lista escrita en este archivo se queda vieja el dia
 * que el enumerado gana un valor, y entonces la comprobacion pasa a medir dos
 * copias suyas. El cuerpo de un `enum` de este proyecto son constantes en
 * MAYUSCULAS separadas por comas hasta el primer `;`.
 */
async function constantesDelEnum(rutaJava) {
  const crudo = await readFile(new URL(`../../${rutaJava}`, import.meta.url), 'utf8');
  /* Los comentarios se quitan ANTES de buscar el `;` que cierra las constantes:
     los javadoc de estos enumerados llevan punto y coma dentro, y cortar por el
     primero dejaba fuera las tres ultimas —medido: `SUCESION`, `REMATE` y
     `HERENCIA` salian como «que TipoTransferencia no declara»—. */
  const fuente = crudo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const abre = fuente.indexOf('{', fuente.indexOf('enum '));
  const cierra = fuente.indexOf(';', abre);
  if (abre < 0 || cierra < 0) throw new Error(`no se pudo leer el enumerado de ${rutaJava}`);
  const constantes = fuente
    .slice(abre + 1, cierra)
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^[A-Z][A-Z0-9_]*$/.test(t));
  if (!constantes.length) throw new Error(`el enumerado de ${rutaJava} salio vacio`);
  return constantes;
}

const CAUSALES_DEL_BACKEND = await constantesDelEnum(
  'backend/sgtm-cuentacorriente/src/main/java/pe/gob/sgtm/cuentacorriente/CausalDeBaja.java',
);
const TIPOS_DEL_BACKEND = await constantesDelEnum(
  'backend/sgtm-rentas/src/main/java/pe/gob/sgtm/rentas/dominio/TipoTransferencia.java',
);

const { TRANSFERENCIAS, CAMPOS_DE_LA_BAJA } = await cargar('src/datos/rentas.ts', 'datos-rentas');
const { TIPO_DE_TRANSFERENCIA_DEL_BACKEND, CAUSAL_DE_BAJA_DEL_BACKEND } = await cargar(
  'src/api/rentas.ts',
  'api-rentas',
);

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

/* El desplegable «Causal» de la baja de deuda, contra `CausalDeBaja` (#684).
   Mismo mecanismo y por el mismo motivo: hasta #684 la causal viajaba dentro
   del texto de la observación y no había vocabulario que descuadrar; ahora es
   un campo con su `CHECK`, y una entrada de menos en la tabla deja una opción
   del manual llevándose un 422 después de rellenar el formulario. La opción
   vacía no cuenta: nace vacía desde #636 y la primaria está apagada sin causal. */
const causalesDelManual = (CAMPOS_DE_LA_BAJA.find((c) => c.k === 'causal')?.o ?? []).filter((o) => o !== '');
if (!causalesDelManual.length) {
  fallos.push('la pantalla de baja de deuda no ofrece ninguna causal: el desplegable «Causal» desapareció');
}
for (const rotulo of causalesDelManual) {
  comprobados++;
  if (CAUSAL_DE_BAJA_DEL_BACKEND[rotulo] === undefined) {
    fallos.push(`baja de deuda · «${rotulo}» no tiene traducción al vocabulario del backend`);
  }
}
for (const rotulo of Object.keys(CAUSAL_DE_BAJA_DEL_BACKEND)) {
  if (!causalesDelManual.includes(rotulo)) {
    fallos.push(`la tabla de causales traduce «${rotulo}» y la pantalla de baja no lo ofrece`);
  }
}

/* Y la tercera direccion, que es la que el nombre de este arnes promete y no
   se estaba comprobando: el VALOR al que se traduce tiene que existir en el
   enumerado del backend. Medido antes de escribirla: cambiar
   `'ERROR MATERIAL': 'ERROR_MATERIAL'` por `'ERROR_DE_TRANSCRIPCION'` dejaba
   las dos direcciones anteriores en VERDE —el rotulo sigue en el desplegable y
   sigue en la tabla— y la pantalla mandaba un valor que el `CHECK` de la base
   rechaza, con un 422 despues de rellenar el formulario. Es el mismo hueco por
   los dos vocabularios, asi que se cierra por los dos. */
for (const [rotulo, valor] of Object.entries(CAUSAL_DE_BAJA_DEL_BACKEND)) {
  if (!CAUSALES_DEL_BACKEND.includes(valor)) {
    fallos.push(
      `baja de deuda · «${rotulo}» se traduce a «${valor}», que CausalDeBaja no declara`,
    );
  }
}
for (const [rotulo, valor] of Object.entries(TIPO_DE_TRANSFERENCIA_DEL_BACKEND)) {
  if (!TIPOS_DEL_BACKEND.includes(valor)) {
    fallos.push(
      `transferencias · «${rotulo}» se traduce a «${valor}», que TipoTransferencia no declara`,
    );
  }
}

if (!fallos.length) {
  console.log(
    `${comprobados} opciones de «Tipo de acto» y «Causal», todas con su traducción; y ninguna traducción sobra`,
  );
  process.exit(0);
}
console.log('vocabulario descuadrado entre la pantalla y el backend:\n');
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
