package pe.gob.sgtm.auditoria.infraestructura;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.OrigenContext;
import pe.gob.sgtm.compartido.OrigenPeticion;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.DatosDePrueba;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * El mecanismo de auditoria obligatoria (ADR-0008), contra PostgreSQL de verdad.
 *
 * <p>Mismo patron que {@code ViaRepositoryJdbcTest}: prohibida la base en memoria (H2 no tiene
 * RLS), conexion como {@code sgtm_app} y no como superusuario, y la primera asercion es
 * precisamente que el usuario conectado es el correcto.
 *
 * <p>El reloj es fijo —2026, ejercicio con particion ya creada en V5— para que el ejercicio de cada
 * registro no dependa de en que dia corre el build.
 */
@DisplayName("ADR-0008 — Auditoria obligatoria con observacion")
class AuditoriaServiceJdbcTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-03-01T10:15:00Z"), ZoneOffset.UTC);

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;

    private static TransactionTemplate transaccion;
    private static AuditoriaServiceJdbc auditoria;

    /** Para las preguntas que el servicio no expone, y no deberia exponer. */
    private static JdbcClient jdbc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = DatosDePrueba.crearMunicipalidad(base, "200201", "Municipalidad A");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        transaccion = new TransactionTemplate(new TenantTransactionManager(pool));
        auditoria = new AuditoriaServiceJdbc(jdbc, RELOJ);
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("la prueba se conecta como sgtm_app, no como superusuario")
    void seConectaComoSgtmApp() {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        fijarOrigen("usuario-prueba", "PC-01", "10.0.0.5");

        String usuario =
                transaccion.execute(
                        estado -> jdbc.sql("SELECT current_user").query(String.class).single());

        assertThat(usuario)
                .as("con superusuario, RLS se omite y todo lo de abajo pasaria sin verificar nada")
                .isEqualTo(BaseDeDatosDePrueba.APP);
    }

    @Test
    @DisplayName("una escritura con observacion deja exactamente una fila, con IP y equipo")
    void unaEscrituraConObservacionDejaUnaFilaConIpYEquipo() throws SQLException {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        fijarOrigen("usuario-41", "PC-CAJA-03", "10.20.30.40");
        String clave = "alta-" + System.nanoTime();

        transaccion.executeWithoutResult(
                estado ->
                        auditoria.registrar(
                                new RegistroDeAuditoria(
                                        "via",
                                        clave,
                                        Operacion.ALTA,
                                        Observacion.de("alta manual de la via de prueba"),
                                        null,
                                        null)));

        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT usuario_id, origen_equipo, host(origen_ip) AS origen_ip,"
                                        + " observacion"
                                        + " FROM auditoria"
                                        + " WHERE municipalidad_id = ? AND tabla = 'via' AND clave"
                                        + " = ?")) {
            sentencia.setLong(1, municipalidadA);
            sentencia.setString(2, clave);
            try (ResultSet filas = sentencia.executeQuery()) {
                assertThat(filas.next()).as("debe existir exactamente una fila").isTrue();
                assertThat(filas.getString("usuario_id")).isEqualTo("usuario-41");
                assertThat(filas.getString("origen_equipo")).isEqualTo("PC-CAJA-03");
                assertThat(filas.getString("origen_ip")).isEqualTo("10.20.30.40");
                assertThat(filas.getString("observacion"))
                        .isEqualTo("alta manual de la via de prueba");
                assertThat(filas.next()).as("y solo una").isFalse();
            }
        }
    }

    @Test
    @DisplayName("RF-133: una escritura sin observacion deshace la operacion compuesta completa")
    void unaEscrituraSinObservacionDeshaceLaOperacionCompuesta() throws SQLException {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        fijarOrigen("usuario-42", "PC-CAJA-04", "10.20.30.41");
        String codigo = "VIA-COMPUESTA-" + System.nanoTime();

        assertThatThrownBy(
                        () ->
                                transaccion.executeWithoutResult(
                                        estado -> {
                                            jdbc.sql(
                                                            "INSERT INTO via (municipalidad_id,"
                                                                    + " codigo, tipo_via, nombre)"
                                                                    + " VALUES"
                                                                    + " (current_setting('app.municipalidad_id')::bigint,"
                                                                    + " :codigo, 'CALLE', :nombre)")
                                                    .param("codigo", codigo)
                                                    .param("nombre", "Calle de la operacion")
                                                    .update();

                                            // Bypasea el tipo Observacion a proposito, insertando
                                            // directo por JDBC una fila con menos de cinco
                                            // caracteres: demuestra que el CHECK de la base
                                            // defiende igual si algun dia el codigo lo bypasea,
                                            // no solo el constructor de Observacion.
                                            jdbc.sql(
                                                            "INSERT INTO auditoria"
                                                                    + " (municipalidad_id,"
                                                                    + " ejercicio, tabla, clave,"
                                                                    + " operacion, usuario_id,"
                                                                    + " observacion)"
                                                                    + " VALUES"
                                                                    + " (current_setting('app.municipalidad_id')::bigint,"
                                                                    + " 2026, 'via', :codigo,"
                                                                    + " 'ALTA', 'usuario-42',"
                                                                    + " 'ab')")
                                                    .param("codigo", codigo)
                                                    .update();
                                        }))
                .as("el CHECK de longitud minima de la observacion arrastra toda la transaccion")
                .isNotNull();

        assertThat(existeVia(municipalidadA, codigo))
                .as("ni la via de la primera mitad de la operacion...")
                .isFalse();
        assertThat(contarAuditoria(municipalidadA, "via", codigo))
                .as("...ni ninguna fila de auditoria de la segunda")
                .isZero();
    }

    @Test
    @DisplayName("sgtm_app no puede actualizar ni borrar auditoria")
    void sgtmAppNoPuedeActualizarNiBorrarAuditoria() {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        fijarOrigen("usuario-43", "PC-CAJA-05", "10.20.30.42");

        assertThatThrownBy(
                        () ->
                                transaccion.executeWithoutResult(
                                        estado ->
                                                jdbc.sql(
                                                                "UPDATE auditoria SET observacion"
                                                                        + " = 'otra cosa'")
                                                        .update()))
                .as("V7: la aplicacion tiene SELECT e INSERT sobre auditoria, nunca UPDATE")
                .hasMessageContaining("auditoria");

        assertThatThrownBy(
                        () ->
                                transaccion.executeWithoutResult(
                                        estado -> jdbc.sql("DELETE FROM auditoria").update()))
                .as("V7: tampoco DELETE (regla 4)")
                .hasMessageContaining("auditoria");
    }

    @Test
    @DisplayName("un cambio de permisos deja su fila de auditoria con Operacion.PERMISO")
    void unCambioDePermisosDejaSuFilaDeAuditoria() throws SQLException {
        // La tabla permiso real es de #12; este es el gancho que usara: demuestra
        // que AuditoriaService.registrar con Operacion.PERMISO escribe la fila
        // correctamente, sin depender de que la tabla exista todavia (ADR-0008 §5).
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        fijarOrigen("admin-seguridad", "PC-ADMIN-01", "10.0.0.99");
        String clave = "permiso-" + System.nanoTime();

        transaccion.executeWithoutResult(
                estado ->
                        auditoria.registrar(
                                new RegistroDeAuditoria(
                                        "permiso",
                                        clave,
                                        Operacion.PERMISO,
                                        Observacion.de(
                                                "se otorga registro sobre contribuyentes al grupo"
                                                        + " cajeros"),
                                        null,
                                        null)));

        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT operacion FROM auditoria"
                                        + " WHERE municipalidad_id = ? AND tabla = 'permiso' AND"
                                        + " clave = ?")) {
            sentencia.setLong(1, municipalidadA);
            sentencia.setString(2, clave);
            try (ResultSet filas = sentencia.executeQuery()) {
                assertThat(filas.next()).isTrue();
                assertThat(filas.getString("operacion")).isEqualTo("PERMISO");
            }
        }
    }

    // ------------------------------------------------------------------

    private static void fijarOrigen(String usuarioId, String equipo, String ip) {
        OrigenContext.fijar(new OrigenPeticion(usuarioId, equipo, ip));
    }

    private static boolean existeVia(long municipalidadId, String codigo) throws SQLException {
        return contar(
                        "SELECT count(*) FROM via WHERE municipalidad_id = "
                                + municipalidadId
                                + " AND codigo = '"
                                + codigo
                                + "'")
                > 0;
    }

    private static long contarAuditoria(long municipalidadId, String tabla, String clave)
            throws SQLException {
        return contar(
                "SELECT count(*) FROM auditoria"
                        + " WHERE municipalidad_id = "
                        + municipalidadId
                        + " AND tabla = '"
                        + tabla
                        + "' AND clave = '"
                        + clave
                        + "'");
    }

    private static long contar(String sql) throws SQLException {
        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia = admin.prepareStatement(sql);
                ResultSet resultado = sentencia.executeQuery()) {
            resultado.next();
            return resultado.getLong(1);
        }
    }
}
