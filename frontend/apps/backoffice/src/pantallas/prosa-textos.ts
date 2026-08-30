/**
 * **La prosa fija de las pantallas: el aviso permanente y la nota de la
 * escritura.**
 *
 * Vive en su propio modulo, y no junto a lo que la usa, por una razon medida:
 * son cinco kilobytes de castellano que 127 de las 134 pantallas no necesitan, y
 * estaban en el trozo de arranque —el que baja quien entra a mirar un recibo—.
 * Aqui los pide `prosa.ts`, **en el mismo gesto con que la pantalla ya pide el
 * catalogo de su modulo**, asi que no llega ni un milisegundo mas tarde que
 * antes: la pantalla no se dibuja hasta que ese trozo esta.
 *
 * ── El aviso permanente ─────────────────────────────────────────────────
 *
 * Lo que una pantalla tiene que decir **siempre**, antes de que alguien teclee.
 *
 * No es un mensaje de error ni una ayuda: es una advertencia permanente sobre
 * **que es lo que se esta mirando**. Hoy la necesita un modulo entero.
 *
 * **Fiscalizacion trabaja sobre copias** (ARQ-01 §3.5, #52): lo que se levanta
 * en campo, lo que se liquida y lo que se ve como resultado son datos propios
 * del proceso, y **el padron no cambia hasta que alguien transfiere**. Si la
 * pantalla no lo dice, el fiscalizador cree que ya cambio algo que no ha
 * cambiado: cierra el acta, se va, y el contribuyente sigue con su declaracion
 * antigua y su recibo antiguo hasta que alguien se da cuenta meses despues.
 *
 * Se declara por opcion y no se deduce del modulo a proposito: la lista de
 * omisos tambien es de fiscalizacion y **no** es una copia de nada —es una
 * consulta contra el padron de verdad—, asi que decirle lo mismo seria mentir
 * en la direccion contraria.
 */
export interface AvisoDePantalla {
  readonly titulo: string;
  readonly detalle: string;
}

