package pe.gob.sgtm.tesoreria.aplicacion;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.auditoria.Auditoria;
import pe.gob.sgtm.auditoria.Operacion;
import pe.gob.sgtm.auditoria.RegistroDeAuditoria;
import pe.gob.sgtm.cuentacorriente.AcogimientoAConvenio;
import pe.gob.sgtm.cuentacorriente.DeudaAcogida;
import pe.gob.sgtm.cuentacorriente.SeleccionDeObligacion;
import pe.gob.sgtm.dominio.Alicuota;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Ejercicio;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.tesoreria.dominio.CondicionesDelConvenio;
import pe.gob.sgtm.tesoreria.dominio.Convenio;
import pe.gob.sgtm.tesoreria.dominio.ConvenioRepository;
import pe.gob.sgtm.tesoreria.dominio.Cronograma;
import pe.gob.sgtm.tesoreria.dominio.CuotaDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.NumeroDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.TipoDeConvenio;
import pe.gob.sgtm.tesoreria.dominio.TipoDeGarantia;

/**
 * Registra el <b>preconvenio</b>: la deuda seleccionada, congelada, con su cronograma (#35,
 * RF-084).
 *
 * <h2>Lo que este caso de uso NO hace</h2>
 *
 * <p><b>No mueve nada en el libro.</b> Un preconvenio no acoge deuda: es la simulacion aceptada,
 * con su numero y su cronograma, esperando que se cobre su cuota inicial. Acoger aqui dejaria la
 * deuda en fase de convenio de todo el que se acercara a preguntar cuanto le saldria fraccionar, y
 * bastaria con no volver para dejar de aparecer en la cobranza ordinaria.
 *
 * <p><b>No decide cuanto se debe.</b> ARQ-01 §3.8: «tesoreria asienta abonos; nunca determina». La
 * composicion de la deuda —que cuotas, en que fase, con que desglose— la resuelve {@link
 * AcogimientoAConvenio#deudaAcogible} releyendo su propio libro. Aqui solo se congela lo que
 * devolvio.
 *
 * <p><b>No inventa el interes ni el maximo de cuotas.</b> Los lee {@link CondicionesParametrizadas}
 * del conjunto sellado, y el convenio guarda de que conjunto salieron (regla 5, ARQ-09 §3).
 *
 * <h2>Sin cuota inicial pagada en caja no hay convenio</h2>
 *
 * <p>Es el criterio de aceptacion central de #35, y aqui se cumple por construccion: este caso de
 * uso <b>no</b> puede dejar un convenio vigente. El estado se deriva de {@code convenio_movimiento}
 * y este metodo no escribe ninguno, asi que lo que sale de aqui es siempre un {@code PRECONVENIO}.
 * La formalizacion es otro acto, con su recibo, y vive en {@link FormalizarConvenio}.
 *
 * <h2>Reejecutar no duplica</h2>
 *
 * <p>Cada llamada produce un convenio <b>nuevo</b>, con su propio numero: no hay «regenerar el
 * cronograma de este». Y dentro de un convenio, que sus cuotas y su deuda acogida no se puedan
 * escribir dos veces lo garantizan {@code convenio_cuota_uq} (V3) y {@code convenio_deuda_uq}
 * (V31), en la base y no en un {@code if}.
 */
@Service
public class RegistrarPreconvenio {

    private final ConvenioRepository convenios;
    private final AcogimientoAConvenio acogimiento;
    private final CondicionesParametrizadas condiciones;
    private final Auditoria auditoria;
    private final Clock reloj;

