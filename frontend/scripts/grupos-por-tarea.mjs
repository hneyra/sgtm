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
  // Reagrupado por **el hecho que dispara el trabajo** (#393), y desde #503 F1
  // por **el destino**: cada grupo es ahora una superficie o el camino a ella,
  // no un cajon de opciones parecidas. El nombre dice lo que se hace con ellas,
  // no como se llama la familia de tributos.
  //
  // Lo que #393 midio y sigue valiendo: una atencion de predial —contribuyente,
  // predios, DJ, determinacion, arbitrios, transferencia, alcabala— cruzaba los
  // CUATRO grupos de entonces y ninguno la reunia. Lo que cambia ahora es que
  // los grupos coinciden con las superficies que se van a construir.
  //
  // Los cuatro movimientos, y su motivo:
  //
  //   `beneficios`          sale de «Beneficios y ajustes» y entra con el
  //                         padron. Es una **seccion del expediente** del
  //                         contribuyente (F2), no un ajuste de su deuda: baja
  //                         la base antes de determinar, y se lee al abrir a la
  //                         persona
  //   `alcabala`            se queda con las determinaciones, que es lo que
  //                         hace —liquidar un impuesto—, y ADEMAS la genera la
  //                         casilla del acto de transferencia (F5). Vive en los
  //                         dos sitios a proposito (#503, decision 3); el
  //                         comentario que la ponia solo bajo el acto era de
  //                         cuando esa casilla iba a ser su unica puerta
  //   `alta_deuda`          se separan en su propio destino: desde #442 C ya
  //   `baja_deuda`          SON una superficie de dos hojas, y el grupo que las
  //                         contenia mezclaba esa superficie con los beneficios
  //   `declaracion_jurada`  sale de «Determinacion» y pasa a «Documentos». Es
  //                         el papel que **sustenta** la determinacion, no una
  //                         forma de determinar, y se abre por su numero de DJ
  //                         y no por el contribuyente. Mismo movimiento que
  //                         #498 F2 le hizo al reporte del contribuyente
  'rentas-registro': [
    // El sujeto del modulo, y por eso el grupo se llama como el sujeto y no
    // «Padron»: las cuatro caen en el expediente (F2) o en la busqueda con la
    // que se llega a el.
    ['Contribuyentes', ['contribuyentes', 'predios_rentas', 'vehiculos', 'beneficios']],
    // Las seis formas de determinar. El orden separa lo que se emite del padron
    // —las dos del predial y los dos tributos que van con la emision anual— de
    // lo que se liquida por un hecho suelto: una transferencia o un evento.
    [
      'Determinaciones',
      [
        'predial_individual',
        'predial_masivo',
        'arbitrios',
        'vehicular_calculo',
        'alcabala',
        'espectaculos',
      ],
    ],
    // Las dos modalidades del mismo acto, que F5 dibuja como una superficie de
    // tres pasos.
    ['Transferencias', ['transferencia_predio', 'transferencia_vehiculo']],
    // Ya son una superficie de dos hojas desde #442 C: el grupo se limita a
    // decirlo en el menu.
    ['Movimientos de deuda', ['alta_deuda', 'baja_deuda']],
    // Un grupo de uno agrupa poco, y aqui hace lo mismo que en Catastro: separa
    // lo que se abre con OTRO identificador. La DJ se abre por su numero, no
    // por el codigo del contribuyente.
    ['Documentos', ['declaracion_jurada']],
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
     * Con #498 F2 el reporte se fue a «Documentos», asi que la razon de #391
     * —que `ficha_contribuyente_reporte` se abre por el codigo del
     * CONTRIBUYENTE y ninguna superficie de Catastro lo tiene— **ya no aplica
     * a este grupo**. Y aun asi no se pliega, por una razon distinta que hubo
     * que MEDIR, porque el docblock de `FichaDelPredio` sugiere lo contrario
     * («si el identificador es un codigo de referencia catastral, las cuatro
     * modalidades se ofrecen con ese mismo codigo»):
     *
     * **`ficha_rural` no la alcanza ninguna superficie, y no puede.** El
     * conmutador la dibuja siempre APAGADA cuando se llega por un codigo de
     * referencia catastral, y es deliberado: `Conmutador` calcula
     * `derivaDe = (una) => catastral && una !== 'rural'`, porque del codigo de
     * referencia salen `codRefCatastral` y `codEdificacion` pero **no**
     * `codUnidad`, que es lo que la rural pide y que ni siquiera es un codigo
     * catastral —`11024-0418`, con guion—. Ofrecerla seria un enlace a un 404,
     * que es lo que #391 arreglo. Se comprobo montando la ficha urbana con el
     * predio de muestra y listando lo que enlaza: urbana, economica, bienes y
     * la actualizacion. Cuatro de seis.
     *
     * Asi que plegar aqui esconderia detras de una entrada una opcion a la que
     * esa entrada no lleva, y una opcion sin retorno es peor que un menu largo.
     * Lo que lo desbloquea tampoco es interfaz: que el padron publique el
     * `codUnidad` del predio, o que la rural se abra por el codigo de
     * referencia como las otras tres. Hasta entonces, las seis siguen en el
     * menu.
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
      ],
    ],
    // El reporte sale del grupo del predio y pasa a «Documentos», que es lo que
    // el rediseño pide (#498 F2) y lo que es: no es una pantalla del predio, es
    // un papel del contribuyente, y se abre por el codigo de EL, no por el del
    // predio. Un grupo de uno agrupa poco, pero aqui separa dos cosas que se
    // abren con identificadores distintos, que es la confusion que lo tenia
    // debajo de las fichas.
    ['Documentos', ['ficha_contribuyente_reporte']],
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
  /* **Los cinco destinos del embudo** (#506 F5). Fiscalizacion no es una lista de
     pantallas: es una secuencia —se detecta, se programa, se inspecciona, se
     determina— y el menu la dice en ese orden.
     Lo que cambia respecto de los cuatro grupos anteriores no es cosmetico:
     «Campaña» juntaba la programacion con los omisos, que son **dos momentos
     distintos** —los omisos son el universo del que sale la muestra, y el
     programa es la muestra ya sorteada—, y «Fiscalizacion» juntaba el acta
     predial con el cruce vehicular, que son una inspeccion de campo y una
     deteccion de gabinete. */
  fiscalizacion: [
    /* Lo que el cruce encuentra, antes de que sea deuda de nadie: el predial
       contra el padron de rentas y el vehicular contra los registros. La frase
       del prototipo lo dice mejor que ninguna glosa: «la diferencia no es deuda
       todavia: lo es cuando una inspeccion la confirma». */
    ['Detección', ['fisc_omisos', 'fisc_vehicular']],
    // Grupos de una, y las dos a proposito: programar y levantar el acta son los
    // dos momentos que el embudo separa, y juntarlos era lo que hacia «Campaña».
    ['Programas', ['fisc_programa']],
    ['Actas de inspección', ['fisc_predial']],
    /* **Plegado desde #506 F1**, y sólo se puede desde entonces: las tres son una
       superficie de tres hojas (`fiscalizacion/composicion.ts`), y su tira lleva
       de cualquiera a las otras dos. Sin carril, por lo mismo que el territorio:
       la superficie ya es la forma de navegar entre ellas, y un carril al lado
       seria una segunda. */
    [
      'Resultados',
      ['fisc_resultados', 'fisc_estado_cuenta', 'fisc_historico'],
      { plegado: true },
    ],
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

/**
 * La accion primaria de un modulo: el acto con el que se empieza a trabajar en
 * el, que el panel lateral ensena como boton destacado encima de los destinos
 * (#498 F2).
 *
 * **Es un dato del catalogo y no una lista cableada en la barra**, por lo mismo
 * que `bloquesPlegados`: la barra lateral vive en el arranque y la composicion
 * de cada modulo llega en su propio trozo (#433). Que la barra leyera el
 * `flujo` de `catastro/composicion.ts` para saber que boton dibujar traeria ese
 * trozo al arranque de los doce modulos.
 *
 * `opcion` es la que abre —con su id y **su permiso**, que la barra comprueba
 * con `puedeRegistrar` antes de dibujarlo—, y `label` el rotulo. No se inventa:
 * dice lo que el acto hace, no como se llama la pantalla que lo aloja.
 *
 * Solo Catastro declara la suya: es el modulo del rediseño, y las de los otros
 * once se declaran cuando a cada uno le toque. Un modulo sin ella no dibuja
 * boton, que es lo que hacen hoy los doce.
 */
export const ACCION_PRIMARIA = {
  // «Registrar predio» y no «Nueva ficha urbana»: quien atiende no viene a
  // crear una ficha, viene a meter un predio en el padron. El alta guiada de
  // cuatro pasos (#320) cuelga de `ficha_urbana` porque es la unica opcion que
  // se abre por el codigo de referencia catastral, que es lo que el paso 2
  // compone y comprueba.
  catastro: { opcion: 'ficha_urbana', label: 'Registrar predio' },
  /* **Fiscalizacion no declara ninguna, y se midio antes de decidirlo** (#506 F5).
     El prototipo pone «Levantar acta» encima de sus destinos, y era lo que iba a
     entrar aqui. Lo que lo impide es donde lleva: esta tabla compone el destino
     como `${ruta}?nuevo=1`, asi que el boton abriria el acta **sin fila de la
     muestra detras** — y esa acta dice de si misma, con todas las letras, que
     hay que entrar desde el programa para que traiga su predio y su
     contribuyente. Un acto del shell que lleva a una pantalla que contesta «aqui
     no, ve a otro sitio» no es un comienzo: es un rodeo con boton.
     Y no hay otro candidato: el unico acto propio del modulo que podria abrirse
     en blanco es registrar un programa, y `fisc_programa` no puede escribir
     —le faltan el codigo y la descripcion, que su catalogo no dibuja (#431)—.
     El camino de verdad al acta es el enlace de la fila de la muestra (#506 F3),
     que llega con los dos identificadores puestos. Un modulo sin accion primaria
     no dibuja boton, que es lo que hacen hoy los otros diez. */
};

/** La accion primaria de un modulo, o `null` si no declara ninguna. */
export function accionPrimariaDe(moduloId, tabla = ACCION_PRIMARIA) {
  return tabla[moduloId] ?? null;
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
