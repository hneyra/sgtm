package pe.gob.sgtm.sanciones.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import java.time.LocalDate;
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
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.aplicacion.CambiarNumeroDePapeleta;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #46 — Capa web: se prueba el transporte, no la persistencia —eso ya lo verifica {@code
 * PapeletaRepositoryJdbcTest} contra PostgreSQL real.
 */
@DisplayName("Capa web — PATCH /api/v1/transito/papeletas/{numero}/codigo")
class CambioDeNumeroControllerTest {

    private final RepositorioDeMentira repositorio = new RepositorioDeMentira();
    private final CambiarNumeroDePapeleta servicio =
            new CambiarNumeroDePapeleta(repositorio, (RegistroDeAuditoria registro) -> {});

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new CambioDeNumeroController(servicio))
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
    @DisplayName("cambia el numero y devuelve 200 con el numero nuevo")
    void cambiaElNumeroYDevuelve200() throws Exception {
        repositorio.crear("PT-0001");
        String cuerpo =
                "{\"observacion\":\"correccion de digitacion\",\"numeroNuevo\":\"PT-0001-B\"}";

        MvcResult resultado =
                mvc.perform(
                                patch("/api/v1/transito/papeletas/PT-0001/codigo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"numero\":\"PT-0001-B\"");
    }

    @Test
    @DisplayName("una papeleta que no existe es 404")
    void unaPapeletaQueNoExisteEs404() throws Exception {
        String cuerpo = "{\"observacion\":\"correccion\",\"numeroNuevo\":\"PT-9999-B\"}";

        MvcResult resultado =
                mvc.perform(
                                patch("/api/v1/transito/papeletas/PT-9999/codigo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("sin observacion, 422")
    void sinObservacion422() throws Exception {
        repositorio.crear("PT-0002");
        String cuerpo = "{\"numeroNuevo\":\"PT-0002-B\"}";

        MvcResult resultado =
                mvc.perform(
                                patch("/api/v1/transito/papeletas/PT-0002/codigo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }

    private static final class RepositorioDeMentira implements PapeletaRepository {
        private final java.util.List<Papeleta> filas = new java.util.ArrayList<>();
        private long siguiente = 1;

        void crear(String numero) {
            filas.add(
                    new Papeleta(
                            siguiente++,
                            pe.gob.sgtm.sanciones.dominio.Familia.TRANSITO,
                            numero,
                            1L,
                            LocalDate.of(2026, 3, 1),
                            null,
                            "Av. Grau",
                            "ABC-123",
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            1L,
                            Dinero.de("5500"),
                            Alicuota.de("8"),
                            Dinero.de("440"),
                            Alicuota.de("100"),
                            Dinero.de("440"),
                            null,
                            pe.gob.sgtm.sanciones.dominio.EstadoDePapeleta.IMPUESTA,
                            "prueba",
                            Observacion.de("papeleta de prueba")));
        }

        @Override
        public Papeleta insertar(Papeleta papeleta) {
            throw new UnsupportedOperationException("esta prueba no registra papeletas nuevas");
        }

        @Override
        public Optional<Papeleta> porNumero(String numero) {
            return filas.stream().filter(p -> p.numero().equals(numero)).findFirst();
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
            throw new UnsupportedOperationException("esta prueba no lista papeletas");
        }

        @Override
        public Papeleta cambiarNumero(long papeletaId, String numeroNuevo, String motivo) {
            for (int i = 0; i < filas.size(); i++) {
                Papeleta actual = filas.get(i);
                if (actual.id() != null && actual.id() == papeletaId) {
                    Papeleta renombrada = actual.conNumero(numeroNuevo);
                    filas.set(i, renombrada);
                    return renombrada;
                }
            }
            throw new IllegalStateException("No hay papeleta con id " + papeletaId);
        }
    }
}
