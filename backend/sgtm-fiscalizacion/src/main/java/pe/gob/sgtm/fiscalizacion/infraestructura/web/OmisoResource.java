package pe.gob.sgtm.fiscalizacion.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.fiscalizacion.dominio.FilaDeOmisos;

/**
 * Una fila de «Omisos y subvaluadores» tal como sale por HTTP ({@code fisc_omisos}, RF-055).
 *
 * <h2>Las cuatro columnas de importe salen con nombre y sin cifra</h2>
 *
 * <p>«Valor catastral S/», «Valor declarado S/», «Diferencia S/» e «Impuesto omitido S/» dependen
 * del cuadro de valores unitarios, la tabla de depreciación y el arancel: <b>D-02a</b>, sin firmar
 * (#198). Viajan en {@code null} y la interfaz escribe «sin cifra». Ponerles un número supuesto
 * produciría una esquela de cobranza sobre un valor inventado.
 *
 * <p>Lo que sí viaja con valor es la comparación de superficies, que es estructura.
 *
 * <p>{@code declaroFueraDePlazo} viaja aparte de {@code condicion} <b>a propósito</b> (AC 3): quien
 * declaró tarde no es omiso, y la pantalla tiene que poder decir las dos cosas sin mezclarlas.
 *
 * @param codRefCatastral el código con el que se identifica el predio en ventanilla
 * @param titular el código del contribuyente titular
 * @param sector el sector del predio
 * @param condicion CONFORME, OMISO, SUBVALUADOR, USO_DISTINTO o NO_UBICADO
 * @param declaroFueraDePlazo si presentó su declaración vencido el plazo
 * @param areaCatastral el área de la ficha vigente, como texto
 * @param areaDeclarada el área de la ficha que la declaración referencia, como texto
 * @param diferenciaDeArea la diferencia, nunca negativa
 * @param valorCatastralS siempre {@code null} hasta D-02a
 * @param valorDeclaradoS siempre {@code null} hasta D-02a
 * @param diferenciaS siempre {@code null} hasta D-02a
 * @param impuestoOmitidoS siempre {@code null} hasta D-02a
 */
public record OmisoResource(
        String codRefCatastral,
        String titular,
        @Nullable String sector,
        String condicion,
        boolean declaroFueraDePlazo,
        @Nullable String areaCatastral,
        @Nullable String areaDeclarada,
        @Nullable String diferenciaDeArea,
        @Nullable String valorCatastralS,
        @Nullable String valorDeclaradoS,
        @Nullable String diferenciaS,
        @Nullable String impuestoOmitidoS) {

    public static OmisoResource de(FilaDeOmisos fila, String codigoDelTitular) {
        return new OmisoResource(
                fila.codigoReferenciaCatastral(),
                codigoDelTitular,
                fila.sectorCodigo(),
                fila.condicion().name(),
                fila.declaroFueraDePlazo(),
                texto(fila.areaCatastral()),
                texto(fila.areaDeclarada()),
                texto(fila.diferenciaDeArea()),
                texto(fila.valorCatastral()),
                texto(fila.valorDeclarado()),
                null,
                texto(fila.impuestoOmitido()));
    }

    private static @Nullable String texto(@Nullable Object valor) {
        return valor == null ? null : valor.toString();
    }
}
