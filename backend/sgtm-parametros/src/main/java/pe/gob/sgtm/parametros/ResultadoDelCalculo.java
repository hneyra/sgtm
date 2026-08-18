package pe.gob.sgtm.parametros;

import java.util.List;
import java.util.Objects;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Lo que sale del motor: la cifra y <b>que reglas la produjeron</b>.
 *
 * <p>La lista de reglas no es informacion de diagnostico: va a {@code
 * determinacion.reglas_aplicadas} y es lo que hace reproducible un calculo (ADR-0007). Dos anios
 * despues, ante una impugnacion, la pregunta es «que se aplico para que saliera eso», y sin esta
 * lista la unica respuesta posible es leer el codigo de hoy —que ya no es el de entonces—.
 *
 * @param importe la cifra
 * @param ejercicio con que ejercicio de parametros se calculo
 * @param versionDeParametros que version de ese conjunto; dos versiones dan dos cifras legitimas
 * @param reglasAplicadas en el orden en que se aplicaron
 */
public record ResultadoDelCalculo(
        Dinero importe,
        Ejercicio ejercicio,
        int versionDeParametros,
        List<IdentificadorDeRegla> reglasAplicadas) {

    public ResultadoDelCalculo {
        Objects.requireNonNull(importe, "Todo resultado tiene su importe");
        Objects.requireNonNull(ejercicio, "Todo resultado dice con que ejercicio se calculo");
        Objects.requireNonNull(reglasAplicadas, "La lista de reglas es vacia, no nula");
        reglasAplicadas = List.copyOf(reglasAplicadas);
    }

    /** Las reglas aplicadas como texto, que es como viajan a la columna del esquema. */
    public List<String> reglasComoTexto() {
        return reglasAplicadas.stream().map(IdentificadorDeRegla::valor).toList();
    }
}
