/* Genera `packages/api-client/src/operaciones.generado.ts` desde el contrato
 * `docs/50-api/openapi/sgtm-v1.yaml`.
 *
 * Por que existe: los tipos de la API se escribian a mano y el contrato vivia
 * aparte. Nada obligaba a que coincidieran —el backend podia renombrar un campo
 * y la interfaz seguia compilando en verde y fallando en el navegador—. Aqui el
 * contrato pasa a ser la fuente, y la divergencia, un error de compilacion.
 *
 * Lo que este generador NO inventa: los esquemas de cuerpo y de respuesta. El
 * contrato de hoy declara verbo, ruta y parametros; los cuerpos estan vacios a
 * proposito, y el esquema de cada operacion se escribe cuando su backend
 * existe. Hasta entonces la respuesta se tipa como `CuerpoSinEsquema`, que es
 * exactamente lo que el yaml dice: un objeto que el contrato todavia no
 * describe. Inventarle propiedades seria escribir el backend desde aqui.
 *
 * Lo que si hace, y es la mitad que importa: **falla ruidosamente antes de
 * generar nada** si el contrato viola una regla del proyecto.
 *
 *   - un parametro o campo de municipalidad — regla 2, FRO-01 §4;
 *   - un importe declarado como numero — regla 1, RNF-055;
 *   - una respuesta con cifras de deuda sin `fechaCalculo` — regla 9, RNF-075.
 *
 * Un generador que se tragara cualquiera de las tres las repartiria por las 134
 * operaciones, y entonces el defecto ya no seria del contrato sino del codigo
 * que se escribio contra el.
 *
 * Uso:
 *   node scripts/generar-operaciones.mjs                escribe el .generado.ts
 *   node scripts/generar-operaciones.mjs --comprobar     falla si no cuadra
 *   node scripts/generar-operaciones.mjs --contrato A --salida B
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* ── YAML, el trozo que este contrato usa ──────────────────────────────────
   Sin dependencias, por simetria con `docs/50-api/generar-openapi.mjs`, que lo
   escribe igual de a mano. El contrato es un archivo generado y su forma es
   conocida: mapas, secuencias, escalares entre comillas, flujo en una linea
   (`{ type: string }`) y escalares de bloque (`|`). Lo que no entienda, lo dice
   en voz alta en vez de adivinarlo. */

/** Quita el comentario de una linea respetando las comillas: `"#/components/…"` no lo es. */
function quitarComentario(linea) {
  let comilla = null;
  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];
    if (comilla !== null) {
      if (caracter === comilla && linea[i - 1] !== '\\') comilla = null;
      continue;
    }
    if (caracter === '"' || caracter === "'") {
      comilla = caracter;
      continue;
    }
    if (caracter === '#' && (i === 0 || /\s/.test(linea[i - 1]))) return linea.slice(0, i);
  }
  return linea;
}

/** Las lineas con contenido, con su sangria ya medida. Blancos y comentarios fuera. */
function prepararLineas(texto) {
  const lineas = [];
  for (const cruda of texto.split('\n')) {
    const sinComentario = quitarComentario(cruda);
    if (sinComentario.trim() === '') continue;
    lineas.push({
      sangria: sinComentario.length - sinComentario.trimStart().length,
      contenido: sinComentario.trim(),
    });
  }
  return lineas;
}

/** Parte `clave: valor` por el primer `:` que no este entre comillas ni en flujo. */
function partirEntrada(contenido) {
  let comilla = null;
  let nivel = 0;
  for (let i = 0; i < contenido.length; i++) {
    const caracter = contenido[i];
    if (comilla !== null) {
      if (caracter === comilla && contenido[i - 1] !== '\\') comilla = null;
      continue;
    }
    if (caracter === '"' || caracter === "'") comilla = caracter;
    else if (caracter === '{' || caracter === '[') nivel += 1;
    else if (caracter === '}' || caracter === ']') nivel -= 1;
    else if (
      caracter === ':' &&
      nivel === 0 &&
      (i + 1 === contenido.length || contenido[i + 1] === ' ')
    ) {
      return {
        clave: String(analizarEscalar(contenido.slice(0, i).trim())),
        resto: contenido.slice(i + 1).trim(),
      };
    }
  }
  throw new Error(`El contrato tiene una linea que no es «clave: valor»: «${contenido}»`);
}

