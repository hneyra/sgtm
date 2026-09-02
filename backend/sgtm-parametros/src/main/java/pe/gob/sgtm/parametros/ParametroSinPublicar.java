package pe.gob.sgtm.parametros;

import java.util.Optional;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que una excepcion tiene que decir <b>por programa</b> cuando el conjunto sellado no puede dar
 * la cifra que el calculo necesita (#604).
 *
 * <h2>Que problema resuelve</h2>
 *
 * <p>#547 tradujo estas excepciones a {@code 422 VALIDACION} y con eso desbloqueo el area de
 * convenios. Pero el cuerpo del problema solo lleva {@code codigo} y {@code mensaje}, y con <b>el
 * mismo par</b> salen dos cosas que se arreglan de dos maneras distintas:
 *
 * <ul>
 *   <li>«Falta el campo {@code nroDeCuotas}» — lo arregla quien atiende, en la misma pantalla;
 *   <li>«El ejercicio 2026 no tiene un conjunto de parametros sellado» — <b>no lo arregla nadie
 *       desde la pantalla</b>: hay que sellar el conjunto o publicar la cifra (D-02a, D-02b).
 * </ul>
 *
 * <p>Sin discriminador, la interfaz solo puede separarlas leyendo el texto, y el texto se reescribe
 * en cuanto alguien lo lee en voz alta. Este contrato es lo que permite que la respuesta lo diga
 * sin prosa: quien la lanza publica el ejercicio y, si la hay, la llave.
 *
 * <h2>Por que la llave es opcional y el ejercicio no</h2>
 *
 * <p>Todas estas excepciones hablan del conjunto sellado <b>de un ejercicio</b>, asi que el
 * ejercicio siempre se puede dar. La llave no: cuando lo que falta es el conjunto entero ({@link
 * LectorDeParametros.EjercicioSinSellar}) no hay ninguna fila que nombrar —no hay donde
 * publicarla—, y cuando lo que falta es el bloque entero de un tipo ({@link
 * PoliticasDeRedondeoSelladas.SinPuntosObservados}) tampoco hay <b>una</b>: nombrar un punto
 * cualquiera seria una afirmacion verosimil y equivocada, porque quien lee las politicas no sabe
 * cual de los trece puntos queria el que llamo.
 *
 * <p>De ahi la regla, que es la que el contrato declara: <b>la llave es {@code TIPO:CLAVE} cuando
 * falta exactamente una fila, y el {@code TIPO} solo cuando falta el bloque entero.</b> Nunca se
 * inventa una clave para rellenar el hueco.
 *
 * <h2>Lo que no lleva</h2>
 *
 * <p>Ni tabla, ni columna, ni restriccion, ni SQL (RNF-033). El ejercicio y la llave son datos del
 * corpus normativo —lo que hay que publicar y para que ano—, no del esquema.
 */
public interface ParametroSinPublicar {

    /** El ejercicio de cuyo conjunto sellado se trata. Siempre lo hay. */
    Ejercicio ejercicio();

    /**
     * La llave que hay que publicar, {@code TIPO:CLAVE}, o el {@code TIPO} solo cuando falta el
     * bloque entero. Vacia cuando lo que falta es el conjunto: no hay donde publicar nada.
     */
    Optional<String> llave();
}
