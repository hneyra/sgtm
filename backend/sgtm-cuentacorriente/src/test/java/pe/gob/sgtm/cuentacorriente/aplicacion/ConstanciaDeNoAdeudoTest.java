package pe.gob.sgtm.cuentacorriente.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
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
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.ConstanciaDeNoAdeudo;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.PoliticaDeMora;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * {@code ConsultarDeuda.constanciaDeNoAdeudo} contra PostgreSQL real (RF-049, RNF-084, #25).
 *
 * <p>Lo que da valor a este archivo: que la constancia se niega frente a <b>cualquier</b> fase con
 * saldo pendiente —ordinaria, valor, coactiva o convenio—, sin que este contexto consulte a nadie
 * mas para saberlo (regla 2), y que un codigo de contribuyente inexistente no emite en silencio una
 * constancia sobre alguien que no esta en el padron.
 */
@DisplayName("RF-049 — constancia: se niega si hay deuda en cualquier fase")
class ConstanciaDeNoAdeudoTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-06-01T00:00:00Z"), ZoneOffset.UTC);
    private static final Observacion OBSERVACION = Observacion.de("asiento de la prueba");
    private static final Map<String, Long> CODIGOS = new HashMap<>();

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static RegistrarAsiento registrarAsiento;
    private static ConsultarDeuda consulta;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("250103", "Municipalidad de constancia");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);

        AsientoRepositoryJdbc asientos = new AsientoRepositoryJdbc(jdbc);
        SaldoRepositoryJdbc saldos = new SaldoRepositoryJdbc(jdbc);

        registrarAsiento =
                envolver(
                        new RegistrarAsiento(asientos, saldos, new AuditoriaDePrueba(), RELOJ),
                        gestor);
        consulta =
                envolver(
                        new ConsultarDeuda(
                                asientos,
                                saldos,
                                new CalculoDeDeuda(new SinAcumulacionDePrueba()),
                                new PoliticaDeRedondeo(2, RoundingMode.HALF_UP),
                                RELOJ),
                        gestor);
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo, TenantTransactionManager gestor) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
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
        OrigenContext.fijar(new Origen("cajera.ventanilla", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("sin ninguna obligacion, la constancia se emite")
    void sinObligacionesSeEmite() {
        String codigo = crearContribuyenteConCodigo("K-0001", "80500001");

        ConstanciaDeNoAdeudo constancia =
                consulta.constanciaDeNoAdeudo(codigo, LocalDate.of(2026, 6, 1));

        assertThat(constancia.seNiega()).isFalse();
        assertThat(constancia.obligaciones()).isEmpty();
    }

    @Test
    @DisplayName("una obligacion ordinaria con saldo pendiente niega la constancia")
    void deudaOrdinariaNiega() {
        String codigo = crearContribuyenteConCodigo("K-0002", "80500002");
        long titular = idDe(codigo);
        cargar(titular, "PREDIAL", 2026, 0, Dinero.de(500), Fase.ORDINARIA);

        ConstanciaDeNoAdeudo constancia =
                consulta.constanciaDeNoAdeudo(codigo, LocalDate.of(2026, 6, 1));

        assertThat(constancia.seNiega()).isTrue();
    }

    @Test
    @DisplayName("una deuda en COACTIVA niega la constancia sin consultar al contexto coactiva")
    void deudaEnCoactivaNiega() {
        String codigo = crearContribuyenteConCodigo("K-0003", "80500003");
        long titular = idDe(codigo);
        cargar(titular, "ARBITRIOS", 2026, 3, Dinero.de(150), Fase.COACTIVA);

        ConstanciaDeNoAdeudo constancia =
                consulta.constanciaDeNoAdeudo(codigo, LocalDate.of(2026, 6, 1));

        assertThat(constancia.seNiega()).isTrue();
        assertThat(constancia.obligaciones())
                .singleElement()
                .satisfies(fila -> assertThat(fila.fase()).isEqualTo(Fase.COACTIVA));
    }

    @Test
    @DisplayName("una deuda en CONVENIO vigente niega la constancia")
    void deudaEnConvenioNiega() {
        String codigo = crearContribuyenteConCodigo("K-0004", "80500004");
        long titular = idDe(codigo);
        cargar(titular, "VEHICULAR", 2026, 0, Dinero.de(90), Fase.CONVENIO);

        ConstanciaDeNoAdeudo constancia =
                consulta.constanciaDeNoAdeudo(codigo, LocalDate.of(2026, 6, 1));

        assertThat(constancia.seNiega()).isTrue();
    }

    @Test
    @DisplayName("una obligacion cancelada (cargo y abono netean a cero) no niega la constancia")
    void obligacionCanceladaNoNiega() {
        String codigo = crearContribuyenteConCodigo("K-0005", "80500005");
        long titular = idDe(codigo);
        cargar(titular, "PREDIAL", 2026, 0, Dinero.de(500), Fase.ORDINARIA);
        abonar(titular, "PREDIAL", 2026, 0, Dinero.de(500), Fase.ORDINARIA);

        ConstanciaDeNoAdeudo constancia =
                consulta.constanciaDeNoAdeudo(codigo, LocalDate.of(2026, 6, 1));

        assertThat(constancia.seNiega()).isFalse();
    }

    @Test
    @DisplayName("un codigo de contribuyente inexistente no emite: NO_ENCONTRADO")
    void codigoInexistenteNoEmite() {
        assertThatThrownBy(
                        () ->
                                consulta.constanciaDeNoAdeudo(
                                        "NO-EXISTE-9999", LocalDate.of(2026, 6, 1)))
                .isInstanceOf(ProblemaDeNegocio.class)
                .satisfies(
                        excepcion ->
                                assertThat(((ProblemaDeNegocio) excepcion).codigo())
                                        .isEqualTo(CodigoDeError.NO_ENCONTRADO));
    }

    // ------------------------------------------------------------------

    private void cargar(
            long titular, String tributo, int ejercicio, int periodo, Dinero insoluto, Fase fase) {
        asentar(titular, tributo, ejercicio, periodo, insoluto, fase, TipoAsiento.CARGO);
    }

    private void abonar(
            long titular, String tributo, int ejercicio, int periodo, Dinero insoluto, Fase fase) {
        asentar(titular, tributo, ejercicio, periodo, insoluto, fase, TipoAsiento.ABONO);
    }

    private void asentar(
            long titular,
            String tributo,
            int ejercicio,
            int periodo,
            Dinero insoluto,
            Fase fase,
            TipoAsiento tipo) {
        Asiento asiento =
                Asiento.nuevo(
                        new Ejercicio(ejercicio),
                        titular,
                        tributo,
                        Concepto.INSOLUTO,
                        tipo,
                        fase,
                        periodo,
                        null,
                        null,
                        null,
                        insoluto,
                        LocalDate.of(2026, 3, 1),
                        "RES-PRUEBA-0001");
        registrarAsiento.asentar(asiento, OBSERVACION);
    }

    private static long idDe(String codigo) {
        return Objects.requireNonNull(CODIGOS.get(codigo));
    }

    private static String crearContribuyenteConCodigo(String codigo, String dni) {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', 'TITULAR, PRUEBA',"
                                    + " 'siembra') RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, dni);
                try (ResultSet resultado = sentencia.executeQuery()) {
                    resultado.next();
                    long id = resultado.getLong(1);
                    app.commit();
                    CODIGOS.put(codigo, id);
                    return codigo;
                }
            }
        } catch (SQLException excepcion) {
            throw new IllegalStateException(excepcion);
        }
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

    /** No acumula nada: estas pruebas miran el insoluto agregado, no la mora (D-02). */
    private static final class SinAcumulacionDePrueba implements PoliticaDeMora {
        @Override
        public Dinero reajusteAcumulado(
                Dinero insoluto, LocalDate desde, LocalDate hasta, PoliticaDeRedondeo redondeo) {
            return Dinero.CERO;
        }

        @Override
        public Dinero interesAcumulado(
                Dinero insoluto, LocalDate desde, LocalDate hasta, PoliticaDeRedondeo redondeo) {
            return Dinero.CERO;
        }
    }

    /** Auditoria de prueba: no verifica el rastro, solo que el asiento se pueda guardar. */
    private static final class AuditoriaDePrueba implements pe.gob.sgtm.auditoria.Auditoria {
        @Override
        public void registrar(pe.gob.sgtm.auditoria.RegistroDeAuditoria registro) {
            // sin base: esta prueba no verifica la pista de auditoria.
        }
    }
}
