package pe.gob.sgtm.rentas.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.rentas.dominio.arbitrios.CriterioDeArbitrio;
import pe.gob.sgtm.rentas.dominio.arbitrios.CuotaDeArbitrio;
import pe.gob.sgtm.rentas.dominio.arbitrios.CuotaDeArbitrioRepository;
import pe.gob.sgtm.rentas.dominio.arbitrios.Servicio;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #31 — Capa web: se prueba el transporte (forma del JSON, resolucion del ejercicio), no la
 * persistencia —eso ya lo verifica {@code CuotaDeArbitrioRepositoryJdbcTest} contra PostgreSQL
 * real.
 */
@DisplayName("Capa web — GET /api/v1/rentas/arbitrios")
class ArbitriosControllerTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-06-15T00:00:00Z"), ZoneOffset.UTC);

    private final RepositorioDeMentira repositorio = new RepositorioDeMentira();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new ArbitriosController(repositorio, RELOJ))
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
    @DisplayName("sin anio, consulta el ejercicio de hoy segun el reloj inyectado")
    void sinAnioConsultaElEjercicioDeHoy() throws Exception {
        mvc.perform(get("/api/v1/rentas/arbitrios")).andReturn();

        assertThat(repositorio.ultimoCriterio.ejercicio()).isEqualTo(new Ejercicio(2026));
    }

    @Test
    @DisplayName("con anio, consulta ese ejercicio, no el de hoy")
    void conAnioConsultaEseEjercicio() throws Exception {
        mvc.perform(get("/api/v1/rentas/arbitrios").param("anio", "2025")).andReturn();

        assertThat(repositorio.ultimoCriterio.ejercicio()).isEqualTo(new Ejercicio(2025));
    }

    @Test
    @DisplayName("con codigoPredial, lo traslada al criterio")
    void conCodigoPredialLoTrasladaAlCriterio() throws Exception {
        mvc.perform(get("/api/v1/rentas/arbitrios").param("codigoPredial", "abc-001")).andReturn();

        assertThat(repositorio.ultimoCriterio.codigoPredial()).isEqualTo("ABC-001");
    }

    @Test
    @DisplayName("devuelve la pagina en la forma unica, con campos en español camelCase")
    void devuelveLaPaginaEnLaFormaUnica() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/rentas/arbitrios")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"contenido\"")
                .contains("\"servicio\":\"LIMPIEZA_PUBLICA\"")
                .contains("\"monto\":\"8.50\"")
                .doesNotContain("municipalidad");
    }

    private static final class RepositorioDeMentira implements CuotaDeArbitrioRepository {

        private CriterioDeArbitrio ultimoCriterio;

        @Override
        public boolean existe(long predioId, Servicio servicio, Ejercicio ejercicio, int periodo) {
            return false;
        }

        @Override
        public CuotaDeArbitrio insertar(CuotaDeArbitrio cuota) {
            throw new UnsupportedOperationException("esta prueba no escribe");
        }

        @Override
        public Pagina<CuotaDeArbitrio> buscar(CriterioDeArbitrio criterio, Paginacion paginacion) {
            this.ultimoCriterio = criterio;
            CuotaDeArbitrio cuota =
                    CuotaDeArbitrio.nueva(
                            criterio.ejercicio(),
                            Servicio.LIMPIEZA_PUBLICA,
                            1,
                            1L,
                            1L,
                            1L,
                            Dinero.de("8.50"),
                            "TASA_LIMPIEZA_PUBLICA:S-01:CASA_HABITACION",
                            LocalDate.of(2026, 1, 31));
            return Pagina.de(List.of(cuota), paginacion, 1);
        }
    }
}
