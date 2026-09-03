package pe.gob.sgtm.dominio;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * El classpath de la capa `dominio` no lleva el servidor web (regla 7, #744).
 *
 * <p>Nace de un defecto real y silencioso. #744 tuvo que topar la version de Tomcat por encima de
 * la del BOM, y la primera version de esa correccion se escribio asi:
 *
 * <pre>{@code
 * dependencies { constraints { "implementation"(tomcat) { ... } } }
 * }</pre>
 *
 * <p>Dentro de {@code constraints {}} el receptor de fuera —el {@code DependencyHandler}— sigue en
 * alcance, asi que Kotlin resolvio ahi el {@code String.invoke(...)} y eso <b>no declaro una
 * restriccion: anadio una dependencia</b>. Medido comparando contra el arbol sin el cambio, este
 * modulo y {@code sgtm-esquema} pasaban de «no lo trae» a cargar Tomcat entero.
 *
 * <p><b>Y ArchUnit no puede verlo</b>: sus reglas miran los {@code import} del codigo, y aqui nadie
 * importaba nada nuevo — el defecto vive en el grafo de dependencias, no en las fuentes. La regla
 * de arquitectura pasaba en verde con el servidor web dentro. Por eso esta prueba no lee codigo: le
 * pregunta al cargador de clases, que es el unico que sabe lo que hay de verdad en el classpath.
 */
@DisplayName("#744 — la capa dominio no arrastra el servidor web")
class ElDominioNoCargaElServidorTest {

    /** Una clase que solo existe si `tomcat-embed-core` esta en el classpath. */
    private static final String DEL_SERVIDOR = "org.apache.catalina.util.ServerInfo";

    @Test
    @DisplayName("Tomcat no esta en el classpath de este modulo")
    void tomcatNoEstaEnElClasspath() {
        assertThatThrownBy(() -> Class.forName(DEL_SERVIDOR))
                .as(
                        """
                        «%s» se puede cargar desde la capa dominio, o sea que el servidor web \
                        acabo en su classpath.

                        Casi seguro viene de haber escrito la restriccion de Tomcat como
                        `constraints { "implementation"(...) }` en un plugin precompilado: eso
                        anade una dependencia en vez de declarar una restriccion (#744). La forma
                        que si funciona es `dependencies.constraints.add("implementation", ...)`.

                        ArchUnit no lo dice: mira los imports, no el classpath.
                        """
                                .formatted(DEL_SERVIDOR))
                .isInstanceOf(ClassNotFoundException.class);
    }
}
