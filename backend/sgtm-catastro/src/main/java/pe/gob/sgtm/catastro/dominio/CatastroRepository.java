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

    /**
     * El catalogo de sectores con sus conteos (#290).
     *
     * <p>Devuelve {@link SectorConConteos} y no {@link Sector} porque la pantalla de sectores del
     * manual muestra las tres cifras junto a cada fila, y contarlas es cosa de la base: hacerlo
     * arriba —traerse las manzanas y los predios de cada sector para llamar a {@code size()}— seria
     * traerse el padron entero para escribir un numero de dos digitos.
     *
     * <p>Los conteos son de <b>la pagina</b>, no del catalogo: se cuentan los sectores que la
     * pagina devuelve y ningun otro.
     */
    Pagina<SectorConConteos> sectores(Paginacion paginacion);

    Optional<Sector> sectorPorCodigo(String codigo);

    Optional<Sector> sectorPorId(long id);

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

    // ---------- Inquilinos (#31) ----------

    /** Quien ocupa el predio en esa fecha. Puede haber mas de uno vigente a la vez. */
    List<Inquilino> inquilinosDe(long predioId, LocalDate fecha);

    /** Un registro de inquilino por su identificador, vigente o ya cerrado. */
    Optional<Inquilino> inquilino(long id);

    Inquilino guardar(Inquilino inquilino);
}
