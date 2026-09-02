/**
 * Los errores del API: cómo se clasifican, y qué se ofrece ante cada uno.
 *
 *   node verificaciones/errores.mjs
 *
 * La regla que sujeta es una sola: **«Reintentar» sólo sale donde reintentar
 * puede cambiar algo**. Un permiso que falta sale igual las veces que se pulse,
 * y un verbo equivocado no puede funcionar nunca; ofrecer el botón ahí manda a
 * quien atiende a insistir sobre lo imposible en vez de a pedir el acceso o a
 * avisar de que la pantalla pide mal.
 *
 * Son TRES mitades porque fallan por separado, y con dos de ellas en verde el
 * defecto sigue vivo:
 *
 *   1. El catálogo, contra el del backend. Un código que el servidor añade y la
 *      interfaz no declara no rompe nada visible: se clasifica por el estado, o
 *      —peor, hasta #625— entraba en la unión por un `as` y no casaba con
 *      ninguna rama. Se comparan las DOS FUENTES REALES, el enumerado de Java y
 *      la lista de `cliente.ts`, en las dos direcciones. Una copia aquí dentro
 *      se quedaría vieja en silencio, que es justo lo que se quiere impedir.
 *
 *   2. La puerta, con respuestas fabricadas. `solicitar()` de verdad, con
 *      `fetch` sustituido: qué código sale de cada respuesta y cuál de ellos es
 *      reintentable. Aquí caben los bordes que ninguna pantalla puede producir
 *      —el 405 pelado de nginx, el 502 del proxy, el 200 que devuelve el
 *      `index.html` de la propia interfaz—.
 *
 *   3. La pantalla, en un navegador de verdad. La clasificación puede estar
 *      bien y el botón dibujarse igual: **el botón se escribe en once sitios de
 *      nueve archivos** —ocho módulos con su propio aviso de fallo, más el
 *      compartido de `Fallo.tsx`— y cada uno decide por su cuenta si lo pinta.
 *      Se recorren los destinos con TODAS las peticiones contestadas 405 pelado,
 *      y ninguna puede ofrecerlo; y luego con un 500, donde alguna tiene que
 *      ofrecerlo. Sin ese contraste, quitar el botón de los once dejaría esto
 *      en verde.
 *
 * La mitad 3 necesita una vista previa levantada y el Chromium de Playwright;
 * las otras dos no necesitan nada. No hace falta backend ni token: todas las
 * respuestas se fabrican aquí.
 */
