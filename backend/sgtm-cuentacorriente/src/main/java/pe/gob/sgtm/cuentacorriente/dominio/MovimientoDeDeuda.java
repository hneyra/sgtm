package pe.gob.sgtm.cuentacorriente.dominio;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import pe.gob.sgtm.dominio.Dinero;

/**
 * Un alta (nota de abono) o una baja (nota de cargo) de deuda, con su desglose (RF-043, RF-044).
 *
 * <p>Con ADR-0006 «dejan de ser un informe y pasan a ser el mecanismo: un asiento mas» (#24). Este
 * objeto es la <b>peticion</b> —lo que alguien pide dar de alta o de baja—, y {@link #enAsientos}
 * la traduce a los asientos que la representan. No hay ningun {@code UPDATE} de deuda existente en
 * ninguna parte del camino: un alta son cargos, una baja son abonos, y el libro solo crece.
 *
 * <p>El desglose son las mismas cuatro partes que devuelve {@link CalculoDeDeuda}: insoluto,
 * reajuste, interes y gasto. Cada una que venga con importe produce <b>su</b> asiento, con su
 * concepto; las que vengan en cero no producen ninguno —un asiento de cero no dice nada y el
 * dominio ni siquiera lo admite, porque {@link Asiento} exige monto positivo—.
 *
 * @param sentido si incorpora deuda o la extingue
 * @param clave la obligacion afectada
 * @param insoluto parte del movimiento que va contra el tributo
 * @param reajuste parte que va contra el reajuste
 * @param interes parte que va contra el interes
 * @param gasto parte que va contra los gastos
 * @param fase la etapa de cobranza en la que queda
 * @param fechaValor la fecha con efecto tributario
 * @param documentoOrigen el sustento: la resolucion, el expediente o el informe que lo aprueba
 * @param referenciaExterna como entra la referencia de otro contexto, si la hay
 */
public record MovimientoDeDeuda(
        SentidoDelMovimiento sentido,
        ClaveDeSaldo clave,
        Dinero insoluto,
        Dinero reajuste,
        Dinero interes,
        Dinero gasto,
        Fase fase,
        LocalDate fechaValor,
        String documentoOrigen,
        @Nullable String referenciaExterna) {

    public MovimientoDeDeuda {
        Objects.requireNonNull(sentido, "Un movimiento de deuda es un alta o una baja");
        Objects.requireNonNull(clave, "El movimiento afecta a una obligacion concreta");
        Objects.requireNonNull(
                insoluto, "El desglose lleva sus cuatro partes, en cero si no aplica");
        Objects.requireNonNull(
                reajuste, "El desglose lleva sus cuatro partes, en cero si no aplica");
        Objects.requireNonNull(
                interes, "El desglose lleva sus cuatro partes, en cero si no aplica");
        Objects.requireNonNull(gasto, "El desglose lleva sus cuatro partes, en cero si no aplica");
        Objects.requireNonNull(fase, "El movimiento necesita su fase de cobranza");
        Objects.requireNonNull(fechaValor, "El movimiento necesita su fecha valor");
        Objects.requireNonNull(
                documentoOrigen, "Sin sustento documental no se registra (RF-043, RF-044)");
        documentoOrigen = documentoOrigen.strip();
        if (documentoOrigen.isEmpty()) {
            throw new IllegalArgumentException(
                    "Sin sustento documental no se registra: un alta o una baja de deuda sin la"
                            + " resolucion que la aprueba no se puede defender ante nadie");
        }
        if (insoluto.esNegativo()
                || reajuste.esNegativo()
                || interes.esNegativo()
                || gasto.esNegativo()) {
            throw new IllegalArgumentException(
                    "Ninguna parte del desglose va en negativo: el sentido lo pone el tipo de"
                            + " movimiento, no el importe (ADR-0006)");
        }
        if (insoluto.esCero() && reajuste.esCero() && interes.esCero() && gasto.esCero()) {
            throw new IllegalArgumentException(
                    "Un movimiento de deuda sin ningun importe no mueve nada: al menos una de las"
                            + " cuatro partes tiene que traer cifra");
        }
    }

    /** La suma de las cuatro partes: lo que este movimiento incorpora o extingue en total. */
    public Dinero total() {
        return insoluto.mas(reajuste).mas(interes).mas(gasto);
    }

    /**
     * Los asientos que representan este movimiento: uno por cada parte con importe.
     *
     * <p>Un alta son {@code CARGO} —incorpora deuda— y una baja son {@code ABONO} —la extingue—.
     * Los conceptos son los del desglose, no {@code ANULACION} ni {@code CONDONACION}: el concepto
     * dice <b>contra que</b> se imputa, y el motivo por que. Quien lea el estado de cuenta tiene
     * que poder ver que una baja de S/ 100 quito S/ 80 de insoluto y S/ 20 de interes.
     */
    public List<Asiento> enAsientos() {
        TipoAsiento tipo =
                sentido == SentidoDelMovimiento.ALTA ? TipoAsiento.CARGO : TipoAsiento.ABONO;
        List<Asiento> asientos = new ArrayList<>();
        agregarSiTraeImporte(asientos, Concepto.INSOLUTO, insoluto, tipo);
        agregarSiTraeImporte(asientos, Concepto.REAJUSTE, reajuste, tipo);
        agregarSiTraeImporte(asientos, Concepto.INTERES, interes, tipo);
        agregarSiTraeImporte(asientos, Concepto.GASTO, gasto, tipo);
        return List.copyOf(asientos);
    }

    private void agregarSiTraeImporte(
            List<Asiento> asientos, Concepto concepto, Dinero monto, TipoAsiento tipo) {
        if (monto.esCero()) {
            return;
        }
        asientos.add(
                Asiento.nuevo(
                        clave.ejercicio(),
                        clave.contribuyenteId(),
                        clave.tributo(),
                        concepto,
                        tipo,
                        fase,
                        clave.periodo(),
                        clave.predioId(),
                        clave.vehiculoId(),
                        referenciaExterna,
                        monto,
                        fechaValor,
                        documentoOrigen));
    }
}
