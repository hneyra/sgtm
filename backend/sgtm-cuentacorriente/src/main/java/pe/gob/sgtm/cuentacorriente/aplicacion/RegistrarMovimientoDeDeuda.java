package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.DeudaActualizada;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * Altas (nota de abono) y bajas (nota de cargo) de deuda (RF-043, RF-044, #24).
 *
 * <p>Las dos producen <b>asientos</b>, nunca un {@code UPDATE} de deuda existente: la traduccion la
 * hace {@link MovimientoDeDeuda#enAsientos}, y el libro no admite otra cosa (V7). Cada asiento pasa
 * por {@link RegistrarAsiento}, que es lo que mantiene la auditoria, el {@code motivo} del asiento
 * y el saldo proyectado en la misma transaccion.
 *
 * <h2>Una baja no puede quitar mas de lo que hay</h2>
 *
 * <p>{@link #registrar} comprueba, parte por parte, que la baja no exceda la deuda vigente <b>a su
 * fecha valor</b>, usando {@link CalculoDeDeuda#deudaActualizadaA} —la funcion de #22—. Comparar
 * contra «la deuda» sin fecha no significaria nada (regla 9), y comparar solo el total dejaria
 * pasar una baja que extingue S/ 500 de interes inexistente compensandolos con insoluto que si
 * existe: el total cuadraria y el desglose quedaria mal.
 *
 * <p>Un alta no tiene ese limite: incorporar deuda que no estaba es exactamente para lo que existe.
 */
@Service
public class RegistrarMovimientoDeDeuda {

    private final AsientoRepository asientos;
    private final RegistrarAsiento registrarAsiento;
    private final CalculoDeDeuda calculo;
    private final PoliticaDeRedondeo redondeo;

    public RegistrarMovimientoDeDeuda(
            AsientoRepository asientos,
            RegistrarAsiento registrarAsiento,
            CalculoDeDeuda calculo,
            PoliticaDeRedondeo redondeo) {
        this.asientos = asientos;
        this.registrarAsiento = registrarAsiento;
        this.calculo = calculo;
        this.redondeo = redondeo;
    }

    /**
     * Registra el movimiento y devuelve los asientos que produjo.
     *
     * <p>{@code @Transactional} aqui y no solo en {@link RegistrarAsiento}: un movimiento con
     * desglose produce varios asientos, y o entran todos o no entra ninguno. Media baja asentada
     * —el insoluto si, el interes no— dejaria una deuda que no corresponde ni a antes ni a despues,
     * y sin nada que dijera que falto la otra mitad.
     *
     * @param observacion por que se registra; sin ella no se guarda (regla 10, RNF-052)
     */
    @Transactional
    public List<Asiento> registrar(MovimientoDeDeuda movimiento, Observacion observacion) {
        if (movimiento.sentido() == SentidoDelMovimiento.BAJA) {
            verificarQueNoExcedeLaDeuda(movimiento);
        }

        List<Asiento> guardados = new ArrayList<>();
        for (Asiento asiento : movimiento.enAsientos()) {
            guardados.add(registrarAsiento.asentar(asiento, observacion));
        }
        return List.copyOf(guardados);
    }

    private void verificarQueNoExcedeLaDeuda(MovimientoDeDeuda movimiento) {
        ClaveDeSaldo clave = movimiento.clave();
        // Por la obligacion y no por CriterioDeDeuda: ese criterio busca por codigo de
        // contribuyente —es lo que teclea quien atiende— y aqui ya se tiene el
        // identificador. La fecha de corte es la fecha valor de la propia baja: se
        // compara contra lo que se debia el dia que la baja surte efecto, no hoy.
        DeudaActualizada vigente =
                calculo.deudaActualizadaA(
                        asientos.deLaObligacion(clave), movimiento.fechaValor(), redondeo);

        comprobar("insoluto", movimiento.insoluto(), vigente.insoluto());
        comprobar("reajuste", movimiento.reajuste(), vigente.reajuste());
        comprobar("interes", movimiento.interes(), vigente.interes());
        comprobar("gasto", movimiento.gasto(), vigente.gasto());
    }

    private static void comprobar(String parte, Dinero seDaDeBaja, Dinero vigente) {
        if (seDaDeBaja.esMayorQue(vigente)) {
            throw new BajaMayorQueLaDeuda(parte, seDaDeBaja, vigente);
        }
    }

    /**
     * Se intento dar de baja mas de lo que se debe. Dejarlo pasar produciria una deuda negativa que
     * nadie sabria explicar, y que la siguiente emision arrastraria como saldo a favor.
     */
    public static final class BajaMayorQueLaDeuda extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        BajaMayorQueLaDeuda(String parte, Dinero seDaDeBaja, Dinero vigente) {
            super(
                    "La baja de "
                            + parte
                            + " es de "
                            + seDaDeBaja
                            + " y a esa fecha solo se deben "
                            + vigente
                            + ". Una baja no puede extinguir mas de lo que hay");
        }
    }
}
