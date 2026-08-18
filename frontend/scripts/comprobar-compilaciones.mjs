/* Comprueba que el juego de datos de ejemplo **no llega a produccion**.
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
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
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

function compilar(conProxy) {
  rmSync(salida, { recursive: true, force: true });
  execFileSync('yarn', ['build'], {
    cwd: raiz,
    stdio: 'pipe',
    env: { ...process.env, VITE_SGTM_PROXY_DE_DATOS: conProxy ? 'true' : 'false' },
  });

  const activos = join(salida, 'assets');
  let bytes = 0;
  const trae = new Set();
  for (const archivo of readdirSync(activos)) {
    if (!archivo.endsWith('.js')) continue;
    bytes += statSync(join(activos, archivo)).size;
    const contenido = readFileSync(join(activos, archivo), 'utf8');
    for (const huella of HUELLAS) if (contenido.includes(huella.texto)) trae.add(huella.que);
  }
  return { bytes, trae };
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