function analizarEscalar(texto) {
  if (texto === '') return null;
  if (texto.startsWith('"')) return JSON.parse(texto);
  if (texto.startsWith("'")) return texto.slice(1, -1).replace(/''/g, "'");
  if (texto.startsWith('{') || texto.startsWith('[')) return analizarFlujo(texto);
  if (texto === 'true') return true;
  if (texto === 'false') return false;
  if (texto === 'null' || texto === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(texto)) return Number(texto);
  return texto;
}

/** `{ type: array, items: { type: string } }` y `["Inicio"]`, en una linea. */
function analizarFlujo(texto) {
  const lector = { texto, i: 0 };
  const valor = leerValorDeFlujo(lector);
  saltarBlancos(lector);
  if (lector.i < texto.length) {
    throw new Error(`El contrato trae un flujo que no se entiende: «${texto}»`);
  }
  return valor;
}

const saltarBlancos = (lector) => {
  while (lector.i < lector.texto.length && /\s/.test(lector.texto[lector.i])) lector.i += 1;
};

function leerValorDeFlujo(lector) {
  saltarBlancos(lector);
  const caracter = lector.texto[lector.i];
  if (caracter === '{') return leerMapaDeFlujo(lector);
  if (caracter === '[') return leerSecuenciaDeFlujo(lector);
  return analizarEscalar(leerEscalarDeFlujo(lector));
}

function leerMapaDeFlujo(lector) {
  const mapa = {};
  lector.i += 1;
  for (;;) {
    saltarBlancos(lector);
    if (lector.texto[lector.i] === '}') {
      lector.i += 1;
      return mapa;
    }
    const clave = String(analizarEscalar(leerEscalarDeFlujo(lector, ':')));
    saltarBlancos(lector);
    lector.i += 1; // el `:`
    mapa[clave] = leerValorDeFlujo(lector);
    saltarBlancos(lector);
    if (lector.texto[lector.i] === ',') lector.i += 1;
  }
}

function leerSecuenciaDeFlujo(lector) {
  const lista = [];
  lector.i += 1;
  for (;;) {
    saltarBlancos(lector);
    if (lector.texto[lector.i] === ']') {
      lector.i += 1;
      return lista;
    }
    lista.push(leerValorDeFlujo(lector));
    saltarBlancos(lector);
    if (lector.texto[lector.i] === ',') lector.i += 1;
  }
}

/** Un escalar dentro de un flujo acaba en `,`, `}`, `]` o —si se pide— en `:`. */
function leerEscalarDeFlujo(lector, ademas) {
  saltarBlancos(lector);
  const inicio = lector.i;
  const comilla =
    lector.texto[lector.i] === '"' || lector.texto[lector.i] === "'"
      ? lector.texto[lector.i]
      : null;
  if (comilla !== null) {
    lector.i += 1;
    while (lector.i < lector.texto.length) {
      if (lector.texto[lector.i] === comilla && lector.texto[lector.i - 1] !== '\\') break;
      lector.i += 1;
    }
    lector.i += 1;
    return lector.texto.slice(inicio, lector.i);
  }
  while (lector.i < lector.texto.length && !',}]'.includes(lector.texto[lector.i])) {
    if (ademas !== undefined && lector.texto[lector.i] === ademas) break;
    lector.i += 1;
  }
  return lector.texto.slice(inicio, lector.i).trim();
}

function analizarBloque(lineas, i, sangria) {
  if (i >= lineas.length) return [null, i];
  return lineas[i].contenido.startsWith('-')
    ? analizarSecuencia(lineas, i, sangria)
    : analizarMapa(lineas, i, sangria);
}

