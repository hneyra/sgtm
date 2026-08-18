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
 * Y dos que viven en el texto del Java: la politica de redondeo escrita a mano (D-03), y la
 * observacion escrita a mano en vez de recibida como argumento (regla 10, ADR-0008).
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
                    "valor",
                    "valor_detalle",
                    "papeleta",
                    "convenio",
                    "expediente_coactivo",
                    "acto_coactivo",
                    "ficha_catastral",
                    "acta_fiscalizacion",
                    "auditoria");

    /**
     * Tablas que ademas no se actualizan: el libro de asientos (ADR-0006), la auditoria (ADR-0008)
     * y la traza del cambio de numero de papeleta. Se corrigen agregando, no editando.
     */
    public static final Set<String> TABLAS_INMUTABLES =
            Set.of("cuenta_corriente_asiento", "auditoria", "papeleta_cambio_numero");

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
     * <p>D-03 no esta cerrada: no esta decidido con cuantos decimales se redondea, con que modo, ni
     * —lo que mas pesa— en que puntos del calculo. Un {@code HALF_UP} escrito hoy es esa decision
     * tomada por descuido, repartida por el codigo y dificil de encontrar despues. La politica se
     * recibe como argumento: {@code PoliticaDeRedondeo}.
     *
     * <p>{@code UNNECESSARY} queda fuera a proposito: no es una politica de redondeo sino su
     * negacion, y es lo que el propio tipo usa para rechazarla.
     */
    private static final Pattern MODO_DE_REDONDEO_ESCRITO =
            Pattern.compile(
                    "\\bRoundingMode\\s*\\.\\s*(HALF_UP|HALF_DOWN|HALF_EVEN|CEILING|FLOOR|UP|DOWN)\\b");

    /** {@code setScale(2, ...)}: la escala escrita a mano. Mismo motivo, misma decision (D-03). */
    private static final Pattern ESCALA_ESCRITA =
            Pattern.compile("\\.\\s*setScale\\s*\\(\\s*[0-9]");

    /**
     * {@code Observacion.de("...")} o {@code new Observacion("...")}: la observacion escrita como
     * literal dentro del metodo que la usa, en vez de recibida como argumento (regla 10, ADR-0008).
     *
     * <p>Un {@code Observacion.de("listo")} compila y pasa la validacion del tipo —"listo" tiene
     * cinco caracteres—, y eso es exactamente el problema: esconde una escritura sin observacion
     * real detras de una observacion de mentira que nadie escribio para explicar el cambio. Por eso
     * el patron no mira el contenido del literal, solo que haya uno: la unica forma correcta es que
     * el texto entre por parametro.
     *
     * <p>A diferencia de {@link #MODO_DE_REDONDEO_ESCRITO}, este patron necesita ver la comilla que
     * abre el literal, asi que se aplica sobre el codigo con los comentarios de bloque quitados
     * pero <b>sin</b> quitar los literales.
     */
    private static final Pattern OBSERVACION_ESCRITA =
            Pattern.compile("\\b(?:Observacion\\s*\\.\\s*de|new\\s+Observacion)\\s*\\(\\s*\"");

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
        hallazgos.addAll(revisarObservacion(archivo, contenido));
        return hallazgos;
    }

    /**
     * Regla 10 (ADR-0008): mientras no se reciba como argumento, ninguna observacion viaja escrita
     * a mano dentro del metodo que la usa.
     *
     * <p>Igual que {@link #revisarRedondeo}, quita los comentarios —de bloque y de linea— para no
     * denunciarse a si mismo cuando un javadoc o un {@code //} cita el patron como ejemplo. A
     * diferencia de {@link #revisarRedondeo}, no pasa por {@link #soloCodigo}: ese metodo borra el
     * contenido de los literales, y aqui lo que hace falta ver es precisamente que hay uno, con
     * {@link #sinComentarios}.
     */
    public static List<Hallazgo> revisarObservacion(String archivo, String contenido) {
        String codigo = sinComentarios(contenido);
        List<Hallazgo> hallazgos = new ArrayList<>();

        Matcher observacion = OBSERVACION_ESCRITA.matcher(codigo);
        while (observacion.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "regla 10 (ADR-0008): la observacion viaja como argumento del caso de"
                                    + " uso que escribe, nunca como literal dentro del metodo que la"
                                    + " usa",
                            observacion.group()));
        }

        return hallazgos;
    }

    /**
     * D-03: mientras la escala, el modo y los puntos de redondeo no esten decididos, no hay ninguna
     * politica de redondeo escrita en el codigo. Se recibe como argumento.
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
                            "D-03 sigue abierta: el modo de redondeo se recibe en una"
                                    + " PoliticaDeRedondeo, no se escribe en el codigo",
                            modo.group()));
        }

        Matcher escala = ESCALA_ESCRITA.matcher(codigo);
        while (escala.find()) {
            hallazgos.add(
                    new Hallazgo(
                            archivo,
                            "D-03 sigue abierta: la escala se recibe en una PoliticaDeRedondeo, no"
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
        return recorrer(contenido, false);
    }

    /**
     * El contenido sin comentarios de bloque ni de linea, <b>con</b> los literales intactos.
     *
     * <p>Comparte el recorrido caracter a caracter con {@link #soloCodigo}, y difere solo en que no
     * descarta lo que hay entre comillas. La usa {@link #revisarObservacion}, que necesita ver la
     * comilla que abre un literal —al reves que {@link #revisarRedondeo}, a quien le basta con
     * saber que hubo una llamada.
     */
    private static String sinComentarios(String contenido) {
        return recorrer(contenido, true);
    }

    private static String recorrer(String contenido, boolean conservarLiterales) {
        StringBuilder resultado = new StringBuilder(contenido.length());
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
                int inicio = i;
                int cierre = contenido.indexOf("\"\"\"", i + 3);
                i = cierre < 0 ? contenido.length() : cierre + 3;
                if (conservarLiterales) {
                    resultado.append(contenido, inicio, i);
                }
            } else if (actual == '"' || actual == '\'') {
                char comilla = actual;
                int inicio = i;
                i++;
                while (i < contenido.length() && contenido.charAt(i) != comilla) {
                    i += contenido.charAt(i) == '\\' ? 2 : 1;
                }
                i = Math.min(i + 1, contenido.length());
                if (conservarLiterales) {
                    resultado.append(contenido, inicio, i);
                }
            } else {
                resultado.append(actual);
                i++;
            }
        }
        return resultado.toString();
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
