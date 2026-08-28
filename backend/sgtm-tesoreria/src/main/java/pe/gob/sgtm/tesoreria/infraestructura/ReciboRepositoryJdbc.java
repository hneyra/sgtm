package pe.gob.sgtm.tesoreria.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.persistencia.RepositorioJdbc;
import pe.gob.sgtm.tesoreria.dominio.Caja;
import pe.gob.sgtm.tesoreria.dominio.FormaDePago;
import pe.gob.sgtm.tesoreria.dominio.LineaDeRecibo;
import pe.gob.sgtm.tesoreria.dominio.NumeroDeRecibo;
import pe.gob.sgtm.tesoreria.dominio.Recibo;
import pe.gob.sgtm.tesoreria.dominio.ReciboRepository;
import pe.gob.sgtm.tesoreria.dominio.TipoDePago;

/**
 * Los recibos contra PostgreSQL (V3, V29).
 *
 * <p><b>Solo inserta.</b> No hay aqui ni un {@code UPDATE recibo} ni un {@code DELETE}: V29 le
 * retira a {@code sgtm_app} el privilegio de actualizar y V7 nunca le dio el de borrar, y el
 * escaner de fuentes rechaza esas dos cadenas antes de que lleguen a ejecutarse (regla 4, RNF-051).
 * Un recibo equivocado se anula con un movimiento que se agrega (#34).
 */
@Repository
public class ReciboRepositoryJdbc extends RepositorioJdbc implements ReciboRepository {

    private static final String COLUMNAS =
            "id, serie, numero, caja_id, turno_id, cajero, contribuyente_id, fecha, forma_pago,"
                    + " tipo_pago, campania_beneficio, actualizado_a, observacion";

    private static final String COLUMNAS_DETALLE =
            "tributo, concepto, ejercicio, periodo, tasa_id, predio_id, vehiculo_id,"
                    + " referencia_externa, cantidad, precio_unitario, insoluto, reajuste, interes,"
                    + " gasto";

    public ReciboRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    /**
     * Reserva el siguiente correlativo de la serie de esa caja.
     *
     * <p>Una sola sentencia, nunca {@code SELECT} + {@code UPDATE}. El {@code DO UPDATE} bloquea la
     * fila del contador mientras la incrementa, asi que dos cobranzas de la misma serie se
     * serializan en el motor y salen con numeros consecutivos. Con dos sentencias, las dos leerian
     * el mismo numero y la segunda chocaria contra {@code recibo_numero_uq}.
     */
    @Override
    public NumeroDeRecibo siguienteNumero(Caja caja) {
        Long ultimo =
                jdbc().sql(
                                "INSERT INTO recibo_correlativo (municipalidad_id, serie, ultimo)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :serie, 1)"
                                        + " ON CONFLICT (municipalidad_id, serie)"
                                        + " DO UPDATE SET ultimo = recibo_correlativo.ultimo + 1"
                                        + " RETURNING ultimo")
                        .param("serie", caja.serie())
                        .query(Long.class)
                        .single();
        return caja.numero(Objects.requireNonNull(ultimo));
    }

