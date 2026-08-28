/* Comprueba lo que llega al navegador de una municipalidad, y lo que no.
 *
 * Tres cosas, y las tres hay que medirlas porque las tres se pierden sin avisar:
 *
 *   1. Que el juego de datos de ejemplo **no llega a produccion**.
 *   2. Que el paquete no pasa de su presupuesto, ni el arranque ni cada modulo.
 *   3. Que el paquete **no conoce el dominio** donde se sirve.
 *
 * El proxy de datos pesa mas que la aplicacion entera: son las respuestas de
 * las 134 operaciones. Se carga con `import()` y detras de una bandera para que
 * el empaquetador pueda descartar la rama, pero eso hay que comprobarlo, no
 * suponerlo: basta un `import` normal en cualquier archivo para que el chunk
 * vuelva a entrar sin que nada mas cambie.
 *
 * Compila dos veces —con la bandera y sin ella— y compara.
 *
 * Uso: node scripts/comprobar-compilaciones.mjs
 */

import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const salida = join(raiz, 'apps/backoffice/dist');

/**
 * Dos huellas: una del juego de datos y otra del **codigo** del proxy.
 *
 * La lista de operaciones ya servidas vive en el mismo paquete que el proxy, asi
 * que viaja con el: si el proxy no llega a produccion, la lista tampoco.
 */
const HUELLAS = [
  { que: 'el juego de datos de ejemplo', texto: 'SANTA ROSA' },
  { que: 'el codigo del proxy', texto: 'El proxy de datos no conoce' },
];

/**
 * Presupuesto, en KB **comprimidos**, que es lo que viaja por la red.
 *
 * Sin un umbral que muerda, el paquete solo crece: nadie agrega 40 KB de golpe,
 * se agregan de dos en dos. Subir un numero tiene que costar una linea de este
 * archivo y una frase en el PR que diga por que.
 *
 * `arranque` y `portal` se subieron a 150 / 152 KB el 2026-08-27: quedan doce
 * modulos por conectar al backend y el arranque lleva dentro el camino de la
 * sesion —token, renovacion y ahora la matriz de permisos (ADR-0013)—. El
 * margen es para eso, no para que crezca sin mirar: el mayor trozo por modulo
 * sigue apretado en 11 KB.
 *
 * En una municipalidad con red mala, el arranque es lo que separa «lento» de
 * «no abre».
 */
const PRESUPUESTO = {
  /** Lo que hay que descargar para ver la primera pantalla: JS de arranque y CSS. */
  arranque: 150,
  /** Lo que cuesta entrar en un modulo: su trozo del catalogo. */
  modulo: 11,
  /**
   * Lo que le cuesta al **ciudadano** abrir el portal (#81).
   *
   * Es el unico flujo del sistema que no usa alguien de la municipalidad: se
   * entra desde un telefono, una vez al ano, con la red que haya. Su ruta es el
   * arranque mas el trozo de «Inicio», y **hoy el arranque lleva dentro el
   * catalogo de navegacion de los doce modulos** —134 opciones con sus iconos y
   * resumenes— que el ciudadano no va a usar.
   *
   * El presupuesto sigue a `arranque` (mas el trozo de «Inicio», ~1 KB): si no,
   * `portal` pasaria a ser el limite que muerde primero y `arranque` no serviria
   * de nada. La conversacion sobre bajar los dos queda abierta con su numero
   * delante.
   */
  portal: 152,
};

/* ── El paquete no conoce el dominio ─────────────────────────────────────── */

/**
 * Los valores de identidad con los que CI construye la imagen, leidos del PROPIO
 * flujo de publicacion.
 *
 * Compilar aqui con otros valores no comprobaria nada: lo que llega a la
 * municipalidad es lo que `publicar-imagenes.yml` pasa como `build-args`, y es
 * ahi donde el defecto se reintroduce. Si alguien vuelve a poner una URL
 * absoluta, esta compilacion la hornea y el paso de abajo la encuentra.
 *
 * Si no encuentra los valores, **falla**. Una comprobacion que se salta a si
 * misma cuando no halla lo que buscaba deja el verde intacto y no protege nada.
 */
