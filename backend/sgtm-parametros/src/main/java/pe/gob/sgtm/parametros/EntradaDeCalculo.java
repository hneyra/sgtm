package pe.gob.sgtm.parametros;

import java.time.LocalDate;
import java.util.Objects;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * Lo que una regla tributaria recibe. <b>Todo</b> lo que recibe.
 *
 * <p>Ahi esta la pureza de la regla 6, escrita como un tipo: la fecha entra —no se lee del reloj—,
 * los parametros entran —no se buscan en la base— y la politica de redondeo entra —no es una
 * constante—. Una regla que necesite algo mas tiene que pedirlo aqui, y ese cambio se ve en el diff
 * de todas las reglas a la vez, que es exactamente cuando conviene discutirlo.
 *
 * @param base el importe sobre el que opera la regla
 * @param fecha la fecha a la que se calcula; nunca {@code LocalDate.now()}
 * @param parametros el conjunto sellado del ejercicio
 * @param redondeo la politica, recibida mientras D-03 siga abierta
 */
public record EntradaDeCalculo(
        Dinero base, LocalDate fecha, ParametrosSellados parametros, PoliticaDeRedondeo redondeo) {

    public EntradaDeCalculo {
        Objects.requireNonNull(base, "La regla necesita su base");
        Objects.requireNonNull(fecha, "La fecha entra como argumento (regla 6)");
        Objects.requireNonNull(parametros, "La regla necesita el conjunto sellado del ejercicio");
        Objects.requireNonNull(redondeo, "La politica de redondeo se recibe, no se fija (D-03)");
    }

    /** La misma entrada con otra base: es como el motor encadena una regla con la siguiente. */
    public EntradaDeCalculo con(Dinero otraBase) {
        return new EntradaDeCalculo(otraBase, fecha, parametros, redondeo);
    }
}
