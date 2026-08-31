import { describe, expect, it } from 'vitest';
// El portador es JavaScript de build y se importa **como se ejecuta**: sin
// compilarlo, con los tipos que declara `grupos-por-tarea.d.mts` al lado.
import {
  DESTINOS,
  GRUPOS_POR_TAREA,
  asignacionPorTarea,
  bloquesPlegadosDe,
  centroDeReportesDe,
  comprobarDestinos,
  nombresDeLosGrupos,
} from '../scripts/grupos-por-tarea.mjs';
import type {
  ItemDelPrototipo,
  TablaDeDestinos,
  TablaDeGrupos,
} from '../scripts/grupos-por-tarea.mjs';

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
    // Tras la fase 1c (#302–#308) el unico modulo sin grupos por tarea es
    // Inicio. El respaldo sigue vivo igualmente: es lo que clasifica un modulo
    // nuevo el dia que se anada, antes de que se disene su agrupacion.
    expect(asignar('inicio', ['inicio', 'portal'], GRUPOS_POR_TAREA)).toBeNull();
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

/**
 * **Las guardas de los destinos** (#500).
 *
 * Un destino puede ser tres cosas y ninguna mas: la portada del modulo, un grupo
 * del catalogo, o una **ruta propia** —el mapa catastral, que no tiene ninguna de
 * las 134 opciones dentro—. Lo que las hace falta comprobar es que el sintoma de
 * declararlas mal es **que no aparecen**, y eso es indistinguible de no haberlas
 * declarado: la barra lateral reparte por nombre, asi que una tilde de mas deja
 * el destino mudo y el panel con una entrada menos.
 */
const BLOQUES_DE_CATASTRO = ['Predios', 'Territorio', 'Valores del ejercicio', 'Documentos'];

const GUARDAS_DE_DESTINO: readonly {
  readonly guarda: string;
  readonly tabla: TablaDeDestinos;
  readonly delata: RegExp;
}[] = [
  {
    guarda: 'un destino que no es la portada, ni un grupo, ni una ruta',
    tabla: { catastro: { Prredios: { nota: 'n', icono: [] } } },
    delata: /El destino «Prredios» de catastro no es ningun grupo del modulo/,
  },
  {
    guarda: 'una ruta que se llama como un grupo: dos entradas con el mismo rotulo',
    tabla: {
      catastro: {
        Territorio: {
          label: 'Territorio',
          ranura: 'territorio',
          tras: 'Predios',
          exige: 'x',
          nota: 'n',
          icono: [],
        },
      },
    },
    delata: /se llama como un grupo del modulo/,
  },
  {
    guarda: 'una ruta sin rotulo: no puede tomarlo del nombre de un grupo, porque no lo es',
    tabla: {
      catastro: { mapa: { ranura: 'mapa', tras: 'Predios', exige: 'x', nota: 'n', icono: [] } },
    },
    delata: /no declara `label`/,
  },
  {
    guarda: 'una ruta sin permiso que comprobar',
    tabla: {
      catastro: { mapa: { label: 'M', ranura: 'mapa', tras: 'Predios', nota: 'n', icono: [] } },
    },
    delata: /no declara `exige`/,
  },
  {
    guarda: 'una ruta tras un grupo que el modulo no tiene: acabaria al final del panel',
    tabla: {
      catastro: {
        mapa: { label: 'M', ranura: 'mapa', tras: 'Prredios', exige: 'x', nota: 'n', icono: [] },
      },
    },
    delata: /declara «tras: Prredios», que no es ningun grupo del modulo/,
  },
];

describe('toda guarda de los destinos tiene una tabla que la viola', () => {
  it.each(GUARDAS_DE_DESTINO)('$guarda', ({ tabla, delata }) => {
    expect(() => comprobarDestinos('catastro', BLOQUES_DE_CATASTRO, tabla)).toThrow(delata);
  });

  it('y la tabla de verdad las pasa: Catastro declara cuatro grupos y una ruta', () => {
    expect(() => comprobarDestinos('catastro', BLOQUES_DE_CATASTRO, DESTINOS)).not.toThrow();
    // Sin esto, las cinco de arriba seguirian en verde con la tabla vacia.
    expect(Object.keys(DESTINOS['catastro'] ?? {})).toEqual([
      'panel',
      'Predios',
      'mapa',
      'Territorio',
      'Valores del ejercicio',
    ]);
  });
});

/**
 * **Plegar y llevar carril son dos cosas** (#391 §5).
 *
 * `{ plegado: true }` quita las opciones del menu y deja una entrada; `{ centro:
 * true }` hace eso **y ademas** mete cada hoja en el carril del centro de
 * reportes. La primera puede darse varias veces en un modulo —Catastro pliega
 * dos grupos, y sus superficies ya navegan entre sus opciones—; la segunda una
 * sola, porque dos carriles serian dos formas de navegar lo mismo.
 */
