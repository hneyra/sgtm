import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
import { beforeAll } from 'vitest';
import {
  MODULOS,
  OPCIONES,
  bloquesDe,
  buscarOpciones,
  hojasDelCentro,
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
 *
 * **Esta copiada a mano a proposito, y no se «simplifica» derivandola de
 * `modulo.bloques`**: derivarla la volveria tautologica —el generado se
 * compararia consigo mismo— y dejaria de cazar lo unico que viene a cazar, que
 * es un archivo generado editado a mano o regenerado desde una tabla cambiada
 * sin querer.
 */
const GRUPOS_POR_TAREA_ESPERADOS: Readonly<
  Record<string, readonly (readonly [string, readonly string[]])[]>
> = {
  transito: [
    [
      'Papeletas',
      [
        'papeletas',
        'transito_busqueda',
        'transito_cambio_numero',
        'transito_descargos',
        'transito_estado_cuenta',
      ],
    ],
    ['Vehículos', ['internamiento']],
    ['Cobranza', ['transito_documentos', 'transito_padron_coactiva', 'transito_valores']],
    ['Catálogos', ['codigos_transito']],
    [
      'Reportes',
      [
        'transito_constancia_libre',
        'transito_padron',
        'transito_padron_constancias',
        'transito_papeleta_reporte',
        'transito_record_conductor',
        'transito_record_vehicular',
        'transito_reportes',
        'transito_resumen_codigo',
        'transito_resumen_papeletas',
        'transito_resumen_placa',
        'transito_resumen_recaudacion',
        'transito_rg_ordinaria',
        'transito_rg_sancionadora',
      ],
    ], // plegado en centro de reportes (ADR-0014 §5)
  ],
  // Los cinco destinos de #503 F1, que son las superficies del modulo y no
  // familias de tributos. Los cuatro movimientos respecto de #393 —beneficios
  // al padron, la DJ a Documentos, la deuda a su propio destino y alcabala con
  // las determinaciones— estan razonados en `grupos-por-tarea.mjs`.
  'rentas-registro': [
    ['Contribuyentes', ['beneficios', 'contribuyentes', 'predios_rentas', 'vehiculos']],
    [
      'Determinaciones',
      [
        'alcabala',
        'arbitrios',
        'espectaculos',
        'predial_individual',
        'predial_masivo',
        'vehicular_calculo',
      ],
    ],
    ['Transferencias', ['transferencia_predio', 'transferencia_vehiculo']],
    ['Movimientos de deuda', ['alta_deuda', 'baja_deuda']],
    ['Documentos', ['declaracion_jurada']],
  ],
  valores: [
    ['Emisión', ['valores_individual', 'valores_masivo']],
    [
      'Gestión del valor',
      ['notificacion_valores', 'pase_coactiva', 'prescripcion', 'valores_busqueda'],
    ],
  ],
  seguridad: [
    ['Cuentas y accesos', ['accesos', 'grupos', 'miembros', 'permisos', 'usuarios']],
    ['Catálogo', ['modulos', 'parametros']],
    ['Sesión', ['cambiar_anio', 'cambiar_clave']],
    ['Operación', ['auditoria', 'respaldo']],
  ],
  // Tres grupos porque tres son las superficies (#391): la ficha del predio, el
  // cuadro de valuacion y el territorio.
  catastro: [
    /* Los cuatro destinos del artboard, en su orden (#498 F2b). «Predios»
       absorbe las cuatro modalidades, la consulta y la actualizacion; el
       reporte del contribuyente se va a «Documentos» porque se abre por el
       codigo de LA PERSONA y no por el del predio, y ese grupo va al pie. */
    [
      'Predios',
      [
        'actualizacion_catastro',
        'consulta_fichas',
        'ficha_bienes',
        'ficha_economica',
        'ficha_rural',
        'ficha_urbana',
      ],
    ],
    ['Territorio', ['calles', 'sectores']],
    ['Valores del ejercicio', ['aranceles', 'depreciacion', 'valores_unitarios']],
    ['Documentos', ['ficha_contribuyente_reporte']],
  ],
  /* Los cinco destinos del embudo (#506 F5): se detecta, se programa, se
     inspecciona, se determina. «Campaña» juntaba la programación con los omisos
     —dos momentos distintos: el universo del que sale la muestra, y la muestra
     ya sorteada— y «Fiscalización» juntaba el acta de campo con el cruce de
     gabinete. */
  fiscalizacion: [
    ['Detección', ['fisc_omisos', 'fisc_vehicular']],
    ['Programas', ['fisc_programa']],
    ['Actas de inspección', ['fisc_predial']],
    ['Resultados', ['fisc_estado_cuenta', 'fisc_historico', 'fisc_resultados']],
    ['Documentos', ['resolucion_determinacion_fisc']],
  ],
  'infracciones-administrativas': [
    ['Infracciones', ['adm_estado_cuenta', 'infracciones_adm']],
    [
      'Notificaciones',
      [
        'adm_notificacion',
        'adm_notificacion_resolucion',
        'adm_notificaciones_contribuyente',
        'adm_notificaciones_vencidas',
      ],
    ],
    ['Cobranza', ['adm_resolucion_gerencia', 'adm_valores']],
    ['Catálogos', ['codigos_cuis']],
    [
      'Reportes',
      [
        'adm_codigos_reporte',
        'adm_padron_notificaciones',
        'adm_reportes',
        'adm_resumen_recaudacion',
      ],
    ], // plegado en centro de reportes (ADR-0014 §5)
  ],
  tesoreria: [
    ['Cobro en caja', ['caja_tasas', 'caja_tributaria']],
    ['Convenios', ['anulacion_convenio', 'consulta_convenios', 'fraccionamiento']],
    ['Recibos', ['anulacion_recibo', 'duplicado_recibo']],
    ['Cierre y control', ['avance_recaudacion', 'cierre_caja', 'recaudacion_area']],
  ],
  consultas: [
    [
      'Del contribuyente',
      ['consulta_deuda', 'consulta_deudas_beneficio', 'consulta_pagos', 'cuenta_corriente'],
    ],
    [
      'Del padrón',
      [
        'consulta_altas_bajas',
        'consulta_predios',
        'consulta_unificada',
        'consulta_valores',
        'consulta_vehiculos',
      ],
    ],
    ['Documentos', ['constancia', 'consulta_resumen_predial']],
  ],
  coactiva: [
    ['Expedientes', ['coactiva_expedientes', 'expediente_historial', 'importacion_valores']],
    [
      'Procedimiento',
      ['actos_coactivos', 'cambiar_direccion_ref', 'notificaciones_coactivas', 'proceso_coactivo'],
    ],
    ['Cobro y costas', ['costas_procesales', 'fraccionamiento_coactivo']],
    ['Consultas', ['coactiva_consulta_deudas', 'coactiva_deudas_beneficio']],
    ['Documentos', ['rec_impresion']],
  ],
  'autorizaciones-y-licencias': [
    ['Licencias y autorizaciones', ['anuncios', 'fue_edificacion', 'licencia_funcionamiento']],
    ['Catálogos', ['ciiu']],
    [
      'Reportes',
      [
        'anuncios_reportes',
        'certificados',
        'edificacion_reporte',
        'licencia_padron',
        'licencia_resolucion_cancelacion',
        'licencia_resolucion_duplicado',
        'licencia_resumen_anual',
      ],
    ], // plegado en centro de reportes (ADR-0014 §5)
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
    // el reparto disenados. Se comparan los IDS de cada grupo —no sus
    // conteos— para que una opcion movida entre dos grupos del mismo tamano
    // tambien se vea; ordenados, porque el orden dentro del grupo lo pone el
    // prototipo y aqui es documental.
    for (const [moduloId, esperados] of Object.entries(GRUPOS_POR_TAREA_ESPERADOS)) {
      const modulo = MODULOS.find((m) => m.id === moduloId);
      expect(modulo, `el modulo ${moduloId} existe`).toBeDefined();
      if (!modulo) continue;

      const bloques = bloquesDe(modulo);
      expect(
        bloques.map((b) => [b.label, [...b.opciones.map((o) => o.id)].sort()]),
        `grupos de ${moduloId}`,
      ).toEqual(esperados.map(([nombre, ids]) => [nombre, [...ids].sort()]));

      // Exactamente una vez: los grupos no comparten opcion y entre todos
      // cubren el modulo entero.
      const asignadas = bloques.flatMap((b) => b.opciones.map((o) => o.id));
      expect(new Set(asignadas).size, `sin duplicadas en ${moduloId}`).toBe(asignadas.length);
      expect(asignadas.length, `sin huerfanas en ${moduloId}`).toBe(modulo.opciones.length);
    }
  });

  it('el modulo que no esta en la tabla conserva la clasificacion tecnica', () => {
    // Tras la fase 1c (#302–#308) el unico sin grupos por tarea es Inicio: sus
    // dos opciones —el panel y el portal— las clasifica `bloqueDe` por el
    // titulo, y caen en «Consultas». Es lo que mantiene vivo el respaldo: si
    // manana se anade un modulo, no nace sin bloques.
    const sinTabla = MODULOS.filter((m) => GRUPOS_POR_TAREA_ESPERADOS[m.id] === undefined);
    expect(sinTabla.map((m) => m.id)).toEqual(['inicio']);
    for (const opcion of sinTabla.flatMap((m) => m.opciones)) {
      expect(BLOQUES_TECNICOS.has(opcion.bloque), `${opcion.id}: ${opcion.bloque}`).toBe(true);
    }
    expect(OPCIONES.find((o) => o.id === 'portal')?.bloque).toBe('Consultas');
  });
});

