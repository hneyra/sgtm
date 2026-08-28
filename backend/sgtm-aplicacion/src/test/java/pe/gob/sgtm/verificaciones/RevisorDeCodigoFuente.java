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
                    // Y con #53, la novena vez y por el mismo camino. V47 nace `papeleta_masivo` y
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
                    "constancia_libre");

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
     */
    private static final Pattern VALOR_TRIBUTARIO_LITERAL =
            Pattern.compile(
                    "\\b(Alicuota|Porcentaje|ValorNormativo)\\s*\\.\\s*de\\s*\\(\\s*[\"0-9]");

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
     */
    private static final Pattern CONSTANTE_NORMATIVA =
            Pattern.compile(
                    "\\b(UIT|TRAMO|ALICUOTA|ARANCEL|DEPRECIACION|VALOR_UNITARIO|DEDUCCION"
                            + "|INTERES|REAJUSTE|PLAZO|PRESCRIPCION|CUOTAS|COSTA)\\w*\\s*=\\s*[^;\\n]*[0-9]");

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
