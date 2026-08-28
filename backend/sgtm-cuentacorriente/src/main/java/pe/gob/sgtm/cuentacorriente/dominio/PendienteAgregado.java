package pe.gob.sgtm.cuentacorriente.dominio;

import java.time.Instant;
import java.util.Objects;
import pe.gob.sgtm.dominio.Dinero;

/**
 * Lo que sigue pendiente de un tributo en un ejercicio, segun la proyeccion del saldo (#56, #23).
 *
 * <p>Sale de {@code saldo_proyectado} y no del libro, y esa es toda la razon de que exista: la
 * cartera de un padron entero no se puede recorrer asiento por asiento en cada peticion (AC 4 de
 * #56). La proyeccion ya tiene una fila por obligacion, y agruparla en el motor deja una fila por
 * tributo.
 *
 * <p><b>Es insoluto, no deuda.</b> {@link SaldoProyectado} solo netea {@link Concepto#INSOLUTO}: el
 * reajuste y el interes dependen de la fecha en que se pregunte y por eso no se precalculan. Una
 * cartera que dijera «deuda» estaria prometiendo una cifra que solo da {@code deudaActualizadaA}, y
 * darla para el padron entero exigiria calcular interes obligacion por obligacion. Quien lea esta
 * cifra tiene que saber que es el principal pendiente y nada mas.
 *
 * <p>{@link #proyectadoDesde} es la fila <b>mas vieja</b> del grupo, no la mas nueva: una cartera
 * es tan fresca como su peor fila, y decir la mas reciente haria parecer al dia un agregado que
 * arrastra proyecciones de hace un mes.
 *
 * @param tributo el tributo de las obligaciones
 * @param pendiente la suma de los saldos de insoluto de ese tributo
 * @param obligaciones cuantas filas la componen
 * @param proyectadoDesde cuando se proyecto la mas antigua de ellas (regla 9, RNF-075)
 */
public record PendienteAgregado(
        String tributo, Dinero pendiente, long obligaciones, Instant proyectadoDesde) {

    public PendienteAgregado {
        Objects.requireNonNull(tributo, "La linea necesita su tributo");
        Objects.requireNonNull(pendiente, "La linea necesita su importe");
        Objects.requireNonNull(proyectadoDesde, "Un saldo sin fecha no se puede conciliar");
        if (obligaciones < 0) {
            throw new IllegalArgumentException("El numero de obligaciones no puede ser negativo");
        }
    }
}