import { chromium } from 'playwright-core';
import { readFile, rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const fallos = [];

/** Compila un módulo del árbol y lo importa. Se mide el de producción, no una copia. */
async function cargar(entrada, nombre) {
  const salida = new URL(`./.${nombre}.mjs`, import.meta.url);
  await build({
    entryPoints: [entrada],
    outfile: salida.pathname,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    /* `import.meta.env` es de Vite y aquí no existe; estos módulos lo leen al
       cargarse para saber a dónde apunta el API, y eso no es lo que se mide. */
    define: { 'import.meta.env': '{}' },
  });
  const modulo = await import(pathToFileURL(salida.pathname).href);
  await rm(salida, { force: true });
  return modulo;
}

/* `solicitar` construye la URL contra el origen de la página, y aquí no hay
   ninguna. Es lo único del navegador que necesita. */
globalThis.window = { location: { origin: 'http://sgtm.local' } };
/* El `fetch` de verdad, que la mitad 2 sustituye por respuestas fabricadas.
   Se guarda porque la mitad 3 lo necesita para saber si hay vista previa: con
   el doble puesto, preguntar por ella devolvía el 204 del último caso y la
   comprobación decía que sí siempre. */
const fetchDeVerdad = globalThis.fetch;
const { solicitar, ErrorDeApi, CODIGOS_DE_ERROR } = await cargar('src/api/cliente.ts', 'cliente-errores');

// ─────────────────────────────────────────────────────────── 1. El catálogo ──

const JAVA = new URL(
  '../../backend/sgtm-plataforma/src/main/java/pe/gob/sgtm/web/CodigoDeError.java',
  import.meta.url,
);
const fuente = await readFile(JAVA, 'utf8').catch(() => null);
if (fuente === null) {
  /* No se salta: una verificación que se salta a sí misma deja esto en verde
     sin haber comparado nada, y el hueco que cierra es exactamente ése. */
  fallos.push(`no se pudo leer el enumerado del backend en ${JAVA.pathname}`);
} else {
  const delBackend = [...fuente.matchAll(/^ {4}([A-Z][A-Z_]*)\(/gm)].map((m) => m[1]);
  if (delBackend.length < 5) {
    fallos.push(`el enumerado del backend se leyó con ${delBackend.length} códigos: el formato cambió y esto ya no compara nada`);
  }
  const declarados = new Set(CODIGOS_DE_ERROR);
  for (const c of delBackend) {
    if (!declarados.has(c)) fallos.push(`el backend declara «${c}» y \`CODIGOS_DE_ERROR\` no: llegará clasificado por su estado y ningún aviso tendrá su rama`);
  }
  for (const c of CODIGOS_DE_ERROR) {
    /* El único que no está en el enumerado, y no puede estarlo: nombra que no
       hubo respuesta, así que no hay servidor que lo emita. */
    if (c === 'SIN_RESPUESTA') continue;
    if (!delBackend.includes(c)) fallos.push(`\`CODIGOS_DE_ERROR\` declara «${c}» y el backend no lo emite: o sobra, o le cambiaron el nombre`);
  }
}

// ───────────────────────────────────────────────────────────── 2. La puerta ──

/* El cuerpo con que nginx contesta un verbo que no admite. Medido contra el
   servicio `interfaz` del compose: `POST /index.html` → 405, `Content-Type:
   text/html`, 157 bytes. No es un caso hipotético: es lo que emite el propio
   proxy que sirve esta interfaz, y no lleva `codigo` que leer. */
const HTML_DE_NGINX =
  '<html>\n<head><title>405 Not Allowed</title></head>\n<body>\n<center><h1>405 Not Allowed</h1></center>\n<hr><center>nginx/1.31.4</center>\n</body>\n</html>\n';

const CASOS = [
  ['405 del backend, con problem+json', 405, JSON.stringify({ codigo: 'METODO_NO_ADMITIDO', mensaje: "El verbo 'GET' no se admite en esta ruta. Admitidos: PUT" }), 'application/problem+json', 'METODO_NO_ADMITIDO', false],
  ['405 pelado, el de nginx', 405, HTML_DE_NGINX, 'text/html', 'METODO_NO_ADMITIDO', false],
  ['405 con el cuerpo vacío', 405, '', '', 'METODO_NO_ADMITIDO', false],
  ['401 pelado', 401, '', '', 'NO_AUTENTICADO', false],
  ['403 pelado', 403, '', '', 'SIN_PRIVILEGIO', false],
  ['404 pelado', 404, '', '', 'NO_ENCONTRADO', false],
  ['409 pelado', 409, '', '', 'CONFLICTO', false],
  ['422 pelado', 422, '', '', 'VALIDACION', false],
  /* El contraste de la mitad 2: algo tiene que seguir siendo reintentable. Un
     500 llegó, trae incidencia y puede haber sido un tropiezo. */
  ['500 del backend', 500, JSON.stringify({ codigo: 'ERROR_INTERNO', mensaje: 'No se pudo completar la operación', incidencia: 'e5b1' }), 'application/problem+json', 'ERROR_INTERNO', true],
  ['502 del proxy', 502, '<html>502 Bad Gateway</html>', 'text/html', 'ERROR_INTERNO', true],
  /* El que cierra el `as` de #625: un código que esta interfaz no declara no se
     cuela en la unión, se deduce del estado. Antes salía tal cual, no casaba
     con ninguna rama y `reintentable` decía que no fuera cual fuera el estado. */
  ['un código que el frontend no conoce', 422, JSON.stringify({ codigo: 'INVENTADO_EN_EL_BACKEND', mensaje: 'x' }), 'application/problem+json', 'VALIDACION', false],
  /* El reenvío mal configurado que devuelve la propia interfaz con 200. Sale
     `SIN_RESPUESTA`, que SÍ es reintentable, y está bien que lo sea: es el mismo
     código que la red caída, y ahí volver a intentarlo puede funcionar. Lo que
     no puede es quedarse en blanco, que es lo que pasaba antes de la guarda. */
  ['200 con el index.html de la interfaz', 200, '<!doctype html><html><body><div id="raiz"></div></body></html>', 'text/html', 'SIN_RESPUESTA', true],
];

for (const [nombre, estado, cuerpo, tipo, esperado, reintentable] of CASOS) {
  globalThis.fetch = async () => new Response(cuerpo === '' ? null : cuerpo, { status: estado, headers: tipo ? { 'Content-Type': tipo } : {} });
  let error = null;
  try {
    await solicitar('/lo/que/sea');
  } catch (e) {
    error = e;
  }
  if (error === null) {
    fallos.push(`la puerta · ${nombre}: no lanzó nada, y la respuesta no era buena`);
    continue;
  }
  if (error.codigo !== esperado) fallos.push(`la puerta · ${nombre}: salió «${error.codigo}» y tenía que salir «${esperado}»`);
  else if (error.reintentable !== reintentable) fallos.push(`la puerta · ${nombre}: reintentable=${error.reintentable} y tenía que ser ${reintentable}`);
}

/* El 204 no es un error: no tiene cuerpo y no tiene que lanzar. Sin esto, hacer
   que todo estado lance dejaría los doce casos de arriba igual de verdes. */
globalThis.fetch = async () => new Response(null, { status: 204 });
await solicitar('/lo/que/sea').catch((e) => fallos.push(`la puerta · un 204 lanzó «${e.codigo}», y un 204 es una respuesta correcta sin cuerpo`));

/* Y la regla, sobre la lista entera y no sobre los casos elegidos: los únicos
   reintentables son los dos que pueden cambiar de resultado sin cambiar la
   petición. Se recorre `CODIGOS_DE_ERROR` importado, así que un código nuevo
   entra aquí solo. */
const REINTENTABLES = ['ERROR_INTERNO', 'SIN_RESPUESTA'];
for (const codigo of CODIGOS_DE_ERROR) {
  const debe = REINTENTABLES.includes(codigo);
  const es = new ErrorDeApi(codigo, '', 0).reintentable;
  if (es !== debe) fallos.push(`la puerta · «${codigo}» dice reintentable=${es}: ${debe ? 'reintentar sí puede cambiarlo' : 'reintentar no lo cambia, sale igual las veces que se pulse'}`);
}

/* ── El discriminador de #604: que falta, una cifra o un campo ──────────────

   Los dos salen con `422 VALIDACION` y con el mismo `estado`, asi que hasta #604
   lo unico que los separaba era el texto en castellano — y el texto se reescribe
   sin romper ninguna compilacion. Desde #688 el servidor lo dice como DATO, y lo
   que se sujeta aqui es que se lea la PRESENCIA del miembro y no su contenido ni
   la frase.

   El ultimo caso es el que importa: un mensaje que dice «Falta publicar el
   parametro …» SIN el miembro tiene que salir como campo. Clasificar por
   subcadena lo daria por cifra normativa, y ademas imprimiria «el ejercicio
   undefined», porque no hay miembro del que leer el ano — medido en la pantalla
   de convenios con esa misma mutacion. */
const DISCRIMINADOR = [
  ['falta el conjunto sellado', { codigo: 'VALIDACION', mensaje: 'El ejercicio 2027 no tiene un conjunto de parametros sellado', parametroQueFalta: { ejercicio: 2027 } }, true, 2027, undefined],
  ['falta una llave concreta', { codigo: 'VALIDACION', mensaje: 'x', parametroQueFalta: { ejercicio: 2028, llave: 'REDONDEO' } }, true, 2028, 'REDONDEO'],
  ['falta el bloque de un tipo', { codigo: 'VALIDACION', mensaje: 'x', parametroQueFalta: { ejercicio: 2026, llave: 'INTERES_FRACCIONAMIENTO:ORDINARIO' } }, true, 2026, 'INTERES_FRACCIONAMIENTO:ORDINARIO'],
  ['falta un campo de la peticion', { codigo: 'VALIDACION', mensaje: "Falta el campo 'nroDeCuotas'" }, false, undefined, undefined],
  ['el mensaje engaña y no hay miembro', { codigo: 'VALIDACION', mensaje: 'Falta publicar el parametro INTERES_FRACCIONAMIENTO:ORDINARIO del ejercicio 2026' }, false, undefined, undefined],
  /* Un miembro a medias no se reconoce: sin el ejercicio no se puede decir de
     que ano falta la cifra, y ese es el dato con el que se busca que publicar.
     Se prefiere no reconocerlo a reconocerlo vacio. */
  ['el miembro sin su ejercicio', { codigo: 'VALIDACION', mensaje: 'x', parametroQueFalta: { llave: 'REDONDEO' } }, false, undefined, undefined],
];

for (const [nombre, cuerpo, esCifra, ejercicio, llave] of DISCRIMINADOR) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: 422, ...cuerpo }), { status: 422, headers: { 'Content-Type': 'application/problem+json' } });
  let e = null;
  try {
    await solicitar('/lo/que/sea');
  } catch (x) {
    e = x;
  }
  if (e === null) {
    fallos.push(`el discriminador · ${nombre}: no lanzó nada`);
    continue;
  }
  if (e.faltaUnaCifraNormativa !== esCifra) {
    fallos.push(
      `el discriminador · ${nombre}: faltaUnaCifraNormativa=${e.faltaUnaCifraNormativa} y tenía que ser ${esCifra}` +
        (esCifra ? '' : ' — se clasificaría como cifra normativa lo que es un dato de la petición'),
    );
    continue;
  }
  if (e.parametroQueFalta?.ejercicio !== ejercicio) {
    fallos.push(`el discriminador · ${nombre}: el ejercicio salió ${e.parametroQueFalta?.ejercicio} y tenía que ser ${ejercicio}`);
  }
  if (e.parametroQueFalta?.llave !== llave) {
    fallos.push(`el discriminador · ${nombre}: la llave salió ${JSON.stringify(e.parametroQueFalta?.llave)} y tenía que ser ${JSON.stringify(llave)}`);
  }
}

