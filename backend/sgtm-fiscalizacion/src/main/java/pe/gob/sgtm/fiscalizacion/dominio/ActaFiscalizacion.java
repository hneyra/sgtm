package pe.gob.sgtm.fiscalizacion.dominio;

import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.AreaM2;
import pe.gob.sgtm.dominio.Observacion;

/**
 * La inspección de campo de un predio o un vehículo, sobre una <b>copia</b>: nada de lo que guarda
 * este tipo toca {@code catastro} ni {@code rentas} (ARQ-01 §3.5, AC de #45).
 *
 * <p>Es un solo tipo para las dos familias —predial y vehicular—, porque comparten tabla ({@code
 * acta_fiscalizacion}, V4) y ciclo de vida; lo que cambia es cuál de {@code predioId}/{@code
 * vehiculoId} trae valor, exigido en el compacto y reforzado en la base por {@code
 * acta_fisc_predio_xor_vehiculo_ck} (V24).
 *
 * <p>{@code fichaId} es la versión de {@code ficha_catastral} vigente a {@code fechaVisita} —nunca
 * la actual—, para que comparar lo hallado contra lo declarado sea reproducible más adelante
 * (RNF-075), igual que {@code fichaCatastralId} en {@code DeclaracionJurada} (#28). Solo tiene
 * sentido en un acta predial: una fiscalización vehicular no versiona ficha alguna.
 *
 * @param id nulo mientras no se ha guardado; lo asigna la base
 * @param programaId el programa que la originó
 * @param version la visita número N sobre este contribuyente dentro del mismo programa
 * @param contribuyenteId a quién se fiscaliza
 * @param predioId el predio inspeccionado, si el acta es predial
 * @param vehiculoId el vehículo inspeccionado, si el acta es vehicular
 * @param fichaId la versión de ficha vigente a la visita, si el acta es predial y el predio tiene
 *     ficha registrada
 * @param fechaVisita cuándo se hizo la inspección
 * @param fiscalizador quién la hizo
 * @param hallazgo qué encontró, si ya se determinó
 * @param areaHallada el área que el fiscalizador midió en campo, si aplica
 * @param detalle notas libres de la inspección
 * @param estado en qué punto está
 * @param observacion por qué se registra (regla 10)
 */
public record ActaFiscalizacion(
        @Nullable Long id,
        long programaId,
        int version,
        long contribuyenteId,
        @Nullable Long predioId,
        @Nullable Long vehiculoId,
        @Nullable Long fichaId,
        LocalDate fechaVisita,
        String fiscalizador,
        @Nullable Hallazgo hallazgo,
        @Nullable AreaM2 areaHallada,
        @Nullable String detalle,
        EstadoDeActa estado,
        Observacion observacion) {

    private static final int FISCALIZADOR_MAXIMO = 60;
    private static final int DETALLE_MAXIMO = 1000;

    public ActaFiscalizacion {
        if (programaId <= 0) {
            throw new IllegalArgumentException("El acta necesita el programa que la origino");
        }
        if (version <= 0) {
            throw new IllegalArgumentException("La version de un acta empieza en 1");
        }
        if (contribuyenteId <= 0) {
            throw new IllegalArgumentException(
                    "El acta necesita el identificador del contribuyente fiscalizado");
        }
        if ((predioId == null) == (vehiculoId == null)) {
            throw new IllegalArgumentException(
                    "Un acta es de un predio o de un vehiculo, nunca de los dos ni de ninguno");
        }
        if (fichaId != null && predioId == null) {
            throw new IllegalArgumentException("Solo un acta predial referencia una ficha");
        }
        Objects.requireNonNull(fechaVisita, "El acta necesita la fecha de la visita");
        Objects.requireNonNull(fiscalizador, "El acta necesita quien la hizo");
        fiscalizador = fiscalizador.strip();
        if (fiscalizador.isEmpty() || fiscalizador.length() > FISCALIZADOR_MAXIMO) {
            throw new IllegalArgumentException(
                    "El fiscalizador va de 1 a " + FISCALIZADOR_MAXIMO + " caracteres");
        }
        if (detalle != null) {
            detalle = detalle.strip();
            if (detalle.isEmpty()) {
                detalle = null;
            } else if (detalle.length() > DETALLE_MAXIMO) {
                throw new IllegalArgumentException(
                        "El detalle no puede superar " + DETALLE_MAXIMO + " caracteres");
            }
        }
        Objects.requireNonNull(estado, "El acta necesita su estado");
        Objects.requireNonNull(observacion, "Sin observacion no se guarda un acta (regla 10)");
    }

    /** Un acta predial nueva, todavía sin guardar. */
    public static ActaFiscalizacion nuevaPredial(
            long programaId,
            int version,
            long contribuyenteId,
            long predioId,
            @Nullable Long fichaId,
            LocalDate fechaVisita,
            String fiscalizador,
            @Nullable Hallazgo hallazgo,
            @Nullable AreaM2 areaHallada,
            @Nullable String detalle,
            Observacion observacion) {
        return new ActaFiscalizacion(
                null,
                programaId,
                version,
                contribuyenteId,
                predioId,
                null,
                fichaId,
                fechaVisita,
                fiscalizador,
                hallazgo,
                areaHallada,
                detalle,
                EstadoDeActa.ABIERTA,
                observacion);
    }

    /** Un acta vehicular nueva, todavía sin guardar: nunca lleva ficha ni área. */
    public static ActaFiscalizacion nuevaVehicular(
            long programaId,
            int version,
            long contribuyenteId,
            long vehiculoId,
            LocalDate fechaVisita,
            String fiscalizador,
            @Nullable Hallazgo hallazgo,
            @Nullable String detalle,
            Observacion observacion) {
        return new ActaFiscalizacion(
                null,
                programaId,
                version,
                contribuyenteId,
                null,
                vehiculoId,
                null,
                fechaVisita,
                fiscalizador,
                hallazgo,
                null,
                detalle,
                EstadoDeActa.ABIERTA,
                observacion);
    }

    public boolean esNueva() {
        return id == null;
    }

    public boolean esPredial() {
        return predioId != null;
    }
}
