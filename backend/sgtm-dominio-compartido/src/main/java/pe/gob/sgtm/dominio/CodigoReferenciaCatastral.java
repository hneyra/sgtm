package pe.gob.sgtm.dominio;

import java.util.Objects;

/**
 * Codigo de referencia catastral de un predio (RF-005).
 *
 * <p>Es la direccion fisica del predio dentro del territorio, y con el se emparejan la ficha
 * catastral, la determinacion y la deuda. Un codigo mal compuesto no se detecta al escribirlo: se
 * detecta cuando dos predios distintos colisionan o cuando un padron entero deja de cuadrar con el
 * catastro.
 *
 * <p>Por eso la validacion es de <b>composicion</b> y no de longitud a secas: se exige que todas
 * las posiciones sean digitos y que sumen exactamente lo que la {@link ComposicionCatastral} pide.
 * Una letra en la posicion 7 se rechaza aunque la longitud total sea correcta.
 *
 * <p>La composicion se recibe (ver {@link ComposicionCatastral} y <b>D-10</b>); el constructor sin
 * ella usa la plantilla del manual, {@code DDPPddSSMMMLLLEEeeppUUU}.
 */
public record CodigoReferenciaCatastral(String valor, ComposicionCatastral composicion) {

    public CodigoReferenciaCatastral {
        Objects.requireNonNull(valor, "El codigo de referencia catastral es obligatorio");
        Objects.requireNonNull(composicion, "La composicion es obligatoria (D-10)");
        valor = valor.strip();
        if (valor.length() != composicion.longitud()) {
            throw new IllegalArgumentException(
                    "El codigo de referencia catastral debe tener "
                            + composicion.longitud()
                            + " posiciones y tiene "
                            + valor.length()
                            + ": '"
                            + valor
                            + "'");
        }
        for (int posicion = 0; posicion < valor.length(); posicion++) {
            char caracter = valor.charAt(posicion);
            if (caracter < '0' || caracter > '9') {
                throw new IllegalArgumentException(
                        "El codigo de referencia catastral es solo digitos; la posicion "
                                + (posicion + 1)
                                + " es '"
                                + caracter
                                + "': '"
                                + valor
                                + "'");
            }
        }
    }

    /** Codigo con la plantilla del manual. */
    public static CodigoReferenciaCatastral de(String texto) {
        return new CodigoReferenciaCatastral(texto, ComposicionCatastral.DEL_MANUAL);
    }

    /** Codigo con una composicion distinta, para cuando D-10 se cierre en otro sentido. */
    public static CodigoReferenciaCatastral de(String texto, ComposicionCatastral composicion) {
        return new CodigoReferenciaCatastral(texto, composicion);
    }

    /**
     * Los digitos de un tramo, por su nombre.
     *
     * @throws IllegalArgumentException si la composicion de este codigo no tiene ese tramo
     */
    public String tramo(String nombre) {
        int inicio = composicion.inicioDe(nombre);
        if (inicio < 0) {
            throw new IllegalArgumentException(
                    "La composicion de este codigo no tiene el tramo '" + nombre + "'");
        }
        int longitud =
                composicion.tramos().stream()
                        .filter(t -> t.nombre().equals(nombre))
                        .mapToInt(ComposicionCatastral.Tramo::longitud)
                        .findFirst()
                        .orElseThrow();
        return valor.substring(inicio, inicio + longitud);
    }

    /**
     * El ubigeo del predio: departamento, provincia y distrito, que son los tres primeros tramos.
     */
    public String ubigeo() {
        return tramo("departamento") + tramo("provincia") + tramo("distrito");
    }

    @Override
    public String toString() {
        return valor;
    }
}
