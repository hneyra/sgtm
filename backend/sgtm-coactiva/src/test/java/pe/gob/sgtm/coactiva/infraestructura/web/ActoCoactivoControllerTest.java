package pe.gob.sgtm.coactiva.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.coactiva.aplicacion.ConsultaDeExpedientes;
import pe.gob.sgtm.coactiva.aplicacion.ConsultaDelProcesoCoactivo;
import pe.gob.sgtm.coactiva.aplicacion.ImportarValoresACoactiva;
import pe.gob.sgtm.coactiva.aplicacion.NotificarActoCoactivo;
import pe.gob.sgtm.coactiva.aplicacion.PlazosCoactivosParametrizados;
import pe.gob.sgtm.coactiva.aplicacion.RegistrarActoCoactivo;
import pe.gob.sgtm.coactiva.aplicacion.ReimprimirActoCoactivo;
import pe.gob.sgtm.coactiva.dobles.ActosEnMemoria;
import pe.gob.sgtm.coactiva.dobles.ContribuyentesDeMentira;
import pe.gob.sgtm.coactiva.dobles.DiligenciasEnMemoria;
import pe.gob.sgtm.coactiva.dobles.DocumentosEnMemoria;
import pe.gob.sgtm.coactiva.dobles.ExpedientesEnMemoria;
import pe.gob.sgtm.coactiva.dobles.LibroDeMentira;
import pe.gob.sgtm.coactiva.dobles.MovimientosDelExpedienteEnMemoria;
import pe.gob.sgtm.coactiva.dobles.PlazosDeMentira;
import pe.gob.sgtm.coactiva.dobles.ValoresDeMentira;
import pe.gob.sgtm.coactiva.dominio.PlantillaDeNumeroDeExpediente;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.ObligacionPublica;
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.GeneradorDeDocumentos;
import pe.gob.sgtm.documentos.RegimenDeLaInstalacion;
import pe.gob.sgtm.documentos.RenderizadorPdf;
import pe.gob.sgtm.documentos.RenderizadorRtf;
import pe.gob.sgtm.documentos.RenderizadorXls;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.valores.ObligacionDelValor;
import pe.gob.sgtm.valores.ValorParaCoactiva;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #41 — Capa web: se prueba el transporte y los codigos de respuesta, no la persistencia —eso lo
 * verifica {@code ActosCoactivosJdbcTest} contra PostgreSQL real—.
 *
 * <p>Lo que si se prueba aqui, y no alla, es la <b>traduccion a codigos HTTP</b>: 422 cuando la
 * peticion no cumple una regla de validacion, 409 cuando la peticion esta bien y lo que no la
 * admite es el estado del procedimiento, 404 cuando no existe. Quien opera hace cosas distintas con
 * cada uno —corregir el formulario, esperar, o buscar bien—, y confundirlos le hace perder el dia.
 */
