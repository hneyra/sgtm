package pe.gob.sgtm.catastro.dominio;

import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.CodigoReferenciaCatastral;

/**
 * Una fila de la grilla de consulta de fichas (RF-006).
 *
 * <p>Es una proyeccion, no la ficha: lleva lo que se ve en la grilla y nada mas. Devolver la ficha
 * entera —con sus construcciones, sus instalaciones y su detalle— para pintar veinte filas seria
 * traer cientos de filas hijas que nadie va a mirar.
 *
 * <p>El titular sale por identificador y el nombre lo pone despues el caso de uso, preguntandoselo
 * al padron. Aqui no hay ningun {@code JOIN} a la tabla del vecino.
 *
 * @param titularId nulo si el predio no tiene titular vigente a la fecha consultada
 * @param titular nombre resuelto contra el padron; nulo mientras no se resuelva
 */
public record FichaEncontrada(
        long fichaId,
        long predioId,
        CodigoReferenciaCatastral codigo,
        String direccion,
        @Nullable String manzana,
        @Nullable String lote,
        TipoFicha tipo,
        int version,
        AreaM2 areaTerreno,
        String uso,
        LocalDate vigenciaDesde,
        @Nullable Long titularId,
        @Nullable String titular) {

    public FichaEncontrada {
        Objects.requireNonNull(codigo, "La fila lleva el codigo de referencia catastral");
        Objects.requireNonNull(direccion, "La fila lleva la direccion");
        Objects.requireNonNull(tipo, "La fila lleva el tipo de ficha");
        Objects.requireNonNull(areaTerreno, "La fila lleva el area");
        Objects.requireNonNull(uso, "La fila lleva el uso");
        Objects.requireNonNull(vigenciaDesde, "La fila dice desde cuando rige la version");
    }

    /** La misma fila con el nombre del titular ya resuelto contra el padron. */
    public FichaEncontrada conTitular(@Nullable String nombre) {
        return new FichaEncontrada(
                fichaId,
                predioId,
                codigo,
                direccion,
                manzana,
                lote,
                tipo,
                version,
                areaTerreno,
                uso,
                vigenciaDesde,
                titularId,
                nombre);
    }
}