export const AVISOS: Readonly<Record<string, AvisoDePantalla>> = {
  fisc_predial: {
    titulo: 'Esto es una copia de trabajo: el padrón no ha cambiado',
    detalle:
      'Lo que se levanta aquí es el dato verificado en campo, al lado del declarado. Cerrar el acta no modifica la ficha catastral ni la declaración: el padrón solo cambia cuando el resultado se transfiere a rentas, y esa transferencia es otro acto con su sustento.',
  },
  fisc_vehicular: {
    titulo: 'Esto es una copia de trabajo: el padrón no ha cambiado',
    detalle:
      'El cruce con la información registral produce hallazgos del proceso, no altas en el padrón vehicular. Nada de lo que se registre aquí llega a rentas hasta que el resultado se transfiere.',
  },
  fisc_resultados: {
    titulo: 'Resultados propuestos: el padrón todavía no los recoge',
    detalle:
      'Estas diferencias son las que el proceso determinó. Mientras no se transfieran, la deuda del contribuyente y su declaración siguen siendo las que había antes.',
  },
  /**
   * Los conteos del catalogo territorial no cuadran con el padron, y **esta
   * bien** (#309, #321).
   *
   * `SectorConConteos` lo dice sin rodeos: un predio con el sector sin asignar
   * no cuenta en ninguno —no se reparte y no se imputa al sector de su manzana—,
   * asi que sumar los predios de todos los sectores puede dar menos que el
   * padron. Sin esta linea, quien cuadra cifras lee la diferencia como un error
   * de la tabla; con ella la lee como lo que es: predios sin ubicacion
   * territorial asignada, que es justo lo que catastro tiene que revisar.
   *
   * Y los lotes cuentan pares (manzana, lote) distintos: tres departamentos de
   * un mismo lote son tres predios y **un** lote.
   */
  sectores: {
    titulo: 'Los conteos son del catastro, no del padrón',
    detalle:
      'Un predio sin sector asignado no cuenta en ninguno de estos sectores: no se reparte ni se imputa al sector de su manzana, así que la suma de «Predios inscritos» puede ser menor que el padrón. Es información —hay predios sin ubicación territorial—, no un descuadre. «Lotes» cuenta lotes distintos: tres departamentos de un mismo lote son tres predios y un lote.',
  },
  /**
   * El padron del contribuyente y la ficha de vehiculo, llenos de «—» (#330).
   *
   * De los 56 campos que el manual reparte en nueve pestanas, `ContribuyenteResource`
   * publica seis; de los 54 de la ficha de vehiculo, `VehiculoResource` ocho. Con las
   * secciones apiladas eso se ve de golpe, y sin esta linea la lectura natural es que **el
   * contribuyente no tiene esos datos** —que su domicilio esta en blanco, que no debe nada—.
   * Con ella, la lectura correcta: el dato no ha llegado, y se sabe de quien depende.
   *
   * Es el mismo criterio del aviso de los conteos de sectores: explicar una cifra que no
   * cuadra vale mas que esconderla.
   */
  contribuyentes: {
    titulo: 'Lo que el padrón publica hoy, y lo que no',
    detalle:
      'El backend publica seis de los campos que el manual reparte en nueve pestañas: código, nombre o razón social, tipo y número de documento y estado. El domicilio fiscal vigente, los predios, los vehículos y la deuda vienen de otros registros que todavía no se publican, y salen con «—»: un guion es que el dato no llegó, no que valga cero ni que esté en blanco.',
  },
  vehiculos: {
    titulo: 'Registro del vehículo, sin su determinación',
    detalle:
      'El recurso publica el registro: placa, año, marca, modelo, categoría, motor y serie. El titular llega como identificador interno —sin nombre—, y la base imponible, el impuesto y el estado de afectación dependen de la tabla referencial del MEF, que es un valor normativo todavía sin cerrar. Todo eso sale con «—».',
  },
  /**
   * **La base del predial es por contribuyente, no por predio** (#333).
   *
   * Es el no-negociable de CLAUDE.md y de NEG-05 §1, y el esquema lo hace
   * imposible de otra forma —`determinacion_predial_sin_predio_ck` de `V20`—. La
   * pantalla lo enseña sin decirlo: la tabla de arriba lista predios, cada uno
   * con su valuo, y la seccion de abajo aplica tramos. Quien lee eso de arriba
   * abajo concluye lo que parece —un impuesto por predio, sumado despues—, que
   * es el error sistematico a la baja que NEG-05 nombra.
   *
   * Y dice **de donde salen las cifras que no estan**: las pone el servidor, con
   * el conjunto de parametros sellado del ejercicio, y esta pantalla no calcula
   * nada (D-02a). Los huecos salen con «—», que no es cero.
   */
  predial_individual: {
    titulo: 'La base es del contribuyente, no de cada predio',
    detalle:
      'Los tramos y las alícuotas se aplican al conjunto de los predios del contribuyente, ponderado cada uno por su porcentaje de propiedad: no se calcula predio por predio ni se suman después los impuestos. Esta pantalla no calcula nada —el valor de la UIT, los tramos, las alícuotas y las cuotas los determina el servidor con el conjunto de parámetros sellado del ejercicio—, así que lo que todavía no llega sale con «—», que no es cero.',
  },
  /**
   * **La conciliacion con rentas: la consecuencia, y el acto** (#322, ADR-0015).
   *
   * Es la columna mas cara del modulo y la mas invisible: un predio que rentas
   * no reconoce **no genera deuda predial**, y eso no se lee en ningun sitio de
   * la pantalla —«Conciliada» sale con «—» y la primaria promete una accion
   * masiva que no existe—.
   *
   * Lo que el aviso dice, y lo dice porque el ADR lo decidio:
   *
   *   no hay dos codigos  «Cod. Predial Rentas» **es** el codigo de referencia
   *                       catastral. `sgtm-rentas` los trata como sinonimos por
   *                       escrito, y por eso las dos primeras columnas coinciden
   *                       —que coincidan es el dato, no un fallo de la tabla—
   *   por que «—»         «conciliada» no es un estado guardado: es un derivado
   *                       —existe una declaracion jurada **del ejercicio** sobre
   *                       el predio (`declaracion_jurada.predio_id`), en estado
   *                       PRESENTADA u OBSERVADA— y **hoy ninguna lectura lo
   *                       publica**. Un «No» inventado acusaria de omiso a un
   *                       predio que quiza no lo es
   *   por donde se sale   conciliar es **registrar la declaracion jurada**. No
   *                       es escribir un codigo en la ficha: el codigo ya lo
   *                       tiene
   *
   * **Y donde se registra, dicho con el estado real** (revision de #322). Este
   * aviso decia que ese acto «tiene su propia opcion», y mandaba a buscar entre
   * 134 pantallas una puerta que no existe: la opcion `declaracion_jurada` es
   * hoy **solo `GET`** —el contrato declara `GET /rentas/declaraciones/{djNro}`
   * y `DeclaracionJuradaController` publica ese unico metodo—, asi que consulta
   * la declaracion ya presentada y no la registra. El caso de uso que si la
   * registra existe en el backend y ningun controlador lo expone. Mientras siga
   * asi, el acto se hace **por el procedimiento actual**, que es exactamente lo
   * que dice la franja de «Conciliar seleccionadas» (causa `sin-backend`): las
   * dos frases de la misma pantalla tienen que decir lo mismo.
   *
   * El sujeto es **rentas**, aqui y en la cabecera de la ficha
   * (`ResumenDeFicha`): «el padron» en una y «rentas» en la otra se leen como
   * dos cosas distintas, y quien atiende no tiene por que saber que no lo son.
   *
   * La referencia al ADR se queda **en este comentario**, que es donde tiene
   * lector: en ventanilla, «ADR-0015» no es informacion, es ruido con forma de
   * numero de expediente.
   */
  consulta_fichas: {
    titulo: 'Un predio sin declaración jurada no genera deuda predial',
    detalle:
      'Conciliar un predio es registrar su declaración jurada: ese es el acto que lo incorpora al padrón afecto. Hoy ese registro se hace por el procedimiento actual, fuera del sistema —la opción «Declaración jurada» solo consulta las ya presentadas—. No hay dos códigos: el «Cod. Predial Rentas» es el mismo código de referencia catastral, y por eso las dos primeras columnas coinciden. La columna «Conciliada» dirá si rentas reconoce el predio cuando el sistema publique esa lectura; mientras tanto sale con «—», que no es un «no».',
  },
  fisc_historico: {
    titulo: 'Versiones del proceso, no del padrón',
    detalle:
      'Cada línea es una versión de lo que el proceso fiscalizador halló. El histórico de la ficha catastral es otro, y solo recoge lo que llegó a transferirse.',
  },
  /**
   * **La rejilla «Impuesto anual» sale vacia, y hay que decir por que** (#25, #72).
   *
   * Sus trece columnas son valuo afecto, valuo exonerado, valuo total, impuesto
   * predial y los cuatro arbitrios, por ejercicio, y `ConsultaUnificadaResource`
   * **no publica ninguna**. Sin esta linea, la tabla vacia dice «Todavía no hay
   * impuesto anual» —el texto comun de una tabla sin filas—, que es exactamente
   * la lectura equivocada: no es que este contribuyente no deba nada, es que esa
   * cifra no existe todavia en ningun sitio.
   *
   * Y dice **de donde vendria**: por contribuyente y no por predio (NEG-05 §1),
   * con tablas de valuo y ordenanzas de arbitrios que siguen sin firmar. Lo que
   * si es de verdad es el resumen de saldos de arriba, que lo suma el servidor.
   */
  consulta_unificada: {
    titulo: 'El resumen de saldos es real; la rejilla «Impuesto anual», todavía no',
    detalle:
      'Las cinco cifras del resumen las calcula el servidor a la fecha de corte que se indica. La rejilla de abajo sale vacía porque el sistema no publica ninguna de sus columnas: el valúo depende de las tablas de valores unitarios y depreciación, que aún no están firmadas, y los arbitrios por servicio de ordenanzas sin ratificar. Rellenarla repartiendo cifras entre ejercicios daría números que nadie podría sustentar en una reclamación.',
  },
  /**
   * **Las dos pestañas de cifras del resumen predial, llenas de «—»** (#25, #72).
   *
   * Mismo criterio que el aviso de `contribuyentes` y el de `vehiculos`:
   * explicar un hueco vale mas que esconderlo. Aqui el hueco tiene dos causas
   * distintas y conviene separarlas, porque solo una se cierra firmando valores:
   * el impuesto predial por predio **no existe** —la base es del contribuyente
   * (NEG-05 §1)— y el valuo y los arbitrios existen pero dependen de tablas y
   * ordenanzas sin cerrar (D-02a, D-02b).
   *
   * Y dice donde si esta lo que la tercera pestaña promete: el historico
   * versionado de la ficha, que ya se publica en la consulta de fichas.
   */
  /**
   * **Simular no es acoger, y las campanas son dato** (#72, D-02b, D-02c).
   *
   * Dos cosas que la pantalla no puede decir por si sola y que hay que decir:
   *
   *   que esto no cobra   lo que se ve es una hipotesis. Acogerse de verdad
   *                       mueve deuda del libro con su motivo, y eso lo hara
   *                       quien tenga la ordenanza firmada
   *   de donde salen      las campanas y su descuento los publica el conjunto
   *   las campanas        de parametros sellado de **esta** municipalidad. El
   *                       desplegable dibuja las cuatro del manual de Sullana;
   *                       elegir una que aqui no este cargada devuelve un error
   *                       que dice **cual** falta, y eso es lo correcto: un
   *                       porcentaje inventado no cobra de mas, perdona de mas
   */
  consulta_deudas_beneficio: {
    titulo: 'Esto simula el acogimiento: no rebaja ninguna deuda',
    detalle:
      'Las cifras de abajo dicen qué quedaría por pagar si esta deuda se acogiera hoy; la deuda registrada no cambia. Qué campañas existen y cuánto descuenta cada una lo determina la ordenanza cargada en el sistema, no esta pantalla: mientras no haya ninguna publicada, «Deuda con beneficio», «Tasa aplicada» y «Beneficio» salen con «—», que no es cero, y elegir una campaña del desplegable avisa de cuál falta por cargar.',
  },
  consulta_resumen_predial: {
    titulo: 'Lo que este resumen publica hoy, y lo que no',
    detalle:
      'La tabla lista los predios con su ficha vigente: código catastral, propietario y dirección. Las pestañas de cifras salen con «—» por dos motivos distintos. El impuesto predial no se puede dar por predio: los tramos se aplican al conjunto de los predios del contribuyente, así que una cifra por predio sería un reparto inventado. El valúo y los arbitrios sí son del predio, pero dependen de tablas de valores unitarios y de ordenanzas que todavía no están cerradas. Los movimientos del predio se consultan en el histórico de su ficha catastral.',
  },

  /* ── Las hojas sin superficie (FRO-06, #427) ─────────────────────────────
     Siete opciones de tres modulos que el manual capturo como **el papel que
     sale** y cuyo endpoint **dicta el acto** que ese papel documenta: un bloque
     `reporte` con dos columnas, sin una sola seccion y sin una sola accion.

     Y ahi esta el motivo de que el aviso sea el mecanismo y no la franja:
     `Pantalla.tsx` dibuja la barra solo `{estructura.acciones && …}`, asi que
     estas pantallas **no tienen franja**. La causa que `impedimentoDelActo`
     calcula para ellas entra en el censo y no la lee nadie —RNF-082 un escalon
     mas arriba de donde lo cerro #385, donde al menos habia un boton apagado—.

     El aviso dice las tres cosas que la franja diria: que es la hoja, que dato
     exige el acto y ninguna pantalla del manual dibuja, y por donde se sale.
     No dice «pulsa aqui»: hoy no hay ningun sitio del sistema desde el que se
     pueda dictar, y FRO-06 §2 explica por que ninguna de las pantallas que
     conocen el sujeto sirve sin inventarle un campo. */
  licencia_resolucion_cancelacion: {
    titulo: 'Esto es la hoja de la resolución, no el formulario que la dicta',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la resolución de cancelación. Cancelar una licencia exige el motivo por el que queda sin efecto, y ninguna pantalla del manual dibuja un campo para escribirlo: el «Observaciones» de «Licencia de funcionamiento» es la trazabilidad del trámite, no este motivo. Mientras tanto, cancela la licencia por el procedimiento actual y avísale a sistemas: esta pantalla todavía no dicta nada.',
  },
  licencia_resolucion_duplicado: {
    titulo: 'Esto es la hoja de la resolución, no el formulario que la dicta',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la resolución que autoriza el duplicado. Autorizarlo exige el motivo —extravío, deterioro, robo— y el número del recibo del derecho de trámite del duplicado, y ninguna pantalla del manual dibuja un campo para ninguno de los dos: el «Nº de recibo» de «Licencia de funcionamiento» es el del derecho de la licencia, no el de este duplicado. Mientras tanto, autoriza el duplicado por el procedimiento actual y avísale a sistemas: esta pantalla todavía no dicta nada.',
  },

  /* Las dos de infracciones administrativas (#428), con la misma forma y una
     diferencia: aqui **si se sabe donde esta dibujado el formulario**, y se
     dice. No para mandar a nadie alli —cuelga de otro acto, ver FRO-06 §2—,
     sino para que quien lo busque deje de buscarlo. */
  adm_resolucion_gerencia: {
    titulo: 'Esto es la hoja de la resolución, no el formulario que la dicta',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la resolución que resuelve el procedimiento sancionador. Dictarla exige la papeleta que resuelve, la fecha y el sustento, y esta pantalla no dibuja ningún campo: el formulario que sí los tiene está en «Descargos y reclamos», pero allí resuelve un recurso presentado, y una resolución también se dicta sin ninguno. Mientras tanto, dicta la resolución por el procedimiento actual y avísale a sistemas: esta pantalla todavía no dicta nada.',
  },
  /* Y las tres de transito (#429), con las que FRO-06 queda aplicada a las
     **siete**. Las tres estaban clasificadas desde #77 —la casilla era la
     correcta— y las tres eran mudas: sin `acciones` no hay `<BarraDeAcciones>`,
     asi que su causa se calculaba, entraba en el censo y no la leia nadie.

     Las dos resoluciones dicen ademas donde SI esta dibujado su formulario, por
     lo mismo que las administrativas: en «Descargos y reclamos», colgando de un
     recurso presentado. La constancia no lo dice, porque no lo hay — y ahi lo
     que se nombra es el filtro que se le parece y **no** sirve, que es el error
     que alguien haria si no se dijera. */
  transito_rg_ordinaria: {
    titulo: 'Esto es la hoja de la resolución, no el formulario que la dicta',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la resolución que ordena la cobranza de la papeleta. Dictarla exige la papeleta que resuelve, la fecha y el sustento, y esta pantalla no dibuja ningún campo: el formulario que sí los tiene está en «Descargos y reclamos», pero allí resuelve un recurso presentado, y la ordinaria se dicta también sin ninguno. Mientras tanto, dicta la resolución por el procedimiento actual y avísale a sistemas: esta pantalla todavía no dicta nada.',
  },
  transito_rg_sancionadora: {
    titulo: 'Esto es la hoja de la resolución, no el formulario que la dicta',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la segunda resolución, la que se dicta cuando la ordinaria ya surtió efecto y venció su plazo. Dictarla exige la papeleta que resuelve, la fecha y el sustento, y esta pantalla no dibuja ningún campo, por el mismo motivo que la ordinaria. Mientras tanto, dicta la resolución por el procedimiento actual y avísale a sistemas: esta pantalla todavía no dicta nada.',
  },
  transito_constancia_libre: {
    titulo: 'Esto es la constancia, no el formulario que la emite',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la constancia de no tener papeletas pendientes. Emitirla exige la placa del vehículo que se acredita, y esta pantalla no dibuja ningún campo donde escribirla: la placa que se teclea en «Búsqueda de papeletas» sirve para buscar lo que hay, no para decir qué vehículo se acredita. Mientras tanto, emite la constancia por el procedimiento actual y avísale a sistemas: esta pantalla todavía no emite nada.',
  },
  adm_notificacion_resolucion: {
    titulo: 'Esto es la cédula, no el formulario que registra la diligencia',
    detalle:
      'Lo que se ve abajo es cómo saldría impresa la cédula con que se notifica la resolución de gerencia. Registrar la diligencia exige la resolución que se notifica, su fecha, la modalidad, el resultado y quién notificó, y esta pantalla no dibuja ningún campo: los de la diligencia están en «Notificación», pero allí cuelgan del acta preventiva, que es otro acto. Mientras tanto, notifica por el procedimiento actual y avísale a sistemas: esta pantalla todavía no registra nada.',
  },
};

