import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
import { beforeAll } from 'vitest';
import {
  MODULOS,
  OPCIONES,
  bloquesDe,
  buscarOpciones,
  opcionPorRuta,
  seccionesDe,
  todasLasPantallas,
} from './index';
import type { PantallasDeUnModulo } from './index';

/**
 * El catalogo portado es completo y coherente.
 *
 * No es una prueba ceremonial: el catalogo se **genera** desde el prototipo
 * (`yarn portar-catalogo`), y una regeneracion que perdiera opciones por el
 * camino no romperia ni la compilacion ni ninguna pantalla —simplemente
 * faltarian trámites del manual, que es el defecto mas caro y mas silencioso
 * que este proyecto puede tener—. Esto lo hace ruidoso.
 */

/**
 * La estructura de las pantallas viaja por modulo, asi que aqui se cargan los
 * doce: esto comprueba el catalogo entero, y es el unico sitio que lo necesita.
 */
let PANTALLAS: PantallasDeUnModulo = {};
beforeAll(async () => {
  PANTALLAS = await todasLasPantallas();
});

const BLOQUES_TECNICOS = new Set([
  'Registro y mantenimiento',
  'Procesos',
  'Consultas',
  'Documentos y reportes',
]);

/**
 * Los grupos por tarea de los modulos ya disenados (ADR-0014 §4), en orden y
 * con cuantas opciones lleva cada uno. Es la contraparte de la tabla
 * `GRUPOS_POR_TAREA` del portador: si una regeneracion perdiera una opcion,
 * la moviera de grupo o desordenara los grupos, aqui se pone rojo.
 */
const GRUPOS_POR_TAREA_ESPERADOS: Readonly<Record<string, readonly (readonly [string, number])[]>> =
  {
    transito: [
      ['Papeletas', 5],
      ['Vehículos', 1],
      ['Cobranza', 3],
      ['Catálogos', 1],
      // Las 13 hojas siguen juntas hasta la fase 2 (centro de reportes).
      ['Documentos y reportes', 13],
    ],
    'rentas-registro': [
      ['Padrones', 3],
      ['Determinación', 4],
      ['Movimientos', 4],
      ['Tributos y beneficios', 4],
    ],
    valores: [
      ['Emisión', 2],
      ['Gestión del valor', 4],
    ],
    seguridad: [
      ['Cuentas y accesos', 5],
      ['Catálogo', 2],
      ['Sesión', 2],
      ['Operación', 2],
    ],
  };

