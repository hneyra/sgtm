package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.cuentacorriente.dominio.ObligacionConDeuda;

/**
 * Una fila de {@code consulta_deuda}, tal como sale por HTTP. Campos en español {@code camelCase}
 * (ARQ-04 §3).
 *
 * <p>Las cinco cifras de {@code deuda} viajan como {@link DeudaResource} —{@link
 * pe.gob.sgtm.web.ImporteActualizado} por dentro—, nunca como {@code Dinero} suelto (RNF-075, regla
 * 9).
 */
public record ObligacionConDeudaResource(
        String tributo,
        int ejercicio,
        @Nullable Long predioId,
        @Nullable Long vehiculoId,
        int periodoDesde,
        int periodoHasta,
        String fase,
        DeudaResource deuda) {

    public static ObligacionConDeudaResource de(ObligacionConDeuda obligacion) {
        return new ObligacionConDeudaResource(
                obligacion.tributo(),
                obligacion.ejercicio().valor(),
                obligacion.predioId(),
                obligacion.vehiculoId(),
                obligacion.periodoDesde(),
                obligacion.periodoHasta(),
                obligacion.fase().name(),
                DeudaResource.de(obligacion.deuda()));
    }
}
