/**
 * La prosa que habla del backend se comprueba contra el contrato.
 *
 *   node verificaciones/prosa.mjs
 *
 * Esta interfaz dice, en muchos sitios, **por qué no puede saber algo**: «el
 * padrón no publica su tipo», «no hay un endpoint que diga qué ha prescrito
 * ya», «ninguna lectura del contrato publica ese catálogo». Es lo que la hace
 * honesta y es una de sus mejores decisiones. Pero esas frases **son
 * afirmaciones sobre el backend, y envejecen exactamente igual que una cifra**
 * —con el agravante de que nadie las mira el día que el backend publica lo que
 * faltaba (#735).
 *
 * Un «—» con un motivo falso es **peor que un campo vacío**: un «—» honesto y
 * uno que se podía haber llenado se leen exactamente igual, así que la frase es
 * lo único que los separa. Cuando miente, quien atiende deja de buscar un dato
 * que sí existe y quien desarrolla no conecta una lectura que ya está
 * publicada. Por eso #687 se trató como un defecto y no como una mejora.
 *
 * <h2>La decisión: atar la frase a la operación, en las dos direcciones</h2>
 *
 * #735 planteaba tres formas y ésta es la primera. Las otras dos se
 * descartaron, y por qué:
 *
 *   - **Un censo con fecha de caducidad** («las frases que lleven N
 *     publicaciones del contrato sin revisar») no comprueba la verdad: sólo
 *     obliga a volver a mirar. Con el backend publicando ocho cosas al día,
 *     saltaría cada semana sobre frases correctas, y un arnés que grita en
 *     verde deja de leerse al segundo día — el modo de fallo que #437 midió al
 *     descartar ensanchar el patrón de la regla 5.
 *   - **Derivar del contrato lo que se pueda** sólo alcanza a lo que
 *     `PROCEDENCIA` ya asocia campo a campo, que es **un** módulo de doce.
 *
 * Las dos direcciones:
 *
 *   1. **Positiva.** Toda ruta que la prosa nombra afirmativamente —«sale de
 *      `GET /catastro/fichas/urbana`»— tiene que existir en el contrato **con
 *      ese verbo**. Son las ~290 menciones `VERBO /ruta` del árbol.
 *   2. **Negativa.** Toda afirmación de que algo **no** se publica tiene que
 *      nombrar **qué operación lo publicaría**, y el arnés comprueba que esa
 *      operación **sigue sin estar** en el contrato. El día que el backend la
 *      publique, rojo nombrando el fichero. Es lo que caza los cinco casos de
 *      #735, porque **los cinco se volvieron falsos por lo mismo: el backend
 *      publicó una operación.**
 *
 * Y las dos se sostienen entre sí: `LO_QUE_NADIE_PUBLICA` **es** la lista de
 * exenciones de la dirección positiva. Una ruta que la prosa nombra o existe en
 * el contrato, o está declarada aquí como deliberadamente ausente; no hay
 * tercera casilla, así que no se puede callar un hallazgo sin dejar constancia
 * de por qué.
 *
 * <h2>El coste, que hay que decir</h2>
 *
 * Obliga a escribir los motivos en una forma más rígida de la que hoy tienen.
 * Cuántas son lo **cuenta este arnés al correr**, y no se escribe aquí: el
 * censo de #735 dio 143 afirmaciones —88 en javadoc, 54 en pantalla— y al
 * reproducirlo con otro patrón salieron 1 010. Las dos mediciones son ciertas y
 * cuentan cosas distintas, porque «afirmación sobre lo que el backend no
 * publica» no tiene una frontera nítida: «ese número no existe» habla de una
 * fila, «ninguna lectura lo publica» habla del contrato, y separarlas es
 * exactamente el juicio que un regex no hace.
 *
 * Así que el número vive en `censoDeNegaciones()`, con su patrón a la vista y
 * su resultado impreso en cada corrida. **Un número afirmado en un javadoc que
 * nadie puede reproducir es la clase de cosa que este mismo arnés existe para
 * impedir**, y no iba a estrenarse cometiéndola.
 *
 * **La lista ancla ocho de esas afirmaciones, no todas, y se hace por
 * partes a propósito.** Anclar una frase no es escribir una línea: es decidir
 * *cuál* operación la publicaría, y decidirlo mal produce una guarda que pasa
 * en verde el día que el backend publica la operación de al lado —una guarda
 * que no puede fallar no protege nada—. Las ocho de hoy son las que la propia
 * prosa **ya** nombraba con su ruta, de modo que la decisión estaba tomada y
 * escrita antes que la lista. Un arnés que vigila 8 de 54 y lo dice es honesto;
 * uno que afirma vigilarlas todas y vigila 8, no.
 *
 * <h2>El emparejamiento es segmento a segmento, y por qué hace falta</h2>
 *
 * Comparando la ruta como cadena, este mismo arnés da **19** hallazgos y los
 * **19 son falsos**: la prosa escribe `PUT /catastro/fichas/…/actualizacion` o
 * cita una respuesta medida —«`POST /fiscalizacion/programas/3/muestra` → 422»—
 * y el contrato declara `/catastro/fichas/{codigo}/actualizacion` y
 * `/fiscalizacion/programas/{id}/muestra`. Emparejando segmento a segmento
 * —donde un segmento es comodín si es `{plantilla}`, `…` o un número concreto—
 * bajan a **0**. Es la mutación de contraste: sin el comodín el arnés grita
 * diecinueve veces en verde, que es exactamente lo que **no** puede hacer
 * (AC 3 de #735) y el modo de fallo que deja de leerse al segundo día.
 *
 * El prototipo de #735 midió 16 y no 19 porque corría antes de descodificar las
 * entidades HTML, antes de la lista de exenciones y antes de arreglar el defecto
 * de abajo; la cifra de aquí es la de este árbol con este código, y por eso es
 * la que se escribe.
 *
 * Sobre el árbol de hoy, con el comodín puesto, los hallazgos son **cero**, y
 * los cuatro que el prototipo dejó vivos se resolvieron uno a uno: dos son
 * `GET /tesoreria/tasas` (deliberado, #430, y ahora declarado abajo), uno era
 * una entidad HTML sin descodificar, y el cuarto era **un defecto vivo** —`POST
 * /programas/{id}/muestra` en `Fiscalizacion.tsx`, sin el prefijo
 * `/fiscalizacion`: prosa que llega a la pantalla nombrando una ruta que no
 * existe—.
 *
 * <h2>Las entidades HTML se descodifican antes de leer</h2>
 *
 * En JSX una llave se escribe `&#123;`, así que `POST /catastro/fichas/{tipo}`
 * vive en el fuente como `POST /catastro/fichas/&#123;tipo&#125;`. Sin
 * descodificar, el extractor se para en la barra y juzga `/catastro/fichas/`,
 * que existe **con GET y no con POST**: un falso positivo con pinta de defecto
 * real. De ahí sale uno de los cuatro.
 *
 * <h2>Y el fichero tiene que seguir diciendo lo que la entrada vigila</h2>
 *
 * Cada entrada declara el fragmento literal de la frase que ancla. Si alguien
 * la borra o la reescribe, la entrada se queda **rancia** —vigilando una
 * afirmación que ya no está— y eso es rojo, no silencio: es la misma regla que
 * `hojas-sin-superficie` aplica a su lista de pendientes, y el motivo por el
 * que aquélla se dejó declarada con la lista vacía.
 *
 * El fragmento se busca sobre el fuente con los espacios colapsados, porque el
 * formateador reparte una frase en tres líneas y la reparte otra vez en cuanto
 * alguien toca una palabra. Lo que **no** se puede atravesar es una etiqueta:
 * en `ningún <code>GET /x</code>` el texto no es contiguo, así que los
 * fragmentos se quedan dentro de un mismo trozo de prosa.
 *
 * <h2>No abre navegador y no necesita backend</h2>
 *
 * Lee el fuente y el contrato, como `node.mjs`. Y **falla si no mide nada**: si
 * el extractor deja de encontrar menciones, o la lista se queda vacía, esto
 * pasaría en verde sin haber mirado una sola frase, que es el modo de fallo que
 * #625 cerró en `errores.mjs` y `filas.mjs` en el suyo.
 */