/** Las opciones que llevan aviso permanente. La prueba de fiscalizacion las mira. */
export const OPCIONES_CON_AVISO = Object.keys(AVISOS);

/**
 * ── El pie de la tabla ──────────────────────────────────────────────────
 *
 * **Lo que el prototipo escribio bajo una tabla, cuando el sistema ya no puede
 * sostenerlo.**
 *
 * El pie sale del catalogo portado (`EstructuraDeTabla.note`) y el catalogo **no
 * se edita a mano**: es un `.generado.ts` que `yarn portar-catalogo` reescribe.
 * Asi que la correccion no puede vivir alli. Vive aqui, que es donde ya vive la
 * prosa de las pantallas, y `TablaDePantalla` la consulta antes de pintar el pie
 * del catalogo — misma forma que `AVISOS`, y **negacion por omision**: una opcion
 * que no este en este mapa pinta su pie tal cual, como lo pintaba.
 *
 * Dos valores posibles, y la diferencia importa:
 *
 *   `null`    el pie **se suprime**. Lo que decia ya lo dice mejor otra cosa de
 *             la misma pantalla, y repetirlo peor es lo unico que aporta
 *   cadena    el pie **se reescribe**. Sigue habiendo algo que decir bajo la
 *             tabla, pero no eso
 *
 * **`consulta_fichas`: suprimido** (#322, ADR-0015). Su pie del prototipo dice
 * «Las fichas no conciliadas no generan deuda predial hasta que se les asigne
 * código predial de rentas», y la segunda mitad **contradice al aviso permanente
 * que esta en el mismo viewport**: no hay ningun codigo predial de rentas que
 * asignar —es el mismo codigo de referencia catastral que el predio ya tiene—, y
 * lo que falta no es un codigo sino la declaracion jurada. Dos frases opuestas a
 * un palmo una de otra no dejan al lector con media verdad: le dejan sin saber
 * cual de las dos creer. La primera mitad —que sin conciliar no hay deuda
 * predial— es justo lo que el aviso ya dice, y con el acto correcto detras.
 */
