package pe.gob.sgtm.sanciones.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.sanciones.dominio.CriterioDeNotificacion;
import pe.gob.sgtm.sanciones.dominio.EstadoDeNotificacion;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativa;
import pe.gob.sgtm.sanciones.dominio.NotificacionAdministrativaRepository;

/**
 * La notificación administrativa previa (#47) contra PostgreSQL. Ninguna consulta filtra por {@code
 * municipalidad_id} —lo hace la política RLS—, y no hay ningún {@code DELETE} (regla 4).
 */
@Repository
public class NotificacionAdministrativaRepositoryJdbc extends RepositorioJdbc
        implements NotificacionAdministrativaRepository {

    private static final String COLUMNAS =
            "n.id, n.numero, n.fecha, n.contribuyente_id, n.predio_id, n.direccion, n.motivo,"
                    + " n.plazo_dias, n.estado, n.usuario_registro";

    private static final String DESDE = " FROM notificacion_administrativa n";

    private static final OrdenSeguro ORDEN = OrdenSeguro.sobre("fecha", "numero", "id");

    public NotificacionAdministrativaRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public NotificacionAdministrativa insertar(NotificacionAdministrativa notificacion) {
        Map<String, Object> campos = new HashMap<>();
        campos.put("numero", notificacion.numero());
        campos.put("fecha", notificacion.fecha());
        campos.put("contribuyenteId", notificacion.contribuyenteId());
        campos.put("predioId", notificacion.predioId());
        campos.put("direccion", notificacion.direccion());
        campos.put("motivo", notificacion.motivo());
        campos.put("plazoDias", notificacion.plazoDias());
        campos.put("estado", notificacion.estado().name());
        String usuario = pe.gob.sgtm.auditoria.OrigenContext.actual().usuario();
        campos.put("usuario", usuario);

        Long id =
                jdbc().sql(
                                "INSERT INTO notificacion_administrativa"
                                        + " (municipalidad_id, numero, fecha, contribuyente_id,"
                                        + "  predio_id, direccion, motivo, plazo_dias, estado,"
                                        + "  usuario_registro)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :numero, :fecha, :contribuyenteId, :predioId,"
                                        + "  :direccion, :motivo, :plazoDias, :estado, :usuario)"
                                        + " RETURNING id")
                        .params(campos)
                        .query(Long.class)
                        .single();

        return conId(notificacion, id, usuario);
    }

    @Override
    public Optional<NotificacionAdministrativa> porNumero(String numero) {
        return jdbc().sql("SELECT " + COLUMNAS + DESDE + " WHERE n.numero = :numero")
                .param("numero", numero.strip().toUpperCase(Locale.ROOT))
                .query(NotificacionAdministrativaRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Pagina<NotificacionAdministrativa> buscarVencidas(
            CriterioDeNotificacion criterio, Paginacion paginacion) {
        List<String> condiciones = new ArrayList<>();
        Map<String, Object> parametros = new HashMap<>();

        condiciones.add("n.estado = :estado");
        parametros.put(
                "estado",
                (criterio.estado() == null ? EstadoDeNotificacion.EMITIDA : criterio.estado())
                        .name());
        condiciones.add("n.plazo_dias IS NOT NULL");
        condiciones.add("(n.fecha + (n.plazo_dias || ' days')::interval) <= :vencidasAl");
        parametros.put("vencidasAl", criterio.vencidasAl());

        if (criterio.numero() != null) {
            condiciones.add("n.numero = :numero");
            parametros.put("numero", criterio.numero());
        }
        if (criterio.registradoPor() != null) {
            condiciones.add("n.usuario_registro = :registradoPor");
            parametros.put("registradoPor", criterio.registradoPor());
        }
        if (criterio.motivoContiene() != null) {
            condiciones.add("n.motivo ILIKE :motivoContiene");
            parametros.put("motivoContiene", "%" + criterio.motivoContiene() + "%");
        }

        String desde = DESDE;
        if (criterio.conPapeleta() != null) {
            String existe =
                    "EXISTS (SELECT 1 FROM papeleta pp WHERE pp.notificacion_previa_id = n.id)";
            condiciones.add(criterio.conPapeleta() ? existe : "NOT " + existe);
        }

        String donde = " WHERE " + String.join(" AND ", condiciones);

        return paginar(
                "SELECT " + COLUMNAS + desde + donde,
                "SELECT count(*)" + desde + donde,
                parametros,
                paginacion,
                ORDEN,
                NotificacionAdministrativaRepositoryJdbc::mapear);
    }

    @Override
    public NotificacionAdministrativa subsanar(long notificacionId) {
        jdbc().sql("UPDATE notificacion_administrativa SET estado = 'SUBSANADA' WHERE id = :id")
                .param("id", notificacionId)
                .update();

        return jdbc().sql("SELECT " + COLUMNAS + DESDE + " WHERE n.id = :id")
                .param("id", notificacionId)
                .query(NotificacionAdministrativaRepositoryJdbc::mapear)
                .optional()
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "La notificacion desaparecio tras la subsanacion"));
    }

    private static NotificacionAdministrativa conId(
            NotificacionAdministrativa notificacion, long id, String usuarioRegistro) {
        return new NotificacionAdministrativa(
                id,
                notificacion.numero(),
                notificacion.fecha(),
                notificacion.contribuyenteId(),
                notificacion.predioId(),
                notificacion.direccion(),
                notificacion.motivo(),
                notificacion.plazoDias(),
                notificacion.estado(),
                usuarioRegistro);
    }

    private static NotificacionAdministrativa mapear(ResultSet fila, int numeroDeFila)
            throws SQLException {
        Long contribuyenteId = (Long) fila.getObject("contribuyente_id");
        Long predioId = (Long) fila.getObject("predio_id");
        short plazoDiasValor = fila.getShort("plazo_dias");
        Short plazoDias = fila.wasNull() ? null : plazoDiasValor;

        return new NotificacionAdministrativa(
                fila.getLong("id"),
                fila.getString("numero"),
                fila.getDate("fecha").toLocalDate(),
                contribuyenteId,
                predioId,
                fila.getString("direccion"),
                fila.getString("motivo"),
                plazoDias,
                EstadoDeNotificacion.valueOf(fila.getString("estado")),
                fila.getString("usuario_registro"));
    }
}
