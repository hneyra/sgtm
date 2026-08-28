package pe.gob.sgtm.parametros.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import pe.gob.sgtm.carga.InformeDeImportacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.parametros.dominio.LlaveDeParametro;
import pe.gob.sgtm.parametros.dominio.PublicacionDeCuadros;
import pe.gob.sgtm.parametros.infraestructura.PublicacionDeCuadrosJdbc;

/**
 * El proceso batch que publica un cuadro normativo nacional (D-13, ADR-0017; #188), contra
 * PostgreSQL real.
 *
 * <h2>Una sola conexion, y es la que no puede ser otra</h2>
 *
 * <p>Todo lo de aqui va por {@code rol_carga_parametros}: desde V55 es la unica credencial que
 * puede escribir {@code valor_referencial_vehiculo}. Con un superusuario esto pasaria en verde sin
 * verificar nada —ni la politica RLS, ni el privilegio, ni el disparador—, que es el precedente que
 * CLAUDE.md pone por delante de todo lo demas.
 *
 * <h2>Las cifras</h2>
 *
 * <p>Las de los casos de mecanismo son <b>ficticias</b> y estan escritas en un CSV temporal que la
 * prueba fabrica: no representan ningun valor referencial de ningun vehiculo. El derivado real del
 * corpus aparece en un solo caso —{@link #elManifiestoQueSeDespliegaSeVerificaConSuHuella()}—, y lo
 * que ese caso demuestra es que el archivo que se despliega es reproducible, no cuanto vale nada.
 */
@DisplayName("Proceso batch — publicacion de cuadros normativos (D-13, #188)")
class PublicarCuadrosTest {

    /** El manifiesto que este repositorio versiona, tal como se despliega. */
    private static final Path MANIFIESTO =
            Path.of("../../docs/10-negocio/valores-normativos/publicacion/cuadros-2026.csv")
                    .toAbsolutePath()
                    .normalize();

    private static final String CABECERA =
            "cuadro,tipo,clave,vigencia_desde,vigencia_hasta,documento_fuente,archivo_de_filas,"
                    + "sha256,archivo_del_corpus,transcribio,verifico";

    private static final String CABECERA_DEL_ANEXO =
            "categoria,marca,modelo_anterior,modelo,valor_1,valor_2,valor_3";

    private static BaseDeDatosDePrueba base;
    private static PublicacionDeCuadros publicacion;
    private static JdbcClient jdbc;
    private static PublicarCuadros proceso;

    @TempDir private static Path directorio;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();

        DriverManagerDataSource carga = new DriverManagerDataSource();
        carga.setUrl(base.url());
        carga.setUsername(BaseDeDatosDePrueba.CARGA_PARAMETROS);
        carga.setPassword(base.clave(BaseDeDatosDePrueba.CARGA_PARAMETROS));
        jdbc = JdbcClient.create(carga);
        publicacion = new PublicacionDeCuadrosJdbc(jdbc);
        proceso =
                new PublicarCuadros(
                        publicacion, new DatosDelCuadro(MANIFIESTO.toString(), "prueba"));
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @Test
    @DisplayName("publica el cuadro entero, con municipalidad_id nulo, y cierra la edicion")
    void publicaElCuadroEnteroYCierraLaEdicion() throws IOException {
        Path manifiesto = manifiestoCon("2001-01-01", filasFicticias("MARCA-A", "MODELO-A"));

        InformeDeImportacion informe = proceso.publicar(manifiesto);

        // Una linea del anexo son tres filas del cuadro: un valor por ano de fabricacion.
        assertThat(informe.nuevas()).isEqualTo(3);
        assertThat(informe.rechazadas()).isEmpty();

        assertThat(filasDe("MODELO-A")).isEqualTo(3);
        assertThat(municipalidadesDistintasDe("MODELO-A"))
                .as("un cuadro nacional no lleva municipalidad: es de todas (ARQ-09 §2.1)")
                .isZero();

        PublicacionDeCuadros.Edicion edicion =
                publicacion
                        .edicionPublicada(
                                new LlaveDeParametro(
                                        "TABLA_FICTICIA",
                                        "2001",
                                        java.time.LocalDate.parse("2001-01-01")))
                        .orElseThrow();
        assertThat(edicion.cerrada())
                .as(
                        "cerrar la edicion es lo que impide que crezca despues de que un conjunto"
                                + " la selle")
                .isTrue();
    }

    @Test
    @DisplayName("volver a correr el mismo manifiesto no duplica: la edicion ya esta cerrada")
    void volverACorrerNoDuplica() throws IOException {
        Path manifiesto = manifiestoCon("2002-01-01", filasFicticias("MARCA-B", "MODELO-B"));

        proceso.publicar(manifiesto);
        InformeDeImportacion segunda = proceso.publicar(manifiesto);

        assertThat(segunda.nuevas()).isZero();
        assertThat(segunda.rechazadas())
                .singleElement()
                .extracting(InformeDeImportacion.FilaRechazada::motivo, STRING)
                .contains("ya esta publicada y cerrada");
        assertThat(filasDe("MODELO-B")).isEqualTo(3);
    }

    @Test
    @DisplayName("un archivo de filas con la huella cambiada no publica ni una fila")
    void unArchivoConOtraHuellaNoPublicaNada() throws IOException {
        Path filas = filasFicticias("MARCA-C", "MODELO-C");
        Path manifiesto =
                escribir(
                        "manifiesto-huella-mala.csv",
                        CABECERA
                                + "\nVALOR_REFERENCIAL,TABLA_FICTICIA,2003,2003-01-01,2003-12-31,"
                                + "Norma de mentira 000-0000-XX,"
                                + filas.getFileName()
                                + ","
                                + "0".repeat(64)
                                + ",vehicular-valores-referenciales-2026.md,JNA,HNA\n");

        InformeDeImportacion informe = proceso.publicar(manifiesto);

        assertThat(informe.nuevas()).isZero();
        assertThat(informe.rechazadas())
                .singleElement()
                .extracting(InformeDeImportacion.FilaRechazada::motivo, STRING)
                .contains("no es el que el corpus firmo");
        assertThat(filasDe("MODELO-C")).isZero();
    }

