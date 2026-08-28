package pe.gob.sgtm.tesoreria.dominio;

import java.util.Optional;

/**
 * Las ventanillas de la municipalidad. Ningun metodo recibe la municipalidad (regla 2): la filtra
 * la politica RLS con el valor que {@code SET LOCAL} fijo al abrir la transaccion.
 */
public interface CajaRepository {

    /** La caja con ese codigo, si existe en esta municipalidad. */
    Optional<Caja> porCodigo(String codigo);

    /**
     * La caja con ese identificador, si existe en esta municipalidad.
     *
     * <p>La necesita quien parte de un recibo y no de un codigo tecleado: el duplicado y la
     * anulacion (#34) llegan con el numero impreso y de ahi salen identificadores, no codigos.
     */
    Optional<Caja> porId(long id);
}
