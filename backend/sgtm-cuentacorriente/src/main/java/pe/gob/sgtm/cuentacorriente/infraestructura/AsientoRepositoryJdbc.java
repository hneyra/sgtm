package pe.gob.sgtm.cuentacorriente.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.CriterioDeConsulta;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * El libro contra PostgreSQL. Solo {@code SELECT} e {@code INSERT}: {@code sgtm_app} no tiene mas
 * privilegios sobre {@code cuenta_corriente_asiento} (V7), y el escaner de fuentes rechaza
 * cualquier {@code UPDATE} escrito aqui por error, ademas de la propia base.
 *
 * <p>{@link #buscar} cruza con {@code contribuyente} para resolver el codigo de la ruta a un
 * identificador, en SQL: es la unica dependencia con ese contexto, y no es una dependencia de Java,
 * asi que Spring Modulith no la ve como tal (ARQ-01 §4 regla 2). Las dos tablas comparten politica
 * RLS por {@code municipalidad_id}, asi que el cruce no se sale del tenant.
 */
@Repository
public class AsientoRepositoryJdbc extends RepositorioJdbc implements AsientoRepository {

    private static final String COLUMNAS =
            "a.id, a.ejercicio, a.contribuyente_id, a.tributo, a.concepto, a.tipo, a.fase,"
                    + " a.periodo, a.predio_id, a.vehiculo_id, a.referencia_externa, a.monto,"
                    + " a.fecha_valor, a.documento_origen, a.asiento_reversado_id, a.usuario_id,"
                    + " a.motivo";

    private static final String DESDE = " FROM cuenta_corriente_asiento a";

    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("fecha_valor", "ejercicio", "monto", "id");

    public AsientoRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<Asiento> findById(long id) {
        return jdbc().sql("SELECT " + COLUMNAS + DESDE + " WHERE a.id = :id")
                .param("id", id)
                .query(AsientoRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public Pagina<Asiento> buscar(CriterioDeConsulta criterio, Paginacion paginacion) {
        List<String> condiciones = new ArrayList<>();
        Map<String, Object> parametros = new HashMap<>();

        condiciones.add("c.codigo_contribuyente = :codigo");
        parametros.put("codigo", criterio.codigoContribuyente());

        if (criterio.ejercicio() != null) {
            condiciones.add("a.ejercicio = :ejercicio");
            parametros.put("ejercicio", criterio.ejercicio().valor());
        }
        if (criterio.tributo() != null) {
            condiciones.add("a.tributo = :tributo");
            parametros.put("tributo", criterio.tributo());
        }
        if (criterio.fase() != null) {
            condiciones.add("a.fase = :fase");
            parametros.put("fase", criterio.fase().name());
        }

        String desdeConContribuyente = DESDE + " JOIN contribuyente c ON c.id = a.contribuyente_id";
        String donde = " WHERE " + String.join(" AND ", condiciones);

        return paginar(
                "SELECT " + COLUMNAS + desdeConContribuyente + donde,
                "SELECT count(*)" + desdeConContribuyente + donde,
                parametros,
                paginacion,
                ORDEN,
                AsientoRepositoryJdbc::mapear);
    }

    @Override
    public Asiento registrar(Asiento asiento) {
        String usuario = OrigenContext.actual().usuario();

        Long id =
                jdbc().sql(
                                "INSERT INTO cuenta_corriente_asiento"
                                        + " (municipalidad_id, ejercicio, contribuyente_id,"
                                        + "  tributo, concepto, tipo, fase, periodo, predio_id,"
                                        + "  vehiculo_id, referencia_externa, monto, fecha_valor,"
                                        + "  documento_origen, asiento_reversado_id, usuario_id,"
                                        + "  motivo)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :ejercicio, :contribuyenteId, :tributo, :concepto,"
                                        + "  :tipo, :fase, :periodo, :predioId, :vehiculoId,"
                                        + "  :referenciaExterna, :monto, :fechaValor,"
                                        + "  :documentoOrigen, :asientoReversadoId, :usuario,"
                                        + "  :motivo)"
                                        + " RETURNING id")
                        .param("ejercicio", asiento.ejercicio().valor())
                        .param("contribuyenteId", asiento.contribuyenteId())
                        .param("tributo", asiento.tributo())
                        .param("concepto", asiento.concepto().name())
                        .param("tipo", asiento.tipo().name())
                        .param("fase", asiento.fase().name())
                        .param("periodo", asiento.periodo())
                        .param("predioId", asiento.predioId())
                        .param("vehiculoId", asiento.vehiculoId())
                        .param("referenciaExterna", asiento.referenciaExterna())
                        .param("monto", asiento.monto().valor())
                        .param("fechaValor", asiento.fechaValor())
                        .param("documentoOrigen", asiento.documentoOrigen())
                        .param("asientoReversadoId", asiento.asientoReversadoId())
                        .param("usuario", usuario)
                        .param("motivo", asiento.motivo())
                        .query(Long.class)
                        .single();

        return new Asiento(
                id,
                asiento.ejercicio(),
                asiento.contribuyenteId(),
                asiento.tributo(),
                asiento.concepto(),
                asiento.tipo(),
                asiento.fase(),
                asiento.periodo(),
                asiento.predioId(),
                asiento.vehiculoId(),
                asiento.referenciaExterna(),
                asiento.monto(),
                asiento.fechaValor(),
                asiento.documentoOrigen(),
                asiento.asientoReversadoId(),
                usuario,
                asiento.motivo());
    }

    private static Asiento mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        long predio = fila.getLong("predio_id");
        Long predioId = fila.wasNull() ? null : predio;
        long vehiculo = fila.getLong("vehiculo_id");
        Long vehiculoId = fila.wasNull() ? null : vehiculo;
        int periodo = fila.getInt("periodo");
        Integer periodoValor = fila.wasNull() ? null : periodo;
        long reversado = fila.getLong("asiento_reversado_id");
        Long asientoReversadoId = fila.wasNull() ? null : reversado;

        return new Asiento(
                fila.getLong("id"),
                new Ejercicio(fila.getInt("ejercicio")),
                fila.getLong("contribuyente_id"),
                fila.getString("tributo"),
                Concepto.valueOf(fila.getString("concepto")),
                TipoAsiento.valueOf(fila.getString("tipo").strip()),
                Fase.valueOf(fila.getString("fase")),
                periodoValor,
                predioId,
                vehiculoId,
                fila.getString("referencia_externa"),
                new Dinero(fila.getBigDecimal("monto")),
                fila.getDate("fecha_valor").toLocalDate(),
                fila.getString("documento_origen"),
                asientoReversadoId,
                fila.getString("usuario_id"),
                fila.getString("motivo"));
    }
}
