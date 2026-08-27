package pe.gob.sgtm.valores.dobles;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import pe.gob.sgtm.valores.dominio.MovimientoDeValor;
import pe.gob.sgtm.valores.dominio.MovimientoDeValorRepository;
import pe.gob.sgtm.valores.dominio.TipoDeMovimiento;

/**
 * Un {@link MovimientoDeValorRepository} en memoria.
 *
 * <p>Imita el {@code ON CONFLICT DO NOTHING} del indice unico parcial: si ya hay pase para ese
 * valor, devuelve el que habia. Que la <b>garantia</b> sea de la base y no de este {@code if} lo
 * demuestra {@code NotificacionYPaseJdbcTest} con dos peticiones concurrentes de verdad; aqui solo
 * se imita para que el caso de uso se pueda probar sin PostgreSQL.
 */
public final class MovimientosEnMemoria implements MovimientoDeValorRepository {

    private final List<MovimientoDeValor> guardados = new ArrayList<>();
    private long siguienteId = 1;

    @Override
    public MovimientoDeValor registrarPase(MovimientoDeValor movimiento) {
        Optional<MovimientoDeValor> existente = paseDe(movimiento.valorId());
        if (existente.isPresent()) {
            return existente.get();
        }
        MovimientoDeValor conId =
                new MovimientoDeValor(
                        siguienteId++,
                        movimiento.valorId(),
                        movimiento.tipo(),
                        movimiento.fecha(),
                        movimiento.notificacionId(),
                        movimiento.exigibleDesde(),
                        "prueba",
                        movimiento.observacion());
        guardados.add(conId);
        return conId;
    }

    @Override
    public Optional<MovimientoDeValor> paseDe(long valorId) {
        return guardados.stream()
                .filter(m -> m.valorId() == valorId && m.tipo() == TipoDeMovimiento.PCO)
                .findFirst();
    }

    @Override
    public List<MovimientoDeValor> deValor(long valorId) {
        return guardados.stream().filter(m -> m.valorId() == valorId).toList();
    }

    /** Cuantos movimientos hay en total, para comprobar que el pase repetido no creo otro. */
    public int cuantos() {
        return guardados.size();
    }
}
