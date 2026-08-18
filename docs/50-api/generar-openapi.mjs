/* Genera docs/50-api/openapi/sgtm-v1.yaml a partir de los `endpoint` que declara
   cada pantalla del prototipo de interfaz (design/sgtm-data-*.js).

   Por que se genera y no se escribe a mano: el contrato tiene 134 operaciones y
   su fuente de verdad son las pantallas. Escribirlo a mano garantizaria que se
   desincronizara con el prototipo en la primera semana.

   Lo que este generador NO inventa: los esquemas de cuerpo y respuesta. Cada
   operacion queda con su verbo, su ruta, sus parametros y de que pantalla sale.
   El esquema de cada recurso se escribe cuando se implemente la operacion, y
   entonces esta generacion pasa a ser el punto de partida, no el destino.

   Uso: node docs/50-api/generar-openapi.mjs
*/

import { createContext, runInContext } from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../../', import.meta.url);
const origen = new URL('design/', raiz);
const destino = new URL('docs/50-api/openapi/sgtm-v1.yaml', raiz);

const ventana = {};
const contexto = createContext({ window: ventana, Object, Array, JSON, Math, String, Number });
for (let i = 1; i <= 5; i++) {
  runInContext(readFileSync(fileURLToPath(new URL(`sgtm-data-${i}.js`, origen)), 'utf8'), contexto);
}

const NAV = ventana.SGTM_NAV;
const PANTALLAS = ventana.SGTM_SCREENS;

/* ── Recoger las operaciones ──────────────────────────────────────────── */

const operaciones = [];
for (const grupo of NAV) {
  for (const [id, etiqueta] of grupo.items) {
    const pantalla = PANTALLAS[id];
    if (!pantalla || !pantalla.endpoint) continue;

    const [metodo, rutaCompleta] = pantalla.endpoint.split(/\s+/);
    const [ruta, consulta] = rutaCompleta.split('?');

    operaciones.push({
      id,
      etiqueta,
      modulo: grupo.label,
      metodo: metodo.toLowerCase(),
      ruta,
      titulo: pantalla.title || etiqueta,
      descripcion: pantalla.desc || '',
      // Parametros de ruta: {codigo}, {numero}, …
      parametrosDeRuta: [...ruta.matchAll(/\{(\w+)\}/g)].map((m) => m[1]),
      // Parametros de consulta del ejemplo del prototipo.
      parametrosDeConsulta: consulta
        ? consulta.split('&').map((p) => {
            const [nombre, ejemplo] = p.split('=');
            return { nombre, ejemplo: (ejemplo || '').replace(/[{}]/g, '') };
          })
        : [],
    });
  }
}

/* ── Serializar a YAML, sin dependencias ──────────────────────────────── */

