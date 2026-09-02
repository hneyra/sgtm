package pe.gob.sgtm.verificaciones;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.verificaciones.RevisorDeCodigoFuente.Hallazgo;

/**
 * #691 — Todo 422 de «falta publicar una cifra normativa» lleva su discriminador.
 *
 * <p>#604 puso el miembro {@code parametroQueFalta} en el cuerpo del problema y lo cableo en las
 * tres capturas de {@code ConvenioController}. Las otras veintidos de los demas modulos seguian
 * contestando un 422 con {@code codigo} y {@code mensaje} y nada mas. <b>Dentro de tesoreria la
 * ausencia del miembro significa «es un campo de la peticion»</b>, y eso es cierto porque sus rutas
 * siempre lo llevan; aplicada fuera, esa regla manda a quien atiende a buscar en el formulario un
 * dato que no esta mal, cuando lo que falta es sellar un conjunto de parametros.
 *
 * <p>Arreglar los veintidos sitios no cierra el defecto: lo cierra que el veintitres no pueda nacer
 * mudo. El sintoma de «este 422 no lleva el miembro» es exactamente el mismo que el de «este 422 es
 * de un campo», asi que sin guarda el hueco se vuelve a abrir con el modulo siguiente que se
 * conecte —y eso es literalmente lo que paso entre #604 y este issue—.
 */
@DisplayName("#691 — El discriminador de lo que falta publicar, en los ocho modulos")
class DiscriminadorDeLoQueFaltaPublicarTest {

    @Test
    @DisplayName("ningun catch del backend traduce «falta publicar» a un 422 sin el discriminador")
    void ningunCatchTraduceSinElDiscriminador() throws IOException {
        Map<String, String> fuentes = fuentesDeProduccion();

        assertThat(fuentes)
                .as("si el recorrido no encuentra fuentes, la prueba pasa sin revisar nada")
                .hasSizeGreaterThan(200);

        Set<String> familia = RevisorDelDiscriminador.familiaSegunLasFuentes(fuentes);

        List<Hallazgo> hallazgos = new ArrayList<>();
        fuentes.forEach(
                (nombre, contenido) ->
                        hallazgos.addAll(
                                RevisorDelDiscriminador.revisar(nombre, contenido, familia)));

        assertThat(hallazgos).isEmpty();
    }

    @Test
    @DisplayName("la familia se computa del codigo fuente, no de una lista escrita a mano")
    void laFamiliaSaleDelCodigoFuente() throws IOException {
        Set<String> familia = RevisorDelDiscriminador.familiaSegunLasFuentes(fuentesDeProduccion());

        assertThat(familia)
                .as(
                        "toda excepcion que declare ParametroSinPublicar entra sola; anadir una no"
                                + " obliga a tocar la guarda")
                .contains(
                        "EjercicioSinSellar",
                        "ParametroAusente",
                        "CondicionSinParametrizar",
                        "SinPuntosObservados",
                        "PuntoSinObservar",
                        "MediaPolitica",
                        "EscalaNoEntera",
                        "ModoDesconocido",
                        "PlazoSinParametrizar",
                        "ArancelSinParametrizar",
                        "TasaSinParametrizar",
                        "DerechoSinParametrizar",
                        "ParametroDelPredialAusente",
                        "CampaniaSinParametrizar",
                        "CampaniaIncompleta",
                        "BaseDesconocida",
                        "CondicionesSinPublicar");
        assertThat(familia)
                .as(
                        "y la del dominio puro, que no puede declararla: vive bajo la interfaz en el"
                                + " grafo de modulos y no sabe de que ejercicio son sus politicas")
                .contains(RevisorDelDiscriminador.LA_DEL_DOMINIO_PURO);
        assertThat(familia)
                .as("una excepcion cualquiera no entra por parecerse en el nombre")
                .doesNotContain("IllegalArgumentException", "SinValorReferencial", "SinDireccion");
    }

