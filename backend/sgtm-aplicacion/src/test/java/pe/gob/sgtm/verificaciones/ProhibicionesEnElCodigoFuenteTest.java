package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.verificaciones.RevisorDeCodigoFuente.Hallazgo;

/**
 * Recorre el codigo de produccion de <b>todo</b> el backend buscando las prohibiciones que no son
 * estructura de clases sino texto.
 *
 * <p>Se revisa {@code src/main} y no {@code src/test}: una prueba que demuestre el peligro de
 * {@code SET SESSION} tiene que poder escribirlo. La de {@code sgtm-plataforma} lo hace, y es lo
 * que prueba que el guardia de conexiones sirve para algo.
 */
@DisplayName("ARQ-04 §2 — Prohibiciones en el codigo fuente")
class ProhibicionesEnElCodigoFuenteTest {

    @Test
    @DisplayName(
            "ningun modulo usa SET SESSION, borra de una tabla protegida, edita una inmutable ni escribe una politica de redondeo")
    void ningunModuloIncumpleLasProhibicionesDeTexto() throws IOException {
        Path raiz = raizDelBackend();
        List<Path> archivos = fuentesDeProduccion(raiz);

        // Si el recorrido no encuentra archivos, la prueba pasa sin revisar nada.
        assertThat(archivos)
                .as("el recorrido desde %s debe encontrar las fuentes de produccion", raiz)
                .hasSizeGreaterThan(10);
        assertThat(archivos)
                .as("debe alcanzar tanto el Java como el SQL de las migraciones")
                .anyMatch(a -> a.toString().endsWith(".sql"))
                .anyMatch(a -> a.toString().endsWith(".java"));

        List<Hallazgo> hallazgos = new ArrayList<>();
        for (Path archivo : archivos) {
            String contenido = Files.readString(archivo, StandardCharsets.UTF_8);
            String nombre = raiz.relativize(archivo).toString();
            hallazgos.addAll(
                    archivo.toString().endsWith(".sql")
                            ? RevisorDeCodigoFuente.revisarSql(nombre, contenido)
                            : RevisorDeCodigoFuente.revisarJava(nombre, contenido));
        }

        assertThat(hallazgos).isEmpty();
    }

