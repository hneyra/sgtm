package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.catastro.LectorDeFichas;
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDePrograma;
import pe.gob.sgtm.fiscalizacion.dominio.Hallazgo;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #45 — Capa web: se prueba el transporte, no la persistencia —eso ya lo verifica {@code
 * ActaFiscalizacionRepositoryJdbcTest} contra PostgreSQL real.
 */
@DisplayName("Capa web — POST /api/v1/fiscalizacion/vehicular")
class ActaVehicularControllerTest {

    private static final long PROGRAMA_VEHICULAR = 2L;

    private final List<ActaFiscalizacion> guardadas = new ArrayList<>();
    private final RegistrarActaFiscalizacion servicio =
            new RegistrarActaFiscalizacion(
                    new ActaFiscalizacionRepository() {
                        private long siguiente = 1;

                        @Override
                        public ActaFiscalizacion insertar(ActaFiscalizacion acta) {
                            ActaFiscalizacion guardada =
                                    new ActaFiscalizacion(
                                            siguiente++,
                                            acta.programaId(),
                                            acta.version(),
                                            acta.contribuyenteId(),
                                            acta.predioId(),
                                            acta.vehiculoId(),
                                            acta.fichaId(),
                                            acta.fechaVisita(),
                                            acta.fiscalizador(),
                                            acta.hallazgo(),
                                            acta.areaHallada(),
                                            acta.detalle(),
                                            acta.estado(),
                                            acta.observacion());
                            guardadas.add(guardada);
                            return guardada;
                        }

                        @Override
                        public Optional<ActaFiscalizacion> findById(long id) {
                            return guardadas.stream()
                                    .filter(acta -> acta.id() != null && acta.id() == id)
                                    .findFirst();
                        }

                        @Override
                        public int siguienteVersion(long programaId, long contribuyenteId) {
                            return 1;
                        }
                    },
                    new ProgramaFiscalizacionRepository() {
                        @Override
                        public ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa) {
                            throw new UnsupportedOperationException(
                                    "esta prueba no escribe programas");
                        }

                        @Override
                        public Optional<ProgramaFiscalizacion> findById(long id) {
                            return id == PROGRAMA_VEHICULAR
                                    ? Optional.of(
                                            new ProgramaFiscalizacion(
                                                    PROGRAMA_VEHICULAR,
                                                    "PF-002",
                                                    "Muestra vehicular",
                                                    TipoDePrograma.VEHICULAR,
                                                    LocalDate.of(2026, 1, 1),
                                                    null,
                                                    EstadoDePrograma.ABIERTO))
                                    : Optional.empty();
                        }
                    },
                    new LectorDeFichas() {
                        @Override
                        public Optional<Long> fichaVigenteEn(long predioId, LocalDate fecha) {
                            return Optional.empty();
                        }

                        @Override
                        public Optional<pe.gob.sgtm.dominio.AreaM2> areaDeLaVersion(long fichaId) {
                            return Optional.empty();
                        }
                    },
                    (RegistroDeAuditoria registro) -> {});

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new ActaVehicularController(servicio))
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
    @DisplayName("registra el acta y devuelve 201, nunca con ficha")
    void registraElActaYDevuelve201SinFicha() throws Exception {
        String cuerpo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":2,"
                        + "\"contribuyenteId\":10,\"vehiculoId\":30,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\",\"hallazgo\":\"OMISO\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/vehicular")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"fichaId\":null")
                .contains("\"vehiculoId\":30")
                .contains("\"hallazgo\":\"OMISO\"");
    }

    @Test
    @DisplayName("el filtro «hallazgo» viaja por la consulta y llega al acta guardada (#425)")
    void elHallazgoViajaPorLaConsulta() throws Exception {
        String sinHallazgo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":2,"
                        + "\"contribuyenteId\":10,\"vehiculoId\":30,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/vehicular")
                                        .param("hallazgo", "SUBVALUADOR")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(sinHallazgo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(guardadas)
                .as(
                        "no basta con que responda 201: sin leer la consulta el acta quedaba"
                                + " guardada SIN hallazgo, que es una inspeccion sin conclusion")
                .singleElement()
                .satisfies(acta -> assertThat(acta.hallazgo()).isEqualTo(Hallazgo.SUBVALUADOR));
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"hallazgo\":\"SUBVALUADOR\"");
    }

    @Test
    @DisplayName("y si viene en los dos sitios gana el cuerpo: el cliente viejo sigue igual")
    void elCuerpoGanaALaConsulta() throws Exception {
        String conHallazgo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":2,"
                        + "\"contribuyenteId\":10,\"vehiculoId\":30,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\",\"hallazgo\":\"OMISO\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/vehicular")
                                        .param("hallazgo", "SUBVALUADOR")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(conHallazgo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(guardadas)
                .singleElement()
                .satisfies(acta -> assertThat(acta.hallazgo()).isEqualTo(Hallazgo.OMISO));
    }

    @Test
    @DisplayName("un hallazgo desconocido en la consulta, 422 y no guarda nada")
    void unHallazgoDesconocidoEnLaConsulta422() throws Exception {
        String sinHallazgo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":2,"
                        + "\"contribuyenteId\":10,\"vehiculoId\":30,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/vehicular")
                                        .param("hallazgo", "INVENTADO")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(sinHallazgo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(guardadas).isEmpty();
    }

    @Test
    @DisplayName("contra un programa predial, 422 y no guarda nada")
    void contraUnProgramaPredial422() throws Exception {
        String cuerpo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":999,"
                        + "\"contribuyenteId\":10,\"vehiculoId\":30,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/vehicular")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(guardadas).isEmpty();
    }
}