// ─────────────────────────────────────────────────────────── 3. La pantalla ──

const { MODULOS } = await cargar('src/shell/modulos.ts', 'modulos-errores');
const paradas = MODULOS.flatMap((m) => {
  const suyas = [
    ...m.destinos.map((d) => `#/${m.k}/${d.k}`),
    ...(m.accion ? [`#/${m.k}/${m.accion.k}`] : []),
    ...(m.documento ? [`#/${m.k}/${m.documento.k}`] : []),
  ];
  /* `inicio` no declara ningún destino —trae su propio shell— y sin esta rama se
     quedaba fuera del recorrido: es el panel de recaudación, que lee al abrirse
     y dibuja su propio aviso de fallo con su botón. Es la misma rama que
     `sin-red.mjs` necesitó, y por lo mismo. */
  return suyas.length ? suyas : [`#/${m.k}`];
});

/* Sin vista previa levantada esto no se salta: se para y dice qué hacer. Un
   `goto` contra un puerto muerto revienta con la traza de Playwright, que es
   ruidosa y no dice que lo que falta es `yarn preview`. */
const viva = await fetchDeVerdad(BASE).then((r) => r.ok).catch(() => false);
if (!viva) {
  console.log(`la mitad 3 necesita la vista previa en ${BASE}, y ahí no contesta nadie.`);
  console.log('Levántala con `yarn build && yarn preview`, o dile dónde está con SGTM_BASE=…');
  process.exit(2);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1200 } });
