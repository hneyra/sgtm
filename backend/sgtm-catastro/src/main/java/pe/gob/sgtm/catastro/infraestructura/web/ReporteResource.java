package pe.gob.sgtm.catastro.infraestructura.web;

import java.util.List;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.aplicacion.ReporteDeFichaDelContribuyente.Reporte;
import pe.gob.sgtm.catastro.aplicacion.ReporteDeFichaDelContribuyente.UnidadAfecta;

/**
 * El contenido de la ficha del contribuyente, tal como sale por HTTP.
 *
 * <p>{@code aLaFecha} va en primera linea a proposito: es un documento que se imprime y se archiva,
 * y sin la fecha nadie puede decir si el que tiene en la mano describe la situacion de la que se
 * esta discutiendo (regla 9).
 *
 * <p>Ni un importe. El autovaluo de cada unidad es una regla de calculo bloqueada por D-02a; lo que
 * sale es superficie, uso y porcentaje.
 */
public record ReporteResource(
        String aLaFecha,
        String codigo,
        String nombre,
        String documento,
        @Nullable String domicilioFiscal,
        List<UnidadResource> unidades) {

    public static ReporteResource de(Reporte reporte) {
        return new ReporteResource(
                reporte.aLaFecha().toString(),
                reporte.contribuyente().codigo(),
                reporte.contribuyente().nombre(),
                reporte.contribuyente().documento(),
                reporte.domicilioFiscal(),
                reporte.unidades().stream().map(UnidadResource::de).toList());
    }

    /**
     * Una unidad afecta.
     *
     * <p>{@code areaTerreno}, {@code uso} y {@code version} nulos significan «predio registrado y
     * todavia sin ficha». Salen nulos y no en cero: un cero se leeria como un terreno de cero
     * metros, que es una cifra, y esto es la ausencia de una.
     */
    public record UnidadResource(
            String codRefCatastral,
            String direccion,
            String condicion,
            String porcentaje,
            @Nullable String areaTerreno,
            @Nullable String uso,
            @Nullable Integer version) {

        public static UnidadResource de(UnidadAfecta unidad) {
            return new UnidadResource(
                    unidad.codigo(),
                    unidad.direccion(),
                    unidad.condicion(),
                    unidad.porcentaje().toString(),
                    unidad.area() == null ? null : unidad.area().toString(),
                    unidad.uso(),
                    unidad.version());
        }
    }
}
