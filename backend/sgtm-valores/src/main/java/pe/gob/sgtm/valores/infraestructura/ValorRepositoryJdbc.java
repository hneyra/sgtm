package pe.gob.sgtm.valores.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.auditoria.Origen;
import pe.gob.sgtm.auditoria.OrigenContext;
import pe.gob.sgtm.compartido.Pagina;
import pe.gob.sgtm.compartido.Paginacion;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.persistencia.OrdenSeguro;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.valores.dominio.CriterioDeValor;
import pe.gob.sgtm.valores.dominio.EstadoDeValor;
import pe.gob.sgtm.valores.dominio.TipoValor;
import pe.gob.sgtm.valores.dominio.Valor;
import pe.gob.sgtm.valores.dominio.ValorDetalle;
import pe.gob.sgtm.valores.dominio.ValorRepository;

/**
 * Los valores contra PostgreSQL (V3, V26).
 *
 * <p>No hay ningun {@code UPDATE} sobre {@code valor} ni {@code valor_detalle} en esta clase: #37
 * solo produce el estado inicial, {@code EMITIDO}. Las transiciones de estado (notificado, pasado a
 * coactiva, pagado, anulado, prescrito) son de issues posteriores, y el privilegio de {@code
 * UPDATE} ya existe en la base (V7) para cuando las escriban — pero solo sobre {@code estado} y sus
 * campos de auditoria de la transicion, nunca sobre el desglose congelado.
 */
@Repository
public class ValorRepositoryJdbc extends RepositorioJdbc implements ValorRepository {

    private static final String COLUMNAS_VALOR =
            "id, tipo, numero, ejercicio, contribuyente_id, base_legal,"
                    + " monto_insoluto, monto_reajuste, monto_interes, monto_gasto,"
                    + " proyectado_a, estado, fecha_emision, usuario_registro, observacion";

    private static final OrdenSeguro ORDEN =
            OrdenSeguro.sobre("numero", "ejercicio", "fecha_emision", "monto_total");

    public ValorRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Valor insertar(Valor valor, List<ValorDetalle> detalle) {
        if (!valor.esNuevo()) {
            throw new IllegalArgumentException(
                    "Un valor ya emitido no se vuelve a insertar; se anula con otro acto");
        }
        for (ValorDetalle item : detalle) {
            if (!item.esNuevo()) {
                throw new IllegalArgumentException(
                        "El detalle de un valor nuevo tiene que ser nuevo el tambien");
            }
        }

        Long id =
                jdbc().sql(
                                "INSERT INTO valor"
                                        + " (municipalidad_id, tipo, numero, ejercicio,"
                                        + "  contribuyente_id, base_legal, monto_insoluto,"
                                        + "  monto_reajuste, monto_interes, monto_gasto,"
                                        + "  monto_total, proyectado_a, estado, fecha_emision,"
                                        + "  usuario_registro, observacion)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :tipo, :numero, :ejercicio, :contribuyenteId,"
                                        + "  :baseLegal, :insoluto, :reajuste, :interes, :gasto,"
                                        + "  :total, :proyectadoA, :estado, :fechaEmision,"
                                        + "  :usuario, :observacion)"
                                        + " RETURNING id")
                        .param("tipo", valor.tipo().codigo())
                        .param("numero", valor.numero())
                        .param("ejercicio", valor.ejercicio().valor())
                        .param("contribuyenteId", valor.contribuyenteId())
                        .param("baseLegal", valor.baseLegal())
                        .param("insoluto", valor.montoInsoluto().valor())
                        .param("reajuste", valor.montoReajuste().valor())
                        .param("interes", valor.montoInteres().valor())
                        .param("gasto", valor.montoGasto().valor())
                        .param("total", valor.total().valor())
                        .param("proyectadoA", valor.proyectadoA())
                        .param("estado", valor.estado().name())
                        .param("fechaEmision", valor.fechaEmision())
                        .param("usuario", usuarioActual())
                        .param("observacion", valor.observacion().texto())
                        .query(Long.class)
                        .single();

        for (ValorDetalle item : detalle) {
            jdbc().sql(
                            "INSERT INTO valor_detalle"
                                    + " (municipalidad_id, valor_id, tributo, ejercicio, periodo,"
                                    + "  predio_id, vehiculo_id, referencia_externa, insoluto,"
                                    + "  reajuste, interes, gasto)"
                                    + " VALUES ("
                                    + MUNICIPALIDAD_ACTUAL
                                    + ", :valorId, :tributo, :ejercicio, :periodo, :predioId,"
                                    + "  :vehiculoId, :referenciaExterna, :insoluto, :reajuste,"
                                    + "  :interes, :gasto)")
                    .param("valorId", id)
                    .param("tributo", item.tributo())
                    .param("ejercicio", item.ejercicio().valor())
                    .param("periodo", item.periodo())
                    .param("predioId", item.predioId())
                    .param("vehiculoId", item.vehiculoId())
                    .param("referenciaExterna", item.referenciaExterna())
                    .param("insoluto", item.insoluto().valor())
                    .param("reajuste", item.reajuste().valor())
                    .param("interes", item.interes().valor())
                    .param("gasto", item.gasto().valor())
                    .update();
        }

        return new Valor(
                id,
                valor.tipo(),
                valor.numero(),
                valor.ejercicio(),
                valor.contribuyenteId(),
                valor.baseLegal(),
                valor.montoInsoluto(),
                valor.montoReajuste(),
                valor.montoInteres(),
                valor.montoGasto(),
                valor.proyectadoA(),
                valor.estado(),
                valor.fechaEmision(),
                usuarioActual(),
                valor.observacion());
    }

