package pe.gob.sgtm.fiscalizacion.infraestructura;

import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ActaFiscalizacionRepository;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Las actas de fiscalización contra PostgreSQL. Sigue la plantilla de {@code
 * CuotaDeArbitrioRepositoryJdbc} (#31): ninguna consulta filtra por {@code municipalidad_id} —lo
 * hace la política RLS— y no hay ningún {@code UPDATE} ni {@code DELETE}.
 */
@Repository
public class ActaFiscalizacionRepositoryJdbc extends RepositorioJdbc
        implements ActaFiscalizacionRepository {

    private static final String DESDE = " FROM acta_fiscalizacion";

    public ActaFiscalizacionRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public ActaFiscalizacion insertar(ActaFiscalizacion acta) {
        Map<String, Object> campos = new HashMap<>();
        campos.put("programaId", acta.programaId());
        campos.put("version", acta.version());
        campos.put("contribuyenteId", acta.contribuyenteId());
        campos.put("predioId", acta.predioId());
        campos.put("vehiculoId", acta.vehiculoId());
        campos.put("fichaId", acta.fichaId());
        campos.put("fechaVisita", acta.fechaVisita());
        campos.put("fiscalizador", acta.fiscalizador());
        campos.put("hallazgo", acta.hallazgo() == null ? null : acta.hallazgo().name());
        campos.put("areaHallada", acta.areaHallada() == null ? null : acta.areaHallada().valor());
        campos.put("detalle", acta.detalle());
        campos.put("estado", acta.estado().name());
        campos.put("observacion", acta.observacion().texto());
        campos.put("usuario", OrigenContext.actual().usuario());

        Long id =
                jdbc().sql(
                                "INSERT INTO acta_fiscalizacion"
                                        + " (municipalidad_id, programa_id, version, contribuyente_id,"
                                        + "  predio_id, vehiculo_id, ficha_id, fecha_visita,"
                                        + "  fiscalizador, hallazgo, area_hallada, detalle, estado,"
                                        + "  observacion, usuario_registro)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :programaId, :version, :contribuyenteId, :predioId,"
                                        + "  :vehiculoId, :fichaId, :fechaVisita, :fiscalizador,"
                                        + "  :hallazgo, :areaHallada, :detalle, :estado, :observacion,"
                                        + "  :usuario)"
                                        + " RETURNING id")
                        .params(campos)
                        .query(Long.class)
                        .single();

        return new ActaFiscalizacion(
                id,
                acta.programaId(),
                acta.version(),
                acta.contribuyenteId(),
                acta.predioId(),
                acta.vehiculoId(),
                acta.fichaId(),
                acta.fechaVisita(),
                acta.fiscalizador(),
                acta.hallazgo(),
                acta.areaHallada(),
                acta.detalle(),
                acta.estado(),
                acta.observacion());
    }

    @Override
    public int siguienteVersion(long programaId, long contribuyenteId) {
        Integer maxima =
                jdbc().sql(
                                "SELECT max(version)"
                                        + DESDE
                                        + " WHERE programa_id = :programaId"
                                        + "   AND contribuyente_id = :contribuyenteId")
                        .param("programaId", programaId)
                        .param("contribuyenteId", contribuyenteId)
                        .query(Integer.class)
                        .optional()
                        .orElse(null);
        return maxima == null ? 1 : maxima + 1;
    }
}
