package pe.gob.sgtm.tesoreria.dobles;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.tesoreria.dominio.EstadoDeTurno;
import pe.gob.sgtm.tesoreria.dominio.TurnoDeCaja;
import pe.gob.sgtm.tesoreria.dominio.TurnoDeCajaRepository;

/**
 * Los turnos, en memoria.
 *
 * <p>El bloqueo no se simula, y es deliberado: un doble no puede demostrar un {@code FOR UPDATE}.
 * Lo que este doble sirve es para probar las decisiones del caso de uso —que abrir dos veces no
 * duplique, que un turno cerrado se rechace—; la serializacion de verdad la prueba {@code
 * CajaJdbcTest} contra PostgreSQL, con hilos.
 */
public final class TurnosEnMemoria implements TurnoDeCajaRepository {

    private final Map<String, TurnoDeCaja> turnos = new LinkedHashMap<>();
    private long siguienteId = 1;

    /** Deja sembrado un turno ya cerrado, para probar que la cobranza lo rechaza. */
    public TurnosEnMemoria conTurnoCerrado(long cajaId, String cajero, LocalDate fecha) {
        long id = siguienteId++;
        turnos.put(
                clave(cajaId, cajero, fecha),
                new TurnoDeCaja(id, cajaId, cajero, fecha, EstadoDeTurno.CERRADO));
        return this;
    }

    /** Cuantos turnos se han abierto: lo que delata una apertura duplicada. */
    public int cuantos() {
        return turnos.size();
    }

    @Override
    public TurnoDeCaja abrir(
            long cajaId,
            String cajero,
            LocalDate fecha,
            Instant apertura,
            Observacion observacion) {
        return turnos.computeIfAbsent(
                clave(cajaId, cajero, fecha),
                k -> new TurnoDeCaja(siguienteId++, cajaId, cajero, fecha, EstadoDeTurno.ABIERTO));
    }

    @Override
    public Optional<TurnoDeCaja> bloquear(long cajaId, String cajero, LocalDate fecha) {
        return Optional.ofNullable(turnos.get(clave(cajaId, cajero, fecha)));
    }

    private static String clave(long cajaId, String cajero, LocalDate fecha) {
        return cajaId + "|" + cajero + "|" + fecha;
    }
}
