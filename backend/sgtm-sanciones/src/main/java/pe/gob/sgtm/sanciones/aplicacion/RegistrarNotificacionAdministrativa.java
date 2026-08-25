package pe.gob.sgtm.sanciones.aplicacion;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativa;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativaRepository;

/**
 * Registra la notificación administrativa previa (#47, RF-070): {@code POST
 * /api/v1/infracciones/administrativas/notificaciones}.
 *
 * <p>No exige contribuyente ni predio identificados —el manual describe el registro sobre "la
 * vivienda o el negocio inspeccionado", que puede tomarse sin haber resuelto todavía quién
 * responde—; tampoco exige un plazo: sin uno, la notificación nunca aparece en {@code
 * adm_notificaciones_vencidas} (#47 AC3).
 *
 * <p>La tabla no lleva columna {@code observacion} (ver {@link NotificacionAdministrativa}); esta
 * clase igual la exige como argumento para poder auditar el alta (regla 10, ADR-0008).
 */
@Service
public class RegistrarNotificacionAdministrativa {

    private static final String TABLA_AUDITADA = "notificacion_administrativa";

    private final NotificacionAdministrativaRepository notificaciones;
    private final Auditoria auditoria;

    public RegistrarNotificacionAdministrativa(
            NotificacionAdministrativaRepository notificaciones, Auditoria auditoria) {
        this.notificaciones = notificaciones;
        this.auditoria = auditoria;
    }

    @Transactional
    public NotificacionAdministrativa registrar(
            String numero,
            LocalDate fecha,
            @Nullable Long contribuyenteId,
            @Nullable Long predioId,
            String direccion,
            String motivo,
            @Nullable Short plazoDias,
            Observacion observacion) {

        NotificacionAdministrativa guardada =
                notificaciones.insertar(
                        NotificacionAdministrativa.emitida(
                                numero,
                                fecha,
                                contribuyenteId,
                                predioId,
                                direccion,
                                motivo,
                                plazoDias));

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                fecha,
                                TABLA_AUDITADA,
                                String.valueOf(guardada.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(guardada)));

        return guardada;
    }

    private static String descripcion(NotificacionAdministrativa notificacion) {
        return "{\"numero\":\""
                + notificacion.numero()
                + "\",\"estado\":\""
                + notificacion.estado()
                + "\"}";
    }
}
