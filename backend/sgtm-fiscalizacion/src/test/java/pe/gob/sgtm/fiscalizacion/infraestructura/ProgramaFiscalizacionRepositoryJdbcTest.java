package pe.gob.sgtm.fiscalizacion.infraestructura;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDePrograma;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/** Los programas de fiscalización contra PostgreSQL de verdad, conectado como {@code sgtm_app}. */
@DisplayName("#45 — Programas de fiscalizacion")
class ProgramaFiscalizacionRepositoryJdbcTest {

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;
    private static TransactionTemplate transaccion;
    private static ProgramaFiscalizacionRepositoryJdbc repositorio;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = crearMunicipalidad("250501", "Municipalidad de programas A");
        municipalidadB = crearMunicipalidad("250502", "Municipalidad de programas B");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        transaccion = new TransactionTemplate(new TenantTransactionManager(pool));
        repositorio = new ProgramaFiscalizacionRepositoryJdbc(JdbcClient.create(pool));
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @BeforeEach
    void fijarOrigen() {
        OrigenContext.fijar(new Origen("jefe.fiscalizacion", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("un programa se guarda y se relee")
    void unProgramaSeGuardaYSeRelee() {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));

        ProgramaFiscalizacion guardado =
                transaccion.execute(
                        estado ->
                                repositorio.insertar(
                                        ProgramaFiscalizacion.nuevo(
                                                "PF-100",
                                                "Muestra por riesgo",
                                                TipoDePrograma.PREDIAL,
                                                LocalDate.of(2026, 2, 1),
                                                null)));

        Optional<ProgramaFiscalizacion> releido =
                transaccion.execute(estado -> repositorio.findById(guardado.id()));

        assertThat(releido).isPresent();
        assertThat(releido.get().codigo()).isEqualTo("PF-100");
        assertThat(releido.get().estado()).isEqualTo(EstadoDePrograma.ABIERTO);
    }

    @Test
    @DisplayName("la lectura por identificador no cruza la municipalidad")
    void laLecturaPorIdentificadorNoCruzaLaMunicipalidad() {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        ProgramaFiscalizacion guardadoEnA =
                transaccion.execute(
                        estado ->
                                repositorio.insertar(
                                        ProgramaFiscalizacion.nuevo(
                                                "PF-101",
                                                "Programa de A",
                                                TipoDePrograma.VEHICULAR,
                                                LocalDate.of(2026, 2, 1),
                                                null)));

        TenantContext.limpiar();
        TenantContext.fijar(new MunicipalidadId(municipalidadB));
        Optional<ProgramaFiscalizacion> desdeB =
                transaccion.execute(estado -> repositorio.findById(guardadoEnA.id()));

        assertThat(desdeB).isEmpty();
    }

    // ------------------------------------------------------------------

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
}