describe('los dos pliegues salen de la tabla, y se distinguen', () => {
  it('Catastro pliega tres grupos y ninguno lleva carril', () => {
    expect(bloquesPlegadosDe('catastro', GRUPOS_POR_TAREA)).toEqual([
      'Predios',
      'Territorio',
      'Valores del ejercicio',
    ]);
    expect(centroDeReportesDe('catastro', GRUPOS_POR_TAREA)).toBeNull();
    /* «Documentos» **no** se pliega, y no es un olvido: es un grupo de uno, y
       plegarlo seria una entrada que abre la unica opcion que esconde. Va al
       pie del panel, que es donde el artboard lo pone. */
    expect(bloquesPlegadosDe('catastro', GRUPOS_POR_TAREA)).not.toContain('Documentos');
  });

  it('un grupo con carril cuenta tambien como plegado', () => {
    for (const moduloId of [
      'transito',
      'infracciones-administrativas',
      'autorizaciones-y-licencias',
    ]) {
      expect(bloquesPlegadosDe(moduloId, GRUPOS_POR_TAREA), moduloId).toEqual(['Reportes']);
      expect(centroDeReportesDe(moduloId, GRUPOS_POR_TAREA), moduloId).toBe('Reportes');
    }
  });

  it('un modulo sin ninguna marca no pliega nada, y uno que no esta en la tabla tampoco', () => {
    expect(bloquesPlegadosDe('seguridad', GRUPOS_POR_TAREA)).toEqual([]);
    expect(bloquesPlegadosDe('inicio', GRUPOS_POR_TAREA)).toEqual([]);
  });

  it('dos grupos plegados sin carril en el mismo modulo se admiten: es el caso de Catastro', () => {
    expect(
      bloquesPlegadosDe('catastro', {
        catastro: [
          ['Predio', ['ficha_urbana'], { plegado: true }],
          ['Territorio', ['calles'], { plegado: true }],
        ],
      }),
    ).toEqual(['Predio', 'Territorio']);
  });

  it('las dos marcas a la vez se rechazan en el build: «centro» ya pliega', () => {
    expect(() =>
      bloquesPlegadosDe('transito', {
        transito: [['Reportes', ['transito_padron'], { plegado: true, centro: true }]],
      }),
    ).toThrow(/El grupo «Reportes» de transito se declara «plegado» y «centro» a la vez/);
  });
});

/**
 * El pliegue en centro de reportes (ADR-0014 §5) es **una marca de la tabla**,
 * no una lista de ids en un componente: el dia que Infracciones o Consultas
 * quieran el suyo, se marca su grupo y se regenera. Lo que se prueba aqui es
 * que la marca se lee, que la ausencia de marca tambien, y que su unica guarda
 * muerde.
 */
describe('un grupo se pliega en centro de reportes marcandolo en la tabla', () => {
  // Transito estreno el mecanismo (#295); la fase 1c le sumo otros dos (#304,
  // #308) sin escribir una linea de componente. Que los tres se lean por la
  // misma funcion es la prueba de que el pliegue vive en la tabla.
  it.each(['transito', 'infracciones-administrativas', 'autorizaciones-y-licencias'])(
    '%s pliega «Reportes», que es el grupo marcado',
    (moduloId) => {
      expect(centroDeReportesDe(moduloId, GRUPOS_POR_TAREA)).toBe('Reportes');
      // Y sigue siendo un grupo como los demas: asigna sus opciones igual.
      expect(nombresDeLosGrupos(moduloId)).toContain('Reportes');
    },
  );

  it('un modulo tabulado sin ningun grupo marcado no pliega nada', () => {
    expect(centroDeReportesDe('seguridad', GRUPOS_POR_TAREA)).toBeNull();
    // Consultas tiene su grupo de documentos a proposito **sin** marcar
    // —dos hojas no son un centro— y Tesoreria ni siquiera tiene documentos:
    // ninguno de los dos puede plegar nada.
    expect(centroDeReportesDe('tesoreria', GRUPOS_POR_TAREA)).toBeNull();
    expect(centroDeReportesDe('consultas', GRUPOS_POR_TAREA)).toBeNull();
  });

  it('un modulo que no esta en la tabla tampoco', () => {
    expect(centroDeReportesDe('inicio', GRUPOS_POR_TAREA)).toBeNull();
  });

  it('dos grupos marcados en el mismo modulo se rechazan en el build', () => {
    /* **El limite sobrevive a la generalizacion de #391 §5**, y su motivo
       cambio: ya no es que dos entradas se llamaran «Reportes» y «Reportes»
       —la barra lateral y el hub dibujan el nombre del bloque, asi que dos
       carriles darian dos entradas con nombres distintos—, sino que **dos
       carriles serian dos formas de navegar lo mismo**. Plegar sin carril si
       puede darse varias veces, y Catastro lo hace. */
    expect(() =>
      centroDeReportesDe('transito', {
        transito: [
          ['Reportes', ['transito_padron'], { centro: true }],
          ['Constancias', ['transito_constancia_libre'], { centro: true }],
        ],
      }),
    ).toThrow(/pliega dos grupos en centro de reportes: «Reportes» y «Constancias»/);
  });
});
