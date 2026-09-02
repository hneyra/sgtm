package pe.gob.sgtm.indicadores.infraestructura.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.indicadores.aplicacion.PanelDeRecaudacion;
import pe.gob.sgtm.indicadores.dobles.CajaDeMentira;
import pe.gob.sgtm.indicadores.dobles.LibroDeMentira;
import pe.gob.sgtm.web.ConfiguracionDeJson;
import pe.gob.sgtm.web.ManejadorDeErrores;
import tools.jackson.databind.json.JsonMapper;

/**
 * #56 — Capa web: la forma de la respuesta, que es la que la pantalla ya espera.
 *
 * <p>Se prueba el transporte, no la persistencia: lo que demuestra que las cifras cuadran con el
 * libro y que RLS las separa vive en {@code cuentacorriente}, contra PostgreSQL de verdad.
 *
 * <p>Lo que aqui se defiende es que el contrato con la interfaz no se rompa. {@code
 * frontend/apps/backoffice/src/pantallas/inicio/recaudacion.ts} valida esta respuesta desde antes
 * de que hubiera backend, y <b>rechaza</b> un cuerpo sin {@code fechaCalculo}: una respuesta valida
 * para el servidor y sin ese campo dejaria la pantalla de inicio en blanco.
 */
@DisplayName("#56 — Capa web: el panel de recaudacion")
class IndicadoresControllerTest {

    private static final Instant AHORA = Instant.parse("2026-08-13T14:05:31Z");
    private static final Clock RELOJ = Clock.fixed(AHORA, ZoneOffset.UTC);

    private final LibroDeMentira libro =
            new LibroDeMentira()
                    .conRecaudado("PREDIAL", new Ejercicio(2026), 3, "500.00", 4)
                    .conCargado("PREDIAL", "1000.00", 10)
                    .conCargado("ARBITRIO", "400.00", 8)
                    .conPendiente("PREDIAL", "200.00", 3);

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new IndicadoresController(
                                    new PanelDeRecaudacion(
                                            libro,
                                            libro,
                                            new CajaDeMentira().con("310.00", "10.00")),
                                    RELOJ))
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
    @DisplayName("responde con la forma que la pantalla lee: fechaCalculo, kpis y paneles")
    void respondeConLaFormaQueLaPantallaLee() throws Exception {
        String cuerpo = panel("?ejercicio=2026");

        assertThat(cuerpo).contains("\"fechaCalculo\":\"2026-08-13\"");
        assertThat(cuerpo).contains("\"kpis\":[");
        assertThat(cuerpo).contains("\"paneles\":[");
        assertThat(cuerpo).contains("\"label\":\"Recaudado 2026\"");
        assertThat(cuerpo).contains("\"title\":\"Recaudacion por tributo\"");
        assertThat(cuerpo).contains("\"rows\":[");
        assertThat(cuerpo).contains("\"pct\":");
    }

    @Test
    @DisplayName("dice tambien a que HORA se leyo, no solo a que dia (AC 2)")
    void diceAQueHoraSeLeyo() throws Exception {
        // Un panel se recarga cada pocos minutos y dos lecturas del mismo dia dan cifras
        // distintas: sin la hora, dos capturas del mismo panel no se distinguen.
        assertThat(panel("")).contains("\"calculadoEn\":\"2026-08-13T14:05:31Z\"");
    }

    @Test
    @DisplayName("cada importe sale con su fecha, nunca suelto (RNF-075, regla 9)")
    void cadaImporteSaleConSuFecha() throws Exception {
        String cuerpo = panel("");

        // La regla de ArchUnit TODA_CIFRA_DE_LA_WEB_LLEVA_SU_FECHA lo verifica sobre la
        // clase; esto lo verifica sobre el JSON que sale de verdad.
        assertThat(cuerpo)
                .contains("\"importe\":{\"importe\":\"500.00\",\"actualizadoA\":\"2026-08-13\"}");
        assertThat(cuerpo)
                .contains("\"importe\":{\"importe\":\"200.00\",\"actualizadoA\":\"2026-08-13\"}");
        assertThat(cuerpo)
                .as("y como texto, nunca como numero JSON: el number de JavaScript pierde centimos")
                .doesNotContain("\"importe\":500.00");
        assertThat(cuerpo)
                .as("el porcentaje no es un importe: no hay nada que fechar y va nulo")
                .contains(
                        "\"value\":\"35 %\",\"note\":\"de S/ 1,400.00 cargados\",\"importe\":null");
    }

    @Test
    @DisplayName("la cifra viene redactada por el servidor, no en crudo (RNF-080)")
    void laCifraVieneRedactada() throws Exception {
        String cuerpo = panel("");

        assertThat(cuerpo).contains("\"value\":\"S/ 500.00\"");
        assertThat(cuerpo).contains("\"value\":\"S/ 300.00\"");
    }

    @Test
    @DisplayName("una barra que no se pudo medir se distingue de una que midio cero")
    void unaBarraSinBaseSeDistingue() throws Exception {
        LibroDeMentira sinCargos =
                new LibroDeMentira()
                        .conRecaudado("MULTA_TRANSITO", new Ejercicio(2026), 4, "150.00", 2);
        MockMvc otro =
                MockMvcBuilders.standaloneSetup(
                                new IndicadoresController(
                                        new PanelDeRecaudacion(
                                                sinCargos, sinCargos, new CajaDeMentira()),
                                        RELOJ))
                        .setControllerAdvice(new ManejadorDeErrores())
                        .setMessageConverters(
                                new JacksonJsonHttpMessageConverter(
                                        JsonMapper.builder()
                                                .addModule(
                                                        new ConfiguracionDeJson()
                                                                .moduloDeObjetosDeValor())
                                                .build()))
                        .build();

        String cuerpo =
                otro.perform(MockMvcRequestBuilders.get("/api/v1/indicadores/recaudacion"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        // La barra tiene que llevar un numero —una barra sin numero no se pinta—, y a la
        // vez el cuerpo tiene que poder decir que ese cero no se midio.
        assertThat(cuerpo).contains("\"pct\":0,\"avanceConocido\":false");
        assertThat(cuerpo).contains("\"sub\":\"sin cargos asentados en el ejercicio\"");
        assertThat(cuerpo).contains("\"value\":\"—\"");
    }

    @Test
    @DisplayName("sin ejercicio en la peticion, el del reloj: la pantalla de inicio abre sin nada")
    void sinEjercicioElDelReloj() throws Exception {
        assertThat(panel("")).contains("\"ejercicio\":2026");
    }

    @Test
    @DisplayName("un ejercicio que no es un ano, 422 y ninguna cifra")
    void unEjercicioInvalidoRechaza() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.get(
                                        "/api/v1/indicadores/recaudacion?ejercicio=el+pasado"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
        assertThat(resultado.getResponse().getContentAsString()).doesNotContain("kpis");
    }

    @Test
    @DisplayName("un ejercicio fuera del rango del dominio tambien se rechaza en el borde")
    void unEjercicioFueraDeRangoRechaza() throws Exception {
        MvcResult resultado =
                mvc.perform(
                                MockMvcRequestBuilders.get(
                                        "/api/v1/indicadores/recaudacion?ejercicio=1789"))
                        .andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(422);
    }

    private String panel(String consulta) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.get("/api/v1/indicadores/recaudacion" + consulta))
                .andReturn()
                .getResponse()
                .getContentAsString();
    }
}
