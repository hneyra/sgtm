package pe.gob.sgtm.licencias.dobles;

import java.util.LinkedHashMap;
import java.util.Map;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.ValorNormativo;
import pe.gob.sgtm.licencias.dominio.ClaseDeAnuncio;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;

/**
 * Un {@link LectorDeParametros} con las tarifas de anuncios de la prueba dentro (#51).
 *
 * <p><b>Las cifras entran por el constructor, no compiladas en la clase.</b> Es un doble de prueba,
 * y aun asi el dato viaja como dato: lo contrario seria escribir aqui una tarifa —que ademas es de
 * ordenanza local, D-02b, y la espera #199— y quedarse sin poder probar que pasa cuando la
 * municipalidad tarife otra cosa.
 *
 * <p>Un conjunto <b>sin</b> la clase que se pide es lo que hace falta para probar que el registro
 * falla nombrando la llave en vez de cobrar cero.
 */
public final class TarifasDeMentira implements LectorDeParametros {

    public static final long CONJUNTO = 51L;

    private static final String TIPO = "TASA_ANUNCIO";

    private final Map<ClaseDeAnuncio, String> tarifas = new LinkedHashMap<>();

    /** Declara la tarifa de una clase. Sin llamadas, el conjunto no tarifa nada. */
    public TarifasDeMentira con(ClaseDeAnuncio clase, String importe) {
        tarifas.put(clase, importe);
        return this;
    }

    @Override
    public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
        ParametrosSellados.Constructor constructor = ParametrosSellados.de(ejercicio, 1);
        for (Map.Entry<ClaseDeAnuncio, String> tarifa : tarifas.entrySet()) {
            constructor.numero(
                    TIPO, tarifa.getKey().claveDeLaTasa(), ValorNormativo.de(tarifa.getValue()));
        }
        return constructor.construir();
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
