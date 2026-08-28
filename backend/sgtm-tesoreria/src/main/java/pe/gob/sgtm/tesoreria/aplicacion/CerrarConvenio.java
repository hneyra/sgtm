package pe.gob.sgtm.tesoreria.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.cuentacorriente.AcogimientoAConvenio;
import pe.gob.sgtm.cuentacorriente.MovimientoAsentado;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.tesoreria.aplicacion.RegistrarPreconvenio.Peticion;
import pe.gob.sgtm.tesoreria.dominio.Convenio;
import pe.gob.sgtm.tesoreria.dominio.ConvenioRepository;
import pe.gob.sgtm.tesoreria.dominio.EstadoDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeConvenioRepository;
import pe.gob.sgtm.tesoreria.dominio.MovimientoDeReciboRepository;
import pe.gob.sgtm.tesoreria.dominio.NumeroDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.TipoDeMovimientoDeConvenio;

/**
 * Cierra un convenio devolviendo su deuda a la fase de la que salio: anulacion, quiebre o
 * reformulacion (#35, RF-085, RF-086).
 *
 * <h2>La deuda vuelve con asientos, nunca con un {@code UPDATE} de fase</h2>
 *
 * <p>{@link AcogimientoAConvenio#devolver} escribe el par contrario al del acogimiento —abono en
 * fase de convenio, cargo en la fase de origen— con la fase que {@code convenio_deuda.fase_origen}
 * guardo cuota por cuota. Una deuda que venia de coactiva vuelve a coactiva, no a ordinaria: el
 * expediente sigue vivo, y devolverla a ordinaria lo dejaria sin sustento.
 *
 * <p>Nunca un {@code UPDATE saldo_proyectado SET fase = ...}: la fase de una obligacion es la de su
 * ultimo asiento, y escribirla a mano dejaria la proyeccion diciendo una cosa y el libro otra.
 *
 * <h2>Vuelve lo pendiente, no lo acogido</h2>
 *
 * <p>Se devuelve lo que el libro dice <b>hoy</b>. Reversar los asientos del acogimiento seria mas
 * corto y estaria mal: devolveria a la fase de origen tambien lo que entretanto se hubiera cobrado,
 * y el contribuyente acabaria debiendo otra vez lo que ya pago.
 *
 * <h2>Anular no es quebrar</h2>
 *
 * <ul>
 *   <li><b>Anulacion</b>: el convenio no debio existir. Como su cuota inicial se cobro con un
 *       recibo, anularlo exige que ese recibo este anulado —y un recibo solo se anula el mismo dia
 *       del pago (#34, RF-083)—. Sin esa comprobacion, anular un convenio de hace tres meses
 *       dejaria un recibo vivo cobrando la inicial de un convenio que ya no existe.
 *   <li><b>Quiebre</b>: el convenio existio y se incumplio. El recibo de la inicial sigue siendo
 *       valido —ese dinero entro— y no se toca.
 *   <li><b>Reformulacion</b>: quiebre mas un preconvenio nuevo sobre el saldo pendiente. Se
 *       resuelve en la misma transaccion: si el preconvenio nuevo fallara, el quiebre se revierte
 *       con el y la deuda no se queda a medio camino.
 * </ul>
 *
 * <h2>Cerrar dos veces es imposible</h2>
 *
 * <p>{@code convenio_movimiento_cierre_uq}, un indice unico parcial sobre los <b>tres</b> tipos de
 * cierre a la vez. La lectura previa del estado esta para dar un mensaje util; la garantia es el
 * indice, porque dos peticiones simultaneas pasan las dos por cualquier {@code if} de Java —y dos
 * devoluciones dejarian al contribuyente debiendo el doble—.
 */
@Service
public class CerrarConvenio {

    private final ConvenioRepository convenios;
    private final MovimientoDeConvenioRepository movimientos;
    private final MovimientoDeReciboRepository movimientosDeRecibo;
    private final AcogimientoAConvenio acogimiento;
    private final RegistrarPreconvenio preconvenios;
    private final Auditoria auditoria;
    private final Clock reloj;

