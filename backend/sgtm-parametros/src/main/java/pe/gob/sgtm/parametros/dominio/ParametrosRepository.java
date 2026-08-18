package pe.gob.sgtm.parametros.dominio;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Puerto de persistencia de los conjuntos de parametros.
 *
 * <p><b>No hay ningun metodo que cree un {@link ParametroTributario}</b>, y no es una omision: la
 * aplicacion solo tiene {@code SELECT} sobre {@code parametro_tributario} (V7). Cargar valores
 * normativos es trabajo de {@code rol_carga_parametros}, un rol distinto con su propia conexion. Es
 * la separacion de funciones de REQ-03: quien opera el sistema no publica las cifras con las que se
 * calcula.
 *
 * <p>Lo que la aplicacion si hace es armar el conjunto del ejercicio con parametros ya publicados,
 * y sellarlo.
 */
public interface ParametrosRepository {

    Pagina<ConjuntoDeParametros> conjuntos(Paginacion paginacion);

    Optional<ConjuntoDeParametros> conjunto(long id);

    Optional<ConjuntoDeParametros> selladoDe(Ejercicio ejercicio);

    /** La ultima version del ejercicio, sellada o no. 0 si no hay ninguna. */
    int ultimaVersionDe(Ejercicio ejercicio);

    ConjuntoDeParametros crear(ConjuntoDeParametros conjunto);

    /** Sella el conjunto. Falla si ya estaba sellado: lo impide un disparador de la base. */
    ConjuntoDeParametros sellar(long conjuntoId, Instant cuando, String quien);

    /** Agrega un parametro ya publicado al conjunto. Falla si el conjunto esta sellado. */
    void agregarParametro(long conjuntoId, long parametroId);

    List<ParametroTributario> parametrosDe(long conjuntoId);

    /** Solo lectura: la aplicacion no publica valores normativos. */
    Pagina<ParametroTributario> parametros(Paginacion paginacion);
}
