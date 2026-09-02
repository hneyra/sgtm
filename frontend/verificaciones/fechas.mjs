/**
 * Una fecha y un instante no se dibujan igual, y confundirlos cuesta un dia.
 *
 *   node verificaciones/fechas.mjs
 *
 * Los otros arneses miran la pantalla. Este mide **dos funciones puras**, y por
 * eso no abre navegador: compila `src/ds/fechas.ts` con `esbuild` —el molde de
 * `vocabularios.mjs`— y las llama. Es la salida que #625 decidio en vez de
 * recuperar un corredor de pruebas: lo que hace falta sujetar aqui no se ve
 * dibujando, se ve comparando dos cadenas.
 *
 * <h2>Lo que sujeta, y por que en las dos direcciones</h2>
 *
 * El backend manda dos cosas que se parecen al leerlas: un `LocalDate` sin zona
 * y un `Instant` absoluto. Equivocar cualquiera de las dos **cuesta un dia**, y
 * en direcciones opuestas:
 *
 *   - **Un instante partido por la cadena** se dibuja en UTC, y en Peru son cinco
 *     horas menos: un cobro de las 20:30 de Lima es `T01:30Z` del dia siguiente,
 *     asi que la ficha lo fechaba un dia despues que el papel (#619).
 *   - **Un `LocalDate` convertido de zona** pierde el dia hacia atras:
 *     «2026-01-01» en `UTC-5` es el 31/12/2025.
 *
 * Por eso hay casos de las dos clases y no solo de una: quitar cualquiera de las
 * dos guardas deja la otra en verde, y un arreglo que las junte volveria a romper
 * la que no se mide.
 *
 * <h2>La zona en que se mide</h2>
 *
 * `TZ=America/Lima`, fijada aqui reejecutandose. Sin fijarla, los casos pasarian
 * o no segun la maquina —en UTC los cuatro primeros pasan **con el defecto
 * dentro**—, y una comprobacion que depende de donde corre no comprueba nada.
 */
import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

/* La zona se fija ANTES de importar: `Date` la lee al arrancar el proceso, asi
   que ponerla despues no cambia nada y los casos pasarian en cualquier maquina. */
if (process.env.TZ !== 'America/Lima') {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, TZ: 'America/Lima' },
  });
  process.exit(r.status ?? 1);
}

const temporal = new URL('./.fechas.mjs', import.meta.url);
await build({
  entryPoints: ['src/ds/fechas.ts'],
  outfile: fileURLToPath(temporal),
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { dia, instante, zonaDelLector } = await import(pathToFileURL(fileURLToPath(temporal)).href);
await rm(temporal, { force: true });

/* Los dos primeros son instantes con su `Z`; los dos siguientes, fechas sin zona.
   Los valores esperados son los de `America/Lima`, que es `UTC-5`. */
const CASOS = [
  ['un instante en que el dia CAMBIA', () => instante('2026-09-01T01:30:00Z'), '31/08/2026 20:30'],
  ['la hora de un recibo', () => instante('2026-09-01T05:27:38.829508Z'), '01/09/2026 00:27'],
  ['un LocalDate de 1 de enero', () => dia('2026-01-01'), '01/01/2026'],
  ['un LocalDate cualquiera', () => dia('2026-09-01'), '01/09/2026'],
  /* Lo que llega sin `T` no es un instante, y convertirlo seria el defecto de al
     lado: `instante` lo devuelve por `dia`. */
  ['una fecha sin «T» no se convierte', () => instante('2026-01-01'), '01/01/2026'],
  ['lo que no hay se dice', () => instante(null), '—'],
];

const malas = [];
for (const [que, f, esperado] of CASOS) {
  const valor = f();
  if (valor !== esperado) {
    malas.push(`${que}: salio ${JSON.stringify(valor)} y tenia que salir ${JSON.stringify(esperado)}`);
  }
}

console.log(`${CASOS.length} casos medidos en ${zonaDelLector()}`);
if (malas.length) {
  console.error(`\n${malas.length} mal:\n  ${malas.join('\n  ')}`);
  process.exit(1);
}
console.log('la fecha sin zona no se convierte, y el instante sí');