import { readFile, readdir } from 'node:fs/promises';

const RAIZ = new URL('../', import.meta.url);
const CONTRATO = new URL('../../docs/50-api/openapi/sgtm-v1.yaml', import.meta.url);

/* ══════════ Lo que nadie publica, declarado ══════════ */

/**
 * Las afirmaciones negativas vigiladas: «esto no lo publica nadie».
 *
 * Cada entrada dice **qué operación lo publicaría**, y el arnés comprueba las
 * dos mitades — que esa operación sigue sin estar en el contrato, y que el
 * fichero sigue conteniendo la frase que la entrada ancla.
 *
 *   - `operacion`      la que publicaría el dato, y que tiene que seguir sin
 *                      existir. Admite comodines: `PUT /valores/{numero}`.
 *   - `ningunaRutaCon` alternativa para las frases que no nombran una ruta sino
 *                      un acto entero —«no hay ninguna operación de esquela»—:
 *                      ninguna ruta del contrato puede llevar esa palabra. Casa
 *                      por subcadena, así que una ruta que sólo la contenga
 *                      dispara el rojo; se acepta a propósito, porque las dos
 *                      palabras vigiladas —«esquela», «cruce»— no aparecen en
 *                      ninguna de las 202 rutas y el error posible es «ve a
 *                      mirar», que es la dirección correcta de los dos.
 *   - `queSeDiceQueFalta`  qué se queda sin dibujar por eso. Es lo que sale en
 *                      el rojo, para que quien lo lea sepa qué pantalla revisar.
 *   - `dondeSeAfirma`  `[fichero, fragmento literal]`. El fragmento es la
 *                      prueba de que la frase sigue ahí.
 */