    @Override
    public Recibo emitir(Recibo recibo, @Nullable String claveDeIdempotencia) {
        if (recibo.id() != null) {
            throw new IllegalArgumentException(
                    "Un recibo ya emitido no se vuelve a insertar ni se corrige: se anula (#34)");
        }

        Long id =
                jdbc().sql(
                                "INSERT INTO recibo"
                                        + " (municipalidad_id, serie, numero, caja_id, turno_id,"
                                        + "  cajero, contribuyente_id, fecha, forma_pago, tipo_pago,"
                                        + "  campania_beneficio, total, actualizado_a,"
                                        + "  clave_idempotencia, usuario_registro, observacion)"
                                        + " VALUES ("
                                        + MUNICIPALIDAD_ACTUAL
                                        + ", :serie, :numero, :caja, :turno, :cajero, :contribuyente,"
                                        + "  :fecha, :formaPago, :tipoPago, :campania, :total,"
                                        + "  :actualizadoA, :clave, :usuario, :observacion)"
                                        + " RETURNING id")
                        .param("serie", recibo.numero().serie())
                        .param("numero", recibo.numero().numero())
                        .param("caja", recibo.cajaId())
                        .param("turno", recibo.turnoId())
                        .param("cajero", recibo.cajero())
                        .param("contribuyente", recibo.contribuyenteId())
                        .param("fecha", Timestamp.from(recibo.emitidoEn()))
                        .param("formaPago", recibo.formaDePago().name())
                        .param("tipoPago", recibo.tipoDePago().name())
                        .param("campania", recibo.campaniaBeneficio())
                        .param("total", recibo.total().valor())
                        .param("actualizadoA", recibo.actualizadoA())
                        .param("clave", claveDeIdempotencia)
                        .param("usuario", UsuarioDeLaSesion.actual())
                        .param("observacion", recibo.observacion().texto())
                        .query(Long.class)
                        .single();

        for (LineaDeRecibo linea : recibo.lineas()) {
            insertarLinea(Objects.requireNonNull(id), linea);
        }

        return new Recibo(
                id,
                recibo.numero(),
                recibo.cajaId(),
                recibo.turnoId(),
                recibo.cajero(),
                recibo.contribuyenteId(),
                recibo.emitidoEn(),
                recibo.formaDePago(),
                recibo.tipoDePago(),
                recibo.campaniaBeneficio(),
                recibo.actualizadoA(),
                recibo.observacion(),
                recibo.lineas());
    }

    @Override
    public Optional<Recibo> porClaveDeIdempotencia(String clave) {
        return jdbc().sql("SELECT " + COLUMNAS + " FROM recibo WHERE clave_idempotencia = :clave")
                .param("clave", clave)
                .query(ReciboRepositoryJdbc::mapearCabecera)
                .optional()
                .map(this::conDetalle);
    }

