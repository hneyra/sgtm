/**
 * Los flujos, contra el backend de verdad.
 *
 * `mirar.mjs` visita cada pantalla y comprueba que dibuja. Esto es lo otro: se
 * OPERA la interfaz —se teclea, se pulsa, se envía— y se comprueba que la
 * petición sale, que vuelve, y que lo que queda en pantalla es lo que el
 * servidor contestó.
 *
 * Y comprueba algo que ninguna otra verificación mira: **que ningún botón
 * habilitado sea inerte.** Un botón que se pulsa y no hace nada —ni petición,
 * ni navegación, ni cambio en la pantalla— es peor que uno apagado, porque el
 * apagado al menos dice que no se puede.
 *
 *   node verificaciones/flujos.mjs [modulo]
 *
 * Necesita la vista previa levantada y `SGTM_TOKEN`.
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SGTM_BASE ?? 'http://localhost:5180';
const TOKEN = process.env.SGTM_TOKEN;
const SALIDA = process.env.SGTM_CAPTURAS ?? '.capturas/flujos';
const soloModulo = process.argv[2];

if (!TOKEN) {
  console.error('Falta SGTM_TOKEN: sin sesión no hay flujo que validar.');
  process.exit(2);
}

await mkdir(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 1000 } });
await contexto.addInitScript((t) => localStorage.setItem('sgtm.token', t), TOKEN);

const fallos = [];
const notas = [];

/** Abre una ruta y devuelve la página con su registro de peticiones. */
async function abrir(ruta) {
  const pagina = await contexto.newPage();
  const peticiones = [];
  const errores = [];
  pagina.on('response', (r) => {
    if (r.url().includes('/api/v1')) peticiones.push({ estado: r.status(), url: r.url().split('/api/v1')[1] });
  });
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errores.push(m.text());
  });
  await pagina.goto(`${BASE}/#${ruta}`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(900);
  return { pagina, peticiones, errores };
}

/**
 * Pulsa cada botón habilitado de `<main>` y comprueba que algo pasa.
 *
 * «Algo» es una peticion, un cambio de ruta, o un cambio en el texto de la
 * pantalla. Un botón que no produce ninguna de las tres es inerte.
 */
async function botonesInertes(ruta, saltar = []) {
  const { pagina, peticiones, errores } = await abrir(ruta);
  const inertes = [];
  const botones = pagina.locator('main button:not([disabled])');
  const total = Math.min(await botones.count(), 24);

  for (let i = 0; i < total; i++) {
    const boton = botones.nth(i);
    let rotulo = '';
    try {
      rotulo = (await boton.innerText({ timeout: 1500 })).trim().slice(0, 40);
    } catch {
      continue;
    }
    if (rotulo === '' || saltar.some((s) => rotulo.includes(s))) continue;
    /* Un conmutador que YA esta activo no hace nada al pulsarlo, y eso no es
       inercia: es lo correcto. Se salta.

       `aria-current` NO es booleano, y ahi estaba el falso positivo: ARIA
       admite `page | step | location | date | time | true`, y el navegador de
       pasos de una transferencia marca el paso abierto con `step`. Comparandolo
       con la cadena `'true'` el paso activo no se saltaba y se contaba como un
       boton inerte —«1 boton(es) inerte(s): 1. El acto»—, que es exactamente el
       ruido que hace que un arnes deje de leerse. Vale cualquier valor menos la
       ausencia y el `false` explicito. */
    const actual = await boton.getAttribute('aria-current');
    const yaActivo =
      (await boton.getAttribute('aria-pressed')) === 'true' ||
      (actual !== null && actual !== 'false') ||
      (await boton.getAttribute('aria-selected')) === 'true';
    if (yaActivo) continue;

    const antesPeticiones = peticiones.length;
    const antesRuta = pagina.url();
    let antes = '';
    try {
      antes = await pagina.locator('main').innerHTML({ timeout: 2000 });
    } catch {
      continue;
    }

    try {
      await boton.click({ timeout: 2500 });
    } catch {
      continue; // tapado por otro elemento: no es inercia
    }
    await pagina.waitForTimeout(700);

    let despues = '';
    try {
      despues = await pagina.locator('main').innerHTML({ timeout: 2000 });
    } catch {
      despues = antes + '<!--la pantalla cambio-->';
    }
    const huboPeticion = peticiones.length > antesPeticiones;
    const huboRuta = pagina.url() !== antesRuta;
    const huboCambio = despues !== antes;
    /* El toast vive fuera de <main>, así que se mira aparte. */
    const huboAviso = (await pagina.locator('[role="status"]').count()) > 0;

    if (!huboPeticion && !huboRuta && !huboCambio && !huboAviso) inertes.push(rotulo);

    if (huboRuta) {
      await pagina.goto(`${BASE}/#${ruta}`, { waitUntil: 'networkidle' });
      await pagina.waitForTimeout(600);
    }
  }

  await pagina.screenshot({ path: `${SALIDA}/${ruta.replace(/\//g, '-').replace(/^-/, '')}.png` });
  await pagina.close();
  return { inertes, peticiones, errores };
}

