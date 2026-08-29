package pe.gob.sgtm.coactiva.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.coactiva.aplicacion.ArancelDeCostasParametrizado;
import pe.gob.sgtm.coactiva.aplicacion.ConsultaDeCostas;
import pe.gob.sgtm.coactiva.aplicacion.ConsultaDeDeudasCoactivas;
import pe.gob.sgtm.coactiva.aplicacion.ConsultaDeExpedientes;
import pe.gob.sgtm.coactiva.aplicacion.FraccionarEnCoactiva;
import pe.gob.sgtm.coactiva.aplicacion.LiquidarCostas;
import pe.gob.sgtm.coactiva.dobles.ActosEnMemoria;
import pe.gob.sgtm.coactiva.dobles.ContribuyentesDeMentira;
import pe.gob.sgtm.coactiva.dobles.CostasEnMemoria;
import pe.gob.sgtm.coactiva.dobles.ExpedientesEnMemoria;
import pe.gob.sgtm.coactiva.dobles.LibroDeMentira;
import pe.gob.sgtm.coactiva.dobles.MovimientosDelExpedienteEnMemoria;
import pe.gob.sgtm.coactiva.dobles.ValoresDeMentira;
import pe.gob.sgtm.coactiva.dominio.ActoCoactivo;
import pe.gob.sgtm.coactiva.dominio.ExpedienteCoactivo;
import pe.gob.sgtm.coactiva.dominio.TipoDeActoCoactivo;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.cuentacorriente.DeudaAcogida;
import pe.gob.sgtm.cuentacorriente.GeneradorDeCargos;
import pe.gob.sgtm.cuentacorriente.ObligacionPublica;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.rentas.BeneficioRegistrado;
import pe.gob.sgtm.rentas.BeneficiosDelContribuyente;
import pe.gob.sgtm.tesoreria.ConvenioCoactivo;
import pe.gob.sgtm.tesoreria.CuotaDelConvenio;
import pe.gob.sgtm.tesoreria.FraccionamientoCoactivo;
import pe.gob.sgtm.tesoreria.SolicitudDeConvenioCoactivo;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #42 — Capa web: el transporte y los codigos de respuesta de las cuatro opciones. La persistencia
 * la verifica {@code CostasYFraccionamientoJdbcTest} contra PostgreSQL real.
 *
 * <p>Lo que esta clase defiende y la de PostgreSQL no puede: que la <b>lista blanca</b> del cuerpo
 * no deje entrar un importe, que la observacion sea obligatoria (regla 10), y que los filtros que
 * el sistema no sabe calcular se <b>rechacen con su motivo</b> en vez de traducirse a algo
 * parecido.
 */
