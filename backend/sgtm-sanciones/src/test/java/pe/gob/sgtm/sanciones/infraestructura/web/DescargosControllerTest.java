package pe.gob.sgtm.sanciones.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.sanciones.aplicacion.PlazosDeSancionesParametrizados;
import pe.gob.sgtm.sanciones.aplicacion.RegistrarDescargo;
import pe.gob.sgtm.sanciones.dominio.CriterioDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Descargo;
import pe.gob.sgtm.sanciones.dominio.DescargoRepository;
import pe.gob.sgtm.sanciones.dominio.EstadoDePapeleta;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.Papeleta;
import pe.gob.sgtm.sanciones.dominio.PapeletaRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #425 — Capa web de {@code POST /api/v1/transito/descargos}: <b>por donde entran</b> el numero de
 * expediente y la papeleta.
 *
 * <p>El contrato los declara los dos {@code in: query} —son los dos filtros que la pantalla {@code
 * transito_descargos} dibuja— y hasta #425 el controlador los leia solo del cuerpo: la peticion que
 * la interfaz sabe construir llegaba con los dos nulos y respondia «Falta el campo 'papeleta'»
 * mientras la pantalla los estaba mandando.
 *
 * <p>Lo que se comprueba aqui no es que se acepten, sino que <b>lleguen y decidan</b>: con dos
 * papeletas sembradas, el descargo se registra contra la que dice la consulta. {@code
 * SancionesWebTest} sigue cubriendo lo que este controlador rechaza antes de llamar a nada.
 */
