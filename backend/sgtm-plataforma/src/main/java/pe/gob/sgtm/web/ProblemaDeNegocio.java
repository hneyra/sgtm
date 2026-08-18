package pe.gob.sgtm.web;

import java.util.List;
import java.util.Objects;

/**
 * Error previsto, con su codigo del catalogo.
 *
 * <p>Se lanza desde la capa de aplicacion cuando la operacion no se puede completar por una razon
 * que el usuario puede entender y corregir. Lo que <b>no</b> se hace nunca es dejar salir la
 * excepcion del motor de base de datos: eso lo traduce {@link ManejadorDeErrores} a {@link
 * CodigoDeError#ERROR_INTERNO}, sin detalle.
 */
public class ProblemaDeNegocio extends RuntimeException {

    @java.io.Serial private static final long serialVersionUID = 1L;

    private final CodigoDeError codigo;
    private final List<String> detalles;

    public ProblemaDeNegocio(CodigoDeError codigo, String mensaje) {
        this(codigo, mensaje, List.of());
    }

    public ProblemaDeNegocio(CodigoDeError codigo, String mensaje, List<String> detalles) {
        super(mensaje);
        this.codigo = Objects.requireNonNull(codigo, "Todo problema lleva su codigo del catalogo");
        this.detalles = List.copyOf(detalles);
    }

    public CodigoDeError codigo() {
        return codigo;
    }

    public List<String> detalles() {
        return detalles;
    }
}
