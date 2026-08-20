package pe.gob.sgtm.parametros.dominio;

import java.time.Instant;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Los parametros que rigen un ejercicio, como conjunto.
 *
 * <p>Es un conjunto y no una coleccion de valores sueltos porque lo que hay que poder decir dos
 * anios despues no es «cuanto valia la UIT», sino «con que juego de valores se emitio este padron».
 * Esa pregunta solo tiene respuesta si el juego entero se congela de una vez y queda identificado
 * (ADR-0007).
 *
 * <p>Puede haber varias versiones abiertas de un mismo ejercicio mientras se prepara, y <b>una sola
 * sellada</b>: con dos, ninguna consulta podria decir cual se aplico. Lo garantiza un indice unico
 * parcial de la base (V9), no la aplicacion.
 *
 * @param id nulo mientras no se ha guardado
 * @param version numero de version dentro del ejercicio; corregir un sellado crea la siguiente
 */
public record ConjuntoDeParametros(
        @Nullable Long id,
        Ejercicio ejercicio,
        int version,
        EstadoDelConjunto estado,
        @Nullable Instant fechaSellado,
        @Nullable String usuarioSellado) {

    public ConjuntoDeParametros {
        Objects.requireNonNull(ejercicio, "El conjunto necesita su ejercicio");
        Objects.requireNonNull(estado, "El conjunto necesita su estado");
        if (version < 1) {
            throw new IllegalArgumentException("La version empieza en 1: " + version);
        }
        if (estado == EstadoDelConjunto.SELLADO
                && (fechaSellado == null || usuarioSellado == null)) {
            throw new IllegalArgumentException(
                    "Un conjunto sellado dice cuando y quien lo sello: sin eso el sellado no es un"
                            + " acto administrativo, es un valor de columna");
        }
    }

    public static ConjuntoDeParametros nuevo(Ejercicio ejercicio, int version) {
        return new ConjuntoDeParametros(
                null, ejercicio, version, EstadoDelConjunto.ABIERTO, null, null);
    }

    public boolean estaSellado() {
        return estado == EstadoDelConjunto.SELLADO;
    }

    /**
     * El mismo conjunto, sellado.
     *
     * <p>El instante y el usuario entran como argumentos: ninguna clase de dominio lee el reloj
     * (regla 6) ni conoce quien esta conectado.
     */
    public ConjuntoDeParametros sellado(Instant cuando, String quien) {
        if (estaSellado()) {
            throw new IllegalStateException(
                    "El conjunto ya estaba sellado; corregirlo exige una version nueva (ADR-0007)");
        }
        return new ConjuntoDeParametros(
                id, ejercicio, version, EstadoDelConjunto.SELLADO, cuando, quien);
    }
}
