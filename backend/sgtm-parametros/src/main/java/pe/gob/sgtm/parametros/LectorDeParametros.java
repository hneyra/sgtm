package pe.gob.sgtm.parametros;

import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Entrega el conjunto <b>sellado</b> de un ejercicio. Es la unica puerta de los demas contextos a
 * los valores normativos.
 *
 * <p>No hay un metodo que entregue el conjunto abierto. Es deliberado: un calculo oficial hecho con
 * parametros que todavia se pueden corregir produce una cifra que manana puede ser otra, y el
 * contribuyente ya tendria el recibo. Si hace falta previsualizar con un conjunto en preparacion,
 * sera otra operacion con otro nombre y su propia advertencia.
 */
public interface LectorDeParametros {

    /**
     * @throws EjercicioSinSellar si el ejercicio no tiene conjunto sellado
     */
    ParametrosSellados delEjercicio(Ejercicio ejercicio);

    /** El ejercicio no esta parametrizado todavia, o su conjunto sigue abierto. */
    final class EjercicioSinSellar extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        public EjercicioSinSellar(Ejercicio ejercicio) {
            super(
                    "El ejercicio "
                            + ejercicio
                            + " no tiene un conjunto de parametros sellado. Calcular con uno"
                            + " abierto produciria una cifra que manana puede ser otra, y el"
                            + " contribuyente ya tendria el recibo (ADR-0007)");
        }
    }
}
