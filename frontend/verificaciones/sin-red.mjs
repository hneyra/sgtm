/**
 * Con la red cortada, ninguna pantalla puede enseñar una cifra.
 *
 *   node verificaciones/sin-red.mjs [modulo]
 *
 * Es la verificación de la única regla que gobierna esta interfaz: cuando el
 * backend no sostiene lo que la pantalla dice, se dibuja `—` y el motivo, nunca
 * la cifra de la maqueta. Y el momento en que esa regla se rompe sin que nadie
 * lo vea es justamente éste — un 403, un 500, la red caída— porque con datos
 * delante la pantalla parece correcta.
 *
 * Cómo mide. Se abre cada destino con TODAS las peticiones a `/api/v1`
 * abortadas, y se busca en la página lo que sólo puede venir de un dato:
 *
 *   - un importe con dígitos (`S/ 1,842.60`),
 *   - un número de cuatro cifras o más con separador de millares (`62,418`),
 *   - un porcentaje con decimal (`77.7 %`).
 *
 * Lo que NO cuenta como cifra, a propósito: los años (2026), los números de un
 * rótulo estable —«6 tipos de cálculo»—, y `S/ —`, que es exactamente lo que se
 * quiere ver. Sin esas excepciones la verificación gritaría en verde y dejaría
 * de leerse, que es la forma en que un escáner deja de proteger.
 *
 * Necesita una vista previa levantada y el Chromium de Playwright.
 */
import { chromium } from 'playwright-core';
import { rm } from 'node:fs/promises';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const temporal = new URL('./.modulos-sin-red.mjs', import.meta.url);
await build({
  entryPoints: ['src/shell/modulos.ts'],
  outfile: temporal.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const { MODULOS } = await import(pathToFileURL(temporal.pathname).href);
await rm(temporal, { force: true });

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const soloModulo = process.argv[2]?.startsWith('--') ? null : process.argv[2];

/** Lo que sólo puede salir de un dato que aquí no se ha podido leer. */
const CIFRAS = [
  { nombre: 'importe', re: /S\/\s?-?\d[\d.,]*/g },
  { nombre: 'millares', re: /(?<![\d.,])\d{1,3}(?:,\d{3})+(?![\d.,])/g },
  { nombre: 'porcentaje', re: /\d+[.,]\d+\s?%/g },
  /* Un importe SIN su «S/» delante. Existe porque los hay: «Monto deducido
     (S/) 0.00» lleva el símbolo en la etiqueta y la cifra sola en la celda, y
     así se escapaba del patrón de arriba. Exactamente dos decimales, que es la
     forma del dinero: un año no casa, «1.0206» tampoco, y un porcentaje ya lo
     caza su propio patrón. */
  { nombre: 'importe suelto', re: /(?<![\d.,%])\d[\d,]*\.\d{2}(?![\d%])/g },
  /* Un identificador de documento o de predio: «ACT-2026-00418»,
     «PF-2026-014», «EXP-2026-000009», «02-014-D-14-01». No es una cifra, y por
     eso se escapaba de los cuatro patrones de arriba: con la red cortada la
     pantalla del acta seguia diciendo su numero, su programa y su codigo
     predial —los tres de la maqueta— y este arnes informaba «ninguna ensenia
     una cifra», en verde (#702).

     Se pide un grupo de **cuatro** digitos seguidos —el ano de un correlativo—
     o **cinco** grupos separados por guion —la forma de un codigo catastral—,
     que es lo que separa un identificador de un rotulo. «REC-1», «art. 176»,
     «V-65», «2026-2027» y «01 — CONCRETO» no casan; se midio contra los 65
     destinos y con la red cortada no sale ninguno. */
  { nombre: 'identificador', re: /\b[A-Z]{2,4}-\d{4}-\d{2,7}\b|\b\d{2}(?:-[0-9A-Z]{1,3}){4,}\b/g },
  /* Una magnitud con su unidad: «1406.5 km», «820 m», «180.50 m2», «2.4 ha».
     Existe porque los tres patrones de arriba exigen separador de millares o
     dos decimales, y una medida no lleva ninguno de los dos: la escala de un
     mapa se escapaba entera, y con ella una mutacion que afirmaba «1406.5 km de
     ancho» sobre un lienzo vacio dejaba esto en VERDE. Va anclada a la unidad
     —no a «cualquier numero»— porque ensancharlo a secas llena las 65 pantallas
     de falsos positivos y un escaner que grita deja de leerse. */
  { nombre: 'magnitud', re: /(?<![\d.,])\d[\d.,]*\s?(?:km|m²|m2|ha)\b/g },
];

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1400 } });
/* Con token puesto: sin él, algunas pantallas ni intentan leer y la
   verificación mediría el camino equivocado —el de «no hay sesión»— en vez del
   de «se pidió y no se pudo». */
