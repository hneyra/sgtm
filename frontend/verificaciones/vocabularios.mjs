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
  /* El `;` que cierra las constantes **es opcional en Java**, y sin miembros no
     se escribe: `Hallazgo` no lo tiene, y buscarlo a secas devolvia -1 y hacia
     reventar el arnes con «no se pudo leer el enumerado» sobre un archivo
     perfectamente legible. Se corta por el primero de los dos —el `;` o la llave
     que cierra el cuerpo—, que con miembros siempre es el `;` (va antes que la
     llave de cualquier metodo) y sin ellos es la llave. */
  const puntoYComa = fuente.indexOf(';', abre);
  const llave = fuente.indexOf('}', abre);
  const cierra = puntoYComa < 0 ? llave : llave < 0 ? puntoYComa : Math.min(puntoYComa, llave);
  if (abre < 0 || cierra < 0) throw new Error(`no se pudo leer el enumerado de ${rutaJava}`);
  const constantes = fuente
    .slice(abre + 1, cierra)
    .split(',')
    /* Una constante puede llevar argumentos de constructor —`EN_PROCESO("EN
       PROCESO")`—, y lo que aqui interesa es el NOMBRE, que es lo que `.name()`
       publica y lo que la pantalla manda. Sin recortar por el parentesis, un
       enumerado con etiqueta salia con CERO constantes y el arnes reventaba con
       «salio vacio» sobre un archivo perfectamente legible: `EstadoDeLiquidacion`
       es el primero de este proyecto que las tiene. Los tres enumerados que ya
       se leian aqui no las llevan, asi que para ellos no cambia nada. */
    .map((t) => t.trim().split('(')[0].trim())
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

/* ── El hallazgo del acta de inspección, contra `Hallazgo` (#431) ───────────

   Aquí **no hay tabla que comprobar, y ése es el resultado**: el desplegable
   «Hallazgo principal» del manual ofrece seis rótulos y ninguno de los seis es
   ninguno de los cinco del enumerado —los seis contestan 422 «Hallazgo
   desconocido», medido uno a uno—, así que la decisión fue no traducir ninguno
   y ofrecer los valores del backend letra por letra (#427, #546).

   Una decisión así se deshace sola: basta con que a alguien le parezca poco
   legible `USO_DISTINTO` y le ponga su rótulo del manual al lado, y el 422
   vuelve nombrando lo que quien atiende acaba de elegir de una lista. Y aquí
   duele más que en un filtro: `hallazgo` es **opcional** en el cuerpo del acta,
   así que un valor que el enumerado no reconoce no deja una lista vacía sino un
   acta registrada sin hallazgo — una inspección sin conclusión.

   Las dos direcciones, contra el fuente de Java y no contra una copia: un valor
   de más aquí es ese 422; uno de menos es un hallazgo que la pantalla no deja
   anotar, y desde #599 el enumerado ya ganó uno (`USO_DISTINTO`) sin que nada
   obligara a ofrecerlo. */
const HALLAZGOS_DEL_BACKEND = await constantesDelEnum(
  'backend/sgtm-fiscalizacion/src/main/java/pe/gob/sgtm/fiscalizacion/dominio/Hallazgo.java',
);
const { HALLAZGOS_DEL_ACTA } = await cargar('src/datos/fiscalizacion.ts', 'datos-fiscalizacion');
if (!Array.isArray(HALLAZGOS_DEL_ACTA) || HALLAZGOS_DEL_ACTA.length === 0) {
  fallos.push('el acta de inspección no ofrece ningún hallazgo: el desplegable «Hallazgo principal» desapareció');
}
for (const valor of HALLAZGOS_DEL_ACTA ?? []) {
  comprobados++;
  if (!HALLAZGOS_DEL_BACKEND.includes(valor)) {
    fallos.push(`acta de inspección · ofrece «${valor}» y Hallazgo no lo declara: 422 «Hallazgo desconocido» tras rellenar el formulario`);
  }
}
for (const valor of HALLAZGOS_DEL_BACKEND) {
  if (!(HALLAZGOS_DEL_ACTA ?? []).includes(valor)) {
    fallos.push(`Hallazgo declara «${valor}» y el acta de inspección no lo ofrece: un hallazgo que nadie puede anotar`);
  }
}

