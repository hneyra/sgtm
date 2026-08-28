package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * El libro de asientos (ADR-0006). Ningun metodo recibe la municipalidad (regla 2): sale del token
 * y la aplica la politica RLS.
 *
 * <p><b>No hay {@code update} ni {@code delete}.</b> {@link #registrar} es el unico punto de
 * escritura, y siempre inserta: una correccion es otro asiento, nunca una modificacion del que ya
 * esta (V2, V7).
 */
public interface AsientoRepository {

    Optional<Asiento> findById(long id);

    /**
     * El estado de cuenta que pide el criterio, paginado.
     *
     * <p>Sin nombre que sugiera «busqueda»: no hay aproximacion aqui, todos los filtros son
     * igualdad. La aproximacion es cosa del padron de {@code contribuyentes}.
     */
    Pagina<Asiento> buscar(CriterioDeConsulta criterio, Paginacion paginacion);

    /**
     * Los asientos de <b>una</b> obligacion, hasta la fecha de corte del criterio (RF-041, RF-042).
     *
     * <p>Sin paginar: una obligacion tiene pocos asientos —no el libro completo de un
     * contribuyente—, y {@link CalculoDeDeuda#deudaActualizadaA} necesita verlos todos para netear
     * cargos contra abonos, no una pagina de ellos.
     */
    List<Asiento> paraDeuda(CriterioDeDeuda criterio);

    /**
     * Los movimientos de alta y baja de deuda que pide el criterio, paginados (RF-045).
     *
     * <p>Ver {@link CriterioDeAltasBajas} para que cuenta como movimiento de deuda y que no.
     */
    Pagina<Asiento> altasYBajas(CriterioDeAltasBajas criterio, Paginacion paginacion);

    /**
     * El historial de pagos que pide el criterio, paginado (RF-048, #25).
     *
     * <p>Ver {@link CriterioDePagos} para que cuenta como pago y que no.
     */
    Pagina<Asiento> pagos(CriterioDePagos criterio, Paginacion paginacion);

    /**
     * <b>Todos</b> los asientos de una obligacion, sin filtro de fecha (#23).
     *
     * <p>Es lo que la reconstruccion del saldo proyectado recorre: reconstruir a una fecha de corte
     * daria un saldo que no es el del libro, y la conciliacion lo leeria como divergencia.
     */
    List<Asiento> deLaObligacion(ClaveDeSaldo clave);

    /**
     * Los asientos que un documento origino y que <b>todavia no son una reversion</b> (#34).
     *
     * <p>Es como la anulacion de un recibo encuentra lo que tiene que deshacer: la cobranza dejo el
     * numero del recibo en {@code documento_origen} de cada asiento que escribio (#33), y eso es lo
     * unico que los relaciona entre si. Sin paginar: son los asientos de <b>una</b> cobranza.
     *
     * <p>El filtro {@code asiento_reversado_id IS NULL} es una segunda barrera, no la principal: la
     * primera es que la reversion se asienta con un documento de origen <b>distinto</b> ({@code
     * RegistroDeAbonos#reversarAbonos} lo exige). Aun asi se filtra, porque el precio es cero y lo
     * que evita es que una reversion pueda encontrarse a si misma si algun dia alguien reutilizara
     * el mismo texto.
     *
     * <p>Recorre todas las particiones del libro: un abono se imputa al ejercicio de la
     * <b>obligacion</b>, no al de la fecha de pago, asi que un solo recibo puede haber tocado
     * varias. {@code asiento_documento_origen_ix} (V30) es lo que hace que eso sea una lectura de
     * indice por particion y no un recorrido completo.
     */
    List<Asiento> porDocumentoOrigen(String documentoOrigen);

    /**
     * El identificador del contribuyente con ese codigo, si existe en esta municipalidad.
     *
     * <p>Vive aqui y no en un repositorio del contexto {@code contribuyentes} por lo mismo que el
     * cruce de {@link #buscar}: se resuelve en SQL contra una tabla con la que ya hay clave
     * foranea, sin conocer ningun tipo de ese contexto (ARQ-01 §4 regla 2). Las dos tablas
     * comparten politica RLS, asi que la busqueda no se sale del tenant.
     */
    Optional<Long> contribuyentePorCodigo(String codigo);

    /** Todos los asientos de un contribuyente, para reconstruir sus saldos de una vez (#23). */
    List<Asiento> deContribuyente(long contribuyenteId);

    /**
     * Los contribuyentes con al menos un asiento, en orden de identificador, desde {@code
     * despuesDe} y como mucho {@code cuantos}.
     *
     * <p>La forma —cursor por identificador, no {@code OFFSET}— es lo que hace <b>reanudable</b> la
     * reconstruccion masiva (#23): el proceso guarda el ultimo identificador que termino y sigue
     * desde ahi, sin recorrer otra vez lo hecho y sin saltarse a nadie si entretanto entra un
     * contribuyente nuevo.
     */
    List<Long> contribuyentesConAsientos(long despuesDe, int cuantos);

    /** Inserta el asiento y devuelve la fila guardada, con su {@code id} y su {@code usuarioId}. */
    Asiento registrar(Asiento asiento);
}