@DisplayName("Capa web — los actos coactivos y sus notificaciones")
class ActoCoactivoControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 6, 15);
    private static final Clock RELOJ =
            Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final String EJECUTOR = "ejecutor.coactivo";

    /** El mismo dia que la prueba contra PostgreSQL: la diligencia del miercoles 17. */
    private static final String DILIGENCIA = "2026-06-17";

    /** Y el mismo resultado: siete dias habiles despues, la medida se puede dictar el 30. */
    private static final String REC2_DESDE = "2026-06-30";

    private final MovimientosDelExpedienteEnMemoria movimientos =
            new MovimientosDelExpedienteEnMemoria();
    private final ExpedientesEnMemoria expedientes = new ExpedientesEnMemoria(movimientos);
    private final ActosEnMemoria actos = new ActosEnMemoria();
    private final DiligenciasEnMemoria diligencias = new DiligenciasEnMemoria();

    private final ValoresDeMentira valores =
            new ValoresDeMentira().con(valor(1L, "OP-2026-000001", "COACTIVA", true));

    private final LibroDeMentira libro =
            new LibroDeMentira()
                    .con(
                            new ObligacionPublica(
                                    "PREDIAL",
                                    EJERCICIO,
                                    null,
                                    null,
                                    HOY,
                                    Dinero.de("500.00"),
                                    Dinero.de("10.00"),
                                    Dinero.de("25.50"),
                                    Dinero.CERO));

    private final LibroDeMentira libroPagado = new LibroDeMentira();

    private final ContribuyentesDeMentira contribuyentes =
            new ContribuyentesDeMentira()
                    .con(new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 1234"));

    private final ConsultaDeExpedientes consulta =
            new ConsultaDeExpedientes(expedientes, movimientos, valores, libro);

    private final ConsultaDeExpedientes consultaSinDeuda =
            new ConsultaDeExpedientes(expedientes, movimientos, valores, libroPagado);

    private final EmitirDocumento documentos =
            new EmitirDocumento(
                    new DocumentosEnMemoria(),
                    new GeneradorDeDocumentos(
                            List.of(
                                    new RenderizadorPdf(),
                                    new RenderizadorXls(),
                                    new RenderizadorRtf()),
                            RegimenDeLaInstalacion.REAL),
                    (RegistroDeAuditoria registro) -> {},
                    RELOJ);

    private final PlazosCoactivosParametrizados plazos =
            new PlazosCoactivosParametrizados(new PlazosDeMentira("7 DIAS_HABILES"));

    private final MockMvc mvc = montar(consulta);

    private final MockMvc mvcPagado = montar(consultaSinDeuda);

    private MockMvc montar(ConsultaDeExpedientes cual) {
        return MockMvcBuilders.standaloneSetup(
                        new ActoCoactivoController(
                                new RegistrarActoCoactivo(
                                        expedientes,
                                        movimientos,
                                        actos,
                                        diligencias,
                                        cual,
                                        valores,
                                        contribuyentes,
                                        plazos,
                                        documentos,
                                        (RegistroDeAuditoria registro) -> {},
                                        RELOJ),
                                new NotificarActoCoactivo(
                                        actos,
                                        diligencias,
                                        expedientes,
                                        movimientos,
                                        plazos,
                                        (RegistroDeAuditoria registro) -> {},
                                        RELOJ),
                                new ReimprimirActoCoactivo(actos, expedientes, documentos),
                                new ConsultaDelProcesoCoactivo(cual, actos, diligencias),
                                contribuyentes,
                                RELOJ))
                .setControllerAdvice(new ManejadorDeErrores())
                .setMessageConverters(
                        new JacksonJsonHttpMessageConverter(
                                JsonMapper.builder()
                                        .addModule(
                                                new ConfiguracionDeJson().moduloDeObjetosDeValor())
                                        .build()))
                .build();
    }

    /** El origen lo fija el borde de la aplicacion; aqui no hay borde, asi que se fija a mano. */
    @BeforeEach
    void abrirElExpediente() {
        OrigenContext.fijar(new Origen(EJECUTOR, "PC-COACTIVA-01", "10.1.1.9"));
        new ImportarValoresACoactiva(
                        expedientes,
                        movimientos,
                        valores,
                        (RegistroDeAuditoria registro) -> {},
                        RELOJ)
                .importar(
                        new ImportarValoresACoactiva.Peticion(
                                7L,
                                List.of(),
                                "R. MENDOZA CRUZ",
                                null,
                                "Cobranza coactiva",
                                "AV. GRAU 100 - SULLANA"),
                        HOY,
                        PlantillaDeNumeroDeExpediente.POR_OMISION,
                        Observacion.de("Se importa para la prueba"));
    }

    @AfterEach
    void limpiarOrigen() {
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------

    @Nested
    @DisplayName("POST /coactiva/rec/impresion")
    class Rec {

        @Test
        @DisplayName("emite la REC-1 y devuelve 201 con el papel y la deuda con su fecha")
        void emiteLaRec1() throws Exception {
            MvcResult resultado = emitirRec("REC1", null, null);

            assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
            String cuerpo = resultado.getResponse().getContentAsString();
            assertThat(cuerpo).contains("\"expediente\":\"EXP-2026-000001\"");
            assertThat(cuerpo).contains("\"tipo\":\"REC1\"");
            assertThat(cuerpo).contains("\"numero\":\"REC1-2026-000001\"");
            assertThat(cuerpo)
                    .as("el resumen SHA-256 viaja: es lo que hace comprobable la reimpresion")
                    .containsPattern("\"resumen\":\"[0-9a-f]{64}\"");
            assertThat(cuerpo).contains("\"estadoDelExpediente\":\"REC 01 EMITIDO\"");
            assertThat(cuerpo).doesNotContain("\"rechazadas\":[{");
        }

        @Test
        @DisplayName("sin observacion, 422: no se emite nada (regla 10)")
        void sinObservacion422() throws Exception {
            MvcResult resultado =
                    mvc.perform(
                                    MockMvcRequestBuilders.post("/api/v1/coactiva/rec/impresion")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"expedientes\":[\"EXP-2026-000001\"],"
                                                            + "\"rec\":\"REC1\"}"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
            assertThat(resultado.getResponse().getContentAsString()).contains("observacion");
        }

        @Test
        @DisplayName("sin ningun expediente marcado, 422")
        void sinExpedientes422() throws Exception {
            MvcResult resultado =
                    mvc.perform(
                                    MockMvcRequestBuilders.post("/api/v1/coactiva/rec/impresion")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"expedientes\":[],\"observacion\":\"Se"
                                                            + " emite la REC\"}"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        }

        @Test
        @DisplayName("con el expediente ya pagado, 200 y el informe explica por que no salio")
        void conDeudaCero200ConMotivo() throws Exception {
            MvcResult resultado =
                    mvcPagado
                            .perform(
                                    MockMvcRequestBuilders.post("/api/v1/coactiva/rec/impresion")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"expedientes\":[\"EXP-2026-000001\"],"
                                                            + "\"rec\":\"REC1\",\"observacion\":\"Se"
                                                            + " emite la REC\"}"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus())
                    .as("no salio ninguna, pero la peticion estaba bien formada")
                    .isEqualTo(200);
            String cuerpo = resultado.getResponse().getContentAsString();
            assertThat(cuerpo).contains("\"emitidas\":[]");
            assertThat(cuerpo)
                    .as("expediente por expediente, con su motivo: un «0 de 1» no dice que hacer")
                    .contains("no tiene deuda");
        }

        @Test
        @DisplayName("un expediente que no existe se rechaza sin tumbar la corrida")
        void unExpedienteQueNoExisteSeRechaza() throws Exception {
            MvcResult resultado =
                    mvc.perform(
                                    MockMvcRequestBuilders.post("/api/v1/coactiva/rec/impresion")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"expedientes\":[\"EXP-2026-000001\","
                                                            + "\"EXP-2026-999999\"],\"rec\":\"REC1\","
                                                            + "\"observacion\":\"Se emite la REC\"}"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus())
                    .as("una salio: 201, y el informe dice que la otra no")
                    .isEqualTo(201);
            String cuerpo = resultado.getResponse().getContentAsString();
            assertThat(cuerpo).contains("EXP-2026-999999");
            assertThat(cuerpo).contains("REC1-2026-000001");
        }

        @Test
        @DisplayName("una REC-2 sin REC-1 notificada se rechaza con su motivo")
        void laRec2SinRec1SeRechaza() throws Exception {
            MvcResult resultado = emitirRec("REC2", "EMBARGO EN FORMA DE RETENCIÓN", null);

            assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
            assertThat(resultado.getResponse().getContentAsString()).contains("no tiene REC-1");
        }

        @Test
        @DisplayName("una medida cautelar que la norma no reconoce, 422")
        void unaMedidaDesconocida422() throws Exception {
            MvcResult resultado = emitirRec("REC2", "EMBARGO DE LO QUE SEA", null);

            assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
            assertThat(resultado.getResponse().getContentAsString()).contains("art. 33");
        }
    }

    @Nested
    @DisplayName("POST /coactiva/expedientes/{numero}/actos y /coactiva/notificaciones")
    class ActosYNotificaciones {

        @Test
        @DisplayName("el ciclo por HTTP: REC-1, notificacion con acuse y REC-2 con su medida")
        void elCicloPorHttp() throws Exception {
            assertThat(emitirRec("REC1", null, null).getResponse().getStatus()).isEqualTo(201);

            MvcResult acuse = notificar("REC1-2026-000001", DILIGENCIA, "NOTIFICADO");

            assertThat(acuse.getResponse().getStatus()).isEqualTo(201);
            assertThat(acuse.getResponse().getContentAsString())
                    .contains("\"intento\":1")
                    .contains("\"surtioEfecto\":true")
                    .as("los siete dias habiles salen del parametro, no de un 7 compilado")
                    .contains("\"exigibleDesde\":\"" + REC2_DESDE + "\"");

            MvcResult rec2 =
                    mvc.perform(
                                    MockMvcRequestBuilders.post(
                                                    "/api/v1/coactiva/expedientes/EXP-2026-000001"
                                                            + "/actos")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"tipo\":\"REC2\",\"fecha\":\""
                                                            + REC2_DESDE
                                                            + "\",\"glosa\":\"medida cautelar\","
                                                            + "\"medida\":\"RETENCION\","
                                                            + "\"observacion\":\"Se traba la"
                                                            + " medida\"}"))
                            .andReturn();

            assertThat(rec2.getResponse().getStatus()).isEqualTo(201);
            String cuerpo = rec2.getResponse().getContentAsString();
            assertThat(cuerpo).contains("\"medida\":\"EMBARGO EN FORMA DE RETENCION\"");
            assertThat(cuerpo).contains("\"estadoDelExpediente\":\"REC 02 EMITIDA\"");
            assertThat(cuerpo)
                    .as("toda cifra sale con su fecha (RNF-075, regla 9)")
                    .contains("\"deudaAlDia\":\"" + REC2_DESDE + "\"");
        }

        @Test
        @DisplayName("la REC-2 antes de que venza el plazo, 409 diciendo desde cuando si")
        void laRec2PrematuraDa409() throws Exception {
            emitirRec("REC1", null, null);
            notificar("REC1-2026-000001", DILIGENCIA, "NOTIFICADO");

            MvcResult resultado =
                    mvc.perform(
                                    MockMvcRequestBuilders.post(
                                                    "/api/v1/coactiva/expedientes/EXP-2026-000001"
                                                            + "/actos")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"tipo\":\"REC2\",\"fecha\":\"2026-06-20\","
                                                            + "\"glosa\":\"medida cautelar\","
                                                            + "\"medida\":\"RETENCION\","
                                                            + "\"observacion\":\"Se traba la"
                                                            + " medida\"}"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus())
                    .as("la peticion esta bien formada: lo que no la admite es el procedimiento")
                    .isEqualTo(409);
            assertThat(resultado.getResponse().getContentAsString()).contains(REC2_DESDE);
        }

        @Test
        @DisplayName("una diligencia no hallada se reintenta sin perder la anterior")
        void elReintentoConservaLaAnterior() throws Exception {
            emitirRec("REC1", null, null);

            assertThat(
                            notificar("REC1-2026-000001", DILIGENCIA, "NO_UBICADO")
                                    .getResponse()
                                    .getContentAsString())
                    .contains("\"intento\":1")
                    .contains("\"surtioEfecto\":false")
                    .contains("\"exigibleDesde\":null");

            MvcResult segunda = notificar("REC1-2026-000001", "2026-06-24", "NOTIFICADO");

            assertThat(segunda.getResponse().getStatus()).isEqualTo(201);
            String cuerpo = segunda.getResponse().getContentAsString();
            assertThat(cuerpo)
                    .as("las dos diligencias viajan: la fallida sostiene la notificacion siguiente")
                    .contains("\"intento\":1")
                    .contains("\"intento\":2")
                    .contains("\"resultado\":\"NO_UBICADO\"")
                    .contains("\"resultado\":\"NOTIFICADO\"");
        }

        @Test
        @DisplayName("notificar un acto que no existe, 404")
        void notificarLoQueNoExiste404() throws Exception {
            assertThat(
                            notificar("REC1-2026-999999", DILIGENCIA, "NOTIFICADO")
                                    .getResponse()
                                    .getStatus())
                    .isEqualTo(404);
        }

        @Test
        @DisplayName("un resultado que la pantalla no ofrece, 422: no se traduce a algo parecido")
        void unResultadoDesconocido422() throws Exception {
            emitirRec("REC1", null, null);

            MvcResult resultado = notificar("REC1-2026-000001", DILIGENCIA, "PENDIENTE");

            assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
            assertThat(resultado.getResponse().getContentAsString())
                    .contains("una diligencia que todavia no ocurrio");
        }

        @Test
        @DisplayName("sin observacion, 422 tambien al notificar (regla 10)")
        void notificarSinObservacion422() throws Exception {
            emitirRec("REC1", null, null);

            MvcResult resultado =
                    mvc.perform(
                                    MockMvcRequestBuilders.post("/api/v1/coactiva/notificaciones")
                                            .contentType(MediaType.APPLICATION_JSON)
                                            .content(
                                                    "{\"acto\":\"REC1-2026-000001\",\"fecha\":\""
                                                            + DILIGENCIA
                                                            + "\",\"modalidad\":\"PERSONAL\","
                                                            + "\"resultado\":\"NOTIFICADO\","
                                                            + "\"notificador\":\"J. RUIZ\"}"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        }
    }

    @Nested
    @DisplayName("GET /coactiva/expedientes/{numero}/proceso")
    class Proceso {

        @Test
        @DisplayName("trae el expediente, sus actuaciones y la deuda proyectada al dia pedido")
        void traeElProceso() throws Exception {
            emitirRec("REC1", null, null);
            notificar("REC1-2026-000001", DILIGENCIA, "NOTIFICADO");

            MvcResult resultado =
                    mvc.perform(
                                    MockMvcRequestBuilders.get(
                                                    "/api/v1/coactiva/expedientes/EXP-2026-000001"
                                                            + "/proceso")
                                            .param("proyectarInteresAl", "2026-07-31"))
                            .andReturn();

            assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
            String cuerpo = resultado.getResponse().getContentAsString();
            assertThat(cuerpo).contains("\"numero\":\"EXP-2026-000001\"");
            assertThat(cuerpo).contains("\"estado\":\"REC 01 NOTIFICADA\"");
            assertThat(cuerpo).contains("\"titulo\":\"RESOLUCION DE EJECUCION COACTIVA\"");
            assertThat(cuerpo)
                    .as("la deuda del proceso dice a que dia esta (regla 9, RNF-075)")
                    .contains("\"deudaAlDia\":\"2026-07-31\"");
            assertThat(cuerpo).contains("\"intento\":1");
        }

        @Test
        @DisplayName("un expediente que no existe, 404")
        void unExpedienteQueNoExiste404() throws Exception {
            assertThat(
                            mvc.perform(
                                            MockMvcRequestBuilders.get(
                                                    "/api/v1/coactiva/expedientes/EXP-2026-999999"
                                                            + "/proceso"))
                                    .andReturn()
                                    .getResponse()
                                    .getStatus())
                    .isEqualTo(404);
        }
    }

    // ------------------------------------------------------------------

    private MvcResult emitirRec(String rec, String medida, String fecha) throws Exception {
        StringBuilder cuerpo = new StringBuilder("{\"expedientes\":[\"EXP-2026-000001\"]");
        cuerpo.append(",\"rec\":\"").append(rec).append('"');
        if (medida != null) {
            cuerpo.append(",\"medida\":\"").append(medida).append('"');
        }
        if (fecha != null) {
            cuerpo.append(",\"fecha\":\"").append(fecha).append('"');
        }
        cuerpo.append(",\"observacion\":\"Se emite la REC\"}");
        return mvc.perform(
                        MockMvcRequestBuilders.post("/api/v1/coactiva/rec/impresion")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo.toString()))
                .andReturn();
    }

    private MvcResult notificar(String acto, String fecha, String resultado) throws Exception {
        return mvc.perform(
                        MockMvcRequestBuilders.post("/api/v1/coactiva/notificaciones")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"acto\":\""
                                                + acto
                                                + "\",\"fecha\":\""
                                                + fecha
                                                + "\",\"modalidad\":\"PERSONAL\",\"resultado\":\""
                                                + resultado
                                                + "\",\"notificador\":\"J. RUIZ PALACIOS\","
                                                + "\"receptor\":\"TITULAR, PRUEBA\","
                                                + "\"observacion\":\"Se diligencio\"}"))
                .andReturn();
    }

    private static ValorParaCoactiva valor(
            long id, String numero, String situacion, boolean conPase) {
        return new ValorParaCoactiva(
                id,
                "OP",
                numero,
                EJERCICIO,
                LocalDate.of(2026, 3, 2),
                7L,
                situacion,
                HOY,
                LocalDate.of(2026, 5, 5),
                conPase,
                Dinero.de("500.00"),
                LocalDate.of(2026, 3, 2),
                List.of(new ObligacionDelValor("PREDIAL", EJERCICIO, null, null)));
    }
}
