package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.web.ImporteActualizado;

/**
 * Una fila del estado de cuenta, tal como sale por HTTP. Campos en español {@code camelCase}
 * (ARQ-04 §3).
 *
 * <p>{@code monto} viaja como {@link ImporteActualizado} y no como {@code Dinero} suelto: la regla
 * de ArchUnit {@code TODA_CIFRA_DE_LA_WEB_LLEVA_SU_FECHA} lo exige (RNF-075, regla 9), y aqui la
 * fecha que corresponde es la propia {@code fechaValor} del asiento.
 *
 * <p>No lleva {@code municipalidadId} ni {@code contribuyenteId}: el primero sale del token (regla
 * 2) y el segundo no hace falta —el estado de cuenta ya esta acotado al {@code codigo} de la ruta—.
 */
public record AsientoResource(
        long id,
        int ejercicio,
        String tributo,
        String concepto,
        String tipo,
        String fase,
        @Nullable Integer periodo,
        @Nullable Long predioId,
        @Nullable Long vehiculoId,
        @Nullable String referenciaExterna,
        ImporteActualizado monto,
        String documentoOrigen,
        @Nullable Long asientoReversadoId,
        @Nullable String usuarioId,
        @Nullable String motivo) {

    public static AsientoResource de(Asiento asiento) {
        return new AsientoResource(
                asiento.id() == null ? 0L : asiento.id(),
                asiento.ejercicio().valor(),
                asiento.tributo(),
                asiento.concepto().name(),
                asiento.tipo().name(),
                asiento.fase().name(),
                asiento.periodo(),
                asiento.predioId(),
                asiento.vehiculoId(),
                asiento.referenciaExterna(),
                new ImporteActualizado(asiento.monto(), asiento.fechaValor()),
                asiento.documentoOrigen(),
                asiento.asientoReversadoId(),
                asiento.usuarioId(),
                asiento.motivo());
    }
}