const LO_QUE_NADIE_PUBLICA = [
  {
    operacion: 'GET /tesoreria/tasas',
    issue: '#430',
    queSeDiceQueFalta:
      'el catálogo de conceptos del TUPA, sin el cual «Caja de tasas» no tiene de dónde elegir el concepto que cobra',
    dondeSeAfirma: [
      ['src/api/tesoreria.ts', 'no hay `GET /tesoreria/tasas`'],
      ['src/modulos/tesoreria/Tesoreria.tsx', 'ninguna lectura del contrato publica ese catálogo'],
    ],
  },
  {
    /* No es una ruta: es un acto que el sistema no modela. Por eso se vigila la
       palabra y no una ruta inventada — el día que alguien publique la esquela
       no se sabe si será `/fiscalizacion/esquelas` o
       `/fiscalizacion/programas/{id}/esquelas`, y una entrada que sólo mirase
       la primera pasaría en verde con la segunda publicada. */
    ningunaRutaCon: 'esquela',
    issue: '#550',
    queSeDiceQueFalta:
      'el botón «Notificar esquela» del prototipo, retirado de la detección de omisos porque no hay acto detrás',
    dondeSeAfirma: [
      ['src/modulos/fiscalizacion/Fiscalizacion.tsx', 'contrato no declara ninguna ruta con esa palabra'],
      ['src/modulos/fiscalizacion/Fiscalizacion.tsx', 'no hay ninguna operación de esquela en el contrato'],
    ],
  },
  {
    /* Lo mismo: el cruce contra SUNARP, SUNAT y MTC no existe como operación,
       y sus tres filtros se retiraron del contrato en #546 por eso mismo. */
    ningunaRutaCon: 'cruce',
    issue: '#546',
    queSeDiceQueFalta:
      'las cuatro filas del cruce vehicular del artboard, con su deuda omitida: ninguna de esas cifras la calcula nadie',
    dondeSeAfirma: [
      ['src/modulos/fiscalizacion/Fiscalizacion.tsx', 'no hay **ninguna** operacion del cruce registral'],
    ],
  },
  {
    /* El acta de inspección resuelve su programa por el CÓDIGO y no por el
       identificador interno, y esta ausencia es la mitad del motivo: sin una
       lectura de un programa suelto, un id en la ruta habría que buscarlo en la
       página que la lista traiga, y el programa puede no estar en ella. El día
       que exista, el sujeto del acta se puede replantear — y ése es justo el día
       en que hay que releer el bloque que esta entrada ancla. */
    operacion: 'GET /fiscalizacion/programas/{id}',
    issue: '#431',
    queSeDiceQueFalta:
      'la lectura de un programa suelto, por la que el acta de inspección lleva en su ruta el código del programa y no su identificador interno',
    dondeSeAfirma: [
      ['src/modulos/fiscalizacion/Fiscalizacion.tsx', 'no publica ninguna lectura de un programa suelto'],
    ],
  },
  {
    /* `GET /transito/codigos` sí existe: lo que no existe es con qué llenarlo.
       Por eso la entrada vigila el POST y no la ruta. */
    operacion: 'POST /transito/codigos',
    issue: '#77',
    queSeDiceQueFalta:
      'el alta de un código del Reglamento Nacional de Tránsito: sin catálogo no se puede registrar una papeleta',
    dondeSeAfirma: [
      ['src/modulos/transito/Transito.tsx', 'no hay ninguna operación publicada que los dé de alta'],
    ],
  },
  {
    operacion: 'POST /infracciones/cuis',
    issue: '#78',
    queSeDiceQueFalta: 'el alta de un código del cuadro CUIS: sin cuadro no se puede tipificar una infracción',
    dondeSeAfirma: [
      ['src/modulos/sanciones/Sanciones.tsx', 'no hay ninguna operación publicada que los dé de alta'],
    ],
  },
  {
    /* Las dos entradas del valor son la misma frase con dos verbos, y se
       declaran por separado porque son dos operaciones: publicar una y no la
       otra sigue rompiendo la mitad de la afirmación. */
    operacion: 'PUT /valores/{numero}',
    issue: '#37',
    queSeDiceQueFalta:
      'la corrección de un valor emitido, que no existe por diseño: un valor se anula y se emite otro (regla 4)',
    dondeSeAfirma: [['src/modulos/valores/Valores.tsx', 'contrato no publica ningún']],
  },
  {
    operacion: 'PATCH /valores/{numero}',
    issue: '#37',
    queSeDiceQueFalta: 'lo mismo por el otro verbo: no hay forma de editar un valor ya emitido',
    dondeSeAfirma: [['src/modulos/valores/Valores.tsx', 'contrato no publica ningún']],
  },
  {
    /* El contrato declara `GET /fiscalizacion/resoluciones/{numero}` —la hoja de
       una resolución que ya se conoce— y ninguna que las liste, que es lo que
       obliga a teclear el número. La guarda es por operación, así que un
       `GET /fiscalizacion/resoluciones/listado` se le escaparía; lo que caza es
       la forma con la que ese listado se publicaría de verdad. */
    operacion: 'GET /fiscalizacion/resoluciones',
    issue: '#52',
    queSeDiceQueFalta:
      'el listado de resoluciones de determinación: por eso su número se teclea, y sale del papel notificado',
    dondeSeAfirma: [
      ['src/api/fiscalizacion.ts', 'el contrato no declara ninguna otra ruta bajo'],
      ['src/modulos/fiscalizacion/Fiscalizacion.tsx', 'el contrato no declara ninguna otra ruta'],
    ],
  },
];

