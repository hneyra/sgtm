package pe.gob.sgtm.catastro.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.dominio.Arancel;

/** Un arancel, tal como sale por HTTP. Campos en español {@code camelCase} (ARQ-04 §3). */
public record ArancelResource(
        long id, long viaId, @Nullable String tramo, String valorM2, String documentoFuente) {

    public static ArancelResource de(Arancel arancel) {
        return new ArancelResource(
                arancel.id() == null ? 0L : arancel.id(),
                arancel.viaId(),
                arancel.tramo(),
                arancel.valorM2().toString(),
                arancel.documentoFuente());
    }
}
