package pe.gob.sgtm.catastro.infraestructura.web;

import java.util.List;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.dominio.ActividadEconomica;
import pe.gob.sgtm.catastro.dominio.BienComun;
import pe.gob.sgtm.catastro.dominio.Colindante;
import pe.gob.sgtm.catastro.dominio.Construccion;
import pe.gob.sgtm.catastro.dominio.DetalleDeBienesComunes;
import pe.gob.sgtm.catastro.dominio.DetalleDeLaFicha;
import pe.gob.sgtm.catastro.dominio.DetalleEconomico;
import pe.gob.sgtm.catastro.dominio.DetalleRural;
import pe.gob.sgtm.catastro.dominio.FichaCatastral;
import pe.gob.sgtm.catastro.dominio.ParticipacionComun;
import pe.gob.sgtm.catastro.dominio.TierraRural;

/**
 * Una version de la ficha, tal como sale por HTTP.
 *
 * <p>Publica la <b>version</b> y su <b>vigencia</b>, no solo los datos: quien lee una ficha tiene
 * que poder decir cual de todas esta viendo y desde cuando rige. Una pantalla que muestra el area
 * sin decir de que version es no permite explicar por que la determinacion salio distinta.
 *
 * <p>Las construcciones salen con sus <b>categorias</b>, nunca con importes: cuanto vale cada
 * categoria es D-02a y vive en datos versionados (regla 5). Lo mismo con los grupos de tierra —van
 * en hectareas, sin arancel— y con los bienes comunes.
 *
 * <p>Los tres bloques de detalle son <b>nulos salvo el que toca</b>. Una ficha rural no publica un
 * bloque economico vacio: quien lea el JSON tiene que poder distinguir «este predio no declara
 * actividad» de «esta ficha no es de las que la declaran».
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
        @Nullable String denominacion,
        List<ConstruccionResource> construcciones,
        @Nullable EconomicoResource economico,
        @Nullable BienesComunesResource bienesComunes,
        @Nullable RuralResource rural) {

    public static FichaResource de(FichaCatastral ficha) {
        DetalleDeLaFicha detalle = ficha.detalle();
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
                ficha.denominacion(),
                ficha.construcciones().stream().map(ConstruccionResource::de).toList(),
                detalle instanceof DetalleEconomico economico
                        ? EconomicoResource.de(economico)
                        : null,
                detalle instanceof DetalleDeBienesComunes comunes
                        ? BienesComunesResource.de(comunes)
                        : null,
                detalle instanceof DetalleRural rural ? RuralResource.de(rural) : null);
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

    /** Lo que se hace en la unidad y con que autorizaciones (RF-002). */
    public record EconomicoResource(
            List<ActividadResource> actividades,
            @Nullable String informacionComplementaria,
            int sinLicencia) {

        public static EconomicoResource de(DetalleEconomico detalle) {
            return new EconomicoResource(
                    detalle.actividades().stream().map(ActividadResource::de).toList(),
                    detalle.informacionComplementaria(),
                    detalle.sinLicencia().size());
        }
    }

    /**
     * Una actividad, con su licencia por numero.
     *
     * <p>{@code licenciaNumero} nulo no es un dato que falte: es el hallazgo. La pantalla lo pinta
     * distinto y fiscalizacion sale de ahi.
     */
    public record ActividadResource(
            long id,
            String conductor,
            @Nullable String nombreComercial,
            @Nullable String ciiu,
            @Nullable String areaOcupada,
            @Nullable String licenciaNumero,
            @Nullable String licenciaFecha,
            @Nullable String anuncioNumero) {

        public static ActividadResource de(ActividadEconomica actividad) {
            return new ActividadResource(
                    actividad.id() == null ? 0L : actividad.id(),
                    actividad.conductor(),
                    actividad.nombreComercial(),
                    actividad.ciiu(),
                    actividad.areaOcupada() == null ? null : actividad.areaOcupada().toString(),
                    actividad.licenciaNumero(),
                    actividad.licenciaFecha() == null ? null : actividad.licenciaFecha().toString(),
                    actividad.anuncioNumero());
        }
    }

    /** Las areas comunes de la edificacion y su reparto (RF-003). */
    public record BienesComunesResource(
            List<BienResource> bienes,
            List<ParticipacionResource> participaciones,
            String areaComunTotal) {

        public static BienesComunesResource de(DetalleDeBienesComunes detalle) {
            return new BienesComunesResource(
                    detalle.bienes().stream().map(BienResource::de).toList(),
                    detalle.participaciones().stream().map(ParticipacionResource::de).toList(),
                    detalle.areaComunTotal().toString());
        }
    }

    public record BienResource(
            long id,
            String descripcion,
            String area,
            @Nullable String material,
            @Nullable String estadoConservacion) {

        public static BienResource de(BienComun bien) {
            return new BienResource(
                    bien.id() == null ? 0L : bien.id(),
                    bien.descripcion(),
                    bien.area().toString(),
                    bien.material() == null ? null : bien.material().name(),
                    bien.estadoConservacion() == null ? null : bien.estadoConservacion().name());
        }
    }

    public record ParticipacionResource(long predioId, String porcentaje) {

        public static ParticipacionResource de(ParticipacionComun participacion) {
            return new ParticipacionResource(
                    participacion.predioId(), participacion.porcentaje().toString());
        }
    }

    /**
     * Los grupos de tierra y los colindantes (RF-004).
     *
     * <p>La superficie sale con su unidad —{@code "12.5000 HA"}— y no como numero suelto: el
     * arancel rural es por hectarea, y un cliente que interprete metros calcularia diez mil veces
     * de menos.
     */
    public record RuralResource(
            List<TierraResource> tierras,
            List<ColindanteResource> colindantes,
            String hectareasTotales) {

        public static RuralResource de(DetalleRural detalle) {
            return new RuralResource(
                    detalle.tierras().stream().map(TierraResource::de).toList(),
                    detalle.colindantes().stream().map(ColindanteResource::de).toList(),
                    detalle.hectareasTotales().toString());
        }
    }

    public record TierraResource(
            long id,
            String clasificacion,
            @Nullable String calidadAgrologica,
            String riego,
            String hectareas) {

        public static TierraResource de(TierraRural tierra) {
            return new TierraResource(
                    tierra.id() == null ? 0L : tierra.id(),
                    tierra.clasificacion(),
                    tierra.calidadAgrologica(),
                    tierra.riego().name(),
                    tierra.hectareas().toString());
        }
    }

    public record ColindanteResource(String orientacion, String descripcion) {

        public static ColindanteResource de(Colindante colindante) {
            return new ColindanteResource(
                    colindante.orientacion().name(), colindante.descripcion());
        }
    }
}
