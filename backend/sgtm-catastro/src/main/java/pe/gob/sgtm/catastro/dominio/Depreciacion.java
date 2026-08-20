package pe.gob.sgtm.catastro.dominio;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Alicuota;

/**
 * El porcentaje de depreciacion de una edificacion, por material, estado de conservacion y
 * antiguedad (RT-002 a RT-004, NEG-05 de {@code ../srtm}).
 *
 * <p>{@code antiguedadHasta} es un tramo, no un ano exacto: la tabla oficial da la depreciacion
 * «hasta N anios de antiguedad», y la fila con el {@code antiguedadHasta} mas alto entre las que lo
 * cubren es la que aplica —la misma logica de tramo que ya usa esta tabla desde V1, y que {@link
 * ValorUnitarioEdificacion} adopta ahora para el ano de construccion—.
 *
 * <p>Cuelga de un conjunto sellado y no de un ejercicio suelto (#17, mismo mecanismo que #10): un
 * ejercicio puede tener mas de una version sellada, y solo el conjunto dice cual rigio una
 * determinacion concreta.
 *
 * @param id nulo mientras la fila no se ha guardado; lo asigna la base
 */
public record Depreciacion(
        @Nullable Long id,
        String material,
        String estadoConservacion,
        int antiguedadHasta,
        Alicuota porcentaje,
        String documentoFuente) {

    private static final int TEXTO_MAXIMO = 20;
    private static final int DOCUMENTO_MAXIMO = 200;

    public Depreciacion {
        Objects.requireNonNull(material, "La depreciacion necesita el material");
        Objects.requireNonNull(estadoConservacion, "La depreciacion necesita el estado");
        Objects.requireNonNull(porcentaje, "La depreciacion necesita su porcentaje");
        Objects.requireNonNull(documentoFuente, "Cargar sin documento fuente falla (ADR-0007)");
        material = exigirCorto(material, "material");
        estadoConservacion = exigirCorto(estadoConservacion, "estado de conservacion");
        if (antiguedadHasta <= 0) {
            throw new IllegalArgumentException(
                    "El tramo de antiguedad es mayor que cero: " + antiguedadHasta);
        }
        documentoFuente = documentoFuente.strip();
        if (documentoFuente.isEmpty() || documentoFuente.length() > DOCUMENTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El documento fuente va de 1 a " + DOCUMENTO_MAXIMO + " caracteres");
        }
    }

    private static String exigirCorto(String valor, String nombre) {
        String recortado = valor.strip();
        if (recortado.isEmpty() || recortado.length() > TEXTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El " + nombre + " va de 1 a " + TEXTO_MAXIMO + " caracteres: '" + valor + "'");
        }
        return recortado;
    }

    /** Una depreciacion que todavia no esta en la base. */
    public static Depreciacion nueva(
            String material,
            String estadoConservacion,
            int antiguedadHasta,
            Alicuota porcentaje,
            String documentoFuente) {
        return new Depreciacion(
                null, material, estadoConservacion, antiguedadHasta, porcentaje, documentoFuente);
    }
}