function analizarMapa(lineas, i, sangria) {
  const mapa = {};
  while (
    i < lineas.length &&
    lineas[i].sangria === sangria &&
    !lineas[i].contenido.startsWith('- ')
  ) {
    const { clave, resto } = partirEntrada(lineas[i].contenido);
    i += 1;
    if (resto === '|' || resto === '>' || resto === '|-' || resto === '>-') {
      const trozos = [];
      while (i < lineas.length && lineas[i].sangria > sangria) {
        trozos.push(lineas[i].contenido);
        i += 1;
      }
      mapa[clave] = trozos.join('\n');
    } else if (resto === '') {
      const siguiente = lineas[i];
      const hayBloque =
        siguiente !== undefined &&
        (siguiente.sangria > sangria ||
          (siguiente.sangria === sangria && siguiente.contenido.startsWith('- ')));
      if (hayBloque) {
        const [valor, tras] = analizarBloque(lineas, i, siguiente.sangria);
        mapa[clave] = valor;
        i = tras;
      } else {
        mapa[clave] = null;
      }
    } else {
      mapa[clave] = analizarEscalar(resto);
    }
  }
  return [mapa, i];
}

function analizarSecuencia(lineas, i, sangria) {
  const lista = [];
  while (
    i < lineas.length &&
    lineas[i].sangria === sangria &&
    lineas[i].contenido.startsWith('-')
  ) {
    const resto = lineas[i].contenido.slice(1).trim();
    const sangriaDelElemento = sangria + 2;
    if (resto === '') {
      const [valor, tras] = analizarBloque(
        lineas,
        i + 1,
        lineas[i + 1]?.sangria ?? sangriaDelElemento,
      );
      lista.push(valor);
      i = tras;
    } else if (esEntradaDeMapa(resto)) {
      // El guion se sustituye por sangria: asi el resto del elemento —que en el
      // archivo va sangrado dos espacios— se analiza como un mapa cualquiera.
      const alineadas = [{ sangria: sangriaDelElemento, contenido: resto }, ...lineas.slice(i + 1)];
      const [valor, consumidas] = analizarMapa(alineadas, 0, sangriaDelElemento);
      lista.push(valor);
      i += consumidas;
    } else {
      lista.push(analizarEscalar(resto));
      i += 1;
    }
  }
  return [lista, i];
}

function esEntradaDeMapa(contenido) {
  try {
    partirEntrada(contenido);
    return true;
  } catch {
    return false;
  }
}

export function analizarYaml(texto) {
  const lineas = prepararLineas(texto);
  const [valor] = analizarBloque(lineas, 0, lineas[0]?.sangria ?? 0);
  return valor ?? {};
}

/* ── El modelo: las operaciones que el contrato declara ────────────────── */

const VERBOS = ['get', 'post', 'put', 'patch', 'delete'];

/** Nombres que llevan dinero. La misma lista que la regla de ESLint de FRO-04 §4. */
const CAMPOS_DE_DINERO =
  /(monto|importe|saldo|deuda|total|insoluto|interes|autovaluo|arbitrio|recargo|vuelto|recibido)/i;

/** Lo que delata un identificador de municipalidad, venga como venga (regla 2). */
const NOMBRE_DE_TENANT = /municipalidad/i;

/**
 * Nombre del campo que fecha las cifras de una respuesta (regla 9, RNF-075).
 *
 * El issue #6 del backend lo llama `actualizadoA` y el contrato de datos de la
 * interfaz `fechaCalculo`. Mientras el nombre no se cierre, esta constante es
 * el unico sitio donde vive: cambiarla regenera las 134 operaciones.
 */
const CAMPO_DE_FECHA = 'fechaCalculo';

