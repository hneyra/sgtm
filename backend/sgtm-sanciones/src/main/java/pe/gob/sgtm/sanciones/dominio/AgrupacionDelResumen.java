package pe.gob.sgtm.sanciones.dominio;

import org.jspecify.annotations.Nullable;

/**
 * Por qué se agrupan las papeletas en un resumen (#53, RF-073).
 *
 * <p>Las tres pantallas de resumen del manual piden la misma cuenta agrupada por cosas distintas:
 * «pendientes y pagadas» por estado, «por código de infracción» por su código y «por iniciales de
 * placa» por las dos primeras letras. Un solo agregado con tres agrupadores, y no tres consultas:
 * tres consultas para la misma cuenta son tres oportunidades de divergir, y la que se mira menos es
 * la que se queda mal.
 *
 * <h2>Estas cadenas se concatenan al SQL, y por eso son constantes</h2>
 *
 * <p>{@code GROUP BY} no admite parámetros de enlace: lo que llegue aquí acaba dentro de la
 * consulta sí o sí. Son constantes de un enumerado y <b>nunca</b> texto del cliente —el mismo
 * principio que {@code OrdenSeguro}, y el motivo por el que el controlador traduce el filtro de la
 * pantalla a uno de estos cuatro valores en vez de pasarlo tal cual—.
 */
public enum AgrupacionDelResumen {

    /** Una línea por estado de la papeleta: impuesta, notificada, pagada, coactiva… */
    ESTADO("p.estado", "p.estado", null),

    /** Una línea por código del catálogo de infracciones, con su descripción. */
    CODIGO("ci.codigo", "ci.codigo, ci.descripcion", "ci.descripcion"),

    /**
     * Una línea por las dos letras iniciales de la placa.
     *
     * <p>{@code left(placa, 2)} en el {@code GROUP BY}, no en el {@code WHERE}: agrupar no es
     * filtrar, y el filtro por un prefijo concreto sigue yendo por rango para que el índice sirva.
     */
    PLACA("left(p.placa, 2)", "left(p.placa, 2)", null),

    /** Una línea por mes de la fecha de infracción. */
    MES("to_char(p.fecha_infraccion, 'YYYY-MM')", "to_char(p.fecha_infraccion, 'YYYY-MM')", null);

    private final String expresion;
    private final String agrupacion;
    private final @Nullable String descripcion;

    AgrupacionDelResumen(String expresion, String agrupacion, @Nullable String descripcion) {
        this.expresion = expresion;
        this.agrupacion = agrupacion;
        this.descripcion = descripcion;
    }

    /** La expresión SQL que produce la clave de la línea. */
    public String expresion() {
        return expresion;
    }

    /** Las columnas del {@code GROUP BY}, que incluyen la descripción cuando la hay. */
    public String agrupacion() {
        return agrupacion;
    }

    /**
     * La expresión SQL de la descripción de la clave, o {@code null} si este agrupador no tiene.
     *
     * <p>Solo el código del catálogo la tiene. Un estado se explica solo y unas iniciales de placa
     * no describen nada; inventar un texto para ellas sería dibujar en la hoja una columna que no
     * dice nada.
     */
    public @Nullable String descripcion() {
        return descripcion;
    }
}
