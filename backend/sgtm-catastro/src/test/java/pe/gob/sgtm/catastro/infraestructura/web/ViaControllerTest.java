package pe.gob.sgtm.catastro.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
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
import pe.gob.sgtm.catastro.aplicacion.ConsultaDeVias;
import pe.gob.sgtm.catastro.aplicacion.RegistrarVia;
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
 * el <b>transporte</b> —forma del JSON, parametros de paginacion, traduccion de errores, el estado
 * HTTP de un alta y la traduccion de una observacion vacia a 422— y para eso la base no aporta
 * nada; lo que la base si verifica —el aislamiento, la auditoria en la misma transaccion— ya tiene
 * sus pruebas en {@code ViaRepositoryJdbcTest} y {@code RegistrarViaTest}, contra PostgreSQL real.
 * Separarlas hace que cada fallo diga que se rompio.
 */
@DisplayName("Capa web — /api/v1/catastro/vias")
class ViaControllerTest {

    private final RepositorioEnMemoria repositorio = new RepositorioEnMemoria();

    /** La fecha no importa al transporte; se fija para no depender del dia de ejecucion. */
    private final RegistrarVia registrarVia =
            new RegistrarVia(
                    repositorio,
                    registro -> {},
                    Clock.fixed(Instant.parse("2026-08-27T10:00:00Z"), ZoneId.of("America/Lima")));

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new ViaController(new ConsultaDeVias(repositorio), registrarVia))
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

    // ── Escritura: POST y PUT ──────────────────────────────────────────

    @Test
    @DisplayName("el alta responde 201 con la via ya identificada, sin la municipalidad")
    void elAltaResponde201() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/vias")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codigo":"V-9","tipo":"JIRON","nombre":"Jiron Tarapaca",
                                                 "ubigeo":"200101","observacion":"Alta por ordenanza 2026-07"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"V-9\"")
                .contains("\"nombre\":\"Jiron Tarapaca\"")
                .contains("\"activa\":true")
                .doesNotContain("municipalidad");
        assertThat(repositorio.findByCodigo("V-9")).isPresent();
    }

    @Test
    @DisplayName("un alta sin observacion es 422: sin ella no se guarda (regla 10)")
    void unAltaSinObservacionEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/vias")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codigo\":\"V-9\",\"tipo\":\"CALLE\","
                                                        + "\"nombre\":\"Calle Nueva\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"")
                .contains("observacion");
        assertThat(repositorio.findByCodigo("V-9")).as("no se guardo nada").isEmpty();
    }

    @Test
    @DisplayName("un tipo de via que el enum no conoce es 422, no 500")
    void unTipoDesconocidoEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/catastro/vias")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codigo\":\"V-9\",\"tipo\":\"AUTOPISTA\","
                                                        + "\"nombre\":\"Via X\",\"observacion\":\"Alta de prueba\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"VALIDACION\"");
    }

    @Test
    @DisplayName("editar una via cambia su nombre y conserva su codigo")
    void editarUnaViaCambiaSuNombre() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/vias/V-1")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"tipo":"AVENIDA","nombre":"Avenida Miguel Grau",
                                                 "observacion":"Correccion de nomenclatura"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"V-1\"")
                .contains("\"nombre\":\"Avenida Miguel Grau\"");
    }

    @Test
    @DisplayName("la baja es un PUT con activa=false, no un DELETE (RNF-051)")
    void laBajaEsUnPutConActivaFalse() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/vias/V-2")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"tipo":"CALLE","nombre":"Calle Lima","activa":false,
                                                 "observacion":"Via absorbida por la Av. Grau"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"activa\":false");
        assertThat(repositorio.findByCodigo("V-2")).isPresent();
    }

    @Test
    @DisplayName("editar una via que no existe es 404, no 500 ni un alta encubierta")
    void editarUnaViaQueNoExisteEs404() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                put("/api/v1/catastro/vias/V-NADA")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"tipo\":\"CALLE\",\"nombre\":\"Via X\","
                                                        + "\"observacion\":\"Intento de edicion\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"NO_ENCONTRADO\"");
        assertThat(repositorio.findByCodigo("V-NADA")).isEmpty();
    }

    /**
     * Repositorio en memoria: aqui se prueba el transporte, no la persistencia.
     *
     * <p>{@link #save} si funciona —el transporte de un alta llega hasta el— pero no impone la
     * unicidad de {@code codigo} ni la politica RLS: eso lo verifica {@code ViaRepositoryJdbcTest}
     * contra PostgreSQL.
     */
    private static final class RepositorioEnMemoria implements ViaRepository {

        private final List<Via> vias =
                new ArrayList<>(
                        List.of(
                                new Via(1L, "V-1", TipoVia.AVENIDA, "Avenida Grau", "200101", true),
                                new Via(2L, "V-2", TipoVia.CALLE, "Calle Lima", "200101", true)));

        private Paginacion ultima;
        private boolean fallarConOrdenNoAdmitido;
        private long siguienteId = 3L;

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
            if (via.esNueva()) {
                Via guardada =
                        new Via(
                                siguienteId++,
                                via.codigo(),
                                via.tipo(),
                                via.nombre(),
                                via.ubigeo(),
                                via.activa());
                vias.add(guardada);
                return guardada;
            }
            vias.removeIf(v -> v.id() != null && v.id().equals(via.id()));
            vias.add(via);
            return via;
        }
    }
}
