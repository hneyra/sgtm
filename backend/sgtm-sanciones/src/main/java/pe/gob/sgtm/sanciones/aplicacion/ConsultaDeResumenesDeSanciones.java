package pe.gob.sgtm.sanciones.aplicacion;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.RecaudacionDelLibro;
import pe.gob.sgtm.cuentacorriente.RecaudadoEnElLibro;
import pe.gob.sgtm.sanciones.dominio.AgrupacionDelResumen;
import pe.gob.sgtm.sanciones.dominio.CriterioDePadron;
import pe.gob.sgtm.sanciones.dominio.Familia;
import pe.gob.sgtm.sanciones.dominio.LineaDelResumen;
import pe.gob.sgtm.sanciones.dominio.PadronDePapeletasRepository;
import pe.gob.sgtm.sanciones.dominio.ResumenDePapeletas;

/**
 * Los cuatro resúmenes de #53: papeletas pendientes y pagadas, por código de infracción, por
 * iniciales de placa, y el de recaudación —de tránsito y de administrativas— (RF-073, RF-074).
 *
 * <h2>Las dos preguntas son distintas y salen de dos sitios distintos</h2>
 *
 * <p><b>«Cuántas papeletas hay y por cuánto»</b> se contesta contando papeletas: {@link #resumir}
 * agrega {@code papeleta.importe_a_pagar}, que es el importe <b>del acta</b>, y agrupa por el
 * estado en que está cada una.
 *
 * <p><b>«Cuánto se recaudó»</b> se contesta con el <b>libro</b>: {@link #recaudacion} pregunta a
 * {@link RecaudacionDelLibro}, que suma los abonos vivos —{@code ABONO} de concepto {@code PAGO}
 * que nadie ha reversado—. Es el tercer criterio de aceptación de #53: «lo recaudado por papeletas
 * es exactamente la suma de sus abonos».
 *
 * <p>La salida cómoda —sumar {@code importe_a_pagar} de las papeletas en estado {@code PAGADA} y
 * llamarlo recaudación— daría una cifra <b>parecida y distinta</b>: no cuenta los intereses
 * cobrados, cuenta entero un pago parcial, y sigue contando un recibo anulado. Es la peor clase de
 * cifra, la que nadie comprueba porque se parece a la buena, y por eso esta clase tiene dos métodos
 * y no uno.
 *
 * <h2>Qué tributos son «papeletas»</h2>
 *
 * <p>Lo decide {@code sanciones}, que es quien sabe con qué tributo asentó cada multa ({@link
 * ObligacionDeLaPapeleta}). {@code cuentacorriente} recibe nombres de tributo y devuelve lo que el
 * libro dice de ellos, sin saber que existe una papeleta (ARQ-01 §4 regla 2).
 */
@Service
public class ConsultaDeResumenesDeSanciones {

    private final PadronDePapeletasRepository padron;
    private final RecaudacionDelLibro libro;

    public ConsultaDeResumenesDeSanciones(
            PadronDePapeletasRepository padron, RecaudacionDelLibro libro) {
        this.padron = padron;
        this.libro = libro;
    }

    /**
     * Cuenta las papeletas del criterio, agrupadas.
     *
     * @param aLaFecha el día al que se leen los estados; viaja con el resumen (regla 9, RNF-075)
     */
    @Transactional(readOnly = true)
    public ResumenDePapeletas resumir(
            CriterioDePadron criterio, AgrupacionDelResumen agrupacion, LocalDate aLaFecha) {

        Objects.requireNonNull(criterio, "El resumen necesita su criterio");
        Objects.requireNonNull(agrupacion, "El resumen dice por que agrupa");
        Objects.requireNonNull(aLaFecha, "Toda cifra indica su fecha (RNF-075, regla 9)");
        LocalDate desde =
                Objects.requireNonNull(
                        criterio.desde(), "Un resumen de papeletas acota desde cuando cuenta");
        LocalDate hasta =
                Objects.requireNonNull(
                        criterio.hasta(), "Un resumen de papeletas acota hasta cuando cuenta");

        List<LineaDelResumen> lineas = padron.resumir(criterio, agrupacion);
        return new ResumenDePapeletas(lineas, agrupacion, desde, hasta, aLaFecha);
    }

    /**
     * Lo recaudado por multas de esa familia entre las dos fechas, según el libro.
     *
     * @param aLaFecha el día con el que se responde; viaja con la cifra (regla 9, RNF-075)
     */
    @Transactional(readOnly = true)
    public RecaudadoEnElLibro recaudacion(
            Familia familia, LocalDate desde, LocalDate hasta, LocalDate aLaFecha) {

        Objects.requireNonNull(familia, "El resumen necesita su familia");
        return libro.recaudadoPor(
                List.of(ObligacionDeLaPapeleta.tributoDe(familia)), desde, hasta, aLaFecha);
    }
}