describe('el catalogo trae el manual entero', () => {
  it('son doce modulos y 134 opciones', () => {
    expect(MODULOS).toHaveLength(12);
    expect(OPCIONES).toHaveLength(134);
  });

  it('cada modulo declara las opciones que el manual le atribuye', () => {
    const conteo = Object.fromEntries(MODULOS.map((m) => [m.label, m.opciones.length]));
    expect(conteo).toEqual({
      Inicio: 2,
      Catastro: 12,
      'Rentas · Registro': 15,
      Fiscalización: 8,
      Tránsito: 23,
      'Infracciones administrativas': 13,
      Tesorería: 10,
      Consultas: 11,
      Valores: 6,
      Coactiva: 12,
      'Autorizaciones y licencias': 11,
      Seguridad: 11,
    });
  });

  it('toda opcion tiene su pantalla, con titulo y operacion del contrato', () => {
    for (const opcion of OPCIONES) {
      const pantalla = PANTALLAS[opcion.id];
      expect(pantalla, `sin pantalla: ${opcion.id}`).toBeDefined();
      expect(pantalla?.title).toBeTruthy();
      expect(pantalla?.endpoint).toMatch(/^(GET|POST|PUT|PATCH) \/api\/v1\//);
    }
  });

  it('ninguna operacion del contrato esta repetida', () => {
    const endpoints = OPCIONES.map((o) => PANTALLAS[o.id]?.endpoint);
    expect(new Set(endpoints).size).toBe(endpoints.length);
  });

  it('ninguna ruta esta repetida', () => {
    const rutas = OPCIONES.map((o) => o.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
  });
});

describe('la clasificacion en bloques viene precalculada', () => {
  it('cada opcion cae en un grupo por tarea de su modulo o en un bloque de FRO-03 §4', () => {
    for (const modulo of MODULOS) {
      const grupos = GRUPOS_POR_TAREA_ESPERADOS[modulo.id];
      const validos = grupos ? new Set(grupos.map(([label]) => label)) : BLOQUES_TECNICOS;
      for (const opcion of modulo.opciones) {
        expect(validos.has(opcion.bloque), `${opcion.id}: ${opcion.bloque}`).toBe(true);
      }
    }
  });

  it('los bloques de un modulo cubren todas sus opciones, sin vacios', () => {
    for (const modulo of MODULOS) {
      const bloques = bloquesDe(modulo);
      expect(bloques.every((b) => b.opciones.length > 0)).toBe(true);
      expect(bloques.reduce((n, b) => n + b.opciones.length, 0)).toBe(modulo.opciones.length);
    }
  });

  it('todo modulo con grupos por tarea asigna cada opcion exactamente una vez', () => {
    // ADR-0014 §4: ni huerfanas ni duplicadas, y los grupos en el orden y con
    // el reparto disenados. Se compara contra la tabla completa —no contra una
    // suma— para que una opcion movida de grupo tambien se vea.
    for (const [moduloId, esperados] of Object.entries(GRUPOS_POR_TAREA_ESPERADOS)) {
      const modulo = MODULOS.find((m) => m.id === moduloId);
      expect(modulo, `el modulo ${moduloId} existe`).toBeDefined();
      if (!modulo) continue;

      const bloques = bloquesDe(modulo);
      expect(
        bloques.map((b) => [b.label, b.opciones.length]),
        `grupos de ${moduloId}`,
      ).toEqual(esperados);

      // Exactamente una vez: los grupos no comparten opcion y entre todos
      // cubren el modulo entero.
      const asignadas = bloques.flatMap((b) => b.opciones.map((o) => o.id));
      expect(new Set(asignadas).size, `sin duplicadas en ${moduloId}`).toBe(asignadas.length);
      expect(asignadas.length, `sin huerfanas en ${moduloId}`).toBe(modulo.opciones.length);
    }
  });

  it('una pantalla de reporte de un modulo sin grupos va a «Documentos y reportes»', () => {
    const constancia = OPCIONES.find((o) => o.id === 'constancia');
    expect(constancia?.bloque).toBe('Documentos y reportes');
  });
});

describe('la busqueda de la paleta', () => {
  it('sin consulta ofrece las primeras diez opciones', () => {
    expect(buscarOpciones('')).toHaveLength(10);
  });

  it('encuentra por etiqueta, ignorando tildes y mayusculas', () => {
    const resultados = buscarOpciones('fiscalizacion');
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((o) => o.modulo.label === 'Fiscalización')).toBe(true);
  });

  it('encuentra por modulo aunque la etiqueta no lo diga', () => {
    expect(buscarOpciones('coactiva').length).toBeGreaterThan(0);
  });

  it('no devuelve mas de catorce resultados', () => {
    expect(buscarOpciones('a').length).toBeLessThanOrEqual(14);
  });
});

describe('las rutas resuelven a la opcion', () => {
  it('modulo y ranura identifican una opcion', () => {
    expect(opcionPorRuta('catastro', 'ficha-urbana')?.id).toBe('ficha_urbana');
  });

  it('una ranura que no existe no resuelve', () => {
    expect(opcionPorRuta('catastro', 'no-existe')).toBeUndefined();
  });
});

describe('las secciones que se muestran', () => {
  it('con pestanas manda la pestana activa', () => {
    const conPestanas = OPCIONES.map((o) => PANTALLAS[o.id]).find((p) => p?.tabs !== undefined);
    expect(conPestanas?.tabs, 'el catalogo deberia tener pantallas con pestanas').toBeDefined();
    if (!conPestanas?.tabs) return;
    expect(seccionesDe(conPestanas, 0)).toEqual(conPestanas.tabs[0]?.secciones);
    expect(seccionesDe(conPestanas, 1)).toEqual(conPestanas.tabs[1]?.secciones);
  });

  it('ninguna pantalla declara pestanas y secciones sueltas a la vez', () => {
    // Cinco las declaran en el prototipo y su logica ignora las sueltas; el
    // portador resuelve la ambiguedad en el build en lugar de dejarla viva
    // para que cada componente decida distinto.
    const ambiguas = OPCIONES.map((o) => PANTALLAS[o.id]).filter(
      (p) => p?.tabs !== undefined && p.secciones !== undefined,
    );
    expect(ambiguas).toEqual([]);
  });

  it('una pestana fuera de rango cae en la ultima, no revienta', () => {
    const conPestanas = OPCIONES.map((o) => PANTALLAS[o.id]).find((p) => p?.tabs !== undefined);
    if (!conPestanas?.tabs) return;
    expect(seccionesDe(conPestanas, 99)).toEqual(conPestanas.tabs.at(-1)?.secciones);
  });
});

describe('el catalogo y el contrato hablan de las mismas operaciones', () => {
  // Los dos se generan del prototipo, pero por caminos distintos: el catalogo
  // con `yarn portar-catalogo` y el contrato con `generar-openapi.mjs`. Que
  // salgan del mismo sitio no garantiza que sigan cuadrando; esto si.
  const DEL_CONTRATO = new Set(
    Object.values(OPERACIONES).map((operacion) => `${operacion.metodo} ${operacion.ruta}`),
  );

  it('el endpoint que declara cada pantalla existe en el contrato', () => {
    for (const opcion of OPCIONES) {
      const endpoint = PANTALLAS[opcion.id]?.endpoint ?? '';
      const [metodo = '', completa = ''] = endpoint.split(/\s+/);
      const camino = (completa.split('?')[0] ?? '').replace(/^\/api\/v1/, '');
      expect(DEL_CONTRATO, `${opcion.id}: ${endpoint}`).toContain(`${metodo} ${camino}`);
    }
  });

  it('cada filtro de una pantalla es un parametro que su operacion declara', () => {
    // El nombre del filtro lo calculan **dos** generadores que viven en arboles
    // distintos: el portador del catalogo y el del contrato. Si se separan, la
    // interfaz manda `?nombreDeCalle=` y el backend espera otra cosa; aqui se
    // ponen de acuerdo o se pone rojo.
    for (const opcion of OPCIONES) {
      const pantalla = PANTALLAS[opcion.id];
      const operacion = OPERACIONES[opcion.id as keyof typeof OPERACIONES];
      if (!pantalla?.filtros || !operacion) continue;
      const declarados = new Set<string>(operacion.parametrosDeConsulta);
      const deLaRuta = new Set<string>(operacion.parametrosDeRuta);
      for (const filtro of pantalla.filtros) {
        expect(
          declarados.has(filtro.clave) || deLaRuta.has(filtro.clave),
          `${opcion.id}: el filtro «${filtro.clave}» no es parametro de su operacion`,
        ).toBe(true);
      }
    }
  });

  it('la operacion del contrato se llama como la opcion del catalogo', () => {
    const identificadores = new Set(Object.keys(OPERACIONES));
    for (const opcion of OPCIONES) {
      expect(identificadores, opcion.id).toContain(opcion.id);
    }
  });
});
