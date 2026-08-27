package pe.gob.sgtm.rentas.dominio.predial;

import java.util.List;
import java.util.Optional;

/**
 * Las determinaciones prediales. Ningun metodo recibe la municipalidad (regla 2).
 *
 * <p><b>No hay {@code actualizar} ni {@code eliminar}.</b> {@link #insertar} es el unico punto de
 * escritura: guarda la cabecera y su detalle por predio en la misma operacion. Recalcular un
 * ejercicio ya determinado no modifica la fila existente —crea otra, con otro {@code conjunto_id}—
 * (AC2/AC3 de #30, ADR-0007). Que no exista el metodo es lo que hace la regla estructural: nadie
 * puede escribir un {@code UPDATE} sobre {@code base_imponible} o {@code monto_determinado} a
 * traves de esta interfaz porque no hay por donde.
 */
public interface DeterminacionRepository {

    Optional<Determinacion> findById(long id);

    /** El detalle por predio de una determinacion, en el orden en que se guardo. */
    List<DetalleDeterminacionPredio> detalleDe(long determinacionId);

    /**
     * Inserta la cabecera y su detalle por predio, en la misma transaccion. Devuelve la cabecera
     * guardada, con su {@code id} y su usuario. Exclusiva del predial: es el unico tributo con
     * detalle por predio.
     */
    Determinacion insertar(Determinacion determinacion, List<DetalleDeterminacionPredio> detalle);

    /**
     * Inserta una cabecera de una sola partida, sin detalle: vehicular, alcabala y espectaculos
     * (#32), que nunca llevan {@link DetalleDeterminacionPredio}. Devuelve la cabecera guardada,
     * con su {@code id} y su usuario.
     */
    Determinacion insertar(Determinacion determinacion);
}
