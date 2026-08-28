package pe.gob.sgtm.licencias.dobles;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.parametros.IdentificadorDeConjunto;
import pe.gob.sgtm.parametros.LectorDeParametros;
import pe.gob.sgtm.parametros.ParametrosSellados;

/**
 * Un {@link LectorDeParametros} con un solo conjunto sellado dentro: los conceptos del TUPA que
 * cobran el derecho de tramite de una licencia y de su duplicado.
 *
 * <p><b>Los codigos entran por el constructor, no compilados en la clase.</b> Es un doble de
 * prueba, y aun asi el dato viaja como dato: lo contrario seria escribir un codigo de TUPA en el
 * codigo y quedarse sin poder probar que pasa cuando la municipalidad use otro.
 *
 * <p>Un codigo {@code null} significa «ese parametro no esta en el conjunto», que es lo que hace
 * falta para probar que la operacion falla nombrando la llave.
 */
public final class DerechosDeMentira implements LectorDeParametros {

    public static final long CONJUNTO = 41L;

    private final @Nullable String conceptoDeLaLicencia;
    private final @Nullable String conceptoDelDuplicado;
    private @Nullable String conceptoDeLaEdificacion;
    private @Nullable String conceptoDeLaRevalidacion;

    public DerechosDeMentira(
            @Nullable String conceptoDeLaLicencia, @Nullable String conceptoDelDuplicado) {
        this.conceptoDeLaLicencia = conceptoDeLaLicencia;
        this.conceptoDelDuplicado = conceptoDelDuplicado;
    }

    /**
     * Los dos conceptos del FUE de edificacion (#48).
     *
     * <p>Un {@code null} significa «ese parametro no esta en el conjunto», igual que arriba: es lo
     * que hace falta para probar que la emision falla nombrando la llave en vez de admitir
     * cualquier recibo.
     */
    public DerechosDeMentira conEdificacion(
            @Nullable String deLaLicencia, @Nullable String deLaRevalidacion) {
        this.conceptoDeLaEdificacion = deLaLicencia;
        this.conceptoDeLaRevalidacion = deLaRevalidacion;
        return this;
    }

    @Override
    public ParametrosSellados vigenteEn(Ejercicio ejercicio) {
        ParametrosSellados.Constructor constructor = ParametrosSellados.de(ejercicio, 1);
        if (conceptoDeLaLicencia != null) {
            constructor.texto("TUPA", "DERECHO_LICENCIA_FUNCIONAMIENTO", conceptoDeLaLicencia);
        }
        if (conceptoDelDuplicado != null) {
            constructor.texto("TUPA", "DERECHO_DUPLICADO_LICENCIA", conceptoDelDuplicado);
        }
        if (conceptoDeLaEdificacion != null) {
            constructor.texto("TUPA", "DERECHO_LICENCIA_EDIFICACION", conceptoDeLaEdificacion);
        }
        if (conceptoDeLaRevalidacion != null) {
            constructor.texto("TUPA", "DERECHO_REVALIDACION_EDIFICACION", conceptoDeLaRevalidacion);
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
