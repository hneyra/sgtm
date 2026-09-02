package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.cuentacorriente.aplicacion.ConsultasDelLibro;
import pe.gob.sgtm.cuentacorriente.aplicacion.RegistrarMovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CargoAgregado;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeObligacion;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeAltasBajas;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeConsulta;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDePagos;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.RangoDeCuotas;
import pe.gob.sgtm.cuentacorriente.dominio.RecaudacionAgregada;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #425 — Capa web de {@code POST /api/v1/rentas/deuda/bajas}: <b>por donde entran</b> los tres
 * datos que identifican la obligacion que se extingue.
 *
 * <p>Es la novena operacion del censo de #399 y la <b>unica que ya estaba conectada</b>: la
 * pantalla {@code baja_deuda} funciona desde #332 porque fue la interfaz la que se adapto al
 * controlador y manda {@code codContribuyente}, {@code tributo} y {@code ano} en el cuerpo, dentro
 * de la tabla {@code cuotas} aplanada. El contrato, en cambio, los declara {@code in: query}.
 *
 * <p>Por eso la correccion no toca la pantalla: <b>gana el cuerpo</b>. Estas pruebas fijan las dos
 * mitades a la vez —que la consulta llegue y decida, y que el cuerpo siga ganando cuando viene—,
 * que es lo unico que hace segura la coexistencia.
 *
 * <p>El alta hermana no cambia y tambien esta aqui: {@code POST /rentas/deuda/altas} no declara
 * ningun parametro de consulta en el contrato —su pantalla no dibuja filtros—, y la prueba lo
 * comprueba en vez de darlo por sabido.
 *
 * <p>#538 anade la otra mitad de «por donde entran»: <b>que cuotas</b> abarca el acto. Aqui se mide
 * que el rango del cuerpo llegue hasta {@code registrar} y salga en la respuesta; que los asientos
 * queden en la base con su periodo lo mide {@code AltaDeDeudaPorRangoFronteraTest}, contra
 * PostgreSQL, porque eso es justamente lo que la respuesta no delataba.
 */
