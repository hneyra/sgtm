/* Grupos por tarea de los modulos ya disenados (ADR-0014 §4).
 *
 * Vive aparte del portador —y no dentro de `portar-catalogo.mjs`— porque sus
 * guardas son lo unico que impide que una opcion se quede huerfana en silencio,
 * y **una guarda que no se puede probar no protege nada**: el portador es un
 * guion de efectos (lee el prototipo, borra y escribe archivos), asi que no se
 * puede importar desde una prueba. Esto si.
 *
 * Los cuatro bloques tecnicos de FRO-03 §4 clasifican por tipo de pantalla, no
 * por la tarea del usuario. Aqui la agrupacion se declara modulo a modulo: cada
 * grupo nombra el objeto de trabajo y lista sus opciones por id, **en el orden
 * en que la barra lateral las muestra**. Los modulos que no estan en la tabla
 * conservan `bloqueDe` hasta que se disene su agrupacion; tras la fase 1c
 * (#302–#308) el unico que queda asi es Inicio, con sus dos opciones. El
 * respaldo no sobra por eso: es lo que clasifica un modulo nuevo el dia que se
 * anada, antes de que se decida su agrupacion.
 *
 * La tabla es **exhaustiva a proposito**: en un modulo tabulado, cada opcion
 * tiene que aparecer exactamente una vez. No hay respaldo implicito para lo
 * que falte: una opcion sin grupo, un id que el modulo no tiene, un id repetido
 * o dos grupos con el mismo nombre rompen el build con nombre y apellido. Asi,
 * anadir una opcion a un modulo tabulado obliga a decidir su grupo en este
 * mismo diff, y ninguna queda huerfana en silencio.
 *
 * Un grupo puede llevar un tercer elemento, `{ centro: true }`: entonces se
 * **pliega en un centro de reportes** (ADR-0014 §5). El menu deja de listar sus
 * opciones una a una y ensena una entrada unica; el centro las lista dentro.
 * Cada hoja conserva su id, su ruta y su permiso —el centro es composicion de
 * navegacion, no una pantalla que las absorba—, y por eso el pliegue se declara
 * **aqui**, en la tabla, y no como una lista de ids cableada en un componente.
 * Que Infracciones administrativas y Autorizaciones y licencias tengan hoy el
 * suyo, despues de que Transito estrenara el mecanismo, no costo mas que una
 * marca en esta tabla y una regeneracion: ni un componente nuevo, ni una lista
 * de ids en ningun `.tsx`.
 *
 * Un modulo pliega en centro el grupo cuyas hojas **solo se emiten**: si el
 * grupo mezclara operaciones con hojas, plegarlo esconderia trabajo detras de
 * una entrada que dice «Reportes». Por eso Catastro, Fiscalizacion, Tesoreria,
 * Consultas y Coactiva no plegan ninguno: sus documentos son uno o dos, y una
 * entrada que abre un carril de dos hojas es mas navegacion, no menos.
 *
 * Los nombres de las OPCIONES no se reescriben (RNF-080): cambia solo su grupo.
 */

