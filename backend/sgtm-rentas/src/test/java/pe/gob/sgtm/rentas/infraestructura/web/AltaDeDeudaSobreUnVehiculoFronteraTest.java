package pe.gob.sgtm.rentas.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

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
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultarDeuda;
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
    private static final String PLACA = "V5D-554";
    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final LocalDate FECHA = LocalDate.of(2026, 5, 10);

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static long contribuyente;
    private static long vehiculo;
    private static MockMvc mvc;
    private static RegistrarMovimientoDeDeuda movimientos;
    private static ConsultarDeuda deuda;
    private static TransactionTemplate transaccion;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("220554", "Municipalidad del alta vehicular");
        contribuyente = crearContribuyente();

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
                                documentos),
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
                                new VehiculoController(consulta, new DirectorioDeUno(), RELOJ))
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
            return CODIGO.equals(codigo)
                    ? java.util.Optional.of(
                            new pe.gob.sgtm.contribuyentes.ResumenDeContribuyente(
                                    contribuyente, CODIGO, "TITULAR DE LA PLACA", "DNI 40555554"))
                    : java.util.Optional.empty();
        }

        @Override
        public java.util.Map<Long, pe.gob.sgtm.contribuyentes.ResumenDeContribuyente> porIds(
                java.util.Set<Long> ids) {
            return java.util.Map.of();
        }

        @Override
        public java.util.Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return java.util.Optional.empty();
        }
    }
}
