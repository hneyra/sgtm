package pe.gob.sgtm.catastro.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.dominio.FichaEncontrada;

/**
 * Una fila de la grilla de consulta, tal como sale por HTTP.
 *
 * <p>Lleva la <b>version</b> y desde cuando rige, igual que la ficha completa: quien mira la grilla
 * tiene que poder decir cual esta viendo. Y no lleva ningun importe: el autovaluo es de rentas.
 *
 * <p>{@code titular} nulo significa que el predio no tiene titular vigente a la fecha consultada.
 * Sale asi, y sale en la lista: es el predio que catastro tiene que revisar.
 */
public record FichaEncontradaResource(
        long id,
        long predioId,
        String codRefCatastral,
        String direccion,
        @Nullable String manzana,
        @Nullable String lote,
        String tipo,
        int version,
        String areaTerreno,
        String uso,
        String vigenciaDesde,
        @Nullable String titular) {

    public static FichaEncontradaResource de(FichaEncontrada fila) {
        return new FichaEncontradaResource(
                fila.fichaId(),
                fila.predioId(),
                fila.codigo().valor(),
                fila.direccion(),
                fila.manzana(),
                fila.lote(),
                fila.tipo().name(),
                fila.version(),
                fila.areaTerreno().toString(),
                fila.uso(),
                fila.vigenciaDesde().toString(),
                fila.titular());
    }
}
