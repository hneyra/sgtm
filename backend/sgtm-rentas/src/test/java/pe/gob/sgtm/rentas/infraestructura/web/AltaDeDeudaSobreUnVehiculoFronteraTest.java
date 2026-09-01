package pe.gob.sgtm.rentas.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.io.IOException;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
import pe.gob.sgtm.autorizacion.GuardiaDeAcceso;
import pe.gob.sgtm.catastro.aplicacion.TitularesDelPredioCatastro;
import pe.gob.sgtm.catastro.infraestructura.CatastroRepositoryJdbc;
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultarDeuda;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarAsiento;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ObligacionConDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
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
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.Placa;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.rentas.aplicacion.ConsultaDeVehiculos;
import pe.gob.sgtm.rentas.aplicacion.TitularesDeLaUnidadRentas;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.infraestructura.VehiculoRepositoryJdbc;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * De la placa al asiento: el alta de deuda vehicular, contra PostgreSQL de verdad (#554).
 *
 * <h2>Lo que faltaba, y por que no se veia en ninguna respuesta</h2>
 *
 * <p>{@code PeticionDeMovimiento} identifica la unidad de la obligacion con {@code predioId} y
 * {@code vehiculoId}, y los dos forman parte de {@link ClaveDeSaldo}, <b>que compara por igualdad
 * exacta</b>: una obligacion con vehiculo y una sin el son dos obligaciones distintas. El predio se
 * resolvia —{@code GET /catastro/predios} publica {@code predioId}— y el vehiculo no: la fila que
 * la pantalla lee para reconocer una placa no publicaba ningun identificador interno.
 *
 * <p>Con lo que habia, un alta de patrimonio vehicular o se mandaba <b>sin unidad</b> —y caia sobre
 * una obligacion que no es la de la placa, invisible desde la ficha del vehiculo y sin sumarse a lo
 * que ya se le debe— o no se mandaba. Y lo primero <b>no se distingue de lo correcto en la
 * respuesta</b>: son 201 los dos, con el mismo importe y el mismo papel. Solo se ve leyendo la
 * clave de la obligacion que quedo escrita, que es lo que esta prueba hace.
 *
 * <p>La conexion es la de {@code sgtm_app} y el proxy transaccional se construye con {@link
 * AnnotationTransactionAttributeSource}, o sea obedeciendo a la anotacion como el contenedor
 * (#486).
 */
@DisplayName("#554 — De la placa al asiento: el alta de deuda vehicular")
class AltaDeDeudaSobreUnVehiculoFronteraTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneId.of("America/Lima"));

    private static final String CODIGO = "C-VEH-554";

    /** Otro contribuyente del mismo padron, para poder medir la unidad ajena (#635). */
    private static final String AJENO = "C-VEH-635";

    private static final String PLACA = "V5D-554";
    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final LocalDate FECHA = LocalDate.of(2026, 5, 10);

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long contribuyente;
    private static long vehiculo;
    private static long ajeno;
    private static MockMvc mvc;
    private static RegistrarMovimientoDeDeuda movimientos;
    private static ConsultarDeuda deuda;
    private static TransactionTemplate transaccion;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("220554", "Municipalidad del alta vehicular");
        contribuyente = crearContribuyente();
        ajeno = crearAjeno();

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);

        VehiculoRepositoryJdbc vehiculos = new VehiculoRepositoryJdbc(jdbc);
        AsientoRepositoryJdbc asientos = new AsientoRepositoryJdbc(jdbc);
        AuditoriaJdbc auditoria = new AuditoriaJdbc(jdbc, RELOJ);
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
        movimientos =
                envolver(
                        new RegistrarMovimientoDeDeuda(
                                asientos,
                                envolver(
                                        new RegistrarAsiento(
                                                asientos,
                                                new SaldoRepositoryJdbc(jdbc),
                                                auditoria,
                                                RELOJ),
                                        gestor),
                                new CalculoDeDeuda(new SinAcumulacion()),
                                new PoliticaDeRedondeo(2, RoundingMode.HALF_UP),
                                documentos,
                                envolver(
                                        new TitularesDeLaUnidadRentas(
                                                new TitularesDelPredioCatastro(
                                                        new CatastroRepositoryJdbc(jdbc)),
                                                vehiculos,
                                                new DirectorioDeUno()),
                                        gestor)),
                        gestor);
        deuda =
                envolver(
                        new ConsultarDeuda(
                                asientos,
                                new SaldoRepositoryJdbc(jdbc),
                                new CalculoDeDeuda(new SinAcumulacion()),
                                new PoliticaDeRedondeo(2, RoundingMode.HALF_UP),
                                RELOJ),
                        gestor);

        vehiculo = sembrarVehiculo(vehiculos, gestor);

        ConsultaDeVehiculos consulta =
                envolver(
                        // La deuda de la fila no la mira esta prueba: lo que se lee de aqui es el
                        // identificador, y arrastrar el libro entero solo para eso lo taparia.
                        new ConsultaDeVehiculos(vehiculos, (quien, cuando) -> List.of()), gestor);
        mvc =
                MockMvcBuilders.standaloneSetup(
                                new VehiculoController(consulta, new DirectorioDeUno(), RELOJ),
                                new MovimientosDeDeudaController(
                                        movimientos,
                                        envolver(new ConsultasDelLibro(asientos), gestor),
                                        RELOJ))
                        .addInterceptors(
                                new GuardiaDeAcceso(
                                        (usuario, acceso, privilegio, fecha) -> true, RELOJ))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .setMessageConverters(new JacksonJsonHttpMessageConverter(json))
                        .build();
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

    // ------------------------------------------------------------------

    @Test
    @DisplayName("la fila del listado publica el vehiculoId, que es el de esa placa")
    void laFilaPublicaElVehiculoId() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/rentas/vehiculos").param("contribuyente", CODIGO))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"placa\":\"" + PLACA + "\"");
        assertThat(vehiculoIdDe(cuerpo))
                .as(
                        "es el identificador interno de esa placa, el mismo que ClaveDeSaldo"
                                + " compara por igualdad exacta")
                .isEqualTo(vehiculo);
    }

    @Test
    @DisplayName(
            "el alta con ese vehiculoId queda asentada CON el, y no es la obligacion sin unidad")
    void elAltaQuedaAsentadaConElVehiculo() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/rentas/vehiculos").param("contribuyente", CODIGO))
                        .andReturn();
        long leido = vehiculoIdDe(resultado.getResponse().getContentAsString());

        alta(leido, "180.00", "RES-2026-554A");
        // Y una segunda alta del MISMO tributo y ejercicio SIN unidad: es la que caia
        // en el sitio equivocado cuando la pantalla no tenia el identificador.
        alta(null, "90.00", "RES-2026-554B");

        List<ObligacionConDeuda> obligaciones =
                Objects.requireNonNull(
                        transaccion.execute(
                                estado -> deuda.todasLasObligacionesDe(contribuyente, FECHA)));

        assertThat(obligaciones)
                .as("son dos obligaciones distintas, no una con un campo mas: %s", obligaciones)
                .hasSize(2);
        ObligacionConDeuda delVehiculo =
                obligaciones.stream()
                        .filter(o -> Objects.equals(o.vehiculoId(), vehiculo))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new AssertionError(
                                                "ninguna obligacion quedo con el vehiculoId de la"
                                                        + " placa: "
                                                        + obligaciones));
        ObligacionConDeuda sinUnidad =
                obligaciones.stream()
                        .filter(o -> o.vehiculoId() == null)
                        .findFirst()
                        .orElseThrow(() -> new AssertionError("falta la obligacion sin unidad"));

        assertThat(delVehiculo.deuda().total())
                .as("y cada una lleva LO SUYO: mandarla sin unidad la sumaria a la otra")
                .isEqualTo(Dinero.de("180.00"));
        assertThat(sinUnidad.deuda().total()).isEqualTo(Dinero.de("90.00"));
        assertThat(delVehiculo.tributo()).isEqualTo(sinUnidad.tributo());
        assertThat(delVehiculo.ejercicio()).isEqualTo(sinUnidad.ejercicio());
    }

    // ------------------- la unidad es del contribuyente (#635)

    @Test
    @DisplayName("un vehiculoId que no esta en el padron es 422 nombrandolo, no 201")
    void unVehiculoInexistenteEs422() throws Exception {
        MvcResult resultado = alta("{\"vehiculoId\":999999,", "RES-2026-6351");

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "un identificador que no apunta a nada deja el cargo sobre una clave que"
                                + " ninguna consulta va a mirar")
                .isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "y por el motivo que es: «no tiene titular» y no «es de otro». Sin"
                                + " comprobar la existencia, la lista vacia cae en la rama del"
                                + " titular ajeno y contesta 422 igual — con un mensaje que habla"
                                + " de un titular que no existe")
                .contains("999999")
                .contains("no tiene titular");
    }

    @Test
    @DisplayName("un predioId que no esta en el padron contesta lo mismo")
    void unPredioInexistenteEs422() throws Exception {
        MvcResult resultado = alta("{\"predioId\":999999,", "RES-2026-6352");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("999999")
                .contains("no tiene titular");
    }

    @Test
    @DisplayName("la unidad de OTRO contribuyente es 422, y dice de quien es")
    void laUnidadDeOtroEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6353")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "sin esto, el cargo cae sobre una clave invisible desde la ficha del"
                                + " vehiculo y sin sumarse a la deuda de quien paga")
                .isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as("y el mensaje dice de quien es, que es lo que quien atiende necesita saber")
                .contains(CODIGO);
    }

    @Test
    @DisplayName("declarando que es deuda de un titular anterior, se registra")
    void declarandoloSeRegistra() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6354")
                                                        .replace(
                                                                "\"observacion\"",
                                                                "\"deudaDeTitularAnterior\":true,"
                                                                        + "\"observacion\"")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "la deuda de un ejercicio anterior a una transferencia ES del titular de"
                                + " entonces: bloquear sin salida dejaria ese acto sin poder"
                                + " registrarse")
                .isEqualTo(201);

        // #653: mirar solo el 201 dejaba pasar la mitad que faltaba. La declaracion tiene que
        // quedar ESCRITA, y se compara contra un alta identica sobre la unidad PROPIA: si las dos
        // filas salen iguales, el acto legitimo y el error de teclear el predio equivocado son
        // indistinguibles para quien audite el circuito manana.
        mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpoDelAlta(CODIGO, vehiculo, "RES-2026-6357")))
                .andReturn();

        assertThat(declaracionDe("RES-2026-6354"))
                .as("la fila del libro dice que se declaro")
                .containsOnly(true);
        assertThat(declaracionDe("RES-2026-6357"))
                .as("y la del alta sobre la unidad propia dice que nadie declaro nada")
                .containsOnly(false);
        assertThat(auditadoDe("RES-2026-6354"))
                .as("y la bitacora lo lleva dentro, que es donde se lee despues")
                // `datos_nuevos` es jsonb: PostgreSQL lo devuelve reserializado y con espacios
                // detras de los dos puntos, asi que se compara sin ellos.
                .allMatch(
                        descripcion ->
                                descripcion
                                        .replace(" ", "")
                                        .contains("\"unidadDeTitularAnterior\":true"));
        assertThat(auditadoDe("RES-2026-6357"))
                .allMatch(
                        descripcion ->
                                descripcion
                                        .replace(" ", "")
                                        .contains("\"unidadDeTitularAnterior\":false"));
    }

    @Test
    @DisplayName("#653 — la marca sin ninguna unidad no declara nada, y no rompe el CHECK")
    void laMarcaSinUnidadNoDeclaraNada() throws Exception {
        // El cuerpo declara la unidad y la marca por separado, asi que la marca puede llegar sola.
        // Grabarla entonces afirmaria de una obligacion sin predio ni vehiculo que «su unidad es de
        // otro», que no significa nada — y ademas violaria `asiento_titular_anterior_ck` (V71), que
        // es lo que la convierte en una invariante y no en una restriccion que el propio sistema
        // puede romper. Se carga sobre AJENO y no sobre CODIGO porque las obligaciones de este
        // ultimo las cuenta `elAltaQuedaAsentadaConElVehiculo`, y las pruebas comparten la base.
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpoSinUnidad(AJENO, "RES-2026-6360")
                                                        .replace(
                                                                "\"observacion\"",
                                                                "\"deudaDeTitularAnterior\":true,"
                                                                        + "\"observacion\"")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("respuesta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(201);
        assertThat(declaracionDe("RES-2026-6360"))
                .as("sin unidad no hay nada que declarar")
                .containsOnly(false);
    }

    @Test
    @DisplayName("#653 — la baja declarada tambien deja la declaracion escrita")
    void laBajaDeclaradaTambienLaDeja() throws Exception {
        // Primero hay deuda que dar de baja, sobre la unidad ajena y declarandolo.
        mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6358")
                                                .replace(
                                                        "\"observacion\"",
                                                        "\"deudaDeTitularAnterior\":true,"
                                                                + "\"observacion\"")))
                .andReturn();

        MvcResult baja =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6359")
                                                        .replace(
                                                                "\"observacion\"",
                                                                "\"deudaDeTitularAnterior\":true,"
                                                                        + "\"observacion\"")))
                        .andReturn();

        assertThat(baja.getResponse().getStatus())
                .as("respuesta: %s", baja.getResponse().getContentAsString())
                .isEqualTo(201);
        assertThat(declaracionDe("RES-2026-6359"))
                .as(
                        "arreglar solo el alta dejaria la baja admitiendo la unidad ajena sin"
                                + " decirlo: los dos caminos reciben la misma ComprobacionDeUnidad"
                                + " y ninguno la propagaba")
                .containsOnly(true);
    }

    @Test
    @DisplayName("la baja lo contesta igual que el alta")
    void laBajaLoContestaIgual() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6355")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("arreglar solo el alta deja la baja aceptando la unidad ajena")
                .isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "y por el motivo que es: una baja sobre una obligacion sin deuda tambien"
                                + " contesta 422 —«solo se deben 0.00»—, asi que mirar solo el"
                                + " codigo no distingue las dos guardas")
                .contains(CODIGO)
                .doesNotContain("solo se deben");
    }

    @Test
    @DisplayName("#653 — y la baja REPARTIDA, que va por el otro camino, tambien")
    void laBajaRepartidaTambienLaDeja() throws Exception {
        mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6361")
                                                .replace(
                                                        "\"observacion\"",
                                                        "\"deudaDeTitularAnterior\":true,"
                                                                + "\"observacion\"")))
                .andReturn();

        // `repartir` manda la peticion a `registrarRepartido`, que es un camino DISTINTO de
        // `registrar` y recibe la misma ComprobacionDeUnidad. Sin una prueba que pase por aqui,
        // arreglar solo `registrar` deja la mitad sin arreglar y nada lo dice: la baja repartida es
        // la que la pantalla usa para una fila de la grilla que agrega varios periodos (#598).
        MvcResult baja =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpoDelAlta(AJENO, vehiculo, "RES-2026-6362")
                                                        .replace(
                                                                "\"observacion\"",
                                                                "\"repartir\":true,"
                                                                        + "\"deudaDeTitularAnterior\":true,"
                                                                        + "\"observacion\"")))
                        .andReturn();

        assertThat(baja.getResponse().getStatus())
                .as("respuesta: %s", baja.getResponse().getContentAsString())
                .isEqualTo(201);
        assertThat(declaracionDe("RES-2026-6362")).containsOnly(true);
    }

    @Test
    @DisplayName("la unidad propia sigue pasando, que es el camino de todos los dias")
    void laUnidadPropiaPasa() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpoDelAlta(CODIGO, vehiculo, "RES-2026-6356")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("respuesta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(201);
    }

    private static MvcResult alta(String unidad, String documento) throws Exception {
        return mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        unidad
                                                + "\"codContribuyente\":\""
                                                + CODIGO
                                                + "\",\"tributo\":\"VEHICULAR\",\"ano\":\"2026\","
                                                + "\"cuota\":9,\"insoluto\":\"10.00\","
                                                + "\"fechaValor\":\"2026-05-10\","
                                                + "\"documentoOrigen\":\""
                                                + documento
                                                + "\",\"observacion\":\"Alta de prueba de la"
                                                + " unidad\"}"))
                .andReturn();
    }

    private static String cuerpoDelAlta(String codigo, long vehiculoId, String documento) {
        return "{\"vehiculoId\":"
                + vehiculoId
                + ",\"codContribuyente\":\""
                + codigo
                + "\",\"tributo\":\"VEHICULAR\",\"ano\":\"2026\",\"cuota\":9,"
                + "\"insoluto\":\"10.00\",\"fechaValor\":\"2026-05-10\","
                + "\"documentoOrigen\":\""
                + documento
                + "\",\"observacion\":\"Alta de prueba de la unidad\"}";
    }

    /** El mismo alta, sin ninguna unidad: ni predio ni vehiculo. */
    private static String cuerpoSinUnidad(String codigo, String documento) {
        return "{\"codContribuyente\":\""
                + codigo
                + "\",\"tributo\":\"VEHICULAR\",\"ano\":\"2026\",\"cuota\":8,"
                + "\"insoluto\":\"10.00\",\"fechaValor\":\"2026-05-10\","
                + "\"documentoOrigen\":\""
                + documento
                + "\",\"observacion\":\"Alta de prueba sin unidad\"}";
    }

    // ------------------------------------------------------------------

    private static long vehiculoIdDe(String cuerpo) {
        Matcher encontrado = Pattern.compile("\"vehiculoId\":(\\d+)").matcher(cuerpo);
        assertThat(encontrado.find())
                .as(
                        "sin el identificador en la fila, el alta vehicular o se manda sin unidad"
                                + " —y cae sobre otra obligacion— o no se manda: %s",
                        cuerpo)
                .isTrue();
        return Long.parseLong(encontrado.group(1));
    }

    private static void alta(Long vehiculoId, String insoluto, String documento) {
        transaccion.execute(
                estado ->
                        movimientos.registrar(
                                new MovimientoDeDeuda(
                                        SentidoDelMovimiento.ALTA,
                                        new ClaveDeSaldo(
                                                contribuyente,
                                                "VEHICULAR",
                                                EJERCICIO,
                                                0,
                                                null,
                                                vehiculoId),
                                        Dinero.de(insoluto),
                                        Dinero.CERO,
                                        Dinero.CERO,
                                        Dinero.CERO,
                                        Fase.ORDINARIA,
                                        FECHA,
                                        documento,
                                        null),
                                CODIGO,
                                Observacion.de("Deuda vehicular migrada del sistema anterior")));
    }

    private static long sembrarVehiculo(
            VehiculoRepositoryJdbc vehiculos, TenantTransactionManager gestor) {
        TenantContext.fijar(new MunicipalidadId(municipalidad));
        OrigenContext.fijar(new Origen("prueba", null, null));
        try {
            Vehiculo guardado =
                    Objects.requireNonNull(
                            new TransactionTemplate(gestor)
                                    .execute(
                                            estado ->
                                                    vehiculos.save(
                                                            Vehiculo.nuevo(
                                                                    Placa.de(PLACA),
                                                                    contribuyente,
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

    @SuppressWarnings("unchecked")
    private static <T> T envolver(T objetivo, TenantTransactionManager gestor) {
        ProxyFactory fabrica = new ProxyFactory(objetivo);
        fabrica.setProxyTargetClass(true);
        fabrica.addAdvice(
                new TransactionInterceptor(gestor, new AnnotationTransactionAttributeSource()));
        return (T) fabrica.getProxy();
    }

    /** Lo que la fila del libro dice de la declaracion de #653, por documento de origen. */
    private static List<Boolean> declaracionDe(String documento) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "SELECT unidad_de_titular_anterior FROM cuenta_corriente_asiento"
                                    + " WHERE documento_origen = ?")) {
                sentencia.setString(1, documento);
                try (ResultSet filas = sentencia.executeQuery()) {
                    List<Boolean> declaraciones = new java.util.ArrayList<>();
                    while (filas.next()) {
                        declaraciones.add(filas.getBoolean(1));
                    }
                    return declaraciones;
                }
            }
        }
    }

    /** Lo que la bitacora guardo de cada asiento de ese documento. */
    private static List<String> auditadoDe(String documento) throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "SELECT a.datos_nuevos::text FROM auditoria a"
                                    + " JOIN cuenta_corriente_asiento c"
                                    + "   ON c.id::text = a.clave"
                                    + " WHERE a.tabla = 'cuenta_corriente_asiento'"
                                    + "   AND c.documento_origen = ?")) {
                sentencia.setString(1, documento);
                try (ResultSet filas = sentencia.executeQuery()) {
                    List<String> descripciones = new java.util.ArrayList<>();
                    while (filas.next()) {
                        descripciones.add(filas.getString(1));
                    }
                    return descripciones;
                }
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
            try (ResultSet fila = sentencia.executeQuery()) {
                fila.next();
                long id = fila.getLong(1);
                owner.commit();
                return id;
            }
        }
    }

    private static long crearAjeno() throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', '40555635', 'NATURAL',"
                                    + "         'NO ES SU VEHICULO', 'prueba') RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, AJENO);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    long id = fila.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    private static long crearContribuyente() throws SQLException {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', '40555554', 'NATURAL',"
                                    + "         'TITULAR DE LA PLACA', 'prueba') RETURNING id")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, CODIGO);
                try (ResultSet fila = sentencia.executeQuery()) {
                    fila.next();
                    long id = fila.getLong(1);
                    app.commit();
                    return id;
                }
            }
        }
    }

    /** El padron, con el unico contribuyente que esta prueba necesita. */
    private static final class DirectorioDeUno
            implements pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes {

        @Override
        public List<pe.gob.sgtm.contribuyentes.ResumenDeContribuyente> buscar(
                String texto, int maximo) {
            return List.of();
        }

        @Override
        public java.util.Optional<pe.gob.sgtm.contribuyentes.ResumenDeContribuyente> porCodigo(
                String codigo) {
            if (CODIGO.equals(codigo)) {
                return java.util.Optional.of(
                        new pe.gob.sgtm.contribuyentes.ResumenDeContribuyente(
                                contribuyente, CODIGO, "TITULAR DE LA PLACA", "DNI 40555554"));
            }
            return AJENO.equals(codigo)
                    ? java.util.Optional.of(
                            new pe.gob.sgtm.contribuyentes.ResumenDeContribuyente(
                                    ajeno, AJENO, "NO ES SU VEHICULO", "DNI 40555635"))
                    : java.util.Optional.empty();
        }

        @Override
        public java.util.Map<Long, pe.gob.sgtm.contribuyentes.ResumenDeContribuyente> porIds(
                java.util.Set<Long> ids) {
            java.util.Map<Long, pe.gob.sgtm.contribuyentes.ResumenDeContribuyente> encontrados =
                    new java.util.LinkedHashMap<>();
            if (ids.contains(contribuyente)) {
                encontrados.put(
                        contribuyente,
                        new pe.gob.sgtm.contribuyentes.ResumenDeContribuyente(
                                contribuyente, CODIGO, "TITULAR DE LA PLACA", "DNI 40555554"));
            }
            if (ids.contains(ajeno)) {
                encontrados.put(
                        ajeno,
                        new pe.gob.sgtm.contribuyentes.ResumenDeContribuyente(
                                ajeno, AJENO, "NO ES SU VEHICULO", "DNI 40555635"));
            }
            return encontrados;
        }

        @Override
        public java.util.Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return java.util.Optional.empty();
        }
    }
}
