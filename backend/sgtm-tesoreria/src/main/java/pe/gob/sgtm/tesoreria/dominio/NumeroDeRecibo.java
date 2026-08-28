package pe.gob.sgtm.tesoreria.dominio;

import java.util.Locale;
import java.util.Objects;

/**
 * El numero de un recibo: su serie y su correlativo dentro de la serie.
 *
 * <p>La serie es de la <b>caja</b> (V29), no del ejercicio ni del tipo. Esa eleccion es la que hace
 * que dos ventanillas cobrando a la vez no se pisen: cada una incrementa la fila de contador de su
 * propia serie, asi que la unica espera posible es entre dos peticiones de la <b>misma</b> caja, y
 * ahi la espera es correcta —hay un cajero y una cola—.
 *
 * <p>El formato impreso, {@code 001-0000123}, es el del manual. Se compone aqui y en ningun otro
 * sitio: dos formatos distintos en dos pantallas es la clase de defecto que nadie reporta como
 * defecto pero que hace imposible buscar un recibo por lo que dice el papel.
 *
 * @param serie la serie de la caja que lo emitio
 * @param numero el correlativo dentro de la serie, empezando en 1
 */
public record NumeroDeRecibo(String serie, long numero) {

    /** {@code recibo.serie varchar(5)} y {@code caja.serie varchar(5)} (V3, V29). */
    private static final int SERIE_MAXIMO = 5;

    /** Los ceros del correlativo impreso. */
    private static final String FORMATO = "%s-%07d";

    public NumeroDeRecibo {
        Objects.requireNonNull(serie, "Un recibo se numera dentro de una serie");
        serie = serie.strip().toUpperCase(Locale.ROOT);
        if (serie.isEmpty() || serie.length() > SERIE_MAXIMO) {
            throw new IllegalArgumentException(
                    "La serie va de 1 a " + SERIE_MAXIMO + " caracteres: '" + serie + "'");
        }
        if (numero <= 0) {
            throw new IllegalArgumentException(
                    "El correlativo de un recibo empieza en 1; llego " + numero);
        }
    }

    /** Como se imprime: {@code 001-0000123}. */
    public String impreso() {
        return String.format(Locale.ROOT, FORMATO, serie, numero);
    }

    @Override
    public String toString() {
        return impreso();
    }
}
