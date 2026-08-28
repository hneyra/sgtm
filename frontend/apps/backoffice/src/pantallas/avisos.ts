/**
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

const AVISOS: Readonly<Record<string, AvisoDePantalla>> = {
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
  fisc_historico: {
    titulo: 'Versiones del proceso, no del padrón',
    detalle:
      'Cada línea es una versión de lo que el proceso fiscalizador halló. El histórico de la ficha catastral es otro, y solo recoge lo que llegó a transferirse.',
  },
};

/** El aviso permanente de una opcion, si lo tiene. */
export const avisoDe = (opcion: string): AvisoDePantalla | undefined => AVISOS[opcion];

/** Las opciones que llevan aviso permanente. La prueba de fiscalizacion las mira. */
export const OPCIONES_CON_AVISO = Object.keys(AVISOS);