export const PIES: Readonly<Record<string, string | null>> = {
  consulta_fichas: null,

  /**
   * **`consulta_deudas_beneficio`: suprimido** (#72).
   *
   * Su pie del prototipo es «Deuda total 1,848.66 · acogida 797.77 · con
   * beneficio 250.15»: **tres cifras congeladas de la captura del manual**, que
   * se pintan bajo la tabla sea quien sea el contribuyente que se consulte. Las
   * tres las publica ya el servidor —con su fecha de corte— en «Resultado del
   * acogimiento», y ahi cambian con la persona; abajo no cambiaban nunca.
   *
   * Un pie asi es peor que un hueco: no es una cifra que falte, es una cifra que
   * **afirma**, y quien la lee no tiene forma de saber que no es la suya.
   */
  consulta_deudas_beneficio: null,

  /**
   * **`fisc_estado_cuenta`: suprimido** (#80).
   *
   * Su pie del prototipo es «Tributo 500.00 · Reajuste 12.50 · Interés 58.35
   * · Gastos 10.80»: el mismo tipo de cifra congelada que #72 encontro en
   * `consulta_deudas_beneficio` — cuatro numeros de la captura del manual que
   * se pintarian bajo la tabla sea quien sea el contribuyente consultado.
   * `EstadoDeCuentaDeFiscalizacion.LineaDelEstadoDeCuenta` no desglosa la
   * deuda en esas cuatro partes, y mientras nadie transfiera (#52) ninguna
   * linea tiene ni siquiera el total.
   */
  fisc_estado_cuenta: null,
};

