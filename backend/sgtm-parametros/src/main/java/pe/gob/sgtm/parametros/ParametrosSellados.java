package pe.gob.sgtm.parametros;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.ValorNormativo;

/**
 * Los parametros de un ejercicio, ya sellados, como objeto inmutable.
 *
 * <p>Es lo que una regla tributaria recibe como <b>argumento</b>. No hay ningun metodo estatico que
 * los busque, ni una configuracion global de donde salgan: si una regla pudiera pedirlos por su
 * cuenta, dejaria de ser una funcion pura y recalcular el ejercicio 2027 en 2037 dependeria de lo
 * que hubiera en la base ese dia.
 *
 * <p>Sellados, y no «los del ejercicio»: un conjunto abierto todavia se puede corregir, asi que
 * calcular con el produce una cifra que manana puede ser otra. {@link LectorDeParametros} solo
 * entrega sellados.
 */
public final class ParametrosSellados {

    private final Ejercicio ejercicio;
    private final int version;
    private final Map<String, ValorNormativo> numeros;
    private final Map<String, String> textos;

    private ParametrosSellados(
            Ejercicio ejercicio,
            int version,
            Map<String, ValorNormativo> numeros,
            Map<String, String> textos) {
        this.ejercicio = ejercicio;
        this.version = version;
        this.numeros = Map.copyOf(numeros);
        this.textos = Map.copyOf(textos);
    }

    /** Constructor para quien lee de la base y para las pruebas, que arman los suyos a mano. */
    public static Constructor de(Ejercicio ejercicio, int version) {
        return new Constructor(ejercicio, version);
    }

    public Ejercicio ejercicio() {
        return ejercicio;
    }

    public int version() {
        return version;
    }

    public Optional<ValorNormativo> numero(String tipo, @Nullable String clave) {
        return Optional.ofNullable(numeros.get(llave(tipo, clave)));
    }

    public Optional<String> texto(String tipo, @Nullable String clave) {
        return Optional.ofNullable(textos.get(llave(tipo, clave)));
    }

    /**
     * El valor, o un error que dice cual falta.
     *
     * <p>Lo que <b>no</b> hay es un valor por omision. Una regla que calculara con cero porque el
     * parametro no estaba produciria un padron entero de importes bajos sin ningun error de por
     * medio, y eso se descubre cuando llega la primera reclamacion.
     */
    public ValorNormativo exigirNumero(String tipo, @Nullable String clave) {
        return numero(tipo, clave)
                .orElseThrow(
                        () ->
                                new ParametroAusente(
                                        "El conjunto sellado del ejercicio "
                                                + ejercicio
                                                + " (version "
                                                + version
                                                + ") no tiene el parametro "
                                                + llave(tipo, clave)));
    }

    private static String llave(String tipo, @Nullable String clave) {
        Objects.requireNonNull(tipo, "Todo parametro tiene tipo");
        return clave == null || clave.isBlank() ? tipo : tipo + ":" + clave;
    }

    /** Falta un parametro que la regla necesita. Nunca se sustituye por un valor por omision. */
    public static final class ParametroAusente extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        ParametroAusente(String mensaje) {
            super(mensaje);
        }
    }

    /** Arma un juego de parametros sellados. */
    public static final class Constructor {

        private final Ejercicio ejercicio;
        private final int version;
        private final Map<String, ValorNormativo> numeros = new LinkedHashMap<>();
        private final Map<String, String> textos = new LinkedHashMap<>();

        private Constructor(Ejercicio ejercicio, int version) {
            this.ejercicio = Objects.requireNonNull(ejercicio);
            this.version = version;
        }

        public Constructor numero(String tipo, @Nullable String clave, ValorNormativo valor) {
            numeros.put(llave(tipo, clave), Objects.requireNonNull(valor));
            return this;
        }

        public Constructor texto(String tipo, @Nullable String clave, String valor) {
            textos.put(llave(tipo, clave), Objects.requireNonNull(valor));
            return this;
        }

        public ParametrosSellados construir() {
            return new ParametrosSellados(ejercicio, version, numeros, textos);
        }
    }
}
