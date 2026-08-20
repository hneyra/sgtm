package pe.gob.sgtm.catastro.infraestructura.web;

import pe.gob.sgtm.catastro.dominio.Depreciacion;

/** Una fila de la tabla de depreciacion, tal como sale por HTTP (ARQ-04 §3). */
public record DepreciacionResource(
        long id,
        String material,
        String estadoConservacion,
        int antiguedadHasta,
        String porcentaje,
        String documentoFuente) {

    public static DepreciacionResource de(Depreciacion depreciacion) {
        return new DepreciacionResource(
                depreciacion.id() == null ? 0L : depreciacion.id(),
                depreciacion.material(),
                depreciacion.estadoConservacion(),
                depreciacion.antiguedadHasta(),
                depreciacion.porcentaje().valor().toPlainString(),
                depreciacion.documentoFuente());
    }
}
