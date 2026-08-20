package pe.gob.sgtm.catastro.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.infraestructura.CatastroRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * Mismo patron que {@link RegistrarViaTest}: el caso de uso, envuelto en un proxy transaccional de
 * verdad, contra PostgreSQL real. Ver su javadoc para el porque de cada eleccion.
 */
@DisplayName("Caso de uso: registrar sector, con su auditoria")
class RegistrarSectorTest {

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static RegistrarSector registrarSector;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("230101", "Municipalidad del caso de uso (sector)");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        Clock reloj = Clock.fixed(Instant.parse("2026-08-20T10:00:00Z"), ZoneId.of("America/Lima"));

        RegistrarSector objetivo =
                new RegistrarSector(
                        new CatastroRepositoryJdbc(jdbc), new AuditoriaJdbc(jdbc, reloj), reloj);

        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(
                        new TenantTransactionManager(pool),
                        new AnnotationTransactionAttributeSource()));
        registrarSector = (RegistrarSector) fabrica.getProxy();
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
        OrigenContext.fijar(new Origen("mtorres", "PC-CATASTRO-01", "10.1.1.9"));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("el alta deja el sector y su auditoria")
    void elAltaDejaElSectorYSuAuditoria() throws SQLException {
        Sector guardado =
                registrarSector.registrar(
                        Sector.nuevo("SC-100", "Sector Centro"),
                        Observacion.de("Alta por carga inicial del catalogo territorial"));

        assertThat(guardado.id()).isNotNull();

        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT operacion, observacion FROM auditoria"
                                        + " WHERE tabla = 'sector' AND clave = ?")) {
            sentencia.setString(1, String.valueOf(guardado.id()));
            try (ResultSet fila = sentencia.executeQuery()) {
                assertThat(fila.next()).isTrue();
                assertThat(fila.getString(1)).isEqualTo("ALTA");
                assertThat(fila.getString(2)).contains("carga inicial");
            }
        }
    }

    @Test
    @DisplayName("un segundo alta con el mismo codigo falla y no deja auditoria")
    void unSegundoAltaConElMismoCodigoFalla() throws SQLException {
        registrarSector.registrar(
                Sector.nuevo("SC-REPET", "Primero"),
                Observacion.de("Primera alta, esta si debe quedar"));

        long antes = contar("SELECT count(*) FROM auditoria WHERE tabla = 'sector'");

        assertThatThrownBy(
                        () ->
                                registrarSector.registrar(
                                        Sector.nuevo("SC-REPET", "Repetido a proposito"),
                                        Observacion.de("Segunda alta con codigo ya usado")))
                .isNotNull();

        assertThat(contar("SELECT count(*) FROM auditoria WHERE tabla = 'sector'"))
                .isEqualTo(antes);
    }

    private static long crearMunicipalidad(String ubigeo, String nombre) throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                        + " VALUES (?, ?, 'DISTRITAL') RETURNING id")) {
            sentencia.setString(1, ubigeo);
            sentencia.setString(2, nombre);
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                long id = resultado.getLong(1);
                owner.commit();
                return id;
            }
        }
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
