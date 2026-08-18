package pe.gob.sgtm.catastro.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.catastro.dominio.TipoVia;
import pe.gob.sgtm.catastro.dominio.Via;
import pe.gob.sgtm.catastro.dominio.ViaRepository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * El primer endpoint, por HTTP de verdad.
 *
 * <p>Sin base de datos: el repositorio es una implementacion en memoria. Lo que se verifica aqui es
 * el <b>transporte</b> —forma del JSON, parametros de paginacion, traduccion de errores— y para eso
 * la base no aporta nada; lo que la base si verifica —el aislamiento— ya tiene sus pruebas en
 * {@code ViaRepositoryJdbcTest}, contra PostgreSQL real. Separarlas hace que cada fallo diga que se
 * rompio.
 */
@DisplayName("Capa web — GET /api/v1/catastro/vias")
class ViaControllerTest {

    private final RepositorioEnMemoria repositorio = new RepositorioEnMemoria();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new ViaController(repositorio))
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
    @DisplayName("devuelve la pagina en la forma unica, con campos en español camelCase")
    void devuelveLaPaginaEnLaFormaUnica() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/vias")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"contenido\"")
                .contains("\"totalElementos\":2")
                .contains("\"totalPaginas\":1")
                .contains("\"hayMas\":false")
                .contains("\"codigo\":\"V-1\"")
                .contains("\"nombre\":\"Avenida Grau\"");
    }

    @Test
    @DisplayName("no devuelve la municipalidad, porque no la conoce ni la necesita")
    void noDevuelveLaMunicipalidad() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/vias")).andReturn();

        assertThat(resultado.getResponse().getContentAsString())
                .as("el identificador de municipalidad no sale ni entra por HTTP (ADR-0005)")
                .doesNotContain("municipalidad");
    }

    @Test
    @DisplayName("los parametros de paginacion tienen un solo dialecto, con valores por omision")
    void losParametrosDePaginacionTienenUnSoloDialecto() throws Exception {
        mvc.perform(get("/api/v1/catastro/vias")).andReturn();
        assertThat(repositorio.ultima).isNotNull();
        assertThat(repositorio.ultima.pagina()).isZero();
        assertThat(repositorio.ultima.tamano()).isEqualTo(20);
        assertThat(repositorio.ultima.ordenarPor())
                .as("el orden por omision lo decide la operacion, que es quien conoce la tabla")
                .isEqualTo("codigo");

        mvc.perform(
                        get("/api/v1/catastro/vias")
                                .param("pagina", "2")
                                .param("tamano", "5")
                                .param("ordenarPor", "nombre")
                                .param("direccion", "DESCENDENTE"))
                .andReturn();

        assertThat(repositorio.ultima.pagina()).isEqualTo(2);
        assertThat(repositorio.ultima.tamano()).isEqualTo(5);
        assertThat(repositorio.ultima.ordenarPor()).isEqualTo("nombre");
        assertThat(repositorio.ultima.direccion()).isEqualTo(Paginacion.Direccion.DESCENDENTE);
    }

    @Test
    @DisplayName("un orden no admitido sale como 422 en problem+json, sin nombrar columnas")
    void unOrdenNoAdmitidoSaleComo422() throws Exception {
        repositorio.fallarConOrdenNoAdmitido = true;

        MvcResult resultado =
                mvc.perform(
                                get("/api/v1/catastro/vias")
                                        .param("ordenarPor", "(SELECT nombre FROM municipalidad)"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"ORDEN_NO_ADMITIDO\"");
    }

    @Test
    @DisplayName("un tamano de pagina imposible es 422, no 500")
    void unTamanoImposibleEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/catastro/vias").param("tamano", "100000")).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("lo mando mal el cliente; no es un fallo del servidor")
                .isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"");
    }

    /** Repositorio en memoria: aqui se prueba el transporte, no la persistencia. */
    private static final class RepositorioEnMemoria implements ViaRepository {

        private final List<Via> vias =
                List.of(
                        new Via(1L, "V-1", TipoVia.AVENIDA, "Avenida Grau", "200101", true),
                        new Via(2L, "V-2", TipoVia.CALLE, "Calle Lima", "200101", true));

        private Paginacion ultima;
        private boolean fallarConOrdenNoAdmitido;

        @Override
        public Optional<Via> findById(long id) {
            return vias.stream().filter(v -> v.id() != null && v.id() == id).findFirst();
        }

        @Override
        public Optional<Via> findByCodigo(String codigo) {
            return vias.stream().filter(v -> v.codigo().equals(codigo)).findFirst();
        }

        @Override
        public Pagina<Via> findAll(Paginacion paginacion) {
            this.ultima = paginacion;
            if (fallarConOrdenNoAdmitido) {
                // El repositorio real valida contra su lista blanca; aqui se reproduce
                // el error que lanza, para verificar como sale por HTTP.
                OrdenSeguro.sobre("codigo").clausula(paginacion);
            }
            return Pagina.de(vias, paginacion, vias.size());
        }

        @Override
        public Via save(Via via) {
            throw new UnsupportedOperationException("esta prueba no escribe");
        }
    }
}
