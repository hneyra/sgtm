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

    /**
     * El padron de predios del catastro, con su ubicacion resuelta a codigos y si estan fichados.
     *
     * <p>Sustituye al listado sin filtros que habia hasta #400 y que no llamaba nadie: la pantalla
     * de saneamiento necesita acotar por sector, por prefijo de codigo y por estado, y sobre todo
     * necesita poder pedir <b>los que no tienen ficha</b>, que es lo que ninguna consulta del
     * sistema sabia responder.
     */
    Pagina<PredioDelCatastro> predios(FiltroDePredios filtro, Paginacion paginacion);

    /**
     * El padron activo con el titular y la ficha vigentes a la fecha, para {@link
     * pe.gob.sgtm.catastro.PadronDePredios} (#49, RF-055).
     *
     * <p>Devuelve directamente el tipo publicado y no {@link Predio}: la respuesta necesita, en una
     * sola consulta, el titular de {@code titularidad}, el codigo del {@code sector} y el area y el
     * uso de la {@code ficha_catastral} vigente. Componerla arriba —una lectura de predios y luego
     * tres por fila— seria ochenta consultas por pagina de veinte.
     *
     * <p>Un predio con dos copropietarios produce <b>dos</b> filas, una por titular. No es una
     * duplicacion: cada copropietario tiene su propia obligacion de declarar, y la deteccion de
     * omisos pregunta por personas, no por unidades.
     *
     * @param sectorCodigo filtro opcional; {@code null} trae el padron entero
     * @param aLaFecha a que dia se resuelven titularidad y ficha (regla 9)
     */
    Pagina<pe.gob.sgtm.catastro.PredioDelPadron> padron(
            @org.jspecify.annotations.Nullable String sectorCodigo,
            LocalDate aLaFecha,
            Paginacion paginacion);

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