    @Override
    public Optional<Recibo> porNumero(NumeroDeRecibo numero) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM recibo WHERE serie = :serie AND numero = :numero")
                .param("serie", numero.serie())
                .param("numero", numero.numero())
                .query(ReciboRepositoryJdbc::mapearCabecera)
                .optional()
                .map(this::conDetalle);
    }

    // ------------------------------------------------------------------

    private void insertarLinea(long reciboId, LineaDeRecibo linea) {
        jdbc().sql(
                        "INSERT INTO recibo_detalle"
                                + " (municipalidad_id, recibo_id, tributo, concepto, ejercicio,"
                                + "  periodo, tasa_id, predio_id, vehiculo_id, referencia_externa,"
                                + "  cantidad, precio_unitario, monto, insoluto, reajuste, interes,"
                                + "  gasto)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :recibo, :tributo, :concepto, :ejercicio, :periodo, :tasa,"
                                + "  :predio, :vehiculo, :referencia, :cantidad, :precio, :monto,"
                                + "  :insoluto, :reajuste, :interes, :gasto)")
                .param("recibo", reciboId)
                .param("tributo", linea.tributo())
                .param("concepto", linea.concepto())
                .param("ejercicio", linea.ejercicio() == null ? null : linea.ejercicio().valor())
                .param("periodo", linea.periodo())
                .param("tasa", linea.tasaId())
                .param("predio", linea.predioId())
                .param("vehiculo", linea.vehiculoId())
                .param("referencia", linea.referenciaExterna())
                .param("cantidad", linea.cantidad())
                .param(
                        "precio",
                        linea.precioUnitario() == null ? null : linea.precioUnitario().valor())
                .param("monto", linea.monto().valor())
                .param("insoluto", linea.insoluto().valor())
                .param("reajuste", linea.reajuste().valor())
                .param("interes", linea.interes().valor())
                .param("gasto", linea.gasto().valor())
                .update();
    }

    private Recibo conDetalle(Cabecera cabecera) {
        List<LineaDeRecibo> lineas =
                jdbc().sql(
                                "SELECT "
                                        + COLUMNAS_DETALLE
                                        + " FROM recibo_detalle WHERE recibo_id = :recibo"
                                        + " ORDER BY id")
                        .param("recibo", cabecera.id())
                        .query(ReciboRepositoryJdbc::mapearLinea)
                        .list();
        return new Recibo(
                cabecera.id(),
                cabecera.numero(),
                cabecera.cajaId(),
                cabecera.turnoId(),
                cabecera.cajero(),
                cabecera.contribuyenteId(),
                cabecera.emitidoEn(),
                cabecera.formaDePago(),
                cabecera.tipoDePago(),
                cabecera.campaniaBeneficio(),
                cabecera.actualizadoA(),
                cabecera.observacion(),
                lineas);
    }

    /**
     * La fila de {@code recibo} sin su detalle.
     *
     * <p>Existe porque {@link Recibo} exige al menos una linea —un recibo sin desglose no documenta
     * nada— y por tanto no se puede construir a medias. Mapear a este tipo intermedio y completarlo
     * en {@link #conDetalle} es lo que evita tener que inventarse una linea de relleno que despues
     * alguien encuentre en produccion.
     */
    private record Cabecera(
            long id,
            NumeroDeRecibo numero,
            long cajaId,
            long turnoId,
            String cajero,
            long contribuyenteId,
            java.time.Instant emitidoEn,
            FormaDePago formaDePago,
            TipoDePago tipoDePago,
            @Nullable String campaniaBeneficio,
            java.time.LocalDate actualizadoA,
            Observacion observacion) {}

    private static Cabecera mapearCabecera(ResultSet fila, int numeroDeFila) throws SQLException {
        return new Cabecera(
                fila.getLong("id"),
                new NumeroDeRecibo(fila.getString("serie"), fila.getLong("numero")),
                fila.getLong("caja_id"),
                fila.getLong("turno_id"),
                fila.getString("cajero"),
                fila.getLong("contribuyente_id"),
                fila.getTimestamp("fecha").toInstant(),
                FormaDePago.valueOf(fila.getString("forma_pago").strip()),
                TipoDePago.valueOf(fila.getString("tipo_pago").strip()),
                fila.getString("campania_beneficio"),
                fila.getDate("actualizado_a").toLocalDate(),
                Observacion.de(fila.getString("observacion")));
    }

    private static LineaDeRecibo mapearLinea(ResultSet fila, int numeroDeFila) throws SQLException {
        int ejercicio = fila.getInt("ejercicio");
        Ejercicio delEjercicio = fila.wasNull() ? null : new Ejercicio(ejercicio);
        int periodo = fila.getInt("periodo");
        Integer laCuota = fila.wasNull() ? null : periodo;
        long tasa = fila.getLong("tasa_id");
        Long tasaId = fila.wasNull() ? null : tasa;
        long predio = fila.getLong("predio_id");
        Long predioId = fila.wasNull() ? null : predio;
        long vehiculo = fila.getLong("vehiculo_id");
        Long vehiculoId = fila.wasNull() ? null : vehiculo;
        int cantidad = fila.getInt("cantidad");
        Integer cuantas = fila.wasNull() ? null : cantidad;
        java.math.BigDecimal precio = fila.getBigDecimal("precio_unitario");

        return new LineaDeRecibo(
                fila.getString("tributo"),
                fila.getString("concepto"),
                delEjercicio,
                laCuota,
                tasaId,
                predioId,
                vehiculoId,
                fila.getString("referencia_externa"),
                cuantas,
                precio == null ? null : new Dinero(precio),
                new Dinero(fila.getBigDecimal("insoluto")),
                new Dinero(fila.getBigDecimal("reajuste")),
                new Dinero(fila.getBigDecimal("interes")),
                new Dinero(fila.getBigDecimal("gasto")));
    }
}