/** Las opciones cuyo pie de tabla corrige la prosa. La comprobacion de coherencia las mira. */
export const OPCIONES_CON_PIE_PROPIO = Object.keys(PIES);

/**
 * ── El motivo de un filtro bloqueado ────────────────────────────────────
 *
 * Por que un filtro que la pantalla dibuja **no se puede usar**, bajo el propio
 * control (`Campo.ayuda`, enlazada por `aria-describedby`).
 *
 * Se declara en `composicion.ts` —`filtrosBloqueados`, la lista de claves— y se
 * redacta aqui, que es el mismo reparto de la nota de la escritura: la
 * declaracion la necesita el renderizador y viaja en el arranque; su castellano
 * no. `prosa.test.ts` exige que las dos listas digan lo mismo, porque los dos
 * huecos que abre separarlas son mudos —un filtro bloqueado sin motivo se lee
 * como una pantalla rota; un motivo sin filtro no lo ve nadie—.
 *
 * Se llavea por opcion y campo, y no por campo solo: la misma clave de filtro
 * aparece en varias pantallas del catalogo, y lo que la bloquea en una no tiene
 * por que bloquearla en otra.
 *
 * **`consulta_fichas.conciliadaConRentas`** (#322, ADR-0015 §2): el contrato lo
 * declara y `ConsultaController` lo rechaza con 422 **con cualquier valor**,
 * «Todas» incluida en cuanto se elige y viaja. El motivo dice la causa —nadie
 * publica esa lectura todavia— y la enlaza con lo que se ve en la tabla, que es
 * la columna llena de «—»: las dos cosas tienen el mismo origen.
 */
