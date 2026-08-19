package pe.gob.sgtm.catastro.infraestructura.web;

import java.util.List;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.dominio.Construccion;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;

/**
 * Una version de la ficha, tal como sale por HTTP.
 *
 * <p>Publica la <b>version</b> y su <b>vigencia</b>, no solo los datos: quien lee una ficha tiene
 * que poder decir cual de todas esta viendo y desde cuando rige. Una pantalla que muestra el area
 * sin decir de que version es no permite explicar por que la determinacion salio distinta.
 *
 * <p>Las construcciones salen con sus <b>categorias</b>, nunca con importes: cuanto vale cada
 * categoria es D-02a y vive en datos versionados (regla 5).
 */
public record FichaResource(
        long id,
        long predioId,
        String tipo,
        int version,
        String areaTerreno,
        String uso,
        String vigenciaDesde,
        @Nullable String vigenciaHasta,
        boolean vigente,
        String origen,
        String documentoOrigen,
        String observacion,
        List<ConstruccionResource> construcciones) {

    public static FichaResource de(FichaCatastral ficha) {
        return new FichaResource(
                ficha.id() == null ? 0L : ficha.id(),
                ficha.predioId(),
                ficha.tipo().name(),
                ficha.version(),
                ficha.areaTerreno().toString(),
                ficha.uso(),
                ficha.vigenciaDesde().toString(),
                ficha.vigenciaHasta() == null ? null : ficha.vigenciaHasta().toString(),
                ficha.estaVigente(),
                ficha.origen().name(),
                ficha.documentoOrigen(),
                ficha.observacion().texto(),
                ficha.construcciones().stream().map(ConstruccionResource::de).toList());
    }

    /** Lo construido en un piso: medidas y categorias, cero importes. */
    public record ConstruccionResource(
            long id,
            String piso,
            String areaConstruida,
            @Nullable Integer anioConstruccion,
            @Nullable String material,
            @Nullable String estadoConservacion,
            String categorias) {

        public static ConstruccionResource de(Construccion construccion) {
            return new ConstruccionResource(
                    construccion.id() == null ? 0L : construccion.id(),
                    construccion.piso(),
                    construccion.areaConstruida().toString(),
                    construccion.anioConstruccion() == null
                            ? null
                            : construccion.anioConstruccion().valor(),
                    construccion.material() == null ? null : construccion.material().name(),
                    construccion.estadoConservacion() == null
                            ? null
                            : construccion.estadoConservacion().name(),
                    construccion.categorias().toString());
        }
    }
}
