package pe.gob.sgtm.valores.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.ConsultaDeDeudaPublica;
import pe.gob.sgtm.cuentacorriente.MovimientoDeFase;
import pe.gob.sgtm.cuentacorriente.ObligacionPublica;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.valores.aplicacion.IniciarCorridaMasiva;
import pe.gob.sgtm.valores.aplicacion.PasarACoactiva;
import pe.gob.sgtm.valores.aplicacion.PlazosParametrizados;
import pe.gob.sgtm.valores.aplicacion.RegistrarNotificacion;
import pe.gob.sgtm.valores.aplicacion.RegistrarValor;
import pe.gob.sgtm.valores.dobles.ContribuyentesDeMentira;
import pe.gob.sgtm.valores.dobles.MovimientosEnMemoria;
import pe.gob.sgtm.valores.dobles.NotificacionesEnMemoria;
import pe.gob.sgtm.valores.dobles.ParametrosDeMentira;
import pe.gob.sgtm.valores.dobles.ValoresEnMemoria;
import pe.gob.sgtm.valores.dominio.CriterioDeValor;
import pe.gob.sgtm.valores.dominio.ValorMasivo;
import pe.gob.sgtm.valores.dominio.ValorMasivoItem;
import pe.gob.sgtm.valores.dominio.ValorMasivoRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #37 — Capa web: se prueba el transporte, no la persistencia —eso lo verifica {@code
 * ValorRepositoryJdbcTest} contra PostgreSQL real—.
 */
