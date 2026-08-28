package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.AbonoAsentado;
import pe.gob.sgtm.cuentacorriente.RegistroDeAbonos;
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
 * Implementa {@link RegistroDeAbonos} (#33).
 *
 * <h2>El cargo antes del abono</h2>
 *
 * <p>Lo menos evidente de este servicio, y lo que mas cuesta si se omite: al cobrar hay que asentar
 * primero el <b>cargo</b> del reajuste y del interes devengados.
 *
 * <p>El motivo esta en ADR-0012 y lo repite {@link CalculoDeDeuda}: «el interes se calcula, no se
 * asienta». Es decir, la parte de interes de {@code deudaActualizadaA} no existe en el libro: la
 * produce la {@code PoliticaDeMora} cada vez que se pregunta. Si se abonara sin haberla cargado
 * antes, {@code netear(INTERES)} quedaria en negativo <b>para siempre</b> y esa obligacion
 * mostraria deuda negativa cada vez que alguien la consultara. El sintoma aparece semanas despues,
 * en una constancia de no adeudo que no cuadra, y para entonces hay miles de recibos iguales.
 *
 * <p>La diferencia entre {@link CalculoDeDeuda#deudaActualizadaA} y {@link
 * CalculoDeDeuda#asentadoA} es exactamente lo que hay que cargar. Cuando el dinero entra, el
 * devengo deja de ser una proyeccion y pasa a ser un hecho del libro; por eso el cargo se asienta
 * con la misma fecha valor que el abono y con el mismo documento de origen: el recibo explica las
 * dos filas.
 *
 * <h2>Por cuota, no por obligacion</h2>
 *
 * <p>El cajero marca «predial 2026 del predio 7». El libro cuenta por cuota, y cada cuota puede
 * estar en una fase distinta —una en coactiva, dos ordinarias—. Los asientos se escriben cuota por
 * cuota, con <b>su</b> periodo y <b>su</b> fase; abonarlo todo en fase ordinaria dejaria la cuota
 * de coactiva intacta y la ordinaria en negativo, y el expediente coactivo seguiria vivo sobre una
 * deuda ya cobrada.
 */
@Service
public class RegistroDeAbonosCuentaCorriente implements RegistroDeAbonos {

    /** Las cuatro partes del desglose, en el orden en que se imputan. */
    private static final List<Concepto> PARTES =
            List.of(Concepto.INSOLUTO, Concepto.REAJUSTE, Concepto.INTERES, Concepto.GASTO);

    private final AsientoRepository asientos;
    private final SaldoRepository saldos;
    private final RegistrarAsiento registrar;
    private final CalculoDeDeuda calculo;
    private final PoliticaDeRedondeo redondeo;

    public RegistroDeAbonosCuentaCorriente(
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
    public List<AbonoAsentado> abonarPagoIntegro(
            long contribuyenteId,
            List<SeleccionDeObligacion> obligaciones,
            LocalDate fechaDePago,
            String documentoOrigen,
            Observacion observacion) {

        if (obligaciones.isEmpty()) {
            throw new IllegalArgumentException("No se puede abonar sin marcar ninguna obligacion");
        }
        Set<SeleccionDeObligacion> sinRepetir = new LinkedHashSet<>(obligaciones);
        if (sinRepetir.size() != obligaciones.size()) {
            throw new IllegalArgumentException(
                    "La misma obligacion viene marcada dos veces: cobrarla dos veces en el mismo"
                            + " recibo es cobrarla de mas");
        }

        // 1. Bloquear TODO antes de leer nada, y en un orden que no dependa de como
        //    llego la seleccion: dos cobranzas que se solapan tienen que pedir los
        //    mismos candados en el mismo orden, o se abrazan y las dos esperan.
        List<ClaveDeObligacion> aBloquear =
                sinRepetir.stream()
                        .map(seleccion -> claveDe(contribuyenteId, seleccion))
                        .sorted(ORDEN_ESTABLE)
                        .toList();
        for (ClaveDeObligacion clave : aBloquear) {
            saldos.bloquear(clave);
        }

        // 2. Ya con los candados puestos, releer el libro y asentar.
        List<AbonoAsentado> abonados = new ArrayList<>();
        for (SeleccionDeObligacion seleccion : sinRepetir) {
            AbonoAsentado abono =
                    abonarUna(
                            claveDe(contribuyenteId, seleccion),
                            seleccion,
                            fechaDePago,
                            documentoOrigen,
                            observacion);
            if (abono != null) {
                abonados.add(abono);
            }
        }

        if (abonados.isEmpty()) {
            throw new SinDeudaQueAbonar(
                    "Ninguna de las "
                            + sinRepetir.size()
                            + " obligaciones marcadas tenia deuda al "
                            + fechaDePago
                            + ": o ya se pagaron, o nunca se determinaron");
        }
        return List.copyOf(abonados);
    }

    // ------------------------------------------------------------------

    /**
     * Una obligacion completa: todas sus cuotas con deuda. Devuelve {@code null} si no tenia
     * ninguna —eso no es un error por si solo: el error es que <b>ninguna</b> de las marcadas la
     * tuviera, y eso lo decide quien llama—.
     */
    private @org.jspecify.annotations.Nullable AbonoAsentado abonarUna(
            ClaveDeObligacion obligacion,
            SeleccionDeObligacion seleccion,
            LocalDate fechaDePago,
            String documentoOrigen,
            Observacion observacion) {

        Dinero insoluto = Dinero.CERO;
        Dinero reajuste = Dinero.CERO;
        Dinero interes = Dinero.CERO;
        Dinero gasto = Dinero.CERO;

        for (SaldoProyectado fila : saldos.deLaObligacion(obligacion)) {
            ClaveDeSaldo cuota = fila.clave();
            List<Asiento> delLibro = asientos.deLaObligacion(cuota);

            DeudaActualizada cobrable = calculo.deudaActualizadaA(delLibro, fechaDePago, redondeo);
            DeudaActualizada yaAsentado = calculo.asentadoA(delLibro, fechaDePago);

            if (!cobrable.total().esPositivo()) {
                continue;
            }

            for (Concepto parte : PARTES) {
                Dinero aCobrar = parteDe(cobrable, parte);
                if (!aCobrar.esPositivo()) {
                    continue;
                }
                Dinero devengadoSinAsentar = aCobrar.menos(parteDe(yaAsentado, parte));
                if (devengadoSinAsentar.esPositivo()) {
                    asentar(
                            cuota,
                            fila.fase(),
                            parte,
                            TipoAsiento.CARGO,
                            devengadoSinAsentar,
                            fechaDePago,
                            documentoOrigen,
                            observacion);
                }
                asentar(
                        cuota,
                        fila.fase(),
                        parte,
                        TipoAsiento.ABONO,
                        aCobrar,
                        fechaDePago,
                        documentoOrigen,
                        observacion);
            }

            insoluto = insoluto.mas(cobrable.insoluto());
            reajuste = reajuste.mas(cobrable.reajuste());
            interes = interes.mas(cobrable.interes());
            gasto = gasto.mas(cobrable.gasto());
        }

        Dinero total = insoluto.mas(reajuste).mas(interes).mas(gasto);
        return total.esPositivo()
                ? new AbonoAsentado(seleccion, fechaDePago, insoluto, reajuste, interes, gasto)
                : null;
    }

    private void asentar(
            ClaveDeSaldo cuota,
            Fase fase,
            Concepto concepto,
            TipoAsiento tipo,
            Dinero monto,
            LocalDate fechaDePago,
            String documentoOrigen,
            Observacion observacion) {
        registrar.asentar(
                Asiento.nuevo(
                        cuota.ejercicio(),
                        cuota.contribuyenteId(),
                        cuota.tributo(),
                        concepto,
                        tipo,
                        fase,
                        // 0 en la proyeccion significa «anual», y en el asiento eso es nulo:
                        // es la traduccion inversa de ClaveDeSaldo.de(Asiento).
                        cuota.periodo() == 0 ? null : cuota.periodo(),
                        cuota.predioId(),
                        cuota.vehiculoId(),
                        null,
                        monto,
                        fechaDePago,
                        documentoOrigen),
                observacion);
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

    private static ClaveDeObligacion claveDe(
            long contribuyenteId, SeleccionDeObligacion seleccion) {
        return new ClaveDeObligacion(
                contribuyenteId,
                seleccion.tributo(),
                seleccion.ejercicio(),
                seleccion.predioId(),
                seleccion.vehiculoId());
    }

    /** El orden en que se piden los candados. Total y estable: no depende de nulos ni del mapa. */
    private static final Comparator<ClaveDeObligacion> ORDEN_ESTABLE =
            Comparator.comparing(ClaveDeObligacion::tributo)
                    .thenComparingInt(clave -> clave.ejercicio().valor())
                    .thenComparingLong(clave -> clave.predioId() == null ? 0L : clave.predioId())
                    .thenComparingLong(
                            clave -> clave.vehiculoId() == null ? 0L : clave.vehiculoId());
}