function identidadDeCI() {
  const flujo = readFileSync(join(raiz, '../.github/workflows/publicar-imagenes.yml'), 'utf8');
  const valores = {};
  for (const [, clave, valor] of flujo.matchAll(/^\s*(VITE_SGTM_OIDC_[A-Z_]+)=(.+)$/gm)) {
    valores[clave] = valor.trim();
  }
  const exigidas = [
    'VITE_SGTM_OIDC_CLIENTE',
    'VITE_SGTM_OIDC_AUTORIZACION',
    'VITE_SGTM_OIDC_TOKEN',
    'VITE_SGTM_OIDC_FIN_DE_SESION',
  ];
  const faltan = exigidas.filter((c) => !valores[c]);
  if (faltan.length > 0) {
    console.error(
      `\n\u2717 No se pudieron leer de publicar-imagenes.yml: ${faltan.join(', ')}.\n  Sin esos valores esta comprobacion no mide nada; se para en vez de pasar en verde.\n`,
    );
    process.exit(1);
  }
  return valores;
}

/** Los dominios que `infra/` declara hoy, uno por ambiente. */
function dominiosDeclarados() {
  const infra = join(raiz, '../infra');
  const dominios = [];
  for (const archivo of readdirSync(infra)) {
    if (!/^Pulumi\..+\.yaml$/.test(archivo)) continue;
    const encontrado = readFileSync(join(infra, archivo), 'utf8').match(
      /^\s*sgtm:domain:\s*(.+)$/m,
    );
    if (encontrado) dominios.push(encontrado[1].trim().replace(/['"]/g, ''));
  }
  if (dominios.length === 0) {
    console.error(
      '\n\u2717 Ningun Pulumi.<ambiente>.yaml declara `sgtm:domain`; no hay nada que buscar.\n',
    );
    process.exit(1);
  }
  return dominios;
}

const IDENTIDAD = identidadDeCI();
const DOMINIOS = dominiosDeclarados();

/* Vite resuelve las `VITE_*` AL COMPILAR: una URL absoluta aqui hornea el nombre
 * del servidor dentro del paquete. Como la etiqueta de la imagen vive fuera del
 * estado de Pulumi (`ADR-0011` §5), cambiar `sgtm:domain` actualiza el ingreso y
 * NO el paquete: las dos mitades quedan apuntando a sitios distintos, en verde y
 * sin un solo sintoma. Keycloak se sirve en el mismo origen, asi que basta una
 * ruta y el navegador la resuelve contra el origen desde el que se descargo. */
const absolutas = Object.entries(IDENTIDAD).filter(([, valor]) => valor.includes('://'));
if (absolutas.length > 0) {
  console.error(
    `\n\u2717 publicar-imagenes.yml hornea una URL absoluta en el paquete:\n${absolutas
      .map(([clave, valor]) => `    ${clave}=${valor}`)
      .join(
        '\n',
      )}\n  Keycloak se sirve en el mismo origen: usa una ruta (\u00abtoken\u00bb y \u00abfin de sesion\u00bb ya\n  funcionan tal cual, y \u00abautorizacion\u00bb la resuelve new URL(valor, origin)).\n`,
  );
  process.exit(1);
}

const comprimido = (contenido) => gzipSync(contenido).length / 1024;

function compilar(conProxy) {
  rmSync(salida, { recursive: true, force: true });
  execFileSync('yarn', ['build'], {
    cwd: raiz,
    stdio: 'pipe',
    // Con la identidad que usa CI, no sin ella: si se compilara sin estas
    // variables, el paquete no podria contener el dominio y la comprobacion de
    // abajo pasaria siempre.
    env: { ...process.env, ...IDENTIDAD, VITE_SGTM_PROXY_DE_DATOS: conProxy ? 'true' : 'false' },
  });

  const activos = join(salida, 'assets');
  let bytes = 0;
  let arranque = 0;
  const trae = new Set();
  const dominios = new Set();
  const modulos = [];
  const diferidos = [];
  // Lo que el navegador pide **antes de pintar la primera pantalla**: el modulo
  // de entrada, su hoja de estilos y los trozos que Vite precarga porque la
  // entrada los importa de forma estatica. Es lo que `index.html` enumera.
  //
  // Antes se sumaba «todo lo que no es un trozo por modulo», y eso contaba como
  // arranque tambien lo que se carga con `import()` cuando alguien pulsa un
  // boton: partir en dos un formulario que nadie abre al entrar hacia **subir**
  // la cifra que mide lo que cuesta entrar. Un presupuesto que castiga la
  // correccion empuja a no hacerla.
  const deLaEntrada = primeraPantalla(salida);

  for (const archivo of readdirSync(activos)) {
    if (!archivo.endsWith('.js') && !archivo.endsWith('.css')) continue;
    const contenido = readFileSync(join(activos, archivo));
    const kb = comprimido(contenido);

    if (archivo.endsWith('.js')) {
      bytes += contenido.length;
      const texto = contenido.toString('utf8');
      for (const huella of HUELLAS) if (texto.includes(huella.texto)) trae.add(huella.que);
      for (const dominio of DOMINIOS) if (texto.includes(dominio)) dominios.add(dominio);
    }

    // Los trozos por modulo llevan el nombre de su archivo generado.
    if (archivo.includes('.generado-')) modulos.push({ archivo, kb });
    else if (deLaEntrada.has(archivo)) arranque += kb;
    else diferidos.push({ archivo, kb });
  }
  return { bytes, trae, dominios, arranque, modulos, diferidos };
}

/**
 * Los activos que `index.html` pide para pintar: la entrada, su CSS y los
 * `modulepreload` de su cierre de importaciones estaticas.
 *
 * Falla ruidosamente si no encuentra ninguno: si el formato de `index.html`
 * cambiara, esta funcion devolveria un conjunto vacio, el arranque saldria 0 KB
 * y el presupuesto pasaria siempre —una comprobacion que se salta a si misma—.
 */
function primeraPantalla(salida) {
  const html = readFileSync(join(salida, 'index.html'), 'utf8');
  const activos = new Set(
    [...html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map(([, archivo]) => archivo),
  );
  if (activos.size === 0) {
    console.error(
      '\n\u2717 index.html no enumera ningun activo: la medida del arranque no vale.\n',
    );
    process.exit(1);
  }
  return activos;
}

const con = compilar(true);
const sin = compilar(false);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`con proxy: ${kb(con.bytes)} · sin proxy: ${kb(sin.bytes)}`);

for (const huella of HUELLAS) {
  if (!con.trae.has(huella.que)) {
    console.error(`\n✗ Con la bandera encendida deberia estar ${huella.que}, y no esta.\n`);
    process.exit(1);
  }
  if (sin.trae.has(huella.que)) {
    console.error(
      `\n✗ ${huella.que} llega a produccion: la compilacion sin proxy contiene «${huella.texto}».\n  Alguna importacion dejo de ser condicional; revisa que el proxy solo se cargue con «import()» tras la bandera.\n`,
    );
    process.exit(1);
  }
}
if (sin.bytes >= con.bytes) {
  console.error('\n✗ Sin el proxy el paquete deberia ser mas pequeno, y no lo es.\n');
  process.exit(1);
}

console.log(
  `Ni el juego de datos ni el proxy llegan a produccion: ${kb(con.bytes - sin.bytes)} menos.`,
);

/* ── Ningun dominio dentro del paquete ───────────────────────────────────── */

/* Lo anterior mira la fuente —lo que el flujo pasa—; esto mira el ARTEFACTO. No
 * es redundante: el dominio podria entrar por otro camino, una constante escrita
 * a mano en cualquier archivo, y esa no la ve leyendo el flujo. */
const horneados = [...new Set([...con.dominios, ...sin.dominios])];
if (horneados.length > 0) {
  console.error(
    `\n\u2717 El paquete lleva dentro el dominio donde se sirve: ${horneados.join(', ')}.\n` +
      '  La etiqueta de la imagen vive fuera del estado de Pulumi (`ADR-0011` §5), asi que\n' +
      '  cambiar `sgtm:domain` actualiza el ingreso y NO el paquete: las dos mitades acaban\n' +
      '  apuntando a sitios distintos, en verde. Usa rutas del mismo origen.\n',
  );
  process.exit(1);
}

console.log(`El paquete no conoce su dominio: ninguno de ${DOMINIOS.join(', ')} aparece dentro.`);

/* ── Presupuesto ─────────────────────────────────────────────────────────── */

const excedidos = [];
if (sin.arranque > PRESUPUESTO.arranque) {
  excedidos.push(
    `el arranque ocupa ${sin.arranque.toFixed(1)} KB comprimidos y el presupuesto son ${PRESUPUESTO.arranque}`,
  );
}
for (const modulo of sin.modulos) {
  if (modulo.kb > PRESUPUESTO.modulo) {
    excedidos.push(
      `«${modulo.archivo}» ocupa ${modulo.kb.toFixed(1)} KB comprimidos y el presupuesto por modulo son ${PRESUPUESTO.modulo}`,
    );
  }
}

/* ── Lo que le cuesta al ciudadano abrir el portal ───────────────────────── */

const trozoDeInicio = sin.modulos.find((modulo) => modulo.archivo.includes('inicio.generado'));
const portal = sin.arranque + (trozoDeInicio?.kb ?? 0);
console.log(
  `Portal: ${portal.toFixed(1)} KB comprimidos de ${PRESUPUESTO.portal} ` +
    `(arranque ${sin.arranque.toFixed(1)} + Inicio ${(trozoDeInicio?.kb ?? 0).toFixed(1)}).`,
);
if (portal > PRESUPUESTO.portal) {
  excedidos.push(
    `abrir el portal cuesta ${portal.toFixed(1)} KB comprimidos y el presupuesto son ${PRESUPUESTO.portal}`,
  );
}

if (sin.modulos.length !== 12) {
  console.error(
    `\n✗ Deberia haber un trozo por modulo —doce— y hay ${sin.modulos.length}. Si el catalogo dejo de partirse, abrir una opcion de Catastro descarga tambien Transito.\n`,
  );
  process.exit(1);
}

if (excedidos.length > 0) {
  console.error(`\n✗ El paquete pasa de su presupuesto:\n  - ${excedidos.join('\n  - ')}`);
  console.error(
    '\n  Subir el umbral es una decision, no un tramite: se cambia en «scripts/comprobar-compilaciones.mjs» y se dice en el PR por que vale la pena.\n',
  );
  process.exit(1);
}

const mayor = sin.modulos.reduce((a, b) => (a.kb > b.kb ? a : b));
console.log(
  `Arranque: ${sin.arranque.toFixed(1)} KB comprimidos de ${PRESUPUESTO.arranque}. ` +
    `Doce trozos por modulo, el mayor ${mayor.kb.toFixed(1)} KB de ${PRESUPUESTO.modulo}.`,
);

/* Lo que **no** se descarga al entrar, dicho para que se vea que existe: son los
 * formularios que solo baja quien pulsa la accion que los abre. No tienen
 * presupuesto propio —no cuestan nada a quien no los usa— pero callarlos
 * dejaria la impresion de que el arranque bajo porque el codigo desaparecio. */
if (sin.diferidos.length > 0) {
  const total = sin.diferidos.reduce((suma, trozo) => suma + trozo.kb, 0);
  console.log(
    `Fuera del arranque, a peticion: ${total.toFixed(1)} KB en ${sin.diferidos.length} trozos ` +
      `(${sin.diferidos.map((t) => t.archivo.replace(/-[^-]+\.js$/, '')).join(', ')}).`,
  );
}