    public CerrarConvenio(
            ConvenioRepository convenios,
            MovimientoDeConvenioRepository movimientos,
            MovimientoDeReciboRepository movimientosDeRecibo,
            AcogimientoAConvenio acogimiento,
            RegistrarPreconvenio preconvenios,
            Auditoria auditoria,
            Clock reloj) {
        this.convenios = convenios;
        this.movimientos = movimientos;
        this.movimientosDeRecibo = movimientosDeRecibo;
        this.acogimiento = acogimiento;
        this.preconvenios = preconvenios;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /**
     * Cierra el convenio y devuelve su acta.
     *
     * <p>La {@link Observacion} va en la firma y no dentro de {@link Cierre}: la regla 10 exige que
     * se vea en el punto donde se escribe, y ArchUnit la comprueba mirando los parametros del
     * metodo transaccional. El {@code motivo} es <b>otra cosa</b> y va aparte: la observacion
     * explica la operacion a quien lea la bitacora, y el motivo es el sustento del acto
     * administrativo, que queda en el propio convenio y se imprime en su resolucion.
     *
     * @throws FormalizarConvenio.ConvenioInexistente si no hay convenio con ese numero
     * @throws ConvenioSinFormalizar si todavia es un preconvenio: no acogio nada que devolver
     * @throws MovimientoDeConvenioRepository.ConvenioYaCerrado si ya estaba cerrado
     * @throws ReciboDeLaInicialVigente si se anula y el recibo de la inicial no esta anulado
     */
    @Transactional
    public Cerrado cerrar(Cierre peticion, Observacion observacion) {
        Objects.requireNonNull(peticion, "No se cierra sin peticion");
        Objects.requireNonNull(observacion, "Sin observacion no se guarda (regla 10, RNF-052)");

        Convenio convenio =
                convenios
                        .porNumero(peticion.numero())
                        .orElseThrow(
                                () ->
                                        new FormalizarConvenio.ConvenioInexistente(
                                                peticion.numero()));
        long convenioId = convenio.idGuardado();

        EstadoDeConvenio estado =
                EstadoDeConvenio.deLosMovimientos(movimientos.deConvenio(convenioId));
        if (estado.esPreconvenio()) {
            throw new ConvenioSinFormalizar(peticion.numero());
        }
        if (estado.estaCerrado()) {
            throw new MovimientoDeConvenioRepository.ConvenioYaCerrado(
                    "El convenio "
                            + peticion.numero().impreso()
                            + " ya esta "
                            + estado
                            + ": su deuda ya volvio a su fase de origen, y devolverla otra vez la"
                            + " duplicaria",
                    new IllegalStateException("estado " + estado));
        }
        if (peticion.tipo() == TipoDeMovimientoDeConvenio.ANULACION) {
            exigirQueElReciboDeLaInicialEsteAnulado(convenio, convenioId);
        }

        MovimientoAsentado devuelto =
                acogimiento.devolver(
                        convenio.contribuyenteId(),
                        convenio.acogida(),
                        peticion.fecha(),
                        documentoDelCierre(peticion.tipo(), peticion.numero()),
                        observacion);

        // La reformulacion registra ANTES su convenio nuevo, para poder nombrarlo en el
        // movimiento: convenio_movimiento_reformulacion_ck exige que lo nombre, y en la
        // misma transaccion, de modo que si el preconvenio nuevo fallara el quiebre se
        // revertiria con el.
        @Nullable Convenio reformulado = null;
        if (peticion.tipo() == TipoDeMovimientoDeConvenio.REFORMULACION) {
            reformulado =
                    preconvenios.registrar(
                            Objects.requireNonNull(
                                            peticion.reformulacion(),
                                            "Una reformulacion trae el preconvenio que la sustituye")
                                    .conOrigen(convenioId),
                            observacion);
        }

        MovimientoDeConvenio cierre =
                movimientos.registrar(
                        MovimientoDeConvenio.cierre(
                                convenioId,
                                peticion.tipo(),
                                peticion.fecha(),
                                peticion.motivo(),
                                peticion.autorizadoPor(),
                                peticion.documentoAutorizacion(),
                                devuelto.importe(),
                                devuelto.asientos(),
                                reformulado == null ? null : reformulado.id(),
                                reloj.instant(),
                                observacion));

        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                peticion.fecha(),
                                "convenio_movimiento",
                                String.valueOf(cierre.id()),
                                Operacion.ANULACION,
                                observacion)
                        .con(null, descripcion(peticion.numero(), cierre)));

