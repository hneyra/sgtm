/**
 * Lo que sale por la impresora es un documento municipal, no una captura de la
 * aplicacion.
 *
 *   node verificaciones/impresion.mjs
 *
 * Toda pantalla de documento —la ficha del contribuyente, la constancia de no
 * adeudo, las quince hojas de Transito, las siete de Infracciones, la
 * declaracion jurada— ofrece «Imprimir», y lo que salia llevaba delante **la
 * aplicacion entera**: el carril de modulos, el panel de destinos y la caja de
 * busqueda. La hoja A4 venia despues, con la primera pagina ya gastada.
 *
 * No es cosmetico: ese papel se entrega en ventanilla.
 *
 * <h2>Por que hace falta un arnes y no basta con mirar la regla</h2>
 *
 * Porque la regla anterior **existia y parecia correcta**: `@media print {
 * [data-noprint] { display: none } }`. Lo que fallaba es que la marca la llevaban
 * las barras de acciones y los filtros de cada pantalla y **no el shell**, asi
 * que leyendo el CSS no se veia nada raro. Solo se ve emulando la impresion y
 * leyendo lo que queda visible.
 *
 * <h2>Lo que se comprueba</h2>
 *
 * Con `media: print` emulado, en cada destino de documento:
 *
 *   1. **El texto visible no empieza por el shell**: nada de «Panel del modulo»,
 *      «Buscar», ni el nombre del carril.
 *   2. **Queda algo que imprimir**: si la regla se pasara de ancha —ocultarlo
 *      todo— el papel saldria en blanco, que es peor que con el menu encima
 *      porque nadie lo nota hasta tenerlo en la mano. Se exige en las tres hojas
 *      que dibujan sin sujeto; las otras dos se dicen aparte, con su motivo.
 *
 * Se recorren **cinco** destinos y no uno: la regla es una y vale para todos,
 * pero es exactamente lo que la anterior tambien parecia.
 *
 * Necesita la vista previa levantada. `SGTM_TOKEN` es opcional: sin el las hojas
 * salen con su aviso de sesion, y el shell tampoco debe imprimirse.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const TOKEN = process.env.SGTM_TOKEN;

/* Los tres destinos de documento del carril, mas los dos centros de reportes que
   emiten hoja. Si alguno deja de existir, este arnes se pone rojo por no
   encontrarlo, que es lo correcto: la regla dejaria de estar comprobada ahi. */
const HOJAS = [
  /* Estas dos **no dibujan hoja hasta que hay sujeto** —un codigo de
     contribuyente, un numero de declaracion—, y su caja de busqueda va marcada
     `data-noprint`, asi que en `print` no queda nada. Eso NO es la regla
     pasandose de ancha: es que no hay papel que sacar, y su «Imprimir» esta
     apagado —comprobado— de modo que la hoja en blanco no se puede provocar.
     Se recorren igual, porque lo que si tienen que cumplir es no llevar el shell
     delante el dia que alguien elija un sujeto. */
  { ruta: '/catastro/reporte', sinSujeto: true },
  { ruta: '/rentas/reporte', sinSujeto: true },
  { ruta: '/consultas/constancia', sinSujeto: false },
  { ruta: '/transito/reportes', sinSujeto: false },
  { ruta: '/sanciones/reportes', sinSujeto: false },
];

/* Lo que el shell escribe y NO puede aparecer en el papel. Son literales del
   carril y de la cabecera, no de ninguna pantalla. */
const DEL_SHELL = ['Panel del módulo', 'Panel del turno', 'Buscar', 'Ctrl K', 'DOCUMENTOS'];

const nav = await chromium.launch();
const contexto = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
if (TOKEN) await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), TOKEN);

const conShell = [];
const enBlanco = [];
let vistas = 0;

for (const { ruta, sinSujeto } of HOJAS) {
  const pagina = await contexto.newPage();
  await pagina.emulateMedia({ media: 'print' });
  try {
    await pagina.goto(`${BASE}/#${ruta}`, { waitUntil: 'networkidle', timeout: 20000 });
    await pagina.waitForTimeout(1100);
  } catch {
    await pagina.close();
    continue;
  }
  vistas++;

  /* `innerText` de Playwright respeta `visibility: hidden`, que es justo lo que
     la regla usa: lo oculto no sale. Con `textContent` saldria todo y este arnes
     no mediria nada. */
  const impreso = (await pagina.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  const cuela = DEL_SHELL.filter((t) => impreso.includes(t));
  if (cuela.length) conShell.push(`${ruta} → ${cuela.map((c) => `«${c}»`).join(', ')}`);
  if (!sinSujeto && impreso.length < 40) enBlanco.push(`${ruta} → ${impreso.length} caracteres`);
  await pagina.close();
}

await nav.close();

console.log(`${vistas} hojas emuladas en «media: print»`);

const fallos = [];
if (vistas !== HOJAS.length) fallos.push(`solo ${vistas} de ${HOJAS.length} hojas se pudieron abrir`);
if (conShell.length)
  fallos.push(`${conShell.length} con el shell dentro del papel:\n  ${conShell.join('\n  ')}`);
if (enBlanco.length)
  fallos.push(
    `${enBlanco.length} salen en BLANCO —la regla se pasó de ancha—:\n  ${enBlanco.join('\n  ')}`,
  );

if (fallos.length) {
  console.error(`\n${fallos.join('\n\n')}`);
  process.exit(1);
}
console.log('ninguna lleva el shell delante, y ninguna sale en blanco');
