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
 * conservan `bloqueDe` hasta que se disene su agrupacion.
 *
 * La tabla es **exhaustiva a proposito**: en un modulo tabulado, cada opcion
 * tiene que aparecer exactamente una vez —incluido lo que se queda
 * deliberadamente en «Documentos y reportes», como las 13 hojas de Transito
 * hasta la fase 2 del centro de reportes—. No hay respaldo implicito para lo
 * que falte: una opcion sin grupo, un id que el modulo no tiene, un id repetido
 * o dos grupos con el mismo nombre rompen el build con nombre y apellido. Asi,
 * anadir una opcion a un modulo tabulado obliga a decidir su grupo en este
 * mismo diff, y ninguna queda huerfana en silencio.
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
    // Las 13 hojas siguen juntas hasta la fase 2 (centro de reportes).
    [
      'Documentos y reportes',
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
