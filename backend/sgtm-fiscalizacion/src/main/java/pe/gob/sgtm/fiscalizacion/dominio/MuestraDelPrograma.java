package pe.gob.sgtm.fiscalizacion.dominio;

import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.AreaM2;

/**
 * Un predio que un programa sorteó para inspeccionar (#481, RF-050).
 *
 * <p><b>Es una foto, no una vista.</b> La condición, las dos superficies y el código del predio se
 * copian el día del sorteo y no se releen: son la respuesta a «¿por qué me tocó a mí?», y releerlas
 * hoy daría la situación de hoy sobre un acta que se levantó hace meses. Un predio que regulariza
 * después del sorteo sigue aquí con la condición de ese día hasta que alguien lo visite — por eso
 * la fila lleva su {@link #fechaSorteo()} y la pantalla la muestra (regla 9).
 *
 * <p><b>Las dos superficies son de TERRENO.</b> {@code LectorDeFichas.areaDeLaVersion} devuelve
 * {@code ficha.areaTerreno()} y {@link ComparacionHalladoDeclarado} compara contra el área de
 * terreno del padrón: guardar aquí un área construida haría incomparables las dos mitades sin que
 * ninguna cifra pareciera mal.
 *
 * <p>Lo que <b>no</b> está aquí es si el predio ya se visitó: eso se deriva de si existe un acta de
 * ese predio en ese programa. Guardarlo dejaría dos verdades sobre la misma fila, y la que se lee
 * en pantalla sería la que nadie recalculó (el reparto de {@code V41} §2, {@code V33} y {@code
 * V32}).
 *
 * @param id nulo mientras no se ha guardado; lo asigna la base
 * @param programaId el programa que lo sorteó
 * @param predioId el predio, que es lo que el acta necesita
 * @param codigoReferenciaCatastral el código del predio, copiado
 * @param contribuyenteId su titular a la fecha del sorteo, que es el otro identificador del acta
 * @param condicion lo que la detección concluyó ese día
 * @param areaCatastral la superficie que el catastro tiene inscrita
 * @param areaDeclarada la que sustenta la declaración jurada del ejercicio
 * @param sectorCodigo el sector del predio, o nulo si no lo tiene
 * @param fechaSorteo a qué día se resolvieron el padrón, la titularidad y la ficha
 */
public record MuestraDelPrograma(
        @Nullable Long id,
        long programaId,
        long predioId,
        String codigoReferenciaCatastral,
        long contribuyenteId,
        CondicionFiscalizada condicion,
        @Nullable AreaM2 areaCatastral,
        @Nullable AreaM2 areaDeclarada,
        @Nullable String sectorCodigo,
        LocalDate fechaSorteo) {

    public MuestraDelPrograma {
        Objects.requireNonNull(
                codigoReferenciaCatastral, "La fila de la muestra necesita el codigo del predio");
        Objects.requireNonNull(condicion, "La fila de la muestra necesita su condicion");
        Objects.requireNonNull(fechaSorteo, "La fila de la muestra necesita su fecha de sorteo");
        if (programaId < 1) {
            throw new IllegalArgumentException("La fila de la muestra necesita su programa");
        }
        if (predioId < 1) {
            throw new IllegalArgumentException("La fila de la muestra necesita su predio");
        }
        if (contribuyenteId < 1) {
            throw new IllegalArgumentException(
                    "Una fila de la muestra sin titular no se sortea: no hay a quien visitar");
        }
    }

    /**
     * La fila sorteada a partir de lo que la detección concluyó, sin recomponer nada: todo lo que
     * lleva sale de {@link FilaDeOmisos}, que es la única fuente de la condición en el sistema.
     *
     * <p>De los titulares de la fila toma <b>el principal</b> —el de mayor porcentaje—, porque
     * {@code programa_muestra.contribuyente_id} es una columna sola (V60) y visitar es visitar a
     * alguien; es la misma elección que {@code TitularPrincipalRepository} hace para cobrar el
     * arbitrio. Un predio <b>sin titular vigente</b> no llega hasta aquí: {@code GenerarMuestra} lo
     * aparta antes, y por qué está escrito allí.
     */
    public static MuestraDelPrograma sorteada(
            long programaId, FilaDeOmisos fila, LocalDate fechaSorteo) {
        return new MuestraDelPrograma(
                null,
                programaId,
                fila.predioId(),
                fila.codigoReferenciaCatastral(),
                fila.titularPrincipal()
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Una fila de la muestra sin titular no se sortea:"
                                                        + " no hay a quien visitar")),
                fila.condicion(),
                fila.areaCatastral(),
                fila.areaDeclarada(),
                fila.sectorCodigo(),
                fechaSorteo);
    }

    /**
     * La diferencia de superficie, si los dos lados se conocen. Nunca se compone en la interfaz.
     */
    public @Nullable AreaM2 diferenciaDeArea() {
        return ComparacionHalladoDeclarado.diferenciaDeArea(areaDeclarada, areaCatastral);
    }
}
