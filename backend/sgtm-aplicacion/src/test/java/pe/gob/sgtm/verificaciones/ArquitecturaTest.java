package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Aplica las reglas de ARQ-04 §2 al codigo de produccion. Bloqueante. */
@DisplayName("ARQ-04 §2 — Reglas de arquitectura")
class ArquitecturaTest {

    private static JavaClasses clases;

    @BeforeAll
    static void importar() {
        clases = ReglasDeArquitectura.clasesDeProduccion();
    }

    @Test
    @DisplayName("hay clases que revisar")
    void hayClasesQueRevisar() {
        // Si el importador no encuentra nada, todas las reglas de abajo pasan sin
        // haber revisado una sola clase. Ha pasado en otros proyectos y nadie lo nota
        // hasta que se busca por que ArchUnit nunca encontro nada.
        assertThat(clases)
                .as("el importador debe ver las clases de produccion de todos los modulos")
                .isNotEmpty();
        assertThat(clases.stream().map(c -> c.getPackageName()).distinct().toList())
                .contains("pe.gob.sgtm.compartido", "pe.gob.sgtm.plataforma.tenant");
    }

    @Test
    @DisplayName("mientras no haya dominio, las reglas acotadas a el pueden estar vacias")
    void mientrasNoHayaDominioLasReglasAcotadasAElPuedenEstarVacias() {
        boolean hayDominio = clases.stream().anyMatch(c -> c.getPackageName().contains(".dominio"));
        assertThat(hayDominio)
                .as(
                        "ya existe la primera clase de dominio: hay que poner SIN_DOMINIO_TODAVIA"
                                + " en false en ReglasDeArquitectura, para que esas reglas vuelvan a"
                                + " fallar si algun dia dejan de encontrar clases. Un recordatorio en un"
                                + " comentario no se lee; esta asercion si")
                .isFalse();
    }

    @Test
    @DisplayName("el codigo de produccion cumple todas las reglas")
    void elCodigoDeProduccionCumpleTodasLasReglas() {
        for (ArchRule regla : ReglasDeArquitectura.todas()) {
            regla.check(clases);
        }
    }
}
