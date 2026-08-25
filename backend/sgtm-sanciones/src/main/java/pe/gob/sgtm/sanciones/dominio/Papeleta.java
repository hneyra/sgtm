package pe.gob.sgtm.sanciones.dominio;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Locale;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;

/**
 * La papeleta de infracción de tránsito, con su desglose <b>guardado, no recalculado</b> (#46,
 * DAT-01 §4.5, RF-060).
 *
 * <p>Los seis importes —{@code baseImponible}, {@code porcentajeInfraccion}, {@code
 * importeInfraccion}, {@code porcentajeACobrar}, {@code importeAPagar} e {@code
 * importeConBeneficio}— no los calcula este tipo ni ningún caso de uso: se toman tal cual del acta
 * física al registrar, exactamente como {@link CodigoInfraccion#porcentajeUit} es un dato de la
 * fila y no una regla (regla 5). Es lo que garantiza que reimprimir la papeleta de hace tres años
 * devuelva los mismos seis importes, aunque el catálogo y la UIT hayan cambiado desde entonces.
 *
 * <p><b>Nunca se borra</b> (regla 4, RNF-051): se anula con acto, cambiando {@link #estado}, no
 * borrando la fila.
 *
 * <p>Este tipo cubre solo la familia {@code TRANSITO} de {@code papeleta} (V4): el {@code placa IS
 * NOT NULL} que exige {@code papeleta_familia_ck} para esa familia está en el compacto. La familia
 * {@code ADMINISTRATIVA} —contribuyente, predio, notificación previa— es alcance de #47.
 *
 * @param id nulo mientras no se ha guardado; lo asigna la base
 * @param numero identifica la papeleta, único junto con la familia; puede corregirse con {@code
 *     CambiarNumeroDePapeleta} dejando traza (RF-067)
 * @param codigoInfraccionId el código del catálogo vigente el día de la infracción
 * @param fechaInfraccion cuándo ocurrió
 * @param horaInfraccion a qué hora, si el acta la trae
 * @param lugar dónde ocurrió
 * @param placa del vehículo infractor
 * @param vehiculoId el vehículo del padrón, si está registrado
 * @param licenciaConducir del infractor, si el acta la trae
 * @param infractorId quien conducía, si se identificó
 * @param propietarioId el titular del vehículo según el padrón, si es distinto del infractor
 * @param baseImponible la UIT del ejercicio de la infracción, tal como se aplicó en el acta
 * @param porcentajeInfraccion el porcentaje que fija el código de infracción
 * @param importeInfraccion base por porcentaje, ya calculado en el acta
 * @param porcentajeACobrar el porcentaje que realmente se cobra (puede diferir del de la infracción
 *     por acumulación de puntos u otra regla del acta)
 * @param importeAPagar lo que corresponde pagar, sin beneficio
 * @param importeConBeneficio lo que corresponde pagar con el descuento vigente, si el acta trae uno
 * @param estado en qué punto está
 * @param usuarioRegistro quien la registró; nulo en una papeleta que todavía no se guardó
 * @param observacion por qué se registra (regla 10)
 */
