package pe.gob.sgtm.sanciones.dominio;

import java.time.LocalDate;
import java.util.Locale;
import org.jspecify.annotations.Nullable;

/**
 * Lo que piden las tres pantallas de consulta de #46 —{@code papeletas}, {@code transito_busqueda}
 * y {@code transito_estado_cuenta}—, combinado en un solo criterio: cada controlador traduce sus
 * propios parámetros aquí. Todos los campos son opcionales y se combinan con Y.
 *
 * @param numero de la papeleta
 * @param placa del vehículo infractor
 * @param documentoInfractor DNI o RUC del infractor, tal como lo escribe el operador
 * @param desde fecha de infracción, límite inferior
 * @param hasta fecha de infracción, límite superior
 * @param estado de la papeleta
 * @param ingresadoPor el usuario que la registró
 * @param soloPendientes solo lo que todavía no está {@code PAGADA}, {@code ANULADA} ni {@code
 *     PRESCRITA} — lo que pide {@code transito_estado_cuenta}
 */
public record CriterioDePapeleta(
        @Nullable String numero,
        @Nullable String placa,
        @Nullable String documentoInfractor,
        @Nullable LocalDate desde,
        @Nullable LocalDate hasta,
        @Nullable EstadoDePapeleta estado,
        @Nullable String ingresadoPor,
        boolean soloPendientes) {

    public CriterioDePapeleta {
        numero = limpiar(numero);
        placa = limpiar(placa);
        documentoInfractor = limpiar(documentoInfractor);
        ingresadoPor = limpiar(ingresadoPor);
        if (desde != null && hasta != null && hasta.isBefore(desde)) {
            throw new IllegalArgumentException("«hasta» no puede ser anterior a «desde»");
        }
    }

    private static @Nullable String limpiar(@Nullable String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.strip();
        return limpio.isEmpty() ? null : limpio.toUpperCase(Locale.ROOT);
    }
}
