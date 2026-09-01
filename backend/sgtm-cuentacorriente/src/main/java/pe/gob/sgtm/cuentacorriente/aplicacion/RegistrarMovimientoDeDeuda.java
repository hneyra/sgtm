package pe.gob.sgtm.cuentacorriente.aplicacion;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.sgtm.cuentacorriente.dominio.Asiento;
import pe.gob.sgtm.cuentacorriente.dominio.AsientoRepository;
import pe.gob.sgtm.cuentacorriente.dominio.CalculoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.ClaveDeSaldo;
import pe.gob.sgtm.cuentacorriente.dominio.DeudaActualizada;
import pe.gob.sgtm.cuentacorriente.dominio.MovimientoDeDeuda;
import pe.gob.sgtm.cuentacorriente.dominio.RangoDeCuotas;
import pe.gob.sgtm.cuentacorriente.dominio.SentidoDelMovimiento;
import pe.gob.sgtm.documentos.EmitirDocumento;
import pe.gob.sgtm.documentos.FormatoDeDocumento;
import pe.gob.sgtm.dominio.Dinero;
import pe.gob.sgtm.dominio.Observacion;
import pe.gob.sgtm.dominio.PoliticaDeRedondeo;

/**
 * Altas (nota de abono) y bajas (nota de cargo) de deuda (RF-043, RF-044, #24).
 *
 * <p>Las dos producen <b>asientos</b>, nunca un {@code UPDATE} de deuda existente: la traduccion la
 * hace {@link MovimientoDeDeuda#enAsientos}, y el libro no admite otra cosa (V7). Cada asiento pasa
 * por {@link RegistrarAsiento}, que es lo que mantiene la auditoria, el {@code motivo} del asiento
 * y el saldo proyectado en la misma transaccion.
 *
 * <h2>Una baja no puede quitar mas de lo que hay</h2>
 *
 * <p>{@link #registrar} comprueba, parte por parte, que la baja no exceda la deuda vigente <b>a su
 * fecha valor</b>, usando {@link CalculoDeDeuda#deudaActualizadaA} —la funcion de #22—. Comparar
 * contra «la deuda» sin fecha no significaria nada (regla 9), y comparar solo el total dejaria
 * pasar una baja que extingue S/ 500 de interes inexistente compensandolos con insoluto que si
 * existe: el total cuadraria y el desglose quedaria mal.
 *
 * <p>Un alta no tiene ese limite: incorporar deuda que no estaba es exactamente para lo que existe.
 *
 * <h2>El formato impreso se emite al registrar, no al pedirlo</h2>
 *
 * <p>La nota de abono o de cargo se emite en la misma transaccion, con {@code EmitirDocumento}
 * (#15). Emitirla despues, cuando alguien la pidiera, significaria dibujarla con los datos de
 * <b>ese</b> dia: la deuda ya seria otra y el papel no coincidiria con el movimiento que dice
 * sustentar. Emitiendola aqui queda guardada con los datos con que se dibujo y con su resumen
 * SHA-256, que es lo que permite reimprimirla identica meses despues —y lo que hace que la
 * reimpresion <b>falle</b> en vez de entregar un papel distinto si alguien cambia el renderizador—.
 */
@Service
public class RegistrarMovimientoDeDeuda {

    private final AsientoRepository asientos;
    private final RegistrarAsiento registrarAsiento;
    private final CalculoDeDeuda calculo;
    private final PoliticaDeRedondeo redondeo;
    private final EmitirDocumento documentos;

    public RegistrarMovimientoDeDeuda(
            AsientoRepository asientos,
            RegistrarAsiento registrarAsiento,
            CalculoDeDeuda calculo,
            PoliticaDeRedondeo redondeo,
            EmitirDocumento documentos) {
        this.asientos = asientos;
        this.registrarAsiento = registrarAsiento;
        this.calculo = calculo;
        this.redondeo = redondeo;
        this.documentos = documentos;
    }

    /**
     * Registra el movimiento sobre <b>una</b> obligacion: la que su propia clave identifica.
     *
     * <p>Atajo de {@link #registrar(MovimientoDeDeuda, RangoDeCuotas, String, Observacion)} para
     * quien no abarca ningun rango: los contextos que generan cargos por su cuenta —licencias,
     * anuncios, tesoreria, coactiva— y que ya traen su propia transaccion.
     *
     * <p><b>Lleva su propio {@code @Transactional} y no lo hereda del metodo al que delega</b>: una
     * llamada de un metodo de la clase a otro <b>no pasa por el proxy</b>, asi que la anotacion del
     * otro seria inerte y este camino correria sin transaccion —y sin transaccion no hay {@code SET
     * LOCAL}, de modo que la politica RLS no devuelve vacio: revienta (#486)—. Es el mismo defecto
     * de auto-invocacion que #400 encontro en el importador de fichas.
     */
    @Transactional
    public Registro registrar(
            MovimientoDeDeuda movimiento, String codigoContribuyente, Observacion observacion) {
        return registrar(
                movimiento,
                RangoDeCuotas.deUnaSola(movimiento.clave().periodo()),
                codigoContribuyente,
                observacion);
    }

