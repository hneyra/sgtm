package pe.gob.sgtm.compartido;

import java.util.Objects;
import java.util.Optional;

/**
 * Origen de la peticion en curso, para la auditoria (ADR-0008).
 *
 * <p>Mismo patron que {@link TenantContext}, y el mismo motivo: el valor entra una sola vez, en el
 * borde de la aplicacion, y de ahi lo toma quien escribe {@code auditoria} sin que ningun caso de
 * uso de negocio tenga que recibirlo ni reenviarlo.
 *
 * <p>Se separa de {@code TenantContext} porque son dos preguntas distintas —«que municipalidad» y
 * «quien, desde donde»— con ciclos de vida iguales pero significados que no conviene mezclar en un
 * solo {@code ThreadLocal}: el contexto de tenant lo necesita toda consulta a datos de tenant, el
 * de origen solo lo necesita quien escribe auditoria.
 */
public final class OrigenContext {

    private static final ThreadLocal<OrigenPeticion> ACTUAL = new ThreadLocal<>();

    private OrigenContext() {}

    /** Fija el origen de la peticion. Un unico llamador legitimo: el borde de la aplicacion. */
    public static void fijar(OrigenPeticion origen) {
        Objects.requireNonNull(origen, "El contexto de origen no admite un valor nulo");
        ACTUAL.set(origen);
    }

    /**
     * Origen en curso.
     *
     * @throws IllegalStateException si no hay contexto fijado
     */
    public static OrigenPeticion actual() {
        OrigenPeticion origen = ACTUAL.get();
        if (origen == null) {
            throw new IllegalStateException(
                    "No hay contexto de origen fijado. Toda escritura de auditoria ocurre dentro de"
                            + " un contexto establecido en el borde de la aplicacion");
        }
        return origen;
    }

    /**
     * Para el codigo que legitimamente puede correr fuera de una peticion HTTP: un proceso batch no
     * tiene equipo ni IP que reportar.
     */
    public static Optional<OrigenPeticion> actualSiHay() {
        return Optional.ofNullable(ACTUAL.get());
    }

    /** Se llama siempre al cerrar la peticion, incluso si hubo error. */
    public static void limpiar() {
        ACTUAL.remove();
    }
}
