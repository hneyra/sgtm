package pe.gob.sgtm.catastro.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.dominio.Sector;

/** Un sector, tal como sale por HTTP. Campos en español {@code camelCase} (ARQ-04 §3). */
public record SectorResource(
        long id, String codigo, String nombre, @Nullable String zona, boolean activo) {

    public static SectorResource de(Sector sector) {
        return new SectorResource(
                sector.id() == null ? 0L : sector.id(),
                sector.codigo(),
                sector.nombre(),
                sector.zona(),
                sector.activo());
    }
}