export const MOTIVOS_DE_FILTRO: Readonly<Record<string, string>> = {
  'consulta_fichas.conciliadaConRentas':
    'El sistema todavía no publica si rentas reconoce un predio, así que no se puede filtrar por ello: por eso la columna «Conciliada» sale con «—» en todas las filas.',

  /**
   * **`consulta_resumen_predial.palabra`** (#25, #72): mismo hueco que el de
   * arriba y misma cura. `ResumenPredialController` lo rechaza con 422 con
   * cualquier valor, y su motivo es de diseño, no una falta que se vaya a
   * corregir: no hay columna a la que apuntar, y responderlo obligaria a
   * recorrer el padron entero con `LIKE '%…%'`. El motivo dice ademas por donde
   * se sale, que es lo unico que quien busca necesita saber.
   */
  'consulta_resumen_predial.palabra':
    'La búsqueda por palabra suelta no se puede resolver: no hay un campo al que apunte, y responderla obligaría a recorrer todo el padrón. Busca por «Cod. Catastral», «Cod. Contribuyente» o «Uso».',

  /**
   * **Los dos resumenes de Transito** (#398). Los cinco son del mismo tipo y
   * ninguno es una falta que se vaya a corregir sola:
   *
   * - los dos «Agrupado por»: la tabla del catalogo **no tiene columna para la
   *   clave del grupo** —la primera dice «Año» en uno y «Mes» en el otro—, asi
   *   que agrupar por otra cosa dejaria filas que no se distinguen entre si
   * - «Cobranza» y «Tipo de cobranza»: la respuesta ya trae las fases en
   *   columnas separadas, para cada linea; filtrar obligaria a pedir el resumen
   *   dos veces para ver lo que ya viene junto
   * - «Caja»: `ResumenesDeTransitoController` la rechaza con 422 porque el
   *   libro no sabe en que ventanilla se cobro. Ese corte lo sirve tesoreria
   */
  'transito_resumen_papeletas.agrupadoPor':
    'Este resumen se agrupa por año, que es lo que dice su primera columna: la tabla no tiene ninguna otra columna donde poner la clave del grupo, así que agrupar por estado o por código dejaría filas que no se distinguen. Para verlo por código de infracción o por iniciales de placa hay una pantalla propia de cada uno.',

  'transito_resumen_papeletas.cobranza':
    'No hace falta filtrar por cobranza: cada fila ya trae las pendientes y las que están en cobranza coactiva en columnas separadas.',

  'transito_resumen_recaudacion.agrupadoPor':
    'Este resumen se agrupa por mes, que es lo que dice su primera columna: la tabla no tiene ninguna otra columna donde poner la clave del grupo.',

  'transito_resumen_recaudacion.tipoDeCobranza':
    'No hace falta filtrar por tipo de cobranza: cada mes ya trae la ordinaria, la coactiva y los convenios en columnas separadas.',

  'transito_resumen_recaudacion.caja':
    'El libro no sabe en qué ventanilla se cobró, así que aquí no se puede filtrar por caja: ese corte lo da «Recaudación por área» de Tesorería.',

  /**
   * **Los cuatro de «Espectáculos públicos no deportivos»** (#432).
   *
   * Aqui el motivo no es que el servidor los rechace: es que **no hay a quien
   * preguntarle**. La unica operacion de esta opcion es el `POST` que registra
   * el evento, `EspectaculoController` no lee ninguno de los cuatro —ni del
   * cuerpo ni de la consulta— y **ninguna lectura del contrato lista los
   * espectaculos declarados**, asi que la tabla que el prototipo dibuja debajo
   * no se llena con nada. Un filtro sobre una tabla que no existe cambia la URL
   * y no cambia nada mas, que es la forma mas silenciosa de este defecto.
   *
   * Se bloquean y no se quitan, como los siete de arriba (RNF-080).
   */
  /**
   * **Los cinco de Fiscalizacion** (#431), en dos pantallas y por dos motivos.
   *
   * Los dos del programa **no llegan**: la lectura que #431 publico acota por
   * numero de programa y por ejercicio, y `parametrosDeBusqueda` descarta lo que
   * el contrato no declara, asi que se tecleaban y se caian en silencio.
   *
   * Los tres de los resultados **llegan y se rechazan**: los tres desplegables
   * hablan un vocabulario que el controlador no conoce, y ninguno tiene siquiera
   * opcion «Todos» en el caso del programa.
   */
  'fisc_programa.tipo':
    'El listado de programas no se acota por tipo: se busca por número de programa o por ejercicio. Además, aquí el sistema sólo distingue programas prediales y vehiculares, y este desplegable ofrece seis clases.',

  'fisc_programa.estado':
    'Tampoco se acota por estado, y por lo mismo: el listado se busca por número de programa o por ejercicio.',

  'fisc_resultados.programa':
    'Este desplegable ofrece códigos de programa —«PF-2026-014»— y la consulta pide el registro del programa, no su código. Acota por las otras columnas mientras tanto.',

  'fisc_resultados.hallazgo':
    'Dos de estas cuatro opciones —«AMPLIACIÓN NO DECLARADA» y «SUBVALUACIÓN»— no son ninguna de las condiciones que el sistema distingue, así que la búsqueda las rechazaría. La condición de cada acta sale en su columna.',

  'fisc_resultados.estado':
    'Ninguno de estos cuatro estados es el que el sistema guarda de una liquidación, así que la búsqueda los rechazaría. El estado de cada fila sale en su columna.',

  'espectaculos.nDeExpediente':
    'Todavía no hay ninguna consulta de espectáculos declarados, así que aquí no se puede buscar por expediente: esta pantalla registra uno nuevo, y la tabla de abajo sale vacía.',

  'espectaculos.organizador':
    'Tampoco se puede buscar por organizador, y por lo mismo: no hay ninguna consulta de espectáculos declarados. Los datos del organizador de este evento se escriben en la declaración.',

  'espectaculos.desde':
    'El rango de fechas no acota nada: no hay ninguna consulta de espectáculos declarados que recorrer.',

  'espectaculos.hasta':
    'El rango de fechas no acota nada, por lo mismo que «Desde».',

  /**
   * **Las dos hojas nacionales del cuadro de valuación** (propuesta B, #17/#71).
   *
   * Mismo hueco que `consulta_fichas.conciliadaConRentas` y que
   * `consulta_resumen_predial.palabra`, con una diferencia que conviene decir en
   * el propio motivo: aquí el servidor **no rechaza**, ignora. Elegir «SIERRA» o
   * «INDUSTRIA» devolvería exactamente el mismo cuadro, así que el síntoma de un
   * filtro vivo no sería un error sino la certeza equivocada de haberlo acotado.
   * El motivo dice además por dónde se sale: el año, que es lo único que decide
   * qué cuadro se lee, está arriba.
   */
  'valores_unitarios.region':
    'La región no se puede filtrar: el cuadro no publica a cuál pertenece cada fila y el servidor solo recibe el ejercicio. Lo que decide qué cuadro se lee es el año de trabajo, que está arriba.',

  'depreciacion.uso':
    'El uso no se puede filtrar: el cuadro no publica el uso de ninguna fila y el servidor solo recibe el ejercicio. Para acotar por material predominante, usa el desplegable que hay sobre la tabla: ese sí elige entre lo que el cuadro trajo.',
};

