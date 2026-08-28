package pe.gob.sgtm.fiscalizacion.dominio;

import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Una fila de la pantalla «Omisos y subvaluadores» ({@code fisc_omisos}, RF-055).
 *
 * <p>Es el cruce del padrón de predios de {@code catastro} con las declaraciones juradas de {@code
 * rentas} para un ejercicio: quién tiene predio y no declaró, y quién declaró por debajo de lo
 * verificado.
 *
 * <h2>Las dos columnas de importe van con nombre y sin cifra</h2>
 *
 * <p>La pantalla pide «Valor catastral S/», «Valor declarado S/», «Diferencia S/» e «Impuesto
 * omitido S/». Las cuatro salen del cuadro de valores unitarios, la tabla de depreciación y el
 * arancel: <b>D-02a</b>, sin firmar. Aquí van a {@code null} y la interfaz lo dice; ponerles una
 * cifra supuesta produciría una esquela de cobranza sobre un número inventado.
 *
 * <p>Lo que sí lleva valor es la comparación estructural que sostiene la condición: el área que
 * consta en la ficha catastral frente a la que consta declarada.
 *
 * <h2>{@code fueraDePlazo} viaja, y no decide la condición</h2>
 *
 * <p>AC 3 de #49. Quien declaró tarde <b>no es omiso</b>: es un declarante con una infracción del
 * art. 176. La columna existe para que la pantalla pueda decirlo y para que la liquidación pueda
 * multarlo; {@link ComparacionHalladoDeclarado} no la mira al clasificar.
 *
 * @param predioId la unidad
 * @param codigoReferenciaCatastral el código con el que se identifica en ventanilla
 * @param sectorCodigo el sector, para el filtro de la pantalla; {@code null} si el predio no tiene
 * @param contribuyenteId el titular vigente a la fecha de corte
 * @param ejercicio el ejercicio que se examina
 * @param condicion lo que sale de comparar los dos lados
 * @param declaroFueraDePlazo si hay declaración y se presentó vencido el plazo
 * @param areaCatastral el área que consta en la ficha catastral vigente
 * @param areaDeclarada el área que consta declarada; {@code null} si no declaró
 * @param valorCatastral {@code null} hasta D-02a (#198)
 * @param valorDeclarado {@code null} hasta D-02a (#198)
 * @param impuestoOmitido {@code null} hasta D-02a (#198)
 */
public record FilaDeOmisos(
        long predioId,
        String codigoReferenciaCatastral,
        @Nullable String sectorCodigo,
        long contribuyenteId,
        Ejercicio ejercicio,
        CondicionFiscalizada condicion,
        boolean declaroFueraDePlazo,
        @Nullable AreaM2 areaCatastral,
        @Nullable AreaM2 areaDeclarada,
        @Nullable Dinero valorCatastral,
        @Nullable Dinero valorDeclarado,
        @Nullable Dinero impuestoOmitido) {

    public FilaDeOmisos {
        Objects.requireNonNull(codigoReferenciaCatastral, "La fila necesita el codigo del predio");
        Objects.requireNonNull(ejercicio, "La fila necesita el ejercicio que examina");
        Objects.requireNonNull(condicion, "La fila necesita su condicion");
        if (condicion == CondicionFiscalizada.OMISO && declaroFueraDePlazo) {
            throw new IllegalArgumentException(
                    "Quien declaro fuera de plazo declaro: no es omiso, es un declarante con una"
                            + " infraccion del art. 176 (AC 3 de #49)");
        }
    }

    /** La diferencia de superficie, si los dos lados se conocen. */
    public @Nullable AreaM2 diferenciaDeArea() {
        return ComparacionHalladoDeclarado.diferenciaDeArea(areaDeclarada, areaCatastral);
    }

    /** Si las cuatro columnas de importe de la pantalla siguen esperando a D-02a. */
    public boolean esperaSusCifras() {
        return impuestoOmitido == null;
    }
}