/* Con token puesto, aunque no haga falta ninguno: sin él hay pantallas que ni
   intentan leer, y entonces esto mediría el camino de «no hay sesión» en vez
   del de «se pidió y contestaron mal». El token no se usa: todas las peticiones
   las contesta este arnés. */
await contexto.addInitScript(() => localStorage.setItem('sgtm.token', 'no-se-usa-lo-contesta-el-arnes'));
const pagina = await contexto.newPage();

/** Recorre los destinos contestando lo mismo a todo, y dice cuáles ofrecen «Reintentar». */
async function recorrer(respuesta) {
  let pedidas = 0;
  await pagina.unrouteAll();
  await pagina.route('**/api/v1/**', (r) => {
    pedidas++;
    return r.fulfill(respuesta);
  });
  const ofrecen = [];
  for (const ruta of paradas) {
    await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(600);
    /* Se cuenta en el DOM y no por el papel accesible a propósito: un botón
       dentro de una sección plegada seguiría siendo un botón ofrecido, y
       contarlo sólo cuando se ve dejaría un escondite. */
    const cuantos = await pagina.locator('button', { hasText: /^\s*Reintentar\s*$/ }).count();
    if (cuantos > 0) ofrecen.push(ruta);
  }
  return { ofrecen, pedidas };
}

