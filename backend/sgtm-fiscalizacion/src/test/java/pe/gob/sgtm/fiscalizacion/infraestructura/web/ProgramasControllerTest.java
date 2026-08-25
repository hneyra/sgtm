package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

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
import pe.gob.sgtm.fiscalizacion.aplicacion.RegistrarPrograma;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #45 — Capa web: se prueba el transporte (forma del JSON, la observacion obligatoria), no la
 * persistencia —eso ya lo verifica {@code ProgramaFiscalizacionRepositoryJdbcTest} contra
 * PostgreSQL real.
 */
@DisplayName("Capa web — POST /api/v1/fiscalizacion/programas")
class ProgramasControllerTest {

    private final List<ProgramaFiscalizacion> guardados = new ArrayList<>();
    private final RegistrarPrograma servicio =
            new RegistrarPrograma(
                    new ProgramaFiscalizacionRepository() {
                        private long siguiente = 1;

                        @Override
                        public ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa) {
                            ProgramaFiscalizacion guardado =
                                    new ProgramaFiscalizacion(
                                            siguiente++,
                                            programa.codigo(),
                                            programa.descripcion(),
                                            programa.tipo(),
                                            programa.fechaInicio(),
                                            programa.fechaFin(),
                                            programa.estado());
                            guardados.add(guardado);
                            return guardado;
                        }

                        @Override
                        public Optional<ProgramaFiscalizacion> findById(long id) {
                            return guardados.stream().filter(p -> p.id() == id).findFirst();
                        }
                    },
                    (RegistroDeAuditoria registro) -> {});

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new ProgramasController(servicio))
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
    @DisplayName("programa un tipo PREDIAL y devuelve 201 con el codigo en camelCase")
    void programaYDevuelve201() throws Exception {
        String cuerpo =
                "{\"observacion\":\"Se programa para la prueba\",\"codigo\":\"PF-200\","
                        + "\"descripcion\":\"Muestra de riesgo\",\"tipo\":\"PREDIAL\","
                        + "\"fechaInicio\":\"2026-03-01\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/programas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"PF-200\"")
                .contains("\"tipo\":\"PREDIAL\"")
                .contains("\"estado\":\"ABIERTO\"");
    }

    @Test
    @DisplayName("sin observacion, 422 y no guarda nada")
    void sinObservacionNoGuardaNada() throws Exception {
        String cuerpo =
                "{\"codigo\":\"PF-201\",\"descripcion\":\"Muestra de riesgo\","
                        + "\"tipo\":\"PREDIAL\",\"fechaInicio\":\"2026-03-01\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/programas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(guardados).isEmpty();
    }

    @Test
    @DisplayName("con un tipo desconocido, 422")
    void conUnTipoDesconocido422() throws Exception {
        String cuerpo =
                "{\"observacion\":\"Se programa para la prueba\",\"codigo\":\"PF-202\","
                        + "\"descripcion\":\"Muestra de riesgo\",\"tipo\":\"AMBIENTAL\","
                        + "\"fechaInicio\":\"2026-03-01\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/fiscalizacion/programas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }
}
