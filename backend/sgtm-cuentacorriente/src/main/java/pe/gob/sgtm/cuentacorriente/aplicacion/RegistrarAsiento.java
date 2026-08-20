package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.ProyeccionDelSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoProyectado;
import pe.gob.sgtm.cuentacorriente.dominio.SaldoRepository;
import pe.gob.sgtm.dominio.Observacion;

/**
 * Asienta cargos, abonos y su reversion (ADR-0006).
 *
 * <p>Sigue la plantilla de {@code RegistrarContribuyente}: la {@link Observacion} esta en la firma,
 * la auditoria va en la misma transaccion. Lo propio de este caso de uso es que la observacion
 * <b>tambien</b> queda en el propio libro, como {@code motivo} del asiento: es la unica forma de
 * que quien lee el estado de cuenta vea el «por que» sin cruzar con la auditoria, y es ademas lo
 * que satisface {@code asiento_motivo_ck} para los conceptos que lo exigen (RNF-052).
 *
 * <p>No valida que el asiento «cuadre» con nada: este contexto no conoce reglas tributarias ni sabe
 * si el cargo que le llega es correcto (ARQ-01 §4 regla 2). Quien llama —determinacion, tesoreria,
 * coactiva— es quien responde por eso.
 *
 * <p><b>El saldo proyectado se mantiene aqui, en la misma transaccion</b> (#23, ADR-0006). No es
 * una optimizacion que se pueda hacer «despues»: si la proyeccion se actualizara en otra
 * transaccion, habria una ventana en la que el libro dice una cosa y la caja lee otra, y una caida
 * en medio la dejaria abierta para siempre. Que las dos escrituras compartan transaccion es
 * exactamente lo que ADR-0002 —monolito modular sobre una base— hace posible.
 *
 * <p>Y se <b>reproyecta desde el libro</b>, no se le suma el asiento nuevo: {@link
 * ProyeccionDelSaldo} es la unica definicion de que saldo produce un libro, y usarla aqui es lo que
 * garantiza que el mantenimiento incremental y la reconstruccion no puedan divergir.
 */
@Service
public class RegistrarAsiento {

    private final AsientoRepository repositorio;
    private final SaldoRepository saldos;
    private final Auditoria auditoria;
    private final Clock reloj;

    public RegistrarAsiento(
            AsientoRepository repositorio,
            SaldoRepository saldos,
            Auditoria auditoria,
            Clock reloj) {
        this.repositorio = repositorio;
        this.saldos = saldos;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /** Asienta un cargo o un abono nuevo. */
    @Transactional
    public Asiento asentar(Asiento asiento, Observacion observacion) {
        Asiento guardado = repositorio.registrar(asiento.conMotivo(observacion.texto()));
        reproyectar(guardado);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                guardado.fechaValor(),
                                "cuenta_corriente_asiento",
                                String.valueOf(guardado.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(guardado)));

        return guardado;
    }

    /**
     * Reversa un asiento existente: no lo toca, asienta su opuesto (V2 — «un asiento equivocado no
     * se corrige, se reversa»).
     *
     * @param asientoId el asiento a reversar
     * @param fecha fecha valor de la reversion; decide en que particion cae (ejercicio de la
     *     reversion, no el del original)
     * @param documentoOrigen el documento que sustenta la reversion
     * @param observacion por que se reversa
     */
    @Transactional
    public Asiento reversar(
            long asientoId, LocalDate fecha, String documentoOrigen, Observacion observacion) {
        Asiento original =
                repositorio
                        .findById(asientoId)
                        .orElseThrow(() -> new AsientoInexistente(asientoId));

        Asiento reversion =
                Asiento.reversionDe(original, fecha, documentoOrigen, observacion.texto());
        Asiento guardado = repositorio.registrar(reversion);
        reproyectar(guardado);

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                fecha,
                                "cuenta_corriente_asiento",
                                String.valueOf(guardado.id()),
                                Operacion.REVERSION,
                                observacion)
                        .con(descripcion(original), descripcion(guardado)));

        return guardado;
    }

    /**
     * Recalcula el saldo de la obligacion que este asiento toca, desde el libro.
     *
     * <p>Vuelve a leer los asientos en vez de sumarle el nuevo al saldo anterior. Cuesta una
     * consulta mas —acotada: son los asientos de <b>una</b> obligacion, no del contribuyente— y a
     * cambio la proyeccion no puede quedar desalineada por un reintento, por un asiento que entro
     * por otro camino ni por un defecto de aritmetica incremental.
     */
    private void reproyectar(Asiento guardado) {
        ClaveDeSaldo clave = ClaveDeSaldo.de(guardado);
        List<Asiento> deLaObligacion = repositorio.deLaObligacion(clave);
        for (SaldoProyectado saldo : ProyeccionDelSaldo.de(deLaObligacion, reloj.instant())) {
            saldos.proyectar(saldo);
        }
    }

    /** Sin datos personales: esto acaba en la columna JSON de la auditoria. */
    private static String descripcion(Asiento asiento) {
        return "{\"contribuyenteId\":"
                + asiento.contribuyenteId()
                + ",\"tributo\":\""
                + asiento.tributo()
                + "\",\"concepto\":\""
                + asiento.concepto()
                + "\",\"tipo\":\""
                + asiento.tipo()
                + "\",\"fase\":\""
                + asiento.fase()
                + "\",\"monto\":"
                + asiento.monto().valor().toPlainString()
                + ",\"asientoReversadoId\":"
                + asiento.asientoReversadoId()
                + "}";
    }

    /** No hay ningun asiento con ese identificador, o es de otra municipalidad. */
    public static final class AsientoInexistente extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        AsientoInexistente(long id) {
            super("No hay ningun asiento con identificador " + id + " en esta municipalidad");
        }
    }
}
