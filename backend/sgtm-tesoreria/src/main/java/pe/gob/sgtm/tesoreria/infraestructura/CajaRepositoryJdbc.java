package pe.gob.sgtm.tesoreria.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.tesoreria.dominio.Caja;
import pe.gob.sgtm.tesoreria.dominio.CajaRepository;

/** Las ventanillas contra PostgreSQL (V3, V29). */
@Repository
public class CajaRepositoryJdbc extends RepositorioJdbc implements CajaRepository {

    private static final String COLUMNAS = "id, codigo, nombre, serie, area_id, activa";

    public CajaRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<Caja> porCodigo(String codigo) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM caja WHERE codigo = :codigo")
                .param("codigo", codigo.strip().toUpperCase(Locale.ROOT))
                .query(CajaRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Optional<Caja> porId(long id) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM caja WHERE id = :id")
                .param("id", id)
                .query(CajaRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Caja insertar(Caja caja) {
        Long id =
                jdbc().sql(
                                "INSERT INTO caja"
                                        + " (municipalidad_id, codigo, nombre, serie, area_id, activa)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :codigo, :nombre, :serie, :areaId, :activa)"
                                        + " RETURNING id")
                        .param("codigo", caja.codigo())
                        .param("nombre", caja.nombre())
                        .param("serie", caja.serie())
                        .param("areaId", caja.areaId())
                        .param("activa", caja.activa())
                        .query(Long.class)
                        .single();

        return new Caja(
                id, caja.codigo(), caja.nombre(), caja.serie(), caja.areaId(), caja.activa());
    }

    private static Caja mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        long area = fila.getLong("area_id");
        Long areaId = fila.wasNull() ? null : area;
        return new Caja(
                fila.getLong("id"),
                fila.getString("codigo"),
                fila.getString("nombre"),
                fila.getString("serie"),
                areaId,
                fila.getBoolean("activa"));
    }
}
