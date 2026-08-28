package pe.gob.sgtm.parametros.aplicacion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.dominio.Vigencia;
import pe.gob.sgtm.parametros.dominio.LlaveDeParametro;
import pe.gob.sgtm.parametros.dominio.ParametroTributario;

/**
 * Una fila del derivado publicable del corpus, ya analizada (#188, #247 §4).
 *
 * <p>Las <b>tres primeras columnas son, en el mismo orden, las que lee {@code
 * ImportarParametrosDelConjunto}</b>: {@code tipo,clave,vigenciaDesde}. No es una casualidad
 * comoda, es el punto: asi el mismo archivo publica el valor y compone el conjunto, y no existen
 * dos listas que puedan separarse el dia que alguien anada una fila a una y se olvide de la otra.
 * Las columnas de la cuarta en adelante las ignora el importador.
 *
 * <p>Las dos ultimas columnas son la <b>doble firma de ADR-0007, ya ocurrida en el corpus</b>: se
 * copian de la cabecera del archivo de {@code docs/10-negocio/valores-normativos/} y viajan a
 * {@code usuario_carga} y {@code usuario_aprueba}. Quien corre el proceso no firma; transporta lo
 * que se firmo al leer la norma. Que sean distintas lo exige la base ({@code
 * parametro_doble_verificacion_ck}, RNF-092) y lo comprueba antes, en cada PR, {@code
 * docs/10-negocio/verificar-publicacion.mjs}.
 *
 * <p><b>La comprobacion de que las dos firmas son distintas que hay aqui abajo no es la que
 * muerde</b>, y conviene decirlo: quitandola, las once pruebas de {@code PublicarParametrosTest}
 * siguen en verde —se probo—, porque la fila llega a la base y {@code
 * parametro_doble_verificacion_ck} la rechaza con {@code 23514}, y el proceso la informa igual. Lo
 * unico que aporta es que el informe diga cual fila y por que sin gastar un viaje a PostgreSQL. La
 * regla la sostiene la restriccion, como debe ser.
 */
record FilaPublicable(ParametroTributario parametro, String transcribio, String verifico) {

    static final int COLUMNAS = 10;

    LlaveDeParametro llave() {
        return new LlaveDeParametro(
                parametro.tipo(),
                parametro.clave(),
                java.util.Objects.requireNonNull(
                        parametro.vigencia().desde(),
                        "La fila valida siempre trae fecha de inicio de vigencia"));
    }

    /**
     * Analiza una fila del CSV.
     *
     * @throws IllegalArgumentException con un mensaje que se muestra tal cual en el informe
     */
    static FilaPublicable de(List<String> campos) {
        if (campos.size() < COLUMNAS) {
            throw new IllegalArgumentException(
                    "La fila trae "
                            + campos.size()
                            + " columna(s) y hacen falta "
                            + COLUMNAS
                            + ": tipo, clave, vigenciaDesde, vigenciaHasta, valorNumerico,"
                            + " valorTexto, documentoFuente, archivoDelCorpus, transcribio,"
                            + " verifico");
        }
        String tipo = campos.get(0);
        if (tipo.isBlank()) {
            throw new IllegalArgumentException("La fila necesita el tipo del parametro");
        }
        LocalDate desde = fecha(campos.get(2), "de inicio de vigencia");
        LocalDate hasta =
                campos.get(3).isBlank() ? null : fecha(campos.get(3), "de fin de vigencia");
        String transcribio = campos.get(8).strip();
        String verifico = campos.get(9).strip();
        if (transcribio.isBlank() || verifico.isBlank()) {
            throw new IllegalArgumentException(
                    "La fila no trae las dos firmas del corpus, y sin ellas no se publica: una"
                            + " cifra normativa la leen dos personas (ADR-0007)");
        }
        if (transcribio.equals(verifico)) {
            throw new IllegalArgumentException(
                    "Quien transcribio y quien verifico son la misma firma («"
                            + transcribio
                            + "»): releerse a uno mismo no es verificar (RNF-092)");
        }

        return new FilaPublicable(
                new ParametroTributario(
                        null,
                        tipo,
                        vacioComoNulo(campos.get(1)),
                        numero(campos.get(4)),
                        vacioComoNulo(campos.get(5)),
                        new Vigencia(desde, hasta),
                        campos.get(6)),
                transcribio,
                verifico);
    }

    private static @Nullable String vacioComoNulo(String campo) {
        return campo.isBlank() ? null : campo.strip();
    }

    private static @Nullable ValorNormativo numero(String campo) {
        if (campo.isBlank()) {
            return null;
        }
        try {
            // Desde texto y nunca desde double: la precision de un valor normativo es el punto
            // (regla 1). Y la cifra viene del CSV, no del codigo (regla 5).
            return new ValorNormativo(new BigDecimal(campo.strip()));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "El valor numerico no es un decimal: '" + campo + "'");
        }
    }

    private static LocalDate fecha(String campo, String cual) {
        try {
            return LocalDate.parse(campo.strip());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(
                    "La fecha " + cual + " no es una fecha aaaa-mm-dd: '" + campo + "'");
        }
    }
}
