package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;

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
     * Lo que cada uno de esos documentos <b>sigue</b> abonando, en una sola consulta (#36).
     *
     * <p>Es como el cierre de caja cuadra contra el libro. {@link #porDocumentoOrigen} sirve para
     * uno; esto sirve para los de un turno entero, que pueden ser cientos, y hacerlo documento por
     * documento serian cientos de viajes al motor por cada arqueo.
     *
     * <p>«Sigue» es la palabra que importa. Solo se suman los asientos de tipo {@code ABONO} —el
     * cargo con el que la cobranza cristaliza el devengo no es dinero que entro— y solo los que
     * <b>nadie ha reversado</b>. Un recibo anulado conserva sus asientos, porque no se borran, se
     * reversan (V2): preguntar «cuanto abono» devolveria el importe de un recibo que ya no vale.
     *
     * <p>La consecuencia util es que quien pregunta no tiene que saber que documento reversa a que
     * otro, ni que la reversion de un abono se escribe como cargo. Ese conocimiento se queda aqui.
     *
     * <p>Un documento que no asento nada <b>no aparece</b> en el mapa. Distinguir «cero» de «no
     * estaba» es cosa de quien pregunta: {@code AbonadoEnElLibro} lo resuelve devolviendo cero.
     */
    java.util.Map<String, pe.gob.sgtm.dominio.Dinero> abonadoPorDocumento(
            Collection<String> documentosOrigen);

    /**
     * El identificador del contribuyente con ese codigo, si existe en esta municipalidad.
     *
     * <p>Vive aqui y no en un repositorio del contexto {@code contribuyentes} por lo mismo que el
     * cruce de {@link #buscar}: se resuelve en SQL contra una tabla con la que ya hay clave
     * foranea, sin conocer ningun tipo de ese contexto (ARQ-01 §4 regla 2). Las dos tablas
     * comparten politica RLS, asi que la busqueda no se sale del tenant.
     */
    Optional<Long> contribuyentePorCodigo(String codigo);

    /**
     * Lo cobrado de esos tributos entre las dos fechas, agrupado por tributo, ejercicio, mes y fase
     * (#53, RF-073).
     *
     * <p>Los mismos dos filtros que {@link #abonadoPorDocumento}, y por el mismo motivo: solo los
     * {@code ABONO} —el cargo con que la cobranza cristaliza el devengo no es dinero que entro— y
     * solo los que <b>nadie ha reversado</b>, porque un recibo anulado conserva sus asientos.
     * Ademas, solo los cuatro conceptos con los que una cobranza imputa el pago —insoluto,
     * reajuste, interes y gasto—: los otros abonos mueven deuda, no la cobran.
     *
     * <p>La agregacion la hace el motor. Traer los asientos para sumarlos en Java significaria
     * traer todos los pagos del periodo para escribir doce cifras.
     *
     * @return una linea por grupo con movimiento; vacia si no se cobro nada o si {@code tributos}
     *     lo esta
     */
    List<RecaudacionAgregada> recaudadoPorTributo(
            Collection<String> tributos, java.time.LocalDate desde, java.time.LocalDate hasta);

    /**
     * Lo cobrado de <b>todos</b> los tributos entre las dos fechas, con el mismo desglose y los
     * mismos filtros que {@link #recaudadoPorTributo} (#56, RF-130).
     *
     * <p>Es un metodo aparte y no una lista vacia interpretada como «todos». El contrato de {@link
     * #recaudadoPorTributo} dice que la coleccion vacia devuelve la respuesta vacia, y eso es lo
     * correcto alli: quien pregunta por los tributos de un area y resulta que el area no tiene
     * ninguno debe recibir cero, no el padron entero. Reutilizar el mismo metodo con dos
     * significados opuestos para el mismo argumento es como se escriben los defectos que nadie ve
     * al revisar.
     *
     * <p>Sin filtro de tributo, la <b>unica</b> cota es el rango de fechas, y por eso este metodo
     * existe para un panel y no para un listado: lo que devuelve es una linea por (tributo,
     * ejercicio, mes, fase) con movimiento, que crece con el numero de grupos y no con el del
     * padron.
     */
    List<RecaudacionAgregada> recaudadoDeTodos(
            java.time.LocalDate desde, java.time.LocalDate hasta);

    /**
     * Lo cargado en un ejercicio, agrupado por tributo (#56, RF-130).
     *
     * <p>El reverso de {@link #recaudadoPorTributo}: {@code CARGO} en lugar de {@code ABONO}, y
     * solo el concepto {@code INSOLUTO} —el tributo puesto a cobrar, sin el reajuste, el interes ni
     * los gastos que se le anadieron despues—. El mismo criterio de reversion que el otro lado,
     * para que las dos cifras se puedan dividir sin explicar nada.
     *
     * <p>Y una condicion mas que el otro lado no necesita: <b>un asiento que es la reversion de
     * otro no cuenta como cargo</b>. Reversar un abono produce un cargo del mismo concepto, asi que
     * un recibo anulado dejaria «lo cargado» inflado por su propio importe. No es deuda nueva: es
     * la deuda de siempre, que vuelve a estar viva.
     *
     * <p>La agregacion la hace el motor, por lo mismo de siempre: los cargos de un ejercicio son el
     * padron entero.
     */
    List<CargoAgregado> cargadoPorTributo(pe.gob.sgtm.dominio.Ejercicio ejercicio);

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

    /**
     * Los ejercicios en los que el libro <b>puede</b> asentar, de menor a mayor (#597).
     *
     * <p>{@code cuenta_corriente_asiento} esta particionada por ejercicio (V2) y las particiones se
     * declaran una a una en las migraciones. Un {@code INSERT} de un ejercicio sin particion no
     * devuelve vacio ni escribe en ningun sitio: <b>falla</b>, con «no partition of relation found
     * for row» y SQLSTATE {@code 23514} —el mismo que una violacion de {@code CHECK}, asi que
     * atraparlo por el codigo de error confundiria las dos—.
     *
     * <p>Se pregunta antes de escribir para que el borde pueda contestar {@code 422} nombrando el
     * ejercicio en vez de un {@code 500} con incidencia, que dice «vuelve a intentarlo» sobre algo
     * que no va a cambiar hasta que alguien escriba una migracion.
     *
     * <p>No es «el ejercicio esta abierto» en sentido tributario —eso es otra cosa, y no vive
     * aqui—: es literalmente donde hay sitio en el libro.
     */
    List<Ejercicio> ejerciciosAsentables();

    /** Inserta el asiento y devuelve la fila guardada, con su {@code id} y su {@code usuarioId}. */
    Asiento registrar(Asiento asiento);
}
