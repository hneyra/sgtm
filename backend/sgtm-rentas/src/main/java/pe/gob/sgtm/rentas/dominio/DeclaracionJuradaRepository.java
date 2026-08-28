package pe.gob.sgtm.rentas.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
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

    /**
     * Las declaraciones presentadas por un contribuyente, de la mas reciente a la mas antigua,
     * paginadas (#25, RF-046).
     *
     * <p>Existe para la pestaña de declaraciones juradas de la consulta unificada, que es la unica
     * pantalla que pregunta «que ha declarado esta persona» en vez de «que dice la declaracion
     * numero tal». Se apoya en {@code dj_contribuyente_ix} (V2), que ya indexa exactamente esta
     * pregunta.
     *
     * <p>Trae <b>todas</b>, incluidas las {@code SUSTITUIDA}s por una rectificatoria: una
     * declaracion sustituida no desaparece del expediente, y esconderla dejaria sin explicar por
     * que la vigente dice lo que dice. Cada fila lleva su estado.
     */
    Pagina<DeclaracionJurada> deContribuyente(long contribuyenteId, Paginacion paginacion);

    /** Inserta la declaracion y devuelve la fila guardada, con su {@code id} y su usuario. */
    DeclaracionJurada insertar(DeclaracionJurada declaracion);

    /** Dobla la fila a {@code SUSTITUIDA}: el unico {@code UPDATE}, y solo toca el estado. */
    DeclaracionJurada marcarSustituida(long id);
}
