package pe.gob.sgtm.verificaciones;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Las reglas de ARQ-04 §2 que viven en el texto del SQL y no en la estructura de las clases: {@code
 * SET SESSION}, el {@code DELETE} sobre tablas protegidas y el {@code UPDATE} sobre las inmutables.
 * Y una que vive en el texto del Java: la politica de redondeo escrita a mano, que D-03a y D-03b
 * prohiben.
 *
 * <p>Y otra que vive en el texto del Java y tampoco es una dependencia entre tipos: un area
 * convertida a cadena a mano (#607), que es como el mismo predio acabo diciendo «360.00 m2» en
 * catastro y «360.00» en fiscalizacion.
 *
 * <p>ArchUnit no las ve porque no son dependencias entre tipos, sino cadenas.
 *
 * <p><b>Solo mira literales de cadena</b>, no comentarios ni javadoc. Sin eso, cada documento del
 * propio codigo que explica por que {@code SET SESSION} esta prohibido seria una violacion, y la
 * regla acabaria desactivada por ruidosa — que es la forma habitual de perder una verificacion.
 *
 * <p>Es una funcion pura sobre texto para poder probarla con muestras, en vez de confiar en que
 * recorre bien el arbol de archivos.
 */
public final class RevisorDeCodigoFuente {

    /**
     * RNF-051: no se borra deuda, pagos, recibos, valores, papeletas, asientos ni auditoria.
     *
     * <p>La lista es la de las tablas cuyo borrado destruiria constancia de un acto administrativo.
     * Al agregar una tabla de esa naturaleza, agregarla aqui.
     */
    public static final Set<String> TABLAS_PROTEGIDAS =
            Set.of(
                    "cuenta_corriente_asiento",
                    "determinacion",
                    "saldo_proyectado",
                    "parametro_tributario",
                    "recibo",
                    "recibo_detalle",
                    "recibo_movimiento",
                    "valor",
                    "valor_detalle",
                    "valor_movimiento",
                    "notificacion",
                    "prescripcion",
                    "papeleta",
                    "convenio",
                    // Con #35: el cronograma congelado, la deuda que el convenio acogio -con la
                    // fase a la que vuelve si se quiebra- y los actos sobre el. Borrar
                    // convenio_deuda seria borrar la unica traza de que se fracciono, y con ella
                    // la fase de origen: el quiebre no sabria a donde devolver la deuda.
                    "convenio_cuota",
                    "convenio_deuda",
                    "convenio_movimiento",
                    // Con #36: el arqueo de un turno de caja y su desglose por medio de pago.
                    // Borrar un cierre seria borrar la constancia de cuanto se recaudo un dia y
                    // de cuanto declaro haber contado el cajero -que no esta en ningun otro
                    // sitio-, y con ella la unica cifra contra la que se puede conciliar el
                    // deposito.
                    "cierre_turno",
                    "cierre_turno_detalle",
                    "expediente_coactivo",
                    // Con #40: los valores que el expediente agrupa y su historial. Borrar una
                    // fila de expediente_valor seria borrar la unica traza de que ese valor entro
                    // en cobranza coactiva -y con ella el motivo por el que su deuda dejo de
                    // cobrarse por la via ordinaria-; borrar un movimiento seria borrar el estado
                    // del procedimiento, que no esta en ninguna otra parte.
                    "expediente_valor",
                    "expediente_movimiento",
                    "acto_coactivo",
                    // Con #42: la liquidacion de costas, su detalle y la fila que dice de que
                    // expediente son las costas de una obligacion. Borrar una liquidacion seria
                    // borrar la unica explicacion de un cargo que ya esta en el libro; borrar
                    // `costa_obligacion` dejaria a dos expedientes compartiendo la obligacion de
                    // costas del mismo obligado, que es justo lo que esa tabla existe para impedir.
                    "liquidacion_costas",
                    "costa_procesal",
                    "costa_obligacion",
                    // Con #44: la licencia de funcionamiento, sus duplicados y su historial.
                    // Borrar una licencia seria borrar la unica constancia de que el
                    // establecimiento estuvo autorizado —y con ella el sustento de los arbitrios
                    // que se le cobraron—; borrar un duplicado o un movimiento seria borrar el
                    // acto que la reimprimio o la dejo sin efecto, que no esta en ninguna otra
                    // parte. Una licencia se cancela con su resolucion (regla 4, AC de #44).
                    "licencia_funcionamiento",
                    "licencia_duplicado",
                    "licencia_movimiento",
                    // Con #48: el FUE de edificacion, sus cinco secciones, sus movimientos y sus
                    // vigencias. Borrar un expediente seria borrar la unica constancia de que una
                    // obra estuvo autorizada —y con ella el sustento del derecho de tramite que se
                    // cobro—; borrar una version de seccion seria borrar lo que el administrado
                    // declaro antes de corregirlo, que es justo lo que explica una observacion del
                    // evaluador; y borrar una vigencia dejaria una licencia sin plazo o con el
                    // plazo de la revalidacion como si fuera el original (AC 4).
                    "licencia_edificacion",
                    "edificacion_terreno",
                    "edificacion_proyecto",
                    "edificacion_estructura",
                    "edificacion_profesional",
                    "edificacion_requisito",
                    "edificacion_movimiento",
                    "edificacion_vigencia",
                    // Con #50: el escrito que el administrado presento, la resolucion que la
                    // gerencia dicto sobre su multa, y el paso del vehiculo por el deposito.
                    // Borrar un descargo seria borrar la constancia de que alguien recurrio -y con
                    // ella el computo del plazo-; borrar una resolucion, la del acto que ordeno la
                    // cobranza o dejo la multa sin efecto; borrar un internamiento, la de que un
                    // vehiculo estuvo retenido y devengo custodia.
                    "descargo",
                    "resolucion_gerencia",
                    "internamiento",
                    "internamiento_movimiento",
                    // Con #51: la autorizacion de anuncio y su historial. Borrar un anuncio seria
                    // borrar la unica explicacion de un cargo que YA ESTA EN EL LIBRO -registrar la
                    // autorizacion genera la deuda por su tasa-, y borrar un movimiento seria
                    // ademas borrar la referencia con la que ese cargo entro, que es lo que impide
                    // que se pida dos veces. Un anuncio no se borra: se cesa (regla 4, AC de #51).
                    "anuncio",
                    "anuncio_movimiento",
                    // Con #53: el criterio congelado de una generacion masiva de valores por
                    // papeletas y la constancia libre de infracciones. Borrar una corrida seria
                    // borrar la unica explicacion de por que salieron cuatro mil resoluciones de
                    // multa el mismo dia -y con que fecha se evaluo la deuda de cada una-; borrar
                    // una constancia, la del papel que la municipalidad entrego acreditando que un
                    // vehiculo no debia nada.
                    "papeleta_masivo",
                    "constancia_libre",
                    "ficha_catastral",
                    "acta_fiscalizacion",
                    // Con #49: la liquidacion de fiscalizacion, su contraste linea a linea y
                    // su historial. Borrar una liquidacion seria borrar la constancia de que
                    // se determino de oficio una diferencia -y de cuanto se le dijo al
                    // contribuyente que debia-, que no esta en ningun otro sitio; borrar una
                    // linea dejaria la liquidacion afirmando un total que su detalle ya no
                    // sostiene.
                    "liquidacion_fiscalizacion",
                    "liquidacion_detalle",
                    "liquidacion_movimiento",
                    // Con #52: la transferencia a rentas y su resolucion de determinacion.
                    // Borrarla seria borrar el unico acto que explica por que el padron cambio
                    // -y con el, la version de ficha que se inscribio y el cargo que se le
                    // asento a alguien-. Es la constancia de la frontera delicada del sistema.
                    "resolucion_determinacion",
                    // Con #54: el certificado de numeracion y zonificacion. Borrarlo seria borrar
                    // la constancia de que la municipalidad certifico un numero municipal o unos
                    // parametros urbanisticos -y el administrado tiene el papel en la mano, o lo
                    // presento ante un notario-. Uno equivocado no se borra: se sustituye emitiendo
                    // otro, con su numero y su derecho de tramite, y los dos quedan (regla 4).
                    "certificado",
                    // Con #365: la declaracion jurada. Es el documento que el contribuyente firma
                    // y se lleva, el sustento de toda la determinacion predial y —desde
                    // ADR-0015— lo UNICO que mete al predio en el padron afecto. Borrarla saca al
                    // predio de la conciliacion sin dejar acto que lo explique, o sea un omiso
                    // fabricado. Una DJ equivocada no se borra: se anula, o se rectifica, y en los
                    // dos casos las filas quedan.
                    //
                    // No entra en TABLAS_INMUTABLES, y es deliberado: su `estado` SI cambia en el
                    // sitio —observar, anular y sustituir son eso, y no llevan mas contenido que
                    // quien, cuando y por que, que es una fila de auditoria—. Lo que impide tocar
                    // las demas columnas no es este escaner sino V54, que le concede a sgtm_app el
                    // UPDATE sobre `estado` y sobre ninguna otra.
                    "declaracion_jurada",
                    "auditoria");

    /**
     * Tablas que ademas no se actualizan: el libro de asientos (ADR-0006), la auditoria (ADR-0008)
     * y la traza del cambio de numero de papeleta. Se corrigen agregando, no editando.
     */
    public static final Set<String> TABLAS_INMUTABLES =
            Set.of(
                    "cuenta_corriente_asiento",
                    "auditoria",
                    "papeleta_cambio_numero",
                    // Una diligencia de notificacion y un pase a coactiva son actos, no estados de
                    // un proceso: no se corrigen en el sitio. Un intento no hallado se reintenta
                    // con otra fila (#39); un movimiento equivocado se corrige con otro
                    // movimiento. V28 les revoca el privilegio de UPDATE, y esto rompe el build
                    // antes de que nadie lo descubra en ejecucion.
                    "notificacion",
                    "valor_movimiento",
                    "prescripcion",
                    // Y el recibo, con #33. Es el caso mas claro de todos: el contribuyente se
                    // lleva el papel. Corregir el recibo en la base deja al papel y al sistema
                    // diciendo cosas distintas, y quien tenga el papel gana la discusion. Su
                    // desglose esta congelado por el mismo motivo (V29): la reimpresion tiene que
                    // salir identica al original aunque el libro haya seguido moviendose. La
                    // anulacion y el duplicado (#34) se registran agregando, no editando.
                    "recibo",
                    "recibo_detalle",
                    // Y lo que le pasa al recibo, con #34. Una anulacion y un duplicado son
                    // actos sobre un documento, no el estado de un proceso: no se corrigen en
                    // el sitio. V30 le revoca el UPDATE, y esto lo rompe antes, en el build.
                    // Es ademas lo que impide la salida comoda que V29 dejo abierta: en vez de
                    // editar el recibo -que ya no se puede-, editar el movimiento que dice si
                    // esta anulado, que es lo mismo con un rodeo.
                    "recibo_movimiento",
                    // Y el convenio de fraccionamiento con su cronograma y sus actos, con #35.
                    // Mismo caso que el recibo: el contribuyente firma el compromiso de pago y
                    // se lo lleva. V31 les revoca el UPDATE y retira las columnas de estado que
                    // V3 les habia puesto -decian VIGENTE para siempre-; el estado se deriva de
                    // convenio_movimiento. La deuda acogida se congela igual que el desglose del
                    // recibo, y un quiebre registrado por error se corrige con otro convenio, no
                    // reescribiendo el acta.
                    "convenio",
                    "convenio_cuota",
                    "convenio_deuda",
                    "convenio_movimiento",
                    // Y el turno de caja con su cierre, con #36. Tercera vez seguida y por el
                    // mismo camino: V32 le retira a `cierre_caja` las columnas de cierre que V3
                    // le habia puesto -decian ABIERTO para siempre-, y el arqueo pasa a
                    // `cierre_turno`, que solo se agrega. Un cierre no se modifica ni se borra:
                    // se reversa con otro registro que lo deja sin efecto y reabre el turno
                    // (regla 4). Editar el acta dejaria el papel firmado por el cajero y la base
                    // diciendo cosas distintas.
                    //
                    // `cierre_caja` es EL CASO ESPECIAL de esta lista, y conviene saberlo:
                    // conserva el privilegio de UPDATE, y aqui esta el unico sitio que lo
                    // protege. No es un descuido de V32: `SELECT ... FOR UPDATE` exige el
                    // privilegio de UPDATE en PostgreSQL, y esa fila es el punto donde se
                    // serializa la ventanilla desde V29. Revocarlo dejaria la caja sin poder
                    // cobrar. Ver V32 §1.bis.
                    "cierre_caja",
                    "cierre_turno",
                    "cierre_turno_detalle",
                    // Y el expediente coactivo con sus valores y su historial, con #40. Cuarta vez
                    // seguida y por el mismo camino: V33 le retira a `expediente_coactivo` las
                    // columnas de estado que V3 le habia puesto -decian ABIERTO para siempre- y le
                    // revoca el UPDATE junto con el de `expediente_valor`. El estado se deriva de
                    // `expediente_movimiento`, que solo se agrega.
                    //
                    // Aqui el REVOKE SI se pudo, al reves que con `cierre_caja` (V32 §1.bis):
                    // ninguna fila del expediente necesita `FOR UPDATE`, porque lo que se
                    // serializa es el correlativo y eso lo hace su propia tabla con un UPDATE
                    // atomico. Si algun dia hiciera falta bloquear el expediente, esta lista
                    // pasaria a ser lo unico que lo protege, como pasa con la caja.
                    "expediente_coactivo",
                    "expediente_valor",
                    "expediente_movimiento",
                    // Y el acto del procedimiento, con #41. V34 le retira el UPDATE por lo mismo
                    // que V28 se lo retiro a `notificacion`: una REC se NOTIFICA al obligado, que
                    // se lleva el papel. Corregirla en la base deja al papel notificado y al
                    // sistema diciendo cosas distintas, y quien tenga el papel gana la discusion.
                    // Un acto equivocado se deja sin efecto con otro acto -un levantamiento, una
                    // suspension-, y los dos quedan.
                    "acto_coactivo",
                    // Y la liquidacion de costas, con #42. Sexta vez por el mismo camino: V35 no
                    // le concede UPDATE a `liquidacion_costas` ni a `costa_obligacion`, y se lo
                    // retira a `costa_procesal`. El motivo es el de siempre y aqui es literal: el
                    // importe de la liquidacion YA ESTA ASENTADO en el libro como cargo. Corregir
                    // la fila dejaria el cargo diciendo una cifra y la liquidacion otra, y la que
                    // se cobra en ventanilla es la del libro. Una costa mal liquidada se arregla
                    // reversando su asiento y liquidando de nuevo.
                    //
                    // `costa_obligacion` esta aqui ademas por su propio motivo: cambiarle el
                    // expediente en el sitio moveria las costas de un procedimiento a otro sin
                    // dejar rastro, y es la unica fila que sabe de quien son.
                    "liquidacion_costas",
                    "costa_procesal",
                    "costa_obligacion",
                    // Y la licencia de funcionamiento con sus duplicados y su historial, con #44.
                    // Septima vez seguida y por el mismo camino: V37 le retira a
                    // `licencia_funcionamiento` las columnas de estado que V4 le habia puesto
                    // -decian VIGENTE para siempre- y le revoca el UPDATE junto con el de
                    // `licencia_duplicado`. El estado se deriva de `licencia_movimiento`, que solo
                    // se agrega.
                    //
                    // Aqui el REVOKE SI se pudo, al reves que con `cierre_caja` (V32 §1.bis), y no
                    // por casualidad: el ordinal del siguiente duplicado se serializa con
                    // `licencia_duplicado_uq` y no con un `SELECT ... FOR UPDATE` sobre la
                    // licencia, precisamente para que el privilegio se pudiera retirar.
                    "licencia_funcionamiento",
                    "licencia_duplicado",
                    "licencia_movimiento",
                    // Y con #50, la octava vez y por el mismo camino. V41 le retira a `descargo`
                    // las columnas de resultado que V4 le habia puesto -el fallo dentro del
                    // escrito que otro presento- y a `internamiento` la `fecha_salida`, y les
                    // revoca el UPDATE. `resolucion_gerencia` e `internamiento_movimiento` nacen
                    // sin el.
                    //
                    // La resolucion es el caso claro: se NOTIFICA al administrado, que se lleva el
                    // papel. Corregirla en la base deja al papel notificado y al sistema diciendo
                    // cosas distintas, y quien tenga el papel gana la discusion. Una equivocada se
                    // deja sin efecto con otra, y las dos quedan. El internamiento es el otro: su
                    // salida es un acto con su acta, no una fecha que se rellena encima del
                    // ingreso.
                    "descargo",
                    "resolucion_gerencia",
                    "internamiento",
                    "internamiento_movimiento",
                    // Y la liquidacion de fiscalizacion, con #49. Novena vez seguida por el
                    // mismo camino, y aqui aplicado desde el principio: V39 nace SIN columna
                    // de estado y sin conceder UPDATE, en vez de retirarlos despues. Una
                    // liquidacion se NOTIFICA al contribuyente, que se lleva el papel;
                    // corregirla en la base deja al papel y al sistema diciendo cosas
                    // distintas, y quien tenga el papel gana la discusion. Se reliquida -otra
                    // version que la referencia- o se anula con un movimiento.
                    //
                    // El detalle entra por lo mismo que `recibo_detalle`: es el desglose
                    // congelado que explica la cifra notificada. Y el movimiento, por lo mismo
                    // que `recibo_movimiento` (#34): si la cabecera ya no se puede tocar, la
                    // tentacion siguiente es corregir la fila que dice en que estado esta.
                    "liquidacion_fiscalizacion",
                    "liquidacion_detalle",
                    "liquidacion_movimiento",
                    // Y el FUE de edificacion con sus secciones, sus movimientos y sus vigencias,
                    // con #48. Decima vez seguida por el mismo camino: V43 le retira a
                    // `licencia_edificacion` las columnas de estado y de valor de obra que V4 le
                    // habia puesto, y le revoca el UPDATE; las cinco tablas de seccion no lo
                    // reciben nunca, porque se VERSIONAN.
                    //
                    // Aqui hay ademas un motivo propio y es el que mas pesa: `valor_obra` era una
                    // columna. Corregirla en el sitio dejaria el papel que el administrado exhibe
                    // en la obra y la base diciendo cifras distintas, y esa cifra es la base del
                    // derecho de tramite que se le cobro. Se retiro entera: la valorizacion se
                    // calcula contra el cuadro de #17 y no se guarda (AC 2).
                    "licencia_edificacion",
                    "edificacion_terreno",
                    "edificacion_proyecto",
                    "edificacion_estructura",
                    "edificacion_profesional",
                    "edificacion_requisito",
                    "edificacion_movimiento",
                    "edificacion_vigencia",
                    // Y la autorizacion de anuncio con su historial, con #51. Undecima vez seguida
                    // y
                    // por el mismo camino: V45 le retira a `anuncio` la columna de estado que V4 le
                    // habia puesto -decia VIGENTE para siempre- y le revoca el UPDATE. El estado se
                    // deriva de `anuncio_movimiento`, que solo se agrega.
                    //
                    // Aqui hay ademas un motivo que ninguna de las siete anteriores tenia: la fila
                    // del movimiento lleva `referencia_cargo`, que es la MISMA cadena con la que la
                    // tasa entro en el libro, y su indice unico es lo unico que impide cobrarla dos
                    // veces. Poder editarla en el sitio seria poder devengar de nuevo el mismo
                    // ejercicio cambiando una letra.
                    "anuncio",
                    "anuncio_movimiento",
                    // Y la transferencia a rentas con su resolucion, con #52. Duodecima vez por el
                    // mismo camino: V49 nace sin conceder UPDATE. Aqui el motivo es doble y el
                    // segundo no lo tenia ninguna de las nueve anteriores: la resolucion se
                    // NOTIFICA al contribuyente, que se lleva el papel, y ademas su cargo YA ESTA
                    // en el libro y la version nueva de la ficha YA ESTA inscrita. Corregir la fila
                    // dejaria al papel, al libro, al padron y a la base diciendo cuatro cosas
                    // distintas, y la que se cobra en ventanilla es la del libro.
                    "resolucion_determinacion",
                    // Y con #53, la decimotercera vez y por el mismo camino. V47 nace
                    // `papeleta_masivo` y
                    // `constancia_libre` sin UPDATE.
                    //
                    // La constancia es el caso claro: se ENTREGA al administrado, que se lleva el
                    // papel. Corregirla en la base deja al papel y al sistema diciendo cosas
                    // distintas, y quien tenga el papel gana la discusion. Una equivocada se deja
                    // sin efecto con otra, y las dos quedan.
                    //
                    // El criterio de la corrida es el otro, y su motivo es propio: `fecha_criterio`
                    // congela a que dia se evaluo la deuda y el plazo de cada candidato. Editarla
                    // despues de generar dejaria la corrida diciendo que emitio con un criterio que
                    // no es el que uso, y no habria manera de reconstruirlo.
                    //
                    // `papeleta_masivo_item` NO entra, y es deliberado: su estado es la marca de
                    // progreso de un proceso interno -PENDIENTE a GENERADO, SIN_DEUDA o
                    // NO_PROCEDE-, no un acto administrativo. Mismo reparto que V27 hizo entre
                    // `valor_masivo` y `valor_masivo_item`.
                    "papeleta_masivo",
                    "constancia_libre",
                    // Y el certificado de numeracion y zonificacion, con #54. Decimocuarta vez, y
                    // aqui aplicado desde el principio como en V39: V51 crea `certificado` SIN
                    // conceder UPDATE ni DELETE, en vez de retirarlos despues.
                    //
                    // El motivo es el de siempre y aqui es literal: el certificado se ENTREGA al
                    // administrado, que lo presenta ante un notario, un banco o el Ministerio de
                    // Vivienda. Corregirlo en la base deja al papel y al sistema diciendo cosas
                    // distintas, y quien tiene el papel gana la discusion. Uno equivocado se
                    // sustituye emitiendo otro —con su numero y su derecho de tramite—, y los dos
                    // quedan.
                    //
                    // Tiene ademas un motivo propio: `vigencia_hasta` es una fecha COPIADA del
                    // parametro sellado que regia el dia de la emision. Poder moverla en el sitio
                    // seria poder alargar un certificado ya entregado sin que nada lo delate, y
                    // esa fecha es la que decide si una obra se autoriza con los parametros de hoy
                    // o con los de hace diez anios.
                    "certificado");

    /** {@code SET SESSION}, en cualquier espaciado. */
    private static final Pattern SET_SESSION =
            Pattern.compile("\\bset\\s+session\\b", Pattern.CASE_INSENSITIVE);

    /** {@code set_config(..., false)}: la forma de sesion, equivalente a SET SESSION. */
    private static final Pattern SET_CONFIG_DE_SESION =
            Pattern.compile("\\bset_config\\s*\\([^)]*,\\s*false\\s*\\)", Pattern.CASE_INSENSITIVE);

    private static final Pattern DELETE_FROM =
            Pattern.compile("\\bdelete\\s+from\\s+(\\w+)", Pattern.CASE_INSENSITIVE);

    private static final Pattern UPDATE_TABLA =
            Pattern.compile("\\bupdate\\s+(\\w+)\\s+set\\b", Pattern.CASE_INSENSITIVE);

    /** Literal de cadena de Java, incluidos los escapes. */
    private static final Pattern LITERAL_JAVA = Pattern.compile("\"(?:[^\"\\\\\\n]|\\\\.)*\"");

    /**
     * Un modo de redondeo escrito en el codigo.
     *
     * <p>D-03 no esta cerrada: no esta decidido con cuantos decimales se redondea (D-03a), con que
     * modo (D-03b), ni —lo que mas pesa— en que puntos del calculo (D-03c). Un {@code HALF_UP}
     * escrito hoy es esa decision tomada por descuido, repartida por el codigo y dificil de
     * encontrar despues. La politica se recibe como argumento: {@code PoliticaDeRedondeo}.
     *
     * <p>{@code UNNECESSARY} queda fuera a proposito: no es una politica de redondeo sino su
     * negacion, y es lo que el propio tipo usa para rechazarla.
     */
    private static final Pattern MODO_DE_REDONDEO_ESCRITO =
            Pattern.compile(
                    "\\bRoundingMode\\s*\\.\\s*(HALF_UP|HALF_DOWN|HALF_EVEN|CEILING|FLOOR|UP|DOWN)\\b");

    /**
     * {@code setScale(2, ...)}: la escala escrita a mano. Mismo motivo, misma familia de decisiones
     * (D-03a).
     */
    private static final Pattern ESCALA_ESCRITA =
            Pattern.compile("\\.\\s*setScale\\s*\\(\\s*[0-9]");

    /**
     * Un valor tributario construido desde un literal.
     *
     * <p>Regla 5: ninguna cifra normativa vive en el codigo. Una alicuota, un porcentaje o un valor
     * normativo construidos desde una cadena literal en {@code src/main} son exactamente eso: un
     * tramo, una tasa o una UIT compilados dentro del artefacto, que solo se pueden cambiar
     * desplegando —con lo que se acaban sin cambiar, y calculando con los del ano pasado—.
     *
     * <p>{@code Dinero} no entra en la lista: un importe literal en produccion casi siempre es un
     * cero o un tope tecnico, y prohibirlo daria mas falsos positivos que hallazgos. Lo que si es
     * casi siempre normativo es lo otro.
     *
     * <p><b>Y el constructor cuenta igual que la fabrica</b> (#72). Hasta aqui el patron solo
     * miraba {@code Alicuota.de("50")}, asi que {@code new Alicuota(new BigDecimal("50"))} pasaba
     * sin ruido —lo destapo una rotura de #72 que puso un descuento por omision y que este escaner
     * no vio—. Son la misma cifra compilada escrita de otra manera, y la segunda forma es
     * <b>mas</b> probable justo donde importa: dentro de una expresion, no en una constante con
     * nombre que delate la intencion. El {@code new BigDecimal} intermedio es opcional en el patron
     * porque las dos formas —con y sin— construyen lo mismo.
     */
    private static final Pattern VALOR_TRIBUTARIO_LITERAL =
            Pattern.compile(
                    "\\b(Alicuota|Porcentaje|ValorNormativo)\\s*\\.\\s*de\\s*\\(\\s*[\"0-9]"
                            + "|\\bnew\\s+(Alicuota|Porcentaje|ValorNormativo)\\s*\\(\\s*"
                            + "(new\\s+BigDecimal\\s*\\(\\s*)?[\"0-9]");

    /**
     * Una constante con nombre de valor normativo y una cifra dentro.
     *
     * <p>Es la otra forma en que aparece: no llamando a {@code Alicuota.de}, sino declarando {@code
     * private static final BigDecimal UIT = new BigDecimal("5350")}. El nombre delata la intencion,
     * y por eso la lista es de nombres y no de tipos.
     *
     * <p>{@code PLAZO} y {@code PRESCRIPCION} entran con #39. Un plazo del Codigo Tributario es una
     * cifra normativa igual que una alicuota, y compilarlo tiene una consecuencia peor: la alicuota
     * equivocada cobra de mas o de menos, mientras que el plazo equivocado produce expedientes
     * coactivos <b>nulos</b>, que se descubren cuando el primero se impugna. La delimitacion {@code
     * \b} es la que hace esto usable: solo caza identificadores que <b>empiezan</b> por esas
     * palabras, asi que {@code TIPO_PARAMETRO_PLAZO = "PLAZO"} —el nombre del tipo con el que se
     * LEE el parametro— no es un hallazgo, y {@code PLAZO_DE_RECLAMACION = 20} si.
     *
     * <p>Con #35, {@code INTERES_MORATORIO} <b>se ensancha a {@code INTERES}</b> y entra {@code
     * CUOTAS}. El interes de un convenio de fraccionamiento no es el moratorio del art. 33 —es el
     * de la ordenanza de fraccionamiento, D-02b— y con la lista anterior un {@code
     * INTERES_DE_FRACCIONAMIENTO = new BigDecimal("0.01")} pasaba sin ruido: el {@code \b} exige
     * que el identificador <b>empiece</b> por la palabra, y no empieza por {@code
     * INTERES_MORATORIO}. {@code CUOTAS} cubre el maximo de cuotas, que es la otra cifra de esa
     * misma ordenanza y cuya consecuencia es un convenio a plazo que nada respalda.
     *
     * <p>Con #42 entra {@code COSTA}. {@code ARANCEL} ya estaba y caza {@code ARANCEL_COSTA_REC1 =
     * new BigDecimal("35.00")}, pero <b>no</b> caza {@code COSTA_DE_LA_REC1 = ...} ni {@code
     * COSTAS_POR_ACTO = ...}, que es exactamente como se escribiria si a alguien le pareciera que
     * «treinta y cinco soles por resolucion» es un detalle de implementacion. El arancel de costas
     * es de ordenanza local —D-02c, #193 esta bloqueado esperandolo— y compilarlo produce un cobro
     * sin sustento normativo en toda la cartera coactiva.
     *
     * <p>Con #51 entran {@code TASA} y {@code TARIFA}. La tasa por anuncios y propaganda la fija
     * una ordenanza municipal ratificada por la provincia —D-02b, #199 esta bloqueado esperandola—
     * y <b>ninguna palabra de la lista anterior la cazaba</b>: {@code TASA_PANEL = new
     * BigDecimal("90.00")} pasaba sin ruido, igual que {@code INTERES_DE_FRACCIONAMIENTO} pasaba
     * antes de #35 y {@code COSTA_DE_LA_REC2} antes de #42. Es la tercera vez que el mismo hueco
     * aparece, y siempre del mismo modo: una familia de cifras nueva con un nombre nuevo.
     *
     * <p>{@code TARIFA} va con ella porque es como se escribe la misma cifra cuando a alguien le
     * parece que «tasa» suena a tributo: {@code TARIFA_POR_M2 = ...} es exactamente el mismo dato.
     *
     * <p>Con #52 entra {@code MULTA}, y es la cuarta vez que el mismo hueco se abre por el mismo
     * sitio. La transferencia a rentas asienta, junto al tributo omitido, la <b>multa tributaria
     * del art. 176 del Codigo Tributario</b>, que se expresa como un porcentaje de la UIT y depende
     * ademas del regimen de gradualidad; es D-02c, y hasta que cierre la liquidacion la deja en
     * {@code null} (#198). Nada de la lista anterior caza {@code MULTA_DEL_ARTICULO_176 = new
     * BigDecimal("0.50")}: no empieza por {@code UIT}, ni por {@code ALICUOTA}, ni por {@code
     * TRAMO}. Y la consecuencia de compilarla no es cobrar de mas o de menos: es sancionar sin
     * norma que lo sostenga, en todo el padron fiscalizado a la vez.
     *
     * <p>Con #54 entra {@code VIGENCIA}. Un certificado de numeracion o de zonificacion vale
     * <b>tantos meses</b>, y cuantos lo fija el TUPA de cada municipalidad (D-02b). Es la quinta
     * vez que aparece el mismo hueco: {@code VIGENCIA_DEL_CERTIFICADO = 36} no empieza por ninguna
     * de las quince palabras anteriores —ni por {@code PLAZO}, que es lo que mas se le parece— y
     * pasaba sin ruido. Su consecuencia es propia y peor que la de una tarifa: un certificado con
     * una vigencia inventada no cobra de mas, <b>autoriza de mas</b>. Uno que caduca demasiado
     * tarde deja construir en 2035 con los parametros urbanisticos de 2026, y eso no se descubre
     * hasta que la obra esta levantada.
     *
     * <p>Con #72 entran {@code BENEFICIO}, {@code DESCUENTO} y {@code CONDONACION}. Es la sexta vez
     * que el hueco se abre por el mismo sitio. Cuanto descuenta una campana de amnistia lo fija una
     * ordenanza municipal —D-02b— o un acuerdo de concejo —D-02c—, y ninguna de las dieciseis
     * palabras anteriores caza {@code BENEFICIO_AMNISTIA = new BigDecimal("50")}: no empieza por
     * {@code ALICUOTA}, ni por {@code DEDUCCION}, ni por {@code TASA}. Y su consecuencia no es
     * cobrar de mas ni autorizar de mas: es <b>perdonar</b> de mas. Un porcentaje inventado condona
     * deuda que ninguna norma condona, la cifra sale escrita en lo que el contribuyente se lleva, y
     * lo que no cuadra despues es el arqueo.
     *
     * <p>{@code DESCUENTO} y {@code CONDONACION} van con ella porque son como se escribe la misma
     * cifra cuando «beneficio» suena a otra cosa: {@code DESCUENTO_PRONTO_PAGO = ...} y {@code
     * CONDONACION_DE_INTERESES = ...} son exactamente el mismo dato.
     *
     * <p>Con #399 entra {@code MINIMO}. Es la septima vez que el hueco se abre por el mismo sitio:
     * el minimo imponible del vehicular —«no menor al 1.5 % de la UIT», TUO LTM art. 34— y el del
     * predial —art. 13— son cifras de norma, y ninguna de las veinte palabras anteriores caza
     * {@code MINIMO_IMPONIBLE_VEHICULAR = new BigDecimal("1.5")}. Su consecuencia no se parece a la
     * de las demas: un minimo inventado no cobra de mas ni de menos en una cifra que se pueda
     * comparar, <b>eleva el suelo</b> —solo lo pagan los vehiculos baratos, que son los unicos a
     * los que el minimo llega, y por eso no lo delata ningun importe raro—.
     *
     * <p>Entra la palabra a secas y no {@code MINIMO_IMPONIBLE}, porque la misma cifra se escribe
     * {@code MINIMO_VEHICULAR} o {@code MINIMOS_POR_TRIBUTO}. El precio fue renombrar tres cotas de
     * formato que no son cifras tributarias —{@code Placa}, {@code Observacion} y {@code
     * Ejercicio}, que declaraban {@code MINIMO}/{@code MAXIMO} a secas— a {@code LARGO_MINIMO} y
     * {@code ANIO_MINIMO}: el {@code \b} no casa a mitad de identificador, y de paso las tres dicen
     * ahora de que son cota.
     *
     * <p>Ojo con el {@code \b}: no caza {@code TIPO_TASA = "TASA_ANUNCIO"} ni {@code TIPO_VIGENCIA
     * = "VIGENCIA_CERTIFICADO"} —el identificador no <b>empieza</b> por la palabra en el primer
     * caso, y en el segundo el valor no lleva ninguna cifra— ni ningun {@code tasa_id = 1} de un
     * SQL, porque el patron es sensible a mayusculas y esta pensado para nombres de constante.
     */
    private static final Pattern CONSTANTE_NORMATIVA =
            Pattern.compile(
                    "\\b(UIT|TRAMO|ALICUOTA|ARANCEL|DEPRECIACION|VALOR_UNITARIO|DEDUCCION"
                            + "|INTERES|REAJUSTE|PLAZO|PRESCRIPCION|CUOTAS|COSTA|TASA|TARIFA"
                            + "|MULTA|VIGENCIA|BENEFICIO|DESCUENTO|CONDONACION|MINIMO"
                            // #437 (D-11): el `% actualizacion` multiplica el autovaluo, y su
                            // valor «obvio» es 1 —o sea, ninguno—. Escribirlo no se siente como
                            // inventar un dato, se siente como no aplicar ninguno; y es lo mismo:
                            // afirma que el factor vale 1 en todo ejercicio y toda municipalidad.
                            // Octava vez que el hueco se abre por el mismo sitio.
                            + "|ACTUALIZACION|FACTOR)"
                            + "\\w*\\s*=\\s*[^;\\n]*[0-9]");

    /**
     * Un area convertida a texto a mano, en cualquiera de las dos formas (#607).
     *
     * <p>Un {@code AreaM2} tiene <b>un</b> sitio donde se convierte en cadena: el serializador que
     * {@code ConfiguracionDeJson} registra para el, que escribe la cifra sola. Componerla en el
     * recurso vuelve a abrir la puerta por la que este defecto entro: {@code
     * ficha.areaTerreno().toString()} mete la unidad dentro del dato —{@code "360.00 m2"}— y {@code
     * area.valor().toPlainString()} da la cifra buena pero es una <b>segunda convencion</b> para lo
     * mismo. Teniendo dos, el sistema acabo publicando el area del mismo predio de dos formas segun
     * a que modulo se le preguntara, y ninguna de las dos fallaba.
     *
     * <p><b>El anclaje es el nombre, porque esto es texto y no tipos</b>, y ahi esta el filo: el
     * identificador tiene que <b>empezar</b> por {@code area} o {@code Area} tras un limite de
     * palabra. Sin esa exigencia, «hect<b>area</b>s» casa por dentro —{@code hectareas()}, {@code
     * hectareasTotales()}, {@code hectareasComunes()}— y la regla se llevaria por delante el bloque
     * rural de {@code FichaResource}, que es una {@link pe.gob.sgtm.dominio.Medida} y lleva su
     * unidad dentro <b>a proposito</b>: el arancel rural es por hectarea, y quien lea metros
     * calcularia diez mil veces de menos. Lo mismo el {@code frontis} y la {@code cantidad} de una
     * obra complementaria.
     */
    private static final Pattern AREA_COMPUESTA_A_MANO =
            Pattern.compile(
                    "\\b[aA]rea\\w*\\s*(?:\\(\\s*\\))?\\s*\\.\\s*"
                            + "(?:toString\\s*\\(\\s*\\)"
                            + "|valor\\s*\\(\\s*\\)\\s*\\.\\s*"
                            + "toPlainString\\s*\\(\\s*\\))");

    /**
     * Las clases que componen un area a mano <b>con motivo</b>, nombradas una a una (#607).
     *
     * <p>Se nombran por clase y no por paquete a proposito: anadir una sexta tiene que ser una
     * linea visible en el diff, con quien la escribe teniendo que decir por que. Un paquete entero
     * exento seria una puerta que nadie vuelve a mirar.
     *
     * <p>Las cinco son lo mismo: <b>texto que no pasa por ningun serializador</b>. Cuatro son
     * modelos de documento —el papel que se imprime y se archiva—, donde la unidad va en el rotulo
     * de la fila o de la columna: «Area del terreno (m2)». La quinta es la descripcion que {@code
     * RegistrarAnuncio} escribe en la columna JSON de la auditoria, que tampoco es una proyeccion
     * HTTP. Todas escriben la <b>cifra sola</b>: lo que la lista permite es componerla, no meterle
     * la unidad dentro.
     *
     * <p><b>{@code DiferenciaEntreLiquidaciones} no esta, y no es un olvido.</b> Es la otra
     * excepcion legitima —la celda de texto libre del historial, donde «120.00 → 164.50» sin unidad
     * no dice si cambio el area o el insoluto—, pero el escaner <b>no puede verla</b>: convierte
     * con un {@code texto(Object)} propio, asi que en su codigo no aparece ningun {@code
     * area…().toString()} que casar. Ponerla aqui seria una entrada muerta en una lista de
     * excepciones, que es exactamente el defecto que esta lista existe para no tener. Lo que la
     * sostiene son las tres pruebas que afirman «300.00 m2» letra por letra, y {@code
     * ProhibicionesEnElCodigoFuenteTest} comprueba que el escaner, en efecto, no la alcanza.
     */
    static final Set<String> COMPONEN_EL_AREA_A_MANO_CON_MOTIVO =
            Set.of(
                    // Los cuatro modelos de documento: la unidad va en el rotulo.
                    "ModeloDelFue",
                    "ModeloDeLaLicencia",
                    "ModeloDeLaResolucionDeDeterminacion",
                    "ModeloDeLaFichaDelContribuyente",
                    // Las dos descripciones que van a la columna JSON de la auditoria.
                    //
                    // OJO con el motivo, porque el que estaba escrito era falso: decia «no al
                    // HTTP», y esa columna SI sale por HTTP —`GET /seguridad/auditoria` publica
                    // `datosAnteriores`/`datosNuevos` verbatim (`AuditoriaResource`)—. El motivo
                    // real es otro: ahi el area no es un campo tipado sino una instantanea de
                    // texto libre, y por eso se escribe el numero SIN la unidad, que es
                    // exactamente lo que #607 unifica. Componerla a mano es lo unico que se puede
                    // hacer, y esta lista es lo que obliga a decirlo.
                    "RegistrarAnuncio",
                    "ActualizarFichaCatastral");

    private static final Pattern COMENTARIO_SQL_DE_LINEA = Pattern.compile("--[^\\n]*");
    private static final Pattern COMENTARIO_DE_BLOQUE = Pattern.compile("(?s)/\\*.*?\\*/");

    private RevisorDeCodigoFuente() {}

    /** Un incumplimiento, con lo necesario para arreglarlo sin buscarlo. */
    public record Hallazgo(String archivo, String regla, String fragmento) {
        @Override
        public String toString() {
            return archivo + " — " + regla + ": " + fragmento;
        }
    }

    public static List<Hallazgo> revisarJava(String archivo, String contenido) {
        StringBuilder literales = new StringBuilder();
        Matcher matcher = LITERAL_JAVA.matcher(sinComentariosDeBloque(contenido));
        while (matcher.find()) {
            literales.append(matcher.group()).append('\n');
        }
        List<Hallazgo> hallazgos = new ArrayList<>(revisarTexto(archivo, literales.toString()));
        hallazgos.addAll(revisarRedondeo(archivo, contenido));
        hallazgos.addAll(revisarValoresTributarios(archivo, contenido));
        hallazgos.addAll(revisarAreas(archivo, contenido));
        return hallazgos;
    }

    /**
     * Regla 5: ningun literal numerico tributario en el codigo.
     *
     * <p>UIT, tramos, alicuotas, valores unitarios, aranceles y tablas de depreciacion viven en
     * datos versionados con su documento fuente y su vigencia (ADR-0007). Compilados dentro del
     * artefacto solo se pueden cambiar desplegando, y un tramo equivocado produce deuda mal
     * calculada en todo un padron.
     *
     * <p>Como el redondeo, mira el codigo y no los literales de cadena, y descarta los comentarios:
     * este mismo archivo explica la prohibicion nombrando UIT y tramos.
     */
    public static List<Hallazgo> revisarValoresTributarios(String archivo, String contenido) {
        List<Hallazgo> hallazgos = new ArrayList<>();

        Matcher valor = VALOR_TRIBUTARIO_LITERAL.matcher(sinComentariosDeBloque(contenido));
        while (valor.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "regla 5: una alicuota o un valor normativo construido desde un literal"
                                    + " es una cifra de norma compilada; va en datos versionados"
                                    + " con su documento fuente (ADR-0007)",
                            valor.group()));
        }

        Matcher constante = CONSTANTE_NORMATIVA.matcher(sinComentariosNiMas(contenido));
        while (constante.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "regla 5: esa constante lleva nombre de valor normativo y una cifra"
                                    + " dentro; cambiarla no debe exigir un despliegue (ADR-0007)",
                            constante.group()));
        }

        return hallazgos;
    }

    /**
     * #607: ninguna clase compone un area a mano, salvo las nombradas en {@link
     * #COMPONEN_EL_AREA_A_MANO_CON_MOTIVO}.
     *
     * <p>Mira el codigo y no los literales —como el redondeo y por lo mismo—: lo que se busca es
     * una llamada. Los comentarios se descartan porque este mismo archivo explica la prohibicion
     * escribiendola.
     *
     * <p><b>Recorre {@code src/main} entero y no solo {@code infraestructura/web}</b>, aunque el
     * defecto se viera ahi. Acotarlo a la web dejaria la lista de excepciones sin poder dispararse
     * nunca —ninguna de las clases que componen con motivo vive en {@code infraestructura/web}—, y
     * una regla cuya mitad no puede fallar no protege esa mitad: quitar {@code ModeloDelFue} de la
     * lista no pondria nada rojo, y entonces la lista seria decoracion. Con el recorrido completo,
     * quitar cualquier entrada pone rojo el escaneo del backend entero nombrando la clase.
     *
     * @param archivo la ruta o el nombre del archivo; de el sale la clase que se compara con la
     *     lista de excepciones
     */
    public static List<Hallazgo> revisarAreas(String archivo, String contenido) {
        if (COMPONEN_EL_AREA_A_MANO_CON_MOTIVO.contains(claseDe(archivo))) {
            return List.of();
        }

        List<Hallazgo> hallazgos = new ArrayList<>();
        Matcher area = AREA_COMPUESTA_A_MANO.matcher(soloCodigo(contenido));
        while (area.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "#607: un area no se convierte a texto a mano. Va tipada como AreaM2 y"
                                    + " la escribe el serializador de ConfiguracionDeJson —la cifra"
                                    + " sola—; la unidad la pone la cabecera de la columna, nunca el"
                                    + " dato",
                            area.group()));
        }
        return hallazgos;
    }

    /** El nombre de la clase a partir de la ruta o del nombre del archivo. */
    private static String claseDe(String archivo) {
        String nombre = archivo.replace('\\', '/');
        int barra = nombre.lastIndexOf('/');
        if (barra >= 0) {
            nombre = nombre.substring(barra + 1);
        }
        return nombre.endsWith(".java")
                ? nombre.substring(0, nombre.length() - ".java".length())
                : nombre;
    }

    /**
     * D-03: mientras la escala (D-03a), el modo (D-03b) y los puntos de redondeo (D-03c) no esten
     * decididos, no hay ninguna politica de redondeo escrita en el codigo. Se recibe como
     * argumento.
     *
     * <p>Mira el codigo y no los literales —al reves que el resto del revisor—, porque lo que se
     * busca es una llamada, no una cadena. Los comentarios se descartan: este mismo archivo explica
     * la prohibicion nombrandola, y una regla que se denuncia a si misma acaba desactivada.
     */
    public static List<Hallazgo> revisarRedondeo(String archivo, String contenido) {
        String codigo = soloCodigo(contenido);
        List<Hallazgo> hallazgos = new ArrayList<>();

        Matcher modo = MODO_DE_REDONDEO_ESCRITO.matcher(codigo);
        while (modo.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "D-03b sigue abierta: el modo de redondeo se recibe en una"
                                    + " PoliticaDeRedondeo, no se escribe en el codigo",
                            modo.group()));
        }

        Matcher escala = ESCALA_ESCRITA.matcher(codigo);
        while (escala.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "D-03a sigue abierta: la escala se recibe en una PoliticaDeRedondeo, no"
                                    + " se escribe en el codigo",
                            escala.group()));
        }

        return hallazgos;
    }

    /**
     * El contenido sin comentarios ni literales, para poder buscar llamadas y no texto.
     *
     * <p>Recorre caracter a caracter en lugar de aplicar expresiones regulares: un {@code //}
     * dentro de una cadena no abre un comentario, y borrarlo se llevaria por delante el codigo que
     * viene detras en la misma linea.
     */
    static String soloCodigo(String contenido) {
        return sinComentarios(contenido, false);
    }

    /**
     * El contenido sin comentarios pero <b>con</b> las cadenas.
     *
     * <p>Lo necesita la regla 5: {@code UIT_2026 = new BigDecimal("5350")} lleva la cifra dentro de
     * un literal, asi que descartar las cadenas la haria invisible. Lo que sigue descartandose son
     * los comentarios, porque este mismo archivo explica la prohibicion nombrando la UIT.
     */
    static String sinComentariosNiMas(String contenido) {
        return sinComentarios(contenido, true);
    }

    private static String sinComentarios(String contenido, boolean conservarCadenas) {
        StringBuilder codigo = new StringBuilder(contenido.length());
        int i = 0;
        while (i < contenido.length()) {
            char actual = contenido.charAt(i);
            char siguiente = i + 1 < contenido.length() ? contenido.charAt(i + 1) : '\0';

            if (actual == '/' && siguiente == '/') {
                while (i < contenido.length() && contenido.charAt(i) != '\n') {
                    i++;
                }
            } else if (actual == '/' && siguiente == '*') {
                i += 2;
                while (i + 1 < contenido.length()
                        && !(contenido.charAt(i) == '*' && contenido.charAt(i + 1) == '/')) {
                    i++;
                }
                i = Math.min(i + 2, contenido.length());
            } else if (actual == '"' && contenido.startsWith("\"\"\"", i)) {
                int cierre = contenido.indexOf("\"\"\"", i + 3);
                int fin = cierre < 0 ? contenido.length() : cierre + 3;
                if (conservarCadenas) {
                    codigo.append(contenido, i, fin);
                }
                i = fin;
            } else if (actual == '"' || actual == '\'') {
                char comilla = actual;
                int inicio = i;
                i++;
                while (i < contenido.length() && contenido.charAt(i) != comilla) {
                    i += contenido.charAt(i) == '\\' ? 2 : 1;
                }
                i++;
                if (conservarCadenas) {
                    codigo.append(contenido, inicio, Math.min(i, contenido.length()));
                }
            } else {
                codigo.append(actual);
                i++;
            }
        }
        return codigo.toString();
    }

    public static List<Hallazgo> revisarSql(String archivo, String contenido) {
        String sinComentarios =
                COMENTARIO_SQL_DE_LINEA.matcher(sinComentariosDeBloque(contenido)).replaceAll("");
        return revisarTexto(archivo, sinComentarios);
    }

    private static String sinComentariosDeBloque(String contenido) {
        return COMENTARIO_DE_BLOQUE.matcher(contenido).replaceAll("");
    }

    private static List<Hallazgo> revisarTexto(String archivo, String texto) {
        List<Hallazgo> hallazgos = new ArrayList<>();

        Matcher setSession = SET_SESSION.matcher(texto);
        while (setSession.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "SET SESSION sobrevive al retorno de la conexion al pool y contamina la"
                                    + " peticion de otra municipalidad; va SET LOCAL (regla 3)",
                            setSession.group()));
        }

        Matcher setConfig = SET_CONFIG_DE_SESION.matcher(texto);
        while (setConfig.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "set_config con is_local = false es SET SESSION con otro nombre; el"
                                    + " tercer argumento va en true (regla 3)",
                            setConfig.group()));
        }

        Matcher delete = DELETE_FROM.matcher(texto);
        while (delete.find()) {
            String tabla = delete.group(1).toLowerCase(Locale.ROOT);
            if (TABLAS_PROTEGIDAS.contains(tabla)) {
                hallazgos.add(
                        new Hallazgo(
                                archivo,
                                "no se borra deuda, pagos, recibos, valores, papeletas, asientos ni"
                                        + " auditoria: se anula, se da de baja o se reversa"
                                        + " (RNF-051)",
                                delete.group()));
            }
        }

        Matcher update = UPDATE_TABLA.matcher(texto);
        while (update.find()) {
            String tabla = update.group(1).toLowerCase(Locale.ROOT);
            if (TABLAS_INMUTABLES.contains(tabla)) {
                hallazgos.add(
                        new Hallazgo(
                                archivo,
                                "un asiento no se corrige en el sitio y la auditoria no se edita:"
                                        + " se agrega otro registro (ADR-0006, ADR-0008)",
                                update.group()));
            }
        }

        return hallazgos;
    }
}