@DisplayName("Capa web — /api/v1/valores")
class ValoresControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 3, 15);
    private static final Ejercicio EJERCICIO_DEUDA = new Ejercicio(2025);

    private final ValoresEnMemoria repositorio = new ValoresEnMemoria();
    private final DeudaDeMentira deuda = new DeudaDeMentira();
    private final ContribuyentesDeMentira contribuyentes = new ContribuyentesDeMentira();
    private final RepositorioMasivoDeMentira repositorioMasivo = new RepositorioMasivoDeMentira();
    private final IniciarCorridaMasiva iniciarMasivo =
            new IniciarCorridaMasiva(
                    repositorioMasivo,
                    contribuyentes,
                    Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC));
    private final RegistrarValor registrar =
            new RegistrarValor(
                    repositorio,
                    deuda,
                    new MovimientoDeFase() {
                        @Override
                        public void moverAValor(
                                Ejercicio ejercicio,
                                long contribuyenteId,
                                String tributo,
                                @Nullable Integer periodo,
                                @Nullable Long predioId,
                                @Nullable Long vehiculoId,
                                String referenciaExterna,
                                Dinero monto,
                                LocalDate fechaValor,
                                String documentoOrigen,
                                Observacion observacion) {}
                    },
                    (RegistroDeAuditoria registro) -> {},
                    Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC));

    private final NotificacionesEnMemoria notificaciones = new NotificacionesEnMemoria();
    private final MovimientosEnMemoria movimientos = new MovimientosEnMemoria();
    private final ParametrosDeMentira parametros =
            new ParametrosDeMentira().con("PLAZO", "NOTIFICACION_VALOR-OP", "20 DIAS_HABILES");
    private final RegistrarNotificacion notificar =
            new RegistrarNotificacion(
                    repositorio,
                    notificaciones,
                    contribuyentes,
                    new PlazosParametrizados(parametros),
                    (RegistroDeAuditoria registro) -> {});
    private final PasarACoactiva pasarACoactiva =
            new PasarACoactiva(
                    repositorio,
                    notificaciones,
                    movimientos,
                    (RegistroDeAuditoria registro) -> {},
                    Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC));

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new ValoresController(
                                    registrar,
                                    repositorio,
                                    contribuyentes,
                                    iniciarMasivo,
                                    notificar,
                                    pasarACoactiva))
                    .setControllerAdvice(new ManejadorDeErrores())
                    .setMessageConverters(
                            new JacksonJsonHttpMessageConverter(
                                    JsonMapper.builder()
                                            .addModule(
                                                    new ConfiguracionDeJson()
                                                            .moduloDeObjetosDeValor())
                                            .build()))
                    .build();

    @Test
    @DisplayName("emite un valor y devuelve 201 con su numero")
    void emiteUnValorYDevuelve201() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));
        deuda.con(
                new ObligacionPublica(
                        "PREDIAL",
                        EJERCICIO_DEUDA,
                        55L,
                        null,
                        HOY,
                        Dinero.de(100),
                        Dinero.CERO,
                        Dinero.CERO,
                        Dinero.CERO));

        String cuerpo =
                """
                {"tipo":"OP","codContribuyente":"C-0007",
                 "obligaciones":[{"tributo":"PREDIAL","ejercicio":2025,"predioId":55}],
                 "observacion":"Se emite para la prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"numero\":\"OP-2026-");
    }

    @Test
    @DisplayName("sin observacion, 422: no se guarda")
    void sinObservacionRechaza() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));
        deuda.con(
                new ObligacionPublica(
                        "PREDIAL",
                        EJERCICIO_DEUDA,
                        55L,
                        null,
                        HOY,
                        Dinero.de(100),
                        Dinero.CERO,
                        Dinero.CERO,
                        Dinero.CERO));

        String cuerpo =
                """
                {"tipo":"OP","codContribuyente":"C-0007",
                 "obligaciones":[{"tributo":"PREDIAL","ejercicio":2025,"predioId":55}]}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(
                        repositorio
                                .buscar(
                                        new CriterioDeValor(null, null, null, null),
                                        Paginacion.de(1, 20, "numero"))
                                .contenido())
                .isEmpty();
    }

    @Test
    @DisplayName("un codigo de contribuyente que no existe, 404")
    void contribuyenteInexistente404() throws Exception {
        String cuerpo =
                """
                {"tipo":"OP","codContribuyente":"NO-EXISTE",
                 "obligaciones":[{"tributo":"PREDIAL","ejercicio":2025,"predioId":55}],
                 "observacion":"Se emite para la prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("busqueda por un codigo que no existe devuelve pagina vacia, no error")
    void busquedaPorCodigoInexistenteDaPaginaVacia() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.get("/api/v1/valores")
                                        .param("codContribuyente", "NO-EXISTE"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"totalElementos\":0");
    }

    @Test
    @DisplayName("masivo por seleccion: registra la corrida en CRITERIO, sin generar nada todavia")
    void masivoPorSeleccionRegistraLaCorrida() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));

        String cuerpo =
                """
                {"tipo":"OP","ejercicioDesde":2024,"ejercicioHasta":2026,
                 "contribuyentes":["C-0007"],"observacion":"Corrida de prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores/masivo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"totalCandidatos\":1")
                .contains("\"origen\":\"SELECCION\"");
    }

    @Test
    @DisplayName("masivo con un codigo que no existe, rechaza la corrida entera (RF-133)")
    void masivoConCodigoInexistenteRechazaTodo() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));

        String cuerpo =
                """
                {"tipo":"OP","ejercicioDesde":2024,"ejercicioHasta":2026,
                 "contribuyentes":["C-0007","NO-EXISTE"],"observacion":"Corrida de prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores/masivo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(repositorioMasivo.corridas).isEmpty();
    }

    @Test
    @DisplayName("masivo sin 'contribuyentes' ni 'archivoCsv', 422")
    void masivoSinCriterioRechaza() throws Exception {
        String cuerpo =
                """
                {"tipo":"OP","ejercicioDesde":2024,"ejercicioHasta":2026,
                 "observacion":"Corrida de prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores/masivo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }

    @Test
    @DisplayName("masivo por importacion: lee el CSV en base64 y registra la corrida")
    void masivoPorImportacionRegistraLaCorrida() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));
        String csv = "codContribuyente\nC-0007\n";
        String base64 =
                java.util.Base64.getEncoder()
                        .encodeToString(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        String cuerpo =
                """
                {"tipo":"RD","ejercicioDesde":2024,"ejercicioHasta":2026,
                 "archivoCsv":"%s","observacion":"Corrida importada"}
                """
                        .formatted(base64);

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores/masivo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"origen\":\"IMPORTACION\"");
    }

    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    //  #39 — notificacion y pase a coactiva
    // ------------------------------------------------------------------

    @Test
    @DisplayName("notifica un valor y devuelve 201 con la fecha desde la que es exigible")
    void notificaUnValorYDevuelve201() throws Exception {
        emitirUnValor();

        MvcResult resultado = notificar("NOTIFICADO", "2026-04-03");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"surtioEfecto\":true");
        assertThat(cuerpo).contains("\"exigibleDesde\":\"2026-05-");
        assertThat(cuerpo).contains("\"intento\":1");
    }

    @Test
    @DisplayName("una diligencia no hallada sale con exigibleDesde nulo, no con una fecha")
    void laDiligenciaNoHalladaSaleSinExigibilidad() throws Exception {
        emitirUnValor();

        MvcResult resultado = notificar("NO_UBICADO", "2026-04-03");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"surtioEfecto\":false")
                .contains("\"exigibleDesde\":null");
    }

    @Test
    @DisplayName("notificar sin observacion, 422")
    void notificarSinObservacionRechaza() throws Exception {
        emitirUnValor();

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post(
                                                "/api/v1/valores/OP-2026-000001/notificacion")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"fechaDeNotificacion":"2026-04-03",
                                                 "tipoDeNotificacion":"PERSONAL",
                                                 "resultado":"NOTIFICADO",
                                                 "notificador":"J. RUIZ PALACIOS",
                                                 "direccion":"CALLE 1"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }

    @Test
    @DisplayName("notificar un valor que no existe, 404")
    void notificarUnValorInexistente404() throws Exception {
        MvcResult resultado = notificar("NOTIFICADO", "2026-04-03");
        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("un valor no notificado no pasa a coactiva: 422")
    void unValorNoNotificadoNoPasa() throws Exception {
        emitirUnValor();

        MvcResult resultado = pasarACoactiva("2026-06-01");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("no esta notificado");
    }

    @Test
    @DisplayName("pasar dos veces devuelve el mismo movimiento, no dos")
    void pasarDosVecesDevuelveElMismo() throws Exception {
        emitirUnValor();
        notificar("NOTIFICADO", "2026-04-03");

        String primero = pasarACoactiva("2026-06-01").getResponse().getContentAsString();
        String segundo = pasarACoactiva("2026-06-10").getResponse().getContentAsString();

        assertThat(primero).contains("\"tipoDeMovimiento\":\"PCO\"");
        assertThat(segundo).isEqualTo(primero);
        assertThat(movimientos.cuantos()).isEqualTo(1);
    }

    @Test
    @DisplayName("ACO y RCO se rechazan con un mensaje que dice de quien son")
    void aceptadoYRechazadoSeRechazan() throws Exception {
        emitirUnValor();

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post(
                                                "/api/v1/valores/OP-2026-000001/movimientos")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"tipoDeMovimiento":"ACO",
                                                 "observacion":"Aceptado en coactivas"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("modulo coactiva");
    }

    // ------------------------------------------------------------------

    private void emitirUnValor() throws Exception {
        contribuyentes
                .con(new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"))
                .conDomicilio(7L, LocalDate.of(2020, 1, 1), "CALLE VIEJA 100");
        deuda.con(
                new ObligacionPublica(
                        "PREDIAL",
                        EJERCICIO_DEUDA,
                        55L,
                        null,
                        HOY,
                        Dinero.de(100),
                        Dinero.CERO,
                        Dinero.CERO,
                        Dinero.CERO));
        mvc.perform(
                        MockMvcRequestBuilders.post("/api/v1/valores")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"tipo":"OP","codContribuyente":"C-0007",
                                         "obligaciones":[
                                            {"tributo":"PREDIAL","ejercicio":2025,"predioId":55}],
                                         "observacion":"Se emite para la prueba"}
                                        """))
                .andReturn();
    }

    private MvcResult notificar(String resultado, String fecha) throws Exception {
        return mvc.perform(
                        MockMvcRequestBuilders.post("/api/v1/valores/OP-2026-000001/notificacion")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"fechaDeNotificacion":"%s",
                                         "tipoDeNotificacion":"PERSONAL",
                                         "resultado":"%s",
                                         "notificador":"J. RUIZ PALACIOS",
                                         "personaQueRecibe":"TITULAR",
                                         "observacion":"Se diligencia para la prueba"}
                                        """
                                                .formatted(fecha, resultado)))
                .andReturn();
    }

    private MvcResult pasarACoactiva(String fecha) throws Exception {
        return mvc.perform(
                        MockMvcRequestBuilders.post("/api/v1/valores/OP-2026-000001/movimientos")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"tipoDeMovimiento":"PCO",
                                         "fechaDelMovimiento":"%s",
                                         "observacion":"Se pasa para la prueba"}
                                        """
                                                .formatted(fecha)))
                .andReturn();
    }

    private static final class DeudaDeMentira implements ConsultaDeDeudaPublica {

        private final List<ObligacionPublica> obligaciones = new ArrayList<>();

        void con(ObligacionPublica obligacion) {
            obligaciones.add(obligacion);
        }

        @Override
        public List<ObligacionPublica> deTodoElContribuyente(
                long contribuyenteId, LocalDate fecha) {
            return List.copyOf(obligaciones);
        }
    }

    private static final class RepositorioMasivoDeMentira implements ValorMasivoRepository {

        private long siguienteId = 1;
        private final List<ValorMasivo> corridas = new ArrayList<>();

        @Override
        public ValorMasivo iniciar(ValorMasivo corrida, List<Long> contribuyenteIds) {
            ValorMasivo conId =
                    new ValorMasivo(
                            siguienteId++,
                            corrida.tipo(),
                            corrida.tributo(),
                            corrida.ejercicioDesde(),
                            corrida.ejercicioHasta(),
                            corrida.fechaCriterio(),
                            corrida.origen(),
                            contribuyenteIds.size(),
                            "prueba",
                            null,
                            corrida.observacion());
            corridas.add(conId);
            return conId;
        }

        @Override
        public Optional<ValorMasivo> porId(long id) {
            return corridas.stream().filter(c -> c.id() != null && c.id() == id).findFirst();
        }

        @Override
        public List<ValorMasivoItem> itemsPendientes(long corridaId, long desdeId, int maximo) {
            return List.of();
        }

        @Override
        public List<ValorMasivoItem> itemsGenerados(long corridaId) {
            return List.of();
        }

        @Override
        public long contarPendientes(long corridaId) {
            return 0;
        }

        @Override
        public void marcarGenerado(long itemId, long valorId) {}

        @Override
        public void marcarSinDeuda(long itemId) {}
    }
}
