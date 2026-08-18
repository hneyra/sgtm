package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.lang.ArchRule;
import java.util.List;
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
    @DisplayName("las reglas acotadas al dominio encuentran clases de verdad")
    void lasReglasAcotadasAlDominioEncuentranClasesDeVerdad() {
        // Hasta el issue #4 esto no se podia exigir: los contextos estaban vacios y
        // las reglas de `..dominio..` llevaban `allowEmptyShould`, que es lo mismo que
        // no tener regla. Ahora existe el dominio compartido, el permiso se retiro, y
        // esta asercion es la que impide que vuelva a colarse: si algun dia el
        // importador deja de ver el dominio, falla aqui y no en silencio.
        List<JavaClass> delDominio =
                clases.stream().filter(c -> c.getPackageName().contains(".dominio")).toList();

        assertThat(delDominio)
                .as("las reglas acotadas a ..dominio.. tienen que tener algo que revisar")
                .isNotEmpty();
        assertThat(delDominio.stream().map(JavaClass::getPackageName).distinct().toList())
                .contains("pe.gob.sgtm.dominio");
    }

    @Test
    @DisplayName("el codigo de produccion cumple todas las reglas")
    void elCodigoDeProduccionCumpleTodasLasReglas() {
        for (ArchRule regla : ReglasDeArquitectura.todas()) {
            regla.check(clases);
        }
    }
}
