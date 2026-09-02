/**
 * Un desplegable sin nada que ofrecer lo dice; no se queda mudo.
 *
 *   node verificaciones/desplegables.mjs
 *
 * Es el sitio por donde una pantalla puede dejar de servir **sin que nada lo
 * diga** (#718). Un `<select>` cuya única opción es «Todos» no es un error de
 * consola, ni una cifra, ni un botón apagado: los otros arneses lo miran de
 * frente y no lo ven. Y lo que quien atiende lee ahí es «esta municipalidad no
 * tiene ninguno» —la lectura plausible y equivocada por la que este repositorio
 * se ha negado varias veces a conectar una pantalla (#78, #80, #430, #431)—,
 * cuando lo que ha pasado es que la lectura contestó 403, 500 o nada.
 *
 * <h2>Cómo distingue el desplegable de lectura del de lista constante</h2>
 *
 * **No lo declara: lo mide.** Se recorren los 65 destinos con TODAS las
 * peticiones a `/api/v1` contestando 500, y el que se queda sin ninguna opción
 * real **es**, por construcción, uno alimentado por una lectura: una lista
 * compilada —los tres formatos de documento, los tributos del alta de deuda—
 * sale igual con el servidor caído. Una marca en el DOM (`data-de-lectura`)
 * habría hecho falta ponerla a mano en 49 desplegables de once módulos, y el
 * día que alguien olvidara una el arnés diría que está bien.
 *
 * Medido sobre `main` antes de este arnés: de **49** desplegables, con las
 * lecturas rotas se quedan sin opción real **3**.
 *
 * <h2>La regla, y por qué no basta con que la pantalla tenga un aviso</h2>
 *
 * Un desplegable sin opciones reales tiene que estar **apagado y con su
 * `title`** diciendo por qué. Se probó la regla más blanda —«que haya un aviso
 * en la misma sección»— y **deja pasar el defecto**: en `#/fiscalizacion/actas`
 * el aviso de al lado hablaba de la lectura de las ACTAS y el desplegable mudo
 * era el de los PROGRAMAS, que es otra lectura. Un aviso ajeno encima no
 * explica el control de abajo.
 *
 * Los dos del mapa catastral ya cumplían la regla antes de escribirla, y son de
 * donde sale: `disabled` con «No se pudieron leer los sectores de esta
 * municipalidad» y «Elige antes un sector: la manzana se numera dentro de él».
 *
 * <h2>Lo que NO cuenta como opción</h2>
 *
 * El marcador —«Todos», «Todas», «(elige una ventanilla)», «— sin elegir —»— no
 * es una opción: es la forma de decir «no he elegido». Contarlo dejaría el
 * arnés en verde con el defecto dentro, que es la mutación del AC 3.
 *
 * <h2>No abre el backend</h2>
 *
 * Se fabrica la respuesta, como `errores.mjs`: con el backend delante el
 * defecto no se ve nunca, porque los catálogos vienen llenos. Por eso tampoco
 * hace falta `SGTM_TOKEN`.
 */
import { chromium } from 'playwright-core';
import { rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const salida = new URL('./.modulos-desplegables.mjs', import.meta.url);
await build({
  entryPoints: ['src/shell/modulos.ts'],
  outfile: salida.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  define: { 'import.meta.env': '{}' },
});
const { MODULOS } = await import(pathToFileURL(salida.pathname).href);
await rm(salida, { force: true });

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';

/**
 * Lo que un desplegable dibuja para decir «no he elegido nada».
 *
 * Se compara sobre el texto de la opción, no sobre su valor: hay marcadores con
 * valor vacío y marcadores cuyo valor es el filtro entero.
 */
const MARCADOR = /^(?:—?\s*)?(?:tod[oa]s|sin elegir|elige|selecciona|ninguno|ninguna|cualquiera)\b|^\(|^[—-]\s*$|^$/i;

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1500, height: 1100 } });
const pagina = await contexto.newPage();

/* Todas las lecturas contestan 500. Es una de las tres formas reales de
   quedarse sin catálogo —403 porque el perfil no tiene ese acceso, 500, y la
   lista vacía de una instalación recién implantada— y las tres producen el
   mismo desplegable, que es justamente el problema. */
await pagina.route('**/api/v1/**', (r) =>
  r.fulfill({
    status: 500,
    contentType: 'application/problem+json',
    body: JSON.stringify({ status: 500, codigo: 'ERROR_INTERNO', mensaje: 'la lectura se rompe a proposito', incidencia: '0' }),
  }),
);

/* Los mismos 65 que recorre `sin-red.mjs`, y con la misma cuenta: los destinos
   del carril, la accion del panel y su documento. Un modulo sin ninguna parada
   sigue teniendo pantalla —`#/<modulo>`— y por eso son 65 y no los 64 que suman
   las tres listas. */
const paradas = MODULOS.flatMap((m) => {
  const suyas = [
    ...m.destinos.map((d) => `#/${m.k}/${d.k}`),
    ...(m.accion ? [`#/${m.k}/${m.accion.k}`] : []),
    ...(m.documento ? [`#/${m.k}/${m.documento.k}`] : []),
  ];
  return suyas.length ? suyas : [`#/${m.k}`];
});

const mudos = [];
let mirados = 0;
let vacios = 0;

for (const ruta of paradas) {
  await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(900);

  const encontrados = await pagina.evaluate(
    ([fuenteDelMarcador]) => {
      const marcador = new RegExp(fuenteDelMarcador.slice(1, fuenteDelMarcador.lastIndexOf('/')), 'i');
      const salida = [];
      for (const s of document.querySelectorAll('main select')) {
        const opciones = [...s.options].map((o) => (o.textContent ?? '').trim());
        const reales = opciones.filter((o) => !marcador.test(o));
        salida.push({
          reales: reales.length,
          opciones: opciones.slice(0, 4),
          apagado: s.disabled,
          motivo: s.getAttribute('title'),
          etiqueta: (s.closest('label')?.innerText ?? s.getAttribute('aria-label') ?? '').split('\n')[0].trim().slice(0, 40),
        });
      }
      return salida;
    },
    [String(MARCADOR)],
  );

  mirados += encontrados.length;
  for (const d of encontrados) {
    if (d.reales > 0) continue;
    vacios++;
    /* Apagado **y** con motivo. Apagado a secas es un control que no se puede
       usar y no dice por qué; con motivo y encendido, se puede pulsar y no
       ofrece nada. */
    if (d.apagado && d.motivo !== null && d.motivo.trim() !== '') continue;
    mudos.push({ ruta, ...d });
  }
}

await navegador.close();

console.log(`${paradas.length} pantallas · ${mirados} desplegables · ${vacios} sin ninguna opción con las lecturas rotas`);
if (!mudos.length) {
  console.log('los que se quedan sin nada que ofrecer lo dicen: ninguno mudo');
  process.exit(0);
}
console.log(`\n${mudos.length} desplegable(s) se quedan sin nada que ofrecer y no dicen por qué:\n`);
for (const d of mudos) {
  console.log(`  ${d.ruta}`);
  console.log(`      «${d.etiqueta}» · ofrece ${JSON.stringify(d.opciones)} · apagado: ${d.apagado} · motivo: ${d.motivo ?? '(ninguno)'}`);
}
console.log('\nSin opciones se lee como «esta municipalidad no tiene ninguno», y eso puede ser falso.');
console.log('Apágalo y di por qué: leyendo, la lectura falló, o de verdad no hay ninguno. Son tres cosas distintas.');
process.exit(1);