@DisplayName("Capa web — POST /api/v1/rentas/deuda/{altas,bajas}: por donde entran los tres datos")
class MovimientosDeDeudaControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 3, 16);
    private static final Clock RELOJ =
            Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    private final AsientosDeMentira asientos = new AsientosDeMentira();
    private final MovimientosEspiados movimientos = new MovimientosEspiados();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new MovimientosDeDeudaController(
                                    movimientos, new ConsultasDelLibro(asientos), RELOJ))
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
    @DisplayName("los tres viajan por la consulta y dicen que obligacion se da de baja (#425)")
    void losTresViajanPorLaConsulta() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .param("codContribuyente", "C-0008")
                                        .param("tributo", "ARBITRIO")
                                        .param("ano", "2024")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"cuota\":2,\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RES-0001\","
                                                        + "\"observacion\":\"Prescripcion declarada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        ClaveDeSaldo clave = movimientos.ultimaClave();
        assertThat(clave)
                .as("no basta con que se acepte: se da de baja LA obligacion que se pidio")
                .isEqualTo(new ClaveDeSaldo(8L, "ARBITRIO", new Ejercicio(2024), 2, null, null));
        assertThat(movimientos.ultimoCodigo()).isEqualTo("C-0008");
    }

    @Test
    @DisplayName("y si vienen en los dos sitios gana el cuerpo: `baja_deuda` sigue igual (#332)")
    void elCuerpoGanaALaConsulta() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .param("codContribuyente", "C-0008")
                                        .param("tributo", "ARBITRIO")
                                        .param("ano", "2024")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codContribuyente\":\"C-0007\","
                                                        + "\"tributo\":\"PREDIAL\",\"ano\":\"2025\","
                                                        + "\"cuota\":1,\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RES-0002\","
                                                        + "\"observacion\":\"Prescripcion declarada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimaClave())
                .isEqualTo(new ClaveDeSaldo(7L, "PREDIAL", new Ejercicio(2025), 1, null, null));
    }

    @Test
    @DisplayName("sin los tres en ninguno de los dos sitios, 422 y no se asienta nada")
    void sinLosTresEnNingunSitio422() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"cuota\":1,\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RES-0003\","
                                                        + "\"observacion\":\"Prescripcion declarada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("codContribuyente");
        assertThat(movimientos.registros).isZero();
    }

    @Test
    @DisplayName("el alta no lee la consulta: su operacion no declara ningun parametro (#425)")
    void elAltaNoLeeLaConsulta() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .param("codContribuyente", "C-0008")
                                        .param("tributo", "ARBITRIO")
                                        .param("ano", "2024")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codContribuyente\":\"C-0007\","
                                                        + "\"tributo\":\"PREDIAL\",\"ano\":\"2025\","
                                                        + "\"cuota\":1,\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RES-0004\","
                                                        + "\"observacion\":\"Deuda migrada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimaClave())
                .as("el alta no dibuja filtros, asi que su contrato no los declara y no se leen")
                .isEqualTo(new ClaveDeSaldo(7L, "PREDIAL", new Ejercicio(2025), 1, null, null));
    }

    @Test
    @DisplayName("el rango del cuerpo llega hasta el acto: «cuotas 1 a 4» son cuatro (#538)")
    void elRangoLlegaHastaElActo() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codContribuyente\":\"C-0007\","
                                                        + "\"tributo\":\"PREDIAL\",\"ano\":\"2026\","
                                                        + "\"cuotaDesde\":1,\"cuotaHasta\":4,"
                                                        + "\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RD-2026-000418\","
                                                        + "\"observacion\":\"Deuda migrada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimasCuotas()).isEqualTo(new RangoDeCuotas(1, 4));
        assertThat(resultado.getResponse().getContentAsString())
                .as("la respuesta ensena las cuatro cuotas y su total, no una sola")
                .contains("\"periodo\":1")
                .contains("\"periodo\":4")
                .contains("\"total\":{\"importe\":\"400.00\"");
    }

    @Test
    @DisplayName("sin cuota ni rango el acto es la obligacion anual, que es periodo 0 (#538)")
    void sinCuotaNiRangoElActoEsAnual() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/altas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"codContribuyente\":\"C-0007\","
                                                        + "\"tributo\":\"PREDIAL\",\"ano\":\"2026\","
                                                        + "\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RD-2026-000419\","
                                                        + "\"observacion\":\"Deuda migrada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimasCuotas()).isEqualTo(RangoDeCuotas.ANUAL);
    }

    @Test
    @DisplayName("la baja tambien abarca el rango: es el mismo cuerpo y el mismo acto (#538)")
    void laBajaTambienAbarcaElRango() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                post("/api/v1/rentas/deuda/bajas")
                                        .param("codContribuyente", "C-0008")
                                        .param("tributo", "ARBITRIO")
                                        .param("ano", "2024")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"cuotaDesde\":2,\"cuotaHasta\":3,"
                                                        + "\"insoluto\":\"100.00\","
                                                        + "\"fechaValor\":\"2026-03-16\","
                                                        + "\"documentoOrigen\":\"RES-0005\","
                                                        + "\"observacion\":\"Prescripcion declarada\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(movimientos.ultimasCuotas()).isEqualTo(new RangoDeCuotas(2, 3));
    }

    // ------------------------------------------------------------------

    /**
     * Espia el movimiento que el controlador compuso.
     *
     * <p>Se extiende en vez de implementarse porque {@link RegistrarMovimientoDeDeuda} es una clase
     * de aplicacion con cinco colaboradores, y lo que esta prueba mide es el <b>borde HTTP</b>: que
     * los tres datos lleguen hasta la clave de la obligacion. Lo que el caso de uso hace con ella
     * —los asientos, el limite de la baja, el documento— lo verifican sus propias pruebas y las de
     * PostgreSQL.
     */
    private static final class MovimientosEspiados extends RegistrarMovimientoDeDeuda {

        private int registros;
        private @Nullable MovimientoDeDeuda ultimo;
        private @Nullable RangoDeCuotas ultimasCuotas;
        private @Nullable String codigo;

        MovimientosEspiados() {
            super(null, null, null, null, null, null);
        }

        private @Nullable ComprobacionDeUnidad ultimaComprobacion;

        @Override
        public Registro registrar(
                MovimientoDeDeuda movimiento,
                RangoDeCuotas cuotas,
                ComprobacionDeUnidad comprobacion,
                String codigoContribuyente,
                Observacion observacion) {
            ultimaComprobacion = comprobacion;
            registros++;
            ultimo = movimiento;
            ultimasCuotas = cuotas;
            codigo = codigoContribuyente;
            // La traduccion a asientos es la del propio movimiento, cuota a cuota: la respuesta
            // que sale por HTTP se compone de ella, y rehacerla aqui seria inventar otra.
            List<Asiento> asentados = new java.util.ArrayList<>();
            for (MovimientoDeDeuda deLaCuota : movimiento.enCadaCuota(cuotas)) {
                asentados.addAll(deLaCuota.enAsientos());
            }
            return new Registro(List.copyOf(asentados), "NC-2026-000001");
        }

        ComprobacionDeUnidad ultimaComprobacion() {
            if (ultimaComprobacion == null) {
                throw new AssertionError("No se registro ningun movimiento");
            }
            return ultimaComprobacion;
        }

        RangoDeCuotas ultimasCuotas() {
            if (ultimasCuotas == null) {
                throw new AssertionError("No se registro ningun movimiento");
            }
            return ultimasCuotas;
        }

        ClaveDeSaldo ultimaClave() {
            if (ultimo == null) {
                throw new AssertionError("No se registro ningun movimiento");
            }
            return ultimo.clave();
        }

        String ultimoCodigo() {
            if (codigo == null) {
                throw new AssertionError("No se registro ningun movimiento");
            }
            return codigo;
        }
    }

    /** Solo resuelve el codigo del contribuyente: es lo unico que el controlador le pide. */
    private static final class AsientosDeMentira implements AsientoRepository {

        @Override
        public Optional<Long> contribuyentePorCodigo(String codigo) {
            return switch (codigo) {
                case "C-0007" -> Optional.of(7L);
                case "C-0008" -> Optional.of(8L);
                default -> Optional.empty();
            };
        }

        @Override
        public List<pe.gob.sgtm.cuentacorriente.dominio.PendienteAgregado> pendientePorTributo(
                Ejercicio ejercicio, java.time.LocalDate aLaFecha) {
            throw new UnsupportedOperationException("El controlador no pide la cartera");
        }

        @Override
        public List<Ejercicio> ejerciciosAsentables() {
            // El libro de mentira acepta el ejercicio de las pruebas de este archivo. Lo que
            // el ejercicio sin particion produce se mide contra PostgreSQL, en
            // AltaDeDeudaPorRangoFronteraTest: aqui no hay particiones que consultar.
            return List.of(new Ejercicio(2026), new Ejercicio(2027));
        }

        @Override
        public List<String> tributosFueraDelVocabulario() {
            // La deteccion de #553 lee el libro entero y se mide contra PostgreSQL, en
            // VocabularioDeTributosJdbcTest: aqui no hay libro que recorrer.
            throw new UnsupportedOperationException("El controlador no pide la deteccion");
        }

        @Override
        public List<Asiento> deTodosLosPeriodosDe(ClaveDeObligacion clave) {
            throw noLoUsa();
        }

        @Override
        public Optional<Asiento> findById(long id) {
            throw noLoUsa();
        }

        @Override
        public Pagina<Asiento> buscar(CriterioDeConsulta criterio, Paginacion paginacion) {
            throw noLoUsa();
        }

        @Override
        public List<Asiento> paraDeuda(CriterioDeDeuda criterio) {
            throw noLoUsa();
        }

        @Override
        public Pagina<Asiento> altasYBajas(CriterioDeAltasBajas criterio, Paginacion paginacion) {
            throw noLoUsa();
        }

        @Override
        public Pagina<Asiento> pagos(CriterioDePagos criterio, Paginacion paginacion) {
            throw noLoUsa();
        }

        @Override
        public List<Asiento> deLaObligacion(ClaveDeSaldo clave) {
            throw noLoUsa();
        }

        @Override
        public List<Asiento> porDocumentoOrigen(String documentoOrigen) {
            throw noLoUsa();
        }

        @Override
        public Map<String, Dinero> abonadoPorDocumento(Collection<String> documentosOrigen) {
            throw noLoUsa();
        }

        @Override
        public List<RecaudacionAgregada> recaudadoPorTributo(
                Collection<String> tributos, LocalDate desde, LocalDate hasta) {
            throw noLoUsa();
        }

        @Override
        public List<RecaudacionAgregada> recaudadoDeTodos(LocalDate desde, LocalDate hasta) {
            throw noLoUsa();
        }

        @Override
        public List<CargoAgregado> cargadoPorTributo(Ejercicio ejercicio) {
            throw noLoUsa();
        }

        @Override
        public List<Asiento> deContribuyente(long contribuyenteId) {
            throw noLoUsa();
        }

        @Override
        public List<Long> contribuyentesConAsientos(long despuesDe, int cuantos) {
            throw noLoUsa();
        }

        @Override
        public Asiento registrar(Asiento asiento) {
            throw noLoUsa();
        }

        private static UnsupportedOperationException noLoUsa() {
            return new UnsupportedOperationException(
                    "Esta prueba mide el borde HTTP: el controlador solo resuelve el codigo");
        }
    }
}
