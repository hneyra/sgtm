package pe.gob.sgtm.rentas.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.rentas.dominio.DeclaracionJurada;
import pe.gob.sgtm.rentas.dominio.DeclaracionJuradaRepository;
import pe.gob.sgtm.rentas.dominio.EstadoDeDeclaracion;
import pe.gob.sgtm.rentas.dominio.TipoDeDeclaracion;

/**
 * Las declaraciones juradas contra PostgreSQL (#28).
 *
 * <p>{@link #marcarSustituida} es el unico {@code UPDATE}, y toca solo {@code estado}: es lo que
 * garantiza en la base lo que {@link DeclaracionJurada#rectificadaPor} ya garantiza en el dominio
 * —una rectificatoria sustituye sin editar—.
 */
@Repository
public class DeclaracionJuradaRepositoryJdbc extends RepositorioJdbc
        implements DeclaracionJuradaRepository {

    private static final String COLUMNAS =
            "d.id, d.numero, d.ejercicio, d.contribuyente_id, d.tipo, d.predio_id, d.vehiculo_id,"
                    + " d.ficha_catastral_id, d.fecha_presentacion, d.fecha_limite, d.estado,"
                    + " d.dj_rectifica_id, d.usuario_registro, d.observacion";

    private static final String DESDE = " FROM declaracion_jurada d";

    public DeclaracionJuradaRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<DeclaracionJurada> findById(long id) {
        return jdbc().sql("SELECT " + COLUMNAS + DESDE + " WHERE d.id = :id")
                .param("id", id)
                .query(DeclaracionJuradaRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Optional<DeclaracionJurada> porNumero(String numero, Ejercicio ejercicio) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + DESDE
                                + " WHERE d.numero = :numero AND d.ejercicio = :ejercicio")
                .param("numero", numero)
                .param("ejercicio", ejercicio.valor())
                .query(DeclaracionJuradaRepositoryJdbc::mapear)
                .optional();
    }

    /**
     * La lista blanca del {@code ORDER BY}: {@code fecha_presentacion} es el orden por omision de
     * la ficha unificada, y los otros tres son los que su grilla deja pinchar. El texto del cliente
     * no llega nunca a la consulta —{@link OrdenSeguro} traduce contra esta lista o no hay
     * consulta—.
     */
    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("fecha_presentacion", "ejercicio", "numero", "id");

    @Override
    public Pagina<DeclaracionJurada> deContribuyente(long contribuyenteId, Paginacion paginacion) {
        String desde = DESDE + " WHERE d.contribuyente_id = :contribuyenteId";
        return paginar(
                "SELECT " + COLUMNAS + desde,
                "SELECT count(*)" + desde,
                Map.of("contribuyenteId", contribuyenteId),
                paginacion,
                ORDEN,
                DeclaracionJuradaRepositoryJdbc::mapear);
    }

    /**
     * Las declaraciones vigentes de un lote de predios (#49, RF-055).
     *
     * <p>{@code d.predio_id = ANY(:predios)} y no {@code IN (:predios)}: con la primera forma el
     * lote viaja como <b>un</b> parametro —un arreglo— y el plan se cachea igual para paginas de
     * veinte y de cien; con {@code IN}, cada tamano de lote produce una consulta distinta.
     *
     * <p>Los estados vigentes van como arreglo por el mismo motivo, y salen de {@link
     * EstadoDeDeclaracion} en vez de escribirse aqui: la definicion de «vigente» vive en un solo
     * sitio.
     */
    @Override
    public java.util.List<DeclaracionJurada> vigentesDePredios(
            java.util.Collection<Long> predioIds, Ejercicio ejercicio) {
        if (predioIds.isEmpty()) {
            return java.util.List.of();
        }
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + DESDE
                                + " WHERE d.ejercicio = :ejercicio"
                                + "   AND d.predio_id = ANY(:predios)"
                                + "   AND d.estado = ANY(:estados)")
                .param("ejercicio", ejercicio.valor())
                .param("predios", predioIds.toArray(Long[]::new))
                .param(
                        "estados",
                        new String[] {
                            EstadoDeDeclaracion.PRESENTADA.name(),
                            EstadoDeDeclaracion.OBSERVADA.name()
                        })
                .query(DeclaracionJuradaRepositoryJdbc::mapear)
                .list();
    }

    @Override
    public DeclaracionJurada insertar(DeclaracionJurada declaracion) {
        String usuario = OrigenContext.actual().usuario();

        Long id =
                jdbc().sql(
                                "INSERT INTO declaracion_jurada"
                                        + " (municipalidad_id, numero, ejercicio,"
                                        + "  contribuyente_id, tipo, predio_id, vehiculo_id,"
                                        + "  ficha_catastral_id, fecha_presentacion, fecha_limite,"
                                        + "  fuera_de_plazo, estado, dj_rectifica_id,"
                                        + "  usuario_registro, observacion)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :numero, :ejercicio, :contribuyenteId, :tipo,"
                                        + "  :predioId, :vehiculoId, :fichaCatastralId,"
                                        + "  :fechaPresentacion, :fechaLimite, :fueraDePlazo,"
                                        + "  :estado, :djRectificaId, :usuario, :observacion)"
                                        + " RETURNING id")
                        .param("numero", declaracion.numero())
                        .param("ejercicio", declaracion.ejercicio().valor())
                        .param("contribuyenteId", declaracion.contribuyenteId())
                        .param("tipo", declaracion.tipo().name())
                        .param("predioId", declaracion.predioId())
                        .param("vehiculoId", declaracion.vehiculoId())
                        .param("fichaCatastralId", declaracion.fichaCatastralId())
                        .param("fechaPresentacion", declaracion.fechaPresentacion())
                        .param("fechaLimite", declaracion.fechaLimite())
                        .param("fueraDePlazo", declaracion.fueraDePlazo())
                        .param("estado", declaracion.estado().name())
                        .param("djRectificaId", declaracion.djRectificaId())
                        .param("usuario", usuario)
                        .param("observacion", declaracion.observacion().texto())
                        .query(Long.class)
                        .single();

        return new DeclaracionJurada(
                id,
                declaracion.numero(),
                declaracion.ejercicio(),
                declaracion.contribuyenteId(),
                declaracion.tipo(),
                declaracion.predioId(),
                declaracion.vehiculoId(),
                declaracion.fichaCatastralId(),
                declaracion.fechaPresentacion(),
                declaracion.fechaLimite(),
                declaracion.estado(),
                declaracion.djRectificaId(),
                usuario,
                declaracion.observacion());
    }

    @Override
    public DeclaracionJurada marcarSustituida(long id) {
        DeclaracionJurada anterior =
                findById(id)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "No hay ninguna declaracion jurada con"
                                                        + " identificador "
                                                        + id
                                                        + " en esta municipalidad"));

        int filas =
                jdbc().sql("UPDATE declaracion_jurada SET estado = 'SUSTITUIDA' WHERE id = :id")
                        .param("id", id)
                        .update();
        if (filas == 0) {
            throw new IllegalStateException(
                    "No hay ninguna declaracion jurada con identificador "
                            + id
                            + " en esta municipalidad");
        }
        return anterior.sustituida();
    }

    private static DeclaracionJurada mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        long predio = fila.getLong("predio_id");
        Long predioId = fila.wasNull() ? null : predio;
        long vehiculo = fila.getLong("vehiculo_id");
        Long vehiculoId = fila.wasNull() ? null : vehiculo;
        long ficha = fila.getLong("ficha_catastral_id");
        Long fichaCatastralId = fila.wasNull() ? null : ficha;
        long rectifica = fila.getLong("dj_rectifica_id");
        Long djRectificaId = fila.wasNull() ? null : rectifica;

        return new DeclaracionJurada(
                fila.getLong("id"),
                fila.getString("numero"),
                new Ejercicio(fila.getInt("ejercicio")),
                fila.getLong("contribuyente_id"),
                TipoDeDeclaracion.valueOf(fila.getString("tipo")),
                predioId,
                vehiculoId,
                fichaCatastralId,
                fila.getDate("fecha_presentacion").toLocalDate(),
                fila.getDate("fecha_limite").toLocalDate(),
                EstadoDeDeclaracion.valueOf(fila.getString("estado")),
                djRectificaId,
                fila.getString("usuario_registro"),
                Observacion.de(fila.getString("observacion")));
    }
}
