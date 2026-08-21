package pe.gob.sgtm.catastro.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;

/**
 * Predios, catalogos territoriales y titularidad.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2). Ninguno borra: los predios y los sectores se
 * dan de baja, las titularidades se cierran (regla 4, RNF-051).
 */
public interface CatastroRepository {

    // ---------- Sectores y manzanas ----------

    Pagina<Sector> sectores(Paginacion paginacion);

    Optional<Sector> sectorPorCodigo(String codigo);

    Sector guardar(Sector sector);

    List<Manzana> manzanasDe(long sectorId);

    Manzana guardar(Manzana manzana);

    // ---------- Predios ----------

    Optional<Predio> predio(long id);

    Optional<Predio> predioPorCodigo(CodigoReferenciaCatastral codigo);

    Pagina<Predio> predios(Paginacion paginacion);

    Predio guardar(Predio predio);

    // ---------- Titularidad ----------

    /** Quien figura como titular del predio en esa fecha (regla 9). */
    List<Titularidad> titularesDe(long predioId, LocalDate fecha);

    /** Los predios de los que alguien es titular en esa fecha. */
    List<Titularidad> prediosDe(long contribuyenteId, LocalDate fecha);

    /** Una titularidad por su identificador, vigente o ya cerrada. */
    Optional<Titularidad> titularidad(long id);

    Titularidad guardar(Titularidad titularidad);
}
