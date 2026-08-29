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

    @Test
    @DisplayName("el revisor detecta una alicuota construida desde un literal (regla 5)")
    void elRevisorDetectaUnaAlicuotaLiteral() {
        String fuente =
                """
                class Ejemplo {
                    // Ni este comentario sobre la alicuota del 0.6 % cuenta.
                    pe.gob.sgtm.dominio.Alicuota predial() {
                        return pe.gob.sgtm.dominio.Alicuota.de("0.6");
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarValoresTributarios("Ejemplo.java", fuente))
                .as(
                        "un tramo compilado solo se cambia desplegando, con lo que se acaba sin cambiar")
                .hasSize(1);
    }

    @Test
    @DisplayName("el revisor detecta una constante con nombre de valor normativo y una cifra")
    void elRevisorDetectaUnaConstanteNormativa() {
        String fuente =
                """
                class Ejemplo {
                    private static final java.math.BigDecimal UIT_2026 = new java.math.BigDecimal("5350");
                    private static final int TRAMO_PRIMERO = 15;
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarValoresTributarios("Ejemplo.java", fuente))
                .as("el nombre delata la intencion; por eso la lista es de nombres y no de tipos")
                .hasSize(2);
    }

    @Test
    @DisplayName("el revisor no se queja de un valor leido de los parametros")
    void elRevisorNoSeQuejaDeUnValorLeido() {
        String fuente =
                """
                class Bueno {
                    pe.gob.sgtm.dominio.ValorNormativo alicuota(Parametros p) {
                        return p.exigirNumero("ALICUOTA_PREDIAL", "tramo-1");
                    }
                }
                """;
        assertThat(RevisorDeCodigoFuente.revisarValoresTributarios("Bueno.java", fuente))
                .as("leerlo del conjunto sellado es exactamente lo que la regla 5 pide")
                .isEmpty();
    }

    @Test
    @DisplayName("el escaner detecta la muestra de repositorio que borra de una tabla protegida")
    void elEscanerDetectaLaMuestraDeRepositorioQueBorra() throws IOException {
        // La muestra no vive en un literal de esta prueba sino en un archivo propio,
        // y se lee del disco: asi se verifica el escaner sobre un archivo de verdad,
        // con su javadoc mencionando DELETE, UPDATE y SET SESSION. Si el escaner
        // contara los comentarios, esta prueba encontraria seis hallazgos y no tres.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/infraestructura/MuestraDeRepositorioQueBorra.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres literales que viola, y ninguno de los comentarios que los explican")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from recibo"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update cuenta_corriente_asiento"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("set session"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un recibo, su detalle o su movimiento")
    void elEscanerDetectaLaMuestraQueEditaUnRecibo() throws IOException {
        // #33: recibo y recibo_detalle entran en TABLAS_INMUTABLES. La forma en que el
        // defecto aparece de verdad no es un DELETE -eso se ve venir- sino el UPDATE que
        // corrige en el sitio, porque V3 llego a dejar las columnas de anulacion invitando
        // a usarlas.
        //
        // #34 cierra el rodeo: recibo_movimiento entra tambien. Si el recibo ya no se puede
        // tocar, la tentacion siguiente es corregir la fila que dice si esta anulado, que
        // deja al mismo documento diciendo dos cosas distintas por la puerta de al lado.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/MuestraDeRepositorioQueEditaUnRecibo.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as(
                        "los tres UPDATE y los dos DELETE, y ninguno de los comentarios que los"
                                + " explican")
                .hasSize(5);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update recibo set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update recibo_detalle set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update recibo_movimiento set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from recibo_detalle"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("delete from recibo_movimiento"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un cierre de caja o su turno")
    void elEscanerDetectaLaMuestraQueEditaUnCierre() throws IOException {
        // #36: cierre_turno, cierre_turno_detalle y cierre_caja entran en TABLAS_INMUTABLES.
        // El defecto aparece aqui con una forma muy concreta: corregir la cifra que el
        // cajero declaro cuando se da cuenta de que conto mal, que es exactamente cuando
        // el descuadre importa. Y el rodeo, igual que en #34: si el acta no se puede
        // tocar, tocar el turno para volver a ponerlo en ABIERTO.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/MuestraDeRepositorioQueEditaUnCierre.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as(
                        "los tres UPDATE y los dos DELETE, y ninguno de los comentarios que los"
                                + " explican")
                .hasSize(5);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update cierre_turno set"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update cierre_turno_detalle set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update cierre_caja set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from cierre_turno"))
                .anySatisfy(
                        f ->
                                assertThat(f)
                                        .containsIgnoringCase("delete from cierre_turno_detalle"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un acto coactivo o borra su diligencia")
    void elEscanerDetectaLaMuestraQueEditaUnActoCoactivo() throws IOException {
        // #41: acto_coactivo entra en TABLAS_INMUTABLES, por lo mismo que la notificacion en #39
        // y el historial del expediente en #40. Un acto coactivo se NOTIFICA, y el obligado se
        // lleva el papel. Y con los dos rodeos cerrados: si la medida ya no se puede tocar, la
        // tentacion siguiente es mover la fecha -que es la que decide si la REC-2 respeto el
        // plazo-, o borrar la diligencia que no salio bien en vez de reintentar con otra.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnActoCoactivo.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los dos UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(3);
        // El fragmento del hallazgo es el patron que casa -«UPDATE acto_coactivo SET»-, no la
        // sentencia entera, asi que los dos UPDATE de la muestra se cuentan por cantidad: los dos
        // rodeos tienen que aparecer, no basta con que aparezca uno.
        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(fragmentos)
                .filteredOn(f -> f.toLowerCase(java.util.Locale.ROOT).contains("acto_coactivo"))
                .as("el UPDATE de la medida y el de la fecha, los dos")
                .hasSize(2);
        assertThat(fragmentos)
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from notificacion"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita o borra una liquidacion de fiscalizacion")
    void elEscanerDetectaLaMuestraQueEditaUnaLiquidacion() throws IOException {
        // #49: las tres tablas de la liquidacion entran en TABLAS_PROTEGIDAS y en
        // TABLAS_INMUTABLES. Una liquidacion se NOTIFICA, y el contribuyente se lleva el papel.
        // La forma en que el defecto aparece de verdad no es en la cabecera -eso se ve venir-
        // sino en el detalle: reescribir la linea del contraste en vez de reliquidar, con lo
        // que la version corregida y la original pasan a ser la misma fila.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnaLiquidacion.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(4);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(
                        f ->
                                assertThat(f)
                                        .containsIgnoringCase(
                                                "update liquidacion_fiscalizacion set"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update liquidacion_detalle set"))
                .anySatisfy(
                        f ->
                                assertThat(f)
                                        .containsIgnoringCase("update liquidacion_movimiento set"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("delete from liquidacion_detalle"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita o borra una transferencia a rentas (#52)")
    void elEscanerDetectaLaMuestraQueEditaUnaTransferencia() throws IOException {
        // #52: `resolucion_determinacion` entra en las dos listas. Decima vez por el mismo
        // camino, y con un motivo que las nueve anteriores no tenian: esta fila tiene TRES
        // efectos colgando -el papel notificado, la version de ficha inscrita y el cargo del
        // libro-, asi que editarla o borrarla no deja el sistema como estaba: deja sus efectos
        // en pie y sin nada que los explique.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnaTransferencia.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("el UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(2);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(
                        f ->
                                assertThat(f)
                                        .containsIgnoringCase(
                                                "update resolucion_determinacion set"))
                .anySatisfy(
                        f ->
                                assertThat(f)
                                        .containsIgnoringCase(
                                                "delete from resolucion_determinacion"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con la multa tributaria compilada (regla 5, #52)")
    void elEscanerDetectaLaMuestraDeMultaTributariaCompilada() throws IOException {
        // #52 ensancha la lista de nombres de la regla 5 con MULTA, y es la tercera vez que el
        // mismo hueco se abre por el mismo sitio: el `\b` del patron exige que el identificador
        // EMPIECE por una palabra vigilada, y `MULTA_DEL_ARTICULO_176` no empieza por ninguna de
        // las doce anteriores. Antes de esta linea, la muestra entera pasaba en VERDE.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeMultaTributariaCompilada.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las tres constantes, y ninguno de los comentarios que las explican")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("MULTA_DEL_ARTICULO_176"))
                .anySatisfy(f -> assertThat(f).contains("MULTA_GRADUALIDAD_SUBSANACION_VOLUNTARIA"))
                .anySatisfy(f -> assertThat(f).contains("MULTA_MINIMA_EN_SOLES"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita una licencia o borra su duplicado")
    void elEscanerDetectaLaMuestraQueEditaUnaLicencia() throws IOException {
        // #44: licencia_funcionamiento, licencia_duplicado y licencia_movimiento entran en
        // TABLAS_INMUTABLES, por lo mismo que el recibo en #33, el convenio en #35, el expediente
        // en #40 y el acto coactivo en #41. Una licencia se EXHIBE en el establecimiento, y el
        // titular tiene el papel. Con los tres rodeos cerrados: si el dato ya no se puede tocar,
        // la tentacion siguiente es devolverle una columna de estado, reescribir el movimiento que
        // la cancelo, o borrar el duplicado que se autorizo por error.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnaLicencia.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(4);

        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(fragmentos)
                .filteredOn(
                        f ->
                                f.toLowerCase(java.util.Locale.ROOT)
                                        .contains("licencia_funcionamiento"))
                .as("el UPDATE de la denominacion y el del estado, los dos")
                .hasSize(2);
        assertThat(fragmentos)
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update licencia_movimiento set"));
        assertThat(fragmentos)
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("delete from licencia_duplicado"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita una resolucion de gerencia (#50)")
    void elEscanerDetectaLaMuestraQueEditaUnaResolucionDeGerencia() throws IOException {
        // #50: `descargo`, `resolucion_gerencia`, `internamiento` e `internamiento_movimiento`
        // entran en las dos listas. La resolucion se NOTIFICA y el administrado se lleva el papel;
        // la salida del deposito es un acto con su acta, no una fecha rellenada encima del
        // ingreso; y el descargo es el escrito que otro presento y firmo.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnaResolucionDeGerencia"
                                        + ".java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(hallazgos)
                .as("los dos UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(3);
        assertThat(fragmentos)
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update resolucion_gerencia set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update internamiento set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from descargo"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un FUE de edificacion")
    void elEscanerDetectaLaMuestraQueEditaUnFue() throws IOException {
        // #48: licencia_edificacion, sus cinco tablas de seccion, edificacion_movimiento y
        // edificacion_vigencia entran en TABLAS_INMUTABLES. Decima vez por el mismo camino, y con
        // un motivo propio que no tenian las anteriores: aqui la tentacion no es corregir un
        // estado sino GUARDAR LA CIFRA -devolverle a la cabecera el `valor_obra` que V4 tenia-, y
        // esa cifra ya vive en el cuadro de valores unitarios de #17. Duplicarla deja dos verdades
        // sobre la base con que se cobro el derecho de tramite.
        //
        // Y con los rodeos cerrados: el estado, la seccion corregida en el sitio en vez de
        // versionada, la vigencia original pisada al revalidar -que es justo lo que el AC 4
        // prohibe- y la linea de valorizacion borrada con el papel ya en la obra.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/infraestructura/MuestraDeRepositorioQueEditaUnFue.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los cuatro UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(5);

        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(fragmentos)
                .filteredOn(
                        f -> f.toLowerCase(java.util.Locale.ROOT).contains("licencia_edificacion"))
                .as("el UPDATE del valor de obra y el del estado, los dos")
                .hasSize(2);
        assertThat(fragmentos)
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update edificacion_terreno set"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update edificacion_vigencia set"))
                .anySatisfy(
                        f ->
                                assertThat(f)
                                        .containsIgnoringCase(
                                                "delete from edificacion_estructura"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un anuncio o borra su autorizacion")
    void elEscanerDetectaLaMuestraQueEditaUnAnuncio() throws IOException {
        // #51: `anuncio` y `anuncio_movimiento` entran en TABLAS_INMUTABLES, por lo mismo que la
        // licencia en #44 y con un motivo mas que ninguna de las anteriores tenia: la fila
        // del movimiento lleva `referencia_cargo`, que es la MISMA cadena con la que la tasa entro
        // en el libro. Su indice unico es lo unico que impide devengarla dos veces, asi que poder
        // editarla en el sitio seria poder cobrar dos veces el mismo ejercicio cambiando una letra.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnAnuncio.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(4);

        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(fragmentos)
                .filteredOn(
                        f -> f.toLowerCase(java.util.Locale.ROOT).contains("update anuncio set"))
                .as("el UPDATE de la denominacion y el del estado, los dos")
                .hasSize(2);
        assertThat(fragmentos)
                .as("y el que reescribiria la referencia con la que el cargo entro en el libro")
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update anuncio_movimiento set"));
        assertThat(fragmentos)
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from anuncio"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un certificado o lo borra")
    void elEscanerDetectaLaMuestraQueEditaUnCertificado() throws IOException {
        // #54: `certificado` entra en TABLAS_INMUTABLES, por lo mismo que la licencia en #44 y con
        // un motivo propio que ninguna de las anteriores tenia: `vigencia_hasta` es una fecha
        // COPIADA del parametro sellado que regia el dia de la emision, y poder moverla en el sitio
        // seria poder alargar un papel ya entregado sin que nada lo delate.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnCertificado.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(4);

        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(fragmentos)
                .filteredOn(
                        f ->
                                f.toLowerCase(java.util.Locale.ROOT)
                                        .contains("update certificado set"))
                .as("la direccion, la vigencia y el derecho: los tres")
                .hasSize(3);
        assertThat(fragmentos)
                .as("y el borrado del certificado, que se sustituye emitiendo otro")
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from certificado"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que borra una declaracion jurada")
    void elEscanerDetectaLaMuestraQueBorraUnaDeclaracion() throws IOException {
        // #365: `declaracion_jurada` entra en TABLAS_PROTEGIDAS y NO en TABLAS_INMUTABLES, y las
        // dos mitades de esa decision se ven aqui. Borrarla esta prohibido porque desde ADR-0015 es
        // lo unico que mete al predio en el padron afecto: la fila que desaparece produce un omiso
        // que ningun acto explica. Editarla en el sitio lo impide V54 con privilegio de COLUMNA
        // —solo `estado`—, que es lo que este escaner no puede ver y por eso se comprueba
        // ejecutando, en RegistrarDeclaracionJuradaTest.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueBorraUnaDeclaracion.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los dos DELETE, y ninguno de los comentarios que los explican")
                .hasSize(2);

        List<String> fragmentos = hallazgos.stream().map(Hallazgo::fragmento).toList();
        assertThat(fragmentos)
                .filteredOn(
                        f ->
                                f.toLowerCase(java.util.Locale.ROOT)
                                        .contains("delete from declaracion_jurada"))
                .as("la declaracion y el rodeo de borrar su rectificatoria: los dos")
                .hasSize(2);
    }

    @Test
    @DisplayName("el escaner detecta la muestra con la vigencia del certificado compilada")
    void elEscanerDetectaLaMuestraDeVigenciaDeCertificado() throws IOException {
        // #54: cuantos meses vale un certificado lo fija el TUPA de cada municipalidad (D-02b).
        // NINGUNA palabra de la lista anterior lo cazaba —VIGENCIA_DEL_CERTIFICADO no empieza por
        // PLAZO ni por ninguna de las otras catorce—, que es el mismo hueco que #35 destapo con
        // INTERES_DE_FRACCIONAMIENTO, #42 con COSTA_DE_LA_REC2 y #51 con TASA_PANEL. Por eso entra
        // VIGENCIA.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeVigenciaDeCertificadoCompilada.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las cuatro constantes, y ninguno de los comentarios que las explican")
                .hasSize(4);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("VIGENCIA_DEL_CERTIFICADO"))
                .anySatisfy(f -> assertThat(f).contains("VIGENCIAS_POR_TIPO"))
                .anySatisfy(f -> assertThat(f).contains("PLAZO_DE_VIGENCIA_EN_MESES"))
                .anySatisfy(f -> assertThat(f).contains("TASA_DEL_CERTIFICADO"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con el descuento de un beneficio compilado")
    void elEscanerDetectaLaMuestraDeBeneficio() throws IOException {
        // #72: cuanto descuenta una campana de amnistia lo fija una ordenanza local (D-02b) o un
        // acuerdo de concejo (D-02c). NINGUNA de las dieciseis palabras anteriores cazaba
        // BENEFICIO_AMNISTIA_2026 —ni ALICUOTA, ni DEDUCCION, ni TASA—, el mismo hueco que #35
        // destapo con INTERES_DE_FRACCIONAMIENTO, #42 con COSTA_DE_LA_REC2, #51 con TASA_PANEL y
        // #54 con VIGENCIA_DEL_CERTIFICADO. Por eso entran BENEFICIO, DESCUENTO y CONDONACION.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeBeneficioCompilado.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las cuatro constantes y la alicuota sin nombre; ningun comentario")
                .hasSize(5);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("BENEFICIO_AMNISTIA_2026"))
                .anySatisfy(f -> assertThat(f).contains("DESCUENTO_PRONTO_PAGO"))
                .anySatisfy(f -> assertThat(f).contains("CONDONACION_DE_INTERESES"))
                .anySatisfy(f -> assertThat(f).contains("ALICUOTA_DE_LA_CAMPANIA"))
                // La quinta no tiene nombre que la delate: es la cifra dentro de la expresion,
                // que es como se escribe un valor por omision y lo que #72 destapo.
                .anySatisfy(f -> assertThat(f).contains("new Alicuota(new BigDecimal(\""));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con la tasa de anuncios compilada (regla 5)")
    void elEscanerDetectaLaMuestraDeTasaDeAnuncio() throws IOException {
        // #51: la tasa por anuncios y propaganda es de ordenanza local (D-02b, #199 bloqueado).
        // NINGUNA palabra de la lista anterior la cazaba -TASA_PANEL no empieza por UIT, TRAMO,
        // ALICUOTA ni ninguna de las otras-, que es el mismo hueco que #35 destapo con
        // INTERES_DE_FRACCIONAMIENTO y #42 con COSTA_DE_LA_REC2. Por eso entran TASA y TARIFA.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeTasaDeAnuncioCompilada.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las cuatro constantes, y ninguno de los comentarios que las explican")
                .hasSize(4);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("TASA_PANEL"))
                .anySatisfy(f -> assertThat(f).contains("TARIFA_POR_M2_DE_ANUNCIO"))
                .anySatisfy(f -> assertThat(f).contains("TASAS_POR_CLASE"))
                .anySatisfy(f -> assertThat(f).contains("ARANCEL_DEL_ANUNCIO"));
    }

    @Test
    @DisplayName(
            "el escaner detecta la muestra con el factor de actualizacion compilado (regla 5, #437)")
    void elEscanerDetectaLaMuestraDeFactorDeActualizacionCompilado() throws IOException {
        // D-11: el `% actualizacion` es el unico de los cuatro factores que sigue sin fuente, y el
        // unico cuyo valor «obvio» es 1 —o sea, ninguno—. Escribirlo no se siente como inventar un
        // dato; y lo es: afirma que el factor vale 1 en todo ejercicio y toda municipalidad, y
        // multiplica el autovaluo de todo el padron. Octava vez que el hueco se abre por el mismo
        // sitio (INTERES #35, COSTA #42, TASA #51, MULTA #52, VIGENCIA #54, BENEFICIO #72,
        // MINIMO #399): por eso entran ACTUALIZACION y FACTOR.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeFactorDeActualizacionCompilado.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as(
                        "dos de las tres formas en que acaba escribiendose —el factor y el cuadro"
                                + " por ejercicio—, y ninguno de los comentarios que las explican")
                .hasSize(2);

        // Y la tercera NO se caza, a proposito: el patron exige la palabra vigilada al PRINCIPIO
        // del identificador, asi que `PORCENTAJE_DE_ACTUALIZACION` se le escapa. Ensancharlo a «en
        // cualquier parte del nombre» se midio: ocho falsos positivos en src/main, todos de MINIMO
        // en constantes que no son normativas (LARGO_MINIMO = 5, ANIO_MINIMO = 1990,
        // DECIMALES_MINIMOS = 2...). Se deja anclado, y este caso fija el limite: si alguien lo
        // ensancha, esto se pone rojo y la decision se toma mirando.
        assertThat(hallazgos)
                .as("el limite conocido de la regla 5, fijado para que ensancharla sea deliberado")
                .noneMatch(h -> h.fragmento().contains("PORCENTAJE_DE_ACTUALIZACION"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con valores tributarios compilados (regla 5)")
    void elEscanerDetectaLaMuestraDeValoresCompilados() throws IOException {
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeValoresTributariosCompilados.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("la UIT, el tramo y la alicuota; y ninguno de los comentarios que los explican")
                .hasSize(3);
    }

    @Test
    @DisplayName("el escaner detecta la muestra con los plazos del Codigo Tributario compilados")
    void elEscanerDetectaLaMuestraDePlazosCompilados() throws IOException {
        // #39: un plazo compilado no cobra de mas ni de menos -produce expedientes coactivos
        // nulos-, y por eso PLAZO y PRESCRIPCION entraron en la lista de nombres de la regla 5.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDePlazosCompilados.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las tres constantes, y ninguno de los comentarios que las explican")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("PLAZO_DE_RECLAMACION_EN_DIAS"))
                .anySatisfy(f -> assertThat(f).contains("PRESCRIPCION_ANIOS"))
                .anySatisfy(f -> assertThat(f).contains("PLAZO_INICIO_COMPUTO"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita un convenio, su cronograma o su acta")
    void elEscanerDetectaLaMuestraQueEditaUnConvenio() throws IOException {
        // #35: convenio, convenio_cuota, convenio_deuda y convenio_movimiento entran en
        // TABLAS_INMUTABLES, por lo mismo que el recibo en #33 y #34. Y con el mismo
        // rodeo cerrado: si el convenio ya no se puede tocar, la tentacion siguiente es
        // corregir la fila que dice si esta quebrado.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnConvenio.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(4);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update convenio set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update convenio_cuota set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from convenio_deuda"))
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update convenio_movimiento set"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con las condiciones del convenio compiladas")
    void elEscanerDetectaLaMuestraDeCondicionesDeConvenio() throws IOException {
        // #35: el interes de fraccionamiento y el maximo de cuotas son cifras de ordenanza
        // local (D-02b). La lista de nombres de la regla 5 tuvo que ensancharse -de
        // INTERES_MORATORIO a INTERES- y ganar CUOTAS: sin eso,
        // INTERES_DE_FRACCIONAMIENTO no empieza por ninguna palabra vigilada y pasa sin
        // ruido, que es exactamente el modo en que esta regla deja de proteger.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeCondicionesDeConvenioCompiladas.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las dos constantes, y ninguno de los comentarios que las explican")
                .hasSize(2);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("INTERES_DE_FRACCIONAMIENTO"))
                .anySatisfy(f -> assertThat(f).contains("CUOTAS_MAXIMAS"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con el minimo imponible compilado")
    void elEscanerDetectaLaMuestraDeMinimoImponible() throws IOException {
        // #399: el minimo imponible del vehicular es el 1.5 % de la UIT (TUO LTM art. 34) y el
        // del predial el 0.6 % (art. 13). Son cifras de norma y salen del conjunto sellado.
        // NINGUNA de las veinte palabras anteriores las cazaba -MINIMO_IMPONIBLE_VEHICULAR no
        // empieza por UIT, ni por ALICUOTA, ni por TASA-, el mismo hueco que #35 destapo con
        // INTERES_DE_FRACCIONAMIENTO, #42 con COSTA_DE_LA_REC2, #51 con TASA_PANEL y #54 con
        // VIGENCIA_DEL_CERTIFICADO. Por eso entra MINIMO. Y su consecuencia es propia: un minimo
        // inventado no cobra de mas en ninguna cifra comparable, eleva el suelo -solo lo pagan
        // los vehiculos baratos, que son a los que el minimo llega-.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeMinimoImponibleCompilado.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las tres constantes, y ninguno de los comentarios que las explican")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("MINIMO_IMPONIBLE_VEHICULAR"))
                .anySatisfy(f -> assertThat(f).contains("MINIMO_DEL_PREDIAL"))
                .anySatisfy(f -> assertThat(f).contains("MINIMOS_POR_TRIBUTO"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita una liquidacion de costas")
    void elEscanerDetectaLaMuestraQueEditaUnaLiquidacionDeCostas() throws IOException {
        // #42: liquidacion_costas, costa_procesal y costa_obligacion entran en TABLAS_INMUTABLES.
        // Aqui el motivo es literal: el importe de la liquidacion YA ESTA en el libro como cargo
        // de concepto GASTO. Corregir la fila deja el cargo diciendo una cifra y la liquidacion
        // otra, y la que se cobra en ventanilla es la del libro.
        //
        // Y con los rodeos cerrados: corregir la linea en vez de la cabecera, borrarla, y -el
        // propio de #42- mudar `costa_obligacion` a otro expediente, que traslada un cobro de un
        // procedimiento a otro sin dejar rastro.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnaLiquidacionDeCostas.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los tres UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(4);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(
                        f -> assertThat(f).containsIgnoringCase("update liquidacion_costas set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update costa_procesal set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from costa_procesal"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update costa_obligacion set"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra con el arancel de costas compilado (regla 5)")
    void elEscanerDetectaLaMuestraDeArancelDeCostas() throws IOException {
        // #42: el arancel de costas es de ordenanza local (D-02c, #193 bloqueado). ARANCEL ya
        // estaba en la lista de nombres y caza ARANCEL_COSTA_REC1; lo que NO cazaba, y por eso
        // COSTA entra ahora, es COSTA_DE_LA_REC2 -que es como se escribe cuando a alguien le
        // parece que treinta y cinco soles por resolucion son un detalle de implementacion-.
        // Es el mismo hueco que #35 destapo con INTERES_DE_FRACCIONAMIENTO.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/dominio/MuestraDeArancelDeCostasCompilado.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarValoresTributarios(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("las tres constantes, y ninguno de los comentarios que las explican")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).contains("ARANCEL_COSTA_REC1"))
                .anySatisfy(f -> assertThat(f).contains("COSTA_DE_LA_REC2"))
                .anySatisfy(f -> assertThat(f).contains("COSTAS_PORCENTAJE_SOBRE_LA_DEUDA"));
    }

    @Test
    @DisplayName("el escaner detecta la muestra que edita una constancia libre o su corrida")
    void elEscanerDetectaLaMuestraQueEditaUnaConstanciaLibre() throws IOException {
        // #53: papeleta_masivo y constancia_libre entran en TABLAS_INMUTABLES y en
        // TABLAS_PROTEGIDAS. La constancia por lo de siempre -se entrega, y quien tiene el
        // papel gana la discusion-; el criterio de la corrida por un motivo propio:
        // `fecha_criterio` congela a que dia se evaluo la deuda de cada candidato, y moverla
        // deja la corrida diciendo que emitio con un criterio que no es el que uso.
        //
        // `papeleta_masivo_item` NO esta en la lista, y por eso la muestra no lo toca: su
        // estado es la marca de progreso de un proceso interno, no un acto administrativo.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve(
                                "muestras/infraestructura/"
                                        + "MuestraDeRepositorioQueEditaUnaConstanciaLibre.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDeCodigoFuente.revisarJava(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8));

        assertThat(hallazgos)
                .as("los dos UPDATE y el DELETE, y ninguno de los comentarios que los explican")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update constancia_libre set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("update papeleta_masivo set"))
                .anySatisfy(f -> assertThat(f).containsIgnoringCase("delete from papeleta_masivo"));
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
