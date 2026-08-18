/**
 * Objetos de valor y contexto de tenant, compartidos por todos los contextos acotados (ARQ-01 §4
 * regla 6). No es un contexto acotado y no depende de ninguno.
 *
 * <p>{@code @NullMarked}: en este paquete todo es no nulo salvo lo marcado {@code @Nullable}, y
 * NullAway lo verifica al compilar (ARQ-04 §4).
 */
@org.jspecify.annotations.NullMarked
package pe.gob.sgtm.compartido;
