package pe.gob.sgtm.valores.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.contribuyentes.DirectorioDeContribuyentes;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.ConsultaDeDeudaPublica;
import pe.gob.sgtm.cuentacorriente.MovimientoDeFase;
import pe.gob.sgtm.cuentacorriente.ObligacionPublica;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.valores.aplicacion.RegistrarValor;
import pe.gob.sgtm.valores.dominio.CriterioDeValor;
import pe.gob.sgtm.valores.dominio.TipoValor;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorDetalle;
import pe.gob.sgtm.valores.dominio.ValorRepository;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #37 — Capa web: se prueba el transporte, no la persistencia —eso lo verifica {@code
 * ValorRepositoryJdbcTest} contra PostgreSQL real—.
 */
@DisplayName("Capa web — /api/v1/valores")
class ValoresControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 3, 15);
    private static final Ejercicio EJERCICIO_DEUDA = new Ejercicio(2025);

    private final RepositorioDeMentira repositorio = new RepositorioDeMentira();
    private final DeudaDeMentira deuda = new DeudaDeMentira();
    private final ContribuyentesDeMentira contribuyentes = new ContribuyentesDeMentira();
    private final RegistrarValor registrar =
            new RegistrarValor(
                    repositorio,
                    deuda,
                    new MovimientoDeFase() {
                        @Override
                        public void moverAValor(
                                Ejercicio ejercicio,
                                long contribuyenteId,
                                String tributo,
                                @Nullable Integer periodo,
                                @Nullable Long predioId,
                                @Nullable Long vehiculoId,
                                String referenciaExterna,
                                Dinero monto,
                                LocalDate fechaValor,
                                String documentoOrigen,
                                Observacion observacion) {}
                    },
                    (RegistroDeAuditoria registro) -> {},
                    Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC));

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new ValoresController(registrar, repositorio, contribuyentes))
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
    @DisplayName("emite un valor y devuelve 201 con su numero")
    void emiteUnValorYDevuelve201() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));
        deuda.con(
                new ObligacionPublica(
                        "PREDIAL",
                        EJERCICIO_DEUDA,
                        55L,
                        null,
                        HOY,
                        Dinero.de(100),
                        Dinero.CERO,
                        Dinero.CERO,
                        Dinero.CERO));

        String cuerpo =
                """
                {"tipo":"OP","codContribuyente":"C-0007",
                 "obligaciones":[{"tributo":"PREDIAL","ejercicio":2025,"predioId":55}],
                 "observacion":"Se emite para la prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"numero\":\"OP-2026-");
    }

    @Test
    @DisplayName("sin observacion, 422: no se guarda")
    void sinObservacionRechaza() throws Exception {
        contribuyentes.con(
                new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 12345678"));
        deuda.con(
                new ObligacionPublica(
                        "PREDIAL",
                        EJERCICIO_DEUDA,
                        55L,
                        null,
                        HOY,
                        Dinero.de(100),
                        Dinero.CERO,
                        Dinero.CERO,
                        Dinero.CERO));

        String cuerpo =
                """
                {"tipo":"OP","codContribuyente":"C-0007",
                 "obligaciones":[{"tributo":"PREDIAL","ejercicio":2025,"predioId":55}]}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(repositorio.guardados).isEmpty();
    }

    @Test
    @DisplayName("un codigo de contribuyente que no existe, 404")
    void contribuyenteInexistente404() throws Exception {
        String cuerpo =
                """
                {"tipo":"OP","codContribuyente":"NO-EXISTE",
                 "obligaciones":[{"tributo":"PREDIAL","ejercicio":2025,"predioId":55}],
                 "observacion":"Se emite para la prueba"}
                """;

        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.post("/api/v1/valores")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(cuerpo))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("busqueda por un codigo que no existe devuelve pagina vacia, no error")
    void busquedaPorCodigoInexistenteDaPaginaVacia() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.get("/api/v1/valores")
                                        .param("codContribuyente", "NO-EXISTE"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(resultado.getResponse().getContentAsString()).contains("\"totalElementos\":0");
    }

    // ------------------------------------------------------------------

    private static final class RepositorioDeMentira implements ValorRepository {

        private long siguienteId = 1;
        private final Map<String, Long> correlativos = new HashMap<>();
        private final List<Valor> guardados = new ArrayList<>();

        @Override
        public Valor insertar(Valor valor, List<ValorDetalle> detalle) {
            Valor conId =
                    new Valor(
                            siguienteId++,
                            valor.tipo(),
                            valor.numero(),
                            valor.ejercicio(),
                            valor.contribuyenteId(),
                            valor.baseLegal(),
                            valor.montoInsoluto(),
                            valor.montoReajuste(),
                            valor.montoInteres(),
                            valor.montoGasto(),
                            valor.proyectadoA(),
                            valor.estado(),
                            valor.fechaEmision(),
                            "prueba",
                            valor.observacion());
            guardados.add(conId);
            return conId;
        }

        @Override
        public Optional<Valor> porNumero(TipoValor tipo, Ejercicio ejercicio, String numero) {
            return Optional.empty();
        }

        @Override
        public List<ValorDetalle> detalleDe(long valorId) {
            return List.of();
        }

        @Override
        public Pagina<Valor> buscar(CriterioDeValor criterio, Paginacion paginacion) {
            return Pagina.de(guardados, paginacion, guardados.size());
        }

        @Override
        public long siguienteCorrelativo(TipoValor tipo, Ejercicio ejercicio) {
            String clave = tipo.codigo() + "-" + ejercicio.valor();
            long siguiente = correlativos.getOrDefault(clave, 0L) + 1;
            correlativos.put(clave, siguiente);
            return siguiente;
        }
    }

    private static final class DeudaDeMentira implements ConsultaDeDeudaPublica {

        private final List<ObligacionPublica> obligaciones = new ArrayList<>();

        void con(ObligacionPublica obligacion) {
            obligaciones.add(obligacion);
        }

        @Override
        public List<ObligacionPublica> deTodoElContribuyente(
                long contribuyenteId, LocalDate fecha) {
            return List.copyOf(obligaciones);
        }
    }

    private static final class ContribuyentesDeMentira implements DirectorioDeContribuyentes {

        private final Map<String, ResumenDeContribuyente> porCodigo = new HashMap<>();

        void con(ResumenDeContribuyente contribuyente) {
            porCodigo.put(contribuyente.codigo(), contribuyente);
        }

        @Override
        public List<ResumenDeContribuyente> buscar(String texto, int maximo) {
            return List.copyOf(porCodigo.values());
        }

        @Override
        public Optional<ResumenDeContribuyente> porCodigo(String codigo) {
            return Optional.ofNullable(porCodigo.get(codigo));
        }

        @Override
        public Map<Long, ResumenDeContribuyente> porIds(Set<Long> ids) {
            Map<Long, ResumenDeContribuyente> resultado = new HashMap<>();
            for (ResumenDeContribuyente contribuyente : porCodigo.values()) {
                if (ids.contains(contribuyente.id())) {
                    resultado.put(contribuyente.id(), contribuyente);
                }
            }
            return resultado;
        }

        @Override
        public Optional<String> domicilioFiscalDe(long contribuyenteId, LocalDate fecha) {
            return Optional.empty();
        }
    }
}
