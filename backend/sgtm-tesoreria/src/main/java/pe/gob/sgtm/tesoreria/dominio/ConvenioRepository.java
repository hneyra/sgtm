package pe.gob.sgtm.tesoreria.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Los convenios. Ningun metodo recibe la municipalidad (regla 2): la filtra la politica RLS.
 *
 * <p><b>Solo se agregan.</b> No hay {@code actualizar} ni {@code borrar}, y no es un olvido: V31 le
 * retira a {@code sgtm_app} el privilegio de {@code UPDATE} sobre {@code convenio} y sobre {@code
 * convenio_cuota}, y {@code DELETE} nunca lo tuvo (V7). Lo que le pasa a un convenio se agrega a
 * {@code convenio_movimiento}.
 */
public interface ConvenioRepository {

    /**
     * El siguiente correlativo del ejercicio, reservado.
     *
     * <p>Un {@code INSERT ... ON CONFLICT DO UPDATE SET ultimo = ultimo + 1} sobre {@code
     * convenio_correlativo}: una sola sentencia, que bloquea la fila del contador mientras la
     * actualiza. Nunca un {@code SELECT} seguido de un {@code UPDATE} —entre los dos cabe otro
     * registro, y los dos leerian el mismo numero—.
     */
    NumeroDeConvenio siguienteNumero(Ejercicio ejercicio);

    /**
     * Guarda el convenio con su deuda acogida y su cronograma. Devuelve el convenio con su
     * identificador.
     *
     * @throws CronogramaDuplicado si ese convenio ya tenia sus cuotas o su deuda acogida. Lo decide
     *     la base —{@code convenio_cuota_uq} y {@code convenio_deuda_uq}—, no un {@code SELECT}
     *     previo: dos peticiones simultaneas pasarian las dos por cualquier comprobacion escrita en
     *     Java, y el cronograma saldria por duplicado
     */
    Convenio registrar(Convenio convenio);

    /** El convenio con ese numero, con su deuda acogida y su cronograma. */
    Optional<Convenio> porNumero(NumeroDeConvenio numero);

    /** El convenio con ese identificador, con su deuda acogida y su cronograma. */
    Optional<Convenio> porId(long id);

    /** Los convenios que pide el criterio, paginados (RF-084). */
    Pagina<ConvenioEnConsulta> buscar(CriterioDeConvenios criterio, Paginacion paginacion);

    /**
     * Ese convenio ya tiene su cronograma o su deuda acogida.
     *
     * <p>Reejecutar la generacion de cuotas no duplica, y quien lo impide es la base: {@code
     * convenio_cuota_uq} desde V3 y {@code convenio_deuda_uq} desde V31. Un {@code if} sobre un
     * {@code SELECT} previo no serviria —dos peticiones simultaneas lo pasarian las dos— y ademas
     * dejaria la garantia en un sitio del que se puede salir.
     */
    final class CronogramaDuplicado extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        public CronogramaDuplicado(String mensaje, Throwable causa) {
            super(mensaje, causa);
        }
    }
}
