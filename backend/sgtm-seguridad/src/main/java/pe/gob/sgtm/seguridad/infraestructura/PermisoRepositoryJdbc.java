package pe.gob.sgtm.seguridad.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.EnumSet;
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
 * <p>Las siete columnas booleanas se escriben desde el conjunto de privilegios: lo que no esta en
 * el conjunto queda en falso. Escribirlas todas y no solo las otorgadas es deliberado —un {@code
 * UPDATE} que solo tocara las presentes dejaria activos privilegios que el administrador acaba de
 * quitar de la pantalla, y ese es exactamente el defecto que nadie nota hasta que alguien entra
 * donde no debia—.
 *
 * <p>{@code usuario_registro} sale de {@link OrigenContext}, no de un argumento: es el mismo dato
 * que la auditoria, y tenerlo en la firma invitaria a que dos sitios dijeran cosas distintas sobre
 * quien hizo el cambio.
 */
@Repository
public class PermisoRepositoryJdbc extends RepositorioJdbc implements PermisoRepository {

    private static final String COLUMNAS =
            "id, acceso_id, grupo_id, usuario_id,"
                    + " ejecucion, lectura, registro, modificacion, eliminacion, impresion, especial";

    public PermisoRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Permiso save(Permiso permiso) {
        return permiso.esNuevo() ? insertar(permiso) : actualizar(permiso);
    }

    @Override
    public Optional<Permiso> findByAccesoYGrupo(long accesoId, long grupoId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM permiso WHERE acceso_id = :acceso AND grupo_id = :grupo")
                .param("acceso", accesoId)
                .param("grupo", grupoId)
                .query(PermisoRepositoryJdbc::mapear)
                .optional();
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
