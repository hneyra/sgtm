package pe.gob.sgtm.seguridad.infraestructura.web;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.seguridad.dominio.Acceso;
import pe.gob.sgtm.seguridad.dominio.Grupo;
import pe.gob.sgtm.seguridad.dominio.Modulo;
import pe.gob.sgtm.seguridad.dominio.Usuario;

/**
 * Los DTO de seguridad, juntos: son cuatro registros de cinco campos y separarlos en cuatro
 * archivos no aclara nada.
 *
 * <p>Campos en español {@code camelCase} (ARQ-04 §3). Ninguno lleva {@code municipalidadId}.
 */
public final class Recursos {

    private Recursos() {}

    public record ModuloResource(long id, String codigo, String nombre, int orden, boolean activo) {
        public static ModuloResource de(Modulo modulo) {
            return new ModuloResource(
                    modulo.id() == null ? 0L : modulo.id(),
                    modulo.codigo(),
                    modulo.nombre(),
                    modulo.orden(),
                    modulo.activo());
        }
    }

    public record AccesoResource(
            long id, long moduloId, String tipo, String codigo, String nombre, boolean activo) {
        public static AccesoResource de(Acceso acceso) {
            return new AccesoResource(
                    acceso.id() == null ? 0L : acceso.id(),
                    acceso.moduloId(),
                    acceso.tipo().name(),
                    acceso.codigo(),
                    acceso.nombre(),
                    acceso.activo());
        }
    }

    public record GrupoResource(
            long id,
            String nombre,
            @Nullable String descripcion,
            boolean habilitado,
            @Nullable LocalDate vigenciaDesde,
            @Nullable LocalDate vigenciaHasta) {
        public static GrupoResource de(Grupo grupo) {
            return new GrupoResource(
                    grupo.id() == null ? 0L : grupo.id(),
                    grupo.nombre(),
                    grupo.descripcion(),
                    grupo.habilitado(),
                    grupo.vigencia().desde(),
                    grupo.vigencia().hasta());
        }
    }

    /**
     * El usuario, sin su {@code sujetoOidc} y sin nada parecido a una clave.
     *
     * <p>No hay clave que ocultar —ADR-0005: la autenticacion es del proveedor— y el identificador
     * del proveedor tampoco sale: no lo necesita ninguna pantalla y es un dato con el que se puede
     * correlacionar a la persona fuera del sistema.
     */
    public record UsuarioResource(
            long id,
            String cuenta,
            String nombre,
            @Nullable String correo,
            boolean habilitado,
            @Nullable LocalDate vigenciaDesde,
            @Nullable LocalDate vigenciaHasta) {
        public static UsuarioResource de(Usuario usuario) {
            return new UsuarioResource(
                    usuario.id() == null ? 0L : usuario.id(),
                    usuario.cuenta(),
                    usuario.nombre(),
                    usuario.correo(),
                    usuario.habilitado(),
                    usuario.vigencia().desde(),
                    usuario.vigencia().hasta());
        }
    }

    /** Cuerpo de {@code POST /seguridad/grupos/{grupo}/miembros}. */
    public record CambioDeMiembro(long usuarioId, boolean activo, String observacion) {}

    public record MiembroResource(long grupoId, long usuarioId, boolean activo) {}
}
