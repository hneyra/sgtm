package pe.gob.sgtm.auditoria;

import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Lo que un caso de uso de escritura entrega para dejar su rastro (ADR-0008).
 *
 * <p>Lo que <b>no</b> lleva, a proposito, es municipalidad, usuario, equipo, IP ni fecha: esos
 * salen del contexto de la peticion ({@code TenantContext}, {@code OrigenContext}) y del reloj
 * inyectado en {@link AuditoriaService}, nunca de un parametro que el llamador podria falsificar o
 * simplemente olvidar (regla 2 y su misma logica aplicada al origen).
 *
 * @param tabla la tabla de negocio afectada, tal como aparece en el esquema (p. ej. {@code "via"})
 * @param clave la clave primaria de negocio de la fila afectada, como texto
 * @param operacion que tipo de cambio fue
 * @param observacion el porque, escrito por quien hizo el cambio. Nunca opcional (regla 10)
 * @param datosAnteriores el estado previo, o {@code null} en un alta
 * @param datosNuevos el estado resultante, o {@code null} en una baja
 */
public record RegistroDeAuditoria(
        String tabla,
        String clave,
        Operacion operacion,
        Observacion observacion,
        @Nullable Map<String, Object> datosAnteriores,
        @Nullable Map<String, Object> datosNuevos) {

    public RegistroDeAuditoria {
        Objects.requireNonNull(tabla, "El registro de auditoria exige la tabla afectada");
        Objects.requireNonNull(clave, "El registro de auditoria exige la clave afectada");
        Objects.requireNonNull(operacion, "El registro de auditoria exige la operacion");
        Objects.requireNonNull(
                observacion,
                "El registro de auditoria exige la observacion (regla 10, ADR-0008); no hay"
                        + " constructor que la omita");
    }
}
