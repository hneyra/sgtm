package pe.gob.sgtm.cuentacorriente.dominio;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;

/**
 * Una fila del libro (ADR-0006, RF-040): un {@code CARGO} o un {@code ABONO}, con su contribuyente,
 * su tributo y el concepto por el que se asienta.
 *
 * <p><b>Inmutable de verdad.</b> No hay ningun metodo que devuelva «el mismo asiento modificado»:
 * una vez construido, lo unico que se puede hacer con el es guardarlo o {@linkplain #reversionDe
 * reversarlo} con otro. Corresponde a que la tabla no admite {@code UPDATE} desde la aplicacion
 * (V7) y a que el escaner de fuentes la tiene en {@code TABLAS_INMUTABLES}.
 *
 * <p>{@code monto} <b>nunca</b> es negativo: el signo lo pone {@link #tipo}. {@code referencia
 * Externa} es como entran papeletas y licencias, sin clave foranea a proposito (ARQ-01 §4 regla 2):
 * este contexto no sabe —ni le hace falta saber— de que contexto viene un asiento.
 *
 * @param id nulo mientras no se ha guardado; lo asigna la base
 * @param ejercicio clave de particion de {@code cuenta_corriente_asiento}
 * @param contribuyenteId titular de la obligacion
 * @param tributo el tributo al que se imputa, tal como lo nombra quien asienta
 * @param concepto por que se asienta
 * @param tipo si aumenta o reduce la deuda
 * @param fase en que etapa de la cobranza esta
 * @param periodo la cuota o el mes, si el tributo se divide; {@code null} si no aplica
 * @param predioId la unidad, si la obligacion es predial
 * @param vehiculoId la unidad, si la obligacion es vehicular
 * @param referenciaExterna como entra una papeleta o una licencia, sin clave foranea
 * @param monto siempre positivo
 * @param fechaValor fecha a la que se imputa el asiento
 * @param documentoOrigen el documento que lo origina: una liquidacion, un recibo, una resolucion
 * @param asientoReversadoId el asiento que este corrige, si es una reversion
 * @param usuarioId quien lo asento; {@code null} en un asiento que todavia no se guardo, porque lo
 *     pone el repositorio desde el origen de la peticion, no quien construye el objeto
 * @param motivo por que se asienta, mas alla del concepto; obligatorio cuando {@link
 *     Concepto#exigeMotivo()}, y en la practica siempre presente (regla 10)
 */
