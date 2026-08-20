package pe.gob.sgtm.esquema;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * El proceso que aplica el esquema en un despliegue (ARQ-03 §4).
 *
 * <p>Corre contra un PostgreSQL real y no contra una base en memoria por el mismo motivo que la
 * prueba de aislamiento: lo que se verifica aqui son roles, privilegios y catalogo del motor, y
 * nada de eso existe fuera de PostgreSQL (CAL-01 §2).
 *
 * <p>Cada prueba levanta su propio motor porque <b>los roles son del cluster, no de la base</b>: la
 * de «faltan los roles» necesita un cluster donde no existan, y la de «no lo migra un superusuario»
 * necesita uno donde si.
 */
@DisplayName("ARQ-03 §4 — El migrador del esquema")
class MigradorTest {

    @Test
    @DisplayName("aplica todas las migraciones del repositorio, y la segunda vez no aplica ninguna")
    void aplicaTodasYEsIdempotente() throws SQLException, IOException {
        try (BaseDeDatosDePrueba base = BaseDeDatosDePrueba.provisionar()) {
            // provisionar() ya migro con el mismo Migrador que usa el despliegue.
            assertThat(migracionesRegistradas(base))
                    .as(
                            "el esquema desplegado tiene que traer todas las migraciones del"
                                    + " repositorio: una `locations` mal escrita deja la base a medias"
                                    + " sin que nada falle")
                    .isEqualTo(migracionesEnElRepositorio());

            int segundaVez =
                    Migrador.migrar(
                            base.url(),
                            BaseDeDatosDePrueba.OWNER,
                            base.clave(BaseDeDatosDePrueba.OWNER));

            assertThat(segundaVez)
                    .as(
                            "el paso de migracion corre en cada despliegue: sobre un esquema al dia"
                                    + " no puede hacer nada")
                    .isZero();
        }
    }

    @Test
    @DisplayName("sin los cuatro roles se niega a migrar, y dice cuales faltan y como se crean")
    void sinLosRolesSeNiega() {
        try (MotorPostgres motor = MotorPostgres.iniciar()) {
            // Deliberadamente NO se ejecuta crear-roles.sql. Migrar aqui fallaria a
            // mitad de camino, en V6, con un error sobre un rol inexistente que no se
            // parece a su causa.
            assertThatThrownBy(
                            () ->
                                    Migrador.migrar(
                                            motor.url(), motor.usuarioAdmin(), motor.claveAdmin()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("sgtm_owner")
                    .hasMessageContaining("sgtm_app")
                    .hasMessageContaining("rol_carga_parametros")
                    .hasMessageContaining("crear-roles.sql");
        }
    }

    @Test
    @DisplayName("un superusuario no puede migrar, aunque los roles existan")
    void unSuperusuarioNoPuedeMigrar() throws SQLException, IOException {
        try (MotorPostgres motor = MotorPostgres.iniciar()) {
            crearRoles(motor);

            // El usuario administrador de un PostgreSQL recien levantado es superusuario:
            // es exactamente la conexion que uno tiene a mano al provisionar, y por eso
            // es la que hay que rechazar. Un esquema creado con ella no es el esquema
            // sobre el que la prueba de aislamiento demuestra nada.
            assertThatThrownBy(
                            () ->
                                    Migrador.migrar(
                                            motor.url(), motor.usuarioAdmin(), motor.claveAdmin()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("SUPERUSER")
                    .hasMessageContaining("ARQ-03");
        }
    }

    @Test
    @DisplayName("no admite argumentos: una clave en la linea de comandos queda en el historial")
    void noAdmiteArgumentos() {
        assertThatThrownBy(() -> Migrador.main(new String[] {"jdbc:postgresql://x/y"}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SGTM_DB_URL");
    }

    // ------------------------------------------------------------------

    private static void crearRoles(MotorPostgres motor) throws SQLException, IOException {
        String guion;
        try (InputStream entrada =
                MigradorTest.class.getResourceAsStream("/db/roles/crear-roles.sql")) {
            guion = new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (Connection admin =
                        DriverManager.getConnection(
                                motor.url(), motor.usuarioAdmin(), motor.claveAdmin());
                Statement sentencia = admin.createStatement()) {
            sentencia.execute(guion);
            sentencia.execute(
                    "ALTER ROLE sgtm_owner LOGIN PASSWORD '"
                            + UUID.randomUUID().toString().replace("-", "")
                            + "'");
        }
    }

    private static int migracionesRegistradas(BaseDeDatosDePrueba base) throws SQLException {
        try (Connection admin = base.conexionAdmin();
                Statement sentencia = admin.createStatement();
                ResultSet fila =
                        sentencia.executeQuery(
                                "SELECT count(*) FROM flyway_schema_history WHERE success")) {
            fila.next();
            return fila.getInt(1);
        }
    }

    private static int migracionesEnElRepositorio() throws IOException {
        try (var rutas =
                java.nio.file.Files.list(
                        java.nio.file.Path.of("src/main/resources/db/migration"))) {
            return (int)
                    rutas.filter(ruta -> ruta.getFileName().toString().endsWith(".sql")).count();
        }
    }
}