/* ══════════ El contrato ══════════ */

/**
 * Las rutas del contrato con sus verbos.
 *
 * Se lee a mano y no con un analizador de YAML porque una dependencia nueva
 * para leer dos niveles de sangría es una dependencia nueva, y este árbol tiene
 * `react` y `react-dom` como únicas dependencias de producción a propósito. Lo
 * que sí se comprueba es que se haya leído algo: un cambio de formato del YAML
 * dejaría este arnés midiendo cero rutas y pasando en verde.
 */
function leerContrato(yaml) {
  const rutas = new Map();
  let ruta = null;
  for (const linea of yaml.split('\n')) {
    const r = linea.match(/^ {2}"?(\/[^"\s:]+)"?:\s*$/);
    if (r) {
      ruta = r[1];
      rutas.set(ruta, new Set());
      continue;
    }
    const v = linea.match(/^ {4}(get|post|put|delete|patch):\s*$/);
    if (v && ruta !== null) rutas.get(ruta).add(v[1].toUpperCase());
  }
  return rutas;
}

/** Los segmentos de una ruta, sin el prefijo del origen ni la barra final. */
function segmentos(ruta) {
  return ruta
    .replace(/^\/api\/v1/, '')
    .split('/')
    .filter((t) => t !== '');
}

/**
 * Si un segmento vale por cualquier otro.
 *
 * `{plantilla}` es lo que escriben el contrato y la prosa; `…` es lo que escribe
 * la prosa cuando el detalle no importa —«`POST /catastro/fichas/…`»—; y un
 * número es un ejemplo concreto, que es como se citan las respuestas medidas
 * («`GET /fiscalizacion/programas/999999/muestra` → 404»).
 */