    @Test
    @DisplayName("el revisor detecta SET SESSION en un literal de Java")
    void elRevisorDetectaSetSessionEnJava() {
        String fuente =
                """
                class Ejemplo {
                    // Este comentario menciona SET SESSION y no debe contar.
                    void malo(java.sql.Statement s) throws Exception {
                        s.execute("SET SESSION app.municipalidad_id = '1'");
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Ejemplo.java", fuente))
                .hasSize(1)
                .allSatisfy(h -> assertThat(h.fragmento()).containsIgnoringCase("set session"));
    }

    @Test
    @DisplayName("el revisor detecta set_config con is_local en false")
    void elRevisorDetectaSetConfigDeSesion() {
        String fuente =
                """
                class Ejemplo {
                    static final String SQL = "select set_config('app.municipalidad_id', ?, false)";
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Ejemplo.java", fuente)).hasSize(1);
    }

    @Test
    @DisplayName("el revisor detecta un DELETE sobre una tabla protegida, en SQL")
    void elRevisorDetectaDeleteSobreTablaProtegida() {
        String sql =
                """
                -- DELETE FROM cuenta_corriente_asiento en un comentario no cuenta
                DELETE FROM cuenta_corriente_asiento WHERE id = 1;
                DELETE FROM domicilio WHERE id = 1;
                """;
        assertThat(RevisorDeCodigoFuente.revisarSql("V9__malo.sql", sql))
                .as("solo la tabla protegida; domicilio no lo esta")
                .hasSize(1);
    }

    @Test
    @DisplayName("el revisor detecta un UPDATE sobre el libro de asientos o la auditoria")
    void elRevisorDetectaUpdateSobreTablaInmutable() {
        String sql =
                """
                UPDATE cuenta_corriente_asiento SET monto = 0 WHERE id = 1;
                UPDATE auditoria SET observacion = 'otra cosa' WHERE id = 1;
                UPDATE contribuyente SET nombre_razon_social = 'X' WHERE id = 1;
                """;
        assertThat(RevisorDeCodigoFuente.revisarSql("V9__malo.sql", sql))
                .as("contribuyente si se puede actualizar; el asiento y la auditoria no")
                .hasSize(2);
    }

    @Test
    @DisplayName("el revisor detecta un modo de redondeo escrito en el codigo (D-03)")
    void elRevisorDetectaUnModoDeRedondeoEscrito() {
        String fuente =
                """
                import java.math.RoundingMode;

                class Ejemplo {
                    // Este comentario menciona RoundingMode.HALF_UP y no debe contar.
                    java.math.BigDecimal malo(java.math.BigDecimal base) {
                        return base.setScale(2, RoundingMode.HALF_UP);
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Ejemplo.java", fuente))
                .as("el modo y la escala son dos decisiones, y las dos las bloquea D-03")
                .hasSize(2)
                .allSatisfy(h -> assertThat(h.regla()).contains("D-03"));
    }

    @Test
    @DisplayName("el revisor deja pasar la politica recibida como argumento")
    void elRevisorDejaPasarLaPoliticaRecibida() {
        String fuente =
                """
                class Bueno {
                    java.math.BigDecimal redondear(java.math.BigDecimal v, int escala,
                            java.math.RoundingMode modo) {
                        return v.setScale(escala, modo);
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Bueno.java", fuente))
                .as("recibir la politica es exactamente lo que D-03 obliga a hacer")
                .isEmpty();
    }

    @Test
    @DisplayName("UNNECESSARY no es una politica de redondeo y no cuenta")
    void unnecessaryNoCuenta() {
        String fuente =
                """
                class Bueno {
                    boolean esPolitica(java.math.RoundingMode modo) {
                        return modo != java.math.RoundingMode.UNNECESSARY;
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Bueno.java", fuente)).isEmpty();
    }

    @Test
    @DisplayName("un // dentro de una cadena no borra el resto de la linea")
    void unaBarraDobleEnUnaCadenaNoBorraLaLinea() {
        String fuente =
                """
                class Ejemplo {
                    void malo(java.math.BigDecimal v) {
                        String url = "https://ejemplo.pe"; v.setScale(4, null);
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Ejemplo.java", fuente))
                .as(
                        "si el revisor tratara ese // como comentario, la llamada de al lado"
                                + " desapareceria y la regla no protegeria nada")
                .hasSize(1);
    }

    @Test
    @DisplayName("el revisor no se queja del codigo correcto")
    void elRevisorNoSeQuejaDelCodigoCorrecto() {
        String fuente =
                """
                class Bueno {
                    static final String SQL = "SELECT set_config('app.municipalidad_id', ?, true)";
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarJava("Bueno.java", fuente)).isEmpty();
    }

    private static List<Path> fuentesDeProduccion(Path raiz) throws IOException {
        try (Stream<Path> rutas = Files.walk(raiz)) {
            return rutas.filter(Files::isRegularFile)
                    .filter(ProhibicionesEnElCodigoFuenteTest::esFuenteDeProduccion)
                    .toList();
        }
    }

    private static boolean esFuenteDeProduccion(Path ruta) {
        String texto = ruta.toString().replace('\\', '/');
        if (!texto.contains("/src/main/")) {
            return false;
        }
        if (texto.contains("/build/")) {
            return false;
        }
        return texto.endsWith(".java") || texto.endsWith(".sql");
    }

    /** El directorio de trabajo de la prueba es el del modulo; el backend esta encima. */
    private static Path raizDelBackend() {
        Path actual = Path.of("").toAbsolutePath();
        while (actual != null) {
            if (Files.exists(actual.resolve("settings.gradle.kts"))) {
                return actual;
            }
            actual = actual.getParent();
        }
        throw new IllegalStateException("No se encontro la raiz del build del backend");
    }
}
