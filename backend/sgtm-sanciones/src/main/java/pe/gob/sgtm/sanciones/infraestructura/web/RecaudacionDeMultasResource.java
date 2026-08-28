package pe.gob.sgtm.sanciones.infraestructura.web;

import java.time.LocalDate;
import java.util.List;
import pe.gob.sgtm.cuentacorriente.RecaudacionDeUnTributo;
import pe.gob.sgtm.cuentacorriente.RecaudadoEnElLibro;
import pe.gob.sgtm.dominio.Dinero;

/**
 * El resumen de recaudación por multas, por HTTP (#53, RF-073, RF-074).
 *
 * <p>Cada cifra viene del <b>libro</b>: es la suma de los abonos vivos —{@code ABONO} de concepto
 * {@code PAGO} que nadie ha reversado—, agregada por PostgreSQL. Ni una se recompone aquí. Sumar
 * los importes de las papeletas en estado {@code PAGADA} daría una cifra parecida y distinta: no
 * contaría los intereses cobrados, contaría entero un pago parcial y seguiría contando un recibo
 * anulado (AC 3 de #53).
 *
 * <p>{@code abonos} no es decorativo: sin él, «300,00» no dice si son tres pagos o uno, y quien
 * cuadre la caja no tiene con qué contrastar.
 */
public record RecaudacionDeMultasResource(
        LocalDate desde,
        LocalDate hasta,
        Dinero total,
        long abonos,
        LocalDate actualizadoA,
        List<Linea> lineas) {

    public static RecaudacionDeMultasResource de(RecaudadoEnElLibro recaudado) {
        return new RecaudacionDeMultasResource(
                recaudado.desde(),
                recaudado.hasta(),
                recaudado.total(),
                recaudado.abonos(),
                recaudado.aLaFecha(),
                recaudado.lineas().stream()
                        .map(linea -> Linea.de(linea, recaudado.aLaFecha()))
                        .toList());
    }

    /**
     * Una línea del resumen.
     *
     * @param mes el de la fecha valor del abono, de 1 a 12; no es el del ejercicio de la obligación
     * @param fase en qué fase de la cobranza estaba la obligación cuando se cobró: lo que la
     *     pantalla llama «tipo de cobranza»
     */
    public record Linea(
            String tributo,
            int ejercicio,
            int mes,
            String fase,
            long abonos,
            Dinero recaudado,
            LocalDate actualizadoA) {

        static Linea de(RecaudacionDeUnTributo linea, LocalDate aLaFecha) {
            return new Linea(
                    linea.tributo(),
                    linea.ejercicio().valor(),
                    linea.mes(),
                    linea.fase(),
                    linea.abonos(),
                    linea.recaudado(),
                    aLaFecha);
        }
    }
}
