package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.GeneradorDeDocumentos;
import pe.gob.sgtm.documentos.RegimenDeLaInstalacion;
import pe.gob.sgtm.documentos.RenderizadorPdf;
import pe.gob.sgtm.documentos.RenderizadorRtf;
import pe.gob.sgtm.documentos.RenderizadorXls;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.ConsultaDeResoluciones;
import pe.gob.sgtm.fiscalizacion.aplicacion.TransferirARentas;
import pe.gob.sgtm.fiscalizacion.dobles.ActasEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.CargosEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.ContribuyentesDeMentira;
import pe.gob.sgtm.fiscalizacion.dobles.DocumentosEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.LiquidacionesEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.MovimientosDeLiquidacionEnMemoria;
import pe.gob.sgtm.fiscalizacion.dobles.PadronQueVersiona;
import pe.gob.sgtm.fiscalizacion.dobles.ResolucionesEnMemoria;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.CondicionFiscalizada;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.fiscalizacion.dominio.LineaDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.Liquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.MovimientoDeLiquidacion;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDeFiscalizacion;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #52 — Capa web. Se prueba el transporte, no la persistencia: eso lo verifica {@code
 * TransferenciaJdbcTest} contra PostgreSQL real.
 */
@DisplayName("Capa web — transferencia a rentas y resolucion de determinacion")
class ResolucionControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 6, 15);
    private static final Observacion OBSERVACION =
            Observacion.de("Se transfiere lo hallado en la inspeccion");
    private static final long PREDIO = 20L;
    private static final long CONTRIBUYENTE = 10L;

    private LiquidacionesEnMemoria liquidaciones;
    private MovimientosDeLiquidacionEnMemoria movimientos;
    private ResolucionesEnMemoria resoluciones;
    private PadronQueVersiona padron;
    private MockMvc mvc;
    private Liquidacion liquidacion;

    @BeforeEach
    void armar() {
        ActasEnMemoria actas = new ActasEnMemoria();
        liquidaciones = new LiquidacionesEnMemoria();
        movimientos = new MovimientosDeLiquidacionEnMemoria();
        resoluciones = new ResolucionesEnMemoria();
        padron = new PadronQueVersiona().con(PREDIO, "120.00", "CASA_HABITACION");

        Clock reloj = Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
        ContribuyentesDeMentira directorio =
                new ContribuyentesDeMentira()
                        .con(CONTRIBUYENTE, "C-0010", "PEREZ, JUAN", "Jr. Union 100");

        long actaId =
                actas.sembrar(
                        ActaFiscalizacion.nuevaPredial(
                                1L,
                                1,
                                CONTRIBUYENTE,
                                PREDIO,
                                null,
                                LocalDate.of(2026, 3, 1),
                                "J. Perez",
                                Hallazgo.SUBVALUADOR,
                                AreaM2.de("300.00"),
                                "ampliacion",
                                OBSERVACION));
        liquidacion =
                liquidaciones.insertar(
                        Liquidacion.primera(
                                "LIQ-2026-000001",
                                new Ejercicio(2026),
                                1L,
                                actaId,
                                new Ejercicio(2024),
                                new Ejercicio(2024),
                                TipoDeFiscalizacion.CIERTA,
                                "Ampliacion detectada",
                                HOY,
                                OBSERVACION),
                        List.of(
                                new LineaDeLiquidacion(
                                        null,
                                        null,
                                        new Ejercicio(2024),
                                        41L,
                                        PREDIO,
                                        null,
                                        CondicionFiscalizada.SUBVALUADOR,
                                        AreaM2.de("120.00"),
                                        AreaM2.de("300.00"),
                                        "CASA_HABITACION",
                                        "COMERCIO",
                                        Dinero.de("30000.00"),
                                        Dinero.de("75000.00"),
                                        Dinero.de("450.00"),
                                        null)));
        movimientos.insertar(
                MovimientoDeLiquidacion.apertura(
                        liquidacion.identificador(), HOY, "emitida", OBSERVACION));
        movimientos.insertar(
                MovimientoDeLiquidacion.cambioDeEstado(
                        liquidacion.identificador(),
                        EstadoDeLiquidacion.LIQUIDADA,
                        HOY,
                        "cerrada",
                        OBSERVACION));

        TransferirARentas transferir =
                new TransferirARentas(
                        liquidaciones,
                        movimientos,
                        actas,
                        resoluciones,
                        padron,
                        new CargosEnMemoria(),
                        directorio,
                        new EmitirDocumento(
                                new DocumentosEnMemoria(),
                                new GeneradorDeDocumentos(
                                        List.of(
                                                new RenderizadorPdf(),
                                                new RenderizadorXls(),
                                                new RenderizadorRtf()),
                                        RegimenDeLaInstalacion.REAL),
                                registro -> {},
                                reloj),
                        registro -> {},
                        reloj);

        mvc =
                MockMvcBuilders.standaloneSetup(
                                new ResolucionController(
                                        transferir,
                                        new ConsultaDeResoluciones(
                                                resoluciones, liquidaciones, directorio),
                                        reloj))
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

    @Test
    @DisplayName("transfiere y devuelve 201 con la resolucion, sus versiones y sus cargos")
    void transfiereYDevuelve201() throws Exception {
        MvcResult resultado = transferir(cuerpoCompleto());

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo)
                .contains("\"numero\":\"RDF-2026-000001\"")
                .contains("\"nLiquidacion\":\"LIQ-2026-000001\"")
                .contains("\"documentoSustento\":\"ACTA-2026-000001\"")
                .contains("\"cargosAsentados\":1")
                .contains("\"diferencia\":\"450.00\"");
        assertThat(cuerpo)
                .as("la multa sigue sin cifra: es D-02c (#198), y un cero se leeria como cero")
                .contains("\"multa\":null")
                .contains("\"total\":null");
        assertThat(padron.escrituras()).isEqualTo(1);
    }

    @Test
    @DisplayName("la respuesta dice a que fecha estan sus cifras (regla 9)")
    void laRespuestaLlevaSuFecha() throws Exception {
        String cuerpo = transferir(cuerpoCompleto()).getResponse().getContentAsString();

        assertThat(cuerpo).contains("\"aLaFecha\":\"2026-06-15\"");
    }

    @Test
    @DisplayName("sin observacion no se transfiere: 422 y el padron intacto")
    void sinObservacion422() throws Exception {
        MvcResult resultado =
                transferir(
                        """
                        {"nLiquidacion":"LIQ-2026-000001","documentoSustento":"ACTA-1",
                         "sustento":"s","baseLegal":"b"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("observacion");
        assertThat(padron.escrituras()).isZero();
    }

    @Test
    @DisplayName("sin sustento documental, 422")
    void sinSustento422() throws Exception {
        MvcResult resultado =
                transferir(
                        """
                        {"observacion":"Se transfiere lo hallado","nLiquidacion":"LIQ-2026-000001",
                         "sustento":"s","baseLegal":"b"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("documentoSustento");
    }

    @Test
    @DisplayName("una liquidacion que no existe da 404, no 500")
    void liquidacionInexistente404() throws Exception {
        MvcResult resultado =
                transferir(
                        """
                        {"observacion":"Se transfiere lo hallado","nLiquidacion":"LIQ-2026-999999",
                         "documentoSustento":"ACTA-1","sustento":"s","baseLegal":"b"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("transferir dos veces da 409, no 500 ni una segunda version")
    void dosVeces409() throws Exception {
        transferir(cuerpoCompleto());
        MvcResult segunda = transferir(cuerpoCompleto());

        assertThat(segunda.getResponse().getStatus()).isEqualTo(409);
        assertThat(padron.escrituras()).isEqualTo(1);
        assertThat(resoluciones.cuantas()).isEqualTo(1);
    }

    @Test
    @DisplayName("la resolucion se lee por su numero, con su cuadro de determinacion")
    void laResolucionSeLeePorSuNumero() throws Exception {
        transferir(cuerpoCompleto());

        MvcResult resultado =
                mvc.perform(get("/api/v1/fiscalizacion/resoluciones/RDF-2026-000001")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo)
                .contains("\"numero\":\"RDF-2026-000001\"")
                .contains("\"condicion\":\"SUBVALUADOR\"")
                .contains("\"areaDeclarada\":\"120.00\"")
                .contains("\"areaHallada\":\"300.00\"")
                .contains("\"contribuyente\":\"PEREZ, JUAN\"");
        assertThat(cuerpo)
                .as("la consulta no inventa un recuento de cargos: eso es del acto, no de leerlo")
                .contains("\"cargosAsentados\":null");
    }

    @Test
    @DisplayName("una resolucion que no existe da 404")
    void resolucionInexistente404() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/fiscalizacion/resoluciones/RDF-2026-999999")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("el cuerpo es lista blanca: un area colada no cambia lo que se inscribe")
    void elCuerpoEsListaBlanca() throws Exception {
        // Si la peticion pudiera traer el area, la transferencia inscribiria en el padron lo que
        // alguien teclea en la pantalla y no lo que se hallo en campo, que es exactamente lo que
        // esta frontera existe para impedir.
        transferir(
                """
                {"observacion":"Se transfiere lo hallado","nLiquidacion":"LIQ-2026-000001",
                 "documentoSustento":"ACTA-2026-000001","sustento":"s","baseLegal":"b",
                 "areaHallada":"9999.00","predioId":"777","usoHallado":"INDUSTRIAL"}
                """);

        assertThat(padron.vigenteDe(PREDIO).area())
                .as("el area inscrita es la del acta, no la del cuerpo")
                .isEqualTo(AreaM2.de("300.00"));
        assertThat(padron.vigenteDe(PREDIO).uso()).isEqualTo("COMERCIO");
    }

    // ------------------------------------------------------------------

    private MvcResult transferir(String cuerpo) throws Exception {
        return mvc.perform(
                        post("/api/v1/fiscalizacion/transferencias")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo))
                .andReturn();
    }

    private static String cuerpoCompleto() {
        return """
                {"observacion":"Se transfiere lo hallado en la inspeccion",
                 "nLiquidacion":"LIQ-2026-000001",
                 "documentoSustento":"ACTA-2026-000001",
                 "sustento":"Ampliacion no declarada, verificada en inspeccion",
                 "baseLegal":"TUO del Codigo Tributario, arts. 76 y 77",
                 "fecha":"2026-06-15"}
                """;
    }
}
