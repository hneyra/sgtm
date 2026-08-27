import { describe, expect, it } from 'vitest';
// El portador es JavaScript de build y se importa **como se ejecuta**: sin
// compilarlo, con los tipos que declara `grupos-por-tarea.d.mts` al lado.
import {
  GRUPOS_POR_TAREA,
  asignacionPorTarea,
  nombresDeLosGrupos,
} from '../scripts/grupos-por-tarea.mjs';
import type { ItemDelPrototipo, TablaDeGrupos } from '../scripts/grupos-por-tarea.mjs';

/**
 * Las guardas del portador muerden.
 *
 * Mismo criterio que `generador-de-operaciones.test.ts`: **una verificacion que
 * no puede fallar no protege nada.** La tabla de grupos por tarea (ADR-0014 §4)
 * es exhaustiva a proposito —cada opcion de un modulo tabulado cae en un grupo
 * y en uno solo—, y lo que hace cumplir esa promesa son cuatro `throw` que
 * hasta ahora no ejercitaba nadie: el guion no era importable.
 *
 * La quinta guarda salio de escribir estas pruebas: dos grupos con el mismo
 * nombre pasaban limpiamente, y `bloquesDe` —que reparte las opciones por
 * nombre de bloque— habria dibujado la lista dos veces, con las opciones de los
 * dos grupos juntas en cada una.
 */

/** Los pares `[id, etiqueta]` como los trae el prototipo. */
const items = (...ids: readonly string[]): ItemDelPrototipo[] =>
  ids.map((id) => [id, id.toUpperCase()]);

const asignar = (moduloId: string, ids: readonly string[], tabla: TablaDeGrupos) =>
  asignacionPorTarea(moduloId, items(...ids), tabla);

describe('un modulo que no esta en la tabla conserva los bloques tecnicos', () => {
  it('devuelve null, y entonces manda `bloqueDe`', () => {
    expect(asignar('catastro', ['calles'], GRUPOS_POR_TAREA)).toBeNull();
  });
});

describe('la tabla de hoy asigna cada opcion de su modulo exactamente una vez', () => {
  it('Seguridad: once opciones, cuatro grupos, ninguna huerfana', () => {
    const ids = [
      'usuarios',
      'grupos',
      'miembros',
      'permisos',
      'accesos',
      'modulos',
      'parametros',
      'cambiar_anio',
      'cambiar_clave',
      'auditoria',
      'respaldo',
    ];
    const asignacion = asignar('seguridad', ids, GRUPOS_POR_TAREA);
    expect(asignacion?.size).toBe(ids.length);
    expect(asignacion?.get('cambiar_anio')).toBe('Sesión');
    expect(nombresDeLosGrupos('seguridad')).toEqual([
      'Cuentas y accesos',
      'Catálogo',
      'Sesión',
      'Operación',
    ]);
  });
});

/** Cada guarda, la tabla que la viola y el texto que delata el rechazo. */
const GUARDAS: {
  guarda: string;
  tabla: TablaDeGrupos;
  ids: readonly string[];
  delata: RegExp;
}[] = [
  {
    guarda: 'un grupo nombra una opcion que el modulo no tiene',
    tabla: { transito: [['Papeletas', ['papeletas', 'papeleta_inventada']]] },
    ids: ['papeletas'],
    delata: /nombra una opcion que el modulo no tiene: papeleta_inventada/,
  },
  {
    guarda: 'la misma opcion en dos grupos',
    tabla: {
      transito: [
        ['Papeletas', ['papeletas']],
        ['Cobranza', ['papeletas']],
      ],
    },
    ids: ['papeletas'],
    delata: /esta en dos grupos: «Papeletas» y «Cobranza»/,
  },
  {
    guarda: 'un grupo sin ninguna opcion',
    tabla: {
      transito: [
        ['Papeletas', ['papeletas']],
        ['Vehículos', []],
      ],
    },
    ids: ['papeletas'],
    delata: /El grupo «Vehículos» de transito no tiene ninguna opcion/,
  },
  {
    guarda: 'una opcion del modulo que ningun grupo reclama',
    tabla: { transito: [['Papeletas', ['papeletas']]] },
    ids: ['papeletas', 'internamiento'],
    delata: /La opcion internamiento de transito quedo sin grupo/,
  },
  {
    // La guarda que faltaba: `bloquesDe` reparte por nombre de bloque, asi que
    // dos grupos homonimos se dibujarian como dos listas identicas, cada una
    // con las opciones de los dos.
    guarda: 'dos grupos con el mismo nombre en un modulo',
    tabla: {
      transito: [
        ['Papeletas', ['papeletas']],
        ['Papeletas', ['internamiento']],
      ],
    },
    ids: ['papeletas', 'internamiento'],
    delata: /declara dos grupos llamados «Papeletas»/,
  },
];

describe('toda guarda de la tabla tiene una tabla que la viola', () => {
  it.each(GUARDAS)('$guarda', ({ tabla, ids, delata }) => {
    expect(() => asignar('transito', ids, tabla)).toThrow(delata);
  });
});