    @Test
    @DisplayName("el escaner detecta la muestra que traduce a 422 sin el miembro")
    void elEscanerDetectaLaMuestra() throws IOException {
        // La muestra no vive en un literal de esta prueba sino en un archivo propio, y se lee del
        // disco: asi se verifica el escaner sobre un archivo de verdad, con su javadoc mencionando
        // el ayudante. Si el escaner contara los comentarios, los dos metodos en regla contarian
        // como violaciones y los tres malos se colarian por su comentario.
        Path muestra =
                raizDelBackend()
                        .resolve("sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones")
                        .resolve("muestras/web/MuestraDeControladorSinDiscriminador.java");

        assertThat(muestra).as("la muestra tiene que existir para poder detectarla").exists();

        List<Hallazgo> hallazgos =
                RevisorDelDiscriminador.revisar(
                        muestra.getFileName().toString(),
                        Files.readString(muestra, StandardCharsets.UTF_8),
                        RevisorDelDiscriminador.familiaSegunLasFuentes(fuentesDeProduccion()));

        assertThat(hallazgos)
                .as("los tres que traducen sin el miembro; los dos en regla no")
                .hasSize(3);
        assertThat(hallazgos.stream().map(Hallazgo::fragmento).toList())
                .as("y el hallazgo nombra la clase y el metodo, no «el catch de la linea 40»")
                .containsExactlyInAnyOrder(
                        "MuestraDeControladorSinDiscriminador.sinConjuntoSellado captura"
                                + " EjercicioSinSellar",
                        "MuestraDeControladorSinDiscriminador.sinLaFila captura ParametroAusente",
                        "MuestraDeControladorSinDiscriminador.sinElPuntoDeRedondeo captura"
                                + " PuntoSinPolitica");
    }

    @Test
    @DisplayName("un comentario que mencione el ayudante no deja pasar un catch mudo")
    void elComentarioNoCuenta() {
        String fuente =
                """
                class Ejemplo {
                    void malo() {
                        try {
                            leer();
                        } catch (LectorDeParametros.EjercicioSinSellar sinSellar) {
                            // Aqui habria que usar FaltaPublicar.problema(sinSellar).
                            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "falta");
                        }
                    }
                }
                """;
        assertThat(
                        RevisorDelDiscriminador.revisar(
                                "Ejemplo.java", fuente, Set.of("EjercicioSinSellar")))
                .as("el compilador no lee comentarios, y la guarda tampoco")
                .hasSize(1);
    }

    @Test
    @DisplayName("un catch de la familia que no contesta 422 se deja pasar")
    void loQueNoEsUn422NoEsAsuntoDeEstaGuarda() {
        String fuente =
                """
                class Ejemplo {
                    Fila contar() {
                        try {
                            return leer();
                        } catch (LectorDeParametros.EjercicioSinSellar sinSellar) {
                            return Fila.sinDerecho(sinSellar.getMessage());
                        }
                    }

                    Cuadro cuadro() {
                        try {
                            return leerCuadro();
                        } catch (LectorDeParametros.EjercicioSinSellar sinSellar) {
                            throw new ProblemaDeNegocio(
                                    CodigoDeError.NO_ENCONTRADO, sinSellar.getMessage());
                        }
                    }
                }
                """;
        assertThat(
                        RevisorDelDiscriminador.revisar(
                                "Ejemplo.java", fuente, Set.of("EjercicioSinSellar")))
                .as(
                        "el criterio es el del issue, literal: todo catch que traduce estas"
                                + " excepciones A UN 422. Contar lo que si se puede contar, o"
                                + " contestar 404 al pedir un cuadro publicado, no lo es")
                .isEmpty();
    }

    @Test
    @DisplayName("un catch que no nombra ninguna de la familia no le importa a la guarda")
    void loQueNoEsDeLaFamiliaNoCuenta() {
        String fuente =
                """
                class Ejemplo {
                    void otro() {
                        try {
                            hacer();
                        } catch (IllegalArgumentException invalido) {
                            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, "mal");
                        }
                    }
                }
                """;
        assertThat(
                        RevisorDelDiscriminador.revisar(
                                "Ejemplo.java", fuente, Set.of("EjercicioSinSellar")))
                .as("un campo que falta sigue siendo un 422 sin miembro, y eso es lo correcto")
                .isEmpty();
    }

    // ------------------------------------------------------------------

    private static Map<String, String> fuentesDeProduccion() throws IOException {
        Path raiz = raizDelBackend();
        Map<String, String> fuentes = new LinkedHashMap<>();
        try (Stream<Path> rutas = Files.walk(raiz)) {
            for (Path ruta : rutas.filter(Files::isRegularFile).toList()) {
                String texto = ruta.toString().replace('\\', '/');
                if (!texto.contains("/src/main/")
                        || texto.contains("/build/")
                        || !texto.endsWith(".java")) {
                    continue;
                }
                fuentes.put(
                        raiz.relativize(ruta).toString(),
                        Files.readString(ruta, StandardCharsets.UTF_8));
            }
        }
        return fuentes;
    }

    /** El directorio de trabajo de la prueba es el del modulo; el backend esta encima. */
    private static Path raizDelBackend() {
        Path actual = Path.of("").toAbsolutePath();
        while (actual != null) {
            if (Files.exists(actual.resolve("settings.gradle.kts"))) {
                return actual;
            }
            actual = actual.getParent();
        }
        throw new IllegalStateException("No se encontro la raiz del build del backend");
    }
}