    @Override
    public Optional<Valor> porNumero(TipoValor tipo, Ejercicio ejercicio, String numero) {
        // La unicidad real (valor_numero_uq, V3) es (municipalidad_id, tipo, numero): el ejercicio
        // no entra en la clave porque el numero ya lo lleva embebido en su texto.
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS_VALOR
                                + " FROM valor WHERE tipo = :tipo AND numero = :numero")
                .param("tipo", tipo.codigo())
                .param("numero", numero)
                .query(this::mapearValor)
                .optional();
    }

    @Override
    public Optional<Valor> porId(long id) {
        return jdbc().sql("SELECT " + COLUMNAS_VALOR + " FROM valor WHERE id = :id")
                .param("id", id)
                .query(this::mapearValor)
                .optional();
    }

    @Override
    public List<ValorDetalle> detalleDe(long valorId) {
        return jdbc().sql(
                        "SELECT id, valor_id, tributo, ejercicio, periodo, predio_id,"
                                + " vehiculo_id, referencia_externa, insoluto, reajuste, interes,"
                                + " gasto"
                                + " FROM valor_detalle"
                                + " WHERE valor_id = :valorId"
                                + " ORDER BY id")
                .param("valorId", valorId)
                .query(this::mapearDetalle)
                .list();
    }

    @Override
    public Pagina<Valor> buscar(CriterioDeValor criterio, Paginacion paginacion) {
        Map<String, Object> parametros = new LinkedHashMap<>();
        StringBuilder condiciones = new StringBuilder("1 = 1");

        if (criterio.numero() != null && !criterio.numero().isBlank()) {
            condiciones.append(" AND numero = :numero");
            parametros.put("numero", criterio.numero().strip());
        }
        if (criterio.contribuyenteId() != null) {
            condiciones.append(" AND contribuyente_id = :contribuyenteId");
            parametros.put("contribuyenteId", criterio.contribuyenteId());
        }
        if (criterio.tipo() != null) {
            condiciones.append(" AND tipo = :tipo");
            parametros.put("tipo", criterio.tipo().codigo());
        }
        if (criterio.ejercicio() != null) {
            condiciones.append(" AND ejercicio = :ejercicio");
            parametros.put("ejercicio", criterio.ejercicio());
        }

        String seleccion = "SELECT " + COLUMNAS_VALOR + " FROM valor WHERE " + condiciones;
        String conteo = "SELECT count(*) FROM valor WHERE " + condiciones;

        return paginar(seleccion, conteo, parametros, paginacion, ORDEN, this::mapearValor);
    }

    @Override
    public long siguienteCorrelativo(TipoValor tipo, Ejercicio ejercicio) {
        // UPSERT atomico: la fila del contador queda bloqueada durante el UPDATE, asi que dos
        // emisiones concurrentes para el mismo tipo y ejercicio se serializan en el motor. Una
        // lectura seguida de una escritura desde Java no daria esta garantia (AC de #37).
        Long ultimo =
                jdbc().sql(
                                "INSERT INTO valor_correlativo"
                                        + " (municipalidad_id, tipo, ejercicio, ultimo)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :tipo, :ejercicio, 1)"
                                        + " ON CONFLICT (municipalidad_id, tipo, ejercicio)"
                                        + " DO UPDATE SET ultimo = valor_correlativo.ultimo + 1"
                                        + " RETURNING ultimo")
                        .param("tipo", tipo.codigo())
                        .param("ejercicio", ejercicio.valor())
                        .query(Long.class)
                        .single();
        return ultimo;
    }

    private Valor mapearValor(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Valor(
                fila.getLong("id"),
                TipoValor.porCodigo(fila.getString("tipo")),
                fila.getString("numero"),
                new Ejercicio(fila.getInt("ejercicio")),
                fila.getLong("contribuyente_id"),
                fila.getString("base_legal"),
                new Dinero(fila.getBigDecimal("monto_insoluto")),
                new Dinero(fila.getBigDecimal("monto_reajuste")),
                new Dinero(fila.getBigDecimal("monto_interes")),
                new Dinero(fila.getBigDecimal("monto_gasto")),
                fila.getDate("proyectado_a").toLocalDate(),
                EstadoDeValor.valueOf(fila.getString("estado")),
                fila.getDate("fecha_emision").toLocalDate(),
                fila.getString("usuario_registro"),
                Observacion.de(fila.getString("observacion")));
    }

    private ValorDetalle mapearDetalle(ResultSet fila, int numeroDeFila) throws SQLException {
        long predio = fila.getLong("predio_id");
        Long predioId = fila.wasNull() ? null : predio;
        long vehiculo = fila.getLong("vehiculo_id");
        Long vehiculoId = fila.wasNull() ? null : vehiculo;
        int periodo = fila.getInt("periodo");
        Integer periodoValor = fila.wasNull() ? null : periodo;

        return new ValorDetalle(
                fila.getLong("id"),
                fila.getLong("valor_id"),
                fila.getString("tributo"),
                new Ejercicio(fila.getInt("ejercicio")),
                periodoValor,
                predioId,
                vehiculoId,
                fila.getString("referencia_externa"),
                new Dinero(fila.getBigDecimal("insoluto")),
                new Dinero(fila.getBigDecimal("reajuste")),
                new Dinero(fila.getBigDecimal("interes")),
                new Dinero(fila.getBigDecimal("gasto")));
    }

    private static String usuarioActual() {
        Origen origen = OrigenContext.actual();
        return origen.usuario();
    }
}