const conElVerbo = await recorrer({ status: 405, contentType: 'text/html', body: HTML_DE_NGINX });
const conElFallo = await recorrer({
  status: 500,
  contentType: 'application/problem+json',
  body: JSON.stringify({ codigo: 'ERROR_INTERNO', mensaje: 'No se pudo completar la operación', incidencia: 'e5b1' }),
});
await navegador.close();

if (conElVerbo.pedidas === 0) {
  /* Si no salió ni una petición, ninguna pantalla llegó a fallar y este
     recorrido informaría en verde sin haber mirado nada — el mismo agujero que
     `mirar.mjs` cerró con el token caducado. */
  fallos.push(`la pantalla · ninguna de las ${paradas.length} pantallas pidió nada al API: no se ha medido nada`);
}
for (const ruta of conElVerbo.ofrecen) {
  fallos.push(`la pantalla · ${ruta} ofrece «Reintentar» ante un 405: el verbo equivocado no cambia por insistir`);
}
if (conElFallo.ofrecen.length === 0) {
  /* El contraste. Sin él, quitar el botón de las nueve copias del aviso dejaría
     la comprobación de arriba en verde, y con ella un 500 —que sí se arregla
     reintentando— sin nada que pulsar. */
  fallos.push('la pantalla · ninguna ofrece «Reintentar» ante un 500 con incidencia: eso no arregla nada, lo esconde');
}

// ────────────────────────────────────────────────────────────── El veredicto ──

console.log(
  `${CODIGOS_DE_ERROR.length} códigos declarados · ${CASOS.length} respuestas fabricadas · ` +
    `${DISCRIMINADOR.length} casos del discriminador · ${paradas.length} pantallas recorridas dos veces (${conElVerbo.pedidas} y ${conElFallo.pedidas} peticiones contestadas)`,
);
console.log(`«Reintentar» ante el 405: ${conElVerbo.ofrecen.length} pantallas · ante el 500: ${conElFallo.ofrecen.length}`);
if (!fallos.length) {
  console.log('el catálogo cuadra con el del backend, cada respuesta se clasifica como lo que es, y «Reintentar» sólo sale donde puede cambiar algo');
  process.exit(0);
}
console.log(`\n${fallos.length} problemas:\n`);
for (const f of fallos) console.log('  - ' + f);
process.exit(1);