const RUTAS = [
  '/inicio', '/catastro/panel', '/catastro/predios', '/catastro/territorio', '/catastro/valores',
  '/catastro/mapa', '/catastro/reporte', '/rentas/panel', '/rentas/padron', '/rentas/determinar',
  '/rentas/transferir', '/rentas/deuda', '/rentas/reporte', '/fiscalizacion/panel',
  '/fiscalizacion/deteccion', '/fiscalizacion/programas', '/fiscalizacion/actas',
  '/fiscalizacion/resultados', '/seguridad/panel', '/seguridad/accesos', '/seguridad/auditoria',
  '/seguridad/sistema', '/tesoreria/panel', '/tesoreria/cobrar', '/tesoreria/convenios',
  '/tesoreria/recibos', '/tesoreria/cierre', '/tesoreria/recaudacion', '/consultas/buscar',
  '/consultas/cuenta', '/consultas/constancia', '/valores/panel', '/valores/lista',
  '/valores/emision', '/valores/prescripcion', '/transito/panel', '/transito/padron',
  '/transito/internamiento', '/transito/procesos', '/transito/codigos', '/transito/reportes',
  '/sanciones/panel', '/sanciones/lista', '/sanciones/cuis', '/sanciones/valores',
  '/sanciones/reportes', '/coactiva/panel', '/coactiva/importacion', '/coactiva/lista',
  '/coactiva/deuda', '/licencias/panel', '/licencias/lista', '/licencias/catalogos',
  '/licencias/reportes',
];

/* «Imprimir» abre el diálogo del navegador y bloquea; «Cerrar la sesión» se va
   a Keycloak. Ninguno de los dos es inercia. */
const SALTAR = ['Imprimir', 'Cerrar la sesión', 'Salir', 'Descargar'];

let conPeticion = 0;
let total = 0;
let sinAutenticar = 0;
for (const ruta of RUTAS) {
  if (soloModulo && !ruta.startsWith('/' + soloModulo)) continue;
  const { inertes, peticiones, errores } = await botonesInertes(ruta, SALTAR);
  total += peticiones.length;
  const noAutenticadas = peticiones.filter((p) => p.estado === 401).length;
  sinAutenticar += noAutenticadas;
  /* Una linea por ruta. Sin esto el arnes no imprime NADA hasta el final, y
     durante los diez minutos que tarda «sigue corriendo» y «se colgo» son
     indistinguibles. */
  process.stdout.write(
    `  ${ruta.padEnd(30)} ${String(peticiones.length).padStart(3)} peticion(es)` +
      `${noAutenticadas ? ` · ${noAutenticadas} SIN AUTENTICAR` : ''}\n`,
  );
  if (peticiones.length > 0) conPeticion++;
  const malas = peticiones.filter((p) => p.estado >= 500);
  if (errores.length) fallos.push(`${ruta}\n  errores: ${errores.slice(0, 2).join(' | ')}`);
  if (malas.length) fallos.push(`${ruta}\n  ${malas.length} respuesta(s) 5xx: ${malas.map((m) => m.estado + ' ' + m.url.slice(0, 44)).join(', ')}`);
  if (inertes.length) fallos.push(`${ruta}\n  ${inertes.length} boton(es) inerte(s): ${inertes.join(' · ')}`);
  if (peticiones.length === 0) notas.push(`${ruta} — ninguna peticion al backend`);
}

await navegador.close();

/* CUALQUIER 401 invalida la corrida, no solo que lo sean todas.
   Un token caducado deja este arnes en VERDE, y ese es el peor de sus fallos:
   un 401 no es un 5xx, ninguna pantalla llega a cargar, ningun boton llega a
   estar habilitado, y no hay nada que salga mal porque no hay nada.

   La primera version comparaba `sinAutenticar === total`, y dejaba pasar el caso
   que de verdad ocurre: el token vive **900 s** y el recorrido completo tarda
   unos once minutos en esta maquina, asi que el tramo final corre con el token
   caducado, solo PARTE de las peticiones son 401, la guarda no dispara y el
   informe sale verde con los ultimos modulos sin verificar. Lo encontro un
   agente usandolo, no una revision. */
if (sinAutenticar > 0) {
  console.error(
    `\nEl token no vale: ${sinAutenticar} de ${total} peticiones volvieron 401.\n` +
      (sinAutenticar === total
        ? 'No se ha verificado nada.'
        : 'Caduco A MITAD del recorrido: lo que va despues del primer 401 no se ha verificado.') +
      '\nConsigue un token fresco y vuelve a correrlo. Si el recorrido completo no cabe en la\n' +
      'vida del token, correlo por modulos.',
  );
  process.exit(2);
}

console.log(`${conPeticion} rutas hablaron con el backend · capturas en ${SALIDA}/`);
if (notas.length) console.log(`\nSin conectar (${notas.length}):\n  ${notas.join('\n  ')}`);
if (fallos.length) {
  console.error(`\n${fallos.length} con problema:\n\n${fallos.join('\n\n')}`);
  process.exit(1);
}
console.log('\nNingun boton inerte, ningun 5xx y ningun error de consola.');
