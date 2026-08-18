/* Porta el catalogo del prototipo a modulos de datos tipados.
 *
 * Origen: `design/sgtm-data-{1..5}.js` — 12 modulos, 134 opciones, ~305 KB de
 * JavaScript declarativo. FRO-03 §2 lo dice sin rodeos: **no se escriben 134
 * pantallas a mano**; se porta el catalogo y se escribe un renderizador.
 *
 * Lo que este script decide, y es la decision que sostiene todo lo demas:
 * **separa la estructura del valor.**
 *
 *   estructura → `apps/backoffice/src/catalogo/`   (que campos, que columnas,
 *                                                   que pestanas: es del cliente)
 *   valor      → `packages/api-mock/src/`          (que dice cada campo, que
 *                                                   filas trae la tabla: es del
 *                                                   servidor, hoy simulado)
 *
 * El prototipo los trae mezclados —cada campo lleva su `v`— porque es un
 * prototipo. Separarlos es lo que permite que la aplicacion pida sus datos por
 * HTTP a `/api/v1/...` desde el primer dia: cuando el backend sirva esas 134
 * operaciones se apaga el proxy y no cambia una linea de la interfaz. Si los
 * valores se quedaran en el catalogo, la interfaz nunca haria una peticion y la
 * integracion seria una reescritura.
 *
 * Uso: node scripts/portar-catalogo.mjs   (o `yarn portar-catalogo`)
 */

import { createContext, runInContext } from 'node:vm';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../../', import.meta.url);
const origen = new URL('design/', raiz);
const catalogo = new URL('frontend/apps/backoffice/src/catalogo/', raiz);
const simulada = new URL('frontend/packages/api-mock/src/', raiz);

/* ── Cargar el prototipo ──────────────────────────────────────────────── */

const ventana = {};
const contexto = createContext({ window: ventana, Object, Array, JSON, Math, String, Number });
for (let i = 1; i <= 5; i++) {
  runInContext(readFileSync(fileURLToPath(new URL(`sgtm-data-${i}.js`, origen)), 'utf8'), contexto);
}
const NAV = ventana.SGTM_NAV;
const PANTALLAS = ventana.SGTM_SCREENS;

/* ── Iconos de modulo ─────────────────────────────────────────────────────
   Copiados literalmente del objeto `icons` de la clase de logica de
   `design/SGTM.dc.html`. SVG de linea, viewBox 24x24, stroke-width 1.7.
   Estan aqui y no en el HTML porque el HTML es el prototipo, no una entrada
   del build: si el prototipo cambia sus iconos, se vuelven a copiar. */
const ICONOS = {
  Inicio: ['M3 10.6 12 3.5l9 7.1', 'M5.6 9.6V20.5h12.8V9.6', 'M10 20.5v-5.4h4v5.4'],
  Catastro: [
    'M3.5 6.6 9 4.2l6 2.4 5.5-2.4v13.2L15 19.8l-6-2.4-5.5 2.4z',
    'M9 4.2v13.2',
    'M15 6.6v13.2',
  ],
  'Rentas · Registro': [
    'M6.5 3.5h7.5l4 4v13h-11.5z',
    'M14 3.5v4h4',
    'M9.5 12.5h5',
    'M9.5 16.5h3.5',
  ],
  Fiscalización: [
    'M9.5 4.5H8A1.5 1.5 0 0 0 6.5 6v13A1.5 1.5 0 0 0 8 20.5h8a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 16 4.5h-1.5',
    'M9.5 3.2h5v2.8h-5z',
    'M9.6 13.2l2 2 3.4-4',
  ],
  Tránsito: [
    'M5 15.8v-3.2l1.9-4.4h10.2l1.9 4.4v3.2',
    'M3.6 15.8h16.8',
    'M8.4 18.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0',
    'M18.8 18.4a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0',
  ],
  'Infracciones administrativas': ['M12 4.2 20.8 19.6H3.2z', 'M12 9.8v4.4', 'M12 17.1h.02'],
  Tesorería: [
    'M3.2 7.4h17.6v9.2H3.2z',
    'M13.6 12a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0',
    'M6.6 10.6v2.8',
    'M17.4 10.6v2.8',
  ],
  Consultas: ['M17.4 11a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0', 'M15.8 15.8 20.6 20.6'],
  Valores: [
    'M6.5 3.5h7.5l4 4v13h-11.5z',
    'M14 3.5v4h4',
    'M9.5 11.5h5',
    'M15.6 16.4a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0',
  ],
  Coactiva: [
    'M12 4.4v3.2',
    'M5 8.6h14',
    'M5 8.6 2.8 14.4h4.4z',
    'M19 8.6 16.8 14.4h4.4z',
    'M8.4 20h7.2',
  ],
  'Autorizaciones y licencias': [
    'M4.4 9.6V20h15.2V9.6',
    'M3.2 9.6 5.2 4.6h13.6l2 5z',
    'M9.6 20v-5.4h4.8V20',
  ],
  Seguridad: [
    'M12 3.4 19 5.9v5.6c0 4.1-3 7.2-7 9.1-4-1.9-7-5-7-9.1V5.9z',
    'M9.4 12.1l1.9 1.9 3.5-3.6',
  ],
};

