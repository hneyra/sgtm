package pe.gob.sgtm.sanciones.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.sanciones.aplicacion.RegistrarNotificacionAdministrativa;
import pe.gob.sgtm.sanciones.dominio.CriterioDeNotificacion;
import pe.gob.sgtm.sanciones.dominio.EstadoDeNotificacion;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativa;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativaRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Capa web — POST /api/v1/infracciones/administrativas/notificaciones")
class NotificacionAdministrativaControllerTest {

    private final RepositorioDeMentira repositorio = new RepositorioDeMentira();
    private final RegistrarNotificacionAdministrativa servicio =
            new RegistrarNotificacionAdministrativa(repositorio, (RegistroDeAuditoria r) -> {});

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new NotificacionAdministrativaController(servicio))
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
    @DisplayName("registra y devuelve 201, sin exigir contribuyente ni predio")
    void registraYDevuelve201() throws Exception {
        String cuerpo =
                "{\"observacion\":\"prueba\",\"numero\":\"NA-0001\",\"fecha\":\"2026-03-01\","
                        + "\"direccion\":\"Av. Grau 123\",\"motivo\":\"Falta administrativa\","
                        + "\"plazoDias\":10}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/infracciones/administrativas/notificaciones")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"numero\":\"NA-0001\"");
    }

    @Test
    @DisplayName("sin observacion, 422")
    void sinObservacion422() throws Exception {
        String cuerpo =
                "{\"numero\":\"NA-0002\",\"fecha\":\"2026-03-01\",\"direccion\":\"Av. Grau 123\","
                        + "\"motivo\":\"Falta administrativa\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/infracciones/administrativas/notificaciones")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }

    @Test
    @DisplayName("sin numero, 422")
    void sinNumero422() throws Exception {
        String cuerpo =
                "{\"observacion\":\"prueba\",\"fecha\":\"2026-03-01\",\"direccion\":\"Av. Grau"
                        + " 123\",\"motivo\":\"Falta administrativa\"}";

        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/infracciones/administrativas/notificaciones")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }

    private static final class RepositorioDeMentira
            implements NotificacionAdministrativaRepository {
        private long siguiente = 1;

        @Override
        public NotificacionAdministrativa insertar(NotificacionAdministrativa notificacion) {
            return new NotificacionAdministrativa(
                    siguiente++,
                    notificacion.numero(),
                    notificacion.fecha(),
                    notificacion.contribuyenteId(),
                    notificacion.predioId(),
                    notificacion.direccion(),
                    notificacion.motivo(),
                    notificacion.plazoDias(),
                    EstadoDeNotificacion.EMITIDA,
                    "prueba");
        }

        @Override
        public Optional<NotificacionAdministrativa> porNumero(String numero) {
            return Optional.empty();
        }

        @Override
        public Pagina<NotificacionAdministrativa> buscarVencidas(
                CriterioDeNotificacion criterio, Paginacion paginacion) {
            throw new UnsupportedOperationException("esta prueba no lista notificaciones");
        }

        @Override
        public NotificacionAdministrativa subsanar(long notificacionId) {
            throw new UnsupportedOperationException("esta prueba no subsana");
        }
    }
}
