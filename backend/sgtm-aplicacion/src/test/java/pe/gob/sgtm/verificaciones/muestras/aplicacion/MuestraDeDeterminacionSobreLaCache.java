package pe.gob.sgtm.verificaciones.muestras.aplicacion;

import java.util.List;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.parametros.MotorDeReglas;

/**
 * Viola {@code QUIEN_DETERMINA_NO_LEE_EL_SALDO_PROYECTADO}: determina leyendo la cache.
 *
 * <p>Es la forma en que el defecto aparece de verdad: nadie escribe «voy a determinar sobre una
 * cache». Escribe «ya tengo el saldo aqui, para que recorrer el libro otra vez», y el resultado de
 * la emision pasa a depender de cuando se proyecto por ultima vez.
 *
 * <p><b>No se usa.</b> Existe para que la regla tenga algo que detectar: una regla que no puede
 * fallar no protege nada.
 */
public final class MuestraDeDeterminacionSobreLaCache {

    private final MotorDeReglas motor;

    public MuestraDeDeterminacionSobreLaCache(MotorDeReglas motor) {
        this.motor = motor;
    }

    /** Toma la base del calculo de la cache en vez del libro: eso es lo prohibido. */
    public Dinero determinarSobreLoProyectado(List<SaldoProyectado> saldos) {
        return saldos.stream().map(SaldoProyectado::insoluto).reduce(Dinero.CERO, Dinero::mas);
    }
}
