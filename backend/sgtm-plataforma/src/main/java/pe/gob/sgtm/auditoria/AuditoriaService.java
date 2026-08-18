package pe.gob.sgtm.auditoria;

/**
 * El unico punto de entrada para escribir {@code auditoria} (ADR-0008).
 *
 * <p>Deliberadamente un solo metodo, y no un {@code insert} mas generico: cualquier forma mas
 * amplia de escribir en esta tabla es una forma de escribir sin observacion si alguien la usa mal.
 * Un caso de uso de negocio que necesita dejar rastro llama a {@link
 * #registrar(RegistroDeAuditoria)} y nada mas.
 */
public interface AuditoriaService {

    /**
     * Escribe una fila de auditoria en la misma transaccion que la escritura que la origina.
     *
     * <p>Si el {@code INSERT} falla —por ejemplo porque alguien construyo el registro sin pasar por
     * {@link pe.gob.sgtm.dominio.Observacion} y burlo la validacion de Java— el {@code CHECK} de la
     * base lo detiene igual, y al estar en la misma transaccion arrastra tambien la escritura de
     * negocio: una escritura sin observacion no deja ninguna fila, ni la de auditoria ni la que la
     * origino.
     *
     * @param registro que paso, sobre que, y por que
     */
    void registrar(RegistroDeAuditoria registro);
}
