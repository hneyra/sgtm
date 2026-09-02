package pe.gob.sgtm.verificaciones.muestras.web;

import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.PoliticasDeRedondeo;
import pe.gob.sgtm.parametros.FaltaPublicar;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;
import pe.gob.sgtm.web.CodigoDeError;
import pe.gob.sgtm.web.ProblemaDeNegocio;

/**
 * Muestra que viola la guarda de #691: traduce «falta publicar una cifra normativa» a un 422
 * <b>sin</b> el discriminador.
 *
 * <p>No la instancia nadie. Existe para que {@code DiscriminadorDeLoQueFaltaPublicarTest} pueda
 * demostrar que la guarda muerde: una regla que no puede fallar no protege nada.
 *
 * <p>Los tres primeros metodos son las tres formas en que el defecto aparece de verdad, y son las
 * que el escaner tiene que encontrar. Los dos ultimos son el contraste, y son los que impiden
 * arreglarlo gritando siempre: uno traduce con el ayudante y el otro no contesta 422.
 */
public final class MuestraDeControladorSinDiscriminador {

    private final LectorDeParametros parametros;

    public MuestraDeControladorSinDiscriminador(LectorDeParametros parametros) {
        this.parametros = parametros;
    }

    /** MALO: el ejercicio sin sellar sale como un 422 que no dice que le falta al sistema. */
    public ParametrosSellados sinConjuntoSellado(Ejercicio ejercicio) {
        try {
            return parametros.vigenteEn(ejercicio);
        } catch (LectorDeParametros.EjercicioSinSellar sinSellar) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, sinSellar.getMessage());
        }
    }

    /** MALO: y la fila que falta, igual. El mensaje la nombra; el cuerpo del problema, no. */
    public String sinLaFila(Ejercicio ejercicio) {
        try {
            return parametros.vigenteEn(ejercicio).exigirNumero("UIT", null).valor().toString();
        } catch (ParametrosSellados.ParametroAusente falta) {
            // Un comentario que mencione FaltaPublicar no arregla nada, y no debe dejarlo pasar.
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, falta.getMessage());
        }
    }

    /** MALO: la del dominio puro tambien, y esa ni siquiera declara la interfaz. */
    public String sinElPuntoDeRedondeo(Ejercicio ejercicio) {
        try {
            return parametros.vigenteEn(ejercicio).toString();
        } catch (PoliticasDeRedondeo.PuntoSinPolitica sinPolitica) {
            throw new ProblemaDeNegocio(CodigoDeError.VALIDACION, sinPolitica.getMessage());
        }
    }

    /** BUENO: el mismo 422, traducido por el unico sitio que pone el discriminador. */
    public ParametrosSellados enRegla(Ejercicio ejercicio) {
        try {
            return parametros.vigenteEn(ejercicio);
        } catch (LectorDeParametros.EjercicioSinSellar sinSellar) {
            throw FaltaPublicar.problema(sinSellar);
        }
    }

    /** BUENO: capturar una de la familia sin contestar 422 no es asunto de esta guarda. */
    public String enReglaPorNoSer422(Ejercicio ejercicio) {
        try {
            return parametros.vigenteEn(ejercicio).toString();
        } catch (LectorDeParametros.EjercicioSinSellar sinSellar) {
            throw new ProblemaDeNegocio(CodigoDeError.NO_ENCONTRADO, sinSellar.getMessage());
        }
    }
}
