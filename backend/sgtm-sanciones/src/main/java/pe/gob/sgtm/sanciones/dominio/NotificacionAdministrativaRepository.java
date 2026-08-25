package pe.gob.sgtm.sanciones.dominio;

import java.util.Optional;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;

/**
 * La notificación administrativa previa (#47). Ningún método recibe la municipalidad (regla 2):
 * sale del token y la aplica la política RLS.
 *
 * <p><b>No hay {@code delete}.</b> Cerrar por subsanación es una actualización de {@link
 * NotificacionAdministrativa#estado}, nunca borra la fila.
 */
public interface NotificacionAdministrativaRepository {

    NotificacionAdministrativa insertar(NotificacionAdministrativa notificacion);

    Optional<NotificacionAdministrativa> porNumero(String numero);

    Pagina<NotificacionAdministrativa> buscarVencidas(
            CriterioDeNotificacion criterio, Paginacion paginacion);

    /**
     * Cierra la notificación por subsanación. Quien llama ya decidió que corresponde —dentro del
     * plazo (#47 AC2)—; este método solo guarda la transición.
     */
    NotificacionAdministrativa subsanar(long notificacionId);
}
