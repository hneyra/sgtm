package pe.gob.sgtm.catastro.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * Puerto de persistencia del catalogo vial.
 *
 * <p>La interfaz vive en el dominio y la implementacion en {@code infraestructura}: asi la
 * dependencia apunta hacia el dominio y no desde el (ARQ-04 §1), y las reglas se pueden probar con
 * una implementacion en memoria sin levantar Spring ni Docker.
 *
 * <p>Nombre y metodos en <b>ingles</b>: es un patron, no vocabulario tributario (ARQ-04 §3).
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2). Lo que se ve desde aqui es lo que la politica
 * RLS deje ver, con el contexto que {@code TenantTransactionManager} fijo al abrir la transaccion.
 */
public interface ViaRepository {

    Optional<Via> findById(long id);

    Optional<Via> findByCodigo(String codigo);

    Pagina<Via> findAll(Paginacion paginacion);

    /** Inserta la via nueva o actualiza la existente, y devuelve la via con su identificador. */
    Via save(Via via);
}
