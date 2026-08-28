package pe.gob.sgtm.indicadores.dominio;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * El panel entero: el avance de la recaudacion de un ejercicio, a una fecha y a una hora (#56,
 * RF-130).
 *
 * <p>Lleva las <b>dos</b> marcas de tiempo y las dos hacen falta. {@link #fechaCalculo} es el dia
 * tributario con el que se leyo —el que las cifras dicen y el que la pantalla imprime—; {@link
 * #calculadoEn} es el instante exacto en que se leyeron, con su zona. Un panel se recarga cada
 * pocos minutos y dos lecturas del mismo dia dan cifras distintas: sin la hora, dos capturas del
 * mismo panel serian indistinguibles y ninguna podria explicarse (AC 2 de #56, RNF-075).
 *
 * <p>No hay aqui ninguna cifra que no venga de un contexto que la publica. Ver el paquete raiz.
 *
 * @param ejercicio el ejercicio del que se habla
 * @param fechaCalculo el dia al que corresponden las cifras
 * @param calculadoEn el instante en que se leyeron
 * @param indicadores las cifras grandes
 * @param carteras los bloques de filas
 */
public record AvanceDeRecaudacion(
        Ejercicio ejercicio,
        LocalDate fechaCalculo,
        Instant calculadoEn,
        List<Indicador> indicadores,
        List<Cartera> carteras) {

    public AvanceDeRecaudacion {
        Objects.requireNonNull(ejercicio, "El panel siempre es de un ejercicio");
        Objects.requireNonNull(fechaCalculo, "Un panel sin fecha de corte miente al dia siguiente");
        Objects.requireNonNull(
                calculadoEn, "El panel dice tambien a que hora se leyo (AC 2 de #56)");
        Objects.requireNonNull(indicadores, "La lista es vacia, no nula");
        Objects.requireNonNull(carteras, "La lista es vacia, no nula");
        indicadores = List.copyOf(indicadores);
        carteras = List.copyOf(carteras);
    }
}
