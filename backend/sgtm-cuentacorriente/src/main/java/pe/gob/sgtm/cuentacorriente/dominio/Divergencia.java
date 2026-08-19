package pe.gob.sgtm.cuentacorriente.dominio;

import java.util.Objects;
import pe.gob.sgtm.dominio.Dinero;

/**
 * Una clave en la que la cache y el libro no dicen lo mismo.
 *
 * <p>La conciliacion las <b>reporta</b>; no las corrige. Corregir en silencio dejaria el saldo bien
 * y el defecto que lo desajusto vivo, para que vuelva a pasar el mes siguiente sin que nadie sepa
 * cuantas veces paso. Reparar es un acto aparte —la reconstruccion— y deliberado.
 *
 * @param proyectado lo que dice la cache; cero si no hay fila
 * @param real lo que dice el libro
 */
public record Divergencia(ClaveDeSaldo clave, Dinero proyectado, Dinero real) {

    public Divergencia {
        Objects.requireNonNull(clave, "Una divergencia necesita saber de que clave es");
        Objects.requireNonNull(proyectado, "Una divergencia necesita lo proyectado");
        Objects.requireNonNull(real, "Una divergencia necesita lo real");
        if (proyectado.equals(real)) {
            throw new IllegalArgumentException(
                    "Esto no es una divergencia: la cache y el libro dicen lo mismo ("
                            + real
                            + "). Reportar coincidencias como divergencias haria que el informe de"
                            + " conciliacion no se leyera");
        }
    }

    /** Cuanto sobra o falta en la cache. Negativo significa que la cache proyecta de menos. */
    public Dinero diferencia() {
        return proyectado.menos(real);
    }

    @Override
    public String toString() {
        return clave + ": la cache dice " + proyectado + " y el libro " + real;
    }
}
