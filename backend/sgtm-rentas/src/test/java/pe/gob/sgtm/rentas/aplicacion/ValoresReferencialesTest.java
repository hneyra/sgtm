package pe.gob.sgtm.rentas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.BigDecimal;
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
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Placa;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.aplicacion.LectorDeParametrosSellados;
import pe.gob.sgtm.parametros.infraestructura.ParametrosRepositoryJdbc;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.rentas.dominio.ValorReferencial;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.infraestructura.ValorReferencialRepositoryJdbc;

/**
 * Los valores referenciales salen del <b>conjunto sellado</b>, no del ejercicio.
 *
 * <p>La prueba que da valor a este archivo es {@link #dosVersionesSelladasDelMismoEjercicio()}: se
 * sellan dos conjuntos del mismo ejercicio con valores distintos —un valor corregido a mitad de
 * año, que es exactamente lo que pasa en la practica— y se comprueba que cada uno devuelve el suyo.
 *
 * <p>Con la clave puesta en el ejercicio, como estaba la tabla antes de V17, los dos devolvian lo
 * mismo: la version vigente hoy. Recalcular una determinacion emitida con la v1 daria la cifra de
 * la v2 sin ningun error de por medio, y el contribuyente ya tendria su recibo (ARQ-09 §3).
 *
 * <p><b>Aqui no hay ninguna cifra tributaria.</b> Los importes son de relleno y no representan
 * ningun valor referencial real: lo que se prueba es de donde se lee, no cuanto vale (D-02).
 */
