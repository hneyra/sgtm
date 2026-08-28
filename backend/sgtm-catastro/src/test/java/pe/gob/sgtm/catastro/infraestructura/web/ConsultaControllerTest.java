package pe.gob.sgtm.catastro.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.catastro.aplicacion.ConsultaDeFichas;
import pe.gob.sgtm.catastro.dominio.FichaCatastralRepository;
import pe.gob.sgtm.catastro.dominio.FichaEncontrada;
import pe.gob.sgtm.catastro.dominio.FiltroDeFichas;
import pe.gob.sgtm.catastro.dominio.TipoFicha;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * El transporte de la consulta de fichas, por HTTP de verdad y sin base de datos.
 *
 * <p>Lo que se verifica aqui es lo que la base no puede decir: la forma del JSON y, sobre todo, que
 * un filtro que el sistema todavia no sabe responder <b>se rechace</b> en vez de ignorarse. Lo que
 * la base si verifica —el plan, el aislamiento, el titular unico por predio— tiene sus pruebas en
 * {@code ConsultaDeFichasTest}, contra PostgreSQL.
 */
@DisplayName("Capa web — GET /api/v1/catastro/fichas")
class ConsultaControllerTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-19T10:00:00Z"), ZoneId.of("America/Lima"));

    private final RepositorioEnMemoria repositorio = new RepositorioEnMemoria();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new ConsultaController(
                                    new ConsultaDeFichas(repositorio, new PadronVacio()), RELOJ))
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
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/fichas")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"contenido\"")
                .contains("\"totalElementos\":2")
                .contains("\"codRefCatastral\":\"27010100100100101010001\"")
                .contains("\"version\":1");
    }

    @Test
    @DisplayName("el area construida viaja SUMADA, con su unidad: la interfaz no suma (RNF-083)")
    void elAreaConstruidaViajaSumada() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/fichas")).andReturn();

        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "si la fila no la publicara, la pantalla tendria que pedir cada ficha con sus"
                                + " construcciones y sumarlas: veinte peticiones por pagina y una suma"
                                + " distinta en cada pantalla que la necesite")
                .contains("\"areaConstruida\":\"210.50 m2\"");
    }

    @Test
    @DisplayName("un terreno sin construir sale con area construida nula, que no es cero")
    void unTerrenoSinConstruirSaleNulo() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/fichas")).andReturn();

        assertThat(resultado.getResponse().getContentAsString())
                .as(
                        "un 0 seria un area declarada; la pantalla pinta un guion, y un guion no es"
                                + " un cero")
                .contains("\"areaConstruida\":null");
    }

    @Test
    @DisplayName("un filtro que todavia no se sabe responder es 422, no un listado sin filtrar")
    void elFiltroQueNoSeSabeResponderEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/catastro/fichas").param("conciliadaConRentas", "SI"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as(
                        "aceptarlo y devolver el listado completo daria un resultado plausible y"
                                + " equivocado: el usuario creeria estar viendo solo las conciliadas")
                .isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .as("y el mensaje dice por que, no «parametro no soportado»")
                .contains("declaracion jurada");
    }

    @Test
    @DisplayName("un tipo de ficha que no existe es 422, sin nombrar columnas")
    void unTipoInexistenteEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/catastro/fichas").param("tipo", "MARCIANA")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("UNICA")
                .doesNotContain("ficha_catastral");
    }

    @Test
    @DisplayName("una fecha mal formada es 422, no 500")
    void unaFechaMalFormadaEs422() throws Exception {
        MvcResult resultado =
                mvc.perform(get("/api/v1/catastro/fichas").param("fecha", "19-08-2026"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("AAAA-MM-DD");
    }

    @Test
    @DisplayName("no devuelve la municipalidad, porque no la conoce ni la necesita")
    void noDevuelveLaMunicipalidad() throws Exception {
        MvcResult resultado = mvc.perform(get("/api/v1/catastro/fichas")).andReturn();

        assertThat(resultado.getResponse().getContentAsString())
                .as("el identificador de municipalidad no sale ni entra por HTTP (ADR-0005)")
                .doesNotContain("municipalidad");
    }

    // ------------------------------------------------------------------

    /** El padron no hace falta para probar el transporte: aqui nadie filtra por titular. */
    private static final class PadronVacio implements DirectorioDeContribuyentes {

        @Override
        public List<ResumenDeContribuyente> buscar(String texto, int maximo) {
            return List.of();
        }

        @Override
        public Optional<ResumenDeContribuyente> porCodigo(String codigo) {
            return Optional.empty();
        }

        @Override
        public Map<Long, ResumenDeContribuyente> porIds(Set<Long> ids) {
            return Map.of();
        }

        @Override
        public Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return Optional.empty();
        }
    }

    /** Solo lo que el controlador llama; el resto no se implementa porque no se usa. */
    private static final class RepositorioEnMemoria implements FichaCatastralRepository {

        /** Con su area construida ya sumada por la base: es asi como llega la fila. */
        private static final FichaEncontrada UNA =
                new FichaEncontrada(
                        1L,
                        10L,
                        CodigoReferenciaCatastral.de("27010100100100101010001"),
                        "AV. GRAU 100",
                        "MZ-A",
                        "01",
                        TipoFicha.UNICA,
                        1,
                        AreaM2.de("120.00"),
                        AreaM2.de("210.50"),
                        "CASA HABITACION",
                        LocalDate.of(2026, 1, 1),
                        null,
                        null);

        /** Un terreno sin construir: la version no declara construcciones y no hay suma. */
        private static final FichaEncontrada SIN_CONSTRUIR =
                new FichaEncontrada(
                        2L,
                        11L,
                        CodigoReferenciaCatastral.de("27010100100100101010002"),
                        "AV. GRAU 200",
                        "MZ-A",
                        "02",
                        TipoFicha.UNICA,
                        1,
                        AreaM2.de("300.00"),
                        null,
                        "TERRENO SIN CONSTRUIR",
                        LocalDate.of(2026, 1, 1),
                        null,
                        null);

        @Override
        public Pagina<FichaEncontrada> consultar(
                FiltroDeFichas filtro,
                List<Long> titulares,
                LocalDate fecha,
                Paginacion paginacion) {
            return Pagina.de(List.of(UNA, SIN_CONSTRUIR), paginacion, 2);
        }

        @Override
        public List<pe.gob.sgtm.catastro.dominio.VersionDeLaFicha> versionesDe(
                long predioId, TipoFicha tipo) {
            return List.of();
        }

        @Override
        public Optional<pe.gob.sgtm.catastro.dominio.FichaCatastral> vigenteA(
                long predioId, TipoFicha tipo, LocalDate fecha) {
            return Optional.empty();
        }

        @Override
        public List<pe.gob.sgtm.catastro.dominio.FichaCatastral> historial(
                long predioId, TipoFicha tipo) {
            return List.of();
        }

        @Override
        public Optional<pe.gob.sgtm.catastro.dominio.FichaCatastral> ultimaVersion(
                long predioId, TipoFicha tipo) {
            return Optional.empty();
        }

        @Override
        public pe.gob.sgtm.catastro.dominio.FichaCatastral insertar(
                pe.gob.sgtm.catastro.dominio.FichaCatastral ficha) {
            throw new UnsupportedOperationException("El transporte no escribe");
        }

        @Override
        public pe.gob.sgtm.catastro.dominio.FichaCatastral cerrar(
                pe.gob.sgtm.catastro.dominio.FichaCatastral ficha) {
            throw new UnsupportedOperationException("El transporte no escribe");
        }

        @Override
        public List<pe.gob.sgtm.catastro.dominio.Construccion> construccionesDe(long fichaId) {
            return List.of();
        }

        @Override
        public List<pe.gob.sgtm.catastro.dominio.OtraInstalacion> instalacionesDe(long fichaId) {
            return List.of();
        }

        @Override
        public Optional<pe.gob.sgtm.catastro.dominio.DetalleDeLaFicha> detalleDe(
                long fichaId, TipoFicha tipo) {
            return Optional.empty();
        }
    }
}
