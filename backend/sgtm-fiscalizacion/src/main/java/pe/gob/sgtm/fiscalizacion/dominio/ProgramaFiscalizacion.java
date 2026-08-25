package pe.gob.sgtm.fiscalizacion.dominio;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * La selección de qué predios o vehículos entran a un proceso de fiscalización, con su fiscalizador
 * y su plazo (RF-050).
 *
 * <p><b>Reprogramar no borra el programa anterior</b> (AC de #45): no hay método que lo module ni
 * lo cierre. Un programa nuevo es siempre una fila nueva, con su propio código; el anterior queda
 * intacto, se haya usado o no.
 *
 * @param id nulo mientras no se ha guardado; lo asigna la base
 * @param codigo identifica el programa, único por municipalidad
 * @param descripcion qué se fiscaliza y por qué
 * @param tipo si selecciona predios o vehículos
 * @param fechaInicio desde cuándo corre
 * @param fechaFin hasta cuándo, si ya se fijó
 * @param estado en qué punto está
 */
public record ProgramaFiscalizacion(
        @Nullable Long id,
        String codigo,
        String descripcion,
        TipoDePrograma tipo,
        LocalDate fechaInicio,
        @Nullable LocalDate fechaFin,
        EstadoDePrograma estado) {

    private static final int CODIGO_MAXIMO = 20;
    private static final int DESCRIPCION_MAXIMA = 300;

    public ProgramaFiscalizacion {
        Objects.requireNonNull(codigo, "El programa de fiscalizacion necesita su codigo");
        codigo = codigo.strip().toUpperCase(Locale.ROOT);
        if (codigo.isEmpty() || codigo.length() > CODIGO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El codigo va de 1 a " + CODIGO_MAXIMO + " caracteres: '" + codigo + "'");
        }
        Objects.requireNonNull(descripcion, "El programa de fiscalizacion necesita su descripcion");
        descripcion = descripcion.strip();
        if (descripcion.isEmpty() || descripcion.length() > DESCRIPCION_MAXIMA) {
            throw new IllegalArgumentException(
                    "La descripcion va de 1 a " + DESCRIPCION_MAXIMA + " caracteres");
        }
        Objects.requireNonNull(tipo, "El programa de fiscalizacion necesita su tipo");
        Objects.requireNonNull(
                fechaInicio, "El programa de fiscalizacion necesita su fecha de inicio");
        if (fechaFin != null && fechaFin.isBefore(fechaInicio)) {
            throw new IllegalArgumentException(
                    "La fecha de fin no puede ser anterior a la fecha de inicio");
        }
        Objects.requireNonNull(estado, "El programa de fiscalizacion necesita su estado");
    }

    /** Un programa nuevo, siempre {@code ABIERTO}. */
    public static ProgramaFiscalizacion nuevo(
            String codigo,
            String descripcion,
            TipoDePrograma tipo,
            LocalDate fechaInicio,
            @Nullable LocalDate fechaFin) {
        return new ProgramaFiscalizacion(
                null, codigo, descripcion, tipo, fechaInicio, fechaFin, EstadoDePrograma.ABIERTO);
    }

    public boolean esNuevo() {
        return id == null;
    }
}
