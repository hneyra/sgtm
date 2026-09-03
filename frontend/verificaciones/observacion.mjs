/**
 * Una observacion de cuatro caracteres no habilita nada.
 *
 *   node verificaciones/observacion.mjs
 *
 * La regla 10 y RNF-052 exigen que **toda modificacion de datos lleve la
 * observacion de quien la hace**, y este producto la pide en cada acto. Lo que
 * ninguna pantalla comprobaba es **cuanta**: `Observacion.de` rechaza por debajo
 * de cinco caracteres —«La observacion debe explicar el cambio: al menos 5
 * caracteres, y no espacios en blanco (ADR-0008)»— y la tabla de auditoria lo
 * repite con un `CHECK (length(btrim(observacion)) >= 5)`, asi que la barrera
 * no es una preferencia de la interfaz: es del dominio y de la base.
 *
 * Medido contra el backend en marcha:
 *
 *     POST /fiscalizacion/liquidaciones  {"observacion":"abcd"}
 *       -> 422 «La observacion debe explicar el cambio: al menos 5 caracteres…»
 *
 * <h2>Por que hace falta un arnes y no basta con arreglarlo</h2>
 *
 * Porque **la mitad del producto lo tenia mal y nadie lo veia**. Censado el dia
 * que se escribio esto: doce caminos de escritura en tres modulos —Seguridad,
 * Catastro y Rentas— guardaban con `observacion.trim() !== ''`, o sea
 * habilitaban la primaria con **un solo caracter**; Transito, Sanciones y
 * Coactiva ya comparaban contra 5. Las dos formas conviven en el mismo arbol y
 * se leen igual de bien, asi que la equivocada se vuelve a escribir sola.
 *
 * Y el sintoma es de los peores: la primaria se enciende, quien atiende la
 * pulsa, el acto sale, el servidor lo rechaza y lo que vuelve es un 422. No se
 * pierde nada —eso lo impide el backend— pero se promete un acto que no se
 * puede hacer, que es lo que #332 llamo «un acto que promete lo que no puede».
 *
 * <h2>Es un escaner de fuentes, y no un navegador. Se intento al reves primero</h2>
 *
 * La primera version operaba el navegador: buscaba la caja por su rotulo,
 * tecleaba cuatro caracteres y miraba si algun boton apagado se encendia. **No
 * podia fallar, y eso se midio antes de enviarla.** De los 65 destinos solo
 * ocho dibujan una caja de observacion sin sujeto, y en las ocho la primaria
 * sigue apagada **por otro motivo** —no hay contribuyente, no hay fila marcada,
 * no hay expediente abierto—, asi que la guarda de la observacion nunca es la
 * que decide y su efecto no se puede observar. Devolver una guarda mala a
 * Sanciones dejaba el arnes en VERDE.
 *
 * Las que hay que vigilar son justo las que exigen sujeto, y llegar a ellas
 * pide un padron sembrado, un token y saber, pantalla por pantalla, que hay que
 * rellenar antes. Eso no es un arnes: es doce arneses.
 *
 * Asi que se mira el fuente, que es donde la guarda esta escrita — el mismo
 * reparto que el backend hace con `SET SESSION`, con el `DELETE` sobre tabla
 * protegida y con los literales de la regla 5: lo que un navegador no puede
 * alcanzar lo alcanza un escaner, y lo dice sin depender de que haya datos.
 *
 * <h2>Lo que se busca</h2>
 *
 * Un identificador que hable de la observacion comparado contra la **cadena
 * vacia**: `observacion.trim() === ''`, `observacionDelActo !== ''`. Todos ellos
 * habilitan con un solo caracter. Lo correcto es comparar contra el largo:
 * `.trim().length >= 5` o `< 5`, que es lo que Transito, Sanciones y Coactiva ya
 * hacian el dia que esto se escribio.
 *
 * <h2>Su limite, dicho</h2>
 *
 * Ve la forma, no el efecto: una guarda escrita bien que despues no se use no
 * la caza nadie. Y solo mira `src/modulos/` y `src/api/`, que es donde viven las
 * guardas de acto. A cambio, cubre **todas** las pantallas, tengan o no datos
 * delante, que es lo que el navegador no podia.
 *
 * No abre navegador y no necesita backend.
 */
import { readFile, readdir } from 'node:fs/promises';

const RAIZ = new URL('../', import.meta.url);

/** Lo que el dominio exige, y lo que la base repite con un `CHECK`. */
const LARGO_MINIMO = 5;

/**
 * Un identificador que habla de la observacion, comparado contra la cadena
 * vacia. Cubre las dos direcciones y el `.trim()` opcional, que es como se
 * escriben las doce del arbol.
 */
