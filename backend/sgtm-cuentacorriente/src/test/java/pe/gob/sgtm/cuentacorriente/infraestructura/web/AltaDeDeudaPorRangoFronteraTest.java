package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
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
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
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
import pe.gob.sgtm.compartido.TenantContext;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarAsiento;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.PoliticaDeMora;
import pe.gob.sgtm.cuentacorriente.infraestructura.AsientoRepositoryJdbc;
import pe.gob.sgtm.cuentacorriente.infraestructura.SaldoRepositoryJdbc;
import pe.gob.sgtm.documentos.DocumentoRepositoryJdbc;
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.GeneradorDeDocumentos;
import pe.gob.sgtm.documentos.RegimenDeLaInstalacion;
import pe.gob.sgtm.documentos.RenderizadorPdf;
import pe.gob.sgtm.documentos.RenderizadorRtf;
import pe.gob.sgtm.documentos.RenderizadorXls;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.MunicipalidadId;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;
import pe.gob.sgtm.esquema.BaseDeDatosDePrueba;
import pe.gob.sgtm.esquema.ContextoDeTenant;
import pe.gob.sgtm.plataforma.tenant.TenantTransactionManager;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * El alta de deuda <b>por rango de cuotas</b>, de HTTP a PostgreSQL y sin un doble por el camino
 * (#538).
 *
 * <h2>Por que va hasta la base</h2>
 *
 * <p>Porque lo que este issue existe para impedir no se ve en la respuesta. Hasta #538, mandar
 * {@code cuotaDesde}/{@code cuotaHasta} devolvia <b>201</b> con su total correcto y su documento
 * emitido, y los asientos quedaban con {@code periodo = 0}. Y {@code 0} <b>es un valor legitimo</b>
 * —{@link pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo} lo documenta: significa «anual»—, asi
 * que la fila mala es indistinguible de una buena. Lo unico que lo delata es leer el {@code
 * periodo} guardado, fila a fila, contra el que se pidio: contar cuantos asientos hay no basta, y
 * esa es la razon de ser del issue.
 *
 * <p>La conexion es la de {@code sgtm_app}. Un superusuario omite RLS incluso con {@code FORCE ROW
 * LEVEL SECURITY}, y ademas sin transaccion no hay {@code SET LOCAL} y la politica revienta (#486):
 * el camino que se recorre aqui es el de produccion entero.
 */
@DisplayName("RF-043 — Alta de deuda por rango de cuotas, de HTTP a PostgreSQL (#538)")
class AltaDeDeudaPorRangoFronteraTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-06-01T00:00:00Z"), ZoneOffset.UTC);

    private static final String OBSERVACION = "Deuda migrada del sistema anterior";

    private static BaseDeDatosDePrueba base;
    private static long municipalidad;
    private static AsientoRepositoryJdbc asientos;
    private static TransactionTemplate transaccion;
    private static MockMvc mvc;

    @BeforeAll
    static void provisionar() throws SQLException, IOException {
        base = BaseDeDatosDePrueba.provisionar();
        municipalidad = crearMunicipalidad("260101", "Municipalidad del rango");

        DriverManagerDataSource pool = new DriverManagerDataSource();
        pool.setUrl(base.url());
        pool.setUsername(BaseDeDatosDePrueba.APP);
        pool.setPassword(base.clave(BaseDeDatosDePrueba.APP));

        JdbcClient jdbc = JdbcClient.create(pool);
        TenantTransactionManager gestor = new TenantTransactionManager(pool);
        transaccion = new TransactionTemplate(gestor);

        asientos = new AsientoRepositoryJdbc(jdbc);
        AuditoriaJdbc auditoria = new AuditoriaJdbc(jdbc, RELOJ);
        RegistrarAsiento registrarAsiento =
                new RegistrarAsiento(asientos, new SaldoRepositoryJdbc(jdbc), auditoria, RELOJ);
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

        mvc =
                MockMvcBuilders.standaloneSetup(
                                new MovimientosDeDeudaController(
                                        envolver(
                                                new RegistrarMovimientoDeDeuda(
                                                        asientos,
                                                        registrarAsiento,
                                                        new CalculoDeDeuda(new SinAcumulacion()),
                                                        new PoliticaDeRedondeo(
                                                                2, RoundingMode.HALF_UP),
                                                        documentos),
                                                gestor),
                                        envolver(new ConsultasDelLibro(asientos), gestor),
                                        RELOJ))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .setMessageConverters(new JacksonJsonHttpMessageConverter(json))
                        .build();
    }

    /**
     * El proxy obedece a la anotacion, como el contenedor: envolver en un {@link
     * TransactionTemplate} incondicional dejaria pasar la mutacion de quitar {@code @Transactional}
     * (#486).
     */
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

    // ------------------------------------------------------------------

    @Test
    @DisplayName("«cuotas 1 a 4» produce cuatro asientos, con periodo 1, 2, 3 y 4 (AC 2)")
    void elRangoProduceUnAsientoPorCuota() throws Exception {
        String codigo = crearContribuyente("R-0001", "70200001");

        MvcResult resultado = alta(codigo, "\"cuotaDesde\":1,\"cuotaHasta\":4,", "RES-2026-1001");

        assertThat(resultado.getResponse().getStatus())
                .as("respuesta: %s", resultado.getResponse().getContentAsString())
                .isEqualTo(201);
        assertThat(periodosGuardados("RES-2026-1001"))
                .as("un asiento por cuota, y cada uno con LA suya: contarlos no basta (AC 6)")
                .containsExactly(1, 2, 3, 4);
        assertThat(importesGuardados("RES-2026-1001"))
                .as("el importe declarado va en cada cuota, no repartido entre ellas")
                .containsExactly(
                        Dinero.de("100.00"),
                        Dinero.de("100.00"),
                        Dinero.de("100.00"),
                        Dinero.de("100.00"));
    }

    @Test
    @DisplayName("la observacion es una para el acto y queda copiada en los n asientos (AC 4)")
    void laObservacionEsUnaYQuedaEnLosCuatro() throws Exception {
        String codigo = crearContribuyente("R-0002", "70200002");

        alta(codigo, "\"cuotaDesde\":1,\"cuotaHasta\":3,", "RES-2026-1002");

        assertThat(motivosGuardados("RES-2026-1002"))
                .hasSize(3)
                .allSatisfy(motivo -> assertThat(motivo).isEqualTo(OBSERVACION));
    }

    @Test
    @DisplayName("sin observacion no se guarda ni una cuota del rango (regla 10, AC 4)")
    void sinObservacionNoSeGuardaNada() throws Exception {
        String codigo = crearContribuyente("R-0003", "70200003");

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codContribuyente\":\""
                                                        + codigo
                                                        + "\",\"tributo\":\"PREDIAL\","
                                                        + "\"ano\":\"2026\","
                                                        + "\"cuotaDesde\":1,\"cuotaHasta\":4,"
                                                        + "\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-05-10\","
                                                        + "\"documentoOrigen\":\"RES-2026-1003\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("observacion");
        assertThat(periodosGuardados("RES-2026-1003")).isEmpty();
    }

    @Test
    @DisplayName("el total de la respuesta lleva su fecha, y es una sola para el acto (AC 5)")
    void elTotalLlevaSuFechaYEsUnaSola() throws Exception {
        String codigo = crearContribuyente("R-0004", "70200004");

        MvcResult resultado = alta(codigo, "\"cuotaDesde\":1,\"cuotaHasta\":4,", "RES-2026-1004");

        assertThat(resultado.getResponse().getContentAsString())
                .as("cuatro cuotas de 100 son 400, y la fecha es la fecha valor del acto")
                .contains("\"total\":{\"importe\":\"400.00\",\"actualizadoA\":\"2026-05-10\"}");
    }

    @Test
    @DisplayName("un acto son n obligaciones y UN solo papel: el rango gasta un correlativo")
    void elRangoGastaUnSoloCorrelativo() throws Exception {
        String codigo = crearContribuyente("R-0013", "70200013");

        String delRango =
                numeroDeDocumento(
                        alta(codigo, "\"cuotaDesde\":1,\"cuotaHasta\":4,", "RES-2026-1015"));
        String deLaSiguiente = numeroDeDocumento(alta(codigo, "\"cuota\":5,", "RES-2026-1016"));

        assertThat(periodosGuardados("RES-2026-1015")).containsExactly(1, 2, 3, 4);
        assertThat(ordinalDe(deLaSiguiente))
                .as(
                        "cuatro cuotas gastaron UN numero (%s), no cuatro: emitir una nota por"
                                + " cuota daria cuatro correlativos para un solo sustento documental y"
                                + " ninguna respuesta podria decir cual devolver",
                        delRango)
                .isEqualTo(ordinalDe(delRango) + 1);
    }

    @Test
    @DisplayName("un rango invertido responde 422 nombrando cuotaDesde (AC 2)")
    void elRangoInvertidoSeRechaza() throws Exception {
        String codigo = crearContribuyente("R-0005", "70200005");

        MvcResult resultado = alta(codigo, "\"cuotaDesde\":4,\"cuotaHasta\":1,", "RES-2026-1005");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("cuotaDesde");
        assertThat(periodosGuardados("RES-2026-1005"))
                .as("un rango vacio en silencio es el defecto, no la salida")
                .isEmpty();
    }

    @Test
    @DisplayName("un rango fuera del rango legal de cuotas responde 422 nombrando el campo (AC 2)")
    void elRangoFueraDeRangoSeRechaza() throws Exception {
        String codigo = crearContribuyente("R-0006", "70200006");

        MvcResult resultado = alta(codigo, "\"cuotaDesde\":1,\"cuotaHasta\":13,", "RES-2026-1006");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("cuotaHasta");
        assertThat(periodosGuardados("RES-2026-1006")).isEmpty();
    }

    @Test
    @DisplayName("cuotaDesde 0 no es «la cuota cero»: 0 es la obligacion anual y no entra al rango")
    void elCeroNoEntraAlRango() throws Exception {
        String codigo = crearContribuyente("R-0012", "70200012");

        MvcResult resultado = alta(codigo, "\"cuotaDesde\":0,\"cuotaHasta\":4,", "RES-2026-1014");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("cuotaDesde");
        assertThat(periodosGuardados("RES-2026-1014")).isEmpty();
    }

    @Test
    @DisplayName("media mitad del rango es media pregunta: 422 nombrando la que falta")
    void medioRangoSeRechaza() throws Exception {
        String codigo = crearContribuyente("R-0007", "70200007");

        MvcResult resultado = alta(codigo, "\"cuotaDesde\":2,", "RES-2026-1007");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("cuotaHasta");
        assertThat(periodosGuardados("RES-2026-1007")).isEmpty();
    }

    @Test
    @DisplayName("la cuota suelta y el rango a la vez no se resuelven por precedencia: 422")
    void laCuotaSueltaYElRangoALaVezSeRechazan() throws Exception {
        String codigo = crearContribuyente("R-0008", "70200008");

        MvcResult resultado =
                alta(codigo, "\"cuota\":7,\"cuotaDesde\":1,\"cuotaHasta\":4,", "RES-2026-1008");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("cuotaDesde");
        assertThat(periodosGuardados("RES-2026-1008")).isEmpty();
    }

    @Test
    @DisplayName("la cuota suelta sigue funcionando igual que antes de #538")
    void laCuotaSueltaSigueIgual() throws Exception {
        String codigo = crearContribuyente("R-0009", "70200009");

        MvcResult resultado = alta(codigo, "\"cuota\":2,", "RES-2026-1009");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(periodosGuardados("RES-2026-1009")).containsExactly(2);
    }

    @Test
    @DisplayName("sin cuota ni rango sigue siendo la obligacion anual: periodo 0")
    void sinCuotaNiRangoEsAnual() throws Exception {
        String codigo = crearContribuyente("R-0010", "70200010");

        MvcResult resultado = alta(codigo, "", "RES-2026-1010");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(periodosGuardados("RES-2026-1010"))
                .as("0 es «anual», y sigue siendo la respuesta legitima a «sin cuota»")
                .containsExactly(0);
    }

    @Test
    @DisplayName("una baja por rango que no cabe en UNA cuota no deja media baja asentada")
    void laBajaPorRangoEsAtomica() throws Exception {
        String codigo = crearContribuyente("R-0011", "70200011");

        alta(codigo, "\"cuotaDesde\":1,\"cuotaHasta\":3,", "RES-2026-1011");
        mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"codContribuyente\":\""
                                                + codigo
                                                + "\",\"tributo\":\"PREDIAL\",\"ano\":\"2026\","
                                                + "\"cuota\":4,\"insoluto\":\"50.00\","
                                                + "\"fechaValor\":\"2026-05-10\","
                                                + "\"documentoOrigen\":\"RES-2026-1012\","
                                                + "\"observacion\":\""
                                                + OBSERVACION
                                                + "\"}"))
                .andReturn();

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                cuerpo(
                                                        codigo,
                                                        "\"cuotaDesde\":1,\"cuotaHasta\":4,",
                                                        "RES-2026-1013")))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("la cuota 4 solo debe 50: la baja de 100 no cabe")
                .isEqualTo(422);
        assertThat(periodosGuardados("RES-2026-1013"))
                .as("o entran las cuatro o no entra ninguna: media baja no la explica nadie")
                .isEmpty();
    }

    // ------------------------------------------------------------------

    /** El {@code NA-2026-000007} de la respuesta. */
    private static String numeroDeDocumento(MvcResult resultado) throws Exception {
        String cuerpo = resultado.getResponse().getContentAsString();
        Matcher numero = Pattern.compile("\"numeroDeDocumento\":\"([^\"]+)\"").matcher(cuerpo);
        assertThat(numero.find()).as("respuesta sin numero de documento: %s", cuerpo).isTrue();
        return numero.group(1);
    }

    /** El ordinal del correlativo: {@code NA-2026-000007} → 7. */
    private static int ordinalDe(String numeroDeDocumento) {
        return Integer.parseInt(
                numeroDeDocumento.substring(numeroDeDocumento.lastIndexOf('-') + 1));
    }

    private static MvcResult alta(String codigo, String cuotas, String documento) throws Exception {
        return mvc.perform(
                        post("/api/v1/rentas/deuda/altas")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo(codigo, cuotas, documento)))
                .andReturn();
    }

    private static String cuerpo(String codigo, String cuotas, String documento) {
        return "{\"codContribuyente\":\""
                + codigo
                + "\",\"tributo\":\"PREDIAL\",\"ano\":\"2026\","
                + cuotas
                + "\"insoluto\":\"100.00\","
                + "\"fechaValor\":\"2026-05-10\","
                + "\"documentoOrigen\":\""
                + documento
                + "\","
                + "\"observacion\":\""
                + OBSERVACION
                + "\"}";
    }

    /**
     * Los periodos tal como quedaron en {@code cuenta_corriente_asiento}, en el orden en que se
     * asentaron. Se lee la base y no la respuesta: la respuesta ya salia bien el dia del defecto.
     */
    private static List<Integer> periodosGuardados(String documentoOrigen) {
        List<Integer> periodos = new ArrayList<>();
        for (Asiento asiento : leerAsientos(documentoOrigen)) {
            periodos.add(asiento.periodo());
        }
        return periodos;
    }

    private static List<Dinero> importesGuardados(String documentoOrigen) {
        List<Dinero> importes = new ArrayList<>();
        for (Asiento asiento : leerAsientos(documentoOrigen)) {
            importes.add(asiento.monto());
        }
        return importes;
    }

    private static List<String> motivosGuardados(String documentoOrigen) {
        List<String> motivos = new ArrayList<>();
        for (Asiento asiento : leerAsientos(documentoOrigen)) {
            motivos.add(String.valueOf(asiento.motivo()));
        }
        return motivos;
    }

    /**
     * Un repositorio no abre transaccion —la abre el caso de uso— y sin ella no hay {@code SET
     * LOCAL}, asi que RLS rechaza la consulta (#486). Aqui se llama al repositorio a proposito,
     * para mirar lo que quedo en la base sin pasar por ningun servicio.
     */
    private static List<Asiento> leerAsientos(String documentoOrigen) {
        List<Asiento> leidos =
                transaccion.execute(estado -> asientos.porDocumentoOrigen(documentoOrigen));
        return leidos == null ? List.of() : leidos;
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

    private static String crearContribuyente(String codigo, String dni) {
        try (Connection app = base.conexion(BaseDeDatosDePrueba.APP)) {
            ContextoDeTenant.fijar(app, municipalidad);
            try (PreparedStatement sentencia =
                    app.prepareStatement(
                            "INSERT INTO contribuyente (municipalidad_id, codigo_contribuyente,"
                                    + " tipo_documento, numero_documento, tipo_persona,"
                                    + " nombre_razon_social, usuario_registro)"
                                    + " VALUES (?, ?, 'DNI', ?, 'NATURAL', 'TITULAR, PRUEBA',"
                                    + " 'siembra')")) {
                sentencia.setLong(1, municipalidad);
                sentencia.setString(2, codigo);
                sentencia.setString(3, dni);
                sentencia.executeUpdate();
                app.commit();
                return codigo;
            }
        } catch (SQLException excepcion) {
            throw new IllegalStateException(excepcion);
        }
    }

    /** No acumula nada: aqui se mide el periodo guardado, no la mora (D-02). */
    private static final class SinAcumulacion implements PoliticaDeMora {
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
}