/**
 * Las hojas que cada modulo pliega en su centro de reportes (ADR-0014 §5), **en
 * el orden del catalogo**. Copiadas a mano, por el mismo motivo que los grupos
 * de arriba: derivarlas del generado las volveria tautologicas.
 *
 * Esta es la lista que se pone roja si una hoja se cae del mecanismo —porque se
 * desmarco el grupo en la tabla, porque una hoja se movio a otro grupo, o
 * porque el portador dejo de emitir la marca—. Ninguna de las tres rompe la
 * compilacion: la opcion seguiria existiendo, con su ruta y su permiso, solo
 * que fuera del centro y de vuelta compitiendo en el menu.
 *
 * Son tres modulos, no uno: Transito estreno el mecanismo (#295) y la fase 1c
 * (#304, #308) le sumo Infracciones administrativas y Autorizaciones y
 * licencias sin tocar ni un componente. Que la lista se lea igual para los tres
 * es lo que demuestra que el pliegue vive en la tabla.
 */
const HOJAS_DEL_CENTRO: Readonly<Record<string, readonly string[]>> = {
  transito: [
    'transito_reportes',
    'transito_record_conductor',
    'transito_record_vehicular',
    'transito_constancia_libre',
    'transito_padron',
    'transito_papeleta_reporte',
    'transito_rg_ordinaria',
    'transito_rg_sancionadora',
    'transito_padron_constancias',
    'transito_resumen_recaudacion',
    'transito_resumen_papeletas',
    'transito_resumen_codigo',
    'transito_resumen_placa',
  ],
  'infracciones-administrativas': [
    'adm_codigos_reporte',
    'adm_reportes',
    'adm_padron_notificaciones',
    'adm_resumen_recaudacion',
  ],
  'autorizaciones-y-licencias': [
    'anuncios_reportes',
    'licencia_padron',
    'licencia_resumen_anual',
    'licencia_resolucion_cancelacion',
    'licencia_resolucion_duplicado',
    'edificacion_reporte',
    'certificados',
  ],
};