    /**
     * Registra el acto sobre las cuotas que abarca y devuelve <b>todos</b> los asientos que
     * produjo.
     *
     * <p>{@code @Transactional} aqui y no solo en {@link RegistrarAsiento}: un movimiento con
     * desglose produce varios asientos, y o entran todos o no entra ninguno. Media baja asentada
     * —el insoluto si, el interes no— dejaria una deuda que no corresponde ni a antes ni a despues,
     * y sin nada que dijera que falto la otra mitad. Con un rango de cuotas la exigencia es la
     * misma un escalon mas arriba: media baja de «cuotas 1 a 4» —tres si y la cuarta no, porque no
     * cabia— dejaria un acto que ningun papel explica.
     *
     * <h2>Un acto, n obligaciones, un solo documento</h2>
     *
     * <p>El rango se expande a las {@code n} claves que de verdad se mueven ({@link
     * MovimientoDeDeuda#enCadaCuota}) y cada una se comprueba y se asienta por separado —son
     * obligaciones distintas y la deuda vigente de una no dice nada de la otra—. Lo que <b>no</b>
     * se multiplica es el papel: la nota de abono o de cargo es <b>una</b>, la del acto, y lleva
     * dentro las cuotas que cubre y sus asientos. Emitir una por cuota daria {@code n} numeros
     * correlativos para un solo sustento documental y ninguna respuesta podria decir cual devolver.
     *
     * @param movimiento el desglose, la fase, la fecha valor y el sustento del acto; su clave
     *     identifica el tributo, el ejercicio y la unidad, y el rango dice sobre que cuotas cae
     * @param cuotas las cuotas que el acto abarca; {@link RangoDeCuotas#ANUAL} para la obligacion
     *     que no se divide
     * @param codigoContribuyente el codigo que se imprime en el formato; el identificador ya viaja
     *     dentro del movimiento, y el codigo es lo que el papel tiene que mostrar
     * @param observacion por que se registra; sin ella no se guarda (regla 10, RNF-052). Es
     *     <b>una</b> para el acto y queda copiada en los {@code n} asientos: lo que se explica es
     *     por que se dio de alta la deuda, no por que se dio de alta cada cuota
     */
    @Transactional
    public Registro registrar(
            MovimientoDeDeuda movimiento,
            RangoDeCuotas cuotas,
            String codigoContribuyente,
            Observacion observacion) {

        List<Asiento> guardados = new ArrayList<>();
        for (MovimientoDeDeuda deLaCuota : movimiento.enCadaCuota(cuotas)) {
            if (deLaCuota.sentido() == SentidoDelMovimiento.BAJA) {
                verificarQueNoExcedeLaDeuda(deLaCuota);
            }
            for (Asiento asiento : deLaCuota.enAsientos()) {
                guardados.add(registrarAsiento.asentar(asiento, observacion));
            }
        }
        List<Asiento> asentados = List.copyOf(guardados);

        EmitirDocumento.Emision emision =
                documentos.emitir(
                        FormatoDelMovimiento.tipoDe(movimiento.sentido()),
                        movimiento.clave().ejercicio(),
                        movimiento.documentoOrigen(),
                        FormatoDelMovimiento.de(movimiento, cuotas, asentados, codigoContribuyente),
                        FormatoDeDocumento.PDF,
                        observacion);

        return new Registro(asentados, emision.registro().numero());
    }

    /**
     * Lo que produjo el movimiento: sus asientos y el numero del documento con que se formalizo.
     *
     * <p>Se devuelve el <b>numero</b> y no los bytes: quien registra un alta desde una pantalla no
     * necesita el PDF en la respuesta, y devolverlo obligaria a acarrearlo por toda la capa web
     * para que casi siempre se descarte. Con el numero se pide cuando haga falta, y sale identico.
     */
    public record Registro(List<Asiento> asientos, String numeroDeDocumento) {}

    private void verificarQueNoExcedeLaDeuda(MovimientoDeDeuda movimiento) {
        ClaveDeSaldo clave = movimiento.clave();
        // Por la obligacion y no por CriterioDeDeuda: ese criterio busca por codigo de
        // contribuyente —es lo que teclea quien atiende— y aqui ya se tiene el
        // identificador. La fecha de corte es la fecha valor de la propia baja: se
        // compara contra lo que se debia el dia que la baja surte efecto, no hoy.
        DeudaActualizada vigente =
                calculo.deudaActualizadaA(
                        asientos.deLaObligacion(clave), movimiento.fechaValor(), redondeo);

        comprobar("insoluto", movimiento.insoluto(), vigente.insoluto());
        comprobar("reajuste", movimiento.reajuste(), vigente.reajuste());
        comprobar("interes", movimiento.interes(), vigente.interes());
        comprobar("gasto", movimiento.gasto(), vigente.gasto());
    }

    private static void comprobar(String parte, Dinero seDaDeBaja, Dinero vigente) {
        if (seDaDeBaja.esMayorQue(vigente)) {
            throw new BajaMayorQueLaDeuda(parte, seDaDeBaja, vigente);
        }
    }

    /**
     * Se intento dar de baja mas de lo que se debe. Dejarlo pasar produciria una deuda negativa que
     * nadie sabria explicar, y que la siguiente emision arrastraria como saldo a favor.
     */
    public static final class BajaMayorQueLaDeuda extends RuntimeException {
        @java.io.Serial private static final long serialVersionUID = 1L;

        BajaMayorQueLaDeuda(String parte, Dinero seDaDeBaja, Dinero vigente) {
            super(
                    "La baja de "
                            + parte
                            + " es de "
                            + seDaDeBaja
                            + " y a esa fecha solo se deben "
                            + vigente
                            + ". Una baja no puede extinguir mas de lo que hay");
        }
    }
}
