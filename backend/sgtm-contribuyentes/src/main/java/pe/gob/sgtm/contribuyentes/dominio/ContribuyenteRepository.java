package pe.gob.sgtm.contribuyentes.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.CodigoContribuyente;
import pe.gob.sgtm.dominio.DocumentoIdentidad;

/**
 * El padron de contribuyentes.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2): sale del token y la aplica la politica RLS.
 *
 * <p><b>No hay {@code delete}.</b> Un contribuyente se da de baja; su codigo aparece en recibos ya
 * emitidos y en asientos del libro (RNF-051).
 */
public interface ContribuyenteRepository {

    Optional<Contribuyente> findById(long id);

    Optional<Contribuyente> findByCodigo(CodigoContribuyente codigo);

    Optional<Contribuyente> findByDocumento(DocumentoIdentidad documento);

    /**
     * Busca por los criterios dados. Si el criterio trae nombre, el resultado viene <b>ordenado por
     * parecido</b> y no por el campo que pida la paginacion: en una busqueda por aproximacion, el
     * orden alfabetico esconde la fila que se buscaba en la pagina cuatro.
     */
    Pagina<Contribuyente> buscar(CriterioDeBusqueda criterio, Paginacion paginacion);

    Contribuyente save(Contribuyente contribuyente);
}
