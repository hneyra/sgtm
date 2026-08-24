package pe.gob.sgtm.catastro;

import java.util.Objects;
import pe.gob.sgtm.dominio.Porcentaje;

/**
 * Un predio del que un contribuyente es titular, publicado para otros contextos acotados (ARQ-01
 * §4, #25).
 *
 * <p>No es {@link pe.gob.sgtm.catastro.dominio.Predio} entero: quien consulta desde fuera necesita
 * identificar la unidad y saber cuanto le corresponde, no el catalogo de vias, manzanas ni el
 * estado del padron —eso es {@code .dominio}, y cruzar la frontera del modulo con ello obligaria a
 * este contexto a exponer su modelo interno completo—.
 *
 * @param predioId el identificador interno, para cruzar con la deuda de {@code cuentacorriente}
 * @param codigoReferenciaCatastral el codigo con el que se identifica el predio en ventanilla
 * @param tipo {@code URBANO} o {@code RUSTICO}
 * @param direccion la direccion del predio
 * @param porcentajeTitularidad cuanto le corresponde al contribuyente consultado, a la fecha
 */
public record PredioDelContribuyente(
        long predioId,
        String codigoReferenciaCatastral,
        String tipo,
        String direccion,
        Porcentaje porcentajeTitularidad) {

    public PredioDelContribuyente {
        Objects.requireNonNull(
                codigoReferenciaCatastral, "El predio necesita su codigo de referencia catastral");
        Objects.requireNonNull(tipo, "El predio necesita su tipo");
        Objects.requireNonNull(direccion, "El predio necesita su direccion");
        Objects.requireNonNull(porcentajeTitularidad, "La titularidad necesita su porcentaje");
    }
}