describe('el centro de reportes se declara en el catalogo, no en el componente', () => {
  it('los tres que pliegan son estos tres, y el bloque plegado se llama «Reportes»', () => {
    const plegadores = MODULOS.filter((m) => m.centroDeReportes !== undefined).map((m) => [
      m.id,
      m.centroDeReportes,
    ]);
    expect(plegadores).toEqual([
      ['transito', 'Reportes'],
      ['infracciones-administrativas', 'Reportes'],
      ['autorizaciones-y-licencias', 'Reportes'],
    ]);
  });

  it.each(Object.entries(HOJAS_DEL_CENTRO))(
    'las hojas de %s estan en el centro, con su id y su ruta intactos',
    (moduloId, esperadas) => {
      const modulo = MODULOS.find((m) => m.id === moduloId);
      expect(modulo, `el modulo ${moduloId} existe`).toBeDefined();
      if (!modulo) return;

      const hojas = hojasDelCentro(modulo);
      expect(hojas.map((h) => h.id)).toEqual(esperadas);
      // Cada hoja conserva su ruta: el centro no las absorbe, las envuelve.
      for (const hoja of hojas) {
        expect(opcionPorRuta(moduloId, hoja.ranura)?.id, hoja.id).toBe(hoja.id);
      }
    },
  );

  it.each(Object.keys(HOJAS_DEL_CENTRO))(
    'en %s el bloque plegado es el que dice el modulo, y solo ese',
    (moduloId) => {
      const modulo = MODULOS.find((m) => m.id === moduloId);
      if (!modulo) return;
      const plegados = bloquesDe(modulo)
        .filter((b) => b.plegado)
        .map((b) => b.label);
      expect(plegados).toEqual(['Reportes']);
    },
  );

  it('un modulo sin centro no tiene hojas que plegar', () => {
    const consultas = MODULOS.find((m) => m.id === 'consultas');
    expect(consultas?.centroDeReportes).toBeUndefined();
    expect(consultas && hojasDelCentro(consultas)).toEqual([]);
  });

  /**
   * **Plegar y llevar carril dejaron de ser lo mismo** (#391 §5): un bloque se
   * pliega cuando su superficie ya sabe navegar entre sus opciones, y solo
   * lleva carril cuando esas opciones no tienen ninguna otra forma de
   * alcanzarse entre si. Por eso Catastro pliega dos bloques y no tiene centro.
   *
   * Copiado a mano, como los grupos de arriba y por lo mismo: derivarlo de
   * `modulo.bloquesPlegados` compararia el generado consigo mismo.
   */
  it('los bloques que el menu pliega son estos, y solo uno de ellos lleva carril', () => {
    const plegados = MODULOS.filter((m) => (m.bloquesPlegados ?? []).length > 0).map((m) => [
      m.id,
      m.bloquesPlegados,
      m.centroDeReportes ?? null,
    ]);
    expect(plegados).toEqual([
      ['catastro', ['Predios', 'Territorio', 'Valores del ejercicio'], null],
      /* El cuarto pliegue sin carril, y **sólo se pudo desde #506 F1**: las tres
         opciones de «Resultados» son una superficie de tres hojas, y su tira
         lleva de cualquiera a las otras dos. Antes de la superficie, plegarlas
         habría escondido tres pantallas detrás de una entrada que sólo llevaba a
         la primera. */
      ['fiscalizacion', ['Resultados'], null],
      ['transito', ['Reportes'], 'Reportes'],
      ['infracciones-administrativas', ['Reportes'], 'Reportes'],
      ['autorizaciones-y-licencias', ['Reportes'], 'Reportes'],
    ]);
  });

  it('los tres bloques plegados de Catastro no son hojas de ningun centro', () => {
    const catastro = MODULOS.find((m) => m.id === 'catastro');
    expect(catastro?.centroDeReportes).toBeUndefined();
    expect(catastro && hojasDelCentro(catastro)).toEqual([]);
    // Se pliegan igual: la entrada del menu no distingue los dos pliegues.
    expect(
      catastro &&
        bloquesDe(catastro)
          .filter((b) => b.plegado)
          .map((b) => [b.label, b.carril]),
    ).toEqual([
      // Tres desde #498 F2b: «Predios» se pliega porque la chip de modalidad
      // que no deriva del codigo dejo de estar apagada y lleva a su propia
      // busqueda, asi que la superficie alcanza las seis.
      ['Predios', false],
      ['Territorio', false],
      ['Valores del ejercicio', false],
    ]);
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

  it('ningun modulo se llama «atencion»: ese segmento es de la ficha 360°', () => {
    // ADR-0016 §2 afirma que `/atencion/:codigo` no choca con `/:moduloId/:ranura`
    // porque React Router puntua por encima lo estatico Y porque ningun modulo se
    // llama asi. Lo primero lo garantiza la biblioteca; lo segundo, esta linea:
    // sin ella, un modulo nuevo llamado `atencion` dejaria sus opciones a la
    // sombra de la ficha sin que nada lo dijera.
    expect(MODULOS.map((m) => m.id)).not.toContain('atencion');
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
