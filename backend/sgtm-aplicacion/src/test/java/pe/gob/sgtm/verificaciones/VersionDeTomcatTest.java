package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import org.apache.catalina.util.ServerInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * El Tomcat que se empaqueta no arrastra los tres CVE CRITICAL de #744.
 *
 * <p>El 2026-09-03 la base de Trivy publico tres CVE CRITICAL contra {@code tomcat-embed-core
 * 11.0.22}, que es lo que fija el BOM de Spring Boot 4.1.0: CVE-2026-65182 (bypass de restriccion
 * de seguridad), CVE-2026-65905 (bypass de autenticacion en el autenticador DIGEST) y
 * CVE-2026-68525 (bypass de la autenticacion FORM). Dos de los tres son <b>bypass de
 * autenticacion</b> sobre un sistema cuya barrera principal es el token y el aislamiento por
 * municipalidad. Bloquearon todo PR abierto y, peor, el backend desplegado los tenia.
 *
 * <p><b>Se le pregunta a Tomcat, no al archivo de build.</b> Leer {@code libs.versions.toml} y
 * comprobar que dice «11.0.25» solo demostraria que el numero esta escrito; lo que importa es que
 * la restriccion GANE la resolucion de Gradle, y eso solo lo dice la clase que acaba en el
 * classpath. Es la misma diferencia que #435 midio entre «el secreto existe» y «la credencial
 * sirve».
 */
@DisplayName("#744 — el Tomcat empaquetado no arrastra los CVE CRITICAL")
class VersionDeTomcatTest {

    /**
     * La primera version donde los tres CVE estan arreglados.
     *
     * <p>Es el numero del que depende todo lo demas, asi que va con nombre y no dentro de una
     * asercion.
     */
    private static final String MINIMO = "11.0.25";

    /**
     * Donde podria aparecer un archivo que silencie a Trivy.
     *
     * <p>Los tres se declaran ademas como entrada de la tarea `test` en el build: sin eso, CREAR
     * uno no invalida la tarea, Gradle la da por UP-TO-DATE y la guarda pasa en <b>verde rancio</b>
     * — medido, la mutacion que anadia un `.trivyignore` con los tres CVE dentro dio BUILD
     * SUCCESSFUL en un segundo sin correr una sola prueba. Es #192 punto 2 otra vez.
     */
    static final List<String> CANDIDATOS_A_TRIVYIGNORE =
            List.of(".trivyignore", ".trivyignore.yaml", "backend/.trivyignore");

