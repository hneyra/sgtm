package pe.gob.sgtm.parametros.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.dominio.Vigencia;
import pe.gob.sgtm.parametros.dominio.ConjuntoDeParametros;
import pe.gob.sgtm.parametros.dominio.EstadoDelConjunto;
import pe.gob.sgtm.parametros.dominio.ParametroTributario;
import pe.gob.sgtm.parametros.dominio.ParametrosRepository;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/** Persistencia de los conjuntos de parametros. */
@Repository
public class ParametrosRepositoryJdbc extends RepositorioJdbc implements ParametrosRepository {

    private static final OrdenSeguro ORDEN_CONJUNTO =
            OrdenSeguro.sobre("ejercicio", "version", "estado", "id");

    private static final OrdenSeguro ORDEN_PARAMETRO =
            OrdenSeguro.sobre("tipo", "clave", "vigencia_desde", "id");

    private static final String COLUMNAS_CONJUNTO =
            "id, ejercicio, version, estado, fecha_sellado, usuario_sellado";

    private static final String COLUMNAS_PARAMETRO =
            "id, tipo, clave, valor_numerico, valor_texto, vigencia_desde, vigencia_hasta,"
                    + " documento_fuente";

    public ParametrosRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Pagina<ConjuntoDeParametros> conjuntos(Paginacion paginacion) {
        return paginar(
                "SELECT " + COLUMNAS_CONJUNTO + " FROM conjunto_parametros",
                "SELECT count(*) FROM conjunto_parametros",
                Map.of(),
                paginacion,
                ORDEN_CONJUNTO,
                ParametrosRepositoryJdbc::mapearConjunto);
    }

    @Override
    public Optional<ConjuntoDeParametros> conjunto(long id) {
        return jdbc().sql(
                        "SELECT " + COLUMNAS_CONJUNTO + " FROM conjunto_parametros WHERE id = :id")
                .param("id", id)
                .query(ParametrosRepositoryJdbc::mapearConjunto)
                .optional();
    }

    @Override
    public Optional<ConjuntoDeParametros> selladoDe(Ejercicio ejercicio) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_CONJUNTO
                                + " FROM conjunto_parametros"
                                + " WHERE ejercicio = :ejercicio AND estado = 'SELLADO'")
                .param("ejercicio", ejercicio.valor())
                .query(ParametrosRepositoryJdbc::mapearConjunto)
                .optional();
    }

    @Override
    public int ultimaVersionDe(Ejercicio ejercicio) {
        Integer maxima =
                jdbc().sql(
                                "SELECT COALESCE(max(version), 0) FROM conjunto_parametros"
                                        + " WHERE ejercicio = :ejercicio")
                        .param("ejercicio", ejercicio.valor())
                        .query(Integer.class)
                        .single();
        return maxima == null ? 0 : maxima;
    }

    @Override
    public ConjuntoDeParametros crear(ConjuntoDeParametros conjunto) {
        Long id =
                jdbc().sql(
                                "INSERT INTO conjunto_parametros (municipalidad_id, ejercicio,"
                                        + " version, estado) VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :ejercicio, :version, 'ABIERTO') RETURNING id")
                        .param("ejercicio", conjunto.ejercicio().valor())
                        .param("version", conjunto.version())
                        .query(Long.class)
                        .single();
        return new ConjuntoDeParametros(
                id,
                conjunto.ejercicio(),
                conjunto.version(),
                EstadoDelConjunto.ABIERTO,
                null,
                null);
    }

    @Override
    public ConjuntoDeParametros sellar(long conjuntoId, Instant cuando, String quien) {
        // El disparador de V9 rechaza el UPDATE si ya estaba sellado, asi que no hace
        // falta comprobarlo antes. Comprobarlo aqui ademas seria una carrera: entre la
        // lectura y la escritura cabe otra transaccion.
        jdbc().sql(
                        "UPDATE conjunto_parametros"
                                + " SET estado = 'SELLADO', fecha_sellado = :cuando,"
                                + "     usuario_sellado = :quien"
                                + " WHERE id = :id")
                .param("id", conjuntoId)
                .param("cuando", java.sql.Timestamp.from(cuando))
                .param("quien", quien)
                .update();

        return conjunto(conjuntoId)
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "El conjunto " + conjuntoId + " no existe tras sellarlo"));
    }

    @Override
    public void agregarParametro(long conjuntoId, long parametroId) {
        jdbc().sql(
                        "INSERT INTO conjunto_parametro_detalle (municipalidad_id, conjunto_id,"
                                + " parametro_id) VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :conjunto, :parametro)")
                .param("conjunto", conjuntoId)
                .param("parametro", parametroId)
                .update();
    }

    @Override
    public List<ParametroTributario> parametrosDe(long conjuntoId) {
        return jdbc().sql(
                        "SELECT "
                                + conColumnasDe("p")
                                + " FROM conjunto_parametro_detalle d"
                                + " JOIN parametro_tributario p ON p.id = d.parametro_id"
                                + " WHERE d.conjunto_id = :conjunto"
                                + " ORDER BY p.tipo, p.clave")
                .param("conjunto", conjuntoId)
                .query(ParametrosRepositoryJdbc::mapearParametro)
                .list();
    }

    @Override
    public Pagina<ParametroTributario> parametros(Paginacion paginacion) {
        return paginar(
                "SELECT " + COLUMNAS_PARAMETRO + " FROM parametro_tributario",
                "SELECT count(*) FROM parametro_tributario",
                Map.of(),
                paginacion,
                ORDEN_PARAMETRO,
                ParametrosRepositoryJdbc::mapearParametro);
    }

    private static String conColumnasDe(String alias) {
        StringBuilder columnas = new StringBuilder();
        for (String columna : COLUMNAS_PARAMETRO.split(", ")) {
            if (columnas.length() > 0) {
                columnas.append(", ");
            }
            columnas.append(alias).append('.').append(columna);
        }
        return columnas.toString();
    }

    private static ConjuntoDeParametros mapearConjunto(ResultSet fila, int numero)
            throws SQLException {
        return new ConjuntoDeParametros(
                fila.getLong("id"),
                new Ejercicio(fila.getInt("ejercicio")),
                fila.getInt("version"),
                EstadoDelConjunto.valueOf(fila.getString("estado")),
                instante(fila, "fecha_sellado"),
                fila.getString("usuario_sellado"));
    }

    private static ParametroTributario mapearParametro(ResultSet fila, int numero)
            throws SQLException {
        java.math.BigDecimal numerico = fila.getBigDecimal("valor_numerico");
        return new ParametroTributario(
                fila.getLong("id"),
                fila.getString("tipo"),
                fila.getString("clave"),
                numerico == null ? null : new ValorNormativo(numerico),
                fila.getString("valor_texto"),
                new Vigencia(fecha(fila, "vigencia_desde"), fecha(fila, "vigencia_hasta")),
                fila.getString("documento_fuente"));
    }

    private static @Nullable LocalDate fecha(ResultSet fila, String columna) throws SQLException {
        java.sql.Date valor = fila.getDate(columna);
        return valor == null ? null : valor.toLocalDate();
    }

    private static @Nullable Instant instante(ResultSet fila, String columna) throws SQLException {
        java.sql.Timestamp valor = fila.getTimestamp(columna);
        return valor == null ? null : valor.toInstant();
    }
}
