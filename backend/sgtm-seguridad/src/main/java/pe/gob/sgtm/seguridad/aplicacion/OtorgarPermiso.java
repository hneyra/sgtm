package pe.gob.sgtm.seguridad.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.seguridad.dominio.Permiso;
import pe.gob.sgtm.seguridad.dominio.PermisoRepository;

/**
 * Otorga privilegios a un grupo o a un usuario sobre un acceso.
 *
 * <p><b>Deja auditoria, con operacion {@link Operacion#PERMISO}.</b> El manual no lo pide y
 * ADR-0008 §5 lo agrega: sin esto, quien administra la seguridad puede otorgarse un privilegio,
 * usarlo y quitarselo sin que quede rastro de nada. Es el unico agujero que deja una auditoria por
 * lo demas completa, y cerrarlo cuesta esta llamada.
 *
 * <p>Alcance de #7: solo el camino de escritura que la auditoria necesita demostrar. El
 * mantenimiento completo —revocar, listar, niveles de accesibilidad— es del issue #12, y el guardia
 * que comprueba estos permisos en cada peticion, del #8.
 */
@Service
public class OtorgarPermiso {

    private final PermisoRepository repositorio;
    private final Auditoria auditoria;
    private final Clock reloj;

    public OtorgarPermiso(PermisoRepository repositorio, Auditoria auditoria, Clock reloj) {
        this.repositorio = repositorio;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    @Transactional
    public Permiso otorgar(Permiso permiso, Observacion observacion) {
        Permiso guardado = repositorio.save(permiso);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                LocalDate.now(reloj),
                                "permiso",
                                String.valueOf(guardado.id()),
                                Operacion.PERMISO,
                                observacion)
                        .con(null, descripcion(guardado)));

        return guardado;
    }

    private static String descripcion(Permiso permiso) {
        StringBuilder json = new StringBuilder("{\"accesoId\":").append(permiso.accesoId());
        if (permiso.grupoId() != null) {
            json.append(",\"grupoId\":").append(permiso.grupoId());
        }
        if (permiso.usuarioId() != null) {
            json.append(",\"usuarioId\":").append(permiso.usuarioId());
        }
        json.append(",\"privilegios\":[");
        boolean primero = true;
        for (Privilegio privilegio : Privilegio.values()) {
            if (permiso.tiene(privilegio)) {
                if (!primero) {
                    json.append(',');
                }
                json.append('"').append(privilegio.name()).append('"');
                primero = false;
            }
        }
        return json.append("]}").toString();
    }
}