/* ── Clasificacion en bloques ─────────────────────────────────────────────
   FRO-03 §4, en el mismo orden. Se precalcula aqui, no en tiempo de
   ejecucion: correr cuatro expresiones regulares por opcion en cada render
   es trabajo que el build puede hacer una vez. */
const BLOQUES = ['Registro y mantenimiento', 'Procesos', 'Consultas', 'Documentos y reportes'];

function bloqueDe(pantalla, etiqueta) {
  const t = `${pantalla?.title ?? etiqueta}`.toLowerCase();
  if (
    pantalla?.kind === 'report' ||
    /reporte|padr[oó]n|resumen|record|constancia|resoluci[oó]n|certificado/.test(t)
  ) {
    return 'Documentos y reportes';
  }
  if (/consulta|b[uú]squeda|estado de cuenta|hist[oó]rico|auditor[ií]a|panel|portal/.test(t)) {
    return 'Consultas';
  }
  if (
    /c[aá]lculo|generaci[oó]n|proceso|transferencia|pase|importaci[oó]n|emisi[oó]n|notificaci[oó]n|anulaci[oó]n|alta de|baja de|cambio|cambiar|actualizaci[oó]n|fraccionamiento|liquidaci[oó]n|declaraci[oó]n|duplicado|prescripci[oó]n|copias de seguridad|acto/.test(
      t,
    )
  ) {
    return 'Procesos';
  }
  return 'Registro y mantenimiento';
}

/* ── Nombres ──────────────────────────────────────────────────────────── */

const sinTildes = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');

