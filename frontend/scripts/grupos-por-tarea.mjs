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
 * grupo nombra el objeto de trabajo y lista sus opciones por id. **El orden de
 * los grupos es el que la barra lateral dibuja**; el orden de los ids dentro de
 * un grupo es documental —la barra conserva el del prototipo—. Los modulos que no estan en la tabla
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
 * <h2>Cuando un grupo se pliega, y cuando ademas lleva carril</h2>
 *
 * Un grupo puede llevar un tercer elemento con una marca de pliegue. **La regla
 * son dos frases, y la segunda no implica la primera:**
 *
 * > Un grupo se pliega en el menu cuando **su superficie ya sabe navegar entre
 * > sus opciones**. Si ademas sus opciones no tienen otra forma de alcanzarse
 * > entre si, el pliegue lleva carril (`centro`). Lo primero puede darse varias
 * > veces en un modulo; lo segundo, una sola —dos carriles serian dos formas de
 * > navegar lo mismo—.
 *
 * De ahi salen las dos marcas:
 *
 *   `{ plegado: true }`   el menu deja de listar sus opciones una a una y
 *                         ensena **una** entrada, que abre la primera que el
 *                         usuario pueda ver. Nada mas: la pantalla se dibuja
 *                         como se dibujaba. Se usa donde la superficie ya lleva
 *                         a todas —el conmutador de modalidad de la ficha del
 *                         predio, las pestanas del territorio y las del cuadro
 *                         de valuacion—, y **plegar ahi no esconde nada**
 *   `{ centro: true }`    pliega igual **y ademas** mete cada hoja en el carril
 *                         del centro de reportes (ADR-0014 §5), que lista las
 *                         demas a su izquierda. Es lo que hace falta cuando la
 *                         superficie **no** existe: las trece hojas de Transito
 *                         no tienen ninguna otra forma de alcanzarse entre si
 *
 * Las dos son excluyentes —`centro` ya pliega— y las dos se declaran **aqui**,
 * en la tabla, no como una lista de ids cableada en un componente: cada opcion
 * conserva su id, su ruta y su permiso, porque plegar es composicion de
 * navegacion y no una pantalla que absorba a otras. Que Infracciones
 * administrativas y Autorizaciones y licencias tengan hoy su centro, despues de
 * que Transito estrenara el mecanismo, no costo mas que una marca en esta tabla
 * y una regeneracion: ni un componente nuevo, ni una lista de ids en ningun
 * `.tsx`.
 *
 * Un modulo pliega **en centro** el grupo cuyas hojas solo se emiten: si el
 * grupo mezclara operaciones con hojas, plegarlo esconderia trabajo detras de
 * una entrada que dice «Reportes». Por eso Fiscalizacion, Consultas y Coactiva
 * no plegan ninguno —sus documentos son uno o dos, y una entrada que abre un
 * carril de dos hojas es mas navegacion, no menos— y Tesoreria ni siquiera
 * tiene grupo de documentos que plegar.
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
  // Reagrupado por **el hecho que dispara el trabajo** (#393). La agrupacion
  // anterior seguia siendo, en parte, la taxonomia tecnica de FRO-03 §4:
  // «Movimientos» mezclaba transferencias del padron con altas y bajas de la
  // cuenta corriente —dos trabajos de dos personas distintas— y «Tributos y
  // beneficios» era un cajon de sastre con un tributo de emision masiva
  // (arbitrios), uno de transferencia (alcabala), uno por evento
  // (espectaculos) y un registro de resoluciones que **baja la base antes de
  // determinar** (beneficios).
  //
  // Lo que se midio sobre el catalogo antes de mover nada: una atencion de
  // predial —contribuyente, predios, DJ, determinacion, arbitrios,
  // transferencia, alcabala— cruzaba los CUATRO grupos, y ninguno la reunia.
  'rentas-registro': [
    // Quien y que esta inscrito. El unico grupo que no cambia.
    ['Padrón', ['contribuyentes', 'predios_rentas', 'vehiculos']],
    // La emision anual sobre el padron, en el orden en que se trabaja: el papel
    // que la sustenta abre el grupo, y arbitrios entra aqui porque tambien es
    // determinar y emitir cuponera, no un tributo suelto.
    [
      'Determinación',
      [
        'declaracion_jurada',
        'predial_individual',
        'predial_masivo',
        'arbitrios',
        'vehicular_calculo',
      ],
    ],
    // Lo que ocurre una vez y se liquida al momento. Alcabala queda **bajo el
    // acto que la genera**: «Transferencia de predio» dibuja una casilla
    // «Genera alcabala» y la pantalla que la liquidaba vivia dos grupos mas
    // abajo.
    [
      'Actos y transferencias',
      ['transferencia_predio', 'alcabala', 'transferencia_vehiculo', 'espectaculos'],
    ],
    // Las tres formas de tocar lo que se debe fuera de la emision.
    ['Beneficios y ajustes', ['beneficios', 'alta_deuda', 'baja_deuda']],
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
    // Tres grupos, y no cinco, porque **tres son las superficies** (#391): desde
    // que las cinco opciones de la ficha caen en `FichaDelPredio`, las tres de
    // valuacion en `CuadroDeValuacion` y las dos del territorio en `Territorio`,
    // un menu de cinco grupos describe una organizacion que la interfaz ya no
    // tiene. «Consultas» y «Documentos» eran ademas dos grupos de una opcion
    // cada uno: un grupo de uno no agrupa nada, y separaba del predio la
    // busqueda con la que se le llega.
    //
    // El orden dentro del grupo es el del trabajo, no el alfabetico: primero se
    // busca el predio, luego se abre su ficha en la modalidad que sea, y al
    // final se actualiza o se imprime.
    //
    /* **«Predio» NO se pliega, y no es un olvido** (#391 §5).
     *
     * `FichaDelPredio` lleva a cinco de sus siete —las cuatro modalidades por
     * el conmutador y `actualizacion_catastro` por la primaria «Actualizar
     * catastro»— y a `consulta_fichas` por el enlace de su buscador, que hoy
     * solo se dibuja **sin predio abierto**, que es la decision de §3: con el
     * predio en la ruta no hay barra de busqueda, porque volver a preguntarlo
     * encima de la ficha que se esta leyendo era la sexta forma de buscar lo
     * mismo.
     *
     * La septima **no la alcanza nada del modulo, y no puede**:
     * `ficha_contribuyente_reporte` se abre por el codigo del CONTRIBUYENTE
     * —`GET /catastro/contribuyentes/{codigo}/ficha.pdf`— y ninguna superficie
     * de Catastro tiene ese codigo en la mano. `FichaResource` no lo publica
     * (por eso el «Titular» de la cabecera-resumen sale «—») y
     * `FichaEncontradaResource` publica el **nombre** del titular y no su
     * codigo, que es exactamente lo que #322 ya decidio que no funda un enlace:
     * «un enlace armado por nombre abre al homonimo o a nadie».
     *
     * Asi que plegar aqui esconderia detras de una entrada una opcion a la que
     * esa entrada no lleva, y una opcion sin retorno es peor que un menu largo.
     * Lo que lo desbloquea no es interfaz: que el recurso publique el codigo
     * del titular —y entonces la ficha enlaza su reporte y el enlace a la
     * consulta se dibuja tambien con predio abierto—, o que el reporte viva
     * donde el contribuyente esta. Hasta entonces, las siete siguen en el menu.
     */
    [
      'Predio',
      [
        'consulta_fichas',
        'ficha_urbana',
        'ficha_economica',
        'ficha_bienes',
        'ficha_rural',
        'actualizacion_catastro',
        'ficha_contribuyente_reporte',
      ],
    ],
    // Las dos hojas del territorio, plegadas **sin carril**: `Territorio.tsx`
    // las dibuja como pestanas de una sola superficie, asi que un carril seria
    // una segunda forma de navegar lo mismo al lado de la primera.
    ['Territorio', ['calles', 'sectores'], { plegado: true }],
    // Los tres catalogos que ponen precio al territorio. No son «registro y
    // mantenimiento» como una calle: son la tabla con la que se valoriza. El
    // nombre pierde «Tablas de» porque ya no son tres tablas sueltas en el
    // menu: son las tres hojas de un cuadro. Y por eso mismo se pliegan:
    // `CuadroDeValuacion.tsx` es la superficie, y sus pestanas llevan a las
    // tres.
    ['Valuación', ['aranceles', 'valores_unitarios', 'depreciacion'], { plegado: true }],
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
 * Los grupos que este modulo **pliega en el menu**, en el orden de la tabla;
 * vacio si no pliega ninguno.
 *
 * Son los dos casos de la regla: los marcados `{ plegado: true }` y el que
 * ademas lleva carril, `{ centro: true }`. Aqui no se distinguen, porque en el
 * menu **se dibujan igual**: una entrada unica en vez de la lista de opciones.
 * Quien si los distingue es `centroDeReportesDe`, que nombra al del carril.
 *
 * Un modulo puede plegar varios: Catastro pliega dos, y lo hace sin carril
 * porque sus superficies ya navegan entre sus opciones.
 *
 * @param moduloId ranura del modulo, como `catastro`.
 * @param tabla la tabla a aplicar; se inyecta para poder probar la guarda.
 */
export function bloquesPlegadosDe(moduloId, tabla = GRUPOS_POR_TAREA) {
  const grupos = tabla[moduloId];
  if (!grupos) return [];

  const plegados = [];
  for (const [nombre, , opciones] of grupos) {
    // Las dos marcas juntas no dicen nada mas que `centro` sola, y dejarlas
    // pasar invitaria a leer `plegado` como «pliega ademas», que es lo que no
    // es: `centro` ya pliega. Se rechaza en el build para que la tabla tenga
    // una sola forma de decir cada cosa.
    if (opciones?.plegado === true && opciones?.centro === true) {
      throw new Error(
        `El grupo «${nombre}» de ${moduloId} se declara «plegado» y «centro» a la vez: «centro» ya pliega`,
      );
    }
    if (opciones?.plegado === true || opciones?.centro === true) plegados.push(nombre);
  }
  return plegados;
}

/**
 * El grupo que este modulo pliega **con carril** —su centro de reportes
 * (ADR-0014 §5)—, o `null` si no pliega ninguno asi.
 *
 * Uno como mucho, y el motivo ya no es que dos entradas se llamaran igual —la
 * barra lateral y el hub dibujan el nombre del bloque, asi que dos carriles
 * darian dos entradas con nombres distintos—: es que **dos carriles serian dos
 * formas de navegar lo mismo**. El carril existe para las hojas que no tienen
 * ninguna otra; un modulo con dos listas de hojas al lado de la pantalla es un
 * modulo que ya no sabe donde esta. Se rechaza en el build en vez de dibujarse.
 *
 * Plegar **sin** carril no cae bajo este limite: eso es `bloquesPlegadosDe`, y
 * puede darse tantas veces como superficies tenga el modulo.
 *
 * @param moduloId ranura del modulo, como `transito`.
 * @param tabla la tabla a aplicar; se inyecta para poder probar la guarda.
 */
export function centroDeReportesDe(moduloId, tabla = GRUPOS_POR_TAREA) {
  const grupos = tabla[moduloId];
  if (!grupos) return null;

  const conCarril = grupos.filter(([, , opciones]) => opciones?.centro === true);
  if (conCarril.length > 1) {
    const nombres = conCarril.map(([nombre]) => `«${nombre}»`).join(' y ');
    throw new Error(`El modulo ${moduloId} pliega dos grupos en centro de reportes: ${nombres}`);
  }
  return conCarril[0]?.[0] ?? null;
}
