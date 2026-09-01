package pe.gob.sgtm.cuentacorriente;

import java.time.LocalDate;
import java.util.List;

/**
 * De quien es la unidad sobre la que se mueve una obligacion (#635).
 *
 * <h2>Por que este contexto declara la interfaz y no la llama a nadie</h2>
 *
 * <p>{@code cuentacorriente} <b>no conoce a nadie</b> (ARQ-01 §4, regla 2): no puede preguntarle a
 * catastro de quien es un predio ni a rentas de quien es un vehiculo. Pero una obligacion es de
 * <b>alguien SOBRE una unidad</b> —{@link pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo} es
 * (contribuyente, tributo, ejercicio, periodo, predio, vehiculo) y compara por igualdad exacta—, y
 * hasta #635 nadie comprobaba que la unidad fuera del contribuyente del movimiento.
 *
 * <p>Un alta con el {@code vehiculoId} de otra persona quedaba asentada sobre una clave que nadie
 * va a mirar: no sale en la ficha del vehiculo —que es la de su titular—, no se suma a la deuda sin
 * unidad de quien paga, y {@code GET /consultas/deuda} del obligado la publica como una fila mas,
 * indistinguible de una correcta. Es el defecto que #430 documento para la caja, por el lado del
 * cargo.
 *
 * <p>La salida es la misma que este contexto ya usa para la mora: <b>declarar el puerto y que lo
 * implemente quien sabe</b>. La flecha sigue apuntando hacia aqui —{@code rentas} depende de {@code
 * cuentacorriente}, no al reves—, y este modulo no gana ninguna dependencia.
 *
 * <h2>Un predio que no existe y uno sin titular vigente contestan lo mismo</h2>
 *
 * <p>Lista vacia para los dos, y es deliberado: es lo que {@code catastro.TitularesDelPredio} ya
 * decide —«bajo RLS un predio de otra municipalidad tampoco existe, y contestar distinto en cada
 * caso convertiria esta lectura en un detector de predios ajenos»—. Quien pregunte aqui recibe la
 * misma respuesta y tiene que tratar los dos casos igual.
 */
public interface TitularesDeLaUnidad {

    /** Las cuotas de titularidad del predio a esa fecha; vacio si no se puede saber. */
    List<TitularDeLaUnidad> delPredio(long predioId, LocalDate fecha);

    /**
     * El titular del vehiculo a esa fecha; vacio si no esta en el padron vehicular.
     *
     * <p><b>El padron vehicular no guarda historial de titularidad</b> —una transferencia cambia
     * {@code vehiculo.contribuyente_id}, no abre un tramo nuevo— asi que la fecha no cambia la
     * respuesta y quien la reciba no puede reconstruir de quien era en 2024. Lo que si se puede
     * hacer, y es lo que hace el movimiento, es dejar registrar la deuda de un titular anterior
     * <b>declarandolo</b>.
     */
    List<TitularDeLaUnidad> delVehiculo(long vehiculoId, LocalDate fecha);

    /**
     * Una cuota de titularidad, con lo justo para poder decirlo en un mensaje.
     *
     * @param codigo el codigo del padron, que es lo que quien atiende teclea
     * @param nombre para que el rechazo diga de quien es la unidad y no solo que no es suya
     */
    record TitularDeLaUnidad(long contribuyenteId, String codigo, String nombre) {}
}
