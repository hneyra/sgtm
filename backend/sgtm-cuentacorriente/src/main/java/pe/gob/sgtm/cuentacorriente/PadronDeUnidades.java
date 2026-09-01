package pe.gob.sgtm.cuentacorriente;

import java.time.LocalDate;

/**
 * De quien es la unidad de una obligacion —el predio o el vehiculo de {@code ClaveDeSaldo}— a una
 * fecha (#635). El puerto; la implementacion vive en {@code rentas}.
 *
 * <h2>Por que este puerto no rompe «cuentacorriente no conoce a nadie»</h2>
 *
 * <p>ARQ-01 §4 regla 2 dice que este contexto recibe asientos y no sabe de donde vienen, y sigue
 * siendo cierto: aqui no se importa <b>ni un tipo</b> de {@code catastro} ni de {@code rentas}. Lo
 * que hay es una pregunta escrita en el vocabulario del libro —dos {@code long} y una fecha— que
 * otro contexto contesta, exactamente como {@code pe.gob.sgtm.autorizacion.ComprobadorDeAcceso} lo
 * declara en {@code plataforma} y lo implementa {@code seguridad}.
 *
 * <p>Las dos alternativas se descartaron por escrito, y conviene que quede dicho:
 *
 * <ul>
 *   <li><b>Resolverlo en SQL desde {@code AsientoRepository}</b>, como {@code
 *       contribuyentePorCodigo}. Ese precedente se justifica en su propio javadoc «contra una tabla
 *       con la que ya hay clave foranea», y con {@code titularidad} y {@code vehiculo} <b>no la
 *       hay</b> —{@code cuenta_corriente_asiento} y {@code saldo_proyectado} solo referencian
 *       {@code contribuyente}—. Ademas obligaria a copiar aqui el predicado de vigencia de la
 *       titularidad, que es de {@code catastro}: dos copias de la misma definicion divergen, y la
 *       que decidiria quien es el titular seria la que nadie recuerda que existe.
 *   <li><b>Mover el acto entero a {@code rentas}</b>, que es lo que #366 hizo con los titulares de
 *       un predio. Aqui no hace falta: lo que cruza la frontera no es el acto —el libro sigue
 *       siendo quien asienta— sino una pregunta sobre el padron.
 * </ul>
 *
 * <h2>La fecha entra como argumento</h2>
 *
 * <p>Y no se lee del reloj (regla 6, regla 9). La deuda de 2024 es del titular de 2024: resolver la
 * titularidad con el reloj senala a quien compro despues, que es el defecto que #24 cerro con los
 * domicilios y #366 con los titulares.
 */
public interface PadronDeUnidades {

    /**
     * Los titulares del predio <b>vigentes a esa fecha</b>.
     *
     * <p>Un predio dado de baja sigue existiendo: la deuda de un ejercicio en que estuvo activo se
     * cobra igual, y esconderlo convertiria una baja del padron en una deuda inalcanzable.
     */
    TitularidadDeLaUnidad predio(long predioId, LocalDate fecha);

    /**
     * El titular del vehiculo <b>que figura hoy</b>, no el de esa fecha.
     *
     * <p>La fecha entra igual, y no se usa, y eso <b>tiene que estar dicho</b>: el padron vehicular
     * guarda un solo {@code contribuyente_id} y {@code RegistrarTransferencia} lo
     * <b>sobrescribe</b> al transferir (V2), asi que de quien era la placa en 2024 no lo sabe
     * nadie. Deducirlo de la cadena de transferencias seria inventarlo: un vehiculo cargado con el
     * padron inicial no tiene ninguna.
     *
     * <p>La consecuencia se dice en el mensaje de rechazo, no se esconde: quien registre deuda
     * vehicular anterior a una transferencia tendra que declararlo, porque el sistema no puede
     * distinguir ese caso del error.
     */
    TitularidadDeLaUnidad vehiculo(long vehiculoId, LocalDate fecha);
}
