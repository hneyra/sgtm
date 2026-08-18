package pe.gob.sgtm.esquema;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;

/**
 * Provisiona la base de la prueba tal como se provisiona un ambiente real:
 *
 * <ol>
 *   <li>con la conexion de superusuario, crea los cuatro roles de ARQ-03 §4 y les asigna una clave
 *       generada al vuelo;
 *   <li>migra con Flyway conectado como {@code sgtm_owner}, que es el unico rol con DDL;
 *   <li>a partir de ahi entrega conexiones por rol.
 * </ol>
 *
 * <p>El orden importa: las politicas de V6 nombran a {@code sgtm_owner} y a {@code
 * rol_carga_parametros}, asi que los roles tienen que existir antes de la primera migracion.
 */
public final class BaseDeDatosDePrueba implements AutoCloseable {

    public static final String OWNER = "sgtm_owner";
    public static final String APP = "sgtm_app";
    public static final String READONLY = "sgtm_readonly";
    public static final String CARGA_PARAMETROS = "rol_carga_parametros";

    private final MotorPostgres motor;
    private final Map<String, String> claves = new HashMap<>();

    private BaseDeDatosDePrueba(MotorPostgres motor) {
        this.motor = motor;
    }

    /**
     * Se captura {@code RuntimeException} para cerrar el motor y volver a lanzar: si el arranque
     * falla a medias, dejar el contenedor o la base creados haria que la siguiente corrida fallara
     * por un motivo distinto al real.
     */
    @SuppressWarnings("checkstyle:IllegalCatch")
    public static BaseDeDatosDePrueba provisionar() throws SQLException, IOException {
        BaseDeDatosDePrueba base = new BaseDeDatosDePrueba(MotorPostgres.iniciar());
        try {
            base.crearRoles();
            base.migrar();
            return base;
        } catch (RuntimeException | SQLException | IOException e) {
            base.close();
            throw e;
        }
    }

    /** URL JDBC del motor, para quien necesite armar su propio pool. */
    public String url() {
        return motor.url();
    }

    /** Clave efimera del rol, generada en el arranque de la prueba. */
    public String clave(String rol) {
        return claves.get(rol);
    }

    /** Conexion de superusuario. Solo para provisionar y para consultar el catalogo. */
    public Connection conexionAdmin() throws SQLException {
        return DriverManager.getConnection(motor.url(), motor.usuarioAdmin(), motor.claveAdmin());
    }

    /**
     * Conexion como un rol de la aplicacion, sin autocommit: el contexto de tenant se fija con
     * {@code SET LOCAL} y eso exige una transaccion abierta.
     */
    public Connection conexion(String rol) throws SQLException {
        Connection conexion = DriverManager.getConnection(motor.url(), rol, claves.get(rol));
        conexion.setAutoCommit(false);
        return conexion;
    }

    private void crearRoles() throws SQLException, IOException {
        String guion = leerRecurso("/db/roles/crear-roles.sql");
        try (Connection admin = conexionAdmin();
                Statement sentencia = admin.createStatement()) {
            sentencia.execute(guion);
            for (String rol : new String[] {OWNER, APP, READONLY, CARGA_PARAMETROS}) {
                // Clave efimera: no hay secretos versionados ni reutilizados entre corridas.
                String clave = UUID.randomUUID().toString().replace("-", "");
                claves.put(rol, clave);
                sentencia.execute("ALTER ROLE " + rol + " LOGIN PASSWORD '" + clave + "'");
            }
        }
    }

    private void migrar() {
        Flyway.configure()
                .dataSource(motor.url(), OWNER, claves.get(OWNER))
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    private static String leerRecurso(String ruta) throws IOException {
        try (InputStream entrada = BaseDeDatosDePrueba.class.getResourceAsStream(ruta)) {
            if (entrada == null) {
                throw new IllegalStateException("No se encontro el recurso " + ruta);
            }
            return new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Override
    public void close() {
        motor.close();
    }
}
