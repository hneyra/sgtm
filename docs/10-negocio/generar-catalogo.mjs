/* Genera docs/10-negocio/catalogo-de-opciones.md a partir del catalogo de
   pantallas del prototipo de interfaz (SGTM-design/sgtm-data-*.js).

   Son 134 opciones: escribir la tabla a mano garantizaria que se desincronizara
   con el prototipo. La clasificacion en bloques es la misma que usa la
   navegacion de la interfaz.

   Uso: node docs/10-negocio/generar-catalogo.mjs
*/

import { createContext, runInContext } from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../../', import.meta.url);
const origen = new URL('SGTM-design/', raiz);
const destino = new URL('docs/10-negocio/catalogo-de-opciones.md', raiz);

const ventana = {};
const contexto = createContext({ window: ventana, Object, Array, JSON, Math, String, Number });
for (let i = 1; i <= 5; i++) {
  runInContext(readFileSync(fileURLToPath(new URL(`sgtm-data-${i}.js`, origen)), 'utf8'), contexto);
}

const NAV = ventana.SGTM_NAV;
const PANTALLAS = ventana.SGTM_SCREENS;

/** Misma clasificacion que la navegacion de la interfaz, por titulo de pantalla. */
function clasificar(pantalla, etiqueta) {
  const t = ((pantalla && pantalla.title) || etiqueta || '').toLowerCase();
  if ((pantalla && pantalla.kind === 'report')
      || /reporte|padr[oó]n|resumen|record|constancia|resoluci[oó]n|certificado/.test(t)) {
    return 'Documentos';
  }
  if (/consulta|b[uú]squeda|estado de cuenta|hist[oó]rico|auditor[ií]a|panel|portal/.test(t)) {
    return 'Consultas';
  }
  if (/c[aá]lculo|generaci[oó]n|proceso|transferencia|pase|importaci[oó]n|emisi[oó]n|notificaci[oó]n|anulaci[oó]n|alta de|baja de|cambio|cambiar|actualizaci[oó]n|fraccionamiento|liquidaci[oó]n|declaraci[oó]n|duplicado|prescripci[oó]n|copias de seguridad|acto/.test(t)) {
    return 'Procesos';
  }
  return 'Registro';
}

/** Contexto acotado que sirve cada modulo del menu (ARQ-01 §3). */
const CONTEXTO = {
  'Inicio': 'transversal',
  'Catastro': 'catastro',
  'Rentas · Registro': 'rentas',
  'Fiscalización': 'fiscalizacion',
  'Tránsito': 'sanciones',
  'Infracciones administrativas': 'sanciones',
  'Tesorería': 'tesoreria',
  'Consultas': 'cuentacorriente',
  'Valores': 'valores',
  'Coactiva': 'coactiva',
  'Autorizaciones y licencias': 'licencias',
  'Seguridad': 'seguridad',
};

/** Donde lo describe el manual. */
const CAPITULO = {
  'Inicio': '—',
  'Catastro': 'cap. 2',
  'Rentas · Registro': 'cap. 3 §Registro',
  'Fiscalización': 'cap. 3 §Fiscalización',
  'Tránsito': 'cap. 3 §Tránsito',
  'Infracciones administrativas': 'cap. 3 §Infracciones administrativas',
  'Tesorería': 'cap. 3 §Tesorería',
  'Consultas': 'cap. 3 §Consultas',
  'Valores': 'cap. 3 §Valores',
  'Coactiva': 'cap. 3 §Coactivas',
  'Autorizaciones y licencias': 'cap. 3 §Autorizaciones y §Licencias',
  'Seguridad': 'cap. 4',
};

const lineas = [];
lineas.push('# NEG-03 — Catálogo de opciones');
lineas.push('');
lineas.push('Las **134 opciones** de los **12 módulos** del sistema, con el `endpoint` que cada una');
lineas.push('declara en el prototipo de interfaz y el contexto acotado que la sirve.');
lineas.push('');
lineas.push('**Este archivo se genera.** Regenerarlo con `node docs/10-negocio/generar-catalogo.mjs`');
lineas.push('cuando cambie el catálogo del prototipo; no editarlo a mano.');
lineas.push('');
lineas.push('Leyenda de bloque: `Registro` = registro y mantenimiento · `Procesos` · `Consultas` ·');
lineas.push('`Documentos` = documentos y reportes. Es la clasificación que usa la navegación de la');
lineas.push('interfaz, y la calcula el título de la pantalla.');
lineas.push('');
lineas.push('| Módulo | Manual | Contexto | Opciones |');
lineas.push('|---|---|---|---|');
for (const grupo of NAV) {
  lineas.push(`| ${grupo.label} | ${CAPITULO[grupo.label]} | \`${CONTEXTO[grupo.label]}\` | ${grupo.items.length} |`);
}
lineas.push(`| **Total** | | | **${NAV.reduce((n, g) => n + g.items.length, 0)}** |`);

for (const grupo of NAV) {
  lineas.push('');
  lineas.push(`## ${grupo.label}`);
  lineas.push('');
  lineas.push(`Manual: ${CAPITULO[grupo.label]} · contexto acotado: \`${CONTEXTO[grupo.label]}\``);
  lineas.push('');
  lineas.push('| id | Opción | Bloque | Endpoint |');
  lineas.push('|---|---|---|---|');
  for (const [id, etiqueta] of grupo.items) {
    const pantalla = PANTALLAS[id] || {};
    lineas.push(
      `| \`${id}\` | ${pantalla.title || etiqueta} | ${clasificar(pantalla, etiqueta)} |`
        + ` \`${pantalla.endpoint || '—'}\` |`,
    );
  }
}
lineas.push('');

writeFileSync(fileURLToPath(destino), lineas.join('\n'), 'utf8');
console.log(`catalogo generado: ${NAV.length} modulos, ${NAV.reduce((n, g) => n + g.items.length, 0)} opciones`);
