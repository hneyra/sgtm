package pe.gob.sgtm.cuentacorriente.infraestructura;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.persistencia.RepositorioJdbc;

/**
 * La cache del saldo contra PostgreSQL.
 *
 * <p><b>La suma la hace el motor, no Java.</b> Es la diferencia entre una cache que aguanta dos
 * cajas cobrando a la vez y una que se desajusta la primera tarde de vencimiento: un «leer, sumar,
 * escribir» desde la aplicacion pierde uno de los dos pagos sin que nada falle.
 *
 * <p><b>Y la reconstruccion la calcula el motor tambien</b>, con un {@code SUM} agrupado sobre el
 * libro. Traerse los asientos para sumarlos en Java daria el mismo numero y ademas obligaria a
 * mantener dos implementaciones de «cuanto suma esto» que un dia dirian cosas distintas — que es
 * exactamente el fallo que la conciliacion busca.
 */
@Repository
public class SaldoRepositoryJdbc extends RepositorioJdbc implements SaldoRepository {

    private static final String COLUMNAS =
            "id, contribuyente_id, tributo, ejercicio, periodo, fase, predio_id, vehiculo_id,"
                    + " insoluto_saldo, ultimo_asiento_id, fecha_calculo";

    /**
     * El saldo de una clave segun el libro: cargos menos abonos.
     *
     * <p>El signo sale del {@code tipo} y no del importe, porque el libro guarda todo en positivo
     * (ver {@code TipoAsiento}). {@code COALESCE(periodo, 0)} normaliza el periodo anual, que el
     * asiento admite nulo y el saldo no.
     */
    private static final String SUMA_DEL_LIBRO =
            "SELECT contribuyente_id, tributo, ejercicio, COALESCE(periodo, 0) AS periodo, fase,"
                    + "       predio_id, vehiculo_id,"
                    + "       SUM(CASE WHEN tipo = 'CARGO' THEN monto ELSE -monto END)"
                    + "           AS insoluto_saldo,"
                    + "       MAX(id) AS ultimo_asiento_id"
                    + "  FROM cuenta_corriente_asiento"
                    + " WHERE contribuyente_id = :contribuyente AND ejercicio = :ejercicio"
                    + " GROUP BY contribuyente_id, tributo, ejercicio, COALESCE(periodo, 0), fase,"
                    + "          predio_id, vehiculo_id";

