package pe.gob.sgtm.seguridad.infraestructura;

import java.time.LocalDate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import pe.gob.sgtm.autorizacion.ComprobadorDeAcceso;
import pe.gob.sgtm.autorizacion.Privilegio;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Resuelve el permiso contra {@code acceso}, {@code grupo}, {@code miembro}, {@code permiso} y
 * {@code usuario}: el modelo del manual, tal cual.
 *
 * <h2>Tres cosas que la consulta decide, y conviene que esten a la vista</h2>
 *
 * <ol>
 *   <li><b>Los permisos se suman, no se restan.</b> Un usuario autorizado por su grupo <i>y</i> a
 *       titulo propio tiene la union de los dos. Es lo que hace el sistema original y lo que espera
 *       quien lo administra: se agrega a un grupo para dar, y se quita del grupo para quitar.
 *   <li><b>La vigencia se comprueba en los tres sitios</b> (RF-123): la del usuario, la del grupo y
 *       la de la pertenencia al grupo. Comprobar solo una deja abierta la puerta mas comoda: dar de
 *       baja al usuario y que siga entrando por un grupo vigente.
 *   <li><b>Las tres tablas llevan {@code activo}/{@code habilitado}</b>, y se respetan. Dar de baja
 *       no es borrar (RNF-051), asi que la fila sigue ahi y hay que mirarla.
 * </ol>
 *
 * <p>La consulta no filtra por municipalidad: lo hace la politica RLS con el contexto de la
 * transaccion. Un usuario de otra municipalidad, sencillamente, no existe desde aqui.
 */
@Component
public class ComprobadorDeAccesoJdbc extends RepositorioJdbc implements ComprobadorDeAcceso {

    public ComprobadorDeAccesoJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public boolean autoriza(String usuario, String acceso, Privilegio privilegio, LocalDate fecha) {

        String columna = privilegio.columna();

        String sql =
                "SELECT EXISTS ("
                        + "  SELECT 1"
                        + "    FROM usuario u"
                        + "    JOIN acceso a ON a.codigo = :acceso AND a.activo"
                        + "    LEFT JOIN miembro m ON m.usuario_id = u.id AND m.activo"
                        + "    LEFT JOIN grupo g ON g.id = m.grupo_id"
                        + "                     AND g.habilitado"
                        + "                     AND (g.vigencia_desde IS NULL OR g.vigencia_desde <= :fecha)"
                        + "                     AND (g.vigencia_hasta IS NULL OR g.vigencia_hasta >= :fecha)"
                        + "    JOIN permiso p ON p.acceso_id = a.id"
                        + "                  AND (p.usuario_id = u.id OR p.grupo_id = g.id)"
                        + "   WHERE u.cuenta = :usuario"
                        + "     AND u.habilitado"
                        + "     AND (u.vigencia_desde IS NULL OR u.vigencia_desde <= :fecha)"
                        + "     AND (u.vigencia_hasta IS NULL OR u.vigencia_hasta >= :fecha)"
                        + "     AND p."
                        + columna
                        + ")";

        return Boolean.TRUE.equals(
                jdbc().sql(sql)
                        .param("usuario", usuario)
                        .param("acceso", acceso)
                        .param("fecha", fecha)
                        .query(Boolean.class)
                        .single());
    }
}