/** Nombres que el archivo generado ya exporta: un esquema del contrato no puede pisarlos. */
const NOMBRES_RESERVADOS = new Set([
  'VerboDeOperacion',
  'DescriptorDeOperacion',
  'CuerpoSinEsquema',
  'OPERACIONES',
  'IdDeOperacion',
  'ParametrosPorOperacion',
  'CuerpoPorOperacion',
  'RespuestaPorOperacion',
  'ParametrosDe',
  'CuerpoDe',
  'RespuestaDe',
  'Importe',
  'Fecha',
]);

function leerOperaciones(contrato) {
  const rutas = contrato.paths ?? {};
  const operaciones = [];
  const vistos = new Map();

  for (const [ruta, porVerbo] of Object.entries(rutas)) {
    for (const verbo of VERBOS) {
      const declarada = porVerbo?.[verbo];
      if (declarada === undefined || declarada === null) continue;

      const donde = `${verbo.toUpperCase()} ${ruta}`;
      const id = declarada.operationId;
      if (typeof id !== 'string' || id === '') {
        throw new Error(`«${donde}» no declara operationId: sin el no hay nombre que tipar.`);
      }
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
        throw new Error(
          `«${donde}» declara el operationId «${id}»: va en ASCII y sin tildes, que es la regla de idioma del proyecto.`,
        );
      }
      if (vistos.has(id)) {
        throw new Error(
          `El operationId «${id}» esta dos veces: en «${vistos.get(id)}» y en «${donde}». Es la clave del tipo, y una clave repetida pierde una operacion.`,
        );
      }
      vistos.set(id, donde);

      const marcadores = [...ruta.matchAll(/\{(\w+)\}/g)].map((coincidencia) => coincidencia[1]);
      for (const marcador of marcadores) {
        if (NOMBRE_DE_TENANT.test(marcador)) {
          throw new Error(
            `«${donde}» lleva la municipalidad en la ruta («{${marcador}}»). El backend la toma del claim del token: si viaja por la URL, alguien puede cambiarla (regla 2, ADR-0005).`,
          );
        }
      }

      const declarados = declarada.parameters ?? [];
      for (const parametro of declarados) {
        if (typeof parametro?.name !== 'string') {
          throw new Error(`«${donde}» declara un parametro sin nombre.`);
        }
        if (NOMBRE_DE_TENANT.test(parametro.name)) {
          throw new Error(
            `«${donde}» declara el parametro «${parametro.name}». La municipalidad no viaja en la peticion, ni siquiera como filtro de conveniencia (regla 2, FRO-01 §4).`,
          );
        }
      }

      const nombres = declarados.map((p) => p.name);
      const repetido = nombres.find((nombre, i) => nombres.indexOf(nombre) !== i);
      if (repetido !== undefined) {
        throw new Error(
          `«${donde}» declara dos veces el parametro «${repetido}»: uno de los dos se perderia al tiparlo.`,
        );
      }

      const deRuta = declarados.filter((p) => p.in === 'path').map((p) => p.name);
      const deConsulta = declarados
        .filter((p) => p.in === 'query')
        .map((p) => ({ nombre: p.name, obligatorio: p.required === true }));

      const faltan = marcadores.filter((m) => !deRuta.includes(m));
      const sobran = deRuta.filter((p) => !marcadores.includes(p));
      if (faltan.length > 0 || sobran.length > 0) {
        throw new Error(
          `«${donde}»: la ruta y sus parametros no cuadran. Sin declarar: [${faltan.join(', ')}]. Declarados y ausentes de la ruta: [${sobran.join(', ')}].`,
        );
      }

      operaciones.push({
        id,
        donde,
        metodo: verbo.toUpperCase(),
        ruta,
        resumen: typeof declarada.summary === 'string' ? declarada.summary : '',
        parametrosDeRuta: marcadores,
        parametrosDeConsulta: deConsulta,
        esquemaDeCuerpo: declarada.requestBody?.content?.['application/json']?.schema ?? null,
        esquemaDeRespuesta: esquemaDeRespuestaDe(declarada, donde),
      });
    }
  }

  if (operaciones.length === 0) {
    throw new Error('El contrato no declara ninguna operacion: no hay nada que generar.');
  }
  return operaciones;
}

