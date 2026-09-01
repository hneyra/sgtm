package pe.gob.sgtm.cuentacorriente;

import java.util.Objects;

/**
 * Quien figura como titular de la unidad de una obligacion —un predio o un vehiculo— tal como el
 * libro necesita verlo (#635).
 *
 * <p>Lleva <b>dos</b> datos y ninguno mas: el identificador, que es con el que se compara contra el
 * obligado del movimiento, y el codigo del padron, que es lo unico con lo que un {@code 422} puede
 * <i>nombrar</i> a alguien sin convertir un mensaje de error en un directorio. El nombre y el
 * documento no cruzan: quien atiende ya tiene el codigo para buscarlos donde corresponde, con su
 * permiso y su rastro ({@code ConsultaDeTitulares}, ADR-0015 §2.4).
 *
 * <p><b>No es un tipo de {@code catastro} ni de {@code rentas}.</b> Lo declara {@code
 * cuentacorriente} en su propio vocabulario para poder preguntar sin importar nada de nadie: ver
 * {@link PadronDeUnidades}.
 *
 * @param contribuyenteId el titular, para compararlo con el del movimiento
 * @param codigo su codigo en el padron, o {@code #<id>} si el padron no lo resuelve
 */
public record TitularDeLaUnidad(long contribuyenteId, String codigo) {

    public TitularDeLaUnidad {
        Objects.requireNonNull(codigo, "El titular de la unidad necesita como nombrarse");
        if (contribuyenteId <= 0) {
            throw new IllegalArgumentException(
                    "Un titular sin identificador no se publica: no hay con quien comparar");
        }
    }
}
