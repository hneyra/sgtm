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
import pe.gob.sgtm.catastro.dominio.Manzana;
import pe.gob.sgtm.catastro.dominio.Sector;
import pe.gob.sgtm.catastro.infraestructura.CatastroRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/** Mismo patron que {@link RegistrarViaTest}. Ver su javadoc para el porque de cada eleccion. */
@DisplayName("Caso de uso: registrar manzana por el codigo de su sector, con su auditoria")
class RegistrarManzanaTest {

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static RegistrarSector registrarSector;
    private static RegistrarManzana registrarManzana;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("230102", "Municipalidad del caso de uso (manzana)");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        Clock reloj = Clock.fixed(Instant.parse("2026-08-20T10:00:00Z"), ZoneId.of("America/Lima"));
        CatastroRepositoryJdbc repositorio = new CatastroRepositoryJdbc(jdbc);
        AuditoriaJdbc auditoria = new AuditoriaJdbc(jdbc, reloj);

        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        registrarSector =
                (RegistrarSector) proxy(new RegistrarSector(repositorio, auditoria, reloj), gestor);
        registrarManzana =
                (RegistrarManzana)
                        proxy(new RegistrarManzana(repositorio, auditoria, reloj), gestor);
    }

    private static Object proxy(Object objetivo, TenantTransactionManager gestor) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return fabrica.getProxy();
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
    @DisplayName("el alta resuelve el sector por su codigo y deja la manzana con su auditoria")
    void elAltaResuelveElSectorPorSuCodigo() throws SQLException {
        registrarSector.registrar(
                sectorNuevo("MZ-SEC-1"), Observacion.de("Alta del sector para la manzana"));

        Manzana guardada =
                registrarManzana.registrarPorCodigoDeSector(
                        "MZ-SEC-1", "001", Observacion.de("Alta por carga inicial"));

        assertThat(guardada.id()).isNotNull();
        try (Connection admin = base.conexionAdmin();
                PreparedStatement sentencia =
                        admin.prepareStatement(
                                "SELECT operacion FROM auditoria"
                                        + " WHERE tabla = 'manzana' AND clave = ?")) {
            sentencia.setString(1, String.valueOf(guardada.id()));
            try (ResultSet fila = sentencia.executeQuery()) {
                assertThat(fila.next()).isTrue();
                assertThat(fila.getString(1)).isEqualTo("ALTA");
            }
        }
    }

    @Test
    @DisplayName("un sector que no existe se rechaza sin escribir nada")
    void unSectorQueNoExisteSeRechazaSinEscribirNada() throws SQLException {
        long antes = contar("SELECT count(*) FROM auditoria WHERE tabla = 'manzana'");

        assertThatThrownBy(
                        () ->
                                registrarManzana.registrarPorCodigoDeSector(
                                        "MZ-INEXISTENTE",
                                        "001",
                                        Observacion.de("No deberia llegar a escribirse")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("MZ-INEXISTENTE");

        assertThat(contar("SELECT count(*) FROM auditoria WHERE tabla = 'manzana'"))
                .isEqualTo(antes);
    }

    private static Sector sectorNuevo(String codigo) {
        return Sector.nuevo(codigo, "Sector " + codigo);
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
