package pe.gob.sgtm.valores.dominio;

import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Los valores emitidos.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2). No hay ningun metodo que actualice ni que
 * borre una fila de {@code valor} o {@code valor_detalle}: ni siquiera existe el privilegio en la
 * base (V26). "Se anula, se da de baja o se reversa" (regla 4) es un acto distinto, todavia sin
 * issue propio.
 */
public interface ValorRepository {

    /**
     * Guarda la cabecera y su detalle en una sola operacion.
     *
     * @param valor el valor a guardar; {@link Valor#esNuevo()} tiene que ser verdadero
     * @param detalle las obligaciones que formaliza; ninguna puede estar ya guardada
     * @return el mismo valor, con su {@code id} asignado
     */
    Valor insertar(Valor valor, List<ValorDetalle> detalle);

    Optional<Valor> porNumero(TipoValor tipo, Ejercicio ejercicio, String numero);

    /** El mismo valor por su identificador, para quien ya lo resolvio antes (p. ej. #38). */
    Optional<Valor> porId(long id);

    /** El detalle de un valor ya guardado, en el orden en que se congelo. */
    List<ValorDetalle> detalleDe(long valorId);

    Pagina<Valor> buscar(CriterioDeValor criterio, Paginacion paginacion);

    /**
     * El siguiente correlativo para ese tipo y ejercicio, unico y sin huecos bajo concurrencia real
     * (AC de #37).
     *
     * <p>D-09 decide el formato del numero final —con que ceros, si se reinicia—; lo que aqui se
     * garantiza es que la secuencia no se repita ni salte, y lo garantiza un {@code UPDATE} atomico
     * contra {@code valor_correlativo}, no una lectura seguida de una escritura.
     */
    long siguienteCorrelativo(TipoValor tipo, Ejercicio ejercicio);
}