    public RegistrarPreconvenio(
            ConvenioRepository convenios,
            AcogimientoAConvenio acogimiento,
            CondicionesParametrizadas condiciones,
            Auditoria auditoria,
            Clock reloj) {
        this.convenios = convenios;
        this.acogimiento = acogimiento;
        this.condiciones = condiciones;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /**
     * Simula el cronograma sin registrar nada.
     *
     * <p>Es el boton «Imprimir simulacion» de la pantalla, y no escribe: ni numera un convenio, ni
     * toca el libro, ni deja auditoria. Que exista como metodo aparte —en vez de como una bandera
     * de {@link #registrar}— es lo que impide que una simulacion consuma un correlativo.
     *
     * @throws Cronograma.NadaQueFraccionar si la seleccion no tiene deuda a esa fecha
     */
    @Transactional(readOnly = true)
    public Simulacion simular(Peticion peticion) {
        Objects.requireNonNull(peticion, "No se simula sin peticion");
        List<DeudaAcogida> acogible =
                acogimiento.deudaAcogible(
                        peticion.contribuyenteId(),
                        peticion.obligaciones(),
                        peticion.fechaDeCorte());
        if (acogible.isEmpty()) {
            throw new SinDeudaQueFraccionar(peticion.fechaDeCorte());
        }
        CondicionesParametrizadas.Vigentes vigentes =
                condiciones.aLaFechaDe(peticion.fecha(), peticion.porcentajeInicial());
        CondicionesDelConvenio condicionesDelConvenio = vigentes.condiciones();
        Dinero total = totalDe(acogible);
        List<CuotaDeConvenio> cronograma =
                Cronograma.de(
                        total,
                        condicionesDelConvenio,
                        peticion.cuotas(),
                        peticion.primeraCuotaVence(),
                        vigentes.redondeoDeLaCuota());
        return new Simulacion(
                acogible, cronograma, condicionesDelConvenio, total, peticion.fechaDeCorte());
    }

    /**
     * Registra el preconvenio con su numero, su deuda congelada y su cronograma.
     *
     * <p>La {@link Observacion} va en la firma y no dentro de {@link Peticion}: la regla 10 exige
     * que se vea en el punto donde se escribe, y ArchUnit la comprueba mirando los parametros del
     * metodo transaccional. Escondida dentro de un objeto de peticion, la comprobacion no la
     * encuentra y la regla dejaria de proteger nada.
     *
     * @throws SinDeudaQueFraccionar si la seleccion no tiene deuda a la fecha de corte
     * @throws CondicionesDelConvenio.DemasiadasCuotas si se piden mas de las que admite la
     *     ordenanza
     * @throws CondicionesParametrizadas.CondicionSinParametrizar si falta el interes o el maximo
     */
    @Transactional
    public Convenio registrar(Peticion peticion, Observacion observacion) {
        Objects.requireNonNull(peticion, "No se registra sin peticion");
        Objects.requireNonNull(observacion, "Sin observacion no se guarda (regla 10, RNF-052)");

        Simulacion simulada = simular(peticion);
        NumeroDeConvenio numero = convenios.siguienteNumero(Ejercicio.de(peticion.fecha()));

        Convenio convenio =
                new Convenio(
                        null,
                        numero,
                        peticion.contribuyenteId(),
                        peticion.tipo(),
                        peticion.fecha(),
                        peticion.fechaDeCorte(),
                        simulada.condiciones(),
                        simulada.acogible(),
                        simulada.cronograma(),
                        peticion.tipoGarantia(),
                        peticion.detalleGarantia(),
                        peticion.resolucion(),
                        peticion.convenioOrigenId(),
                        reloj.instant(),
                        null,
                        observacion);

        Convenio guardado = convenios.registrar(convenio);
        auditoria.registrar(
                RegistroDeAuditoria.enLaFechaDe(
                                peticion.fecha(),
                                "convenio",
                                String.valueOf(guardado.id()),
                                Operacion.ALTA,
                                observacion)
                        .con(null, descripcion(guardado)));
        return guardado;
    }

    // ------------------------------------------------------------------

    private static Dinero totalDe(List<DeudaAcogida> acogible) {
        Dinero total = Dinero.CERO;
        for (DeudaAcogida cuota : acogible) {
            total = total.mas(cuota.total());
        }
        return total;
    }

    /** Sin datos personales: esto acaba en la columna JSON de la auditoria. */
    private static String descripcion(Convenio convenio) {
        return "{\"numero\":\""
                + convenio.numero().impreso()
                + "\",\"tipo\":\""
                + convenio.tipo()
                + "\",\"montoTotal\":"
                + convenio.montoTotal().valor().toPlainString()
                + ",\"cuotaInicial\":"
                + convenio.cuotaInicial().valor().toPlainString()
                + ",\"cuotas\":"
                + convenio.numeroDeCuotas()
                + ",\"conjuntoId\":"
                + convenio.condiciones().conjuntoId()
                + ",\"fechaCorte\":\""
                + convenio.fechaCorte()
                + "\"}";
    }

    /**
     * Lo que la pantalla de fraccionamiento pide.
     *
     * <p>Un tipo y no once argumentos: es la frontera donde mas facil es intercambiar dos
     * parametros del mismo tipo sin que el compilador diga nada.
     *
     * @param contribuyenteId a quien se le fracciona; lo resolvio el borde HTTP
     * @param obligaciones las deudas marcadas en la grilla
     * @param tipo si el convenio es ordinario o coactivo
     * @param fecha el dia del convenio; entra como argumento (regla 6)
     * @param fechaDeCorte a que fecha se lee la deuda que se acoge (regla 9)
     * @param cuotas cuantas cuotas se piden, sin contar la inicial
     * @param porcentajeInicial que parte se paga en el acto; lo elige la ventanilla
     * @param primeraCuotaVence cuando vence la primera cuota
     * @param tipoGarantia el ofrecimiento de garantia, si lo hubo
     * @param detalleGarantia la descripcion del bien ofrecido
     * @param resolucion la resolucion que lo aprueba, si consta
     * @param convenioOrigenId el convenio que este reformula, si sale de una reformulacion
     */
    public record Peticion(
            long contribuyenteId,
            List<SeleccionDeObligacion> obligaciones,
            TipoDeConvenio tipo,
            LocalDate fecha,
            LocalDate fechaDeCorte,
            int cuotas,
            Alicuota porcentajeInicial,
            LocalDate primeraCuotaVence,
            @Nullable TipoDeGarantia tipoGarantia,
            @Nullable String detalleGarantia,
            @Nullable String resolucion,
            @Nullable Long convenioOrigenId) {

        public Peticion {
            Objects.requireNonNull(obligaciones, "La lista es vacia, no nula");
            Objects.requireNonNull(tipo, "Hay que decir que clase de convenio es");
            Objects.requireNonNull(fecha, "El convenio es de un dia concreto (regla 6)");
            Objects.requireNonNull(fechaDeCorte, "La deuda se lee a una fecha (regla 9)");
            Objects.requireNonNull(
                    porcentajeInicial, "Hay que decir que porcentaje se paga de inicial");
            Objects.requireNonNull(primeraCuotaVence, "La primera cuota vence en una fecha");
            obligaciones = List.copyOf(obligaciones);
            if (obligaciones.isEmpty()) {
                throw new IllegalArgumentException(
                        "Hay que marcar al menos una deuda: un convenio sin deuda acogida no"
                                + " fracciona nada");
            }
            if (contribuyenteId <= 0) {
                throw new IllegalArgumentException("El convenio es de un contribuyente concreto");
            }
            if (primeraCuotaVence.isBefore(fecha)) {
                throw new IllegalArgumentException(
                        "La primera cuota no puede vencer antes de firmarse el convenio: "
                                + primeraCuotaVence
                                + " es anterior a "
                                + fecha);
            }
        }

        /**
         * La misma peticion, sabiendo de que convenio sale.
         *
         * <p>Solo lo usa la reformulacion: el convenio de origen no se conoce hasta que {@code
         * CerrarConvenio} lo ha leido, y dejarlo entrar por el borde HTTP permitiria encadenar un
         * preconvenio a cualquier convenio ajeno.
         */
        public Peticion conOrigen(long convenioOrigen) {
            return new Peticion(
                    contribuyenteId,
                    obligaciones,
                    tipo,
                    fecha,
                    fechaDeCorte,
                    cuotas,
                    porcentajeInicial,
                    primeraCuotaVence,
                    tipoGarantia,
                    detalleGarantia,
                    resolucion,
                    convenioOrigen);
        }
    }

    /**
     * El cronograma simulado y la deuda que lo sustenta, sin nada escrito.
     *
     * @param acogible la deuda que se acogeria, cuota por cuota y con su fase de origen
     * @param cronograma la cuota inicial y las cuotas
     * @param condiciones las condiciones con que se calculo, y de que conjunto salieron
     * @param total lo acogido a la fecha de corte
     * @param aLaFecha la fecha de corte con que se leyo (regla 9, RNF-075)
     */
    public record Simulacion(
            List<DeudaAcogida> acogible,
            List<CuotaDeConvenio> cronograma,
            CondicionesDelConvenio condiciones,
            Dinero total,
            LocalDate aLaFecha) {

        public Simulacion {
            acogible = List.copyOf(acogible);
            cronograma = List.copyOf(cronograma);
            Objects.requireNonNull(condiciones, "La simulacion dice con que condiciones se hizo");
            Objects.requireNonNull(total, "La simulacion dice cuanto acoge");
            Objects.requireNonNull(aLaFecha, "Toda cifra indica su fecha (RNF-075, regla 9)");
        }
    }

    /** La seleccion no tiene deuda a esa fecha: no hay nada que fraccionar. */
    public static final class SinDeudaQueFraccionar extends RuntimeException {

        @java.io.Serial private static final long serialVersionUID = 1L;

        SinDeudaQueFraccionar(LocalDate fechaDeCorte) {
            super(
                    "Ninguna de las obligaciones marcadas tenia deuda al "
                            + fechaDeCorte
                            + ": o ya se pagaron, o nunca se determinaron. Un convenio sobre cero"
                            + " no es un convenio");
        }
    }
}