public record Asiento(
        @Nullable Long id,
        Ejercicio ejercicio,
        long contribuyenteId,
        String tributo,
        Concepto concepto,
        TipoAsiento tipo,
        Fase fase,
        @Nullable Integer periodo,
        @Nullable Long predioId,
        @Nullable Long vehiculoId,
        @Nullable String referenciaExterna,
        Dinero monto,
        LocalDate fechaValor,
        String documentoOrigen,
        @Nullable Long asientoReversadoId,
        @Nullable String usuarioId,
        @Nullable String motivo) {

    /** El ancho de {@code tributo varchar(20)}. */
    private static final int TRIBUTO_MAXIMO = 20;

    /** El ancho de {@code documento_origen varchar(80)}. */
    private static final int DOCUMENTO_MAXIMO = 80;

    /** El ancho de {@code referencia_externa varchar(40)}. */
    private static final int REFERENCIA_MAXIMA = 40;

    /** El ancho de {@code usuario_id varchar(60)}. */
    private static final int USUARIO_MAXIMO = 60;

    /** El ancho de {@code motivo varchar(500)}: el mismo que {@code Observacion}. */
    private static final int MOTIVO_MAXIMO = 500;

    /** {@code periodo smallint}: de 0 (anual) a 12 (la division mas fina, la mensual). */
    private static final int PERIODO_MAXIMO = 12;

    public Asiento {
        Objects.requireNonNull(ejercicio, "El libro se particiona por ejercicio (V2)");
        if (contribuyenteId <= 0) {
            throw new IllegalArgumentException(
                    "Un asiento tiene un titular: el identificador de contribuyente debe ser"
                            + " positivo");
        }
        Objects.requireNonNull(tributo, "El asiento necesita saber a que tributo se imputa");
        tributo = tributo.strip().toUpperCase(Locale.ROOT);
        if (tributo.isEmpty() || tributo.length() > TRIBUTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El tributo va de 1 a " + TRIBUTO_MAXIMO + " caracteres: '" + tributo + "'");
        }
        Objects.requireNonNull(concepto, "El asiento necesita su concepto");
        Objects.requireNonNull(tipo, "El asiento necesita saber si es cargo o abono");
        Objects.requireNonNull(fase, "El asiento necesita su fase de cobranza");
        if (periodo != null && (periodo < 0 || periodo > PERIODO_MAXIMO)) {
            throw new IllegalArgumentException(
                    "Periodo fuera de rango: "
                            + periodo
                            + ". Se admite de 0 (anual) a "
                            + PERIODO_MAXIMO);
        }
        Objects.requireNonNull(monto, "El asiento necesita su monto");
        if (!monto.esPositivo()) {
            throw new IllegalArgumentException(
                    "El monto de un asiento es siempre positivo; el signo lo pone el tipo, no el"
                            + " importe (ADR-0006): "
                            + monto);
        }
        Objects.requireNonNull(fechaValor, "El asiento necesita su fecha valor");
        Objects.requireNonNull(documentoOrigen, "El asiento necesita el documento que lo origina");
        documentoOrigen = documentoOrigen.strip();
        if (documentoOrigen.isEmpty() || documentoOrigen.length() > DOCUMENTO_MAXIMO) {
            throw new IllegalArgumentException(
                    "El documento de origen va de 1 a "
                            + DOCUMENTO_MAXIMO
                            + " caracteres: '"
                            + documentoOrigen
                            + "'");
        }
        if (referenciaExterna != null) {
            referenciaExterna = referenciaExterna.strip();
            if (referenciaExterna.isEmpty()) {
                referenciaExterna = null;
            } else if (referenciaExterna.length() > REFERENCIA_MAXIMA) {
                throw new IllegalArgumentException(
                        "La referencia externa excede " + REFERENCIA_MAXIMA + " caracteres");
            }
        }
        if (usuarioId != null) {
            usuarioId = usuarioId.strip();
            if (usuarioId.isEmpty()) {
                usuarioId = null;
            } else if (usuarioId.length() > USUARIO_MAXIMO) {
                throw new IllegalArgumentException(
                        "El usuario excede " + USUARIO_MAXIMO + " caracteres");
            }
        }
        if (motivo != null) {
            motivo = motivo.strip();
            if (motivo.isEmpty()) {
                motivo = null;
            } else if (motivo.length() > MOTIVO_MAXIMO) {
                throw new IllegalArgumentException(
                        "El motivo excede " + MOTIVO_MAXIMO + " caracteres");
            }
        }
        if (concepto.exigeMotivo() && motivo == null) {
            throw new IllegalArgumentException(
                    "El concepto "
                            + concepto
                            + " altera la deuda sin que medie cobro y exige motivo"
                            + " (asiento_motivo_ck, RNF-052)");
        }
    }

    /**
     * Un asiento nuevo, todavia sin guardar. Sin {@code id}, sin {@code usuarioId} —lo pone el
     * repositorio desde el origen de la peticion (V2, ARQ-03 §2)— y sin {@code motivo}: lo asienta
     * el caso de uso, con la {@link pe.gob.sgtm.dominio.Observacion} de quien lo registra (regla
     * 10).
     */
    public static Asiento nuevo(
            Ejercicio ejercicio,
            long contribuyenteId,
            String tributo,
            Concepto concepto,
            TipoAsiento tipo,
            Fase fase,
            @Nullable Integer periodo,
            @Nullable Long predioId,
            @Nullable Long vehiculoId,
            @Nullable String referenciaExterna,
            Dinero monto,
            LocalDate fechaValor,
            String documentoOrigen) {
        return new Asiento(
                null,
                ejercicio,
                contribuyenteId,
                tributo,
                concepto,
                tipo,
                fase,
                periodo,
                predioId,
                vehiculoId,
                referenciaExterna,
                monto,
                fechaValor,
                documentoOrigen,
                null,
                null,
                null);
    }

    public boolean esNuevo() {
        return id == null;
    }

    /**
     * El mismo asiento con su {@code motivo} puesto; es lo unico que cambia de un asiento nuevo.
     */
    public Asiento conMotivo(String otroMotivo) {
        return new Asiento(
                id,
                ejercicio,
                contribuyenteId,
                tributo,
                concepto,
                tipo,
                fase,
                periodo,
                predioId,
                vehiculoId,
                referenciaExterna,
                monto,
                fechaValor,
                documentoOrigen,
                asientoReversadoId,
                usuarioId,
                otroMotivo);
    }

    /**
     * La reversion de un asiento ya guardado: mismo contribuyente, tributo, concepto, fase y monto,
     * con el {@link TipoAsiento} <b>opuesto</b> y {@code asientoReversadoId} apuntando al original.
     *
     * <p>«Un asiento equivocado no se corrige, se reversa» (V2): esta es la unica forma de
     * corregirlo, y deja <b>dos</b> filas en el libro, ninguna modificada. El {@code ejercicio} de
     * la reversion es el de su propia {@code fecha}, no el del original: una reversion de diciembre
     * de 2026 hecha en enero de 2027 cae en la particion 2027, como cualquier asiento nuevo.
     *
     * @param original el asiento que se corrige; tiene que estar ya guardado
     * @param fecha fecha valor de la reversion
     * @param documentoOrigen el documento que sustenta la reversion
     * @param motivo por que se reversa; regla 10 lo exige y aqui, ademas, casi siempre lo exige
     *     tambien {@link Concepto#exigeMotivo()}
     */
    public static Asiento reversionDe(
            Asiento original, LocalDate fecha, String documentoOrigen, String motivo) {
        Long idOriginal =
                Objects.requireNonNull(
                        original.id(), "Solo se reversa un asiento que ya esta en el libro");
        return new Asiento(
                null,
                Ejercicio.de(fecha),
                original.contribuyenteId(),
                original.tributo(),
                original.concepto(),
                original.tipo().opuesto(),
                original.fase(),
                original.periodo(),
                original.predioId(),
                original.vehiculoId(),
                original.referenciaExterna(),
                original.monto(),
                fecha,
                documentoOrigen,
                idOriginal,
                null,
                motivo);
    }
}
