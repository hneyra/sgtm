package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.Locale;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que pide {@code consulta_altas_bajas} (RF-045): los movimientos de alta y baja de deuda de un
 * contribuyente.
 *
 * <p><b>Un alta o una baja es un acto, no cualquier movimiento del libro</b> (#640). Los dos que
 * hay son los de RF-043 —la «nota de abono»— y RF-044 —la «nota de cargo»—, y los produce {@link
 * MovimientoDeDeuda#enAsientos}, que estampa su {@link ActoDelLibro} en cada asiento. Lo demas que
 * escribe en el libro no entra en esta relacion, y no basta con dejar fuera el concepto {@code
 * PAGO}: el abono de una <b>cobranza</b> es un {@code ABONO} de concepto {@code INSOLUTO},
 * exactamente el mismo asiento que el de una baja, y el cargo con que esa cobranza cristaliza el
 * interes devengado es igual que el de un alta. Un cobro tiene su propia consulta (RF-048) y la
 * emision no se audita aqui.
 *
 * <p>Consecuencia que conviene tener escrita: los asientos <b>anteriores a V68</b> nacieron sin
 * acto y no se pueden reparar, asi que una baja de antes de esa migracion no sale. Ver {@code
 * AsientoRepositoryJdbc#altasYBajas} para por que no se acota por fecha en su lugar.
 *
 * @param codigoContribuyente el titular; es lo que teclea quien atiende
 * @param ejercicio filtro opcional de año
 * @param tributo filtro opcional de tributo
 * @param sentido filtro opcional de «Alta / Baja»; {@code null} trae los dos
 */
public record CriterioDeAltasBajas(
        String codigoContribuyente,
        @Nullable Ejercicio ejercicio,
        @Nullable String tributo,
        @Nullable SentidoDelMovimiento sentido) {

    public CriterioDeAltasBajas {
        Objects.requireNonNull(codigoContribuyente, "Las altas y bajas son de un contribuyente");
        codigoContribuyente = codigoContribuyente.strip().toUpperCase(Locale.ROOT);
        if (codigoContribuyente.isEmpty()) {
            throw new IllegalArgumentException("El codigo de contribuyente no puede estar vacio");
        }
        if (tributo != null) {
            tributo = tributo.strip().toUpperCase(Locale.ROOT);
            if (tributo.isEmpty()) {
                tributo = null;
            }
        }
    }
}
