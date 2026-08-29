package pe.gob.sgtm.fiscalizacion.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.fiscalizacion.dominio.CriterioDeProgramas;
import pe.gob.sgtm.fiscalizacion.dominio.EstadoDePrograma;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacion;
import pe.gob.sgtm.fiscalizacion.dominio.ProgramaFiscalizacionRepository;
import pe.gob.sgtm.fiscalizacion.dominio.TipoDePrograma;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Los programas de fiscalización contra PostgreSQL. Ninguna consulta filtra por {@code
 * municipalidad_id} —lo hace la política RLS— y no hay ningún {@code UPDATE} ni {@code DELETE}: un
 * programa nunca se edita en el sitio (regla 4).
 */
@Repository
public class ProgramaFiscalizacionRepositoryJdbc extends RepositorioJdbc
        implements ProgramaFiscalizacionRepository {

    private static final String COLUMNAS =
            "id, codigo, descripcion, tipo, fecha_inicio, fecha_fin, estado";

    private static final String DESDE = " FROM programa_fiscalizacion";

    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("codigo", "fecha_inicio", "fecha_fin", "estado", "id");

    public ProgramaFiscalizacionRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public ProgramaFiscalizacion insertar(ProgramaFiscalizacion programa) {
        Map<String, Object> campos = new HashMap<>();
        campos.put("codigo", programa.codigo());
        campos.put("descripcion", programa.descripcion());
        campos.put("tipo", programa.tipo().name());
        campos.put("fechaInicio", programa.fechaInicio());
        campos.put("fechaFin", programa.fechaFin());
        campos.put("estado", programa.estado().name());

        Long id =
                jdbc().sql(
                                "INSERT INTO programa_fiscalizacion"
                                        + " (municipalidad_id, codigo, descripcion, tipo, fecha_inicio,"
                                        + "  fecha_fin, estado)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :codigo, :descripcion, :tipo, :fechaInicio, :fechaFin,"
                                        + "  :estado)"
                                        + " RETURNING id")
                        .params(campos)
                        .query(Long.class)
                        .single();

        return new ProgramaFiscalizacion(
                id,
                programa.codigo(),
                programa.descripcion(),
                programa.tipo(),
                programa.fechaInicio(),
                programa.fechaFin(),
                programa.estado());
    }

    @Override
    public Optional<ProgramaFiscalizacion> findById(long id) {
        return jdbc().sql("SELECT " + COLUMNAS + DESDE + " WHERE id = :id")
                .param("id", id)
                .query(ProgramaFiscalizacionRepositoryJdbc::mapear)
                .optional();
    }

    /**
     * La grilla de programas (RF-050, #431), paginada y ordenada por código.
     *
     * <p>El «Ejercicio» de la pantalla se resuelve por <b>vigencia</b> y no por el año de {@code
     * fecha_inicio}: un programa que arranca en diciembre de 2025 y cierra en marzo de 2026 sigue
     * siendo un programa del ejercicio 2026 para quien lo busca. Un programa sin {@code fecha_fin}
     * no ha terminado, así que está vigente en todo ejercicio posterior a su inicio.
     */
    @Override
    public Pagina<ProgramaFiscalizacion> consultar(
            CriterioDeProgramas criterio, Paginacion paginacion) {

        StringBuilder donde = new StringBuilder(" WHERE 1 = 1");
        Map<String, Object> parametros = new HashMap<>();

        if (criterio.codigo() != null) {
            donde.append(" AND codigo = :codigo");
            parametros.put("codigo", criterio.codigo().strip().toUpperCase(Locale.ROOT));
        }
        if (criterio.ejercicio() != null) {
            donde.append(
                    " AND fecha_inicio <= :finDelEjercicio"
                            + " AND (fecha_fin IS NULL OR fecha_fin >= :inicioDelEjercicio)");
            int ejercicio = criterio.ejercicio();
            parametros.put("inicioDelEjercicio", LocalDate.of(ejercicio, 1, 1));
            parametros.put("finDelEjercicio", LocalDate.of(ejercicio, 12, 31));
        }

        String filtro = DESDE + donde;
        return paginar(
                "SELECT " + COLUMNAS + filtro,
                "SELECT count(*)" + filtro,
                parametros,
                paginacion,
                ORDEN,
                ProgramaFiscalizacionRepositoryJdbc::mapear);
    }

    private static ProgramaFiscalizacion mapear(ResultSet fila, int numeroDeFila)
            throws SQLException {
        java.sql.Date fechaFin = fila.getDate("fecha_fin");
        return new ProgramaFiscalizacion(
                fila.getLong("id"),
                fila.getString("codigo"),
                fila.getString("descripcion"),
                TipoDePrograma.valueOf(fila.getString("tipo")),
                fila.getDate("fecha_inicio").toLocalDate(),
                fechaFin == null ? null : fechaFin.toLocalDate(),
                EstadoDePrograma.valueOf(fila.getString("estado")));
    }
}
