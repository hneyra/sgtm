package pe.gob.sgtm.catastro;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.AreaM2;

/**
 * Un predio del padrón con su titular vigente, publicado para otros contextos acotados (ARQ-01 §4,
 * #49).
 *
 * <p>No es {@link pe.gob.sgtm.catastro.dominio.Predio} ni su ficha entera: quien cruza el padrón
 * contra las declaraciones juradas necesita identificar la unidad, saber a quién imputarla y poder
 * comparar superficie y uso. Las construcciones, las instalaciones y el estado de conservación son
 * {@code .dominio}, y cruzar la frontera con ellos obligaría a este contexto a exponer su modelo
 * interno completo.
 *
 * <p><b>Ni un importe.</b> El valor del predio sale del cuadro de valores unitarios, la tabla de
 * depreciación y el arancel —D-02a, sin firmar—, y este contexto no lo calcula: lo que publica es
 * lo que midió el técnico.
 *
 * @param predioId el identificador interno
 * @param codigoReferenciaCatastral el código con el que se identifica en ventanilla
 * @param direccion la dirección del predio
 * @param sectorCodigo el código del sector; {@code null} si el predio no tiene sector asignado
 * @param contribuyenteId el titular que rige en la fecha consultada
 * @param areaTerreno el área de la ficha vigente a esa fecha; {@code null} si el predio no tiene
 *     ficha registrada
 * @param uso el uso de la ficha vigente a esa fecha; {@code null} si no tiene ficha
 * @param fichaId la versión de ficha vigente a esa fecha; {@code null} si no tiene ficha
 */
public record PredioDelPadron(
        long predioId,
        String codigoReferenciaCatastral,
        String direccion,
        @Nullable String sectorCodigo,
        long contribuyenteId,
        @Nullable AreaM2 areaTerreno,
        @Nullable String uso,
        @Nullable Long fichaId) {

    public PredioDelPadron {
        Objects.requireNonNull(
                codigoReferenciaCatastral, "El predio necesita su codigo de referencia catastral");
        Objects.requireNonNull(direccion, "El predio necesita su direccion");
        if (contribuyenteId <= 0) {
            throw new IllegalArgumentException(
                    "Una fila del padron sin titular no se publica: no hay a quien imputarla");
        }
    }
}