function esComodin(t) {
  return t.startsWith('{') || t === '…' || t === '...' || /^\d+$/.test(t);
}

function casan(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i] || esComodin(x) || esComodin(b[i]));
}

/* ══════════ El fuente ══════════ */

/**
 * Las entidades HTML que JSX obliga a escribir, descodificadas.
 *
 * Sólo las que este árbol usa de verdad: descodificar de todo exigiría una
 * tabla que nadie mantendría, y lo que se necesita son las llaves, que es lo
 * que JSX no deja escribir a pelo dentro de un elemento.
 */
function descodificar(texto) {
  return texto
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&#x7b;/gi, '{')
    .replace(/&#x7d;/gi, '}')
    .replace(/&amp;/g, '&');
}

/** Los espacios colapsados: el formateador reparte una frase y la vuelve a repartir. */
function aplanar(texto) {
  return texto.replace(/\s+/g, ' ');
}

async function fuentes(dir, acumulado = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const hijo = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
    if (e.isDirectory()) await fuentes(hijo, acumulado);
    else if (/\.tsx?$/.test(e.name)) acumulado.push(hijo);
  }
  return acumulado;
}

/* ══════════ La medida ══════════ */

const fallos = [];

let yaml;
try {
  yaml = await readFile(CONTRATO, 'utf8');
} catch {
  console.error(`No se pudo leer el contrato en ${CONTRATO.pathname}: sin él esto no compara nada.`);
  process.exit(1);
}
const contrato = leerContrato(yaml);
const delContrato = [...contrato].map(([r, v]) => [segmentos(r), v]);
if (contrato.size < 100) {
  console.error(`El contrato se leyó con ${contrato.size} rutas: el formato cambió y esto ya no compara nada.`);
  process.exit(1);
}

/** Cómo publica el contrato esa operación, o `null` si la ruta no está declarada. */
function loPublicaAlguien(verbo, ruta) {
  const t = segmentos(ruta);
  const candidatas = delContrato.filter(([k]) => casan(t, k));
  if (candidatas.length === 0) return null;
  return candidatas.some(([, v]) => v.has(verbo)) ? 'con ese verbo' : `sólo con ${[...new Set(candidatas.flatMap(([, v]) => [...v]))].sort().join('/')}`;
}

/* ── Dirección negativa: lo declarado sigue sin publicarse ── */

const declaradas = new Set();
for (const e of LO_QUE_NADIE_PUBLICA) {
  const nombre = e.operacion ?? `(cualquier ruta con «${e.ningunaRutaCon}»)`;

  if (e.operacion !== undefined) {
    const [verbo, ruta] = e.operacion.split(' ');
    declaradas.add(`${verbo} ${segmentos(ruta).join('/')}`);
    if (loPublicaAlguien(verbo, ruta) === 'con ese verbo') {
      fallos.push(
        `«${nombre}» YA ESTÁ en el contrato, y la interfaz sigue diciendo que no. ` +
          `Se dejó de dibujar ${e.queSeDiceQueFalta} (${e.issue}); ahora hay de dónde sacarlo. ` +
          `Revisa: ${e.dondeSeAfirma.map(([f]) => f).join(', ')}`,
      );
    }
  } else {
    const encontradas = [...contrato.keys()].filter((r) => r.includes(e.ningunaRutaCon));
    if (encontradas.length > 0) {
      fallos.push(
        `El contrato ya declara ${encontradas.length} ruta(s) con «${e.ningunaRutaCon}» —${encontradas.join(', ')}— ` +
          `y la interfaz sigue diciendo que no hay ninguna. Se dejó de dibujar ${e.queSeDiceQueFalta} (${e.issue}). ` +
          `Revisa: ${[...new Set(e.dondeSeAfirma.map(([f]) => f))].join(', ')}`,
      );
    }
  }

  /* Y la otra mitad: que la frase que la entrada ancla siga estando. Una
     entrada rancia vigila algo que ya nadie dice, y desde ese momento no
     protege nada aunque siga en verde. */
  for (const [fichero, fragmento] of e.dondeSeAfirma) {
    let texto;
    try {
      texto = await readFile(new URL(fichero, RAIZ), 'utf8');
    } catch {
      fallos.push(`Entrada rancia de «${nombre}»: «${fichero}» ya no existe.`);
      continue;
    }
    if (!aplanar(descodificar(texto)).includes(aplanar(fragmento))) {
      fallos.push(
        `Entrada rancia de «${nombre}»: «${fichero}» ya no dice «${fragmento}». ` +
          'O la frase se reescribió y la entrada hay que ajustarla, o se borró y la entrada sobra: ' +
          'lo que no puede quedarse es una guarda vigilando una afirmación que nadie hace.',
      );
    }
  }
}