if (process.env.SGTM_TOKEN) {
  await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), process.env.SGTM_TOKEN);
}
const pagina = await contexto.newPage();
await pagina.route('**/api/v1/**', (r) => r.abort());

/**
 * Abre lo que nace plegado antes de mirar.
 *
 * `innerText` no ve lo que está oculto, así que una sección cerrada era un
 * escondite perfecto: la de «Emisión y cuotas» del predial llevaba dentro el
 * derecho de emisión, las cuatro cuotas y sus cuatro vencimientos —cifras del
 * conjunto sellado— y esta comprobación pasaba en verde por encima.
 */
async function desplegarlo(pagina) {
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const plegados = pagina.locator('[aria-expanded="false"]');
    const cuantos = await plegados.count();
    if (cuantos === 0) break;
    for (let i = 0; i < cuantos; i++) {
      await plegados.nth(i).click({ timeout: 900 }).catch(() => {});
    }
    await pagina.waitForTimeout(160);
  }
  await pagina.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await pagina.waitForTimeout(200);
}

/**
 * Los estados de la pantalla que hay que visitar uno a uno, porque `innerText`
 * no ve lo que no esta montado.
 *
 * Desplegar no basta. Un asistente por pasos y una barra de pestanas **no
 * ocultan** su contenido: no lo dibujan, y ahi no hay `aria-expanded` que abrir
 * ni `<details>` que forzar. Con eso, `#/fiscalizacion/actas` pasaba en VERDE
 * enseniando `S/ 1,842.60` y `S/ 267.50` —las dos cifras de la maqueta, en el
 * bloque «Lo que va a pasar al cerrar el acta»— porque viven en el paso 4 y
 * este arnes solo miraba el paso 1. Medido sobre el arbol anterior a #702: «7
 * pantallas recorridas · ninguna ensenia una cifra».
 *
 * Las formas que este producto usa. **Eran «dos, y no hay una tercera», y esa
 * frase la escribi yo y era falsa** — la tercera es la mayoritaria y llevaba
 * dentro una pantalla entera de maqueta:
 *
 *   - el paso de un asistente, que se declara con `aria-current="step"` (los
 *     hermanos del activo son los demas pasos);
 *   - `role="tab"`;
 *   - y **`aria-pressed`**, que es como se declara un conmutador de vista.
 *
 * Medido sobre los 65 destinos con la red cortada: `aria-current="step"` sale
 * **2**, `role="tab"` sale **0** —esa mitad de la regla no ha disparado nunca—
 * y `aria-pressed` sale **27, en 7 destinos**.
 *
 * Y uno de esos 27 era el defecto: `#/inicio` tiene un conmutador
 * Personal/Contribuyente, **fuera de `<main>`**, y al pulsar «Contribuyente»
 * dibujaba la cuenta entera de una persona del artboard —doce importes, hasta
 * «Autovaluo S/ 132 196,75», con su nombre y un boton «Pagar en linea»— con la
 * red cortada y este arnes en verde. Es #702 un mecanismo mas alla.
 *
 * Un conmutador no se restaura entre destinos y da igual: cada destino se abre
 * con `goto`, que remonta la pantalla.
 */
