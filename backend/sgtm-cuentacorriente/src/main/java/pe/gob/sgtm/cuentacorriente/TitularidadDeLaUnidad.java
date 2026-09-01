package pe.gob.sgtm.cuentacorriente;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Lo que el padron contesta sobre la unidad de una obligacion: si existe, y a nombre de quien esta
 * (#635).
 *
 * <p>Las dos cosas van juntas y separadas a proposito, porque <b>significan cosas distintas y se
 * arreglan de forma distinta</b>:
 *
 * <ul>
 *   <li>{@code existeEnElPadron = false} es «ese identificador no apunta a nada en esta
 *       municipalidad» —un numero tecleado mal, o el de otra municipalidad, que bajo RLS es lo
 *       mismo—. No hay declaracion que lo arregle;
 *   <li>{@code existeEnElPadron = true} con {@link #titulares} vacia es «la unidad existe y a esa
 *       fecha no figura a nombre de nadie». Es un caso corriente de un padron real (DAT-01 §4.2), y
 *       por eso se puede declarar en vez de prohibirse.
 * </ul>
 *
 * <p><b>Son varios titulares, no uno</b>: dos conyuges, una sucesion, un condominio. Y sus
 * porcentajes vigentes no tienen por que sumar 100, asi que aqui no se publica ninguno: lo que este
 * tipo contesta es <i>de quien es</i>, no <i>cuanto</i>.
 */
public record TitularidadDeLaUnidad(boolean existeEnElPadron, List<TitularDeLaUnidad> titulares) {

    /** La unidad no esta en el padron de esta municipalidad. */
    public static final TitularidadDeLaUnidad INEXISTENTE =
            new TitularidadDeLaUnidad(false, List.of());

    public TitularidadDeLaUnidad {
        Objects.requireNonNull(titulares, "La respuesta del padron necesita su lista de titulares");
        titulares = List.copyOf(titulares);
        if (!existeEnElPadron && !titulares.isEmpty()) {
            throw new IllegalArgumentException(
                    "Una unidad que no esta en el padron no puede tener titulares");
        }
    }

    /**
     * La unidad existe y estos son sus titulares a la fecha consultada; la lista puede ir vacia.
     */
    public static TitularidadDeLaUnidad de(List<TitularDeLaUnidad> titulares) {
        return new TitularidadDeLaUnidad(true, titulares);
    }

    /**
     * Si ese contribuyente figura entre los titulares.
     *
     * <p>Funcion pura y sin fecha propia: la fecha ya la aplico quien resolvio la titularidad, y
     * volver a mirarla aqui seria mirarla dos veces con dos criterios (regla 6).
     */
    public boolean esDe(long contribuyenteId) {
        return titulares.stream().anyMatch(titular -> titular.contribuyenteId() == contribuyenteId);
    }

    /**
     * Los codigos de los titulares, como mucho {@code maximo}, para poder nombrarlos.
     *
     * <p>Va acotado porque el mensaje que los lleva acaba dentro de una {@code Observacion}, que
     * tiene 500 caracteres: un condominio de treinta titulares no puede decidir si la observacion
     * del usuario cabe.
     */
    public String nombrarlos(int maximo) {
        if (maximo < 1) {
            throw new IllegalArgumentException("Nombrar cero titulares no nombra a nadie");
        }
        String primeros =
                titulares.stream()
                        .limit(maximo)
                        .map(TitularDeLaUnidad::codigo)
                        .collect(Collectors.joining(", "));
        int restantes = titulares.size() - maximo;
        return restantes > 0 ? primeros + " y " + restantes + " mas" : primeros;
    }
}