@DisplayName("Capa web — costas, convenio coactivo y consultas de deuda")
class CostasYConveniosControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 6, 18);
    private static final Clock RELOJ =
            Clock.fixed(HOY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
    private static final Ejercicio EJERCICIO = new Ejercicio(2026);
    private static final Dinero ARANCEL_REC1 = Dinero.de("35.00");

    private final MovimientosDelExpedienteEnMemoria movimientos =
            new MovimientosDelExpedienteEnMemoria();
    private final ExpedientesEnMemoria expedientes = new ExpedientesEnMemoria(movimientos);
    private final ActosEnMemoria actos = new ActosEnMemoria();
    private final CostasEnMemoria costas = new CostasEnMemoria();
    private final ValoresDeMentira valores = new ValoresDeMentira();

    private final LibroDeMentira libro =
            new LibroDeMentira()
                    .con(
                            new ObligacionPublica(
                                    "PREDIAL",
                                    EJERCICIO,
                                    null,
                                    null,
                                    HOY,
                                    Dinero.de("500.00"),
                                    Dinero.CERO,
                                    Dinero.CERO,
                                    Dinero.CERO));

    private final ContribuyentesDeMentira contribuyentes =
            new ContribuyentesDeMentira()
                    .con(new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 1234"));

    private final CargosApuntados cargos = new CargosApuntados();

    private final ConsultaDeExpedientes consulta =
            new ConsultaDeExpedientes(expedientes, movimientos, valores, libro, costas);

    private final MockMvc costasMvc =
            construir(
                    new CostasController(
                            new LiquidarCostas(
                                    expedientes,
                                    movimientos,
                                    actos,
                                    costas,
                                    new ArancelDeCostasParametrizado(new ArancelDeLaPrueba()),
                                    cargos,
                                    (RegistroDeAuditoria registro) -> {},
                                    RELOJ),
                            new ConsultaDeCostas(costas, expedientes, libro),
                            contribuyentes,
                            RELOJ));

    private final ConveniosDeMentira convenios = new ConveniosDeMentira();

    private final MockMvc conveniosMvc =
            construir(
                    new ConvenioCoactivoController(
                            new FraccionarEnCoactiva(expedientes, movimientos, convenios), RELOJ));

    private final MockMvc deudasMvc =
            construir(
                    new DeudaCoactivaController(
                            new ConsultaDeDeudasCoactivas(
                                    consulta, expedientes, actos, valores, new SinBeneficios()),
                            contribuyentes,
                            RELOJ));

    @BeforeEach
    void fijarOrigen() {
        OrigenContext.fijar(new Origen("ejecutor.coactivo", "PC-COACTIVA-01", "10.1.1.9"));
    }

    @AfterEach
    void limpiarOrigen() {
        OrigenContext.limpiar();
    }

    // ------------------------------------------------------------------

    @Test
    @DisplayName("liquida y devuelve 201 con el detalle, su arancel y de que conjunto salio")
    void liquidaYDevuelve201() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult resultado =
                costasMvc
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/liquidaciones-costas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"nroExpedCoact\":\""
                                                        + expediente
                                                        + "\",\"observacion\":\"Se liquidan las"
                                                        + " costas del procedimiento\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"totalS\":\"35.00\"");
        assertThat(cuerpo).contains("\"arancelFuente\":\"ARANCEL_COSTA:REC1\"");
        assertThat(cuerpo).contains("\"conjuntoDeParametros\":1");
        assertThat(cargos.asentados)
                .as("el cargo se pide por el puerto publico, no se escribe aqui")
                .hasSize(1);
    }

    @Test
    @DisplayName("sin observacion, 422: no se liquida nada (regla 10)")
    void sinObservacionNoSeLiquida() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult resultado =
                costasMvc
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/liquidaciones-costas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"nroExpedCoact\":\"" + expediente + "\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(cargos.asentados).isEmpty();
    }

    @Test
    @DisplayName("el filtro «nroExpedCoact» viaja por la consulta y dice que expediente (#425)")
    void elExpedienteViajaPorLaConsulta() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult resultado =
                costasMvc
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/liquidaciones-costas")
                                        .param("nroExpedCoact", expediente)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"observacion\":\"Se liquidan las costas del"
                                                        + " procedimiento\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .as("no basta con que se acepte: se liquido el expediente que se pidio")
                .contains("\"expedCoact\":\"" + expediente + "\"")
                .contains("\"totalS\":\"35.00\"");
        assertThat(cargos.asentados).hasSize(1);
    }

    @Test
    @DisplayName("un expediente que no existe en la consulta, 404 y no se liquida nada")
    void unExpedienteInexistenteEnLaConsulta404() throws Exception {
        expedienteConRec1();

        MvcResult resultado =
                costasMvc
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/liquidaciones-costas")
                                        .param("nroExpedCoact", "EXP-2026-999999")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"observacion\":\"Se liquidan las costas del"
                                                        + " procedimiento\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
        assertThat(cargos.asentados).isEmpty();
    }

    @Test
    @DisplayName("y si viene en los dos sitios gana el cuerpo: el cliente viejo sigue igual")
    void elCuerpoGanaALaConsultaEnLasCostas() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult resultado =
                costasMvc
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/liquidaciones-costas")
                                        .param("nroExpedCoact", "EXP-2026-999999")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"nroExpedCoact\":\""
                                                        + expediente
                                                        + "\",\"observacion\":\"Se liquidan las"
                                                        + " costas del procedimiento\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"expedCoact\":\"" + expediente + "\"");
    }

    @Test
    @DisplayName("un importe en el cuerpo no entra: la lista blanca no lo tiene")
    void unImporteEnElCuerpoNoEntra() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult resultado =
                costasMvc
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/liquidaciones-costas")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"nroExpedCoact\":\""
                                                        + expediente
                                                        + "\",\"montoS\":\"1.00\",\"totalS\":\"1.00\","
                                                        + "\"observacion\":\"Se intenta poner el"
                                                        + " importe\"}"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("el cuerpo sobrante se ignora; lo que decide es el arancel sellado")
                .isEqualTo(201);
        assertThat(resultado.getResponse().getContentAsString())
                .as("y el importe sigue siendo el del arancel, no el que mandaron")
                .contains("\"totalS\":\"35.00\"");
    }

    @Test
    @DisplayName("un estado que se deriva del libro se admite; NOTIFICADA y ANULADA, 422")
    void losEstadosQueNoSeSabenSeRechazan() throws Exception {
        assertThat(listarCostas("estado=ACTIVA").getResponse().getStatus()).isEqualTo(200);
        assertThat(listarCostas("estado=Todos").getResponse().getStatus()).isEqualTo(200);

        MvcResult notificada = listarCostas("estado=N%20%E2%80%94%20NOTIFICADA");
        assertThat(notificada.getResponse().getStatus()).isEqualTo(422);
        assertThat(notificada.getResponse().getContentAsString())
                .as("se dice por que no se sabe, en vez de devolver una lista cualquiera")
                .contains("acuse");
    }

    @Test
    @DisplayName("el fraccionamiento simula con 200 y registra con 201")
    void elFraccionamientoSimulaYRegistra() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult simulacion = fraccionar(expediente, true, "Se simula el convenio coactivo");
        assertThat(simulacion.getResponse().getStatus()).isEqualTo(200);
        assertThat(simulacion.getResponse().getContentAsString())
                .as("una simulacion no consume correlativo: no lleva numero")
                .contains("\"nroConvenio\":null");

        MvcResult registro = fraccionar(expediente, false, "Se registra el convenio coactivo");
        assertThat(registro.getResponse().getStatus()).isEqualTo(201);
        String cuerpo = registro.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"nroConvenio\":\"F-2026-000001\"");
        assertThat(cuerpo).contains("\"tipo\":\"COACTIVO\"");
        assertThat(cuerpo).contains("\"estado\":\"PRECONVENIO\"");
        assertThat(cuerpo)
                .as("la fase de origen viaja: es lo que explica a donde vuelve si se quiebra")
                .contains("\"faseOrigen\":\"COACTIVA\"");
    }

    @Test
    @DisplayName("fraccionar sin observacion, 422: no se registra nada (regla 10)")
    void fraccionarSinObservacion() throws Exception {
        String expediente = expedienteConRec1();

        MvcResult resultado = fraccionar(expediente, false, null);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(convenios.registrados).isZero();
    }

    @Test
    @DisplayName("«FRACCIONADO» no es un estado del procedimiento: 422 con el motivo")
    void fraccionadoNoEsUnEstado() throws Exception {
        MvcResult resultado = listarDeudas("estado=FRACCIONADO");

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("no es un estado del procedimiento coactivo")
                .contains("fase CONVENIO");
    }

    @Test
    @DisplayName("un tipo de deuda que hoy no llega a coactiva: 422 con el motivo")
    void unTipoDeDeudaQueNoLlega() throws Exception {
        assertThat(listarDeudas("tipoDeDeuda=TRIBUTARIA").getResponse().getStatus()).isEqualTo(200);

        MvcResult resultado = listarDeudas("tipoDeDeuda=P.%20TRANSITO");
        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("se importan valores");
    }

    @Test
    @DisplayName("filtrar por campaña de beneficio, 422: su efecto sobre el importe es D-02b")
    void filtrarPorCampaniaDeBeneficio() throws Exception {
        MvcResult resultado =
                deudasMvc
                        .perform(
                                MockMvcRequestBuilders.get("/api/v1/coactiva/deudas-en-beneficio")
                                        .param("benefAplicable", "AMNISTIA COACTIVA 2026"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("D-02b");
    }

    // ------------------------------------------------------------------

    private MvcResult listarCostas(String consulta) throws Exception {
        return costasMvc
                .perform(
                        MockMvcRequestBuilders.get(
                                "/api/v1/coactiva/liquidaciones-costas?" + consulta))
                .andReturn();
    }

    private MvcResult listarDeudas(String consulta) throws Exception {
        return deudasMvc
                .perform(MockMvcRequestBuilders.get("/api/v1/coactiva/deudas?" + consulta))
                .andReturn();
    }

    private MvcResult fraccionar(String expediente, boolean simular, String observacion)
            throws Exception {
        String cuerpo =
                "{\"nroExpedCoact\":\""
                        + expediente
                        + "\",\"nroDeCuotas\":6,\"cuotaInicial\":\"20 %\",\"simular\":"
                        + simular
                        + (observacion == null ? "" : ",\"observacion\":\"" + observacion + "\"")
                        + ",\"obligaciones\":[{\"tributo\":\"PREDIAL\",\"ejercicio\":2026}]}";
        return conveniosMvc
                .perform(
                        MockMvcRequestBuilders.post("/api/v1/coactiva/convenios")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo))
                .andReturn();
    }

    /** Un expediente abierto con su REC-1 dictada, sin pasar por la emision de documentos. */
    private String expedienteConRec1() {
        ExpedienteCoactivo expediente =
                expedientes.abrir(
                        new ExpedienteCoactivo(
                                null,
                                "EXP-2026-000001",
                                EJERCICIO,
                                1,
                                7L,
                                "EJECUTOR COACTIVO",
                                null,
                                HOY,
                                null,
                                "AV. GRAU 100",
                                Instant.parse("2026-06-18T09:00:00Z"),
                                null,
                                Observacion.de("Se abre para la prueba")));
        actos.registrar(
                ActoCoactivo.nuevo(
                        expediente.identificador(),
                        TipoDeActoCoactivo.REC1,
                        "REC1-2026-000001",
                        HOY,
                        "Resolucion de ejecucion coactiva de la prueba",
                        1L,
                        Instant.parse("2026-06-18T09:00:00Z"),
                        Observacion.de("Se dicta para la prueba")));
        return expediente.numero();
    }

    private static MockMvc construir(Object controlador) {
        return MockMvcBuilders.standaloneSetup(controlador)
                .setControllerAdvice(new ManejadorDeErrores())
                .setMessageConverters(
                        new JacksonJsonHttpMessageConverter(
                                JsonMapper.builder()
                                        .addModule(
                                                new ConfiguracionDeJson().moduloDeObjetosDeValor())
                                        .build()))
                .build();
    }

    /** Los cargos que la liquidacion pidio asentar, sin libro detras. */
    private static final class CargosApuntados implements GeneradorDeCargos {

        private final List<Dinero> asentados = new java.util.ArrayList<>();

        @Override
        public void generarCargo(
                Ejercicio ejercicio,
                long contribuyenteId,
                String tributo,
                Integer periodo,
                Long predioId,
                Long vehiculoId,
                String referenciaExterna,
                Dinero monto,
                LocalDate fechaValor,
                String documentoOrigen,
                Observacion observacion) {
            throw new UnsupportedOperationException("Las costas no son un cargo insoluto");
        }

        @Override
        public void generarGastoDelProcedimiento(
                Ejercicio ejercicio,
                long contribuyenteId,
                String tributo,
                String referenciaExterna,
                Dinero monto,
                LocalDate fechaValor,
                String documentoOrigen,
                Observacion observacion) {
            asentados.add(monto);
        }
    }

    /** El arancel de la prueba: la REC-1 tarifada, lo demas no. */
    private static final class ArancelDeLaPrueba implements LectorDeParametros {

        @Override
        public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
            return ParametrosSellados.de(ejercicio, 1)
                    .numero(
                            "ARANCEL_COSTA",
                            TipoDeActoCoactivo.REC1.name(),
                            ValorNormativo.de(ARANCEL_REC1.valor().toPlainString()))
                    .construir();
        }

        @Override
        public ParametrosSellados porConjunto(IdentificadorDeConjunto identificador) {
            return vigenteEn(EJERCICIO);
        }

        @Override
        public IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio) {
            return IdentificadorDeConjunto.de(1);
        }
    }

    /**
     * El puerto de tesoreria, sin tesoreria detras.
     *
     * <p>Lo que esta prueba verifica es el <b>transporte</b>: que el cuerpo se traduzca, que la
     * observacion se exija y que la respuesta lleve la fase de origen. Que el convenio sea de
     * verdad el mecanismo de #35 lo verifica {@code CostasYFraccionamientoJdbcTest} contra
     * PostgreSQL, llamando al puerto real.
     */
    private static final class ConveniosDeMentira implements FraccionamientoCoactivo {

        private int registrados;

        @Override
        public ConvenioCoactivo simular(SolicitudDeConvenioCoactivo solicitud) {
            return convenio(solicitud, null);
        }

        @Override
        public ConvenioCoactivo registrar(
                SolicitudDeConvenioCoactivo solicitud, Observacion observacion) {
            registrados++;
            return convenio(solicitud, "F-2026-000001");
        }

        private static ConvenioCoactivo convenio(
                SolicitudDeConvenioCoactivo solicitud, String numero) {
            Dinero total = Dinero.de("500.00");
            return new ConvenioCoactivo(
                    numero,
                    "COACTIVO",
                    "PRECONVENIO",
                    solicitud.fecha(),
                    solicitud.fechaDeCorte(),
                    total,
                    Dinero.de("100.00"),
                    solicitud.cuotas(),
                    total,
                    Alicuota.de("1"),
                    1L,
                    List.of(
                            new CuotaDelConvenio(
                                    0,
                                    solicitud.fecha(),
                                    Dinero.de("100.00"),
                                    Dinero.de("100.00"),
                                    Dinero.CERO,
                                    Dinero.CERO)),
                    List.of(
                            new DeudaAcogida(
                                    "PREDIAL",
                                    EJERCICIO,
                                    0,
                                    null,
                                    null,
                                    "COACTIVA",
                                    solicitud.fechaDeCorte(),
                                    total,
                                    Dinero.CERO,
                                    Dinero.CERO,
                                    Dinero.CERO)));
        }
    }

    /** Sin beneficios registrados: la consulta de beneficio devuelve una pagina vacia. */
    private static final class SinBeneficios implements BeneficiosDelContribuyente {

        @Override
        public List<BeneficioRegistrado> vigentesA(long contribuyenteId, LocalDate aLaFecha) {
            return List.of();
        }
    }
}
