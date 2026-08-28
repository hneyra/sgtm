package pe.gob.sgtm.licencias.dominio;

import java.util.Locale;

/**
 * Las siete partidas del cuadro de valores unitarios de edificacion, tal como la valorizacion del
 * FUE las declara (#48 AC 2, RF-113).
 *
 * <h2>Por que esta enumeracion existe aqui y no se importa de {@code catastro}</h2>
 *
 * <p>{@code catastro.dominio.Partida} dice lo mismo, pero es modelo interno de otro contexto
 * acotado: importarla cruzaria el limite que Spring Modulith vigila. Lo que las dos mitades
 * comparten no es un tipo de Java sino el <b>vocabulario</b>, y ese vive donde tiene que vivir: en
 * el {@code CHECK} de {@code valor_unitario_edificacion.partida} (V1) y en el de {@code
 * edificacion_estructura.partida} (V43), escritos palabra por palabra iguales.
 *
 * <p><b>Duplicar siete nombres no es duplicar una cifra.</b> La regla 5 prohibe lo segundo, y esta
 * enumeracion no lleva ninguna: cuanto vale cada letra de cada partida esta en la tabla de #17 y
 * solo ahi.
 */
public enum PartidaDeEdificacion {
    MUROS("Muros y columnas"),
    TECHOS("Techos"),
    PISOS("Pisos"),
    PUERTAS("Puertas y ventanas"),
    REVESTIMIENTOS("Revestimientos"),
    BANIOS("Banos"),
    INSTALACIONES("Instalaciones electricas y sanitarias");

    private final String etiqueta;

    PartidaDeEdificacion(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }

    public static PartidaDeEdificacion porNombre(String nombre) {
        return valueOf(nombre.strip().toUpperCase(Locale.ROOT));
    }
}