    public SaldoRepositoryJdbc(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<SaldoProyectado> de(ClaveDeSaldo clave) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM saldo_proyectado"
                                + " WHERE contribuyente_id = :contribuyente"
                                + "   AND tributo = :tributo AND ejercicio = :ejercicio"
                                + "   AND periodo = :periodo AND fase = :fase"
                                + "   AND predio_id IS NOT DISTINCT FROM :predio"
                                + "   AND vehiculo_id IS NOT DISTINCT FROM :vehiculo")
                .param("contribuyente", clave.contribuyenteId())
                .param("tributo", clave.tributo())
                .param("ejercicio", clave.ejercicio().valor())
                .param("periodo", clave.periodo())
                .param("fase", clave.fase().name())
                .param("predio", clave.predioId())
                .param("vehiculo", clave.vehiculoId())
                .query(SaldoRepositoryJdbc::mapear)
                .optional();
    }

    @Override
    public List<SaldoProyectado> deContribuyente(long contribuyenteId, Ejercicio ejercicio) {
        return jdbc().sql(
                        "SELECT "
                                + COLUMNAS
                                + " FROM saldo_proyectado"
                                + " WHERE contribuyente_id = :contribuyente"
                                + "   AND ejercicio = :ejercicio"
                                + " ORDER BY tributo, periodo, fase, id")
                .param("contribuyente", contribuyenteId)
                .param("ejercicio", ejercicio.valor())
                .query(SaldoRepositoryJdbc::mapear)
                .list();
    }

    @Override
    public SaldoProyectado aplicar(Asiento asiento) {
        ClaveDeSaldo clave = ClaveDeSaldo.de(asiento);
        // El signo va aqui y no en el monto: el libro guarda todo en positivo.
        java.math.BigDecimal delta =
                asiento.tipo() == TipoAsiento.CARGO
                        ? asiento.monto().valor()
                        : asiento.monto().valor().negate();

        jdbc().sql(
                        "INSERT INTO saldo_proyectado"
                                + " (municipalidad_id, contribuyente_id, tributo, ejercicio,"
                                + "  periodo, fase, predio_id, vehiculo_id, insoluto_saldo,"
                                + "  ultimo_asiento_id, fecha_calculo)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :contribuyente, :tributo, :ejercicio, :periodo, :fase,"
                                + "  :predio, :vehiculo, :delta, :asiento, now())"
                                + " ON CONFLICT (municipalidad_id, contribuyente_id, tributo,"
                                + "              ejercicio, periodo, fase, predio_id, vehiculo_id)"
                                + " DO UPDATE SET"
                                + "   insoluto_saldo = saldo_proyectado.insoluto_saldo + :delta,"
                                + "   ultimo_asiento_id ="
                                + "       GREATEST(COALESCE(saldo_proyectado.ultimo_asiento_id, 0),"
                                + "                :asiento),"
                                + "   fecha_calculo = now()")
                .param("contribuyente", clave.contribuyenteId())
                .param("tributo", clave.tributo())
                .param("ejercicio", clave.ejercicio().valor())
                .param("periodo", clave.periodo())
                .param("fase", clave.fase().name())
                .param("predio", clave.predioId())
                .param("vehiculo", clave.vehiculoId())
                .param("delta", delta)
                .param("asiento", asiento.id())
                .update();

        return de(clave).orElseThrow(() -> new IllegalStateException(saldoQueNoSeEscribio(clave)));
    }

    @Override
    public List<SaldoProyectado> segunElLibro(long contribuyenteId, Ejercicio ejercicio) {
        return jdbc().sql(SUMA_DEL_LIBRO + " ORDER BY tributo, periodo, fase")
                .param("contribuyente", contribuyenteId)
                .param("ejercicio", ejercicio.valor())
                .query(SaldoRepositoryJdbc::mapearDelLibro)
                .list();
    }

    @Override
    public List<SaldoProyectado> reconstruir(long contribuyenteId, Ejercicio ejercicio) {
        List<SaldoProyectado> antes = deContribuyente(contribuyenteId, ejercicio);
        List<SaldoProyectado> segunElLibro = segunElLibro(contribuyenteId, ejercicio);

        // Primero se pone a cero TODO lo que la cache tiene de este contribuyente y ejercicio.
        // Sin este paso, una clave que el libro ya no tiene —porque sus asientos se reversaron a
        // otro ejercicio— se quedaria con su importe viejo y la reconstruccion no la tocaria:
        // el defecto mas silencioso posible, porque el total sigue pareciendo razonable.
        //
        // Se pone en cero y no se borra: saldo_proyectado no tiene privilegio de DELETE, y una
        // fila en cero dice «aqui hubo deuda y esta saldada» donde su ausencia no dice nada.
        jdbc().sql(
                        "UPDATE saldo_proyectado SET insoluto_saldo = 0, ultimo_asiento_id = NULL,"
                                + " fecha_calculo = now()"
                                + " WHERE contribuyente_id = :contribuyente"
                                + "   AND ejercicio = :ejercicio")
                .param("contribuyente", contribuyenteId)
                .param("ejercicio", ejercicio.valor())
                .update();

        for (SaldoProyectado real : segunElLibro) {
            escribirExacto(real);
        }

        List<SaldoProyectado> despues = deContribuyente(contribuyenteId, ejercicio);
        return cambiados(antes, despues);
    }

    @Override
    public List<Long> contribuyentesConMovimiento(
            Ejercicio ejercicio, long desdeExclusive, int cuantos) {
        if (cuantos < 1) {
            throw new IllegalArgumentException(
                    "Pedir «cero contribuyentes» detiene el recorrido en silencio: " + cuantos);
        }
        // El mapeo explicito, y no query(Long.class), porque la columna es NOT NULL y el
        // verificador de nulidad no lo sabe: sin esto la lista sale como List<@Nullable Long> y
        // contagia el nulo a todo el recorrido.
        return jdbc().sql(
                        "SELECT DISTINCT contribuyente_id FROM cuenta_corriente_asiento"
                                + " WHERE ejercicio = :ejercicio"
                                + "   AND contribuyente_id > :desde"
                                + " ORDER BY contribuyente_id"
                                + " LIMIT :cuantos")
                .param("ejercicio", ejercicio.valor())
                .param("desde", desdeExclusive)
                .param("cuantos", cuantos)
                .query((fila, numero) -> fila.getLong("contribuyente_id"))
                .list();
    }

    // ------------------------------------------------------------------

    /** Escribe el importe <b>exacto</b> de una clave. Solo la reconstruccion hace esto. */
    private void escribirExacto(SaldoProyectado real) {
        ClaveDeSaldo clave = real.clave();
        jdbc().sql(
                        "INSERT INTO saldo_proyectado"
                                + " (municipalidad_id, contribuyente_id, tributo, ejercicio,"
                                + "  periodo, fase, predio_id, vehiculo_id, insoluto_saldo,"
                                + "  ultimo_asiento_id, fecha_calculo)"
                                + " VALUES ("
                                + MUNICIPALIDAD_ACTUAL
                                + ", :contribuyente, :tributo, :ejercicio, :periodo, :fase,"
                                + "  :predio, :vehiculo, :importe, :asiento, now())"
                                + " ON CONFLICT (municipalidad_id, contribuyente_id, tributo,"
                                + "              ejercicio, periodo, fase, predio_id, vehiculo_id)"
                                + " DO UPDATE SET insoluto_saldo = :importe,"
                                + "               ultimo_asiento_id = :asiento,"
                                + "               fecha_calculo = now()")
                .param("contribuyente", clave.contribuyenteId())
                .param("tributo", clave.tributo())
                .param("ejercicio", clave.ejercicio().valor())
                .param("periodo", clave.periodo())
                .param("fase", clave.fase().name())
                .param("predio", clave.predioId())
                .param("vehiculo", clave.vehiculoId())
                .param("importe", real.insoluto().valor())
                .param("asiento", real.ultimoAsientoId())
                .update();
    }

    /** Las claves cuyo importe cambio. Es lo que la reconstruccion informa. */
    private static List<SaldoProyectado> cambiados(
            List<SaldoProyectado> antes, List<SaldoProyectado> despues) {
        List<SaldoProyectado> distintos = new ArrayList<>();
        for (SaldoProyectado ahora : despues) {
            Optional<SaldoProyectado> anterior =
                    antes.stream().filter(uno -> uno.clave().equals(ahora.clave())).findFirst();
            if (anterior.isEmpty() || !anterior.get().insoluto().equals(ahora.insoluto())) {
                distintos.add(ahora);
            }
        }
        return List.copyOf(distintos);
    }

    private static String saldoQueNoSeEscribio(ClaveDeSaldo clave) {
        return "Se aplico un asiento sobre "
                + clave
                + " y despues no hay saldo: o la politica RLS no dejo leerlo, o el contexto de"
                + " municipalidad cambio en medio de la transaccion";
    }

    private static SaldoProyectado mapear(ResultSet fila, int numeroDeFila) throws SQLException {
        return new SaldoProyectado(
                fila.getLong("id"),
                clave(fila),
                new Dinero(fila.getBigDecimal("insoluto_saldo")),
                identificador(fila, "ultimo_asiento_id"),
                fila.getObject("fecha_calculo", java.time.OffsetDateTime.class));
    }

    private static SaldoProyectado mapearDelLibro(ResultSet fila, int numeroDeFila)
            throws SQLException {
        return new SaldoProyectado(
                null,
                clave(fila),
                new Dinero(fila.getBigDecimal("insoluto_saldo")),
                identificador(fila, "ultimo_asiento_id"),
                null);
    }

    private static ClaveDeSaldo clave(ResultSet fila) throws SQLException {
        return new ClaveDeSaldo(
                fila.getLong("contribuyente_id"),
                fila.getString("tributo"),
                new Ejercicio(fila.getInt("ejercicio")),
                fila.getInt("periodo"),
                Fase.valueOf(fila.getString("fase")),
                identificador(fila, "predio_id"),
                identificador(fila, "vehiculo_id"));
    }

    private static @Nullable Long identificador(ResultSet fila, String columna)
            throws SQLException {
        long valor = fila.getLong(columna);
        return fila.wasNull() ? null : valor;
    }
}
