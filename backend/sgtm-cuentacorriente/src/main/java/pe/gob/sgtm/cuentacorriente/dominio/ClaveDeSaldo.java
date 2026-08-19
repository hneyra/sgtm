package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que identifica un saldo: por que combinacion se agrupan los asientos del libro.
 *
 * <p>Es la misma que agrupa un estado de cuenta —contribuyente, tributo, ejercicio, periodo, fase
 * y, cuando la deuda cuelga de uno, el predio o el vehiculo—. No es una eleccion de cache: es la
 * granularidad a la que se cobra, y por eso {@code V16} la fija como restriccion unica.
 *
 * <p><b>Se deriva del asiento, no se declara aparte.</b> {@link #de(Asiento)} es el unico
 * constructor que usa el mantenimiento, para que agrupar y proyectar no puedan divergir: si un
 * asiento se agrupa por una clave y su saldo se guarda con otra, el estado de cuenta muestra dos
 * lineas donde hay una.
 *
 * @param periodo 0 es «anual»; el asiento lo admite nulo y aqui se normaliza, porque la columna del
 *     saldo es {@code NOT NULL DEFAULT 0} y dos representaciones del mismo periodo partirian la
 *     fila
 */
public record ClaveDeSaldo(
        long contribuyenteId,
        String tributo,
        Ejercicio ejercicio,
        int periodo,
        Fase fase,
        @Nullable Long predioId,
        @Nullable Long vehiculoId) {

    /** El periodo con que se guarda la deuda anual. */
    public static final int ANUAL = 0;

    public ClaveDeSaldo {
        Objects.requireNonNull(tributo, "El saldo necesita su tributo");
        Objects.requireNonNull(ejercicio, "El saldo necesita su ejercicio");
        Objects.requireNonNull(fase, "El saldo necesita su fase");
        tributo = tributo.strip();
        if (tributo.isEmpty()) {
            throw new IllegalArgumentException("El tributo del saldo no puede estar en blanco");
        }
        if (periodo < 0) {
            throw new IllegalArgumentException("El periodo se cuenta desde 0: " + periodo);
        }
    }

    /** La clave a la que pertenece un asiento. */
    public static ClaveDeSaldo de(Asiento asiento) {
        Objects.requireNonNull(asiento, "Sin asiento no hay clave que derivar");
        return new ClaveDeSaldo(
                asiento.contribuyenteId(),
                asiento.tributo(),
                asiento.ejercicio(),
                asiento.periodo() == null ? ANUAL : asiento.periodo(),
                asiento.fase(),
                asiento.predioId(),
                asiento.vehiculoId());
    }

    @Override
    public String toString() {
        return tributo
                + "/"
                + ejercicio.valor()
                + "/"
                + periodo
                + "/"
                + fase
                + " del contribuyente "
                + contribuyenteId;
    }
}
