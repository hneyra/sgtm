package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.Locale;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que pide {@code consulta_altas_bajas} (RF-045): los movimientos de alta y baja de deuda de un
 * contribuyente.
 *
 * <p>Un movimiento de deuda es un asiento de uno de los <b>cuatro conceptos del desglose</b>
 * —insoluto, reajuste, interes, gasto—, que son los que {@link MovimientoDeDeuda#enAsientos}
 * produce. Un {@code PAGO} no es un alta ni una baja: es un cobro, y tiene su propia consulta
 * (RF-048).
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
