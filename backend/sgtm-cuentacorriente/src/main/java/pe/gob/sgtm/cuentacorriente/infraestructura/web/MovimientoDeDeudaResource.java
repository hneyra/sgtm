package pe.gob.sgtm.cuentacorriente.infraestructura.web;

import java.util.List;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.web.ImporteActualizado;

/**
 * Lo que devuelve un alta o una baja: los asientos que produjo y su total (RF-043, RF-044).
 *
 * <p>Se devuelven <b>los asientos</b> y no un acuse de recibo, y eso es la mitad del criterio de
 * aceptacion «una baja parcial deja la deuda restante consultable y explicable»: quien la registro
 * ve exactamente que se asento contra que concepto, con el identificador de cada fila.
 *
 * <p>{@code total} lleva su fecha, como toda cifra que sale por HTTP (regla 9, RNF-075). La fecha
 * es la fecha valor del movimiento: el dia con el que entro al libro.
 */
public record MovimientoDeDeudaResource(
        String sentido, ImporteActualizado total, List<AsientoResource> asientos) {

    public static MovimientoDeDeudaResource de(String sentido, List<Asiento> asientos) {
        Dinero total = Dinero.CERO;
        for (Asiento asiento : asientos) {
            total = total.mas(asiento.monto());
        }
        return new MovimientoDeDeudaResource(
                sentido,
                new ImporteActualizado(total, asientos.get(0).fechaValor()),
                asientos.stream().map(AsientoResource::de).toList());
    }
}