/** La respuesta de exito: la primera 2xx con cuerpo JSON. */
function esquemaDeRespuestaDe(declarada, donde) {
  const respuestas = declarada.responses ?? {};
  const exito = Object.keys(respuestas).find((codigo) => /^2\d\d$/.test(String(codigo)));
  if (exito === undefined) {
    throw new Error(
      `«${donde}» no declara ninguna respuesta 2xx: la interfaz no sabe que esperar.`,
    );
  }
  return respuestas[exito]?.content?.['application/json']?.schema ?? null;
}

/* ── Del esquema del contrato al tipo de TypeScript ────────────────────── */

function crearEstado(contrato) {
  return {
    componentes: contrato.components?.schemas ?? {},
    /** Tipos de `@sgtm/dominio` que el archivo acaba importando. */
    delDominio: new Set(),
    /** Esquemas con nombre que hay que emitir, en el orden en que aparecen. */
    conNombre: new Map(),
    /** Se enciende en cuanto un importe aparece en el esquema que se esta leyendo. */
    hayDinero: false,
  };
}

function tipoDeEsquema(esquema, donde, estado) {
  if (esquema === null || esquema === undefined) return 'CuerpoSinEsquema';

  if (typeof esquema.$ref === 'string') {
    const nombre = esquema.$ref.replace('#/components/schemas/', '');
    if (nombre === esquema.$ref) {
      throw new Error(
        `${donde}: el generador solo resuelve «#/components/schemas/…», no «${esquema.$ref}».`,
      );
    }
    const declarado = estado.componentes[nombre];
    if (declarado === undefined) {
      throw new Error(`${donde}: el esquema «${nombre}» no existe en components.schemas.`);
    }
    if (nombre === 'Importe') {
      if (declarado.type !== 'string') {
        throw new Error(
          `El contrato declara «Importe» como «${declarado.type}». Un importe es una cadena decimal: como numero de coma flotante pierde centimos (regla 1, RNF-055).`,
        );
      }
      estado.delDominio.add('Importe');
      estado.hayDinero = true;
      return 'Importe';
    }
    if (NOMBRES_RESERVADOS.has(nombre)) {
      throw new Error(
        `${donde}: el esquema «${nombre}» se llama como algo que el archivo generado ya exporta. Renombralo en el contrato.`,
      );
    }
    if (!estado.conNombre.has(nombre)) {
      // Se registra antes de leerlo para que un esquema que se referencia a si
      // mismo no de vueltas para siempre.
      estado.conNombre.set(nombre, { texto: nombre, dinero: false });
      const habiaDinero = estado.hayDinero;
      estado.hayDinero = false;
      const texto = tipoDeEsquema(declarado, `components.schemas.${nombre}`, estado);
      estado.conNombre.set(nombre, { texto, dinero: estado.hayDinero });
      estado.hayDinero = habiaDinero || estado.hayDinero;
    } else if (estado.conNombre.get(nombre).dinero) {
      // Un esquema compartido que trae importes los trae en toda respuesta que
      // lo referencia, tambien en la segunda: la fecha se le exige a las dos.
      estado.hayDinero = true;
    }
    return nombre;
  }

  if (Array.isArray(esquema.enum)) {
    return esquema.enum.map((valor) => cadena(String(valor))).join(' | ');
  }

  switch (esquema.type) {
    case 'array':
      return `readonly ${tipoDeEsquema(esquema.items ?? null, `${donde}[]`, estado)}[]`;
    case 'string':
      if (esquema.format === 'date' || esquema.format === 'date-time') {
        estado.delDominio.add('Fecha');
        return 'Fecha';
      }
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
    case undefined:
      return tipoDeObjeto(esquema, donde, estado);
    default:
      throw new Error(
        `${donde}: el contrato declara el tipo «${esquema.type}», que el generador no conoce.`,
      );
  }
}

