/**
 * La ficha catastral: ningún campo se teclea sin poder viajar, y ninguno calla.
 *
 *   node verificaciones/ficha-catastral.mjs
 *
 * La pantalla del predio dibuja **123 campos** copiados del artboard, y de lo
 * que el backend sostiene de ellos no queda constancia en ninguna parte salvo
 * `PROCEDENCIA`. Una tabla así se queda vieja en silencio: basta con que alguien
 * añada un campo al formulario, o con que el cuerpo del `PUT` cambie de nombre,
 * para que la pantalla vuelva a ofrecer una caja que no viaja — que es
 * exactamente el defecto de #566.
 *
 * <h2>Lo que se comprueba, contra las DOS fuentes reales</h2>
 *
 *   1. **Cada uno de los 123 campos tiene su entrada.** Uno nuevo sin
 *      procedencia declarada rompe aquí, no en ventanilla.
 *   2. **Ninguna entrada sobra.** Una que nombre un campo que ya no existe es
 *      una decisión sobre algo que no está en pantalla.
 *   3. **Todo campo que no escribe dice por qué**, y el motivo no es un relleno:
 *      ni «no disponible», ni «próximamente», ni una frase de cuatro palabras.
 *   4. **Toda clave de `escribe` existe en el cuerpo del `PUT`**, comparada
 *      contra `CAMPOS_DEL_CUERPO_DE_ACTUALIZACION` del cliente de la API, que es
 *      la lista blanca copiada de `PeticionDeActualizacion`.
 *   5. **Todo `lee` es un selector declarado**, para que el resolutor de la
 *      pantalla —tipado contra el mismo union— no pueda quedarse corto.
 *   6. **El guardado se niega y nombra lo que falta.** Se llama a
 *      `impedimentoDeActualizacion` con la observación quitada, con la ficha sin
 *      leer y con la fecha pisada, y se exige que las tres den un motivo que
 *      nombre el dato ausente. Es la mutación que pide el último criterio del
 *      issue, y por eso esa función vive fuera del componente: dentro de un
 *      `useEffect` no habría manera de romperla.
 *
 * No necesita navegador ni backend.
 */
import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function cargar(entrada, nombre) {
  const salida = new URL(`./.${nombre}.mjs`, import.meta.url);
  await build({
    entryPoints: [entrada],
    outfile: salida.pathname,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    define: { 'import.meta.env': '{}' },
  });
  const modulo = await import(pathToFileURL(salida.pathname).href);
  await rm(salida, { force: true });
  return modulo;
}

const { GRUPOS, PROCEDENCIA, SELECTORES_DE_LECTURA } = await cargar('src/datos/catastro.ts', 'datos-catastro');
const { CAMPOS_DEL_CUERPO_DE_ACTUALIZACION, impedimentoDeActualizacion } = await cargar('src/api/catastro.ts', 'api-catastro');

const fallos = [];
let comprobados = 0;

/* Los campos tal como la pantalla los dibuja, no una copia. */
const campos = GRUPOS.flatMap((g) => g.bloques.flatMap((b) => b.campos.map((f) => [f.k, f.l, g.id])));

/* Las claves del formulario que NO son campos de la ficha: son los ocho tramos
   del código de referencia catastral, que se componen en su propio control. */
const TRAMOS_DEL_CODIGO = new Set(['distrito', 'sector', 'manzana', 'lote', 'edif', 'entrada', 'piso', 'unidad']);

/**
 * El motivo sin lo que CITA.
 *
 * El patrón de rellenos se mide sobre esto y no sobre el motivo entero, y hizo
 * falta: «Estado de la construcción» explica que el sistema no tiene ese campo
 * enumerando los valores del desplegable del manual —«en construcción,
 * inconcluso, terminado, en ruinas»—, y el patrón lo leía como la promesa de
 * una pantalla en construcción. Un escáner que da un falso positivo sobre el
 * motivo mejor escrito de los ciento veintitrés es un escáner que se acaba
 * apagando.
 */
