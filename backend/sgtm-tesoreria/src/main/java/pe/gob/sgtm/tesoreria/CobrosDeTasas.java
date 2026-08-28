package pe.gob.sgtm.tesoreria;

import java.util.Optional;

/**
 * Acredita, contra la caja, que un recibo cobro un concepto del TUPA y sigue vigente (#50, RF-064).
 *
 * <p>Es la segunda API publica de este modulo —tras {@link ConveniosDelContribuyente}— y vive en el
 * paquete raiz por el mismo motivo: Spring Modulith trata como interno todo lo que esta en un
 * subpaquete, asi que esto es exactamente lo que {@code sanciones} puede ver de {@code tesoreria}.
 * Sus tablas, no.
 *
 * <h2>Por que existe</h2>
 *
 * <p>Un vehiculo internado no sale del deposito sin pagar la custodia (AC de #50). Esa comprobacion
 * <b>no</b> se puede hacer en {@code sanciones}: el recibo vive en {@code tesoreria}, y la unica
 * forma de que la respuesta sea verdad es preguntarselo a quien lo emitio. La alternativa —que la
 * pantalla marque una casilla «Custodia cancelada», como hace el prototipo— convierte el requisito
 * en un adorno: quien libera el vehiculo es quien marca la casilla.
 *
 * <h2>«Sigue vigente» es la palabra que importa</h2>
 *
 * <p>Un recibo <b>anulado</b> conserva sus filas —no se borran, se reversan (#34)— y devolver que
 * cobro seria acreditar un pago que ya no vale. Ese conocimiento se queda aqui: quien pregunta no
 * tiene que saber que la anulacion se registra como un movimiento del recibo.
 */
public interface CobrosDeTasas {

    /**
     * Que cobro ese recibo por ese concepto, si lo cobro y sigue vigente.
     *
     * @param numeroDeRecibo como esta impreso en el papel, {@code 001-0000123}
     * @param codigoDeTasa el concepto del TUPA que se quiere acreditar
     * @return la constancia, o vacio si el recibo no existe, no cobro ese concepto o esta anulado
     */
    Optional<TasaCobrada> acreditar(String numeroDeRecibo, String codigoDeTasa);
}
