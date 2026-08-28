package pe.gob.sgtm.cuentacorriente;

import java.time.Instant;
import java.util.Objects;
import pe.gob.sgtm.dominio.Dinero;

/**
 * Una linea de la cartera: cuanto sigue pendiente de un tributo en un ejercicio (#56).
 *
 * <p><b>Es insoluto, no deuda.</b> La proyeccion del saldo (#23) solo netea el concepto {@code
 * INSOLUTO}; el reajuste y el interes dependen de la fecha en que se pregunte y no se precalculan.
 * Quien dibuje esta cifra tiene que decir que es el principal pendiente, porque llamarla «deuda»
 * prometeria lo que solo da {@code deudaActualizadaA} —y darlo para el padron entero significaria
 * calcular interes obligacion por obligacion en cada peticion—.
 *
 * <p>Cada linea trae su propio {@link #proyectadoDesde} en vez de heredar una fecha comun: la
 * proyeccion de un tributo puede estar al dia y la de otro llevar una semana parada, y una sola
 * fecha para las dos mentiria sobre la mas vieja.
 *
 * @param tributo el tributo de las obligaciones
 * @param pendiente la suma de los saldos de insoluto
 * @param obligaciones cuantas obligaciones la componen
 * @param proyectadoDesde cuando se proyecto la mas antigua de ellas (regla 9, RNF-075)
 */
public record PendienteDeUnTributo(
        String tributo, Dinero pendiente, long obligaciones, Instant proyectadoDesde) {

    public PendienteDeUnTributo {
        Objects.requireNonNull(tributo, "La linea necesita su tributo");
        Objects.requireNonNull(pendiente, "La linea necesita su importe");
        Objects.requireNonNull(
                proyectadoDesde, "La cartera dice a que fecha esta proyectada (RNF-075, regla 9)");
        if (obligaciones < 0) {
            throw new IllegalArgumentException("El numero de obligaciones no puede ser negativo");
        }
    }
}
