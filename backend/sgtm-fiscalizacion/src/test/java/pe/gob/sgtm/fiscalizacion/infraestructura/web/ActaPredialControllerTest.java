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
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.CriterioDeProgramas;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDePrograma;
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
@DisplayName("Capa web — POST /api/v1/fiscalizacion/predial/actas")
class ActaPredialControllerTest {

    private static final long PROGRAMA_PREDIAL = 1L;

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
                            return id == PROGRAMA_PREDIAL
                                    ? Optional.of(
                                            new ProgramaFiscalizacion(
                                                    PROGRAMA_PREDIAL,
                                                    "PF-001",
                                                    "Muestra predial",
                                                    TipoDePrograma.PREDIAL,
                                                    LocalDate.of(2026, 1, 1),
                                                    null,
                                                    EstadoDePrograma.ABIERTO))
                                    : Optional.empty();
                        }

                        @Override
                        public Pagina<ProgramaFiscalizacion> consultar(
                                CriterioDeProgramas criterio, Paginacion paginacion) {
                            throw new UnsupportedOperationException(
                                    "esta prueba no consulta la grilla de programas");
                        }
                    },
                    new LectorDeFichas() {
                        @Override
                        public Optional<Long> fichaVigenteEn(long predioId, LocalDate fecha) {
                            return Optional.of(700L);
                        }

                        @Override
                        public Optional<pe.gob.sgtm.dominio.AreaM2> areaDeLaVersion(long fichaId) {
                            return Optional.of(pe.gob.sgtm.dominio.AreaM2.de("120.00"));
                        }
                    },
                    (RegistroDeAuditoria registro) -> {});

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new ActaPredialController(servicio))
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
    @DisplayName("registra el acta y devuelve 201 con la ficha resuelta")
    void registraElActaYDevuelve201() throws Exception {
        String cuerpo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":1,"
                        + "\"contribuyenteId\":10,\"predioId\":20,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\",\"hallazgo\":\"CONFORME\","
                        + "\"areaHallada\":\"120.50\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/predial/actas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"fichaId\":700")
                .contains("\"hallazgo\":\"CONFORME\"")
                .contains("\"predioId\":20");
    }

    @Test
    @DisplayName("contra un programa que no existe, 422 y no guarda nada")
    void contraUnProgramaQueNoExiste422() throws Exception {
        String cuerpo =
                "{\"observacion\":\"Se fiscaliza para la prueba\",\"programaId\":999,"
                        + "\"contribuyenteId\":10,\"predioId\":20,\"fechaVisita\":\"2026-03-15\","
                        + "\"fiscalizador\":\"J. Perez\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/predial/actas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(guardadas).isEmpty();
    }

    @Test
    @DisplayName("sin observacion, 422")
    void sinObservacion422() throws Exception {
        String cuerpo =
                "{\"programaId\":1,\"contribuyenteId\":10,\"predioId\":20,"
                        + "\"fechaVisita\":\"2026-03-15\",\"fiscalizador\":\"J. Perez\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/predial/actas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }
}