    @Test
    @DisplayName("es 11.0.25 o posterior, preguntado al propio Tomcat del classpath")
    void esAlMenosElMinimo() {
        String empaquetado = ServerInfo.getServerNumber();

        assertThat(comparar(empaquetado, MINIMO))
                .as(
                        """
                        El Tomcat del classpath es %s y hace falta %s o posterior (#744).

                        Tres CVE CRITICAL en 11.0.22, dos de ellos bypass de autenticacion:
                        CVE-2026-65182, CVE-2026-65905 y CVE-2026-68525.

                        Si esto sale rojo, la restriccion de `sgtm-aplicacion/build.gradle.kts`
                        dejo de ganar la resolucion. NO se arregla bajando el umbral de Trivy ni
                        con un .trivyignore: eso cerraria el rojo sin cerrar el agujero.
                        """
                                .formatted(empaquetado, MINIMO))
                .isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("y la comparacion es por numero, no por texto")
    void comparaPorNumeroYNoPorTexto() {
        // Sin esto, «11.0.9» pareceria mayor que «11.0.25» y la guarda diria que si a una version
        // vulnerable. El bug clasico de comparar versiones como cadenas.
        assertThat(comparar("11.0.9", "11.0.25")).isNegative();
        assertThat(comparar("11.0.25", "11.0.25")).isZero();
        assertThat(comparar("11.0.25.0", "11.0.25")).isZero();
        assertThat(comparar("11.0.26", "11.0.25")).isPositive();
        assertThat(comparar("12.0.0", "11.0.25")).isPositive();
    }

    /** Compara dos versiones componente a componente. Cero es «iguales»; lo que falta vale 0. */
    private static int comparar(String una, String otra) {
        String[] a = una.split("\\.");
        String[] b = otra.split("\\.");
        for (int i = 0; i < Math.max(a.length, b.length); i++) {
            int comparacion = Integer.compare(componente(a, i), componente(b, i));
            if (comparacion != 0) {
                return comparacion;
            }
        }
        return 0;
    }

    private static int componente(String[] partes, int indice) {
        if (indice >= partes.length) {
            return 0;
        }
        try {
            return Integer.parseInt(partes[indice]);
        } catch (NumberFormatException noEsUnNumero) {
            return 0;
        }
    }

    /**
     * El contraste del AC 4: el escaneo tiene que poder seguir fallando.
     *
     * <p>La salida comoda ante un CVE es bajar el umbral o escribir un {@code .trivyignore}. Las
     * dos cierran el rojo sin cerrar el agujero, y ademas dejan al escaner <b>sin poder volver a
     * avisar</b> — que es peor que el CVE, porque el siguiente pasa en verde. Una guarda que no
     * puede fallar no protege nada; esta lo mide sobre el flujo de verdad.
     *
     * <p><b>Y la primera version de esta guarda no podia fallar</b>, medido: comprobaba {@code
     * contains("exit-code: '1'")} sobre el archivo entero, y el flujo tiene <b>dos</b> pasos
     * bloqueantes —uno por imagen, backend e interfaz—, asi que debilitar uno dejaba la cadena del
     * otro y la prueba pasaba en VERDE. Es el mismo hueco que #426 destapo en {@code leerPatron} y
     * que #558 volvio a encontrar: buscar una cadena que tambien vive en otro sitio. Ahora se corta
     * el flujo en pasos y se mira <b>cada</b> paso bloqueante.
     */
    @Nested
    @DisplayName("el escaneo puede seguir fallando")
    class ElEscaneoSigueBloqueando {

        private static final Path FLUJO = Path.of(".github/workflows/escaneo-de-imagenes.yml");

        /** Un paso por imagen: `sgtm-aplicacion` y `sgtm-interfaz`. */
        private static final int PASOS_BLOQUEANTES = 2;

        /**
         * El nombre exacto del paso que bloquea.
         *
         * <p>Exacto y no «contiene bloqueante»: el paso de resumen se llama «no <b>bloqueante</b>»,
         * asi que filtrar por la palabra suelta cazaba cuatro pasos donde hay dos — lo destapo esta
         * misma prueba al contar. Si alguien lo renombra, el recuento cambia y esto lo dice, que es
         * lo que se quiere: un paso bloqueante no se pierde en silencio.
         */
        private static final String NOMBRE = "name: Trivy — bloqueante (solo CRITICAL)";

        @Test
        @DisplayName("cada paso bloqueante sigue en CRITICAL y sigue saliendo con codigo 1")
        void cadaPasoBloqueanteSigueBloqueando() throws IOException {
            List<String> bloqueantes = pasosBloqueantes();

            assertThat(bloqueantes)
                    .as("una imagen sin paso bloqueante deja pasar un CVE CRITICAL (#744 AC 4)")
                    .hasSize(PASOS_BLOQUEANTES);
            assertThat(bloqueantes)
                    .allSatisfy(
                            paso ->
                                    assertThat(paso)
                                            .as("este paso dejo de bloquear:%n%s", paso)
                                            .contains("severity: CRITICAL")
                                            .contains("exit-code: '1'"));
        }

        @Test
        @DisplayName("y no hay ningun .trivyignore que silencie un CVE")
        void sinTrivyignore() {
            Path raiz = RaizDelRepositorio.ruta();

            for (String candidato : CANDIDATOS_A_TRIVYIGNORE) {
                assertThat(raiz.resolve(candidato))
                        .as("un .trivyignore cierra el rojo sin cerrar el agujero (#744 AC 4)")
                        .doesNotExist();
            }
        }

        /** Los pasos del flujo cuyo nombre dice que bloquean, cada uno con su cuerpo. */
        private List<String> pasosBloqueantes() throws IOException {
            String flujo = Files.readString(RaizDelRepositorio.ruta().resolve(FLUJO));
            // Se corta por `- name:` para que cada paso se mire entero y por separado: mirar el
            // archivo completo es lo que dejaba pasar la mutacion.
            return Arrays.stream(flujo.split("(?=\\n\\s*- name:)"))
                    .filter(paso -> paso.contains(NOMBRE))
                    .toList();
        }
    }
}
