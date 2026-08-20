package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * El libro de asientos (ADR-0006). Ningun metodo recibe la municipalidad (regla 2): sale del token
 * y la aplica la politica RLS.
 *
 * <p><b>No hay {@code update} ni {@code delete}.</b> {@link #registrar} es el unico punto de
 * escritura, y siempre inserta: una correccion es otro asiento, nunca una modificacion del que ya
 * esta (V2, V7).
 */
public interface AsientoRepository {

    Optional<Asiento> findById(long id);

    /**
     * El estado de cuenta que pide el criterio, paginado.
     *
     * <p>Sin nombre que sugiera «busqueda»: no hay aproximacion aqui, todos los filtros son
     * igualdad. La aproximacion es cosa del padron de {@code contribuyentes}.
     */
    Pagina<Asiento> buscar(CriterioDeConsulta criterio, Paginacion paginacion);

    /** Inserta el asiento y devuelve la fila guardada, con su {@code id} y su {@code usuarioId}. */
    Asiento registrar(Asiento asiento);
}
