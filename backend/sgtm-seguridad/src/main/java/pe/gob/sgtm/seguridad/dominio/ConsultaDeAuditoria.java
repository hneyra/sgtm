package pe.gob.sgtm.seguridad.dominio;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Filtros de la consulta de auditoria (RF-124): quien modifico que, cuando, desde que maquina e IP,
 * y con que observacion.
 *
 * <p>El <b>ejercicio es obligatorio</b> y no es un filtro mas: la tabla esta particionada por el, y
 * una consulta sin ejercicio recorre todas las particiones. Con el volumen que la auditoria alcanza
 * —una fila por cada modificacion del sistema— eso es la diferencia entre una pantalla que responde
 * y una que hay que cancelar. Obligarlo aqui es preferible a descubrirlo en produccion.
 *
 * <p>Los demas filtros son opcionales y se combinan con Y.
 *
 * @param ejercicio clave de particion; obligatorio
 * @param usuario quien hizo el cambio, si se filtra por el
 * @param tabla sobre que tabla, si se filtra por ella
 * @param operacion que clase de acto, si se filtra por el
 * @param desde primer dia del rango, inclusive
 * @param hasta ultimo dia del rango, inclusive
 */
public record ConsultaDeAuditoria(
        Ejercicio ejercicio,
        @Nullable String usuario,
        @Nullable String tabla,
        @Nullable String operacion,
        @Nullable LocalDate desde,
        @Nullable LocalDate hasta) {

    public ConsultaDeAuditoria {
        if (ejercicio == null) {
            throw new IllegalArgumentException(
                    "La consulta de auditoria necesita su ejercicio: es la clave de particion, y"
                            + " sin el la consulta recorre todas");
        }
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new IllegalArgumentException(
                    "El rango termina antes de empezar: " + desde + " a " + hasta);
        }
    }

    public static ConsultaDeAuditoria delEjercicio(Ejercicio ejercicio) {
        return new ConsultaDeAuditoria(ejercicio, null, null, null, null, null);
    }
}
