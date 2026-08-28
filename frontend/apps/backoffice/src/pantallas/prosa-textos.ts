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

  notificacion_valores:
    'La hora y la dirección de la diligencia no se guardan todavía: el backend solo pide la fecha (sin hora) y, si no se indica una dirección, usa el domicilio fiscal vigente a esa fecha.',

  transferencia_predio:
    'El valor de la transferencia se pide junto al código predial, no en un campo del manual: es la base sobre la que se liquida la alcabala. El «Nº de expediente» y la «Notaría» no viajan —el backend no tiene ningún campo para ellos—, y «Genera alcabala» tampoco: es una casilla, y el acto se registra sin marcarla.',

  transferencia_vehiculo:
    'El valor de la transferencia se pide junto a «Transferente — documento», que no llega a ningún sitio: el sistema resuelve al transferente por quien figura hoy como titular del vehículo. El «Nº de expediente» no viaja —el backend no tiene ningún campo para él—.',
};

/** Las opciones cuya escritura lleva nota. La comprobacion de coherencia las mira. */
export const OPCIONES_CON_NOTA = Object.keys(NOTAS);
