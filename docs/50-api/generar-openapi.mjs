/* Genera docs/50-api/openapi/sgtm-v1.yaml a partir de los `endpoint` que declara
   cada pantalla del prototipo de interfaz (design/sgtm-data-*.js).

   Por que se genera y no se escribe a mano: el contrato tiene 134 operaciones y
   su fuente de verdad son las pantallas. Escribirlo a mano garantizaria que se
   desincronizara con el prototipo en la primera semana.

   Lo que este generador NO inventa: los esquemas de cuerpo y respuesta. Cada
   operacion queda con su verbo, su ruta, sus parametros y de que pantalla sale.
   El esquema de cada recurso se escribe cuando se implemente la operacion, y
   entonces esta generacion pasa a ser el punto de partida, no el destino.

   Lo que si declara, porque es lo que la interfaz manda: **los filtros de cada
   pantalla y, en las que traen tabla, el orden y la pagina.** El prototipo
   dibuja los filtros pero no dice como viajan; el contrato lo dice, con el
   mismo nombre de campo que usa el catalogo portado —una prueba del frontend
   exige que coincidan—. Filtrar, ordenar y paginar en el cliente una pagina de
   un padron de cientos de miles de filas ordena media tabla y miente, asi que
   los tres viajan al servidor.

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

/* ── Nombres de parametro ─────────────────────────────────────────────────
   Misma regla que `frontend/scripts/portar-catalogo.mjs`: `Tipo de Vía` →
   `tipoDeVia`. Esta duplicada a proposito —los dos generadores viven en arboles
   distintos y no comparten build— y una prueba del frontend exige que los dos
   produzcan el mismo nombre para el mismo filtro. Si se separan, se pone roja. */

const sinTildes = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');

function aClave(etiqueta) {
  const partes = sinTildes(etiqueta)
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return 'campo';
  const [primera, ...resto] = partes;
  const camel =
    primera.toLowerCase() + resto.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('');
  return /^[0-9]/.test(camel) ? `c${camel}` : camel;
}

/** Los filtros de una pantalla, con el nombre con el que viajan. */
function filtrosDe(pantalla) {
  const usadas = new Set();
  return (pantalla.filters ?? []).map((filtro) => {
    let clave = aClave(filtro.label);
    for (let n = 2; usadas.has(clave); n++) clave = `${aClave(filtro.label)}${n}`;
    usadas.add(clave);
    return { nombre: clave, etiqueta: filtro.label };
  });
}

/**
 * Paginacion y orden, para las operaciones de lectura que traen tabla.
 *
 * **Los nombres son los del backend, no los que la interfaz propuso.** Cuando
 * se escribieron aqui el backend todavia no tenia capa web; ahora la tiene
 * (`ParametrosDePaginacion` de #6) y manda ella: `ordenarPor` y no `orden`,
 * `direccion` y no `sentido`, y la pagina contada desde 0. Que la interfaz
 * proponga esta bien; que siga proponiendo cuando ya hay respuesta, no.
 */
const PAGINACION = [
  { nombre: 'pagina', ejemplo: '0', descripcion: 'Pagina que se pide, contada desde 0' },
  { nombre: 'tamano', ejemplo: '20', descripcion: 'Filas por pagina' },
  { nombre: 'ordenarPor', ejemplo: '', descripcion: 'Campo por el que se ordena, en camelCase' },
  {
    nombre: 'direccion',
    ejemplo: 'ASCENDENTE',
    descripcion: 'ASCENDENTE | DESCENDENTE',
  },
];

/**
 * Parametros que el backend tiene y la pantalla no dibuja.
 *
 * Misma regla que `PAGINACION`: cuando el backend ya existe, manda el backend.
 * La bitacora esta particionada por ejercicio y su controlador lo pide
 * obligatorio (`SesionController#auditoria`, #13); sin el, la consulta recorre
 * todas las particiones, y con el volumen que alcanza esa tabla la diferencia
 * es entre una pantalla que responde y una que hay que cancelar.
 *
 * Esta lista es corta a proposito. Un parametro aqui es una divergencia entre
 * lo que la pantalla dibuja y lo que el servicio ofrece, y cada una se anota
 * con el controlador que la impone.
 */
const DEL_BACKEND = {
  auditoria: [
    {
      nombre: 'ejercicio',
      ejemplo: '2026',
      descripcion: 'Ejercicio de trabajo. Obligatorio: es la clave de particion de la bitacora',
    },
  ],
  // `respaldo` trae tabla pero su verbo es POST —lo fija el contrato del
  // prototipo, no la pantalla—, y la paginacion solo se anade mas abajo
  // cuando el metodo es GET. `SesionController#respaldos` sigue paginando
  // igual que las lecturas: sin esto, la pantalla no podria pedir la pagina
  // siguiente de un historico que solo crece.
  respaldo: PAGINACION,
  // Las cuatro fichas responden **a una fecha**: sin ella, la que rige hoy; con
  // ella, la que regia entonces. Es lo que contesta «como estaba este predio
  // cuando se emitio el valor de 2027», que es la pregunta de una reclamacion.
  // Y `historico` trae todas las versiones: la pantalla que solo pinta la
  // vigente no tiene por que pagarlas (`FichaController`, #18).
  ...Object.fromEntries(
    ['ficha_urbana', 'ficha_economica', 'ficha_bienes', 'ficha_rural'].map((id) => [
      id,
      [
        {
          nombre: 'fecha',
          ejemplo: '2026-08-20',
          descripcion: 'Ficha vigente a esta fecha. Sin ella, la que rige hoy',
        },
        {
          nombre: 'historico',
          ejemplo: 'true',
          descripcion: 'Trae todas las versiones de la ficha, no solo la vigente',
        },
      ],
    ]),
  ),
};

