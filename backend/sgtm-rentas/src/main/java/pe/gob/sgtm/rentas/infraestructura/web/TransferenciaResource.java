package pe.gob.sgtm.rentas.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.rentas.dominio.Transferencia;
import pe.gob.sgtm.web.ImporteActualizado;

/**
 * Una transferencia tal como sale por HTTP. Campos en español {@code camelCase} (ARQ-04 §3).
 *
 * <p>{@code valorTransferencia} viaja como {@link ImporteActualizado}, con {@code
 * fechaTransferencia} como fecha de actualizacion: es un valor declarado en un acto ya cerrado, no
 * una cifra que cambie despues, pero la regla de ArchUnit {@code
 * TODA_CIFRA_DE_LA_WEB_LLEVA_SU_FECHA} no distingue —toda cifra mostrada indica su fecha (RNF-075,
 * regla 9)—.
 */
public record TransferenciaResource(
        long id,
        String objeto,
        @Nullable Long predioId,
        @Nullable Long vehiculoId,
        long transferenteId,
        long adquirienteId,
        String tipoTransferencia,
        String fechaTransferencia,
        ImporteActualizado valorTransferencia,
        String porcentajeTransferido,
        boolean afectaAlcabala,
        String documentoOrigen) {

    public static TransferenciaResource de(Transferencia transferencia) {
        return new TransferenciaResource(
                transferencia.id() == null ? 0L : transferencia.id(),
                transferencia.objeto().name(),
                transferencia.predioId(),
                transferencia.vehiculoId(),
                transferencia.transferenteId(),
                transferencia.adquirienteId(),
                transferencia.tipoTransferencia(),
                transferencia.fechaTransferencia().toString(),
                new ImporteActualizado(
                        transferencia.valorTransferencia(), transferencia.fechaTransferencia()),
                transferencia.porcentajeTransferido().valor().toPlainString(),
                transferencia.afectaAlcabala(),
                transferencia.documentoOrigen());
    }
}