public record Papeleta(
        @Nullable Long id,
        String numero,
        long codigoInfraccionId,
        LocalDate fechaInfraccion,
        @Nullable LocalTime horaInfraccion,
        String lugar,
        String placa,
        @Nullable Long vehiculoId,
        @Nullable String licenciaConducir,
        @Nullable Long infractorId,
        @Nullable Long propietarioId,
        Dinero baseImponible,
        Alicuota porcentajeInfraccion,
        Dinero importeInfraccion,
        Alicuota porcentajeACobrar,
        Dinero importeAPagar,
        @Nullable Dinero importeConBeneficio,
        EstadoDePapeleta estado,
        @Nullable String usuarioRegistro,
        Observacion observacion) {

    private static final int NUMERO_MAXIMO = 20;
    private static final int LUGAR_MAXIMO = 300;
    private static final int PLACA_MAXIMA = 10;
    private static final int LICENCIA_MAXIMA = 20;

    public Papeleta {
        Objects.requireNonNull(numero, "La papeleta necesita su numero");
        numero = numero.strip().toUpperCase(Locale.ROOT);
        if (numero.isEmpty() || numero.length() > NUMERO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El numero va de 1 a " + NUMERO_MAXIMO + " caracteres: '" + numero + "'");
        }
        if (codigoInfraccionId <= 0) {
            throw new IllegalArgumentException("La papeleta necesita el codigo de infraccion");
        }
        Objects.requireNonNull(fechaInfraccion, "La papeleta necesita la fecha de la infraccion");
        Objects.requireNonNull(lugar, "La papeleta necesita el lugar de la infraccion");
        lugar = lugar.strip();
        if (lugar.isEmpty() || lugar.length() > LUGAR_MAXIMO) {
            throw new IllegalArgumentException(
                    "El lugar va de 1 a " + LUGAR_MAXIMO + " caracteres");
        }
        Objects.requireNonNull(
                placa, "Una papeleta de transito necesita la placa (papeleta_familia_ck)");
        placa = placa.strip().toUpperCase(Locale.ROOT);
        if (placa.isEmpty() || placa.length() > PLACA_MAXIMA) {
            throw new IllegalArgumentException(
                    "La placa va de 1 a " + PLACA_MAXIMA + " caracteres: '" + placa + "'");
        }
        if (licenciaConducir != null) {
            licenciaConducir = licenciaConducir.strip();
            if (licenciaConducir.isEmpty()) {
                licenciaConducir = null;
            } else if (licenciaConducir.length() > LICENCIA_MAXIMA) {
                throw new IllegalArgumentException(
                        "La licencia de conducir excede " + LICENCIA_MAXIMA + " caracteres");
            }
        }
        Objects.requireNonNull(baseImponible, "La papeleta necesita su base imponible");
        Objects.requireNonNull(
                porcentajeInfraccion, "La papeleta necesita el porcentaje de la infraccion");
        Objects.requireNonNull(
                importeInfraccion, "La papeleta necesita el importe de la infraccion");
        Objects.requireNonNull(porcentajeACobrar, "La papeleta necesita el porcentaje a cobrar");
        Objects.requireNonNull(importeAPagar, "La papeleta necesita el importe a pagar");
        Objects.requireNonNull(estado, "La papeleta necesita su estado");
        Objects.requireNonNull(observacion, "Sin observacion no se guarda una papeleta (regla 10)");
    }

    /** Una papeleta de tránsito nueva, todavía sin guardar. */
    public static Papeleta nueva(
            String numero,
            long codigoInfraccionId,
            LocalDate fechaInfraccion,
            @Nullable LocalTime horaInfraccion,
            String lugar,
            String placa,
            @Nullable Long vehiculoId,
            @Nullable String licenciaConducir,
            @Nullable Long infractorId,
            @Nullable Long propietarioId,
            Dinero baseImponible,
            Alicuota porcentajeInfraccion,
            Dinero importeInfraccion,
            Alicuota porcentajeACobrar,
            Dinero importeAPagar,
            @Nullable Dinero importeConBeneficio,
            Observacion observacion) {
        return new Papeleta(
                null,
                numero,
                codigoInfraccionId,
                fechaInfraccion,
                horaInfraccion,
                lugar,
                placa,
                vehiculoId,
                licenciaConducir,
                infractorId,
                propietarioId,
                baseImponible,
                porcentajeInfraccion,
                importeInfraccion,
                porcentajeACobrar,
                importeAPagar,
                importeConBeneficio,
                EstadoDePapeleta.IMPUESTA,
                null,
                observacion);
    }

    public boolean esNueva() {
        return id == null;
    }

    /**
     * La misma papeleta con otro número, para {@code CambiarNumeroDePapeleta}. Sus demás datos,
     * incluido el desglose, no cambian: el cambio de número corrige un error del operador, nunca
     * recalcula nada (RF-067).
     */
    public Papeleta conNumero(String otroNumero) {
        Objects.requireNonNull(id, "Solo se cambia el numero de una papeleta ya guardada");
        return new Papeleta(
                id,
                otroNumero,
                codigoInfraccionId,
                fechaInfraccion,
                horaInfraccion,
                lugar,
                placa,
                vehiculoId,
                licenciaConducir,
                infractorId,
                propietarioId,
                baseImponible,
                porcentajeInfraccion,
                importeInfraccion,
                porcentajeACobrar,
                importeAPagar,
                importeConBeneficio,
                estado,
                usuarioRegistro,
                observacion);
    }
}