function tipoDeObjeto(esquema, donde, estado) {
  const propiedades = esquema.properties ?? {};
  const nombres = Object.keys(propiedades);
  if (nombres.length === 0) return 'CuerpoSinEsquema';

  const obligatorios = new Set(esquema.required ?? []);
  const lineas = ['{'];
  for (const nombre of nombres) {
    if (NOMBRE_DE_TENANT.test(nombre)) {
      throw new Error(
        `${donde}: el campo «${nombre}» lleva la municipalidad en el cuerpo. Sale del token, no del JSON (regla 2, ARQ-03 §3.1).`,
      );
    }
    const tipo = tipoDePropiedad(nombre, propiedades[nombre], `${donde}.${nombre}`, estado);
    lineas.push(`  readonly ${clave(nombre)}${obligatorios.has(nombre) ? '' : '?'}: ${tipo};`);
  }
  lineas.push('}');
  return lineas.join('\n');
}

/** El nombre de la propiedad manda: un `montoInsoluto` es un `Importe`, no una cadena cualquiera. */
function tipoDePropiedad(nombre, esquema, donde, estado) {
  const tipo = tipoDeEsquema(esquema, donde, estado);

  if (CAMPOS_DE_DINERO.test(nombre)) {
    if (tipo === 'number') {
      throw new Error(
        `${donde}: «${nombre}» es un importe y el contrato lo declara como numero. Un importe viaja como cadena decimal; en coma flotante pierde centimos en las cifras que produce un padron (regla 1, RNF-055).`,
      );
    }
    if (tipo === 'string' || tipo === 'Importe') {
      estado.delDominio.add('Importe');
      estado.hayDinero = true;
      return 'Importe';
    }
  }

  if (/^fecha/i.test(nombre) && tipo === 'string') {
    estado.delDominio.add('Fecha');
    return 'Fecha';
  }

  return tipo;
}

/** Sigue un `$ref` para poder mirar el `required` de la respuesta. */
function resolver(esquema, estado) {
  if (esquema !== null && esquema !== undefined && typeof esquema.$ref === 'string') {
    return estado.componentes[esquema.$ref.replace('#/components/schemas/', '')] ?? null;
  }
  return esquema ?? null;
}

/* ── Emitir el TypeScript ──────────────────────────────────────────────── */

/** Mete un tipo de varias lineas dentro de otro sin descolocar la sangria. */
const sangrar = (texto, prefijo) => texto.split('\n').join(`\n${prefijo}`);

