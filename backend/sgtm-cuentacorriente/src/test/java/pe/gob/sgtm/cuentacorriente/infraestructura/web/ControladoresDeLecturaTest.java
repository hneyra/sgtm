package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
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
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.web.ParametrosDePaginacion;

/**
 * Los dos GET de solo lectura de este contexto exigen {@code @Transactional(readOnly = true)} en el
 * propio controlador.
 *
 * <p>Es una regresion real, no hipotetica: {@code RepositorioJdbc} no abre transaccion propia (es
 * su diseño deliberado), asi que una consulta sin una transaccion activa <b>falla</b> en la base
 * por falta de contexto —RLS no encuentra {@code app.municipalidad_id}—. La prueba lo demuestra en
 * las dos direcciones: sin el proxy transaccional que Spring pone alrededor de la anotacion, la
 * misma llamada que hace el controlador falla; con el, funciona.
 */
@DisplayName("Los GET de cuentacorriente exigen @Transactional en el controlador")
class ControladoresDeLecturaTest {

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static CuentaCorrienteController cuentaCorrienteSinProxy;
    private static AltasBajasController altasBajasSinProxy;
    private static CuentaCorrienteController cuentaCorrienteConProxy;
    private static AltasBajasController altasBajasConProxy;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad();

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));
        JdbcClient jdbc = JdbcClient.create(pool);
        AsientoRepositoryJdbc repositorio = new AsientoRepositoryJdbc(jdbc);

        cuentaCorrienteSinProxy = new CuentaCorrienteController(repositorio);
        altasBajasSinProxy = new AltasBajasController(repositorio);

        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        cuentaCorrienteConProxy = envolver(cuentaCorrienteSinProxy, gestor);
        altasBajasConProxy = envolver(altasBajasSinProxy, gestor);
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
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
    }

    @Test
    @DisplayName(
            "sin el proxy transaccional, el GET de cuenta corriente falla por falta de contexto")
    void sinProxyCuentaCorrienteFalla() {
        assertThatThrownBy(
                        () ->
                                cuentaCorrienteSinProxy.estadoDeCuenta(
                                        "NO-EXISTE", null, null, paginacion()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("con @Transactional, el GET de cuenta corriente funciona")
    void conProxyCuentaCorrienteFunciona() {
        var pagina = cuentaCorrienteConProxy.estadoDeCuenta("NO-EXISTE", null, null, paginacion());

        assertThat(pagina.totalElementos()).isZero();
    }

    @Test
    @DisplayName("sin el proxy transaccional, el GET de altas y bajas falla por falta de contexto")
    void sinProxyAltasBajasFalla() {
        assertThatThrownBy(
                        () ->
                                altasBajasSinProxy.altasYBajas(
                                        "NO-EXISTE", null, null, null, paginacion()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("con @Transactional, el GET de altas y bajas funciona")
    void conProxyAltasBajasFunciona() {
        var pagina = altasBajasConProxy.altasYBajas("NO-EXISTE", null, null, null, paginacion());

        assertThat(pagina.totalElementos()).isZero();
    }

    private static ParametrosDePaginacion paginacion() {
        return new ParametrosDePaginacion(null, null, null, null);
    }

    private static long crearMunicipalidad() throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                        + " VALUES ('260101', 'Municipalidad de los controladores'"
                                        + " , 'DISTRITAL') RETURNING id")) {
            try (ResultSet fila = sentencia.executeQuery()) {
                fila.next();
                long id = fila.getLong(1);
                owner.commit();
                return id;
            }
        }
    }
}