const GUARDA_FLOJA = /\b\w*[Oo]bservaci[oó]n\w*\b(\s*\.\s*trim\s*\(\s*\))?\s*(===|!==|==|!=)\s*(''|""|``)/g;

/** Y la que sí sirve, para poder decir cuántas hay bien. */
const GUARDA_BUENA = /\b(\w*[Oo]bservaci[oó]n\w*|obs)\b(\s*\.\s*trim\s*\(\s*\))?\s*\.\s*length\s*(>=|<|>|<=)\s*\w|LARGO_MINIMO_DE_OBSERVACION/g;

async function fuentes(dir, acumulado = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const hijo = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
    if (e.isDirectory()) await fuentes(hijo, acumulado);
    else if (/\.tsx?$/.test(e.name)) acumulado.push(hijo);
  }
  return acumulado;
}

/**
 * Lo que se compara contra la cadena vacia **a proposito**, con su motivo.
 *
 * No toda comparacion es una guarda de acto: `hayBorradorDelExpediente`
 * pregunta si el usuario ha escrito ALGO para decidir si sale la barra de
 * guardado, y ahi el largo no pinta nada — con dos caracteres tecleados la
 * barra tiene que salir igual, o el borrador se pierde sin avisar.
 *
 * La lista es corta y tiene que seguir siendolo: cada entrada apaga una
 * comprobacion, asi que se declara con el fichero y el fragmento que exime, y
 * **si el fragmento deja de estar, la entrada es rancia y esto se pone rojo**.
 * Es la misma regla que `prosa.mjs` aplica a su lista.
 */
const NO_ES_UNA_GUARDA_DE_ACTO = [
  {
    donde: 'src/modulos/rentas/Rentas.tsx',
    fragmento: "observacionDeLaCorreccion !== ''",
    porque: 'Pregunta si hay borrador para sacar la barra de guardado, no habilita ningun acto.',
  },
];

const flojas = [];
const exentasVistas = new Set();
let buenas = 0;
let mirados = 0;

for (const carpeta of ['src/modulos/', 'src/api/']) {
  for (const f of (await fuentes(new URL(carpeta, RAIZ))).sort()) {
    const texto = await readFile(f, 'utf8');
    const relativa = f.pathname.slice(RAIZ.pathname.length);
    mirados++;
    for (const m of texto.matchAll(GUARDA_BUENA)) buenas++;
    for (const m of texto.matchAll(GUARDA_FLOJA)) {
      const linea = texto.slice(0, m.index).split('\n').length;
      const fragmento = m[0].replace(/\s+/g, ' ');
      const exenta = NO_ES_UNA_GUARDA_DE_ACTO.find((e) => e.donde === relativa && e.fragmento === fragmento);
      if (exenta !== undefined) {
        exentasVistas.add(exenta);
        continue;
      }
      flojas.push({ donde: `${relativa}:${linea}`, fragmento });
    }
  }
}

/* Una exencion que ya no exime nada vigila una comparacion que nadie hace: hay
   que quitarla, no dejarla ahi diciendo que algo esta decidido. */
const rancias = NO_ES_UNA_GUARDA_DE_ACTO.filter((e) => !exentasVistas.has(e));
for (const e of rancias) {
  flojas.push({
    donde: e.donde,
    fragmento: `ENTRADA RANCIA: ya no dice «${e.fragmento}», así que su exención sobra`,
  });
}

console.log(
  `${mirados} fuentes · ${buenas} guarda(s) por largo · ${flojas.length} contra la cadena vacía · ` +
    `${exentasVistas.size} de ${NO_ES_UNA_GUARDA_DE_ACTO.length} exención(es) declarada(s) en pie`,
);
/* Cero de las dos no es un aprobado: es que el patrón dejó de encontrar su
   fuente, y entonces esto pasa en verde sin haber mirado ninguna guarda. */
if (buenas + flojas.length === 0) {
  console.error('\nNinguna guarda de observación en `src/modulos/` ni en `src/api/`: el patrón no encontró su fuente. No se ha medido nada.');
  process.exit(1);
}
if (!flojas.length) {
  console.log(`ninguna habilita su acto con menos de ${LARGO_MINIMO}: lo que se enciende, el servidor lo acepta`);
  process.exit(0);
}
console.log(`\n${flojas.length} guarda(s) habilitan un acto con una observación que el servidor rechaza:\n`);
for (const x of flojas) console.log(`  ${x.donde.padEnd(46)} ${x.fragmento}`);
console.log(
  `\n\`Observacion.de\` exige ${LARGO_MINIMO} caracteres y la tabla de auditoría lo repite con un ` +
    'CHECK, así que la primaria se enciende, el acto sale y vuelve un 422.',
);
console.log("Guarda con `.trim().length >= 5`, no con `!== ''`.");
process.exit(flojas.length ? 1 : 0);
