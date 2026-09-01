package pe.gob.sgtm.catastro.dominio;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.compartido.MarcoGeografico;

/**
 * Con que se acota el plano catastral: un marco, y los dos filtros con que se busca en ventanilla
 * (ADR-0022 §2).
 *
 * <p><b>El marco es obligatorio</b> y por eso no es {@code @Nullable}: sin el, la consulta seria el
 * padron entero, que es lo que esta lectura existe para no hacer. Los otros dos son los mismos que
 * la pantalla dibuja —«Sector» y «Manzana»—, por codigo, como en {@link FiltroDePredios}.
 *
 * <p><b>No lleva ni estado ni fichado</b>, que si tiene {@link FiltroDePredios}. No es un olvido:
 * el contrato declara cuatro parametros para esta operacion y esos dos no estan. El plano dibuja lo
 * que hay levantado, no la cola de saneamiento —esa se lee en la grilla, que es donde se puede
 * leer, porque un predio sin ficha y sin poligono no tiene como dibujarse—.
 */
public record FiltroDelPlano(
        MarcoGeografico marco, @Nullable String codigoDeSector, @Nullable String codigoDeManzana) {

    public FiltroDelPlano {
        Objects.requireNonNull(marco, "El plano se pide siempre acotado por un marco");
        codigoDeSector = limpio(codigoDeSector);
        codigoDeManzana = limpio(codigoDeManzana);
    }

    private static @Nullable String limpio(@Nullable String valor) {
        if (valor == null) {
            return null;
        }
        String recortado = valor.strip();
        return recortado.isEmpty() ? null : recortado;
    }
}
