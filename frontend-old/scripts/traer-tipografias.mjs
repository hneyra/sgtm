/* Trae las tres familias del design system y las deja **dentro del proyecto**.
 *
 * Por que autoalojarlas: una municipalidad con red mala carga la aplicacion
 * desde su propio servidor y las tipografias desde otro dominio, que es un
 * segundo punto de fallo y una peticion mas a un tercero. Con los `woff2` en el
 * paquete, la interfaz se ve igual con o sin salida a internet.
 *
 * Se quedan los subconjuntos `latin` y `latin-ext`: el castellano cabe en el
 * primero y los nombres propios del padron —apellidos con caracteres poco
 * frecuentes— en el segundo. Cirilico, griego y vietnamita no pintan nada en un
 * padron de Sullana y son la mitad del peso.
 *
 * Uso: node scripts/traer-tipografias.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const destino = new URL('../packages/design-system/src/estilos/tipografias/', import.meta.url);

/** Lo mismo que pedia el `@import` de Google, familia por familia. */
const FAMILIAS = [
  'Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500',
  'Inter:wght@400;500;600;700',
  'JetBrains+Mono:wght@400;500;600',
];

const SUBCONJUNTOS = ['latin', 'latin-ext'];

/** Google sirve `woff2` moderno solo si el agente parece un navegador reciente. */
const AGENTE =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

mkdirSync(fileURLToPath(destino), { recursive: true });

const bloques = [];
let descargados = 0;
let bytes = 0;

for (const familia of FAMILIAS) {
  const hoja = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${familia}&display=swap`, {
      headers: { 'user-agent': AGENTE },
    })
  ).text();

  // La hoja viene por subconjuntos, cada uno precedido de su comentario.
  for (const trozo of hoja.split('/*').slice(1)) {
    const subconjunto = trozo.slice(0, trozo.indexOf('*/')).trim();
    if (!SUBCONJUNTOS.includes(subconjunto)) continue;

    const declaracion = trozo.slice(trozo.indexOf('*/') + 2);
    const url = declaracion.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1];
    if (url === undefined) continue;

    const nombre = `${url.split('/s/')[1].replace(/\//g, '-')}`;
    const binario = new Uint8Array(await (await fetch(url)).arrayBuffer());
    writeFileSync(fileURLToPath(new URL(nombre, destino)), binario);
    descargados += 1;
    bytes += binario.length;

    bloques.push(
      `@font-face {${declaracion
        .slice(declaracion.indexOf('{') + 1, declaracion.lastIndexOf('}'))
        .replace(/url\(https:\/\/fonts\.gstatic\.com[^)]+\)/, `url("./tipografias/${nombre}")`)
        .replace(/\n\s*$/, '\n')}}`,
    );
  }
}

const cabecera = `/* ============================================================
   Tipografias — Juris PE
   ------------------------------------------------------------
   Tres familias, servidas **desde el propio proyecto**:
     · Source Serif 4  — titulos y cuerpo editorial
     · Inter           — interfaz, etiquetas, botones
     · JetBrains Mono  — codigos, expedientes, importes

   ARCHIVO GENERADO — no editar a mano.
   Regenerar con: node scripts/traer-tipografias.mjs

   Estan aqui y no en el CDN de Google porque una municipalidad con red
   mala no deberia depender de un tercero para que su sistema se vea
   legible, y porque una peticion menos a un dominio ajeno es una cosa
   menos que explicar (FRO-02 §5).

   Solo los subconjuntos «latin» y «latin-ext»: el resto no pinta nada en
   un padron peruano y era la mitad del peso.
   ============================================================ */
`;

writeFileSync(
  fileURLToPath(new URL('../fonts.generado.css', destino)),
  `${cabecera}\n${bloques.join('\n\n')}\n`,
  'utf8',
);

console.log(
  `Tipografias traidas: ${descargados} archivos, ${(bytes / 1024).toFixed(0)} KB en total.`,
);