/* ── Los dos vocabularios de la liquidacion de fiscalizacion (#49) ──────────

   Los estrena la conexion de las tres escrituras de la liquidacion, y los dos
   son cerrados y **de escritura**: `nuevoEstado` decide a que estado se mueve
   una liquidacion notificada y `tipoDeFiscalizacion` queda impreso en lo que
   sustenta la determinacion.

   Aqui, al reves que con el hallazgo, el prototipo y los enumerados coinciden
   —el artboard de `fisc_historico` ofrece los cinco estados y los cuatro tipos,
   y los enumerados se escribieron a partir de esa lista—, asi que tampoco hay
   tabla de traduccion que comprobar: la lista ES la del backend. Lo que puede
   romperse es que se desvie, y es lo que se mide, en las dos direcciones.

   Y duele por los dos lados. Uno de mas: el 422 llega nombrando un valor que
   quien atiende **acaba de elegir de una lista** —medido, «INTEGRAL» contesta
   «Tipo de fiscalizacion desconocido»—. Uno de menos: un estado al que ninguna
   liquidacion se puede mover, y ahi el sintoma es que la pantalla sencillamente
   no lo ofrece — no hay ningun error que lo delate. */
const ESTADOS_DEL_BACKEND = await constantesDelEnum(
  'backend/sgtm-fiscalizacion/src/main/java/pe/gob/sgtm/fiscalizacion/dominio/EstadoDeLiquidacion.java',
);
const TIPOS_DE_FISCALIZACION_DEL_BACKEND = await constantesDelEnum(
  'backend/sgtm-fiscalizacion/src/main/java/pe/gob/sgtm/fiscalizacion/dominio/TipoDeFiscalizacion.java',
);
const { ESTADOS_DE_LIQUIDACION_DEL_BACKEND, TIPOS_DE_FISCALIZACION } = await cargar(
  'src/datos/fiscalizacion.ts',
  'datos-fiscalizacion-liquidacion',
);

for (const [que, deLaPantalla, deJava, java] of [
  ['estado de liquidación', ESTADOS_DE_LIQUIDACION_DEL_BACKEND, ESTADOS_DEL_BACKEND, 'EstadoDeLiquidacion'],
  ['tipo de fiscalización', TIPOS_DE_FISCALIZACION, TIPOS_DE_FISCALIZACION_DEL_BACKEND, 'TipoDeFiscalizacion'],
]) {
  if (!Array.isArray(deLaPantalla) || deLaPantalla.length === 0) {
    fallos.push(`la liquidación de fiscalización no ofrece ningún ${que}: el desplegable desapareció`);
    continue;
  }
  for (const valor of deLaPantalla) {
    comprobados++;
    if (!deJava.includes(valor)) {
      fallos.push(`liquidación · ofrece el ${que} «${valor}» y ${java} no lo declara: 422 tras rellenar el formulario`);
    }
  }
  for (const valor of deJava) {
    if (!deLaPantalla.includes(valor)) {
      fallos.push(`${java} declara «${valor}» y la liquidación no lo ofrece: un ${que} al que nadie puede llegar`);
    }
  }
}

if (!fallos.length) {
  console.log(
    `${comprobados} opciones de «Tipo de acto», «Causal», «Hallazgo», «Estado de liquidación» y «Tipo de fiscalización», ` +
      `todas con su traducción o su constante y ninguna que sobre · ` +
      `${tributos.length} tributos del alta, los ${DEL_LIBRO.size} del libro leídos del enumerado`,
  );
  process.exit(0);
}
console.log('vocabulario descuadrado entre la pantalla y el backend:\n');
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
