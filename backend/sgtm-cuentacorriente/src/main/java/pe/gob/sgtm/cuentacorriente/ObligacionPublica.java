package pe.gob.sgtm.cuentacorriente;

import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que otro contexto necesita saber de una obligacion con deuda, via {@link
 * ConsultaDeDeudaPublica}.
 *
 * <p>No lleva el desglose de {@code DeudaActualizada} —insoluto, reajuste, interes, gasto—: quien
 * consulta desde fuera necesita saber cuanto debe una unidad, no auditar el libro. Traer las cuatro
 * partes obligaria a este modulo a exponer {@code DeudaActualizada}, que es de {@code .dominio}.
 *
 * @param tributo el tributo de la obligacion
 * @param ejercicio el ejercicio
 * @param predioId la unidad, si la obligacion es predial
 * @param vehiculoId la unidad, si la obligacion es vehicular
 * @param fecha la fecha de corte con la que se calculo {@link #total} (regla 9, RNF-075)
 * @param total la deuda total a esa fecha; nunca una cifra sin su fecha
 */
public record ObligacionPublica(
        String tributo,
        Ejercicio ejercicio,
        @Nullable Long predioId,
        @Nullable Long vehiculoId,
        LocalDate fecha,
        Dinero total) {

    public ObligacionPublica {
        Objects.requireNonNull(tributo, "La obligacion necesita su tributo");
        Objects.requireNonNull(ejercicio, "La obligacion necesita su ejercicio");
        Objects.requireNonNull(fecha, "Toda cifra de deuda indica su fecha de calculo (RNF-075)");
        Objects.requireNonNull(total, "La obligacion necesita su deuda total");
    }
}