const comillas = (texto) => `"${String(texto).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const unaLinea = (texto) => String(texto).replace(/\s+/g, ' ').trim();

const porRuta = new Map();
for (const op of operaciones) {
  if (!porRuta.has(op.ruta)) porRuta.set(op.ruta, []);
  porRuta.get(op.ruta).push(op);
}

const lineas = [];
lineas.push('# ARCHIVO GENERADO — no editar a mano.');
lineas.push('# Origen: los `endpoint` de design/sgtm-data-{1..5}.js.');
lineas.push('# Regenerar con: node docs/50-api/generar-openapi.mjs');
lineas.push('#');
lineas.push('# Es el contrato PROPUESTO: define verbo, ruta y parametros de las 134');
lineas.push('# operaciones que la interfaz espera. Los esquemas de cuerpo y respuesta se');
lineas.push('# escriben cuando se implementa cada operacion.');
lineas.push('openapi: 3.1.0');
lineas.push('info:');
lineas.push('  title: SGTM — Sistema de Gestion Tributaria Municipal');
lineas.push('  version: 1.0.0-borrador');
lineas.push('  description: |');
lineas.push('    Contrato de la API del SGTM, derivado de las pantallas del prototipo de');
lineas.push('    interfaz. Una operacion por opcion del menu.');
lineas.push('');
lineas.push('    El identificador de municipalidad NO viaja en ninguna ruta, parametro ni');
lineas.push('    cuerpo: sale del claim `municipalidad_id` del token validado (ADR-0005).');
lineas.push('    Una peticion que lo mande por otro camino no lo consigue.');
lineas.push('');
lineas.push('    Los importes son cadenas decimales, nunca numeros de coma flotante');
lineas.push('    (RNF-055), y toda cifra de deuda indica a que fecha esta actualizada');
lineas.push('    (RNF-075).');
lineas.push('servers:');
lineas.push('  - url: /api/v1');
lineas.push('    description: Camino base');
lineas.push('security:');
lineas.push('  - tokenDeAcceso: []');
lineas.push('tags:');
for (const grupo of NAV) {
  lineas.push(`  - name: ${comillas(grupo.label)}`);
  lineas.push(`    description: ${comillas(`${grupo.items.length} opciones del manual`)}`);
}
lineas.push('paths:');

for (const [ruta, ops] of porRuta) {
  // El servidor ya sirve bajo /api/v1: la ruta del contrato es la relativa.
  const rutaRelativa = ruta.replace(/^\/api\/v1/, '') || '/';
  lineas.push(`  ${comillas(rutaRelativa)}:`);
  for (const op of ops) {
    lineas.push(`    ${op.metodo}:`);
    lineas.push(`      operationId: ${op.id}`);
    lineas.push(`      summary: ${comillas(op.titulo)}`);
    if (op.descripcion) {
      lineas.push(`      description: ${comillas(unaLinea(op.descripcion))}`);
    }
    lineas.push(`      tags: [${comillas(op.modulo)}]`);
    if (op.parametrosDeRuta.length || op.parametrosDeConsulta.length) {
      lineas.push('      parameters:');
      for (const nombre of op.parametrosDeRuta) {
        lineas.push(`        - name: ${nombre}`);
        lineas.push('          in: path');
        lineas.push('          required: true');
        lineas.push('          schema: { type: string }');
      }
      for (const p of op.parametrosDeConsulta) {
        lineas.push(`        - name: ${p.nombre}`);
        lineas.push('          in: query');
        lineas.push('          required: false');
        lineas.push('          schema: { type: string }');
        if (p.ejemplo) lineas.push(`          example: ${comillas(p.ejemplo)}`);
      }
    }
    if (op.metodo !== 'get') {
      lineas.push('      requestBody:');
      lineas.push('        required: true');
      lineas.push('        content:');
      lineas.push('          application/json:');
      lineas.push('            schema: { type: object }');
    }
    lineas.push('      responses:');
    lineas.push(`        ${op.metodo === 'post' ? '201' : '200'}:`);
    lineas.push('          description: Operacion realizada');
    lineas.push('          content:');
    lineas.push('            application/json:');
    lineas.push('              schema: { type: object }');
    lineas.push('        "403":');
    lineas.push('          $ref: "#/components/responses/SinMunicipalidad"');
    lineas.push('        "422":');
    lineas.push('          $ref: "#/components/responses/ErrorDeValidacion"');
  }
}

lineas.push('components:');
lineas.push('  securitySchemes:');
lineas.push('    tokenDeAcceso:');
lineas.push('      type: http');
lineas.push('      scheme: bearer');
lineas.push('      bearerFormat: JWT');
lineas.push('      description: |');
lineas.push('        Token OIDC validado. Debe traer el claim `municipalidad_id`; sin el, la');
lineas.push('        peticion recibe 403 y no llega al controlador (ADR-0005, RNF-032).');
lineas.push('  schemas:');
lineas.push('    Importe:');
lineas.push('      type: string');
lineas.push('      pattern: "^-?[0-9]+\\\\.[0-9]{2}$"');
lineas.push('      description: |');
lineas.push('        Decimal exacto como cadena. Nunca numero JSON: el `number` de');
lineas.push('        JavaScript es binario de doble precision y pierde centimos (RNF-055).');
lineas.push('      example: "1234.50"');
lineas.push('    Error:');
lineas.push('      type: object');
lineas.push('      required: [codigo, mensaje]');
lineas.push('      properties:');
lineas.push('        codigo: { type: string, example: "DEUDA_YA_CANCELADA" }');
lineas.push('        mensaje: { type: string, description: "En castellano; se muestra al usuario" }');
lineas.push('        detalles: { type: array, items: { type: string } }');
lineas.push('  responses:');
lineas.push('    SinMunicipalidad:');
lineas.push('      description: |');
lineas.push('        El token no identifica una municipalidad. No hay valor por omision ni');
lineas.push('        modo sin municipalidad.');
lineas.push('      content:');
lineas.push('        application/json:');
lineas.push('          schema: { $ref: "#/components/schemas/Error" }');
lineas.push('    ErrorDeValidacion:');
lineas.push('      description: La peticion no cumple una regla de negocio');
lineas.push('      content:');
lineas.push('        application/json:');
lineas.push('          schema: { $ref: "#/components/schemas/Error" }');
lineas.push('');

writeFileSync(fileURLToPath(destino), lineas.join('\n'), 'utf8');
console.log(`OpenAPI generado: ${operaciones.length} operaciones en ${porRuta.size} rutas`);
