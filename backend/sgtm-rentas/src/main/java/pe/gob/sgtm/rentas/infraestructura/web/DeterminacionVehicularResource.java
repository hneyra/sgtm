package pe.gob.sgtm.rentas.infraestructura.web;

import pe.gob.sgtm.rentas.aplicacion.RegistrarDeterminacionVehicular;
import pe.gob.sgtm.rentas.dominio.Vehiculo;
import pe.gob.sgtm.rentas.dominio.predial.Determinacion;

/**
 * Una determinación vehicular tal como sale por HTTP. Campos en español {@code camelCase} (ARQ-04
 * §3).
 *
 * <p>{@code valorReferencial} y {@code montoDeterminado} viajan como texto y no como {@link
 * pe.gob.sgtm.dominio.Dinero}: son la cifra fija con que se determinó, no un saldo que cambie con
 * el tiempo —mismo motivo que {@code ArbitrioResource}—, así que no necesitan {@code
 * ImporteActualizado} para cumplir la regla de ArchUnit {@code TODA_CIFRA_DE_LA_WEB_LLEVA_SU_FECHA}
 * (regla 9): esa regla mira el tipo {@code Dinero}, y aquí no aparece. La fecha a la que están
 * calculadas es una sola para toda la petición y vive en {@link CalculoVehicularResource}.
 *
 * <p><b>Los importes viajan sin redondear.</b> El vehicular no tiene todavía ningún punto de
 * redondeo parametrizado y {@link pe.gob.sgtm.dominio.Dinero} no elige escala por su cuenta
 * (D-03a/D-03c, ADR-0018): {@code 112800.00 × 1 %} sale «1128.0000». Redondearlo aquí sería tomar
 * esa decisión de paso y repartirla por la capa web.
 *
 * @param id el identificador de la determinación guardada; {@code 0} si esto fue una simulación
 * @param ejercicio el ejercicio determinado
 * @param vehiculoId el vehículo determinado
 * @param placa su placa
 * @param contribuyenteId de quién es
 * @param valorReferencial la base imponible: el valor del vehículo en la tabla del ejercicio
 * @param montoDeterminado el impuesto resultante
 * @param simulacion si es {@code true}, esta determinación no se guardó (modo simulación, RF-025)
 */
public record DeterminacionVehicularResource(
        long id,
        String ejercicio,
        long vehiculoId,
        String placa,
        long contribuyenteId,
        String valorReferencial,
        String montoDeterminado,
        boolean simulacion) {

    public static DeterminacionVehicularResource de(
            RegistrarDeterminacionVehicular.Calculo calculo, Vehiculo vehiculo) {
        Determinacion determinacion = calculo.determinacion();
        return new DeterminacionVehicularResource(
                determinacion.id() == null ? 0L : determinacion.id(),
                determinacion.ejercicio().toString(),
                vehiculo.id() == null ? 0L : vehiculo.id(),
                vehiculo.placa().toString(),
                determinacion.contribuyenteId(),
                determinacion.baseImponible().valor().toPlainString(),
                determinacion.montoDeterminado().valor().toPlainString(),
                determinacion.esNueva());
    }
}
