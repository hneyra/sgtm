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
        return revisarTexto(archivo, literales.toString());
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
