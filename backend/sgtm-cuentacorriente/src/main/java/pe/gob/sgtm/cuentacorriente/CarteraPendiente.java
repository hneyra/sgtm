package pe.gob.sgtm.cuentacorriente;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que sigue pendiente de cobro en un ejercicio, con su fecha (#56, RF-130).
 *
 * <p>Es la respuesta de {@link CarteraDelLibro#pendientePorTributo}, y sale de la <b>proyeccion del
 * saldo</b> (#23), no de recorrer el libro: ver {@link PendienteDeUnTributo}.
 *
 * <p>Lleva <b>dos</b> fechas y las dos hacen falta. {@link #aLaFecha} es cuando se pregunto; {@link
 * #proyectadaDesde} es cuando se proyecto la fila mas vieja de todas, que es lo unico honesto que
 * se puede decir de la frescura de un cache. Publicar solo la primera dejaria pasar por «de hoy»
 * una cartera cuya proyeccion lleva parada desde el mes pasado —y eso no se nota mirando la cifra—.
 *
 * @param lineas una por tributo con saldo proyectado en el ejercicio
 * @param ejercicio el ejercicio que se sumo
 * @param aLaFecha la fecha a la que se pregunto (regla 9, RNF-075)
 */
public record CarteraPendiente(
        List<PendienteDeUnTributo> lineas, Ejercicio ejercicio, LocalDate aLaFecha) {

    public CarteraPendiente {
        Objects.requireNonNull(lineas, "La lista es vacia, no nula");
        Objects.requireNonNull(ejercicio, "La cartera siempre es de un ejercicio");
        Objects.requireNonNull(aLaFecha, "Toda cifra indica su fecha (RNF-075, regla 9)");
        lineas = List.copyOf(lineas);
    }

    /** La suma de todas las lineas: el insoluto pendiente del ejercicio, al centimo. */
    public Dinero total() {
        Dinero total = Dinero.CERO;
        for (PendienteDeUnTributo linea : lineas) {
            total = total.mas(linea.pendiente());
        }
        return total;
    }

    /** Cuantas obligaciones componen la cartera. */
    public long obligaciones() {
        long cuantas = 0;
        for (PendienteDeUnTributo linea : lineas) {
            cuantas += linea.obligaciones();
        }
        return cuantas;
    }

    /**
     * Cuando se proyecto la fila mas antigua de la cartera entera.
     *
     * <p>Vacio si no hay ninguna linea: una cartera sin filas no tiene fecha de proyeccion, y
     * devolver «ahora» seria decir que esta al dia lo que no existe.
     */
    public Optional<Instant> proyectadaDesde() {
        Instant masAntigua = null;
        for (PendienteDeUnTributo linea : lineas) {
            if (masAntigua == null || linea.proyectadoDesde().isBefore(masAntigua)) {
                masAntigua = linea.proyectadoDesde();
            }
        }
        return Optional.ofNullable(masAntigua);
    }
}
