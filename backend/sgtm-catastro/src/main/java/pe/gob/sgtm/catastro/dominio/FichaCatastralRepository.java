package pe.gob.sgtm.catastro.dominio;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Las versiones de la ficha catastral.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2). <b>Ningun metodo edita los datos de una
 * version</b>: lo unico que se actualiza es su {@code vigencia_hasta}, y eso es cerrarla, no
 * cambiarla. Modificar una ficha es crear otra version.
 */
public interface FichaCatastralRepository {

    /** La version que rige en esa fecha. Reconstruir el pasado se hace con esto (regla 9). */
    Optional<FichaCatastral> vigenteA(long predioId, TipoFicha tipo, LocalDate fecha);

    /** Todas las versiones, de la mas reciente a la mas antigua. Nunca se pierde ninguna. */
    List<FichaCatastral> historial(long predioId, TipoFicha tipo);

    /** La ultima version registrada, este vigente o no. Sirve para saber que numero toca. */
    Optional<FichaCatastral> ultimaVersion(long predioId, TipoFicha tipo);

    /**
     * Inserta una version nueva con sus construcciones e instalaciones.
     *
     * <p>No hay un {@code actualizar}: una version registrada no se edita.
     */
    FichaCatastral insertar(FichaCatastral ficha);

    /** Cierra una version. Lo unico que toca es la vigencia. */
    FichaCatastral cerrar(FichaCatastral ficha);

    List<Construccion> construccionesDe(long fichaId);

    List<OtraInstalacion> instalacionesDe(long fichaId);
}