/* ── Dirección positiva: lo que la prosa nombra existe ── */

const MENCION = /\b(GET|POST|PUT|DELETE|PATCH)\s+(\/[A-Za-z0-9/{}_.…-]+)/g;

let menciones = 0;
let exentas = 0;
let truncadas = 0;
/* Los fuentes ya leidos, para que `censoDeNegaciones` no vuelva a leer el disco. */
const textosDeLaProsa = [];

for (const f of (await fuentes(new URL('src/', RAIZ))).sort()) {
  const texto = descodificar(await readFile(f, 'utf8'));
  const relativa = f.pathname.slice(RAIZ.pathname.length);
  textosDeLaProsa.push([relativa, texto]);
  for (const m of texto.matchAll(MENCION)) {
    const [, verbo, cruda] = m;
    menciones++;

    /* Una ruta que la interpolación de JSX corta a la mitad —`GET
       /rentas/declaraciones/{` seguido de `{'{'}n{'}'}`— no se puede juzgar:
       no se sabe cuántos segmentos tiene. Se cuentan aparte para que
       «truncadas» no crezca en silencio hasta tapar el arnés entero. */
    if (cruda.includes('{') && !cruda.slice(cruda.lastIndexOf('{')).includes('}')) {
      truncadas++;
      continue;
    }

    if (declaradas.has(`${verbo} ${segmentos(cruda).join('/')}`)) {
      exentas++;
      continue;
    }

    const publicada = loPublicaAlguien(verbo, cruda);
    if (publicada === null) {
      fallos.push(
        `${relativa} nombra «${verbo} ${cruda}» y el contrato no declara esa ruta. ` +
          'O es una errata que llega a la pantalla, o es una afirmación negativa sin declarar: ' +
          'si es lo segundo, va a `LO_QUE_NADIE_PUBLICA` con lo que se deja de dibujar por ella.',
      );
    } else if (publicada !== 'con ese verbo') {
      fallos.push(`${relativa} nombra «${verbo} ${cruda}» y el contrato la declara ${publicada}.`);
    }
  }
}

/* ══════════ El censo, contado y no afirmado ══════════ */

/**
 * Cuantas afirmaciones sobre lo que el backend NO publica hay, y donde viven.
 *
 * Existe porque el javadoc de arriba llevaba tres cifras escritas a mano —143,
 * 88, 54— y **al reproducirlas con otro patron salieron 1 010**. Las dos
 * mediciones eran ciertas: la frontera de «afirmacion sobre lo que el backend
 * no publica» no es nitida, y depende entera del patron. «Ese numero no existe»
 * habla de una fila del padron; «ninguna lectura lo publica» habla del
 * contrato, y solo la segunda envejece cuando el backend publica algo.
 *
 * De modo que el patron esta aqui, a la vista, y el numero se imprime en cada
 * corrida en vez de quedar congelado en un comentario. **Un numero afirmado que
 * nadie puede reproducir es justo lo que este arnes existe para impedir.**
 *
 * El sujeto tiene que ser el backend, el contrato o una operacion — no una fila
 * de datos—, y por eso se exige que aparezca cerca del verbo. Lo que se cuenta
 * no gobierna nada: `LO_QUE_NADIE_PUBLICA` es lo que muerde. Esto es el tamano
 * del trabajo que queda, dicho con su regla al lado (AC 4 de #735).
 */
