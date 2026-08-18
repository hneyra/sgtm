package pe.gob.sgtm.seguridad.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.seguridad.dominio.Permiso;
import pe.gob.sgtm.seguridad.dominio.PermisoRepository;

/**
 * Persistencia de los permisos.
 *
 * <p>Las siete columnas booleanas se escriben <b>siempre</b>, tanto al insertar como al actualizar:
 * lo que no esta en el conjunto queda en falso. Un {@code UPDATE} que solo tocara los privilegios
 * presentes dejaria activos los que el administrador acaba de quitar de la pantalla, y ese es el
 * defecto que no se nota hasta que alguien entra donde no debia.
 *
 * <p>{@code usuario_registro} sale de {@link OrigenContext} y no de un argumento: es el mismo dato
 * que la auditoria, y tenerlo en la firma invitaria a que dos sitios dijeran cosas distintas sobre
 * quien hizo el cambio.
 */
@Repository
public class PermisoRepositoryJdbc extends RepositorioJdbc implements PermisoRepository {

    private static final String COLUMNAS =
            "id, acceso_id, grupo_id, usuario_id,"
                    + " ejecucion, lectura, registro, modificacion, eliminacion, impresion, especial";

    /**
     * El acceso que gobierna la propia administracion de permisos, y el privilegio que hace falta
     * para ejercerla. Es el id de esa pantalla en el catalogo (NEG-03).
     */
    static final String ACCESO_DE_ADMINISTRACION = "permisos";

    public PermisoRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Permiso save(Permiso permiso) {
        return permiso.esNuevo() ? insertar(permiso) : actualizar(permiso);
    }

    @Override
    public Optional<Permiso> deGrupo(long accesoId, long grupoId) {
        return uno("acceso_id = :acceso AND grupo_id = :sujeto", accesoId, grupoId);
    }

    @Override
    public Optional<Permiso> deUsuario(long accesoId, long usuarioId) {
        return uno("acceso_id = :acceso AND usuario_id = :sujeto", accesoId, usuarioId);
    }

    private Optional<Permiso> uno(String condicion, long accesoId, long sujeto) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM permiso WHERE " + condicion)
                .param("acceso", accesoId)
                .param("sujeto", sujeto)
                .query(PermisoRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public List<Permiso> todosLosDeGrupo(long grupoId) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM permiso WHERE grupo_id = :grupo")
                .param("grupo", grupoId)
                .query(PermisoRepositoryJdbc::mapear)
                .list();
    }

    /**
     * Cuenta los usuarios que hoy pueden administrar permisos, con la <b>misma precedencia</b> que
     * usa el guardia: la excepcion del usuario decide, y si no la hay manda la union de sus grupos.
     *
     * <p>Contar con otra regla que la del guardia seria peor que no contar: dejaria pasar un cambio
     * que en la practica si deja el sistema sin administrador, y con la tranquilidad de haberlo
     * comprobado.
     */
    @Override
    public long usuariosQuePuedenAdministrarPermisos(LocalDate fecha) {
        String sql =
                "SELECT count(*) FROM usuario u"
                        + " WHERE u.habilitado"
                        + "   AND (u.vigencia_desde IS NULL OR u.vigencia_desde <= :fecha)"
                        + "   AND (u.vigencia_hasta IS NULL OR u.vigencia_hasta >= :fecha)"
                        + "   AND COALESCE("
                        + "        (SELECT p.registro FROM permiso p"
                        + "           JOIN acceso a ON a.id = p.acceso_id AND a.codigo = :acceso"
                        + "          WHERE p.usuario_id = u.id),"
                        + "        EXISTS (SELECT 1 FROM miembro m"
                        + "                  JOIN grupo g ON g.id = m.grupo_id AND g.habilitado"
                        + "                   AND (g.vigencia_desde IS NULL OR g.vigencia_desde <= :fecha)"
                        + "                   AND (g.vigencia_hasta IS NULL OR g.vigencia_hasta >= :fecha)"
                        + "                  JOIN permiso p ON p.grupo_id = g.id"
                        + "                  JOIN acceso a ON a.id = p.acceso_id AND a.codigo = :acceso"
                        + "                 WHERE m.usuario_id = u.id AND m.activo AND p.registro))";

        return Objects.requireNonNull(
                jdbc().sql(sql)
                        .param("fecha", fecha)
                        .param("acceso", ACCESO_DE_ADMINISTRACION)
                        .query(Long.class)
                        .single());
    }

    private Permiso insertar(Permiso permiso) {
        Origen origen = OrigenContext.actual();
        Long id =
                conPrivilegios(
                                jdbc().sql(
                                                "INSERT INTO permiso"
                                                        + " (municipalidad_id, acceso_id, grupo_id,"
                                                        + "  usuario_id, ejecucion, lectura, registro,"
                                                        + "  modificacion, eliminacion, impresion,"
                                                        + "  especial, usuario_registro)"
                                                        + " VALUES ("
                                                        + MUNICIPALIDAD_ACTUAL
                                                        + ", :acceso, :grupo, :usuario,"
                                                        + " :ejecucion, :lectura, :registro,"
                                                        + " :modificacion, :eliminacion,"
                                                        + " :impresion, :especial, :usuarioRegistro)"
                                                        + " RETURNING id")
                                        .param("acceso", permiso.accesoId())
                                        .param("grupo", permiso.grupoId())
                                        .param("usuario", permiso.usuarioId())
                                        .param("usuarioRegistro", origen.usuario()),
                                permiso)
                        .query(Long.class)
                        .single();

        return new Permiso(
                id,
                permiso.accesoId(),
                permiso.grupoId(),
                permiso.usuarioId(),
                permiso.privilegios());
    }

    private Permiso actualizar(Permiso permiso) {
        long id = Objects.requireNonNull(permiso.id(), "Un permiso existente tiene identificador");
        int filas =
                conPrivilegios(
                                jdbc().sql(
                                                "UPDATE permiso SET ejecucion = :ejecucion,"
                                                        + " lectura = :lectura, registro = :registro,"
                                                        + " modificacion = :modificacion,"
                                                        + " eliminacion = :eliminacion,"
                                                        + " impresion = :impresion,"
                                                        + " especial = :especial"
                                                        + " WHERE id = :id")
                                        .param("id", id),
                                permiso)
                        .update();
        if (filas == 0) {
            throw new IllegalStateException(
                    "No hay ningun permiso con identificador " + id + " en esta municipalidad");
        }
        return permiso;
    }

    /** Las siete, siempre: lo que no esta otorgado se escribe en falso, no se deja como estaba. */
    private static JdbcClient.StatementSpec conPrivilegios(
            JdbcClient.StatementSpec sentencia, Permiso permiso) {
        JdbcClient.StatementSpec resultado = sentencia;
        for (Privilegio privilegio : Privilegio.values()) {
            resultado = resultado.param(privilegio.columna(), permiso.tiene(privilegio));
        }
        return resultado;
    }

    private static Permiso mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        Set<Privilegio> privilegios = EnumSet.noneOf(Privilegio.class);
        for (Privilegio privilegio : Privilegio.values()) {
            if (fila.getBoolean(privilegio.columna())) {
                privilegios.add(privilegio);
            }
        }
        long grupoId = fila.getLong("grupo_id");
        boolean sinGrupo = fila.wasNull();
        long usuarioId = fila.getLong("usuario_id");
        boolean sinUsuario = fila.wasNull();

        return new Permiso(
                fila.getLong("id"),
                fila.getLong("acceso_id"),
                sinGrupo ? null : grupoId,
                sinUsuario ? null : usuarioId,
                privilegios);
    }
}
