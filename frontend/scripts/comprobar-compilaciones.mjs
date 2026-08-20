/* Comprueba lo que llega al navegador de una municipalidad, y lo que no.
 *
 * Dos cosas, y las dos hay que medirlas porque las dos se pierden sin avisar:
 *
 *   1. Que el juego de datos de ejemplo **no llega a produccion**.
 *   2. Que el paquete no pasa de su presupuesto, ni el arranque ni cada modulo.
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
 * se agregan de dos en dos. Los numeros salen de lo que hay hoy con un margen
 * corto a proposito —subirlos tiene que costar una linea de este archivo y una
 * frase en el PR que diga por que—.
 *
 * En una municipalidad con red mala, el arranque es lo que separa «lento» de
 * «no abre».
 */
const PRESUPUESTO = {
  /** Lo que hay que descargar para ver la primera pantalla: JS de arranque y CSS. */
  arranque: 130,
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
   * El presupuesto esta puesto en lo que mide hoy, no en lo que deberia medir:
   * asi la cifra no puede empeorar en silencio, y la conversacion sobre bajarla
   * queda abierta con su numero delante.
   */
  portal: 135,
};

const comprimido = (contenido) => gzipSync(contenido).length / 1024;

function compilar(conProxy) {
  rmSync(salida, { recursive: true, force: true });
  execFileSync('yarn', ['build'], {
    cwd: raiz,
    stdio: 'pipe',
    env: { ...process.env, VITE_SGTM_PROXY_DE_DATOS: conProxy ? 'true' : 'false' },
  });

  const activos = join(salida, 'assets');
  let bytes = 0;
  let arranque = 0;
  const trae = new Set();
  const modulos = [];

  for (const archivo of readdirSync(activos)) {
    if (!archivo.endsWith('.js') && !archivo.endsWith('.css')) continue;
    const contenido = readFileSync(join(activos, archivo));
    const kb = comprimido(contenido);

    if (archivo.endsWith('.js')) {
      bytes += contenido.length;
      const texto = contenido.toString('utf8');
      for (const huella of HUELLAS) if (texto.includes(huella.texto)) trae.add(huella.que);
    }

    // Los trozos por modulo llevan el nombre de su archivo generado; lo demas
    // —el indice, las dependencias y la hoja de estilos— es el arranque.
    if (archivo.includes('.generado-')) modulos.push({ archivo, kb });
    else arranque += kb;
  }
  return { bytes, trae, arranque, modulos };
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
