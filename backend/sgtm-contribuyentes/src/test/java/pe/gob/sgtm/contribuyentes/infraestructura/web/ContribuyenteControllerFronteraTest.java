package pe.gob.sgtm.contribuyentes.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

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
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.contribuyentes.aplicacion.ConsultaDelPadron;
import pe.gob.sgtm.contribuyentes.infraestructura.ContribuyenteRepositoryJdbc;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * La frontera entera: HTTP, controlador, repositorio y PostgreSQL, sin un doble por el camino.
 *
 * <h2>Por que existe</h2>
 *
 * <p>{@code GET /rentas/contribuyentes} contestaba <b>500</b> en la marcha blanca (#486), y ninguna
 * prueba lo veia. No por descuido, sino porque las dos familias de pruebas del modulo se reparten
 * la frontera y <b>ninguna la cruza</b>:
 *
 * <ul>
 *   <li>las de repositorio hablan con PostgreSQL de verdad, pero <b>desde dentro</b> de una
 *       transaccion que abre la propia prueba;
 *   <li>las de capa web llegan por HTTP, pero contra un <b>doble</b> del repositorio, que no sabe
 *       nada de RLS.
 * </ul>
 *
 * <p>Entre las dos queda el trozo que fallaba: el controlador llamando al repositorio <b>sin
 * transaccion</b>, que es exactamente lo que hace la aplicacion cuando llega una peticion.
 *
 * <h2>Que la hace fiel, y no un montaje que pasa siempre</h2>
 *
 * <p>El proxy transaccional se construye con {@link AnnotationTransactionAttributeSource}, o sea
 * <b>obedeciendo a la anotacion</b>, igual que el contenedor en produccion: si {@link
 * ConsultaDelPadron#buscar} deja de declarar {@code @Transactional}, el proxy no abre nada y la
 * consulta sale sin {@code SET LOCAL app.municipalidad_id}. Envolver el objeto en un {@code
 * TransactionTemplate} incondicional habria hecho pasar la prueba con la anotacion quitada, que es
 * el modo de fallo que esta prueba existe para impedir.
 *
 * <p>Y la conexion es la de {@code sgtm_app}: un superusuario omite RLS incluso con {@code FORCE
 * ROW LEVEL SECURITY}, asi que una prueba escrita sobre el no verificaria nada.
 */
@DisplayName("RF-011 — El padron, de HTTP a PostgreSQL (#486)")
class ContribuyenteControllerFronteraTest {

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;
    private static MockMvc mvc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();

        municipalidadA = crearMunicipalidad("220101", "Municipalidad de la frontera A");
        municipalidadB = crearMunicipalidad("220102", "Municipalidad de la frontera B");

        sembrar(municipalidadA, "00001", "40123456", "PEÑA GARCIA, MARIA DEL CARMEN");
        sembrar(municipalidadA, "00002", "40123457", "QUISPE MAMANI, JOSE LUIS");
        sembrar(municipalidadB, "00001", "40999999", "OTRO PADRON, PERSONA DISTINTA");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        ConsultaDelPadron consulta =
                conLaTransaccionQueDiceLaAnotacion(
                        new ConsultaDelPadron(
                                new ContribuyenteRepositoryJdbc(JdbcClient.create(pool))),
                        new TenantTransactionManager(pool));

        mvc =
                MockMvcBuilders.standaloneSetup(new ContribuyenteController(consulta))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .setMessageConverters(
                                new JacksonJsonHttpMessageConverter(
                                        JsonMapper.builder()
                                                .addModule(
                                                        new ConfiguracionDeJson()
                                                                .moduloDeObjetosDeValor())
                                                .build()))
                        .build();
    }

    @AfterAll
    static void cerrar() {
        if (base != null) {
            base.close();
        }
    }

    @BeforeEach
    void fijarTenant() {
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
    }

    @AfterEach
    void limpiar() {
        TenantContext.limpiar();
    }

    @Test
    @DisplayName("la peticion llega a PostgreSQL y vuelve con el padron de su municipalidad")
    void elPadronSeLee() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/rentas/contribuyentes")).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "sin transaccion, RLS falla con «invalid input syntax for type bigint: \"\"»"
                                + " y esto seria 500")
                .isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("PEÑA GARCIA")
                .contains("QUISPE MAMANI");
    }

    @Test
    @DisplayName("y no trae el padron de la municipalidad vecina")
    void elAislamientoSeSostieneEnLaFrontera() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/rentas/contribuyentes")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .as("el codigo 00001 existe en las dos: lo que las separa es RLS, no el criterio")
                .doesNotContain("OTRO PADRON");
    }

    @Test
    @DisplayName("el filtro por documento tambien cruza entera")
    void elFiltroViajaYFiltra() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/rentas/contribuyentes").param("dNI", "40123457"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("QUISPE MAMANI")
                .doesNotContain("PEÑA GARCIA");
    }

    /**
     * El proxy que obedece a la anotacion, como el contenedor.
     *
     * <p>Es lo que convierte esta prueba en una medida y no en un montaje: quitarle el
     * {@code @Transactional} a {@link ConsultaDelPadron#buscar} deja al proxy sin nada que hacer, y
     * las tres pruebas de arriba se ponen rojas con el error de RLS de verdad.
     */
    @SuppressWarnings("unchecked")
    private static <T> T conLaTransaccionQueDiceLaAnotacion(
            T objetivo, TenantTransactionManager gestor) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
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

    private static void sembrar(
            long municipalidadId, String codigo, String documento, String nombre)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidadId);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', ?, 'siembra')")) {
                sentencia.setLong(1, municipalidadId);
                sentencia.setString(2, codigo);
                sentencia.setString(3, documento);
                sentencia.setString(4, nombre);
                sentencia.executeUpdate();
            }
            app.commit();
        }
    }
}
