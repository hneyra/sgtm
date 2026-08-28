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
  fisc_historico: {
    titulo: 'Versiones del proceso, no del padrón',
    detalle:
      'Cada línea es una versión de lo que el proceso fiscalizador halló. El histórico de la ficha catastral es otro, y solo recoge lo que llegó a transferirse.',
  },
};

/** Las opciones que llevan aviso permanente. La prueba de fiscalizacion las mira. */
export const OPCIONES_CON_AVISO = Object.keys(AVISOS);

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
};

/** Las opciones cuya escritura lleva nota. La comprobacion de coherencia las mira. */
export const OPCIONES_CON_NOTA = Object.keys(NOTAS);
