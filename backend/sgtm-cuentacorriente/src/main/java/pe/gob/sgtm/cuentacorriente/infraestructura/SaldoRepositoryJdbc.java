package pe.gob.sgtm.cuentacorriente.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * La proyeccion del saldo contra PostgreSQL (#23).
 *
 * <p>{@link #proyectar} es un {@code INSERT ... ON CONFLICT DO UPDATE} sobre {@code saldo_uq}, y
 * escribe el <b>total recalculado</b>, no un incremento. El motivo esta en {@link
 * SaldoRepository#proyectar}: sumar seria correcto solo aplicandose exactamente una vez por
 * asiento, y un reintento de la transaccion bastaria para dejar la proyeccion mal sin que nada
 * fallara.
 *
 * <p>El indice unico usa {@code COALESCE(predio_id, 0)} y {@code COALESCE(vehiculo_id, 0)} (V2),
 * asi que la clausula {@code ON CONFLICT} tiene que nombrar la <b>misma</b> expresion: con las
 * columnas a secas PostgreSQL no reconoce el indice y el {@code INSERT} falla por conflicto no
 * resuelto —dos nulos nunca colisionan en un indice unico ordinario, que es justo por lo que V2 lo
 * escribio asi—.
 */
@Repository
public class SaldoRepositoryJdbc extends RepositorioJdbc implements SaldoRepository {

    private static final String COLUMNAS =
            "contribuyente_id, tributo, ejercicio, periodo, predio_id, vehiculo_id,"
                    + " insoluto_saldo, fase, ultimo_asiento_id, fecha_calculo";

    public SaldoRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<SaldoProyectado> buscar(ClaveDeSaldo clave) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM saldo_proyectado"
                                + " WHERE contribuyente_id = :contribuyente"
                                + "   AND tributo = :tributo"
                                + "   AND ejercicio = :ejercicio"
                                + "   AND periodo = :periodo"
                                + "   AND COALESCE(predio_id, 0) = :predio"
                                + "   AND COALESCE(vehiculo_id, 0) = :vehiculo")
                .param("contribuyente", clave.contribuyenteId())
                .param("tributo", clave.tributo())
                .param("ejercicio", clave.ejercicio().valor())
                .param("periodo", clave.periodo())
                .param("predio", clave.predioId() == null ? 0L : clave.predioId())
                .param("vehiculo", clave.vehiculoId() == null ? 0L : clave.vehiculoId())
                .query(SaldoRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public List<SaldoProyectado> deContribuyente(long contribuyenteId) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM saldo_proyectado"
                                + " WHERE contribuyente_id = :contribuyente"
                                + " ORDER BY tributo, ejercicio, periodo")
                .param("contribuyente", contribuyenteId)
                .query(SaldoRepositoryJdbc::mapear)
                .list();
    }

    @Override
    public void proyectar(SaldoProyectado saldo) {
        ClaveDeSaldo clave = saldo.clave();
        jdbc().sql(
                        "INSERT INTO saldo_proyectado"
                                + " (municipalidad_id, contribuyente_id, tributo, ejercicio,"
                                + "  periodo, predio_id, vehiculo_id, insoluto_saldo, fase,"
                                + "  ultimo_asiento_id, fecha_calculo)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :contribuyente, :tributo,"
                                + "  :ejercicio, :periodo, :predio, :vehiculo, :saldo, :fase,"
                                + "  :ultimoAsiento, :fechaCalculo)"
                                + " ON CONFLICT (municipalidad_id, contribuyente_id, tributo,"
                                + "              ejercicio, periodo, COALESCE(predio_id, 0),"
                                + "              COALESCE(vehiculo_id, 0))"
                                + " DO UPDATE SET insoluto_saldo = EXCLUDED.insoluto_saldo,"
                                + "               fase = EXCLUDED.fase,"
                                + "               ultimo_asiento_id = EXCLUDED.ultimo_asiento_id,"
                                + "               fecha_calculo = EXCLUDED.fecha_calculo")
                .param("contribuyente", clave.contribuyenteId())
                .param("tributo", clave.tributo())
                .param("ejercicio", clave.ejercicio().valor())
                .param("periodo", clave.periodo())
                .param("predio", clave.predioId())
                .param("vehiculo", clave.vehiculoId())
                .param("saldo", saldo.insolutoSaldo().valor())
                .param("fase", saldo.fase().name())
                .param("ultimoAsiento", saldo.ultimoAsientoId())
                .param("fechaCalculo", java.sql.Timestamp.from(saldo.fechaCalculo()))
                .update();
    }

    private static SaldoProyectado mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        long predio = fila.getLong("predio_id");
        Long predioId = fila.wasNull() ? null : predio;
        long vehiculo = fila.getLong("vehiculo_id");
        Long vehiculoId = fila.wasNull() ? null : vehiculo;
        long ultimo = fila.getLong("ultimo_asiento_id");
        Long ultimoAsientoId = fila.wasNull() ? null : ultimo;

        return new SaldoProyectado(
                new ClaveDeSaldo(
                        fila.getLong("contribuyente_id"),
                        fila.getString("tributo"),
                        new Ejercicio(fila.getInt("ejercicio")),
                        fila.getInt("periodo"),
                        predioId,
                        vehiculoId),
                new Dinero(fila.getBigDecimal("insoluto_saldo")),
                Fase.valueOf(fila.getString("fase").strip()),
                ultimoAsientoId,
                fila.getTimestamp("fecha_calculo").toInstant());
    }
}