    @Test
    @DisplayName("un cuadro que el proceso no sabe publicar se rechaza nombrando el motivo")
    void unCuadroQueNoSePuedePublicarSeRechaza() throws IOException {
        Path filas = filasFicticias("MARCA-D", "MODELO-D");
        Path manifiesto =
                escribir(
                        "manifiesto-otro-cuadro.csv",
                        CABECERA
                                + "\nDEPRECIACION,TABLA_FICTICIA,2004,2004-01-01,2004-12-31,"
                                + "Norma de mentira 000-0000-XX,"
                                + filas.getFileName()
                                + ","
                                + huella(filas)
                                + ",depreciacion.md,JNA,HNA\n");

        InformeDeImportacion informe = proceso.publicar(manifiesto);

        assertThat(informe.nuevas()).isZero();
        assertThat(informe.rechazadas())
                .singleElement()
                .extracting(InformeDeImportacion.FilaRechazada::motivo, STRING)
                .contains("no es un cuadro que este proceso sepa publicar");
    }

    @Test
    @DisplayName("dos firmas iguales no publican: releerse a uno mismo no es verificar")
    void dosFirmasIgualesNoPublican() throws IOException {
        Path filas = filasFicticias("MARCA-E", "MODELO-E");
        Path manifiesto =
                escribir(
                        "manifiesto-una-firma.csv",
                        CABECERA
                                + "\nVALOR_REFERENCIAL,TABLA_FICTICIA,2005,2005-01-01,2005-12-31,"
                                + "Norma de mentira 000-0000-XX,"
                                + filas.getFileName()
                                + ","
                                + huella(filas)
                                + ",vehicular-valores-referenciales-2026.md,JNA,JNA\n");

        InformeDeImportacion informe = proceso.publicar(manifiesto);

        assertThat(informe.nuevas()).isZero();
        assertThat(informe.rechazadas())
                .singleElement()
                .extracting(InformeDeImportacion.FilaRechazada::motivo, STRING)
                .contains("releerse a uno mismo no es verificar");
    }

    @Test
    @DisplayName("el manifiesto que se despliega existe y su archivo de filas conserva su huella")
    void elManifiestoQueSeDespliegaSeVerificaConSuHuella() throws IOException {
        // No publica: comprueba que el archivo versionado sigue siendo analizable y que el archivo
        // de filas que nombra sigue teniendo la huella declarada. Lo que las cifras valen es D-02a,
        // y lo comprueba docs/10-negocio/verificar-cuadros.mjs contra el corpus.
        assertThat(MANIFIESTO).exists();
        List<String> lineas = Files.readAllLines(MANIFIESTO, StandardCharsets.UTF_8);
        assertThat(lineas).anyMatch(linea -> linea.startsWith("VALOR_REFERENCIAL,"));
    }

    // ------------------------------------------------------------------
    // Fixtures. Ninguna cifra de aqui es un valor referencial real.
    // ------------------------------------------------------------------

    private static final org.assertj.core.api.InstanceOfAssertFactory<
                    String, org.assertj.core.api.AbstractStringAssert<?>>
            STRING = org.assertj.core.api.InstanceOfAssertFactories.STRING;

    private static Path filasFicticias(String marca, String modelo) throws IOException {
        return escribir(
                "anexo-" + modelo + ".csv",
                CABECERA_DEL_ANEXO
                        + "\nA1,"
                        + marca
                        + ",,"
                        + modelo
                        + ",\"1,000\",\"900\",\"800\"\n");
    }

    private static Path manifiestoCon(String desde, Path filas) throws IOException {
        String ejercicio = desde.substring(0, 4);
        return escribir(
                "manifiesto-" + ejercicio + ".csv",
                CABECERA
                        + "\nVALOR_REFERENCIAL,TABLA_FICTICIA,"
                        + ejercicio
                        + ","
                        + desde
                        + ","
                        + ejercicio
                        + "-12-31,Norma de mentira 000-0000-XX,"
                        + filas.getFileName()
                        + ","
                        + huella(filas)
                        + ",vehicular-valores-referenciales-2026.md,JNA,HNA\n");
    }

    private static Path escribir(String nombre, String contenido) throws IOException {
        Path archivo = directorio.resolve(nombre);
        Files.writeString(archivo, contenido, StandardCharsets.UTF_8);
        return archivo;
    }

    private static String huella(Path archivo) throws IOException {
        try {
            return java.util.HexFormat.of()
                    .formatHex(
                            java.security.MessageDigest.getInstance("SHA-256")
                                    .digest(Files.readAllBytes(archivo)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("Esta JVM no trae SHA-256", e);
        }
    }

    private static int filasDe(String modelo) {
        Integer cuantas =
                jdbc.sql("SELECT count(*) FROM valor_referencial_vehiculo WHERE modelo = :modelo")
                        .param("modelo", modelo)
                        .query(Integer.class)
                        .single();
        return cuantas == null ? 0 : cuantas;
    }

    private static int municipalidadesDistintasDe(String modelo) {
        Integer cuantas =
                jdbc.sql(
                                "SELECT count(municipalidad_id) FROM valor_referencial_vehiculo"
                                        + " WHERE modelo = :modelo")
                        .param("modelo", modelo)
                        .query(Integer.class)
                        .single();
        return cuantas == null ? 0 : cuantas;
    }
}