export const GRUPOS_POR_TAREA = {
  transito: [
    [
      'Papeletas',
      [
        'papeletas',
        'transito_descargos',
        'transito_cambio_numero',
        'transito_busqueda',
        'transito_estado_cuenta',
      ],
    ],
    ['Vehículos', ['internamiento']],
    ['Cobranza', ['transito_valores', 'transito_documentos', 'transito_padron_coactiva']],
    ['Catálogos', ['codigos_transito']],
    // Las 13 hojas de Transito, plegadas en su centro de reportes (ADR-0014
    // §5): en el menu son **una** entrada, y el centro las lista dentro.
    [
      'Reportes',
      [
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
      { centro: true },
    ],
  ],
  'rentas-registro': [
    ['Padrones', ['contribuyentes', 'predios_rentas', 'vehiculos']],
    [
      'Determinación',
      ['predial_individual', 'predial_masivo', 'vehicular_calculo', 'declaracion_jurada'],
    ],
    ['Movimientos', ['transferencia_predio', 'transferencia_vehiculo', 'alta_deuda', 'baja_deuda']],
    ['Tributos y beneficios', ['arbitrios', 'alcabala', 'espectaculos', 'beneficios']],
  ],
  valores: [
    ['Emisión', ['valores_individual', 'valores_masivo']],
    [
      'Gestión del valor',
      ['notificacion_valores', 'prescripcion', 'pase_coactiva', 'valores_busqueda'],
    ],
  ],
  seguridad: [
    ['Cuentas y accesos', ['usuarios', 'grupos', 'miembros', 'permisos', 'accesos']],
    ['Catálogo', ['modulos', 'parametros']],
    ['Sesión', ['cambiar_anio', 'cambiar_clave']],
    ['Operación', ['auditoria', 'respaldo']],
  ],
  catastro: [
    // El objeto de trabajo de Catastro es la ficha del predio, y las cuatro
    // fichas mas la actualizacion masiva son lo mismo visto de cuatro maneras.
    [
      'Fichas del predio',
      ['ficha_urbana', 'ficha_economica', 'ficha_bienes', 'ficha_rural', 'actualizacion_catastro'],
    ],
    ['Territorio', ['calles', 'sectores']],
    // Los tres catalogos que ponen precio al territorio. No son «registro y
    // mantenimiento» como una calle: son la tabla con la que se valoriza.
    ['Tablas de valuación', ['aranceles', 'valores_unitarios', 'depreciacion']],
    ['Consultas', ['consulta_fichas']],
    ['Documentos', ['ficha_contribuyente_reporte']],
  ],
  fiscalizacion: [
    // La campana se programa y se decide a quien alcanza; recien despues se
    // fiscaliza. Los dos pasos son tareas distintas de la misma persona.
    ['Campaña', ['fisc_programa', 'fisc_omisos']],
    ['Fiscalización', ['fisc_predial', 'fisc_vehicular']],
    ['Resultados', ['fisc_resultados', 'fisc_estado_cuenta', 'fisc_historico']],
    ['Documentos', ['resolucion_determinacion_fisc']],
  ],
  'infracciones-administrativas': [
    ['Infracciones', ['infracciones_adm', 'adm_estado_cuenta']],
    // Notificar es el trabajo del modulo: cuatro de sus trece opciones giran
    // alrededor de la notificacion y de lo que pasa cuando vence.
    [
      'Notificaciones',
      [
        'adm_notificacion',
        'adm_notificacion_resolucion',
        'adm_notificaciones_vencidas',
        'adm_notificaciones_contribuyente',
      ],
    ],
    ['Cobranza', ['adm_valores', 'adm_resolucion_gerencia']],
    ['Catálogos', ['codigos_cuis']],
    // Las cuatro hojas, plegadas en su centro de reportes (ADR-0014 §5).
    [
      'Reportes',
      [
        'adm_codigos_reporte',
        'adm_reportes',
        'adm_padron_notificaciones',
        'adm_resumen_recaudacion',
      ],
      { centro: true },
    ],
  ],
  tesoreria: [
    ['Cobro en caja', ['caja_tributaria', 'caja_tasas']],
    ['Convenios', ['fraccionamiento', 'consulta_convenios', 'anulacion_convenio']],
    ['Recibos', ['duplicado_recibo', 'anulacion_recibo']],
    // Lo que se hace al final del dia, y lo que se mira despues: el cierre y
    // las dos vistas de cuanto entro.
    ['Cierre y control', ['cierre_caja', 'avance_recaudacion', 'recaudacion_area']],
  ],
  consultas: [
    // El modulo entero es consulta, asi que agrupar por «consulta» no dice
    // nada: lo que separa sus opciones es **a quien se le pregunta**.
    [
      'Del contribuyente',
      ['cuenta_corriente', 'consulta_deuda', 'consulta_pagos', 'consulta_deudas_beneficio'],
    ],
    [
      'Del padrón',
      [
        'consulta_predios',
        'consulta_vehiculos',
        'consulta_valores',
        'consulta_altas_bajas',
        'consulta_unificada',
      ],
    ],
    ['Documentos', ['consulta_resumen_predial', 'constancia']],
  ],
  coactiva: [
    ['Expedientes', ['coactiva_expedientes', 'expediente_historial', 'importacion_valores']],
    [
      'Procedimiento',
      ['proceso_coactivo', 'actos_coactivos', 'notificaciones_coactivas', 'cambiar_direccion_ref'],
    ],
    ['Cobro y costas', ['costas_procesales', 'fraccionamiento_coactivo']],
    ['Consultas', ['coactiva_consulta_deudas', 'coactiva_deudas_beneficio']],
    ['Documentos', ['rec_impresion']],
  ],
  'autorizaciones-y-licencias': [
    ['Licencias y autorizaciones', ['licencia_funcionamiento', 'fue_edificacion', 'anuncios']],
    ['Catálogos', ['ciiu']],
    // Siete de las once opciones del modulo son hojas: sin plegarlas, el menu
    // de Autorizaciones es un menu de reportes con tres tramites al lado.
    [
      'Reportes',
      [
        'anuncios_reportes',
        'licencia_padron',
        'licencia_resumen_anual',
        'licencia_resolucion_cancelacion',
        'licencia_resolucion_duplicado',
        'edificacion_reporte',
        'certificados',
      ],
      { centro: true },
    ],
  ],
};

/**
 * El grupo de cada opcion de un modulo tabulado, o `null` si el modulo no
 * esta en la tabla (y entonces manda `bloqueDe`). Falla ruidosamente ante
 * cualquier desajuste entre la tabla y el prototipo: es la garantia de que
 * en un modulo tabulado cada opcion acaba exactamente en un grupo.
 *
 * @param moduloId ranura del modulo, como `transito` o `rentas-registro`.
 * @param items pares `[id, etiqueta]` del prototipo, en su orden.
 * @param tabla la tabla a aplicar; se inyecta para poder probar las guardas.
 */
export function asignacionPorTarea(moduloId, items, tabla = GRUPOS_POR_TAREA) {
  const grupos = tabla[moduloId];
  if (!grupos) return null;

  const delModulo = new Set(items.map(([id]) => id));
  const asignacion = new Map();
  const nombresVistos = new Set();
  for (const [nombre, ids] of grupos) {
    // Dos grupos con el mismo nombre no serian dos grupos: `bloquesDe` reparte
    // por nombre, asi que la barra lateral dibujaria dos veces la misma lista
    // con las opciones de los dos juntas.
    if (nombresVistos.has(nombre)) {
      throw new Error(`El modulo ${moduloId} declara dos grupos llamados «${nombre}»`);
    }
    nombresVistos.add(nombre);
    if (ids.length === 0) {
      throw new Error(`El grupo «${nombre}» de ${moduloId} no tiene ninguna opcion`);
    }
    for (const id of ids) {
      if (!delModulo.has(id)) {
        throw new Error(
          `El grupo «${nombre}» de ${moduloId} nombra una opcion que el modulo no tiene: ${id}`,
        );
      }
      if (asignacion.has(id)) {
        throw new Error(
          `La opcion ${id} de ${moduloId} esta en dos grupos: «${asignacion.get(id)}» y «${nombre}»`,
        );
      }
      asignacion.set(id, nombre);
    }
  }
  for (const id of delModulo) {
    if (!asignacion.has(id)) {
      throw new Error(
        `La opcion ${id} de ${moduloId} quedo sin grupo: la tabla GRUPOS_POR_TAREA debe asignarla`,
      );
    }
  }
  return asignacion;
}

/** Los nombres de los grupos de un modulo, en el orden de la tabla. */
export function nombresDeLosGrupos(moduloId, tabla = GRUPOS_POR_TAREA) {
  return (tabla[moduloId] ?? []).map(([nombre]) => nombre);
}

/**
 * El grupo que este modulo pliega en un centro de reportes (ADR-0014 §5), o
 * `null` si no pliega ninguno.
 *
 * Uno como mucho: dos centros en un modulo dejarian la barra lateral con dos
 * entradas homonimas —«Reportes» y «Reportes»— y ninguna forma de saber cual
 * abre cual, asi que se rechaza en el build en vez de dibujarse.
 *
 * @param moduloId ranura del modulo, como `transito`.
 * @param tabla la tabla a aplicar; se inyecta para poder probar la guarda.
 */
export function centroDeReportesDe(moduloId, tabla = GRUPOS_POR_TAREA) {
  const grupos = tabla[moduloId];
  if (!grupos) return null;

  const plegados = grupos.filter(([, , opciones]) => opciones?.centro === true);
  if (plegados.length > 1) {
    const nombres = plegados.map(([nombre]) => `«${nombre}»`).join(' y ');
    throw new Error(`El modulo ${moduloId} pliega dos grupos en centro de reportes: ${nombres}`);
  }
  return plegados[0]?.[0] ?? null;
}