/** Un resumen del manual puede traer cualquier cosa; lo unico que no cabe en un comentario es cerrarlo. */
const comentable = (texto) => texto.replace(/\*\//g, '* /');

const esIdentificador = (nombre) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(nombre);

/** Comilla simple, como el resto del codigo: el archivo generado no pasa por Prettier. */
const cadena = (valor) => `'${String(valor).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const clave = (nombre) => (esIdentificador(nombre) ? nombre : cadena(nombre));

function generarTypeScript(contrato) {
  const operaciones = leerOperaciones(contrato);
  const estado = crearEstado(contrato);

  const detalladas = operaciones.map((operacion) => {
    estado.hayDinero = false;
    const tipoDeRespuesta = tipoDeEsquema(
      operacion.esquemaDeRespuesta,
      `${operacion.donde} (respuesta)`,
      estado,
    );

    if (estado.hayDinero) {
      const cuerpo = resolver(operacion.esquemaDeRespuesta, estado);
      const obligatorios = new Set(cuerpo?.required ?? []);
      if (!obligatorios.has(CAMPO_DE_FECHA)) {
        throw new Error(
          `«${operacion.donde}» responde con cifras de deuda y no obliga a «${CAMPO_DE_FECHA}». No existe «la deuda»: existe la deuda a una fecha, y una cifra sin ella no se puede mostrar honestamente (regla 9, RNF-075).`,
        );
      }
    }

    const tipoDeCuerpo =
      operacion.esquemaDeCuerpo === null
        ? 'undefined'
        : tipoDeEsquema(operacion.esquemaDeCuerpo, `${operacion.donde} (cuerpo)`, estado);

    return { ...operacion, tipoDeRespuesta, tipoDeCuerpo };
  });

  const partes = [];

  partes.push(`/* ARCHIVO GENERADO — no editar a mano.
 * Origen: docs/50-api/openapi/sgtm-v1.yaml (el contrato).
 * Regenerar con: yarn generar-operaciones
 *
 * Las ${detalladas.length} operaciones del contrato como tipos: verbo, ruta, parametros y —cuando
 * el contrato ya describe el recurso— cuerpo y respuesta.
 *
 * El contrato manda, y manda en las dos direcciones: si el yaml cambia y esto
 * no se regenera, «yarn verificar» falla; si se regenera, deja de compilar el
 * codigo escrito contra el nombre viejo. Juntas, esas dos mitades convierten un
 * cambio de contrato en un error de compilacion en vez de en un defecto que
 * aparece en el navegador.
 */`);

  if (estado.delDominio.size > 0) {
    const nombres = [...estado.delDominio].sort();
    partes.push(`import type { ${nombres.join(', ')} } from '@sgtm/dominio';`);
  }

  partes.push(`/** Verbo HTTP de una operacion del contrato. */
export type VerboDeOperacion = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Verbo, camino y parametros de una operacion, tal como los declara el contrato. */
export interface DescriptorDeOperacion {
  readonly metodo: VerboDeOperacion;
  /** Camino relativo a \`/api/v1\`, con sus parametros entre llaves. */
  readonly ruta: string;
  readonly parametrosDeRuta: readonly string[];
  readonly parametrosDeConsulta: readonly string[];
}

/**
 * Cuerpo que el contrato declara como objeto y todavia no describe.
 *
 * No es comodidad ni pereza de tipado: es lo que el yaml dice hoy. El contrato
 * fija verbo, ruta y parametros de las ${detalladas.length} operaciones, y **el esquema de cada
 * recurso se escribe cuando su backend existe**, en el issue del modulo que lo
 * sirve. Cuando eso pase, esta forma la sustituye la de verdad y el codigo
 * escrito contra la anterior deja de compilar, que es justo lo que se busca.
 */
export interface CuerpoSinEsquema {
  readonly [clave: string]: unknown;
}`);

  for (const [nombre, registro] of estado.conNombre) {
    partes.push(`/** \`components.schemas.${nombre}\` del contrato. */
export type ${nombre} = ${registro.texto};`);
  }

  const descriptores = detalladas.map((operacion) => {
    const consulta = operacion.parametrosDeConsulta.map((p) => cadena(p.nombre));
    const deRuta = operacion.parametrosDeRuta.map((p) => cadena(p));
    return `  /** ${comentable(operacion.resumen)} — \`${operacion.metodo} ${operacion.ruta}\` */
  ${clave(operacion.id)}: {
    metodo: '${operacion.metodo}',
    ruta: ${cadena(operacion.ruta)},
    parametrosDeRuta: [${deRuta.join(', ')}],
    parametrosDeConsulta: [${consulta.join(', ')}],
  },`;
  });

  partes.push(`/**
 * Las ${detalladas.length} operaciones del contrato, por su \`operationId\`.
 *
 * Es la unica lista de rutas del frontend: la que construye la URL, la que dice
 * que parametros admite cada operacion y la que un dia dira cuales sirve ya el
 * backend. Ninguna de las ${detalladas.length} recibe la municipalidad — sale del token, y el
 * generador falla si el contrato intentara declararla (regla 2, ADR-0005).
 */
export const OPERACIONES = {
${descriptores.join('\n')}
} as const satisfies Readonly<Record<string, DescriptorDeOperacion>>;

/** El \`operationId\` de una de las ${detalladas.length} operaciones. */
export type IdDeOperacion = keyof typeof OPERACIONES;`);

  const parametros = detalladas.map((operacion) => {
    const lineas = [];
    for (const nombre of operacion.parametrosDeRuta) {
      lineas.push(`    readonly ${clave(nombre)}: string;`);
    }
    for (const parametro of operacion.parametrosDeConsulta) {
      lineas.push(
        `    readonly ${clave(parametro.nombre)}${parametro.obligatorio ? '' : '?'}: string;`,
      );
    }
    const tipo =
      lineas.length === 0 ? 'Readonly<Record<string, never>>' : `{\n${lineas.join('\n')}\n  }`;
    return `  /** \`${operacion.metodo} ${operacion.ruta}\` */
  readonly ${clave(operacion.id)}: ${tipo};`;
  });

  partes.push(`/**
 * Los parametros de cada operacion: los de ruta obligatorios, los de consulta
 * opcionales salvo que el contrato los exija.
 *
 * Un parametro renombrado en el yaml renombra aqui la propiedad, y el codigo
 * que usaba el nombre viejo deja de compilar.
 */
export interface ParametrosPorOperacion {
${parametros.join('\n')}
}`);

  const cuerpos = detalladas.map(
    (operacion) => `  readonly ${clave(operacion.id)}: ${sangrar(operacion.tipoDeCuerpo, '  ')};`,
  );

  partes.push(`/** El cuerpo de cada operacion que escribe. Las de lectura no llevan: \`undefined\`. */
export interface CuerpoPorOperacion {
${cuerpos.join('\n')}
}`);

  const respuestas = detalladas.map(
    (operacion) =>
      `  readonly ${clave(operacion.id)}: ${sangrar(operacion.tipoDeRespuesta, '  ')};`,
  );

  partes.push(`/** Lo que responde cada operacion cuando sale bien. */
export interface RespuestaPorOperacion {
${respuestas.join('\n')}
}`);

  partes.push(`export type ParametrosDe<O extends IdDeOperacion> = ParametrosPorOperacion[O];
export type CuerpoDe<O extends IdDeOperacion> = CuerpoPorOperacion[O];
export type RespuestaDe<O extends IdDeOperacion> = RespuestaPorOperacion[O];`);

  return { texto: `${partes.join('\n\n')}\n`, total: detalladas.length };
}

/* ── La orden ──────────────────────────────────────────────────────────── */

const argumento = (nombre) => {
  const posicion = process.argv.indexOf(nombre);
  return posicion === -1 ? null : (process.argv[posicion + 1] ?? null);
};

const raiz = new URL('../../', import.meta.url);
const CONTRATO = fileURLToPath(new URL('docs/50-api/openapi/sgtm-v1.yaml', raiz));
const SALIDA = fileURLToPath(
  new URL('frontend/packages/api-client/src/operaciones.generado.ts', raiz),
);

function principal() {
  const contrato = argumento('--contrato') ?? CONTRATO;
  const salida = argumento('--salida') ?? SALIDA;
  const comprobar = process.argv.includes('--comprobar');

  const { texto, total } = generarTypeScript(analizarYaml(readFileSync(contrato, 'utf8')));

  if (!comprobar) {
    writeFileSync(salida, texto, 'utf8');
    console.log(`Operaciones generadas: ${total} desde el contrato.`);
    return;
  }

  let actual = null;
  try {
    actual = readFileSync(salida, 'utf8');
  } catch {
    actual = null;
  }
  if (actual !== texto) {
    throw new Error(
      `Los tipos generados no cuadran con el contrato.\n\n  El contrato es la fuente: corre «yarn generar-operaciones» y anade el resultado.\n  Si el cambio no era el que esperabas, el que sobra es el del yaml.\n\n  contrato: ${contrato}\n  salida:   ${salida}`,
    );
  }
  console.log(`El contrato y los tipos generados cuadran: ${total} operaciones.`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    principal();
  } catch (error) {
    console.error(`\n✗ ${error.message}\n`);
    process.exit(1);
  }
}
