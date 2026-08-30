package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.fiscalizacion.dominio.MuestraDelPrograma;

/**
 * Una fila de la muestra tal como sale por HTTP. Campos en español {@code camelCase}.
 *
 * <p>Lleva los <b>tres identificadores</b> que el acta exige —{@code programaId}, {@code
 * contribuyenteId} y {@code predioId}—, que es lo que permite abrir {@code fisc_predial} desde una
 * fila real y no sobre identificadores inventados (AC 2 de #431).
 *
 * <p><b>Ninguna cifra se compone</b> (RNF-083): la diferencia de superficie la calcula el dominio y
 * viaja hecha, o no viaja. Y el «Uso declarado» que la grilla dibuja <b>no está aquí</b>: {@code
 * DeteccionDeOmisos} no resuelve el uso declarado —pasa {@code null} en los dos lados de la
 * comparación—, y el que sí publica el padrón es el que el <b>catastro</b> tiene inscrito, que bajo
 * una columna que dice «Uso declarado» sería otro rótulo con otro significado (RNF-080).
 *
 * @param visitado si ese predio ya tiene acta en este programa; se DERIVA, no se guarda
 */
public record MuestraResource(
        long programaId,
        long predioId,
        String codRefCatastral,
        long contribuyenteId,
        String codContribuyente,
        String titular,
        @Nullable String sector,
        String condicion,
        @Nullable String areaCatastral,
        @Nullable String areaDeclarada,
        @Nullable String diferenciaDeArea,
        boolean visitado,
        String fechaSorteo) {

    public static MuestraResource de(
            MuestraDelPrograma fila, String codContribuyente, String titular, boolean visitado) {
        return new MuestraResource(
                fila.programaId(),
                fila.predioId(),
                fila.codigoReferenciaCatastral(),
                fila.contribuyenteId(),
                codContribuyente,
                titular,
                fila.sectorCodigo(),
                fila.condicion().name(),
                texto(fila.areaCatastral()),
                texto(fila.areaDeclarada()),
                texto(fila.diferenciaDeArea()),
                visitado,
                fila.fechaSorteo().toString());
    }

    private static @Nullable String texto(@Nullable Object valor) {
        return valor == null ? null : valor.toString();
    }
}