/** `Rentas · Registro` → `rentas-registro`. Es el segmento de la ruta. */
const aRanura = (texto) =>
  sinTildes(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** `Código de Ref. Catastral` → `codigoDeRefCatastral`. Es la clave del campo en el JSON. */
function aClave(etiqueta) {
  const partes = sinTildes(etiqueta)
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return 'campo';
  const [primera, ...resto] = partes;
  const camel =
    primera.toLowerCase() +
    resto.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('');
  return /^[0-9]/.test(camel) ? `c${camel}` : camel;
}

/* ── Separar estructura de valor ──────────────────────────────────────── */

/** Reparte un campo del prototipo: la estructura al catalogo, el valor a la respuesta. */
function partirCampo(campo, clavesUsadas, valores) {
  let clave = aClave(campo.label);
  for (let n = 2; clavesUsadas.has(clave); n++) clave = `${aClave(campo.label)}${n}`;
  clavesUsadas.add(clave);

  if (campo.t === 'chk') {
    if (campo.on) valores[clave] = true;
  } else if (campo.v) {
    valores[clave] = campo.v;
  }

  const estructura = { clave, label: campo.label, t: campo.t };
  if (campo.ph) estructura.ph = campo.ph;
  if (campo.opts) estructura.opts = campo.opts;
  if (campo.wide) estructura.ancho = true;
  return estructura;
}

function partirSeccion(seccion, clavesUsadas, valores) {
  const estructura = {
    label: seccion.label,
    campos: seccion.fields.map((f) => partirCampo(f, clavesUsadas, valores)),
  };
  if (seccion.hint) estructura.hint = seccion.hint;
  return estructura;
}

/** Una celda del prototipo es texto o la tupla `[texto, tono]`, que pinta insignia. */
const partirCelda = (celda) =>
  Array.isArray(celda) ? { texto: celda[0], tono: celda[1] } : { texto: celda };

/**
 * Fecha a la que estan actualizadas las cifras de la respuesta (regla 9,
 * RNF-075). El prototipo la fija en su ejemplo: 13 de agosto de 2026.
 */
const FECHA_DE_CALCULO = '2026-08-13';

const estructuras = {};
const respuestas = {};
const rutas = [];

for (const grupo of NAV) {
  for (const [id, etiqueta] of grupo.items) {
    const p = PANTALLAS[id];
    if (!p) throw new Error(`La opcion «${etiqueta}» (${id}) no tiene pantalla en el catalogo`);
    if (!p.endpoint) throw new Error(`La pantalla ${id} no declara endpoint`);

    const clavesUsadas = new Set();
    const valores = {};

    /* —— Estructura: lo que la interfaz sabe sin preguntar —— */
    const estructura = { id, mod: p.mod, title: p.title, endpoint: p.endpoint };
    if (p.kind) estructura.kind = p.kind;
    if (p.desc) estructura.desc = p.desc;
    if (p.steps) estructura.steps = p.steps;
    if (p.filters) estructura.filtros = p.filters.map((f) => partirCampo(f, clavesUsadas, valores));
    if (p.tabs) {
      estructura.tabs = p.tabs.map((t) => ({
        label: t.label,
        secciones: (t.sections ?? []).map((s) => partirSeccion(s, clavesUsadas, valores)),
      }));
    } else if (p.sections) {
      estructura.secciones = p.sections.map((s) => partirSeccion(s, clavesUsadas, valores));
    }
    if (p.table) {
      estructura.tabla = { title: p.table.title, cols: p.table.cols };
      if (p.table.num) estructura.tabla.num = p.table.num;
      if (p.table.note) estructura.tabla.note = p.table.note;
      if (p.table.actions) estructura.tabla.acciones = p.table.actions;
    }
    if (p.totals)
      estructura.totales = p.totals.map((t) => ({ label: t.label, fuerte: !!t.strong }));
    if (p.report) {
      estructura.reporte = {
        title: p.report.title,
        subtitle: p.report.subtitle,
        cols: p.report.cols,
      };
      if (p.report.num) estructura.reporte.num = p.report.num;
    }
    if (p.actions) estructura.acciones = p.actions;

    /* —— Valor: lo que hoy responde el proxy y manana respondera el backend —— */
    const datos = { fechaCalculo: FECHA_DE_CALCULO };
    if (Object.keys(valores).length > 0) datos.campos = valores;
    if (p.kpis) datos.kpis = p.kpis;
    if (p.panels) datos.paneles = p.panels;
    if (p.table) {
      datos.tabla = { filas: p.table.rows.map((fila) => fila.map(partirCelda)) };
      if (p.table.count) datos.tabla.conteo = p.table.count;
    }
    if (p.totals) datos.totales = p.totals.map((t) => ({ label: t.label, value: t.value }));
    if (p.report) {
      datos.reporte = {
        code: p.report.code,
        date: p.report.date,
        meta: p.report.meta,
        filas: p.report.rows,
        footer: p.report.footer,
      };
    }

    const [metodo, rutaCompleta] = p.endpoint.split(/\s+/);
    const ruta = rutaCompleta.split('?')[0];

    estructuras[id] = estructura;
    respuestas[id] = datos;
    rutas.push({ metodo, ruta, pantalla: id });
  }
}

/* ── Navegacion ───────────────────────────────────────────────────────── */

const modulos = NAV.map((grupo) => {
  const opciones = grupo.items.map(([id, label]) => ({
    id,
    label,
    ranura: aRanura(id.replace(/_/g, '-')),
    bloque: bloqueDe(PANTALLAS[id], label),
    resumen: PANTALLAS[id]?.desc ?? '',
  }));
  return {
    id: aRanura(grupo.label),
    label: grupo.label,
    icono: ICONOS[grupo.label] ?? ['M4.5 4.5h15v15h-15z'],
    bloques: BLOQUES.filter((b) => opciones.some((o) => o.bloque === b)),
    opciones,
  };
});

/* ── Comprobaciones antes de escribir ─────────────────────────────────── */

const totalOpciones = modulos.reduce((n, m) => n + m.opciones.length, 0);
if (modulos.length !== 12) throw new Error(`Se esperaban 12 modulos, hay ${modulos.length}`);
if (totalOpciones !== 134) throw new Error(`Se esperaban 134 opciones, hay ${totalOpciones}`);

const vistas = new Set();
for (const { metodo, ruta } of rutas) {
  const clave = `${metodo} ${ruta}`;
  if (vistas.has(clave)) throw new Error(`Endpoint repetido: ${clave}`);
  vistas.add(clave);
}

/* ── Escribir ─────────────────────────────────────────────────────────── */

const json = (valor) => JSON.stringify(valor, null, 2);

const cabecera = (que, destino) => `/* ARCHIVO GENERADO — no editar a mano.
 * Origen: design/sgtm-data-{1..5}.js (el prototipo).
 * Regenerar con: yarn portar-catalogo
 *
 * ${que}
 *
 * ${destino}
 */
`;

mkdirSync(fileURLToPath(catalogo), { recursive: true });
mkdirSync(fileURLToPath(simulada), { recursive: true });

writeFileSync(
  fileURLToPath(new URL('navegacion.generado.ts', catalogo)),
  `${cabecera(
    'Los 12 modulos del manual y sus 134 opciones, con el bloque de cada una ya\n * clasificado (FRO-03 §4) para no correr expresiones regulares en cada render.',
    'Los nombres vienen del manual y no se reescriben (RNF-080).',
  )}
import type { ModuloDelCatalogo } from './tipos';

export const MODULOS: readonly ModuloDelCatalogo[] = ${json(modulos)};
`,
  'utf8',
);

writeFileSync(
  fileURLToPath(new URL('pantallas.generado.ts', catalogo)),
  `${cabecera(
    'La ESTRUCTURA de las 134 pantallas: que pestanas, que secciones, que campos,\n * que columnas. Lo que la interfaz sabe sin preguntarle a nadie.',
    'Los VALORES no estan aqui: los sirve la API (packages/api-mock hoy, el\n * backend manana). Ver scripts/portar-catalogo.mjs.',
  )}
import type { EstructuraDePantalla } from './tipos';

export const PANTALLAS: Readonly<Record<string, EstructuraDePantalla>> = ${json(estructuras)};
`,
  'utf8',
);

writeFileSync(
  fileURLToPath(new URL('respuestas.generado.ts', simulada)),
  `${cabecera(
    'Lo que responde cada una de las 134 operaciones: valores de campo, filas de\n * tabla, indicadores, totales y reportes. Son los datos de ejemplo del\n * prototipo, con la Municipalidad Provincial de Sullana como entidad.',
    'Es lo unico que el backend tendra que reemplazar. La estructura de las\n * pantallas vive en la aplicacion, no aqui.',
  )}
import type { DatosDePantalla } from '@sgtm/api-client';

export const RESPUESTAS: Readonly<Record<string, DatosDePantalla>> = ${json(respuestas)};

/** Verbo y ruta de cada operacion, tal como los declara el contrato. */
export const RUTAS: readonly { metodo: string; ruta: string; pantalla: string }[] = ${json(rutas)};
`,
  'utf8',
);

console.log(
  `Catalogo portado: ${modulos.length} modulos, ${totalOpciones} opciones, ${rutas.length} operaciones.`,
);
