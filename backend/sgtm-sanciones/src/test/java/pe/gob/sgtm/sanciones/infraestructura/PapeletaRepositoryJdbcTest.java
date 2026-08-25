package pe.gob.sgtm.sanciones.infraestructura;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Papeleta;

/**
 * Las papeletas de tránsito contra PostgreSQL de verdad, conectado como {@code sgtm_app} (#46).
 *
 * <p>El AC "reimprimir una papeleta de hace tres años devuelve los mismos seis importes" se
 * verifica aquí releyendo la fila tal cual quedó guardada: nada en el camino de lectura recalcula
 * nada.
 */
@DisplayName("#46 — Papeletas de transito")
class PapeletaRepositoryJdbcTest {

    private static final LocalDate FECHA = LocalDate.of(2023, 3, 15);

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;
    private static TransactionTemplate transaccion;
    private static PapeletaRepositoryJdbc repositorio;
    private static JdbcClient jdbc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = crearMunicipalidad("250601", "Municipalidad de papeletas A");
        municipalidadB = crearMunicipalidad("250602", "Municipalidad de papeletas B");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        transaccion = new TransactionTemplate(new TenantTransactionManager(pool));
        repositorio = new PapeletaRepositoryJdbc(jdbc);
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @BeforeEach
    void fijarOrigen() {
        OrigenContext.fijar(new Origen("inspector.transito", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Nested
    @DisplayName("Escritura")
    class Escritura {

        @Test
        @DisplayName("reimprimir devuelve los mismos seis importes, sin recalcular nada")
        void reimprimirDevuelveLosMismosSeisImportes() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            long codigoId = crearCodigo(municipalidadA, "G-0001");

            Papeleta guardada =
                    transaccion.execute(
                            estado -> repositorio.insertar(papeletaDe("PT-0001", codigoId)));

            Papeleta reimpresa =
                    transaccion.execute(estado -> repositorio.porNumero("PT-0001")).orElseThrow();

            assertThat(reimpresa.baseImponible()).isEqualTo(Dinero.de("4950"));
            assertThat(reimpresa.porcentajeInfraccion()).isEqualTo(Alicuota.de("8"));
            assertThat(reimpresa.importeInfraccion()).isEqualTo(Dinero.de("396"));
            assertThat(reimpresa.porcentajeACobrar()).isEqualTo(Alicuota.de("100"));
            assertThat(reimpresa.importeAPagar()).isEqualTo(Dinero.de("396"));
            assertThat(reimpresa.importeConBeneficio()).isEqualTo(Dinero.de("198"));
            assertThat(reimpresa.id()).isEqualTo(guardada.id());
        }

        @Test
        @DisplayName("cambiar el numero deja traza y no cambia el id ni el desglose")
        void cambiarElNumeroDejaTraza() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            long codigoId = crearCodigo(municipalidadA, "G-0002");

            Papeleta guardada =
                    transaccion.execute(
                            estado -> repositorio.insertar(papeletaDe("PT-0002", codigoId)));

            Papeleta renumerada =
                    transaccion.execute(
                            estado ->
                                    repositorio.cambiarNumero(
                                            guardada.id(),
                                            "PT-0002-B",
                                            "correccion de digitacion"));

            assertThat(renumerada.id()).isEqualTo(guardada.id());
            assertThat(renumerada.numero()).isEqualTo("PT-0002-B");
            assertThat(renumerada.importeAPagar()).isEqualTo(guardada.importeAPagar());

            long trazas = transaccion.execute(estado -> contarTrazas(guardada.id()));
            assertThat(trazas).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("Consulta")
    class Consulta {

        @Test
        @DisplayName("la busqueda por placa no cruza la municipalidad")
        void laBusquedaPorPlacaNoCruzaLaMunicipalidad() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            long codigoId = crearCodigo(municipalidadA, "G-0003");
            transaccion.execute(estado -> repositorio.insertar(papeletaDe("PT-0003", codigoId)));

            TenantContext.limpiar();
            TenantContext.fijar(new MunicipalidadId(municipalidadB));

            Pagina<Papeleta> desdeB =
                    transaccion.execute(
                            estado ->
                                    repositorio.buscar(
                                            new CriterioDePapeleta(
                                                    null, "ABC-123", null, null, null, null, null,
                                                    false),
                                            Paginacion.de(0, 20, "fechaInfraccion")));

            assertThat(desdeB.totalElementos()).isZero();
        }

        @Test
        @DisplayName("soloPendientes excluye PAGADA, ANULADA y PRESCRITA")
        void soloPendientesExcluyeLasCerradas() {
            TenantContext.fijar(new MunicipalidadId(municipalidadA));
            long codigoId = crearCodigo(municipalidadA, "G-0004");
            transaccion.execute(estado -> repositorio.insertar(papeletaDe("PT-0004", codigoId)));

            Pagina<Papeleta> pendientes =
                    transaccion.execute(
                            estado ->
                                    repositorio.buscar(
                                            new CriterioDePapeleta(
                                                    "PT-0004", null, null, null, null, null, null,
                                                    true),
                                            Paginacion.de(0, 20, "fechaInfraccion")));

            assertThat(pendientes.totalElementos()).isEqualTo(1);
        }
    }

    // ------------------------------------------------------------------

    private static Papeleta papeletaDe(String numero, long codigoInfraccionId) {
        return Papeleta.nueva(
                numero,
                codigoInfraccionId,
                FECHA,
                null,
                "Av. Grau",
                "ABC-123",
                null,
                null,
                null,
                null,
                Dinero.de("4950"),
                Alicuota.de("8"),
                Dinero.de("396"),
                Alicuota.de("100"),
                Dinero.de("396"),
                Dinero.de("198"),
                Observacion.de("Se registra para la prueba"));
    }

    private static long contarTrazas(long papeletaId) {
        return jdbc.sql(
                        "SELECT count(*) FROM papeleta_cambio_numero WHERE papeleta_id = :papeletaId")
                .param("papeletaId", papeletaId)
                .query(Long.class)
                .single();
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

    private static long crearCodigo(long municipalidadId, String codigo) {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadId);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO codigo_infraccion (municipalidad_id, familia, codigo,"
                                    + " descripcion, porcentaje_uit, base_legal, vigencia_desde)"
                                    + " VALUES (?, 'TRANSITO', ?, 'Infraccion de prueba', 8.0000,"
                                    + "         'RNT art. 300', '2020-01-01') RETURNING id")) {
                sentencia.setLong(1, municipalidadId);
                sentencia.setString(2, codigo);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    return id;
                }
            }
        } catch (SQLException excepcion) {
            throw new IllegalStateException(excepcion);
        }
    }
}
