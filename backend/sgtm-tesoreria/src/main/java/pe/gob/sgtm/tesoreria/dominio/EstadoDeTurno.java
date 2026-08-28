package pe.gob.sgtm.tesoreria.dominio;

/**
 * Los dos estados de {@code cierre_caja.estado} (V3), en el mismo orden que su {@code CHECK}.
 *
 * <p>Un turno cerrado no vuelve a abrirse: se abre otro. Lo que no se puede es cobrar contra uno
 * cerrado, porque su arqueo ya se firmo y el dinero de ese recibo no estaria en el.
 */
public enum EstadoDeTurno {
    ABIERTO,
    CERRADO
}