@DisplayName("ARQ-09 §3 — El valor referencial sale del conjunto, no del ejercicio")
class ValoresReferencialesTest {

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final Ejercicio FABRICACION = new Ejercicio(2020);
    private static final BigDecimal DE_LA_V1 = new BigDecimal("1000.00");
    private static final BigDecimal DE_LA_V2 = new BigDecimal("1200.00");

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long conjuntoV1;
    private static long conjuntoV2;
    private static ValoresReferenciales valores;
    private static LectorDeParametros lector;
    private static ValorReferencialRepositoryJdbc repositorio;
    private static org.springframework.transaction.support.TransactionTemplate transacciones;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad();
        conjuntoV1 = sellarConjunto(1, DE_LA_V1);
        conjuntoV2 = sellarConjunto(2, DE_LA_V2);

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        repositorio = new ValorReferencialRepositoryJdbc(jdbc);
        transacciones =
                new org.springframework.transaction.support.TransactionTemplate(
                        new TenantTransactionManager(pool));
        lector = envolver(new LectorDeParametrosSellados(new ParametrosRepositoryJdbc(jdbc)), pool);
        valores = envolver(new ValoresReferenciales(repositorio, lector), pool);
    }

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo, DriverManagerDataSource pool) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(
                        new TenantTransactionManager(pool),
                        new AnnotationTransactionAttributeSource()));
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
    @DisplayName("el ejercicio resuelve al conjunto sellado de mayor version")
    void elEjercicioResuelveAlSelladoVigente() {
        assertThat(lector.conjuntoVigenteEn(EJERCICIO))
                .isEqualTo(IdentificadorDeConjunto.de(conjuntoV2));
    }

    @Test
    @DisplayName("dos versiones selladas del mismo ejercicio devuelven valores distintos")
    void dosVersionesSelladasDelMismoEjercicio() {
        ValorReferencial v1 = exigir(conjuntoV1);
        ValorReferencial v2 = exigir(conjuntoV2);

        assertThat(v1.valor().valor())
                .as(
                        "es el valor con el que se emitio, y es el que un recalculo tiene que"
                                + " recuperar")
                .isEqualByComparingTo(DE_LA_V1);
        assertThat(v2.valor().valor())
                .as("y el corregido es otro. Con la clave en el ejercicio, los dos darian este")
                .isEqualByComparingTo(DE_LA_V2);
    }

    @Test
    @DisplayName("la consulta por ejercicio usa el vigente, que es lo correcto para una emision")
    void laConsultaPorEjercicioUsaElVigente() {
        assertThat(valores.de(vehiculo(), EJERCICIO))
                .get()
                .extracting(valor -> valor.valor().valor())
                .isEqualTo(DE_LA_V2);
    }

    @Test
    @DisplayName("un ejercicio sin ningun conjunto sellado no devuelve nada: se niega")
    void sinConjuntoSelladoSeNiega() {
        assertThatThrownBy(() -> valores.catalogoDe(new Ejercicio(2027)))
                .as(
                        "no hay valor por omision: calcular con un conjunto abierto daria una cifra"
                                + " que manana puede ser otra")
                .isInstanceOf(LectorDeParametros.EjercicioSinSellar.class);
    }

    @Test
    @DisplayName("el catalogo de marcas y modelos es el del conjunto, sin repetidos")
    void elCatalogoSaleDeLaTablaDeValores() {
        assertThat(valores.catalogoDe(EJERCICIO))
                .as("no hay tabla de catalogo: la lista mantenible es la tabla de valores")
                .singleElement()
                .satisfies(
                        entrada -> {
                            assertThat(entrada.marca()).isEqualTo("TOYOTA");
                            assertThat(entrada.modelo()).isEqualTo("YARIS");
                        });
    }

    /**
     * Lee el valor de un conjunto concreto, que es la lectura de la reproducibilidad.
     *
     * <p>Va dentro de una transaccion explicita porque un repositorio no la abre: la abre el caso
     * de uso, y aqui se esta llamando al repositorio a proposito, para leer por identificador sin
     * pasar por la resolucion del ejercicio.
     */
    private static ValorReferencial exigir(long conjunto) {
        ValorReferencial valor =
                transacciones.execute(
                        estado ->
                                repositorio
                                        .buscar(
                                                IdentificadorDeConjunto.de(conjunto),
                                                "TOYOTA",
                                                "YARIS",
                                                FABRICACION.valor())
                                        .orElse(null));
        if (valor == null) {
            throw new AssertionError("El conjunto " + conjunto + " no trae el valor");
        }
        return valor;
    }

    private static Vehiculo vehiculo() {
        return Vehiculo.nuevo(
                Placa.de("V1A-111"), 1, "TOYOTA", "YARIS", "M1", FABRICACION, new Ejercicio(2021));
    }

    private static long crearMunicipalidad() throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                        + " VALUES ('220302', 'Municipalidad de los valores',"
                                        + " 'DISTRITAL') RETURNING id")) {
            try (ResultSet fila = sentencia.executeQuery()) {
                fila.next();
                long id = fila.getLong(1);
                owner.commit();
                return id;
            }
        }
    }

    /** Un conjunto sellado del mismo ejercicio, con su valor referencial. */
    private static long sellarConjunto(int version, BigDecimal valor) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            long conjunto;
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO conjunto_parametros (municipalidad_id, ejercicio, version,"
                                    + " estado, fecha_sellado, usuario_sellado)"
                                    + " VALUES (?, ?, ?, 'SELLADO', now(), 'prueba')"
                                    + " RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setInt(2, EJERCICIO.valor());
                sentencia.setInt(3, version);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    conjunto = fila.getLong(1);
                }
            }
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO valor_referencial_vehiculo (municipalidad_id, conjunto_id,"
                                    + " ejercicio, marca, modelo, anio_fabricacion, valor,"
                                    + " documento_fuente)"
                                    + " VALUES (?, ?, ?, 'TOYOTA', 'YARIS', ?, ?,"
                                    + "         'tabla de la prueba, sin valor normativo')")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, conjunto);
                sentencia.setInt(3, EJERCICIO.valor());
                sentencia.setInt(4, FABRICACION.valor());
                sentencia.setBigDecimal(5, valor);
                sentencia.executeUpdate();
            }
            app.commit();
            return conjunto;
        }
    }
}
