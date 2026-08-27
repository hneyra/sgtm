package pe.gob.sgtm.autorizacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.web.ManejadorDeErrores;

/**
 * RF-121: el guardia corre antes que el controlador, y niega por omision.
 *
 * <p>Que la interfaz oculte una opcion de menu es comodidad: la peticion se puede hacer igual con
 * {@code curl}. Esta es la comprobacion que cuenta.
 */
@DisplayName("RF-121 — El guardia de acceso")
class GuardiaDeAccesoTest {

    private static final Clock RELOJ =
            Clock.fixed(Instant.parse("2026-08-18T10:00:00Z"), ZoneId.of("America/Lima"));

    private final ComprobadorDeAccesoDeMentira comprobador = new ComprobadorDeAccesoDeMentira();

    private final MockMvc mvc =
            MockMvcBuilders.standaloneSetup(
                            new ControladorDePrueba(),
                            new ControladorSinDeclarar(),
                            new ControladorDeSesionPropia())
                    .addInterceptors(new GuardiaDeAcceso(comprobador, RELOJ))
                    .setControllerAdvice(new ManejadorDeErrores())
                    .build();

    @BeforeEach
    void fijarOrigen() {
        OrigenContext.fijar(new Origen("jperez", null, null));
    }

    @AfterEach
    void limpiarOrigen() {
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("sin el privilegio: 403, aunque la peticion sea valida y la opcion exista")
    void sinPrivilegio403() throws Exception {
        comprobador.autoriza = false;

        MvcResult resultado = mvc.perform(get("/api/v1/prueba/consulta")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(403);
        assertThat(resultado.getResponse().getContentAsString())
                .contains("\"codigo\":\"SIN_PRIVILEGIO\"");
        assertThat(resultado.getResponse().getContentAsString())
                .as("dice que falta, no quien lo tiene ni como se configura")
                .doesNotContain("grupo")
                .doesNotContain("permiso");
    }

    @Test
    @DisplayName("con el privilegio: pasa, y el guardia pregunto por el acceso y el privilegio")
    void conPrivilegioPasa() throws Exception {
        comprobador.autoriza = true;

        MvcResult resultado = mvc.perform(get("/api/v1/prueba/consulta")).andReturn();

        assertThat(resultado.getResponse().getStatus()).isEqualTo(200);
        assertThat(comprobador.preguntas)
                .containsExactly("jperez|consulta_de_prueba|LECTURA|2026-08-18");
    }

    @Test
    @DisplayName("el privilegio del metodo gana sobre el de la clase")
    void elPrivilegioDelMetodoGana() throws Exception {
        comprobador.autoriza = true;

        mvc.perform(get("/api/v1/prueba/alta")).andReturn();

        assertThat(comprobador.preguntas)
                .as("un mismo controlador consulta con LECTURA y da de alta con REGISTRO")
                .containsExactly("jperez|consulta_de_prueba|REGISTRO|2026-08-18");
    }

    @Test
    @DisplayName("SESION_PROPIA pasa con solo estar autenticado: no se comprueba el catalogo")
    void sesionPropiaPasaSinComprobarElCatalogo() throws Exception {
        comprobador.autoriza = false;

        MvcResult resultado = mvc.perform(get("/api/v1/prueba/sesion")).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("leer los permisos propios no es una opcion del catalogo (ADR-0013)")
                .isEqualTo(200);
        assertThat(comprobador.preguntas)
                .as("el guardia no pregunta al comprobador: no hay privilegio que exigir")
                .isEmpty();
    }

    @Test
    @DisplayName("un endpoint sin acceso declarado se deniega; no se deja pasar por omision")
    void sinAccesoDeclaradoSeDeniega() throws Exception {
        comprobador.autoriza = true;

        MvcResult resultado = mvc.perform(get("/api/v1/prueba/sin-declarar")).andReturn();

        assertThat(resultado.getResponse().getStatus())
                .as("permitir por omision convierte cualquier olvido en una puerta abierta")
                .isEqualTo(403);
        assertThat(comprobador.preguntas).as("ni siquiera llego a preguntar").isEmpty();
    }

    /** Controlador de prueba: no vale nada montar el sistema entero para verificar un filtro. */
    @RestController
    @RequiereAcceso(acceso = "consulta_de_prueba", privilegio = Privilegio.LECTURA)
    static class ControladorDePrueba {

        @GetMapping("/api/v1/prueba/consulta")
        String consultar() {
            return "ok";
        }

        @GetMapping("/api/v1/prueba/alta")
        @RequiereAcceso(acceso = "consulta_de_prueba", privilegio = Privilegio.REGISTRO)
        String darDeAlta() {
            return "ok";
        }
    }

    /**
     * Un controlador aparte y sin anotacion: la regla de ArchUnit no deja que esto exista en
     * produccion, y aqui se comprueba que si se colara por otro camino, el guardia niega.
     */
    @RestController
    static class ControladorSinDeclarar {

        @GetMapping("/api/v1/prueba/sin-declarar")
        String sinDeclarar() {
            return "ok";
        }
    }

    /** Declara {@link RequiereAcceso#SESION_PROPIA}: pasa con solo un token valido. */
    @RestController
    @RequiereAcceso(acceso = RequiereAcceso.SESION_PROPIA, privilegio = Privilegio.LECTURA)
    static class ControladorDeSesionPropia {

        @GetMapping("/api/v1/prueba/sesion")
        String sesion() {
            return "ok";
        }
    }

    private static final class ComprobadorDeAccesoDeMentira implements ComprobadorDeAcceso {

        private final List<String> preguntas = new ArrayList<>();
        private boolean autoriza;

        @Override
        public boolean autoriza(
                String usuario, String acceso, Privilegio privilegio, LocalDate fecha) {
            preguntas.add(usuario + "|" + acceso + "|" + privilegio + "|" + fecha);
            return autoriza;
        }
    }
}
