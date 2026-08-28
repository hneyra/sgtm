package pe.gob.sgtm.rentas.infraestructura.web;

import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.catastro.FichaDelPadron;
import pe.gob.sgtm.rentas.aplicacion.ConsultaDeConciliacion.FichaConciliada;

/**
 * Una fila de la grilla de fichas con su conciliacion, tal como sale por HTTP (ADR-0015, #344).
 *
 * <p>Es la misma fila que sirve {@code GET /api/v1/catastro/fichas} —los mismos campos y los mismos
 * nombres, para que la pantalla no tenga que leer dos formas de lo mismo— con <b>dos campos mas y
 * ninguno menos</b>:
 *
 * <ul>
 *   <li>{@code conciliada}: si el predio tiene declaracion jurada del ejercicio, {@code PRESENTADA}
 *       u {@code OBSERVADA}.
 *   <li>{@code conciliadaA}: <b>a que ejercicio</b> responde ese si o ese no. No existe
 *       «conciliada»: existe {@code conciliadaA(ejercicio)}, y la columna de la pantalla se rotula
 *       con el (regla 9, RNF-075). La declaracion de 2024 no concilia 2026.
 * </ul>
 *
 * <p><b>Lo que no lleva, y es el motivo de que este tipo exista</b> (ADR-0015 §2.2): ni el numero
 * de la declaracion jurada, ni su tipo, ni su fecha, ni sus importes, ni el contribuyente que la
 * presento, ni su identificador. Quien tiene permiso de mirar el catastro no adquiere con eso
 * permiso de mirar las declaraciones de nadie; para eso esta la opcion {@code declaracion_jurada},
 * con su propio acceso. Es la misma linea que {@code ConsultaDeDeudaPublica} traza para la deuda:
 * el importe, no los asientos.
 *
 * <p>Tampoco lleva el {@code titularId} ni el codigo del contribuyente titular —solo su nombre,
 * como la grilla de catastro—: publicarlos es una decision de frontera aparte y hoy no esta tomada
 * (ADR-0015 §2.4). Mientras no lo este, el titular no enlaza.
 */
public record FichaConciliadaResource(
        long id,
        long predioId,
        String codRefCatastral,
        String direccion,
        @Nullable String manzana,
        @Nullable String lote,
        String tipo,
        int version,
        String areaTerreno,
        @Nullable String areaConstruida,
        String uso,
        String vigenciaDesde,
        @Nullable String titular,
        boolean conciliada,
        int conciliadaA) {

    public static FichaConciliadaResource de(FichaConciliada fila) {
        FichaDelPadron ficha = fila.ficha();
        return new FichaConciliadaResource(
                ficha.fichaId(),
                ficha.predioId(),
                ficha.codigoReferenciaCatastral(),
                ficha.direccion(),
                ficha.manzana(),
                ficha.lote(),
                ficha.tipo(),
                ficha.version(),
                ficha.areaTerreno().toString(),
                ficha.areaConstruida() == null ? null : ficha.areaConstruida().toString(),
                ficha.uso(),
                ficha.vigenciaDesde().toString(),
                ficha.titular(),
                fila.conciliada(),
                fila.conciliadaA().valor());
    }
}
