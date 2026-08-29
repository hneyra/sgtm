package pe.gob.sgtm.rentas.aplicacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.gob.sgtm.carga.LectorDeFilasCsv;
import pe.gob.sgtm.carga.LectorDeFilasCsv.FilaCsv;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.rentas.dominio.predial.Tramo;

/**
 * Que las llaves con las que el derivado publica el cuadro del predial son <b>exactamente</b> las
 * que {@link CuadroPredialParametrizado} lee (#395, misma leccion que #192).
 *
 * <h2>Que defecto cierra</h2>
 *
 * <p>Uno que no se ve. Un tramo publicado bajo una llave que nadie lee: el proceso de publicacion
 * lo informa como publicado, el conjunto se sella con el dentro, {@code verificar-publicacion.mjs}
 * pasa en verde —la cifra esta en la norma y las firmas son las del corpus— y la determinacion
 * sigue fallando con «no tiene el parametro», que es el sintoma de «no esta cargado» y no el de
 * «esta cargado con otro nombre». Basta con escribir {@code TRAMO_LIMITE_PREDIAL} en vez de {@code
 * TRAMO_PREDIAL_LIMITE}.
 *
 * <p>Aqui no se escribe ninguna cifra ni ninguna llave: las dos se <b>leen del archivo</b> que el
 * repositorio despliega, y lo que se comprueba es que el cuadro se pueda armar con ellas. La ida y
 * la vuelta contra PostgreSQL —publicar, componer, sellar y releer— la hace {@code
 * PublicarParametrosTest}; lo que falta aqui es el ultimo tramo, el del consumidor real.
 */
@DisplayName("El cuadro del predial, leido del derivado que se publica (#395)")
class CuadroDelDerivadoTest {

    /** El derivado que este repositorio versiona, tal como se despliega. */
    private static final Path DERIVADO =
            Path.of("../../docs/10-negocio/valores-normativos/publicacion/parametros-2026.csv")
                    .toAbsolutePath()
                    .normalize();

    private static final Ejercicio EJERCICIO = new Ejercicio(2026);

    @Test
    @DisplayName("el cuadro del articulo 13 se arma con las llaves que el derivado publica")
    void elCuadroSeArmaConLoPublicado() throws IOException {
        Map<String, String> publicados = numerosDelDerivado();

        CuadroPredialParametrizado.Vigente vigente =
                new CuadroPredialParametrizado(new DelDerivado(publicados)).vigenteEn(EJERCICIO);

        List<Tramo> tramos = vigente.tramos();

        assertThat(tramos)
                .as(
                        "el derivado publica %s tramos; si el cuadro no los encuentra, estan"
                                + " cargados con otro nombre y la determinacion falla igual",
                        contar(publicados, CuadroPredialParametrizado.TIPO_TRAMO))
                .hasSize(contar(publicados, CuadroPredialParametrizado.TIPO_TRAMO));
        assertThat(tramos.get(tramos.size() - 1).tieneTope())
                .as("el ultimo tramo del articulo 13 es «mas de 60 UIT», sin tope")
                .isFalse();
        for (int i = 0; i < tramos.size() - 1; i++) {
            assertThat(tramos.get(i).tieneTope())
                    .as("el tramo %s tiene tope, y sale de TRAMO_PREDIAL_LIMITE", i + 1)
                    .isTrue();
        }
    }

    @Test
    @DisplayName("la UIT y el minimo salen del derivado, y el minimo se convierte con esa UIT")
    void laUitYElMinimoSalenDelDerivado() throws IOException {
        Map<String, String> publicados = numerosDelDerivado();

        CuadroPredialParametrizado.Vigente vigente =
                new CuadroPredialParametrizado(new DelDerivado(publicados)).vigenteEn(EJERCICIO);

        Dinero uit = vigente.uit();
        assertThat(uit)
                .as("la UIT del cuadro es la que el derivado publica, no una escrita aqui")
                .isEqualTo(Dinero.de(publicados.get(CuadroPredialParametrizado.TIPO_UIT + "|")));
        assertThat(vigente.minimoImponible())
                .isEqualTo(
                        uit.por(
                                new BigDecimal(
                                                publicados.get(
                                                        CuadroPredialParametrizado.TIPO_MINIMO
                                                                + "|"))
                                        .movePointLeft(2)));
    }

    @Test
    @DisplayName("el derivado no publica el derecho de emision ni el cronograma: son D-02b")
    void loQueElDerivadoNoPublica() throws IOException {
        Map<String, String> publicados = numerosDelDerivado();

        // No es un olvido: el derecho de emision mecanizada y el dia concreto en que vence cada
        // cuota los fija la ordenanza de cada municipalidad, y el corpus solo transcribe norma
        // nacional. Que falten es la razon por la que la determinacion responde 422 nombrando la
        // llave en vez de emitir con una cifra inventada, y esta prueba lo deja escrito para que el
        // dia que se publiquen alguien venga aqui a borrarla.
        assertThat(publicados)
                .doesNotContainKey(CuadroPredialParametrizado.TIPO_DERECHO_EMISION + "|");
        assertThat(publicados.keySet())
                .noneMatch(
                        llave ->
                                llave.startsWith(
                                        CuadroPredialParametrizado.TIPO_VENCIMIENTO + "|"));
    }

    private static int contar(Map<String, String> publicados, String tipo) {
        return (int)
                publicados.keySet().stream().filter(llave -> llave.startsWith(tipo + "|")).count();
    }

    /**
     * Las filas numericas del derivado, leidas como las lee el proceso: por posicion, {@code
     * tipo|clave} y su {@code valor_numerico}. Solo las que rigen 2026.
     */
    private static Map<String, String> numerosDelDerivado() throws IOException {
        Map<String, String> publicados = new LinkedHashMap<>();
        try (Reader archivo = Files.newBufferedReader(DERIVADO, StandardCharsets.UTF_8)) {
            for (FilaCsv fila : LectorDeFilasCsv.leer(archivo)) {
                List<String> campos = fila.campos();
                String desde = campos.get(2);
                String hasta = campos.get(3);
                boolean rige2026 =
                        desde.compareTo("2026-12-31") <= 0
                                && (hasta.isEmpty() || hasta.compareTo("2026-01-01") >= 0);
                if (!rige2026 || campos.get(4).isEmpty()) {
                    continue;
                }
                publicados.put(campos.get(0) + "|" + campos.get(1), campos.get(4));
            }
        }
        assertThat(publicados)
                .as("si el derivado se queda sin filas numericas, esta prueba no prueba nada")
                .isNotEmpty();
        return publicados;
    }

    /** Un conjunto sellado compuesto con lo que el derivado publica, y nada mas. */
    private record DelDerivado(Map<String, String> publicados) implements LectorDeParametros {

        @Override
        public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
            ParametrosSellados.Constructor constructor = ParametrosSellados.de(ejercicio, 1);
            for (Map.Entry<String, String> fila : publicados.entrySet()) {
                String[] partes = fila.getKey().split("\\|", -1);
                constructor.numero(
                        partes[0],
                        partes[1].isEmpty() ? null : partes[1],
                        ValorNormativo.de(fila.getValue()));
            }
            return constructor.construir();
        }

        @Override
        public ParametrosSellados porConjunto(IdentificadorDeConjunto identificador) {
            return vigenteEn(EJERCICIO);
        }

        @Override
        public IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio) {
            return IdentificadorDeConjunto.de(1L);
        }
    }
}