function censoDeNegaciones(textos) {
  const SUJETO =
    '(?:el\\s+backend|el\\s+servidor|el\\s+contrato|la\\s+api|el\\s+recurso|la\\s+lectura|la\\s+consulta' +
    '|la\\s+operaci[oó]n|el\\s+endpoint|el\\s+padr[oó]n|[A-Z][A-Za-z]*Resource)';
  const VERBO = '(?:publica|sirve|trae|declara|expone)';
  const PATRONES = [
    new RegExp(SUJETO + '[^.;]{0,60}?\\bno\\s+(?:lo\\s+|la\\s+|los\\s+|las\\s+)?' + VERBO, 'gi'),
    new RegExp('\\bno\\s+(?:lo\\s+|la\\s+|los\\s+|las\\s+)?' + VERBO + '[^.;]{0,40}?' + SUJETO, 'gi'),
    /\b(?:ninguna\s+lectura|ning[uú]n\s+controlador|ning[uú]n\s+endpoint|ninguna\s+operaci[oó]n)\b/gi,
    /\bno\s+hay\s+(?:un[ao]?\s+)?(?:endpoint|lectura|ruta|operaci[oó]n|consulta)\b/gi,
    /\bno\s+es\s+un\s+campo\s+(?:de|del|que)\b/gi,
  ];
  const CON_ANCLA = /\/(?:catastro|rentas|tesoreria|coactiva|fiscalizacion|transito|infracciones|sanciones|autorizaciones|licencias|consultas|seguridad|portal|valores)\/[a-z]|[A-Z][A-Za-z]*Resource\b/;

  /** Si la posicion cae dentro de un comentario: entonces no llega a la pantalla. */
  const enComentario = (txt, i) => {
    const ab = txt.lastIndexOf('/*', i);
    const ce = txt.lastIndexOf('*/', i);
    if (ab > ce) return true;
    return txt.slice(txt.lastIndexOf('\n', i) + 1, i).includes('//');
  };

  const vistos = new Set();
  let total = 0;
  let enPantalla = 0;
  let conAncla = 0;
  for (const [ruta, txt] of textos) {
    for (const patron of PATRONES) {
      patron.lastIndex = 0;
      let m;
      while ((m = patron.exec(txt)) !== null) {
        /* Una misma frase la cazan varios patrones: se cuenta una vez, por
           bloque de 120 caracteres, que es como se midio en #735. */
        const clave = ruta + ':' + Math.floor(m.index / 120);
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        total++;
        if (!enComentario(txt, m.index)) enPantalla++;
        if (CON_ANCLA.test(txt.slice(Math.max(0, m.index - 160), m.index + 160))) conAncla++;
      }
    }
  }
  return { total, enPantalla, conAncla };
}

/* ══════════ El resultado ══════════ */

const vigiladas = LO_QUE_NADIE_PUBLICA.reduce((n, e) => n + e.dondeSeAfirma.length, 0);

console.log(
  `${contrato.size} rutas en el contrato · ${menciones} menciones de operación en la prosa ` +
    `(${exentas} declaradas ausentes a propósito, ${truncadas} sin juzgar por la interpolación de JSX) · ` +
    `${vigiladas} afirmaciones negativas ancladas en ${LO_QUE_NADIE_PUBLICA.length} entradas`,
);

/* Cero menciones no es un aprobado: es que el extractor dejó de encontrar su
   fuente, y entonces esto pasa en verde sin haber mirado una sola frase. Lo
   mismo con la lista vacía: la dirección negativa sería un `for` sin cuerpo. */
if (menciones === 0) {
  console.error('\nNinguna mención de operación en `src/`: el extractor no encontró su fuente. No se ha medido nada.');
  process.exit(1);
}
if (LO_QUE_NADIE_PUBLICA.length === 0) {
  console.error('\n`LO_QUE_NADIE_PUBLICA` está vacía: la mitad negativa de este arnés no mide nada.');
  process.exit(1);
}

if (!fallos.length) {
  console.log('lo que la prosa nombra existe con su verbo, y lo que dice que falta sigue faltando');
  const censo = censoDeNegaciones(textosDeLaProsa);
  console.log(
    `(${censo.total} afirmaciones negativas contadas con el patrón de \`censoDeNegaciones\`: ` +
      `${censo.enPantalla} llegan a la pantalla y ${censo.conAncla} nombran ya su ruta o su Resource. ` +
      `Ancladas aquí: ${LO_QUE_NADIE_PUBLICA.length}. Se hace por partes — el javadoc dice por qué)`,
  );
  process.exit(0);
}
console.log(`\n${fallos.length} problema(s) con lo que la prosa afirma del backend:\n`);
for (const f of fallos) console.log('  - ' + f + '\n');
console.log('Un motivo falso es peor que un campo vacío: un «—» honesto y uno que se podía llenar se leen igual.');
process.exit(1);