        return new Cerrado(convenio, cierre, devuelto, reformulado);
    }

    // ------------------------------------------------------------------

    /**
     * Anular exige que el recibo de la inicial ya este anulado.
     *
     * <p>Los dos actos van juntos porque el convenio y su recibo son las dos mitades del mismo
     * hecho: la inicial se cobro <b>porque</b> el convenio existia. Dejar el recibo vivo tras
     * anular el convenio deja dinero cobrado por un acto que ya no existe, y ningun arqueo lo
     * detecta.
     *
     * <p>Se comprueba aqui y no se anula desde aqui a proposito: un recibo solo se anula el mismo
     * dia del pago (#34), lo autoriza quien responde por la caja, y encadenarlo desde este caso de
     * uso saltaria esa autorizacion.
     */
    private void exigirQueElReciboDeLaInicialEsteAnulado(Convenio convenio, long convenioId) {
        Optional<MovimientoDeConvenio> formalizacion = movimientos.formalizacionDe(convenioId);
        if (formalizacion.isEmpty()) {
            return;
        }
        Long reciboId = formalizacion.get().reciboId();
        if (reciboId == null) {
            return;
        }
        if (movimientosDeRecibo.anulacionDe(reciboId).isEmpty()) {
            throw new ReciboDeLaInicialVigente(convenio.numero());
        }
    }

    /**
     * Como se marcan en el libro los asientos de la devolucion.
     *
     * <p><b>Distinto del que uso el acogimiento</b>, y no es una formalidad: con el mismo texto,
     * cualquier operacion que busque «los asientos del convenio» encontraria mezclados los de ida y
     * los de vuelta, y una reversion podria encontrarse a si misma.
     */
    public static String documentoDelCierre(
            TipoDeMovimientoDeConvenio tipo, NumeroDeConvenio numero) {
        return tipo.name() + " " + numero.impreso();
    }

    /** Sin datos personales: esto acaba en la columna JSON de la auditoria. */
    private static String descripcion(NumeroDeConvenio numero, MovimientoDeConvenio cierre) {
        return "{\"numero\":\""
                + numero.impreso()
                + "\",\"tipo\":\""
                + cierre.tipo()
                + "\",\"motivo\":\""
                + cierre.motivoDelCierre()
                + "\",\"devuelto\":"
                + cierre.importe().valor().toPlainString()
                + ",\"asientos\":"
                + cierre.asientos()
                + ",\"fecha\":\""
                + cierre.fecha()
                + "\"}";
    }

    /**
     * Lo que se pide cerrar.
     *
     * @param numero el convenio, por su numero impreso
     * @param tipo anulacion, quiebre o reformulacion
     * @param fecha la fecha valor de los asientos de la devolucion (regla 6)
     * @param motivo el sustento del acto; obligatorio (RNF-052)
     * @param autorizadoPor quien lo autorizo, si consta
     * @param documentoAutorizacion la resolucion o el memorando, si consta
     * @param reformulacion el preconvenio que sustituye a este; solo en la reformulacion
     */
    public record Cierre(
            NumeroDeConvenio numero,
            TipoDeMovimientoDeConvenio tipo,
            LocalDate fecha,
            String motivo,
            @Nullable String autorizadoPor,
            @Nullable String documentoAutorizacion,
            @Nullable Peticion reformulacion) {

        public Cierre {
            Objects.requireNonNull(numero, "Se cierra un convenio concreto, por su numero");
            Objects.requireNonNull(tipo, "Hay que decir como se cierra");
            Objects.requireNonNull(fecha, "El cierre es de un dia concreto (regla 6)");
            Objects.requireNonNull(motivo, "Cerrar un convenio exige su motivo (RNF-052)");
            motivo = motivo.strip();
            if (motivo.isEmpty()) {
                throw new IllegalArgumentException(
                        "El motivo del cierre no puede estar vacio: es el sustento de dejar sin"
                                + " efecto un compromiso que el contribuyente firmo");
            }
            if (!tipo.cierra()) {
                throw new IllegalArgumentException(
                        "La formalizacion no cierra un convenio: la cobra la caja (#33)");
            }
            if ((tipo == TipoDeMovimientoDeConvenio.REFORMULACION) != (reformulacion != null)) {
                throw new IllegalArgumentException(
                        "Una reformulacion trae el preconvenio que la sustituye, y solo ella lo"
                                + " trae: sin el, el saldo pendiente se quedaria sin convenio");
            }
        }
    }

    /**
     * El convenio cerrado y su acta.
     *
     * @param convenio el convenio, intacto: su cronograma sigue donde estaba
     * @param cierre la fila que se agrego
     * @param devuelto lo que de verdad volvio a su fase de origen, con su fecha
     * @param reformulado el preconvenio nuevo, si el cierre fue una reformulacion
     */
    public record Cerrado(
            Convenio convenio,
            MovimientoDeConvenio cierre,
            MovimientoAsentado devuelto,
            @Nullable Convenio reformulado) {}

    /** El convenio todavia es un preconvenio: no acogio ninguna deuda que devolver. */
    public static final class ConvenioSinFormalizar extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        ConvenioSinFormalizar(NumeroDeConvenio numero) {
            super(
                    "El convenio "
                            + numero.impreso()
                            + " todavia es un preconvenio: no acogio ninguna deuda, asi que no hay"
                            + " nada que devolver. Un preconvenio que no se formaliza simplemente"
                            + " no llega a existir");
        }
    }

    /** Se pide anular un convenio cuyo recibo de cuota inicial sigue vigente. */
    public static final class ReciboDeLaInicialVigente extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        ReciboDeLaInicialVigente(NumeroDeConvenio numero) {
            super(
                    "El recibo que cobro la cuota inicial del convenio "
                            + numero.impreso()
                            + " sigue vigente: anular el convenio dejaria dinero cobrado por un"
                            + " acto que ya no existe. Anulese primero el recibo (RF-083), o"
                            + " quiebrese el convenio, que es lo que corresponde cuando la inicial"
                            + " si se cobro");
        }
    }
}