/**
 * Operaciones que el backend publica ademas de la que declara la pantalla.
 *
 * Misma razon que `DEL_BACKEND`: cuando el backend ya existe, manda el
 * backend. Una pantalla del prototipo declara **un** `endpoint`, pero
 * `permisos` guarda una matriz que antes hay que poder cargar, y ese `GET` no
 * tiene pantalla propia de la que salir —no puede leerse de
 * `PANTALLAS[id].endpoint`, que ya esta ocupado por el `PUT` que guarda—.
 *
 * Corta a proposito: cada entrada es una pantalla que escribe y no puede leer
 * su propio estado sin esto. El `operationId` es distinto del `id` de la
 * pantalla porque los dos verbos comparten ruta y opcion de menu, y el
 * generador de tipos del frontend exige que cada operationId sea unico.
 */
const OPERACIONES_ADICIONALES = {
  permisos: [
    {
      operationId: 'permisos_de_grupo',
      metodo: 'get',
      titulo: 'Permisos ya otorgados de un grupo',
      descripcion:
        'Los permisos que el grupo ya tiene configurados, para cargar la matriz antes' +
        ' de guardarla (PUT de la misma ruta). No trae las 134 opciones del catalogo:' +
        ' solo las que el grupo ya tiene.',
    },
  ],
};

/* ── Recoger las operaciones ──────────────────────────────────────────── */

const operaciones = [];
for (const grupo of NAV) {
  for (const [id, etiqueta] of grupo.items) {
    const pantalla = PANTALLAS[id];
    if (!pantalla || !pantalla.endpoint) continue;

    const [metodo, rutaCompleta] = pantalla.endpoint.split(/\s+/);
    const [ruta, consulta] = rutaCompleta.split('?');

    const parametrosDeRuta = [...ruta.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

    operaciones.push({
      id,
      operationId: id,
      etiqueta,
      modulo: grupo.label,
      metodo: metodo.toLowerCase(),
      ruta,
      titulo: pantalla.title || etiqueta,
      descripcion: pantalla.desc || '',
      // Parametros de ruta: {codigo}, {numero}, …
      parametrosDeRuta,
      // Parametros de consulta del ejemplo del prototipo, mas los filtros que
      // dibuja la pantalla y —si trae tabla— la paginacion y el orden.
      parametrosDeConsulta: reunir(parametrosDeRuta, [
        ...(DEL_BACKEND[id] ?? []),
        ...(consulta
          ? consulta.split('&').map((p) => {
              const [nombre, ejemplo] = p.split('=');
              return { nombre, ejemplo: (ejemplo || '').replace(/[{}]/g, '') };
            })
          : []),
        ...filtrosDe(pantalla).map((filtro) => ({
          nombre: filtro.nombre,
          ejemplo: '',
          descripcion: `Filtro «${filtro.etiqueta}» de la pantalla`,
        })),
        ...(pantalla.table && metodo.toLowerCase() === 'get' ? PAGINACION : []),
      ]),
    });

    for (const extra of OPERACIONES_ADICIONALES[id] ?? []) {
      operaciones.push({
        id,
        operationId: extra.operationId,
        etiqueta,
        modulo: grupo.label,
        metodo: extra.metodo,
        ruta,
        titulo: extra.titulo,
        descripcion: extra.descripcion,
        parametrosDeRuta,
        parametrosDeConsulta: reunir(parametrosDeRuta, []),
      });
    }
  }
}

/**
 * Sin repetidos: un parametro declarado dos veces perderia uno al tiparlo.
 *
 * Y sin los que ya van en la ruta: cuando el filtro se llama igual que el
 * parametro del camino —«Código de edificación» en una pantalla que abre
 * `/bienes-comunes/{codEdificacion}`— no son dos valores, es el mismo, y el que
 * manda es el de la ruta.
 */
function reunir(deLaRuta, parametros) {
  const porNombre = new Map();
  for (const parametro of parametros) {
    if (deLaRuta.includes(parametro.nombre)) continue;
    if (!porNombre.has(parametro.nombre)) porNombre.set(parametro.nombre, parametro);
  }
  return [...porNombre.values()];
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
    lineas.push(`      operationId: ${op.operationId}`);
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
        if (p.descripcion) lineas.push(`          description: ${comillas(p.descripcion)}`);
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
