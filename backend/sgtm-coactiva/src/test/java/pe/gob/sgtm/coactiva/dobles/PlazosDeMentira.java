package pe.gob.sgtm.coactiva.dobles;

import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;

/**
 * Un {@link LectorDeParametros} con un solo conjunto sellado dentro: el del plazo de la REC-1.
 *
 * <p><b>El valor entra por el constructor, no compilado en la clase.</b> Es un doble de prueba, y
 * aun asi la cifra viaja como dato: lo contrario seria escribir «7» en el codigo y quedarse sin
 * poder probar que pasa cuando la norma diga otra cosa.
 *
 * <p>La prueba de que el plazo sale de verdad del conjunto sellado —y de que la operacion falla
 * cuando falta— es {@code ActosCoactivosJdbcTest} contra PostgreSQL. Aqui solo se necesita que el
 * transporte HTTP tenga un plazo con el que trabajar.
 */
public final class PlazosDeMentira implements LectorDeParametros {

    /** El identificador del conjunto que este doble finge tener sellado. */
    public static final long CONJUNTO = 77L;

    private final String plazoDeLaRec1;

    public PlazosDeMentira(String plazoDeLaRec1) {
        this.plazoDeLaRec1 = plazoDeLaRec1;
    }

    @Override
    public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
        return ParametrosSellados.de(ejercicio, 1)
                .texto("PLAZO", "REC1_CUMPLIMIENTO", plazoDeLaRec1)
                .construir();
    }

    @Override
    public ParametrosSellados porConjunto(IdentificadorDeConjunto identificador) {
        return vigenteEn(new Ejercicio(2026));
    }

    @Override
    public IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio) {
        return IdentificadorDeConjunto.de(CONJUNTO);
    }
}
