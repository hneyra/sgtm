package pe.gob.sgtm.seguridad.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.seguridad.dominio.Permiso;
import pe.gob.sgtm.seguridad.dominio.Privilegio;
import pe.gob.sgtm.seguridad.infraestructura.PermisoRepositoryJdbc;

/**
 * ADR-0008 §5: <b>la configuracion de permisos tambien se audita.</b>
 *
 * <p>El manual no lo pide, y es la unica adicion que este proyecto le hace a su modelo de
 * auditoria. El motivo cabe en una frase: sin esto, quien administra la seguridad puede otorgarse
 * un privilegio, usarlo y quitarselo, y la pista de auditoria —completa en todo lo demas— no
 * mostraria nada raro.
 */
@DisplayName("ADR-0008 §5 — El cambio de permisos deja auditoria")
class OtorgarPermisoTest {

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long accesoId;
    private static long grupoId;
    private static OtorgarPermiso otorgarPermiso;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("230101", "Municipalidad de seguridad");
        sembrarModuloAccesoYGrupo();

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        Clock reloj = Clock.fixed(Instant.parse("2026-08-18T10:00:00Z"), ZoneId.of("America/Lima"));

        OtorgarPermiso objetivo =
                new OtorgarPermiso(new PermisoRepositoryJdbc(jdbc), new AuditoriaJdbc(jdbc), reloj);

        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(
                        new TenantTransactionManager(pool),
                        new AnnotationTransactionAttributeSource()));
        otorgarPermiso = (OtorgarPermiso) fabrica.getProxy();
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @BeforeEach
    void fijarContexto() {
        TenantContext.fijar(new MunicipalidadId(municipalidad));
        OrigenContext.fijar(new Origen("admin.seguridad", "PC-TI-01", "10.9.9.9"));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("otorgar privilegios a un grupo deja su fila de auditoria, con operacion PERMISO")
    void otorgarDejaAuditoria() throws SQLException {
        Permiso guardado =
                otorgarPermiso.otorgar(
                        Permiso.paraGrupo(
                                accesoId,
                                grupoId,
                                Privilegio.LECTURA,
                                Privilegio.REGISTRO,
                                Privilegio.IMPRESION),
                        Observacion.de("Alta del grupo Mesa de Partes segun memorando 2026-31"));

        assertThat(guardado.id()).isNotNull();

        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT operacion, observacion, usuario_id, datos_nuevos"
                                        + " FROM auditoria WHERE tabla = 'permiso' AND clave = ?")) {
            sentencia.setString(1, String.valueOf(guardado.id()));
            try (ResultSet fila = sentencia.executeQuery()) {
                assertThat(fila.next()).as("el cambio de permisos dejo auditoria").isTrue();
                assertThat(fila.getString(1)).isEqualTo("PERMISO");
                assertThat(fila.getString(2)).contains("memorando 2026-31");
                assertThat(fila.getString(3)).isEqualTo("admin.seguridad");
                assertThat(fila.getString(4))
                        .as("y dice que privilegios quedaron otorgados")
                        .contains("LECTURA")
                        .contains("REGISTRO")
                        .contains("IMPRESION")
                        .doesNotContain("ESPECIAL");
                assertThat(fila.next()).isFalse();
            }
        }
    }

    @Test
    @DisplayName("los siete privilegios se escriben siempre: lo no otorgado queda en falso")
    void losSietePrivilegiosSeEscribenSiempre() throws SQLException {
        Permiso guardado =
                otorgarPermiso.otorgar(
                        Permiso.paraGrupo(accesoId, crearGrupo("Solo lectura"), Privilegio.LECTURA),
                        Observacion.de("Grupo de consulta, sin capacidad de escribir"));

        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT ejecucion, lectura, registro, modificacion, eliminacion,"
                                        + " impresion, especial FROM permiso WHERE id = ?")) {
            sentencia.setLong(1, guardado.id());
            try (ResultSet fila = sentencia.executeQuery()) {
                assertThat(fila.next()).isTrue();
                assertThat(fila.getBoolean("lectura")).isTrue();
                // Un UPDATE que solo tocara los privilegios presentes dejaria activo
                // lo que el administrador acaba de quitar de la pantalla, y ese es el
                // defecto que no se nota hasta que alguien entra donde no debia.
                assertThat(fila.getBoolean("ejecucion")).isFalse();
                assertThat(fila.getBoolean("registro")).isFalse();
                assertThat(fila.getBoolean("modificacion")).isFalse();
                assertThat(fila.getBoolean("eliminacion")).isFalse();
                assertThat(fila.getBoolean("impresion")).isFalse();
                assertThat(fila.getBoolean("especial")).isFalse();
            }
        }
    }

    @Test
    @DisplayName("un permiso se otorga a un grupo o a un usuario, nunca a los dos")
    void unPermisoNoEsDeGrupoYDeUsuarioALaVez() {
        assertThat(
                        org.assertj.core.api.Assertions.catchThrowable(
                                () ->
                                        new Permiso(
                                                null,
                                                accesoId,
                                                grupoId,
                                                7L,
                                                java.util.Set.of(Privilegio.LECTURA))))
                .as(
                        "la ambiguedad en una tabla de autorizacion se resuelve a favor de quien no"
                                + " debia entrar")
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static void sembrarModuloAccesoYGrupo() throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            long moduloId =
                    insertar(
                            app,
                            "INSERT INTO modulo_sistema (municipalidad_id, codigo, nombre)"
                                    + " VALUES (?, 'CATASTRO', 'Catastro') RETURNING id",
                            municipalidad);
            accesoId =
                    insertar(
                            app,
                            "INSERT INTO acceso (municipalidad_id, modulo_id, tipo, codigo, nombre)"
                                    + " VALUES (?, ?, 'OPCION_MENU', 'ficha_urbana',"
                                    + "         'Ficha catastral urbana') RETURNING id",
                            municipalidad,
                            moduloId);
            grupoId =
                    insertar(
                            app,
                            "INSERT INTO grupo (municipalidad_id, nombre)"
                                    + " VALUES (?, 'Mesa de Partes') RETURNING id",
                            municipalidad);
            app.commit();
        }
    }

    private static long crearGrupo(String nombre) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            long id =
                    insertar(
                            app,
                            "INSERT INTO grupo (municipalidad_id, nombre) VALUES (?, ?) RETURNING id",
                            municipalidad,
                            nombre);
            app.commit();
            return id;
        }
    }

    private static long crearMunicipalidad(String ubigeo, String nombre) throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER)) {
            long id =
                    insertar(
                            owner,
                            "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                    + " VALUES (?, ?, 'DISTRITAL') RETURNING id",
                            ubigeo,
                            nombre);
            owner.commit();
            return id;
        }
    }

    private static long insertar(Connection conexion, String sql, Object... valores)
            throws SQLException {
        try (PreparedStatement sentencia = conexion.prepareStatement(sql)) {
            for (int i = 0; i < valores.length; i++) {
                sentencia.setObject(i + 1, valores[i]);
            }
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                return resultado.getLong(1);
            }
        }
    }
}
