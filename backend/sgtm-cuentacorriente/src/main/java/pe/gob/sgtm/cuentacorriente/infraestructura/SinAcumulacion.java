package pe.gob.sgtm.cuentacorriente.infraestructura;

import java.time.LocalDate;
import org.springframework.stereotype.Component;
import pe.gob.sgtm.cuentacorriente.dominio.PoliticaDeMora;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * La unica {@link PoliticaDeMora} que existe hoy: no acumula nada.
 *
 * <p>Es un lugar reservado, no una regla de calculo. Mientras D-02 no fije la TIM y el indice de
 * reajuste, y D-03 no fije donde se redondea, no hay ninguna cifra que esta clase pudiera devolver
 * sin inventarla —y regla 5 lo prohibe—. {@link
 * pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda#deudaActualizadaA} sigue funcionando con esto:
 * el insoluto, el reajuste y el interes que ya estan asentados en el libro se siguen leyendo y
 * sumando igual, y lo unico que falta es el tramo de reajuste e interes que todavia no se asento.
 *
 * <p>Cuando D-02 y D-03 cierren, esta clase se sustituye por la implementacion real —o deja de ser
 * el unico bean de {@link PoliticaDeMora}—, y ningun llamador de {@code deudaActualizadaA} cambia:
 * es exactamente para eso que la politica se recibe como argumento (regla 6, ARQ-09).
 */
@Component
public class SinAcumulacion implements PoliticaDeMora {

    @Override
    public Dinero reajusteAcumulado(
            Dinero insolutoPendiente,
            LocalDate desde,
            LocalDate hasta,
            PoliticaDeRedondeo redondeo) {
        return Dinero.CERO;
    }

    @Override
    public Dinero interesAcumulado(
            Dinero insolutoPendiente,
            LocalDate desde,
            LocalDate hasta,
            PoliticaDeRedondeo redondeo) {
        return Dinero.CERO;
    }
}
