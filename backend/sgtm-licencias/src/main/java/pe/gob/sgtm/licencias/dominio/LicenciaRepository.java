package pe.gob.sgtm.licencias.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Las licencias de funcionamiento. Ningun metodo recibe la municipalidad (regla 2): la filtra la
 * politica RLS con el valor que {@code SET LOCAL} fijo al abrir la transaccion.
 *
 * <p><b>No hay {@code actualizar} ni {@code borrar}</b>, y no es un olvido: V37 le retira a {@code
 * sgtm_app} el privilegio de {@code UPDATE} y {@code DELETE} nunca lo tuvo (V7). Una licencia se
 * cancela con un movimiento; no se corrige.
 */
public interface LicenciaRepository {

    /**
     * El siguiente correlativo del ejercicio, reservado.
     *
     * <p>Un {@code INSERT ... ON CONFLICT DO UPDATE SET ultimo = ultimo + 1} sobre {@code
     * licencia_correlativo}: una sola sentencia, que bloquea la fila del contador mientras la
     * actualiza. Nunca un {@code SELECT} seguido de un {@code UPDATE} —entre los dos cabe otra
     * emision, y las dos leerian el mismo numero—.
     */
    long siguienteCorrelativo(Ejercicio ejercicio);

    /** Guarda la licencia con sus giros. Devuelve la licencia con su identificador. */
    LicenciaDeFuncionamiento emitir(LicenciaDeFuncionamiento licencia);

    /** La licencia con ese numero impreso, con sus giros resueltos contra el catalogo. */
    Optional<LicenciaDeFuncionamiento> porNumero(String numero);

    /** La grilla, paginada, con los giros de cada fila ya resueltos. */
    Pagina<LicenciaDeFuncionamiento> buscar(CriterioDeLicencias criterio, Paginacion paginacion);

    /** Ese numero de licencia ya existe. Lo decide {@code licencia_numero_uq}, no un SELECT. */
    final class NumeroDuplicado extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        public NumeroDuplicado(String mensaje, Throwable causa) {
            super(mensaje, causa);
        }
    }
}
