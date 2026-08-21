package pe.gob.sgtm.rentas.dominio;

import java.util.Optional;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Las declaraciones juradas. Ningun metodo recibe la municipalidad (regla 2).
 *
 * <p><b>No hay {@code eliminar}.</b> {@link #insertar} es el unico punto de alta; {@link
 * #marcarSustituida} es el unico {@code UPDATE}, y toca solo {@code estado} —nunca el numero, la
 * fecha ni el tipo—. Una rectificatoria es otra fila, nunca una edicion (regla 4).
 */
public interface DeclaracionJuradaRepository {

    Optional<DeclaracionJurada> findById(long id);

    /** Por numero y ejercicio, que es como la busca quien atiende (contrato de {@code djNro}). */
    Optional<DeclaracionJurada> porNumero(String numero, Ejercicio ejercicio);

    /** Inserta la declaracion y devuelve la fila guardada, con su {@code id} y su usuario. */
    DeclaracionJurada insertar(DeclaracionJurada declaracion);

    /** Dobla la fila a {@code SUSTITUIDA}: el unico {@code UPDATE}, y solo toca el estado. */
    DeclaracionJurada marcarSustituida(long id);
}
