package pe.gob.sgtm.valores.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.contribuyentes.ResumenDeContribuyente;
import pe.gob.sgtm.valores.aplicacion.DeclararPrescripcion;
import pe.gob.sgtm.valores.aplicacion.PlazosParametrizados;
import pe.gob.sgtm.valores.dobles.ContribuyentesDeMentira;
import pe.gob.sgtm.valores.dobles.ParametrosDeMentira;
import pe.gob.sgtm.valores.dobles.PrescripcionesEnMemoria;
import pe.gob.sgtm.valores.dobles.ValoresEnMemoria;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #39 — Capa web de la prescripcion: {@code POST /api/v1/coactiva/prescripcion} (RF-094).
 *
 * <p>Se prueba el transporte, no la persistencia —eso lo verifica {@code NotificacionYPaseJdbcTest}
 * contra PostgreSQL real—. Lo propio de esta ruta es lo que <b>no</b> deja entrar: el plazo, el
 * inicio del computo y el resultado los deriva el servidor, y la pantalla del manual los dibuja de
 * solo lectura precisamente por eso.
 */
@DisplayName("Capa web — /api/v1/coactiva/prescripcion")
class PrescripcionControllerTest {

    private static final LocalDate HOY = LocalDate.of(2026, 6, 1);

    private final ContribuyentesDeMentira contribuyentes =
            new ContribuyentesDeMentira()
                    .con(new ResumenDeContribuyente(7L, "C-0007", "TITULAR, PRUEBA", "DNI 1"));
    private final PrescripcionesEnMemoria prescripciones = new PrescripcionesEnMemoria();
    private final ParametrosDeMentira parametros =
            new ParametrosDeMentira()
                    .con("PLAZO", "PRESCRIPCION-DECLARACION_PRESENTADA", "4 ANIOS")
                    .con("PLAZO", "PRESCRIPCION_INICIO-PREDIAL", "1 ANIOS");
    private final DeclararPrescripcion declarar =
            new DeclararPrescripcion(
                    prescripciones,
                    new ValoresEnMemoria(),
                    new PlazosParametrizados(parametros),
                    (RegistroDeAuditoria registro) -> {});

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new PrescripcionController(
                                    declarar,
                                    contribuyentes,
                                    Clock.fixed(
                                            HOY.atStartOfDay(ZoneOffset.UTC).toInstant(),
                                            ZoneOffset.UTC)))
                    .setControllerAdvice(new ManejadorDeErrores())
                    .setMessageConverters(
                            new org.springframework.http.converter.json
                                    .JacksonJsonHttpMessageConverter(
                                    JsonMapper.builder()
                                            .addModule(
                                                    new ConfiguracionDeJson()
                                                            .moduloDeObjetosDeValor())
                                            .build()))
                    .build();

    @Test
    @DisplayName("declara y devuelve el computo ejercicio por ejercicio, no solo el resultado")
    void declaraYDevuelveElComputo() throws Exception {
        MvcResult resultado =
                declararRango(
                        """
                        {"codContribuyente":"C-0007","tributo":"PREDIAL",
                         "ejercicioDesde":2020,"ejercicioHasta":2022,
                         "fechaDePresentacion":"2026-06-01",
                         "plazoAplicable":"DECLARACION_PRESENTADA",
                         "observacion":"Se resuelve la solicitud"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"resultado\":\"PROCEDE_EN_PARTE\"");
        assertThat(cuerpo).contains("\"plazo\":\"4 ANIOS\"");
        // La resolucion tiene que poder sustentarse: sale el computo de los tres ejercicios.
        assertThat(cuerpo).contains("\"ejercicio\":2020").contains("\"ejercicio\":2022");
        assertThat(cuerpo).contains("\"inicioDelComputo\":\"2021-01-01\"");
    }

    @Test
    @DisplayName("una interrupcion alegada viaja y sale reflejada en el computo")
    void laInterrupcionViajaYSaleReflejada() throws Exception {
        MvcResult resultado =
                declararRango(
                        """
                        {"codContribuyente":"C-0007","tributo":"PREDIAL",
                         "ejercicioDesde":2020,"ejercicioHasta":2020,
                         "fechaDePresentacion":"2026-06-01",
                         "plazoAplicable":"DECLARACION_PRESENTADA",
                         "hechos":[{"clase":"INTERRUPCION","causal":"pago parcial de la deuda",
                                    "fechaDesde":"2024-02-02"}],
                         "nDeResolucion":"RES-2026-001",
                         "observacion":"Se resuelve la solicitud"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(201);
        String cuerpo = resultado.getResponse().getContentAsString();
        assertThat(cuerpo).contains("\"resultado\":\"NO_PROCEDE\"");
        assertThat(cuerpo).contains("\"nuevoInicioDelComputo\":\"2024-02-03\"");
        assertThat(cuerpo).contains("\"causal\":\"pago parcial de la deuda\"");
    }

    @Test
    @DisplayName("sin observacion, 422: no se declara nada")
    void sinObservacionRechaza() throws Exception {
        MvcResult resultado =
                declararRango(
                        """
                        {"codContribuyente":"C-0007","tributo":"PREDIAL",
                         "ejercicioDesde":2020,"ejercicioHasta":2020,
                         "plazoAplicable":"DECLARACION_PRESENTADA"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(prescripciones.porId(1L)).isEmpty();
    }

    @Test
    @DisplayName("un contribuyente que no existe, 404")
    void contribuyenteInexistente404() throws Exception {
        MvcResult resultado =
                declararRango(
                        """
                        {"codContribuyente":"NO-EXISTE","tributo":"PREDIAL",
                         "ejercicioDesde":2020,"ejercicioHasta":2020,
                         "plazoAplicable":"DECLARACION_PRESENTADA",
                         "observacion":"Se resuelve la solicitud"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    @DisplayName("una causal desconocida, 422 con las tres que se admiten")
    void causalDesconocida422() throws Exception {
        MvcResult resultado =
                declararRango(
                        """
                        {"codContribuyente":"C-0007","tributo":"PREDIAL",
                         "ejercicioDesde":2020,"ejercicioHasta":2020,
                         "plazoAplicable":"5 ANIOS",
                         "observacion":"Se resuelve la solicitud"}
                        """);

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).contains("AGENTE_RETENCION");
    }

    @Test
    @DisplayName("sin el plazo parametrizado, 422 nombrando la llave que falta (#192)")
    void sinPlazoParametrizado422() throws Exception {
        DeclararPrescripcion sinPlazos =
                new DeclararPrescripcion(
                        prescripciones,
                        new ValoresEnMemoria(),
                        new PlazosParametrizados(new ParametrosDeMentira()),
                        (RegistroDeAuditoria registro) -> {});
        MockMvc sinParametros =
                MockMvcBuilders.standaloneSetup(
                                new PrescripcionController(
                                        sinPlazos,
                                        contribuyentes,
                                        Clock.fixed(
                                                HOY.atStartOfDay(ZoneOffset.UTC).toInstant(),
                                                ZoneOffset.UTC)))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .build();

        MvcResult resultado =
                sinParametros
                        .perform(
                                MockMvcRequestBuilders.post("/api/v1/coactiva/prescripcion")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"codContribuyente":"C-0007","tributo":"PREDIAL",
                                                 "ejercicioDesde":2020,"ejercicioHasta":2020,
                                                 "plazoAplicable":"DECLARACION_PRESENTADA",
                                                 "observacion":"Se resuelve la solicitud"}
                                                """))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("PLAZO:PRESCRIPCION-DECLARACION_PRESENTADA");
    }

    private MvcResult declararRango(String cuerpo) throws Exception {
        return mvc.perform(
                        MockMvcRequestBuilders.post("/api/v1/coactiva/prescripcion")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(cuerpo))
                .andReturn();
    }
}
