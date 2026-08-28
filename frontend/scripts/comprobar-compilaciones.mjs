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

/**
 * Las **dos** aplicaciones, cada una con su paquete (#298, ADR-0016 §3).
 *
 * Antes habia una, y «el portal» se media como `arranque del back-office + el
 * trozo de Inicio`: era la mejor aproximacion posible mientras el ciudadano
 * entraba por el shell. Con `apps/portal` separado eso dejo de ser una
 * aproximacion y paso a ser una cifra falsa —medir el paquete que el ciudadano
 * YA NO descarga—, asi que ahora se mide el paquete propio de cada una.
 */
const APLICACIONES = [
  { nombre: 'backoffice', salida: join(raiz, 'apps/backoffice/dist') },
  { nombre: 'portal', salida: join(raiz, 'apps/portal/dist') },
];

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
 * `arranque` se subio a 150 KB el 2026-08-27 —quedaban doce modulos por
 * conectar— y a 156 el 2026-08-28, al conectarse tesoreria, valores, coactiva
 * y el resto de rentas (#73–#76): sus escrituras declaradas y sus conexiones
 * son parte del arranque por diseno —`conexiones.ts` y `escrituras.ts` son
 * quienes deciden que puede hacer cada pantalla, y eso se decide antes de
 * dibujarla—. Lo medido al subirlo: 152,7. El margen es para los cuatro
 * modulos de la onda 4, no para crecer sin mirar: el mayor trozo por modulo
 * sigue apretado en 11 KB.
 *
 * En una municipalidad con red mala, el arranque es lo que separa «lento» de
 * «no abre».
 */
const PRESUPUESTO = {
  /** Lo que hay que descargar para ver la primera pantalla: JS de arranque y CSS. */
  arranque: 156,
  /** Lo que cuesta entrar en un modulo: su trozo del catalogo. */
  modulo: 11,
  /**
   * Lo que le cuesta al **ciudadano** abrir el portal (#81, #298).
   *
   * Es el unico flujo del sistema que no usa alguien de la municipalidad: se
   * entra desde un telefono, una vez al ano, con la red que haya. Y desde #298
   * es **su propio paquete**: `apps/portal` no lleva el shell ni el catalogo de
   * navegacion de los doce modulos —los ~11,5 KB de 134 opciones con sus iconos
   * y resumenes que el ciudadano se descargaba para no usarlos nunca—.
   *
   * **80,9 KB medidos el 2026-08-28**, contra los 147,4 que costaba entrar por
   * el shell: se fija en 84, que son tres kilobytes de margen. Corto **a
   * proposito**: el portal es una pantalla, no doce modulos, y no tiene por que
   * crecer. Un presupuesto holgado aqui devolveria en seis meses lo que la
   * separacion acaba de quitar. Subirlo es una decision que se explica en el PR,
   * como el de arriba.
   *
   * Los 4,2 KB que bajaron de 85,1 a 80,9 son el mapa de las 169 operaciones del
   * contrato: el portal pedia con `pedirOperacion`, que lo lee para resolver la
   * ruta, y con el viajaban las 84 rutas de escritura del sistema en la
   * aplicacion destinada a ser publica. Ahora declara sus dos rutas
   * (`apps/portal/src/lecturas.ts`) y pide con `solicitar()`.
   *
   * De los 81, unos 60 son React y el cliente de consultas; lo propio del portal
   * —su pantalla, los adaptadores de `@sgtm/lectura` y la puerta de sesion— no
   * llega a 21. Bajar de ahi es cambiar de biblioteca, no de pantalla.
   */
  portal: 84,
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
  for (const app of APLICACIONES) rmSync(app.salida, { recursive: true, force: true });
  execFileSync('yarn', ['build'], {
    cwd: raiz,
    stdio: 'pipe',
    // Con la identidad que usa CI, no sin ella: si se compilara sin estas
    // variables, el paquete no podria contener el dominio y la comprobacion de
    // abajo pasaria siempre.
    env: { ...process.env, ...IDENTIDAD, VITE_SGTM_PROXY_DE_DATOS: conProxy ? 'true' : 'false' },
  });

  const medidas = {};
  for (const app of APLICACIONES) medidas[app.nombre] = medir(app.salida);
  return {
    ...medidas,
    // Lo que se busca dentro del paquete —el juego de datos, el proxy, el
    // dominio— se busca en las DOS aplicaciones: el portal instala el mismo
    // proxy detras de la misma bandera, y una fuga por ahi contaria igual.
    bytes: APLICACIONES.reduce((suma, app) => suma + medidas[app.nombre].bytes, 0),
    trae: new Set(APLICACIONES.flatMap((app) => [...medidas[app.nombre].trae])),
    dominios: new Set(APLICACIONES.flatMap((app) => [...medidas[app.nombre].dominios])),
  };
}

/** Lo que pesa el paquete de UNA aplicacion, repartido en arranque, modulos y diferidos. */
function medir(salida) {
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
 *
 * **Queda un hueco estrecho, y esta dicho a proposito.** Lo que se mide es lo
 * que `index.html` enumera, y ahi solo entran la entrada y sus importaciones
 * *estaticas*. Un `import()` de nivel superior lanzado sin esperarlo —un
 * `void import('./loQueSea')` en el modulo de entrada— lo pide el navegador
 * nada mas arrancar y **no aparece en ningun `modulepreload`**: dejaria de
 * contar como arranque sin dejar de costarlo. No se cierra automaticamente
 * porque distinguir esa forma de un `import()` legitimo tras una pulsacion
 * exige analizar el codigo, no leer el HTML. Lo que si lo delata es la lista de
 * diferidos que este mismo guion imprime: un trozo que aparezca ahi y que la
 * primera pantalla necesite se ve en el diff del tamano de los diferidos, no en
 * el del arranque.
 */
function primeraPantalla(salida) {
  const html = readFileSync(join(salida, 'index.html'), 'utf8');
  /* La ruta base es del paquete, no de esta comprobacion: el back-office se
     sirve en `/` y el portal en `/portal/` (#298), asi que lo que se busca es
     «.../assets/<archivo>» y no una raiz concreta. Con la raiz fija dentro, el
     portal no habria enumerado NINGUN activo y su arranque habria salido 0 KB
     —el presupuesto pasaria siempre—; lo unico que lo evita es que
     `primeraPantalla` se pare cuando el conjunto sale vacio. */
  const activos = new Set(
    [...html.matchAll(/(?:src|href)="[^"]*\/assets\/([^"]+)"/g)].map(([, archivo]) => archivo),
  );
  if (activos.size === 0) {
    console.error(
      `\n\u2717 ${salida}/index.html no enumera ningun activo: la medida del arranque no vale.\n`,
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
if (sin.backoffice.arranque > PRESUPUESTO.arranque) {
  excedidos.push(
    `el arranque ocupa ${sin.backoffice.arranque.toFixed(1)} KB comprimidos y el presupuesto son ${PRESUPUESTO.arranque}`,
  );
}
for (const modulo of sin.backoffice.modulos) {
  if (modulo.kb > PRESUPUESTO.modulo) {
    excedidos.push(
      `«${modulo.archivo}» ocupa ${modulo.kb.toFixed(1)} KB comprimidos y el presupuesto por modulo son ${PRESUPUESTO.modulo}`,
    );
  }
}

/* ── Lo que le cuesta al ciudadano abrir el portal ───────────────────────── */

/* Su paquete propio, no el del back-office (#298). Si `apps/portal` volviera a
   arrastrar el catalogo de navegacion —basta una importacion del catalogo en
   cualquiera de sus archivos— esta cifra lo dice el mismo dia. */
const portal = sin.portal.arranque;
console.log(`Portal: ${portal.toFixed(1)} KB comprimidos de ${PRESUPUESTO.portal}.`);
if (portal > PRESUPUESTO.portal) {
  excedidos.push(
    `abrir el portal cuesta ${portal.toFixed(1)} KB comprimidos y el presupuesto son ${PRESUPUESTO.portal}`,
  );
}

/* Y el portal no tiene modulos: son del back-office. Un trozo `.generado-` en
   su paquete quiere decir que el catalogo se le colo dentro. */
if (sin.portal.modulos.length > 0) {
  console.error(
    `\n✗ El paquete del portal lleva ${sin.portal.modulos.length} trozo(s) del catalogo de navegacion, y el ciudadano no navega modulos (ADR-0016 §3): ${sin.portal.modulos.map((m) => m.archivo).join(', ')}.\n`,
  );
  process.exit(1);
}

if (sin.backoffice.modulos.length !== 12) {
  console.error(
    `\n✗ Deberia haber un trozo por modulo —doce— y hay ${sin.backoffice.modulos.length}. Si el catalogo dejo de partirse, abrir una opcion de Catastro descarga tambien Transito.\n`,
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

const mayor = sin.backoffice.modulos.reduce((a, b) => (a.kb > b.kb ? a : b));
console.log(
  `Arranque: ${sin.backoffice.arranque.toFixed(1)} KB comprimidos de ${PRESUPUESTO.arranque}. ` +
    `Doce trozos por modulo, el mayor ${mayor.kb.toFixed(1)} KB de ${PRESUPUESTO.modulo}.`,
);

/* Lo que **no** se descarga al entrar, dicho para que se vea que existe: son los
 * formularios que solo baja quien pulsa la accion que los abre. No tienen
 * presupuesto propio —no cuestan nada a quien no los usa— pero callarlos
 * dejaria la impresion de que el arranque bajo porque el codigo desaparecio. */
for (const app of APLICACIONES) {
  const diferidos = sin[app.nombre].diferidos;
  if (diferidos.length === 0) continue;
  const total = diferidos.reduce((suma, trozo) => suma + trozo.kb, 0);
  console.log(
    `[${app.nombre}] Fuera del arranque, a peticion: ${total.toFixed(1)} KB en ${diferidos.length} trozos ` +
      `(${diferidos.map((t) => t.archivo.replace(/-[^-]+\.js$/, '')).join(', ')}).`,
  );
}
