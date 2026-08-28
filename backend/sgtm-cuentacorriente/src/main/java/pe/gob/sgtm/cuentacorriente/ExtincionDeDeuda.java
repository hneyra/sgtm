package pe.gob.sgtm.cuentacorriente;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Extingue con asientos la deuda que una obligacion tiene a una fecha (#50, RF-064).
 *
 * <p>Es la septima API publica de este modulo —tras {@link ConsultaDeDeudaPublica}, {@link
 * GeneradorDeCargos}, {@link MovimientoDeFase}, {@link RegistroDeAbonos}, {@link
 * AcogimientoAConvenio} y {@link ConciliacionDeCaja}—, y vive en el paquete raiz por el mismo
 * motivo que las otras seis: Spring Modulith trata como interno todo lo que esta en un subpaquete,
 * asi que esto es exactamente lo que {@code sanciones} puede ver de {@code cuentacorriente}. Sus
 * tablas, no.
 *
 * <h2>Por que existe, y por que no valia ninguna de las anteriores</h2>
 *
 * <p>Un descargo declarado fundado deja sin efecto la multa. La papeleta <b>no se borra</b> (regla
 * 4, RNF-051) y tampoco se le cambia el importe: lo que se hace es dar de baja la deuda que
 * origino, con su motivo, en el libro. {@link RegistroDeAbonos#reversarAbonos} no sirve —eso
 * deshace un <b>pago</b>, y aqui no hubo ninguno—, y {@link GeneradorDeCargos} solo suma.
 *
 * <p>{@code RegistrarMovimientoDeDeuda} ya sabe hacer una baja, pero vive en {@code .aplicacion} y
 * no cruza la frontera; ademas emite su propia nota de cargo, y la resolucion de gerencia que
 * ordena la baja <b>ya es</b> el documento que la sustenta. Un segundo papel por el mismo acto es
 * un papel de mas en el expediente.
 *
 * <h2>Sin importe en la firma</h2>
 *
 * <p>Igual que {@link AcogimientoAConvenio}, y por el mismo motivo (ARQ-01 §3.8): lo que se
 * extingue es <b>lo que se deba a {@code fecha}</b>, releido del libro dentro de la misma
 * transaccion. Si la cifra viajara desde {@code sanciones}, quien resuelve el descargo podria
 * mandar la que leyo hace cinco minutos —o cualquiera— y el libro la asentaria sin discutir.
 */
public interface ExtincionDeDeuda {

    /**
     * Da de baja, parte por parte, lo que esa obligacion deba a la fecha.
     *
     * <p>Escribe un abono por cada parte del desglose con importe —insoluto, reajuste, interes,
     * gasto—, en la fase en la que la obligacion esta. Es exactamente lo que {@code
     * MovimientoDeDeuda} de sentido {@code BAJA} produce, y por eso el estado de cuenta la muestra
     * como una baja con su motivo y no como un pago que nadie hizo.
     *
     * <p>Una obligacion que ya no deba nada <b>no produce ningun asiento</b> y devuelve un
     * movimiento vacio: la deuda pudo pagarse mientras el recurso se tramitaba, y en ese caso lo
     * que corresponde no es una baja sino una devolucion, que es otro procedimiento.
     *
     * @param contribuyenteId el obligado; lo resolvio quien llama
     * @param obligacion el tributo, ejercicio y unidad cuya deuda se extingue
     * @param fecha la fecha valor de los asientos y la de relectura de la deuda (regla 9)
     * @param documentoOrigen el papel que la ordena; en {@code sanciones}, el numero de la
     *     resolucion de gerencia
     * @param referenciaExterna como entra la referencia del contexto que pide la baja, si la hay
     * @param observacion por que se extingue (regla 10); queda como {@code motivo} de cada asiento
     * @return lo que de verdad se dio de baja, con su fecha
     */
    MovimientoAsentado extinguir(
            long contribuyenteId,
            SeleccionDeObligacion obligacion,
            LocalDate fecha,
            String documentoOrigen,
            @Nullable String referenciaExterna,
            Observacion observacion);
}
