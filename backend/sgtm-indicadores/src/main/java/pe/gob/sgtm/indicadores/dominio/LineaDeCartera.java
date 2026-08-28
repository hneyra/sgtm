package pe.gob.sgtm.indicadores.dominio;

import java.time.LocalDate;
import java.util.Objects;
import java.util.OptionalInt;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;

/**
 * Una fila de un panel: un tributo, un mes (#56, RF-130).
 *
 * <p>{@link #avance} es {@link OptionalInt} y no un {@code int}, y esa es la decision que esta
 * clase sostiene: <b>vacio no es cero</b>. Un tributo sin cargos asentados en el ejercicio no tiene
 * un 0 % de avance —eso se lee como «no se ha cobrado nada», que es un juicio sobre la gestion—,
 * tiene un hueco, y el {@link #detalle} dice por que. Ver {@link AvanceDeCobranza}.
 *
 * <p>La cifra viaja tambien sin redactar en {@link #importe}, por lo mismo que en {@link
 * Indicador}: el texto es para dibujar, el importe para sumar.
 *
 * @param concepto el tributo o el mes
 * @param detalle la linea pequeña: contra que se mide esta fila
 * @param cifra el texto que se dibuja
 * @param importe la misma cifra sin redactar
 * @param avance de 0 a 100; vacio cuando no hay base contra la que medir
 * @param actualizadoA a que fecha esta la cifra de esta fila
 */
public record LineaDeCartera(
        String concepto,
        String detalle,
        String cifra,
        @Nullable Dinero importe,
        OptionalInt avance,
        LocalDate actualizadoA) {

    public LineaDeCartera {
        Objects.requireNonNull(concepto, "La fila dice de que es");
        Objects.requireNonNull(detalle, "El detalle es vacio, no nulo");
        Objects.requireNonNull(cifra, "La fila trae su cifra");
        Objects.requireNonNull(avance, "El avance es vacio, no nulo: vacio no es cero");
        Objects.requireNonNull(
                actualizadoA, "Toda cifra indica a que fecha esta actualizada (RNF-075, regla 9)");
    }
}