/** Los filtros bloqueados que tienen texto. La comprobacion de coherencia los mira. */
export const FILTROS_CON_MOTIVO = Object.keys(MOTIVOS_DE_FILTRO);

/**
 * ── La nota de la escritura ─────────────────────────────────────────────
 *
 * Lo que esta pantalla **no** manda, dicho antes de que alguien lo teclee.
 *
 * Sale de la escritura declarada y no del catalogo —es una propiedad de la
 * operacion, no del dibujo—, pero su **texto** vive aqui por lo mismo que el
 * aviso: `escrituras.ts` esta en el trozo de arranque porque el camino de
 * escritura lo necesita entero y sincrono, y su prosa no. La declaracion se
 * queda alli (`EscrituraDeclarada.nota`, un booleano); la redaccion, aqui, y
 * `prosa.test.ts` exige que las dos listas digan lo mismo.
 */
export const NOTAS: Readonly<Record<string, string>> = {
  cambiar_clave:
    'La contraseña no se escribe aquí y el sistema no la recibe: el cambio lo hace el proveedor de identidad. Al aceptar, queda registrado quién lo pidió y por qué, y se continúa allí.',

  alta_deuda:
    'Solo se admiten los tributos con código en el libro: predial, arbitrios, vehicular, alcabala y multa administrativa. La unidad se busca por código catastral o por placa y lo que se guarda es el registro encontrado, no lo tecleado; los arbitrios, la alcabala y el vehicular la exigen, y el predial no la admite —se determina por contribuyente, sobre el conjunto de sus predios—. El rango de cuotas todavía no viaja: el alta registra una sola cuota.',

  baja_deuda:
    'La baja registra una obligación por acto: se elige su cuota en la tabla y se repite para las demás. La causal no tiene campo propio en el backend —va en la observación, que es donde queda auditada— y el total a extinguir lo calcula el servidor: aquí no se suma ninguna columna. Una fila cuya cuota agrupa varias («1 - 4») no se puede dar de baja todavía: el backend registra una cuota o el año completo, y no hay forma de decirle «de la 1 a la 4».',

  predial_masivo:
    'Esta corrida determina el impuesto predial y nada más: los arbitrios son otro tributo, con su propia determinación por periodo, y la cuponera es un documento que todavía no se genera desde aquí. Sus dos casillas se ven, y marcarlas impide ejecutar en vez de fallar después. El alcance se emite a todo el padrón o por sector —«por rango de código» y «solo observados» aún no existen—, y la UIT y el derecho de emisión los pone el servidor desde el conjunto sellado del ejercicio.',

  notificacion_valores:
    'La hora y la dirección de la diligencia no se guardan todavía: el backend solo pide la fecha (sin hora) y, si no se indica una dirección, usa el domicilio fiscal vigente a esa fecha.',

  transferencia_predio:
    'El valor de la transferencia se pide junto al código predial, no en un campo del manual: es la base sobre la que se liquida la alcabala. El «Nº de expediente» y la «Notaría» no viajan —el backend no tiene ningún campo para ellos—, y «Genera alcabala» tampoco: es una casilla, y el acto se registra sin marcarla.',

  transferencia_vehiculo:
    'El valor de la transferencia se pide junto a «Transferente — documento», que no llega a ningún sitio: el sistema resuelve al transferente por quien figura hoy como titular del vehículo. El «Nº de expediente» no viaja —el backend no tiene ningún campo para él—.',
  valores_individual:
    'El valor formaliza una sola obligación: un tributo, un periodo. El número, la fecha de emisión, la base legal y los importes los calcula el servidor al emitir —no se pueden previsualizar antes— y la unidad (predio o placa) no viaja todavía: sin ella, el valor se emite sobre la obligación de ese tributo y ese ejercicio que no cuelga de una unidad concreta.',

  valores_masivo:
    'Esta corrida solo admite selección por código de contribuyente, uno por línea: la importación de una hoja de cálculo todavía no tiene control en el sistema. El sector, el monto mínimo de emisión y las dos exclusiones del catálogo no viajan —el servidor no los admite todavía—, y esta pantalla registra el criterio de la corrida: la generación de los valores corre aparte, y se revisa después en «Búsqueda y mantenimiento de valores».',

  prescripcion:
    'El plazo, el inicio y el nuevo inicio del cómputo, el resultado y el monto a extinguir los calcula el servidor a partir del conjunto sellado y de la deuda del contribuyente: no se escriben aquí. Esta pantalla solo declara una interrupción (art. 45); la suspensión (art. 46) todavía no tiene campo.',
  anulacion_recibo:
    'El «Detalle» de esta pantalla es la misma observación que pide el sistema, así que no viaja aparte: se escribe abajo, donde ya se pide. La anulación siempre devuelve la deuda a la cuenta corriente —no es una casilla que se pueda destildar— y el número de recibo se toma del que abrió esta pantalla, no del campo «Nro. de recibo».',

  cierre_caja:
    'El arqueo se declara por los cinco medios de pago del recibo, y el cheque es uno de ellos aunque el manual no le dibuje casilla: un turno con un cheque saldría descuadrado sin poder decirlo. La caja y el cajero se preguntan arriba —son, con la fecha, lo que identifica el turno— y el «Total declarado», el «Total sistema» y la «Diferencia» los calcula el servidor: aquí no se suma ninguna columna. El turno (mañana / tarde / continuo) no viaja porque no existe como dato: hay un turno por caja, cajero y día. Y esta pantalla solo cierra: reversar un cierre ya firmado es otro acto, con otro privilegio.',

  anulacion_convenio:
    'Las dos acciones escriben y mandan cosas distintas: «Anular» deja el convenio sin efecto y «Quebrar» lo da por incumplido; las dos devuelven la deuda acogida a la fase de la que salió, y ninguna de las dos se deshace. «Reformar» todavía no se puede: exige el convenio nuevo que sustituye al anterior, con su deuda acogida, y esta pantalla no tiene dónde elegirla. El número del convenio se toma del que abrió esta pantalla, no del campo «Num. Conv.», y el responsable y el número de anulación los pone el sistema.',
  adm_notificacion:
    'El número se guarda con su serie —«001-004183», como el manual lo imprime— y el año no entra en él. De esta pantalla viajan cuatro datos y el plazo: el número, la fecha, la dirección del predio y el código de infracción, que es el motivo por el que se notifica. El infractor, el CIIU, la licencia, la hora, el fiscalizador y quién recibió no se guardan todavía: el registro previo se toma sobre la vivienda o el negocio inspeccionado, sin haber resuelto aún quién responde. Y sin plazo la notificación no vence nunca.',

  transito_descargos:
    'Aquí se registra el escrito que el administrado presentó, y nada más: la sección «Evaluación y resolución» no viaja, porque resolver un descargo es dictar una resolución de gerencia, que es otro acto y otro papel. «Dentro del plazo» tampoco se manda —lo calcula el servidor con el plazo vigente, a partir de la fecha de presentación—, y el «Nº de expediente» de arriba es el del descargo que se está consultando: el del escrito nuevo se pide al final de «Solicitud», con su propia etiqueta.',
};

/** Las opciones cuya escritura lleva nota. La comprobacion de coherencia las mira. */
export const OPCIONES_CON_NOTA = Object.keys(NOTAS);
