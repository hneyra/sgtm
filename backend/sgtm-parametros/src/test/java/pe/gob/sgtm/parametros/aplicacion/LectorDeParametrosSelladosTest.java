package pe.gob.sgtm.parametros.aplicacion;

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
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.parametros.dominio.ConjuntoDeParametros;
import pe.gob.sgtm.parametros.infraestructura.ParametrosRepositoryJdbc;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;

/**
 * La unica puerta de los demas contextos a los valores normativos, contra PostgreSQL real.
 *
 * <p>Los valores sembrados son <b>ficticios</b> y estan marcados como tales en su propio documento
 * fuente. Lo que se verifica es que solo salga lo sellado.
 */
@DisplayName("ADR-0007 — Lectura del conjunto sellado")
class LectorDeParametrosSelladosTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-18T10:00:00Z"), ZoneId.of("America/Lima"));

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static AdministrarParametros administrar;
    private static LectorDeParametros lector;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("290101", "Municipalidad del lector");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        ParametrosRepositoryJdbc repositorio = new ParametrosRepositoryJdbc(jdbc);

        administrar =
                envolver(
                        new AdministrarParametros(repositorio, new AuditoriaJdbc(jdbc), RELOJ),
                        gestor);
        lector = envolver(new LectorDeParametrosSellados(repositorio), gestor);
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
        OrigenContext.fijar(new Origen("jefe.rentas", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("pedir un ejercicio sin conjunto sellado falla")
    void sinSelladoFalla() {
        assertThatThrownBy(() -> lector.delEjercicio(new Ejercicio(2035)))
                .as(
                        "calcular con un conjunto abierto produce una cifra que manana puede ser otra,"
                                + " y el contribuyente ya tendria el recibo")
                .isInstanceOf(LectorDeParametros.EjercicioSinSellar.class)
                .hasMessageContaining("2035");
    }

    @Test
    @DisplayName("un conjunto abierto tampoco cuenta, aunque tenga sus parametros")
    void unConjuntoAbiertoTampocoCuenta() throws SQLException {
        Ejercicio ejercicio = new Ejercicio(2036);
        ConjuntoDeParametros abierto =
                administrar.abrirVersion(ejercicio, Observacion.de("Se prepara el ejercicio 2036"));
        administrar.agregarParametro(
                abierto.id(),
                parametroFicticio("ABIERTO_2036"),
                Observacion.de("Se incorpora un parametro mientras se prepara"));

        assertThatThrownBy(() -> lector.delEjercicio(ejercicio))
                .as("tener parametros no es estar sellado")
                .isInstanceOf(LectorDeParametros.EjercicioSinSellar.class);
    }

    @Test
    @DisplayName("el sellado se entrega como objeto inmutable, con su ejercicio y su version")
    void elSelladoSeEntrega() throws SQLException {
        Ejercicio ejercicio = new Ejercicio(2037);
        ConjuntoDeParametros conjunto =
                administrar.abrirVersion(ejercicio, Observacion.de("Se abre el ejercicio 2037"));
        administrar.agregarParametro(
                conjunto.id(),
                parametroFicticio("SELLADO_2037"),
                Observacion.de("Se incorpora el parametro de la ordenanza ficticia"));
        administrar.sellar(conjunto.id(), Observacion.de("Se sella 2037 tras la revision"));

        ParametrosSellados sellados = lector.delEjercicio(ejercicio);

        assertThat(sellados.ejercicio()).isEqualTo(ejercicio);
        assertThat(sellados.version()).isEqualTo(conjunto.version());
        assertThat(sellados.numero("FICTICIO", "SELLADO_2037"))
                .as("el valor sale del conjunto, no de ninguna constante del codigo")
                .isPresent();
        assertThat(sellados.numero("FICTICIO", "no-existe")).isEmpty();
    }

    // ------------------------------------------------------------------

    /**
     * Publica un parametro <b>ficticio</b> con el rol que corresponde: la aplicacion no publica.
     */
    private static long parametroFicticio(String clave) throws SQLException {
        try (Connection carga = base.conexion(BaseDeDatosDePrueba.CARGA_PARAMETROS);
                PreparedStatement sentencia =
                        carga.prepareStatement(
                                "INSERT INTO parametro_tributario (municipalidad_id, tipo, clave,"
                                        + " valor_numerico, vigencia_desde, documento_fuente,"
                                        + " usuario_carga, usuario_aprueba) VALUES (NULL, 'FICTICIO',"
                                        + " ?, 1.000000, DATE '2026-01-01', 'Valor ficticio de prueba;"
                                        + " no representa ninguna norma', 'carga', 'aprueba')"
                                        + " RETURNING id")) {
            sentencia.setString(1, clave);
            try (ResultSet resultado = sentencia.executeQuery()) {
                resultado.next();
                long id = resultado.getLong(1);
                carga.commit();
                return id;
            }
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
}