function sinCitas(texto) {
  return texto.replace(/—[^—]*—/g, ' ').replace(/«[^»]*»/g, ' ').replace(/`[^`]*`/g, ' ');
}

/* 1 y 3, 4, 5: cada campo, su entrada y lo que la entrada declara. */
for (const [k, etiqueta, grupo] of campos) {
  comprobados++;
  const p = PROCEDENCIA[k];
  if (p === undefined) {
    fallos.push(`«${etiqueta}» (${grupo}.${k}) no declara su procedencia: hay que decir qué lectura lo publica, por qué clave viaja, o por qué ninguna de las dos.`);
    continue;
  }
  if (p.escribe === undefined) {
    const motivo = (p.motivo ?? '').trim();
    if (motivo === '') {
      fallos.push(`«${etiqueta}» (${k}) no viaja y no dice por qué.`);
    } else if (motivo.split(/\s+/).length < 8) {
      fallos.push(`El motivo de «${etiqueta}» (${k}) no explica nada: «${motivo}».`);
    } else if (/no disponible|pr[oó]ximamente|en construcci[oó]n|pendiente de|m[aá]s adelante|por ahora no/i.test(sinCitas(motivo))) {
      fallos.push(`El motivo de «${etiqueta}» (${k}) es un relleno o promete una fecha: «${motivo}».`);
    }
  } else if (!CAMPOS_DEL_CUERPO_DE_ACTUALIZACION.includes(p.escribe)) {
    fallos.push(
      `«${etiqueta}» (${k}) dice viajar por «${p.escribe}», y el cuerpo del PUT no tiene esa clave. Admite: ${CAMPOS_DEL_CUERPO_DE_ACTUALIZACION.join(', ')}.`,
    );
  }
  if (p.lee !== undefined && !SELECTORES_DE_LECTURA.includes(p.lee)) {
    fallos.push(`«${etiqueta}» (${k}) dice leerse de «${p.lee}», que no es ninguno de los selectores declarados.`);
  }
}

/* 2: ninguna entrada habla de un campo que ya no está en pantalla. */
const dibujados = new Set(campos.map((c) => c[0]));
for (const k of Object.keys(PROCEDENCIA)) {
  if (!dibujados.has(k) && !TRAMOS_DEL_CODIGO.has(k)) {
    fallos.push(`PROCEDENCIA declara «${k}», que ya no es ningún campo del formulario.`);
  }
}

/* 6: el guardado se niega, y nombra lo que falta. */
const LEIDA = { version: 3, vigenciaDesde: '2026-02-01' };
const COMPLETO = { ficha: LEIDA, observacion: 'Se corrige el número municipal', documentoOrigen: 'DJ-2026-11', vigenciaDesde: '2026-09-10' };

const negativas = [
  ['sin observación', { ...COMPLETO, observacion: '   ' }, /observaci[oó]n/i],
  ['sin haber leído la ficha', { ...COMPLETO, ficha: null }, /leer|le[ií]d/i],
  ['sin documento de origen', { ...COMPLETO, documentoOrigen: '' }, /documento de origen/i],
  ['con la fecha de la versión que ya rige', { ...COMPLETO, vigenciaDesde: '2026-02-01' }, /2026-02-01/],
];
for (const [caso, estado, nombra] of negativas) {
  comprobados++;
  /* Se atrapa el fallo porque una guarda quitada no siempre devuelve algo malo:
     quitar la de «sin ficha leída» hace que la siguiente comprobación
     desreferencie el nulo y reviente. Es rojo igual, pero un arnés que se cae
     en vez de decirlo obliga a leer una pila de llamadas para saber qué pasó. */
  let motivo;
  try {
    motivo = impedimentoDeActualizacion(estado);
  } catch (fallo) {
    fallos.push(`El guardado revienta ${caso} en vez de negarse: ${fallo.message}`);
    continue;
  }
  if (motivo === null) {
    fallos.push(`El guardado NO se niega ${caso}: la pantalla mandaría el PUT.`);
  } else if (!nombra.test(motivo)) {
    fallos.push(`Se niega ${caso}, pero no nombra lo que falta: «${motivo}».`);
  }
}

/* Y el contraste, que es lo que impide pasarse de listo: con todo puesto, no
   estorba. Sin él, una guarda que dijera «no» siempre pasaría las cuatro de
   arriba y dejaría la pantalla sin poder guardar nunca. */
comprobados++;
const conTodo = impedimentoDeActualizacion(COMPLETO);
if (conTodo !== null) fallos.push(`Con observación, documento y fecha posteriores, el guardado sigue bloqueado: «${conTodo}».`);

const conViajan = campos.filter((c) => PROCEDENCIA[c[0]]?.escribe !== undefined).length;
const conLectura = campos.filter((c) => PROCEDENCIA[c[0]]?.lee !== undefined).length;

if (fallos.length > 0) {
  console.error(`\n✗ ${fallos.length} de ${comprobados} comprobaciones en rojo:\n`);
  for (const f of fallos) console.error('  · ' + f);
  process.exit(1);
}
console.log(
  `✓ ${comprobados} comprobaciones. De los ${campos.length} campos de la ficha, ${conLectura} salen de una lectura y ${conViajan} llegan al servidor; los demás dicen por qué no.`,
);
