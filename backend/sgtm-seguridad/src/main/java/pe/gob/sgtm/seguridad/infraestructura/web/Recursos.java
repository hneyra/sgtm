package pe.gob.sgtm.seguridad.infraestructura.web;

import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.seguridad.dominio.Acceso;
import pe.gob.sgtm.seguridad.dominio.Grupo;
import pe.gob.sgtm.seguridad.dominio.Modulo;
import pe.gob.sgtm.seguridad.dominio.PermisoEfectivo;
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

    /**
     * Un permiso <b>efectivo</b> de un usuario, con el origen que lo produjo (#543).
     *
     * <p>{@code origen} no es un adorno: es lo que impide que quien consume esta lectura tenga que
     * reimplementar la regla de precedencia —una excepcion de usuario <b>sustituye</b> al grupo
     * entero para ese acceso, otorgue o niegue—. El frontend la tenia invertida (calculaba {@code
     * on = esPropio || esHeredado}), y esa forma es la que lo hace dificil de repetir.
     *
     * <p><b>Una fila con {@code privilegios} vacio no es una fila de mas.</b> Solo se produce
     * cuando hay una excepcion que niega, y es la unica manera de distinguir «se le nego
     * expresamente» de «nunca lo tuvo»; los accesos sobre los que no hay nada configurado,
     * simplemente, no salen.
     *
     * @param grupoId el grupo del que hereda, o nulo si el origen es la excepcion <b>o</b> si la
     *     union viene de mas de un grupo vigente y no hay uno solo que nombrar
     */
    public record PermisoEfectivoResource(
            String acceso, List<String> privilegios, String origen, @Nullable Long grupoId) {

        public static PermisoEfectivoResource de(PermisoEfectivo permiso) {
            List<String> nombres =
                    java.util.Arrays.stream(Privilegio.values())
                            .filter(permiso.privilegios()::contains)
                            .map(Enum::name)
                            .toList();
            return new PermisoEfectivoResource(
                    permiso.codigoDeAcceso(), nombres, permiso.origen().name(), permiso.grupoId());
        }
    }

    /** Cuerpo de {@code POST /seguridad/grupos/{grupo}/miembros}. */
    public record CambioDeMiembro(long usuarioId, boolean activo, String observacion) {}

    public record MiembroResource(long grupoId, long usuarioId, boolean activo) {}
}
