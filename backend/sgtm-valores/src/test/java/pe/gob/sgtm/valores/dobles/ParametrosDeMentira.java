package pe.gob.sgtm.valores.dobles;

import java.util.LinkedHashMap;
import java.util.Map;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;

/**
 * Un {@link LectorDeParametros} con los plazos que la prueba decide.
 *
 * <p>Es lo que permite escribir hoy la estructura de #39 sin las cifras que #192 tiene que cargar:
 * la prueba declara "20 DIAS_HABILES" o "4 ANIOS" y comprueba que el resultado <b>depende</b> de lo
 * declarado. Un conjunto sin el plazo tampoco es un accidente aqui: se usa para verificar que la
 * operacion falla nombrando la llave que falta, en vez de seguir con un numero por omision.
 */
public final class ParametrosDeMentira implements LectorDeParametros {

    /** El conjunto que este doble dice que rige; queda en la fila que lo uso. */
    public static final long CONJUNTO = 77L;

    private final Map<String, String> textos = new LinkedHashMap<>();

    /** Declara un parametro de texto: {@code con("PLAZO", "NOTIFICACION_VALOR-OP", "7 ANIOS")}. */
    public ParametrosDeMentira con(String tipo, String clave, String valor) {
        textos.put(tipo + "|" + clave, valor);
        return this;
    }

    @Override
    public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
        ParametrosSellados.Constructor constructor = ParametrosSellados.de(ejercicio, 1);
        textos.forEach(
                (llave, valor) -> {
                    String[] partes = llave.split("\\|", 2);
                    constructor.texto(partes[0], partes[1].isEmpty() ? null : partes[1], valor);
                });
        return constructor.construir();
    }

    @Override
    public ParametrosSellados porConjunto(IdentificadorDeConjunto identificador) {
        throw new UnsupportedOperationException("#39 no recalcula: resuelve por ejercicio");
    }

    @Override
    public IdentificadorDeConjunto conjuntoVigenteEn(Ejercicio ejercicio) {
        return IdentificadorDeConjunto.de(CONJUNTO);
    }
}
