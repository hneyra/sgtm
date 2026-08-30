package pe.gob.sgtm.esquema;

import java.util.Locale;
import java.util.UUID;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Resuelve el PostgreSQL contra el que corre la prueba de aislamiento.
 *
 * <p>Por omision levanta un contenedor con Testcontainers, que es lo que exige CAL-01 §2: una base
 * en memoria no tiene RLS y daria falsos verdes.
 *
 * <p>Admite apuntar a un PostgreSQL ya existente mediante {@code sgtm.pruebas.postgres.url} (o la
 * variable de entorno {@code SGTM_PRUEBAS_POSTGRES_URL}) para los entornos donde no se puede
 * descargar la imagen. Lo que NO admite es saltarse la prueba: sin motor, falla. Una prueba
 * bloqueante que se omite sola es peor que no tenerla, porque el build queda verde.
 *
 * <p>La conexion que entrega este objeto es de <b>superusuario</b> y sirve solo para provisionar.
 * Ninguna verificacion de aislamiento debe usarla: un superusuario omite RLS incluso con {@code
 * FORCE ROW LEVEL SECURITY} (DAT-01 §0, hallazgo 1).
 */
public final class MotorPostgres implements AutoCloseable {

    /**
     * La misma PostgreSQL 16 con PostGIS dentro (ADR-0021): {@code crear-roles.sql} instala la
     * extension antes de la primera migracion, y {@code postgres:16-alpine} no la trae, asi que con
     * esa imagen el aprovisionamiento falla con «extension "postgis" is not available».
     */
    private static final String IMAGEN_POR_OMISION = "postgis/postgis:16-3.4-alpine";

    private final PostgreSQLContainer<?> contenedor;
    private final String url;
    private final String usuarioAdmin;
    private final String claveAdmin;
    private String urlDeMantenimiento;
    private String nombreDeLaBase;

    private MotorPostgres(
            PostgreSQLContainer<?> contenedor, String url, String usuario, String clave) {
        this.contenedor = contenedor;
        this.url = url;
        this.usuarioAdmin = usuario;
        this.claveAdmin = clave;
    }

    public static MotorPostgres iniciar() {
        String urlExterna = ajuste("sgtm.pruebas.postgres.url");
        if (urlExterna != null && !urlExterna.isBlank()) {
            return conMotorExterno(
                    urlExterna,
                    obligatorio("sgtm.pruebas.postgres.usuario"),
                    obligatorio("sgtm.pruebas.postgres.clave"));
        }
        String imagen = ajuste("sgtm.pruebas.postgres.imagen");
        PostgreSQLContainer<?> contenedor =
                new PostgreSQLContainer<>(
                        nombreDeImagen(
                                imagen == null || imagen.isBlank() ? IMAGEN_POR_OMISION : imagen));
        contenedor.start();
        return new MotorPostgres(
                contenedor,
                contenedor.getJdbcUrl(),
                contenedor.getUsername(),
                contenedor.getPassword());
    }

    /**
     * El nombre de la imagen, declarando la compatibilidad de PostGIS con {@code postgres}.
     *
     * <p>{@code PostgreSQLContainer} exige que la imagen se llame {@code postgres} o que se declare
     * sustituta suya, y {@code postgis/postgis} no se llama asi: sin esto, cada prueba de base
     * muere en su {@code @BeforeAll} con «Failed to verify that image … is a compatible substitute
     * for 'postgres'», que no se parece en nada a su causa.
     *
     * <p>La declaracion es <b>solo para las imagenes de PostGIS</b>, y no un {@code
     * asCompatibleSubstituteFor} indiscriminado: la comprobacion de Testcontainers existe para
     * atrapar una imagen que no es PostgreSQL, y desactivarla del todo cambiaria un fallo claro por
     * uno raro. {@code postgis/postgis} SI es la PostgreSQL oficial con extensiones encima, que es
     * exactamente el caso que Testcontainers pide declarar.
     */
    private static DockerImageName nombreDeImagen(String imagen) {
        DockerImageName nombre = DockerImageName.parse(imagen);
        return imagen.startsWith("postgis/postgis")
                ? nombre.asCompatibleSubstituteFor("postgres")
                : nombre;
    }

    public String url() {
        return url;
    }

    public String usuarioAdmin() {
        return usuarioAdmin;
    }

    public String claveAdmin() {
        return claveAdmin;
    }

    @Override
    public void close() {
        if (contenedor != null) {
            contenedor.stop();
            return;
        }
        if (urlDeMantenimiento != null) {
            ejecutar(
                    urlDeMantenimiento,
                    "DROP DATABASE IF EXISTS " + nombreDeLaBase + " WITH (FORCE)",
                    "No se pudo borrar la base de prueba " + nombreDeLaBase);
        }
    }

    /**
     * Crea una base nueva para esta corrida sobre un motor ya existente.
     *
     * <p>Testcontainers entrega un motor limpio por contenedor. Sin esto, la salida de emergencia
     * no daria la misma garantia: dos modulos de prueba apuntando a la misma URL compartirian base,
     * se pisarian las migraciones y los datos sembrados, y el fallo apareceria como un choque de
     * claves unicas en lugar de como lo que es.
     */
    private static MotorPostgres conMotorExterno(String urlBase, String usuario, String clave) {
        String nombre = "sgtm_prueba_" + UUID.randomUUID().toString().substring(0, 8);
        ejecutar(
                urlBase,
                "CREATE DATABASE " + nombre,
                "No se pudo crear la base de prueba " + nombre,
                usuario,
                clave);
        MotorPostgres motor =
                new MotorPostgres(null, reemplazarBaseDeDatos(urlBase, nombre), usuario, clave);
        motor.urlDeMantenimiento = urlBase;
        motor.nombreDeLaBase = nombre;
        return motor;
    }

    /** Cambia el nombre de la base en una URL JDBC, conservando host, puerto y parametros. */
    static String reemplazarBaseDeDatos(String url, String nombre) {
        int inicioDeParametros = url.indexOf('?');
        String sinParametros = inicioDeParametros < 0 ? url : url.substring(0, inicioDeParametros);
        String parametros = inicioDeParametros < 0 ? "" : url.substring(inicioDeParametros);
        int ultimaBarra = sinParametros.lastIndexOf('/');
        if (ultimaBarra < 0) {
            throw new IllegalArgumentException("URL JDBC sin nombre de base: " + url);
        }
        return sinParametros.substring(0, ultimaBarra + 1) + nombre + parametros;
    }

    private void ejecutar(String url, String sentencia, String mensaje) {
        ejecutar(url, sentencia, mensaje, usuarioAdmin, claveAdmin);
    }

    private static void ejecutar(
            String url, String sentencia, String mensaje, String usuario, String clave) {
        try (java.sql.Connection conexion =
                        java.sql.DriverManager.getConnection(url, usuario, clave);
                java.sql.Statement statement = conexion.createStatement()) {
            statement.execute(sentencia);
        } catch (java.sql.SQLException e) {
            throw new IllegalStateException(mensaje, e);
        }
    }

    private static String ajuste(String nombre) {
        String valor = System.getProperty(nombre);
        if (valor != null) {
            return valor;
        }
        return System.getenv(nombre.toUpperCase(Locale.ROOT).replace('.', '_'));
    }

    private static String obligatorio(String nombre) {
        String valor = ajuste(nombre);
        if (valor == null || valor.isBlank()) {
            throw new IllegalStateException(
                    "Falta "
                            + nombre
                            + ": al fijar sgtm.pruebas.postgres.url hay que dar tambien"
                            + " usuario y clave de un rol con privilegios de superusuario");
        }
        return valor;
    }
}
