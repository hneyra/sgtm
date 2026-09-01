package pe.gob.sgtm.rentas.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import pe.gob.sgtm.auditoria.AuditoriaJdbc;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.catastro.aplicacion.LectorDeCaracteristicasCatastro;
import pe.gob.sgtm.catastro.aplicacion.TitularesDelPredioCatastro;
import pe.gob.sgtm.catastro.infraestructura.CatastroRepositoryJdbc;
import pe.gob.sgtm.catastro.infraestructura.FichaCatastralRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.contribuyentes.aplicacion.DirectorioJdbc;
import pe.gob.sgtm.contribuyentes.infraestructura.ContribuyenteRepositoryJdbc;
import pe.gob.sgtm.contribuyentes.infraestructura.FichaRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.aplicacion.ComprobarLaUnidadDelMovimiento;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarAsiento;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SinAcumulacion;
import pe.gob.sgtm.cuentacorriente.infraestructura.web.MovimientosDeDeudaController;
import pe.gob.sgtm.documentos.DocumentoRepositoryJdbc;
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.GeneradorDeDocumentos;
import pe.gob.sgtm.documentos.RegimenDeLaInstalacion;
import pe.gob.sgtm.documentos.RenderizadorPdf;
import pe.gob.sgtm.documentos.RenderizadorRtf;
import pe.gob.sgtm.documentos.RenderizadorXls;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Placa;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.rentas.aplicacion.PadronDeUnidadesDeRentas;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.infraestructura.VehiculoRepositoryJdbc;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #635 — La unidad de la obligacion, resuelta contra PostgreSQL de verdad y como {@code sgtm_app}.
 *
 * <h2>Por que va hasta la base, y por que vive en {@code rentas}</h2>
 *
 * <p>Porque lo que hay que demostrar no lo puede demostrar ningun doble: que la titularidad sale de
 * {@code titularidad} y de {@code vehiculo}, que la fecha que se aplica es la <b>fecha valor</b>
 * del movimiento y no el reloj, y que la unidad de otra municipalidad <b>no existe</b> —que es una
 * propiedad de la politica RLS, no del codigo—.
 *
 * <p>Y vive aqui porque el puerto {@code PadronDeUnidades} lo declara {@code cuentacorriente} y lo
 * implementa {@code rentas}: es el unico contexto que ve las tres mitades —predio, vehiculo y
 * padron de personas— sin cerrar ningun ciclo. Es el mismo sitio y el mismo motivo por el que vive
 * {@code AltaDeDeudaSobreUnVehiculoFronteraTest} (#554).
 *
 * <h2>La conexion y las transacciones</h2>
 *
 * <p>La conexion es la de {@code sgtm_app}: un superusuario omite RLS incluso con {@code FORCE ROW
 * LEVEL SECURITY} —y {@code sgtm_owner} <b>no</b>, que es la mutacion que pasaria en verde (#537,
 * #545)—. El centinela {@link #seConectaComoSgtmApp} lo fija, para que un cambio de fixture no
 * devuelva la conexion sin que nadie lo note.
 *
 * <p>{@link ComprobarLaUnidadDelMovimiento} se envuelve en un proxy transaccional construido con
 * {@link AnnotationTransactionAttributeSource} —obedeciendo a la anotacion, como el contenedor— y
 * <b>sus colaboradores no</b>: asi la unica transaccion posible es la que abre su anotacion, que es
 * lo que {@link #sinTransaccionNoHayContexto} verifica. En produccion {@code
 * PadronDeUnidadesDeRentas} lleva ademas la suya, que es la que sostiene el camino del vehiculo si
 * alguien llamara al puerto desde otro sitio.
 */
@DisplayName("#635 — La unidad de la obligacion, contra PostgreSQL y como sgtm_app")
class PadronDeUnidadesFronteraTest {

    /** El reloj: a proposito posterior a la venta, para que resolver con el senale a otro. */
    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneId.of("America/Lima"));

    private static final LocalDate ALTA_DEL_PREDIO = LocalDate.of(2026, 1, 1);
    private static final LocalDate LA_VENTA = LocalDate.of(2026, 6, 30);

    /** Antes de la venta: el titular de entonces es el vendedor. */
    private static final String ANTES = "2026-03-15";

    private static final String OBSERVACION = "Deuda migrada del sistema anterior";

    private static BaseDeDatosDePrueba base;
    private static long municipalidadA;
    private static long municipalidadB;

    private static long vendedor;
    private static long comprador;
    private static long predio;
    private static long vehiculoDeA;
    private static long vehiculoDeB;

    private static JdbcClient jdbc;
    private static TransactionTemplate transaccion;
    private static MockMvc mvc;
    private static ComprobarLaUnidadDelMovimiento sinTransaccion;

    private static int siguiente = 1;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidadA = crearMunicipalidad("270635", "Municipalidad de la unidad");
        municipalidadB = crearMunicipalidad("270636", "Municipalidad vecina");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);

        AsientoRepositoryJdbc asientos = new AsientoRepositoryJdbc(jdbc);
        AuditoriaJdbc auditoria = new AuditoriaJdbc(jdbc, RELOJ);
        VehiculoRepositoryJdbc vehiculos = new VehiculoRepositoryJdbc(jdbc);
        CatastroRepositoryJdbc catastro = new CatastroRepositoryJdbc(jdbc);
        JsonMapper json =
                JsonMapper.builder()
                        .addModule(new ConfiguracionDeJson().moduloDeObjetosDeValor())
                        .build();
        EmitirDocumento documentos =
                new EmitirDocumento(
                        new DocumentoRepositoryJdbc(jdbc, json),
                        new GeneradorDeDocumentos(
                                List.of(
                                        new RenderizadorPdf(),
                                        new RenderizadorXls(),
                                        new RenderizadorRtf()),
                                RegimenDeLaInstalacion.REAL),
                        auditoria,
                        RELOJ);

        // El adaptador de verdad, con los repositorios de verdad y SIN proxy: la unica
        // transaccion posible es la que abre la anotacion de ComprobarLaUnidadDelMovimiento.
        sinTransaccion =
                new ComprobarLaUnidadDelMovimiento(
                        new PadronDeUnidadesDeRentas(
                                new LectorDeCaracteristicasCatastro(
                                        catastro, new FichaCatastralRepositoryJdbc(jdbc)),
                                new TitularesDelPredioCatastro(catastro),
                                vehiculos,
                                new DirectorioJdbc(
                                        new ContribuyenteRepositoryJdbc(jdbc),
                                        new FichaRepositoryJdbc(jdbc))));

        mvc =
                MockMvcBuilders.standaloneSetup(
                                new MovimientosDeDeudaController(
                                        envolver(
                                                new RegistrarMovimientoDeDeuda(
                                                        asientos,
                                                        envolver(
                                                                new RegistrarAsiento(
                                                                        asientos,
                                                                        new SaldoRepositoryJdbc(
                                                                                jdbc),
                                                                        auditoria,
                                                                        RELOJ),
                                                                gestor),
                                                        new CalculoDeDeuda(new SinAcumulacion()),
                                                        new PoliticaDeRedondeo(
                                                                2, RoundingMode.HALF_UP),
                                                        documentos),
                                                gestor),
                                        envolver(new ConsultasDelLibro(asientos), gestor),
                                        envolver(sinTransaccion, gestor),
                                        RELOJ))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .setMessageConverters(new JacksonJsonHttpMessageConverter(json))
                        .build();

        sembrar(vehiculos);
    }

    /**
     * El predio que se vende a mitad de 2026, sus dos titulares, y un vehiculo en cada
     * municipalidad.
     */
    private static void sembrar(VehiculoRepositoryJdbc vehiculos) throws SQLException {
        vendedor = crearContribuyente(municipalidadA, "C-VEND-A", "VENDEDOR DEL PREDIO");
        comprador = crearContribuyente(municipalidadA, "C-COMP-A", "COMPRADOR DEL PREDIO");
        predio = crearPredio(municipalidadA, nuevoCodigoPredial());
        titularidad(municipalidadA, predio, vendedor, ALTA_DEL_PREDIO, LA_VENTA);
        titularidad(municipalidadA, predio, comprador, LA_VENTA.plusDays(1), null);

        vehiculoDeA = crearVehiculo(vehiculos, municipalidadA, "V6A-635", vendedor);
        long deB = crearContribuyente(municipalidadB, "C-TIT-B", "TITULAR DE LA VECINA");
        vehiculoDeB = crearVehiculo(vehiculos, municipalidadB, "V6B-635", deB);
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
        TenantContext.fijar(new MunicipalidadId(municipalidadA));
        OrigenContext.fijar(new Origen("cajera.ventanilla", null, null));
    }

    @AfterEach
    void limpiarContexto() {
        TenantContext.limpiar();
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------

    @Test
    @DisplayName("la prueba se conecta como sgtm_app, no como el dueno ni como superusuario")
    void seConectaComoSgtmApp() {
        String quien =
                transaccion.execute(
                        estado -> jdbc.sql("SELECT current_user").query(String.class).single());

        assertThat(quien)
                .as(
                        "con FORCE ROW LEVEL SECURITY el dueno tambien queda sujeto a la politica,"
                                + " asi que medir el aislamiento con sgtm_owner pasaria en verde sin"
                                + " haber medido nada (#537, #545)")
                .isEqualTo(BaseDeDatosDePrueba.APP);
    }

    @Test
    @DisplayName("un predioId que no esta en el padron responde 422 nombrandolo (AC 2)")
    void elPredioInexistenteSeRechaza() throws Exception {
        MvcResult resultado = alta("C-VEND-A", "\"predioId\":999999,", ANTES, "RD-2026-000920");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "y lo dice como lo que es: NO EXISTE. Sin exigir la frase, la rotura de"
                                + " quitar la guarda de existencia deja esta prueba en verde —el mensaje"
                                + " de «no es del contribuyente» tambien nombra la unidad—")
                .contains("predio 999999")
                .contains("no esta en el padron");
        assertThat(asientosDe("RD-2026-000920")).isZero();
    }

    @Test
    @DisplayName("un vehiculoId que no esta en el padron responde 422 nombrandolo (AC 1)")
    void elVehiculoInexistenteSeRechaza() throws Exception {
        MvcResult resultado = alta("C-VEND-A", "\"vehiculoId\":999999,", ANTES, "RD-2026-000921");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("vehiculo 999999")
                .contains("no esta en el padron");
        assertThat(asientosDe("RD-2026-000921")).isZero();
    }

    @Test
    @DisplayName("el predio del titular de entonces se registra con su fecha valor (AC 3)")
    void elPredioDelTitularDeEntoncesSeRegistra() throws Exception {
        MvcResult resultado =
                alta("C-VEND-A", "\"predioId\":" + predio + ",", ANTES, "RD-2026-000922");

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "el predio se vendio el %s y la deuda es del %s: resolver la titularidad"
                                + " con el reloj (%s) rechazaria al titular que corresponde",
                        LA_VENTA, ANTES, LocalDate.now(RELOJ))
                .isEqualTo(201);
        assertThat(asientosDe("RD-2026-000922")).isEqualTo(1);
    }

    @Test
    @DisplayName("y el del comprador a esa misma fecha se rechaza nombrando al vendedor (AC 3)")
    void elPredioDeOtroSeRechazaNombrandoAlTitular() throws Exception {
        MvcResult resultado =
                alta("C-COMP-A", "\"predioId\":" + predio + ",", ANTES, "RD-2026-000923");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as("nombrando al titular y la fecha a la que se resolvio")
                .contains("no es del contribuyente C-COMP-A")
                .contains("C-VEND-A")
                .contains(ANTES);
        assertThat(asientosDe("RD-2026-000923")).isZero();
    }

    @Test
    @DisplayName("despues de la venta el titular es el otro, y se invierte (AC 3)")
    void despuesDeLaVentaElTitularEsElOtro() throws Exception {
        MvcResult delComprador =
                alta("C-COMP-A", "\"predioId\":" + predio + ",", "2026-08-15", "RD-2026-000924");
        MvcResult delVendedor =
                alta("C-VEND-A", "\"predioId\":" + predio + ",", "2026-08-15", "RD-2026-000925");

        assertThat(delComprador.getResponse().getStatus()).isEqualTo(201);
        assertThat(delVendedor.getResponse().getStatus())
                .as("la misma unidad y el mismo padron: lo unico que cambia es la fecha valor")
                .isEqualTo(422);
    }

    @Test
    @DisplayName("declarado, el alta sobre la unidad de otro se registra (AC 4)")
    void laUnidadAjenaDeclaradaSeRegistra() throws Exception {
        MvcResult resultado =
                alta(
                        "C-COMP-A",
                        "\"predioId\":" + predio + ",\"unidadDeOtroTitular\":true,",
                        ANTES,
                        "RD-2026-000926");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(asientosDe("RD-2026-000926")).isEqualTo(1);
    }

    @Test
    @DisplayName("y queda en la bitacora: el motivo del asiento lo dice, y la auditoria tambien")
    void laDeclaracionQuedaEnLaBitacora() throws Exception {
        alta(
                "C-COMP-A",
                "\"predioId\":" + predio + ",\"unidadDeOtroTitular\":true,",
                ANTES,
                "RD-2026-000927");

        assertThat(motivoDe("RD-2026-000927"))
                .as("sin esto la fila es indistinguible de un alta normal, que es medio AC 4")
                .startsWith("[titular ajeno declarado: el predio " + predio)
                .contains("C-VEND-A")
                .contains(ANTES)
                .endsWith(OBSERVACION);
        assertThat(ultimaObservacionAuditada())
                .as("la misma observacion que el libro guarda como motivo llega a la auditoria")
                .startsWith("[titular ajeno declarado:");
    }

    @Test
    @DisplayName("la baja lo contesta igual que el alta: es el mismo metodo comun (AC 5)")
    void laBajaLoContestaIgual() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpo(
                                                        "C-COMP-A",
                                                        "\"predioId\":" + predio + ",",
                                                        ANTES,
                                                        "RES-2026-000928")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("no es del contribuyente C-COMP-A");
    }

    @Test
    @DisplayName("el vehiculo de la municipalidad vecina no existe aqui: 422 (AC 6)")
    void elVehiculoDeLaVecinaNoExisteAqui() throws Exception {
        MvcResult resultado =
                alta("C-VEND-A", "\"vehiculoId\":" + vehiculoDeB + ",", ANTES, "RD-2026-000929");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "y lo dice como lo que es: NO EXISTE. Conectando como superusuario —que"
                                + " omite RLS— el vehiculo de la vecina se veria, y el mensaje pasaria"
                                + " a ser «no es del contribuyente», que es otra cosa")
                .contains("no esta en el padron");
        assertThat(asientosDe("RD-2026-000929")).isZero();
    }

    @Test
    @DisplayName("y el de esta municipalidad si, con su titular (AC 6, el contraste)")
    void elVehiculoPropioSeResuelve() throws Exception {
        MvcResult delTitular =
                alta("C-VEND-A", "\"vehiculoId\":" + vehiculoDeA + ",", ANTES, "RD-2026-000930");
        MvcResult deOtro =
                alta("C-COMP-A", "\"vehiculoId\":" + vehiculoDeA + ",", ANTES, "RD-2026-000931");

        assertThat(delTitular.getResponse().getStatus()).isEqualTo(201);
        assertThat(deOtro.getResponse().getStatus()).isEqualTo(422);
        assertThat(deOtro.getResponse().getContentAsString())
                .as("del vehiculo solo se sabe el titular de HOY, y el mensaje lo dice")
                .contains("el padron vehicular no guarda de quien era en otra fecha");
    }

    @Test
    @DisplayName("sin transaccion no hay SET LOCAL, y RLS falla en vez de devolver filas (#486)")
    void sinTransaccionNoHayContexto() {
        assertThatThrownBy(
                        () ->
                                sinTransaccion.exigirQueSeaDelObligado(
                                        vendedor,
                                        "C-VEND-A",
                                        predio,
                                        null,
                                        LocalDate.parse(ANTES),
                                        false,
                                        Observacion.de(OBSERVACION)))
                .as(
                        "la anotacion del caso de uso es lo unico que abre la transaccion, y sin"
                                + " ella la politica no se puede evaluar: no devuelve vacio, revienta")
                .isInstanceOf(Exception.class);
    }

    // ------------------------------------------------------------------

    private static MvcResult alta(
            String contribuyente, String unidad, String fechaValor, String documento)
            throws Exception {
        return mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo(contribuyente, unidad, fechaValor, documento)))
                .andReturn();
    }

    private static String cuerpo(
            String contribuyente, String unidad, String fechaValor, String documento) {
        return "{\"codContribuyente\":\""
                + contribuyente
                + "\",\"tributo\":\"PREDIAL\",\"ano\":\"2026\",\"cuota\":1,"
                + unidad
                + "\"insoluto\":\"100.00\",\"fechaValor\":\""
                + fechaValor
                + "\",\"documentoOrigen\":\""
                + documento
                + "\",\"observacion\":\""
                + OBSERVACION
                + "\"}";
    }

    private static int asientosDe(String documentoOrigen) {
        Integer cuantos =
                transaccion.execute(
                        estado ->
                                jdbc.sql(
                                                "SELECT count(*) FROM cuenta_corriente_asiento"
                                                        + " WHERE documento_origen = :documento")
                                        .param("documento", documentoOrigen)
                                        .query(Integer.class)
                                        .single());
        return cuantos == null ? 0 : cuantos;
    }

    private static String motivoDe(String documentoOrigen) {
        String motivo =
                transaccion.execute(
                        estado ->
                                jdbc.sql(
                                                "SELECT motivo FROM cuenta_corriente_asiento"
                                                        + " WHERE documento_origen = :documento")
                                        .param("documento", documentoOrigen)
                                        .query(String.class)
                                        .single());
        return Objects.requireNonNull(motivo, "El asiento tiene motivo (regla 10)");
    }

    private static String ultimaObservacionAuditada() {
        String observacion =
                transaccion.execute(
                        estado ->
                                jdbc.sql(
                                                "SELECT observacion FROM auditoria"
                                                        + " WHERE tabla = 'cuenta_corriente_asiento'"
                                                        + " ORDER BY id DESC LIMIT 1")
                                        .query(String.class)
                                        .single());
        return Objects.requireNonNull(observacion, "La fila de auditoria tiene observacion");
    }

    // ---------- siembra ----------

    private static synchronized String nuevoCodigoPredial() {
        return String.format("27063500100100100%06d", siguiente++);
    }

    private static long crearMunicipalidad(String ubigeo, String nombre) throws SQLException {
        try (Connection owner = base.conexion(BaseDeDatosDePrueba.OWNER);
                PreparedStatement sentencia =
                        owner.prepareStatement(
                                "INSERT INTO municipalidad (ubigeo, nombre, tipo)"
                                        + " VALUES (?, ?, 'DISTRITAL') RETURNING id")) {
            sentencia.setString(1, ubigeo);
            sentencia.setString(2, nombre);
            try (ResultSet fila = sentencia.executeQuery()) {
                fila.next();
                long id = fila.getLong(1);
                owner.commit();
                return id;
            }
        }
    }

    private static long crearContribuyente(long municipalidad, String codigo, String nombre)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', ?, 'siembra')"
                                    + " RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, String.format("4%07d", siguiente++));
                sentencia.setString(4, nombre);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    long id = fila.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long crearPredio(long municipalidad, String codigo) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO predio (municipalidad_id, codigo_ref_catastral, tipo,"
                                    + " direccion) VALUES (?, ?, 'URBANO', ?) RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, "AV. GRAU " + codigo);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    long id = fila.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static void titularidad(
            long municipalidad,
            long predioId,
            long contribuyenteId,
            LocalDate desde,
            @Nullable LocalDate hasta)
            throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO titularidad (municipalidad_id, predio_id,"
                                    + " contribuyente_id, condicion, porcentaje, vigencia_desde,"
                                    + " vigencia_hasta, documento_origen)"
                                    + " VALUES (?, ?, ?, 'PROPIETARIO_UNICO', ?, ?, ?,"
                                    + " 'SIEMBRA DE LA PRUEBA')")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setLong(2, predioId);
                sentencia.setLong(3, contribuyenteId);
                sentencia.setBigDecimal(4, new BigDecimal("100"));
                sentencia.setObject(5, desde);
                sentencia.setObject(6, hasta);
                sentencia.executeUpdate();
                app.commit();
            }
        }
    }

    private static long crearVehiculo(
            VehiculoRepositoryJdbc vehiculos, long municipalidad, String placa, long titular) {
        TenantContext.fijar(new MunicipalidadId(municipalidad));
        OrigenContext.fijar(new Origen("siembra", null, null));
        try {
            Vehiculo guardado =
                    Objects.requireNonNull(
                            transaccion.execute(
                                    estado ->
                                            vehiculos.save(
                                                    Vehiculo.nuevo(
                                                            Placa.de(placa),
                                                            titular,
                                                            "TOYOTA",
                                                            "YARIS",
                                                            "M1",
                                                            new Ejercicio(2023),
                                                            new Ejercicio(2024)))));
            return Objects.requireNonNull(guardado.id(), "El vehiculo guardado tiene id");
        } finally {
            TenantContext.limpiar();
            OrigenContext.limpiar();
        }
    }
}
