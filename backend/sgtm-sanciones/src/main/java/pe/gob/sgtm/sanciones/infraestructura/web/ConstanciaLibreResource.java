package pe.gob.sgtm.sanciones.infraestructura.web;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.sanciones.dominio.ConstanciaLibre;

/**
 * Una constancia libre de infracciones, por HTTP (#53, RF-068).
 *
 * <p>{@code verificadaAl} sale <b>siempre</b>, y separada de {@code fechaEmision}: son cosas
 * distintas y la que acredita es la primera. Una constancia emitida hoy sobre una verificación de
 * ayer dice exactamente eso, y quien la recibe puede juzgarlo (regla 9, RNF-075).
 */
public record ConstanciaLibreResource(
        String numero,
        String placa,
        LocalDate verificadaAl,
        LocalDate fechaEmision,
        @Nullable String usuarioQueEmitio,
        String observacion) {

    public static ConstanciaLibreResource de(ConstanciaLibre constancia) {
        return new ConstanciaLibreResource(
                constancia.numero(),
                constancia.placa(),
                constancia.verificadaAl(),
                constancia.fechaEmision(),
                constancia.usuarioRegistro(),
                constancia.observacion().texto());
    }
}
