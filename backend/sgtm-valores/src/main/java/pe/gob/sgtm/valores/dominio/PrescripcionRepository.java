package pe.gob.sgtm.valores.dominio;

import java.util.Optional;

/**
 * Las declaraciones de prescripcion.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2), y no hay ninguno que actualice ni que borre:
 * una resolucion no se edita.
 */
public interface PrescripcionRepository {

    /**
     * Guarda la solicitud con el computo de cada ejercicio y los hechos alegados, en una sola
     * operacion.
     *
     * @param prescripcion {@link Prescripcion#esNueva()} tiene que ser verdadero
     */
    Prescripcion insertar(Prescripcion prescripcion);

    Optional<Prescripcion> porId(long id);
}
