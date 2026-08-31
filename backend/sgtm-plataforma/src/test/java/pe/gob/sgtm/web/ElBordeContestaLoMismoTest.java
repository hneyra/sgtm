package pe.gob.sgtm.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Una peticion que el borde no puede leer contesta <b>lo mismo en todas las operaciones</b> (#486,
 * cuarto criterio).
 *
 * <h2>Lo que se midio antes de escribir nada</h2>
 *
 * <p>Los cuatro casos de aqui abajo contestaban <b>500</b>. No en unas operaciones y no en otras:
 * en las 195 por igual, porque la causa no esta en ningun controlador sino en una sola clase — el
 * {@code @ExceptionHandler(Exception.class)} de {@link ManejadorDeErrores} se tragaba las
 * excepciones que Spring lanza <i>antes</i> de entrar al controlador.
 *
 * <p>Eso corrige el encuadre del criterio, que hablaba de «diez operaciones»: no era un problema
 * por operacion, y por eso el arreglo es una clase y no diez.
 *
 * <h2>La tercera consecuencia, que es la que no se ve</h2>
 *
 * <p>Un 500 de este manejador <b>escribe una incidencia con nivel ERROR en el registro</b>. Con el
 * defecto, un cliente tecleando mal ensuciaba el registro de errores del servidor — justo lo que el
 * javadoc de {@code rutaNoEncontrada} explica que no debe pasar. Por eso la ultima prueba de este
 * archivo no mira el estado sino el registro: es la parte del defecto que un {@code assertThat}
 * sobre el codigo HTTP no puede ver.
 */
@DisplayName("RNF-033 — El borde contesta lo mismo ante una peticion que no puede leer (#486)")
class ElBordeContestaLoMismoTest {

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(new Sonda())
                    .setControllerAdvice(new ManejadorDeErrores())
                    .build();

    @Test
    @DisplayName("falta un parametro obligatorio: 422, y dice cual")
    void faltaUnParametro() throws Exception {
        MvcResult respuesta = mvc.perform(get("/sonda/obligatorio")).andReturn();

        assertThat(respuesta.getResponse().getStatus())
                .as(
                        "un 500 le dice al cliente «el servidor se rompio», y un cliente reintenta un"
                                + " 500 para siempre")
                .isEqualTo(422);
        assertThat(respuesta.getResponse().getContentAsString())
                .as("y nombrar el parametro es la diferencia entre arreglarlo y adivinar")
                .contains("codigo");
    }

    @Test
    @DisplayName("un parametro con un valor que no admite: 422, y dice cual y con que valor")
    void elValorNoCuadra() throws Exception {
        MvcResult respuesta =
                mvc.perform(get("/sonda/paginado").param("pagina", "abc")).andReturn();

        assertThat(respuesta.getResponse().getStatus()).isEqualTo(422);
        assertThat(respuesta.getResponse().getContentAsString()).contains("pagina").contains("abc");
    }

    @Test
    @DisplayName("un valor que el enumerado no conoce: 422, no 500")
    void elEnumeradoNoLoConoce() throws Exception {
        MvcResult respuesta =
                mvc.perform(get("/sonda/paginado").param("direccion", "DIAGONAL")).andReturn();

        assertThat(respuesta.getResponse().getStatus()).isEqualTo(422);
        assertThat(respuesta.getResponse().getContentAsString()).contains("DIAGONAL");
    }

    @Test
    @DisplayName("un cuerpo que no es JSON: 422, y el mensaje NO nombra ninguna clase de Java")
    void elCuerpoNoSePuedeLeer() throws Exception {
        MvcResult respuesta =
                mvc.perform(
                                post("/sonda/cuerpo")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{no-json"))
                        .andReturn();

        assertThat(respuesta.getResponse().getStatus()).isEqualTo(422);
        String cuerpo = respuesta.getResponse().getContentAsString();
        assertThat(cuerpo).contains("no es JSON valido");
        assertThat(cuerpo)
                .as(
                        "el mensaje de Jackson nombra la clase y el campo de Java que esperaba; eso"
                                + " es esquema, y no sale de aqui (RNF-033)")
                .doesNotContain("Cuerpo")
                .doesNotContain("pe.gob.sgtm")
                .doesNotContain("java.");
    }

    @Test
    @DisplayName("y ninguna de las cuatro escribe una incidencia en el registro de errores")
    void ningunaEnsuciaElRegistro() throws Exception {
        ch.qos.logback.classic.Logger registro =
                (ch.qos.logback.classic.Logger)
                        org.slf4j.LoggerFactory.getLogger(ManejadorDeErrores.class);
        ListAppender<ILoggingEvent> anotados = new ListAppender<>();
        anotados.start();
        registro.addAppender(anotados);
        try {
            mvc.perform(get("/sonda/obligatorio"));
            mvc.perform(get("/sonda/paginado").param("pagina", "abc"));
            mvc.perform(get("/sonda/paginado").param("direccion", "DIAGONAL"));
            mvc.perform(
                    post("/sonda/cuerpo")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{no-json"));
        } finally {
            registro.detachAppender(anotados);
        }

        assertThat(anotados.list.stream().filter(e -> e.getLevel() == Level.ERROR).toList())
                .as(
                        "con el defecto, cuatro peticiones mal tecleadas dejaban cuatro incidencias"
                                + " ERROR con su UUID; asi el registro deja de servir para encontrar"
                                + " defectos de verdad")
                .isEmpty();
    }

    @Test
    @DisplayName("lo que SI es un fallo del servidor sigue siendo 500 con su incidencia")
    void loQueSiEsInternoNoSeDisfraza() throws Exception {
        MvcResult respuesta = mvc.perform(get("/sonda/revienta")).andReturn();

        assertThat(respuesta.getResponse().getStatus())
                .as(
                        "el arreglo no puede convertir todo en 422: un defecto del servidor tiene"
                                + " que seguir diciendo que lo es, y dejar su rastro")
                .isEqualTo(500);
        assertThat(respuesta.getResponse().getContentAsString()).contains("incidencia");
    }

    // ------------------------------------------------------------------

    /** Un controlador con las cuatro formas en que una peticion puede llegar sin poder leerse. */
    @RestController
    static class Sonda {

        @GetMapping("/sonda/obligatorio")
        String obligatorio(@RequestParam String codigo) {
            return codigo;
        }

        @GetMapping("/sonda/paginado")
        String paginado(ParametrosDePaginacion paginacion) {
            return String.valueOf(paginacion.aPaginacion("codigo").pagina());
        }

        @PostMapping("/sonda/cuerpo")
        String cuerpo(@RequestBody Cuerpo cuerpo) {
            return String.valueOf(cuerpo.valor());
        }

        @GetMapping("/sonda/revienta")
        String revienta() {
            throw new IllegalStateException("un defecto de verdad, con su rastro");
        }
    }

    record Cuerpo(@Nullable String valor) {}
}
