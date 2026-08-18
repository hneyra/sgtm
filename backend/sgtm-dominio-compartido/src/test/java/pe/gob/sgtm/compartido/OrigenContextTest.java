package pe.gob.sgtm.compartido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Contexto de origen de la peticion (ADR-0008)")
class OrigenContextTest {

    @AfterEach
    void limpiar() {
        OrigenContext.limpiar();
    }

    @Test
    @DisplayName("sin contexto, actual() falla en lugar de devolver un valor por omision")
    void sinContextoFalla() {
        assertThatThrownBy(OrigenContext::actual)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No hay contexto de origen");
    }

    @Test
    @DisplayName("sin contexto, actualSiHay() esta vacio y no lanza")
    void sinContextoActualSiHayVacio() {
        assertThat(OrigenContext.actualSiHay()).isEmpty();
    }

    @Test
    @DisplayName("lo fijado es lo que se lee")
    void fijarYLeer() {
        OrigenContext.fijar(new OrigenPeticion("usuario-41", "PC-01", "10.0.0.5"));

        assertThat(OrigenContext.actual())
                .isEqualTo(new OrigenPeticion("usuario-41", "PC-01", "10.0.0.5"));
    }

    @Test
    @DisplayName("limpiar deja el hilo sin contexto")
    void limpiarDejaSinContexto() {
        OrigenContext.fijar(new OrigenPeticion("usuario-41", "PC-01", "10.0.0.5"));
        OrigenContext.limpiar();
        assertThat(OrigenContext.actualSiHay()).isEmpty();
    }

    @Test
    @DisplayName("el contexto no se propaga a otro hilo")
    void noSePropagaAOtroHilo() throws InterruptedException {
        OrigenContext.fijar(new OrigenPeticion("usuario-41", "PC-01", "10.0.0.5"));

        boolean[] hayContexto = {true};
        Thread otro = new Thread(() -> hayContexto[0] = OrigenContext.actualSiHay().isPresent());
        otro.start();
        otro.join();

        assertThat(hayContexto[0]).isFalse();
    }

    @Test
    @DisplayName("el IP puede faltar; el usuario y el equipo, no")
    void elIpPuedeFaltar() {
        OrigenPeticion sinIp = new OrigenPeticion("usuario-41", "PC-01", null);
        assertThat(sinIp.ip()).isNull();

        assertThatThrownBy(() -> new OrigenPeticion(null, "PC-01", "10.0.0.5"))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new OrigenPeticion("usuario-41", null, "10.0.0.5"))
                .isInstanceOf(NullPointerException.class);
    }
}
