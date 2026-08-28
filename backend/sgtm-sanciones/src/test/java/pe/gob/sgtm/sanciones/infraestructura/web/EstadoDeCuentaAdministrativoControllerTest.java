package pe.gob.sgtm.sanciones.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Capa web — GET /api/v1/infracciones/administrativas/estado-cuenta")
class EstadoDeCuentaAdministrativoControllerTest {

    private final RepositorioDeMentira repositorio = new RepositorioDeMentira();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new EstadoDeCuentaAdministrativoController(repositorio))
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
    @DisplayName("siempre pide solo lo pendiente, con familia administrativa")
    void siemprePideSoloLoPendiente() throws Exception {
        mvc.perform(
                        get("/api/v1/infracciones/administrativas/estado-cuenta")
                                .param("codContribuyente", "10000001"))
                .andReturn();

        assertThat(repositorio.ultimoCriterio.familia()).isEqualTo(Familia.ADMINISTRATIVA);
        assertThat(repositorio.ultimoCriterio.soloPendientes()).isTrue();
        assertThat(repositorio.ultimoCriterio.documentoAdministrado()).isEqualTo("10000001");
    }

    private static final class RepositorioDeMentira implements PapeletaRepository {
        private CriterioDePapeleta ultimoCriterio;

        @Override
        public Papeleta insertar(Papeleta papeleta) {
            throw new UnsupportedOperationException("esta prueba no escribe");
        }

        @Override
        public Optional<Papeleta> porNumero(String numero) {
            return Optional.empty();
        }

        @Override
        public Optional<Papeleta> porNumero(
                pe.gob.sgtm.sanciones.dominio.Familia familia, String numero) {
            return porNumero(numero);
        }

        @Override
        public Optional<Papeleta> porId(long id) {
            return Optional.empty();
        }

        @Override
        public Pagina<Papeleta> buscar(CriterioDePapeleta criterio, Paginacion paginacion) {
            this.ultimoCriterio = criterio;
            Papeleta papeleta =
                    Papeleta.nuevaAdministrativa(
                            "PA-0001",
                            1L,
                            LocalDate.of(2026, 3, 1),
                            null,
                            "Av. Grau",
                            10L,
                            null,
                            null,
                            1L,
                            Dinero.de("5500"),
                            Alicuota.de("8"),
                            Dinero.de("440"),
                            Alicuota.de("100"),
                            Dinero.de("440"),
                            null,
                            Observacion.de("papeleta de prueba"));
            return Pagina.de(List.of(papeleta), paginacion, 1);
        }

        @Override
        public Papeleta cambiarNumero(long papeletaId, String numeroNuevo, String motivo) {
            throw new UnsupportedOperationException("esta prueba no escribe");
        }
    }
}
