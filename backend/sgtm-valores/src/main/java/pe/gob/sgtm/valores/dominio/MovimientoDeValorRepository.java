package pe.gob.sgtm.valores.dominio;

import java.util.List;
import java.util.Optional;

/**
 * Los movimientos de un valor hacia coactiva.
 *
 * <p>Ningun metodo recibe la municipalidad (regla 2), y no hay ninguno que actualice ni que borre:
 * un movimiento equivocado se corrige con otro movimiento.
 */
public interface MovimientoDeValorRepository {

    /**
     * Registra el movimiento, o devuelve el que ya existia.
     *
     * <p><b>Es la idempotencia del AC de #39, y por eso devuelve el existente en vez de fallar:</b>
     * pasar dos veces el mismo valor a coactiva no puede crear dos expedientes. La garantia la da
     * el indice unico parcial de V28 —{@code ON CONFLICT} sobre el, no un {@code SELECT} previo—,
     * porque dos peticiones simultaneas pasan las dos por cualquier comprobacion escrita en Java.
     *
     * @return el movimiento guardado, o el que ya estaba si este valor ya se habia pasado
     */
    MovimientoDeValor registrarPase(MovimientoDeValor movimiento);

    /** El pase a coactiva de este valor, si ya se dio. */
    Optional<MovimientoDeValor> paseDe(long valorId);

    /** Todos los movimientos del valor, del primero al ultimo. */
    List<MovimientoDeValor> deValor(long valorId);
}
