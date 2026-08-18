package pe.gob.sgtm.seguridad.dominio;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * Desde cuando y hasta cuando vale una autorizacion (RF-123).
 *
 * <p>Los dos extremos admiten nulo, y significan cosas distintas: sin {@code desde}, vale desde
 * siempre; sin {@code hasta}, vale indefinidamente. Es lo que permite el caso corriente —un
 * empleado de planta, sin fechas— y el que motiva la funcionalidad: el personal por contrato, cuya
 * autorizacion tiene que caducar sola el dia que termina el contrato, sin depender de que alguien
 * se acuerde de retirarla.
 *
 * <p>La fecha de comparacion entra como argumento: ninguna clase de dominio lee el reloj (regla 6).
 */
public record Vigencia(@Nullable LocalDate desde, @Nullable LocalDate hasta) {

    /** La que no caduca. */
    public static final Vigencia SIEMPRE = new Vigencia(null, null);

    public Vigencia {
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new IllegalArgumentException(
                    "La vigencia termina antes de empezar: " + desde + " a " + hasta);
        }
    }

    public boolean vigenteEn(LocalDate fecha) {
        return (desde == null || !fecha.isBefore(desde))
                && (hasta == null || !fecha.isAfter(hasta));
    }
}