@DisplayName("Capa web — POST /api/v1/transito/descargos: el expediente y la papeleta")
class DescargosControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 3, 6);
    private static final Clock RELOJ =
            Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    private final PapeletasDeMentira papeletas =
            new PapeletasDeMentira().con(1L, "PT-0001").con(2L, "PT-0002");
    private final DescargosEnMemoria descargos = new DescargosEnMemoria();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new DescargosController(
                                    new RegistrarDescargo(
                                            papeletas,
                                            descargos,
                                            new PlazosDeSancionesParametrizados(
                                                    new ParametrosDeMentira()),
                                            (RegistroDeAuditoria registro) -> {},
                                            RELOJ)))
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
    @DisplayName("los dos filtros viajan por la consulta y dicen contra que papeleta es (#425)")
    void losDosFiltrosViajanPorLaConsulta() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/transito/descargos")
                                        .param("papeleta", "PT-0002")
                                        .param("nDeExpediente", "2026-1188")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"fechaDePresentacion\":\"2026-03-06\","
                                                        + "\"tipoDeRecurso\":\"DESCARGO\","
                                                        + "\"fundamento\":\"No conducia el vehiculo\","
                                                        + "\"observacion\":\"Se registra el escrito\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(descargos.guardados)
                .as("no basta con que se acepte: el escrito se registra contra ESA papeleta")
                .singleElement()
                .satisfies(
                        descargo -> {
                            assertThat(descargo.papeletaId()).isEqualTo(2L);
                            assertThat(descargo.numeroExpediente()).isEqualTo("2026-1188");
                        });
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"papeleta\":\"PT-0002\"")
                .contains("\"nDeExpediente\":\"2026-1188\"");
    }

    @Test
    @DisplayName("y si vienen en los dos sitios gana el cuerpo: el cliente viejo sigue igual")
    void elCuerpoGanaALaConsulta() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/transito/descargos")
                                        .param("papeleta", "PT-0002")
                                        .param("nDeExpediente", "2026-1188")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"papeleta\":\"PT-0001\","
                                                        + "\"nDeExpediente\":\"2026-1199\","
                                                        + "\"fechaDePresentacion\":\"2026-03-06\","
                                                        + "\"tipoDeRecurso\":\"DESCARGO\","
                                                        + "\"fundamento\":\"No conducia el vehiculo\","
                                                        + "\"observacion\":\"Se registra el escrito\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(descargos.guardados)
                .singleElement()
                .satisfies(
                        descargo -> {
                            assertThat(descargo.papeletaId()).isEqualTo(1L);
                            assertThat(descargo.numeroExpediente()).isEqualTo("2026-1199");
                        });
    }

    @Test
    @DisplayName("una papeleta que no existe en la consulta, 404 y no registra nada")
    void unaPapeletaInexistenteEnLaConsulta404() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/transito/descargos")
                                        .param("papeleta", "PT-9999")
                                        .param("nDeExpediente", "2026-1188")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"fechaDePresentacion\":\"2026-03-06\","
                                                        + "\"tipoDeRecurso\":\"DESCARGO\","
                                                        + "\"fundamento\":\"No conducia el vehiculo\","
                                                        + "\"observacion\":\"Se registra el escrito\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
        assertThat(descargos.guardados).isEmpty();
    }

    @Test
    @DisplayName("sin papeleta en ninguno de los dos sitios, 422 y no registra nada")
    void sinPapeletaEnNingunSitio422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/transito/descargos")
                                        .param("nDeExpediente", "2026-1188")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"fechaDePresentacion\":\"2026-03-06\","
                                                        + "\"tipoDeRecurso\":\"DESCARGO\","
                                                        + "\"fundamento\":\"No conducia el vehiculo\","
                                                        + "\"observacion\":\"Se registra el escrito\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("papeleta");
        assertThat(descargos.guardados).isEmpty();
    }

    // ------------------------------------------------------------------

    /** Dos papeletas de transito, para que «viaja» y «se ignora» no den el mismo resultado. */
    private static final class PapeletasDeMentira implements PapeletaRepository {

        private final List<Papeleta> filas = new ArrayList<>();

        PapeletasDeMentira con(long id, String numero) {
            filas.add(
                    new Papeleta(
                            id,
                            Familia.TRANSITO,
                            numero,
                            1L,
                            LocalDate.of(2026, 3, 2),
                            null,
                            "AV. GRAU 100",
                            "V1H-882",
                            null,
                            null,
                            null,
                            null,
                            7L,
                            null,
                            null,
                            7L,
                            Dinero.de("5500.00"),
                            Alicuota.de("8"),
                            Dinero.de("440.00"),
                            Alicuota.de("100"),
                            Dinero.de("440.00"),
                            null,
                            EstadoDePapeleta.IMPUESTA,
                            "prueba",
                            Observacion.de("Papeleta sembrada para la prueba")));
            return this;
        }

        @Override
        public Papeleta insertar(Papeleta papeleta) {
            throw new UnsupportedOperationException("esta prueba no escribe papeletas");
        }

        @Override
        public Optional<Papeleta> porNumero(String numero) {
            return filas.stream().filter(p -> p.numero().equals(numero)).findFirst();
        }

        @Override
        public Optional<Papeleta> porNumero(Familia familia, String numero) {
            return filas.stream()
                    .filter(p -> p.familia() == familia && p.numero().equals(numero))
                    .findFirst();
        }

        @Override
        public Optional<Papeleta> porId(long id) {
            return filas.stream().filter(p -> p.id() != null && p.id() == id).findFirst();
        }

        @Override
        public Pagina<Papeleta> buscar(CriterioDePapeleta criterio, Paginacion paginacion) {
            throw new UnsupportedOperationException("esta prueba no lista papeletas");
        }

        @Override
        public Papeleta cambiarNumero(long papeletaId, String numeroNuevo, String motivo) {
            throw new UnsupportedOperationException("esta prueba no cambia numeros");
        }
    }

    private static final class DescargosEnMemoria implements DescargoRepository {

        private final List<Descargo> guardados = new ArrayList<>();
        private long siguiente = 1;

        @Override
        public Descargo insertar(Descargo descargo) {
            Descargo conId =
                    new Descargo(
                            siguiente++,
                            descargo.papeletaId(),
                            descargo.numeroExpediente(),
                            descargo.fecha(),
                            descargo.tipoRecurso(),
                            descargo.sustento(),
                            descargo.presentadoHasta(),
                            descargo.conjuntoId(),
                            descargo.enPlazo(),
                            descargo.registradoEn(),
                            "prueba",
                            descargo.observacion());
            guardados.add(conId);
            return conId;
        }

        @Override
        public Optional<Descargo> porNumeroDeExpediente(String numeroExpediente) {
            return guardados.stream()
                    .filter(d -> d.numeroExpediente().equals(numeroExpediente))
                    .findFirst();
        }

        @Override
        public Optional<Descargo> porId(long id) {
            return guardados.stream().filter(d -> d.id() != null && d.id() == id).findFirst();
        }

        @Override
        public List<Descargo> dePapeleta(long papeletaId) {
            return guardados.stream().filter(d -> d.papeletaId() == papeletaId).toList();
        }
    }

    /**
     * Un conjunto sellado con el unico plazo que este caso de uso consume.
     *
     * <p>La cifra entra por el codigo del doble y no por una constante del sistema: el plazo es
     * dato (regla 5), y lo que esta prueba necesita es tener uno con el que trabajar.
     */
    private static final class ParametrosDeMentira implements LectorDeParametros {

        private static final long CONJUNTO = 77L;

        @Override
        public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
            return ParametrosSellados.de(ejercicio, 1)
                    .texto("PLAZO", "DESCARGO_PAPELETA", "5 DIAS_HABILES")
                    .construir();
        }

        @Override
        public ParametrosSellados porConjunto(IdentificadorDeConjunto identificador) {
            return vigenteEn(new Ejercicio(2026));
        }

        @Override
        public IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio) {
            return IdentificadorDeConjunto.de(CONJUNTO);
        }
    }
}
