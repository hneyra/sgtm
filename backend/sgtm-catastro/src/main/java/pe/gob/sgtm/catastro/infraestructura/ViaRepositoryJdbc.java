package pe.gob.sgtm.catastro.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.catastro.dominio.TipoVia;
import pe.gob.sgtm.catastro.dominio.Via;
import pe.gob.sgtm.catastro.dominio.ViaRepository;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * Implementacion JDBC del catalogo vial. Es la plantilla que copian los demas contextos.
 *
 * <p>Cuatro cosas que este archivo demuestra y conviene repetir:
 *
 * <ol>
 *   <li><b>Ninguna lectura filtra por {@code municipalidad_id}</b>, y el {@code INSERT} no lo
 *       recibe de Java: lo pone el motor con {@code current_setting}, del mismo parametro que la
 *       politica RLS consulta ({@code RepositorioJdbc.MUNICIPALIDAD_ACTUAL}). Un {@code WHERE
 *       municipalidad_id = ?} escrito a mano se olvida en la consulta cuarenta; una politica no se
 *       olvida, y sin contexto la consulta falla en lugar de devolver de mas.
 *   <li><b>El SQL esta escrito, no generado.</b> Se ve lo que se ejecuta.
 *   <li><b>Ningun {@code DELETE}.</b> Una via no se borra: se da de baja (RNF-051). La aplicacion
 *       tampoco tiene el privilegio, pero la barrera que se ve en la revision es esta.
 *   <li><b>El orden se valida contra una lista blanca</b>, porque {@code ORDER BY} no admite
 *       parametros de enlace.
 * </ol>
 */
@Repository
public class ViaRepositoryJdbc extends RepositorioJdbc implements ViaRepository {

    private static final String COLUMNAS = "id, codigo, tipo_via, nombre, ubigeo, activa";

    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("codigo", "nombre", "tipo_via", "id");

    public ViaRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<Via> findById(long id) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM via WHERE id = :id")
                .param("id", id)
                .query(ViaRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Optional<Via> findByCodigo(String codigo) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM via WHERE codigo = :codigo")
                .param("codigo", codigo)
                .query(ViaRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Pagina<Via> findAll(Paginacion paginacion) {
        return paginar(
                "SELECT " + COLUMNAS + " FROM via",
                "SELECT count(*) FROM via",
                Map.of(),
                paginacion,
                ORDEN,
                ViaRepositoryJdbc::mapear);
    }

    @Override
    public Via save(Via via) {
        return via.esNueva() ? insertar(via) : actualizar(via);
    }

    private Via insertar(Via via) {
        // RETURNING id en lugar de getGeneratedKeys: es una sola ida y vuelta y no
        // depende de que el driver soporte la recuperacion de claves generadas.
        Long id =
                jdbc().sql(
                                "INSERT INTO via"
                                        + " (municipalidad_id, codigo, tipo_via, nombre, ubigeo,"
                                        + "  activa)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :codigo, :tipoVia, :nombre, :ubigeo, :activa)"
                                        + " RETURNING id")
                        .param("codigo", via.codigo())
                        .param("tipoVia", via.tipo().name())
                        .param("nombre", via.nombre())
                        .param("ubigeo", via.ubigeo())
                        .param("activa", via.activa())
                        .query(Long.class)
                        .single();
        return new Via(id, via.codigo(), via.tipo(), via.nombre(), via.ubigeo(), via.activa());
    }

    private Via actualizar(Via via) {
        long id = Objects.requireNonNull(via.id(), "Una via existente tiene identificador");
        int filas =
                jdbc().sql(
                                """
                                UPDATE via
                                   SET codigo = :codigo,
                                       tipo_via = :tipoVia,
                                       nombre = :nombre,
                                       ubigeo = :ubigeo,
                                       activa = :activa
                                 WHERE id = :id
                                """)
                        .param("id", id)
                        .param("codigo", via.codigo())
                        .param("tipoVia", via.tipo().name())
                        .param("nombre", via.nombre())
                        .param("ubigeo", via.ubigeo())
                        .param("activa", via.activa())
                        .update();
        if (filas == 0) {
            // Puede ser que la via no exista, o que exista en OTRA municipalidad y la
            // politica RLS la esconda. Desde aqui son indistinguibles, y esta bien que
            // lo sean: decir cual de las dos es filtrar la existencia de datos ajenos.
            throw new ViaNoEncontrada(id);
        }
        return via;
    }

    private static Via mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Via(
                fila.getLong("id"),
                fila.getString("codigo"),
                TipoVia.valueOf(fila.getString("tipo_via")),
                fila.getString("nombre"),
                fila.getString("ubigeo"),
                fila.getBoolean("activa"));
    }

    /** No existe, o existe en otra municipalidad. Desde la aplicacion es lo mismo. */
    public static final class ViaNoEncontrada extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        ViaNoEncontrada(long id) {
            super("No hay ninguna via con identificador " + id + " en esta municipalidad");
        }
    }
}
