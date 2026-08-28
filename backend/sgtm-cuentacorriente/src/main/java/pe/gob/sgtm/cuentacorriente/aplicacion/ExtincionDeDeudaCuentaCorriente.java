package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.DeudaAcogida;
import pe.gob.sgtm.cuentacorriente.ExtincionDeDeuda;
import pe.gob.sgtm.cuentacorriente.MovimientoAsentado;
import pe.gob.sgtm.cuentacorriente.SeleccionDeObligacion;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeObligacion;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.Concepto;
import pe.gob.sgtm.cuentacorriente.dominio.DeudaActualizada;
import pe.gob.sgtm.cuentacorriente.dominio.Fase;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.TipoAsiento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * Implementa {@link ExtincionDeDeuda} (#50, RF-064).
 *
 * <h2>Una baja son abonos, uno por parte del desglose</h2>
 *
 * <p>Exactamente lo que {@code MovimientoDeDeuda} de sentido {@code BAJA} produce, y con los mismos
 * conceptos: {@code INSOLUTO}, {@code REAJUSTE}, {@code INTERES} y {@code GASTO}. El concepto dice
 * <b>contra que</b> se imputa y el motivo por que; quien lea el estado de cuenta tiene que poder
 * ver que la baja quito S/ 80 de insoluto y S/ 20 de interes, no una sola linea de «anulacion».
 *
 * <p>Se asienta en la <b>fase en la que la obligacion esta</b>, no en {@code ORDINARIA}: una
 * papeleta cuyo descargo se resuelve cuando ya paso a valor o a coactiva tiene su deuda ahi, y
 * abonar en otra fase dejaria la fase real intacta y crearia un saldo a favor en una que no debia
 * nada.
 *
 * <h2>Los candados, en el mismo orden que la cobranza</h2>
 *
 * <p>Se bloquea la obligacion antes de leer nada, igual que {@link
 * AcogimientoAConvenioCuentaCorriente} y {@link RegistroDeAbonosCuentaCorriente}: si una cobranza y
 * una baja se cruzan, la que llegue segunda relee el libro con lo que dejo la primera y da de baja
 * lo que <b>queda</b>. Sin el candado, las dos leerian la misma deuda y la extinguirian dos veces.
 */
@Service
public class ExtincionDeDeudaCuentaCorriente implements ExtincionDeDeuda {

    /** Las cuatro partes del desglose, en el orden en que se dan de baja. */
    private static final List<Concepto> PARTES =
            List.of(Concepto.INSOLUTO, Concepto.REAJUSTE, Concepto.INTERES, Concepto.GASTO);

    private final AsientoRepository asientos;
    private final SaldoRepository saldos;
    private final RegistrarAsiento registrar;
    private final CalculoDeDeuda calculo;
    private final PoliticaDeRedondeo redondeo;

    public ExtincionDeDeudaCuentaCorriente(
            AsientoRepository asientos,
            SaldoRepository saldos,
            RegistrarAsiento registrar,
            CalculoDeDeuda calculo,
            PoliticaDeRedondeo redondeo) {
        this.asientos = asientos;
        this.saldos = saldos;
        this.registrar = registrar;
        this.calculo = calculo;
        this.redondeo = redondeo;
    }

    @Override
    @Transactional
    public MovimientoAsentado extinguir(
            long contribuyenteId,
            SeleccionDeObligacion obligacion,
            LocalDate fecha,
            String documentoOrigen,
            @Nullable String referenciaExterna,
            Observacion observacion) {

        ClaveDeObligacion clave =
                new ClaveDeObligacion(
                        contribuyenteId,
                        obligacion.tributo(),
                        obligacion.ejercicio(),
                        obligacion.predioId(),
                        obligacion.vehiculoId());
        saldos.bloquear(clave);

        List<DeudaAcogida> dadasDeBaja = new ArrayList<>();
        int escritos = 0;
        for (SaldoProyectado fila : saldos.deLaObligacion(clave)) {
            List<Asiento> delLibro = asientos.deLaObligacion(fila.clave());
            DeudaActualizada pendiente = calculo.deudaActualizadaA(delLibro, fecha, redondeo);
            if (!pendiente.total().esPositivo()) {
                continue;
            }
            for (Concepto parte : PARTES) {
                Dinero importe = parteDe(pendiente, parte);
                if (!importe.esPositivo()) {
                    continue;
                }
                asentar(
                        fila.clave(),
                        fila.fase(),
                        parte,
                        importe,
                        fecha,
                        documentoOrigen,
                        referenciaExterna,
                        observacion);
                escritos++;
            }
            dadasDeBaja.add(filaDe(fila.clave(), fila.fase(), fecha, pendiente));
        }
        return new MovimientoAsentado(dadasDeBaja, escritos, fecha);
    }

    // ------------------------------------------------------------------

    private void asentar(
            ClaveDeSaldo cuota,
            Fase fase,
            Concepto concepto,
            Dinero monto,
            LocalDate fecha,
            String documentoOrigen,
            @Nullable String referenciaExterna,
            Observacion observacion) {
        registrar.asentar(
                Asiento.nuevo(
                        cuota.ejercicio(),
                        cuota.contribuyenteId(),
                        cuota.tributo(),
                        concepto,
                        // Una baja es un ABONO: extingue deuda. El sentido lo pone el tipo de
                        // asiento, nunca el signo del importe (ADR-0006).
                        TipoAsiento.ABONO,
                        fase,
                        // 0 en la proyeccion significa «anual», y en el asiento eso es nulo: es la
                        // traduccion inversa de ClaveDeSaldo.de(Asiento).
                        cuota.periodo() == 0 ? null : cuota.periodo(),
                        cuota.predioId(),
                        cuota.vehiculoId(),
                        referenciaExterna,
                        monto,
                        fecha,
                        documentoOrigen),
                observacion);
    }

    private static DeudaAcogida filaDe(
            ClaveDeSaldo clave, Fase fase, LocalDate fecha, DeudaActualizada deuda) {
        return new DeudaAcogida(
                clave.tributo(),
                clave.ejercicio(),
                clave.periodo(),
                clave.predioId(),
                clave.vehiculoId(),
                fase.name(),
                fecha,
                deuda.insoluto(),
                deuda.reajuste(),
                deuda.interes(),
                deuda.gasto());
    }

    private static Dinero parteDe(DeudaActualizada deuda, Concepto concepto) {
        return switch (concepto) {
            case INSOLUTO -> deuda.insoluto();
            case REAJUSTE -> deuda.reajuste();
            case INTERES -> deuda.interes();
            case GASTO -> deuda.gasto();
            default ->
                    throw new IllegalArgumentException(
                            "El desglose de la deuda tiene cuatro partes, y "
                                    + concepto
                                    + " no es una de ellas");
        };
    }
}