async function estadosDe(pagina) {
  return pagina.evaluate(() => {
    const fuera = new Set();
    for (const activo of document.querySelectorAll('[aria-current="step"]')) {
      const grupo = activo.parentElement;
      if (grupo === null) continue;
      for (const b of grupo.querySelectorAll('button')) fuera.add(b);
    }
    for (const t of document.querySelectorAll('[role="tab"]')) fuera.add(t);
    /* El conmutador de vista. NO se acota a `<main>`: el de `#/inicio` vive en
       la cabecera, fuera de `main`, y era exactamente por donde se colaba. */
    for (const c of document.querySelectorAll('[aria-pressed]')) fuera.add(c);
    /* Se devuelve una MARCA y no el elemento: entre clic y clic la pantalla se
       vuelve a dibujar y un manejador de Playwright apuntaria a un nodo que ya
       no esta. */
    let i = 0;
    const marcas = [];
    for (const e of fuera) {
      const marca = 'sin-red-' + i++;
      e.setAttribute('data-sin-red', marca);
      marcas.push(marca);
    }
    return marcas;
  });
}

const sucias = [];
let vistas = 0;

for (const m of MODULOS) {
  if (soloModulo && m.k !== soloModulo) continue;
  /* Los destinos del carril **y** la accion del panel y su documento.
     Enumerando solo `m.destinos` esto era ciego a trece pantallas —las altas y
     las hojas imprimibles—, y son justo donde mas cifras hay: `mirar.mjs` ya las
     recorria y esto no, asi que devolver las cifras del artboard a la hoja de
     una resolucion de determinacion la dejaba ensenandolas con la red cortada y
     este arnes informando «ninguna ensenia una cifra», en verde. */
  const paradas = [
    ...m.destinos.map((d) => d.k),
    ...(m.accion ? [m.accion.k] : []),
    ...(m.documento ? [m.documento.k] : []),
  ];
  for (const d of paradas.length ? paradas : ['']) {
    const ruta = d ? `#/${m.k}/${d}` : `#/${m.k}`;
    await pagina.goto(`${BASE}/${ruta}`, { waitUntil: 'domcontentloaded' });
    await pagina.waitForTimeout(900);
    vistas++;
    await desplegarlo(pagina);

    /** Lo que la pantalla dice en el estado en que esta ahora mismo. */
    const revisar = async (donde) => {
      const texto = await pagina.locator('body').innerText();
      for (const { nombre, re } of CIFRAS) {
        const halladas = [...texto.matchAll(re)].map((x) => x[0]).filter((x) => !/^S\/\s?[—-]$/.test(x));
        if (halladas.length) {
          const unicas = [...new Set(halladas)];
          sucias.push({ ruta: ruta + donde, nombre, halladas: unicas.slice(0, 6), total: unicas.length });
        }
      }
    };
    await revisar('');

    for (const marca of await estadosDe(pagina)) {
      const control = pagina.locator(`[data-sin-red="${marca}"]`);
      const rotulo = (await control.getAttribute('aria-label').catch(() => null)) ?? (await control.innerText().catch(() => '')) ?? '';
      await control.click({ timeout: 900 }).catch(() => {});
      await pagina.waitForTimeout(260);
      await desplegarlo(pagina);
      await revisar(` · ${rotulo.replace(/\s+/g, ' ').trim().slice(0, 34)}`);
    }
  }
}

await navegador.close();

console.log(`${vistas} pantallas recorridas con la red cortada`);
if (!sucias.length) {
  console.log('ninguna enseña una cifra: lo que no se puede leer, no se afirma');
  process.exit(0);
}
console.log(`\n${sucias.length} pantallas afirman una cifra que no han podido leer:\n`);
for (const s of sucias) {
  const mas = s.total > s.halladas.length ? ` … y ${s.total - s.halladas.length} más` : '';
  console.log(`  ${s.ruta.padEnd(30)} ${s.nombre.padEnd(14)} ${s.halladas.join(' · ')}${mas}`);
}
console.log('\nCon el backend caído sólo puede salir «—» y el motivo. Una cifra aquí es del prototipo.');
process.exit(1);
