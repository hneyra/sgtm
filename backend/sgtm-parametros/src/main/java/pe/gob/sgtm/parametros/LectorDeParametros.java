package pe.gob.sgtm.parametros;

import pe.gob.sgtm.dominio.Ejercicio;

/**
 * El unico punto de acceso a los parametros sellados, con la dimension temporal como argumento
 * obligatorio (ARQ-09 §2.2): no existe una sobrecarga sin ejercicio ni identificador. Una consulta
 * de parametros sin criterio produce un calculo silenciosamente incorrecto, que es el peor modo de
 * falla posible —no rompe nada, solo cobra mal—.
 *
 * <p>Las dos lecturas no son intercambiables:
 *
 * <ul>
 *   <li>{@link #vigenteEn(Ejercicio)} resuelve el conjunto que rige <b>hoy</b> para ese ejercicio.
 *       Es el que usa una determinacion <b>nueva</b>.
 *   <li>{@link #porConjunto(IdentificadorDeConjunto)} recupera <b>el conjunto concreto</b> que una
 *       determinacion ya emitida uso. Es el que usa <b>todo recalculo</b>.
 * </ul>
 *
 * <p>Confundirlas es el defecto que ARQ-09 §3 describe: si entre la emision y el recalculo se sello
 * una version nueva —un arancel corregido, una ordenanza modificada a mitad de ano—, resolver por
 * ejercicio devuelve otros parametros y el recalculo da otra cifra, sin ningun error de por medio.
 */
public interface LectorDeParametros {

    /**
     * El conjunto sellado que rige hoy para el ejercicio: el de mayor version. Para determinaciones
     * nuevas. Un recalculo que llame aqui esta mal escrito —usa {@link
     * #porConjunto(IdentificadorDeConjunto)}—.
     */
    ParametrosSellados vigenteEn(Ejercicio ejercicio);

    /**
     * El conjunto concreto que uso una determinacion, por el identificador que ella guarda. Es la
     * lectura de la reproducibilidad: recalcular en 2037 recupera esto, no «los parametros de
     * 2027».
     */
    ParametrosSellados porConjunto(IdentificadorDeConjunto identificador);

    /**
     * Que conjunto sellado rige hoy el ejercicio, por su identificador.
     *
     * <p>Existe porque hay datos normativos que <b>no</b> caben en {@link ParametrosSellados} —una
     * tabla entera de valores referenciales de vehiculos, un arancel por manzana— y viven en su
     * propia tabla. Esa tabla cuelga del conjunto, no del ejercicio, exactamente por el motivo de
     * arriba; y para leerla hace falta saber de que conjunto se trata.
     *
     * <p>Se publica aqui y no se resuelve en cada contexto: repetir el «sellado de mayor version de
     * este ejercicio» en el SQL de rentas, de catastro y de sanciones es tener tres sitios donde
     * olvidarse del {@code AND estado = 'SELLADO'}, y el que se olvide leera un conjunto abierto
     * sin que nada falle.
     */
    IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio);

    /** Ningun conjunto sellado rige el ejercicio. No hay valor por omision (ARQ-09 §2.5). */
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

    /**
     * El conjunto que la determinacion referencia no existe o no esta sellado. Que una
     * determinacion apunte a un conjunto abierto significa que se emitio sin sellar: no se calcula
     * sobre eso, se investiga.
     */
    final class ConjuntoNoSellado extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        public ConjuntoNoSellado(IdentificadorDeConjunto identificador) {
            super(
                    "El "
                            + identificador
                            + " no existe o no esta sellado. Una determinacion que lo referencia no"
                            + " se puede reproducir, y sustituirlo por el vigente del ejercicio"
                            + " daria otra cifra sin avisar (ARQ-09 §3)");
        }
    }
}
